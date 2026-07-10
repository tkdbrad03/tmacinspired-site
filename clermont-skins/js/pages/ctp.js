// CTP — Closest to the Pin. No distance: the most recently entered player is the
// current leader (and the winner once the event is locked). One record per hole;
// every change is written to the audit history. Scorekeepers update; the event
// lock freezes changes. Viewers see the current closest / winner only.
import { getState, updateCtpLeader, ctpHistory, canEditCtp, eventLocked } from '../store.js';
import { computeStandings, money } from '../calc.js';
import { COURSE, parOf } from '../course.js';
import { esc, openSheet, closeSheet, toast, icon, timeAgo } from '../ui.js';

function statusOf(c, locked) {
  if (!c || (!c.currentLeaderId && !c.noWinner)) return 'none';
  if (c.noWinner) return 'no-winner';
  return locked ? 'final' : 'current';
}
const STATUS_PILL = {
  none: '<span class="pill">No entry</span>',
  current: '<span class="pill green">Current leader</span>',
  final: '<span class="pill gold">Final winner</span>',
  'no-winner': '<span class="pill">No winner</span>',
};

export default {
  render() {
    const s = getState();
    const { payouts } = computeStandings(s.players, s.scores, s.ctp, s.event);
    const ctpValue = payouts.unitValueCents * 2; // CTP = 2 units
    const locked = eventLocked();
    const mayEdit = canEditCtp();

    const cards = COURSE.ctpHoles.map((hole) => {
      const c = s.ctp[hole];
      const status = statusOf(c, locked);
      const hist = ctpHistory(hole).filter((e) => e.action === 'leader');

      let lead;
      if (status === 'current' || status === 'final') {
        lead = `
          <div class="ctp-lead">
            <div class="ctp-lead-k">${status === 'final' ? 'CTP Winner' : 'Current Closest'}</div>
            <div class="ctp-lead-name">${esc(c.currentLeaderName)}</div>
            <div class="ctp-lead-meta">Updated ${timeAgo(c.updatedAt)} &nbsp;•&nbsp; by ${esc(c.updatedBy || 'Scorekeeper')}</div>
          </div>`;
      } else {
        lead = `<div class="ctp-lead"><div class="ctp-lead-name muted">Awaiting first entry</div></div>`;
      }

      const history = hist.length > 1 ? `
        <details class="ctp-history">
          <summary>History (${hist.length})</summary>
          <div class="ctp-history-list">
            ${hist.map((e, i) => `<div class="ctp-h-row"><span>${esc(e.playerName)}${i === 0 ? ' <span class="pill gold" style="padding:2px 7px">latest</span>' : ''}</span><span class="muted">${timeAgo(e.ts)} · ${esc(e.by)}</span></div>`).join('')}
          </div>
        </details>` : '';

      const showValue = status === 'final';
      return `
        <div class="card">
          <div class="card-head">
            <h2>Hole ${hole} &nbsp;·&nbsp; Par ${parOf(hole)}</h2>
            ${showValue ? '<span class="pill gold">' + money(ctpValue) + '</span>' : STATUS_PILL[status]}
          </div>
          <div class="row" style="border:none;padding:6px 2px 14px;">
            <div class="hole-badge">${hole}</div>
            ${lead}
          </div>
          ${mayEdit && !locked ? `<button class="btn gold block" data-update="${hole}">${icon('flag')} Update Closest Player</button>` : ''}
          ${mayEdit && locked ? `<button class="btn ghost block" disabled>Event locked</button>` : ''}
          ${history}
        </div>`;
    }).join('');

    return `
      <div class="page-title"><h1>Closest to the Pin</h1><p>${mayEdit ? 'Enter whoever is currently closest — the last name saved wins. Each CTP is worth 2 units.' : 'Live closest-to-the-pin results. Each CTP is worth 2 units.'}</p></div>
      ${cards}
      ${mayEdit ? `<div class="note-card">${icon('flag')}<div class="nc-body">No measuring — move the tee to the closest ball and enter that player. Updates appear on every device instantly, and prior leaders stay in the hole's <b>history</b>.</div></div>` : ''}
    `;
  },

  onMount(root) {
    root.querySelectorAll('[data-update]').forEach((b) =>
      b.addEventListener('click', () => openPicker(Number(b.dataset.update))));
  },
};

function openPicker(hole) {
  const s = getState();
  const cur = s.ctp[hole];
  const buttons = s.players.map((p) => `
    <button class="btn ${cur && cur.currentLeaderId === p.id ? 'gold' : 'ghost'} block" data-pick="${p.id}" style="justify-content:flex-start;margin-bottom:10px;">${esc(p.name)}</button>`).join('');
  openSheet(`
    <div class="page-title"><h1>Hole ${hole} · Closest</h1><p>Tap the player who is now closest to the pin.</p></div>
    ${buttons}
    <div class="spacer"></div>
  `);
  document.querySelectorAll('[data-pick]').forEach((b) =>
    b.addEventListener('click', () => {
      if (updateCtpLeader(hole, b.dataset.pick)) { closeSheet(); toast(`Hole ${hole}: closest updated`); }
      else toast('Not permitted');
    }));
}
