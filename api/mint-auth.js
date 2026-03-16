export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let password;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    password = body?.password;
  } catch (e) {
    password = null;
  }

  if (password === '1904') {
    res.setHeader(
      'Set-Cookie',
      'mint_auth=granted; Path=/; Max-Age=2592000; SameSite=Strict'
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, received: password });
}
