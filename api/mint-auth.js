export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  }

  const password = body?.password;
  const correct = process.env.MINT_PASSWORD || '1904';

  if (password === correct) {
    res.setHeader('Set-Cookie', 'mint_auth=granted; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict');
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
}
