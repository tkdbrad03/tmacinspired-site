# Clermont National Skins & CTP — Access Model

A private one-time event. Access is deliberately **lightweight** — client-side PIN
gating, no accounts, no server auth. Real protection = the score-entry UI is hidden
unless a PIN is entered, the event link is private, and Firestore writes close when
the event is locked.

## Roles

| Role | Who | How |
|------|-----|-----|
| **Viewer** | Anyone with the link (default) | Just open the app — read-only |
| **Scorekeeper — TMac** | TMac | PIN `0804`. Also the **event owner**. |
| **Scorekeeper — BeSean** | BeSean | PIN `0317` |

## What each role can do

| Capability | Viewer | BeSean (SK) | TMac (SK + owner) |
|---|:--:|:--:|:--:|
| View Today / Live / Skins / CTP / Groups / Payouts | ✓ | ✓ | ✓ |
| Enter / edit scores — **Group One** (III Stripe, Harrison, TMac) | — | — | ✓ |
| Enter / edit scores — **Group Two** (BeSean, Benny, BeJai, Brian) | — | ✓ | — |
| Update CTP leaders | — | ✓ | ✓ |
| Lock / reopen / reset the event | — | — | ✓ |
| Change tees / strokes / groups / buy-in | — | — | — (fixed, seeded) |

## PIN handling
- PINs are compared client-side against **SHA-256 hashes** in `js/access.js` (the literal `0804`/`0317` are not in the source).
- A valid PIN sets a local session (`localStorage`): `role: scorekeeper`, `scorekeeperId`, which resolves the group and owner flag. Saved for the day; **Exit Scorekeeper Mode** clears it.
- This is lightweight access control for a private outing, **not** authentication. No email, username, account, Firebase login, password, custom claims, or server auth is used.

## Writes & Firestore rules
- Browser **reads** Firestore directly in real time (`onSnapshot`). Browser **writes** directly too, gated by rules (`clermont-skins/firestore.rules`):
  - Reads: public.
  - `scores`, `ctp`, `auditLog`: writable only while `events/{id}.locked == false`.
  - `players` and event setup fields (tees, strokes, groups, buy-in, course): **not** client-writable.
  - Event doc: clients may only change `locked` / `status`.
- Deterministic score doc IDs `playerId_holeNumber` → no duplicate scores.

## Live sync
Any score or CTP change writes to Firestore and every open device updates instantly
via its listeners — Live Scoreboard, gross/net, skins, CTP, units, and projected
payouts all recompute with no refresh.

## Finalize
Owner (TMac) → Owner Controls → **Lock & Finalize** (confirmation required). Locking
sets `locked: true`; rules then reject all score/CTP writes everywhere. TMac can
**Reopen**. **Reset** (double confirmation) clears scores/CTP/history but keeps players.
