// Enter Scores — hole-first, whole-group-at-once, like a real scorecard.
// Shows one hole with every group player defaulted to par; one Save Hole button
// writes all scores and auto-advances. CTP holes show the CTP control inline.
import { getState, setScore, editablePlayers, canEditScores, scorekeeperGroup, eventLocked, updateCtpLeader, canEditCtp, scorePending, isOnline } from '../store.js';
import { strokesOnHole, scoreKey } from '../calc.js';
import { parOf, holeHandicap, isCtpHole, COURSE } from '../course.js';
import { icon, esc, toast, teeChip, openSheet, closeSheet, timeAgo } from '../ui.js';

const HOLE_KEY = 'clermont-skins-hole';
const GROUP_WORDS = { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four' };

let hole = loadHole();
let pending = {};      // playerId -> gross (in-progress values for the current hole)
let pendingHole = null;

function loadHole() { const h = Number(localStorage.getItem(HOLE_KEY)); return h >= 1 && h <= 18 ? h : 1; }
function saveHole() { try { localStorage.setItem(HOLE_KEY, String(hole)); } catch (e) {} }

export default {
  render() {
    const s = getState();
    if (!canEditScores()) {
      return `
        <div class="page-title"><h1>Enter Scores</h1></div>
        <div class="note-card">${icon('lock')}<div class="nc-body">Score entry is limited to the two <b>scorekeepers</b>. Tap the badge in the top-right and enter a scorekeeper PIN to unlock your group.</div></div>`;
    }

    const roster = editablePlayers();
    const par = parOf(hole);
    const locked = eventLocked();
    const ctpHole = isCtpHole(hole);

    // Seed pending values for this hole (existing score, else par). Preserved
    // across the store's snapshot re-renders so in-progress taps aren't lost.
    if (pendingHole !== hole) { pending = {}; pendingHole = hole; }
    for (const p of roster) {
      if (pending[p.id] === undefined) {
        const ex = s.scores[scoreKey(p.id, hole)];
        pending[p.id] = ex ? ex.gross : par;
      }
    }

    const playerRows = roster.map((p) => {
      const gross = pending[p.id];
      const rec = strokesOnHole(p.strokes, p.tee, hole);
      const key = scoreKey(p.id, hole);
      const logged = !!s.scores[key];
      const pend = logged && scorePending(key);
      const badge = !logged ? ''
        : pend && !isOnline() ? '<span class="sr-logged pending">saved offline</span>'
        : pend ? '<span class="sr-logged pending">syncing</span>'
        : '<span class="sr-logged saved">saved</span>';
      return `
        <div class="score-row" data-row="${p.id}">
          <div class="score-name">
            <span class="sr-name">${esc(p.name)}${badge}</span>
            <span class="sr-sub">${teeChip(p.tee)}${rec > 0 ? ` · <span class="sr-net">net <b data-net="${p.id}">${gross - rec}</b></span>` : ''}</span>
          </div>
          <div class="score-stepper">
            <button class="sbtn minus" data-dec="${p.id}" ${locked ? 'disabled' : ''}>−</button>
            <div class="sval" data-val="${p.id}">${gross}</div>
            <button class="sbtn plus" data-inc="${p.id}" ${locked ? 'disabled' : ''}>+</button>
          </div>
        </div>`;
    }).join('');

    const ctpCard = ctpHole ? ctpSection(s) : '';

    const chips = Array.from({ length: 18 }, (_, i) => i + 1).map((h) => {
      const done = roster.every((p) => !!s.scores[scoreKey(p.id, h)]);
      const cls = ['hchip', h === hole ? 'on' : '', done ? 'done' : '', isCtpHole(h) ? 'ctp' : ''].join(' ');
      return `<button class="${cls}" data-hole="${h}">${h}</button>`;
    }).join('');

    return `
      <div class="hole-head">
        <div class="hh-left">
          <button class="hh-nav" data-prev ${hole === 1 ? 'disabled' : ''}>‹</button>
        </div>
        <div class="hh-center">
          <div class="hh-eyebrow">Group ${GROUP_WORDS[scorekeeperGroup()] || scorekeeperGroup()}${ctpHole ? ' · <span class="hh-ctp">CTP</span>' : ''}</div>
          <div class="hh-hole">Hole ${hole}</div>
          <div class="hh-par">Par ${par} · HCP ${holeHandicap(roster[0]?.tee || 'blue', hole)}</div>
        </div>
        <div class="hh-right">
          <button class="hh-nav" data-next ${hole === 18 ? 'disabled' : ''}>›</button>
        </div>
      </div>

      ${locked ? '<div class="banner lock">' + icon('lock') + '<div>Event is locked. Scoring is closed.</div></div>' : ''}

      <div class="card score-card">
        ${playerRows}
      </div>

      ${ctpCard}

      <button class="btn gold block save-hole" id="saveHole" ${locked ? 'disabled' : ''}>${icon('scores')} Save Hole ${hole}${hole < 18 ? ' →' : ''}</button>

      <div class="card tight hole-selector">
        <div class="card-head"><h2>Jump to hole</h2><span class="hint">Gold ring = CTP · filled = all saved</span></div>
        <div class="hchips">${chips}</div>
      </div>
    `;
  },

  onMount(root, rerender) {
    if (!canEditScores()) return;
    const locked = eventLocked();

    const go = (h) => { hole = Math.max(1, Math.min(18, h)); saveHole(); rerender(); };
    root.querySelector('[data-prev]')?.addEventListener('click', () => go(hole - 1));
    root.querySelector('[data-next]')?.addEventListener('click', () => go(hole + 1));
    root.querySelectorAll('[data-hole]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.hole))));

    if (!locked) {
      const roster = editablePlayers();
      const bump = (pid, d) => {
        pending[pid] = Math.max(1, Math.min(15, (pending[pid] || parOf(hole)) + d));
        root.querySelector(`[data-val="${pid}"]`).textContent = pending[pid];
        const netEl = root.querySelector(`[data-net="${pid}"]`);
        if (netEl) {
          const p = roster.find((x) => x.id === pid);
          netEl.textContent = pending[pid] - strokesOnHole(p.strokes, p.tee, hole);
        }
      };
      root.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => bump(b.dataset.inc, 1)));
      root.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => bump(b.dataset.dec, -1)));

      root.querySelector('#saveHole')?.addEventListener('click', () => {
        let ok = 0;
        for (const p of roster) if (setScore(p.id, hole, pending[p.id])) ok++;
        toast(isOnline() ? `Hole ${hole} saved (${ok})` : `Hole ${hole} saved offline — will sync`);
        if (hole < 18) { hole += 1; saveHole(); }
        pending = {}; pendingHole = null;
        rerender();
      });
    }

    // Inline CTP controls (CTP holes only).
    root.querySelector('#ctpUpdate')?.addEventListener('click', () => openCtpPicker(hole, rerender));
  },
};

function ctpSection(s) {
  const c = s.ctp[hole];
  const has = c && c.currentLeaderId && !c.noWinner;
  return `
    <div class="card ctp-inline">
      <div class="ci-head"><span class="ci-badge">CTP Active</span><span class="ci-hole">Hole ${hole}</span></div>
      <div class="ci-body">
        <div class="ci-lead">
          <div class="ci-k">Current Closest</div>
          <div class="ci-name ${has ? '' : 'muted'}">${has ? esc(c.currentLeaderName) : 'None yet'}</div>
          ${has ? `<div class="ci-meta">Updated ${timeAgo(c.updatedAt)} · by ${esc(c.updatedBy || 'Scorekeeper')}</div>` : ''}
        </div>
        ${canEditCtp() && !eventLocked() ? `<button class="btn ghost sm" id="ctpUpdate">${icon('flag')} Update Closest</button>` : ''}
      </div>
    </div>`;
}

function openCtpPicker(h, rerender) {
  const s = getState();
  const cur = s.ctp[h];
  const buttons = s.players.map((p) => `
    <button class="btn ${cur && cur.currentLeaderId === p.id ? 'gold' : 'ghost'} block" data-pick="${p.id}" style="justify-content:flex-start;margin-bottom:10px;">${esc(p.name)}</button>`).join('');
  openSheet(`
    <div class="page-title"><h1>Hole ${h} · Closest</h1><p>Tap the player who is now closest to the pin.</p></div>
    ${buttons}<div class="spacer"></div>`);
  document.querySelectorAll('[data-pick]').forEach((b) =>
    b.addEventListener('click', () => {
      if (updateCtpLeader(h, b.dataset.pick)) { closeSheet(); toast(`Hole ${h}: closest updated`); rerender(); }
      else toast('Not permitted');
    }));
}
