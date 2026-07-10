// app.js — shell, navigation, and live re-render on store changes.
import { subscribe, getState } from './store.js';
import { icon, openSheet, closeSheet } from './ui.js';

import today from './pages/today.js';
import scores from './pages/scores.js';
import scoreboard from './pages/scoreboard.js';
import skins from './pages/skins.js';
import ctp from './pages/ctp.js';
import groups from './pages/groups.js';
import payouts from './pages/payouts.js';
import admin from './pages/admin.js';

const PAGES = { today, scores, live: scoreboard, skins, ctp, groups, payouts, admin };
const PRIMARY = [
  { key: 'today', label: 'Today', ic: 'today' },
  { key: 'scores', label: 'Scores', ic: 'scores' },
  { key: 'live', label: 'Live', ic: 'live' },
  { key: 'skins', label: 'Skins', ic: 'skins' },
];
const MORE = [
  { key: 'ctp', label: 'Closest to Pin', ic: 'ctp' },
  { key: 'groups', label: 'Groups', ic: 'groups' },
  { key: 'payouts', label: 'Payouts', ic: 'payouts' },
  { key: 'admin', label: 'Admin', ic: 'admin' },
];

let current = 'today';
const main = document.getElementById('main');
const nav = document.getElementById('nav');

function renderNav() {
  const inMore = MORE.some((m) => m.key === current);
  nav.innerHTML = PRIMARY.map((p) =>
    `<button class="${p.key === current ? 'on' : ''}" data-nav="${p.key}">${icon(p.ic)}<span>${p.label}</span></button>`
  ).join('') +
    `<button class="${inMore ? 'on' : ''}" data-more>${icon('more')}<span>More</span></button>`;
  nav.querySelectorAll('[data-nav]').forEach((b) =>
    b.addEventListener('click', () => navigate(b.dataset.nav)));
  nav.querySelector('[data-more]')?.addEventListener('click', openMore);
}

function openMore() {
  openSheet(
    `<div class="page-title"><h1>Menu</h1></div>` +
    MORE.map((m) => `<div class="sheet-item" data-go="${m.key}">${icon(m.ic)}<span>${m.label}</span></div>`).join('')
  );
  document.querySelectorAll('[data-go]').forEach((el) =>
    el.addEventListener('click', () => { closeSheet(); navigate(el.dataset.go); }));
}

function renderPage() {
  const page = PAGES[current];
  main.innerHTML = page.render();
  main.scrollTop = 0;
  window.scrollTo(0, 0);
  if (page.onMount) page.onMount(main, renderPage);
}

function navigate(key) {
  if (!PAGES[key]) return;
  current = key;
  renderNav();
  renderPage();
}

// Connection status dot (Phase 3 wires real Firestore state).
function setStatus(live) {
  const dot = document.getElementById('statusDot');
  const label = document.getElementById('statusLabel');
  if (dot) dot.classList.toggle('live', live);
  if (label) label.textContent = live ? 'Live' : 'Local';
}

// Re-render current page whenever state changes (real-time feel).
subscribe(() => { renderPage(); });

renderNav();
navigate('today');
setStatus(false); // Phase 2 is local-only; Phase 3 sets true on Firestore connect.

// Register service worker (scoped to /clermont-skins/).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/clermont-skins/sw.js', { scope: '/clermont-skins/' }).catch(() => {});
  });
}
