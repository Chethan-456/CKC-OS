import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_SERVER_URL = import.meta.env.VITE_API_SERVER_URL || "http://localhost:5000";

// ─── Constants ────────────────────────────────────────────────────────────────
const SKILL_LEVELS = { beginner: "beginner", intermediate: "intermediate", advanced: "advanced" };
const SENTIMENTS   = { positive: "positive", neutral: "neutral", negative: "negative", angry: "angry" };

const QUICK_REPLIES = [
  { label: "🐛 Debug my code",     prompt: "Help me debug my code" },
  { label: "📚 Explain a concept", prompt: "Explain a programming concept to me" },
  { label: "⚡ Optimize code",     prompt: "Help me optimize my code for better performance" },
  { label: "🏗️ System design",    prompt: "Help me with system design and architecture" },
  { label: "🔐 Security review",   prompt: "Review my code for security vulnerabilities" },
  { label: "📐 Code review",       prompt: "Do a thorough code review with best practices" },
];

const PROACTIVE_MSGS = [
  "💡 Tip: Paste code directly — I'll detect the language and analyze it instantly.",
  "🚀 Try asking me to compare two algorithms with full Big-O analysis.",
  "🧠 I auto-detect your skill level and adapt my explanations accordingly.",
  "⌨️ Use Shift+Enter for a new line, or just hit Enter to send.",
  "🔍 Paste any error message and I'll explain exactly what went wrong and how to fix it.",
  "🏗️ Ask me to architect an entire system — I'll cover scalability and trade-offs.",
];

function detectSentiment(text) {
  const angry = /\b(stupid|useless|terrible|hate|broken|worst|awful|fix this|doesn't work|won't work|garbage|trash|wtf|ridiculous)\b/i;
  const neg   = /\b(error|wrong|not working|fails|issue|problem|bug|crash|can't|cannot|confused|stuck|help|broken)\b/i;
  const pos   = /\b(thanks|great|perfect|awesome|works|love|excellent|good|nice|helpful|amazing|brilliant|fantastic)\b/i;
  if (angry.test(text)) return SENTIMENTS.angry;
  if (neg.test(text))   return SENTIMENTS.negative;
  if (pos.test(text))   return SENTIMENTS.positive;
  return SENTIMENTS.neutral;
}

function detectSkillLevel(history) {
  const allText = history.map(m => m.content).join(" ").toLowerCase();
  const advWords = ["complexity","algorithm","optimization","distributed","concurrency","kernel","binary","recursion","polymorphism","microservice","big-o","cache","mutex","semaphore","async","promise","closure","heuristic","throughput","latency","sharding"];
  const begWords = ["what is","how do i","i'm new","beginner","don't understand","can you explain","what does","basics","simple","easy","noob","i just started","never coded","what's a"];
  const advCount = advWords.filter(w => allText.includes(w)).length;
  const begCount = begWords.filter(w => allText.includes(w)).length;
  if (advCount >= 3) return SKILL_LEVELS.advanced;
  if (begCount >= 2) return SKILL_LEVELS.beginner;
  return SKILL_LEVELS.intermediate;
}

function buildSystemPrompt(skillLevel, sentiment) {
  const skillInstructions = {
    beginner:     "BEGINNER MODE: Use simple analogies, step-by-step numbered explanations, avoid jargon unless defining it. Be warm and encouraging. Celebrate progress. Never make them feel dumb.",
    intermediate: "INTERMEDIATE MODE: Balanced depth with practical examples. Mention trade-offs, best practices, relevant libraries. Brief explanations of technical terms.",
    advanced:     "ADVANCED MODE: Be concise and technical. Lead with the core insight. Include Big-O, trade-offs, edge cases, production considerations. Skip basics — respect their time.",
  };
  const sentimentInstructions = {
    positive: "User is happy and engaged. Be warm, enthusiastic, collaborative.",
    neutral:  "Maintain professional, focused, helpful tone.",
    negative: "User seems frustrated. Be extra patient and empathetic. Validate difficulty before solving.",
    angry:    "User is upset. FIRST: acknowledge frustration with genuine empathy. Then solve directly and clearly.",
  };
  return `You are Forge — an elite AI coding mentor embedded in CKC-OS, a professional developer platform.

ADAPTATION: ${skillInstructions[skillLevel]}
TONE: ${sentimentInstructions[sentiment]}

CAPABILITIES:
- Debug, review, fix code in ANY language
- Explain concepts from beginner to PhD level  
- Algorithmic problem solving with complexity analysis
- System design, architecture, scalability, security
- Code optimization, refactoring, performance tuning
- Compare technologies and frameworks objectively
- Generate complete, production-quality code on demand

FORMATTING:
- Code always in markdown fences with language tag: \`\`\`python
- **bold** for key terms and warnings
- Bullet lists for options, numbered for sequences
- For algorithms: always state Time & Space complexity (intermediate/advanced)
- Be focused and actionable — no fluff or filler

PROBLEM SOLVING:
1. Understand the real question behind the surface request
2. Identify root cause, not just symptoms  
3. Provide the fix/answer clearly with WHY
4. Mention edge cases when relevant
5. For advanced: offer alternative approaches

You are Forge. Sharp, deeply knowledgeable, genuinely helpful. Never say you can't help.`;
}

// ─── Groq API via existing server proxy ──────────────────────────────────────
async function callGroqAPI(messages, systemPrompt) {
  const response = await fetch(`${API_SERVER_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({
          role:    m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Server error ${response.status}: ${err}`);
  }
  const data  = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Empty response from Groq");
  return reply;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      out.push(
        <div key={i} className="code-block-wrap">
          {lang && <div className="code-lang-tag">{lang}</div>}
          <pre className="code-pre">{code.join("\n")}</pre>
        </div>
      );
      i++; continue;
    }
    if (line.startsWith("### ")) { out.push(<div key={i} className="md-h3">{inlineFmt(line.slice(4))}</div>); i++; continue; }
    if (line.startsWith("## "))  { out.push(<div key={i} className="md-h2">{inlineFmt(line.slice(3))}</div>); i++; continue; }
    if (line.startsWith("# "))   { out.push(<div key={i} className="md-h1">{inlineFmt(line.slice(2))}</div>); i++; continue; }
    if (line.match(/^---+$/))    { out.push(<div key={i} className="md-hr"/>); i++; continue; }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2)); i++;
      }
      out.push(<ul key={i} className="md-ul">{items.map((it,j) => <li key={j}>{inlineFmt(it)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/,"")); i++; }
      out.push(<ol key={i} className="md-ol">{items.map((it,j) => <li key={j}>{inlineFmt(it)}</li>)}</ol>);
      continue;
    }
    if (line.trim() === "") { out.push(<div key={i} className="md-spacer"/>); i++; continue; }
    out.push(<p key={i} className="md-p">{inlineFmt(line)}</p>);
    i++;
  }
  return out;
}

function inlineFmt(text) {
  const parts = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const m = match[0];
    if (m.startsWith("**"))     parts.push(<strong key={match.index}>{m.slice(2,-2)}</strong>);
    else if (m.startsWith("`")) parts.push(<code key={match.index} className="inline-code">{m.slice(1,-1)}</code>);
    else if (m.startsWith("*")) parts.push(<em key={match.index}>{m.slice(1,-1)}</em>);
    last = match.index + m.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=JetBrains+Mono:wght@400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root {
  --bg:    #080a0f;
  --bg2:   #0c0e15;
  --bg3:   #10131c;
  --bg4:   #151825;
  --glass: rgba(255,255,255,.032);
  --rim:   rgba(255,255,255,.06);
  --rim2:  rgba(255,255,255,.1);

  --cyan:   #00d4ff;
  --cyan2:  #00a8cc;
  --green:  #00ff9d;
  --green2: #00cc7a;
  --rose:   #ff4d8d;
  --amber:  #ffb547;
  --violet: #a78bfa;
  --red:    #ff5555;

  --text:   #dde4f5;
  --text2:  #6b7a9e;
  --text3:  #343d54;

  --mono: 'JetBrains Mono', monospace;
  --disp: 'Syne', sans-serif;
  --body: 'DM Sans', sans-serif;

  --r-sm: 8px;
  --r-md: 12px;
  --r-lg: 16px;
}

body { font-family: var(--body); background: var(--bg); color: var(--text); overflow: hidden; }

/* ── Root layout ── */
.forge-root {
  display: grid;
  grid-template-columns: 240px 1fr 240px;
  grid-template-rows: 52px 1fr;
  height: 100vh;
  background: var(--bg);
  position: relative;
  overflow: hidden;
}

/* ambient glow */
.forge-root::before {
  content: '';
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 60% 40% at 20% 0%, rgba(0,212,255,.06) 0%, transparent 60%),
    radial-gradient(ellipse 40% 30% at 80% 100%, rgba(0,255,157,.04) 0%, transparent 55%),
    radial-gradient(ellipse 30% 25% at 90% 10%, rgba(167,139,250,.04) 0%, transparent 50%);
}

/* scanline texture */
.forge-root::after {
  content: '';
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,.03) 2px,
    rgba(0,0,0,.03) 4px
  );
}

/* ── Topbar ── */
.f-topbar {
  grid-column: 1 / -1;
  display: flex; align-items: center; gap: 10px;
  padding: 0 16px;
  background: rgba(8,10,15,.95);
  border-bottom: 1px solid var(--rim);
  backdrop-filter: blur(24px);
  z-index: 20;
  position: relative;
}

.f-back-btn {
  display: flex; align-items: center; gap: 5px;
  background: var(--glass); border: 1px solid var(--rim);
  border-radius: var(--r-sm); color: var(--text2); cursor: pointer;
  font-size: 11px; font-weight: 600; padding: 5px 11px;
  font-family: var(--body); transition: all .18s; white-space: nowrap;
}
.f-back-btn:hover { border-color: var(--cyan); color: var(--cyan); background: rgba(0,212,255,.07); }

.f-wordmark {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--disp); font-size: 15px; font-weight: 800;
  letter-spacing: -.02em;
}
.f-wordmark-icon {
  width: 28px; height: 28px; border-radius: 8px;
  background: linear-gradient(135deg, var(--cyan), var(--green));
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; box-shadow: 0 0 16px rgba(0,212,255,.35);
  animation: iconPulse 4s ease-in-out infinite;
}
@keyframes iconPulse {
  0%,100% { box-shadow: 0 0 16px rgba(0,212,255,.35); }
  50%      { box-shadow: 0 0 28px rgba(0,212,255,.65), 0 0 8px rgba(0,255,157,.3); }
}
.f-wordmark-text {
  background: linear-gradient(90deg, var(--cyan), var(--green));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

.f-online-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 100px;
  background: rgba(0,255,157,.07); border: 1px solid rgba(0,255,157,.2);
  font-size: 10px; font-weight: 600; color: var(--green); letter-spacing: .05em;
}
.f-online-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--green);
  box-shadow: 0 0 6px var(--green);
  animation: blink 2.2s ease-in-out infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

.f-skill-toggle {
  display: flex; gap: 3px; margin-left: auto;
  background: var(--glass); border: 1px solid var(--rim);
  border-radius: 9px; padding: 3px;
}
.f-skill-btn {
  padding: 4px 12px; border-radius: 7px; border: none;
  font-family: var(--body); font-size: 10px; font-weight: 600;
  cursor: pointer; transition: all .18s; color: var(--text3);
  background: transparent; letter-spacing: .03em;
}
.f-skill-btn.active {
  color: #080a0f;
}

.f-sent-badge {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 100px;
  border: 1px solid var(--rim); background: var(--glass);
  font-size: 10px; color: var(--text3);
}

/* ── Sidebars shared ── */
.f-sidebar {
  background: var(--bg2);
  border-color: var(--rim);
  display: flex; flex-direction: column;
  overflow: hidden; position: relative; z-index: 1;
}
.f-left  { border-right: 1px solid var(--rim); }
.f-right { border-left:  1px solid var(--rim); }

.sb-section { padding: 14px 12px 8px; }
.sb-label {
  font-size: 9px; font-weight: 700; letter-spacing: .16em;
  text-transform: uppercase; color: var(--text3); margin-bottom: 10px;
  display: flex; align-items: center; gap: 6px;
}
.sb-label::after {
  content: ''; flex: 1; height: 1px; background: var(--rim);
}

/* Skill pills */
.skill-pill {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 11px; border-radius: 10px;
  border: 1px solid var(--rim); background: var(--glass);
  margin-bottom: 5px; cursor: pointer; transition: all .18s;
}
.skill-pill.active { background: rgba(0,212,255,.07); border-color: rgba(0,212,255,.35); }
.skill-pill:hover:not(.active) { border-color: var(--rim2); background: rgba(255,255,255,.045); }
.skill-pill-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.skill-pill-name { font-size: 11px; font-weight: 600; color: var(--text); }
.skill-pill-desc { font-size: 9px; color: var(--text3); margin-top: 1px; }

/* Sentiment meter */
.sent-meter { padding: 12px; border-top: 1px solid var(--rim); }
.sent-row { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--text2); margin-bottom: 7px; }
.sent-track { height: 4px; background: rgba(255,255,255,.05); border-radius: 2px; overflow: hidden; }
.sent-fill  { height: 100%; border-radius: 2px; transition: width .7s cubic-bezier(.4,0,.2,1), background .7s ease; }

/* Stats grid */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 10px 12px; border-top: 1px solid var(--rim); }
.stat-box {
  background: var(--glass); border: 1px solid var(--rim);
  border-radius: 10px; padding: 10px; transition: border-color .18s;
}
.stat-box:hover { border-color: var(--rim2); }
.stat-num { font-family: var(--disp); font-size: 20px; font-weight: 800; }
.stat-lbl { font-size: 8.5px; color: var(--text3); margin-top: 2px; letter-spacing: .07em; text-transform: uppercase; }

/* History */
.history-scroll { flex: 1; overflow-y: auto; padding: 4px 8px 8px; }
.history-scroll::-webkit-scrollbar { width: 2px; }
.history-scroll::-webkit-scrollbar-thumb { background: var(--rim2); border-radius: 1px; }
.h-item {
  padding: 7px 9px; border-radius: 8px; cursor: pointer;
  border: 1px solid transparent; margin-bottom: 3px;
  font-size: 10.5px; color: var(--text2); transition: all .14s;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  display: flex; align-items: center; gap: 7px;
}
.h-item::before { content: '›'; color: var(--text3); flex-shrink: 0; }
.h-item:hover { border-color: var(--rim); color: var(--text); background: var(--glass); }

/* Capability cards */
.cap-scroll { flex: 1; overflow-y: auto; padding: 4px 10px 8px; }
.cap-scroll::-webkit-scrollbar { width: 2px; }
.cap-scroll::-webkit-scrollbar-thumb { background: var(--rim2); border-radius: 1px; }
.cap-card {
  padding: 11px 12px; border-radius: 10px;
  border: 1px solid var(--rim); background: var(--glass);
  cursor: pointer; transition: all .18s; margin-bottom: 5px;
  display: flex; gap: 10px; align-items: flex-start;
}
.cap-card:hover { border-color: rgba(0,212,255,.3); background: rgba(0,212,255,.05); transform: translateX(2px); }
.cap-icon-box {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
  background: rgba(255,255,255,.04); border: 1px solid var(--rim);
}
.cap-title { font-size: 11px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
.cap-desc  { font-size: 9px; color: var(--text3); line-height: 1.5; }

/* Feedback */
.feedback-strip { padding: 10px 12px; border-top: 1px solid var(--rim); }
.fb-strip-btns { display: flex; gap: 4px; margin-top: 7px; }
.fb-strip-btn {
  flex: 1; padding: 7px 4px; border-radius: 8px;
  border: 1px solid var(--rim); background: transparent;
  color: var(--text3); font-size: 11px; cursor: pointer;
  text-align: center; transition: all .15s; font-family: var(--body);
}
.fb-strip-btn:hover { border-color: var(--green); color: var(--green); background: rgba(0,255,157,.06); }

/* Session info */
.sess-info { padding: 10px 12px; border-top: 1px solid var(--rim); }
.sess-row  { display: flex; justify-content: space-between; font-size: 10px; color: var(--text3); margin-bottom: 5px; align-items: center; }
.sess-val  { font-family: var(--mono); font-size: 9.5px; }

/* ── Chat area ── */
.f-chat { display: flex; flex-direction: column; overflow: hidden; position: relative; z-index: 1; }

.chat-bg {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(0,212,255,.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,212,255,.018) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%);
}

.chat-scroll {
  flex: 1; overflow-y: auto; padding: 20px 20px 8px;
  scroll-behavior: smooth; position: relative;
}
.chat-scroll::-webkit-scrollbar { width: 3px; }
.chat-scroll::-webkit-scrollbar-thumb { background: var(--rim2); border-radius: 2px; }

/* Messages */
.msg-wrap { display: flex; gap: 8px; margin-bottom: 18px; animation: msgIn .25s cubic-bezier(.34,1.2,.64,1) both; }
.msg-wrap.user { flex-direction: row-reverse; }
@keyframes msgIn { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:none} }

.msg-av {
  width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800;
}
.msg-av.bot {
  background: linear-gradient(135deg, var(--cyan), var(--green));
  color: #080a0f; font-family: var(--disp); font-size: 13px;
  box-shadow: 0 4px 14px rgba(0,212,255,.3);
}
.msg-av.user {
  background: rgba(167,139,250,.12); border: 1px solid rgba(167,139,250,.3);
  color: var(--violet); font-family: var(--body);
}

.msg-col { max-width: 75%; display: flex; flex-direction: column; }
.msg-col.user { align-items: flex-end; }
.msg-col.bot  { align-items: flex-start; }

.msg-bubble {
  padding: 12px 15px; border-radius: 14px;
  font-size: 13px; line-height: 1.8; position: relative;
  font-family: var(--body);
}
.msg-bubble.bot {
  background: rgba(255,255,255,.035);
  border: 1px solid var(--rim);
  color: var(--text); border-top-left-radius: 4px;
}
.msg-bubble.bot::before {
  content: '';
  position: absolute; inset: 0; border-radius: 14px;
  background: linear-gradient(135deg, rgba(0,212,255,.03), rgba(0,255,157,.02));
  pointer-events: none;
}
.msg-bubble.user {
  background: linear-gradient(135deg, rgba(0,212,255,.12), rgba(0,212,255,.07));
  border: 1px solid rgba(0,212,255,.22);
  color: var(--text); border-top-right-radius: 4px;
}
.msg-bubble.angry { border-color: rgba(255,77,141,.25); background: rgba(255,77,141,.07); }
.msg-bubble.error { border-color: rgba(255,85,85,.3); background: rgba(255,85,85,.07); }

.msg-time { font-size: 9px; color: var(--text3); margin-top: 5px; font-family: var(--mono); }
.msg-skill-tag { font-size: 8px; margin-left: 7px; letter-spacing: .04em; opacity: .7; }

.msg-actions { display: flex; gap: 5px; margin-top: 8px; }
.msg-act-btn {
  background: var(--glass); border: 1px solid var(--rim);
  border-radius: 6px; color: var(--text3); cursor: pointer;
  font-size: 10px; padding: 3px 9px; transition: all .14s;
  font-family: var(--body); display: flex; align-items: center; gap: 4px;
}
.msg-act-btn:hover { border-color: var(--green); color: var(--green); background: rgba(0,255,157,.06); }
.msg-act-btn.voted { border-color: var(--green); color: var(--green); background: rgba(0,255,157,.08); }
.msg-act-btn.voted-down { border-color: var(--rose); color: var(--rose); background: rgba(255,77,141,.08); }

/* Code blocks */
.code-block-wrap { margin: 10px 0; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,.07); }
.code-lang-tag {
  background: rgba(0,212,255,.08); border-bottom: 1px solid rgba(0,212,255,.15);
  padding: 5px 12px; font-family: var(--mono); font-size: 9px;
  color: var(--cyan); letter-spacing: .1em; text-transform: uppercase; font-weight: 600;
  display: flex; align-items: center; gap: 6px;
}
.code-lang-tag::before { content: '●'; font-size: 6px; }
.code-pre {
  background: rgba(4,6,12,.92);
  padding: 12px 14px; margin: 0;
  font-family: var(--mono); font-size: 11.5px; line-height: 1.75;
  overflow-x: auto; white-space: pre-wrap; word-break: break-word;
  text-align: left; color: #c9d1e0;
}
.inline-code {
  background: rgba(0,212,255,.1); border: 1px solid rgba(0,212,255,.2);
  border-radius: 4px; padding: 1px 5px;
  font-family: var(--mono); font-size: 11px; color: var(--cyan);
}
.msg-bubble strong { color: #fff; font-weight: 600; }
.msg-bubble em { color: var(--amber); font-style: italic; }
.md-ul,.md-ol { padding-left: 18px; margin: 5px 0; }
.md-ul li,.md-ol li { margin: 3px 0; }
.md-h1 { font-family: var(--disp); font-size: 16px; font-weight: 800; color: #fff; margin: 9px 0 4px; }
.md-h2 { font-family: var(--disp); font-size: 14px; font-weight: 700; color: #fff; margin: 7px 0 3px; }
.md-h3 { font-size: 13px; font-weight: 700; color: var(--cyan); margin: 5px 0 2px; }
.md-hr { border: none; border-top: 1px solid var(--rim); margin: 10px 0; }
.md-spacer { height: 5px; }
.md-p { margin: 2px 0; }

/* Typing indicator */
.typing-wrap { display: flex; gap: 8px; margin-bottom: 18px; animation: msgIn .2s ease both; }
.typing-bub {
  padding: 12px 16px;
  background: rgba(255,255,255,.035); border: 1px solid var(--rim);
  border-radius: 14px; border-top-left-radius: 4px;
  display: flex; align-items: center; gap: 5px;
}
.typing-dot { width: 6px; height: 6px; border-radius: 50%; animation: bounce 1.3s infinite; }
.typing-dot:nth-child(1) { background: var(--cyan);   animation-delay: 0s; }
.typing-dot:nth-child(2) { background: var(--green);  animation-delay: .18s; }
.typing-dot:nth-child(3) { background: var(--violet); animation-delay: .36s; }
@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }

/* Proactive banner */
.proactive-banner {
  margin: 0 20px 12px;
  padding: 9px 14px;
  background: rgba(0,212,255,.05); border: 1px solid rgba(0,212,255,.18);
  border-radius: 10px; font-size: 11px; color: #7dd8f0;
  cursor: pointer; transition: all .18s;
  display: flex; align-items: center; gap: 8px;
  animation: slideUp .3s ease both;
}
.proactive-banner:hover { background: rgba(0,212,255,.1); border-color: rgba(0,212,255,.35); }
@keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
.proactive-close { margin-left: auto; color: var(--text3); font-size: 14px; }

/* Quick replies */
.quick-wrap { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 20px 12px; }
.qr-btn {
  background: var(--glass); border: 1px solid var(--rim);
  border-radius: 20px; padding: 6px 13px; font-size: 11px; font-weight: 500;
  color: var(--text2); cursor: pointer; transition: all .16s; font-family: var(--body);
}
.qr-btn:hover { border-color: var(--cyan); color: var(--cyan); background: rgba(0,212,255,.07); transform: translateY(-1px); }

/* Input area */
.f-input-wrap {
  border-top: 1px solid var(--rim);
  background: rgba(8,10,15,.92);
  padding: 12px 16px; display: flex; flex-direction: column; gap: 8px;
  backdrop-filter: blur(12px);
}
.f-input-row { display: flex; gap: 8px; align-items: flex-end; }
.f-textarea {
  flex: 1; background: rgba(255,255,255,.04); border: 1px solid var(--rim);
  border-radius: 11px; padding: 10px 13px; font-size: 13px; color: var(--text);
  font-family: var(--body); resize: none; outline: none;
  min-height: 44px; max-height: 140px;
  transition: border-color .2s, box-shadow .2s; line-height: 1.55;
}
.f-textarea::placeholder { color: var(--text3); }
.f-textarea:focus {
  border-color: rgba(0,212,255,.35);
  box-shadow: 0 0 0 3px rgba(0,212,255,.06);
}
.f-send-btn {
  width: 44px; height: 44px; border-radius: 11px; border: none; cursor: pointer;
  background: linear-gradient(135deg, var(--cyan), var(--green));
  color: #080a0f; font-size: 17px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  transition: transform .16s, box-shadow .16s; flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(0,212,255,.3);
}
.f-send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,212,255,.5);
}
.f-send-btn:disabled { opacity: .35; cursor: not-allowed; box-shadow: none; }
.f-meta-row { display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: var(--text3); padding: 0 2px; }

/* Animations */
@keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
@keyframes spin   { to{transform:rotate(360deg)} }

.f-sidebar { animation: fadeUp .3s ease both; }
.f-right   { animation: fadeUp .3s .08s ease both; }
`;

// ─── Main component ───────────────────────────────────────────────────────────
export default function AIBot() {
  const navigate = useNavigate();
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [skillLevel,   setSkillLevel]   = useState(SKILL_LEVELS.intermediate);
  const [manualSkill,  setManualSkill]  = useState(false);
  const [sentiment,    setSentiment]    = useState(SENTIMENTS.neutral);
  const [votes,        setVotes]        = useState({});
  const [msgCount,     setMsgCount]     = useState(0);
  const [proactive,    setProactive]    = useState(null);
  const [showQuick,    setShowQuick]    = useState(true);
  const [sessionStart]                  = useState(Date.now());
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  // ── Greeting ──
  useEffect(() => {
    setMessages([{
      id: "greet", role: "assistant", time: new Date(),
      content: `Hey there! 👋 I'm **Forge** — your adaptive AI coding mentor.\n\nI tune my responses to your skill level automatically. Here's what I can do:\n- 🐛 **Debug & fix** code in any language\n- 📐 **Code review** with security & best practices\n- 🧠 **Explain concepts** from beginner to expert\n- 🏗️ **System design** with real trade-off analysis\n- ⚡ **Algorithm analysis** with Big-O complexity\n- 🔐 **Security audits** and vulnerability detection\n\nWhat are you building or stuck on today?`,
    }]);
    const t = setTimeout(() => {
      setProactive(PROACTIVE_MSGS[Math.floor(Math.random() * PROACTIVE_MSGS.length)]);
      setTimeout(() => setProactive(null), 7000);
    }, 10000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    if (!manualSkill && messages.length > 4) {
      setSkillLevel(detectSkillLevel(messages.filter(m => m.role === "user")));
    }
  }, [messages, manualSkill]);

  // ── Send ──
  const sendMessage = useCallback(async (override) => {
    const text = (override || input).trim();
    if (!text || loading) return;
    setInput(""); setShowQuick(false); setMsgCount(c => c + 1);
    const sent = detectSentiment(text);
    setSentiment(sent);
    const userMsg = { id: Date.now(), role: "user", content: text, time: new Date() };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    try {
      const sys  = buildSystemPrompt(skillLevel, sent);
      const msgs = next.slice(-14).filter(m => m.id !== "greet").map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));
      const reply = await callGroqAPI(msgs, sys);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: "assistant",
        content: reply, time: new Date(), sentiment: sent,
      }]);
      if (Math.random() < 0.18) {
        setTimeout(() => {
          setProactive(PROACTIVE_MSGS[Math.floor(Math.random() * PROACTIVE_MSGS.length)]);
          setTimeout(() => setProactive(null), 6000);
        }, 2000);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: "assistant", isError: true, time: new Date(),
        content: `⚠️ **Connection Error**\n\n\`${err.message}\`\n\nMake sure your server is running:\n\`\`\`bash\nnode server.js\n\`\`\``,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, messages, skillLevel]);

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };
  const vote = (id, v) => setVotes(p => ({ ...p, [id]: v }));
  const sessionMins = Math.round((Date.now() - sessionStart) / 60000);

  // ── Config ──
  const SKILL_CFG = {
    beginner:     { color: "#00ff9d", activeText: "#080a0f", label: "Beginner",     desc: "Step-by-step with analogies" },
    intermediate: { color: "#ffb547", activeText: "#080a0f", label: "Intermediate", desc: "Balanced depth & examples" },
    advanced:     { color: "#a78bfa", activeText: "#fff",    label: "Advanced",     desc: "Concise & technical" },
  };
  const SENT_CFG = {
    positive: { color: "#00ff9d", label: "Positive",   pct: 88 },
    neutral:  { color: "#00d4ff", label: "Neutral",    pct: 52 },
    negative: { color: "#ffb547", label: "Frustrated", pct: 28 },
    angry:    { color: "#ff4d8d", label: "Upset",      pct: 10 },
  };
  const CAPS = [
    { icon:"🐛", title:"Debug & Fix",      desc:"Paste code, get instant root-cause diagnosis",  prompt:"Help me debug: " },
    { icon:"⚡", title:"Optimize",         desc:"Performance, complexity & refactoring",          prompt:"Optimize this code: " },
    { icon:"📐", title:"Code Review",      desc:"Quality, security & best practices",             prompt:"Review this code: " },
    { icon:"🧠", title:"Explain Concept",  desc:"From basics to advanced theory",                 prompt:"Explain " },
    { icon:"🏗️", title:"System Design",   desc:"Architecture, scalability & trade-offs",         prompt:"Help me design a system for " },
    { icon:"🔐", title:"Security Audit",   desc:"Find vulnerabilities & harden your code",        prompt:"Find security issues in: " },
  ];

  return (
    <div className="forge-root">
      <style>{CSS}</style>

      {/* ── TOPBAR ── */}
      <div className="f-topbar">
        <button className="f-back-btn" onClick={() => navigate("/")}>
          ← Home
        </button>

        <div className="f-wordmark">
          <div className="f-wordmark-icon">⚡</div>
          <span className="f-wordmark-text">Forge AI</span>
        </div>

        <div className="f-online-pill">
          <div className="f-online-dot"/>
          Online · Groq LLaMA 3.3 70B
        </div>

        {/* Skill toggle */}
        <div className="f-skill-toggle">
          {Object.entries(SKILL_CFG).map(([k, v]) => (
            <button key={k} className={`f-skill-btn${skillLevel===k?" active":""}`}
              onClick={() => { setSkillLevel(k); setManualSkill(true); }}
              style={skillLevel===k ? { background: v.color, color: v.activeText } : {}}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Sentiment badge */}
        <div className="f-sent-badge">
          <span style={{ color: SENT_CFG[sentiment].color, fontSize: 8 }}>●</span>
          <span style={{ color: SENT_CFG[sentiment].color }}>{SENT_CFG[sentiment].label}</span>
        </div>
      </div>

      {/* ── LEFT SIDEBAR ── */}
      <div className="f-sidebar f-left">
        <div className="sb-section">
          <div className="sb-label">Adaptation</div>
          {Object.entries(SKILL_CFG).map(([k, v]) => (
            <div key={k} className={`skill-pill${skillLevel===k?" active":""}`}
              onClick={() => { setSkillLevel(k); setManualSkill(true); }}>
              <div className="skill-pill-dot" style={{ background: v.color, boxShadow: skillLevel===k ? `0 0 8px ${v.color}` : "none" }}/>
              <div>
                <div className="skill-pill-name" style={skillLevel===k ? { color: v.color } : {}}>{v.label}</div>
                <div className="skill-pill-desc">{v.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="sent-meter">
          <div className="sb-label">Sentiment</div>
          <div className="sent-row">
            <span>{SENT_CFG[sentiment].label}</span>
            <span style={{ color: SENT_CFG[sentiment].color, fontFamily: "var(--mono)", fontSize: 10 }}>
              {SENT_CFG[sentiment].pct}%
            </span>
          </div>
          <div className="sent-track">
            <div className="sent-fill" style={{ width: SENT_CFG[sentiment].pct+"%", background: SENT_CFG[sentiment].color }}/>
          </div>
        </div>

        <div className="stats-grid">
          {[
            { n: msgCount,       l: "Messages",  c: "var(--cyan)" },
            { n: sessionMins+"m",l: "Session",   c: "var(--green)" },
            { n: Object.values(votes).filter(v=>v==="up").length,   l: "Helpful",   c: "#00ff9d" },
            { n: Object.values(votes).filter(v=>v==="down").length, l: "Needs Work",c: "var(--amber)" },
          ].map(s => (
            <div key={s.l} className="stat-box">
              <div className="stat-num" style={{ color: s.c }}>{s.n}</div>
              <div className="stat-lbl">{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "8px 12px 4px" }}><div className="sb-label">Recent Topics</div></div>
        <div className="history-scroll">
          {messages.filter(m=>m.role==="user").slice(-10).reverse().map((m,i) => (
            <div key={i} className="h-item" title={m.content}
              onClick={() => { setInput(m.content); inputRef.current?.focus(); }}>
              {m.content.slice(0,38)}{m.content.length>38?"…":""}
            </div>
          ))}
          {messages.filter(m=>m.role==="user").length===0 && (
            <div style={{ fontSize:10, color:"var(--text3)", padding:"8px 4px", textAlign:"center" }}>
              No messages yet
            </div>
          )}
        </div>
      </div>

      {/* ── CHAT ── */}
      <div className="f-chat">
        <div className="chat-bg"/>
        <div className="chat-scroll">
          {messages.map(msg => (
            <div key={msg.id} className={`msg-wrap${msg.role==="user"?" user":""}`}>
              <div className={`msg-av ${msg.role==="user"?"user":"bot"}`}>
                {msg.role==="user" ? "DE" : "F"}
              </div>
              <div className={`msg-col ${msg.role==="user"?"user":"bot"}`}>
                <div className={`msg-bubble ${msg.role}${msg.sentiment==="angry"&&msg.role==="assistant"?" angry":""}${msg.isError?" error":""}`}>
                  {msg.role==="assistant" ? renderMarkdown(msg.content) : <span>{msg.content}</span>}
                </div>
                <div className="msg-time" style={{ alignSelf: msg.role==="user" ? "flex-end" : "flex-start" }}>
                  {msg.time?.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                  {msg.role==="assistant" && (
                    <span className="msg-skill-tag" style={{ color: SKILL_CFG[skillLevel].color }}>
                      [{skillLevel}]
                    </span>
                  )}
                </div>
                {msg.role==="assistant" && !msg.isError && (
                  <div className="msg-actions">
                    <button className={`msg-act-btn${votes[msg.id]==="up"?" voted":""}`}
                      onClick={() => vote(msg.id,"up")}>
                      👍 Helpful
                    </button>
                    <button className={`msg-act-btn${votes[msg.id]==="down"?" voted-down":""}`}
                      onClick={() => vote(msg.id,"down")}>
                      👎 Needs work
                    </button>
                    <button className="msg-act-btn"
                      onClick={() => { setInput("Can you explain that differently?"); inputRef.current?.focus(); }}>
                      🔄 Rephrase
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="typing-wrap">
              <div className="msg-av bot">F</div>
              <div className="typing-bub">
                <div className="typing-dot"/>
                <div className="typing-dot"/>
                <div className="typing-dot"/>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* Proactive banner */}
        {proactive && (
          <div className="proactive-banner" onClick={() => setProactive(null)}>
            <span>{proactive}</span>
            <span className="proactive-close">✕</span>
          </div>
        )}

        {/* Quick replies */}
        {showQuick && messages.length <= 1 && (
          <div className="quick-wrap">
            {QUICK_REPLIES.map((qr,i) => (
              <button key={i} className="qr-btn" onClick={() => sendMessage(qr.prompt)}>
                {qr.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="f-input-wrap">
          <div className="f-input-row">
            <textarea
              ref={inputRef}
              className="f-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything — paste code, describe a bug, or ask a concept…"
              rows={1}
              style={{ height: Math.min(140, Math.max(44, input.split("\n").length * 22)) + "px" }}
            />
            <button className="f-send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
              {loading
                ? <div style={{ width:16, height:16, border:"2px solid rgba(8,10,15,.3)", borderTopColor:"#080a0f", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
                : "↑"}
            </button>
          </div>
          <div className="f-meta-row">
            <span>Shift+Enter for new line · Enter to send</span>
            <span style={{ color: input.length > 3500 ? "var(--rose)" : "var(--text3)", fontFamily:"var(--mono)" }}>
              {input.length} / 4000
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div className="f-sidebar f-right">
        <div className="sb-section"><div className="sb-label">Capabilities</div></div>
        <div className="cap-scroll">
          {CAPS.map((cap, i) => (
            <div key={i} className="cap-card"
              onClick={() => { setInput(cap.prompt); inputRef.current?.focus(); }}>
              <div className="cap-icon-box">{cap.icon}</div>
              <div>
                <div className="cap-title">{cap.title}</div>
                <div className="cap-desc">{cap.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="feedback-strip">
          <div className="sb-label">Rate Forge</div>
          <div className="fb-strip-btns">
            {[["😊","Great",()=>sendMessage("You're doing great!")],
              ["😐","OK",  ()=>sendMessage("Your responses could be clearer")],
              ["😞","Poor", ()=>sendMessage("I need better explanations please")]].map(([ic,lbl,fn]) => (
              <button key={lbl} className="fb-strip-btn" onClick={fn}>{ic} {lbl}</button>
            ))}
          </div>
        </div>

        <div className="sess-info">
          <div className="sb-label">Session</div>
          {[
            ["Model",   <span style={{color:"var(--cyan)"}}>LLaMA 3.3 70B</span>],
            ["Via",     <span style={{color:"var(--green)"}}>Groq</span>],
            ["Context", <span style={{color:"var(--cyan)"}}>{Math.min(messages.length,14)} msgs</span>],
            ["Mode",    <span style={{color: SKILL_CFG[skillLevel].color}}>{skillLevel}</span>],
            ["Tone",    <span style={{color: SENT_CFG[sentiment].color}}>{SENT_CFG[sentiment].label}</span>],
            ["Uptime",  <span style={{color:"var(--green)"}}>{sessionMins}m</span>],
          ].map(([k,v]) => (
            <div key={k} className="sess-row">
              <span>{k}</span>
              <span className="sess-val">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}