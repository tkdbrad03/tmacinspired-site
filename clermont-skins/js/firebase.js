// firebase.js — Firestore real-time layer (reads + writes). No Firebase Auth,
// no Admin SDK, no accounts. The Firebase JS SDK is SELF-HOSTED under vendor/ so
// the app boots offline. Firestore uses IndexedDB persistence so reads work
// offline, writes queue, and everything survives a refresh / app restart.
// This module never imports the store (store imports this) to avoid a cycle.

import { initializeApp } from '../vendor/firebase-app.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, setDoc, updateDoc, addDoc, deleteDoc,
  getDocs, onSnapshot, writeBatch, query, orderBy,
} from '../vendor/firebase-firestore.js';

import { firebaseConfig, EVENT_ID } from './firebase-config.js';

let db = null;

export function connect() {
  if (db) return db;
  const app = initializeApp(firebaseConfig);
  // IndexedDB-backed offline cache, shared across tabs.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  return db;
}

export function getDb() { return db; }

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
  const meta = { includeMetadataChanges: true }; // so hasPendingWrites/fromCache flow through
  unsubs.push(onSnapshot(eventRef(), (d) => onEvent(d.exists() ? d.data() : null), softErr('event')));
  unsubs.push(onSnapshot(playersCol(), (qs) => onPlayers(qs.docs.map((d) => d.data())), softErr('players')));
  unsubs.push(onSnapshot(scoresCol(), meta, (qs) => {
    const m = {}; const pending = [];
    qs.forEach((d) => { m[d.id] = d.data(); if (d.metadata.hasPendingWrites) pending.push(d.id); });
    onScores(m, { fromCache: qs.metadata.fromCache, pending });
  }, softErr('scores')));
  unsubs.push(onSnapshot(ctpCol(), meta, (qs) => {
    const m = {}; const pending = [];
    qs.forEach((d) => { m[Number(d.id)] = d.data(); if (d.metadata.hasPendingWrites) pending.push(Number(d.id)); });
    onCtp(m, { fromCache: qs.metadata.fromCache, pending });
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
