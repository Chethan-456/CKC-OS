import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

/* ═══════════════════════════════════════════════════════════════
   GLOBAL CSS
═══════════════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Sans:ital,wght@0,400;0,500;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg0:#04060a;--bg1:#070c12;--bg2:#0b1118;--bg3:#0f1620;
  --surface:#111820;--surface2:#161e28;--border:rgba(255,255,255,.06);--border2:rgba(255,255,255,.1);
  --blue:#3b82f6;--blue2:#60a5fa;--teal:#14b8a6;--teal2:#2dd4bf;
  --green:#10b981;--green2:#34d399;--amber:#f59e0b;--amber2:#fbbf24;
  --red:#ef4444;--red2:#f87171;--violet:#8b5cf6;--violet2:#a78bfa;
  --text:#e2e8f0;--text2:#94a3b8;--text3:#475569;
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
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;transition:border-color .2s;}
.card:hover{border-color:var(--border2);}
.tab-btn{font-family:var(--sans);font-size:.75rem;font-weight:500;border-radius:7px;padding:5px 12px;cursor:pointer;transition:all .15s;border:1px solid transparent;background:none;}
.tab-btn.active{background:rgba(59,130,246,.15);color:#60a5fa;border-color:rgba(59,130,246,.3);}
.tab-btn:not(.active){color:var(--text3);}
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
.real-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(20,184,166,.1);border:1px solid rgba(20,184,166,.3);border-radius:100px;padding:2px 8px;font-family:var(--mono);font-size:.6rem;color:#2dd4bf;font-weight:600;}
.conn-badge-ok{display:inline-flex;align-items:center;gap:5px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:100px;padding:3px 10px;font-family:var(--mono);font-size:.6rem;color:#34d399;font-weight:600;}
.conn-badge-warn{display:inline-flex;align-items:center;gap:5px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:100px;padding:3px 10px;font-family:var(--mono);font-size:.6rem;color:#fbbf24;font-weight:600;}
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

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
const fmt    = (n, d = 0) => (n != null && !isNaN(n)) ? Number(n).toFixed(d) : "—";
const fmtK   = n => n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(Math.round(n || 0));
const fmtDur = s => {
  if (!s || s < 0) return "0s";
  if (s < 60) return Math.round(s) + "s";
  if (s < 3600) return Math.floor(s / 60) + "m " + (Math.round(s) % 60) + "s";
  return Math.floor(s / 3600) + "h " + Math.floor((s % 3600) / 60) + "m";
};
const fmtBytes = b => b > 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + " MB" : b > 1024 ? (b / 1024).toFixed(1) + " KB" : b + " B";
function latColor(ms) { return ms < 150 ? "#10b981" : ms < 400 ? "#f59e0b" : "#ef4444"; }
function latBadge(ms) { return ms < 150 ? { text: "Good", cls: "badge-ok" } : ms < 400 ? { text: "Fair", cls: "badge-warn" } : { text: "Slow", cls: "badge-err" }; }
function fpsColor(f) { return f >= 55 ? "#10b981" : f >= 30 ? "#f59e0b" : "#ef4444"; }
function lcpScore(ms) { return ms < 2500 ? "Good" : ms < 4000 ? "Needs work" : "Poor"; }
function lcpColor(ms) { return ms < 2500 ? "#10b981" : ms < 4000 ? "#f59e0b" : "#ef4444"; }
function clsScore(v) { return v < 0.1 ? "Good" : v < 0.25 ? "Needs work" : "Poor"; }
function clsColor(v) { return v < 0.1 ? "#10b981" : v < 0.25 ? "#f59e0b" : "#ef4444"; }
function heapColor(pct) { return pct < 60 ? "#10b981" : pct < 80 ? "#f59e0b" : "#ef4444"; }
const AX = { fontSize: 10, fill: "rgba(255,255,255,.25)", fontFamily: "var(--mono)" };
const GR = { stroke: "rgba(255,255,255,.04)" };
const nowStr = () => new Date().toLocaleTimeString("en-US", { hour12: false });

/* ═══════════════════════════════════════════════════════════════
   CUSTOM TOOLTIP
═══════════════════════════════════════════════════════════════ */
function CTip({ active, payload, label, unit = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip-custom">
      <p style={{ color: "var(--text3)", marginBottom: 4, fontSize: ".65rem" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontFamily: "var(--mono)", fontSize: ".7rem" }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</strong>{unit}
        </p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SPARKLINE
═══════════════════════════════════════════════════════════════ */
function Spark({ data = [], color = "#3b82f6", h = 28, w = 90 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - mn) / rng) * (h - 3) - 1).toFixed(1)}`).join(" ");
  const id = `sg${color.replace(/[^a-z0-9]/gi, "")}${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   METRIC CARD
═══════════════════════════════════════════════════════════════ */
function MetricCard({ label, value, unit, sub, badge, spark, sparkColor, accent, tag }) {
  return (
    <div className="card" style={{ padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${accent},transparent)` }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
        <p className="label-upper" style={{ margin: 0 }}>{label}</p>
        {tag && <span className="real-badge">{tag}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
        <span className="metric-val" style={{ fontSize: "1.65rem", color: "var(--text)" }}>{value}</span>
        {unit && <span style={{ fontSize: ".75rem", color: "var(--text3)" }}>{unit}</span>}
      </div>
      {badge && <span className={`badge ${badge.cls}`}>{badge.text}</span>}
      {sub && <p style={{ fontSize: ".68rem", color: "var(--text3)", marginTop: 4 }}>{sub}</p>}
      {spark && (
        <div style={{ position: "absolute", bottom: 6, right: 10, opacity: .5 }}>
          <Spark data={spark} color={sparkColor || "#3b82f6"} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONTENT CARD
═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   REAL DEVICE PERFORMANCE HOOK
   Reads from: PerformanceObserver, navigator.connection,
   performance.memory, requestAnimationFrame, PerformanceNavigationTiming
═══════════════════════════════════════════════════════════════ */
function useDevicePerf(paused) {
  const [snap, setSnap] = useState({
    // Navigation timing
    pageLoad: null, domInteractive: null, ttfb: null, dnsTime: null,
    tcpTime: null, tlsTime: null, domContent: null,
    // Core Web Vitals
    fcp: null, lcp: null, cls: null, fid: null, inp: null,
    // JS Memory (Chrome only)
    jsHeapUsed: null, jsHeapTotal: null, jsHeapLimit: null, heapPct: null,
    // Network
    effectiveType: null, downlink: null, rtt: null, saveData: false,
    // Runtime
    fps: 60, longTasks: 0, jsErrors: [],
    // Resources
    resourceCount: 0, resourceBytes: 0,
    // Interaction counters
    totalClicks: 0, totalScrolls: 0, totalKeystrokes: 0,
    sessionDuration: 0,
    // Tab
    hidden: false,
    // Battery
    batteryLevel: null, batteryCharging: null, batteryTime: null,
    // Device
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: navigator.deviceMemory || null,
    platform: navigator.platform || null,
    userAgent: navigator.userAgent || null,
    language: navigator.language || null,
    onLine: navigator.onLine,
    // Screen
    screenW: screen.width, screenH: screen.height,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorDepth: screen.colorDepth,
  });

  const [series, setSeries] = useState([]);
  const counters = useRef({ clicks: 0, scrolls: 0, keys: 0, longTasks: 0, errors: [], fps: 60 });
  const sessionStart = useRef(Date.now());
  const frameRef = useRef(null);
  const fpsRef = useRef({ frames: 0, last: performance.now() });
  const observers = useRef([]);
  const pausedRef = useRef(paused);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    // ── Navigation Timing ──
    const navEntry = performance.getEntriesByType("navigation")[0];
    if (navEntry) {
      setSnap(p => ({
        ...p,
        pageLoad: Math.round(navEntry.loadEventEnd - navEntry.startTime),
        domInteractive: Math.round(navEntry.domInteractive - navEntry.startTime),
        domContent: Math.round(navEntry.domContentLoadedEventEnd - navEntry.startTime),
        ttfb: Math.round(navEntry.responseStart - navEntry.requestStart),
        dnsTime: Math.round(navEntry.domainLookupEnd - navEntry.domainLookupStart),
        tcpTime: Math.round(navEntry.connectEnd - navEntry.connectStart),
        tlsTime: navEntry.secureConnectionStart > 0
          ? Math.round(navEntry.connectEnd - navEntry.secureConnectionStart) : 0,
      }));
    }

    // ── FCP ──
    performance.getEntriesByType("paint").forEach(p => {
      if (p.name === "first-contentful-paint")
        setSnap(prev => ({ ...prev, fcp: Math.round(p.startTime) }));
    });

    // ── LCP ──
    try {
      const lcpObs = new PerformanceObserver(list => {
        const e = list.getEntries().at(-1);
        setSnap(p => ({ ...p, lcp: Math.round(e.startTime) }));
      });
      lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
      observers.current.push(lcpObs);
    } catch {}

    // ── CLS ──
    try {
      let clsVal = 0;
      const clsObs = new PerformanceObserver(list => {
        list.getEntries().forEach(e => { if (!e.hadRecentInput) clsVal += e.value; });
        setSnap(p => ({ ...p, cls: +clsVal.toFixed(4) }));
      });
      clsObs.observe({ type: "layout-shift", buffered: true });
      observers.current.push(clsObs);
    } catch {}

    // ── FID ──
    try {
      const fidObs = new PerformanceObserver(list => {
        list.getEntries().forEach(e =>
          setSnap(p => ({ ...p, fid: Math.round(e.processingStart - e.startTime) }))
        );
      });
      fidObs.observe({ type: "first-input", buffered: true });
      observers.current.push(fidObs);
    } catch {}

    // ── INP (Interaction to Next Paint) ──
    try {
      const inpObs = new PerformanceObserver(list => {
        list.getEntries().forEach(e => {
          if (e.interactionId) {
            setSnap(p => ({ ...p, inp: Math.round(e.duration) }));
          }
        });
      });
      inpObs.observe({ type: "event", buffered: true, durationThreshold: 16 });
      observers.current.push(inpObs);
    } catch {}

    // ── Long Tasks ──
    try {
      const ltObs = new PerformanceObserver(list => {
        counters.current.longTasks += list.getEntries().length;
      });
      ltObs.observe({ type: "longtask" });
      observers.current.push(ltObs);
    } catch {}

    // ── Resources ──
    const updateResources = () => {
      const entries = performance.getEntriesByType("resource");
      const bytes = entries.reduce((a, e) => a + (e.transferSize || 0), 0);
      setSnap(p => ({ ...p, resourceCount: entries.length, resourceBytes: bytes }));
    };
    try {
      const roObs = new PerformanceObserver(() => updateResources());
      roObs.observe({ type: "resource" });
      observers.current.push(roObs);
    } catch {}
    updateResources();

    // ── User Interaction Counters ──
    const onClick = () => counters.current.clicks++;
    const onScroll = () => counters.current.scrolls++;
    const onKey = () => counters.current.keys++;
    const onError = e => {
      counters.current.errors = [
        ...counters.current.errors.slice(-9),
        { msg: e.message || String(e), ts: nowStr() }
      ];
    };
    const onOnline  = () => setSnap(p => ({ ...p, onLine: true }));
    const onOffline = () => setSnap(p => ({ ...p, onLine: false }));
    window.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("error", onError);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", () =>
      setSnap(p => ({ ...p, hidden: document.hidden }))
    );

    // ── FPS via rAF ──
    const measureFps = now => {
      fpsRef.current.frames++;
      const elapsed = now - fpsRef.current.last;
      if (elapsed >= 500) {
        counters.current.fps = Math.min(60, Math.round((fpsRef.current.frames / elapsed) * 1000));
        fpsRef.current = { frames: 0, last: now };
      }
      frameRef.current = requestAnimationFrame(measureFps);
    };
    frameRef.current = requestAnimationFrame(measureFps);

    // ── Battery API ──
    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        const updateBat = () => setSnap(p => ({
          ...p,
          batteryLevel: Math.round(bat.level * 100),
          batteryCharging: bat.charging,
          batteryTime: bat.charging ? bat.chargingTime : bat.dischargingTime,
        }));
        updateBat();
        bat.addEventListener("levelchange", updateBat);
        bat.addEventListener("chargingchange", updateBat);
      }).catch(() => {});
    }

    // ── Polling interval (every second) ──
    const iv = setInterval(() => {
      if (pausedRef.current) return;
      const mem = performance.memory;
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const heapPct = mem ? Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100) : null;

      setSnap(p => ({
        ...p,
        jsHeapUsed:  mem ? Math.round(mem.usedJSHeapSize  / 1048576) : null,
        jsHeapTotal: mem ? Math.round(mem.totalJSHeapSize  / 1048576) : null,
        jsHeapLimit: mem ? Math.round(mem.jsHeapSizeLimit  / 1048576) : null,
        heapPct,
        effectiveType: conn?.effectiveType || null,
        downlink:      conn?.downlink      || null,
        rtt:           conn?.rtt           || null,
        saveData:      conn?.saveData      || false,
        fps:           counters.current.fps,
        longTasks:     counters.current.longTasks,
        jsErrors:      counters.current.errors,
        totalClicks:   counters.current.clicks,
        totalScrolls:  counters.current.scrolls,
        totalKeystrokes: counters.current.keys,
        sessionDuration: Math.floor((Date.now() - sessionStart.current) / 1000),
        onLine: navigator.onLine,
      }));

      // Push to series
      setSeries(prev => {
        const ts = nowStr();
        const mem2 = performance.memory;
        const conn2 = navigator.connection || {};
        const next = [
          ...prev,
          {
            t: ts,
            fps: counters.current.fps,
            heap: mem2 ? Math.round(mem2.usedJSHeapSize / 1048576) : 0,
            heapPct: mem2 ? Math.round((mem2.usedJSHeapSize / mem2.jsHeapSizeLimit) * 100) : 0,
            rtt: conn2.rtt || 0,
            longTasks: counters.current.longTasks,
            clicks: counters.current.clicks,
          }
        ];
        return next.slice(-300);
      });
    }, 1000);

    return () => {
      clearInterval(iv);
      cancelAnimationFrame(frameRef.current);
      observers.current.forEach(o => { try { o.disconnect(); } catch {} });
      window.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("error", onError);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return { snap, series };
}

/* ═══════════════════════════════════════════════════════════════
   NETWORK LATENCY HOOK — real HTTP pings to public endpoints
═══════════════════════════════════════════════════════════════ */
function useNetworkLatency(paused) {
  const TARGETS = [
    { name: "dns-google",   url: "https://dns.google/resolve?name=google.com&type=A" },
    { name: "cloudflare",   url: "https://cloudflare-dns.com/dns-query?name=cloudflare.com&type=A" },
  ];

  const [latencies, setLatencies] = useState({});
  const [latHistory, setLatHistory] = useState([]);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const ping = async () => {
      if (pausedRef.current) return;
      const row = { t: nowStr() };
      await Promise.allSettled(
        TARGETS.map(async tgt => {
          const t0 = performance.now();
          try {
            await fetch(tgt.url, { method: "HEAD", cache: "no-store", mode: "no-cors", signal: AbortSignal.timeout(5000) });
          } catch {}
          row[tgt.name] = Math.round(performance.now() - t0);
        })
      );
      setLatencies(row);
      setLatHistory(prev => [...prev, row].slice(-120));
    };
    ping();
    const iv = setInterval(ping, 3000);
    return () => clearInterval(iv);
  }, []);

  return { latencies, latHistory, targets: TARGETS };
}

/* ═══════════════════════════════════════════════════════════════
   RESOURCE TIMELINE HOOK — real PerformanceResourceTiming entries
═══════════════════════════════════════════════════════════════ */
function useResourceEntries() {
  const [resources, setResources] = useState([]);

  useEffect(() => {
    const update = () => {
      const entries = performance.getEntriesByType("resource")
        .slice(-30)
        .reverse()
        .map(e => ({
          name: e.name.split("/").pop().split("?")[0].slice(0, 40) || e.initiatorType,
          type: e.initiatorType,
          duration: Math.round(e.duration),
          size: e.transferSize ? fmtBytes(e.transferSize) : "cached",
          dns: Math.round(e.domainLookupEnd - e.domainLookupStart),
          tcp: Math.round(e.connectEnd - e.connectStart),
          ttfb: Math.round(e.responseStart - e.requestStart),
        }));
      setResources(entries);
    };
    update();
    try {
      const obs = new PerformanceObserver(() => update());
      obs.observe({ type: "resource" });
      return () => obs.disconnect();
    } catch {}
  }, []);

  return resources;
}

/* ═══════════════════════════════════════════════════════════════
   ALERTS ENGINE
═══════════════════════════════════════════════════════════════ */
function useAlerts(snap, latencies) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const triggered = [];
    const ts = new Date().toISOString();

    if (snap.fps < 30)
      triggered.push({ id: Date.now() + 1, rule: "Low FPS", severity: "critical", msg: `FPS dropped to ${snap.fps} (< 30 threshold)`, ts });
    else if (snap.fps < 50)
      triggered.push({ id: Date.now() + 2, rule: "Reduced FPS", severity: "warning", msg: `FPS at ${snap.fps}, below 50 target`, ts });

    if (snap.heapPct != null && snap.heapPct > 80)
      triggered.push({ id: Date.now() + 3, rule: "High JS Heap", severity: "critical", msg: `Heap at ${snap.heapPct}% of limit (${snap.jsHeapUsed}MB / ${snap.jsHeapLimit}MB)`, ts });

    if (snap.longTasks > 10)
      triggered.push({ id: Date.now() + 4, rule: "Many Long Tasks", severity: "warning", msg: `${snap.longTasks} long tasks (>50ms) detected this session`, ts });

    if (!snap.onLine)
      triggered.push({ id: Date.now() + 5, rule: "Offline", severity: "critical", msg: "Device is offline — no network connectivity", ts });

    if (snap.lcp && snap.lcp > 4000)
      triggered.push({ id: Date.now() + 6, rule: "Poor LCP", severity: "critical", msg: `LCP is ${snap.lcp}ms (> 4000ms threshold)`, ts });

    if (snap.cls && snap.cls > 0.25)
      triggered.push({ id: Date.now() + 7, rule: "Poor CLS", severity: "warning", msg: `CLS score ${snap.cls} exceeds 0.25 threshold`, ts });

    if (snap.batteryLevel != null && snap.batteryLevel < 20 && !snap.batteryCharging)
      triggered.push({ id: Date.now() + 8, rule: "Low Battery", severity: "warning", msg: `Battery at ${snap.batteryLevel}% and discharging`, ts });

    const maxLat = Math.max(...Object.values(latencies).filter(v => typeof v === "number"));
    if (maxLat > 800)
      triggered.push({ id: Date.now() + 9, rule: "High Network Latency", severity: "warning", msg: `Network ping reached ${maxLat}ms`, ts });

    if (snap.jsErrors && snap.jsErrors.length > 0) {
      const last = snap.jsErrors[snap.jsErrors.length - 1];
      triggered.push({ id: Date.now() + 10, rule: "JavaScript Error", severity: "critical", msg: last.msg, ts: last.ts || ts });
    }

    if (triggered.length > 0) {
      setAlerts(prev => {
        const merged = [...triggered, ...prev].slice(0, 60);
        // Deduplicate by rule within 5 seconds
        const seen = new Set();
        return merged.filter(a => {
          const k = a.rule;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      });
    }
  }, [snap.fps, snap.heapPct, snap.longTasks, snap.onLine, snap.lcp, snap.cls, snap.batteryLevel, snap.jsErrors?.length]);

  return alerts;
}

/* ═══════════════════════════════════════════════════════════════
   TABS CONFIG
═══════════════════════════════════════════════════════════════ */
const TABS = [
  { id: "overview",   label: "Overview" },
  { id: "vitals",     label: "Web Vitals" },
  { id: "memory",     label: "Memory" },
  { id: "network",    label: "Network" },
  { id: "resources",  label: "Resources" },
  { id: "device",     label: "Device" },
  { id: "alerts",     label: "Alerts" },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function PerformanceMonitor() {
  const [tab, setTab]       = useState("overview");
  const [paused, setPaused] = useState(false);
  const [range, setRange]   = useState(60);
  const [fpsHistory, setFpsHistory] = useState([]);

  const { snap, series } = useDevicePerf(paused);
  const { latencies, latHistory, targets } = useNetworkLatency(paused);
  const resources  = useResourceEntries();
  const alerts     = useAlerts(snap, latencies);

  useEffect(() => {
    if (!paused) setFpsHistory(prev => [...prev.slice(-59), snap.fps || 60]);
  }, [snap.fps, paused]);

  const vis = series.slice(-range);
  const critAlerts = alerts.filter(a => a.severity === "critical").length;

  /* ── OVERVIEW TAB ── */
  const renderOverview = () => {
    const heapArr = vis.map(d => d.heapPct);
    const fpsArr  = vis.map(d => d.fps);
    const rttArr  = vis.map(d => d.rtt);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Status banner */}
        <div style={{ padding: "12px 16px", background: "rgba(20,184,166,.07)", border: "1px solid rgba(20,184,166,.2)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.1rem" }}>🟢</span>
          <div>
            <p style={{ fontSize: ".8rem", color: "#2dd4bf", fontWeight: 600 }}>Real Device Monitor — This Browser Session</p>
            <p style={{ fontSize: ".68rem", color: "var(--text2)", marginTop: 2 }}>
              Live via <code style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "#2dd4bf" }}>PerformanceObserver</code> +{" "}
              <code style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "#2dd4bf" }}>Performance API</code> +{" "}
              <code style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "#2dd4bf" }}>Navigator APIs</code>
              {" · "}Session: <strong style={{ color: "var(--text)" }}>{fmtDur(snap.sessionDuration)}</strong>
              {snap.hidden && <span className="badge badge-warn" style={{ marginLeft: 8 }}>Tab hidden</span>}
              {!snap.onLine && <span className="badge badge-err" style={{ marginLeft: 8 }}>Offline</span>}
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid-4">
          <div className="card" style={{ padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${fpsColor(snap.fps)},transparent)` }} />
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
              <p className="label-upper" style={{ margin: 0 }}>Frame Rate</p>
              <span className="real-badge">LIVE</span>
            </div>
            <p className="metric-val" style={{ fontSize: "1.65rem", color: fpsColor(snap.fps) }}>
              {snap.fps}<span style={{ fontSize: ".75rem", color: "var(--text3)", marginLeft: 3 }}>fps</span>
            </p>
            <div className="progress-bar" style={{ marginTop: 8 }}>
              <div className="progress-fill" style={{ width: `${(snap.fps / 60) * 100}%`, background: fpsColor(snap.fps) }} />
            </div>
            <p style={{ fontSize: ".65rem", color: fpsColor(snap.fps), marginTop: 4 }}>
              {snap.fps >= 55 ? "Smooth" : snap.fps >= 30 ? "Moderate" : "Janky"}
            </p>
          </div>

          <MetricCard
            label="JS Heap Used" tag="LIVE"
            value={snap.jsHeapUsed ?? "—"} unit="MB"
            badge={snap.heapPct != null ? { text: `${snap.heapPct}% of limit`, cls: heapColor(snap.heapPct) === "#10b981" ? "badge-ok" : snap.heapPct < 80 ? "badge-warn" : "badge-err" } : undefined}
            spark={heapArr} sparkColor="#ef4444" accent="#ef4444"
          />
          <MetricCard
            label="Network RTT" tag="LIVE"
            value={snap.rtt ?? (Object.values(latencies).find(v => typeof v === "number") ?? "—")}
            unit="ms"
            badge={snap.rtt != null ? latBadge(snap.rtt) : undefined}
            spark={rttArr} sparkColor="#3b82f6" accent="#3b82f6"
          />
          <MetricCard
            label="Long Tasks" tag="SESSION"
            value={snap.longTasks ?? 0}
            badge={snap.longTasks > 10 ? { text: "Many", cls: "badge-err" } : snap.longTasks > 3 ? { text: "Some", cls: "badge-warn" } : { text: "Clean", cls: "badge-ok" }}
            sub="Tasks > 50ms blocking thread"
            accent="#f59e0b"
          />
        </div>

        {/* FPS history + Heap history */}
        <div className="grid-2">
          <CCard title="FPS History" sub="Real animation frame rate — last 60 seconds" badge={`${snap.fps} fps`} badgeCls={snap.fps >= 55 ? "badge-ok" : snap.fps >= 30 ? "badge-warn" : "badge-err"}>
            {fpsHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={fpsHistory.map((v, i) => ({ t: i, fps: v }))} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gFPS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GR} strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={AX} tickLine={false} />
                  <YAxis tick={AX} tickLine={false} axisLine={false} domain={[0, 65]} />
                  <Tooltip content={<CTip unit=" fps" />} />
                  <Area type="monotone" dataKey="fps" name="FPS" stroke="#10b981" strokeWidth={1.5} fill="url(#gFPS)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p style={{ color: "var(--text3)", fontSize: ".7rem" }}>Collecting…</p>}
          </CCard>

          <CCard title="Heap Usage Over Time" sub="JS memory in MB" badge={snap.heapPct != null ? `${snap.heapPct}% used` : "—"} badgeCls={snap.heapPct > 80 ? "badge-err" : snap.heapPct > 60 ? "badge-warn" : "badge-ok"}>
            {vis.length > 1 ? (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={vis} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gHeap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GR} strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length / 5)} />
                  <YAxis tick={AX} tickLine={false} axisLine={false} />
                  <Tooltip content={<CTip unit=" MB" />} />
                  <Area type="monotone" dataKey="heap" name="Heap" stroke="#ef4444" strokeWidth={1.5} fill="url(#gHeap)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p style={{ color: "var(--text3)", fontSize: ".7rem" }}>Collecting…</p>}
          </CCard>
        </div>

        {/* Network latency live */}
        <CCard title="Live Network Latency" sub="Real HTTP pings to public DNS resolvers every 3 seconds">
          {latHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={latHistory} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid {...GR} strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(latHistory.length / 5)} />
                <YAxis tick={AX} tickLine={false} axisLine={false} />
                <Tooltip content={<CTip unit=" ms" />} />
                {targets.map((tgt, i) => (
                  <Line key={tgt.name} type="monotone" dataKey={tgt.name} name={tgt.name}
                    stroke={i === 0 ? "#3b82f6" : "#10b981"} strokeWidth={1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : <p style={{ color: "var(--text3)", fontSize: ".7rem" }}>Pinging…</p>}
        </CCard>

        {/* Session interactions */}
        <div className="grid-2">
          <CCard title="User Interactions" sub="This session">
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              {[
                { icon: "⏱", label: "Session duration", value: fmtDur(snap.sessionDuration), color: "#14b8a6" },
                { icon: "🖱", label: "Total clicks",     value: snap.totalClicks,              color: "#3b82f6" },
                { icon: "↕", label: "Scroll events",    value: snap.totalScrolls,             color: "#10b981" },
                { icon: "⌨", label: "Keystrokes",       value: snap.totalKeystrokes,          color: "#f59e0b" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "rgba(255,255,255,.02)", borderRadius: 7 }}>
                  <span style={{ fontSize: ".75rem", color: "var(--text2)" }}>{item.icon} {item.label}</span>
                  <span className="mono" style={{ fontSize: ".72rem", color: item.color, fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </CCard>

          <CCard title="JS Errors" sub="Caught this session via window.onerror">
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4, maxHeight: 160, overflowY: "auto" }}>
              {(!snap.jsErrors || snap.jsErrors.length === 0)
                ? <p style={{ fontSize: ".7rem", color: "var(--text3)", fontStyle: "italic" }}>✓ No errors detected</p>
                : snap.jsErrors.map((e, i) => (
                    <div key={i} className="alert-item alert-crit">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span style={{ fontSize: ".7rem", color: "var(--red2)", flex: 1 }}>{e.msg}</span>
                        <span className="mono" style={{ fontSize: ".6rem", color: "var(--text3)", flexShrink: 0 }}>{e.ts}</span>
                      </div>
                    </div>
                  ))}
            </div>
          </CCard>
        </div>
      </div>
    );
  };

  /* ── WEB VITALS TAB ── */
  const renderVitals = () => {
    const VCard = ({ label, value, unit, color, score, note }) => (
      <div className="card" style={{ padding: "16px 18px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},transparent)` }} />
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
          <p className="label-upper" style={{ margin: 0 }}>{label}</p>
          <span className="real-badge">BROWSER</span>
        </div>
        <p className="metric-val" style={{ fontSize: "1.55rem", color: "var(--text)" }}>
          {value != null
            ? <>{value}<span style={{ fontSize: ".72rem", color: "var(--text3)", marginLeft: 4 }}>{unit}</span></>
            : <span style={{ fontSize: ".85rem", color: "var(--text3)" }}>Measuring…</span>}
        </p>
        {score && value != null && (
          <p style={{ fontSize: ".68rem", color, marginTop: 6, fontWeight: 500 }}>{score}</p>
        )}
        {note && <p style={{ fontSize: ".62rem", color: "var(--text3)", marginTop: 3 }}>{note}</p>}
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: "10px 16px", background: "rgba(59,130,246,.07)", border: "1px solid rgba(59,130,246,.2)", borderRadius: 10 }}>
          <p style={{ fontSize: ".78rem", color: "#60a5fa", fontWeight: 600, marginBottom: 2 }}>Core Web Vitals — Real measurements from this page load</p>
          <p style={{ fontSize: ".68rem", color: "var(--text2)" }}>LCP, FCP, CLS are captured via PerformanceObserver. FID/INP require user interaction to register.</p>
        </div>

        <p className="label-upper">Core Vitals</p>
        <div className="grid-4">
          <VCard label="LCP" value={snap.lcp} unit="ms" color={lcpColor(snap.lcp || 0)} score={snap.lcp ? lcpScore(snap.lcp) : null} note="Largest Contentful Paint" />
          <VCard label="FCP" value={snap.fcp}  unit="ms" color={snap.fcp < 1800 ? "#10b981" : snap.fcp < 3000 ? "#f59e0b" : "#ef4444"} score={snap.fcp ? (snap.fcp < 1800 ? "Good" : snap.fcp < 3000 ? "Needs work" : "Poor") : null} note="First Contentful Paint" />
          <VCard label="CLS" value={snap.cls}  unit=""  color={clsColor(snap.cls || 0)} score={snap.cls != null ? clsScore(snap.cls) : null} note="Cumulative Layout Shift" />
          <VCard label="FID" value={snap.fid}  unit="ms" color={snap.fid == null ? "#10b981" : snap.fid < 100 ? "#10b981" : snap.fid < 300 ? "#f59e0b" : "#ef4444"} score={snap.fid != null ? (snap.fid < 100 ? "Good" : snap.fid < 300 ? "Needs work" : "Poor") : "Waiting for input…"} note="First Input Delay" />
        </div>

        <p className="label-upper">Navigation Timing</p>
        <div className="grid-4">
          <MetricCard label="Page Load"      value={snap.pageLoad    ?? "—"} unit="ms" accent="#3b82f6" badge={snap.pageLoad ? (snap.pageLoad < 2000 ? { text: "Fast", cls: "badge-ok" } : snap.pageLoad < 5000 ? { text: "Moderate", cls: "badge-warn" } : { text: "Slow", cls: "badge-err" }) : undefined} />
          <MetricCard label="TTFB"           value={snap.ttfb        ?? "—"} unit="ms" accent="#14b8a6" badge={snap.ttfb ? (snap.ttfb < 200 ? { text: "Good", cls: "badge-ok" } : snap.ttfb < 500 ? { text: "Fair", cls: "badge-warn" } : { text: "Slow", cls: "badge-err" }) : undefined} />
          <MetricCard label="DOM Interactive" value={snap.domInteractive ?? "—"} unit="ms" accent="#8b5cf6" />
          <MetricCard label="DOM Content"    value={snap.domContent  ?? "—"} unit="ms" accent="#f59e0b" />
        </div>

        <div className="grid-3">
          <MetricCard label="DNS Lookup"     value={snap.dnsTime ?? "—"} unit="ms" accent="#a78bfa" />
          <MetricCard label="TCP Handshake"  value={snap.tcpTime ?? "—"} unit="ms" accent="#2dd4bf" />
          <MetricCard label="TLS Handshake"  value={snap.tlsTime ?? "—"} unit="ms" accent="#fb7185" />
        </div>

        {/* Waterfall */}
        <CCard title="Navigation Waterfall" sub="Time breakdown of this page load">
          {snap.pageLoad ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {[
                { label: "DNS",          ms: snap.dnsTime,        color: "#a78bfa" },
                { label: "TCP",          ms: snap.tcpTime,        color: "#2dd4bf" },
                { label: "TLS",          ms: snap.tlsTime,        color: "#fb7185" },
                { label: "TTFB",         ms: snap.ttfb,           color: "#3b82f6" },
                { label: "FCP",          ms: snap.fcp,            color: "#10b981" },
                { label: "DOM Content",  ms: snap.domContent,     color: "#f59e0b" },
                { label: "DOM Interactive", ms: snap.domInteractive, color: "#8b5cf6" },
                { label: "Page Load",    ms: snap.pageLoad,       color: "#ef4444" },
              ].filter(e => e.ms > 0).map(e => {
                const pct = Math.min(100, ((e.ms || 0) / (snap.pageLoad || 1)) * 100);
                return (
                  <div key={e.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 90, fontSize: ".7rem", color: "var(--text2)", flexShrink: 0 }}>{e.label}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,.04)" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: e.color, opacity: .8 }} />
                    </div>
                    <span className="mono" style={{ fontSize: ".68rem", color: "var(--text3)", width: 55, textAlign: "right" }}>{e.ms}ms</span>
                  </div>
                );
              })}
            </div>
          ) : <p style={{ color: "var(--text3)", fontSize: ".7rem" }}>Loading timing data…</p>}
        </CCard>
      </div>
    );
  };

  /* ── MEMORY TAB ── */
  const renderMemory = () => {
    const heapArr  = vis.map(d => d.heap);
    const heapPArr = vis.map(d => d.heapPct);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {snap.jsHeapUsed == null && (
          <div style={{ padding: "10px 16px", background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.25)", borderRadius: 10 }}>
            <p style={{ fontSize: ".78rem", color: "#fbbf24", fontWeight: 600 }}>⚠ Memory API not available</p>
            <p style={{ fontSize: ".68rem", color: "var(--text2)", marginTop: 2 }}>
              <code style={{ fontFamily: "var(--mono)", fontSize: ".65rem" }}>performance.memory</code> is a Chrome-only API.
              Open in Chromium-based browser for heap data.
            </p>
          </div>
        )}

        <div className="grid-4">
          <MetricCard label="Heap Used"  tag="LIVE" value={snap.jsHeapUsed  ?? "N/A"} unit="MB" accent="#ef4444"
            badge={snap.heapPct != null ? { text: `${snap.heapPct}%`, cls: heapColor(snap.heapPct) === "#10b981" ? "badge-ok" : snap.heapPct < 80 ? "badge-warn" : "badge-err" } : undefined} />
          <MetricCard label="Heap Total" tag="LIVE" value={snap.jsHeapTotal ?? "N/A"} unit="MB" accent="#f59e0b" />
          <MetricCard label="Heap Limit" value={snap.jsHeapLimit ?? "N/A"} unit="MB" accent="#3b82f6"
            sub="V8 allocation ceiling" />
          <MetricCard label="Resources"  value={snap.resourceCount ?? 0} accent="#8b5cf6"
            sub={snap.resourceBytes ? fmtBytes(snap.resourceBytes) + " transferred" : undefined} />
        </div>

        <div className="grid-2">
          <CCard title="Heap Used (MB)" sub="JS memory over time">
            {heapArr.length > 1
              ? <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={vis} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs><linearGradient id="gH2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid {...GR} strokeDasharray="3 3"/>
                    <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length/5)}/>
                    <YAxis tick={AX} tickLine={false} axisLine={false}/>
                    <Tooltip content={<CTip unit=" MB"/>}/>
                    <Area type="monotone" dataKey="heap" name="Heap MB" stroke="#ef4444" strokeWidth={1.5} fill="url(#gH2)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              : <p style={{ color: "var(--text3)", fontSize: ".7rem" }}>Collecting…</p>}
          </CCard>

          <CCard title="Heap % of Limit" sub="Pressure over time">
            {heapPArr.length > 1
              ? <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={vis} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs><linearGradient id="gHP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={.2}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid {...GR} strokeDasharray="3 3"/>
                    <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(vis.length/5)}/>
                    <YAxis tick={AX} tickLine={false} axisLine={false} domain={[0,100]}/>
                    <Tooltip content={<CTip unit="%"/>}/>
                    <Area type="monotone" dataKey="heapPct" name="Heap %" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gHP)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              : <p style={{ color: "var(--text3)", fontSize: ".7rem" }}>Collecting…</p>}
          </CCard>
        </div>

        {/* Gauge bars */}
        {snap.jsHeapUsed != null && (
          <CCard title="Memory Pressure Gauges" sub="Real-time allocations">
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
              {[
                { label: "Heap Used",    val: snap.jsHeapUsed,  max: snap.jsHeapLimit, unit: "MB", color: "#ef4444" },
                { label: "Heap Total",   val: snap.jsHeapTotal, max: snap.jsHeapLimit, unit: "MB", color: "#f59e0b" },
              ].map(g => {
                const pct = Math.round((g.val / g.max) * 100);
                return (
                  <div key={g.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: ".75rem", color: "var(--text2)" }}>{g.label}</span>
                      <span className="mono" style={{ fontSize: ".7rem", color: g.color }}>{g.val} / {g.max} {g.unit} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.05)" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: g.color, transition: "width .5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CCard>
        )}
      </div>
    );
  };

  /* ── NETWORK TAB ── */
  const renderNetwork = () => {
    const codeColors = { "2xx": "#10b981", "3xx": "#3b82f6", "4xx": "#f59e0b", "5xx": "#ef4444" };
    const connType = snap.effectiveType;
    const connColor = connType === "4g" ? "#10b981" : connType === "3g" ? "#f59e0b" : "#ef4444";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="grid-4">
          <MetricCard label="Effective Type" tag="LIVE" value={snap.effectiveType?.toUpperCase() || "—"}
            badge={snap.effectiveType ? { text: snap.effectiveType === "4g" ? "Fast" : snap.effectiveType === "3g" ? "Medium" : "Slow", cls: snap.effectiveType === "4g" ? "badge-ok" : snap.effectiveType === "3g" ? "badge-warn" : "badge-err" } : undefined}
            accent={connColor} />
          <MetricCard label="Downlink" tag="LIVE" value={snap.downlink ?? "—"} unit="Mbps"
            badge={snap.downlink ? { text: snap.downlink > 10 ? "Fast" : snap.downlink > 1 ? "OK" : "Slow", cls: snap.downlink > 10 ? "badge-ok" : snap.downlink > 1 ? "badge-warn" : "badge-err" } : undefined}
            accent="#10b981" />
          <MetricCard label="Round-trip Time" tag="LIVE" value={snap.rtt ?? "—"} unit="ms"
            badge={snap.rtt != null ? latBadge(snap.rtt) : undefined}
            spark={vis.map(d => d.rtt)} sparkColor="#3b82f6" accent="#3b82f6" />
          <MetricCard label="Status" tag="LIVE"
            value={snap.onLine ? "Online" : "Offline"}
            badge={snap.onLine ? { text: "Connected", cls: "badge-ok" } : { text: "Offline", cls: "badge-err" }}
            accent={snap.onLine ? "#10b981" : "#ef4444"}
            sub={snap.saveData ? "Save-data mode on" : undefined} />
        </div>

        {/* Live latency chart */}
        <CCard title="Real-time Network Latency" sub="HTTP pings to dns.google + cloudflare-dns every 3 seconds">
          {latHistory.length > 1
            ? <ResponsiveContainer width="100%" height={160}>
                <LineChart data={latHistory} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid {...GR} strokeDasharray="3 3"/>
                  <XAxis dataKey="t" tick={AX} tickLine={false} interval={Math.floor(latHistory.length/6)}/>
                  <YAxis tick={AX} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CTip unit=" ms"/>}/>
                  {targets.map((tgt, i) => (
                    <Line key={tgt.name} type="monotone" dataKey={tgt.name} name={tgt.name}
                      stroke={i === 0 ? "#3b82f6" : "#10b981"} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            : <p style={{ color: "var(--text3)", fontSize: ".7rem" }}>Pinging…</p>}
          <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
            {targets.map((tgt, i) => (
              <div key={tgt.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 16, height: 2, background: i === 0 ? "#3b82f6" : "#10b981", borderRadius: 1, display: "inline-block" }} />
                <span style={{ fontSize: ".65rem", color: "var(--text3)" }}>{tgt.name}: {latencies[tgt.name] ?? "—"}ms</span>
              </div>
            ))}
          </div>
        </CCard>

        {/* Current readings */}
        <CCard title="Connection Details" sub="Navigator Connection API (Chrome / Edge)">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {[
              { label: "Effective Connection Type", value: snap.effectiveType?.toUpperCase() || "Unknown", color: connColor },
              { label: "Estimated Downlink",        value: snap.downlink ? `${snap.downlink} Mbps` : "—", color: "#10b981" },
              { label: "Round-Trip Time (RTT)",     value: snap.rtt != null ? `${snap.rtt} ms` : "—",    color: "#3b82f6" },
              { label: "Data Saver Mode",           value: snap.saveData ? "Enabled" : "Disabled",        color: snap.saveData ? "#f59e0b" : "#10b981" },
              { label: "Online Status",             value: snap.onLine ? "Online" : "Offline",            color: snap.onLine ? "#10b981" : "#ef4444" },
              { label: "dns.google Ping",           value: latencies["dns-google"] != null ? `${latencies["dns-google"]} ms` : "—", color: "#3b82f6" },
              { label: "Cloudflare DNS Ping",       value: latencies["cloudflare"] != null ? `${latencies["cloudflare"]} ms` : "—",  color: "#10b981" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "rgba(255,255,255,.02)", borderRadius: 7 }}>
                <span style={{ fontSize: ".75rem", color: "var(--text2)" }}>{item.label}</span>
                <span className="mono" style={{ fontSize: ".72rem", color: item.color, fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </CCard>
      </div>
    );
  };

  /* ── RESOURCES TAB ── */
  const renderResources = () => {
    const typeColors = { script: "#3b82f6", css: "#8b5cf6", img: "#10b981", fetch: "#f59e0b", xmlhttprequest: "#ef4444", other: "#475569" };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="grid-3">
          <MetricCard label="Resources Loaded" value={snap.resourceCount ?? 0} accent="#3b82f6" sub="Total entries in PerformanceTiming" />
          <MetricCard label="Transferred"       value={snap.resourceBytes ? fmtBytes(snap.resourceBytes) : "—"} accent="#10b981" sub="Total bytes over network" />
          <MetricCard label="Long Tasks"        value={snap.longTasks ?? 0} accent="#f59e0b"
            badge={snap.longTasks > 10 ? { text: "Many", cls: "badge-err" } : snap.longTasks > 3 ? { text: "Some", cls: "badge-warn" } : { text: "Clean", cls: "badge-ok" }} />
        </div>

        <CCard title="Resource Timing" sub="Recent network resources — real PerformanceResourceTiming entries">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".7rem", marginTop: 4 }}>
              <thead>
                <tr>
                  {["Resource", "Type", "Duration", "TTFB", "DNS", "Size"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text3)", fontWeight: 600, borderBottom: "1px solid var(--border)", fontFamily: "var(--mono)", fontSize: ".62rem" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resources.slice(0, 20).map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                    <td style={{ padding: "6px 8px", color: "var(--text2)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</td>
                    <td style={{ padding: "6px 8px" }}>
                      <span className="badge" style={{ background: `${typeColors[r.type] || "#475569"}18`, color: typeColors[r.type] || "#475569", borderColor: `${typeColors[r.type] || "#475569"}30`, fontSize: ".55rem" }}>{r.type}</span>
                    </td>
                    <td style={{ padding: "6px 8px", fontFamily: "var(--mono)", color: latColor(r.duration) }}>{r.duration}ms</td>
                    <td style={{ padding: "6px 8px", fontFamily: "var(--mono)", color: "var(--text3)" }}>{r.ttfb > 0 ? r.ttfb + "ms" : "—"}</td>
                    <td style={{ padding: "6px 8px", fontFamily: "var(--mono)", color: "var(--text3)" }}>{r.dns > 0 ? r.dns + "ms" : "—"}</td>
                    <td style={{ padding: "6px 8px", fontFamily: "var(--mono)", color: "var(--text3)" }}>{r.size}</td>
                  </tr>
                ))}
                {resources.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "12px 8px", color: "var(--text3)", fontStyle: "italic" }}>No resources captured yet…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CCard>

        {/* Duration distribution */}
        {resources.length > 1 && (
          <CCard title="Resource Duration Distribution" sub="Fetch times across all loaded resources">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={resources.slice(0, 20).map((r, i) => ({ name: i, ms: r.duration, type: r.type }))} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid {...GR} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={false} />
                <YAxis tick={AX} tickLine={false} axisLine={false} />
                <Tooltip content={<CTip unit=" ms" />} />
                <Bar dataKey="ms" name="Duration" fill="#3b82f6" fillOpacity={.7} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CCard>
        )}
      </div>
    );
  };

  /* ── DEVICE TAB ── */
  const renderDevice = () => {
    const info = [
      { section: "Hardware", items: [
        { label: "CPU Logical Cores",   value: snap.hardwareConcurrency ?? "—",                     color: "#3b82f6" },
        { label: "Device Memory",       value: snap.deviceMemory ? `${snap.deviceMemory} GB` : "—", color: "#10b981" },
        { label: "Screen Resolution",   value: `${snap.screenW} × ${snap.screenH}`,                 color: "#8b5cf6" },
        { label: "Device Pixel Ratio",  value: snap.devicePixelRatio ?? "—",                        color: "#f59e0b" },
        { label: "Color Depth",         value: snap.colorDepth ? `${snap.colorDepth}-bit` : "—",    color: "#14b8a6" },
      ]},
      { section: "Browser", items: [
        { label: "Platform",            value: snap.platform   || "—",           color: "#a78bfa" },
        { label: "Language",            value: snap.language   || "—",           color: "#2dd4bf" },
        { label: "Online",              value: snap.onLine ? "Yes" : "No",       color: snap.onLine ? "#10b981" : "#ef4444" },
        { label: "Tab Visible",         value: snap.hidden ? "Hidden" : "Visible", color: snap.hidden ? "#f59e0b" : "#10b981" },
        { label: "Save Data",           value: snap.saveData ? "On" : "Off",     color: snap.saveData ? "#f59e0b" : "#10b981" },
      ]},
      { section: "Battery", items: [
        { label: "Battery Level",       value: snap.batteryLevel != null ? `${snap.batteryLevel}%` : "N/A", color: snap.batteryLevel > 20 ? "#10b981" : "#ef4444" },
        { label: "Charging",            value: snap.batteryCharging != null ? (snap.batteryCharging ? "Yes" : "No") : "N/A", color: snap.batteryCharging ? "#10b981" : "#f59e0b" },
        { label: "Time to Full/Empty",  value: snap.batteryTime && isFinite(snap.batteryTime) ? fmtDur(snap.batteryTime) : "N/A", color: "#3b82f6" },
      ]},
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Battery gauge */}
        {snap.batteryLevel != null && (
          <div className="card" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: ".85rem", fontWeight: 500, color: "var(--text)", fontFamily: "var(--disp)" }}>
                Battery {snap.batteryCharging ? "⚡ Charging" : "🔋 Discharging"}
              </p>
              <span className={`badge ${snap.batteryLevel > 50 ? "badge-ok" : snap.batteryLevel > 20 ? "badge-warn" : "badge-err"}`}>
                {snap.batteryLevel}%
              </span>
            </div>
            <div style={{ height: 12, borderRadius: 6, background: "rgba(255,255,255,.05)" }}>
              <div style={{
                width: `${snap.batteryLevel}%`, height: "100%", borderRadius: 6,
                background: snap.batteryLevel > 50 ? "#10b981" : snap.batteryLevel > 20 ? "#f59e0b" : "#ef4444",
                transition: "width .5s ease"
              }} />
            </div>
            {snap.batteryTime && isFinite(snap.batteryTime) && (
              <p style={{ fontSize: ".68rem", color: "var(--text3)", marginTop: 6 }}>
                {snap.batteryCharging ? "Full in" : "Empty in"}: {fmtDur(snap.batteryTime)}
              </p>
            )}
          </div>
        )}

        {/* CPU core visualization */}
        {snap.hardwareConcurrency && (
          <CCard title="CPU Cores" sub={`${snap.hardwareConcurrency} logical processors detected`}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {Array.from({ length: snap.hardwareConcurrency }).map((_, i) => (
                <div key={i} style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `rgba(59,130,246,${0.1 + (i / snap.hardwareConcurrency) * 0.4})`,
                  border: "1px solid rgba(59,130,246,.3)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: ".6rem", color: "#60a5fa", fontFamily: "var(--mono)"
                }}>
                  C{i}
                </div>
              ))}
            </div>
          </CCard>
        )}

        {/* Info sections */}
        <div className="grid-2">
          {info.slice(0, 2).map(section => (
            <CCard key={section.section} title={section.section} sub="Detected via Navigator / Screen APIs">
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {section.items.map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "rgba(255,255,255,.02)", borderRadius: 7 }}>
                    <span style={{ fontSize: ".75rem", color: "var(--text2)" }}>{item.label}</span>
                    <span className="mono" style={{ fontSize: ".72rem", color: item.color, fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </CCard>
          ))}
        </div>

        <CCard title="Battery & Power" sub="Battery Status API">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {info[2].items.map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "rgba(255,255,255,.02)", borderRadius: 7 }}>
                <span style={{ fontSize: ".75rem", color: "var(--text2)" }}>{item.label}</span>
                <span className="mono" style={{ fontSize: ".72rem", color: item.color, fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </CCard>

        {/* User Agent */}
        <CCard title="User Agent" sub="Full browser string">
          <p className="mono" style={{ fontSize: ".65rem", color: "var(--text2)", lineHeight: 1.6, marginTop: 4, wordBreak: "break-all" }}>
            {snap.userAgent || "—"}
          </p>
        </CCard>
      </div>
    );
  };

  /* ── ALERTS TAB ── */
  const renderAlerts = () => {
    const crit = alerts.filter(a => a.severity === "critical").length;
    const warn = alerts.filter(a => a.severity === "warning").length;
    const rules = [
      { name: "FPS < 30",         metric: "fps",         threshold: "< 30",   severity: "critical" },
      { name: "FPS < 50",         metric: "fps",         threshold: "< 50",   severity: "warning" },
      { name: "Heap > 80%",       metric: "heapPct",     threshold: "> 80%",  severity: "critical" },
      { name: "Long Tasks > 10",  metric: "longTasks",   threshold: "> 10",   severity: "warning" },
      { name: "LCP > 4000ms",     metric: "lcp",         threshold: "> 4000", severity: "critical" },
      { name: "CLS > 0.25",       metric: "cls",         threshold: "> 0.25", severity: "warning" },
      { name: "Offline",          metric: "onLine",      threshold: "= false", severity: "critical" },
      { name: "Battery < 20%",    metric: "battery",     threshold: "< 20%",  severity: "warning" },
      { name: "Net Latency > 800",metric: "rtt",         threshold: "> 800ms", severity: "warning" },
      { name: "JS Error",         metric: "window.error",threshold: "any",    severity: "critical" },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="grid-4">
          <MetricCard label="Critical" value={crit} accent="#ef4444" badge={crit > 0 ? { text: "Active", cls: "badge-err" } : { text: "Clear", cls: "badge-ok" }} />
          <MetricCard label="Warnings" value={warn} accent="#f59e0b" />
          <MetricCard label="Total Rules" value={rules.length} accent="#3b82f6" />
          <MetricCard label="Total Triggered" value={alerts.length} accent="#8b5cf6" />
        </div>

        <div className="grid-2">
          <CCard title="Alert Rules" sub="Evaluated in real-time against live browser metrics">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {rules.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "rgba(255,255,255,.02)", borderRadius: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.severity === "critical" ? "#ef4444" : "#f59e0b", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: ".75rem", color: "var(--text2)" }}>{r.name}</span>
                  <span className="mono" style={{ fontSize: ".62rem", color: "var(--text3)" }}>{r.metric} {r.threshold}</span>
                  <span className={`badge ${r.severity === "critical" ? "badge-err" : "badge-warn"}`} style={{ fontSize: ".55rem" }}>{r.severity}</span>
                </div>
              ))}
            </div>
          </CCard>

          <CCard title="Alert History" sub="Triggered during this session">
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 380, overflowY: "auto", marginTop: 4 }}>
              {alerts.length === 0
                ? <p style={{ fontSize: ".7rem", color: "var(--text3)", fontStyle: "italic" }}>✓ No alerts triggered — all metrics healthy</p>
                : alerts.slice(0, 25).map((a, i) => (
                    <div key={a.id || i} className={`alert-item ${a.severity === "critical" ? "alert-crit" : "alert-warn"}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, gap: 8 }}>
                        <span style={{ fontSize: ".72rem", fontWeight: 600, color: a.severity === "critical" ? "var(--red2)" : "var(--amber2)" }}>
                          {a.severity === "critical" ? "🔴" : "🟡"} {a.rule}
                        </span>
                        <span className="mono" style={{ fontSize: ".6rem", color: "var(--text3)", flexShrink: 0 }}>{new Date(a.ts).toLocaleTimeString("en-US", { hour12: false })}</span>
                      </div>
                      <p style={{ fontSize: ".65rem", color: "var(--text2)" }}>{a.msg}</p>
                    </div>
                  ))}
            </div>
          </CCard>
        </div>
      </div>
    );
  };

  /* ── TAB ROUTER ── */
  const renderTab = () => {
    switch (tab) {
      case "overview":  return renderOverview();
      case "vitals":    return renderVitals();
      case "memory":    return renderMemory();
      case "network":   return renderNetwork();
      case "resources": return renderResources();
      case "device":    return renderDevice();
      case "alerts":    return renderAlerts();
      default:          return renderOverview();
    }
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight: "100vh", background: "var(--bg0)", paddingBottom: 40 }}>

        {/* ── HEADER ── */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(4,6,10,.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,rgba(59,130,246,.3),rgba(20,184,166,.3))", border: "1px solid rgba(59,130,246,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📊</div>
            <div>
              <p style={{ fontFamily: "var(--disp)", fontSize: ".92rem", fontWeight: 600, color: "var(--text)", lineHeight: 1 }}>CKC-OS Monitor</p>
              <p style={{ fontSize: ".6rem", color: "var(--text3)", marginTop: 2 }}>Real-time Device Performance Intelligence</p>
            </div>
            <span className="conn-badge-ok">
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", display: "inline-block" }} className="pulse-dot" />
              {snap.onLine ? "Live" : "Offline"}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", gap: 4 }}>
            {[30, 60, 120].map(r => (
              <button key={r} className={`tab-btn ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>
                {r === 30 ? "30s" : r === 60 ? "1m" : "2m"}
              </button>
            ))}
          </div>

          {critAlerts > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }} onClick={() => setTab("alerts")}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} className="pulse-dot" />
              <span style={{ fontSize: ".68rem", color: "#f87171", fontWeight: 600 }}>{critAlerts} critical</span>
            </div>
          )}

          <button className={`btn ${paused ? "btn-primary" : "btn-danger"}`} onClick={() => setPaused(p => !p)}>
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {/* ── TABS ── */}
          <div className="nav-tabs" style={{ marginBottom: 16 }}>
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)} style={{ whiteSpace: "nowrap" }}>
                {t.id === "alerts" && critAlerts > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: ".5rem", fontWeight: 700, marginRight: 4 }}>{critAlerts}</span>
                )}
                {t.label}
              </button>
            ))}
          </div>

          <div className="fade-in" key={tab}>{renderTab()}</div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ margin: "4px 20px 0", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "FPS",    value: snap.fps,          color: fpsColor(snap.fps) },
              { label: "Heap",   value: snap.jsHeapUsed != null ? `${snap.jsHeapUsed}MB` : "N/A", color: "#ef4444" },
              { label: "RTT",    value: snap.rtt != null ? `${snap.rtt}ms` : "—", color: "#3b82f6" },
              { label: "Cores",  value: snap.hardwareConcurrency || "—", color: "#8b5cf6" },
              { label: "Battery",value: snap.batteryLevel != null ? `${snap.batteryLevel}%${snap.batteryCharging ? "⚡" : ""}` : "N/A", color: "#10b981" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: ".62rem", color: "var(--text3)" }}>{s.label}:</span>
                <span className="mono" style={{ fontSize: ".65rem", color: s.color, fontWeight: 600 }}>{s.value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: ".65rem", color: snap.effectiveType === "4g" ? "#10b981" : "#f59e0b", fontFamily: "var(--mono)" }}>
              {snap.effectiveType?.toUpperCase() || "—"} · {snap.onLine ? "Online" : "Offline"}
            </span>
            <span className="mono" style={{ fontSize: ".6rem", color: "var(--text3)" }}>
              {paused ? "⏸ Paused" : `↻ ${nowStr()}`}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}