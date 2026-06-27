import React, { useState, useEffect, useRef } from "react";
import { genLogEntry } from "../../utils/editor/helpers.js";
// ═══════════ LIVE SERVER LOGS ═══════════
function LiveServerLogs({ onClose }) {
  const [logs, setLogs] = useState(() => Array.from({ length: 18 }, genLogEntry).reverse());
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const streamRef = useRef(null);
  const logsEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    streamRef.current = setInterval(() => {
      if (pausedRef.current) return;
      const count = Math.random() > 0.65 ? 2 : 1;
      setLogs(prev => [...Array.from({ length: count }, genLogEntry), ...prev].slice(0, 300));
    }, 1200);
    return () => clearInterval(streamRef.current);
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current && !paused) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs, autoScroll, paused]);

  const filteredLogs = logs.filter(e => {
    const matchesFilter = filter === "ALL" || e.level === filter;
    const matchesSearch = !search || e.msg.toLowerCase().includes(search.toLowerCase()) || e.svc.includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = logs.reduce((acc, e) => { acc[e.level] = (acc[e.level] || 0) + 1; return acc; }, {});
  const errRate = ((counts.ERROR || 0) / Math.max(logs.length, 1) * 100).toFixed(1);

  return (
    <div className="logs-overlay" onClick={onClose}>
      <div className="logs-panel announce-pop" onClick={e => e.stopPropagation()}>
        <div className="logs-head">
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: paused ? "#4a5568" : "#4EC9B0", boxShadow: paused ? "none" : "0 0 8px #4EC9B0", flexShrink: 0, transition: "all .3s" }} className={paused ? "" : "pulse"} />
          <div className="logs-title">📡 Live Server Logs</div>
          <div className="logs-controls">
            {["ALL", "INFO", "SUCCESS", "WARN", "ERROR", "DEBUG"].map(lv => (
              <button key={lv} className={`log-filter-btn${filter === lv ? ` active-${lv}` : ""}`} onClick={() => setFilter(lv)}>
                {lv === "ALL" ? "All" : lv}{lv !== "ALL" && counts[lv] ? <span style={{ marginLeft: 3, opacity: .7 }}>({counts[lv] || 0})</span> : null}
              </button>
            ))}
          </div>
          <button className="err-close" onClick={onClose} style={{ marginLeft: 8, color: "#4a5568", background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.1)", flexShrink: 0 }}>✕</button>
        </div>
        <div className="logs-body">
          <div className="logs-stats-bar">
            {[["ERROR","#FF6B9D"],["WARN","#DCDCAA"],["SUCCESS","#4EC9B0"],["INFO","#4FC1FF"],["DEBUG","#C586C0"]].map(([lv,col]) => (
              <div key={lv} className="logs-stat-item" style={{ color: col }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: col, display: "inline-block" }} />
                <span style={{ color: "#4a5568" }}>{lv.slice(0,3)}</span> {counts[lv] || 0}
              </div>
            ))}
            <div className="logs-stat-item" style={{ marginLeft: "auto", color: "#4a5568" }}>Total: <span style={{ color: "#e0e0e0" }}>{logs.length}</span></div>
            <div className="logs-stat-item" style={{ color: parseFloat(errRate) > 5 ? "#FF6B9D" : "#4a5568" }}>Err%: <span style={{ color: parseFloat(errRate) > 5 ? "#FF6B9D" : "#4EC9B0" }}>{errRate}%</span></div>
          </div>
          <div className="logs-stream" onScroll={e => { const el = e.target; setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40); }}>
            <div style={{ display: "flex", padding: "3px 14px", borderBottom: "1px solid rgba(255,255,255,.04)", position: "sticky", top: 0, background: "#0a0c11", zIndex: 2 }}>
              <span style={{ width: 82, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase" }}>Time</span>
              <span style={{ width: 58, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase" }}>Level</span>
              <span style={{ width: 90, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase" }}>Service</span>
              <span style={{ flex: 1, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase" }}>Message</span>
            </div>
            {filteredLogs.length === 0 && <div style={{ padding: "30px", textAlign: "center", color: "#4a5568", fontSize: 12 }}>No matching log entries</div>}
            {[...filteredLogs].reverse().map((entry, i) => (
              <div key={entry.id} className={`log-entry ${entry.level} log-slide`} style={{ animationDelay: `${Math.min(i * 0.02, 0.3)}s` }}>
                <span className="log-ts">{entry.t}</span>
                <span className="log-level-pill"><span className={`log-level-inner ${entry.level}`}>{entry.level}</span></span>
                <span className="log-svc" title={entry.svc}>{entry.svc}</span>
                <span className={`log-msg ${entry.level}`}>
                  {search ? entry.msg.split(new RegExp(`(${search})`, "gi")).map((part, pi) =>
                    part.toLowerCase() === search.toLowerCase()
                      ? <mark key={pi} style={{ background: "rgba(220,220,170,.3)", color: "#DCDCAA", borderRadius: 2 }}>{part}</mark>
                      : part
                  ) : entry.msg}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
        <div className="logs-foot">
          <div className={`logs-streaming-dot${paused ? " paused" : ""}`} />
          <span style={{ fontSize: 10, color: paused ? "#4a5568" : "#4EC9B0", fontWeight: 700 }}>{paused ? "PAUSED" : "STREAMING"}</span>
          <input className="log-search" placeholder="Search logs…" value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "#4a5568" }}>{filteredLogs.length}/{logs.length}</span>
          <button className={`logs-pause-btn${paused ? " paused" : ""}`} onClick={() => setPaused(p => !p)}>{paused ? "▶ Resume" : "⏸ Pause"}</button>
          <button className="logs-clear-btn" onClick={() => setLogs([])}>Clear</button>
        </div>
      </div>
    </div>
  );
}

