// course.js — Clermont National course data (source of truth for static course info).
// Clermont, Florida · Par 71 · CTP holes 2, 6, 8, 14.
// All arrays are 1-indexed by hole via the `holes` array below (index 0 = hole 1).

export const COURSE = {
  name: 'Clermont National',
  city: 'Clermont, Florida',
  par: 71,
  holes: 18,
  ctpHoles: [2, 6, 8, 14],
};

// Par per hole, holes 1..18.
export const PAR = [5, 3, 4, 4, 4, 3, 5, 3, 4, 4, 4, 5, 4, 3, 4, 4, 4, 4];
// OUT = 35 (holes 1-9), IN = 36 (holes 10-18), TOTAL = 71.

export const TEES = {
  blue: {
    id: 'blue',
    name: 'Blue',
    yards: 6251,
    rating: 69.9,
    slope: 129,
    holeYards: [528, 196, 367, 392, 326, 170, 505, 176, 403, 302, 391, 538, 395, 137, 345, 389, 285, 406],
    handicap: [13, 11, 5, 1, 17, 9, 15, 7, 3, 14, 10, 4, 6, 18, 12, 2, 16, 8],
  },
  white: {
    id: 'white',
    name: 'White',
    yards: 5900,
    rating: 74.0,
    slope: 138,
    holeYards: [520, 160, 348, 378, 321, 139, 479, 147, 392, 268, 379, 513, 372, 113, 337, 365, 277, 392],
    handicap: [5, 17, 7, 1, 9, 15, 11, 13, 3, 16, 8, 6, 2, 18, 12, 10, 14, 4],
  },
  green: {
    id: 'green',
    name: 'Green',
    yards: 4922,
    rating: 68.4,
    slope: 118,
    holeYards: [456, 122, 310, 310, 280, 90, 445, 106, 272, 225, 315, 430, 321, 99, 291, 297, 219, 334],
    // Green tees share the White tee handicap rankings (per event spec).
    handicap: [5, 17, 7, 1, 9, 15, 11, 13, 3, 16, 8, 6, 2, 18, 12, 10, 14, 4],
  },
};

export const TEE_ORDER = ['blue', 'white', 'green'];

// Default event roster. Firestore is the runtime source of truth (Phase 3);
// this is the canonical seed used for setup and offline shell.
export const DEFAULT_PLAYERS = [
  { id: 'iii-stripe', name: 'III Stripe', tee: 'blue',  strokes: 0,  group: 1, paid: false },
  { id: 'harrison',   name: 'Harrison',   tee: 'blue',  strokes: 0,  group: 1, paid: false },
  { id: 'tmac',       name: 'TMac',       tee: 'green', strokes: 0,  group: 1, paid: false },
  { id: 'besean',     name: 'BeSean',     tee: 'blue',  strokes: 0,  group: 2, paid: false },
  { id: 'benny',      name: 'Benny',      tee: 'white', strokes: 18, group: 2, paid: false },
  { id: 'bejai',      name: 'BeJai',      tee: 'white', strokes: 18, group: 2, paid: false },
  { id: 'brian',      name: 'Brian',      tee: 'white', strokes: 9,  group: 2, paid: false },
];

export const DEFAULT_EVENT = {
  id: 'clermont-national-skins',
  name: 'Clermont National Skins & CTP',
  buyIn: 20,
  par: 71,
  status: 'setup', // setup | live | final
  locked: false,
  ctpHoles: [2, 6, 8, 14],
};

// Helpers -------------------------------------------------------------------

export function tee(teeId) {
  return TEES[teeId] || TEES.blue;
}

// Par for a hole (1..18).
export function parOf(hole) {
  return PAR[hole - 1];
}

// Handicap ranking (1..18) of a hole for a given tee.
export function holeHandicap(teeId, hole) {
  return tee(teeId).handicap[hole - 1];
}

export function yardsOf(teeId, hole) {
  return tee(teeId).holeYards[hole - 1];
}

export function isCtpHole(hole) {
  return COURSE.ctpHoles.includes(hole);
}

export const OUT_PAR = PAR.slice(0, 9).reduce((a, b) => a + b, 0);   // 35
export const IN_PAR = PAR.slice(9).reduce((a, b) => a + b, 0);       // 36
export const TOTAL_PAR = OUT_PAR + IN_PAR;                            // 71
