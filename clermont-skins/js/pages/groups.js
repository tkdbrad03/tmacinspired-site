// Groups — display only. Explicitly does NOT affect scoring.
import { getState } from '../store.js';
import { ballMarker, playerMeta, esc, icon } from '../ui.js';
import { openScorecard } from '../router.js';

const GROUP_WORDS = { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four' };

export default {
  render() {
    const s = getState();
    const groupCard = (g) => {
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
            ${gp.map((p, i) => `
              <div class="row tap-player" data-player="${p.id}">
                ${ballMarker()}
                <div class="grow">
                  <div class="rname">${esc(p.name)}</div>
                  <div class="rmeta">${playerMeta(p)}</div>
                </div>
                <div class="rright"><span class="pill">${i + 1}</span></div>
              </div>`).join('')}
          </div>
        </div>`;
    };
    return `
      <div class="page-title"><h1>Groups</h1><p>Playing order only.</p></div>
      <div class="note-card">
        ${icon('flag')}
        <div class="nc-body">Groups are for organizing play. They never affect scores, skins, CTP, units, or payouts.</div>
      </div>
      ${groupCard(1)}
      ${groupCard(2)}
    `;
  },

  onMount(root) {
    root.querySelectorAll('[data-player]').forEach((el) =>
      el.addEventListener('click', () => openScorecard(el.dataset.player, 'groups')));
  },
};
