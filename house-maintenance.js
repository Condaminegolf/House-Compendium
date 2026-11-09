'use strict';
/* House-level maintenance history. Public responses never include names, phone numbers,
   private notes, descriptions or private photos. All data comes from Supabase. */
(() => {
  if (typeof s === 'undefined' || typeof home !== 'function' || typeof requests !== 'function' || typeof api !== 'function') return;
  const previousHome = home;
  const previousRequests = requests;
  const previousReceipt = receipt;
  const previousSetTab = setTab;
  let refreshBusy = false;
  const safe = value => e(String(value ?? ''));
  const shortDate = value => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const requestRows = () => Array.isArray(s.maintenance_requests) ? s.maintenance_requests : [];
  const openRequests = () => requestRows().filter(x => x.status !== 'Resolved');
  const closedRequests = () => requestRows().filter(x => x.status === 'Resolved');
  function issueRow(x) {
    const state = ['New', 'In progress', 'Waiting on parts', 'Resolved'].includes(x.status) ? x.status : 'New';
    return `<article class="house-maintenance-item"><div class="house-maintenance-heading"><strong>${safe(x.title || 'Maintenance request')}</strong><span class="house-maintenance-status ${state === 'Resolved' ? 'complete' : state === 'New' ? 'new' : 'active'}">${safe(state)}</span></div><div class="tiny muted">Ref ${safe(String(x.id || '').slice(0,8).toUpperCase())} · Reported ${safe(shortDate(x.created_at))}</div>${state === 'Resolved' ? `<p class="tiny muted">Completed ${safe(shortDate(x.updated_at))}</p>` : ''}</article>`;
  }
  function maintenanceSection() {
    if (!s.live) return '<div class="card"><h2>Pending maintenance requests</h2><p class="tiny muted">Demo requests are not connected to the maintenance database.</p></div>';
    const open = openRequests(), closed = closedRequests();
    return `<section class="house-maintenance-section" aria-label="House maintenance requests"><div class="house-maintenance-toolbar"><h2>🛠️ Pending maintenance requests</h2><button class="secondary" type="button" data-maintenance-refresh="1">↻ Refresh</button></div><p class="tiny muted">These requests are saved against this house in Compendium, not on this phone. You can see their status from any device that opens this house.</p>${open.length ? open.map(issueRow).join('') : '<div class="card"><strong>No outstanding maintenance requests</strong><p class="tiny muted">New requests submitted for this house will appear here automatically.</p></div>'}${closed.length ? `<details class="card house-maintenance-history"><summary>Recently completed requests (${closed.length})</summary>${closed.map(issueRow).join('')}</details>` : ''}<p class="tiny muted">The status is updated by the maintenance team. Urgent faults must be reported by phone.</p></section>`;
  }
  home = function () {
    const html = previousHome();
    const where = '<div class="card"><h2>🏠 House information</h2>';
    const pos = html.indexOf(where);
    return pos >= 0 ? html.slice(0, pos) + maintenanceSection() + html.slice(pos) : html + maintenanceSection();
  };
  requests = function () {
    if (!s.live) return previousRequests();
    return `${hero('HOUSE MAINTENANCE', 'Maintenance requests', 'View all outstanding requests for this house, even from a different phone or computer.')}${emergency()}${maintenanceSection()}<div class="card"><h2>Report another problem</h2><p>Your request will be saved against <b>${safe(s.house.name || s.house.address)}</b> and shown to the maintenance team.</p><button class="primary full" data-act="newticket">Submit maintenance request</button></div>`;
  };
  receipt = function () {
    return previousReceipt().replace('Keep this reference. You can check the status later on this device.', 'This request belongs to the house. Open the house from any device to see the latest status.');
  };
  async function reloadHouseMaintenance(redraw=true) {
    if (refreshBusy || !s.live || !s.house) return;
    refreshBusy = true;
    try {
      const result = await api('house-requests');
      if (!Array.isArray(result.maintenance_requests)) throw Error('The server returned an invalid maintenance list.');
      const before = JSON.stringify(requestRows());
      s.maintenance_requests = result.maintenance_requests;
      if (redraw && before !== JSON.stringify(result.maintenance_requests) && (s.tab === 'home' || s.tab === 'requests')) render();
    } catch (err) {
      if (s.tab === 'home' || s.tab === 'requests') {
        s.notice = 'The maintenance status could not be refreshed. Please try again.';
        if (redraw) render();
      }
    } finally { refreshBusy = false; }
  }
  setTab = function (tab) {
    previousSetTab(tab);
    if (['home', 'requests', 'receipt'].includes(tab)) void reloadHouseMaintenance(tab !== 'receipt');
  };
  document.getElementById('app')?.addEventListener('click', event => {
    const button = event.target.closest('[data-maintenance-refresh]');
    if (!button) return;
    event.preventDefault();
    button.disabled = true;
    button.textContent = 'Refreshing…';
    void reloadHouseMaintenance().finally(() => { if (button.isConnected) { button.disabled = false; button.textContent = '↻ Refresh'; } });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ['home', 'requests'].includes(s.tab)) void reloadHouseMaintenance();
  });
  window.setInterval(() => {
    if (document.visibilityState === 'visible' && ['home','requests'].includes(s.tab)) void reloadHouseMaintenance();
  }, 45000);
  // The parent script starts asynchronously. Once it finishes, the initial house payload
  // already contains house-level maintenance records; this refresh adds the new section.
  if (s.house) render();
})();
