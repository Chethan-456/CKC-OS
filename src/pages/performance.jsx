import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend
} from "recharts";
/* ═══════════════════════════════════════════
   FONTS & GLOBAL CSS
═══════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Sans:ital,wght@0,400;0,500;1,400&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
:root {
  --bg0:#04060a;--bg1:#070c12;--bg2:#0b1118;--bg3:#0f1620;
  --surface:#111820;--surface2:#161e28;--border:rgba(255,255,255,.06);--border2:rgba(255,255,255,.1);
  --blue:#3b82f6;--blue2:#60a5fa;--blue3:#93c5fd;
  --teal:#14b8a6;--teal2:#2dd4bf;
  --green:#10b981;--green2:#34d399;
  --amber:#f59e0b;--amber2:#fbbf24;
  --red:#ef4444;--red2:#f87171;
  --violet:#8b5cf6;--violet2:#a78bfa;
  --rose:#f43f5e;--rose2:#fb7185;
  --text:#e2e8f0;--text2:#94a3b8;--text3:#475569;--text4:#1e293b;
  --mono:'JetBrains Mono',monospace;
  --sans:'Instrument Sans',sans-serif;
  --disp:'Space Grotesk',sans-serif;
}
body{font-family:var(--sans);background:var(--bg0);color:var(--text);overflow-x:hidden;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px;}

@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes pulse2{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
@keyframes countUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes ripple{0%{transform:scale(0);opacity:.6}100%{transform:scale(2.5);opacity:0}}
@keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(59,130,246,.3)}50%{box-shadow:0 0 18px rgba(59,130,246,.6)}}

.fade-in{animation:fadeIn .35s ease both;}
.pulse-dot{animation:pulse2 1.6s ease-in-out infinite;}
.count-up{animation:countUp .3s ease both;}
.slide-in{animation:slideIn .25s ease both;}

.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;transition:border-color .2s;}
.card:hover{border-color:var(--border2);}
.card-inner{background:var(--surface2);border:1px solid var(--border);border-radius:8px;}

.tab-btn{font-family:var(--sans);font-size:.75rem;font-weight:500;border-radius:7px;padding:5px 12px;cursor:pointer;transition:all .15s;border:1px solid transparent;}
.tab-btn.active{background:rgba(59,130,246,.15);color:#60a5fa;border-color:rgba(59,130,246,.3);}
.tab-btn:not(.active){color:var(--text3);background:transparent;}
.tab-btn:not(.active):hover{color:var(--text2);background:rgba(255,255,255,.04);}

.metric-val{font-family:var(--disp);font-weight:600;line-height:1;}
.mono{font-family:var(--mono);}
.label-upper{font-size:.6rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--text3);}

.badge{display:inline-flex;align-items:center;gap:4px;border-radius:100px;padding:2px 8px;font-size:.62rem;font-weight:600;letter-spacing:.04em;border:1px solid;}
.badge-ok{background:rgba(16,185,129,.1);color:#34d399;border-color:rgba(16,185,129,.25);}
.badge-warn{background:rgba(245,158,11,.1);color:#fbbf24;border-color:rgba(245,158,11,.25);}
.badge-err{background:rgba(239,68,68,.1);color:#f87171;border-color:rgba(239,68,68,.25);}
.badge-info{background:rgba(59,130,246,.1);color:#60a5fa;border-color:rgba(59,130,246,.25);}
.badge-violet{background:rgba(139,92,246,.1);color:#a78bfa;border-color:rgba(139,92,246,.25);}

.btn{font-family:var(--sans);font-size:.75rem;font-weight:500;border-radius:8px;padding:6px 14px;cursor:pointer;transition:all .15s;border:1px solid;}
.btn-ghost{background:transparent;color:var(--text2);border-color:var(--border);}
.btn-ghost:hover{border-color:var(--border2);color:var(--text);}
.btn-primary{background:rgba(59,130,246,.15);color:#60a5fa;border-color:rgba(59,130,246,.3);}
.btn-primary:hover{background:rgba(59,130,246,.25);}
.btn-danger{background:rgba(239,68,68,.1);color:#f87171;border-color:rgba(239,68,68,.25);}
.btn-danger:hover{background:rgba(239,68,68,.2);}

.progress-bar{height:3px;border-radius:2px;background:rgba(255,255,255,.05);overflow:hidden;}
.progress-fill{height:100%;border-radius:2px;transition:width .5s ease;}

.heatmap-cell{border-radius:2px;transition:background .3s;}
.tooltip-custom{background:#0b1118;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 12px;font-size:.72rem;box-shadow:0 8px 32px rgba(0,0,0,.5);}

.alert-item{border-left:2px solid;border-radius:0 8px 8px 0;padding:10px 14px;animation:slideIn .25s ease;}
.alert-crit{border-color:#ef4444;background:rgba(239,68,68,.06);}
.alert-warn{border-color:#f59e0b;background:rgba(245,158,11,.06);}
.alert-info{border-color:#3b82f6;background:rgba(59,130,246,.06);}
.alert-ok{border-color:#10b981;background:rgba(16,185,129,.06);}

.trace-node{border-radius:6px;padding:6px 10px;font-size:.7rem;}
.trace-line{flex:1;height:1px;background:linear-gradient(90deg,rgba(59,130,246,.4),rgba(59,130,246,.1));}

.heatmap-grid{display:grid;gap:2px;}
.seg-bar{height:3px;flex:1;border-radius:1px;transition:width .4s;}

.spin{animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
`;

/* ═══════════════════════════════════════════
   CONSTANTS & DATA
═══════════════════════════════════════════ */
const MAX_PTS = 120;
const ENDPOINTS = [
  { id: "login",    path: "/api/login",    base: 78,  weight: 0.18 },
  { id: "users",    path: "/api/users",    base: 95,  weight: 0.22 },
  { id: "products", path: "/api/products", base: 140, weight: 0.20 },
  { id: "orders",   path: "/api/orders",   base: 210, weight: 0.15 },
  { id: "search",   path: "/api/search",   base: 380, weight: 0.12 },
  { id: "payments", path: "/api/payments", base: 165, weight: 0.08 },
  { id: "reports",  path: "/api/reports",  base: 460, weight: 0.05 },
];
const STATUS_CODES = [200, 200, 200, 200, 201, 204, 301, 400, 401, 403, 404, 429, 500, 502, 503];
const LOG_MESSAGES = [
  { msg: "GET /api/users 200 OK — 94ms", type: "ok" },
  { msg: "POST /api/orders 201 Created — 188ms", type: "ok" },
  { msg: "Cache hit ratio: 91.4%", type: "info" },
  { msg: "DB connection pool: 14/50 active", type: "info" },
  { msg: "GET /api/search 200 OK — 342ms", type: "ok" },
  { msg: "Slow query detected: 2 queries > 200ms", type: "warn" },
  { msg: "Memory usage approaching 75% threshold", type: "warn" },
  { msg: "POST /api/auth 401 Unauthorized", type: "err" },
  { msg: "Rate limit triggered on /api/search", type: "warn" },
  { msg: "GET /api/reports 504 Gateway Timeout", type: "err" },
  { msg: "Retry success after 1 attempt — 312ms", type: "ok" },
  { msg: "Health check passed: all 5 services UP", type: "ok" },
  { msg: "Anomaly detected: 3× normal error rate", type: "err" },
  { msg: "Throughput peak: 2,847 req/min", type: "info" },
  { msg: "TLS certificate renews in 14 days", type: "info" },
  { msg: "Suspicious traffic from 192.168.4.x", type: "warn" },
  { msg: "Failed login attempts: 12 in 60s", type: "err" },
  { msg: "POST /api/payments 200 OK — 161ms", type: "ok" },
];
const SPIKE_MSGS = [
  { msg: "CRITICAL: Response spike — 892ms avg", type: "err" },
  { msg: "ERROR: POST /api/orders 500 Internal", type: "err" },
  { msg: "WARN: DB slow query — 1420ms", type: "warn" },
  { msg: "ALERT: Error rate crossed 5% threshold", type: "err" },
];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SERVICES = [
  { name: "API Gateway",  ok: true,  latency: 4   },
  { name: "Auth Service", ok: true,  latency: 12  },
  { name: "Database",     ok: true,  latency: 18  },
  { name: "Cache",        ok: false, warn: true, latency: 45 },
  { name: "Queue",        ok: true,  latency: 6   },
  { name: "CDN",          ok: true,  latency: 3   },
  { name: "Storage",      ok: true,  latency: 22  },
];
const TRACE_STAGES = [
  { label: "DNS",    color: "#8b5cf6", baseMs: 12  },
  { label: "TCP",    color: "#3b82f6", baseMs: 8   },
  { label: "TLS",    color: "#14b8a6", baseMs: 22  },
  { label: "Server", color: "#f59e0b", baseMs: 95  },
  { label: "DB",     color: "#ef4444", baseMs: 38  },
  { label: "Cache",  color: "#10b981", baseMs: 6   },
  { label: "Total",  color: "#e2e8f0", baseMs: 181 },
];

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const smooth = (v, mn, mx, vol) => Math.max(mn, Math.min(mx, v + (Math.random() - 0.5) * vol));
const rand    = arr => arr[Math.floor(Math.random() * arr.length)];
const nowTs   = () => {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, "0")).join(":");
};
const fmt     = (n, d = 0) => Number(n).toFixed(d);
const fmtK    = n => n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(Math.round(n));

function latColor(ms) {
  if (ms < 150) return "#10b981";
  if (ms < 300) return "#f59e0b";
  return "#ef4444";
}
function latBadge(ms) {
  if (ms < 150) return { text: "Normal",   cls: "badge-ok"   };
  if (ms < 280) return { text: "Elevated", cls: "badge-warn" };
  return               { text: "Critical", cls: "badge-err"  };
}
function errBadge(e) {
  if (e < 1) return { text: "Healthy",  cls: "badge-ok"   };
  if (e < 3) return { text: "Elevated", cls: "badge-warn" };
  return            { text: "Critical", cls: "badge-err"  };
}

/* ═══════════════════════════════════════════
   CUSTOM TOOLTIP
═══════════════════════════════════════════ */
function CTip({ active, payload, label, unit = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip-custom">
      <p style={{ color: "var(--text3)", marginBottom: 4, fontSize: ".65rem" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontFamily: "var(--mono)", fontSize: ".7rem" }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</strong>{unit}
        </p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SPARKLINE
═══════════════════════════════════════════ */
function Spark({ data = [], color = "#3b82f6", h = 28, w = 90 }) {
  if (data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) =>
    `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - mn) / rng) * (h - 3) - 1).toFixed(1)}`
  ).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg-${color.replace("#", "")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   METRIC CARD
═══════════════════════════════════════════ */
function MetricCard({ label, value, unit, sub, badge, spark, sparkColor, delta, deltaGood, accent }) {
  return (
    <div className="card" style={{ padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      {accent && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${accent}, transparent)`
        }} />
      )}
      <p className="label-upper" style={{ marginBottom: 8 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
        <span className="metric-val" style={{ fontSize: "1.65rem", color: "var(--text)" }}>{value}</span>
        {unit && <span style={{ fontSize: ".75rem", color: "var(--text3)" }}>{unit}</span>}
      </div>
      {badge && <span className={`badge ${badge.cls}`}>{badge.text}</span>}
      {delta !== undefined && (
        <p style={{
          fontSize: ".67rem", marginTop: 5,
          color: deltaGood ? "var(--green2)" : "var(--red2)",
          display: "flex", alignItems: "center", gap: 3
        }}>
          {deltaGood ? "▼" : "▲"} {delta}
        </p>
      )}
      {sub && <p style={{ fontSize: ".68rem", color: "var(--text3)", marginTop: 4 }}>{sub}</p>}
      {spark && (
        <div style={{ position: "absolute", bottom: 6, right: 10, opacity: .5 }}>
          <Spark data={spark} color={sparkColor || "#3b82f6"} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CHART WRAPPER
═══════════════════════════════════════════ */
function CCard({ title, sub, badge, badgeCls, right, children, style = {} }) {
  return (
    <div className="card" style={{ padding: "16px", ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: ".85rem", fontWeight: 500, color: "var(--text)", fontFamily: "var(--disp)" }}>{title}</p>
          {sub && <p style={{ fontSize: ".68rem", color: "var(--text3)", marginTop: 2 }}>{sub}</p>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {badge && <span className={`badge ${badgeCls || "badge-info"}`}>{badge}</span>}
          {right}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   AXIS DEFAULTS
═══════════════════════════════════════════ */
const AX = { fontSize: 10, fill: "rgba(255,255,255,.25)", fontFamily: "var(--mono)" };
const GR = { stroke: "rgba(255,255,255,.04)" };

/* ═══════════════════════════════════════════
   GENERATE HEATMAP SEED DATA
═══════════════════════════════════════════ */
function genHeatmap() {
  return DAYS.map(day => ({
    day,
    hours: HOURS.map(hour => {
      const h = parseInt(hour);
      const isWork = h >= 9 && h <= 18;
      const isNight = h < 6 || h > 22;
      const base = isWork ? 70 + Math.random() * 30 : isNight ? 5 + Math.random() * 15 : 30 + Math.random() * 40;
      return { hour, val: Math.round(base) };
    })
  }));
}

/* ═══════════════════════════════════════════
   GENERATE HISTORICAL DATA (7 days)
═══════════════════════════════════════════ */
function genHistory() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let resp = 140, err = 1.2, rps = 1800;
  return days.map(d => {
    resp = smooth(resp, 80, 280, 30);
    err  = smooth(err, 0.2, 5, 0.8);
    rps  = smooth(rps, 800, 3500, 300);
    return { day: d, resp: +resp.toFixed(0), err: +err.toFixed(1), rps: +rps.toFixed(0), uptime: +(99 + Math.random() * 0.99).toFixed(2) };
  });
}

/* ═══════════════════════════════════════════
   ALERT ENGINE
═══════════════════════════════════════════ */
const DEFAULT_RULES = [
  { id: 1, name: "High response time", metric: "resp", op: ">", threshold: 300, severity: "critical", enabled: true  },
  { id: 2, name: "Error rate spike",   metric: "err",  op: ">", threshold: 3,   severity: "warning",  enabled: true  },
  { id: 3, name: "Low throughput",     metric: "thr",  op: "<", threshold: 0.8, severity: "warning",  enabled: true  },
  { id: 4, name: "P99 latency",        metric: "p99",  op: ">", threshold: 250, severity: "critical", enabled: false },
];
function checkAlerts(rules, metrics) {
  return rules.filter(r => {
    if (!r.enabled) return false;
    const v = metrics[r.metric];
    if (v == null) return false;
    return r.op === ">" ? v > r.threshold : v < r.threshold;
  });
}

/* ═══════════════════════════════════════════
   STATUS CODE DISTRIBUTION
═══════════════════════════════════════════ */
const CODE_COLORS = { "2xx": "#10b981", "3xx": "#3b82f6", "4xx": "#f59e0b", "5xx": "#ef4444" };
function codeGroup(code) {
  if (code < 300) return "2xx";
  if (code < 400) return "3xx";
  if (code < 500) return "4xx";
  return "5xx";
}

/* ═══════════════════════════════════════════
   TABS
═══════════════════════════════════════════ */
const TABS = [
  { id: "overview",  label: "Overview"   },
  { id: "latency",   label: "Latency"    },
  { id: "errors",    label: "Errors"     },
  { id: "resources", label: "Resources"  },
  { id: "traces",    label: "Tracing"    },
  { id: "alerts",    label: "Alerts"     },
  { id: "history",   label: "History"    },
  { id: "security",  label: "Security"   },
  { id: "ai",        label: "AI Insights"},
];

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function PerformanceMonitor() {
  const [tab,       setTab]       = useState("overview");
  const [paused,    setPaused]    = useState(false);
  const [range,     setRange]     = useState(30);
  const [epFilter,  setEpFilter]  = useState("all");
  const [series,    setSeries]    = useState([]);
  const [epState,   setEpState]   = useState(ENDPOINTS.map(e => ({ ...e, val: e.base, rps: Math.round(e.weight * 1200) })));
  const [logs,      setLogs]      = useState([]);
  const [alerts,    setAlerts]    = useState([]);
  const [rules,     setRules]     = useState(DEFAULT_RULES);
  const [heatmap,   setHeatmap]   = useState(genHeatmap);
  const [history,   setHistory]   = useState(genHistory);
  const [resources, setResources] = useState({ cpu: 42, mem: 61, disk: 38, net: 24 });
  const [codesDist, setCodesDist] = useState({ "2xx": 940, "3xx": 18, "4xx": 32, "5xx": 10 });
  const [lastTs,    setLastTs]    = useState("—");
  const [tickN,     setTickN]     = useState(0);
  const [secEvents, setSecEvents] = useState([]);
  const [aiInsights,setAiInsights]= useState([]);

  const stRef = useRef({
    resp: 140, err: 0.4, p50: 24, p95: 60, p99: 95, thr: 1.2,
    rps: 1200, cpu: 42, mem: 61, disk: 38, net: 24, tickN: 0,
  });

  // Seed series
  useEffect(() => {
    const s = stRef.current;
    const init = [];
    for (let i = 0; i < MAX_PTS; i++) {
      s.resp = smooth(s.resp, 60, 320, 18);
      s.err  = smooth(s.err,  0,  5,   .3);
      s.p50  = smooth(s.p50,  10, 70,  4);
      s.p95  = Math.max(s.p50 + 20, smooth(s.p95, s.p50 + 20, 190, 8));
      s.p99  = Math.max(s.p95 + 20, smooth(s.p99, s.p95 + 20, 290, 10));
      s.thr  = smooth(s.thr,  0.5, 3.5, .15);
      s.rps  = smooth(s.rps,  400, 3200, 80);
      init.push({
        t: "", resp: +s.resp.toFixed(1), err: +s.err.toFixed(2),
        p50: +s.p50.toFixed(1), p95: +s.p95.toFixed(1), p99: +s.p99.toFixed(1),
        thr: +s.thr.toFixed(2), rps: Math.round(s.rps),
        dns: +(smooth(12, 4, 25, 2)).toFixed(0),
        tcp: +(smooth(8,  2, 18, 1)).toFixed(0),
        tls: +(smooth(22, 10,40, 3)).toFixed(0),
        svr: +s.p50.toFixed(0),
      });
    }
    setSeries(init);

    // Seed AI insights
    setAiInsights([
      { icon: "🔮", type: "Prediction", msg: "/api/search likely to exceed 500ms threshold in ~18 min based on current trend.", severity: "warn" },
      { icon: "⚡", type: "Optimization", msg: "Cache TTL for /api/products responses could reduce DB load by ~32%.", severity: "info" },
      { icon: "🚨", type: "Anomaly", msg: "Unusual error spike pattern detected — matches historical DDoS signature.", severity: "err" },
      { icon: "📈", type: "Trend", msg: "Monday 09:00–11:00 consistently shows 2.4× traffic increase. Pre-scale recommended.", severity: "info" },
      { icon: "🧠", type: "Insight", msg: "P99 latency correlates strongly (r=0.87) with DB connection pool saturation.", severity: "warn" },
    ]);

    // Seed security events
    setSecEvents([
      { ts: "14:22:01", msg: "Brute force detected: /api/login — 48 attempts from 203.0.113.22", sev: "err"  },
      { ts: "14:20:55", msg: "Rate limit triggered: /api/search — 429 to 192.168.4.100",          sev: "warn" },
      { ts: "14:19:30", msg: "Unusual payload size: POST /api/orders — 12.4 MB body",              sev: "warn" },
      { ts: "14:17:12", msg: "JWT expiry anomaly: 3 tokens reused after invalidation",             sev: "err"  },
      { ts: "14:15:00", msg: "Geo anomaly: request from new country (CN) for user #4421",          sev: "warn" },
      { ts: "14:12:44", msg: "Auth success after 5 failures: user admin@example.com",              sev: "info" },
      { ts: "14:10:02", msg: "SQL injection attempt blocked: /api/users?id=1' OR 1=1",             sev: "err"  },
    ]);
  }, []);

  const tick = useCallback(() => {
    if (paused) return;
    const s = stRef.current;
    const spike = Math.random() < 0.035;
    s.resp = spike ? s.resp + 100 + Math.random() * 150 : smooth(s.resp, 60, 320, 18);
    s.err  = spike ? s.err + 2  : smooth(s.err,  0, 5, .3);
    s.p50  = smooth(s.p50, 10, 70, 4);
    s.p95  = Math.max(s.p50 + 20, smooth(s.p95, s.p50 + 20, 190, 8));
    s.p99  = Math.max(s.p95 + 20, smooth(s.p99, s.p95 + 20, 290, 10));
    s.thr  = smooth(s.thr, 0.5, 3.5, .15);
    s.rps  = smooth(s.rps, 400, 3200, 80);
    s.cpu  = smooth(s.cpu, 15, 95, 3);
    s.mem  = smooth(s.mem, 40, 92, 2);
    s.disk = smooth(s.disk, 20, 75, 1);
    s.net  = smooth(s.net, 5, 80, 5);
    s.tickN++;

    const ts = nowTs();
    const pt = {
      t: ts, resp: +s.resp.toFixed(1), err: +s.err.toFixed(2),
      p50: +s.p50.toFixed(1), p95: +s.p95.toFixed(1), p99: +s.p99.toFixed(1),
      thr: +s.thr.toFixed(2), rps: Math.round(s.rps),
      dns: Math.round(smooth(12, 4, 25, 2)),
      tcp: Math.round(smooth(8, 2, 18, 1)),
      tls: Math.round(smooth(22, 10, 40, 3)),
      svr: +s.p50.toFixed(0),
    };
    setSeries(prev => [...prev.slice(-(MAX_PTS - 1)), pt]);
    setResources({ cpu: +s.cpu.toFixed(0), mem: +s.mem.toFixed(0), disk: +s.disk.toFixed(0), net: +s.net.toFixed(0) });
    setEpState(prev => prev.map(e => ({ ...e, val: smooth(e.val, e.base * .6, e.base * 1.9, e.base * .08), rps: Math.round(smooth(e.rps, e.weight * 300, e.weight * 3200, e.weight * 100)) })));

    // Status codes
    setCodesDist(prev => {
      const code = rand(STATUS_CODES);
      const grp  = codeGroup(code);
      return { ...prev, [grp]: prev[grp] + 1 };
    });

    // Logs
    if (s.tickN % 4 === 0 || spike) {
      const entry = spike ? rand(SPIKE_MSGS) : rand(LOG_MESSAGES);
      setLogs(prev => [{ ts, ...entry, id: Math.random() }, ...prev].slice(0, 30));
    }

    // Alerts
    const triggered = checkAlerts(rules, { resp: s.resp, err: s.err, thr: s.thr, p99: s.p99 });
    if (triggered.length) {
      setAlerts(prev => [
        ...triggered.map(r => ({
          id: Math.random(), ts, rule: r.name, severity: r.severity,
          msg: `${r.metric.toUpperCase()} = ${fmt(stRef.current[r.metric], 1)} (threshold: ${r.op} ${r.threshold})`
        })),
        ...prev
      ].slice(0, 25));
    }

    setLastTs(ts);
    setTickN(n => n + 1);
  }, [paused, rules]);

  useEffect(() => {
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [tick]);

  const vis   = series.slice(-range);
  const last  = vis[vis.length - 1] || {};
  const prev  = vis[vis.length - 2] || last;
  const maxEp = Math.max(...epState.map(e => e.val));

  const filteredVis = useMemo(() => {
    if (epFilter === "all") return vis;
    const ep = ENDPOINTS.find(e => e.id === epFilter);
    if (!ep) return vis;
    const scale = (ep.base / 140);
    return vis.map(d => ({ ...d, resp: +(d.resp * scale * (0.9 + Math.random() * .2)).toFixed(1) }));
  }, [vis, epFilter]);

  const codeTotal = Object.values(codesDist).reduce((a, b) => a + b, 0);
  const codePie   = Object.entries(codesDist).map(([k, v]) => ({ name: k, value: v, color: CODE_COLORS[k] }));

  const rpsArr  = vis.map(d => d.rps);
  const respArr = vis.map(d => d.resp);
  const errArr  = vis.map(d => d.err);
  const thrArr  = vis.map(d => d.thr);
  const p50Arr  = vis.map(d => d.p50);

  // ─── OVERVIEW TAB ────────────────────────
  const renderOverview = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Metric row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <MetricCard label="API Response" value={last.resp ? Math.round(last.resp) : "—"} unit="ms"
          badge={latBadge(last.resp || 0)} spark={respArr} sparkColor="#3b82f6" accent="#3b82f6"
          delta={last.resp && prev.resp ? `${Math.abs(last.resp - prev.resp).toFixed(0)} ms` : undefined}
          deltaGood={(last.resp || 0) < (prev.resp || 0)} />
        <MetricCard label="Errors / sec" value={last.err?.toFixed(1) ?? "—"} unit="/s"
          badge={errBadge(last.err || 0)} spark={errArr} sparkColor="#ef4444" accent="#ef4444"
          delta={last.err && prev.err ? `${Math.abs(last.err - prev.err).toFixed(2)}/s` : undefined}
          deltaGood={(last.err || 0) < (prev.err || 0)} />
        <MetricCard label="Requests / sec" value={last.rps ? fmtK(last.rps) : "—"} unit="/s"
          spark={rpsArr} sparkColor="#10b981" accent="#10b981"
          sub={`~${last.rps ? fmtK(last.rps * 60) : "—"} req/min`} />
        <MetricCard label="Throughput" value={last.thr?.toFixed(1) ?? "—"} unit="k/s"
          spark={thrArr} sparkColor="#8b5cf6" accent="#8b5cf6"
          badge={{ text: `${((last.err || 0) > 0 ? ((1 - (last.err || 0) / ((last.rps || 1) / 100)) * 100) : 99.9).toFixed(1)}% success`, cls: "badge-ok" }} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <CCard title="API response time" sub="Rolling average · ms" badge={latBadge(last.resp || 0).text} badgeCls={latBadge(last.resp || 0).cls}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span className="label-upper">Filter endpoint:</span>
            {["all", ...ENDPOINTS.map(e => e.id)].map(id => (
              <button key={id} className={`tab-btn ${epFilter === id ? "active" : ""}`}
                style={{ padding: "2px 8px", fontSize: ".62rem" }}
                onClick={() => setEpFilter(id)}>
                {id === "all" ? "All" : "/" + id}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={filteredVis} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}  />
                </linearGradient>
              </defs>
              <CartesianGrid {...GR} strokeDasharray="3 3" />
              <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(filteredVis.length / 5)} />
              <YAxis tick={AX} tickLine={false} axisLine={false} />
              <Tooltip content={<CTip unit=" ms" />} />
              <Area type="monotone" dataKey="resp" name="Response" stroke="#3b82f6"
                strokeWidth={1.5} fill="url(#gR)" dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CCard>

        <CCard title="Status codes" sub="Distribution">
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={codePie} cx="50%" cy="50%" innerRadius={28} outerRadius={46}
                paddingAngle={2} dataKey="value">
                {codePie.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} (${((v / codeTotal) * 100).toFixed(1)}%)`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
            {codePie.map(c => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, display: "inline-block" }} />
                <span style={{ fontSize: ".65rem", color: "var(--text2)", fontFamily: "var(--mono)" }}>
                  {c.name}: {c.value}
                </span>
              </div>
            ))}
          </div>
        </CCard>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <CCard title="Errors per second" sub="Detected failures" badge={errBadge(last.err || 0).text} badgeCls={errBadge(last.err || 0).cls}>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={vis} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid {...GR} strokeDasharray="3 3" />
              <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length / 5)} />
              <YAxis tick={AX} tickLine={false} axisLine={false} />
              <Tooltip content={<CTip unit="/s" />} />
              <Bar dataKey="err" name="Errors" fill="#ef4444" fillOpacity={.7} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CCard>

        <CCard title="Requests per second" sub="Incoming traffic volume">
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={vis} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gRPS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}  />
                </linearGradient>
              </defs>
              <CartesianGrid {...GR} strokeDasharray="3 3" />
              <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length / 5)} />
              <YAxis tick={AX} tickLine={false} axisLine={false} />
              <Tooltip content={<CTip unit=" req/s" />} />
              <Area type="monotone" dataKey="rps" name="RPS" stroke="#10b981"
                strokeWidth={1.5} fill="url(#gRPS)" dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CCard>
      </div>

      {/* Endpoint + Log */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <CCard title="Endpoint latency" sub="All routes ranked">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {[...epState].sort((a, b) => b.val - a.val).map(ep => {
              const pct = (ep.val / maxEp) * 100;
              const col = latColor(ep.val);
              return (
                <div key={ep.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0 }} />
                  <span className="mono" style={{ fontSize: ".7rem", color: "var(--text2)", width: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ep.path}</span>
                  <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: col }} />
                  </div>
                  <span className="mono" style={{ fontSize: ".68rem", color: "var(--text2)", width: 48, textAlign: "right" }}>{Math.round(ep.val)}ms</span>
                  <span className="mono" style={{ fontSize: ".62rem", color: "var(--text3)", width: 36, textAlign: "right" }}>{ep.rps}/s</span>
                </div>
              );
            })}
          </div>
        </CCard>

        <CCard title="Event log" sub="Real-time system events">
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
            {logs.length === 0 && <p style={{ fontSize: ".7rem", color: "var(--text3)", fontStyle: "italic" }}>Waiting…</p>}
            {logs.slice(0, 15).map(l => (
              <div key={l.id} className="slide-in" style={{ display: "flex", gap: 8, padding: "5px 8px", background: "rgba(255,255,255,.02)", borderRadius: 6, fontSize: ".68rem" }}>
                <span className="mono" style={{ color: "var(--text3)", whiteSpace: "nowrap", minWidth: 58 }}>{l.ts}</span>
                <span style={{ color: "var(--text2)", flex: 1 }}>{l.msg}</span>
                <span className={`badge ${l.type === "ok" ? "badge-ok" : l.type === "warn" ? "badge-warn" : l.type === "err" ? "badge-err" : "badge-info"}`}
                  style={{ fontSize: ".55rem", padding: "1px 5px" }}>{l.type.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </CCard>
      </div>
    </div>
  );

  // ─── LATENCY BREAKDOWN TAB ───────────────
  const renderLatency = () => {
    const stageData = TRACE_STAGES.map(s => ({
      ...s,
      ms: Math.round(smooth(s.baseMs, s.baseMs * .5, s.baseMs * 2, s.baseMs * .15))
    }));
    const total = stageData.slice(0, -1).reduce((a, s) => a + s.ms, 0);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[
            { label: "DNS Lookup",    val: last.dns, unit: "ms", color: "#8b5cf6" },
            { label: "TCP Connect",   val: last.tcp, unit: "ms", color: "#3b82f6" },
            { label: "TLS Handshake", val: last.tls, unit: "ms", color: "#14b8a6" },
            { label: "Server Process",val: last.p50, unit: "ms", color: "#f59e0b" },
          ].map(m => (
            <MetricCard key={m.label} label={m.label} value={m.val ?? "—"} unit={m.unit} accent={m.color}
              spark={vis.map(() => smooth(m.val || 10, (m.val || 10) * .5, (m.val || 10) * 2, 3))}
              sparkColor={m.color} />
          ))}
        </div>

        <CCard title="Latency breakdown per request" sub="DNS → TCP → TLS → Server → DB → Cache">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {stageData.map((s, i) => {
              const pct = s.label === "Total" ? 100 : (s.ms / (total || 1)) * 100;
              return (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 60, fontSize: ".72rem", color: s.label === "Total" ? "var(--text)" : "var(--text2)", fontWeight: s.label === "Total" ? 600 : 400 }}>{s.label}</span>
                  {s.label !== "Total" ? (
                    <div className="progress-bar" style={{ flex: 1, height: 6 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                  ) : (
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  )}
                  <span className="mono" style={{ fontSize: ".72rem", color: s.label === "Total" ? "var(--text)" : s.color, minWidth: 44, textAlign: "right", fontWeight: s.label === "Total" ? 600 : 400 }}>
                    {s.ms}ms
                  </span>
                  {s.label !== "Total" && (
                    <span className="mono" style={{ fontSize: ".62rem", color: "var(--text3)", minWidth: 32, textAlign: "right" }}>
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CCard>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <CCard title="P50 / P95 / P99 percentiles" sub="Execution latency distribution · ms">
            <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              {[["P50", "#10b981"], ["P95", "#f59e0b"], ["P99", "#ef4444"]].map(([l, c]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 16, height: 2, background: c, borderRadius: 1, display: "inline-block" }} />
                  <span style={{ fontSize: ".65rem", color: "var(--text3)" }}>{l}: {l === "P50" ? last.p50?.toFixed(0) : l === "P95" ? last.p95?.toFixed(0) : last.p99?.toFixed(0)}ms</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={vis} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid {...GR} strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length / 5)} />
                <YAxis tick={AX} tickLine={false} axisLine={false} />
                <Tooltip content={<CTip unit=" ms" />} />
                <Line type="monotone" dataKey="p50" name="P50" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                <Line type="monotone" dataKey="p95" name="P95" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                <Line type="monotone" dataKey="p99" name="P99" stroke="#ef4444" strokeWidth={1}   dot={false} strokeDasharray="2 3" />
              </LineChart>
            </ResponsiveContainer>
          </CCard>

          <CCard title="Endpoint comparison" sub="Average latency per route · ms">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={[...epState].sort((a, b) => b.val - a.val)} layout="vertical"
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GR} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={AX} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="path" tick={{ ...AX, fontSize: 9 }} tickLine={false} width={90} />
                <Tooltip content={<CTip unit=" ms" />} />
                <Bar dataKey="val" name="Latency" radius={[0, 2, 2, 0]}
                  fill="#3b82f6"
                  cell={epState.map(e => ({ fill: latColor(e.val) }))}
                />
              </BarChart>
            </ResponsiveContainer>
          </CCard>
        </div>
      </div>
    );
  };

  // ─── RESOURCES TAB ───────────────────────
  const renderResources = () => {
    const resItems = [
      { label: "CPU Usage",    val: resources.cpu,  color: resources.cpu  > 80 ? "#ef4444" : resources.cpu  > 60 ? "#f59e0b" : "#10b981", unit: "%" },
      { label: "Memory",       val: resources.mem,  color: resources.mem  > 85 ? "#ef4444" : resources.mem  > 70 ? "#f59e0b" : "#3b82f6",  unit: "%" },
      { label: "Disk I/O",     val: resources.disk, color: resources.disk > 70 ? "#ef4444" : resources.disk > 50 ? "#f59e0b" : "#8b5cf6",  unit: "%" },
      { label: "Network I/O",  val: resources.net,  color: resources.net  > 75 ? "#ef4444" : resources.net  > 55 ? "#f59e0b" : "#14b8a6",  unit: "%" },
    ];
    const resRadial = resItems.map(r => ({ name: r.label, value: r.val, fill: r.color }));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {resItems.map(r => (
            <div key={r.label} className="card" style={{ padding: "16px 18px" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: r.color, borderRadius: "12px 12px 0 0", opacity: .7 }} />
              <p className="label-upper" style={{ marginBottom: 8 }}>{r.label}</p>
              <p className="metric-val" style={{ fontSize: "1.8rem", color: r.color }}>{r.val}<span style={{ fontSize: ".85rem", color: "var(--text3)", marginLeft: 3 }}>%</span></p>
              <div className="progress-bar" style={{ marginTop: 10, height: 4 }}>
                <div className="progress-fill" style={{ width: `${r.val}%`, background: r.color }} />
              </div>
              <p style={{ fontSize: ".65rem", color: "var(--text3)", marginTop: 5 }}>
                {r.val > 80 ? "⚠ High" : r.val > 60 ? "Moderate" : "Normal"}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <CCard title="Resource utilization" sub="Radial view — last sample">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart innerRadius={25} outerRadius={90} data={resRadial} startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" cornerRadius={4} label={{ fill: "rgba(255,255,255,.4)", fontSize: 10 }} />
                <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: ".68rem", color: "var(--text2)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </CCard>

          <CCard title="Service health" sub="Real-time status of all services">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {SERVICES.map(sv => (
                <div key={sv.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(255,255,255,.02)", borderRadius: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: sv.warn ? "#f59e0b" : sv.ok ? "#10b981" : "#ef4444", flexShrink: 0 }} className={sv.ok && !sv.warn ? "pulse-dot" : ""} />
                  <span style={{ flex: 1, fontSize: ".78rem", color: "var(--text2)" }}>{sv.name}</span>
                  <span className="mono" style={{ fontSize: ".65rem", color: "var(--text3)" }}>{sv.latency}ms</span>
                  <span className={`badge ${sv.warn ? "badge-warn" : sv.ok ? "badge-ok" : "badge-err"}`} style={{ fontSize: ".55rem" }}>
                    {sv.warn ? "degraded" : sv.ok ? "online" : "offline"}
                  </span>
                </div>
              ))}
            </div>
          </CCard>
        </div>
      </div>
    );
  };

  // ─── DISTRIBUTED TRACING TAB ─────────────
  const renderTraces = () => {
    const traces = [
      { id: "tr-001", method: "POST", path: "/api/orders", total: 342, status: 201, stages: [{ name: "DNS", ms: 12, color: "#8b5cf6" }, { name: "TCP", ms: 8, color: "#3b82f6" }, { name: "Auth", ms: 18, color: "#14b8a6" }, { name: "API", ms: 95, color: "#f59e0b" }, { name: "DB", ms: 180, color: "#ef4444" }, { name: "Cache", ms: 6, color: "#10b981" }, { name: "Queue", ms: 23, color: "#f43f5e" }] },
      { id: "tr-002", method: "GET",  path: "/api/search", total: 518, status: 200, stages: [{ name: "DNS", ms: 8, color: "#8b5cf6" }, { name: "API", ms: 62, color: "#f59e0b" }, { name: "Search", ms: 380, color: "#ef4444" }, { name: "Cache", ms: 4, color: "#10b981" }, { name: "Format", ms: 64, color: "#3b82f6" }] },
      { id: "tr-003", method: "POST", path: "/api/login",  total: 128, status: 200, stages: [{ name: "DNS", ms: 6, color: "#8b5cf6" }, { name: "Auth", ms: 28, color: "#14b8a6" }, { name: "DB", ms: 72, color: "#ef4444" }, { name: "Token", ms: 22, color: "#10b981" }] },
      { id: "tr-004", method: "GET",  path: "/api/reports",total: 892, status: 200, stages: [{ name: "Auth", ms: 15, color: "#14b8a6" }, { name: "DB", ms: 640, color: "#ef4444" }, { name: "Agg", ms: 180, color: "#f59e0b" }, { name: "Format", ms: 57, color: "#3b82f6" }] },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          <MetricCard label="Avg trace duration" value="382" unit="ms" accent="#8b5cf6" />
          <MetricCard label="Traced requests"    value="1,248" unit="total" accent="#3b82f6" />
          <MetricCard label="DB bottleneck rate" value="68" unit="%" accent="#ef4444" />
        </div>

        <CCard title="Request traces" sub="Full journey: Frontend → API → DB → External">
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
            {traces.map(tr => {
              const maxW = 100;
              const scale = maxW / tr.total;
              return (
                <div key={tr.id} style={{ padding: "10px 12px", background: "rgba(255,255,255,.02)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span className="mono" style={{ fontSize: ".65rem", color: "var(--text3)" }}>{tr.id}</span>
                    <span className="badge badge-info" style={{ fontSize: ".55rem" }}>{tr.method}</span>
                    <span style={{ fontSize: ".75rem", color: "var(--text)", fontFamily: "var(--mono)" }}>{tr.path}</span>
                    <span style={{ flex: 1 }} />
                    <span className="mono" style={{ fontSize: ".7rem", color: "var(--text2)" }}>{tr.total}ms</span>
                    <span className={`badge ${tr.status < 300 ? "badge-ok" : tr.status < 500 ? "badge-warn" : "badge-err"}`} style={{ fontSize: ".55rem" }}>{tr.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 2, height: 18, borderRadius: 4, overflow: "hidden" }}>
                    {tr.stages.map(s => (
                      <div key={s.name} title={`${s.name}: ${s.ms}ms`}
                        style={{ width: `${s.ms * scale}%`, minWidth: 2, background: s.color, opacity: .8, position: "relative", cursor: "default" }}>
                        {s.ms * scale > 8 && (
                          <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: ".52rem", color: "#000", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {s.ms > 30 ? s.name : ""}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                    {tr.stages.map(s => (
                      <span key={s.name} style={{ fontSize: ".6rem", color: s.color, display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{ width: 6, height: 6, background: s.color, borderRadius: 1, display: "inline-block" }} />
                        {s.name}: {s.ms}ms
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CCard>
      </div>
    );
  };

  // ─── ALERTS TAB ──────────────────────────
  const renderAlerts = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <MetricCard label="Active alerts"   value={alerts.filter(a => a.severity === "critical").length} accent="#ef4444" />
        <MetricCard label="Warnings"        value={alerts.filter(a => a.severity === "warning").length}  accent="#f59e0b" />
        <MetricCard label="Rules enabled"   value={rules.filter(r => r.enabled).length} accent="#3b82f6" />
        <MetricCard label="Triggered today" value={alerts.length} accent="#8b5cf6" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <CCard title="Alert rules" sub="Configure thresholds">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {rules.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "rgba(255,255,255,.02)", borderRadius: 8 }}>
                <div
                  onClick={() => setRules(prev => prev.map(x => x.id === r.id ? { ...x, enabled: !x.enabled } : x))}
                  style={{
                    width: 28, height: 16, borderRadius: 8, cursor: "pointer",
                    background: r.enabled ? "#3b82f6" : "var(--border2)",
                    position: "relative", transition: "background .2s"
                  }}>
                  <div style={{
                    position: "absolute", top: 2, left: r.enabled ? 14 : 2,
                    width: 12, height: 12, borderRadius: "50%", background: "#fff",
                    transition: "left .2s"
                  }} />
                </div>
                <span style={{ flex: 1, fontSize: ".75rem", color: "var(--text2)" }}>{r.name}</span>
                <span className="mono" style={{ fontSize: ".65rem", color: "var(--text3)" }}>
                  {r.metric} {r.op} {r.threshold}
                </span>
                <span className={`badge ${r.severity === "critical" ? "badge-err" : "badge-warn"}`} style={{ fontSize: ".55rem" }}>
                  {r.severity}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(59,130,246,.05)", borderRadius: 8, border: "1px solid rgba(59,130,246,.15)" }}>
            <p style={{ fontSize: ".68rem", color: "var(--text3)" }}>
              💡 Alerts trigger webhooks, Slack, email, and SMS. Configure channels in Settings.
            </p>
          </div>
        </CCard>

        <CCard title="Recent alerts" sub="Triggered by rules">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto", marginTop: 4 }}>
            {alerts.length === 0 && <p style={{ fontSize: ".7rem", color: "var(--text3)", fontStyle: "italic" }}>No alerts yet…</p>}
            {alerts.slice(0, 12).map(a => (
              <div key={a.id} className={`alert-item ${a.severity === "critical" ? "alert-crit" : "alert-warn"}`}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: ".72rem", fontWeight: 600, color: a.severity === "critical" ? "var(--red2)" : "var(--amber2)" }}>
                    {a.severity === "critical" ? "🔴" : "🟡"} {a.rule}
                  </span>
                  <span className="mono" style={{ fontSize: ".6rem", color: "var(--text3)" }}>{a.ts}</span>
                </div>
                <p style={{ fontSize: ".65rem", color: "var(--text2)" }}>{a.msg}</p>
              </div>
            ))}
          </div>
        </CCard>
      </div>
    </div>
  );

  // ─── HISTORY TAB ─────────────────────────
  const renderHistory = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: "7-day avg response", value: Math.round(history.reduce((a, d) => a + d.resp, 0) / history.length) + "ms", accent: "#3b82f6" },
          { label: "7-day avg errors",   value: (history.reduce((a, d) => a + d.err, 0) / history.length).toFixed(1) + "/s", accent: "#ef4444" },
          { label: "Peak RPS",           value: fmtK(Math.max(...history.map(d => d.rps))), accent: "#10b981" },
          { label: "Avg uptime",         value: (history.reduce((a, d) => a + d.uptime, 0) / history.length).toFixed(2) + "%", accent: "#8b5cf6" },
        ].map(m => <MetricCard key={m.label} label={m.label} value={m.value} accent={m.accent} />)}
      </div>

      <CCard title="7-day performance trends" sub="Daily averages">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={history} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid {...GR} strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={AX} tickLine={false} />
            <YAxis yAxisId="l" tick={AX} tickLine={false} axisLine={false} />
            <YAxis yAxisId="r" orientation="right" tick={AX} tickLine={false} axisLine={false} />
            <Tooltip content={<CTip />} />
            <Line yAxisId="l" type="monotone" dataKey="resp" name="Resp(ms)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} />
            <Line yAxisId="r" type="monotone" dataKey="err"  name="Err/s"   stroke="#ef4444" strokeWidth={1.5} dot={{ r: 3, fill: "#ef4444" }} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </CCard>

      <CCard title="Traffic heatmap" sub="Requests by hour · 7-day view · darker = higher traffic">
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            <span style={{ width: 28 }} />
            {HOURS.filter((_, i) => i % 3 === 0).map(h => (
              <span key={h} style={{ fontSize: ".55rem", color: "var(--text3)", width: 24, textAlign: "center" }}>{h.slice(0, 2)}</span>
            ))}
          </div>
          {heatmap.map(row => (
            <div key={row.day} style={{ display: "flex", gap: 2, marginBottom: 2, alignItems: "center" }}>
              <span style={{ width: 28, fontSize: ".62rem", color: "var(--text3)", flexShrink: 0 }}>{row.day}</span>
              {row.hours.map(cell => (
                <div key={cell.hour} title={`${row.day} ${cell.hour}: ${cell.val}%`}
                  className="heatmap-cell"
                  style={{
                    width: 12, height: 12, flexShrink: 0,
                    background: `rgba(59,130,246,${(cell.val / 100) * .85 + .05})`
                  }} />
              ))}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: ".6rem", color: "var(--text3)" }}>Low</span>
            {[.1, .25, .45, .65, .85].map(o => (
              <div key={o} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(59,130,246,${o})` }} />
            ))}
            <span style={{ fontSize: ".6rem", color: "var(--text3)" }}>High</span>
          </div>
        </div>
      </CCard>
    </div>
  );

  // ─── SECURITY TAB ────────────────────────
  const renderSecurity = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <MetricCard label="Failed logins (1h)" value="48"  accent="#ef4444" badge={{ text: "Suspicious", cls: "badge-err" }} />
        <MetricCard label="Rate limited"        value="127" accent="#f59e0b" badge={{ text: "Elevated",   cls: "badge-warn" }} />
        <MetricCard label="Blocked IPs"         value="14"  accent="#8b5cf6" />
        <MetricCard label="API abuse score"     value="6.2" unit="/10" accent="#ef4444" badge={{ text: "Review", cls: "badge-warn" }} />
      </div>

      <CCard title="Security event log" sub="Unusual traffic, auth failures, abuse detection">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          {secEvents.map((e, i) => (
            <div key={i} className={`alert-item ${e.sev === "err" ? "alert-crit" : e.sev === "warn" ? "alert-warn" : "alert-info"}`}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: ".72rem", color: "var(--text2)" }}>{e.msg}</span>
                <span className="mono" style={{ fontSize: ".6rem", color: "var(--text3)", flexShrink: 0 }}>{e.ts}</span>
              </div>
            </div>
          ))}
        </div>
      </CCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <CCard title="Top blocked IPs" sub="Most frequent bad actors">
          {[
            { ip: "203.0.113.22", hits: 284, country: "CN", reason: "Brute force" },
            { ip: "198.51.100.44", hits: 127, country: "RU", reason: "Scraping"    },
            { ip: "192.0.2.188",   hits: 89,  country: "BR", reason: "SQL inject"  },
            { ip: "203.0.113.91",  hits: 62,  country: "IN", reason: "Rate abuse"  },
            { ip: "10.10.4.100",   hits: 48,  country: "—",  reason: "Port scan"   },
          ].map((ip, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="mono" style={{ fontSize: ".7rem", color: "var(--red2)", flex: 1 }}>{ip.ip}</span>
              <span style={{ fontSize: ".65rem", color: "var(--text3)" }}>{ip.country}</span>
              <span style={{ fontSize: ".65rem", color: "var(--text2)" }}>{ip.reason}</span>
              <span className="badge badge-err" style={{ fontSize: ".55rem" }}>{ip.hits} hits</span>
            </div>
          ))}
        </CCard>

        <CCard title="Auth failure trends" sub="Failed logins over time">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[
              { h: "09:00", n: 3 }, { h: "10:00", n: 7 }, { h: "11:00", n: 12 },
              { h: "12:00", n: 8 }, { h: "13:00", n: 5 }, { h: "14:00", n: 48 },
            ]} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid {...GR} strokeDasharray="3 3" />
              <XAxis dataKey="h" tick={AX} tickLine={false} />
              <YAxis tick={AX} tickLine={false} axisLine={false} />
              <Tooltip content={<CTip />} />
              <Bar dataKey="n" name="Failures" fill="#ef4444" fillOpacity={.7} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CCard>
      </div>
    </div>
  );

  // ─── AI INSIGHTS TAB ─────────────────────
  const renderAI = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "14px 16px", background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.2)", borderRadius: 12 }}>
        <p style={{ fontSize: ".8rem", color: "#c4b5fd", fontWeight: 500, marginBottom: 4 }}>🤖 AI Performance Analyst</p>
        <p style={{ fontSize: ".72rem", color: "var(--text2)", lineHeight: 1.7 }}>
          Continuously analyzing 16 metrics across 7 services. Last model run: {lastTs}.
          Anomaly detection model trained on 30 days of historical data.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        <MetricCard label="Anomalies detected" value="3"    accent="#ef4444" badge={{ text: "Action needed", cls: "badge-err" }} />
        <MetricCard label="Predictions active" value="2"    accent="#8b5cf6" badge={{ text: "Monitoring",    cls: "badge-violet" }} />
        <MetricCard label="Optimizations found" value="5"   accent="#10b981" badge={{ text: "Available",     cls: "badge-ok" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {aiInsights.map((ins, i) => (
          <div key={i} className="card" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: ins.severity === "err" ? "rgba(239,68,68,.12)" : ins.severity === "warn" ? "rgba(245,158,11,.12)" : "rgba(59,130,246,.12)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem"
              }}>{ins.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--text)", fontFamily: "var(--disp)" }}>{ins.type}</span>
                  <span className={`badge ${ins.severity === "err" ? "badge-err" : ins.severity === "warn" ? "badge-warn" : "badge-info"}`} style={{ fontSize: ".55rem" }}>
                    {ins.severity === "err" ? "Critical" : ins.severity === "warn" ? "Warning" : "Info"}
                  </span>
                </div>
                <p style={{ fontSize: ".75rem", color: "var(--text2)", lineHeight: 1.65 }}>{ins.msg}</p>
              </div>
              <button className="btn btn-ghost" style={{ fontSize: ".65rem", flexShrink: 0 }}
                onClick={() => alert(`AI Detail: ${ins.msg}`)}>View →</button>
            </div>
          </div>
        ))}
      </div>

      <CCard title="Predicted response time (next 30 min)" sub="Based on current trend + historical patterns">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={[
            ...vis.slice(-15).map((d, i) => ({ t: d.t, actual: d.resp, pred: null })),
            ...Array.from({ length: 10 }, (_, i) => ({
              t: `+${(i + 1) * 3}m`, actual: null,
              pred: smooth(last.resp || 140, 80, 350, 20)
            }))
          ]} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gPred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={.15} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GR} strokeDasharray="3 3" />
            <XAxis dataKey="t" tick={AX} tickLine={false} interval={3} />
            <YAxis tick={AX} tickLine={false} axisLine={false} />
            <Tooltip content={<CTip unit=" ms" />} />
            <Area type="monotone" dataKey="actual" name="Actual" stroke="#3b82f6" strokeWidth={1.5} fill="none" dot={false} />
            <Area type="monotone" dataKey="pred"   name="Predicted" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#gPred)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CCard>
    </div>
  );

  // ─── ERRORS TAB ──────────────────────────
  const renderErrors = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <MetricCard label="Total errors (1h)" value="184"  accent="#ef4444" badge={{ text: "Elevated", cls: "badge-warn" }} />
        <MetricCard label="4xx client errors"  value="132"  accent="#f59e0b" />
        <MetricCard label="5xx server errors"  value="52"   accent="#ef4444" />
        <MetricCard label="Error rate"         value={last.err?.toFixed(1) ?? "—"} unit="/s" badge={errBadge(last.err || 0)} accent="#ef4444" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <CCard title="Error rate over time" sub="Errors per second">
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={vis} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gErr2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}  />
                </linearGradient>
              </defs>
              <CartesianGrid {...GR} strokeDasharray="3 3" />
              <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length / 5)} />
              <YAxis tick={AX} tickLine={false} axisLine={false} />
              <Tooltip content={<CTip unit="/s" />} />
              <Area type="monotone" dataKey="err" name="Error rate" stroke="#ef4444" strokeWidth={1.5} fill="url(#gErr2)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CCard>

        <CCard title="Status code distribution" sub="Response code breakdown">
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={codePie} cx="50%" cy="50%" outerRadius={68} paddingAngle={3} dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: "rgba(255,255,255,.2)" }}>
                {codePie.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} (${((v / codeTotal) * 100).toFixed(1)}%)`, n]} />
            </PieChart>
          </ResponsiveContainer>
        </CCard>
      </div>

      <CCard title="Top error sources" sub="Grouped by endpoint + error type">
        {[
          { endpoint: "/api/reports",  code: 504, count: 28, msg: "Gateway Timeout — upstream response >10s" },
          { endpoint: "/api/auth",     code: 401, count: 48, msg: "Unauthorized — invalid or expired token" },
          { endpoint: "/api/orders",   code: 500, count: 14, msg: "Internal — DB constraint violation" },
          { endpoint: "/api/search",   code: 429, count: 62, msg: "Too Many Requests — rate limit exceeded" },
          { endpoint: "/api/payments", code: 402, count: 9,  msg: "Payment Required — card declined upstream" },
        ].map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
            <span className={`badge ${e.code >= 500 ? "badge-err" : e.code >= 400 ? "badge-warn" : "badge-info"}`}
              style={{ fontSize: ".6rem", minWidth: 36, justifyContent: "center" }}>{e.code}</span>
            <span className="mono" style={{ fontSize: ".7rem", color: "var(--text2)", width: 110 }}>{e.endpoint}</span>
            <span style={{ fontSize: ".72rem", color: "var(--text2)", flex: 1 }}>{e.msg}</span>
            <span className="badge badge-err" style={{ fontSize: ".6rem" }}>{e.count}×</span>
          </div>
        ))}
      </CCard>
    </div>
  );

  // ─── TAB RENDER MAP ───────────────────────
  const renderTab = () => {
    switch (tab) {
      case "overview":  return renderOverview();
      case "latency":   return renderLatency();
      case "errors":    return renderErrors();
      case "resources": return renderResources();
      case "traces":    return renderTraces();
      case "alerts":    return renderAlerts();
      case "history":   return renderHistory();
      case "security":  return renderSecurity();
      case "ai":        return renderAI();
      default:          return renderOverview();
    }
  };

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  const activeAlertCount = alerts.filter(a => a.severity === "critical").slice(0, 3).length;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight: "100vh", background: "var(--bg0)", padding: "0 0 40px" }}>

        {/* ── TOP HEADER ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(4,6,10,.92)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
          padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: "linear-gradient(135deg,rgba(59,130,246,.3),rgba(139,92,246,.3))",
              border: "1px solid rgba(59,130,246,.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
            }}>📊</div>
            <div>
              <p style={{ fontFamily: "var(--disp)", fontSize: ".92rem", fontWeight: 600, color: "var(--text)", lineHeight: 1 }}>
                CKC-OS Monitor
              </p>
              <p style={{ fontSize: ".6rem", color: "var(--text3)", marginTop: 2 }}>
                Advanced Performance Intelligence
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 100, padding: "3px 10px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} className={paused ? "" : "pulse-dot"} />
              <span style={{ fontSize: ".62rem", color: "#34d399", fontWeight: 600 }}>{paused ? "Paused" : "Live"}</span>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Range buttons */}
          <div style={{ display: "flex", gap: 4 }}>
            {[30, 60, 120].map(r => (
              <button key={r} className={`tab-btn ${range === r ? "active" : ""}`}
                onClick={() => setRange(r)}>
                {r === 30 ? "30s" : r === 60 ? "1m" : "2m"}
              </button>
            ))}
          </div>

          {activeAlertCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}
              onClick={() => setTab("alerts")}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} className="pulse-dot" />
              <span style={{ fontSize: ".68rem", color: "#f87171", fontWeight: 600 }}>{activeAlertCount} critical</span>
            </div>
          )}

          <button className={`btn ${paused ? "btn-primary" : "btn-danger"}`}
            onClick={() => setPaused(p => !p)}>
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>

          <span className="mono" style={{ fontSize: ".6rem", color: "var(--text3)" }}>
            {paused ? "—" : lastTs}
          </span>
        </div>

        <div style={{ padding: "16px 20px" }}>

          {/* ── NAV TABS ── */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {TABS.map(t => (
              <button key={t.id}
                className={`tab-btn ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
                style={{ whiteSpace: "nowrap" }}>
                {t.id === "alerts" && activeAlertCount > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: ".5rem", fontWeight: 700, marginRight: 4 }}>
                    {activeAlertCount}
                  </span>
                )}
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB CONTENT ── */}
          <div className="fade-in" key={tab}>
            {renderTab()}
          </div>
        </div>

        {/* ── STATUS FOOTER ── */}
        <div style={{ margin: "4px 20px 0", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {SERVICES.map(sv => (
              <div key={sv.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: sv.warn ? "#f59e0b" : sv.ok ? "#10b981" : "#ef4444" }} />
                <span style={{ fontSize: ".65rem", color: "var(--text3)" }}>{sv.name}</span>
              </div>
            ))}
          </div>
          <p className="mono" style={{ fontSize: ".6rem", color: "var(--text3)" }}>
            {paused ? "⏸ Stream paused" : `↻ tick #${tickN} · ${lastTs}`}
          </p>
        </div>
      </div>
    </>
  );
}