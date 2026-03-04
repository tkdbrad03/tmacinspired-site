// api/session.js
// POST /api/session  { action: "create", name: "Dr. TMac" }
//                   → { code, slot: 1, player1: "Dr. TMac" }
//
// POST /api/session  { action: "join", code: "ABC123", name: "Benny" }
//                   → { code, slot: 2, player1, player2 }
//
// GET  /api/session?code=ABC123
//                   → { code, player1, player2 }

import { sql } from '@vercel/postgres';

function randCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { code } = req.query;
      if (!code) return res.status(400).json({ error: 'code required' });
      const { rows } = await sql`SELECT * FROM sessions WHERE code = ${code}`;
      if (!rows.length) return res.status(404).json({ error: 'Session not found' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'POST') {
      const { action, name, code } = req.body;

      if (action === 'create') {
        if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
        let newCode, tries = 0;
        while (tries < 10) {
          newCode = randCode();
          const existing = await sql`SELECT code FROM sessions WHERE code = ${newCode}`;
          if (!existing.rows.length) break;
          tries++;
        }
        await sql`
          INSERT INTO sessions (code, player1)
          VALUES (${newCode}, ${name.trim()})
        `;
        return res.status(200).json({ code: newCode, slot: 1, player1: name.trim(), player2: null });
      }

      if (action === 'join') {
        if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
        if (!code) return res.status(400).json({ error: 'code required' });
        const { rows } = await sql`SELECT * FROM sessions WHERE code = ${code}`;
        if (!rows.length) return res.status(404).json({ error: 'Session not found' });
        const session = rows[0];
        // If already has player2 and name matches, allow re-join
        if (session.player2 && session.player2.toLowerCase() !== name.trim().toLowerCase()) {
          // slot already taken — return as viewer/slot2 anyway (partner reconnecting)
          return res.status(200).json({ ...session, slot: 2, rejoined: true });
        }
        if (!session.player2) {
          await sql`UPDATE sessions SET player2 = ${name.trim()} WHERE code = ${code}`;
          session.player2 = name.trim();
        }
        return res.status(200).json({ ...session, slot: 2 });
      }

      return res.status(400).json({ error: 'unknown action' });
    }

    res.status(405).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
