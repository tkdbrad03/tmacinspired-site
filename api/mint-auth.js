export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { password } = req.body;
  const correct = process.env.MINT_PASSWORD || '1904';

  if (password === correct) {
    res.setHeader('Set-Cookie', 'mint_auth=granted; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict');
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
}
