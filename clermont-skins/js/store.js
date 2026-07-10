// store.js — App state + pub/sub. In Phase 2 this is a local (localStorage) store
// that mimics the Firestore snapshot interface. Phase 3 swaps the internals for
// Firestore onSnapshot / transactions while keeping this exact public API.

import { DEFAULT_PLAYERS, DEFAULT_EVENT } from './course.js';
import { strokesOnHole } from './calc.js';
import { ROLES, SCOREKEEPERS, resolveCode } from './access.js';

const LS_KEY = 'clermont-skins-state-v1';
const SESSION_KEY = 'clermont-skins-session-v1';

const listeners = new Set();
let state = load();
// Session (role) is DEVICE-LOCAL, kept separate from shared event data. In
// Phase 3 event data comes from Firestore while the role stays on the device.
let session = loadSession();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return freshState();
}

// Tolerate older persisted shapes (e.g. distance-based CTP) without crashing.
function migrate(s) {
  if (!s.auditLog) s.auditLog = [];
  if (s.ctp) {
    for (const h of Object.keys(s.ctp)) {
      const c = s.ctp[h];
      if (c && c.currentLeaderId === undefined) {
        s.ctp[h] = {
          hole: Number(h),
          currentLeaderId: c.winnerId || null,
          currentLeaderName: c.currentLeaderName || null,
          noWinner: !!c.noWinner,
          locked: !!c.locked,
          updatedBy: c.updatedBy || null,
          updatedAt: c.updatedAt || null,
          revision: c.revision || 0,
        };
      }
    }
  }
  return s;
}

function freshState() {
  return {
    event: { ...DEFAULT_EVENT },
    players: DEFAULT_PLAYERS.map((p) => ({ ...p })),
    scores: {}, // key `${playerId}_${hole}` -> { player, hole, gross, strokeReceived, net, updatedBy, updatedAt, revision }
    // CTP: ONE authoritative document per hole. Latest saved leader is the winner.
    // hole -> { hole, currentLeaderId, currentLeaderName, noWinner, locked, updatedBy, updatedAt, revision }
    ctp: {},
    auditLog: [], // { id, ts, area, hole, action, playerId, playerName, by }
  };
}

function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { role: null, scorekeeperId: null };
}
function persistSession() {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
}

function emit() {
  persist();
  for (const fn of listeners) fn(state);
}

function audit(entry) {
  state.auditLog.push({ id: `${state.auditLog.length + 1}`, ts: now(), ...entry });
}

// Public API ----------------------------------------------------------------

export function getState() { return state; }

export function subscribe(fn) {
  listeners.add(fn);
  fn(state); // fire immediately with current snapshot
  return () => listeners.delete(fn);
}

export function playerById(id) {
  return state.players.find((p) => p.id === id) || null;
}

export function setScore(playerId, hole, gross, updatedBy) {
  const p = playerById(playerId);
  if (!p) return false;
  if (!canEditPlayer(playerId)) return false; // viewers / wrong-group scorekeepers blocked
  updatedBy = updatedBy || actorName();
  const key = `${playerId}_${hole}`;
  const received = strokesOnHole(p.strokes, p.tee, hole);
  if (gross == null || gross === '') {
    delete state.scores[key];
  } else {
    const prev = state.scores[key];
    state.scores[key] = {
      player: playerId,
      hole,
      gross: Number(gross),
      strokeReceived: received,
      net: Number(gross) - received,
      updatedBy,
      updatedAt: now(),
      revision: (prev?.revision || 0) + 1,
    };
  }
  emit();
  return true;
}

// CTP -----------------------------------------------------------------------
// Enter the player who is currently closest. The most recently saved player
// becomes the current leader (and, once finalized/locked, the winner).
export function updateCtpLeader(hole, playerId, by) {
  if (!canEditCtp()) return false; // only scorekeepers + admin
  by = by || actorName();
  const cur = state.ctp[hole];
  if (cur?.locked || state.event.status === 'final') return false;
  const p = playerById(playerId);
  if (!p) return false;
  state.ctp[hole] = {
    hole,
    currentLeaderId: playerId,
    currentLeaderName: p.name,
    noWinner: false,
    locked: false,
    updatedBy: by,
    updatedAt: now(),
    revision: (cur?.revision || 0) + 1,
  };
  audit({ area: 'ctp', hole, action: 'leader', playerId, playerName: p.name, by });
  emit();
  return true;
}

export function clearCtp(hole, by = 'Admin') {
  if (!isAdmin()) return false; // corrections are admin-only
  const cur = state.ctp[hole];
  if (cur?.locked) return false;
  state.ctp[hole] = { hole, currentLeaderId: null, currentLeaderName: null, noWinner: false, locked: false, updatedBy: by, updatedAt: now(), revision: (cur?.revision || 0) + 1 };
  audit({ area: 'ctp', hole, action: 'clear', by });
  emit();
  return true;
}

export function markCtpNoWinner(hole, by = 'Admin') {
  if (!isAdmin()) return false;
  const cur = state.ctp[hole];
  if (cur?.locked) return false;
  state.ctp[hole] = { hole, currentLeaderId: null, currentLeaderName: null, noWinner: true, locked: false, updatedBy: by, updatedAt: now(), revision: (cur?.revision || 0) + 1 };
  audit({ area: 'ctp', hole, action: 'no-winner', by });
  emit();
  return true;
}

export function setCtpLocked(hole, locked, by = 'Admin') {
  if (!isAdmin()) return false;
  const cur = state.ctp[hole];
  if (!cur) return false;
  cur.locked = !!locked;
  cur.updatedBy = by;
  cur.updatedAt = now();
  cur.revision = (cur.revision || 0) + 1;
  audit({ area: 'ctp', hole, action: locked ? 'lock' : 'unlock', by });
  emit();
  return true;
}

export function ctpHistory(hole) {
  return state.auditLog.filter((e) => e.area === 'ctp' && e.hole === hole).slice().reverse();
}

export function updateEvent(patch) {
  if (!isAdmin()) return false; // buy-in / status / lock / finalize are admin-only
  state.event = { ...state.event, ...patch };
  emit();
  return true;
}

export function updatePlayer(id, patch) {
  if (!isAdmin()) return false; // tees / strokes / paid are admin-only
  const p = playerById(id);
  if (!p) return false;
  Object.assign(p, patch);
  // Recompute affected net scores if tee/strokes changed.
  if ('tee' in patch || 'strokes' in patch) {
    for (const key of Object.keys(state.scores)) {
      const rec = state.scores[key];
      if (rec.player === id) {
        const received = strokesOnHole(p.strokes, p.tee, rec.hole);
        rec.strokeReceived = received;
        rec.net = rec.gross - received;
      }
    }
    // Keep CTP leader names in sync if a renamed/edited player is a leader.
    for (const h of Object.keys(state.ctp)) {
      if (state.ctp[h].currentLeaderId === id) state.ctp[h].currentLeaderName = p.name;
    }
  }
  emit();
}

// Session / roles ------------------------------------------------------------
export function getSession() { return session; }

export function setViewer() { session = { role: ROLES.VIEWER, scorekeeperId: null }; persistSession(); emit(); }
export function signOut() { session = { role: null, scorekeeperId: null }; persistSession(); emit(); }
export function applyCode(code) {
  const r = resolveCode(code);
  if (!r) return false;
  session = { role: r.role, scorekeeperId: r.scorekeeperId || null };
  persistSession(); emit();
  return true;
}

export function isAdmin() { return session.role === ROLES.ADMIN; }
export function isScorekeeper() { return session.role === ROLES.SCOREKEEPER; }
export function canEditScores() { return isAdmin() || isScorekeeper(); }
export function canEditCtp() { return isAdmin() || isScorekeeper(); }

export function scorekeeperGroup() {
  const sk = session.scorekeeperId ? SCOREKEEPERS[session.scorekeeperId] : null;
  return sk ? sk.group : null;
}

// The players this session may enter/edit scores for.
export function editablePlayers() {
  if (isAdmin()) return state.players;
  if (isScorekeeper()) { const g = scorekeeperGroup(); return state.players.filter((p) => p.group === g); }
  return [];
}
export function canEditPlayer(playerId) {
  if (isAdmin()) return true;
  if (isScorekeeper()) { const p = playerById(playerId); return !!p && p.group === scorekeeperGroup(); }
  return false;
}

// Label for who is acting (used as updatedBy / CTP "by").
export function actorName() {
  if (isAdmin()) return 'Admin';
  if (isScorekeeper()) { const sk = SCOREKEEPERS[session.scorekeeperId]; return sk ? sk.name : 'Scorekeeper'; }
  return 'Viewer';
}
export function roleLabel() {
  if (isAdmin()) return 'Admin';
  if (isScorekeeper()) { const sk = SCOREKEEPERS[session.scorekeeperId]; return sk ? `Scorekeeper · ${sk.name}` : 'Scorekeeper'; }
  if (session.role === ROLES.VIEWER) return 'Viewer';
  return '';
}

export function resetData() { state = freshState(); emit(); }

// Phase-2 convenience: load a representative partial round so the UI has content
// to review. Removed once Firestore is wired (Phase 3).
export function seedSample() {
  const s = {
    'iii-stripe': [5, 3, 4, 5, 4, 3, 4, 3, 4],
    'harrison':   [6, 3, 4, 4, 5, 2, 5, 3, 5],
    'tmac':       [5, 4, 5, 4, 4, 3, 6, 3, 4],
    'besean':     [5, 3, 3, 4, 4, 4, 5, 4, 4],
    'benny':      [7, 4, 5, 5, 6, 4, 6, 4, 5],
    'bejai':      [6, 5, 5, 6, 5, 4, 7, 4, 5],
    'brian':      [6, 3, 5, 5, 4, 3, 6, 3, 4],
  };
  for (const [pid, arr] of Object.entries(s)) {
    arr.forEach((g, i) => setScoreQuiet(pid, i + 1, g));
  }
  // Hole 2: Benny entered first, then III Stripe closer (history retains Benny).
  seedCtp(2, 'benny'); seedCtp(2, 'iii-stripe');
  seedCtp(6, 'harrison');
  // Hole 8: Brian entered first, then TMac closer.
  seedCtp(8, 'brian'); seedCtp(8, 'tmac');
  emit();
}

function seedCtp(hole, playerId) {
  const p = playerById(playerId);
  if (!p) return;
  const cur = state.ctp[hole];
  state.ctp[hole] = { hole, currentLeaderId: playerId, currentLeaderName: p.name, noWinner: false, locked: false, updatedBy: 'Scorekeeper', updatedAt: now(), revision: (cur?.revision || 0) + 1 };
  audit({ area: 'ctp', hole, action: 'leader', playerId, playerName: p.name, by: 'Scorekeeper' });
}

function setScoreQuiet(playerId, hole, gross) {
  const p = playerById(playerId);
  if (!p) return;
  const received = strokesOnHole(p.strokes, p.tee, hole);
  state.scores[`${playerId}_${hole}`] = {
    player: playerId, hole, gross: Number(gross), strokeReceived: received,
    net: Number(gross) - received, updatedBy: 'seed', updatedAt: now(), revision: 1,
  };
}

// Real wall-clock timestamp (ms). Runs in the browser — Date is available here.
function now() { return Date.now(); }
