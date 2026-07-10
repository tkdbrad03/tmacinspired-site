/*
 * seed-firestore.js — DEVELOPER-ONLY one-time seed. NOT part of the app.
 *
 * Creates the event, the 7 player docs, and the 4 CTP docs for
 * events/clermont-national-2026 using the Firestore REST API (no deps, no
 * firebase-admin, no service account). It uses create-only writes: a document
 * that already exists returns 409 and is skipped, so running this twice will
 * NEVER erase scores, reset CTP winners, or overwrite player/event data.
 *
 * Prerequisites: the Firestore database exists and the TEMPORARY setup rules
 * (clermont-skins/firestore-setup.rules) are published (they allow these
 * create writes). After seeding, publish the final clermont-skins/firestore.rules.
 *
 * Run:  node clermont-skins/scripts/seed-firestore.js
 */

const PROJECT_ID = 'clermont-national-golf';
const API_KEY = 'AIzaSyDwg36BN1cA-4Q-f0AmVEwXponNZkQuszs'; // public web api key (mirrors firebase-config.js)
const EVENT_ID = 'clermont-national-2026';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// --- data -------------------------------------------------------------------
const EVENT = {
  name: 'Clermont National Skins & CTP',
  course: 'Clermont National',
  par: 71,
  buyIn: 20,
  locked: false,
  status: 'active',
  ctpHoles: [2, 6, 8, 14],
};

const PLAYERS = [
  { id: 'iii-stripe', name: 'III Stripe', tee: 'blue',  strokes: 0,  group: 1, paid: true, order: 1 },
  { id: 'harrison',   name: 'Harrison',   tee: 'blue',  strokes: 0,  group: 1, paid: true, order: 2 },
  { id: 'tmac',       name: 'TMac',       tee: 'green', strokes: 0,  group: 1, paid: true, order: 3 },
  { id: 'besean',     name: 'BeSean',     tee: 'blue',  strokes: 0,  group: 2, paid: true, order: 4 },
  { id: 'benny',      name: 'Benny',      tee: 'white', strokes: 18, group: 2, paid: true, order: 5 },
  { id: 'bejai',      name: 'BeJai',      tee: 'white', strokes: 18, group: 2, paid: true, order: 6 },
  { id: 'brian',      name: 'Brian',      tee: 'white', strokes: 9,  group: 2, paid: true, order: 7 },
];

const CTP_HOLES = [2, 6, 8, 14];
const ctpDoc = (hole) => ({
  hole, currentLeaderId: null, currentLeaderName: null,
  noWinner: false, updatedBy: null, updatedAt: null, revision: 0,
});

// --- REST helpers -----------------------------------------------------------
function encode(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  if (typeof v === 'object') return { mapValue: { fields: fields(v) } };
  return { stringValue: String(v) };
}
function fields(obj) {
  const out = {};
  for (const [k, val] of Object.entries(obj)) out[k] = encode(val);
  return out;
}

// create-only: POST to the parent collection with documentId. 409 = already exists.
async function createDoc(collectionPath, docId, data) {
  const url = `${BASE}/${collectionPath}?documentId=${encodeURIComponent(docId)}&key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: fields(data) }),
  });
  if (res.status === 200) return 'created';
  if (res.status === 409) return 'exists';
  const body = await res.text();
  throw new Error(`${res.status} on ${collectionPath}/${docId}: ${body}`);
}

// --- run --------------------------------------------------------------------
async function main() {
  console.log(`Seeding events/${EVENT_ID} (create-only, idempotent)…\n`);

  console.log(`event:  ${await createDoc('events', EVENT_ID, EVENT)}`);

  for (const p of PLAYERS) {
    const status = await createDoc(`events/${EVENT_ID}/players`, p.id, p);
    console.log(`player: ${p.id.padEnd(11)} ${status}`);
  }

  for (const h of CTP_HOLES) {
    const status = await createDoc(`events/${EVENT_ID}/ctp`, String(h), ctpDoc(h));
    console.log(`ctp:    hole ${String(h).padEnd(6)} ${status}`);
  }

  console.log('\nDone. Scores collection is intentionally left empty.');
  console.log('Verify in the console, then publish the FINAL firestore.rules.');
}

main().catch((e) => { console.error('\nSeed failed:', e.message); process.exit(1); });
