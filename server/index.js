import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Required for ES Modules to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly point to the .env file in the same folder as index.js
dotenv.config({ path: path.join(__dirname, ".env"), debug: true });

import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

console.log("✅ API KEY loaded:", process.env.GROQ_API_KEY
  ? "YES (starts with: " + process.env.GROQ_API_KEY.slice(0, 8) + "...)"
  : "❌ UNDEFINED");

app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY is not set in environment variables." });
  }

  if (!req.body.messages || !Array.isArray(req.body.messages)) {
    return res.status(400).json({ error: "Invalid request: 'messages' must be an array." });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: req.body.messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);
      return res.status(response.status).json({ error: data });
    }

    res.json(data);
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));