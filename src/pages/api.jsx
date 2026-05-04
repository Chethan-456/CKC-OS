import { useState, useRef, useCallback } from "react";

const PRESETS = [
  {
    label: "GitHub",
    url: "https://api.github.com/user",
    keyName: "Authorization",
    placeholder: "Bearer ghp_xxxxxxxxxxxx",
    note: "Returns 200 with your user profile if valid, 401 if not. Token needs no special scopes.",
  },
  {
    label: "OpenAI",
    url: "https://api.openai.com/v1/models",
    keyName: "Authorization",
    placeholder: "Bearer sk-xxxxxxxxxxxx",
    note: "Lists available models if key is valid, 401 if not.",
  },
  {
    label: "Anthropic",
    url: "https://api.anthropic.com/v1/models",
    keyName: "x-api-key",
    placeholder: "sk-ant-xxxxxxxxxxxx",
    note: "Lists Claude models. Also requires anthropic-version header — may return 400 without it.",
  },
  {
    label: "JSONPlaceholder",
    url: "https://jsonplaceholder.typicode.com/todos/1",
    keyName: "x-api-key",
    placeholder: "any-value",
    note: "Public test API. Always returns 200 and ignores the key — useful to smoke-test this tool.",
  },
  {
    label: "Custom",
    url: "",
    keyName: "",
    placeholder: "",
    note: "Enter your own endpoint and key.",
  },
];

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];

const METHOD_COLORS = {
  GET: "#00d4aa",
  POST: "#7c6fcd",
  PUT: "#f59e0b",
  PATCH: "#f97316",
  DELETE: "#ef4444",
  HEAD: "#64748b",
};

const STATUS_CONFIG = {
  success: { bg: "#0a1f15", border: "#00d4aa33", titleColor: "#00d4aa", icon: "✓", dotColor: "#00d4aa" },
  danger:  { bg: "#1f0a0a", border: "#ef444433", titleColor: "#ef4444", icon: "✗", dotColor: "#ef4444" },
  warning: { bg: "#1f1800", border: "#f59e0b33", titleColor: "#f59e0b", icon: "!", dotColor: "#f59e0b" },
  info:    { bg: "#0a1020", border: "#7c6fcd33", titleColor: "#7c6fcd", icon: "i", dotColor: "#7c6fcd" },
};

function Spinner({ size = 18, color = "#00d4aa" }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${color}33`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin 0.65s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function StatusBadge({ type }) {
  const cfg = STATUS_CONFIG[type];
  if (!cfg) return null;
  return (
    <span
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: cfg.bg,
        border: `1px solid ${cfg.titleColor}55`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        color: cfg.titleColor,
        flexShrink: 0,
      }}
    >
      {cfg.icon}
    </span>
  );
}

function ResultCard({ type, title, detail, code, elapsed, responseHeaders }) {
  const [showHeaders, setShowHeaders] = useState(false);
  const cfg = STATUS_CONFIG[type] || STATUS_CONFIG.info;

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        animation: "fadeSlideUp 0.22s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <StatusBadge type={type} />
        <span style={{ fontSize: 14, fontWeight: 700, color: cfg.titleColor, letterSpacing: 0.2 }}>
          {title}
        </span>
        <div style={{ flex: 1 }} />
        {code && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              color: cfg.titleColor,
              background: cfg.titleColor + "18",
              border: `1px solid ${cfg.titleColor}33`,
              borderRadius: 6,
              padding: "2px 10px",
            }}
          >
            {code}
          </span>
        )}
        {elapsed != null && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#3d5066" }}>
            {elapsed}ms
          </span>
        )}
      </div>

      <p style={{ fontSize: 13, color: "#4a6080", margin: "0 0 0 30px", lineHeight: 1.7 }}>
        {detail}
      </p>

      {responseHeaders && Object.keys(responseHeaders).length > 0 && (
        <div style={{ marginTop: 14, marginLeft: 30 }}>
          <button
            onClick={() => setShowHeaders((v) => !v)}
            style={{
              background: "none",
              border: "none",
              color: "#3d5066",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                fontSize: 8,
                display: "inline-block",
                transition: "transform 0.15s",
                transform: showHeaders ? "rotate(90deg)" : "none",
              }}
            >
              ▶
            </span>
            {showHeaders ? "Hide" : "Show"} response headers ({Object.keys(responseHeaders).length})
          </button>

          {showHeaders && (
            <div
              style={{
                marginTop: 10,
                background: "#060c18",
                border: "1px solid #0f1e32",
                borderRadius: 8,
                padding: "10px 14px",
                maxHeight: 180,
                overflowY: "auto",
              }}
            >
              {Object.entries(responseHeaders).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "4px 0",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    borderBottom: "1px solid #0a1427",
                  }}
                >
                  <span style={{ color: "#00d4aa", minWidth: 200, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: "#3d5066", wordBreak: "break-all" }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ entry }) {
  const dotColor =
    entry.type === "success" ? "#00d4aa" : entry.type === "danger" ? "#ef4444" : "#f59e0b";
  const methColor = METHOD_COLORS[entry.method] || "#64748b";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderBottom: "1px solid #080f1c",
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      <span style={{ color: methColor, minWidth: 44, fontWeight: 700 }}>{entry.method}</span>
      <span style={{ color: dotColor, minWidth: 36, fontWeight: 700 }}>{entry.code}</span>
      <span style={{ color: "#00d4aa99", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {entry.keyName}
      </span>
      <span style={{ color: "#3d5066", minWidth: 46, textAlign: "right" }}>{entry.elapsed}ms</span>
      <span style={{ color: "#1e2d4a", minWidth: 54, textAlign: "right" }}>{entry.ts}</span>
    </div>
  );
}

export default function ApiKeyValidator() {
  const [preset, setPreset] = useState(0);
  const [keyName, setKeyName] = useState("Authorization");
  const [keyValue, setKeyValue] = useState("");
  const [testUrl, setTestUrl] = useState("https://api.github.com/user");
  const [method, setMethod] = useState("GET");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const inputRef = useRef();

  const applyPreset = (i) => {
    setPreset(i);
    const p = PRESETS[i];
    if (p.url) setTestUrl(p.url);
    if (p.keyName) setKeyName(p.keyName);
    setResult({ type: "info", title: p.label + (p.label === "Custom" ? "" : " endpoint"), detail: p.note });
  };

  const validate = useCallback(async () => {
    if (!keyName.trim() || !keyValue.trim()) {
      setResult({ type: "danger", title: "Missing fields", detail: "Enter both a header name and key value." });
      return;
    }
    if (!testUrl.trim()) {
      setResult({ type: "danger", title: "Missing URL", detail: "Enter a test endpoint URL." });
      return;
    }

    setLoading(true);
    setResult(null);
    const start = performance.now();

    try {
      const res = await fetch(testUrl, { method, headers: { [keyName]: keyValue } });
      const elapsed = Math.round(performance.now() - start);
      const code = res.status;
      const responseHeaders = Object.fromEntries(res.headers.entries());

      let type, title, detail;
      if (code >= 200 && code < 300) {
        type = "success"; title = "Key accepted";
        detail = `Server responded ${code} in ${elapsed}ms. Your API key is valid and working.`;
      } else if (code === 401) {
        type = "danger"; title = "Unauthorized — key rejected";
        detail = "The server returned 401. The key name or value is wrong, or the key has been revoked.";
      } else if (code === 403) {
        type = "danger"; title = "Forbidden — insufficient permissions";
        detail = "The key was recognised but doesn't have access to this endpoint (403). Check the key's scopes or try a different endpoint.";
      } else if (code === 404) {
        type = "warning"; title = "Not found — but key may be valid";
        detail = "The endpoint returned 404. The URL is likely wrong, not the key. Try a different endpoint.";
      } else if (code === 429) {
        type = "warning"; title = "Rate limited — key likely valid";
        detail = "Too many requests (429). The key is probably valid but you've hit a rate limit. Wait a moment and retry.";
      } else if (code === 422) {
        type = "warning"; title = "Unprocessable — key may be valid";
        detail = "Status 422 — the key was likely accepted but the request body is invalid or missing.";
      } else {
        type = "warning"; title = `Status ${code}`;
        detail = `Server responded in ${elapsed}ms with status ${code}. Check the API docs to interpret this code.`;
      }

      setHistory((h) => [
        { type, title, code, elapsed, keyName, url: testUrl, method, ts: new Date().toLocaleTimeString() },
        ...h.slice(0, 9),
      ]);
      setResult({ type, title, detail, code, elapsed, responseHeaders });
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      let detail = err.message;
      if (
        err.message.toLowerCase().includes("failed to fetch") ||
        err.message.toLowerCase().includes("networkerror") ||
        err.message.toLowerCase().includes("cors")
      ) {
        detail =
          "CORS or network error — the server blocked this browser request. This is a browser security restriction, not necessarily a bad key. Try testing server-side or use a CORS-friendly endpoint like GitHub.";
      }
      setHistory((h) => [
        { type: "danger", title: "Error", code: "ERR", elapsed, keyName, url: testUrl, method, ts: new Date().toLocaleTimeString() },
        ...h.slice(0, 9),
      ]);
      setResult({ type: "danger", title: "Request failed", detail, elapsed });
    } finally {
      setLoading(false);
    }
  }, [keyName, keyValue, testUrl, method]);

  const handleKeyDown = (e) => e.key === "Enter" && validate();

  const maskedKey = keyValue
    ? showKey
      ? keyValue
      : keyValue.slice(0, 6) + "••••••••" + keyValue.slice(-4)
    : "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #0f1e32; border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        .akv-input {
          width: 100%; height: 42px; background: #060c18;
          border: 1px solid #0f1e32; border-radius: 8px;
          color: #c8d8e8; padding: 0 14px; font-size: 13px;
          font-family: 'JetBrains Mono', monospace; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .akv-input:focus { border-color: #00d4aa44; box-shadow: 0 0 0 3px #00d4aa0d; }
        .akv-input::placeholder { color: #1e3a52; }
        .preset-pill {
          background: #080f1c; border: 1px solid #0f1e32; color: #2d4a60;
          border-radius: 20px; padding: 4px 14px; font-size: 11px;
          font-family: 'Space Grotesk', sans-serif; font-weight: 600;
          letter-spacing: 0.3px; cursor: pointer; transition: all 0.15s;
        }
        .preset-pill:hover { border-color: #00d4aa33; color: #4a7a90; }
        .preset-pill.active { border-color: #00d4aa55; color: #00d4aa; background: #00d4aa0d; }
        .method-select {
          background: #060c18; border: 1px solid #0f1e32; border-radius: 8px;
          padding: 0 10px; font-weight: 700; font-size: 12px;
          font-family: 'JetBrains Mono', monospace; height: 42px;
          width: 80px; flex-shrink: 0; cursor: pointer; outline: none;
          transition: border-color 0.15s;
        }
        .method-select:focus { border-color: #00d4aa44; }
        .check-btn {
          width: 100%; height: 46px;
          background: linear-gradient(135deg, #00d4aa18, #00b8942a);
          border: 1px solid #00d4aa44; border-radius: 10px; color: #00d4aa;
          font-weight: 700; font-size: 14px; cursor: pointer;
          font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.5px;
          transition: all 0.18s; display: flex; align-items: center;
          justify-content: center; gap: 9px;
        }
        .check-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #00d4aa22, #00b89436);
          border-color: #00d4aa77; box-shadow: 0 0 20px #00d4aa1a;
          transform: translateY(-1px);
        }
        .check-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }
        .clear-btn {
          background: #060c18; border: 1px solid #0f1e32; color: #2d4a60;
          border-radius: 6px; padding: 5px 14px; font-size: 11px;
          font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: all 0.12s;
        }
        .clear-btn:hover { border-color: #1e3a52; color: #4a7a90; }
        .toggle-show {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #1e3a52; font-size: 11px;
          cursor: pointer; font-family: 'Space Grotesk', sans-serif;
          padding: 2px 6px; border-radius: 4px; transition: color 0.12s;
        }
        .toggle-show:hover { color: #4a7a90; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#030810",
          color: "#c8d8e8",
          fontFamily: "'Space Grotesk', sans-serif",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#050b16",
            borderBottom: "1px solid #080f1c",
            padding: "0 28px",
            height: 54,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 30, height: 30, background: "#00d4aa14",
              border: "1px solid #00d4aa33", borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#00d4aa", fontWeight: 700,
            }}
          >
            ⚡
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#00d4aa", letterSpacing: 0.5 }}>
            API Key Validator
          </span>
          <span
            style={{
              background: "#00d4aa14", color: "#00d4aa", fontSize: 9,
              fontWeight: 700, padding: "2px 7px", borderRadius: 4,
              letterSpacing: 1.5, border: "1px solid #00d4aa22",
            }}
          >
            LIVE
          </span>
          <div style={{ flex: 1 }} />
          <button
            className="clear-btn"
            onClick={() => {
              setKeyName("Authorization");
              setKeyValue("");
              setTestUrl("https://api.github.com/user");
              setMethod("GET");
              setResult(null);
              setPreset(0);
            }}
          >
            Clear
          </button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: Form */}
          <div
            style={{
              width: 400, borderRight: "1px solid #080f1c",
              padding: "24px", overflowY: "auto", flexShrink: 0, background: "#040a14",
            }}
          >
            {/* Presets */}
            <div style={{ marginBottom: 22 }}>
              <div
                style={{
                  fontSize: 10, fontWeight: 700, color: "#1e3a52",
                  letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 9,
                }}
              >
                Quick presets
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    className={`preset-pill${preset === i ? " active" : ""}`}
                    onClick={() => applyPreset(i)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Key Name */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block", fontSize: 11, fontWeight: 600, color: "#1e3a52",
                  letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 7,
                }}
              >
                Header name
              </label>
              <input
                className="akv-input"
                placeholder="Authorization, x-api-key…"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>

            {/* Key Value */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block", fontSize: 11, fontWeight: 600, color: "#1e3a52",
                  letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 7,
                }}
              >
                Key value
              </label>
              <div style={{ position: "relative" }}>
                <input
                  ref={inputRef}
                  className="akv-input"
                  type={showKey ? "text" : "password"}
                  placeholder={PRESETS[preset]?.placeholder || "Paste your API key here"}
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{ paddingRight: 64 }}
                />
                <button className="toggle-show" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? "hide" : "show"}
                </button>
              </div>
            </div>

            {/* Method + URL */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block", fontSize: 11, fontWeight: 600, color: "#1e3a52",
                  letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 7,
                }}
              >
                Test endpoint
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                <select
                  className="method-select"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  style={{ color: METHOD_COLORS[method] || "#00d4aa" }}
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  className="akv-input"
                  placeholder="https://api.example.com/endpoint"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ fontSize: 11, color: "#1e3a52" }}>
                Sends a {method} request with your key as a header
              </div>
            </div>

            {/* Key preview */}
            {keyName && keyValue && (
              <div
                style={{
                  background: "#060c18", border: "1px solid #0a1627",
                  borderRadius: 8, padding: "10px 14px", marginBottom: 18,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  wordBreak: "break-all", lineHeight: 1.6,
                }}
              >
                <span style={{ color: "#1e3a52" }}>Header: </span>
                <span style={{ color: "#00d4aa" }}>{keyName}</span>
                <span style={{ color: "#1e3a52" }}>: </span>
                <span style={{ color: "#7c6fcd" }}>{maskedKey}</span>
              </div>
            )}

            {/* Button */}
            <button className="check-btn" onClick={validate} disabled={loading}>
              {loading ? (
                <><Spinner size={15} color="#00d4aa" /> Checking…</>
              ) : (
                "▶  Check key"
              )}
            </button>
          </div>

          {/* Right: Results + History */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              {!loading && !result && (
                <div
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", height: "100%", gap: 16, textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 60, height: 60, borderRadius: "50%",
                      border: "1.5px dashed #0f1e32", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 22, color: "#0f1e32",
                    }}
                  >
                    ⚡
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1e3a52" }}>
                    Paste a key and hit check
                  </div>
                  <div style={{ fontSize: 12, color: "#0f1e32", maxWidth: 260, lineHeight: 1.7 }}>
                    Results appear here — valid, rejected, or rate-limited
                  </div>
                </div>
              )}

              {loading && (
                <div
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", height: "100%", gap: 18,
                  }}
                >
                  <Spinner size={36} color="#00d4aa" />
                  <div style={{ fontSize: 13, color: "#1e3a52" }}>Sending request…</div>
                </div>
              )}

              {!loading && result && <ResultCard {...result} />}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid #080f1c", padding: "12px 16px",
                  background: "#040a14", maxHeight: 200, overflowY: "auto",
                }}
              >
                <div
                  style={{
                    fontSize: 10, fontWeight: 700, color: "#1e3a52",
                    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
                  }}
                >
                  History
                </div>
                {history.map((h, i) => (
                  <HistoryRow key={i} entry={h} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}