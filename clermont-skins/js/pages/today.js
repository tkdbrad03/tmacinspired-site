// Today — event overview.
import { getState } from '../store.js';
import { computeStandings, money } from '../calc.js';
import { COURSE, TOTAL_PAR } from '../course.js';
import { icon, ballMarker, playerMeta, esc } from '../ui.js';

const GROUP_WORDS = { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four' };

export default {
  render() {
    const s = getState();
    const ev = s.event;
    const { payouts } = computeStandings(s.players, s.scores, s.ctp, ev);
    const paidCount = s.players.filter((p) => p.paid).length;
    const holesLogged = Object.keys(s.scores).length;
    const statusLabel = { setup: 'Setup', live: 'Live', final: 'Final' }[ev.status] || ev.status;

    const groups = [1, 2].map((g) => {
      const gp = s.players.filter((p) => p.group === g);
      return `
        <div class="card">
          <div class="group-head">
            <div class="g-left">
              <span class="eyebrow">Starting Group</span>
              <span class="g-name">Group ${GROUP_WORDS[g] || g}</span>
            </div>
            <span class="count">${gp.length} Players</span>
          </div>
          <div class="rows">
            ${gp.map((p) => `
              <div class="row">
                ${ballMarker()}
                <div class="grow">
                  <div class="rname">${esc(p.name)}</div>
                  <div class="rmeta">${playerMeta(p)}</div>
                </div>
                <div class="rright">${p.paid ? '<span class="pill gold">Paid</span>' : '<span class="pill">Unpaid</span>'}</div>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="page-title">
        <h1>${esc(COURSE.name)}</h1>
        <p>${esc(COURSE.city)} &nbsp;•&nbsp; Par ${TOTAL_PAR} &nbsp;•&nbsp; Individual Skins &amp; CTP</p>
      </div>

      <div class="feature">
        <div class="f-row">
          <div>
            <div class="f-k">Event Status</div>
            <div class="f-v">${statusLabel}</div>
          </div>
          <span class="pill gold">${money(payouts.poolCents)} Pool</span>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><div class="v">${s.players.length}</div><div class="k">Players</div></div>
        <div class="stat"><div class="v">$${ev.buyIn}</div><div class="k">Buy-in</div></div>
        <div class="stat"><div class="v">${paidCount}/${s.players.length}</div><div class="k">Paid</div></div>
      </div>
      <div class="stats" style="margin-top:12px;">
        <div class="stat"><div class="v">${money(payouts.poolCents)}</div><div class="k">Prize Pool</div></div>
        <div class="stat"><div class="v">${COURSE.ctpHoles.length}</div><div class="k">CTP Holes</div></div>
        <div class="stat"><div class="v">${holesLogged}</div><div class="k">Scores In</div></div>
      </div>

      <div class="spacer"></div>
      ${groups}

      <div class="note-card">
        ${icon('flag')}
        <div class="nc-body">Groups organize play only. Skins, CTP, and payouts are based on <b>individual net scores</b>.</div>
      </div>
    `;
  },
};
