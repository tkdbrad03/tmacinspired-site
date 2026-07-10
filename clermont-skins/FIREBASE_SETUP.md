# Firebase Setup — Clermont National Skins & CTP

Firestore only. **No** Firebase Auth, Admin SDK, accounts, service accounts, or
custom claims. Project **clermont-national-golf** (config in `js/firebase-config.js`).

The app **never** seeds or resets Firestore. Initial documents are created **once**
by a developer-only script. Follow these steps in order.

## 1. Create the Firestore database
- [Firebase Console](https://console.firebase.google.com/project/clermont-national-golf/firestore) → **Build → Firestore Database → Create database** → **production mode** → US region (e.g. `nam5`).

## 2. Publish the TEMPORARY setup rules
- Firestore → **Rules** → paste `clermont-skins/firestore-setup.rules` → **Publish**.
- These open only the `events/clermont-national-2026` tree, and only long enough to seed. Keep this window short.

## 3. Run the one-time seed
From the repo root:
```bash
node clermont-skins/scripts/seed-firestore.js
```
It creates the event, 7 player docs, and 4 CTP docs via the Firestore REST API.
It is **idempotent** (create-only): running it again prints `exists` for each doc
and never overwrites scores, CTP winners, player data, or event status.

## 4. Verify the data
In the Firestore console confirm:
- `events/clermont-national-2026` exists (par 71, buyIn 20, locked false, status "active")
- **7** docs under `.../players`
- **4** docs under `.../ctp` (holes 2, 6, 8, 14)
- `.../scores` is **empty**

## 5. Publish the FINAL rules
- Firestore → **Rules** → replace with `clermont-skins/firestore.rules` → **Publish**.
- Now: public reads; no event creation/deletion; no player writes; scores + CTP writable only while `locked == false`; audit log append-only; all other paths denied.

---

## Access (client-side, by design)
- Everyone with the link opens in **Viewer** (read-only).
- Scorekeepers tap the top-right badge → **Enter Scorekeeper PIN**:
  - **TMac** — `0804` → Group One (III Stripe, Harrison, TMac); also **owner** (lock / reopen / reset).
  - **BeSean** — `0317` → Group Two (BeSean, Benny, BeJai, Brian).
- PINs are compared client-side against **SHA-256 hashes** (not plaintext in source).

## Locking limitation (accepted)
This is lightweight access control, **not** authentication:
- The TMac PIN only controls **who sees the Owner screen** in the app.
- Because we intentionally use **no Firebase Auth**, the database cannot independently prove the browser user is TMac.
- A technically knowledgeable visitor could attempt to change `locked` (or write scores while unlocked) directly through Firestore while the app is public.
- For this one-time private event with a private link, this is an **accepted limitation**. We deliberately do not add auth to close it.

## Finalizing
Owner (TMac) → **Owner Controls → Lock & Finalize** (confirmation required). Locking
sets `locked: true`; the final rules then reject all score/CTP writes everywhere.
**Reopen** flips it back. **Reset** (double confirmation) clears scores/CTP/history,
keeping players.

## Data model
```
events/clermont-national-2026                    name, course, par, buyIn, ctpHoles, status, locked
events/clermont-national-2026/players/{playerId} id, name, tee, strokes, group, paid, order
events/clermont-national-2026/scores/{playerId_hole}   player, hole, gross, strokeReceived, net, updatedBy, updatedAt, revision
events/clermont-national-2026/ctp/{hole}         hole, currentLeaderId, currentLeaderName, noWinner, updatedBy, updatedAt, revision
events/clermont-national-2026/auditLog/{autoId}  area, hole, action, playerId, playerName, by, ts
```
Deterministic score IDs (`playerId_holeNumber`) guarantee no duplicate scores.
