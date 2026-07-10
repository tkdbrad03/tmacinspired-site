// Owner controls — TMac only. Lock / reopen / reset the event. Setup (tees,
// strokes, groups, buy-in) is fixed and seeded once, so there are no editors here.
import { getState, lockEvent, resetData, isOwner, eventLocked } from '../store.js';
import { icon, toast } from '../ui.js';

export default {
  render() {
    const s = getState();
    if (!isOwner()) {
      return `
        <div class="page-title"><h1>Owner</h1></div>
        <div class="note-card">${icon('lock')}<div class="nc-body">Owner controls are limited to the event owner (TMac).</div></div>`;
    }
    const locked = eventLocked();
    return `
      <div class="page-title"><h1>Owner Controls</h1><p>Lock, reopen, or reset the event.</p></div>

      <div class="card">
        <div class="card-head"><h2>Event</h2><span class="pill ${locked ? 'gold' : 'green'}">${locked ? 'Locked' : 'Live'}</span></div>
        <div class="nc-body" style="font-size:.86rem;color:var(--muted);margin-bottom:14px;">
          ${locked
            ? 'The event is locked — scores and CTP are frozen and results are final.'
            : 'The event is live. Locking it stops all score and CTP changes for every device.'}
        </div>
        ${locked
          ? `<button class="btn ghost block" id="reopen">${icon('reset')} Reopen Event</button>`
          : `<button class="btn block" id="lock">${icon('lock')} Lock &amp; Finalize Event</button>`}
      </div>

      <div class="card">
        <div class="card-head"><h2>Danger Zone</h2></div>
        <div class="nc-body" style="font-size:.86rem;color:var(--muted);margin-bottom:14px;">Reset clears all scores, CTP entries, and history. Player tees, strokes, and groups are kept.</div>
        <button class="btn danger block" id="reset">${icon('reset')} Reset Event Data</button>
      </div>
      <div class="spacer"></div>
    `;
  },

  onMount(root) {
    if (!isOwner()) return;

    root.querySelector('#lock')?.addEventListener('click', () => {
      if (confirm('Locking the event will stop all score and CTP changes. Continue?')) {
        lockEvent(true); toast('Event locked');
      }
    });
    root.querySelector('#reopen')?.addEventListener('click', () => {
      if (confirm('Reopen the event so scores and CTP can be edited again?')) {
        lockEvent(false); toast('Event reopened');
      }
    });
    root.querySelector('#reset')?.addEventListener('click', () => {
      if (!confirm('Reset ALL scores, CTP, and history? This cannot be undone.')) return;
      if (!confirm('Are you absolutely sure? This permanently clears the round.')) return;
      resetData().then(() => toast('Event data reset'));
    });
  },
};
