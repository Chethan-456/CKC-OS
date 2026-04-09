import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════
// ════════ LIVE SERVER LOGS COMPONENT ══════════════════
// ═══════════════════════════════════════════════════════

function nowTs() {
  return new Date().toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const LOG_TEMPLATES = [
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

function genLogEntry() {
  const t = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
  const id = Math.random().toString(36).slice(2, 7);
  const n = Math.floor(Math.random() * 900 + 10);
  const r = Math.floor(Math.random() * 200 + 1);
  const msg = t.msg
    .replace(/\{id\}/g, id)
    .replace(/\{n\}/g, n)
    .replace(/\{r\}/g, r);
  return {
    level: t.level,
    svc: t.svc,
    msg,
    t: nowTs(),
    id: Math.random().toString(36).slice(2),
  };
}

export default function LiveServerLogs({ onClose }) {
  const [logs, setLogs] = useState(() =>
    Array.from({ length: 18 }, genLogEntry).reverse()
  );
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const streamRef = useRef(null);
  const logsEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    streamRef.current = setInterval(() => {
      if (pausedRef.current) return;
      const count = Math.random() > 0.65 ? 2 : 1;
      setLogs((prev) => {
        const newEntries = Array.from({ length: count }, genLogEntry);
        return [...newEntries, ...prev].slice(0, 300);
      });
    }, 1200);
    return () => clearInterval(streamRef.current);
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current && !paused) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, paused]);

  const filteredLogs = logs.filter((e) => {
    const matchesFilter = filter === "ALL" || e.level === filter;
    const matchesSearch =
      !search ||
      e.msg.toLowerCase().includes(search.toLowerCase()) ||
      e.svc.includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = logs.reduce((acc, e) => {
    acc[e.level] = (acc[e.level] || 0) + 1;
    return acc;
  }, {});
  const errRate = (((counts.ERROR || 0) / Math.max(logs.length, 1)) * 100).toFixed(1);

  return (
    <div className="logs-overlay" onClick={onClose}>
      <div
        className="logs-panel announce-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="logs-head">
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: paused ? "#4a5568" : "#4EC9B0",
              boxShadow: paused ? "none" : "0 0 8px #4EC9B0",
              flexShrink: 0,
              transition: "all .3s",
            }}
            className={paused ? "" : "pulse"}
          />
          <div className="logs-title">📡 Live Server Logs Dashboard</div>
          <div className="logs-controls">
            {["ALL", "INFO", "SUCCESS", "WARN", "ERROR", "DEBUG"].map((lv) => (
              <button
                key={lv}
                className={`log-filter-btn${filter === lv ? ` active-${lv}` : ""}`}
                onClick={() => setFilter(lv)}
              >
                {lv === "ALL" ? "All" : lv}
                {lv !== "ALL" && counts[lv] ? (
                  <span style={{ marginLeft: 3, opacity: 0.7 }}>
                    ({counts[lv] || 0})
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <button
            className="err-close"
            onClick={onClose}
            style={{
              marginLeft: 8,
              color: "#4a5568",
              background: "rgba(255,255,255,.05)",
              borderColor: "rgba(255,255,255,.1)",
            }}
          >
            ✕
          </button>
        </div>

        <div className="logs-body">
          {/* Stats bar */}
          <div className="logs-stats-bar">
            <div className="logs-stat-item" style={{ color: "#FF6B9D" }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#FF6B9D",
                  display: "inline-block",
                  boxShadow:
                    (counts.ERROR || 0) > 0 ? "0 0 5px #FF6B9D" : "none",
                }}
              />
              <span style={{ color: "#4a5568" }}>ERR</span> {counts.ERROR || 0}
            </div>
            <div className="logs-stat-item" style={{ color: "#DCDCAA" }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#DCDCAA",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#4a5568" }}>WARN</span>{" "}
              {counts.WARN || 0}
            </div>
            <div className="logs-stat-item" style={{ color: "#4EC9B0" }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#4EC9B0",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#4a5568" }}>OK</span>{" "}
              {counts.SUCCESS || 0}
            </div>
            <div className="logs-stat-item" style={{ color: "#4FC1FF" }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#4FC1FF",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#4a5568" }}>INFO</span>{" "}
              {counts.INFO || 0}
            </div>
            <div className="logs-stat-item" style={{ color: "#C586C0" }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#C586C0",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#4a5568" }}>DBG</span>{" "}
              {counts.DEBUG || 0}
            </div>
            <div
              className="logs-stat-item"
              style={{ marginLeft: "auto", color: "#4a5568" }}
            >
              Total: <span style={{ color: "#e0e0e0" }}>{logs.length}</span>
            </div>
            <div
              className="logs-stat-item"
              style={{
                color:
                  parseFloat(errRate) > 5 ? "#FF6B9D" : "#4a5568",
              }}
            >
              Err rate:{" "}
              <span
                style={{
                  color:
                    parseFloat(errRate) > 5 ? "#FF6B9D" : "#4EC9B0",
                }}
              >
                {errRate}%
              </span>
            </div>
          </div>

          {/* Log stream */}
          <div
            className="logs-stream"
            onScroll={(e) => {
              const el = e.target;
              const atBottom =
                el.scrollHeight - el.scrollTop - el.clientHeight < 40;
              setAutoScroll(atBottom);
            }}
          >
            {/* Column header */}
            <div
              style={{
                display: "flex",
                padding: "3px 14px 3px",
                borderBottom: "1px solid rgba(255,255,255,.04)",
                position: "sticky",
                top: 0,
                background: "#0a0c11",
                zIndex: 2,
              }}
            >
              <span
                style={{
                  width: 82,
                  fontSize: 9,
                  color: "#2d3748",
                  fontFamily: "var(--mono)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                Time
              </span>
              <span
                style={{
                  width: 58,
                  fontSize: 9,
                  color: "#2d3748",
                  fontFamily: "var(--mono)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                Level
              </span>
              <span
                style={{
                  width: 90,
                  fontSize: 9,
                  color: "#2d3748",
                  fontFamily: "var(--mono)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                Service
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 9,
                  color: "#2d3748",
                  fontFamily: "var(--mono)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                Message
              </span>
            </div>

            {filteredLogs.length === 0 && (
              <div
                style={{
                  padding: "30px",
                  textAlign: "center",
                  color: "#4a5568",
                  fontSize: 12,
                }}
              >
                No matching log entries
              </div>
            )}

            {[...filteredLogs].reverse().map((entry, i) => (
              <div
                key={entry.id}
                className={`log-entry ${entry.level} log-slide`}
                style={{ animationDelay: `${Math.min(i * 0.02, 0.3)}s` }}
              >
                <span className="log-ts">{entry.t}</span>
                <span className="log-level-pill">
                  <span className={`log-level-inner ${entry.level}`}>
                    {entry.level}
                  </span>
                </span>
                <span className="log-svc" title={entry.svc}>
                  {entry.svc}
                </span>
                <span className={`log-msg ${entry.level}`}>
                  {search ? (
                    entry.msg
                      .split(new RegExp(`(${search})`, "gi"))
                      .map((part, pi) =>
                        part.toLowerCase() === search.toLowerCase() ? (
                          <mark
                            key={pi}
                            style={{
                              background: "rgba(220,220,170,.3)",
                              color: "#DCDCAA",
                              borderRadius: 2,
                            }}
                          >
                            {part}
                          </mark>
                        ) : (
                          part
                        )
                      )
                  ) : (
                    entry.msg
                  )}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Footer */}
        <div className="logs-foot">
          <div
            className={`logs-streaming-dot${paused ? " paused" : ""}`}
          />
          <span
            style={{
              fontSize: 10,
              color: paused ? "#4a5568" : "#4EC9B0",
              fontWeight: 700,
            }}
          >
            {paused ? "PAUSED" : "STREAMING"}
          </span>
          <input
            className="log-search"
            placeholder="Search logs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "#4a5568" }}>
            {filteredLogs.length} / {logs.length} entries
          </span>
          <button
            className={`logs-pause-btn${paused ? " paused" : ""}`}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button className="logs-clear-btn" onClick={() => setLogs([])}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}