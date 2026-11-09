'use strict';
/* House homepage refresh — loads after the original Compendium modules. */
(() => {
  if (typeof s === 'undefined' || typeof home !== 'function' || typeof root === 'undefined') return;
  const safe = value => e(String(value ?? ''));
  const date = x => { const d=new Date(x); return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-AU',{day:'numeric',month:'short'}); };
  home = function streamlinedHome() {
    const h=s.house||{};
    const all=Array.isArray(s.maintenance_requests)?s.maintenance_requests:[];
    const pending=all.filter(x=>x.status!=='Resolved');
    const recent=all.filter(x=>x.status==='Resolved');
    const row=x=>`<article class="cp-job-row"><div><strong>${safe(x.title||'Maintenance request')}</strong><small>Ref ${safe(String(x.id||'').slice(0,8).toUpperCase())} · ${safe(date(x.created_at))}</small></div><span class="cp-state ${x.status==='Resolved'?'done':x.status==='New'?'new':''}">${safe(x.status||'New')}</span></article>`;
    return `${hero('YOUR PROPERTY',h.name||h.address||'Selected house','Choose what you need. Everything is connected to this house.')}
      <div class="cp-primary-actions"><button type="button" class="cp-big-action" data-act="tab" data-id="fix"><span aria-hidden="true">🔧</span><strong>Something Wrong</strong><small>Find a problem and get help</small></button><button type="button" class="cp-big-action" data-act="tab" data-id="inspection"><span aria-hidden="true">☑️</span><strong>Inspection Checklist</strong><small>Complete a house inspection</small></button></div>
      <section class="cp-pending" data-translate-no><div class="cp-heading"><h2>🛠️ Pending Maintenance <span class="cp-count">${pending.length}</span></h2><button type="button" class="cp-text-action" data-act="tab" data-id="requests">View all</button></div>
      <p class="tiny muted">Requests belong to the house, not this phone. Changes made by maintenance staff appear here.</p>${pending.length?pending.slice(0,3).map(row).join(''):'<div class="cp-empty">No outstanding maintenance requests for this house.</div>'}${pending.length>3?`<button type="button" data-act="tab" data-id="requests" class="secondary full">See all ${pending.length} requests</button>`:''}${recent.length?`<p class="tiny muted">${recent.length} recently completed request${recent.length===1?'':'s'} available under Maintenance.</p>`:''}</section>
      <div class="cp-secondary-actions"><button type="button" data-act="tab" data-id="care"><span>🌿</span><strong>Regular Care</strong><small>Preventative tasks and care guides</small></button><button type="button" data-act="tab" data-id="requests"><span>🎫</span><strong>Maintenance Requests</strong><small>Report a fault or see updates</small></button></div>
      <details class="card cp-house-details" data-translate-no><summary>🏠 House details &amp; equipment</summary><p><b>Address:</b> ${safe(h.address||'Not set')}</p><p><b>Water supply:</b> ${safe(h.water_supply||'Not entered')}</p><p><b>Hot water:</b> ${safe(h.hot_water_type||'Not entered')}</p>${h.approved_guide_notes?`<p>${safe(h.approved_guide_notes)}</p>`:''}${media('property',h.id)}${(s.equipment||[]).map(x=>`<div class="cp-equipment"><strong>${safe(x.name)}</strong><div class="tiny muted">${safe(x.location||'')} ${safe(x.model||'')}</div>${x.notes?`<p>${safe(x.notes)}</p>`:''}${media('equipment',x.id)}</div>`).join('')}</details>
      ${emergency()}`;
  };
  if (s.house) render();
})();
