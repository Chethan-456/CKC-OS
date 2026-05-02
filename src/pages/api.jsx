import { useState, useEffect, useRef, useCallback } from "react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
const METHOD_COLORS = {
  GET: "#22d3ee",
  POST: "#4ade80",
  PUT: "#facc15",
  PATCH: "#fb923c",
  DELETE: "#f87171",
  OPTIONS: "#c084fc",
  HEAD: "#94a3b8",
};

const TEAM_MEMBERS = [
  { id: 1, name: "Alex K.", avatar: "AK", color: "#22d3ee", status: "active" },
  { id: 2, name: "Sam R.", avatar: "SR", color: "#4ade80", status: "active" },
  { id: 3, name: "Priya M.", avatar: "PM", color: "#fb923c", status: "idle" },
  { id: 4, name: "Jordan L.", avatar: "JL", color: "#c084fc", status: "active" },
];

const SAVED_REQUESTS = [
  { id: 1, name: "Get Users", method: "GET", url: "https://jsonplaceholder.typicode.com/users", tag: "Users" },
  { id: 2, name: "Create Post", method: "POST", url: "https://jsonplaceholder.typicode.com/posts", tag: "Posts" },
  { id: 3, name: "Update Todo", method: "PUT", url: "https://jsonplaceholder.typicode.com/todos/1", tag: "Todos" },
  { id: 4, name: "Get Albums", method: "GET", url: "https://jsonplaceholder.typicode.com/albums", tag: "Albums" },
  { id: 5, name: "Delete Post", method: "DELETE", url: "https://jsonplaceholder.typicode.com/posts/1", tag: "Posts" },
];

const LIVE_FEED = [
  { user: "Alex K.", color: "#22d3ee", action: "sent GET /users", time: "2s ago" },
  { user: "Sam R.", color: "#4ade80", action: "saved 'Auth Token Test'", time: "14s ago" },
  { user: "Jordan L.", color: "#c084fc", action: "viewed POST /login response", time: "1m ago" },
];

function formatJSON(str) {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

function StatusBadge({ code }) {
  if (!code) return null;
  const color = code < 300 ? "#4ade80" : code < 400 ? "#facc15" : "#f87171";
  return (
    <span style={{ color, background: color + "18", border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>
      {code}
    </span>
  );
}

function Avatar({ member, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: member.color + "22",
      border: `2px solid ${member.color}66`, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.35, fontWeight: 700,
      color: member.color, letterSpacing: 0.5, flexShrink: 0, position: "relative"
    }}>
      {member.avatar}
      {member.status === "active" && (
        <span style={{
          position: "absolute", bottom: 0, right: 0, width: size * 0.28, height: size * 0.28,
          background: "#4ade80", borderRadius: "50%", border: "2px solid #0a0f1e"
        }} />
      )}
    </div>
  );
}

function Pulse() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
        background: "#4ade80", boxShadow: "0 0 0 0 #4ade8088",
        animation: "pulse 1.5s infinite"
      }} />
      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 #4ade8088} 50%{box-shadow:0 0 0 6px #4ade8000} }`}</style>
      <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>LIVE</span>
    </span>
  );
}

function SyntaxHighlight({ json }) {
  if (!json) return null;
  const highlighted = json
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = "json-number";
      if (/^"/.test(match)) cls = /:$/.test(match) ? "json-key" : "json-string";
      else if (/true|false/.test(match)) cls = "json-bool";
      else if (/null/.test(match)) cls = "json-null";
      return `<span class="${cls}">${match}</span>`;
    });
  return (
    <>
      <style>{`
        .json-key { color: #22d3ee; }
        .json-string { color: #4ade80; }
        .json-number { color: #fb923c; }
        .json-bool { color: #c084fc; }
        .json-null { color: #94a3b8; }
      `}</style>
      <pre style={{ margin: 0, fontFamily: "'JetBrains Mono', 'Fira Mono', monospace", fontSize: 12.5, lineHeight: 1.7, color: "#e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-all" }}
        dangerouslySetInnerHTML={{ __html: highlighted }} />
    </>
  );
}

export default function App() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/users");
  const [activeTab, setActiveTab] = useState("params");
  const [responseTab, setResponseTab] = useState("body");
  const [headers, setHeaders] = useState([{ key: "Content-Type", value: "application/json", enabled: true }]);
  const [params, setParams] = useState([{ key: "", value: "", enabled: true }]);
  const [body, setBody] = useState('{\n  "title": "Hello",\n  "body": "World",\n  "userId": 1\n}');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [responseSize, setResponseSize] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedSaved, setSelectedSaved] = useState(null);
  const [liveFeed, setLiveFeed] = useState(LIVE_FEED);
  const [sidebarTab, setSidebarTab] = useState("collection");
  const [notification, setNotification] = useState(null);
  const urlRef = useRef();

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  };

  const sendRequest = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    const start = performance.now();
    try {
      const enabledHeaders = headers.filter(h => h.enabled && h.key);
      const headerObj = Object.fromEntries(enabledHeaders.map(h => [h.key, h.value]));
      const options = { method, headers: headerObj };
      if (!["GET", "HEAD"].includes(method) && body) options.body = body;

      let finalUrl = url;
      const enabledParams = params.filter(p => p.enabled && p.key);
      if (enabledParams.length > 0) {
        const qs = new URLSearchParams(enabledParams.map(p => [p.key, p.value])).toString();
        finalUrl += (url.includes("?") ? "&" : "?") + qs;
      }

      const res = await fetch(finalUrl, options);
      const elapsed = Math.round(performance.now() - start);
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      const size = new Blob([text]).size;

      const result = {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : parsed,
        time: elapsed,
        size,
      };
      setResponse(result);
      setResponseTime(elapsed);
      setResponseSize(size);
      setHistory(h => [{ method, url, status: res.status, time: elapsed, ts: new Date().toLocaleTimeString() }, ...h.slice(0, 9)]);
      setLiveFeed(f => [{ user: "You", color: "#22d3ee", action: `sent ${method} ${new URL(url).pathname}`, time: "just now" }, ...f.slice(0, 4)]);
      showNotification(`${res.status} ${res.statusText} · ${elapsed}ms`);
    } catch (err) {
      setResponse({ error: err.message });
      showNotification("Request failed: " + err.message, "error");
    }
    setLoading(false);
  }, [method, url, headers, params, body]);

  const loadSaved = (req) => {
    setSelectedSaved(req.id);
    setMethod(req.method);
    setUrl(req.url);
    showNotification(`Loaded "${req.name}"`);
  };

  const addRow = (setter) => setter(r => [...r, { key: "", value: "", enabled: true }]);
  const updateRow = (setter, idx, field, val) => setter(r => r.map((row, i) => i === idx ? { ...row, [field]: val } : row));
  const removeRow = (setter, idx) => setter(r => r.filter((_, i) => i !== idx));

  return (
    <div style={{
      minHeight: "100vh", background: "#060b18", color: "#e2e8f0",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: "flex", flexDirection: "column",
      overflow: "hidden"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: #1e2d4a #060b18; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #1e2d4a; border-radius: 3px; }
        input, textarea, select { outline: none; }
        button { cursor: pointer; }
        .tab-btn { background: none; border: none; padding: 8px 16px; font-size: 13px; font-weight: 500; color: #64748b; border-bottom: 2px solid transparent; transition: all 0.15s; font-family: inherit; }
        .tab-btn.active { color: #22d3ee; border-bottom-color: #22d3ee; }
        .tab-btn:hover:not(.active) { color: #94a3b8; }
        .sidebar-tab { background: none; border: none; padding: 7px 12px; font-size: 12px; font-weight: 600; color: #475569; border-radius: 6px; transition: all 0.15s; font-family: inherit; letter-spacing: 0.5px; text-transform: uppercase; }
        .sidebar-tab.active { background: #0f172a; color: #22d3ee; }
        .input-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
        .kv-input { background: #0d1627; border: 1px solid #1e2d4a; border-radius: 6px; color: #e2e8f0; padding: 6px 10px; font-size: 12.5px; font-family: 'JetBrains Mono', monospace; flex: 1; transition: border 0.15s; }
        .kv-input:focus { border-color: #22d3ee44; }
        .kv-input::placeholder { color: #334155; }
        .saved-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; border: 1px solid transparent; }
        .saved-item:hover { background: #0d1627; }
        .saved-item.selected { background: #0d1627; border-color: #22d3ee33; }
        .hist-item { padding: 8px 10px; border-radius: 6px; display: flex; gap: 8px; align-items: center; font-size: 12px; cursor: pointer; }
        .hist-item:hover { background: #0d1627; }
        .send-btn { background: linear-gradient(135deg, #0ea5e9, #06b6d4); border: none; color: white; padding: 0 28px; border-radius: 10px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; transition: all 0.18s; font-family: inherit; height: 44px; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .send-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 4px 20px #0ea5e940; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>

      {/* Notification */}
      {notification && (
        <div style={{
          position: "fixed", top: 18, right: 24, zIndex: 999,
          background: notification.type === "error" ? "#1c0a0a" : "#0a1c14",
          border: `1px solid ${notification.type === "error" ? "#f87171" : "#4ade80"}44`,
          color: notification.type === "error" ? "#f87171" : "#4ade80",
          padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          animation: "fadeIn 0.2s ease", boxShadow: "0 8px 32px #00000060"
        }}>
          {notification.type === "error" ? "✗" : "✓"} {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{
        height: 56, background: "#080d1c", borderBottom: "1px solid #0f1e36",
        display: "flex", alignItems: "center", padding: "0 20px", gap: 20,
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.5, background: "linear-gradient(90deg, #22d3ee, #a5f3fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Nexus API</span>
          <span style={{ background: "#0ea5e922", color: "#0ea5e9", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: 1, border: "1px solid #0ea5e933" }}>COLLAB</span>
        </div>
        <div style={{ flex: 1 }} />
        <Pulse />
        <div style={{ display: "flex", gap: -6 }}>
          {TEAM_MEMBERS.map((m, i) => (
            <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: TEAM_MEMBERS.length - i }} title={`${m.name} · ${m.status}`}>
              <Avatar member={m} size={30} />
            </div>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "#475569" }}>{TEAM_MEMBERS.filter(m => m.status === "active").length} online</span>
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{ width: 240, background: "#080d1c", borderRight: "1px solid #0f1e36", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "12px 10px 8px", display: "flex", gap: 4 }}>
            {["collection", "history", "team"].map(t => (
              <button key={t} className={`sidebar-tab ${sidebarTab === t ? "active" : ""}`} onClick={() => setSidebarTab(t)}>{t}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px" }}>
            {sidebarTab === "collection" && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: 1.5, textTransform: "uppercase", padding: "8px 4px 6px" }}>Saved Requests</div>
                {SAVED_REQUESTS.map(req => (
                  <div key={req.id} className={`saved-item ${selectedSaved === req.id ? "selected" : ""}`} onClick={() => loadSaved(req)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: METHOD_COLORS[req.method], fontSize: 10, fontWeight: 800, fontFamily: "monospace", minWidth: 42, letterSpacing: 0.5 }}>{req.method}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: "#cbd5e1", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#334155", marginTop: 2, paddingLeft: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                      {new URL(req.url).pathname}
                    </div>
                  </div>
                ))}
              </>
            )}
            {sidebarTab === "history" && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: 1.5, textTransform: "uppercase", padding: "8px 4px 6px" }}>Recent</div>
                {history.length === 0 && <div style={{ color: "#334155", fontSize: 12, padding: "12px 4px" }}>No history yet</div>}
                {history.map((h, i) => (
                  <div key={i} className="hist-item" onClick={() => { setMethod(h.method); setUrl(h.url); }}>
                    <span style={{ color: METHOD_COLORS[h.method], fontWeight: 700, fontFamily: "monospace", fontSize: 10, minWidth: 36 }}>{h.method}</span>
                    <StatusBadge code={h.status} />
                    <span style={{ color: "#64748b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 11 }}>{new URL(h.url).pathname}</span>
                    <span style={{ color: "#334155", fontSize: 11 }}>{h.ts}</span>
                  </div>
                ))}
              </>
            )}
            {sidebarTab === "team" && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: 1.5, textTransform: "uppercase", padding: "8px 4px 6px" }}>Team Members</div>
                {TEAM_MEMBERS.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 8 }}>
                    <Avatar member={m} size={34} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: m.status === "active" ? "#4ade80" : "#475569", fontWeight: 500 }}>{m.status}</div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: 1.5, textTransform: "uppercase", padding: "16px 4px 6px" }}>Live Activity</div>
                {liveFeed.map((f, i) => (
                  <div key={i} style={{ padding: "7px 4px", borderLeft: `2px solid ${f.color}44`, paddingLeft: 10, marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: f.color }}>{f.user}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{f.action}</div>
                    <div style={{ fontSize: 10, color: "#334155", marginTop: 1 }}>{f.time}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* URL Bar */}
          <div style={{ padding: "14px 20px 12px", background: "#080d1c", borderBottom: "1px solid #0f1e36", display: "flex", gap: 10 }}>
            <select value={method} onChange={e => setMethod(e.target.value)} style={{
              background: "#0d1627", border: `1px solid ${METHOD_COLORS[method]}44`, color: METHOD_COLORS[method],
              borderRadius: 8, padding: "0 12px", fontWeight: 800, fontSize: 13, fontFamily: "monospace",
              flexShrink: 0, height: 44, cursor: "pointer"
            }}>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div style={{ flex: 1, position: "relative" }}>
              <input ref={urlRef} value={url} onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendRequest()}
                placeholder="Enter request URL..."
                style={{
                  width: "100%", height: 44, background: "#0d1627", border: "1px solid #1e2d4a",
                  borderRadius: 8, color: "#e2e8f0", padding: "0 16px", fontSize: 13.5,
                  fontFamily: "'JetBrains Mono', monospace", transition: "border 0.15s"
                }} />
            </div>
            <button className="send-btn" onClick={sendRequest} disabled={loading}>
              {loading ? (
                <span style={{ width: 16, height: 16, border: "2.5px solid white", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              ) : "▶"}
              {loading ? "Sending..." : "Send"}
            </button>
            <button onClick={() => { setUrl(""); setMethod("GET"); setResponse(null); showNotification("Cleared"); }}
              style={{ background: "#0d1627", border: "1px solid #1e2d4a", color: "#475569", borderRadius: 8, padding: "0 14px", fontSize: 13, height: 44, transition: "all 0.15s" }}
              title="Clear">✕</button>
          </div>

          {/* Request / Response split */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Request Panel */}
            <div style={{ width: "46%", borderRight: "1px solid #0f1e36", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ borderBottom: "1px solid #0f1e36", display: "flex", paddingLeft: 8 }}>
                {["params", "headers", "body", "auth"].map(t => (
                  <button key={t} className={`tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}
                    style={{ textTransform: "capitalize" }}>
                    {t}
                    {t === "headers" && headers.filter(h => h.enabled && h.key).length > 0 && (
                      <span style={{ background: "#22d3ee22", color: "#22d3ee", borderRadius: 10, padding: "0 5px", fontSize: 10, marginLeft: 5, fontWeight: 700 }}>
                        {headers.filter(h => h.enabled && h.key).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                {activeTab === "params" && (
                  <>
                    <div style={{ fontSize: 11, color: "#475569", marginBottom: 10, fontWeight: 600 }}>QUERY PARAMETERS</div>
                    {params.map((p, i) => (
                      <div key={i} className="input-row">
                        <input type="checkbox" checked={p.enabled} onChange={e => updateRow(setParams, i, "enabled", e.target.checked)}
                          style={{ accentColor: "#22d3ee", flexShrink: 0 }} />
                        <input className="kv-input" placeholder="Key" value={p.key} onChange={e => updateRow(setParams, i, "key", e.target.value)} />
                        <input className="kv-input" placeholder="Value" value={p.value} onChange={e => updateRow(setParams, i, "value", e.target.value)} />
                        <button onClick={() => removeRow(setParams, i)} style={{ background: "none", border: "none", color: "#334155", fontSize: 16, padding: "0 4px", flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => addRow(setParams)} style={{ background: "#0d1627", border: "1px dashed #1e2d4a", color: "#475569", borderRadius: 6, padding: "6px 14px", fontSize: 12, marginTop: 4, fontFamily: "inherit" }}>+ Add Param</button>
                  </>
                )}
                {activeTab === "headers" && (
                  <>
                    <div style={{ fontSize: 11, color: "#475569", marginBottom: 10, fontWeight: 600 }}>REQUEST HEADERS</div>
                    {headers.map((h, i) => (
                      <div key={i} className="input-row">
                        <input type="checkbox" checked={h.enabled} onChange={e => updateRow(setHeaders, i, "enabled", e.target.checked)}
                          style={{ accentColor: "#22d3ee", flexShrink: 0 }} />
                        <input className="kv-input" placeholder="Header name" value={h.key} onChange={e => updateRow(setHeaders, i, "key", e.target.value)} />
                        <input className="kv-input" placeholder="Value" value={h.value} onChange={e => updateRow(setHeaders, i, "value", e.target.value)} />
                        <button onClick={() => removeRow(setHeaders, i)} style={{ background: "none", border: "none", color: "#334155", fontSize: 16, padding: "0 4px", flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => addRow(setHeaders)} style={{ background: "#0d1627", border: "1px dashed #1e2d4a", color: "#475569", borderRadius: 6, padding: "6px 14px", fontSize: 12, marginTop: 4, fontFamily: "inherit" }}>+ Add Header</button>
                  </>
                )}
                {activeTab === "body" && (
                  <>
                    <div style={{ fontSize: 11, color: "#475569", marginBottom: 10, fontWeight: 600 }}>REQUEST BODY · JSON</div>
                    <div style={{ position: "relative" }}>
                      <textarea value={body} onChange={e => setBody(e.target.value)}
                        style={{
                          width: "100%", minHeight: 220, background: "#0a1120", border: "1px solid #1e2d4a",
                          borderRadius: 8, color: "#e2e8f0", padding: 14, fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12.5, lineHeight: 1.7, resize: "vertical"
                        }} />
                      <button onClick={() => { setBody(formatJSON(body)); showNotification("Body formatted"); }}
                        style={{ position: "absolute", top: 8, right: 8, background: "#0d1627", border: "1px solid #1e2d4a", color: "#475569", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontFamily: "inherit" }}>
                        Format
                      </button>
                    </div>
                  </>
                )}
                {activeTab === "auth" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>AUTHORIZATION</div>
                    {[["Bearer Token", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."], ["API Key", "x-api-key"], ["Basic Auth", "username:password"]].map(([label, hint]) => (
                      <div key={label}>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: 500 }}>{label}</div>
                        <input className="kv-input" placeholder={hint} style={{ width: "100%" }} />
                      </div>
                    ))}
                    <button onClick={() => showNotification("Auth applied to headers")}
                      style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", border: "none", color: "white", borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", alignSelf: "flex-start", marginTop: 4 }}>
                      Apply Auth
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Response Panel */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ borderBottom: "1px solid #0f1e36", display: "flex", alignItems: "center", paddingLeft: 8, gap: 0 }}>
                {["body", "headers", "info"].map(t => (
                  <button key={t} className={`tab-btn ${responseTab === t ? "active" : ""}`} onClick={() => setResponseTab(t)}
                    style={{ textTransform: "capitalize" }}>{t}</button>
                ))}
                <div style={{ flex: 1 }} />
                {response && !response.error && (
                  <div style={{ display: "flex", gap: 12, paddingRight: 16, alignItems: "center" }}>
                    <StatusBadge code={response.status} />
                    {responseTime && <span style={{ fontSize: 12, color: responseTime < 500 ? "#4ade80" : responseTime < 1500 ? "#facc15" : "#f87171", fontWeight: 600, fontFamily: "monospace" }}>{responseTime}ms</span>}
                    {responseSize && <span style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>{responseSize > 1024 ? (responseSize / 1024).toFixed(1) + "KB" : responseSize + "B"}</span>}
                    <button onClick={() => { navigator.clipboard.writeText(response.body); showNotification("Copied!"); }}
                      style={{ background: "#0d1627", border: "1px solid #1e2d4a", color: "#475569", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontFamily: "inherit" }}>
                      Copy
                    </button>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                {loading && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 16 }}>
                    <div style={{ width: 40, height: 40, border: "3px solid #0f1e36", borderTopColor: "#22d3ee", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    <div style={{ color: "#334155", fontSize: 13, animation: "shimmer 1.5s infinite" }}>Awaiting response...</div>
                  </div>
                )}
                {!loading && !response && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240, gap: 12, color: "#334155" }}>
                    <div style={{ fontSize: 40 }}>⚡</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>Send a request to see the response</div>
                    <div style={{ fontSize: 12 }}>Press Enter or click Send</div>
                  </div>
                )}
                {!loading && response?.error && (
                  <div style={{ background: "#1c0a0a", border: "1px solid #f8717144", borderRadius: 8, padding: 16, color: "#f87171", fontFamily: "monospace", fontSize: 13 }}>
                    ✗ {response.error}
                  </div>
                )}
                {!loading && response && !response.error && (
                  <>
                    {responseTab === "body" && (
                      <div style={{ background: "#060b18", border: "1px solid #0f1e36", borderRadius: 8, padding: 16, animation: "fadeIn 0.2s ease" }}>
                        <SyntaxHighlight json={response.body} />
                      </div>
                    )}
                    {responseTab === "headers" && (
                      <div style={{ animation: "fadeIn 0.2s ease" }}>
                        {Object.entries(response.headers).map(([k, v]) => (
                          <div key={k} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: "1px solid #0a1427", fontFamily: "monospace", fontSize: 12 }}>
                            <span style={{ color: "#22d3ee", minWidth: 200, flexShrink: 0 }}>{k}</span>
                            <span style={{ color: "#94a3b8" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {responseTab === "info" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.2s ease" }}>
                        {[["Status", `${response.status} ${response.statusText}`], ["Response Time", `${responseTime}ms`], ["Size", responseSize > 1024 ? (responseSize / 1024).toFixed(1) + " KB" : responseSize + " B"], ["URL", url], ["Method", method]].map(([label, value]) => (
                          <div key={label} style={{ background: "#0a1120", border: "1px solid #0f1e36", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#475569", fontWeight: 600, letterSpacing: 0.5 }}>{label}</span>
                            <span style={{ fontSize: 13, color: "#e2e8f0", fontFamily: "monospace" }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}