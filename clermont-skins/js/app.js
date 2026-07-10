// app.js — shell, entry gate, role-based navigation, live re-render.
import { subscribe, getSession, setViewer, roleLabel } from './store.js';
import { icon, openSheet, closeSheet, openCodeSheet, openRoleSheet } from './ui.js';

import today from './pages/today.js';
import scores from './pages/scores.js';
import scoreboard from './pages/scoreboard.js';
import skins from './pages/skins.js';
import ctp from './pages/ctp.js';
import groups from './pages/groups.js';
import payouts from './pages/payouts.js';
import admin from './pages/admin.js';

const PAGES = { today, scores, live: scoreboard, skins, ctp, groups, payouts, admin };

const NAV = {
  today:   { label: 'Today',   ic: 'today' },
  scores:  { label: 'Scores',  ic: 'scores' },
  live:    { label: 'Live',    ic: 'live' },
  skins:   { label: 'Skins',   ic: 'skins' },
  ctp:     { label: 'CTP',     ic: 'ctp' },
  groups:  { label: 'Groups',  ic: 'groups' },
  payouts: { label: 'Payouts', ic: 'payouts' },
  admin:   { label: 'Admin',   ic: 'admin' },
};

// Navigation by role. Viewers get no Scores entry and no Admin.
const LAYOUT = {
  viewer:      { primary: ['today', 'live', 'skins', 'ctp'],   more: ['groups', 'payouts'] },
  scorekeeper: { primary: ['today', 'scores', 'live', 'skins'], more: ['ctp', 'groups', 'payouts'] },
  admin:       { primary: ['today', 'scores', 'live', 'skins'], more: ['ctp', 'groups', 'payouts', 'admin'] },
};

let current = 'today';
const main = document.getElementById('main');
const nav = document.getElementById('nav');

function layout() { return LAYOUT[getSession().role] || LAYOUT.viewer; }
function allowed() { const l = layout(); return new Set([...l.primary, ...l.more]); }

function renderRole() {
  const label = document.getElementById('roleLabel');
  if (label) label.textContent = roleLabel();
  const btn = document.getElementById('roleBtn');
  if (btn) btn.onclick = openRoleSheet;
}

function renderNav() {
  const l = layout();
  nav.innerHTML = l.primary.map((k) =>
    `<button class="${k === current ? 'on' : ''}" data-nav="${k}">${icon(NAV[k].ic)}<span>${NAV[k].label}</span></button>`
  ).join('') + `<button class="${l.more.includes(current) ? 'on' : ''}" data-more>${icon('more')}<span>More</span></button>`;
  nav.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.nav)));
  nav.querySelector('[data-more]')?.addEventListener('click', openMore);
}

function openMore() {
  const l = layout();
  openSheet(`<div class="page-title"><h1>Menu</h1></div>` +
    l.more.map((k) => `<div class="sheet-item" data-go="${k}">${icon(NAV[k].ic)}<span>${NAV[k].label}</span></div>`).join(''));
  document.querySelectorAll('[data-go]').forEach((el) =>
    el.addEventListener('click', () => { closeSheet(); navigate(el.dataset.go); }));
}

function renderPage() {
  const page = PAGES[current];
  main.innerHTML = page.render();
  main.scrollTop = 0; window.scrollTo(0, 0);
  if (page.onMount) page.onMount(main, renderPage);
}

function navigate(key) {
  if (!PAGES[key] || !allowed().has(key)) return;
  current = key;
  renderNav();
  renderPage();
}

function ensureAllowed() { if (!allowed().has(current)) current = 'today'; }

// Entry gate ---------------------------------------------------------------
function renderGate() {
  nav.style.display = 'none';
  main.classList.add('gate-wrap');
  main.innerHTML = `
    <div class="gate">
      <img class="gate-mark" src="/clermont-skins/icons/icon.svg" alt="">
      <h1>Clermont National</h1>
      <div class="gate-sub">Skins &amp; CTP</div>
      <div class="gate-card">
        <button class="btn gold block" id="asViewer">Continue as Viewer</button>
        <div class="gate-or"><span>or</span></div>
        <button class="btn ghost block" id="asCode">Enter Scorekeeper Code</button>
      </div>
      <div class="gate-foot">Only designated scorekeepers enter scores. Everyone else, continue as a viewer to follow the event live.</div>
    </div>`;
  document.getElementById('asViewer').onclick = () => setViewer();
  document.getElementById('asCode').onclick = () => openCodeSheet();
}

// Boot / re-render on any state or session change --------------------------
function boot() {
  if (!getSession().role) { renderGate(); return; }
  nav.style.display = '';
  main.classList.remove('gate-wrap');
  ensureAllowed();
  renderRole();
  renderNav();
  renderPage();
}

function setStatus(live) {
  const dot = document.getElementById('statusDot');
  if (dot) dot.classList.toggle('live', live);
}

subscribe(() => { boot(); });
setStatus(false); // Phase 2 is local-only; Phase 3 sets true on Firestore connect.

// Register service worker (scoped to /clermont-skins/).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/clermont-skins/sw.js', { scope: '/clermont-skins/' }).catch(() => {});
  });
}
