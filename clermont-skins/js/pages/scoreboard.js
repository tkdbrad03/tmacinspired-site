// Live Scoreboard (NOT "leaderboard"). Player · Tee · Gross · Net · To par · Skins · CTP · Units · Projected payout.
import { getState } from '../store.js';
import { computeStandings, money, toParLabel } from '../calc.js';
import { teeChip, esc } from '../ui.js';

export default {
  render() {
    const s = getState();
    const { players } = computeStandings(s.players, s.scores, s.ctp, s.event);
    const isFinal = s.event.status === 'final';

    // Sort by net (ascending) among those who have played, then by name.
    const ranked = [...players].sort((a, b) => {
      if (a.holesPlayed === 0 && b.holesPlayed === 0) return a.name.localeCompare(b.name);
      if (a.holesPlayed === 0) return 1;
      if (b.holesPlayed === 0) return -1;
      return a.net - b.net;
    });

    const rows = ranked.map((p, i) => `
      <tr>
        <td>
          <span class="rank ${i === 0 && p.holesPlayed ? 'r1' : ''}">${i + 1}</span>
          <span class="name">${esc(p.name)}</span>
          <span class="sub">${teeChip(p.tee)} · thru ${p.holesPlayed}</span>
        </td>
        <td class="num">${p.gross || '–'}</td>
        <td class="num">${p.holesPlayed ? p.net : '–'}</td>
        <td class="num ${p.toPar < 0 ? 'pos' : p.toPar > 0 ? 'neg' : ''}">${p.holesPlayed ? toParLabel(p.toPar) : '–'}</td>
        <td class="num">${p.skins}</td>
        <td class="num">${p.ctps}</td>
        <td class="num">${p.units}</td>
        <td class="num pay">${money(p.payoutCents)}</td>
      </tr>`).join('');

    return `
      <div class="page-title"><h1>Live Scoreboard</h1><p>${isFinal ? 'Final results' : 'Updates instantly across every phone'}.</p></div>
      <div class="card">
        <div style="overflow-x:auto;">
        <table class="board">
          <thead><tr>
            <th>Player</th><th>Gr</th><th>Net</th><th>+/-</th><th>Sk</th><th>CTP</th><th>U</th><th>${isFinal ? 'Payout' : 'Proj'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        </div>
      </div>
      <div class="banner info"><div><b>Net</b> = gross minus strokes received. Payout is projected from current skins &amp; CTP and the paid-player pool.</div></div>
    `;
  },
};
