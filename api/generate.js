export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { permission } = req.body;
  const apiKey = process.env.GOOGLE_API_KEY; // This matches your Vercel Env Var name

  const systemPrompt = `You are TMac, a supportive mentor for successful women. 
  Tone: Conversational, warm, direct. No emojis. 
  Response: 1-2 sentences of insight followed by "I give myself permission to..." for the theme: ${permission}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    res.status(200).json({ text });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from AI' });
  }
}
