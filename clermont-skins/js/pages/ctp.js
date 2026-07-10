// CTP — Closest to the Pin. No distance measurement: the most recently entered
// player is the current leader (and the winner once finalized/locked). One
// authoritative record per hole; every change is written to the audit history.
import { getState, updateCtpLeader, clearCtp, markCtpNoWinner, setCtpLocked, ctpHistory } from '../store.js';
import { computeStandings, money } from '../calc.js';
import { COURSE, parOf } from '../course.js';
import { esc, openSheet, closeSheet, toast, icon, timeAgo } from '../ui.js';

function statusOf(c, eventFinal) {
  if (!c) return 'none';
  if (c.noWinner) return 'no-winner';
  if (!c.currentLeaderId) return 'none';
  return (eventFinal || c.locked) ? 'final' : 'current';
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
    const eventFinal = s.event.status === 'final';

    const cards = COURSE.ctpHoles.map((hole) => {
      const c = s.ctp[hole];
      const status = statusOf(c, eventFinal);
      const hist = ctpHistory(hole).filter((e) => e.action === 'leader');
      const canUpdate = !eventFinal && !(c && c.locked);

      let lead = '';
      if (status === 'current' || status === 'final') {
        lead = `
          <div class="ctp-lead">
            <div class="ctp-lead-k">${status === 'final' ? 'CTP Winner' : 'Current Closest'}</div>
            <div class="ctp-lead-name">${esc(c.currentLeaderName)}</div>
            <div class="ctp-lead-meta">Updated ${timeAgo(c.updatedAt)} &nbsp;•&nbsp; by ${esc(c.updatedBy || 'Scorekeeper')}</div>
          </div>`;
      } else if (status === 'no-winner') {
        lead = `<div class="ctp-lead"><div class="ctp-lead-name muted">No winner on this hole</div></div>`;
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

      const adminRow = s.admin ? `
        <div class="ctp-admin">
          <button class="btn ghost sm" data-clear="${hole}">Clear</button>
          <button class="btn ghost sm" data-nowin="${hole}">No winner</button>
          <button class="btn ${c && c.locked ? 'gold' : 'ghost'} sm" data-lock="${hole}">${c && c.locked ? 'Unlock' : 'Lock'}</button>
        </div>` : '';

      return `
        <div class="card">
          <div class="card-head">
            <h2>Hole ${hole} &nbsp;·&nbsp; Par ${parOf(hole)}</h2>
            ${(eventFinal || (c && c.locked)) && status !== 'none' && status !== 'no-winner' ? '<span class="pill gold">'+money(ctpValue)+'</span>' : STATUS_PILL[status]}
          </div>
          <div class="row" style="border:none;padding:6px 2px 14px;">
            <div class="hole-badge">${hole}</div>
            ${lead}
            ${(c && c.locked) ? `<span class="pill" style="align-self:flex-start">${'Locked'}</span>` : ''}
          </div>
          ${canUpdate ? `<button class="btn gold block" data-update="${hole}">${icon('flag')} Update Closest Player</button>`
            : `<button class="btn ghost block" disabled>${eventFinal ? 'Event finalized' : 'Result locked'}</button>`}
          ${history}
          ${adminRow}
        </div>`;
    }).join('');

    return `
      <div class="page-title"><h1>Closest to the Pin</h1><p>Enter whoever is currently closest. The last name saved wins. Each CTP is worth 2 units.</p></div>
      ${cards}
      <div class="note-card">
        ${icon('flag')}
        <div class="nc-body">No measuring required — move the tee to the closest ball and enter that player. Updates appear on every device instantly, and prior leaders stay in the hole's <b>history</b>.</div>
      </div>
    `;
  },

  onMount(root) {
    root.querySelectorAll('[data-update]').forEach((b) =>
      b.addEventListener('click', () => openPicker(Number(b.dataset.update))));
    root.querySelectorAll('[data-clear]').forEach((b) =>
      b.addEventListener('click', () => { if (clearCtp(Number(b.dataset.clear))) toast(`Hole ${b.dataset.clear} cleared`); else toast('Hole is locked'); }));
    root.querySelectorAll('[data-nowin]').forEach((b) =>
      b.addEventListener('click', () => { if (markCtpNoWinner(Number(b.dataset.nowin))) toast(`Hole ${b.dataset.nowin}: no winner`); else toast('Hole is locked'); }));
    root.querySelectorAll('[data-lock]').forEach((b) =>
      b.addEventListener('click', () => {
        const hole = Number(b.dataset.lock);
        const c = getState().ctp[hole];
        if (c && c.locked) {
          if (confirm(`Unlock the Hole ${hole} CTP result for editing?`)) { setCtpLocked(hole, false); toast(`Hole ${hole} unlocked`); }
        } else {
          setCtpLocked(hole, true); toast(`Hole ${hole} locked`);
        }
      }));
  },
};

function openPicker(hole) {
  const s = getState();
  const by = s.admin ? 'Admin' : 'Scorekeeper';
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
      if (updateCtpLeader(hole, b.dataset.pick, by)) {
        closeSheet();
        toast(`Hole ${hole}: closest updated`);
      } else {
        toast('Result is locked');
      }
    }));
}
