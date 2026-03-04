const { prisma } = require(’../lib/prisma’)

module.exports = async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’)
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET,POST,OPTIONS’)
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’)
if (req.method === ‘OPTIONS’) return res.status(200).end()

try {
if (req.method === ‘POST’) {
var b = req.body
if (!b.sessionCode || !b.playerName || !b.playerSlot || !b.targetHours || !b.actualMs || !b.startedAt || !b.endedAt) {
return res.status(400).json({ error: ‘Missing required fields’ })
}
var session = await prisma.session.findUnique({ where: { code: b.sessionCode } })
if (!session) return res.status(404).json({ error: ‘Session not found’ })

```
  var fast = await prisma.fast.create({
    data: {
      sessionCode: b.sessionCode,
      playerName: b.playerName,
      playerSlot: Number(b.playerSlot),
      targetHours: Number(b.targetHours),
      actualMs: BigInt(b.actualMs),
      startedAt: new Date(b.startedAt),
      endedAt: new Date(b.endedAt)
    }
  })
  return res.status(200).json({ ok: true, id: Number(fast.id) })
}

if (req.method === 'GET') {
  var code = req.query.code
  if (!code) return res.status(400).json({ error: 'code required' })

  var session = await prisma.session.findUnique({ where: { code: code } })
  if (!session) return res.status(404).json({ error: 'Session not found' })

  var fasts = await prisma.fast.findMany({
    where: { sessionCode: code },
    orderBy: { endedAt: 'desc' }
  })

  var serialized = fasts.map(function(f) {
    return {
      id: Number(f.id),
      session_code: f.sessionCode,
      player_name: f.playerName,
      player_slot: f.playerSlot,
      target_hours: f.targetHours,
      actual_ms: Number(f.actualMs),
      started_at: f.startedAt,
      ended_at: f.endedAt
    }
  })

  return res.status(200).json({
    fasts: serialized,
    player1: session.player1,
    player2: session.player2
  })
}

res.status(405).end()
```

} catch (err) {
console.error(err)
res.status(500).json({ error: err.message })
}
}// api/fasts.js
import { prisma } from ‘../lib/prisma.js’

export default async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’)
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET,POST,OPTIONS’)
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’)
if (req.method === ‘OPTIONS’) return res.status(200).end()

try {
if (req.method === ‘POST’) {
const { sessionCode, playerName, playerSlot, targetHours, actualMs, startedAt, endedAt } = req.body
if (!sessionCode || !playerName || !playerSlot || !targetHours || !actualMs || !startedAt || !endedAt) {
return res.status(400).json({ error: ‘Missing required fields’ })
}
const session = await prisma.session.findUnique({ where: { code: sessionCode } })
if (!session) return res.status(404).json({ error: ‘Session not found’ })

```
  const fast = await prisma.fast.create({
    data: {
      sessionCode,
      playerName,
      playerSlot: Number(playerSlot),
      targetHours: Number(targetHours),
      actualMs: BigInt(actualMs),
      startedAt: new Date(startedAt),
      endedAt: new Date(endedAt)
    }
  })
  return res.status(200).json({ ok: true, id: fast.id })
}

if (req.method === 'GET') {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'code required' })

  const session = await prisma.session.findUnique({ where: { code } })
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const fasts = await prisma.fast.findMany({
    where: { sessionCode: code },
    orderBy: { endedAt: 'desc' }
  })

  // Serialize BigInt for JSON
  const serialized = fasts.map(f => ({
    ...f,
    actualMs: Number(f.actual_ms ?? f.actualMs),
    actual_ms: Number(f.actual_ms ?? f.actualMs),
    started_at: f.startedAt ?? f.started_at,
    ended_at: f.endedAt ?? f.ended_at,
    player_name: f.playerName ?? f.player_name,
    player_slot: f.playerSlot ?? f.player_slot,
    target_hours: f.targetHours ?? f.target_hours,
  }))

  return res.status(200).json({
    fasts: serialized,
    player1: session.player1,
    player2: session.player2
  })
}

res.status(405).end()
```

} catch (err) {
console.error(err)
res.status(500).json({ error: err.message })
}
}
