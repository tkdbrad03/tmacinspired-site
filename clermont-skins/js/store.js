// store.js — app state + pub/sub, backed by Firestore for live data.
// Session (role) is device-local; event data is live from Firestore.
// The public API (getState/subscribe/setScore/updateCtpLeader/...) is unchanged
// so the page modules did not need to change shape.

import { DEFAULT_PLAYERS, DEFAULT_EVENT } from './course.js';
import { strokesOnHole } from './calc.js';
import { ROLES, SCOREKEEPERS, verifyPin } from './access.js';

const SESSION_KEY = 'clermont-skins-session-v1';
const listeners = new Set();

// Seed defaults give the UI something to render before the first snapshot.
let state = {
  event: { ...DEFAULT_EVENT, status: 'live', locked: false },
  players: DEFAULT_PLAYERS.map((p) => ({ ...p, paid: true })),
  scores: {},
  ctp: {},
  auditLog: [],
  connected: false,
};
let session = loadSession();
let fb = null; // the firebase module, once dynamically loaded

function emit() { for (const fn of listeners) fn(state); }

// Public: state / subscribe -------------------------------------------------
export function getState() { return state; }
export function subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); }
export function playerById(id) { return state.players.find((p) => p.id === id) || null; }

// Session / roles -----------------------------------------------------------
function loadSession() {
  try { const r = localStorage.getItem(SESSION_KEY); if (r) return JSON.parse(r); } catch (e) { /* ignore */ }
  return { role: ROLES.VIEWER, scorekeeperId: null };
}
function persistSession() { try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { /* ignore */ } }

export function getSession() { return session; }
export function setViewer() { session = { role: ROLES.VIEWER, scorekeeperId: null }; persistSession(); emit(); }
export function signOut() { setViewer(); } // "Exit Scorekeeper Mode"
export async function applyPin(pin) {
  const skRec = await verifyPin(pin);
  if (!skRec) return false;
  session = { role: ROLES.SCOREKEEPER, scorekeeperId: skRec.id };
  persistSession(); emit();
  return true;
}

function sk() { return session.scorekeeperId ? SCOREKEEPERS[session.scorekeeperId] : null; }
export function isScorekeeper() { return session.role === ROLES.SCOREKEEPER; }
export function isOwner() { const s = sk(); return isScorekeeper() && !!s && s.owner; } // TMac only
export function scorekeeperGroup() { const s = sk(); return s ? s.group : null; }
export function canEditScores() { return isScorekeeper(); }
export function canEditCtp() { return isScorekeeper(); }
export function canEditPlayer(id) {
  if (!isScorekeeper()) return false;
  const p = playerById(id);
  return !!p && p.group === scorekeeperGroup();
}
export function editablePlayers() {
  if (!isScorekeeper()) return [];
  const g = scorekeeperGroup();
  return state.players.filter((p) => p.group === g);
}
export function actorName() { const s = sk(); return s ? s.name : 'Scorekeeper'; }
export function roleLabel() {
  if (isScorekeeper()) { const s = sk(); return s ? `Scorekeeper · ${s.name}` : 'Scorekeeper'; }
  return 'Viewer';
}

export function eventLocked() { return !!(state.event && state.event.locked); }

// Writes (go to Firestore; onSnapshot brings them back to every device) ------
export function setScore(playerId, hole, gross) {
  if (!canEditPlayer(playerId) || eventLocked() || !fb) return false;
  const p = playerById(playerId);
  if (!p) return false;
  const id = `${playerId}_${hole}`;
  if (gross == null || gross === '') { fb.deleteScore(id).catch(() => {}); return true; }
  const received = strokesOnHole(p.strokes, p.tee, hole);
  const prev = state.scores[id];
  fb.writeScore(id, {
    player: playerId, hole: Number(hole), gross: Number(gross),
    strokeReceived: received, net: Number(gross) - received,
    updatedBy: actorName(), updatedAt: Date.now(), revision: (prev?.revision || 0) + 1,
  }).catch(() => {});
  return true;
}

export function updateCtpLeader(hole, playerId) {
  if (!canEditCtp() || eventLocked() || !fb) return false;
  const p = playerById(playerId);
  if (!p) return false;
  const cur = state.ctp[hole];
  fb.writeCtp(hole, {
    hole: Number(hole), currentLeaderId: playerId, currentLeaderName: p.name,
    noWinner: false, updatedBy: actorName(), updatedAt: Date.now(), revision: (cur?.revision || 0) + 1,
  }).catch(() => {});
  fb.writeAudit({ area: 'ctp', hole: Number(hole), action: 'leader', playerId, playerName: p.name, by: actorName(), ts: Date.now() }).catch(() => {});
  return true;
}

export function ctpHistory(hole) {
  return state.auditLog.filter((e) => e.area === 'ctp' && e.hole === hole).slice().reverse();
}

// Owner-only (TMac) ----------------------------------------------------------
export function lockEvent(locked) { if (!isOwner() || !fb) return false; fb.setLocked(!!locked).catch(() => {}); return true; }
export async function resetData() { if (!isOwner() || !fb) return false; await fb.resetAll().catch(() => {}); return true; }

// Firestore bootstrap --------------------------------------------------------
export async function start() {
  try {
    fb = await import('./firebase.js');
    fb.connect();
    // NOTE: the app never seeds Firestore. Event + player docs are created once
    // by the developer-only scripts/seed-firestore.js. Opening the app only
    // reads existing data, listens for updates, and writes scores/CTP in play.
    fb.listen({
      onEvent: (ev) => { if (ev) state.event = { ...state.event, ...ev }; state.connected = true; emit(); },
      onPlayers: (ps) => { if (ps && ps.length) state.players = sortPlayers(ps); emit(); },
      onScores: (m) => { state.scores = m; emit(); },
      onCtp: (m) => { state.ctp = m; emit(); },
      onAudit: (a) => { state.auditLog = a; emit(); },
    });
  } catch (e) {
    // Firebase unavailable (offline / CDN blocked): app still runs read-only on seed data.
    console.warn('[clermont] Firestore unavailable:', e && e.message);
  }
}

function sortPlayers(ps) {
  const order = DEFAULT_PLAYERS.map((p) => p.id);
  return ps.slice().sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

start();
