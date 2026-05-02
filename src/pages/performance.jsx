import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

/* ═══════════════════════════════════════════
   CONFIG — point to your backend
═══════════════════════════════════════════ */
const BACKEND_HTTP = `http://127.0.0.1:5000`;
const BACKEND_WS   = `ws://127.0.0.1:5000/metrics`;

/* ═══════════════════════════════════════════
   GLOBAL CSS
═══════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Sans:ital,wght@0,400;0,500;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
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
@keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-in{animation:fadeIn .35s ease both;}
.pulse-dot{animation:pulse2 1.6s ease-in-out infinite;}
.slide-in{animation:slideIn .25s ease both;}
.spin{animation:spin 1s linear infinite;}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;transition:border-color .2s;}
.card:hover{border-color:var(--border2);}
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
.tooltip-custom{background:#0b1118;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 12px;font-size:.72rem;box-shadow:0 8px 32px rgba(0,0,0,.5);}
.alert-item{border-left:2px solid;border-radius:0 8px 8px 0;padding:10px 14px;animation:slideIn .25s ease;}
.alert-crit{border-color:#ef4444;background:rgba(239,68,68,.06);}
.alert-warn{border-color:#f59e0b;background:rgba(245,158,11,.06);}
.alert-info{border-color:#3b82f6;background:rgba(59,130,246,.06);}
.real-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(20,184,166,.1);border:1px solid rgba(20,184,166,.3);border-radius:100px;padding:3px 10px;font-family:var(--mono);font-size:.6rem;color:#2dd4bf;font-weight:600;}
.conn-badge-ok{display:inline-flex;align-items:center;gap:5px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:100px;padding:3px 10px;font-family:var(--mono);font-size:.6rem;color:#34d399;font-weight:600;}
.conn-badge-err{display:inline-flex;align-items:center;gap:5px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:100px;padding:3px 10px;font-family:var(--mono);font-size:.6rem;color:#f87171;font-weight:600;}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.grid-2-1{display:grid;grid-template-columns:2fr 1fr;gap:10px;}
.nav-tabs{display:flex;gap:4px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;}
.nav-tabs::-webkit-scrollbar{display:none;}
@media(max-width:900px){
  .grid-4{grid-template-columns:repeat(2,1fr);}
  .grid-3{grid-template-columns:repeat(2,1fr);}
  .grid-2-1{grid-template-columns:1fr;}
  .grid-2{grid-template-columns:1fr;}
}
@media(max-width:600px){
  .grid-4{grid-template-columns:1fr 1fr;}
  .tab-btn{font-size:.68rem;padding:4px 8px;}
}
`;

/* ═══════════════════════════════════════════
   REAL BROWSER PERF HOOK (unchanged — still measures this tab)
═══════════════════════════════════════════ */
function useBrowserPerf() {
  const [perf, setPerf] = useState({
    pageLoad: null, domInteractive: null, ttfb: null, dnsTime: null, tcpTime: null, tlsTime: null,
    fcp: null, lcp: null, cls: null, fid: null,
    jsHeapUsed: null, jsHeapTotal: null, jsHeapLimit: null,
    effectiveType: null, downlink: null, rtt: null,
    hidden: false, resourceCount: 0, resourceTransferSize: 0,
    jsErrors: [], longTasks: 0, fps: 60,
    totalClicks: 0, totalScrolls: 0, totalKeystrokes: 0, sessionDuration: 0,
  });
  const countersRef = useRef({ clicks: 0, scrolls: 0, keys: 0, longTasks: 0, errors: [], fps: 60 });
  const sessionStartRef = useRef(Date.now());
  const frameRef = useRef(null);
  const fpsRef = useRef({ frames: 0, last: performance.now() });
  const observersRef = useRef([]);

  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav) {
      setPerf(p => ({
        ...p,
        pageLoad: Math.round(nav.loadEventEnd - nav.startTime),
        domInteractive: Math.round(nav.domInteractive - nav.startTime),
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        dnsTime: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcpTime: Math.round(nav.connectEnd - nav.connectStart),
        tlsTime: nav.secureConnectionStart > 0 ? Math.round(nav.connectEnd - nav.secureConnectionStart) : 0,
      }));
    }
    const paints = performance.getEntriesByType("paint");
    paints.forEach(p => { if (p.name === "first-contentful-paint") setPerf(prev => ({ ...prev, fcp: Math.round(p.startTime) })); });
    try { const lcp = new PerformanceObserver(list => { const e = list.getEntries().at(-1); setPerf(p => ({ ...p, lcp: Math.round(e.startTime) })); }); lcp.observe({ type: "largest-contentful-paint", buffered: true }); observersRef.current.push(lcp); } catch {}
    try { let clsVal = 0; const cls = new PerformanceObserver(list => { list.getEntries().forEach(e => { if (!e.hadRecentInput) clsVal += e.value; }); setPerf(p => ({ ...p, cls: +clsVal.toFixed(4) })); }); cls.observe({ type: "layout-shift", buffered: true }); observersRef.current.push(cls); } catch {}
    try { const fid = new PerformanceObserver(list => { list.getEntries().forEach(e => setPerf(p => ({ ...p, fid: Math.round(e.processingStart - e.startTime) }))); }); fid.observe({ type: "first-input", buffered: true }); observersRef.current.push(fid); } catch {}
    try { const lt = new PerformanceObserver(list => { countersRef.current.longTasks += list.getEntries().length; }); lt.observe({ type: "longtask" }); observersRef.current.push(lt); } catch {}
    const updateResources = () => { const entries = performance.getEntriesByType("resource"); setPerf(p => ({ ...p, resourceCount: entries.length, resourceTransferSize: Math.round(entries.reduce((a, e) => a + (e.transferSize || 0), 0) / 1024) })); };
    try { const ro = new PerformanceObserver(() => updateResources()); ro.observe({ type: "resource" }); observersRef.current.push(ro); } catch {}
    updateResources();
    const onClick = () => countersRef.current.clicks++;
    const onScroll = () => countersRef.current.scrolls++;
    const onKey = () => countersRef.current.keys++;
    const onError = (e) => { countersRef.current.errors = [...countersRef.current.errors.slice(-9), { msg: e.message || "Unknown error", ts: new Date().toLocaleTimeString() }]; };
    window.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("error", onError);
    document.addEventListener("visibilitychange", () => setPerf(p => ({ ...p, hidden: document.hidden })));
    const measureFps = (now) => { fpsRef.current.frames++; const elapsed = now - fpsRef.current.last; if (elapsed >= 500) { countersRef.current.fps = Math.round((fpsRef.current.frames / elapsed) * 1000); fpsRef.current = { frames: 0, last: now }; } frameRef.current = requestAnimationFrame(measureFps); };
    frameRef.current = requestAnimationFrame(measureFps);
    const iv = setInterval(() => {
      const mem = performance.memory; const conn = navigator.connection;
      setPerf(p => ({
        ...p,
        jsHeapUsed: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
        jsHeapTotal: mem ? Math.round(mem.totalJSHeapSize / 1048576) : null,
        jsHeapLimit: mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : null,
        effectiveType: conn?.effectiveType || null,
        downlink: conn?.downlink || null,
        rtt: conn?.rtt || null,
        fps: countersRef.current.fps,
        longTasks: countersRef.current.longTasks,
        jsErrors: countersRef.current.errors,
        totalClicks: countersRef.current.clicks,
        totalScrolls: countersRef.current.scrolls,
        totalKeystrokes: countersRef.current.keys,
        sessionDuration: Math.floor((Date.now() - sessionStartRef.current) / 1000),
      }));
    }, 1000);
    return () => { clearInterval(iv); cancelAnimationFrame(frameRef.current); observersRef.current.forEach(o => o.disconnect()); window.removeEventListener("click", onClick); window.removeEventListener("scroll", onScroll); window.removeEventListener("keydown", onKey); window.removeEventListener("error", onError); };
  }, []);
  return perf;
}

/* ═══════════════════════════════════════════
   BACKEND DATA HOOK — WebSocket + REST
═══════════════════════════════════════════ */
function useBackendMetrics(paused) {
  const [connected, setConnected] = useState(false);
  const [series, setSeries] = useState([]);
  const [latest, setLatest] = useState(null);
  const [services, setServices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [traces, setTraces] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [requestLog, setRequestLog] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [statusCodes, setStatusCodes] = useState({ "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 });
  const wsRef = useRef(null);
  const pausedRef = useRef(paused);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Load static/slow REST data
  useEffect(() => {
    const load = async () => {
      try {
        const [svc, tr, hm, wk, si] = await Promise.all([
          fetch(`${BACKEND_HTTP}/api/services`).then(r => r.json()),
          fetch(`${BACKEND_HTTP}/api/traces`).then(r => r.json()),
          fetch(`${BACKEND_HTTP}/api/metrics/heatmap`).then(r => r.json()),
          fetch(`${BACKEND_HTTP}/api/metrics/weekly`).then(r => r.json()),
          fetch(`${BACKEND_HTTP}/api/system`).then(r => r.json()),
        ]);
        setServices(svc);
        setTraces(tr);
        setHeatmap(hm);
        setWeekly(wk);
        setSystemInfo(si);
      } catch (e) {
        console.warn("REST load failed:", e.message);
      }
    };
    load();
    // Refresh traces, services, codes every 5s
    const iv = setInterval(async () => {
      try {
        const [svc, tr, rl, codes] = await Promise.all([
          fetch(`${BACKEND_HTTP}/api/services`).then(r => r.json()),
          fetch(`${BACKEND_HTTP}/api/traces`).then(r => r.json()),
          fetch(`${BACKEND_HTTP}/api/logs/requests?limit=30`).then(r => r.json()),
          fetch(`${BACKEND_HTTP}/api/metrics/codes`).then(r => r.json()),
        ]);
        setServices(svc);
        setTraces(tr);
        setRequestLog(rl);
        setStatusCodes(codes);
      } catch {}
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  // Refresh alerts every 3s
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetch(`${BACKEND_HTTP}/api/alerts`).then(r => r.json());
        setAlerts(data);
      } catch {}
    };
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, []);

  // WebSocket for live series
  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;
    let isCleaningUp = false;

    const connect = () => {
      if (isCleaningUp) return;
      
      // Cleanup existing socket before connecting
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === 1 || ws.readyState === 0) ws.close();
      }
      
      try {
        console.log(`[WS] Attempting connection to ${BACKEND_WS}...`);
        ws = new WebSocket(BACKEND_WS);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          console.log("%c[WS] Connected to backend metrics", "color: #10b981; font-weight: bold;");
        };

        ws.onmessage = (evt) => {
          if (pausedRef.current) return;
          try {
            const msg = JSON.parse(evt.data);
            if (msg.type === "ping") return;
            
            if (msg.type === "history") {
              const pts = msg.data.map(snap => flattenSnap(snap));
              setSeries(pts);
              if (msg.data.length > 0) setLatest(msg.data.at(-1));
            } else if (msg.type === "tick") {
              const snap = msg.data;
              setLatest(snap);
              setSeries(prev => {
                const next = [...prev, flattenSnap(snap)];
                return next.slice(-300);
              });
            }
          } catch (err) {
            console.warn("[WS] Message parse error:", err.message);
          }
        };

        ws.onclose = (event) => {
          setConnected(false);
          if (!isCleaningUp) {
            const delay = 3000;
            console.log(`[WS] Disconnected (code: ${event.code}), retrying in ${delay/1000}s...`);
            reconnectTimer = setTimeout(connect, delay);
          }
        };

        ws.onerror = (err) => {
          console.error("[WS] WebSocket error observed:", err);
          setConnected(false);
        };
      } catch (err) {
        console.error("[WS] Connection initiation failed:", err.message);
        setConnected(false);
        if (!isCleaningUp) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      }
    };

    connect();
    return () => {
      isCleaningUp = true;
      clearTimeout(reconnectTimer);
      if (ws?.readyState === 1) {
        ws.close();
      }
    };
  }, []);

  return { connected, series, latest, services, alerts, traces, heatmap, weekly, requestLog, systemInfo, statusCodes };
}

/** Flatten a backend snapshot into a chart-friendly flat object */
function flattenSnap(snap) {
  return {
    t: snap.ts ? new Date(snap.ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "",
    resp: snap.api?.resp ?? 0,
    err: snap.api?.err ?? 0,
    rps: snap.api?.rps ?? 0,
    thr: snap.api?.thr ?? 0,
    p50: snap.api?.p50 ?? 0,
    p95: snap.api?.p95 ?? 0,
    p99: snap.api?.p99 ?? 0,
    cpu: snap.cpu?.loadPct ?? 0,
    memPct: snap.memory?.usedPct ?? 0,
    memUsed: snap.memory?.usedMB ?? 0,
    rxKBps: snap.network?.rxKBps ?? 0,
    txKBps: snap.network?.txKBps ?? 0,
    nodeHeap: snap.memory?.nodeHeapUsedMB ?? 0,
    loadAvg: snap.cpu?.loadAvg1 ?? 0,
    spike: snap.spike ?? false,
    tick: snap.tick ?? 0,
  };
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const fmt    = (n, d = 0) => n != null ? Number(n).toFixed(d) : "—";
const fmtK   = n => n >= 1000 ? (n/1000).toFixed(1)+"k" : String(Math.round(n));
const fmtDur = s => { if (!s) return "0s"; if (s < 60) return s+"s"; if (s < 3600) return Math.floor(s/60)+"m "+( s%60)+"s"; return Math.floor(s/3600)+"h "+Math.floor((s%3600)/60)+"m"; };
const fmtBytes = b => b > 1024*1024 ? (b/1024/1024).toFixed(1)+" MB/s" : b > 1024 ? (b/1024).toFixed(1)+" KB/s" : b+" B/s";
function latColor(ms) { return ms < 150 ? "#10b981" : ms < 300 ? "#f59e0b" : "#ef4444"; }
function latBadge(ms) { return ms < 150 ? { text:"Normal", cls:"badge-ok" } : ms < 280 ? { text:"Elevated", cls:"badge-warn" } : { text:"Critical", cls:"badge-err" }; }
function errBadge(e)  { return e < 1 ? { text:"Healthy", cls:"badge-ok" } : e < 3 ? { text:"Elevated", cls:"badge-warn" } : { text:"Critical", cls:"badge-err" }; }
function fpsColor(f)  { return f >= 55 ? "#10b981" : f >= 30 ? "#f59e0b" : "#ef4444"; }
function lcpScore(ms) { return ms < 2500 ? "Good" : ms < 4000 ? "Needs work" : "Poor"; }
function lcpColor(ms) { return ms < 2500 ? "#10b981" : ms < 4000 ? "#f59e0b" : "#ef4444"; }
function clsScore(v)  { return v < 0.1 ? "Good" : v < 0.25 ? "Needs work" : "Poor"; }
function clsColor(v)  { return v < 0.1 ? "#10b981" : v < 0.25 ? "#f59e0b" : "#ef4444"; }
const CODE_COLORS = { "2xx":"#10b981","3xx":"#3b82f6","4xx":"#f59e0b","5xx":"#ef4444" };
const AX = { fontSize:10, fill:"rgba(255,255,255,.25)", fontFamily:"var(--mono)" };
const GR = { stroke:"rgba(255,255,255,.04)" };

function CTip({ active, payload, label, unit="" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip-custom">
      <p style={{ color:"var(--text3)", marginBottom:4, fontSize:".65rem" }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, fontFamily:"var(--mono)", fontSize:".7rem" }}>
          {p.name}: <strong>{typeof p.value==="number"?p.value.toFixed(1):p.value}</strong>{unit}
        </p>
      ))}
    </div>
  );
}

function Spark({ data=[], color="#3b82f6", h=28, w=90 }) {
  if (!data || data.length < 2) return null;
  const mn=Math.min(...data), mx=Math.max(...data), rng=mx-mn||1;
  const pts = data.map((v,i)=>`${((i/(data.length-1))*w).toFixed(1)},${(h-((v-mn)/rng)*(h-3)-1).toFixed(1)}`).join(" ");
  const id = `sg${color.replace(/[^a-z0-9]/gi,"")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MetricCard({ label, value, unit, sub, badge, spark, sparkColor, accent, realBadge }) {
  return (
    <div className="card" style={{ padding:"16px 18px", position:"relative", overflow:"hidden" }}>
      {accent && <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${accent},transparent)` }}/>}
      <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
        <p className="label-upper" style={{ margin:0 }}>{label}</p>
        {realBadge && <span className="real-badge">LIVE</span>}
      </div>
      <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:6 }}>
        <span className="metric-val" style={{ fontSize:"1.65rem", color:"var(--text)" }}>{value}</span>
        {unit && <span style={{ fontSize:".75rem", color:"var(--text3)" }}>{unit}</span>}
      </div>
      {badge && <span className={`badge ${badge.cls}`}>{badge.text}</span>}
      {sub && <p style={{ fontSize:".68rem", color:"var(--text3)", marginTop:4 }}>{sub}</p>}
      {spark && <div style={{ position:"absolute", bottom:6, right:10, opacity:.5 }}><Spark data={spark} color={sparkColor||"#3b82f6"}/></div>}
    </div>
  );
}

function CCard({ title, sub, badge, badgeCls, right, children, style={} }) {
  return (
    <div className="card" style={{ padding:"16px", ...style }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <p style={{ fontSize:".85rem", fontWeight:500, color:"var(--text)", fontFamily:"var(--disp)" }}>{title}</p>
          {sub && <p style={{ fontSize:".68rem", color:"var(--text3)", marginTop:2 }}>{sub}</p>}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
          {badge && <span className={`badge ${badgeCls||"badge-info"}`}>{badge}</span>}
          {right}
        </div>
      </div>
      {children}
    </div>
  );
}

const TABS = [
  { id:"realtime", label:"🔴 Real-Time" },
  { id:"overview", label:"Overview" },
  { id:"latency",  label:"Latency" },
  { id:"errors",   label:"Errors" },
  { id:"resources",label:"Resources" },
  { id:"traces",   label:"Tracing" },
  { id:"alerts",   label:"Alerts" },
  { id:"history",  label:"History" },
];

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function PerformanceMonitor() {
  const [tab,      setTab]      = useState("overview");
  const [paused,   setPaused]   = useState(false);
  const [range,    setRange]    = useState(60);
  const [epFilter, setEpFilter] = useState("all");
  const [fpsHistory, setFpsHistory] = useState([]);

  const browserPerf = useBrowserPerf();
  const backend = useBackendMetrics(paused);
  const { connected, series, latest, services, alerts, traces, heatmap, weekly, requestLog, systemInfo, statusCodes } = backend;

  useEffect(() => {
    if (!paused) {
      setFpsHistory(prev => [...prev.slice(-29), browserPerf.fps || 60]);
    }
  }, [browserPerf.fps, paused]);

  const vis = series.slice(-range);
  const last = vis[vis.length - 1] || {};
  const prev = vis[vis.length - 2] || last;

  const respArr = vis.map(d => d.resp);
  const errArr  = vis.map(d => d.err);
  const rpsArr  = vis.map(d => d.rps);
  const thrArr  = vis.map(d => d.thr);
  const cpuArr  = vis.map(d => d.cpu);
  const memArr  = vis.map(d => d.memPct);

  const epState = latest?.endpoints || [];
  const maxEp   = Math.max(...epState.map(e => e.latencyMs), 1);

  const codePie    = Object.entries(statusCodes).map(([k,v]) => ({ name:k, value:v, color:CODE_COLORS[k] }));
  const codeTotal  = Object.values(statusCodes).reduce((a,b) => a+b, 0);

  const critAlertCount = alerts.filter(a => a.severity === "critical").length;

  // ── REAL-TIME BROWSER TAB ──
  const renderRealTime = () => {
    const { pageLoad, ttfb, dnsTime, tlsTime, fcp, lcp, cls, fid, jsHeapUsed, jsHeapTotal, jsHeapLimit, effectiveType, downlink, rtt, fps, longTasks, jsErrors, totalClicks, totalScrolls, totalKeystrokes, sessionDuration, resourceCount, resourceTransferSize, hidden } = browserPerf;

    const VitalCard = ({ label, value, unit, color, sub }) => (
      <div className="card" style={{ padding:"16px 18px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color},transparent)` }}/>
        <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:6 }}>
          <p className="label-upper" style={{ margin:0 }}>{label}</p>
          <span className="real-badge">BROWSER</span>
        </div>
        <p className="metric-val" style={{ fontSize:"1.55rem", color:"var(--text)" }}>
          {value ?? <span style={{ fontSize:".85rem",color:"var(--text3)" }}>Measuring…</span>}
          {value != null && <span style={{ fontSize:".72rem",color:"var(--text3)",marginLeft:4 }}>{unit}</span>}
        </p>
        {sub && <p style={{ fontSize:".68rem",color,marginTop:5 }}>{sub}</p>}
      </div>
    );

    return (
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        <div style={{ padding:"12px 16px",background:"rgba(20,184,166,.07)",border:"1px solid rgba(20,184,166,.25)",borderRadius:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
          <span style={{ fontSize:"1rem" }}>🔴</span>
          <div>
            <p style={{ fontSize:".8rem",color:"#2dd4bf",fontWeight:600 }}>Real Browser Performance — This Page</p>
            <p style={{ fontSize:".68rem",color:"var(--text2)",marginTop:2 }}>
              Live via <code style={{ fontFamily:"var(--mono)",fontSize:".65rem",color:"#2dd4bf" }}>PerformanceObserver</code> + <code style={{ fontFamily:"var(--mono)",fontSize:".65rem",color:"#2dd4bf" }}>Performance API</code>.
              Session: <strong style={{ color:"var(--text)" }}>{fmtDur(sessionDuration||0)}</strong>
              {hidden && <span className="badge badge-warn" style={{ marginLeft:8 }}>Tab hidden</span>}
            </p>
          </div>
        </div>

        <p className="label-upper">Core Web Vitals</p>
        <div className="grid-4">
          <VitalCard label="LCP" value={lcp} unit="ms" color={lcpColor(lcp||0)} sub={lcp ? lcpScore(lcp) : null}/>
          <VitalCard label="FCP" value={fcp} unit="ms" color={fcp<1800?"#10b981":fcp<3000?"#f59e0b":"#ef4444"} sub={fcp ? (fcp<1800?"Good":fcp<3000?"Needs work":"Poor") : null}/>
          <VitalCard label="CLS" value={cls} unit="" color={clsColor(cls||0)} sub={cls != null ? clsScore(cls) : null}/>
          <VitalCard label="FID" value={fid} unit="ms" color={fid==null?"#10b981":fid<100?"#10b981":fid<300?"#f59e0b":"#ef4444"} sub={fid != null ? (fid<100?"Good":fid<300?"Needs work":"Poor") : "Waiting for input…"}/>
        </div>

        <p className="label-upper">Navigation Timing</p>
        <div className="grid-4">
          <MetricCard label="Page Load" value={pageLoad??"—"} unit="ms" accent="#3b82f6" realBadge badge={pageLoad?(pageLoad<2000?{text:"Fast",cls:"badge-ok"}:pageLoad<5000?{text:"Moderate",cls:"badge-warn"}:{text:"Slow",cls:"badge-err"}):undefined}/>
          <MetricCard label="TTFB" value={ttfb??"—"} unit="ms" accent="#14b8a6" realBadge badge={ttfb?(ttfb<200?{text:"Good",cls:"badge-ok"}:ttfb<500?{text:"Fair",cls:"badge-warn"}:{text:"Slow",cls:"badge-err"}):undefined}/>
          <MetricCard label="DNS Lookup" value={dnsTime??"—"} unit="ms" accent="#8b5cf6" realBadge/>
          <MetricCard label="TLS Handshake" value={tlsTime??"—"} unit="ms" accent="#f59e0b" realBadge/>
        </div>

        <p className="label-upper">Runtime</p>
        <div className="grid-4">
          <div className="card" style={{ padding:"16px 18px",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${fpsColor(fps||60)},transparent)` }}/>
            <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:6 }}><p className="label-upper" style={{ margin:0 }}>FPS</p><span className="real-badge">LIVE</span></div>
            <p className="metric-val" style={{ fontSize:"1.55rem",color:fpsColor(fps||60) }}>{fps||60}</p>
            <div className="progress-bar" style={{ marginTop:8 }}><div className="progress-fill" style={{ width:`${((fps||60)/60)*100}%`,background:fpsColor(fps||60) }}/></div>
            <p style={{ fontSize:".65rem",color:"var(--text3)",marginTop:4 }}>{fps>=55?"Smooth":fps>=30?"Moderate":"Janky"}</p>
          </div>
          <div className="card" style={{ padding:"16px 18px",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#ef4444,transparent)" }}/>
            <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:6 }}><p className="label-upper" style={{ margin:0 }}>JS Heap</p><span className="real-badge">LIVE</span></div>
            {jsHeapUsed != null ? (<>
              <p className="metric-val" style={{ fontSize:"1.55rem" }}>{jsHeapUsed}<span style={{ fontSize:".72rem",color:"var(--text3)",marginLeft:4 }}>MB</span></p>
              <div className="progress-bar" style={{ marginTop:8 }}><div className="progress-fill" style={{ width:`${((jsHeapUsed||1)/(jsHeapLimit||1))*100}%`,background:((jsHeapUsed||0)/(jsHeapLimit||1))>0.8?"#ef4444":"#10b981" }}/></div>
              <p style={{ fontSize:".65rem",color:"var(--text3)",marginTop:4 }}>of {jsHeapLimit} MB limit</p>
            </>) : <p style={{ fontSize:".75rem",color:"var(--text3)",marginTop:4 }}>Not available<br/><span style={{ fontSize:".62rem" }}>(Chrome only)</span></p>}
          </div>
          <MetricCard label="Long Tasks" value={longTasks??0} accent="#f59e0b" realBadge badge={longTasks>5?{text:"Many",cls:"badge-err"}:longTasks>2?{text:"Some",cls:"badge-warn"}:{text:"Clean",cls:"badge-ok"}} sub="Tasks > 50ms blocking"/>
          <MetricCard label="JS Errors" value={jsErrors?.length??0} accent="#ef4444" realBadge badge={jsErrors?.length>0?{text:"Has errors",cls:"badge-err"}:{text:"Clean",cls:"badge-ok"}}/>
        </div>

        <div className="grid-2">
          <CCard title="Network conditions" sub="Navigator Connection API">
            <div style={{ display:"flex",flexDirection:"column",gap:10,marginTop:4 }}>
              {[
                { label:"Connection type",  value: effectiveType?.toUpperCase()||"Unknown", color:"#3b82f6" },
                { label:"Downlink speed",   value: downlink?`${downlink} Mbps`:"—",         color:"#10b981" },
                { label:"Round-trip time",  value: rtt!=null?`${rtt} ms`:"—",               color:"#f59e0b" },
                { label:"Resources loaded", value: `${resourceCount} files (${resourceTransferSize} KB)`, color:"#8b5cf6" },
              ].map(item=>(
                <div key={item.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"rgba(255,255,255,.02)",borderRadius:7 }}>
                  <span style={{ fontSize:".75rem",color:"var(--text2)" }}>{item.label}</span>
                  <span className="mono" style={{ fontSize:".72rem",color:item.color,fontWeight:600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </CCard>
          <CCard title="User activity" sub="Session interactions on this page">
            <div style={{ display:"flex",flexDirection:"column",gap:10,marginTop:4 }}>
              {[
                { label:"Session duration", value:fmtDur(sessionDuration||0), color:"#14b8a6", icon:"⏱" },
                { label:"Total clicks",     value:totalClicks||0,             color:"#3b82f6", icon:"🖱" },
                { label:"Scroll events",    value:totalScrolls||0,            color:"#10b981", icon:"↕" },
                { label:"Keystrokes",       value:totalKeystrokes||0,         color:"#f59e0b", icon:"⌨" },
              ].map(item=>(
                <div key={item.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"rgba(255,255,255,.02)",borderRadius:7 }}>
                  <span style={{ fontSize:".75rem",color:"var(--text2)" }}>{item.icon} {item.label}</span>
                  <span className="mono" style={{ fontSize:".72rem",color:item.color,fontWeight:600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </CCard>
        </div>

        {fpsHistory.length > 1 && (
          <CCard title="FPS history" sub="Last 30 seconds">
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={fpsHistory.map((v,i)=>({t:i,fps:v}))} margin={{ top:4,right:4,left:-24,bottom:0 }}>
                <defs><linearGradient id="gFPS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid {...GR} strokeDasharray="3 3"/>
                <XAxis dataKey="t" tick={AX} tickLine={false}/>
                <YAxis tick={AX} tickLine={false} axisLine={false} domain={[0,70]}/>
                <Tooltip content={<CTip unit=" fps"/>}/>
                <Area type="monotone" dataKey="fps" name="FPS" stroke="#10b981" strokeWidth={1.5} fill="url(#gFPS)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </CCard>
        )}

        {jsErrors?.length > 0 && (
          <CCard title="JavaScript errors" sub="Caught this session">
            <div style={{ display:"flex",flexDirection:"column",gap:5,marginTop:4 }}>
              {jsErrors.map((e,i)=>(
                <div key={i} className="alert-item alert-crit">
                  <div style={{ display:"flex",justifyContent:"space-between",gap:10 }}>
                    <span style={{ fontSize:".72rem",color:"var(--red2)",flex:1 }}>{e.msg}</span>
                    <span className="mono" style={{ fontSize:".6rem",color:"var(--text3)",flexShrink:0 }}>{e.ts}</span>
                  </div>
                </div>
              ))}
            </div>
          </CCard>
        )}
      </div>
    );
  };

  // ── OVERVIEW TAB (real backend data) ──
  const renderOverview = () => (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      {/* Connection banner */}
      {!connected && (
        <div style={{ padding:"12px 16px",background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.3)",borderRadius:10,display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontSize: "1.2rem" }}>⚠️</span>
          <div>
            <p style={{ fontSize:".8rem",color:"#f87171",fontWeight:600 }}>Backend Monitor Offline</p>
            <p style={{ fontSize:".68rem",color:"var(--text2)" }}>
              The performance metrics server at <code className="mono" style={{ color: "#f87171" }}>{BACKEND_WS}</code> is unreachable. 
              Please ensure the backend is running (<code className="mono" style={{ color:"#f87171",fontSize:".65rem" }}>node server.js</code>).
            </p>
          </div>
        </div>
      )}

      <div className="grid-4">
        <MetricCard label="API Response" value={last.resp?Math.round(last.resp):"—"} unit="ms" badge={latBadge(last.resp||0)} spark={respArr} sparkColor="#3b82f6" accent="#3b82f6"/>
        <MetricCard label="Errors / sec" value={last.err?.toFixed(1)??"—"} unit="/s" badge={errBadge(last.err||0)} spark={errArr} sparkColor="#ef4444" accent="#ef4444"/>
        <MetricCard label="Requests / sec" value={last.rps?fmtK(last.rps):"—"} unit="/s" spark={rpsArr} sparkColor="#10b981" accent="#10b981" sub={latest ? `Total: ${fmtK(latest.api?.totalReqs||0)}` : undefined}/>
        <MetricCard label="Throughput" value={last.thr?.toFixed(1)??"—"} unit="k/s" spark={thrArr} sparkColor="#8b5cf6" accent="#8b5cf6"/>
      </div>

      <div className="grid-2-1">
        <CCard title="API response time" sub="Live from backend · ms" badge={latBadge(last.resp||0).text} badgeCls={latBadge(last.resp||0).cls}>
          <div style={{ display:"flex",gap:6,marginBottom:10,flexWrap:"wrap" }}>
            <span className="label-upper">Filter:</span>
            {["all","/api/login","/api/users","/api/products","/api/orders","/api/search"].map(id=>(
              <button key={id} className={`tab-btn ${epFilter===id?"active":""}`} style={{ padding:"2px 8px",fontSize:".62rem" }} onClick={()=>setEpFilter(id)}>{id==="all"?"All":id.replace("/api/","")}</button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={vis} margin={{ top:4,right:4,left:-24,bottom:0 }}>
              <defs><linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid {...GR} strokeDasharray="3 3"/>
              <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length/5)}/>
              <YAxis tick={AX} tickLine={false} axisLine={false}/>
              <Tooltip content={<CTip unit=" ms"/>}/>
              <Area type="monotone" dataKey="resp" name="Response" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gR)" dot={false} activeDot={{ r:3 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </CCard>

        <CCard title="Status codes" sub={`${codeTotal} total requests`}>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={codePie} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={2} dataKey="value">
                {codePie.map((c,i)=><Cell key={i} fill={c.color}/>)}
              </Pie>
              <Tooltip formatter={(v,n)=>[`${v} (${codeTotal?((v/codeTotal)*100).toFixed(1):0}%)`,n]}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex",flexWrap:"wrap",gap:"6px 14px",marginTop:8 }}>
            {codePie.map(c=>(
              <div key={c.name} style={{ display:"flex",alignItems:"center",gap:5 }}>
                <span style={{ width:8,height:8,borderRadius:2,background:c.color,display:"inline-block" }}/>
                <span style={{ fontSize:".65rem",color:"var(--text2)",fontFamily:"var(--mono)" }}>{c.name}: {c.value}</span>
              </div>
            ))}
          </div>
        </CCard>
      </div>

      <div className="grid-2">
        <CCard title="Errors per second" badge={errBadge(last.err||0).text} badgeCls={errBadge(last.err||0).cls}>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={vis} margin={{ top:4,right:4,left:-24,bottom:0 }}>
              <CartesianGrid {...GR} strokeDasharray="3 3"/>
              <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length/5)}/>
              <YAxis tick={AX} tickLine={false} axisLine={false}/>
              <Tooltip content={<CTip unit="/s"/>}/>
              <Bar dataKey="err" name="Errors" fill="#ef4444" fillOpacity={.7} radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </CCard>
        <CCard title="Requests per second">
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={vis} margin={{ top:4,right:4,left:-24,bottom:0 }}>
              <defs><linearGradient id="gRPS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid {...GR} strokeDasharray="3 3"/>
              <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length/5)}/>
              <YAxis tick={AX} tickLine={false} axisLine={false}/>
              <Tooltip content={<CTip unit=" req/s"/>}/>
              <Area type="monotone" dataKey="rps" name="RPS" stroke="#10b981" strokeWidth={1.5} fill="url(#gRPS)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </CCard>
      </div>

      <div className="grid-2">
        <CCard title="Endpoint latency" sub="Live backend data — ranked by latency">
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginTop:4 }}>
            {[...epState].sort((a,b)=>b.latencyMs-a.latencyMs).map(ep=>{
              const pct=(ep.latencyMs/maxEp)*100; const col=latColor(ep.latencyMs);
              return (
                <div key={ep.path} style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <span style={{ width:6,height:6,borderRadius:"50%",background:col,flexShrink:0 }}/>
                  <span className="mono" style={{ fontSize:".7rem",color:"var(--text2)",width:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{ep.path}</span>
                  <div className="progress-bar" style={{ flex:1 }}><div className="progress-fill" style={{ width:`${pct}%`,background:col }}/></div>
                  <span className="mono" style={{ fontSize:".68rem",color:"var(--text2)",width:50,textAlign:"right" }}>{ep.latencyMs}ms</span>
                </div>
              );
            })}
          </div>
        </CCard>

        <CCard title="Recent requests" sub="Live from backend">
          <div style={{ display:"flex",flexDirection:"column",gap:4,maxHeight:200,overflowY:"auto",marginTop:4 }}>
            {requestLog.slice(0,12).map((r,i)=>(
              <div key={r.id||i} className="slide-in" style={{ display:"flex",gap:8,padding:"5px 8px",background:"rgba(255,255,255,.02)",borderRadius:6,fontSize:".68rem" }}>
                <span className="mono" style={{ color:"var(--text3)",whiteSpace:"nowrap",minWidth:55 }}>{r.ts?new Date(r.ts).toLocaleTimeString("en-US",{hour12:false}):"—"}</span>
                <span className={`badge ${r.method==="GET"?"badge-info":r.method==="POST"?"badge-ok":"badge-violet"}`} style={{ fontSize:".52rem",padding:"1px 4px",flexShrink:0 }}>{r.method}</span>
                <span style={{ color:"var(--text2)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.path}</span>
                <span className={`badge ${r.status<300?"badge-ok":r.status<400?"badge-info":r.status<500?"badge-warn":"badge-err"}`} style={{ fontSize:".52px",padding:"1px 4px",flexShrink:0 }}>{r.status}</span>
                <span className="mono" style={{ fontSize:".62rem",color:"var(--text3)",flexShrink:0 }}>{r.duration}ms</span>
              </div>
            ))}
            {requestLog.length === 0 && <p style={{ fontSize:".7rem",color:"var(--text3)",fontStyle:"italic" }}>Waiting for data…</p>}
          </div>
        </CCard>
      </div>
    </div>
  );

  // ── LATENCY TAB ──
  const renderLatency = () => (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      <div className="grid-4">
        {[
          { label:"P50 Latency",   val:last.p50, color:"#10b981" },
          { label:"P95 Latency",   val:last.p95, color:"#f59e0b" },
          { label:"P99 Latency",   val:last.p99, color:"#ef4444" },
          { label:"Avg Response",  val:last.resp,color:"#3b82f6" },
        ].map(m=>(
          <MetricCard key={m.label} label={m.label} value={m.val?Math.round(m.val):"—"} unit="ms" accent={m.color}
            badge={m.val?latBadge(m.val):undefined}/>
        ))}
      </div>

      <div className="grid-2">
        <CCard title="P50 / P95 / P99" sub="Real latency percentiles from backend">
          <div style={{ display:"flex",gap:12,marginBottom:8,flexWrap:"wrap" }}>
            {[["P50","#10b981"],["P95","#f59e0b"],["P99","#ef4444"]].map(([l,c])=>(
              <div key={l} style={{ display:"flex",alignItems:"center",gap:5 }}>
                <span style={{ width:16,height:2,background:c,borderRadius:1,display:"inline-block" }}/>
                <span style={{ fontSize:".65rem",color:"var(--text3)" }}>{l}: {l==="P50"?Math.round(last.p50||0):l==="P95"?Math.round(last.p95||0):Math.round(last.p99||0)}ms</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={vis} margin={{ top:4,right:4,left:-24,bottom:0 }}>
              <CartesianGrid {...GR} strokeDasharray="3 3"/>
              <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length/5)}/>
              <YAxis tick={AX} tickLine={false} axisLine={false}/>
              <Tooltip content={<CTip unit=" ms"/>}/>
              <Line type="monotone" dataKey="p50" name="P50" stroke="#10b981" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="p95" name="P95" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 3"/>
              <Line type="monotone" dataKey="p99" name="P99" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="2 3"/>
            </LineChart>
          </ResponsiveContainer>
        </CCard>

        <CCard title="Endpoint comparison" sub="Backend real-time latency per route">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...epState].sort((a,b)=>b.latencyMs-a.latencyMs)} layout="vertical" margin={{ top:4,right:8,left:0,bottom:0 }}>
              <CartesianGrid {...GR} strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" tick={AX} tickLine={false} axisLine={false}/>
              <YAxis type="category" dataKey="path" tick={{ ...AX,fontSize:9 }} tickLine={false} width={90}/>
              <Tooltip content={<CTip unit=" ms"/>}/>
              <Bar dataKey="latencyMs" name="Latency" radius={[0,2,2,0]} fill="#3b82f6"/>
            </BarChart>
          </ResponsiveContainer>
        </CCard>
      </div>
    </div>
  );

  // ── RESOURCES TAB (real CPU/mem from backend) ──
  const renderResources = () => {
    const cpuPct  = latest?.cpu?.loadPct ?? 0;
    const memPct  = latest?.memory?.usedPct ?? 0;
    const memUsed = latest?.memory?.usedMB ?? 0;
    const memTotal= latest?.memory?.totalMB ?? 0;
    const nodeHeap= latest?.memory?.nodeHeapUsedMB ?? 0;
    const nodeRss = latest?.memory?.nodeRssMB ?? 0;
    const loadAvg = latest?.cpu?.loadAvg1 ?? 0;
    const rxKBps  = latest?.network?.rxKBps ?? 0;
    const txKBps  = latest?.network?.txKBps ?? 0;

    const resItems = [
      { label:"CPU Load",    val:+cpuPct.toFixed(0),  color:cpuPct>80?"#ef4444":cpuPct>60?"#f59e0b":"#10b981",  note:cpuPct>80?"⚠ High":cpuPct>60?"Moderate":"Normal" },
      { label:"Memory",      val:+memPct.toFixed(0),  color:memPct>85?"#ef4444":memPct>70?"#f59e0b":"#3b82f6",  note:`${memUsed} / ${memTotal} MB` },
      { label:"Net RX",      val:Math.min(100,+rxKBps.toFixed(0)),  color:"#14b8a6", note:`${rxKBps.toFixed(1)} KB/s in` },
      { label:"Net TX",      val:Math.min(100,+txKBps.toFixed(0)),  color:"#f43f5e", note:`${txKBps.toFixed(1)} KB/s out` },
    ];

    return (
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        <div className="grid-4">
          {resItems.map(r=>(
            <div key={r.label} className="card" style={{ padding:"16px 18px",position:"relative" }}>
              <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:r.color,borderRadius:"12px 12px 0 0",opacity:.7 }}/>
              <p className="label-upper" style={{ marginBottom:8 }}>{r.label}</p>
              <p className="metric-val" style={{ fontSize:"1.8rem",color:r.color }}>{r.val}<span style={{ fontSize:".85rem",color:"var(--text3)",marginLeft:3 }}>%</span></p>
              <div className="progress-bar" style={{ marginTop:10,height:4 }}><div className="progress-fill" style={{ width:`${Math.min(r.val,100)}%`,background:r.color }}/></div>
              <p style={{ fontSize:".65rem",color:"var(--text3)",marginTop:5 }}>{r.note}</p>
            </div>
          ))}
        </div>

        <div className="grid-2">
          <CCard title="CPU & Load Average" sub="Real system metrics">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={vis} margin={{ top:4,right:4,left:-24,bottom:0 }}>
                <defs><linearGradient id="gCPU" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid {...GR} strokeDasharray="3 3"/>
                <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length/5)}/>
                <YAxis tick={AX} tickLine={false} axisLine={false} domain={[0,100]}/>
                <Tooltip content={<CTip unit="%"/>}/>
                <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gCPU)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </CCard>

          <CCard title="Memory usage" sub="Real /proc/meminfo">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={vis} margin={{ top:4,right:4,left:-24,bottom:0 }}>
                <defs><linearGradient id="gMEM" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid {...GR} strokeDasharray="3 3"/>
                <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length/5)}/>
                <YAxis tick={AX} tickLine={false} axisLine={false} domain={[0,100]}/>
                <Tooltip content={<CTip unit="%"/>}/>
                <Area type="monotone" dataKey="memPct" name="Memory %" stroke="#ef4444" strokeWidth={1.5} fill="url(#gMEM)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </CCard>
        </div>

        <div className="grid-2">
          <CCard title="Node.js process memory" sub="Server heap usage">
            <div style={{ display:"flex",flexDirection:"column",gap:10,marginTop:4 }}>
              {[
                { label:"Heap used",  value:`${nodeHeap} MB`,  color:"#f59e0b" },
                { label:"RSS",        value:`${nodeRss} MB`,   color:"#ef4444" },
                { label:"Load avg 1m",value:`${loadAvg}`,      color:"#3b82f6" },
                { label:"Uptime",     value:fmtDur(latest?.os?.serverUptime||0), color:"#10b981" },
              ].map(item=>(
                <div key={item.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"rgba(255,255,255,.02)",borderRadius:7 }}>
                  <span style={{ fontSize:".75rem",color:"var(--text2)" }}>{item.label}</span>
                  <span className="mono" style={{ fontSize:".72rem",color:item.color,fontWeight:600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </CCard>

          <CCard title="Service health" sub="Real-time status">
            <div style={{ display:"flex",flexDirection:"column",gap:8,marginTop:4 }}>
              {services.map(sv=>(
                <div key={sv.name} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"rgba(255,255,255,.02)",borderRadius:7 }}>
                  <span style={{ width:7,height:7,borderRadius:"50%",background:sv.warn?"#f59e0b":sv.ok?"#10b981":"#ef4444",flexShrink:0 }} className={sv.ok&&!sv.warn?"pulse-dot":""}/>
                  <span style={{ flex:1,fontSize:".78rem",color:"var(--text2)" }}>{sv.name}</span>
                  <span className="mono" style={{ fontSize:".65rem",color:"var(--text3)" }}>{sv.latency}ms</span>
                  <span className={`badge ${sv.warn?"badge-warn":sv.ok?"badge-ok":"badge-err"}`} style={{ fontSize:".55rem" }}>{sv.warn?"degraded":sv.ok?"online":"offline"}</span>
                </div>
              ))}
            </div>
          </CCard>
        </div>

        {systemInfo && (
          <CCard title="System information" sub="Host details">
            <div className="grid-2" style={{ marginTop:4 }}>
              {[
                { label:"Hostname",     value:systemInfo.hostname },
                { label:"Platform",     value:systemInfo.platform },
                { label:"CPU cores",    value:systemInfo.cpuCores },
                { label:"Total memory", value:`${systemInfo.totalMemGB} GB` },
                { label:"Node.js",      value:systemInfo.nodeVersion },
                { label:"Process ID",   value:systemInfo.pid },
                { label:"Server uptime",value:fmtDur(systemInfo.serverUptime) },
                { label:"OS uptime",    value:fmtDur(systemInfo.uptime) },
              ].map(item=>(
                <div key={item.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"rgba(255,255,255,.02)",borderRadius:6 }}>
                  <span style={{ fontSize:".72rem",color:"var(--text3)" }}>{item.label}</span>
                  <span className="mono" style={{ fontSize:".7rem",color:"var(--text2)",fontWeight:600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </CCard>
        )}
      </div>
    );
  };

  // ── ERRORS TAB ──
  const renderErrors = () => (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      <div className="grid-4">
        <MetricCard label="Total errors" value={latest?.api?.totalErrors?fmtK(latest.api.totalErrors):"—"} accent="#ef4444" badge={{ text:"All time",cls:"badge-warn" }}/>
        <MetricCard label="Error rate" value={last.err?.toFixed(1)??"—"} unit="/s" badge={errBadge(last.err||0)} accent="#ef4444"/>
        <MetricCard label="Error rate %" value={latest?.api?.errorRatePct?.toFixed(2)??"—"} unit="%" accent="#f59e0b"/>
        <MetricCard label="Total requests" value={latest?.api?.totalReqs?fmtK(latest.api.totalReqs):"—"} accent="#3b82f6"/>
      </div>
      <div className="grid-2">
        <CCard title="Error rate over time">
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={vis} margin={{ top:4,right:4,left:-24,bottom:0 }}>
              <defs><linearGradient id="gErr2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid {...GR} strokeDasharray="3 3"/>
              <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length/5)}/>
              <YAxis tick={AX} tickLine={false} axisLine={false}/>
              <Tooltip content={<CTip unit="/s"/>}/>
              <Area type="monotone" dataKey="err" name="Error rate" stroke="#ef4444" strokeWidth={1.5} fill="url(#gErr2)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </CCard>
        <CCard title="Status code distribution" sub={`${codeTotal} total requests`}>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={codePie} cx="50%" cy="50%" outerRadius={60} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`} labelLine={{ stroke:"rgba(255,255,255,.2)" }}>
                {codePie.map((c,i)=><Cell key={i} fill={c.color}/>)}
              </Pie>
              <Tooltip formatter={(v,n)=>[`${v} (${codeTotal?((v/codeTotal)*100).toFixed(1):0}%)`,n]}/>
            </PieChart>
          </ResponsiveContainer>
        </CCard>
      </div>
    </div>
  );

  // ── TRACES TAB (live from backend) ──
  const renderTraces = () => (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      <CCard title="Request traces" sub="Live from backend — Full journey breakdown">
        <div style={{ display:"flex",flexDirection:"column",gap:12,marginTop:4 }}>
          {traces.length === 0 && <p style={{ fontSize:".7rem",color:"var(--text3)",fontStyle:"italic" }}>Loading traces…</p>}
          {traces.map(tr=>{
            const scale=100/tr.total;
            return (
              <div key={tr.id} style={{ padding:"10px 12px",background:"rgba(255,255,255,.02)",borderRadius:8,border:"1px solid var(--border)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap" }}>
                  <span className="mono" style={{ fontSize:".65rem",color:"var(--text3)" }}>{tr.id}</span>
                  <span className="badge badge-info" style={{ fontSize:".55rem" }}>{tr.method}</span>
                  <span style={{ fontSize:".75rem",color:"var(--text)",fontFamily:"var(--mono)" }}>{tr.path}</span>
                  <span style={{ flex:1 }}/>
                  <span className="mono" style={{ fontSize:".7rem",color:"var(--text2)" }}>{tr.total}ms</span>
                  <span className={`badge ${tr.status<300?"badge-ok":tr.status<500?"badge-warn":"badge-err"}`} style={{ fontSize:".55rem" }}>{tr.status}</span>
                </div>
                <div style={{ display:"flex",gap:2,height:16,borderRadius:4,overflow:"hidden" }}>
                  {tr.stages.map(s=>(
                    <div key={s.name} title={`${s.name}: ${s.ms}ms`} style={{ width:`${s.ms*scale}%`,minWidth:2,background:s.color,opacity:.8 }}/>
                  ))}
                </div>
                <div style={{ display:"flex",gap:8,marginTop:5,flexWrap:"wrap" }}>
                  {tr.stages.map(s=>(
                    <span key={s.name} style={{ fontSize:".6rem",color:s.color,display:"flex",alignItems:"center",gap:3 }}>
                      <span style={{ width:6,height:6,background:s.color,borderRadius:1,display:"inline-block" }}/>{s.name}: {s.ms}ms
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

  // ── ALERTS TAB (real from backend) ──
  const renderAlerts = () => (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      <div className="grid-4">
        <MetricCard label="Critical alerts" value={alerts.filter(a=>a.severity==="critical").length} accent="#ef4444"/>
        <MetricCard label="Warnings" value={alerts.filter(a=>a.severity==="warning").length} accent="#f59e0b"/>
        <MetricCard label="Alert rules" value={6} accent="#3b82f6"/>
        <MetricCard label="Total triggered" value={alerts.length} accent="#8b5cf6"/>
      </div>
      <div className="grid-2">
        <CCard title="Alert rules" sub="Evaluated every tick on the server">
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginTop:4 }}>
            {[
              { name:"High response time", metric:"resp",  op:">", threshold:300, severity:"critical" },
              { name:"Error rate spike",   metric:"err",   op:">", threshold:3,   severity:"warning"  },
              { name:"Low throughput",     metric:"thr",   op:"<", threshold:0.8, severity:"warning"  },
              { name:"P99 latency",        metric:"p99",   op:">", threshold:250, severity:"critical" },
              { name:"High memory usage",  metric:"memPct",op:">", threshold:85,  severity:"warning"  },
              { name:"High CPU load",      metric:"cpuPct",op:">", threshold:85,  severity:"critical" },
            ].map((r,i)=>(
              <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"rgba(255,255,255,.02)",borderRadius:8 }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:r.severity==="critical"?"#ef4444":"#f59e0b",flexShrink:0 }}/>
                <span style={{ flex:1,fontSize:".75rem",color:"var(--text2)" }}>{r.name}</span>
                <span className="mono" style={{ fontSize:".62rem",color:"var(--text3)" }}>{r.metric} {r.op} {r.threshold}</span>
                <span className={`badge ${r.severity==="critical"?"badge-err":"badge-warn"}`} style={{ fontSize:".55rem" }}>{r.severity}</span>
              </div>
            ))}
          </div>
        </CCard>
        <CCard title="Recent alerts" sub="From backend evaluation">
          <div style={{ display:"flex",flexDirection:"column",gap:5,maxHeight:300,overflowY:"auto",marginTop:4 }}>
            {alerts.length===0&&<p style={{ fontSize:".7rem",color:"var(--text3)",fontStyle:"italic" }}>No alerts triggered yet…</p>}
            {alerts.slice(0,15).map((a,i)=>(
              <div key={a.id||i} className={`alert-item ${a.severity==="critical"?"alert-crit":"alert-warn"}`}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:2,gap:8 }}>
                  <span style={{ fontSize:".72rem",fontWeight:600,color:a.severity==="critical"?"var(--red2)":"var(--amber2)" }}>
                    {a.severity==="critical"?"🔴":"🟡"} {a.rule}
                  </span>
                  <span className="mono" style={{ fontSize:".6rem",color:"var(--text3)",flexShrink:0 }}>{a.ts?new Date(a.ts).toLocaleTimeString("en-US",{hour12:false}):"—"}</span>
                </div>
                <p style={{ fontSize:".65rem",color:"var(--text2)" }}>{a.msg}</p>
              </div>
            ))}
          </div>
        </CCard>
      </div>
    </div>
  );

  // ── HISTORY TAB ──
  const renderHistory = () => (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      <div className="grid-4">
        {weekly.length > 0 ? [
          { label:"7-day avg response", value:Math.round(weekly.reduce((a,d)=>a+d.resp,0)/weekly.length)+"ms", accent:"#3b82f6" },
          { label:"7-day avg errors",   value:(weekly.reduce((a,d)=>a+d.err,0)/weekly.length).toFixed(1)+"/s", accent:"#ef4444" },
          { label:"Peak RPS",           value:fmtK(Math.max(...weekly.map(d=>d.rps))), accent:"#10b981" },
          { label:"Avg uptime",         value:(weekly.reduce((a,d)=>a+d.uptime,0)/weekly.length).toFixed(2)+"%", accent:"#8b5cf6" },
        ].map(m=><MetricCard key={m.label} label={m.label} value={m.value} accent={m.accent}/>) : null}
      </div>

      {weekly.length > 0 && (
        <CCard title="7-day performance trends" sub="Backend daily aggregates">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weekly} margin={{ top:4,right:4,left:-24,bottom:0 }}>
              <CartesianGrid {...GR} strokeDasharray="3 3"/>
              <XAxis dataKey="day" tick={AX} tickLine={false}/>
              <YAxis yAxisId="l" tick={AX} tickLine={false} axisLine={false}/>
              <YAxis yAxisId="r" orientation="right" tick={AX} tickLine={false} axisLine={false}/>
              <Tooltip content={<CTip/>}/>
              <Line yAxisId="l" type="monotone" dataKey="resp" name="Resp(ms)" stroke="#3b82f6" strokeWidth={2} dot={{ r:3,fill:"#3b82f6" }}/>
              <Line yAxisId="r" type="monotone" dataKey="err"  name="Err/s"   stroke="#ef4444" strokeWidth={1.5} dot={{ r:3,fill:"#ef4444" }} strokeDasharray="4 2"/>
            </LineChart>
          </ResponsiveContainer>
        </CCard>
      )}

      {heatmap.length > 0 && (
        <CCard title="Traffic heatmap" sub="Requests by hour · 7-day view from backend">
          <div style={{ overflowX:"auto",marginTop:8 }}>
            <div style={{ display:"flex",gap:4,marginBottom:6 }}>
              <span style={{ width:28 }}/>
              {Array.from({length:24},(_,i)=>String(i).padStart(2,"0")).filter((_,i)=>i%3===0).map(h=>(
                <span key={h} style={{ fontSize:".55rem",color:"var(--text3)",width:24,textAlign:"center" }}>{h}</span>
              ))}
            </div>
            {heatmap.map(row=>(
              <div key={row.day} style={{ display:"flex",gap:2,marginBottom:2,alignItems:"center" }}>
                <span style={{ width:28,fontSize:".62rem",color:"var(--text3)",flexShrink:0 }}>{row.day}</span>
                {row.hours.map(cell=>(
                  <div key={cell.hour} title={`${row.day} ${cell.hour}: ${cell.val}%`}
                    style={{ width:12,height:12,flexShrink:0,borderRadius:2,background:`rgba(59,130,246,${(cell.val/100)*.85+.05})` }}/>
                ))}
              </div>
            ))}
          </div>
        </CCard>
      )}
    </div>
  );

  const renderTab = () => {
    switch (tab) {
      case "realtime":  return renderRealTime();
      case "overview":  return renderOverview();
      case "latency":   return renderLatency();
      case "errors":    return renderErrors();
      case "resources": return renderResources();
      case "traces":    return renderTraces();
      case "alerts":    return renderAlerts();
      case "history":   return renderHistory();
      default:          return renderOverview();
    }
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight:"100vh",background:"var(--bg0)",padding:"0 0 40px" }}>

        {/* HEADER */}
        <div style={{ position:"sticky",top:0,zIndex:50,background:"rgba(4,6,10,.92)",backdropFilter:"blur(20px)",borderBottom:"1px solid var(--border)",padding:"12px 20px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,rgba(59,130,246,.3),rgba(20,184,166,.3))",border:"1px solid rgba(59,130,246,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>📊</div>
            <div>
              <p style={{ fontFamily:"var(--disp)",fontSize:".92rem",fontWeight:600,color:"var(--text)",lineHeight:1 }}>CKC-OS Monitor</p>
              <p style={{ fontSize:".6rem",color:"var(--text3)",marginTop:2 }}>Real-time Performance Intelligence</p>
            </div>
            {/* Connection status */}
            <span className={connected?"conn-badge-ok":"conn-badge-err"}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:connected?"#10b981":"#ef4444",display:"inline-block" }} className={connected?"pulse-dot":""}/>
              {connected?"Backend Live":"Disconnected"}
            </span>
          </div>

          <div style={{ flex:1 }}/>

          <div style={{ display:"flex",gap:4 }}>
            {[30,60,120].map(r=>(
              <button key={r} className={`tab-btn ${range===r?"active":""}`} onClick={()=>setRange(r)}>{r===30?"30s":r===60?"1m":"2m"}</button>
            ))}
          </div>

          {critAlertCount > 0 && (
            <div style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:8,padding:"5px 10px",cursor:"pointer" }} onClick={()=>setTab("alerts")}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:"#ef4444" }} className="pulse-dot"/>
              <span style={{ fontSize:".68rem",color:"#f87171",fontWeight:600 }}>{critAlertCount} critical</span>
            </div>
          )}

          <button className={`btn ${paused?"btn-primary":"btn-danger"}`} onClick={()=>setPaused(p=>!p)}>
            {paused?"▶ Resume":"⏸ Pause"}
          </button>
        </div>

        <div style={{ padding:"16px 20px" }}>
          {/* TABS */}
          <div className="nav-tabs" style={{ marginBottom:16 }}>
            {TABS.map(t=>(
              <button key={t.id} className={`tab-btn ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)} style={{ whiteSpace:"nowrap" }}>
                {t.id==="alerts"&&critAlertCount>0&&(
                  <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:14,height:14,borderRadius:"50%",background:"#ef4444",color:"#fff",fontSize:".5rem",fontWeight:700,marginRight:4 }}>{critAlertCount}</span>
                )}
                {t.label}
              </button>
            ))}
          </div>

          <div className="fade-in" key={tab}>{renderTab()}</div>
        </div>

        {/* FOOTER */}
        <div style={{ margin:"4px 20px 0",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",justifyContent:"space-between" }}>
          <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
            {services.map(sv=>(
              <div key={sv.name} style={{ display:"flex",alignItems:"center",gap:5 }}>
                <span style={{ width:5,height:5,borderRadius:"50%",background:sv.warn?"#f59e0b":sv.ok?"#10b981":"#ef4444" }}/>
                <span style={{ fontSize:".65rem",color:"var(--text3)" }}>{sv.name}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex",gap:12,alignItems:"center",flexWrap:"wrap" }}>
            <span style={{ fontSize:".65rem",color:"#2dd4bf",fontFamily:"var(--mono)" }}>
              FPS: {browserPerf.fps||60} · {browserPerf.effectiveType||"—"} · Backend tick #{latest?.tick||0}
            </span>
            <span className="mono" style={{ fontSize:".6rem",color:"var(--text3)" }}>
              {paused?"⏸ Paused":`↻ ${latest?.ts?new Date(latest.ts).toLocaleTimeString("en-US",{hour12:false}):"—"}`}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}