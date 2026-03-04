// api/fasts.js
// POST /api/fasts  { sessionCode, playerName, playerSlot, targetHours, actualMs, startedAt, endedAt }
//                 → { ok: true, id }
//
// GET  /api/fasts?code=ABC123[&since=ISO_TIMESTAMP]
//                 → { fasts: [...], player1, player2 }

import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { sessionCode, playerName, playerSlot, targetHours, actualMs, startedAt, endedAt } = req.body;

      if (!sessionCode || !playerName || !playerSlot || !targetHours || !actualMs || !startedAt || !endedAt) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify session exists
      const { rows: sess } = await sql`SELECT code FROM sessions WHERE code = ${sessionCode}`;
      if (!sess.length) return res.status(404).json({ error: 'Session not found' });

      const { rows } = await sql`
        INSERT INTO fasts (session_code, player_name, player_slot, target_hours, actual_ms, started_at, ended_at)
        VALUES (${sessionCode}, ${playerName}, ${playerSlot}, ${targetHours}, ${actualMs}, ${startedAt}, ${endedAt})
        RETURNING id
      `;

      return res.status(200).json({ ok: true, id: rows[0].id });
    }

    if (req.method === 'GET') {
      const { code, since } = req.query;
      if (!code) return res.status(400).json({ error: 'code required' });

      const { rows: sess } = await sql`SELECT * FROM sessions WHERE code = ${code}`;
      if (!sess.length) return res.status(404).json({ error: 'Session not found' });

      let fasts;
      if (since) {
        const { rows } = await sql`
          SELECT * FROM fasts
          WHERE session_code = ${code} AND ended_at > ${since}
          ORDER BY ended_at DESC
        `;
        fasts = rows;
      } else {
        const { rows } = await sql`
          SELECT * FROM fasts
          WHERE session_code = ${code}
          ORDER BY ended_at DESC
        `;
        fasts = rows;
      }

      return res.status(200).json({
        fasts,
        player1: sess[0].player1,
        player2: sess[0].player2
      });
    }

    res.status(405).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
