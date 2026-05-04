import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LANGS = {
  ts:   { n: "TypeScript",  ic: "TS", c: "#4FC1FF", bg: "rgba(79,193,255,.15)"  },
  js:   { n: "JavaScript",  ic: "JS", c: "#f7df1e", bg: "rgba(247,223,30,.13)"  },
  py:   { n: "Python",      ic: "PY", c: "#4EC9B0", bg: "rgba(78,201,176,.15)"  },
  java: { n: "Java",        ic: "JV", c: "#ed8b00", bg: "rgba(237,139,0,.15)"   },
  cpp:  { n: "C++",         ic: "C+", c: "#9CDCFE", bg: "rgba(156,220,254,.15)" },
  rs:   { n: "Rust",        ic: "RS", c: "#CE9178", bg: "rgba(206,145,120,.15)" },
  go:   { n: "Go",          ic: "GO", c: "#00acd7", bg: "rgba(0,172,215,.15)"   },
  sql:  { n: "SQL",         ic: "SQ", c: "#DCDCAA", bg: "rgba(220,220,170,.15)" },
};

function nowTs() {
  return new Date().toLocaleTimeString("en", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ── AI Chat via Groq API (called directly from frontend) ──
async function askGroq(messages, lang, userCode, groqApiKey) {
  if (!groqApiKey || !groqApiKey.trim()) {
    throw new Error("Groq API key is missing. Please enter your key above.");
  }

  const systemPrompt = "You are an expert debugging assistant helping developers fix code issues.\nLanguage: " + (LANGS[lang]?.n || lang) + "\n" + (userCode ? "\nUser's code context:\n```" + lang + "\n" + userCode + "\n```" : "") + "\n\nProvide clear, concise debugging help. Use code blocks when showing code examples.";

  const groqMessages = messages
    .filter((m) => m.role === "user" || (m.role === "assistant" && !m.id?.startsWith("init-")))
    .map((m) => ({
      role: m.role === "error" ? "assistant" : m.role,
      content: m.text,
    }));

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + groqApiKey.trim(),
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...groqMessages,
      ],
      max_tokens: 1024,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || "HTTP " + response.status;
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response from Groq.";
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Syne:wght@500;600;700;800&display=swap');

  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

  :root {
    --mono: 'JetBrains Mono', ui-monospace, monospace;
    --sans: 'Syne', system-ui, sans-serif;
    --bg0:  #07090f;
    --bg1:  #0d1018;
    --bg2:  #10131a;
    --bg3:  #141820;
    --bdr:  rgba(255,255,255,.06);
    --bdr2: rgba(255,255,255,.03);
    --pink: #FF6B9D;
    --teal: #4EC9B0;
    --blue: #4FC1FF;
    --gold: #DCDCAA;
    --pur:  #C586C0;
    --muted: #4a5568;
    --dim:   #2d3748;
    --text:  #c0c8d8;
    --text2: #8892a4;
    --text3: #e0e0e0;
  }

  .dbgm-backdrop {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,.55); backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center;
    animation: dbgmFadeIn .15s ease both;
  }
  @keyframes dbgmFadeIn { from{opacity:0} to{opacity:1} }

  .dbgm-page {
    position: fixed; inset: 0; z-index: 1;
    background: var(--bg0);
    display: flex; flex-direction: column;
    animation: dbgmFadeIn .2s ease both;
  }
  .dbgm-page-header {
    display: flex; align-items: center; gap: 12px;
    height: 52px; padding: 0 20px;
    background: rgba(255,107,157,.04);
    border-bottom: 1px solid rgba(255,107,157,.12);
    flex-shrink: 0;
  }
  .dbgm-back-btn {
    display: flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.09);
    border-radius: 7px; padding: 5px 12px;
    color: var(--text2); font-size: 11px; font-family: var(--sans);
    cursor: pointer; transition: all .15s;
  }
  .dbgm-back-btn:hover { border-color: rgba(255,107,157,.3); color: var(--pink); background: rgba(255,107,157,.07); }
  .dbgm-page .dbgm-modal {
    flex: 1; width: 100%; height: 100%;
    border-radius: 0; border: none; box-shadow: none;
    animation: none;
  }

  .dbgm-modal {
    font-family: var(--sans);
    width: min(860px, 97vw);
    height: min(580px, 92vh);
    background: #0f1219;
    border: 1px solid rgba(255,107,157,.18); border-radius: 14px;
    box-shadow: 0 24px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04);
    display: flex; flex-direction: column; overflow: hidden;
    animation: dbgmSlideIn .18s cubic-bezier(.22,.9,.36,1) both;
  }
  @keyframes dbgmSlideIn { from{opacity:0;transform:translateY(14px) scale(.97)} to{opacity:1;transform:none} }

  .dbgm-titlebar {
    display: flex; align-items: center; gap: 10px;
    padding: 0 16px; height: 46px;
    background: rgba(255,107,157,.05);
    border-bottom: 1px solid rgba(255,107,157,.1); flex-shrink: 0;
  }
  .dbgm-titlebar-dot { width:8px;height:8px;border-radius:50%;background:var(--pink);box-shadow:0 0 7px var(--pink);flex-shrink:0; }
  .dbgm-title { font-family:var(--sans);font-size:13px;font-weight:700;color:var(--pink);display:flex;align-items:center;gap:6px; }
  .dbgm-spacer { flex:1; }
  
  .dbgm-ai-badge { display:flex;align-items:center;gap:4px;padding:2px 8px;border-radius:5px;font-family:var(--mono);font-size:9.5px;font-weight:700;background:rgba(78,201,176,.12);border:1px solid rgba(78,201,176,.3);color:var(--teal); }
  .dbgm-ai-dot { width:5px;height:5px;border-radius:50%;background:var(--teal);box-shadow:0 0 5px var(--teal); }
  .dbgm-close-btn { width:24px;height:24px;border-radius:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:var(--muted);font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;flex-shrink:0; }
  .dbgm-close-btn:hover { background:rgba(255,107,157,.15);border-color:rgba(255,107,157,.3);color:var(--pink); }

  .dbgm-body { flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden; }

  .dbgm-ai-panel { display:flex;flex-direction:column;flex:1;overflow:hidden;background:#0b0e15; }
  .dbgm-ai-head { padding:8px 14px;border-bottom:1px solid rgba(78,201,176,.15);flex-shrink:0;display:flex;align-items:center;gap:8px;background:rgba(78,201,176,.04); }
  .dbgm-ai-head-label { font-family:var(--mono);font-size:9.5px;color:var(--teal);font-weight:700;letter-spacing:.06em;text-transform:uppercase; }
  .dbgm-ai-model-tag { font-family:var(--mono);font-size:8.5px;color:var(--dim);margin-left:auto; }

  .dbgm-apikey-strip { padding:6px 10px;border-bottom:1px solid rgba(78,201,176,.1);background:rgba(0,0,0,.25);flex-shrink:0;display:flex;align-items:center;gap:6px; }
  .dbgm-apikey-input { flex:1;background:rgba(78,201,176,.05);border:1px solid rgba(78,201,176,.2);border-radius:5px;padding:4px 8px;color:var(--text3);font-size:9.5px;font-family:var(--mono);outline:none;transition:border-color .15s; }
  .dbgm-apikey-input:focus { border-color:rgba(78,201,176,.5); }
  .dbgm-apikey-input::placeholder { color:var(--dim); }
  .dbgm-apikey-label { font-family:var(--mono);font-size:8.5px;color:var(--muted);white-space:nowrap; }

  .dbgm-ai-messages { flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px; }
  .dbgm-ai-messages::-webkit-scrollbar { width:3px; }
  .dbgm-ai-messages::-webkit-scrollbar-thumb { background:rgba(78,201,176,.15);border-radius:2px; }
  .dbgm-ai-msg { display:flex;flex-direction:column;gap:3px;animation:dbgFadeIn .18s ease both; }
  .dbgm-ai-msg-label { font-family:var(--mono);font-size:8.5px;display:flex;align-items:center;gap:4px; }
  .dbgm-ai-bubble { padding:9px 12px;border-radius:8px;font-size:11.5px;line-height:1.7;font-family:var(--sans);white-space:pre-wrap;word-break:break-word; }
  .dbgm-ai-bubble.user { background:rgba(79,193,255,.08);border:1px solid rgba(79,193,255,.18);color:#a8d8ff;border-radius:8px 8px 3px 8px;align-self:flex-end;max-width:90%; }
  .dbgm-ai-bubble.assistant { background:rgba(78,201,176,.08);border:1px solid rgba(78,201,176,.2);color:#8ffce8; }
  .dbgm-ai-bubble.error-msg { background:rgba(255,107,157,.07);border:1px solid rgba(255,107,157,.18);color:#ff8090;font-family:var(--mono);font-size:10.5px; }
  .dbgm-ai-typing { display:flex;align-items:center;gap:5px;padding:8px 12px;border-radius:8px;background:rgba(78,201,176,.06);border:1px solid rgba(78,201,176,.15);font-family:var(--mono);font-size:9.5px;color:var(--teal); }
  .dbgm-typing-dots { display:flex;gap:3px; }
  .dbgm-typing-dots span { width:4px;height:4px;border-radius:50%;background:var(--teal);animation:dbgTypeDot 1.2s ease-in-out infinite; }
  .dbgm-typing-dots span:nth-child(2) { animation-delay:.2s; }
  .dbgm-typing-dots span:nth-child(3) { animation-delay:.4s; }
  @keyframes dbgTypeDot { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }

  .dbgm-ai-code { font-family:var(--mono);font-size:10px;line-height:1.6;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:8px 10px;margin-top:5px;overflow-x:auto;color:#9CDCFE;white-space:pre; }

  .dbgm-ai-input-row { display:flex;flex-direction:column;gap:5px;padding:8px 10px;border-top:1px solid rgba(78,201,176,.12);flex-shrink:0;background:#090c12; }
  .dbgm-ai-input-top { display:flex;gap:5px; }
  .dbgm-ai-input { flex:1;background:rgba(78,201,176,.05);border:1px solid rgba(78,201,176,.18);border-radius:7px;padding:7px 10px;color:var(--text3);font-size:11px;font-family:var(--sans);outline:none;transition:border-color .15s;resize:none;height:38px;max-height:80px; }
  .dbgm-ai-input:focus { border-color:rgba(78,201,176,.45); }
  .dbgm-ai-input::placeholder { color:var(--muted);font-size:10.5px; }
  .dbgm-ai-send-btn { padding:7px 13px;border-radius:7px;background:rgba(78,201,176,.15);border:1px solid rgba(78,201,176,.35);color:var(--teal);font-size:11px;font-weight:700;font-family:var(--sans);cursor:pointer;transition:all .15s;white-space:nowrap;align-self:flex-end; }
  .dbgm-ai-send-btn:hover:not(:disabled) { background:rgba(78,201,176,.28); }
  .dbgm-ai-send-btn:disabled { opacity:.4;cursor:not-allowed; }
  .dbgm-ai-quick-btns { display:flex;gap:4px;flex-wrap:wrap; }
  .dbgm-ai-quick-btn { padding:2px 8px;border-radius:5px;background:rgba(78,201,176,.07);border:1px solid rgba(78,201,176,.2);color:var(--teal);font-size:9px;font-family:var(--mono);cursor:pointer;transition:all .12s;white-space:nowrap; }
  .dbgm-ai-quick-btn:hover { background:rgba(78,201,176,.18); }

  .dbgm-code-area { padding:6px 10px;border-top:1px solid rgba(78,201,176,.08);flex-shrink:0;background:#090c12; }
  .dbgm-code-area-label { font-family:var(--mono);font-size:8.5px;color:var(--dim);margin-bottom:3px;text-transform:uppercase;letter-spacing:.1em; }
  .dbgm-code-input { width:100%;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06);border-radius:6px;padding:5px 8px;color:#9CDCFE;font-size:9.5px;font-family:var(--mono);outline:none;resize:none;height:50px;transition:border-color .15s; }
  .dbgm-code-input:focus { border-color:rgba(78,201,176,.3); }
  .dbgm-code-input::placeholder { color:var(--dim); }

  .dbgm-statusbar { display:flex;align-items:center;gap:14px;padding:5px 16px;background:rgba(255,255,255,.02);border-top:1px solid var(--bdr);flex-shrink:0; }
  .dbgm-status-item { font-family:var(--mono);font-size:9.5px;color:var(--muted);display:flex;align-items:center;gap:4px; }
  .dbgm-status-item span { color:var(--text2); }
  .dbgm-live-dot { width:5px;height:5px;border-radius:50%;background:var(--teal);box-shadow:0 0 5px var(--teal); }
  .dbgm-in-room { font-family:var(--mono);font-size:9.5px;color:var(--teal);display:flex;align-items:center;gap:4px; }

  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.35} }
  .pulse { animation:pulse 1.8s ease-in-out infinite; }
`;

function FormatAIResponse({ text }) {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const inner = part.replace(/^```[a-z]*\n?/, "").replace(/```$/, "");
          return <div key={i} className="dbgm-ai-code">{inner}</div>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} style={{ fontFamily: "var(--mono)", fontSize: "10px", background: "rgba(0,0,0,.35)", padding: "1px 5px", borderRadius: "4px", color: "#9CDCFE" }}>
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function DebuggingRoomModal({ isOpen, onClose, lang: initialLang = "ts", isFullPage = false }) {
  const [lang, setLang] = useState(initialLang);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [userCode, setUserCode] = useState("");
  const [groqApiKey, setGroqApiKey] = useState(import.meta.env.VITE_GROQ_API_KEY || "");

  const aiEndRef       = useRef(null);
  const styleInjected  = useRef(false);

  useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
    const tag = document.createElement("style");
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape" && isOpen) onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setAiMessages([{
      id: "init-welcome",
      role: "assistant",
      text: "Ready to help debug!\n\nEnter your Groq API key above, paste your code context below if needed, then ask me anything about your issues.",
      t: nowTs(),
    }]);
  }, [lang, isOpen]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiLoading]);

  const sendAiMessage = async (overrideText) => {
    const txt = (overrideText || aiInput).trim();
    if (!txt || aiLoading) return;

    const userMsg = { id: Math.random().toString(36).slice(2), role: "user", text: txt, t: nowTs() };
    const newHistory = [...aiMessages, userMsg];
    setAiMessages(newHistory);
    setAiInput("");
    setAiLoading(true);

    try {
      const aiReply = await askGroq(newHistory, lang, userCode, groqApiKey);
      setAiMessages((prev) => [
        ...prev,
        { id: Math.random().toString(36).slice(2), role: "assistant", text: aiReply, t: nowTs() },
      ]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { id: Math.random().toString(36).slice(2), role: "error", text: "⚠ Groq Error: " + err.message, t: nowTs() },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const quickPrompts = [
    "Why does this happen?",
    "Show me the fix",
    "Explain step by step",
    "Alternative approaches?",
  ];

  if (!isOpen) return null;

  const content = (
    <>
      <div className="dbgm-titlebar">
        <div className="dbgm-titlebar-dot pulse" />
        <div className="dbgm-title">🐛 Real-Time Debugging Room</div>
        <div className="dbgm-spacer" />
        <div className="dbgm-ai-badge">
          <div className="dbgm-ai-dot pulse" />
          Groq AI
        </div>
        <button className="dbgm-close-btn" onClick={onClose} title="Close (Esc)">✕</button>
      </div>

      <div className="dbgm-body">
        <div className="dbgm-ai-panel">
          <div className="dbgm-ai-head">
            <div className="dbgm-ai-head-label">⚡ Groq Debugger</div>
            <div className="dbgm-ai-model-tag">llama-3.3-70b</div>
          </div>

          <div className="dbgm-apikey-strip">
            <span className="dbgm-apikey-label">🔑 Key:</span>
            <input
              className="dbgm-apikey-input"
              type="password"
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="dbgm-ai-messages">
            {aiMessages.map((msg) => (
              <div key={msg.id} className="dbgm-ai-msg">
                {msg.role === "user" ? (
                  <>
                    <div className="dbgm-ai-msg-label" style={{ justifyContent: "flex-end", color: "var(--blue)" }}>You · {msg.t}</div>
                    <div className="dbgm-ai-bubble user">{msg.text}</div>
                  </>
                ) : msg.role === "error" ? (
                  <div className="dbgm-ai-bubble error-msg">{msg.text}</div>
                ) : (
                  <>
                    <div className="dbgm-ai-msg-label" style={{ color: "var(--teal)" }}>
                      <span style={{ fontSize: 10 }}>⚡</span> Groq · {msg.t}
                    </div>
                    <div className="dbgm-ai-bubble assistant">
                      <FormatAIResponse text={msg.text} />
                    </div>
                  </>
                )}
              </div>
            ))}
            {aiLoading && (
              <div className="dbgm-ai-typing">
                <span>Groq is thinking</span>
                <div className="dbgm-typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={aiEndRef} />
          </div>

          <div className="dbgm-code-area">
            <div className="dbgm-code-area-label">Paste code context (optional)</div>
            <textarea
              className="dbgm-code-input"
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              placeholder={"// Paste relevant " + (LANGS[lang]?.n || lang) + " code here…"}
              spellCheck={false}
            />
          </div>

          <div className="dbgm-ai-input-row">
            <div className="dbgm-ai-quick-btns">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  className="dbgm-ai-quick-btn"
                  onClick={() => sendAiMessage(q)}
                  disabled={aiLoading}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="dbgm-ai-input-top">
              <textarea
                className="dbgm-ai-input"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendAiMessage();
                  }
                }}
                placeholder="Ask Groq about this error… (Enter to send)"
                disabled={aiLoading}
              />
              <button
                className="dbgm-ai-send-btn"
                onClick={() => sendAiMessage()}
                disabled={aiLoading || !aiInput.trim()}
              >
                {aiLoading ? "…" : "Ask ⚡"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="dbgm-statusbar">
        <div className="dbgm-live-dot" />
        <div className="dbgm-in-room">1 in room</div>
        <div style={{ flex: 1 }} />
        <div className="dbgm-status-item">Lang: <span style={{ color: LANGS[lang]?.c }}>{LANGS[lang]?.n || lang}</span></div>
        <div className="dbgm-status-item">AI: <span style={{ color: "var(--teal)" }}>groq · llama-3.3-70b</span></div>
      </div>
    </>
  );

  if (isFullPage) {
    return (
      <div className="dbgm-modal">
        {content}
      </div>
    );
  }

  return (
    <div className="dbgm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="dbgm-modal">
        {content}
      </div>
    </div>
  );
}

export default function DebuggingRoomPage() {
  const navigate = useNavigate();

  return (
    <div className="dbgm-page">
      <div className="dbgm-page-header">
        <button className="dbgm-back-btn" onClick={() => navigate("/", { replace: true })}>
          ← Back to CKC-OS
        </button>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF6B9D", boxShadow: "0 0 7px #FF6B9D", animation: "pulse 1.8s ease-in-out infinite" }} />
        <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, color: "#FF6B9D" }}>
          🐛 Real-Time Debugging Room
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>
          Groq AI · llama-3.3-70b
        </div>
      </div>
      <DebuggingRoomModal
        isOpen={true}
        onClose={() => navigate("/", { replace: true })}
        isFullPage
      />
    </div>
  );
}
