// Enter Scores — fast mobile entry: pick player, pick hole, +/- gross, save, auto-advance.
import { getState, setScore, playerById } from '../store.js';
import { strokesOnHole, scoreKey } from '../calc.js';
import { parOf, holeHandicap, yardsOf, isCtpHole, COURSE } from '../course.js';
import { icon, teeChip, esc, toast } from '../ui.js';

// Local UI state (persists across re-renders).
let sel = { playerId: null, hole: 1, gross: null, groupFilter: 0 };

export default {
  render() {
    const s = getState();
    if (!sel.playerId) sel.playerId = s.players[0]?.id;
    const locked = s.event.status === 'final' || s.event.locked;

    const roster = sel.groupFilter ? s.players.filter((p) => p.group === sel.groupFilter) : s.players;
    if (sel.playerId && !roster.find((p) => p.id === sel.playerId)) sel.playerId = roster[0]?.id;
    const player = playerById(sel.playerId);

    const existing = s.scores[scoreKey(sel.playerId, sel.hole)];
    const displayGross = sel.gross != null ? sel.gross
      : (existing ? existing.gross : parOf(sel.hole));
    const received = player ? strokesOnHole(player.strokes, player.tee, sel.hole) : 0;
    const net = displayGross - received;
    const par = parOf(sel.hole);

    const playerTabs = roster.map((p) => `
      <button class="chip ${p.id === sel.playerId ? 'on' : ''}" data-player="${p.id}">${esc(p.name)}</button>`).join('');

    const holeChips = Array.from({ length: 18 }, (_, i) => i + 1).map((h) => {
      const done = !!s.scores[scoreKey(sel.playerId, h)];
      const cls = ['chip', h === sel.hole ? 'on' : '', done ? 'done' : '', isCtpHole(h) ? 'ctp' : ''].join(' ');
      return `<button class="${cls}" data-hole="${h}">${h}</button>`;
    }).join('');

    return `
      <div class="page-title"><h1>Enter Scores</h1><p>Tap a player and hole, set the gross, save.</p></div>

      ${locked ? '<div class="banner lock">'+icon('lock')+'<div>Event is locked. Only an admin can edit scores.</div></div>' : ''}

      <div class="card tight">
        <div class="card-head"><h2>Player</h2>
          <select id="groupFilter" style="border:1px solid var(--line-strong);border-radius:9px;padding:5px 8px;font-size:.75rem;color:var(--pine);">
            <option value="0" ${sel.groupFilter===0?'selected':''}>All groups</option>
            <option value="1" ${sel.groupFilter===1?'selected':''}>Group 1</option>
            <option value="2" ${sel.groupFilter===2?'selected':''}>Group 2</option>
          </select>
        </div>
        <div class="chips" id="playerTabs">${playerTabs}</div>
      </div>

      <div class="card">
        <div class="card-head">
          <h2>Hole ${sel.hole}${isCtpHole(sel.hole) ? ' · CTP' : ''}</h2>
          <span class="hint">${player ? teeChip(player.tee) : ''} · ${yardsOf(player?.tee || 'blue', sel.hole)} yds · Par ${par} · HCP ${holeHandicap(player?.tee || 'blue', sel.hole)}</span>
        </div>

        <div class="stepper">
          <button class="step-btn minus" id="minus" ${locked ? 'disabled' : ''}>−</button>
          <div class="step-value">
            <div class="big" id="grossVal">${displayGross}</div>
            <div class="lbl">Gross</div>
          </div>
          <button class="step-btn" id="plus" ${locked ? 'disabled' : ''}>+</button>
        </div>

        <div class="stats" style="margin-top:16px;">
          <div class="stat"><div class="v">${received}</div><div class="k">Strokes</div></div>
          <div class="stat"><div class="v">${net}</div><div class="k">Net</div></div>
          <div class="stat"><div class="v">${netToPar(net, par)}</div><div class="k">Net vs Par</div></div>
        </div>

        <div class="spacer"></div>
        <button class="btn gold block" id="saveBtn" ${locked ? 'disabled' : ''}>${icon('scores')} Save &amp; Next Hole</button>
      </div>

      <div class="card tight">
        <div class="card-head"><h2>Holes</h2><span class="hint">Gold ring = CTP · Gold border = logged</span></div>
        <div class="chips" id="holeChips">${holeChips}</div>
      </div>
    `;
  },

  onMount(root, rerender) {
    const s = getState();
    const locked = s.event.status === 'final' || s.event.locked;

    root.querySelector('#groupFilter')?.addEventListener('change', (e) => {
      sel.groupFilter = Number(e.target.value); sel.gross = null; rerender();
    });
    root.querySelectorAll('[data-player]').forEach((b) =>
      b.addEventListener('click', () => { sel.playerId = b.dataset.player; sel.gross = null; rerender(); }));
    root.querySelectorAll('[data-hole]').forEach((b) =>
      b.addEventListener('click', () => { sel.hole = Number(b.dataset.hole); sel.gross = null; rerender(); }));

    if (locked) return;

    const valEl = root.querySelector('#grossVal');
    const cur = () => Number(valEl.textContent);
    const setVal = (v) => { sel.gross = Math.max(1, Math.min(15, v)); valEl.textContent = sel.gross; softStats(root); };
    root.querySelector('#minus')?.addEventListener('click', () => setVal(cur() - 1));
    root.querySelector('#plus')?.addEventListener('click', () => setVal(cur() + 1));

    root.querySelector('#saveBtn')?.addEventListener('click', () => {
      setScore(sel.playerId, sel.hole, cur(), 'device');
      toast(`Hole ${sel.hole} saved`);
      if (sel.hole < 18) sel.hole += 1;
      sel.gross = null;
      // store emit triggers app re-render
    });
  },
};

function netToPar(net, par) {
  const d = net - par;
  if (d === 0) return 'E';
  return d > 0 ? `+${d}` : `${d}`;
}

// Live-update the strokes/net stats as the stepper changes, without a full re-render.
function softStats(root) {
  const s = getState();
  const player = playerById(sel.playerId);
  const par = parOf(sel.hole);
  const gross = Number(root.querySelector('#grossVal').textContent);
  const received = player ? strokesOnHole(player.strokes, player.tee, sel.hole) : 0;
  const net = gross - received;
  const stats = root.querySelectorAll('.stepper ~ .stats .stat .v');
  if (stats.length === 3) { stats[1].textContent = net; stats[2].textContent = netToPar(net, par); }
}
