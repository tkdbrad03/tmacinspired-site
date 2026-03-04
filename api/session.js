// api/session.js
const { prisma } = require(’../lib/prisma’)

function randCode() {
var chars = ‘ABCDEFGHJKLMNPQRSTUVWXYZ23456789’
var s = ‘’
for (var i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
return s
}

module.exports = async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’)
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET,POST,OPTIONS’)
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’)
if (req.method === ‘OPTIONS’) return res.status(200).end()

try {
if (req.method === ‘GET’) {
var code = req.query.code
if (!code) return res.status(400).json({ error: ‘code required’ })
var session = await prisma.session.findUnique({ where: { code: code } })
if (!session) return res.status(404).json({ error: ‘Session not found’ })
return res.status(200).json(session)
}

```
if (req.method === 'POST') {
  var action = req.body.action
  var name = req.body.name
  var code = req.body.code

  if (action === 'create') {
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' })
    var newCode = null
    for (var i = 0; i < 10; i++) {
      var attempt = randCode()
      var existing = await prisma.session.findUnique({ where: { code: attempt } })
      if (!existing) { newCode = attempt; break }
    }
    var created = await prisma.session.create({
      data: { code: newCode, player1: name.trim() }
    })
    return res.status(200).json({ code: created.code, player1: created.player1, player2: created.player2, slot: 1 })
  }

  if (action === 'join') {
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' })
    if (!code) return res.status(400).json({ error: 'code required' })
    var found = await prisma.session.findUnique({ where: { code: code } })
    if (!found) return res.status(404).json({ error: 'Session not found' })
    if (!found.player2) {
      found = await prisma.session.update({
        where: { code: code },
        data: { player2: name.trim() }
      })
    }
    return res.status(200).json({ code: found.code, player1: found.player1, player2: found.player2, slot: 2 })
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
