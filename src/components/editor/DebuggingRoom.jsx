import React, { useState, useEffect, useRef } from "react";
import { generateBotAnnotation, nowTs } from "../../utils/editor/helpers.js";
// ═══════════ DEBUGGING ROOM ═══════════
export function DebuggingRoom({ errors, warnings, lang, me, onLocalOp, onClose }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef(null);
  const botTypingRef = useRef(null);
  const channelRef = useRef(null);

  const allIssues = [
    ...errors.map(e => ({ type: "error", text: e })),
    ...warnings.map(w => ({ type: "warning", text: w })),
  ];

  useEffect(() => {
    if (allIssues.length === 0) return;
    const issue = allIssues[selectedIdx];
    if (!issue) return;
    const sysMsg = { id: Math.random().toString(36).slice(2), from: "system", text: `🔍 Debugging: ${issue.text.slice(0, 80)}${issue.text.length > 80 ? "…" : ""}`, t: nowTs() };
    setMessages([sysMsg]);
    clearTimeout(botTypingRef.current);
    botTypingRef.current = setTimeout(() => {
      const bot = BOTS[0];
      const suggestion = generateBotAnnotation(issue.text, lang);
      setMessages(prev => [...prev, { id: Math.random().toString(36).slice(2), from: bot.name, color: bot.color, bg: bot.bg, inits: bot.inits, text: suggestion, t: nowTs(), isBot: true }]);
      setTimeout(() => {
        const bot2 = BOTS[1];
        const langHint = `In ${LANGS[lang]?.n || lang}: ${issue.text.includes("line") ? "check the highlighted line first." : "validate your syntax tree structure."}`;
        setMessages(prev => [...prev, { id: Math.random().toString(36).slice(2), from: bot2.name, color: bot2.color, bg: bot2.bg, inits: bot2.inits, text: langHint, t: nowTs(), isBot: true }]);
      }, 1600);
    }, 700);
    return () => clearTimeout(botTypingRef.current);
  }, [selectedIdx, lang]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const channel = supabase.channel(`debug:${lang}`);
    channelRef.current = channel;
    channel.on("broadcast", { event: "msg" }, ({ payload }) => { setMessages(prev => [...prev, payload]); }).subscribe();
    return () => channel.unsubscribe();
  }, [lang]);

  const sendMessage = (txt = inputVal.trim()) => {
    if (!txt) return;
    const msg = { id: Math.random().toString(36).slice(2), from: me.name, color: me.cursorColor, bg: me.bg, inits: initials(me.name), text: txt, t: nowTs(), isMe: true };
    setMessages(prev => [...prev, msg]);
    channelRef.current?.send({ type: "broadcast", event: "msg", payload: { ...msg, isMe: false } });
    setInputVal("");
  };

  const totalIssues = allIssues.length;

  return (
    <div className="dbg-room-overlay" onClick={onClose}>
      <div className="dbg-room announce-pop" onClick={e => e.stopPropagation()}>
        <div className="dbg-room-head">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF6B9D", boxShadow: "0 0 8px #FF6B9D", display: "inline-block", flexShrink: 0 }} className="pulse" />
          <div className="dbg-room-title">🐛 Real-Time Debugging Room</div>
          <span style={{ fontSize: 10, color: "#4a5568", fontFamily: "var(--mono)", background: "rgba(255,255,255,.04)", padding: "2px 8px", borderRadius: 4 }}>
            ${LANGS[lang]?.n || lang} · ${totalIssues} issue${totalIssues !== 1 ? "s" : ""}
          </span>
          <button className="err-close" onClick={onClose} style={{ marginLeft: 4 }}>✕</button>
        </div>
        <div className="dbg-room-body">
          <div className="dbg-errors-panel">
            <div style={{ fontSize: 9, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", padding: "2px 4px 6px" }}>Issues</div>
            {allIssues.length === 0 && (
              <div style={{ fontSize: 11, color: "#4a5568", textAlign: "center", padding: "20px 8px" }}>✓ No issues<br /><span style={{ fontSize: 10, color: "#2d3748" }}>Code looks clean!</span></div>
            )}
            {allIssues.map((issue, i) => (
              <div key={i} className={`dbg-error-item${selectedIdx === i ? " sel" : ""}`} onClick={() => setSelectedIdx(i)}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  {issue.type === "error" ? <span className="err-type-badge">ERR</span> : <span className="warn-type-badge">WARN</span>}
                  <span style={{ fontSize: 9, color: "#4a5568", fontFamily: "var(--mono)", marginLeft: "auto" }}>#${i + 1}</span>
                </div>
                <div style={{ fontSize: 10, color: issue.type === "error" ? "#ff8090" : "#DCDCAA", fontFamily: "var(--mono)", lineHeight: 1.5, wordBreak: "break-word" }}>
                  {issue.text.slice(0, 70)}{issue.text.length > 70 ? "…" : ""}
                </div>
              </div>
            ))}
          </div>
          <div className="dbg-chat-panel">
            <div className="dbg-chat-messages">
              {messages.map(msg => {
                if (msg.from === "system") return (
                  <div key={msg.id} style={{ textAlign: "center", padding: "4px 0" }}>
                    <span style={{ fontSize: 10, color: "#4a5568", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 100, padding: "2px 10px", fontFamily: "var(--mono)" }}>{msg.text}</span>
                  </div>
                );
                return (
                  <div key={msg.id} className="dbg-msg" style={{ flexDirection: msg.isMe ? "row-reverse" : "row" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: msg.bg || "rgba(79,193,255,.18)", color: msg.color || "#4FC1FF", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", flexShrink: 0, border: `1.5px solid ${msg.color || "#4FC1FF"}44` }}>{msg.inits || initials(msg.from)}</div>
                    <div style={{ maxWidth: "78%" }}>
                      <div style={{ fontSize: 9, color: "#4a5568", marginBottom: 2, textAlign: msg.isMe ? "right" : "left" }}>{msg.from}</div>
                      <div className={`dbg-msg-bubble${msg.isMe ? " me" : msg.isBot ? " bot" : ""}`}>
                        <span style={{ color: msg.isMe ? "#a8d8ff" : msg.isBot ? "#ffb3c6" : "#e0e0e0" }}>{msg.text}</span>
                        {msg.isBot && (<div><button className="dbg-fix-btn">✓ Mark as helpful</button></div>)}
                      </div>
                      <div className="dbg-msg-time" style={{ textAlign: msg.isMe ? "right" : "left" }}>{msg.t}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="dbg-chat-input-row">
              <input className="dbg-chat-input" value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Describe what you're seeing, ask the team…" />
              <button className="dbg-send-btn" onClick={() => sendMessage()}>Send ↑</button>
            </div>
          </div>
        </div>
        <div className="dbg-room-foot">
          <div style={{ flex: 1 }} />
          <div className="dbg-stat">Errors: <span style={{ color: "#FF6B9D" }}>{errors.length}</span></div>
          <div className="dbg-stat">Warnings: <span style={{ color: "#DCDCAA" }}>{warnings.length}</span></div>
          <div className="dbg-stat">Lang: <span>{LANGS[lang]?.n || lang}</span></div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#4EC9B0" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4EC9B0", boxShadow: "0 0 5px #4EC9B0" }} />
            {1 + BOTS.length} in room
          </div>
        </div>
      </div>
    </div>
  );
}

