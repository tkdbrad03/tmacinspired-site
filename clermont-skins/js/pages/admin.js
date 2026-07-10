// Admin — settings & controls. Phase 2: client-side gate + local mutations.
// Phase 6 swaps the unlock for a serverless PIN check that mints an admin claim,
// and Firestore rules enforce these actions server-side.
import { getState, updateEvent, updatePlayer, setAdmin, resetData, seedSample } from '../store.js';
import { TEE_ORDER, TEES } from '../course.js';
import { esc, icon, toast, ballMarker } from '../ui.js';

let pinInput = '';

export default {
  render() {
    const s = getState();
    if (!s.admin) return lockedView();

    const ev = s.event;
    const statusBtns = `
      <div class="grid-2">
        <button class="btn ${ev.status==='live'?'gold':'ghost'} sm" data-status="live">${ev.status==='live'?'● Live':'Start / Go Live'}</button>
        <button class="btn ${ev.locked?'gold':'ghost'} sm" data-lock>${ev.locked?'Locked':'Lock Setup'}</button>
      </div>`;

    const playerRows = s.players.map((p) => `
      <div class="card tight">
        <div class="row" style="border:none;padding:2px;">
          ${ballMarker()}
          <div class="grow"><div class="rname">${esc(p.name)}</div><div class="rmeta">Group ${p.group}</div></div>
          <label class="switch"><input type="checkbox" data-paid="${p.id}" ${p.paid?'checked':''}><span class="track"></span></label>
        </div>
        <div class="inline-fields" style="margin-top:8px;">
          <div class="field" style="margin:0;">
            <label>Tee</label>
            <select data-tee="${p.id}">${TEE_ORDER.map((t)=>`<option value="${t}" ${p.tee===t?'selected':''}>${TEES[t].name}</option>`).join('')}</select>
          </div>
          <div class="field" style="margin:0;">
            <label>Strokes</label>
            <input type="number" min="0" max="36" data-strokes="${p.id}" value="${p.strokes}">
          </div>
        </div>
      </div>`).join('');

    return `
      <div class="page-title"><h1>Admin</h1><p>Event setup, corrections, and finalize.</p></div>

      <div class="card">
        <div class="card-head"><h2>Event</h2><span class="pill ${ev.status==='final'?'green':''}">${ev.status}</span></div>
        <div class="field"><label>Buy-in ($ per player)</label><input type="number" min="0" id="buyIn" value="${ev.buyIn}"></div>
        ${statusBtns}
        <div class="spacer"></div>
        ${ev.status==='final'
          ? '<div class="banner lock">'+icon('lock')+'<div>Event finalized — scoring is locked.</div></div>'
          : '<button class="btn block" id="finalize">'+icon('flag')+' Finalize Event</button>'}
      </div>

      <div class="card tight"><div class="card-head"><h2>Players · Tees · Strokes · Paid</h2></div></div>
      ${playerRows}

      <div class="card">
        <div class="card-head"><h2>Data & Export</h2></div>
        <div class="grid-2">
          <button class="btn ghost sm" id="exportCsv">${icon('export')} CSV</button>
          <button class="btn ghost sm" id="exportPdf">${icon('export')} PDF</button>
        </div>
        <div class="spacer"></div>
        <div class="grid-2">
          <button class="btn ghost sm" id="seed">Load Sample</button>
          <button class="btn danger sm" id="reset">${icon('reset')} Reset Data</button>
        </div>
      </div>

      <button class="btn ghost block" id="signout">Exit Admin</button>
      <div class="spacer"></div>
    `;
  },

  onMount(root, rerender) {
    const s = getState();
    if (!s.admin) {
      const inp = root.querySelector('#pin');
      inp?.addEventListener('input', (e) => { pinInput = e.target.value; });
      root.querySelector('#unlock')?.addEventListener('click', () => {
        // Phase 2 stub: any non-empty PIN unlocks locally. Phase 6 verifies server-side.
        if (!pinInput) { toast('Enter the admin PIN'); return; }
        setAdmin(true); pinInput = ''; toast('Admin unlocked');
      });
      return;
    }

    root.querySelector('#buyIn')?.addEventListener('change', (e) =>
      updateEvent({ buyIn: Math.max(0, Number(e.target.value) || 0) }));
    root.querySelector('[data-status]')?.addEventListener('click', () =>
      updateEvent({ status: s.event.status === 'live' ? 'setup' : 'live' }));
    root.querySelector('[data-lock]')?.addEventListener('click', () =>
      updateEvent({ locked: !s.event.locked }));
    root.querySelector('#finalize')?.addEventListener('click', () => {
      if (confirm('Finalize the event? Players will no longer be able to edit scores.')) {
        updateEvent({ status: 'final', locked: true }); toast('Event finalized');
      }
    });

    root.querySelectorAll('[data-paid]').forEach((el) =>
      el.addEventListener('change', () => updatePlayer(el.dataset.paid, { paid: el.checked })));
    root.querySelectorAll('[data-tee]').forEach((el) =>
      el.addEventListener('change', () => updatePlayer(el.dataset.tee, { tee: el.value })));
    root.querySelectorAll('[data-strokes]').forEach((el) =>
      el.addEventListener('change', () => updatePlayer(el.dataset.strokes, { strokes: Math.max(0, Math.min(36, Number(el.value) || 0)) })));

    root.querySelector('#seed')?.addEventListener('click', () => { seedSample(); toast('Sample round loaded'); });
    root.querySelector('#reset')?.addEventListener('click', () => {
      if (confirm('Reset all scores and settings to defaults?')) { resetData(); toast('Data reset'); }
    });
    root.querySelector('#exportCsv')?.addEventListener('click', () => toast('CSV export arrives in Phase 8'));
    root.querySelector('#exportPdf')?.addEventListener('click', () => toast('PDF export arrives in Phase 8'));
    root.querySelector('#signout')?.addEventListener('click', () => { setAdmin(false); toast('Admin locked'); });
  },
};

function lockedView() {
  return `
    <div class="page-title"><h1>Admin</h1><p>Enter the admin PIN to manage the event.</p></div>
    <div class="card">
      <div class="card-head"><h2>${'Admin Access'}</h2>${icon('lock')}</div>
      <div class="field"><label>Admin PIN</label><input type="password" inputmode="numeric" id="pin" placeholder="••••" value="${esc(pinInput)}"></div>
      <button class="btn gold block" id="unlock">Unlock Admin</button>
    </div>
    <div class="banner info"><div>Admin controls scoring corrections, tees, strokes, CTP winners, finalize, and exports.</div></div>
  `;
}
