# Clermont National Skins & CTP — Access Model

This event does **not** have every golfer score themselves. Only two designated
**scorekeepers** enter scores; everyone else follows along read-only.

## Roles

| Role | Who | How they get in |
|------|-----|-----------------|
| **Admin** | Event organizer | Admin access code |
| **Scorekeeper** | TMac (Group 1), BeSean (Group 2) | Scorekeeper access code |
| **Viewer** | All other players & guests | Shared event link → "Continue as Viewer" |

## Scorekeeper assignments

- **TMac** — Group One scorekeeper. May enter/edit scores for **III Stripe, Harrison, TMac**.
- **BeSean** — Group Two scorekeeper. May enter/edit scores for **BeSean, Benny, BeJai, Brian**.

## Permission matrix

| Capability | Viewer | Scorekeeper | Admin |
|---|:--:|:--:|:--:|
| View Today / Live / Skins / CTP / Payouts / Groups | ✓ | ✓ | ✓ |
| Enter / edit gross scores | — | own group only | all players |
| Update CTP current-closest | — | ✓ (any CTP hole) | ✓ |
| Clear / no-winner / lock CTP result | — | — | ✓ |
| Change tees / strokes / buy-in / paid | — | — | ✓ |
| Start / lock / finalize event, exports, reset | — | — | ✓ |

Scorekeepers **cannot** change handicap strokes, tees, buy-in, or finalize.

## Entry experience

On open the app shows a gate:

- **Continue as Viewer** → immediate read-only mode (no Scores tab, no Admin).
- **Enter Scorekeeper Code** → unlocks the matching scorekeeper (or admin) role.

The chosen role is stored **per device** (localStorage key `clermont-skins-session-v1`),
separate from shared event data. Tap the role chip in the header to switch roles or sign out.

## Access codes

Phase-2 placeholder codes (**change these before the event**):

| Code | Grants |
|------|--------|
| `TMAC-G1` | Scorekeeper — TMac (Group 1) |
| `BESEAN-G2` | Scorekeeper — BeSean (Group 2) |
| `CLERMONT-ADMIN` | Admin |

Defined in `js/access.js`. **These are client-side and NOT a real security boundary
in Phase 2** — they only shape the UI. Phase 3 moves verification server-side: a code is
exchanged via a serverless function for a Firebase Auth **custom claim**
(`role`, `scorekeeperId`), and the codes live in Vercel env vars, never in client code.

## Firestore security model (Phase 3 — to implement)

Firestore is the source of truth. Rules enforce the matrix above; the client gate is
convenience only. Custom claims on the anonymous/auth user: `role` and (for scorekeepers)
`scorekeeperId` → `group`.

```
// events/{eventId}/scores/{playerId_hole}
allow read: if true;                                   // everyone with the link can read
allow write: if isAdmin()
            || (isScorekeeper() && playerGroup(playerId) == claims.group);

// events/{eventId}/ctp/{hole}
allow read: if true;
allow write: if isAdmin() || isScorekeeper();          // leader updates
// clear / no-winner / lock fields: if isAdmin() only

// events/{eventId} (buyIn, status, locked) and events/{eventId}/players/*
allow read: if true;
allow write: if isAdmin();

// events/{eventId}/auditLog/*
allow read: if true;
allow create: if isAdmin() || isScorekeeper();
allow update, delete: if false;                        // append-only
```

`playerGroup(playerId)` is resolved from the player doc; TMac's claim carries `group == 1`,
BeSean's `group == 2`. A scorekeeper writing a score outside their group is rejected by rules,
not just hidden in the UI. Anonymous link users with no claim are **read-only**.

## Live behavior

Every authorized write (a score, a CTP leader change) updates **all** connected devices
instantly via Firestore `onSnapshot` — Live Scoreboard, Skins, and Payouts recompute with
no refresh. Deterministic score doc IDs (`playerId_hole`) and a single CTP doc per hole
prevent duplicates and double-counting.

## Test checklist

1. Viewer cannot enter scores — no Scores tab; store `setScore` rejects.
2. Viewer cannot edit CTP — no Update button; store `updateCtpLeader` rejects.
3. TMac can enter Group 1 scores (III Stripe / Harrison / TMac).
4. TMac cannot edit Group 2 scores — not in roster; `canEditPlayer` false.
5. BeSean can enter Group 2 scores (BeSean / Benny / BeJai / Brian).
6. BeSean cannot edit Group 1 scores.
7. Admin can edit all scores.
8. All devices receive live updates (Phase 3 Firestore `onSnapshot`).
9. No duplicate scores — deterministic doc id `playerId_hole`.
10. No unauthorized writes — enforced in store now, in Firestore rules in Phase 3.
