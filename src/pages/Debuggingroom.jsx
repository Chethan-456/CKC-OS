import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ═══════════════════════════════════════════════════════
// ════════ DEBUGGING ROOM — MODAL VERSION ══════════════
// ═══════════════════════════════════════════════════════
//
// Usage:
//   <DebuggingRoomModal
//     isOpen={showDebug}
//     onClose={() => setShowDebug(false)}
//     lang="ts"          // optional, defaults to "ts"
//   />
//
// Remove any <DebuggingRoomPage /> or <DebuggingRoomModal /> usage
// from your index / landing page.
// ═══════════════════════════════════════════════════════

const BOTS = [
  { name: "Aria K.", inits: "AK", color: "#FF6B9D", bg: "rgba(255,107,157,.18)" },
  { name: "Dev M.",  inits: "DM", color: "#4EC9B0", bg: "rgba(78,201,176,.18)"  },
  { name: "Sam T.",  inits: "ST", color: "#DCDCAA", bg: "rgba(220,220,170,.18)" },
];

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

function initials(n) {
  return n.split(" ").map((w) => w[0] || "").join("").toUpperCase().slice(0, 2) || "?";
}

const SEED_ERRORS = [
  "SyntaxError: Unexpected token '}' at line 42 — possible missing opening brace",
  "TypeError: Cannot read properties of undefined (reading 'map') at Component.render",
  "ReferenceError: 'authToken' is not defined — check import scope",
];
const SEED_WARNINGS = [
  "DeprecationWarning: componentWillMount is deprecated, use componentDidMount",
  "Unused variable 'tempData' declared but never read (line 18)",
];

function nowTs() {
  return new Date().toLocaleTimeString("en", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function generateBotAnnotation(error) {
  const suggestions = {
    SyntaxError:    ["Check your brackets — one might be missing its pair!", "Looks like a syntax issue. Double-check line endings.", "Missing closing symbol. Try folding the code to spot it."],
    TypeError:      ["Type mismatch — make sure you're passing the right argument types.", "Null reference? Consider adding a null check before this call."],
    NameError:      ["Variable not defined. Did you declare it in the right scope?", "Check for typos in the variable name!"],
    ReferenceError: ["Variable not in scope. Verify it's imported/declared before use.", "Check for circular imports or missing exports."],
    TabError:       ["Mixed indentation detected. Run auto-format to fix this quickly."],
    default:        ["Try isolating the problematic section into a smaller test.", "Add console.log / print statements to trace the value here.", "Have you tried rubber-duck debugging? 🦆", "Check the docs — the API may have changed."],
  };
  const key = Object.keys(suggestions).find((k) => error.toLowerCase().includes(k.toLowerCase())) || "default";
  const pool = suggestions[key];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Styles injected once ──
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

  /* ── Modal overlay backdrop ── */
  .dbgm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0,0,0,.55);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: dbgmFadeIn .15s ease both;
  }
  @keyframes dbgmFadeIn { from{opacity:0} to{opacity:1} }

  /* ── Modal container ── */
  .dbgm-modal {
    font-family: var(--sans);
    width: min(700px, 95vw);
    height: min(480px, 90vh);
    background: #0f1219;
    border: 1px solid rgba(255,107,157,.18);
    border-radius: 14px;
    box-shadow: 0 24px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: dbgmSlideIn .18s cubic-bezier(.22,.9,.36,1) both;
  }
  @keyframes dbgmSlideIn { from{opacity:0;transform:translateY(14px) scale(.97)} to{opacity:1;transform:none} }

  /* ── Modal title bar ── */
  .dbgm-titlebar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    height: 46px;
    background: rgba(255,107,157,.05);
    border-bottom: 1px solid rgba(255,107,157,.1);
    flex-shrink: 0;
  }
  .dbgm-titlebar-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--pink);
    box-shadow: 0 0 7px var(--pink);
    flex-shrink: 0;
  }
  .dbgm-title {
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 700;
    color: var(--pink);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dbgm-spacer { flex: 1; }
  .dbgm-issues-badge {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
    padding: 2px 9px;
    border-radius: 5px;
    background: rgba(255,255,255,.03);
    border: 1px solid var(--bdr);
  }
  .dbgm-issues-badge span { color: var(--text2); }
  .dbgm-bots-row { display: flex; gap: 4px; align-items: center; }
  .dbgm-bot-avatar {
    width: 24px; height: 24px;
    border-radius: 6px;
    font-family: var(--mono);
    font-size: 8px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    transition: transform .15s;
    cursor: default;
  }
  .dbgm-bot-avatar:hover { transform: scale(1.1); }
  .dbgm-close-btn {
    width: 24px; height: 24px;
    border-radius: 6px;
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.09);
    color: var(--muted);
    font-size: 12px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all .15s;
    flex-shrink: 0;
  }
  .dbgm-close-btn:hover { background: rgba(255,107,157,.15); border-color: rgba(255,107,157,.3); color: var(--pink); }

  /* ── Body: left + right ── */
  .dbgm-body {
    flex: 1;
    display: grid;
    grid-template-columns: 220px 1fr;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Left issues panel ── */
  .dbgm-left {
    background: rgba(255,255,255,.015);
    border-right: 1px solid var(--bdr);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .dbgm-left-head {
    padding: 9px 13px 7px;
    border-bottom: 1px solid var(--bdr2);
    flex-shrink: 0;
  }
  .dbgm-section-label {
    font-family: var(--mono);
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .dbgm-issues-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
  }
  .dbgm-issues-list::-webkit-scrollbar { width: 3px; }
  .dbgm-issues-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.07); border-radius: 2px; }
  .dbgm-issue-item {
    padding: 8px 10px;
    border-radius: 7px;
    margin-bottom: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background .12s, border-color .12s;
  }
  .dbgm-issue-item:hover { background: rgba(255,107,157,.06); border-color: rgba(255,107,157,.13); }
  .dbgm-issue-item.sel { background: rgba(255,107,157,.1); border-color: rgba(255,107,157,.3); }
  .dbgm-issue-top { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
  .dbgm-issue-num { font-family: var(--mono); font-size: 8.5px; color: var(--dim); margin-left: auto; }
  .dbgm-issue-text { font-family: var(--mono); font-size: 10px; line-height: 1.5; word-break: break-word; }
  .dbgm-err-badge {
    display: inline-flex; align-items: center;
    padding: 1px 5px; border-radius: 4px;
    font-size: 8.5px; font-weight: 700; font-family: var(--mono);
    background: rgba(255,107,157,.15); color: var(--pink);
    border: 1px solid rgba(255,107,157,.25);
  }
  .dbgm-warn-badge {
    display: inline-flex; align-items: center;
    padding: 1px 5px; border-radius: 4px;
    font-size: 8.5px; font-weight: 700; font-family: var(--mono);
    background: rgba(220,220,170,.12); color: var(--gold);
    border: 1px solid rgba(220,220,170,.2);
  }
  .dbgm-no-issues {
    text-align: center; padding: 28px 12px;
    color: var(--muted); font-size: 11px;
  }
  .dbgm-no-issues-icon { font-size: 22px; margin-bottom: 5px; }

  /* ── Footer stats ── */
  .dbgm-left-foot {
    padding: 8px 12px;
    border-top: 1px solid var(--bdr2);
    flex-shrink: 0;
  }
  .dbgm-stat-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .dbgm-stat-chip {
    display: flex; align-items: center; gap: 4px;
    font-family: var(--mono); font-size: 9.5px; color: var(--muted);
  }
  .dbgm-stat-chip span { color: var(--text2); }
  .dbgm-stat-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  /* ── Right chat panel ── */
  .dbgm-right {
    display: flex; flex-direction: column; overflow: hidden;
    background: var(--bg2);
  }
  .dbgm-chat-head {
    padding: 8px 14px;
    border-bottom: 1px solid var(--bdr);
    flex-shrink: 0;
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,107,157,.03);
  }
  .dbgm-chat-head-label {
    font-family: var(--mono); font-size: 9.5px; color: var(--pink);
    font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  }
  .dbgm-chat-issue-preview {
    font-family: var(--mono); font-size: 9.5px; color: var(--muted);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
  }
  .dbgm-chat-messages {
    flex: 1; overflow-y: auto;
    padding: 12px 14px;
    display: flex; flex-direction: column; gap: 7px;
  }
  .dbgm-chat-messages::-webkit-scrollbar { width: 3px; }
  .dbgm-chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,.07); border-radius: 2px; }
  .dbgm-sys-msg { text-align: center; padding: 3px 0; }
  .dbgm-sys-inner {
    display: inline-block;
    font-family: var(--mono); font-size: 9.5px; color: var(--muted);
    background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
    border-radius: 100px; padding: 2px 10px;
  }
  .dbgm-msg { display: flex; gap: 8px; animation: dbgFadeIn .18s ease both; }
  @keyframes dbgFadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
  .dbgm-avatar {
    width: 26px; height: 26px; border-radius: 7px;
    font-family: var(--mono); font-size: 8.5px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .dbgm-msg-content { max-width: 80%; }
  .dbgm-msg-name { font-size: 8.5px; color: var(--muted); margin-bottom: 2px; font-family: var(--mono); }
  .dbgm-bubble {
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
    border-radius: 7px 7px 7px 3px; padding: 7px 11px;
    font-size: 11.5px; line-height: 1.65; font-family: var(--sans); color: var(--text3);
  }
  .dbgm-bubble.me {
    background: rgba(79,193,255,.1); border-color: rgba(79,193,255,.22);
    border-radius: 7px 7px 3px 7px; color: #a8d8ff;
  }
  .dbgm-bubble.bot { background: rgba(255,107,157,.07); border-color: rgba(255,107,157,.18); color: #ffb3c6; }
  .dbgm-msg-time { font-size: 8.5px; color: var(--dim); margin-top: 2px; font-family: var(--mono); }
  .dbgm-fix-btn {
    display: inline-flex; align-items: center; gap: 4px;
    margin-top: 5px; padding: 2px 8px; border-radius: 5px;
    background: rgba(78,201,176,.12); border: 1px solid rgba(78,201,176,.3);
    color: var(--teal); font-size: 9.5px; font-weight: 700;
    font-family: var(--mono); cursor: pointer; transition: all .15s;
  }
  .dbgm-fix-btn:hover { background: rgba(78,201,176,.25); }

  /* ── Input row ── */
  .dbgm-input-row {
    display: flex; gap: 6px;
    padding: 9px 12px;
    border-top: 1px solid var(--bdr);
    flex-shrink: 0; background: var(--bg1);
  }
  .dbgm-input {
    flex: 1; background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.1); border-radius: 7px;
    padding: 8px 12px; color: var(--text3);
    font-size: 11.5px; font-family: var(--sans); outline: none; transition: border-color .15s;
  }
  .dbgm-input:focus { border-color: rgba(255,107,157,.4); }
  .dbgm-input::placeholder { color: var(--muted); }
  .dbgm-send-btn {
    padding: 8px 16px; border-radius: 7px;
    background: rgba(255,107,157,.15); border: 1px solid rgba(255,107,157,.35);
    color: var(--pink); font-size: 11px; font-weight: 700;
    font-family: var(--sans); cursor: pointer; transition: all .15s; white-space: nowrap;
  }
  .dbgm-send-btn:hover { background: rgba(255,107,157,.28); }

  /* ── Bottom status bar ── */
  .dbgm-statusbar {
    display: flex; align-items: center; gap: 14px;
    padding: 5px 16px;
    background: rgba(255,255,255,.02);
    border-top: 1px solid var(--bdr);
    flex-shrink: 0;
  }
  .dbgm-status-item {
    font-family: var(--mono); font-size: 9.5px; color: var(--muted);
    display: flex; align-items: center; gap: 4px;
  }
  .dbgm-status-item span { color: var(--text2); }
  .dbgm-live-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 5px var(--teal); }
  .dbgm-in-room { font-family: var(--mono); font-size: 9.5px; color: var(--teal); display: flex; align-items: center; gap: 4px; }

  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.35} }
  .pulse { animation: pulse 1.8s ease-in-out infinite; }

  @media (max-width: 560px) {
    .dbgm-body { grid-template-columns: 1fr; grid-template-rows: 160px 1fr; }
    .dbgm-left { border-right: none; border-bottom: 1px solid var(--bdr); }
    .dbgm-modal { height: min(560px, 92vh); }
  }
`;

// ═══════════════════════════════════════════════════════
// ════════ MODAL COMPONENT ═════════════════════════════
// ═══════════════════════════════════════════════════════
function DebuggingRoomModal({ isOpen, onClose, lang: initialLang = "ts" }) {
  const [lang, setLang] = useState(initialLang);
  const [errors]   = useState(SEED_ERRORS);
  const [warnings] = useState(SEED_WARNINGS);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [marked, setMarked] = useState(new Set());
  const messagesEndRef = useRef(null);
  const botTypingRef   = useRef(null);
  const styleInjected  = useRef(false);

  const me = { name: "You", color: "#4FC1FF", bg: "rgba(79,193,255,.18)", inits: "ME" };

  // Inject CSS once
  useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
    const tag = document.createElement("style");
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape" && isOpen) onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const allIssues = [
    ...errors.map((e)  => ({ type: "error",   text: e })),
    ...warnings.map((w) => ({ type: "warning", text: w })),
  ];

  // Bot auto-annotation when issue/lang changes
  useEffect(() => {
    if (!isOpen || allIssues.length === 0) return;
    const issue = allIssues[selectedIdx];
    if (!issue) return;

    const sysMsg = {
      id: Math.random().toString(36).slice(2),
      from: "system",
      text: `🔍 Debugging: ${issue.text.slice(0, 75)}${issue.text.length > 75 ? "…" : ""}`,
      t: nowTs(),
    };
    setMessages([sysMsg]);

    clearTimeout(botTypingRef.current);
    botTypingRef.current = setTimeout(() => {
      const bot = BOTS[0];
      const suggestion = generateBotAnnotation(issue.text);
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(36).slice(2), from: bot.name, color: bot.color, bg: bot.bg, inits: bot.inits, text: suggestion, t: nowTs(), isBot: true },
      ]);

      setTimeout(() => {
        const bot2 = BOTS[1];
        const langHint = `In ${LANGS[lang]?.n || lang}: ${
          issue.text.includes("line") ? "check the highlighted line first." : "validate your syntax tree structure."
        }`;
        setMessages((prev) => [
          ...prev,
          { id: Math.random().toString(36).slice(2), from: bot2.name, color: bot2.color, bg: bot2.bg, inits: bot2.inits, text: langHint, t: nowTs(), isBot: true },
        ]);
      }, 1600);
    }, 700);

    return () => clearTimeout(botTypingRef.current);
  }, [selectedIdx, lang, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const txt = inputVal.trim();
    if (!txt) return;
    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), from: me.name, color: me.color, bg: me.bg, inits: me.inits, text: txt, t: nowTs(), isMe: true },
    ]);
    setInputVal("");

    setTimeout(() => {
      const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
      const replies = [
        "Good point! Let me look at that section more carefully.",
        "Try wrapping that in a try-catch block first.",
        `In ${LANGS[lang]?.n || lang}, this pattern often causes issues with scope resolution.`,
        "Run a minimal reproduction — isolate just the broken part!",
        "Check if your dependencies are up to date. Version mismatches cause this.",
        "Did you try commenting it out and adding it back line by line?",
      ];
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(36).slice(2), from: bot.name, color: bot.color, bg: bot.bg, inits: bot.inits, text: replies[Math.floor(Math.random() * replies.length)], t: nowTs(), isBot: true },
      ]);
    }, 900 + Math.random() * 600);
  };

  const currentIssue = allIssues[selectedIdx];

  if (!isOpen) return null;

  return (
    <div className="dbgm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="dbgm-modal">

        {/* ── Title bar ── */}
        <div className="dbgm-titlebar">
          <div className="dbgm-titlebar-dot pulse" />
          <div className="dbgm-title">🐛 Real-Time Debugging Room</div>

          <div className="dbgm-spacer" />

          <div className="dbgm-issues-badge">
            {LANGS[lang]?.n || lang} · <span>{allIssues.length} issue{allIssues.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="dbgm-bots-row">
            {BOTS.map((b, i) => (
              <div
                key={i}
                className="dbgm-bot-avatar"
                style={{ background: b.bg, color: b.color, border: `1.5px solid ${b.color}44` }}
                title={b.name}
              >
                {b.inits}
              </div>
            ))}
          </div>

          <button className="dbgm-close-btn" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        {/* ── Body ── */}
        <div className="dbgm-body">

          {/* Left: issues list */}
          <div className="dbgm-left">
            <div className="dbgm-left-head">
              <div className="dbgm-section-label">Issues</div>
            </div>

            <div className="dbgm-issues-list">
              {allIssues.length === 0 ? (
                <div className="dbgm-no-issues">
                  <div className="dbgm-no-issues-icon">✓</div>
                  <div>No issues</div>
                  <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 3 }}>Code looks clean!</div>
                </div>
              ) : (
                allIssues.map((issue, i) => (
                  <div
                    key={i}
                    className={`dbgm-issue-item${selectedIdx === i ? " sel" : ""}`}
                    onClick={() => setSelectedIdx(i)}
                  >
                    <div className="dbgm-issue-top">
                      {issue.type === "error"
                        ? <span className="dbgm-err-badge">ERR</span>
                        : <span className="dbgm-warn-badge">WARN</span>}
                      <span className="dbgm-issue-num">#{i + 1}</span>
                    </div>
                    <div className="dbgm-issue-text" style={{ color: issue.type === "error" ? "#ff8090" : "var(--gold)" }}>
                      {issue.text.slice(0, 65)}{issue.text.length > 65 ? "…" : ""}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="dbgm-left-foot">
              <div className="dbgm-stat-row">
                <div className="dbgm-stat-chip">
                  <div className="dbgm-stat-dot" style={{ background: "var(--pink)" }} />
                  Errors: <span>{errors.length}</span>
                </div>
                <div className="dbgm-stat-chip">
                  <div className="dbgm-stat-dot" style={{ background: "var(--gold)" }} />
                  Warnings: <span>{warnings.length}</span>
                </div>
                <div className="dbgm-stat-chip" style={{ fontSize: 9 }}>
                  Lang: <span style={{ color: LANGS[lang]?.c }}>{LANGS[lang]?.n || lang}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: chat */}
          <div className="dbgm-right">
            <div className="dbgm-chat-head">
              <div className="dbgm-chat-head-label">Debug Chat</div>
              {currentIssue && (
                <div className="dbgm-chat-issue-preview">
                  {currentIssue.text.slice(0, 85)}{currentIssue.text.length > 85 ? "…" : ""}
                </div>
              )}
            </div>

            <div className="dbgm-chat-messages">
              {messages.map((msg) => {
                if (msg.from === "system") {
                  return (
                    <div key={msg.id} className="dbgm-sys-msg">
                      <span className="dbgm-sys-inner">{msg.text}</span>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className="dbgm-msg" style={{ flexDirection: msg.isMe ? "row-reverse" : "row" }}>
                    <div
                      className="dbgm-avatar"
                      style={{ background: msg.bg || "rgba(79,193,255,.18)", color: msg.color || "var(--blue)", border: `1.5px solid ${msg.color || "var(--blue)"}44` }}
                    >
                      {msg.inits || initials(msg.from)}
                    </div>
                    <div className="dbgm-msg-content">
                      <div className="dbgm-msg-name" style={{ textAlign: msg.isMe ? "right" : "left" }}>{msg.from}</div>
                      <div className={`dbgm-bubble${msg.isMe ? " me" : msg.isBot ? " bot" : ""}`}>
                        {msg.text}
                        {msg.isBot && (
                          <div>
                            <button
                              className="dbgm-fix-btn"
                              style={marked.has(msg.id) ? { opacity: .5, cursor: "default" } : {}}
                              onClick={() => setMarked((s) => new Set([...s, msg.id]))}
                            >
                              {marked.has(msg.id) ? "✓ Marked helpful" : "✓ Mark as helpful"}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="dbgm-msg-time" style={{ textAlign: msg.isMe ? "right" : "left" }}>{msg.t}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="dbgm-input-row">
              <input
                className="dbgm-input"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Describe what you're seeing, ask the team…"
              />
              <button className="dbgm-send-btn" onClick={sendMessage}>Send ↑</button>
            </div>
          </div>
        </div>

        {/* ── Status bar ── */}
        <div className="dbgm-statusbar">
          <div className="dbgm-live-dot" />
          <div className="dbgm-in-room">{1 + BOTS.length} in room</div>
          <div style={{ flex: 1 }} />
          <div className="dbgm-status-item">Errors: <span style={{ color: "var(--pink)" }}>{errors.length}</span></div>
          <div className="dbgm-status-item">Warnings: <span style={{ color: "var(--gold)" }}>{warnings.length}</span></div>
          <div className="dbgm-status-item">Lang: <span style={{ color: LANGS[lang]?.c }}>{LANGS[lang]?.n || lang}</span></div>
        </div>

      </div>
    </div>
  );
}

export default function DebuggingRoomPage() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <DebuggingRoomModal
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        navigate("/", { replace: true });
      }}
    />
  );
}