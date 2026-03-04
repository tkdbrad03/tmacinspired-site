// api/setup.js
// GET /api/setup  — run ONCE after deploying to create tables
// Then delete or protect this route.

import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        code        TEXT PRIMARY KEY,
        player1     TEXT NOT NULL,
        player2     TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS fasts (
        id            BIGSERIAL PRIMARY KEY,
        session_code  TEXT NOT NULL REFERENCES sessions(code),
        player_name   TEXT NOT NULL,
        player_slot   SMALLINT NOT NULL,   -- 1 or 2
        target_hours  SMALLINT NOT NULL,
        actual_ms     BIGINT NOT NULL,
        started_at    TIMESTAMPTZ NOT NULL,
        ended_at      TIMESTAMPTZ NOT NULL
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_fasts_session ON fasts(session_code);`;

    res.status(200).json({ ok: true, message: 'Tables created.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
