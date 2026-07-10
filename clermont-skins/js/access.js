// access.js — role & access model (config + pure resolution).
// Phase 2 enforces this CLIENT-SIDE for UX. Phase 3 enforces it authoritatively
// in Firestore security rules + Firebase Auth custom claims (codes are exchanged
// server-side for a claim; they never grant real write access from the client).

export const ROLES = { VIEWER: 'viewer', SCOREKEEPER: 'scorekeeper', ADMIN: 'admin' };

// Designated scorekeepers. `group` is the player.group whose scores they may edit.
export const SCOREKEEPERS = {
  tmac:   { id: 'tmac',   name: 'TMac',   group: 1, label: 'Group One Scorekeeper' },
  besean: { id: 'besean', name: 'BeSean', group: 2, label: 'Group Two Scorekeeper' },
};

// Phase-2 access codes (PLACEHOLDERS — change before the event; Phase 3 moves
// verification server-side so codes are never trusted from the client).
export const ACCESS_CODES = {
  'TMAC-G1':        { role: ROLES.SCOREKEEPER, scorekeeperId: 'tmac' },
  'BESEAN-G2':      { role: ROLES.SCOREKEEPER, scorekeeperId: 'besean' },
  'CLERMONT-ADMIN': { role: ROLES.ADMIN,       scorekeeperId: null },
};

export function resolveCode(code) {
  if (!code) return null;
  return ACCESS_CODES[String(code).trim().toUpperCase()] || null;
}
