import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const allowed=new Set(['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']);
const clean=(x:unknown,n=200)=>String(x??'').trim().slice(0,n);
const hash=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('');
function reply(body:unknown,status=200){return new Response(status===204?null:JSON.stringify(body),{status,headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'apikey,authorization,content-type','cache-control':'no-store'}})}
async function getHouse(code:string){if(!/^[a-f0-9]{24}$/.test(code))return null;const {data,error}=await db.from('pc_properties').select('*').eq('qr_code',code).eq('qr_enabled',true).maybeSingle();if(error)throw error;return data}
async function getTicket(h:any,b:any){const id=clean(b.ticket_id,40),r=clean(b.receipt,70);if(!/^[0-9a-f-]{36}$/.test(id)||!/^[a-f0-9]{64}$/.test(r))return null;const {data}=await db.from('pc_tickets').select('id,property_id,status,anonymous_receipt_hash').eq('id',id).eq('property_id',h.id).maybeSingle();return data?.anonymous_receipt_hash===(await hash(r))?data:null}
async function getMedia(kind:string,ids:string[],onlyPublic:boolean){if(!ids.length)return [];const {data,error}=await db.from('pc_media').select('kind,entity_id,step_key,mime_type,caption,transcript,filename,storage_path,is_public').eq('kind',kind).in('entity_id',ids.slice(0,100)).limit(150);if(error)throw error;return (data||[]).filter((x:any)=>!onlyPublic||x.is_public)}
async function home(h:any){
const id=h.id;
const [er,gr,rr]=await Promise.all([
db.from('pc_equipment').select('id,property_id,name,location,model,notes').eq('property_id',id).limit(70),
db.from('pc_guides').select('id,title,subtitle,keywords,steps,property_id').eq('status','published').or('property_id.is.null,property_id.eq.'+id).limit(100),
db.from('pc_routines').select('id,title,details,every_days,property_id').eq('responsible','resident').or('property_id.is.null,property_id.eq.'+id).limit(100)]);
for(const x of [er,gr,rr])if(x.error)throw x.error;
const equipment=er.data||[],guides=gr.data||[],routines=rr.data||[];
const [gm,rm,pm,em]=await Promise.all([getMedia('guide',guides.map((x:any)=>x.id),false),getMedia('routine',routines.map((x:any)=>x.id),true),getMedia('property',[id],true),getMedia('equipment',equipment.map((x:any)=>x.id),true)]);
const media=[];
for(const m of [...gm,...rm,...pm,...em]){const {data,error}=await db.storage.from('pc-private-media').createSignedUrl(m.storage_path,3600);if(!error&&data?.signedUrl)media.push({kind:m.kind,entity_id:m.entity_id,step_key:m.step_key,mime_type:m.mime_type,caption:m.caption,transcript:m.transcript,filename:m.filename,signed_url:data.signedUrl})}
const items=await db.from('pc_inspection_items').select('code,position,title,hint,if_supplied').eq('active',true).order('position');
if(items.error)throw items.error;
return {house:{id:h.id,name:h.name,address:h.address,site:h.site,water_supply:h.water_supply,hot_water_type:h.hot_water_type,emergency_contact_name:h.emergency_contact_name,emergency_contact_number:h.emergency_contact_number,approved_guide_notes:h.qr_public_notes},equipment,guides,routines,media,inspection_items:items.data||[]}
}
async function ticket(h:any,b:any){
if(clean(b.website))return reply({error:'Invalid request'},400);
const title=clean(b.title,150),details=clean(b.details,2000);
if(title.length<3||details.length<5)return reply({error:'Please enter a title and explain the problem.'},400);
const {count,error:ce}=await db.from('pc_tickets').select('id',{count:'exact',head:true}).eq('property_id',h.id).eq('submission_source','qr').gte('created_at',new Date(Date.now()-86400000).toISOString());if(ce)throw ce;
if((count||0)>=25)return reply({error:'Too many requests today; phone maintenance.'},429);
const receipt=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
const checks=Array.isArray(b.checks)?b.checks.slice(0,20).map((x:unknown)=>clean(x,240)):[];
const {data,error}=await db.from('pc_tickets').insert({property_id:h.id,created_by:null,title,details,checks,contact_name:clean(b.contact_name,100),contact_phone:clean(b.contact_phone,40),submitted_language:clean(b.language,8),anonymous_receipt_hash:await hash(receipt),submission_source:'qr'}).select('id,status').single();if(error)throw error;
const notification=await notifyTicket(data.id,h,{title,details,contact_name:clean(b.contact_name,100),contact_phone:clean(b.contact_phone,40),checks});
return reply({id:data.id,status:data.status,receipt,email_status:notification},201)
}
async function upload(h:any,b:any){
const t=await getTicket(h,b);if(!t)return reply({error:'Invalid ticket receipt'},403);
const mime=clean(b.mime_type,60),size=Number(b.file_bytes);if(!allowed.has(mime)||!Number.isSafeInteger(size)||size<1||size>25*1024*1024)return reply({error:'Unsupported file type or size'},400);
const {count,error:ce}=await db.from('pc_media').select('id',{head:true,count:'exact'}).eq('kind','ticket').eq('entity_id',t.id);if(ce)throw ce;if((count||0)>=3)return reply({error:'Maximum three attachments'},400);
const mid=crypto.randomUUID(),ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/quicktime':'mov','video/webm':'webm'} as Record<string,string>)[mime],path='pc/'+mid+'/attachment.'+ext;
const {error}=await db.from('pc_media').insert({id:mid,kind:'ticket',entity_id:t.id,property_id:h.id,storage_path:path,filename:clean(b.filename,120),mime_type:mime,file_bytes:size,created_by:null});if(error)throw error;
const {data,error:e2}=await db.storage.from('pc-private-media').createSignedUploadUrl(path);if(e2)throw e2;return reply({path,token:data.token})
}

const emailValid=(value:string)=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
async function notifyTicket(ticketId:string,house:any,details:any){
  const key=Deno.env.get('RESEND_API_KEY')||'';
  const {data:settings,error:settingsError}=await db.from('pc_notification_settings').select('recipient_email').eq('id',1).maybeSingle();
  if(settingsError)console.error('Could not load email settings',settingsError);
  const to=clean(settings?.recipient_email,254)||Deno.env.get('PC_MAINTENANCE_TO')||'';
  const from=Deno.env.get('PC_EMAIL_FROM')||'';
  const {data:queued,error:queueError}=await db.from('pc_ticket_notifications').select('state,attempts').eq('ticket_id',ticketId).maybeSingle();
  if(queueError){console.error('Email queue unavailable',queueError);return 'pending';}
  if(queued?.state==='sent')return 'sent';
  if(!key||!emailValid(to)||!emailValid(from)){
    await db.from('pc_ticket_notifications').update({state:'pending',last_error:'Notification email settings missing',updated_at:new Date().toISOString()}).eq('ticket_id',ticketId);
    return 'pending';
  }
  const safe=(v:unknown,max=500)=>String(v??'').trim().replace(/[\u0000-\u001f]/g,' ').slice(0,max);
  const subject='Property Care maintenance: '+safe(house.name,60)+' — '+safe(details.title,90);
  const text=['NEW MAINTENANCE REQUEST','House: '+safe(house.name,100),'Address: '+safe(house.address,250),'Title: '+safe(details.title,150),'Problem: '+safe(details.details,2000),'Name: '+safe(details.contact_name,100),'Phone: '+safe(details.contact_phone,40),'Checks: '+(Array.isArray(details.checks)?details.checks.map((x:unknown)=>safe(x,220)).join(' / '):''),'Ticket: '+ticketId,'Open the protected staff dashboard: https://condaminegolf.github.io/House-Compendium/staff.html','Attached photos and videos are private and can be viewed in the staff dashboard.'].join('\n');
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+key,'Idempotency-Key':'pc-ticket-'+ticketId},body:JSON.stringify({from:'Property Care <'+from+'>',to:[to],subject,text}),signal:AbortSignal.timeout(9000)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error('Email provider HTTP '+response.status+' '+safe(result?.message,160));
    await db.from('pc_ticket_notifications').update({state:'sent',attempts:(queued?.attempts||0)+1,last_error:'',sent_at:new Date().toISOString(),provider_message_id:safe(result.id,160),updated_at:new Date().toISOString()}).eq('ticket_id',ticketId);
    return 'sent';
  }catch(err){
    console.error('Maintenance email delivery failed',err);
    await db.from('pc_ticket_notifications').update({state:'failed',attempts:(queued?.attempts||0)+1,last_error:safe(err instanceof Error?err.message:err,250),updated_at:new Date().toISOString()}).eq('ticket_id',ticketId);
    return 'failed';
  }
}
async function getInspection(h:any,b:any){
  const id=clean(b.inspection_id,40),receipt=clean(b.receipt,70);
  if(!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9]{64}$/.test(receipt))return null;
  const {data,error}=await db.from('pc_inspections').select('id,property_id,anonymous_receipt_hash').eq('id',id).eq('property_id',h.id).maybeSingle();
  if(error)throw error;
  return data?.anonymous_receipt_hash===(await hash(receipt))?data:null;
}
async function submitInspection(h:any,b:any){
  if(clean(b.website))return reply({error:'Invalid form'},400);
  const answers=Array.isArray(b.answers)?b.answers:[];
  const {data:items,error:itemsError}=await db.from('pc_inspection_items').select('code,if_supplied').eq('active',true);
  if(itemsError)throw itemsError;
  const allowedCodes=new Map((items||[]).map((x:any)=>[x.code,x.if_supplied]));
  if(answers.length!==allowedCodes.size)return reply({error:'Please complete each inspection item'},400);
  const seen=new Set<string>();
  for(const ans of answers){
    if(!ans||typeof ans.code!=='string'||!allowedCodes.has(ans.code)||seen.has(ans.code)||!['completed','needs_attention','not_checked','not_applicable'].includes(ans.status)||(ans.status==='not_applicable'&&!allowedCodes.get(ans.code)))return reply({error:'Invalid inspection answers'},400);
    seen.add(ans.code);
  }
  const {count,error:countError}=await db.from('pc_inspections').select('id',{count:'exact',head:true}).eq('property_id',h.id).gte('created_at',new Date(Date.now()-86400000).toISOString());
  if(countError)throw countError;
  if((count||0)>=20)return reply({error:'Too many inspection submissions today. Contact maintenance.'},429);
  const receipt=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const {data,error}=await db.from('pc_inspections').insert({property_id:h.id,answers:answers.map((a:any)=>({code:a.code,status:a.status})),inspector_name:clean(b.inspector_name,100),notes:clean(b.notes,2000),submitted_language:clean(b.language,8),anonymous_receipt_hash:await hash(receipt)}).select('id,created_at').single();
  if(error)throw error;
  return reply({id:data.id,receipt,submitted_at:data.created_at},201);
}
async function uploadInspectionMedia(h:any,b:any){
  const record=await getInspection(h,b);
  if(!record)return reply({error:'Invalid inspection reference'},403);
  const mime=clean(b.mime_type,60),size=Number(b.file_bytes);
  if(!allowed.has(mime)||!Number.isSafeInteger(size)||size<1||size>25*1024*1024)return reply({error:'Unsupported photo/video file or size'},400);
  const {count,error:countError}=await db.from('pc_media').select('id',{head:true,count:'exact'}).eq('kind','inspection').eq('entity_id',record.id);
  if(countError)throw countError;
  if((count||0)>=3)return reply({error:'Maximum three inspection attachments'},400);
  const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/quicktime':'mov','video/webm':'webm'} as Record<string,string>)[mime];
  const id=crypto.randomUUID(),path='pc/'+id+'/inspection.'+ext;
  const {error}=await db.from('pc_media').insert({id,kind:'inspection',entity_id:record.id,property_id:h.id,storage_path:path,filename:clean(b.filename,120),mime_type:mime,file_bytes:size,created_by:null,is_public:false});
  if(error)throw error;
  const {data,error:storageError}=await db.storage.from('pc-private-media').createSignedUploadUrl(path);
  if(storageError)throw storageError;
  return reply({path,token:data.token});
}

Deno.serve(async(req)=>{
if(req.method==='OPTIONS')return reply({},204);
try{
if(!['GET','POST'].includes(req.method))return reply({error:'Method not allowed'},405);
const u=new URL(req.url),b=req.method==='POST'?await req.json():{},action=req.method==='POST'?clean(b.action,40):u.searchParams.get('action')||'',code=req.method==='POST'?clean(b.code,72):u.searchParams.get('code')||'';
if(action==='test-email'&&req.method==='POST'){
 const authHeader=req.headers.get('authorization')||'';
 const token=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
 if(!token)return reply({error:'Staff sign-in required'},401);
 const {data:auth,error:authError}=await db.auth.getUser(token);
 if(authError||!auth?.user)return reply({error:'Invalid staff session'},401);
 const {data:staff}=await db.from('pc_staff_roles').select('role').eq('user_id',auth.user.id).maybeSingle();
 if(staff?.role!=='administrator')return reply({error:'Administrator access required'},403);
 const {data:settings}=await db.from('pc_notification_settings').select('recipient_email').eq('id',1).single();
 const to=clean(settings?.recipient_email,254),from=Deno.env.get('PC_EMAIL_FROM')||'',key=Deno.env.get('RESEND_API_KEY')||'';
 if(!emailValid(to)||!emailValid(from)||!key)return reply({error:'First save a destination and configure RESEND_API_KEY and PC_EMAIL_FROM in Supabase secrets.'},409);
 try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+key},body:JSON.stringify({from:'Property Care <'+from+'>',to:[to],subject:'Property Care — email notification test',text:'This confirms the Compendium maintenance email integration. No maintenance ticket was created.'}),signal:AbortSignal.timeout(9000)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)return reply({error:'Email provider rejected the test: '+response.status+' '+clean(result?.message,120)},502);
   return reply({sent:true,message_id:clean(result?.id,160)});
 }catch(err){return reply({error:'Test email could not be sent: '+clean(err instanceof Error?err.message:err,140)},502);}
}
if(action==='staff-notify'&&req.method==='POST'){
 const authHeader=req.headers.get('authorization')||'';
 const token=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
 if(!token)return reply({error:'Authorisation required'},401);
 const {data:auth,error:authError}=await db.auth.getUser(token);
 if(authError||!auth?.user)return reply({error:'Invalid staff session'},401);
 const {data:member}=await db.from('pc_staff_roles').select('role').eq('user_id',auth.user.id).maybeSingle();
 if(!member)return reply({error:'Staff access required'},403);
 const id=clean(b.ticket_id,40);
 if(!/^[a-f0-9-]{36}$/.test(id))return reply({error:'Invalid ticket'},400);
 const {data:record,error:ticketError}=await db.from('pc_tickets').select('id,property_id,created_by,title,details,checks,contact_name,contact_phone').eq('id',id).maybeSingle();
 if(ticketError||!record)return reply({error:'Ticket not found'},404);
 if(record.created_by!==auth.user.id&&member.role!=='administrator')return reply({error:'Not permitted'},403);
 const {data:property}=await db.from('pc_properties').select('id,name,address').eq('id',record.property_id).single();
 if(!property)return reply({error:'House not found'},404);
 return reply({email_status:await notifyTicket(record.id,property,record)});
}
const h=await getHouse(code);if(!h)return reply({error:'House QR code not found or disabled'},404);
if(action==='house'&&req.method==='GET')return reply(await home(h));
if(action==='ticket'&&req.method==='POST')return await ticket(h,b);
if(action==='inspection'&&req.method==='POST')return await submitInspection(h,b);
if(action==='upload-inspection-media'&&req.method==='POST')return await uploadInspectionMedia(h,b);
if(action==='ticket-status'&&req.method==='POST'){const t=await getTicket(h,b);if(!t)return reply({error:'Invalid receipt'},403);const {data:n}=await db.from('pc_ticket_notifications').select('state').eq('ticket_id',t.id).maybeSingle();return reply({status:t.status,email_status:n?.state||'pending'});}
if(action==='upload-ticket-media'&&req.method==='POST')return await upload(h,b);
return reply({error:'Unknown action'},404);
}catch(err){console.error('Property Care endpoint error',err);return reply({error:'Service unavailable'},500)}
});