export default async function handler(req, res) {
  // 1. Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Extract permission from body
  const { permission } = req.body;
  
  // 3. Check for the Key
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error("CRITICAL: GOOGLE_API_KEY is not defined in Vercel!");
    return res.status(500).json({ error: 'Server configuration error: Key missing' });
  }

  // 4. Call Google Gemini
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `You are TMac, a supportive mentor. Give a 1-2 sentence permission grant for: ${permission}. Start with insight, end with 'I give myself permission to...'` }]
        }]
      })
    });

    const data = await response.json();

    // Check if Google returned an error (like an invalid key)
    if (data.error) {
      console.error("Google API Error:", data.error.message);
      return res.status(500).json({ error: data.error.message });
    }

    const aiText = data.candidates[0].content.parts[0].text;
    
    return res.status(200).json({ text: aiText });

  } catch (error) {
    console.error("Fetch Error:", error.message);
    return res.status(500).json({ error: 'Failed to connect to AI' });
  }
}
