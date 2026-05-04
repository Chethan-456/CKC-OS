export default async function handler(req, res) {
  // Add CORS headers for Vercel
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "").trim();
  
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY not set on server. Please configure it in your Vercel Environment Variables." });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "'messages' must be an array." });
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ 
        model: "llama-3.3-70b-versatile", 
        messages 
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      return res.status(groqRes.status).json({ error: data });
    }
    
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
