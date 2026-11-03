'use strict';
/* Property Care V4 — QR-first employee app. No resident sign-in or Supabase RLS bypass. */
const cfg = window.PROPERTY_CARE_CONFIG || {};
const root = document.querySelector('#app');
const params = new URLSearchParams(location.search);
const houseCode = (params.get('house') || '').trim();
const languageOptions = [['en','English'],['fil','Filipino / Tagalog'],['ceb','Cebuano / Bisaya'],['ilo','Ilocano'],['hil','Hiligaynon / Ilonggo']];
const storedLanguage = localStorage.getItem('pc4_lang') || 'en';
const s = {house:null,equipment:[],guides:[],routines:[],media:[],tab:'home',guide:null,step:'',history:[],language:storedLanguage,search:'',draftTitle:'',draftChecks:[],receipt:null,busy:false,notice:'',live:false,errors:[]};
const e = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el = sel=>document.querySelector(sel);
const uuid4=()=>crypto.randomUUID?crypto.randomUUID():[...crypto.getRandomValues(new Uint8Array(16))].map((n,i)=>{if(i===6)n=(n&15)|64;if(i===8)n=(n&63)|128;return n.toString(16).padStart(2,'0')}).join('').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5');
const codeIsDemo = /^DEMO-H(?:0[1-9]|[12]\d|30)$/.test(houseCode);
const demoHouse = codeIsDemo ? houseCode.slice(5) : null;
const supported = /^([A-Za-z0-9-]{6,72})$/.test(houseCode);
const liveConfigured = Boolean(cfg.supabaseUrl && cfg.publishableKey);
const endpoint=liveConfigured?cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/pc-public':'';
const labels={
 en:{home:'Home',fix:'Troubleshoot',care:'Regular care',requests:'Requests',question:'Something wrong?',routine:'Keep your home in good shape',ticket:'Request maintenance',help:'Choose a guide or describe your problem',request:'Lodge a maintenance request',back:'Back',continue:'Continue',notFixed:'Still not fixed? Request maintenance',urg:'Call now — do not wait for a ticket',language:'Language'},
 fil:{home:'Home',fix:'Pag-aayos',care:'Regular na pag-aalaga',requests:'Mga request',question:'May problema?',routine:'Alagaan ang bahay',ticket:'Humingi ng maintenance',help:'Pumili ng gabay o ilarawan ang problema',request:'Magpadala ng maintenance request',back:'Bumalik',continue:'Magpatuloy',notFixed:'Hindi pa ayos? Mag-request ng maintenance',urg:'Tumawag agad — huwag maghintay ng ticket',language:'Wika'},
 ceb:{home:'Home',fix:'Pagsusi sa problema',care:'Pag-atiman sa balay',requests:'Mga hangyo',question:'Adunay problema?',routine:'Atimana ang balay',ticket:'Mangayo og maintenance',help:'Pagpili og giya o ihulagway ang problema',request:'Ipadala ang maintenance request',back:'Balik',continue:'Padayon',notFixed:'Wala pa maayo? Pangayo og maintenance',urg:'Tawag dayon — ayaw paghulat og ticket',language:'Pinulongan'}
};
const t=k=>(labels[s.language]||labels.en)[k]||labels.en[k]||k;
function escUrl(url){try{let u=new URL(url,location.href);return ['https:','http:'].includes(u.protocol)?e(u.href):''}catch{return ''}}
function nav(){let items=[['home','⌂',t('home')],['fix','🔧',t('fix')],['care','🌱',t('care')],['requests','🎫',t('requests')]];return `<div class="tabs"><div class="tabinner">${items.map(([id,icon,text])=>`<button data-act="tab" data-id="${id}" class="${s.tab===id?'active':''}"><span>${icon}</span>${e(text)}</button>`).join('')}</div></div>`}
function banner(){return s.language==='en'?'':`<div class="notice"><b>Translation note:</b> Navigation labels may be translated, but technical and safety instructions are currently in English. Approved human-reviewed translations are required before rollout. You can describe a maintenance problem in your own language.</div>`}
function emergency(){let h=s.house||{},phone=(h.emergency_contact_number||'').replace(/[^+0-9]/g,'');return `<div class="emergency"><b>🚨 Emergencies and unsafe conditions</b><p>Fire, smoke, electrical danger, serious injury or immediate danger: move away and call <b>000</b>. For an urgent fault, telephone maintenance. A ticket is <b>not</b> an emergency alert.</p>${phone?`<a href="tel:${e(phone)}">☎ ${e(h.emergency_contact_name||'Emergency maintenance')}: ${e(h.emergency_contact_number)}</a>`:'<b>Emergency maintenance number has not been entered yet. Ask your employer for the number.</b>'}</div>`}
function media(kind,id,key=''){let m=s.media.filter(x=>x.kind===kind&&x.entity_id===String(id)&&(!key||x.step_key===key));if(!m.length)return '';return `<div class="media-grid">${m.map(x=>`<figure>${x.mime_type?.startsWith('video/')?`<video controls preload="metadata" playsinline src="${escUrl(x.signed_url)}"></video>`:`<img src="${escUrl(x.signed_url)}" alt="${e(x.caption||x.filename||'Guide photo')}" loading="lazy">`}<figcaption>${e(x.caption||x.filename||'Reference media')}${x.transcript?`<details><summary>Video transcript</summary>${e(x.transcript)}</details>`:''}</figcaption></figure>`).join('')}</div>`}
function setTab(tab){s.tab=tab;s.notice='';window.scrollTo({top:0,behavior:'smooth'});render()}
function render(){if(!s.house)return;const h=s.house;root.innerHTML=`<div class="top"><div class="topinner"><div class="brand"><div class="brandicon">⌂</div><div><strong>Property Care</strong><small>${e(h.name||h.address||'Your house')}</small></div></div><select class="language" aria-label="Preferred language" data-lang>${languageOptions.map(([code,name])=>`<option value="${code}" ${code===s.language?'selected':''}>${e(name)}</option>`).join('')}</select></div></div><div class="wrap">${s.notice?`<div class="notice">${e(s.notice)}</div>`:''}${s.live?'':`<div class="notice"><b>DEMO ONLY:</b> This sample uses placeholder houses. Maintenance requests are saved on this browser only and are <b>not sent</b> to a maintenance person.</div>`}${banner()}${({home:home,fix:fix,guide:guide,care:care,requests:requests,ticket:ticket,receipt:receipt})[s.tab]?.()||home()}<div class="footer">Property Care • House-specific guides • Employee access without accounts • Report dangerous faults by phone</div></div>${nav()}`}
function hero(label,title,subtitle){return `<section class="hero"><small>${e(label)}</small><h1>${e(title)}</h1><p>${e(subtitle)}</p></section>`}
function home(){let h=s.house;return `${hero('YOUR HOUSE',h.name||h.address,'Scan the house QR code anytime for the right guides, regular checks and maintenance help.')}<div class="grid"><button class="tile" data-act="tab" data-id="fix"><span class="emoji">🔧</span><strong>${t('question')}</strong><span class="desc">Guided troubleshooting, photos and videos</span></button><button class="tile" data-act="tab" data-id="care"><span class="emoji">🌿</span><strong>${t('care')}</strong><span class="desc">Preventative house and yard jobs</span></button><button class="tile" data-act="tab" data-id="requests"><span class="emoji">🎫</span><strong>${t('ticket')}</strong><span class="desc">Send a problem to maintenance</span></button></div><div class="card"><h2>🏠 House information</h2><p><b>Address:</b> ${e(h.address)}</p><p><b>Water supply:</b> ${e(h.water_supply||'To be entered')}</p><p><b>Hot water:</b> ${e(h.hot_water_type||'To be entered')}</p>${h.approved_guide_notes?`<p>${e(h.approved_guide_notes)}</p>`:''}${media('property',h.id)}</div>${s.equipment.length?`<h2 class="subhead">Equipment at this house</h2>${s.equipment.map(x=>`<div class="card"><h3>${e(x.name)}</h3><div class="muted tiny">${e(x.location||'')} ${e(x.model||'')}</div><p>${e(x.notes||'')}</p>${media('equipment',x.id)}</div>`).join('')}`:''}${emergency()}`}
function fix(){let q=s.search.toLowerCase().trim(),list=s.guides.filter(g=>!q||[g.title,g.subtitle,...(g.keywords||[])].join(' ').toLowerCase().includes(q));return `${hero('FIND THE CAUSE',t('fix'),'Simple checks first. If they do not help, request maintenance.')}${emergency()}<form data-form="search"><div class="field"><label>Describe the issue or search for a guide</label><input name="q" value="${e(s.search)}" placeholder="e.g. no water, power, blocked toilet"></div><button class="primary full" type="submit">Search guides</button></form><h2 class="subhead">Helpful guides</h2>${list.length?list.map(g=>`<button class="guide" data-act="guide" data-id="${e(g.id)}"><strong>📘 ${e(g.title)}</strong><small>${e(g.subtitle)}</small></button>`).join(''):`<div class="card"><b>No matching guide found.</b><p>Tell the maintenance person what happened and what you have already checked.</p><button class="primary full" data-act="newticket" data-title="${e(s.search)}">${t('request')}</button></div>`}<button class="secondary full" data-act="newticket">${t('request')}</button>`}
function guide(){let g=s.guides.find(x=>x.id===s.guide);if(!g)return fix();let st=g.steps.find(x=>x.key===s.step)||g.steps[0],idx=Math.max(0,s.history.length);return `<button class="back" data-act="guideback">‹ ${t('back')}</button>${hero('GUIDED TROUBLESHOOTING',g.title,g.subtitle)}${emergency()}<div class="card"><div class="row between"><span class="pill">Step ${idx+1}</span><span class="tiny muted">Follow only safe, approved checks</span></div><h2 style="margin-top:16px">${e(st.heading)}</h2><p>${e(st.body)}</p>${media('guide',g.id,st.key)}<div class="divider"></div>${st.options?.length?st.options.map((opt,i)=>`<button class="answer" data-act="answer" data-index="${i}">${e(opt.label)}</button>`).join(''):''}${st.end==='resolved'?'<div class="notice success"><b>Problem resolved?</b> You can return home. If the fault returns, notify maintenance.</div>':''}${st.end==='ticket'?`<div class="notice"><b>Maintenance may be needed.</b> Include the checks already completed in your request.</div><button class="primary full" data-act="newticket" data-title="${e(g.title)}">${t('request')}</button>`:''}${st.end==='urgent'?`<div class="emergency"><b>${t('urg')}</b><p>Move to a safe place and contact the appropriate emergency service or maintenance contact immediately.</p></div>`:''}</div>${st.end!=='urgent'?`<button class="secondary full" data-act="newticket" data-title="${e(g.title)}">${t('notFixed')}</button>`:''}`}
function care(){let h=s.house;return `${hero('PREVENTATIVE CHECKS',t('routine'),'A few small jobs can prevent bigger maintenance problems.')}${banner()}<div class="notice">Ticked tasks are remembered on this device only. They are not a certified inspection or shared maintenance record.</div>${s.routines.length?s.routines.map(r=>{let key='pc4_care_'+houseCode+'_'+r.id,done=localStorage.getItem(key)==='1';return `<div class="card routine ${done?'checkdone':''}"><input type="checkbox" data-routine="${e(r.id)}" aria-label="Mark task completed" ${done?'checked':''}><div class="routine-body"><strong>${e(r.title)}</strong><div class="tiny muted">Recommended every ${e(r.every_days)} day${r.every_days===1?'':'s'}</div><p>${e(r.details)}</p>${media('routine',r.id)}</div></div>`}).join(''):'<div class="card">Your maintenance team has not published routine tasks yet.</div>'}`}
function requests(){let records=loadReceipts();return `${hero('HELP WITH A PROBLEM',t('requests'),'Send a request without creating an account.')}${emergency()}<div class="card"><h2>Need maintenance?</h2><p>A request will include this house automatically: <b>${e(s.house.name||s.house.address)}</b>.</p><button class="primary full" data-act="newticket">${t('request')}</button></div>${records.length?`<h2 class="subhead">Requests made on this device</h2>${records.map(x=>`<div class="card"><strong>${e(x.title||'Maintenance request')}</strong><div class="tiny muted">${e(x.time)} • ${e(x.id.slice(0,8).toUpperCase())}</div><div class="actions"><button class="secondary" data-act="status" data-id="${e(x.id)}">Check status</button></div></div>`).join('')}`:''}`}
function ticket(){return `<button class="back" data-act="tab" data-id="requests">‹ ${t('back')}</button>${hero('NEW MAINTENANCE REQUEST',t('request'),'Your house is already selected. No account or password is needed.')}${emergency()}<div class="card"><form data-form="ticket"><p class="tiny muted">House: ${e(s.house.address)}</p><div class="field"><label>What needs fixing? *</label><input name="title" maxlength="150" value="${e(s.draftTitle)}" placeholder="e.g. No hot water" required></div><div class="field"><label>What happened? *</label><textarea name="details" maxlength="2000" required placeholder="Tell us what you noticed. You can write in your own language."></textarea></div><div class="field"><label>Your name (optional)</label><input name="contact_name" maxlength="100" autocomplete="name" placeholder="Name"></div><div class="field"><label>Best phone number (optional)</label><input name="contact_phone" maxlength="40" autocomplete="tel" placeholder="Phone number"></div><div class="field"><label>Photos or videos (optional, up to 3 files)</label><input type="file" name="files" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" multiple><div class="tiny muted">Up to 25 MB per file. Only share images needed to explain the repair. Do not include people or personal documents.</div></div><div style="display:none"><label>Leave blank <input name="website" autocomplete="off"></label></div><button class="primary full" type="submit" ${s.busy?'disabled':''}>${s.busy?'Sending…':'Send maintenance request'}</button></form></div>`}
function receipt(){let x=s.receipt||{};return `${hero('REQUEST RECEIVED',s.live?'Sent to maintenance':'Saved in demo only',s.live?'The maintenance team can now see your request.':'No live maintenance staff have been notified.') }<div class="card"><h2>${e(x.title||'Maintenance request')}</h2><p>House: ${e(s.house.address)}</p><p>Reference number</p><div class="receipt">${e((x.id||'').slice(0,8).toUpperCase())}</div><p class="tiny muted">Keep this reference. You can check the status later on this device.</p>${x.status?`<p><span class="status">${e(x.status)}</span></p>`:''}<div class="actions"><button class="primary" data-act="tab" data-id="home">Return home</button><button class="secondary" data-act="tab" data-id="requests">My requests</button></div></div>${emergency()}`}
function loadReceipts(){try{return JSON.parse(localStorage.getItem('pc4_receipts_'+houseCode)||'[]')}catch{return []}}
function saveReceipt(x){let a=loadReceipts();a.unshift(x);localStorage.setItem('pc4_receipts_'+houseCode,JSON.stringify(a.slice(0,20)))}
function demoData(){let id=demoHouse;let num=Number(id.slice(1));let guides=(window.PROPERTY_CARE_DEMO_GUIDES||[]).map((g,i)=>({...g,id:'guide'+i,status:'published',property_id:null}));return {house:{id,name:`Demo House ${String(num).padStart(2,'0')}`,address:`Demo property ${id} — replace with real address`,water_supply:num%3?'Town water':'Tank supply',hot_water_type:'Enter equipment information',emergency_contact_name:'To be added by administrator',emergency_contact_number:''},guides,equipment:[],routines:[{id:'garden',title:'Inspect yard and remove loose debris',details:'Collect litter, check outdoor walkways and report unsafe items. Avoid lifting heavy objects or using unfamiliar machinery.',every_days:7},{id:'drains',title:'Check accessible outdoor drains',details:'From ground level, look for visible leaves blocking drains. Do not open pits or enter confined spaces.',every_days:14},{id:'leaks',title:'Check for obvious water leaks',details:'Look around visible taps and fittings for dripping water. Do not attempt plumbing repairs.',every_days:7},{id:'aircon',title:'Keep air-conditioner vents clear',details:'Make sure furniture and loose items do not block accessible vents. Follow the appliance guide for approved filter cleaning.',every_days:30}],media:[]}}
async function api(action,payload=null){if(!liveConfigured)throw Error('The cloud endpoint is not configured.');let url=endpoint+'?action='+encodeURIComponent(action)+(payload===null?'&code='+encodeURIComponent(houseCode):'');let opts={method:payload?'POST':'GET',headers:{'Content-Type':'application/json',apikey:cfg.publishableKey,...(payload?{}:{})}};if(payload)opts.body=JSON.stringify({...payload,code:houseCode,action});let response=await fetch(url,opts);let data=await response.json().catch(()=>({error:'The server returned an unreadable response.'}));if(!response.ok)throw Error(data.error||'Service unavailable');return data;}
async function init(){if(!supported){root.innerHTML=`<div class="intro"><span>⌂</span><h1>Property Care</h1><p>Scan the QR code displayed in your house to open that property's guides immediately. No login is required.</p><div class="card"><p><b>Testing the app?</b> Open a sample home without using a QR code.</p><a class="primary full" style="display:block;text-decoration:none" href="?house=DEMO-H01">Open sample house</a></div><p class="tiny muted">Staff: <a href="staff.html">Protected maintenance dashboard</a></p></div>`;return;}
 try{if(codeIsDemo){Object.assign(s,demoData(),{live:false});}else{if(!liveConfigured)throw Error('This QR code needs the app to be connected to its dedicated backend.');let payload=await api('house');Object.assign(s,payload,{live:true});}render()}catch(err){root.innerHTML=`<div class="intro"><span>⌂</span><h1>Unable to open this house</h1><div class="notice">${e(err.message)}</div><p>Check your internet connection or ask the maintenance team for a replacement QR code.</p><a class="secondary" href="index.html">Return to start</a></div>`}}
root.addEventListener('change',event=>{let item=event.target;if(item.matches('[data-lang]')){s.language=item.value;localStorage.setItem('pc4_lang',s.language);render()}if(item.matches('[data-routine]')){localStorage.setItem('pc4_care_'+houseCode+'_'+item.dataset.routine,item.checked?'1':'0');render()}});
root.addEventListener('click',async event=>{let b=event.target.closest('[data-act]');if(!b)return;let action=b.dataset.act;if(action==='tab'){setTab(b.dataset.id);return}if(action==='guide'){s.guide=b.dataset.id;s.step=s.guides.find(x=>x.id===s.guide)?.steps?.[0]?.key||'';s.history=[];setTab('guide');return}if(action==='answer'){let g=s.guides.find(x=>x.id===s.guide),current=g?.steps.find(x=>x.key===s.step);let choice=current?.options?.[Number(b.dataset.index)];if(choice){s.history.push({key:s.step,question:current.heading,answer:choice.label});s.step=choice.next;render();window.scrollTo({top:0,behavior:'smooth'})}return}if(action==='guideback'){if(s.history.length){s.step=s.history.pop().key;render()}else setTab('fix');return}if(action==='newticket'){s.draftTitle=b.dataset.title||s.search||'';s.draftChecks=s.history.map(x=>x.question+' — '+x.answer);setTab('ticket');return}if(action==='status'){let x=loadReceipts().find(x=>x.id===b.dataset.id);if(!x)return;try{if(s.live){let data=await api('ticket-status',{ticket_id:x.id,receipt:x.receipt});s.receipt={...x,status:data.status};}else{s.receipt={...x,status:'Demo only'}}setTab('receipt')}catch(ex){s.notice=ex.message;render()}return}});
root.addEventListener('submit', async event => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  const f = new FormData(form);
  if (form.dataset.form === 'search') {
    s.search = String(f.get('q') || '').trim();
    render();
    return;
  }
  if (form.dataset.form !== 'ticket' || s.busy) return;
  const title = String(f.get('title') || '').trim();
  const details = String(f.get('details') || '').trim();
  const files = [...form.querySelector('input[type=file]').files];
  if (!title || !details) return;
  if (files.length > 3 || files.some(file =>
    file.size > 25 * 1024 * 1024 || file.size === 0 ||
    !['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'].includes(file.type)
  )) {
    alert('Choose up to three JPG, PNG, WEBP, MP4, MOV or WEBM files, each 25 MB or smaller.');
    return;
  }
  s.busy = true;
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  button.textContent = 'Sending…';
  try {
    let created;
    if (s.live) {
      created = await api('ticket', {
        title, details, checks: s.draftChecks,
        contact_name: String(f.get('contact_name') || ''),
        contact_phone: String(f.get('contact_phone') || ''),
        language: s.language,
        website: String(f.get('website') || '')
      });
      // Store receipt before uploads, so the ticket reference is not lost
      // if the media upload fails later.
      const item = {
        id: created.id, receipt: created.receipt, title,
        time: new Date().toLocaleString('en-AU'), status: created.status || 'New'
      };
      saveReceipt(item);
      if (files.length) {
        if (!window.supabase?.createClient)
          throw Error('Ticket created, but photo upload is unavailable. Reference: ' + created.id.slice(0,8));
        const client = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
          auth: {persistSession:false, autoRefreshToken:false}
        });
        for (const file of files) {
          const att = await api('upload-ticket-media', {
            ticket_id: created.id, receipt: created.receipt,
            filename: file.name, mime_type: file.type, file_bytes: file.size
          });
          const up = await client.storage.from('pc-private-media')
            .uploadToSignedUrl(att.path, att.token, file, {contentType:file.type});
          if (up.error) throw Error('Ticket ' + created.id.slice(0,8) +
            ' was created, but media upload failed: ' + up.error.message);
        }
      }
      s.receipt = item;
    } else {
      created = {id:uuid4(),receipt:'demo-local',status:'Demo only'};
      const item = {id:created.id,receipt:created.receipt,title,
        time:new Date().toLocaleString('en-AU'),status:created.status};
      saveReceipt(item);
      s.receipt = item;
    }
    setTab('receipt');
  } catch (ex) {
    alert(ex.message || 'Request could not be sent. Please phone maintenance if urgent.');
  } finally {
    s.busy = false;
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = 'Send maintenance request';
    }
  }
});
init();
