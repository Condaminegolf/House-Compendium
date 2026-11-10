'use strict';
/* Property Care: issue-led, mobile-first Something Wrong experience.
   Adds a categorised flow without replacing the resident app, house selection,
   Supabase records or the existing approved guides. No personal data is saved here.
   Spreadsheet source: Something wrong, Accommodation compendium, 9 Nov 2026.
   Site-specific and potentially hazardous workbook procedures remain unpublished
   until reviewed by the maintenance team. */
(() => {
  if (typeof s === 'undefined' || typeof fix !== 'function' || typeof setTab !== 'function' || typeof root === 'undefined') return;

  const categories = [
    {id:'power', icon:'⚡', title:'Power & lights', desc:'Power outages, power points and lighting'},
    {id:'water', icon:'🚿', title:'Water & hot water', desc:'No water, low pressure or no hot water'},
    {id:'drains', icon:'🚰', title:'Toilets, drains & septic', desc:'Slow drains, wastewater, alarms and taps'},
    {id:'appliances', icon:'🔌', title:'Appliances & air conditioning', desc:'Fridge, microwave, washing machine, TV and more'},
    {id:'building', icon:'🏠', title:'Structural damage to building', desc:'Broken windows, leaks in the house, holes in walls, roof and gutter damage'},
    {id:'mowers', icon:'🌿', title:'Mowers & outdoor equipment', desc:'Mower not starting or not cutting'}
  ];
  const issues = [
    {id:'power-out',category:'power',title:'No power',short:'The whole house or several rooms have no power',terms:'outage blackout electricity switchboard circuit breaker',row:[4,5],
     checks:['Check whether the problem affects the whole house or only part of it.','If safe, note whether neighbouring houses also appear to have lost power.','If you can safely identify the network provider, check for a reported supply outage.'],
     warning:'Do not open electrical covers, test wiring, or repeatedly reset a tripping breaker. Smoke, burning smells, sparks or exposed wires require urgent assistance.',urgency:'urgent', matches:['no power','power outage']},
    {id:'power-outlet',category:'power',title:'One or two power points not working',short:'Some wall outlets have stopped working',terms:'socket powerpoint outlet rcd plug power point',row:[6],
     checks:['Note which rooms or power points are affected.','If it is safe, turn off an affected appliance at its normal control and stop using it.','Tell maintenance if the fault started after connecting a particular appliance.'],
     warning:'Do not test or dismantle a power point, use damaged plugs, or repeatedly reset a tripping circuit.',urgency:'urgent',matches:['power points','power point']},
    {id:'lights',category:'power',title:'Lights not working',short:'A light or several lights are not switching on',terms:'light globe bulb lamp lighting',row:[26],
     checks:['Check whether it is one light or several lights.','Note whether other power in that room works normally.','If the light is flickering, damaged or making noises, leave it switched off and report it.'],
     warning:'Do not work on wiring, switchgear or elevated fittings. Report broken or damaged electrical fittings.',matches:['lights not working','light globe']},
    {id:'no-water',category:'water',title:'No water or low pressure',short:'No water, weak flow or intermittent water',terms:'bore tank pumps pressure low water tap no water',row:[33,36],
     checks:['Check whether the problem affects one tap, several taps or the whole property.','If safe, note whether hot and cold taps are both affected.','Report whether the water stopped suddenly or the pressure has reduced gradually.'],
     warning:'Do not touch bore-pump electrical controls, pressure pumps, tanks or exposed wiring. Supply arrangements differ by house.',matches:['no water','water pressure']},
    {id:'hot-water',category:'water',title:'No hot water',short:'Cold water works but there is no hot water',terms:'hot shower water heater hotwater',row:[32,35],
     checks:['Check whether the hot water problem affects all taps or only one shower/basin.','Note when hot water last worked, and whether the supply is cold or only lukewarm.','Check for visible leaks from a safe distance and report any water pooling.'],
     warning:'Do not remove covers, operate heater electrical switches or handle gas controls. Stay clear of leaking hot-water equipment.',matches:['no hot water','hot water']},
    {id:'slow-sink',category:'drains',title:'Sink draining slowly',short:'Water sits in a kitchen or bathroom sink',terms:'blocked sink slow draining plug drain waste basin',row:[9],
     checks:['Check whether the blockage affects just one sink or several fixtures.','Clear only loose debris visible at the sink opening, if safe and hygienic.','Avoid adding oils, grease or additional wastewater while the sink is blocked.'],
     warning:'Do not dismantle pipework, use strong drain chemicals, or enter septic infrastructure.',matches:['slow draining sinks','sink']},
    {id:'toilet',category:'drains',title:'Toilet draining slowly or blocked',short:'Toilet is blocked, slow or backing up',terms:'toilet blocked overflowing flush sewage',row:[10],
     checks:['If the water is rising, stop flushing to prevent an overflow.','Note whether other toilets or drains are also affected.','Keep people away from wastewater and report the issue.'],
     warning:'If sewage is overflowing, avoid contact, keep children and pets away and call maintenance urgently. Do not access septic tanks.',urgency:'urgent',matches:['slow draining toilets','toilet blocked']},
    {id:'septic-overflow',category:'drains',title:'Septic system overflowing',short:'Wastewater or sewage is backing up outside',terms:'septic overflow sewage wastewater effluent tank',row:[11],
     checks:['Keep people and animals away from the affected area.','Stop using water-intensive appliances until maintenance advises it is safe.','Report the location and whether wastewater is near buildings or walkways.'],
     warning:'This is a hygiene and possible electrical hazard. Do not open septic tanks, test outlets or operate nearby pumps.',urgency:'urgent',matches:['septic overflowing','septic']},
    {id:'septic-alarm',category:'drains',title:'Septic warning light or alarm',short:'Red warning light or alarm at the septic system',terms:'septic flashing red light alarm tank pump',row:[12],
     checks:['Note the warning-light colour or alarm displayed, without touching the equipment.','If safe, take a photo from outside the fenced or affected area.','Report the warning promptly so the maintenance team can check the system.'],
     warning:'Do not silence alarms, open control panels or operate septic electrical equipment.',urgency:'urgent',matches:['red light flashing']},
    {id:'leaking-tap',category:'drains',title:'Leaking tap or pipe',short:'Dripping or leaking water at a fixture',terms:'leak dripping plumbing faucet pipe water taps',row:[42],
     checks:['Identify where the water is coming from without removing fittings.','If safe, place a container or towel to limit minor water damage.','Report whether the leak is small and steady or spreading quickly.'],
     warning:'For a major or electrical-adjacent leak, move away and phone maintenance promptly. Do not dismantle pipes or fittings.',matches:['leaking taps','leak']},
    {id:'appliance-other',category:'appliances',title:'Another appliance is not working',short:'An appliance is not operating as expected',terms:'appliance stopped broken error faulty',row:[17],
     checks:['Note the appliance brand and model if visible without moving it.','Record any warning light or error code shown on the display.','Stop using appliances with damaged cords, burning smells or leaking water.'],
     warning:'Do not open appliance housings or repair electrical components. Report any damage to the supplied appliance.',matches:['appliances not working']},
    {id:'washing',category:'appliances',title:'Washing machine not working',short:'Washer will not start, drain or complete a cycle',terms:'washing machine washer laundry error filter',row:[19],
     checks:['Note the brand, model and any error code shown on the screen.','Check that the door is properly closed and normal controls are selected.','Report any unusual noises, leaks or standing water.'],
     warning:'Do not dismantle filters, hoses or plumbing unless specifically instructed by an approved appliance guide.',matches:['washing machine']},
    {id:'microwave',category:'appliances',title:'Microwave not working',short:'Microwave does not heat or respond',terms:'microwave oven cooking appliance',row:[20],
     checks:['Note whether the display and normal controls respond.','Stop using it if there is smoke, sparking, unusual smells or damage.','Report the brand, model and what happens when you try a normal start.'],
     warning:'Never open the microwave casing or attempt electrical repairs.',matches:['microwave']},
    {id:'fridge',category:'appliances',title:'Fridge not cooling',short:'Refrigerator is warm or not running',terms:'fridge refrigerator freezer cooling food temperature',row:[21],
     checks:['Check whether the door closes and seals normally.','Note whether the interior light or display works.','If food is warming, minimise door opening and arrange safe food storage.'],
     warning:'Report loss of cooling promptly. Do not repair electrical components or move a large appliance alone.',urgency:'priority',matches:['fridge']},
    {id:'television',category:'appliances',title:'Television or remote not working',short:'TV remote, display or power issue',terms:'tv television remote batteries screen',row:[22],
     checks:['Check whether the television and remote show normal indicator lights.','If the remote seems unresponsive, replace accessible batteries with the correct type.','Note whether the TV itself responds to its normal power button.'],
     warning:'Do not open the television housing or repair damaged power leads.',matches:['television','remote control']},
    {id:'vacuum',category:'appliances',title:'Vacuum cleaner not working',short:'Vacuum will not start or has lost suction',terms:'vacuum vaccuum vaccum hoover cleaner',row:[23],
     checks:['Stop using the vacuum if it overheats, smells burnt or makes unusual noises.','Note the brand/model and whether the issue is no power or poor suction.','Report the fault to maintenance.'],
     warning:'Do not open electrical housings. Follow only an approved manufacturer filter guide.',matches:['vacuum','vaccuum']},
    {id:'aircon',category:'appliances',title:'Air conditioner or remote not working',short:'Air conditioner does not respond normally',terms:'ac aircon air-conditioning cooling heating remote batteries',row:[24],
     checks:['Check whether the remote has a visible display or indicator.','If safe, replace accessible remote-control batteries using the correct type.','Note any error code or unusual sound shown by the air conditioner.'],
     warning:'Do not remove electrical covers, open the unit or modify refrigerant pipework.',matches:['air conditioner','air conditioner remote']},
    {id:'broken-window',category:'building',title:'Broken window or glass',short:'Cracked or shattered glass, damaged window frame or insecure opening',terms:'broken window cracked glass shattered pane smashed frame unsafe sharp edge',row:[],
     checks:['Keep everyone, especially children and pets, away from broken glass.','From a safe position, note which room or window is damaged.','Photograph the damage only if you can do so without approaching broken glass.'],
     warning:'Do not touch or remove broken glass, climb through a damaged window, or try to repair the frame. Report immediately if the property cannot be secured.',urgency:'urgent',matches:['window','glass']},
    {id:'inside-leak',category:'building',title:'Water leaking inside the house',short:'Water entering through a roof, ceiling, wall, window or internal surface',terms:'roof leak ceiling leak storm water inside house wet plaster internal leak water ingress',row:[],
     checks:['From a dry, safe area, note the room and location of the water.','Move away from sagging ceilings, damaged plaster and any water near lights or electrical fittings.','If safe, move belongings away from small drips without touching wiring or damaged building materials.'],
     warning:'Water near electricity, a sagging ceiling or rapidly spreading leaks require urgent assistance. Do not enter the roof, use ladders or touch electrical switches near water.',urgency:'urgent',matches:['leak','water inside','ceiling']},
    {id:'wall-damage',category:'building',title:'Holes or damage to walls and ceilings',short:'Holes, cracks, collapsed plasterboard or damaged internal surfaces',terms:'holes walls plaster dent cracks ceiling damaged gyprock wallboard structure',row:[],
     checks:['Note which room and surface is affected, from a safe position.','Check from a distance whether material is loose or falling and keep clear if it is.','If safe, photograph the damage for maintenance.'],
     warning:'Do not remove loose material, cut into walls, or attempt repairs. If a wall or ceiling looks unstable, leave that area and contact maintenance urgently.',urgency:'priority',matches:['wall','hole','ceiling','structural']},
    {id:'structural-other',category:'building',title:'Other structural damage',short:'Damaged roof, doors, floors, stairs, foundations or building framework',terms:'building structure damaged roof cracked floor loose door stairs verandah storm damage',row:[],
     checks:['Keep away from cracked, leaning, loose or falling parts of the building.','Identify which part of the structure is affected from a safe distance.','If safe, take a photo and explain whether the damage is getting worse.'],
     warning:'Do not walk beneath damaged roofing or use unstable stairs, floors or verandahs. Leave the area and telephone maintenance urgently if there is any collapse risk.',urgency:'urgent',matches:['structure','roof','storm','building']},
    {id:'gutters',category:'building',title:'Water overflowing gutters',short:'Rainwater spills over the gutter edge',terms:'gutter roof downpipe rain overflowing stormwater',row:[15],
     checks:['Note which side of the building is overflowing from ground level.','If safe, take a photograph without using a ladder.','Report whether water is entering the building or running near electrical equipment.'],
     warning:'Do not climb onto roofs or ladders to clear gutters. Water near live electrical equipment requires urgent attention.',matches:['water overflowing gutters','gutter']},
    {id:'mower-start',category:'mowers',title:'Mower will not start',short:'The mower cannot be started normally',terms:'mower lawn not starting engine petrol fuel oil',row:[40],
     checks:['Make sure the mower is switched off and on stable, level ground.','Note the mower model, any display warnings and whether the issue started suddenly.','If you are trained to use the mower, refer only to its approved operating instructions.'],
     warning:'Do not bypass safety switches or use unidentified fuel. Report unresolved faults.',matches:['mower not starting','not starting']},
    {id:'mower-cut',category:'mowers',title:'Mower runs but does not cut',short:'Engine runs but the mower is not cutting grass',terms:'mower lawn blade not cutting belt cutting deck',row:[39],
     checks:['Stop the mower, switch it off and remove the key where fitted.','From a safe distance, note any visible debris or warning indicators.','Report that the engine runs but the cutting function is not operating.'],
     warning:'Do not reach under the deck, handle blades or belts or remove safety guards. The maintenance team must inspect moving parts.',matches:['mower not cutting','starting but not cutting']}
  ];

  // Workbook faults plus extra structural-damage situations are grouped into practical fault types.
  // The electrical-board and septic-location background rows are deliberately excluded
  // from employee instructions until house-by-house verification.
  const ui = {category:null,issue:null,query:'',checked:new Set(),complete:false};
  const byId = id => issues.find(x=>x.id===id);
  const categoryBy = id => categories.find(x=>x.id===id);
  const safe = text => e(String(text??''));
  const norm = text => String(text??'').toLocaleLowerCase();
  const matchIssue = (issue, query) => !query || norm([issue.title,issue.short,issue.terms,categoryBy(issue.category)?.title].join(' ')).includes(norm(query));
  const publishedNotes = issue => (s.knowledge||[]).filter(x => x.section==='troubleshooting' && issue.matches.some(part=>norm(x.title).includes(norm(part))));
  const publishedGuides = issue => (s.guides||[]).filter(x => {
    const content = [x.title,x.subtitle,...(x.keywords||[])].join(' ').toLowerCase();
    return issue.matches.some(k=>content.includes(k.toLowerCase()));
  });
  const icon = id => categoryBy(id)?.icon || '🔧';
  const backButton = (label, action) => `<button class="sw-back" type="button" data-sw-action="${action}">‹ ${safe(label)}</button>`;
  const reportButton = (issue=null, full=true) => `<button class="${full?'primary full':'secondary'} sw-request" type="button" data-sw-action="report" ${issue?`data-sw-issue="${safe(issue.id)}"`:''}>🛠️ ${issue?'Request maintenance for this problem':'Report a different problem'}</button>`;

  function categoryCard(c){
    const count=issues.filter(x=>x.category===c.id).length;
    return `<button type="button" class="sw-category" data-sw-action="category" data-sw-category="${safe(c.id)}"><span class="sw-category-icon" aria-hidden="true">${c.icon}</span><span class="sw-category-copy"><strong>${safe(c.title)}</strong><small>${safe(c.desc)}</small><span class="sw-count">${count} common problem${count===1?'':'s'}</span></span><span aria-hidden="true" class="sw-chevron">›</span></button>`;
  }
  function issueCard(x){
    return `<button type="button" class="sw-issue" data-sw-action="issue" data-sw-issue="${safe(x.id)}"><span class="sw-issue-icon" aria-hidden="true">${icon(x.category)}</span><span class="sw-issue-copy"><strong>${safe(x.title)}</strong><small>${safe(x.short)}</small></span><span class="sw-chevron" aria-hidden="true">›</span></button>`;
  }
  function searchInput(){
    return `<div class="sw-search"><label for="sw-search-input">Search for a problem</label><input id="sw-search-input" type="search" autocomplete="off" spellcheck="false" data-sw-search value="${safe(ui.query)}" placeholder="e.g. blocked toilet, fridge, hot water"></div>`;
  }
  function front(){
    const q=ui.query.trim(),filtered=issues.filter(x=>matchIssue(x,q));
    const common=['no-water','hot-water','power-out','toilet'];
    return `${hero('SOMETHING WRONG?', 'What is the problem?', 'Find your issue, follow simple checks and tell maintenance if it is not fixed.')}${emergency()}
       <div class="sw-intro">${searchInput()}
         ${q?`<div class="sw-section-title"><h2>Matching problems</h2><span>${filtered.length} found</span></div><div class="sw-issue-list">${filtered.map(issueCard).join('')||'<div class="card">No matching issue. You can still submit a maintenance request.</div>'}</div>`:
         `<div class="sw-section-title"><h2>Common problems</h2></div><div class="sw-quickgrid">${common.map(id=>issueCard(byId(id))).join('')}</div><div class="sw-section-title"><h2>Browse all categories</h2></div><div class="sw-category-grid">${categories.map(categoryCard).join('')}</div>`}
         <div class="card sw-help"><strong>Can’t find the problem?</strong><p>Describe what happened and send it directly to the maintenance team for this house.</p>${reportButton(null,true)}</div>
       </div>`;
  }
  function categoryPage(c){
    const list=issues.filter(x=>x.category===c.id);
    return `${backButton('All problem categories','all')}${hero('SOMETHING WRONG?',c.title,c.desc)}${emergency()}<div class="sw-section-title"><h2>Choose the issue</h2><span>${list.length} options</span></div><div class="sw-issue-list">${list.map(issueCard).join('')}</div><div class="card sw-help"><strong>Another problem in this category?</strong>${reportButton()}</div>`;
  }
  function approvedContent(issue){
    const notes=publishedNotes(issue),guides=publishedGuides(issue);
    if(!notes.length&&!guides.length)return `<div class="sw-info"><strong>More house-specific help</strong><p>No additional approved photos, videos or instructions are available for this fault yet. You can still lodge a maintenance request.</p></div>`;
    return `<section class="sw-approved"><h2>Approved advice for this property</h2><p class="tiny muted">These items are published by the accommodation team and matched to your selected house.</p>
      ${guides.map(g=>`<button type="button" class="sw-approved-link" data-act="guide" data-id="${safe(g.id)}"><strong>📘 ${safe(g.title)}</strong><span class="tiny muted">Open step-by-step approved guide ›</span></button>`).join('')}
      ${notes.map(n=>`<details class="card sw-approved-note"><summary>✓ ${safe(n.title)}</summary><p>${safe(n.body)}</p>${media('knowledge',n.id)}</details>`).join('')}
    </section>`;
  }
  function issuePage(issue){
    const cat=categoryBy(issue.category),selected=ui.checked;
    return `${backButton(cat?.title||'Back to problems','category')}${hero('GUIDED CHECKS',issue.title,issue.short)}
      <div class="sw-steps-summary"><span>${cat?.icon||'🔧'} ${safe(cat?.title||'Issue')}</span><span>${selected.size} of ${issue.checks.length} checked</span></div>
      <div class="sw-alert ${issue.urgency==='urgent'?'sw-alert-urgent':''}"><strong>Safety first</strong><p>${safe(issue.warning)}</p>${issue.urgency==='urgent'?'<p><b>Urgent or unsafe condition?</b> Move away from the hazard and call maintenance. For immediate danger call 000.</p>':''}</div>
      <section class="sw-checks"><h2>Simple checks you can do safely</h2><p class="tiny muted">Tick only those you have actually completed. You do not need to finish every check before requesting help.</p>
      ${issue.checks.map((step,i)=>`<label class="sw-check"><input type="checkbox" data-sw-check="${i}" ${selected.has(i)?'checked':''}><span class="sw-check-number">${i+1}</span><span>${safe(step)}</span></label>`).join('')}</section>
      ${approvedContent(issue)}
      <div class="card sw-next"><h2>Still not fixed?</h2><p>Send a maintenance request with this issue already selected. The checks you ticked will be included for the maintenance team.</p>${reportButton(issue,true)}<button class="secondary full sw-done" type="button" data-sw-action="done">✓ Problem resolved — back to categories</button></div>
      <div class="sw-source-note">The issue categories follow the accommodation spreadsheet. Electrical, septic, pump and machinery repairs require approved staff instructions and are not shown as do-it-yourself tasks.</div>`;
  }
  function renderFix(){
    const issue=byId(ui.issue),category=categoryBy(ui.category);
    return issue?issuePage(issue):category?categoryPage(category):front();
  }

  // The main app's normal render/tab/navigation stays intact; only fix() changes.
  fix = renderFix;
  root.addEventListener('click',event=>{
    const b=event.target.closest('[data-sw-action]');if(!b)return;
    event.preventDefault();event.stopImmediatePropagation();
    const action=b.dataset.swAction;
    if(action==='all') {ui.category=null;ui.issue=null;ui.query='';ui.checked.clear();render();return;}
    if(action==='category'){ui.category=b.dataset.swCategory||(byId(ui.issue)?.category||ui.category);ui.issue=null;ui.checked.clear();render();return;}
    if(action==='issue'){const issue=byId(b.dataset.swIssue);if(!issue)return;ui.category=issue.category;ui.issue=issue.id;ui.checked.clear();render();return;}
    if(action==='done'){ui.issue=null;ui.checked.clear();render();return;}
    if(action==='report'){
      const issue=byId(b.dataset.swIssue)||byId(ui.issue);
      const checked=issue?[...ui.checked].sort((a,b)=>a-b).map(i=>issue.checks[i]).filter(Boolean):[];
      s.draftTitle=issue?issue.title:(ui.query||'Maintenance request');
      s.draftChecks=checked;
      s.history=[];
      setTab('ticket');
      const form=root.querySelector('[data-form="ticket"]');
      if(form){
        const area=form.querySelector('textarea[name="details"]');
        if(area)area.placeholder=issue?`Describe what happened with ${issue.title.toLowerCase()}, including when it started and what is affected.`:'Describe the issue and what needs attention.';
        if(checked.length){const summary=document.createElement('p');summary.className='sw-ticket-context';summary.textContent=`${checked.length} safe check${checked.length===1?'':'s'} recorded and will be included in this request.`;area?.parentNode?.after(summary);}
      }
    }
  },true);
  root.addEventListener('change',event=>{
    const input=event.target.closest('[data-sw-check]');if(!input)return;
    const i=Number(input.dataset.swCheck);if(!Number.isInteger(i))return;
    if(input.checked)ui.checked.add(i);else ui.checked.delete(i);
    const counter=root.querySelector('.sw-steps-summary span:last-child');
    const issue=byId(ui.issue);if(counter&&issue)counter.textContent=`${ui.checked.size} of ${issue.checks.length} checked`;
    input.closest('.sw-check')?.classList.toggle('is-checked',input.checked);
  });
  root.addEventListener('input',event=>{
    const input=event.target.closest('[data-sw-search]');if(!input)return;
    ui.query=input.value;
    const caret=input.selectionStart;
    render();
    const next=root.querySelector('[data-sw-search]');if(next){next.focus();if(Number.isInteger(caret))next.setSelectionRange(caret,caret);}
  });
})();
