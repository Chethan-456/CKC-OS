// api/groq-debug.js
// Vercel serverless function. Keeps the Groq API key on the server.
// Set GROQ_API_KEY (NOT prefixed with VITE_) in your Vercel project's
// Environment Variables, then redeploy.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing GROQ_API_KEY" });
  }

  const { messages, langName, userCode } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const systemPrompt =
    "You are an expert debugging assistant helping developers fix code issues.\n" +
    "Language: " + (langName || "unknown") + "\n" +
    (userCode
      ? "\nUser's code context:\n```\n" + userCode + "\n```"
      : "") +
    "\n\nProvide clear, concise debugging help. Use code blocks when showing code examples.";

  const groqMessages = messages
    .filter(
      (m) =>
        m.role === "user" ||
        (m.role === "assistant" && !m.id?.startsWith("init-"))
    )
    .map((m) => ({
      role: m.role === "error" ? "assistant" : m.role,
      content: m.text,
    }));

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }, ...groqMessages],
          max_tokens: 1024,
          temperature: 0.6,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || "HTTP " + response.status;
      return res.status(response.status).json({ error: msg });
    }

    const data = await response.json();
    const content =
      data.choices?.[0]?.message?.content || "No response from Groq.";
    return res.status(200).json({ content });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Groq request failed" });
  }
}