import { useState, useRef, useEffect } from "react";

const TEMPLATES = [
  { level: "INFO",    svc: "api-gateway",  msg: "GET /api/status 200 12ms" },
  { level: "INFO",    svc: "ws-server",    msg: "Client connected [id: {id}]" },
  { level: "INFO",    svc: "db-pool",      msg: "Query executed in {n}ms — rows: {r}" },
  { level: "SUCCESS", svc: "auth-svc",     msg: "Token validated for user:{id}" },
  { level: "INFO",    svc: "cache",        msg: "HIT ratio: {n}% — evictions: {r}" },
  { level: "DEBUG",   svc: "scheduler",    msg: "Job run:{id} queued (next: {n}s)" },
  { level: "WARN",    svc: "api-gateway",  msg: "Rate limit approaching — {n} req/s" },
  { level: "WARN",    svc: "db-pool",      msg: "Slow query detected: {n}ms" },
  { level: "ERROR",   svc: "api-gateway",  msg: "POST /api/ingest 500 — timeout after {n}ms" },
  { level: "ERROR",   svc: "auth-svc",     msg: "Invalid token — revoked session:{id}" },
  { level: "ERROR",   svc: "db-pool",      msg: "Connection pool exhausted — {n} waiting" },
  { level: "INFO",    svc: "ws-server",    msg: "OT op broadcast — ver:{n} clients:{r}" },
  { level: "SUCCESS", svc: "cache",        msg: "Cache warmed — {n} keys loaded" },
  { level: "DEBUG",   svc: "scheduler",    msg: "Health check OK — uptime {n}s" },
];

function nowTs() {
  return new Date().toLocaleTimeString("en", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function genEntry() {
  const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  const id = Math.random().toString(36).slice(2, 7);
  const n = Math.floor(Math.random() * 900 + 10);
  const r = Math.floor(Math.random() * 200 + 1);
  const msg = t.msg.replace(/\{id\}/g, id).replace(/\{n\}/g, n).replace(/\{r\}/g, r);
  return { level: t.level, svc: t.svc, msg, t: nowTs(), id: Math.random().toString(36).slice(2) };
}

const LEVEL_COLORS = {
  INFO:    { pill: "rgba(79,193,255,.15)",  text: "#4FC1FF", border: "transparent" },
  SUCCESS: { pill: "rgba(78,201,176,.15)",  text: "#4EC9B0", border: "transparent" },
  WARN:    { pill: "rgba(220,220,170,.15)", text: "#DCDCAA", border: "transparent" },
  ERROR:   { pill: "rgba(255,107,157,.2)",  text: "#FF6B9D", border: "transparent" },
  DEBUG:   { pill: "rgba(197,134,192,.15)", text: "#C586C0", border: "transparent" },
};

const FILTER_ACTIVE = {
  ALL:     { border: "#4a5568",  color: "#c8d0e0", bg: "#1a1f2e" },
  INFO:    { border: "#4FC1FF",  color: "#4FC1FF", bg: "rgba(79,193,255,.08)" },
  SUCCESS: { border: "#4EC9B0",  color: "#4EC9B0", bg: "rgba(78,201,176,.08)" },
  WARN:    { border: "#DCDCAA",  color: "#DCDCAA", bg: "rgba(220,220,170,.08)" },
  ERROR:   { border: "#FF6B9D",  color: "#FF6B9D", bg: "rgba(255,107,157,.08)" },
  DEBUG:   { border: "#C586C0",  color: "#C586C0", bg: "rgba(197,134,192,.08)" },
};

function highlight(text, q) {
  if (!q) return <>{text}</>;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === q.toLowerCase()
          ? <mark key={i} style={{ background: "rgba(220,220,170,.25)", color: "#DCDCAA", borderRadius: 2 }}>{p}</mark>
          : p
      )}
    </>
  );
}

export default function LiveServerLogs({ onClose }) {
  const [logs, setLogs] = useState(() => Array.from({ length: 18 }, genEntry));
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const pausedRef = useRef(false);
  const streamEndRef = useRef(null);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      const count = Math.random() > 0.65 ? 2 : 1;
      setLogs(prev => [...Array.from({ length: count }, genEntry), ...prev].slice(0, 300));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (autoScroll && !paused && streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, paused]);

  const filtered = logs.filter(e => {
    const fm = filter === "ALL" || e.level === filter;
    const sm = !search || e.msg.toLowerCase().includes(search.toLowerCase()) || e.svc.includes(search.toLowerCase());
    return fm && sm;
  });

  const counts = logs.reduce((acc, e) => { acc[e.level] = (acc[e.level] || 0) + 1; return acc; }, {});
  const errRate = (((counts.ERROR || 0) / Math.max(logs.length, 1)) * 100).toFixed(1);

  const s = {
    wrap: { fontFamily: "'Courier New', monospace", background: "#0d0f14", overflow: "hidden", display: "flex", flexDirection: "column", width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 9999 },
    hd: { display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderBottom: "1px solid #1a1d27", background: "#0a0c10", flexShrink: 0 },
    liveDot: (p) => ({ width: 9, height: 9, borderRadius: "50%", background: p ? "#3a3f52" : "#4EC9B0", boxShadow: p ? "none" : "0 0 6px #4EC9B0", flexShrink: 0, transition: "all .3s" }),
    title: { fontSize: 14, fontWeight: 700, color: "#c8d0e0", letterSpacing: ".04em", flexShrink: 0, marginRight: 8 },
    filterBtn: (lv, active) => ({
      fontSize: 10, padding: "2px 8px", borderRadius: 4,
      border: `1px solid ${active ? FILTER_ACTIVE[lv].border : "#2a2f3f"}`,
      background: active ? FILTER_ACTIVE[lv].bg : "transparent",
      color: active ? FILTER_ACTIVE[lv].color : "#4a5568",
      cursor: "pointer", letterSpacing: ".04em", lineHeight: 1.6, fontFamily: "inherit",
    }),
    closeBtn: { marginLeft: "auto", fontSize: 11, color: "#3a4055", background: "rgba(255,255,255,.04)", border: "1px solid #1e2330", borderRadius: 4, padding: "2px 7px", cursor: "pointer", flexShrink: 0 },
    statsBar: { display: "flex", alignItems: "center", gap: 16, padding: "6px 24px", background: "#080a0e", borderBottom: "1px solid #111318", flexShrink: 0, flexWrap: "wrap" },
    stat: { display: "flex", alignItems: "center", gap: 5, fontSize: 11 },
    dot: (c) => ({ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }),
    colHdr: { display: "flex", padding: "5px 24px", borderBottom: "1px solid rgba(255,255,255,.04)", background: "#0a0c10", flexShrink: 0 },
    colSpan: { fontSize: 10, color: "#2d3748", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" },
    stream: { flex: 1, overflowY: "auto", background: "#0d0f14" },
    logRow: (lv) => ({
      display: "flex", alignItems: "center", padding: "5px 24px",
      borderBottom: "1px solid rgba(255,255,255,.025)",
      borderLeft: lv === "ERROR" ? "2px solid rgba(255,107,157,.3)" : lv === "WARN" ? "2px solid rgba(220,220,170,.2)" : "2px solid transparent",
      fontSize: 12,
    }),
    ts: { width: 100, color: "#3a4055", flexShrink: 0, fontSize: 11 },
    pillWrap: { width: 72, flexShrink: 0 },
    pill: (lv) => ({ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 3, letterSpacing: ".06em", background: LEVEL_COLORS[lv].pill, color: LEVEL_COLORS[lv].text }),
    svc: { width: 120, flexShrink: 0, color: "#5a6580", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    msg: (lv) => ({ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: LEVEL_COLORS[lv].text }),
    footer: { display: "flex", alignItems: "center", gap: 10, padding: "8px 24px", borderTop: "1px solid #1a1d27", background: "#0a0c10", flexShrink: 0 },
    streamLbl: (p) => ({ fontSize: 11, fontWeight: 700, color: p ? "#3a3f52" : "#4EC9B0" }),
    search: { background: "#090b0f", border: "1px solid #1e2330", borderRadius: 4, color: "#8892a4", fontSize: 12, fontFamily: "inherit", padding: "5px 10px", width: 220, outline: "none" },
    pauseBtn: (p) => ({ fontSize: 11, fontFamily: "inherit", padding: "4px 14px", borderRadius: 4, background: p ? "rgba(74,85,104,.1)" : "rgba(78,201,176,.08)", border: `1px solid ${p ? "#3a3f52" : "rgba(78,201,176,.3)"}`, color: p ? "#5a6580" : "#4EC9B0", cursor: "pointer" }),
    clearBtn: { fontSize: 11, fontFamily: "inherit", padding: "4px 14px", borderRadius: 4, background: "transparent", border: "1px solid #1e2330", color: "#3a4055", cursor: "pointer" },
    empty: { padding: 30, textAlign: "center", color: "#2d3748", fontSize: 12 },
  };

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.hd}>
        <div style={s.liveDot(paused)} />
        <div style={s.title}>📡 Live Server Logs Dashboard</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["ALL", "INFO", "SUCCESS", "WARN", "ERROR", "DEBUG"].map(lv => (
            <button key={lv} style={s.filterBtn(lv, filter === lv)} onClick={() => setFilter(lv)}>
              {lv}
              {lv !== "ALL" && counts[lv] ? <span style={{ marginLeft: 3, opacity: .7 }}>({counts[lv]})</span> : null}
            </button>
          ))}
        </div>
        {onClose && <button style={s.closeBtn} onClick={onClose}>✕</button>}
      </div>

      {/* Stats bar */}
      <div style={s.statsBar}>
        {[
          { lbl: "ERR",  color: "#FF6B9D", val: counts.ERROR   || 0 },
          { lbl: "WARN", color: "#DCDCAA", val: counts.WARN    || 0 },
          { lbl: "OK",   color: "#4EC9B0", val: counts.SUCCESS || 0 },
          { lbl: "INFO", color: "#4FC1FF", val: counts.INFO    || 0 },
          { lbl: "DBG",  color: "#C586C0", val: counts.DEBUG   || 0 },
        ].map(({ lbl, color, val }) => (
          <div key={lbl} style={s.stat}>
            <div style={s.dot(color)} />
            <span style={{ color: "#2d3748" }}>{lbl}</span>
            <span style={{ fontWeight: 700, color }}>{val}</span>
          </div>
        ))}
        <div style={{ ...s.stat, marginLeft: "auto" }}>
          <span style={{ color: "#2d3748" }}>Total:</span>
          <span style={{ fontWeight: 700, color: "#c8d0e0" }}>{logs.length}</span>
        </div>
        <div style={s.stat}>
          <span style={{ color: "#2d3748" }}>Err rate:</span>
          <span style={{ fontWeight: 700, color: parseFloat(errRate) > 5 ? "#FF6B9D" : "#4EC9B0" }}>{errRate}%</span>
        </div>
      </div>

      {/* Column headers */}
      <div style={s.colHdr}>
        <span style={{ ...s.colSpan, width: 100 }}>Time</span>
        <span style={{ ...s.colSpan, width: 72 }}>Level</span>
        <span style={{ ...s.colSpan, width: 120 }}>Service</span>
        <span style={{ ...s.colSpan, flex: 1 }}>Message</span>
      </div>

      {/* Log stream */}
      <div
        style={s.stream}
        onScroll={e => {
          const el = e.target;
          setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
        }}
      >
        {filtered.length === 0
          ? <div style={s.empty}>No matching log entries</div>
          : [...filtered].reverse().map((entry, i) => (
            <div key={entry.id} style={{ ...s.logRow(entry.level), animationDelay: `${Math.min(i * 0.02, 0.3)}s` }}>
              <span style={s.ts}>{entry.t}</span>
              <span style={s.pillWrap}><span style={s.pill(entry.level)}>{entry.level}</span></span>
              <span style={s.svc} title={entry.svc}>{entry.svc}</span>
              <span style={s.msg(entry.level)}>{highlight(entry.msg, search)}</span>
            </div>
          ))
        }
        <div ref={streamEndRef} />
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: paused ? "#3a3f52" : "#4EC9B0" }} />
          <span style={s.streamLbl(paused)}>{paused ? "PAUSED" : "STREAMING"}</span>
        </div>
        <input
          style={s.search}
          placeholder="Search logs…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "#2d3748" }}>{filtered.length} / {logs.length} entries</span>
        <button style={s.pauseBtn(paused)} onClick={() => setPaused(p => !p)}>
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>
        <button style={s.clearBtn} onClick={() => setLogs([])}>Clear</button>
      </div>
    </div>
  );
}