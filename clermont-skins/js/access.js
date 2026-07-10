// access.js — lightweight PIN-based scorekeeper access for a private one-time
// event. This is NOT enterprise authentication: PINs are checked in the browser
// against SHA-256 hashes (the literal PINs are not in the source), and the role
// is stored locally. Real protection = score-entry UI is hidden unless unlocked,
// the event link is private, and Firestore writes close when the event is locked.

export const ROLES = { VIEWER: 'viewer', SCOREKEEPER: 'scorekeeper' };

// Scorekeepers. TMac (Group 1) is also the event OWNER (lock/reopen/reset).
export const SCOREKEEPERS = {
  tmac:   { id: 'tmac',   name: 'TMac',   group: 1, groupId: 'group1', owner: true },
  besean: { id: 'besean', name: 'BeSean', group: 2, groupId: 'group2', owner: false },
};

// SHA-256(pin) -> scorekeeper id. (0804 -> TMac, 0317 -> BeSean.)
const PIN_HASHES = {
  '09550794019a7c2092e5872e26a4cd2155868b8c427adb53734c8a9d4ea343d7': 'tmac',
  '5870a3c4ae138b679f29a8e90693123bf956b830c8c153ad902e112eef74f509': 'besean',
};

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Returns the matching scorekeeper record, or null if the PIN is wrong.
export async function verifyPin(pin) {
  const hash = await sha256hex(String(pin).trim());
  const id = PIN_HASHES[hash];
  return id ? SCOREKEEPERS[id] : null;
}
