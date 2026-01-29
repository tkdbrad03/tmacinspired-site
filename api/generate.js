export default async function handler(req, res) {
  // 1. Vercel logs help you see what's happening
  console.log("Request Method:", req.method);
  console.log("Request Body:", req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Ensure the key exists
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server config error: Key missing' });
  }

  // 3. Destructure carefully
  const { permission } = req.body || {};
  if (!permission) {
    return res.status(400).json({ error: 'No permission theme provided' });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Give a 1-2 sentence permission grant for: ${permission}` }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ text });

  } catch (error) {
    console.error("AI Fetch Error:", error);
    return res.status(500).json({ error: 'AI Connection Failed' });
  }
}
