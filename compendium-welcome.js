'use strict';
/* Welcome & Local Info — global (shared) + property-specific content, managed from Supabase.
   Employee page requires no sign-in. Works with the existing house selector and translations.
   No staff tokens, service-role secrets or personal resident information are included. */
(() => {
  if (typeof s === 'undefined' || typeof home !== 'function' || typeof root === 'undefined') return;
  const existingHome = home;
  const sections = [
    {id:'welcome', icon:'👋', name:'Getting started', detail:'Reception, company information and emergency help'},
    {id:'shopping', icon:'🛒', name:'Shopping & essentials', detail:'Groceries, clothing and household goods'},
    {id:'medical', icon:'🏥', name:'Medical & emergency', detail:'Health services and useful numbers'},
    {id:'fuel', icon:'⛽', name:'Fuel', detail:'Where to get fuel'},
    {id:'eating', icon:'🍽️', name:'Eating out', detail:'Food and local dining options'},
    {id:'rubbish', icon:'♻️', name:'Rubbish & waste', detail:'Bins, skip and waste transfer station'}
  ];
  let selected='welcome';
  const safe=x=>e(String(x??''));
  const all=()=>Array.isArray(s.welcome_entries)?s.welcome_entries:[];
  const seenKey=()=>`pc_welcome_seen_${s.house?.id||'unknown'}_v1`;
  const seen=()=>{try{return localStorage.getItem(seenKey())==='1'}catch{return true}};
  const markSeen=()=>{try{localStorage.setItem(seenKey(),'1')}catch{}};
  const details = x => {
    const phone=String(x.phone||'').replace(/[^+0-9]/g,'');
    const email=String(x.email||'');
    const map=String(x.map_query||'');
    const official=String(x.source_url||'');
    const actions=[];
    if(phone)actions.push(`<a data-translate-no class="cw-utility" href="tel:${safe(phone)}">📞 ${safe(x.phone)}</a>`);
    if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))actions.push(`<a data-translate-no class="cw-utility" href="mailto:${safe(email)}">✉️ Email</a>`);
    if(map)actions.push(`<a data-translate-no class="cw-utility" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(map)}">📍 Directions</a>`);
    if(/^https:\/\//i.test(official))actions.push(`<a data-translate-no class="cw-utility cw-source" target="_blank" rel="noopener noreferrer" href="${safe(official)}">Official details</a>`);
    return `<article class="cw-place"><div class="cw-place-title"><div><strong data-translate-no>${safe(x.title)}</strong>${x.town?`<small data-translate-no>${safe(x.town)}</small>`:''}</div>${x.needs_review?'<span class="cw-review">Details may change</span>':''}</div>${x.body?`<p>${safe(x.body)}</p>`:''}${actions.length?`<div class="cw-actions">${actions.join('')}</div>`:''}</article>`;
  };
  const content=()=>{
    const rows=all().filter(x=>x.category===selected).sort((a,b)=>(a.sort_order||100)-(b.sort_order||100)||(a.title||'').localeCompare(b.title||''));
    if(!rows.length)return '<div class="card"><p>This section has no published information yet. The accommodation team can add it from the staff dashboard.</p></div>';
    const groups=new Map();
    for(const item of rows){const label=item.group_label||'Useful information';if(!groups.has(label))groups.set(label,[]);groups.get(label).push(item)}
    return [...groups].map(([name,items])=>`<section class="cw-list-group"><h2>${safe(name)}</h2>${items.map(details).join('')}</section>`).join('');
  };
  function welcomePage(){
    const current=sections.find(x=>x.id===selected)||sections[0];
    return `${hero('WELCOME TO ARUBIAL','Welcome & Local Info','Find useful contacts, shops and services when settling into your accommodation.')}
      <div class="cw-emergency-strip"><strong>Emergency? Call 000</strong><a href="tel:000" data-translate-no>📞 000</a><span>For urgent danger, call emergency services instead of lodging a maintenance request.</span></div>
      <button class="secondary cw-back" type="button" data-welcome-back>← Back to your house</button>
      <div class="cw-categories" aria-label="Welcome information categories">${sections.map(x=>`<button type="button" class="cw-category ${x.id===selected?'is-current':''}" aria-pressed="${x.id===selected}" data-welcome-category="${x.id}"><span aria-hidden="true">${x.icon}</span><strong>${safe(x.name)}</strong></button>`).join('')}</div>
      <section class="cw-content" aria-label="${safe(current.name)}"><header class="cw-content-title"><span aria-hidden="true">${current.icon}</span><div><h2>${safe(current.name)}</h2><p>${safe(current.detail)}</p></div></header>${content()}</section>
      <p class="cw-footnote">Business names, phone numbers and opening times can change. Check before travelling. Staff can update this page without changing GitHub.</p>
      <button type="button" class="secondary full cw-bottom-back" data-welcome-back>← Return to house dashboard</button>`;
  }
  home=function homeWithWelcome(){
    if(s.tab==='welcome')return welcomePage();
    let markup=existingHome();
    const card=`<section class="cw-home-link"><button type="button" class="cw-home-button" data-welcome-open><span aria-hidden="true">📖</span><span><strong>Welcome & Local Info</strong><small>Shopping, medical services, rubbish and local essentials</small></span><span aria-hidden="true">›</span></button></section>`;
    const marker='<details class="card cp-house-details"';
    markup=markup.includes(marker)?markup.replace(marker,card+marker):markup+card;
    if(!seen()){
      const banner=`<section class="cw-first-visit"><div><span class="cw-first-icon" aria-hidden="true">👋</span><div><strong>Welcome to Arubial & Lillyvale Feedlot</strong><p>New to your house? Browse local shops, medical contacts and accommodation information.</p></div></div><div class="cw-first-actions"><button type="button" data-welcome-open class="cw-first-primary">Explore welcome guide</button><button type="button" data-welcome-dismiss class="cw-first-dismiss">Not now</button></div></section>`;
      const anchor='<div class="cp-primary-actions">';
      markup=markup.includes(anchor)?markup.replace(anchor,banner+anchor):banner+markup;
    }
    return markup;
  };
  root.addEventListener('click',ev=>{
    const cat=ev.target.closest('[data-welcome-category]');
    if(cat){ev.preventDefault();ev.stopImmediatePropagation();selected=cat.dataset.welcomeCategory||'welcome';render();window.scrollTo({top:0,behavior:'smooth'});return;}
    const open=ev.target.closest('[data-welcome-open]');
    if(open){ev.preventDefault();ev.stopImmediatePropagation();markSeen();selected='welcome';setTab('welcome');return;}
    const dismiss=ev.target.closest('[data-welcome-dismiss]');
    if(dismiss){ev.preventDefault();ev.stopImmediatePropagation();markSeen();render();return;}
    const back=ev.target.closest('[data-welcome-back]');
    if(back){ev.preventDefault();ev.stopImmediatePropagation();setTab('home');}
  },true);
  if(s.house)render();
})();
