// Player scorecard — a player's live tournament card: sticky summary + front/back
// nine hole-by-hole (gross/net), OUT/IN/TOTAL, skin/CTP badges. Read-only; opens
// from Live Scoreboard, Skins, Payouts, and player lists. Updates live.
import { getState } from '../store.js';
import { computeStandings, holeDetail, money, toParLabel } from '../calc.js';
import { PAR, parOf, isCtpHole } from '../course.js';
import { esc, teeChip, icon } from '../ui.js';
import { router, scorecardBack } from '../router.js';

export default {
  render() {
    const s = getState();
    const pid = router.scorecardId;
    const { players, skinResults } = computeStandings(s.players, s.scores, s.ctp, s.event);
    const p = players.find((x) => x.id === pid);
    if (!p) {
      return `<div class="page-title"><h1>Scorecard</h1></div>
        <div class="note-card">${icon('groups')}<div class="nc-body">Select a player from the Live Scoreboard.</div></div>`;
    }

    // Rank among players who have started.
    const ranked = [...players].filter((x) => x.holesPlayed > 0).sort((a, b) => a.net - b.net);
    const pos = ranked.findIndex((x) => x.id === pid);
    const standing = p.holesPlayed === 0 ? 'Not started' : ordinal(pos + 1) + ' of ' + players.length;

    const skinHoles = skinResults.filter((r) => r.winnerId === pid).map((r) => r.hole);
    const ctpHoles = Object.keys(s.ctp).map(Number).filter((h) => {
      const c = s.ctp[h]; return c && c.currentLeaderId === pid && !c.noWinner && isCtpHole(h);
    });

    const nine = (holes, label) => {
      let og = 0, on = 0, played = 0;
      const cells = holes.map((h) => {
        const d = holeDetail(p, h, s.scores);
        if (d) { og += d.gross; on += d.net; played++; }
        const skin = skinHoles.includes(h);
        const ctp = ctpHoles.includes(h);
        return { h, par: parOf(h), d, skin, ctp };
      });
      return { cells, og, on, played, label };
    };
    const front = nine([1, 2, 3, 4, 5, 6, 7, 8, 9], 'Front Nine');
    const back = nine([10, 11, 12, 13, 14, 15, 16, 17, 18], 'Back Nine');

    const outPar = PAR.slice(0, 9).reduce((a, b) => a + b, 0);
    const inPar = PAR.slice(9).reduce((a, b) => a + b, 0);

    const nineTable = (n, totPar) => `
      <div class="sc-nine">
        <div class="sc-nine-h">${n.label}</div>
        <div class="sc-table-wrap">
        <table class="sc-table">
          <tr class="sc-r-hole"><th>Hole</th>${n.cells.map((c) => `<td class="${c.h === currentHoleHint(s) ? 'now' : ''}">${c.h}</td>`).join('')}<td class="sc-tot">${n.label === 'Front Nine' ? 'Out' : 'In'}</td></tr>
          <tr class="sc-r-par"><th>Par</th>${n.cells.map((c) => `<td>${c.par}</td>`).join('')}<td class="sc-tot">${totPar}</td></tr>
          <tr class="sc-r-gr"><th>Gr</th>${n.cells.map((c) => `<td class="${cellCls(c)}">${c.d ? c.d.gross : '–'}${badge(c)}</td>`).join('')}<td class="sc-tot">${n.played ? n.og : '–'}</td></tr>
          <tr class="sc-r-net"><th>Net</th>${n.cells.map((c) => `<td>${c.d ? c.d.net : '–'}</td>`).join('')}<td class="sc-tot">${n.played ? n.on : '–'}</td></tr>
        </table>
        </div>
      </div>`;

    const totalGross = front.og + back.og;
    const totalNet = front.on + back.on;
    const achievements = [
      ...skinHoles.map((h) => `<span class="ach gold">Skin · Hole ${h}</span>`),
      ...ctpHoles.map((h) => `<span class="ach gold">CTP · Hole ${h}</span>`),
    ].join('');

    return `
      <button class="sc-back" id="scBack">${'‹'} Back</button>

      <div class="sc-header">
        <div class="sc-h-top">
          <div>
            <div class="sc-h-name">${esc(p.name)}</div>
            <div class="sc-h-sub">${teeChip(p.tee)} · ${p.strokes} stroke${p.strokes === 1 ? '' : 's'} · ${standing}</div>
          </div>
          <div class="sc-h-pay">
            <div class="sc-h-pay-v">${money(p.payoutCents)}</div>
            <div class="sc-h-pay-k">Projected</div>
          </div>
        </div>
        <div class="sc-h-stats">
          <div class="sc-hs"><span class="v">${p.holesPlayed ? p.gross : '–'}</span><span class="k">Gross</span></div>
          <div class="sc-hs"><span class="v">${p.holesPlayed ? p.net : '–'}</span><span class="k">Net</span></div>
          <div class="sc-hs"><span class="v ${p.toPar < 0 ? 'pos' : p.toPar > 0 ? 'neg' : ''}">${p.holesPlayed ? toParLabel(p.toPar) : '–'}</span><span class="k">To Par</span></div>
          <div class="sc-hs"><span class="v">${p.skins}</span><span class="k">Skins</span></div>
          <div class="sc-hs"><span class="v">${p.ctps}</span><span class="k">CTP</span></div>
        </div>
      </div>

      ${achievements ? `<div class="sc-ach">${achievements}</div>` : ''}

      ${nineTable(front, outPar)}
      ${nineTable(back, inPar)}

      <div class="card sc-total">
        <div class="sc-total-row"><span>Total Gross</span><span class="sc-total-v">${p.holesPlayed ? totalGross : '–'}</span></div>
        <div class="sc-total-row"><span>Total Net</span><span class="sc-total-v">${p.holesPlayed ? totalNet : '–'}</span></div>
      </div>
      <div class="spacer"></div>
    `;
  },

  onMount(root) {
    root.querySelector('#scBack')?.addEventListener('click', () => scorecardBack());
  },
};

function cellCls(c) { return [c.skin ? 'skin' : '', c.ctp ? 'ctpw' : ''].join(' ').trim(); }
function badge(c) {
  if (c.skin) return '<span class="cell-badge">S</span>';
  if (c.ctp) return '<span class="cell-badge">C</span>';
  return '';
}
function currentHoleHint() { return -1; }
function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
