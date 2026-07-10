// Today — event overview.
import { getState, getSession, isScorekeeper, scorekeeperGroup, signOut } from '../store.js';
import { computeStandings, money } from '../calc.js';
import { COURSE, TOTAL_PAR } from '../course.js';
import { SCOREKEEPERS } from '../access.js';
import { icon, ballMarker, playerMeta, esc, openPinSheet } from '../ui.js';
import { openScorecard } from '../router.js';

const GROUP_WORDS = { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four' };

function scorekeeperCard() {
  const sess = getSession();
  const sk = isScorekeeper();
  const name = sk ? (SCOREKEEPERS[sess.scorekeeperId]?.name || 'Scorekeeper') : null;
  const g = sk ? scorekeeperGroup() : null;
  return `
    <div class="card sk-card">
      <div class="sk-head">
        <div>
          <div class="eyebrow">Scorekeeper Access</div>
          <div class="sk-k">Current Mode</div>
          <div class="sk-mode">${sk ? esc(name) + ' Scorekeeper' : 'Viewer'}</div>
          <div class="sk-sub">${sk ? 'Managing Group ' + (GROUP_WORDS[g] || g) : 'Read-only — follow the event live'}</div>
        </div>
        <span class="sk-ic">${icon('lock')}</span>
      </div>
      <button class="btn ${sk ? 'ghost' : 'gold'} block" id="skBtn">${sk ? 'Exit Scorekeeper Mode' : icon('lock') + ' Enter Scorekeeper PIN'}</button>
    </div>`;
}

export default {
  render() {
    const s = getState();
    const ev = s.event;
    const { payouts } = computeStandings(s.players, s.scores, s.ctp, ev);
    const paidCount = s.players.filter((p) => p.paid).length;
    const holesLogged = Object.keys(s.scores).length;
    const statusLabel = ev.locked ? 'Final' : ({ setup: 'Setup', live: 'Live', active: 'Live', final: 'Final' }[ev.status] || 'Live');

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
              <div class="row tap-player" data-player="${p.id}">
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

      ${scorekeeperCard()}

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

  onMount(root) {
    root.querySelector('#skBtn')?.addEventListener('click', () => {
      if (isScorekeeper()) signOut();
      else openPinSheet();
    });
    root.querySelectorAll('[data-player]').forEach((el) =>
      el.addEventListener('click', () => openScorecard(el.dataset.player, 'today')));
  },
};
