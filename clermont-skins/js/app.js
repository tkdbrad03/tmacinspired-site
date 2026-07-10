// app.js — shell, role-based navigation, live re-render. Opens in Viewer mode;
// scorekeepers unlock via the header chip (PIN). TMac (owner) also gets Owner controls.
import { subscribe, getSession, isScorekeeper, isOwner, roleLabel, connectionState, getState } from './store.js';
import { icon, openSheet, closeSheet, openRoleSheet } from './ui.js';
import { router } from './router.js';

import today from './pages/today.js';
import scores from './pages/scores.js';
import scoreboard from './pages/scoreboard.js';
import skins from './pages/skins.js';
import ctp from './pages/ctp.js';
import groups from './pages/groups.js';
import payouts from './pages/payouts.js';
import owner from './pages/owner.js';
import scorecard from './pages/scorecard.js';

const PAGES = { today, scores, live: scoreboard, skins, ctp, groups, payouts, owner, scorecard };

const NAV = {
  today:   { label: 'Today',   ic: 'today' },
  scores:  { label: 'Scores',  ic: 'scores' },
  live:    { label: 'Live',    ic: 'live' },
  skins:   { label: 'Skins',   ic: 'skins' },
  ctp:     { label: 'CTP',     ic: 'ctp' },
  groups:  { label: 'Groups',  ic: 'groups' },
  payouts: { label: 'Payouts', ic: 'payouts' },
  owner:   { label: 'Owner',   ic: 'admin' },
};

let current = 'today';
const main = document.getElementById('main');
const nav = document.getElementById('nav');

function layout() {
  if (!isScorekeeper()) return { primary: ['today', 'live', 'skins', 'ctp'], more: ['groups', 'payouts'] };
  const more = ['ctp', 'groups', 'payouts'];
  if (isOwner()) more.push('owner');
  return { primary: ['today', 'scores', 'live', 'skins'], more };
}
// 'scorecard' is a read-only detail view reachable by every role (via a player tap).
function allowed() { const l = layout(); return new Set([...l.primary, ...l.more, 'scorecard']); }

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

function boot() {
  ensureAllowed();
  renderRole();
  renderNav();
  renderPage();
  renderConn();
}

// Connection banner + header dot. Shows Offline / Syncing, and a brief
// "All changes synced" when it settles.
let lastConn = 'synced';
let syncedUntil = 0;
let hideTimer = null;
function renderConn() {
  const bar = document.getElementById('connbar');
  const dot = document.getElementById('statusDot');
  const st = connectionState();
  const connected = getState().connected;
  if (dot) {
    dot.classList.remove('live', 'syncing', 'off');
    if (st === 'offline') dot.classList.add('off');
    else if (st === 'syncing') dot.classList.add('syncing');
    else if (connected) dot.classList.add('live');
  }
  if (bar) {
    if (st === 'offline') { clearTimeout(hideTimer); showBar(bar, 'offline', 'Offline — changes will sync when connection returns'); }
    else if (st === 'syncing') { clearTimeout(hideTimer); showBar(bar, 'syncing', 'Syncing changes…'); }
    else {
      // synced — briefly confirm after recovering from offline/syncing, then hide.
      if (lastConn !== 'synced') syncedUntil = Date.now() + 2600;
      if (Date.now() < syncedUntil) {
        showBar(bar, 'synced', 'All changes synced');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => { const b = document.getElementById('connbar'); if (b) b.hidden = true; }, Math.max(0, syncedUntil - Date.now()));
      } else {
        bar.hidden = true;
      }
    }
  }
  lastConn = st;
}
function showBar(bar, cls, text) { bar.hidden = false; bar.className = 'connbar ' + cls; bar.textContent = text; }

router.navigate = navigate; // let any page open a player's scorecard
subscribe(() => { boot(); });

// Register service worker (scoped to /clermont-skins/).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/clermont-skins/sw.js', { scope: '/clermont-skins/' }).catch(() => {});
  });
}
