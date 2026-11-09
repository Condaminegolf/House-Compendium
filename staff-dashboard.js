'use strict';
/* Property Care: no email/password UI. A private, revocable staff link authorises server-side actions.
   Do NOT put any access token in this file or other public GitHub files. */
const PC = window.PROPERTY_CARE_CONFIG || {};
const app = document.getElementById('app');
const privateKey = new URLSearchParams(window.location.hash.replace(/^#/,'')).get('access') || '';
const base = String(PC.supabaseUrl || '').replace(/\/$/, '') + '/functions/v1/pc-staff';
const requestedTicket = new URLSearchParams(location.search).get('ticket') || '';
const selectedTicket = /^[a-f0-9-]{36}$/i.test(requestedTicket) ? requestedTicket : '';
const dataState = {payload:null,tab:selectedTicket?'jobs':'overview',editing:null,busy:false,flash:'',error:'',search:'',mediaLinks:{},firstLinkScroll:true,jobFilter:'open'};
const escapeHtml = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txt = (value,max=6000)=>String(value??'').trim().slice(0,max);
const fmt = d=>d?new Date(d).toLocaleString('en-AU',{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}):'Not available';
const recordBy=(list,id)=>list.find(x=>String(x.id)===String(id));
const manager=()=>dataState.payload?.role==='administrator';
const arr=k=>Array.isArray(dataState.payload?.[k])?dataState.payload[k]:[];
const propId=id=>recordBy(arr('properties'),id);
const homeName=id=>{const p=propId(id);return p?`${p.name||p.address} (${p.id})`:(id||'All houses')};
const statusTag=v=>`<span class="pill ${v==='Resolved'||v==='published'||v==='sent'?'green':v==='Urgent'||v==='draft'||v==='failed'?'warn':''}">${escapeHtml(v)}</span>`;
const input=(label,name,value='',options='')=>`<div class="field"><label for="${escapeHtml(name)}">${escapeHtml(label)}</label><input id="${escapeHtml(name)}" name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${options}></div>`;
const area=(label,name,value='',options='')=>`<div class="field"><label for="${escapeHtml(name)}">${escapeHtml(label)}</label><textarea id="${escapeHtml(name)}" name="${escapeHtml(name)}" ${options}>${escapeHtml(value)}</textarea></div>`;
const options=(values,selected)=>values.map(([v,label])=>`<option value="${escapeHtml(v)}" ${String(v)===String(selected)?'selected':''}>${escapeHtml(label)}</option>`).join('');
const dropdown=(label,name,items,value)=>`<div class="field"><label for="${escapeHtml(name)}">${escapeHtml(label)}</label><select name="${escapeHtml(name)}" id="${escapeHtml(name)}">${options(items,value)}</select></div>`;
const houseOptions=allowAll=>[...(allowAll?[['','All houses']]:[]),...arr('properties').map(x=>[x.id,homeName(x.id)])];
const section=(eyebrow,title,subtitle)=>`<section class="banner"><small>${escapeHtml(eyebrow)}</small><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></section>`;
const note=x=>`<div class="notice">${escapeHtml(x)}</div>`;
const managerSections=['houses','welcome','workbook','guides','routines','equipment','email','qr'];
function tabs(){return [['overview','⌂','Dashboard'],['jobs','🛠️','Maintenance'],['inspections','☑','Inspections'],...(manager()?[['manage','⚙','Manage']]:[])];}
function manage(){
 if(!manager())return overview();
 const sections=[['houses','🏡','Houses','Addresses, contact information and utilities'],['welcome','📖','Welcome & Local Info','Shopping, medical contacts, waste and nearby services'],['workbook','📘','Workbook','Approve house-specific instructions'],['guides','📚','Troubleshooting','Published guides and safe steps'],['routines','🌿','Regular care','House care and scheduled checks'],['equipment','⚙','Equipment','Appliances, locations and models'],['email','✉','Email alerts','Destination, provider and test'],['qr','▦','QR labels','Print house labels']];
 return `${section('MANAGEMENT','Manage accommodation','Everything required to maintain your properties, guides and notifications.')}<div class="cp-management-grid">${sections.map(([id,icon,name,description])=>`<button class="item cp-management-item" type="button" data-tab="${id}"><span>${icon}</span><strong>${name}</strong><small>${description}</small></button>`).join('')}</div>`;
}

async function api(action,payload=null){
 if(!PC.supabaseUrl || !PC.publishableKey)throw Error('Compendium cloud configuration is missing.');
 const req={method:payload===null?'GET':'POST',headers:{'content-type':'application/json','apikey':PC.publishableKey,'x-pc-staff-key':privateKey},cache:'no-store'};
 if(payload!==null)req.body=JSON.stringify({action,...payload});
 const response=await fetch(base+(payload===null?'?action='+encodeURIComponent(action):''),req);
 const body=await response.json().catch(()=>({error:'The server returned an invalid response.'}));
 if(!response.ok)throw Error(body.error||'The server could not complete your request.');
 return body;
}
async function refresh(success=''){
 dataState.payload=await api('bootstrap');dataState.error='';dataState.flash=success;
 render();
}
function failureScreen(message,invalid=false){
 const help=invalid?'The link may be expired or revoked. Ask management for a fresh private staff link.':'Use the private staff link supplied by management. This page does not require email addresses, passwords or an account.';
 app.innerHTML=`<div class="top"><div class="top-inner"><div class="brand"><span class="mark">⌂</span><div><strong>Property Care</strong><small>Staff dashboard</small></div></div><a href="index.html">Employee app</a></div></div><section class="card sealed"><h1>Staff dashboard</h1><p>${escapeHtml(message)}</p><p class="muted">${escapeHtml(help)}</p><div class="notice"><b>Privacy:</b> Maintenance requests and residents' contact details cannot be displayed through an unrestricted public link. There is no sign-in step: open the private staff bookmark directly.</div><a class="btn" href="index.html">Go to employee app</a></section>`;
}
function scaffold(content){
 const nav=tabs();const name=dataState.payload?.label||'Staff';const activeMain=id=>id===dataState.tab||(id==='manage'&&managerSections.includes(dataState.tab));
 app.innerHTML=`<header class="top"><div class="top-inner"><div class="brand"><span class="mark">⌂</span><div><strong>Property Care</strong><small>Compendium • Staff workspace</small></div></div><div class="top-note"><span class="private-flag">Private link access</span><div>${escapeHtml(name)} • Expires ${new Date(dataState.payload.expires_at).toLocaleDateString('en-AU')}</div></div></div></header><div class="shell"><nav class="nav" aria-label="Staff sections">${nav.map(([id,icon,label])=>`<button data-tab="${id}" class="${activeMain(id)?'active':''}">${icon} ${escapeHtml(label)}</button>`).join('')}</nav>${dataState.flash?`<div class="info">${escapeHtml(dataState.flash)}</div>`:''}${dataState.error?`<div class="error">${escapeHtml(dataState.error)}</div>`:''}${manager()&&managerSections.includes(dataState.tab)?`<button class="btn ghost cp-back-manage" data-tab="manage">← All management tools</button>`:""}${content}<footer class="foot">Private access link • Do not share outside the maintenance team. Maintenance tickets are not emergency alerts.</footer></div><nav class="bottom" aria-label="Staff sections">${nav.map(([id,icon,label])=>`<button data-tab="${id}" class="${activeMain(id)?'active':''}"><span class="symbol">${icon}</span>${escapeHtml(label)}</button>`).join('')}</nav>`;
}
function overview(){
 const tickets=arr('tickets'),open=tickets.filter(t=>t.status!=='Resolved').length,inspections=arr('inspections'),issues=inspections.filter(x=>(x.answers||[]).some(a=>a.status==='needs_attention')).length;
 return `${section('STAFF WORKSPACE','House maintenance at a glance','Open and update work orders without entering an email address or password.')}<div class="grid"><div class="stat"><strong>${open}</strong><small>Open maintenance requests</small></div><div class="stat"><strong>${inspections.length}</strong><small>Inspections submitted</small></div><div class="stat"><strong>${issues}</strong><small>Inspections requiring attention</small></div></div><div class="section-head"><h2>What would you like to do?</h2></div><div class="grid two"><button class="item" data-tab="jobs"><strong>🛠️ Maintenance jobs</strong><small>Update progress, see contact information and view private photo evidence</small></button><button class="item" data-tab="inspections"><strong>☑ Inspection reports</strong><small>Review results and items requiring attention</small></button>${manager()?`<button class="item" data-tab="houses"><strong>🏡 Manage 33 houses</strong><small>Edit site information and maintenance contacts</small></button><button class="item" data-tab="workbook"><strong>📘 Review Excel content</strong><small>Approve household-specific maintenance information</small></button>`:''}</div><div class="notice">Urgent electrical, gas, fire or serious plumbing hazards must still be reported by telephone or emergency services.</div>`;
}
function mediaPanel(kind,id,upload=false){
 const matched=arr('media').filter(m=>m.kind===kind&&m.entity_id===String(id));
 const existing=matched.length?`<div class="media">${matched.map(m=>`<span><button type="button" class="btn ghost" data-action="media" data-id="${escapeHtml(m.id)}">${m.mime_type?.startsWith('video/')?'▶':'▣'} ${escapeHtml(m.caption||m.filename||'View attachment')}</button>${dataState.mediaLinks[m.id]?`<a target="_blank" rel="noopener noreferrer" href="${escapeHtml(dataState.mediaLinks[m.id])}"> Open secure file</a>`:''}</span>`).join('')}</div>`:'<p class="small muted">No photos or videos attached.</p>';
 const add=manager()&&upload?`<label class="field"><b>Upload a reference photo or video</b><input type="file" data-upload="${escapeHtml(kind)}" data-entity="${escapeHtml(id)}" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"><span class="small muted">Maximum 25 MB. For published workbook and guide entries, uploaded reference media becomes visible in the employee app.</span></label>`:'';
 return existing+add;
}
function jobs(){
 const list=arr('tickets').filter(t=>(dataState.jobFilter==='all'||(dataState.jobFilter==='open'&&t.status!=='Resolved')||(dataState.jobFilter==='waiting'&&t.status==='Waiting on parts')||(dataState.jobFilter==='done'&&t.status==='Resolved'))&&(!dataState.search||[t.title,t.details,homeName(t.property_id),t.status,t.contact_name].join(' ').toLowerCase().includes(dataState.search.toLowerCase()))).sort((a,b)=>(a.id===selectedTicket?-1:b.id===selectedTicket?1:0)||(a.status==='Resolved'?1:0)-(b.status==='Resolved'?1:0)||String(b.created_at).localeCompare(String(a.created_at)));
 return `${section('MAINTENANCE QUEUE','Maintenance requests','Changes save directly to Compendium. No staff sign-in is needed from your private link.')}<div class="actions"><input class="search" data-search placeholder="Search jobs, addresses or status" value="${escapeHtml(dataState.search)}"><button class="btn" data-action="refresh">Refresh</button></div><div class="cp-job-filters" role="group" aria-label="Filter maintenance requests">${[['open','Open'],['waiting','Waiting on parts'],['done','Completed'],['all','All']].map(([key,label])=>`<button type="button" class="${dataState.jobFilter===key?'active':''}" data-job-filter="${key}">${label} ${key==='open'?arr('tickets').filter(t=>t.status!=='Resolved').length:key==='waiting'?arr('tickets').filter(t=>t.status==='Waiting on parts').length:key==='done'?arr('tickets').filter(t=>t.status==='Resolved').length:arr('tickets').length}</button>`).join('')}</div>${manager()?`<details class="card"><summary>+ Add a maintenance job</summary><form data-form="ticket-create">${dropdown('House','property_id',houseOptions(),arr('properties')[0]?.id)}${input('Issue title','title','','required maxlength="150"')}${area('Description','details','','required maxlength="2000"')}${input('Resident/contact name (optional)','contact_name')}${input('Phone (optional)','contact_phone')}<button class="btn primary" type="submit">Create maintenance request</button></form></details>`:''}<div class="list">${list.map(t=>`<article id="job-${escapeHtml(t.id)}" class="card ${t.id===selectedTicket?'requested-ticket':''}"><div class="topline"><h3>${escapeHtml(t.title)}</h3>${statusTag(t.status)}</div><p class="small muted">${escapeHtml(homeName(t.property_id))} • ${fmt(t.created_at)} • ${escapeHtml(t.priority)}</p><p>${escapeHtml(t.details)}</p>${t.resolved_at?`<p class="small cp-done-note">✓ Completed ${fmt(t.resolved_at)}${t.resolved_by_label?' by '+escapeHtml(t.resolved_by_label):''}</p>`:''}${t.contact_name||t.contact_phone?`<p><b>Contact:</b> ${escapeHtml(t.contact_name||'Not provided')} ${t.contact_phone?' • '+escapeHtml(t.contact_phone):''}</p>`:''}<form data-form="ticket" data-id="${escapeHtml(t.id)}">${dropdown('Job status','status',[['New','New'],['In progress','In progress'],['Waiting on parts','Waiting on parts'],['Resolved','Resolved']],t.status)}${area('Technician notes','technician_notes',t.technician_notes||'','maxlength="4000"')}<div class="actions"><button class="btn primary" type="submit">Save job update</button>${t.status!=='Resolved'?`<button class="btn btn-complete" type="button" data-action="complete-ticket" data-id="${escapeHtml(t.id)}">✓ Mark completed</button>`:''}</div></form>${(()=>{const n=arr('notifications').find(x=>x.ticket_id===t.id);return n?`<div class="small muted" style="margin:12px 0">Email notification: ${statusTag(n.state)} ${n.state!=='sent'?`<button type="button" class="btn ghost" data-action="retry-email" data-id="${escapeHtml(t.id)}">Retry email</button>`:''}</div>`:'';})()}<details style="margin-top:12px"><summary>Photos/videos and troubleshooting checks</summary>${Array.isArray(t.checks)&&t.checks.length?`<pre style="white-space:pre-wrap">${escapeHtml(JSON.stringify(t.checks,null,2))}</pre>`:''}${mediaPanel('ticket',t.id)}</details>${(()=>{const history=arr('statusHistory').filter(x=>x.ticket_id===t.id);return history.length?`<details class="cp-history"><summary>Job progress history (${history.length})</summary>${history.map(x=>`<p class="small muted">${fmt(x.created_at)}: ${escapeHtml(x.old_status)} → ${escapeHtml(x.new_status)} • ${escapeHtml(x.staff_label)}</p>`).join('')}</details>`:'';})()}</article>`).join('')||'<div class="empty">No matching maintenance requests.</div>'}</div>`;
}
function inspections(){
 const list=arr('inspections'),items=new Map(arr('items').map(i=>[i.code,i.title]));
 return `${section('INSPECTION CHECKLIST','Submitted inspections','View completed house inspections, notes and items needing attention.')}<div class="actions"><button class="btn" data-action="refresh">Refresh reports</button></div>${list.map(r=>{const answers=Array.isArray(r.answers)?r.answers:[];const attention=answers.filter(x=>x.status==='needs_attention');return `<article class="card"><div class="topline"><h3>${escapeHtml(homeName(r.property_id))}</h3>${statusTag(attention.length?'Needs attention':'Submitted')}</div><p class="small muted">${fmt(r.created_at)} ${r.inspector_name?'• '+escapeHtml(r.inspector_name):''}</p><p>${answers.filter(x=>x.status==='completed').length} completed • ${attention.length} needing attention • ${answers.filter(x=>x.status==='not_checked').length} not checked</p>${r.notes?`<p><b>Notes:</b> ${escapeHtml(r.notes)}</p>`:''}<details ${attention.length?'open':''}><summary>Review ${answers.length} checklist items</summary>${answers.map(a=>`<div class="action-row"><span>${escapeHtml(items.get(a.code)||a.code)}</span><b>${escapeHtml(a.status.replaceAll('_',' '))}</b></div>`).join('')}</details>${mediaPanel('inspection',r.id)}${attention.length?(()=>{const existing=arr('tickets').find(t=>t.source_inspection_id===r.id);return existing?`<p class="small cp-done-note">Maintenance request already created: ${escapeHtml(existing.title)} (${escapeHtml(existing.status)})</p>`:`<button type="button" class="btn cp-followup" data-action="inspection-followup" data-id="${escapeHtml(r.id)}">＋ Create maintenance job from this inspection</button>`;})():''}</article>`}).join('')||'<div class="empty">No inspection checklists have been submitted yet.</div>'}`;
}
function houses(){
 if(dataState.editing){const p=propId(dataState.editing);if(!p)return '<p>House not found.</p>';return `${section('PROPERTY EDITOR','Edit '+homeName(p.id),'Only management can edit property information.')}<button class="btn back" data-action="back">← All houses</button><div class="card"><form data-form="property" data-id="${escapeHtml(p.id)}">${['name','address','site','water_supply','power_supplier','hot_water_type','emergency_contact_name','emergency_contact_number','qr_public_notes','approved_guide_notes'].map(k=>k.includes('notes')?area(k.replaceAll('_',' '),k,p[k]||''):input(k.replaceAll('_',' '),k,p[k]||'')).join('')}<button class="btn primary" type="submit">Save house</button></form>${mediaPanel('property',p.id,true)}</div>`;}
 return `${section('PROPERTY REGISTER','Houses and addresses','Select a property to maintain its equipment and contact information.')}<div class="grid two">${arr('properties').map(p=>`<button class="item" data-edit="${escapeHtml(p.id)}"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.address||p.name)} • ${escapeHtml(p.id)}</small></button>`).join('')}</div>`;
}
function workbook(){
 if(dataState.editing){const x=recordBy(arr('knowledge'),dataState.editing);if(!x)return '<p>Topic not found.</p>';const chosen=new Set(arr('assignments').filter(a=>a.entry_id===x.id).map(a=>a.property_id));return `${section('EXCEL CONTENT REVIEW',x.title,'Imported from '+x.source_sheet+' • Row '+x.source_row)}<button class="btn back" data-action="back">← Workbook list</button><div class="card"><div class="topline"><h2>Review and publish</h2>${statusTag(x.review_status)}</div>${x.review_note?note(x.review_note):''}<details><summary>Original spreadsheet text (preserved)</summary><p style="white-space:pre-wrap">${escapeHtml(x.original_body||'')}</p></details><form data-form="knowledge" data-id="${escapeHtml(x.id)}">${input('Heading','title',x.title,'required maxlength="160"')}${input('Category','category',x.category)}${area('Approved instructions','body',x.body,'required maxlength="8000"')}${area('Private review notes','review_note',x.review_note||'','maxlength="1800"')}<h3>Applies to these houses</h3><div class="checklist">${arr('properties').map(p=>`<label class="house-checkbox"><input type="checkbox" name="properties" value="${escapeHtml(p.id)}" ${chosen.has(p.id)?'checked':''}>${escapeHtml(homeName(p.id))}</label>`).join('')}</div>${dropdown('Publication','review_status',[['draft','Keep as draft (private)'],['published','Publish for selected houses']],x.review_status)}<label class="switch"><input type="checkbox" name="confirmed" value="1"> I have checked the wording, safety and relevant house assignments.</label><button class="btn primary" type="submit">Save workbook topic</button></form><h3 style="margin-top:24px">Reference photos and videos</h3>${mediaPanel('knowledge',x.id,true)}</div>`;}
 return `${section('IMPORTED EXCEL DATA','Workbook content','Review the house instructions before making unapproved guidance available to employees.')}<div class="notice">33 house columns were imported. Some original wording about pumps, septics, mowers and electrical boards is held as a draft until reviewed for each house.</div><div class="grid">${[['total',arr('knowledge').length],['Published',arr('knowledge').filter(k=>k.review_status==='published').length],['Drafts',arr('knowledge').filter(k=>k.review_status==='draft').length]].map(([label,n])=>`<div class="stat"><strong>${n}</strong><small>${escapeHtml(label)} topics</small></div>`).join('')}</div><div class="section-head"><h2>Topics</h2></div><div class="list">${arr('knowledge').map(k=>`<button class="item" data-edit="${escapeHtml(k.id)}"><span class="topline"><strong>${escapeHtml(k.title)}</strong>${statusTag(k.review_status)}</span><small>${escapeHtml(k.section==='regular_care'?'Regular Care':'Something Wrong')} • ${escapeHtml(k.category)} • Row ${k.source_row}</small></button>`).join('')}</div>`;
}
function guides(){
 if(dataState.editing){const x=recordBy(arr('guides'),dataState.editing);if(!x)return '<p>Guide not found</p>';return `${section('TROUBLESHOOTING','Edit decision-tree guide',x.title)}<button class="btn back" data-action="back">← Guide library</button><div class="card"><form data-form="guide" data-id="${escapeHtml(x.id)}">${input('Title','title',x.title,'required')}${input('Subtitle','subtitle',x.subtitle||'')}${dropdown('Applies to house','property_id',houseOptions(true),x.property_id||'')}${input('Search keywords (comma separated)','keywords',(x.keywords||[]).join(', '))}<h3>Guide steps</h3><p class="small muted">Existing branching choices are preserved. Edit only the question and the instructions for each step.</p>${(x.steps||[]).map((st,i)=>`<div class="card"><p class="small muted">Step ${i+1} • ${escapeHtml(st.key)}</p>${input('Heading','heading_'+i,st.heading||'')}${area('Step instructions','body_'+i,st.body||'')}</div>`).join('')}${dropdown('Status','status',[['draft','Save draft'],['published','Approve and publish']],x.status)}<label class="switch"><input type="checkbox" name="confirmed" value="1"> I reviewed the technical and safety advice.</label><button class="btn primary" type="submit">Save guide</button></form><h3 style="margin-top:24px">Guide media</h3>${mediaPanel('guide',x.id,true)}</div>`;}
 return `${section('GUIDED TROUBLESHOOTING','Guide library','Edit and review the existing decision-tree guides for employees.')}<div class="list">${arr('guides').map(x=>`<button class="item" data-edit="${escapeHtml(x.id)}"><span class="topline"><strong>${escapeHtml(x.title)}</strong>${statusTag(x.status)}</span><small>${escapeHtml(x.subtitle||'')} • ${escapeHtml(x.property_id?homeName(x.property_id):'All houses')}</small></button>`).join('')||'<div class="empty">No guides found.</div>'}</div>`;
}
function routines(){
 let x=recordBy(arr('routines'),dataState.editing)||{id:'',title:'',details:'',every_days:30,responsible:'resident',property_id:''};
 return `${section('PREVENTATIVE CARE','Regular care tasks','Create and maintain recurring house and yard tasks.')}<div class="card"><h3>${x.id?'Edit task':'Add a task'}</h3><form data-form="routine" data-id="${escapeHtml(x.id)}">${input('Task title','title',x.title,'required')}${area('Safe instructions','details',x.details)}${input('Frequency in days','every_days',x.every_days,'type="number" min="1" max="730" required')}${dropdown('Responsible','responsible',[['resident','Resident'],['technician','Technician']],x.responsible)}${dropdown('House','property_id',houseOptions(true),x.property_id||'')}<div class="actions"><button class="btn primary" type="submit">Save task</button>${x.id?'<button type="button" class="btn" data-action="back">Cancel editing</button>':''}</div></form>${x.id?mediaPanel('routine',x.id,true):''}</div><div class="section-head"><h2>Current tasks</h2></div><div class="list">${arr('routines').map(r=>`<button class="item" data-edit="${escapeHtml(r.id)}"><strong>${escapeHtml(r.title)}</strong><small>Every ${r.every_days} days • ${escapeHtml(r.property_id?homeName(r.property_id):'All houses')}</small></button>`).join('')}</div>`;
}
function equipment(){
 const x=recordBy(arr('equipment'),dataState.editing)||{id:'',property_id:arr('properties')[0]?.id||'',name:'',model:'',location:'',notes:''};
 return `${section('HOUSE EQUIPMENT','Equipment register','Record house appliances and models to improve troubleshooting.')}<div class="card"><h3>${x.id?'Edit equipment':'Add equipment'}</h3><form data-form="equipment" data-id="${escapeHtml(x.id)}">${dropdown('House','property_id',houseOptions(),x.property_id)}${input('Equipment name','name',x.name,'required')}${input('Location','location',x.location)}${input('Model','model',x.model)}${area('Notes','notes',x.notes)}<div class="actions"><button type="submit" class="btn primary">Save equipment</button>${x.id?'<button type="button" class="btn" data-action="back">Cancel editing</button>':''}</div></form>${x.id?mediaPanel('equipment',x.id,true):''}</div><div class="list">${arr('equipment').map(r=>`<button class="item" data-edit="${escapeHtml(r.id)}"><strong>${escapeHtml(r.name)}</strong><small>${escapeHtml(homeName(r.property_id))} • ${escapeHtml(r.model||'Model not recorded')}</small></button>`).join('')}</div>`;
}
function qr(){return `${section('PROPERTY LABELS','House QR codes','Print a distinct QR code for every property.')}<div class="card"><p>Open the QR generator using your private management link. No staff email or password is required.</p><a class="btn primary" href="qr-generator.html#access=${escapeHtml(privateKey)}" target="_blank" rel="noopener noreferrer">Open QR label generator</a><p class="small muted">Do not share this private management link. Employees can use the printed codes without signing in.</p></div>`;}
function welcome(){
 if(!manager())return overview();
 const categoryLabels={welcome:'Getting started',shopping:'Shopping & essentials',medical:'Medical & emergency',fuel:'Fuel',eating:'Eating out',rubbish:'Rubbish & waste'};
 const items=arr('welcome');
 if(dataState.editing){
  const isNew=dataState.editing==='new';
  const x=isNew?{id:'',category:'welcome',title:'',group_label:'',town:'',body:'',phone:'',email:'',map_query:'',source_url:'',property_id:'',sort_order:100,published:false,needs_review:true,source_note:''}:recordBy(items,dataState.editing);
  if(!x)return note('This welcome item could not be found.');
  return `${section('LOCAL HANDBOOK',isNew?'Add welcome information':'Edit '+x.title,'Edits appear in the employee app as soon as you publish the item.')}
   <button type="button" class="btn ghost" data-action="back">← Welcome information</button>
   <form class="card" data-form="welcome" data-id="${escapeHtml(x.id)}">
    ${dropdown('Section','category',Object.entries(categoryLabels),x.category)}
    ${dropdown('Applies to','property_id',houseOptions(true),x.property_id||'')}
    ${input('Title','title',x.title,'required maxlength="160"')}
    ${input('Subcategory (e.g. Groceries, Hospitals)','group_label',x.group_label||'','maxlength="80"')}
    ${input('Town / location','town',x.town||'','maxlength="100"')}
    ${area('Description and instructions','body',x.body||'','maxlength="1800" rows="5"')}
    ${input('Phone number (optional)','phone',x.phone||'','maxlength="50"')}
    ${input('Email address (optional)','email',x.email||'','type="email" maxlength="254"')}
    ${input('Google Maps search phrase (optional)','map_query',x.map_query||'','maxlength="250"')}
    ${input('Official source website (optional)','source_url',x.source_url||'','type="url" maxlength="400" placeholder="https://..."')}
    ${input('Display order','sort_order',x.sort_order??100,'type="number" min="0" max="9999"')}
    <label class="cp-welcome-switch"><input type="checkbox" name="published" value="1" ${x.published?'checked':''}> Publish this item to residents</label>
    <label class="cp-welcome-switch"><input type="checkbox" name="needs_review" value="1" ${x.needs_review?'checked':''}> Show "Details may change" until verified</label>
    ${x.source_note?`<details class="cp-welcome-source"><summary>Original document / verification notes</summary><p>${escapeHtml(x.source_note)}</p></details>`:''}
    <div class="actions"><button class="btn primary" type="submit">Save welcome information</button><button type="button" class="btn ghost" data-action="back">Cancel</button></div>
   </form>`;
 }
 const published=items.filter(x=>x.published).length,review=items.filter(x=>x.needs_review).length;
 return `${section('WELCOME HANDBOOK','Welcome & Local Info','Shared accommodation welcome details. You can edit phone numbers, services and instructions without changing the website code.')}
  <div class="grid"><div class="stat"><strong>${published}</strong><small>Published entries</small></div><div class="stat"><strong>${review}</strong><small>Items to confirm</small></div><div class="stat"><strong>${items.length}</strong><small>Total entries</small></div></div>
  <div class="notice">The original welcome letter has been imported. Medical phone numbers and the waste transfer station hours were checked against current sources. Other shops and contact details may need reconfirmation.</div>
  <div class="actions"><button class="btn primary" type="button" data-welcome-new>+ Add welcome information</button><a class="btn ghost" href="index.html" target="_blank" rel="noopener noreferrer">View employee app</a></div>
  ${Object.entries(categoryLabels).map(([cat,name])=>`<section class="cp-welcome-admin-group"><h2>${escapeHtml(name)} <span class="small muted">${items.filter(x=>x.category===cat).length}</span></h2>${items.filter(x=>x.category===cat).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(x=>`<button class="item cp-welcome-admin-row" type="button" data-edit="${escapeHtml(x.id)}"><span><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.town||'All areas')}${x.property_id?' • '+escapeHtml(homeName(x.property_id)):''}</small></span><span>${statusTag(x.published?'published':'draft')}${x.needs_review?'<small class="cp-review-flag">Review</small>':''}</span></button>`).join('')||'<p class="small muted">No entries yet.</p>'}</section>`).join('')}`;
}
function email(){
 const v=arr('emailSettings')[0]?.recipient_email||'';
 const notifications=arr('notifications');
 return `${section('NOTIFICATIONS','Maintenance email destination','New employee repair requests are saved first. Email delivery depends on the configured sending provider.')}<div class="card"><form data-form="email">${input('Send maintenance emails to','recipient_email',v,'type="email" required autocomplete="off"')}<button class="btn primary" type="submit">Save destination</button></form><button class="btn ghost" type="button" data-action="test-email">Send test email</button><p class="small muted">${dataState.payload?.email_provider_ready?'Email provider credentials appear configured. Check the per-request notification state below to confirm acceptance.':'Email sending is NOT configured: add RESEND_API_KEY and PC_EMAIL_FROM (verified sender) to Supabase secrets. Saving the recipient alone does not send emails.'} The link sent in each email opens that one maintenance request without revealing the private staff access token.</p></div><div class="grid">${[['Sent',notifications.filter(n=>n.state==='sent').length],['Pending',notifications.filter(n=>n.state==='pending').length],['Failed',notifications.filter(n=>n.state==='failed').length]].map(([label,n])=>`<div class="stat"><strong>${n}</strong><small>${label} notifications</small></div>`).join('')}</div>`;
}
function render(){
 if(!dataState.payload)return failureScreen('Staff workspace is not connected.');
 const view={overview,jobs,inspections,manage,houses,welcome,workbook,guides,routines,equipment,email,qr}[dataState.tab]||overview;
 scaffold(view());
 if(dataState.firstLinkScroll && selectedTicket && dataState.tab==='jobs') {
   dataState.firstLinkScroll=false;
   requestAnimationFrame(()=>document.getElementById('job-'+selectedTicket)?.scrollIntoView({behavior:'smooth',block:'center'}));
 }
}
async function work(fn,success){if(dataState.busy)return;dataState.busy=true;try{await fn();await refresh(success)}catch(err){dataState.error=String(err.message||err);render()}finally{dataState.busy=false;}}
app.addEventListener('click',async event=>{
 const tab=event.target.closest('[data-tab]');if(tab){dataState.tab=tab.dataset.tab;dataState.editing=null;dataState.search='';dataState.error='';render();window.scrollTo(0,0);return;}
 const filter=event.target.closest('[data-job-filter]');if(filter){dataState.jobFilter=filter.dataset.jobFilter;render();return;}
 const edit=event.target.closest('[data-edit]');if(edit){dataState.editing=edit.dataset.edit;dataState.error='';render();window.scrollTo(0,0);return;}
 const makeWelcome=event.target.closest('[data-welcome-new]');if(makeWelcome){dataState.tab='welcome';dataState.editing='new';render();window.scrollTo(0,0);return;}
 const action=event.target.closest('[data-action]');if(!action)return;
 if(action.dataset.action==='back'){dataState.editing=null;render();return;}
 if(action.dataset.action==='refresh'){await work(async()=>{},'Records refreshed');return;}
 if(action.dataset.action==='test-email'){
   await work(async()=>{const r=await api('email-test',{});if(!r.accepted)throw Error('Email provider did not accept the message.');}, 'Test email accepted by provider. Verify it arrives in the accommodation inbox.');
   return;
 }
 if(action.dataset.action==='inspection-followup'){
   await work(()=>api('inspection-create-ticket',{inspection_id:action.dataset.id}), 'Created a maintenance request for this house from the inspection.');
   dataState.tab='jobs';dataState.jobFilter='open';render();return;
 }
 if(action.dataset.action==='complete-ticket'){
   if(!window.confirm('Mark this maintenance request as completed?'))return;
   const form=action.closest('article')?.querySelector('form[data-form="ticket"]');
   let technician_notes=form?.querySelector('textarea[name="technician_notes"]')?.value||'';
   if(!technician_notes.trim()){
     const answer=window.prompt('Briefly describe how the issue was resolved (recommended):','');
     if(answer===null)return;
     technician_notes=answer.trim().slice(0,4000);
   }
   await work(()=>api('ticket-update',{id:action.dataset.id,status:'Resolved',technician_notes}), 'Maintenance request marked complete and updated against the house.');
   return;
 }
 if(action.dataset.action==='retry-email'){
   await work(()=>api('notification-retry',{id:action.dataset.id}), 'Email delivery attempt updated. See notification status in the job.');
   return;
 }
 if(action.dataset.action==='media'){
   action.disabled=true;
   try{const res=await api('media-url',{id:action.dataset.id});const u=new URL(res.url);if(u.protocol!=='https:')throw Error('Invalid private link');dataState.mediaLinks[action.dataset.id]=u.href;render();}
   catch(err){dataState.error=String(err.message||err);render()}
   finally{if(action.isConnected)action.disabled=false;}
 }
});
app.addEventListener('input',event=>{
 if(event.target.matches('[data-search]')){
  dataState.search=event.target.value;
  // Preserve focus and caret position while filtering.
  const pos=event.target.selectionStart;render();const box=app.querySelector('[data-search]');box?.focus();box?.setSelectionRange(pos,pos);
 }
});
app.addEventListener('change',async event=>{
 const el=event.target.closest('[data-upload]');if(!el)return;
 const file=el.files?.[0];if(!file)return;
 if(file.size===0||file.size>25*1024*1024){dataState.error='Upload must be between 1 byte and 25 MB.';render();return;}
 await work(async()=>{
  const kind=el.dataset.upload,entity_id=el.dataset.entity;
  const signed=await api('media-upload',{kind,entity_id,mime_type:file.type,file_bytes:file.size,filename:file.name,caption:file.name});
  if(!window.supabase?.createClient)throw Error('Media upload library did not load.');
  const client=window.supabase.createClient(PC.supabaseUrl,PC.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const res=await client.storage.from('pc-private-media').uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type});
  if(res.error)throw res.error;
 },'Photo or video uploaded.');
});
app.addEventListener('submit',async event=>{
 const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();
 const f=new FormData(form),type=form.dataset.form,id=form.dataset.id;
 await work(async()=>{
  if(type==='ticket-create')return api('ticket-create',{property_id:txt(f.get('property_id')),title:txt(f.get('title'),150),details:txt(f.get('details'),2000),contact_name:txt(f.get('contact_name'),100),contact_phone:txt(f.get('contact_phone'),40)});
  if(type==='ticket')return api('ticket-update',{id,status:txt(f.get('status')),technician_notes:txt(f.get('technician_notes'),4000)});
  if(type==='property'){const value={id};for(const k of ['name','address','site','water_supply','power_supplier','hot_water_type','emergency_contact_name','emergency_contact_number','qr_public_notes','approved_guide_notes'])value[k]=txt(f.get(k),4000);return api('property-save',value);}
  if(type==='knowledge'){
    const property_ids=[...form.querySelectorAll('input[name=properties]:checked')].map(x=>x.value);
    return api('knowledge-save',{id,title:txt(f.get('title'),160),category:txt(f.get('category'),150),body:txt(f.get('body'),8000),review_note:txt(f.get('review_note'),1800),review_status:txt(f.get('review_status')),property_ids,confirmed:f.get('confirmed')==='1'});
  }
  if(type==='guide'){
    const g=recordBy(arr('guides'),id);
    const steps=(g.steps||[]).map((s,i)=>({...s,heading:txt(f.get('heading_'+i),200),body:txt(f.get('body_'+i),6000)}));
    return api('guide-save',{id,title:txt(f.get('title'),120),subtitle:txt(f.get('subtitle'),200),property_id:txt(f.get('property_id')),keywords:txt(f.get('keywords'),500).split(',').map(x=>x.trim()).filter(Boolean),steps,status:txt(f.get('status')),confirmed:f.get('confirmed')==='1'});
  }
  if(type==='routine'){return api('routine-save',{id:id||null,title:txt(f.get('title'),150),details:txt(f.get('details'),4000),every_days:Number(f.get('every_days')),property_id:txt(f.get('property_id')),responsible:txt(f.get('responsible'))});}
  if(type==='equipment'){return api('equipment-save',{id:id||null,name:txt(f.get('name'),200),location:txt(f.get('location'),200),model:txt(f.get('model'),200),notes:txt(f.get('notes'),2000),property_id:txt(f.get('property_id'))});}
  if(type==='email'){return api('email-save',{recipient_email:txt(f.get('recipient_email'),254)});}
  if(type==='welcome'){
   const value={id:id||null,category:txt(f.get('category'),30),property_id:txt(f.get('property_id'),25),title:txt(f.get('title'),160),body:txt(f.get('body'),1800),group_label:txt(f.get('group_label'),80),town:txt(f.get('town'),100),phone:txt(f.get('phone'),50),email:txt(f.get('email'),254),map_query:txt(f.get('map_query'),250),source_url:txt(f.get('source_url'),400),sort_order:Number(f.get('sort_order')),published:f.get('published')==='1',needs_review:f.get('needs_review')==='1'};
   const result=await api('welcome-save',value);dataState.editing=null;return result;
  }
  throw Error('Unknown form');
 },'Changes saved to Compendium.');
});
(async()=>{
 if(!/^[0-9a-f]{64}$/.test(privateKey)){failureScreen('Open your private staff link to start working.');return;}
 try{await refresh();}catch(err){failureScreen(String(err.message||err),true);}
})();
