// Skins — per hole: winner, gross, net, value.
import { getState } from '../store.js';
import { computeStandings, money } from '../calc.js';
import { parOf } from '../course.js';
import { esc } from '../ui.js';
import { openScorecard } from '../router.js';

export default {
  render() {
    const s = getState();
    const { skinResults, payouts } = computeStandings(s.players, s.scores, s.ctp, s.event);
    const nameOf = (id) => s.players.find((p) => p.id === id)?.name || '';
    const skinValue = payouts.unitValueCents; // 1 skin = 1 unit

    const wonCount = skinResults.filter((r) => r.winnerId).length;

    const rows = skinResults.map((r) => {
      let winnerCell, valueCell;
      if (r.winnerId) {
        winnerCell = `<span class="name tap-player" data-player="${r.winnerId}">${esc(nameOf(r.winnerId))}</span>`;
        valueCell = `<span class="pay">${money(skinValue)}</span>`;
      } else {
        const label = r.reason === 'tie' ? 'Tied — canceled'
          : r.reason === 'no-par' ? 'No net par'
          : r.reason === 'no-scores' ? '—' : 'Carry (none)';
        winnerCell = `<span class="muted">${label}</span>`;
        valueCell = '<span class="muted">—</span>';
      }
      return `
        <tr>
          <td><span class="rank">${r.hole}</span><span class="sub" style="display:inline;">Par ${r.par}</span></td>
          <td style="text-align:left;">${winnerCell}</td>
          <td class="num">${r.gross ?? '–'}</td>
          <td class="num">${r.net ?? '–'}</td>
          <td class="num">${valueCell}</td>
        </tr>`;
    }).join('');

    return `
      <div class="page-title"><h1>Skins</h1><p>Lowest unique net, par or better. Ties cancel · no carryovers.</p></div>
      <div class="stats">
        <div class="stat"><div class="v">${wonCount}</div><div class="k">Skins Won</div></div>
        <div class="stat"><div class="v">${18 - wonCount}</div><div class="k">No Skin</div></div>
        <div class="stat"><div class="v">${money(skinValue)}</div><div class="k">Per Skin</div></div>
      </div>
      <div class="spacer"></div>
      <div class="card">
        <table class="board">
          <thead><tr><th>Hole</th><th style="text-align:left;">Winner</th><th>Gr</th><th>Net</th><th>Value</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  onMount(root) {
    root.querySelectorAll('[data-player]').forEach((el) =>
      el.addEventListener('click', () => openScorecard(el.dataset.player, 'skins')));
  },
};
