// api/session.js
import { prisma } from ‘../lib/prisma.js’

function randCode() {
const chars = ‘ABCDEFGHJKLMNPQRSTUVWXYZ23456789’
let s = ‘’
for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
return s
}

export default async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’)
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET,POST,OPTIONS’)
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’)
if (req.method === ‘OPTIONS’) return res.status(200).end()

try {
if (req.method === ‘GET’) {
const { code } = req.query
if (!code) return res.status(400).json({ error: ‘code required’ })
const session = await prisma.session.findUnique({ where: { code } })
if (!session) return res.status(404).json({ error: ‘Session not found’ })
return res.status(200).json(session)
}

```
if (req.method === 'POST') {
  const { action, name, code } = req.body

  if (action === 'create') {
    if (!name?.trim()) return res.status(400).json({ error: 'name required' })
    let newCode
    for (let i = 0; i < 10; i++) {
      const attempt = randCode()
      const existing = await prisma.session.findUnique({ where: { code: attempt } })
      if (!existing) { newCode = attempt; break }
    }
    const session = await prisma.session.create({
      data: { code: newCode, player1: name.trim() }
    })
    return res.status(200).json({ ...session, slot: 1 })
  }

  if (action === 'join') {
    if (!name?.trim()) return res.status(400).json({ error: 'name required' })
    if (!code) return res.status(400).json({ error: 'code required' })
    let session = await prisma.session.findUnique({ where: { code } })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (!session.player2) {
      session = await prisma.session.update({
        where: { code },
        data: { player2: name.trim() }
      })
    }
    return res.status(200).json({ ...session, slot: 2 })
  }

  return res.status(400).json({ error: 'unknown action' })
}

res.status(405).end()
```

} catch (err) {
console.error(err)
res.status(500).json({ error: err.message })
}
}
