export default async function handler(req, res) {
  // Log every step to the Vercel console so we can see where it stops
  console.log("1. Starting handler...");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { permission } = req.body || {};
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error("2. ERROR: GOOGLE_API_KEY is missing!");
    return res.status(500).json({ error: 'API Key missing' });
  }

  try {
    console.log("3. Calling Google API for:", permission);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `Give a 1-2 sentence supportive permission grant for: ${permission}. Start with insight, end with 'I give myself permission to...'` }] 
        }]
      })
    });

    const data = await response.json();
    console.log("4. Google response received.");

    // SAFETY CHECK: If Google blocked the prompt or had an error
    if (!data.candidates || data.candidates.length === 0) {
      console.error("5. ERROR: Google returned no candidates. Full response:", JSON.stringify(data));
      return res.status(200).json({ text: "I'm reflecting on that theme. Perhaps try a different focus for your permission?" });
    }

    const aiText = data.candidates[0].content.parts[0].text;
    console.log("6. Success! Sending text back.");
    
    return res.status(200).json({ text: aiText });

  } catch (error) {
    console.error("7. CRASH:", error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
