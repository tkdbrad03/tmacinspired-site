// calc.js — Pure scoring engine. No DOM, no Firebase. Fully unit-testable (Phase 4).
// Individual skins on NET score. Groups NEVER enter these calculations.

import { parOf, holeHandicap, COURSE } from './course.js';

// Strokes a player receives on a single hole.
//   floor(strokes / 18) strokes on every hole, plus one more on holes whose
//   handicap ranking (for that player's tee) is <= (strokes % 18).
//   18 -> 1 every hole. 9 -> 1 on holes ranked 1..9. 0 -> none.
export function strokesOnHole(playerStrokes, teeId, hole) {
  const s = Number(playerStrokes) || 0;
  const base = Math.floor(s / 18);
  const extra = holeHandicap(teeId, hole) <= (s % 18) ? 1 : 0;
  return base + extra;
}

// Net = gross - strokes received on that hole.
export function netScore(gross, playerStrokes, teeId, hole) {
  return gross - strokesOnHole(playerStrokes, teeId, hole);
}

// scoreKey used everywhere (matches Firestore score doc id).
export function scoreKey(playerId, hole) {
  return `${playerId}_${hole}`;
}

// Build a per-hole detail row for one player. Returns null if no gross entered.
export function holeDetail(player, hole, scores) {
  const rec = scores[scoreKey(player.id, hole)];
  if (!rec || rec.gross == null || rec.gross === '') return null;
  const gross = Number(rec.gross);
  const received = strokesOnHole(player.strokes, player.tee, hole);
  return { hole, gross, strokeReceived: received, net: gross - received };
}

// SKINS -------------------------------------------------------------------
// Per hole: lowest UNIQUE net wins, and only if that net is par-or-better.
// Ties cancel. No carryovers. Returns array of 18 results.
export function computeSkins(players, scores) {
  const results = [];
  for (let hole = 1; hole <= COURSE.holes; hole++) {
    const par = parOf(hole);
    const entries = [];
    for (const p of players) {
      const d = holeDetail(p, hole, scores);
      if (d) entries.push({ playerId: p.id, gross: d.gross, net: d.net });
    }
    if (entries.length === 0) {
      results.push({ hole, par, winnerId: null, gross: null, net: null, reason: 'no-scores', entries });
      continue;
    }
    const minNet = Math.min(...entries.map((e) => e.net));
    const lowest = entries.filter((e) => e.net === minNet);
    let winnerId = null;
    let reason = '';
    let win = null;
    if (lowest.length > 1) {
      reason = 'tie'; // ties cancel
    } else if (minNet > par) {
      reason = 'no-par'; // net bogey or worse cannot win
    } else {
      win = lowest[0];
      winnerId = win.playerId;
      reason = 'won';
    }
    results.push({
      hole,
      par,
      winnerId,
      gross: win ? win.gross : null,
      net: win ? win.net : null,
      reason,
      entries,
    });
  }
  return results;
}

// Skins won per player: { playerId: count }.
export function skinsByPlayer(skinResults) {
  const map = {};
  for (const r of skinResults) {
    if (r.winnerId) map[r.winnerId] = (map[r.winnerId] || 0) + 1;
  }
  return map;
}

// CTP ---------------------------------------------------------------------
// One authoritative doc per hole; the current leader is the (projected/final)
// winner. Counting the single currentLeaderId guarantees at most ONE CTP win
// per hole no matter how many times the leader was updated.
// ctp: { [hole]: { currentLeaderId, noWinner, ... } }. Only COURSE.ctpHoles count.
export function ctpByPlayer(ctp) {
  const map = {};
  for (const hole of COURSE.ctpHoles) {
    const c = ctp[hole];
    if (c && c.currentLeaderId && !c.noWinner) {
      map[c.currentLeaderId] = (map[c.currentLeaderId] || 0) + 1;
    }
  }
  return map;
}

// UNITS & PAYOUTS ---------------------------------------------------------
// Skin = 1 unit, CTP = 2 units. Unit value = pool / totalUnits.
// Rounding is exact: total paid always equals the prize pool to the cent.
export function computePayouts(players, skinsMap, ctpMap, event) {
  const paidPlayers = players.filter((p) => p.paid);
  const poolPlayers = paidPlayers.length ? paidPlayers : players; // preview before anyone marked paid
  const buyIn = Number(event.buyIn) || 0;
  const poolCents = Math.round(poolPlayers.length * buyIn * 100);

  const rows = players.map((p) => {
    const skins = skinsMap[p.id] || 0;
    const ctps = ctpMap[p.id] || 0;
    const units = skins + ctps * 2;
    return { playerId: p.id, skins, ctps, units, payoutCents: 0 };
  });

  const totalUnits = rows.reduce((a, r) => a + r.units, 0);
  const unitValueCents = totalUnits > 0 ? poolCents / totalUnits : 0;

  // Largest-remainder rounding so the sum of payouts == poolCents exactly.
  if (totalUnits > 0) {
    let allocated = 0;
    const fracs = [];
    for (const r of rows) {
      const raw = r.units * unitValueCents;
      const floor = Math.floor(raw);
      r.payoutCents = floor;
      allocated += floor;
      fracs.push({ r, frac: raw - floor });
    }
    let remainder = Math.round(poolCents - allocated);
    fracs.sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < remainder && i < fracs.length; i++) fracs[i].r.payoutCents += 1;
    // If remainder exceeds rows with units (edge), keep distributing to unit-holders.
    let idx = 0;
    while (remainder > fracs.length && idx < fracs.length) {
      fracs[idx].r.payoutCents += 1;
      remainder--;
      idx = (idx + 1) % fracs.length;
    }
  }

  return {
    poolCents,
    poolPlayers: poolPlayers.length,
    totalUnits,
    unitValueCents,
    rows,
  };
}

// Full snapshot used by the scoreboard/payouts pages.
export function computeStandings(players, scores, ctp, event) {
  const skinResults = computeSkins(players, scores);
  const skinsMap = skinsByPlayer(skinResults);
  const ctpMap = ctpByPlayer(ctp);
  const payouts = computePayouts(players, skinsMap, ctpMap, event);
  const payoutByPlayer = {};
  for (const r of payouts.rows) payoutByPlayer[r.playerId] = r;

  const players2 = players.map((p) => {
    let gross = 0, net = 0, holesPlayed = 0, toPar = 0;
    for (let h = 1; h <= COURSE.holes; h++) {
      const d = holeDetail(p, h, scores);
      if (d) {
        gross += d.gross;
        net += d.net;
        toPar += d.gross - parOf(h);
        holesPlayed++;
      }
    }
    const pr = payoutByPlayer[p.id] || { skins: 0, ctps: 0, units: 0, payoutCents: 0 };
    return {
      ...p,
      gross, net, holesPlayed, toPar,
      skins: pr.skins, ctps: pr.ctps, units: pr.units, payoutCents: pr.payoutCents,
    };
  });

  return { players: players2, skinResults, skinsMap, ctpMap, payouts };
}

// Formatting helpers (used by UI) ----------------------------------------
export function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
export function toParLabel(toPar) {
  if (toPar === 0) return 'E';
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}
