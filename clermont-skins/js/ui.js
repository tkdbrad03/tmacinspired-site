// ui.js — small view helpers, inline SVG icons (no emojis), toast, sheet.

import { TEES } from './course.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function teeChip(teeId) {
  const t = TEES[teeId] || TEES.blue;
  return `<span class="tee-chip"><span class="tee-swatch tee-${t.id}"></span>${t.name}</span>`;
}

// Premium player identity element: a small white golf ball with a thin gold
// ring and faint dimples. Replaces initial-block avatars.
export function ballMarker() {
  return `<span class="ball" aria-hidden="true"><svg viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
    <circle cx="17" cy="17" r="15" fill="#ffffff" stroke="#c9a227" stroke-width="1.4"/>
    <g fill="#174c3c" opacity="0.13">
      <circle cx="17" cy="10.5" r="1.5"/><circle cx="11.8" cy="14.2" r="1.5"/><circle cx="22.2" cy="14.2" r="1.5"/>
      <circle cx="17" cy="17.6" r="1.5"/><circle cx="13" cy="20.6" r="1.3"/><circle cx="21" cy="20.6" r="1.3"/>
      <circle cx="17" cy="23.6" r="1.3"/>
    </g>
  </svg></span>`;
}

// Refined player meta line: "Blue Tee • 0 Strokes" with a small tee swatch.
export function playerMeta(p) {
  const t = TEES[p.tee] || TEES.blue;
  const s = Number(p.strokes) === 1 ? '1 Stroke' : `${p.strokes} Strokes`;
  return `<span class="tee-chip"><span class="tee-swatch tee-${t.id}"></span>${t.name} Tee</span> &nbsp;•&nbsp; ${s}`;
}

// Inline stroke icons (Feather-style). name -> path markup.
const ICONS = {
  today: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  scores: '<path d="M5 3v18"/><path d="M5 4h11l-2 3 2 3H5"/>',
  live: '<path d="M4 19V10"/><path d="M10 19V4"/><path d="M16 19v-7"/><path d="M3 19h18"/>',
  skins: '<circle cx="12" cy="8" r="5"/><path d="M8 13l-1 8 5-3 5 3-1-8"/>',
  ctp: '<path d="M6 3v18"/><path d="M6 4h9l-2 3 2 3H6"/>',
  groups: '<circle cx="9" cy="9" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 7a3 3 0 0 1 0 6"/><path d="M18 20a6 6 0 0 0-3-5"/>',
  payouts: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.6h-3a1.8 1.8 0 0 0 0 3.6h4"/>',
  admin: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  flag: '<path d="M6 21V4"/><path d="M6 5h11l-2 3 2 3H6"/>',
  export: '<path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M5 19h14"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};

export function icon(name, cls = 'ic') {
  return `<svg class="${cls}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

// Relative time for "updated X ago" (ms timestamp -> short label).
export function timeAgo(ts) {
  if (!ts) return '';
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 45) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

let toastTimer = null;
export function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

export function openSheet(html) {
  let bd = document.getElementById('sheet-backdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.id = 'sheet-backdrop';
    bd.className = 'sheet-backdrop';
    document.body.appendChild(bd);
    bd.addEventListener('click', (e) => { if (e.target === bd) closeSheet(); });
  }
  bd.innerHTML = `<div class="sheet"><div class="grip"></div>${html}</div>`;
  bd.classList.add('open');
  return bd;
}
export function closeSheet() {
  const bd = document.getElementById('sheet-backdrop');
  if (bd) bd.classList.remove('open');
}
