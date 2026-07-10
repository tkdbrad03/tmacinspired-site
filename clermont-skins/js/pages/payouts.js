// Payouts — money math. Units, unit value, per-player payout, exact-to-pool rounding shown.
import { getState } from '../store.js';
import { computeStandings, money } from '../calc.js';
import { esc } from '../ui.js';
import { openScorecard } from '../router.js';

export default {
  render() {
    const s = getState();
    const { players, payouts } = computeStandings(s.players, s.scores, s.ctp, s.event);
    const isFinal = s.event.status === 'final';

    const rows = players
      .filter((p) => p.units > 0)
      .sort((a, b) => b.payoutCents - a.payoutCents)
      .map((p) => `
        <tr class="tap-player" data-player="${p.id}">
          <td><span class="name">${esc(p.name)}</span><span class="sub">${p.skins} skin${p.skins===1?'':'s'} · ${p.ctps} CTP</span></td>
          <td class="num">${p.units}</td>
          <td class="num pay">${money(p.payoutCents)}</td>
        </tr>`).join('');

    const totalPaid = payouts.rows.reduce((a, r) => a + r.payoutCents, 0);
    const exact = totalPaid === payouts.poolCents;

    return `
      <div class="page-title"><h1>Payouts</h1><p>${isFinal ? 'Final payouts.' : 'Projected from current results.'}</p></div>

      <div class="stats">
        <div class="stat"><div class="v">${money(payouts.poolCents)}</div><div class="k">Prize Pool</div></div>
        <div class="stat"><div class="v">${payouts.totalUnits}</div><div class="k">Total Units</div></div>
        <div class="stat"><div class="v">${money(Math.round(payouts.unitValueCents))}</div><div class="k">Per Unit</div></div>
      </div>

      <div class="spacer"></div>
      <div class="card">
        <div class="card-head"><h2>Distribution</h2><span class="hint">${payouts.poolPlayers} paid · Skin=1u · CTP=2u</span></div>
        ${rows ? `<table class="board">
          <thead><tr><th>Player</th><th>Units</th><th>${isFinal ? 'Payout' : 'Projected'}</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td style="padding-top:12px;font-weight:800;color:var(--dark-green);">Total</td>
            <td class="num" style="padding-top:12px;font-weight:800;">${payouts.totalUnits}</td>
            <td class="num pay" style="padding-top:12px;">${money(totalPaid)}</td>
          </tr></tfoot>
        </table>` : '<div class="empty"><div class="big">No units won yet</div>Payouts appear as skins and CTPs are recorded.</div>'}
      </div>

      <div class="banner ${exact ? 'info' : 'lock'}">
        <div>${exact
          ? `<b>Balanced.</b> Payouts total ${money(totalPaid)} — exactly the ${money(payouts.poolCents)} pool.`
          : `<b>Check:</b> payouts total ${money(totalPaid)} vs pool ${money(payouts.poolCents)}.`}</div>
      </div>

      <div class="card tight">
        <div class="card-head"><h2>How it's calculated</h2></div>
        <div class="rows" style="font-size:.84rem;">
          <div class="row"><div class="grow">Prize pool</div><div class="rright">${payouts.poolPlayers} × $${s.event.buyIn} = ${money(payouts.poolCents)}</div></div>
          <div class="row"><div class="grow">Units</div><div class="rright">skins + (CTP × 2) = ${payouts.totalUnits}</div></div>
          <div class="row"><div class="grow">Unit value</div><div class="rright">pool ÷ units = ${money(Math.round(payouts.unitValueCents))}</div></div>
          <div class="row"><div class="grow">Player payout</div><div class="rright">units × unit value</div></div>
        </div>
      </div>
    `;
  },

  onMount(root) {
    root.querySelectorAll('[data-player]').forEach((el) =>
      el.addEventListener('click', () => openScorecard(el.dataset.player, 'payouts')));
  },
};
