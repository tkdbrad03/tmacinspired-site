// Live Scoreboard — premium, tappable player cards (each opens a scorecard).
import { getState } from '../store.js';
import { computeStandings, money, toParLabel } from '../calc.js';
import { teeChip, esc } from '../ui.js';
import { openScorecard } from '../router.js';

export default {
  render() {
    const s = getState();
    const { players } = computeStandings(s.players, s.scores, s.ctp, s.event);
    const isFinal = s.event.status === 'final' || s.event.locked;

    const ranked = [...players].sort((a, b) => {
      if (a.holesPlayed === 0 && b.holesPlayed === 0) return a.name.localeCompare(b.name);
      if (a.holesPlayed === 0) return 1;
      if (b.holesPlayed === 0) return -1;
      return a.net - b.net;
    });

    const cards = ranked.map((p, i) => {
      const started = p.holesPlayed > 0;
      const lead = i === 0 && started;
      return `
        <button class="pcard ${lead ? 'lead' : ''}" data-player="${p.id}">
          <div class="pc-top">
            <div class="pc-rank ${lead ? 'r1' : ''}">${i + 1}</div>
            <div class="pc-id">
              <div class="pc-name">${esc(p.name)}</div>
              <div class="pc-sub">${teeChip(p.tee)} · thru ${p.holesPlayed}</div>
            </div>
            <div class="pc-pay">
              <div class="pc-pay-v">${money(p.payoutCents)}</div>
              <div class="pc-pay-k">${isFinal ? 'Payout' : 'Projected'}</div>
            </div>
          </div>
          <div class="pc-stats">
            <div class="pcs"><span class="pcs-v">${started ? p.gross : '–'}</span><span class="pcs-k">Gross</span></div>
            <div class="pcs"><span class="pcs-v">${started ? p.net : '–'}</span><span class="pcs-k">Net</span></div>
            <div class="pcs"><span class="pcs-v ${p.toPar < 0 ? 'pos' : p.toPar > 0 ? 'neg' : ''}">${started ? toParLabel(p.toPar) : '–'}</span><span class="pcs-k">To Par</span></div>
            <div class="pcs"><span class="pcs-v">${p.skins}</span><span class="pcs-k">Skins</span></div>
            <div class="pcs"><span class="pcs-v">${p.ctps}</span><span class="pcs-k">CTP</span></div>
          </div>
          <div class="pc-view">View Card <span class="pc-chev">›</span></div>
        </button>`;
    }).join('');

    return `
      <div class="page-title"><h1>Live Scoreboard</h1><p>${isFinal ? 'Final standings.' : 'Tap any player to open their scorecard.'}</p></div>
      <div class="pcards">${cards}</div>
    `;
  },

  onMount(root) {
    root.querySelectorAll('[data-player]').forEach((b) =>
      b.addEventListener('click', () => openScorecard(b.dataset.player, 'live')));
  },
};
