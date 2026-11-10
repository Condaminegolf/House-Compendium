'use strict';
/* Separate Compendium Accommodation Content Editor.
   Public source NEVER contains a private access token or service-role key. */
(() => {
  const app=document.getElementById('editor-app');
  const cfg=window.PROPERTY_CARE_CONFIG||{};
  const key=new URLSearchParams(location.hash.replace(/^#/,'' )).get('access')||'';
  const endpoint=String(cfg.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/pc-editor';
  const tabs=[['overview','⌂','Overview'],['houses','🏠','House details'],['safety','🚨','Emergencies & safety'],['bulk','⇄','Bulk update'],['articles','📘','Care & articles'],['wizard','🔧','Guided steps'],['media','🎬','Videos & photos']];
  const fields=[
    {key:'emergency_contact_name',label:'Emergency maintenance contact',group:'Emergency',placeholder:'Name or team'},
    {key:'emergency_contact_number',label:'Emergency maintenance phone',group:'Emergency',placeholder:'Phone number'},
    {key:'emergency_instructions',label:'Emergency instructions',group:'Emergency',multi:true,placeholder:'What to do during an urgent incident'},
    {key:'water_supply',label:'Water supply type',group:'Water & tanks',placeholder:'Bore, town water, etc.'},
    {key:'water_tanks_info',label:'Water tank information',group:'Water & tanks',multi:true,placeholder:'Tank locations, capacity, safe checks and approved access instructions'},
    {key:'water_pump_info',label:'Water pump information',group:'Water & tanks',multi:true,placeholder:'Pump location, operation notes and when to report problems'},
    {key:'hot_water_type',label:'Hot-water system',group:'Water & tanks',placeholder:'Electric, gas or solar system'},
    {key:'septic_system_info',label:'Septic / wastewater information',group:'Services',multi:true,placeholder:'System type, safe warnings, contacts'},
    {key:'power_supplier',label:'Power supplier',group:'Services',placeholder:'Electricity provider'},
    {key:'power_board_info',label:'Electrical and switchboard information',group:'Services',multi:true,placeholder:'Approved location and safety advice, no DIY wiring'},
    {key:'rubbish_arrangements',label:'Bins and rubbish arrangements',group:'Services',multi:true,placeholder:'Bin location, collection arrangements and skip details'},
    {key:'qr_public_notes',label:'General house notes',group:'Services',multi:true,placeholder:'Other information employees should know'}
  ];
  const state={data:null,tab:'overview',houseId:'',selected:new Set(),articleId:null,wizardId:null,wizardDraft:null,mediaKind:'property',mediaTarget:'ALL_HOUSES',bulkPreview:null,busy:false,notice:'',error:'',filter:'',articleSearch:''};
  const E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const record=(name)=>state.data?.[name]||[];
  const homes=()=>record('houses');
  const houseLabel=id=>{const h=homes().find(x=>x.id===id);return h?`${h.name} (${h.id})`:id};
  const date=v=>{if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})};
  const status=(published)=>`<span class="pill ${published?'':'draft'}">${published?'Published':'Draft'}</span>`;
  const field=(name,label,value='',multi=false,extra='')=>`<div class="field"><label for="${E(name)}">${E(label)}</label>${multi?`<textarea id="${E(name)}" name="${E(name)}" ${extra}>${E(value)}</textarea>`:`<input id="${E(name)}" name="${E(name)}" value="${E(value)}" ${extra}>`}</div>`;
  const title=(eyebrow,heading,description)=>`<div class="page-head"><div class="eyebrow">${E(eyebrow)}</div><h1>${E(heading)}</h1><p>${E(description)}</p></div>`;
  const button=(label,action,extra='')=>`<button class="btn" type="button" data-action="${E(action)}" ${extra}>${E(label)}</button>`;
  function notify(message,err=false){
    const node=document.createElement('div');node.className='toast';node.textContent=message;
    if(err)node.style.background='#963d2e';document.body.append(node);setTimeout(()=>node.remove(),4600);
  }
  async function api(action,payload){
    if(!cfg.supabaseUrl||!cfg.publishableKey)throw Error('Supabase is not configured in config.js.');
    if(!/^[a-f0-9]{64}$/.test(key))throw Error('Open the private editor link supplied to the accommodation manager.');
    const headers={'content-type':'application/json','x-pc-editor-key':key,apikey:cfg.publishableKey};
    const request={method:payload===undefined?'GET':'POST',headers,cache:'no-store'};
    if(payload!==undefined)request.body=JSON.stringify({...payload,action});
    const response=await fetch(endpoint+(payload===undefined?'?action=bootstrap':''),request);
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(body.error||`Editor service error ${response.status}`);
    return body;
  }
  async function reload(message){
    const data=await api('bootstrap');state.data=data;
    if(!homes().some(h=>h.id===state.houseId))state.houseId=homes()[0]?.id||'';
    if(state.selected.size===0)state.selected=new Set(homes().map(x=>x.id));
    if(!validMediaTarget(state.mediaKind,state.mediaTarget))state.mediaTarget=mediaTargets(state.mediaKind)[0]?.id||'';
    render();if(message)notify(message);
  }
  function validMediaTarget(kind,id){return mediaTargets(kind).some(x=>x.id===id)}
  function mediaTargets(kind){
    if(kind==='property')return [{id:'ALL_HOUSES',name:'All 33 houses — shared public video'},...homes().map(h=>({id:h.id,name:houseLabel(h.id)}))];
    if(kind==='guide')return record('guides').map(g=>({id:g.id,name:g.title}));
    return record('articles').map(a=>({id:a.id,name:a.title}));
  }
  function shell(view){
    const active=state.tab;
    app.innerHTML=`<header class="header"><div class="header-inner"><div class="brand"><div class="brand-symbol">⌂</div><div><strong>Accommodation Content Editor</strong><small>Compendium • Separate property content workspace</small></div></div><span class="private">Private link • No sign-in</span></div></header>
     <div class="shell"><nav class="nav" aria-label="Editor sections">${tabs.map(([id,ico,label])=>`<button data-tab="${id}" class="${active===id?'active':''}">${ico} ${label}</button>`).join('')}</nav>
     ${state.error?`<div class="error" role="alert">${E(state.error)}</div>`:''}
     ${view}<div class="role-note">Updates save to Compendium, not this browser. Draft guides remain hidden. Public house information is available to anyone who opens that house; do not enter passwords, sensitive access codes or personal resident information. Private editor link expires ${E(date(state.data.expires_at))}.</div></div>`;
  }
  function safetyPage(){
    const g=state.data?.emergencyGuidance||{};
    return `${title('EMERGENCY & SAFETY','Emergencies and unsafe conditions','Edit the warning shown across all houses. House-specific emergency contacts and instructions are still managed under House details or Bulk update.')}
      <div class="card"><div class="notice"><strong>Emergency safety notice:</strong> The app will always include a separate instruction to call 000 for immediate danger and explain that maintenance tickets are not emergency alerts. Those safeguards cannot be removed by this editor.</div>
      <form data-form="emergency-guidance">
      ${field('heading','Safety panel heading',g.heading||'Emergencies and unsafe conditions',false,'required minlength="3" maxlength="120"')}
      ${field('emergency_text','What to do in an emergency',g.emergency_text||'',true,'required minlength="10" maxlength="1800" rows="4"')}
      ${field('unsafe_text','Unsafe conditions — what to avoid and when to call maintenance',g.unsafe_text||'',true,'required minlength="10" maxlength="1800" rows="5"')}
      <label class="choice"><input type="checkbox" name="confirmed" required> I have reviewed this information for all accommodation properties.</label>
      <button class="btn primary" type="submit">Save safety information for all houses</button>
      </form>
      <p class="small muted">This shared message is visible in the red safety panel on all 33 houses and within Something Wrong. Changes will appear after the employee page refreshes.</p></div>
      <div class="card"><h2>House-specific contacts and warnings</h2><p>For the on-call contact, emergency phone number, or a particular house's emergency procedure, use <b>House details</b>. To apply one contact or instruction to many houses, use <b>Bulk update</b>.</p><div class="actions"><button class="btn" type="button" data-tab="houses">Edit a house</button><button class="btn" type="button" data-tab="bulk">Bulk emergency changes</button></div></div>`;
  }
  function overview(){
    const g=record('guides'),a=record('articles');
    return `${title('Your content workspace','Manage accommodation information','Update house details, apply shared changes, publish safe guides and upload photos or videos without using the staff dashboard.')}
      <div class="stats"><div class="stat"><b>${homes().length}</b><span>House records</span></div><div class="stat"><b>${g.length}</b><span>Step-by-step guides</span></div><div class="stat"><b>${a.length}</b><span>Care and help articles</span></div><div class="stat"><b>${record('media').length}</b><span>Uploaded photos/videos</span></div></div>
      <div class="grid"><div class="card"><h2>🏠 House information</h2><p class="muted">Emergency contacts, water tanks, pumps, septics, power and rubbish arrangements for individual homes.</p><button class="btn primary" data-tab="houses">Edit house details</button></div>
      <div class="card"><h2>🚨 Emergencies and unsafe conditions</h2><p class="muted">Update the shared emergency warning shown on all house pages, with unremovable instructions to call 000 for immediate danger.</p><button class="btn primary" data-tab="safety">Edit safety information</button></div>
      <div class="card"><h2>⇄ Bulk changes</h2><p class="muted">Select a few properties or all 33. Only the fields you choose are overwritten.</p><button class="btn primary" data-tab="bulk">Edit multiple houses</button></div>
      <div class="card"><h2>📚 Guides & instructions</h2><p class="muted">Edit existing workbook articles or step-based troubleshooting guides; draft, review and publish to selected houses.</p><div class="actions"><button class="btn" data-tab="articles">Care articles</button><button class="btn" data-tab="wizard">Guided steps</button></div></div>
      <div class="card"><h2>🎬 Videos & photos</h2><p class="muted">Attach a demonstration to a property, an article, or one step of a guide. You can add one video to all houses.</p><button class="btn primary" data-tab="media">Upload video or photo</button></div></div>
      <div class="card"><h2>Recent content updates</h2>${record('history').length?record('history').slice(0,8).map(x=>`<div class="preview-row">${E(x.action.replaceAll('-',' '))} • ${E(date(x.created_at))}${x.affected_properties?.length?` • ${x.affected_properties.length} houses`:''}</div>`).join(''):'<p class="muted">No changes from this editor yet.</p>'}</div>`;
  }
  function houseDetails(){
    const h=homes().find(x=>x.id===state.houseId)||{};
    const choose=`<div class="field"><label for="house-pick">Select a house</label><select id="house-pick" name="house-pick" data-house-picker>${homes().map(x=>`<option value="${E(x.id)}" ${x.id===state.houseId?'selected':''}>${E(houseLabel(x.id))}</option>`).join('')}</select></div>`;
    const rows=[...new Set(fields.map(f=>f.group))].map(group=>`<h3>${E(group)}</h3><div class="${group==='Emergency'?'two':''}">${fields.filter(f=>f.group===group).map(f=>field(f.key,f.label,h[f.key]||'',f.multi,`placeholder="${E(f.placeholder)}" maxlength="${f.multi?4000:2000}"`)).join('')}</div>`).join('<hr class="separator">');
    return `${title('Individual property','Edit house details','Choose a house, update just the information you need, and save it to the shared database.')}
      <div class="card">${choose}<p class="small">The house name and address are fixed here so bulk editing cannot accidentally rename a property.</p><form data-form="house"><div class="badge-row"><strong>${E(h.name||'')}</strong><span class="pill">${E(h.id||'')}</span></div><hr class="separator">${rows}<div class="actions"><button class="btn primary" type="submit">Save house information</button>${button('Edit multiple houses','tab-bulk')}</div></form></div>
      <div class="warning"><b>Safety:</b> Only publish verified contact numbers and approved instructions. Avoid placing electrical access codes, passwords or private resident details in these fields.</div>`;
  }
  function houseChoices(container='bulk'){
    const selected=state.selected;
    return `<div class="compact-actions">${button('Select all houses','select-all',`data-which="${container}"`)}${button('Clear selection','select-none',`data-which="${container}"`)}<span class="small" data-house-count>${selected.size} selected</span></div>
    <div class="houses">${homes().map(h=>`<label class="house-choice"><input type="checkbox" data-house-id="${E(h.id)}" ${selected.has(h.id)?'checked':''}><span><b>${E(h.name)}</b><br><small>${E(h.id)}</small></span></label>`).join('')}</div>`;
  }
  function bulkChangesFromForm(form){
    const obj={};for(const f of fields){const check=form.querySelector(`[data-use-field="${f.key}"]`);if(check?.checked)obj[f.key]=String(form.elements.namedItem('bulk_'+f.key)?.value||'').trim()}
    return obj;
  }
  function previewMarkup(ids,changes){
    const keys=Object.keys(changes);
    const sample=ids.slice(0,5).map(id=>{const h=homes().find(x=>x.id===id);return `<div class="preview-row"><b>${E(h?.name)} (${E(id)})</b>${keys.map(k=>`<div><span class="muted">${E(fields.find(x=>x.key===k)?.label||k)}:</span> ${E(h?.[k]||'(blank)')} <b>→</b> ${E(changes[k]||'(clear)')}</div>`).join('')}</div>`}).join('');
    return `<div class="card subtle"><h3>Preview: ${ids.length} houses, ${keys.length} field${keys.length===1?'':'s'}</h3><p class="small">Changes to the first ${Math.min(ids.length,5)} houses are shown below; the same selected fields will be applied to every checked house.</p>${sample}${ids.length>5?`<p class="small">…and ${ids.length-5} more houses.</p>`:''}<div class="warning">An empty value will explicitly clear that field. All unselected fields stay unchanged.</div></div>`;
  }
  function bulkPage(){
    return `${title('Apply to multiple properties','Bulk house information','Choose exactly which houses and which information to change. Other data remains untouched.')}
      <form data-form="bulk"><div class="card"><div class="topline"><h2>1. Select houses</h2><span class="pill">${state.selected.size} of ${homes().length}</span></div>${houseChoices()}</div>
      <div class="card"><h2>2. Tick the fields to update</h2><p class="small">Only checked fields will be changed. Leave every other checkbox unchecked.</p><div class="check-grid">${fields.map(f=>`<div class="bulk-field"><input type="checkbox" id="bulk-check-${E(f.key)}" data-use-field="${E(f.key)}"><div class="field"><label for="bulk_${E(f.key)}">${E(f.label)}</label>${f.multi?`<textarea id="bulk_${E(f.key)}" name="bulk_${E(f.key)}" placeholder="${E(f.placeholder)}" maxlength="4000" rows="3"></textarea>`:`<input id="bulk_${E(f.key)}" name="bulk_${E(f.key)}" placeholder="${E(f.placeholder)}" maxlength="2000">`}</div></div>`).join('')}</div></div>
      <div class="card"><h2>3. Preview and confirm</h2>${button('Preview changes','preview-bulk')}<div id="bulk-preview"></div><label class="choice"><input type="checkbox" name="confirm_bulk"><span>I checked the selected houses, and understand this will replace the chosen fields across all of them.</span></label><button class="btn primary" type="submit">Apply changes to selected houses</button></div></form>`;
  }
  function assignmentForArticle(item){return new Set(record('articleAssignments').filter(x=>x.entry_id===item.id).map(x=>x.property_id))}
  function assignmentForWizard(guide){
    const scope=record('guideScopes').find(x=>x.guide_id===guide.id);
    if(scope?.mode==='all')return {mode:'all',ids:new Set(homes().map(x=>x.id))};
    if(scope?.mode==='selected')return {mode:'selected',ids:new Set(record('guideAssignments').filter(x=>x.guide_id===guide.id).map(x=>x.property_id))};
    return guide.property_id?{mode:'selected',ids:new Set([guide.property_id])}:{mode:'all',ids:new Set(homes().map(x=>x.id))};
  }
  function scopeBlock(mode,selected){
    const ids=new Set(selected);
    return `<div class="scope"><h3>Houses this guide applies to</h3><div class="radio-row"><label class="choice"><input type="radio" name="scope_mode" value="all" ${mode==='all'?'checked':''}>All houses</label><label class="choice"><input type="radio" name="scope_mode" value="selected" ${mode==='selected'?'checked':''}>Only selected houses</label></div><div class="scope-selected ${mode==='all'?'hidden':''}"><p class="small">Choose the exact houses that should receive this guidance:</p><div class="compact-actions">${button('Select all','scope-all')}${button('Clear','scope-none')}</div><div class="houses">${homes().map(h=>`<label class="house-choice"><input type="checkbox" name="target_house" value="${E(h.id)}" ${ids.has(h.id)?'checked':''}><span><b>${E(h.name)}</b><br><small>${E(h.id)}</small></span></label>`).join('')}</div></div></div>`;
  }
  function articlePage(){
    const list=record('articles').filter(x=>(x.title+' '+x.category+' '+x.section).toLowerCase().includes(state.articleSearch.toLowerCase()));
    const item=record('articles').find(x=>x.id===state.articleId);
    const selected=item?assignmentForArticle(item):new Set(homes().map(h=>h.id));
    const mode=item&&selected.size!==homes().length?'selected':'all';
    const form=`<form data-form="article" data-id="${E(item?.id||'')}">
      ${field('article_title','Title',item?.title||'',false,'required maxlength="160"')}
      <div class="two"><div class="field"><label for="article_section">Section</label><select name="section" id="article_section"><option value="troubleshooting" ${item?.section==='troubleshooting'?'selected':''}>Something Wrong</option><option value="regular_care" ${item?.section==='regular_care'?'selected':''}>Regular Care</option></select></div>${field('category','Category',item?.category||'General')}</div>
      ${field('body','Instructions shown to employees',item?.body||'',true,'required maxlength="8000" rows="9"')}
      ${field('review_note','Internal review notes (not published)',item?.review_note||'',true,'maxlength="1800" rows="2"')}
      ${item?.source_kind!=='content_editor'&&item?`<p class="small">Original spreadsheet source: ${E(item.source_sheet)}, row ${E(item.source_row)}. The original source text is preserved in Compendium.</p>`:''}
      ${scopeBlock(mode,selected)}
      <label class="choice"><input type="checkbox" name="published" ${item?.review_status==='published'?'checked':''}><span><b>Publish this article</b> — employees in the selected houses can read it immediately.</span></label>
      <label class="choice"><input type="checkbox" name="confirmed"><span>I have checked the instructions, safety and relevant houses before publishing.</span></label>
      <div class="actions"><button class="btn primary" type="submit">Save article</button>${item?button('Attach a photo or video','media-for-article',`data-id="${E(item.id)}"`):''}</div></form>`;
    return `${title('Care and troubleshooting articles','Edit published instructions','Update regular-care instructions, imported workbook content and troubleshooting explanations. Choose all houses or a subset.')}
      <div class="grid"><div class="card"><div class="topline"><h2>Article library</h2>${button('+ New article','new-article')}</div><input class="search" type="search" placeholder="Search articles" value="${E(state.articleSearch)}" data-article-search><div class="list" style="margin-top:12px">${list.map(x=>`<button class="list-button ${state.articleId===x.id?'active':''}" data-edit-article="${E(x.id)}"><span><strong>${E(x.title)}</strong><small>${E(x.section==='regular_care'?'Regular Care':'Something Wrong')} • ${E(x.category||'General')}</small></span>${status(x.review_status==='published')}</button>`).join('')||'<div class="empty">No articles match.</div>'}</div></div>
      <div class="card"><h2>${item?'Edit article':'Create a new article'}</h2><div class="warning">Do not publish unsafe electrical, septic or machinery procedures without technical review.</div>${form}</div></div>`;
  }
  function emptyStep(){return {key:'start',heading:'What is the problem?',body:'Describe safe checks to try before requesting maintenance.',options:[],end:'ticket'};}
  function chooseWizard(id){
    const g=record('guides').find(x=>x.id===id);
    const scope=g?assignmentForWizard(g):{mode:'all',ids:new Set(homes().map(x=>x.id))};
    state.wizardId=g?.id||null;
    state.wizardDraft={id:g?.id||'',title:g?.title||'',subtitle:g?.subtitle||'',keywords:(g?.keywords||[]).join(', '),published:g?.status==='published',mode:scope.mode,house_ids:[...scope.ids],steps:structuredClone(g?.steps||[emptyStep()])};
    state.tab='wizard';render();
  }
  function captureWizard(){
    const form=app.querySelector('[data-form="wizard"]');if(!form)return;
    const f=new FormData(form),old=state.wizardDraft||{};
    const steps=[...form.querySelectorAll('[data-step-key]')].map(el=>({
      key:el.dataset.stepKey,heading:el.querySelector('[name="step_heading"]')?.value||'',
      body:el.querySelector('[name="step_body"]')?.value||'',end:el.querySelector('[name="step_end"]')?.value||'',
      options:[...el.querySelectorAll('[data-option-row]')].map(row=>({label:row.querySelector('[name="choice_label"]')?.value||'',next:row.querySelector('[name="choice_next"]')?.value||''}))
    }));
    state.wizardDraft={...old,title:String(f.get('title')||''),subtitle:String(f.get('subtitle')||''),keywords:String(f.get('keywords')||''),published:f.has('published'),mode:String(f.get('scope_mode')||'all'),house_ids:[...form.querySelectorAll('[name="target_house"]:checked')].map(x=>x.value),steps};
  }
  function wizardSteps(steps){
    return steps.map((st,i)=>`<section class="step-card" data-step-key="${E(st.key)}"><div class="topline"><div class="step-title">Step ${i+1} <span class="pill">${E(st.key)}</span></div>${i>0?button('Remove step','remove-step',`data-index="${i}"`):''}</div>
      ${field('step_heading','Question / step heading',st.heading||'',false,'required maxlength="250"')}
      ${field('step_body','Safe instructions',st.body||'',true,'maxlength="2200" rows="3"')}
      <div class="field"><label>Step ending (choose an outcome when there are no answer choices)</label><select name="step_end" class="input"><option value="" ${!st.end?'selected':''}>Continue using answer choices</option><option value="ticket" ${st.end==='ticket'?'selected':''}>Request maintenance</option><option value="resolved" ${st.end==='resolved'?'selected':''}>Problem resolved</option><option value="urgent" ${st.end==='urgent'?'selected':''}>Urgent — contact maintenance / emergency services</option></select></div>
      <div class="step-options"><div class="topline"><h3>Answer choices</h3>${button('+ Add choice','add-choice',`data-index="${i}"`)}</div>${(st.options||[]).map((opt,j)=>`<div class="step-option" data-option-row><input name="choice_label" aria-label="Answer text" placeholder="Answer e.g. Yes" value="${E(opt.label)}"><select name="choice_next" aria-label="Next step">${steps.map(dest=>`<option value="${E(dest.key)}" ${dest.key===opt.next?'selected':''}>${E(dest.key)} — ${E((dest.heading||'').slice(0,40))}</option>`).join('')}</select>${button('Remove','remove-choice',`data-index="${i}" data-option="${j}"`)}</div>`).join('')||'<p class="small">No answer choices; use the ending above, or add branching answers.</p>'}</div></section>`).join('');
  }
  function wizardPage(){
    const draft=state.wizardDraft||{...emptyStep(),id:'',title:'',subtitle:'',keywords:'',steps:[emptyStep()],mode:'all',house_ids:homes().map(x=>x.id),published:false};
    const steps=draft.steps||[emptyStep()];
    return `${title('Step-by-step troubleshooting','Guided troubleshooting editor','Edit the questions and answers employees follow. Connect each answer to the next step, or finish with a maintenance request.')}
      <div class="grid"><div class="card"><div class="topline"><h2>Existing guided flows</h2>${button('+ New guide','new-wizard')}</div><div class="list">${record('guides').map(g=>`<button class="list-button ${draft.id===g.id?'active':''}" data-edit-wizard="${E(g.id)}"><span><strong>${E(g.title)}</strong><small>${E(g.subtitle||'Step-by-step guide')}</small></span>${status(g.status==='published')}</button>`).join('')||'<div class="empty">No guided flows yet.</div>'}</div></div>
      <div class="card"><h2>${draft.id?'Edit guided flow':'Create a guided flow'}</h2><p class="small">The first step is always called <b>start</b>. Existing step IDs are preserved so answer choices and attached videos continue to work.</p>
        <form data-form="wizard" data-id="${E(draft.id)}">${field('title','Guide title',draft.title||'',false,'required maxlength="160"')}${field('subtitle','Short description',draft.subtitle||'',false,'maxlength="250"')}${field('keywords','Search keywords (comma separated)',draft.keywords||'')}
        <hr class="separator"><h3>Guided steps</h3>${wizardSteps(steps)}<div class="actions">${button('+ Add next step','add-step')}</div>
        ${scopeBlock(draft.mode,draft.house_ids||[])}<label class="choice"><input type="checkbox" name="published" ${draft.published?'checked':''}><span>Publish this guide to the selected houses</span></label>
        <label class="choice"><input type="checkbox" name="confirmed"><span>I reviewed every instruction, choice and house assignment before publishing.</span></label>
        <div class="actions"><button class="btn primary" type="submit">Save guided flow</button>${draft.id?button('Attach video to a step','media-for-guide',`data-id="${E(draft.id)}"`):''}</div></form></div></div>`;
  }
  function mediaPage(){
    const kind=state.mediaKind;
    const targets=mediaTargets(kind);
    const selected=targets.find(x=>x.id===state.mediaTarget)?.id||targets[0]?.id||'';
    state.mediaTarget=selected;
    const entries=record('media').filter(m=>m.kind===kind&&m.entity_id===selected);
    const g=kind==='guide'?record('guides').find(x=>x.id===selected):null;
    return `${title('Videos and photos','Upload guides and property media','Upload a short instructional video or photo, attach it to the right property or guide, and add an optional transcript.')}
      <div class="warning"><b>Publishing:</b> Public property videos are visible to anyone who can open that house. Videos attached to draft guides stay hidden until their guide is published.</div>
      <div class="card"><div class="two"><div class="field"><label for="media-kind">Attach to</label><select name="media-kind" id="media-kind" data-media-kind><option value="property" ${kind==='property'?'selected':''}>House information</option><option value="guide" ${kind==='guide'?'selected':''}>Step-by-step guide</option><option value="knowledge" ${kind==='knowledge'?'selected':''}>Care / troubleshooting article</option></select></div>
      <div class="field"><label for="media-target">Where should it appear?</label><select id="media-target" data-media-target>${targets.map(x=>`<option value="${E(x.id)}" ${x.id===selected?'selected':''}>${E(x.name)}</option>`).join('')}</select></div></div>
      ${g?`<p class="small">This video will display only when employees reach the chosen step in the published guide.</p>`:''}
      <form data-form="media-upload"><div class="field"><label>Photo or video file</label><input type="file" name="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" required></div>
      <div class="two">${field('caption','Title / caption','',false,'maxlength="220"')}${g?`<div class="field"><label>Guide step (optional)</label><select name="step_key">${(g.steps||[]).map(x=>`<option value="${E(x.key)}">${E(x.key)} — ${E(x.heading)}</option>`).join('')}</select></div>`:''}</div>
      ${field('transcript','Optional video transcript / written instructions','',true,'maxlength="4000" rows="4"')}
      ${kind==='property'?`<label class="choice"><input type="checkbox" name="publish" checked><span><b>Publish for employees</b> — display this property photo/video immediately.</span></label>`:''}
      <p class="small">MP4, MOV, WebM, JPG, PNG or WebP • maximum 45 MB per file. Short, compressed videos work best on employee phones.</p><button class="btn primary" type="submit">Upload photo or video</button></form></div>
      <div class="card"><h2>Existing media for this selection (${entries.length})</h2><div class="media-list">${entries.map(m=>`<div class="media-item"><div class="topline"><div><strong>${E(m.caption||m.filename)}</strong><small>${E(m.mime_type)} • ${E(date(m.created_at))} ${m.step_key?' • Step '+E(m.step_key):''}</small></div>${m.kind==='property'?status(m.is_public):''}</div>
        <div class="actions">${button('View media','view-media',`data-id="${E(m.id)}"`) }${button('Remove file','delete-media',`data-id="${E(m.id)}"`)}</div>
        <details><summary>Edit caption, transcript and visibility</summary><form data-form="media-edit" data-id="${E(m.id)}">${field('caption','Caption',m.caption||'',false,'maxlength="220"')}${field('transcript','Transcript / accessible instructions',m.transcript||'',true,'maxlength="4000"')}${m.kind==='property'?`<label class="choice"><input type="checkbox" name="publish" ${m.is_public?'checked':''}>Visible to employees</label>`:''}<button class="btn primary" type="submit">Save media details</button></form></details></div>`).join('')||'<div class="empty">No files have been attached here.</div>'}</div></div>`;
  }
  function render(){
    if(!state.data)return;
    const views={overview,houses:houseDetails,safety:safetyPage,bulk:bulkPage,articles:articlePage,wizard:wizardPage,media:mediaPage};
    shell((views[state.tab]||overview)());
  }
  function formScope(form){
    const mode=form.querySelector('[name="scope_mode"]:checked')?.value||'all';
    const ids=[...form.querySelectorAll('[name="target_house"]:checked')].map(x=>x.value);
    if(mode==='selected'&&ids.length===0)throw Error('Select at least one house');
    return {mode,house_ids:mode==='all'?homes().map(x=>x.id):ids};
  }
  async function perform(action){
    state.busy=true;app.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{const result=await action();await reload(result?.message||'Saved to Compendium.');return result}
    catch(err){notify(String(err?.message||err),true);throw err}
    finally{state.busy=false;app.querySelectorAll('button').forEach(b=>b.disabled=false)}
  }
  app.addEventListener('click',async event=>{
    const nav=event.target.closest('[data-tab]');if(nav){
      const tab=nav.dataset.tab;if(tab==='wizard'&&!state.wizardDraft)chooseWizard(null);else{state.tab=tab;render()}return;
    }
    const editA=event.target.closest('[data-edit-article]');if(editA){state.articleId=editA.dataset.editArticle;render();return;}
    const editW=event.target.closest('[data-edit-wizard]');if(editW){chooseWizard(editW.dataset.editWizard);return;}
    const b=event.target.closest('[data-action]');if(!b)return;
    const action=b.dataset.action;
    if(action==='tab-bulk'){state.tab='bulk';render();return;}
    if(action==='select-all'||action==='select-none'){
      state.selected=new Set(action==='select-all'?homes().map(x=>x.id):[]);state.bulkPreview=null;render();return;
    }
    if(action==='preview-bulk'){
      const form=app.querySelector('[data-form="bulk"]'),changes=bulkChangesFromForm(form),ids=[...state.selected];
      if(!ids.length||!Object.keys(changes).length){notify('Select houses and tick at least one field.',true);return;}
      state.bulkPreview=JSON.stringify({ids,changes});app.querySelector('#bulk-preview').innerHTML=previewMarkup(ids,changes);return;
    }
    if(action==='scope-all'||action==='scope-none'){
      const area=b.closest('.scope');area.querySelectorAll('[name="target_house"]').forEach(x=>x.checked=action==='scope-all');return;
    }
    if(action==='new-article'){state.articleId=null;render();return;}
    if(action==='new-wizard'){chooseWizard(null);return;}
    if(action==='add-step'||action==='remove-step'||action==='add-choice'||action==='remove-choice'){
      captureWizard();const steps=state.wizardDraft.steps,index=Number(b.dataset.index||0),option=Number(b.dataset.option||0);
      if(action==='add-step'){
        const keys=new Set(steps.map(x=>x.key));let i=2;while(keys.has('step_'+i))i++;
        steps.push({key:'step_'+i,heading:'Next check',body:'',options:[],end:'ticket'});
      }
      if(action==='remove-step'){
        if(index<=0||steps.length<2)return;
        const key=steps[index].key;
        if(steps.some((s,i)=>i!==index&&s.options?.some(o=>o.next===key))){notify('Remove or redirect any answers pointing to this step first.',true);return;}
        steps.splice(index,1);
      }
      if(action==='add-choice'){
        const current=steps[index];if(!current||current.options.length>=8)return;
        current.options.push({label:'',next:steps[Math.min(index+1,steps.length-1)].key});current.end='';
      }
      if(action==='remove-choice')steps[index]?.options?.splice(option,1);
      render();return;
    }
    if(action==='media-for-article'||action==='media-for-guide'){
      state.mediaKind=action==='media-for-guide'?'guide':'knowledge';state.mediaTarget=b.dataset.id;state.tab='media';render();return;
    }
    if(action==='view-media'){
      const popup=window.open('about:blank','_blank');
      if(popup){popup.opener=null;popup.document.body.textContent='Opening private media…';}
      try{const r=await api('media-url',{id:b.dataset.id});if(popup)popup.location.replace(r.url);else notify('Your browser blocked the preview. Allow pop-ups for this site.',true)}
      catch(err){if(popup)popup.close();notify(err.message,true)}return;
    }
    if(action==='delete-media'){
      if(!confirm('Permanently remove this photo or video from Compendium?'))return;
      try{await perform(()=>api('remove-media',{id:b.dataset.id,confirmed:true}));}catch{}return;
    }
  });
  app.addEventListener('change',event=>{
    const el=event.target;
    if(el.matches('[data-house-picker]')){state.houseId=el.value;render();return;}
    if(el.matches('[data-house-id]')){
      if(el.checked)state.selected.add(el.dataset.houseId);else state.selected.delete(el.dataset.houseId);
      state.bulkPreview=null;const count=app.querySelector('[data-house-count]');if(count)count.textContent=state.selected.size+' selected';const preview=app.querySelector('#bulk-preview');if(preview)preview.innerHTML='';return;
    }
    if(el.matches('[name="scope_mode"]')){el.closest('.scope')?.querySelector('.scope-selected')?.classList.toggle('hidden',el.value==='all');return;}
    if(el.matches('[data-media-kind]')){state.mediaKind=el.value;state.mediaTarget=mediaTargets(el.value)[0]?.id||'';render();return;}
    if(el.matches('[data-media-target]')){state.mediaTarget=el.value;render();return;}
  });
  app.addEventListener('input',event=>{
    const el=event.target;
    if(el.matches('[data-article-search]')){
      state.articleSearch=el.value;const caret=el.selectionStart;render();const input=app.querySelector('[data-article-search]');input?.focus();if(Number.isInteger(caret))input.setSelectionRange(caret,caret);
    }
    if(el.closest('[data-form="bulk"]')&&!el.matches('[name="confirm_bulk"]')){state.bulkPreview=null;const preview=app.querySelector('#bulk-preview');if(preview)preview.innerHTML='';}
  });
  app.addEventListener('submit',async event=>{
    const form=event.target.closest('[data-form]');if(!form)return;
    event.preventDefault();if(state.busy)return;
    const type=form.dataset.form;const f=new FormData(form);
    try{
      if(type==='emergency-guidance'){
        if(!f.has('confirmed'))throw Error('Confirm you reviewed this safety guidance.');
        const heading=String(f.get('heading')||'').trim(),emergency_text=String(f.get('emergency_text')||'').trim(),unsafe_text=String(f.get('unsafe_text')||'').trim();
        if(heading.length<3||emergency_text.length<10||unsafe_text.length<10)throw Error('Complete all safety fields before saving.');
        await perform(()=>api('save-emergency-guidance',{heading,emergency_text,unsafe_text,confirmed:true}));
      }
      if(type==='house'){
        const current=homes().find(x=>x.id===state.houseId)||{};
        const changes={};for(const fieldDef of fields){const value=String(f.get(fieldDef.key)||'').trim();if(value!==String(current[fieldDef.key]||''))changes[fieldDef.key]=value;}
        if(!Object.keys(changes).length){notify('No changes to save.');return;}
        await perform(()=>api('save-houses',{house_ids:[state.houseId],changes,confirmed:true}));
      }
      if(type==='bulk'){
        const ids=[...state.selected],changes=bulkChangesFromForm(form),snapshot=JSON.stringify({ids,changes});
        if(!ids.length||!Object.keys(changes).length)throw Error('Choose houses and tick at least one field.');
        if(state.bulkPreview!==snapshot)throw Error('Preview the current changes before applying them.');
        if(!f.has('confirm_bulk'))throw Error('Tick the confirmation checkbox after reviewing the preview.');
        if(!confirm(`Apply ${Object.keys(changes).length} fields to ${ids.length} houses?`))return;
        await perform(()=>api('save-houses',{house_ids:ids,changes,confirmed:true}));state.bulkPreview=null;
      }
      if(type==='article'){
        const scope=formScope(form);
        const published=f.has('published');if(published&&!f.has('confirmed'))throw Error('Please confirm you reviewed the guide before publishing.');
        const result=await perform(()=>api('save-article',{id:form.dataset.id||null,title:f.get('article_title'),body:f.get('body'),category:f.get('category'),section:f.get('section'),review_note:f.get('review_note'),published,confirmed:f.has('confirmed'),...scope}));
        state.articleId=result.id;render();
      }
      if(type==='wizard'){
        captureWizard();const d=state.wizardDraft,scope=formScope(form);
        const published=f.has('published');if(published&&!f.has('confirmed'))throw Error('Confirm that each step and house assignment has been reviewed.');
        if(d.steps.some(x=>x.options?.length&&x.end))throw Error('A step cannot contain both answer choices and a final ending.');
        const result=await perform(()=>api('save-wizard',{id:d.id||null,title:d.title,subtitle:d.subtitle,keywords:d.keywords.split(',').map(x=>x.trim()).filter(Boolean),steps:d.steps,published,confirmed:f.has('confirmed'),...scope}));
        chooseWizard(result.id);
      }
      if(type==='media-upload'){
        const file=form.querySelector('[name="file"]')?.files?.[0];if(!file)throw Error('Choose a video or photo first.');
        if(file.size>45*1024*1024||file.size===0)throw Error('File must be less than 45 MB and not empty.');
        if(!['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'].includes(file.type))throw Error('Use MP4, MOV, WebM, JPG, PNG or WebP.');
        if(!window.supabase?.createClient)throw Error('Media upload library did not load. Check your internet connection.');
        const request={kind:state.mediaKind,entity_id:state.mediaTarget,step_key:f.get('step_key')||'',filename:file.name,mime_type:file.type,file_bytes:file.size,caption:f.get('caption')||'',transcript:f.get('transcript')||'',publish:f.has('publish')};
        state.busy=true;form.querySelector('button[type="submit"]').disabled=true;notify('Preparing secure upload…');
        let metadata=null;
        try{
          metadata=await api('prepare-media',request);
          const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
          const upload=await client.storage.from('pc-private-media').uploadToSignedUrl(metadata.path,metadata.token,file,{contentType:file.type});
          if(upload.error)throw upload.error;
          await reload('Photo or video uploaded.');
        }catch(err){if(metadata?.id)try{await api('remove-media',{id:metadata.id,confirmed:true})}catch{}throw err}
        finally{state.busy=false}
      }
      if(type==='media-edit')await perform(()=>api('edit-media',{id:form.dataset.id,caption:f.get('caption'),transcript:f.get('transcript'),publish:f.has('publish')}));
    }catch(err){notify(err.message||'Unable to save changes',true)}
  });
  async function boot(){
    if(!/^[0-9a-f]{64}$/.test(key)){
      app.innerHTML='<div class="boot"><div class="boot-icon">⌂</div><h1>Private content editor</h1><p>This page has no sign-in screen. Open the private Accommodation Content Editor link supplied to management.</p><p class="warning">Do not publish the private link or its access code in GitHub.</p></div>';return;
    }
    try{await reload()}catch(err){
      app.innerHTML=`<div class="boot"><div class="boot-icon">⌂</div><h1>Editor unavailable</h1><p>${E(err.message)}</p><p class="small">If your private link has expired, request a new link. No data has been changed.</p></div>`;
    }
  }
  boot();
})();
