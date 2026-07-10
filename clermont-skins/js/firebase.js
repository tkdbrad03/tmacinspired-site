// firebase.js — Firestore real-time layer (reads + writes). No Firebase Auth,
// no Admin SDK, no accounts. The Firebase JS SDK is loaded from the gstatic CDN.
// This module never imports the store (store imports this) to avoid a cycle.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, doc, collection, setDoc, updateDoc, addDoc, deleteDoc,
  getDocs, onSnapshot, writeBatch, query, orderBy,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { firebaseConfig, EVENT_ID } from './firebase-config.js';

let db = null;

export function connect() {
  if (db) return db;
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  return db;
}

// Document / collection refs -------------------------------------------------
const eventRef = () => doc(db, 'events', EVENT_ID);
const playersCol = () => collection(db, 'events', EVENT_ID, 'players');
const scoresCol = () => collection(db, 'events', EVENT_ID, 'scores');
const ctpCol = () => collection(db, 'events', EVENT_ID, 'ctp');
const auditCol = () => collection(db, 'events', EVENT_ID, 'auditLog');
const scoreRef = (id) => doc(db, 'events', EVENT_ID, 'scores', id);
const ctpRef = (hole) => doc(db, 'events', EVENT_ID, 'ctp', String(hole));

// The app never seeds. Event + player docs are created once by the developer
// script scripts/seed-firestore.js. Opening the app only reads/listens/writes-in-play.

// Live listeners — each fires immediately then on every change. A soft error
// handler keeps a not-yet-configured database from throwing uncaught errors.
function softErr(label) {
  return (err) => console.warn(`[clermont] ${label} listener:`, err && err.code || err);
}
export function listen({ onEvent, onPlayers, onScores, onCtp, onAudit }) {
  const unsubs = [];
  unsubs.push(onSnapshot(eventRef(), (d) => onEvent(d.exists() ? d.data() : null), softErr('event')));
  unsubs.push(onSnapshot(playersCol(), (qs) => onPlayers(qs.docs.map((d) => d.data())), softErr('players')));
  unsubs.push(onSnapshot(scoresCol(), (qs) => {
    const m = {}; qs.forEach((d) => { m[d.id] = d.data(); }); onScores(m);
  }, softErr('scores')));
  unsubs.push(onSnapshot(ctpCol(), (qs) => {
    const m = {}; qs.forEach((d) => { m[Number(d.id)] = d.data(); }); onCtp(m);
  }, softErr('ctp')));
  unsubs.push(onSnapshot(query(auditCol(), orderBy('ts', 'asc')), (qs) =>
    onAudit(qs.docs.map((d) => ({ id: d.id, ...d.data() }))), softErr('audit')));
  return () => unsubs.forEach((u) => u());
}

// Writes ---------------------------------------------------------------------
export function writeScore(scoreId, data) { return setDoc(scoreRef(scoreId), data); }
export function deleteScore(scoreId) { return deleteDoc(scoreRef(scoreId)); }
export function writeCtp(hole, data) { return setDoc(ctpRef(hole), data); }
export function writeAudit(entry) { return addDoc(auditCol(), entry); }
export function setLocked(locked) { return updateDoc(eventRef(), { locked, updatedAt: Date.now() }); }

// Reset — clears scores and ctp; leaves the (unlocked) event + players. The
// auditLog is append-only (rules deny delete), so it is intentionally not cleared.
export async function resetAll() {
  await setLocked(false).catch(() => {});
  for (const col of [scoresCol(), ctpCol()]) {
    const qs = await getDocs(col);
    const batch = writeBatch(db);
    qs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
