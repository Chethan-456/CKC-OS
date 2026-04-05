/**
 * server/chat.js  —  Groq API proxy for KnowledgeGraph Engine
 *
 * 1. Place this file at:  CKC-OS/server/chat.js
 *
 * 2. In your server/index.js add these 2 lines:
 *      const chatRoutes = require("./chat");
 *      app.use("/api/chat", chatRoutes);
 *
 * 3. In your server/.env add:
 *      GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
 *
 * 4. In the server folder run:
 *      npm install groq-sdk
 */

const express = require("express");
const router  = express.Router();
const Groq    = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not set on server." });
  }

  try {
    const completion = await groq.chat.completions.create({
      model:       "llama-3.3-70b-versatile",
      max_tokens:  1500,
      temperature: 0.3,
      messages:    messages   // [{role:"system",...}, {role:"user",...}]
    });

    // Return OpenAI-compatible shape — frontend reads data.choices[0].message.content
    res.json(completion);

  } catch (e) {
    console.error("Groq error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;