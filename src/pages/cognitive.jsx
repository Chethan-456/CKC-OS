import { useState, useEffect, useRef } from "react";

const COLORS = {
  cyan: "#38bdf8",
  teal: "#2dd4bf",
  green: "#4ade80",
  red: "#f87171",
  amber: "#fbbf24",
  purple: "#a78bfa",
  blue: "#60a5fa",
};

const WEEK_DATA = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  productivity: [68, 75, 82, 91, 87, 55, 60],
  target: [80, 80, 80, 80, 80, 80, 80],
  deepWork: [2.1, 3.0, 3.5, 4.2, 3.8, 1.2, 1.5],
  lightFocus: [1.5, 1.3, 1.2, 1.0, 1.1, 2.1, 1.8],
  distracted: [1.0, 0.8, 0.6, 0.3, 0.5, 2.0, 1.8],
  stats: { prod: "84%", prodD: "+6% this week", focus: "3.2h", focusD: "+0.4h avg", sessions: "18", sessD: "sessions done", weak: "5", weakD: "needs review" },
};
const MONTH_DATA = {
  labels: ["Wk1", "Wk2", "Wk3", "Wk4"],
  productivity: [74, 80, 78, 88],
  target: [80, 80, 80, 80],
  deepWork: [12, 16, 14, 20],
  lightFocus: [8, 7, 9, 6],
  distracted: [5, 4, 4, 2],
  stats: { prod: "81%", prodD: "+3% this month", focus: "3.8h", focusD: "+0.6h avg", sessions: "72", sessD: "sessions done", weak: "5", weakD: "needs review" },
};
const QUARTER_DATA = {
  labels: ["Jan", "Feb", "Mar"],
  productivity: [70, 78, 88],
  target: [80, 80, 80],
  deepWork: [48, 60, 72],
  lightFocus: [30, 28, 22],
  distracted: [16, 12, 7],
  stats: { prod: "79%", prodD: "+8% this quarter", focus: "4.1h", focusD: "+1.1h avg", sessions: "290", sessD: "sessions done", weak: "5", weakD: "needs review" },
};

const CONCEPTS = [
  { name: "Recursion", mastery: 22, subject: "CS Fundamentals", tag: "critical" },
  { name: "Async JS", mastery: 38, subject: "JavaScript", tag: "high" },
  { name: "CSS Grid", mastery: 44, subject: "Web Design", tag: "high" },
  { name: "Binary Trees", mastery: 51, subject: "Data Structures", tag: "medium" },
  { name: "SQL Joins", mastery: 57, subject: "Databases", tag: "medium" },
];

const HEATMAP = [
  [1,2,4,3,5,4,3,2],[0,3,5,4,5,5,4,3],[2,3,4,5,5,3,2,1],
  [0,1,3,4,5,5,4,3],[1,2,4,5,5,4,3,1],[0,1,2,2,2,1,1,0],[0,0,1,1,1,1,0,0],
];
const HEAT_HOURS = ["6am","8am","10am","12pm","2pm","4pm","6pm","8pm"];
const HEAT_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function heatColor(v) {
  const stops = ["transparent","rgba(56,189,248,0.1)","rgba(56,189,248,0.25)","rgba(56,189,248,0.45)","rgba(56,189,248,0.7)","rgba(56,189,248,0.95)"];
  return stops[v];
}

function tagStyle(tag) {
  if (tag === "critical") return { bg: "rgba(248,113,113,0.12)", text: "#f87171", border: "rgba(248,113,113,0.3)" };
  if (tag === "high") return { bg: "rgba(251,191,36,0.12)", text: "#fbbf24", border: "rgba(251,191,36,0.3)" };
  return { bg: "rgba(96,165,250,0.12)", text: "#60a5fa", border: "rgba(96,165,250,0.3)" };
}

function tagBarColor(tag) {
  if (tag === "critical") return "from-red-500 to-red-400";
  if (tag === "high") return "from-amber-400 to-yellow-300";
  return "from-cyan-400 to-teal-300";
}

// Mini sparkline SVG
function Sparkline({ data, color, height = 40, width = 120 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / (max - min || 1)) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  const area = `M0,${height} ` + data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / (max - min || 1)) * (height - 6) - 3;
    return `L${x},${y}`;
  }).join(" ") + ` L${width},${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Bar chart for focus distribution
function FocusChart({ data, labels }) {
  const allMax = Math.max(...data.deepWork.map((v, i) => v + data.lightFocus[i] + data.distracted[i]));
  return (
    <div className="flex items-end gap-2 h-36 mt-2">
      {labels.map((lbl, i) => {
        const dw = data.deepWork[i], lf = data.lightFocus[i], di = data.distracted[i];
        const total = dw + lf + di;
        return (
          <div key={lbl} className="flex flex-col items-center flex-1 gap-1">
            <div className="flex flex-col-reverse w-full rounded overflow-hidden" style={{ height: `${(total / allMax) * 100}%` }}>
              <div style={{ flex: dw, background: "linear-gradient(180deg,#2dd4bf,#38bdf8)", minHeight: dw > 0 ? 2 : 0 }} />
              <div style={{ flex: lf, background: "rgba(251,191,36,0.7)", minHeight: lf > 0 ? 2 : 0 }} />
              <div style={{ flex: di, background: "rgba(248,113,113,0.6)", minHeight: di > 0 ? 2 : 0 }} />
            </div>
            <span className="text-xs" style={{ color: "rgba(148,163,184,0.7)", fontSize: 10 }}>{lbl}</span>
          </div>
        );
      })}
    </div>
  );
}

// Productivity line chart SVG
function ProdChart({ data, labels }) {
  const W = 400, H = 120, pad = 28;
  const max = 100, min = 40;
  const pts = (arr) => arr.map((v, i) => {
    const x = pad + (i / (arr.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / (max - min)) * (H - pad * 2);
    return [x, y];
  });
  const toPath = (arr) => pts(arr).map((p, i) => (i === 0 ? `M` : `L`) + `${p[0]},${p[1]}`).join(" ");
  const toArea = (arr) => {
    const p = pts(arr);
    return `M${p[0][0]},${H - pad} ` + p.map(pt => `L${pt[0]},${pt[1]}`).join(" ") + ` L${p[p.length-1][0]},${H - pad} Z`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40,60,80,100].map(v => {
        const y = H - pad - ((v - min) / (max - min)) * (H - pad * 2);
        return <line key={v} x1={pad} x2={W - pad} y1={y} y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth="1" />;
      })}
      <path d={toArea(data.productivity)} fill="url(#prodGrad)" />
      <path d={toPath(data.target)} stroke="rgba(45,212,191,0.4)" strokeWidth="1.5" strokeDasharray="5,4" fill="none" />
      <path d={toPath(data.productivity)} stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {pts(data.productivity).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
      ))}
      {labels.map((lbl, i) => {
        const x = pad + (i / (labels.length - 1)) * (W - pad * 2);
        return <text key={lbl} x={x} y={H - 4} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="9">{lbl}</text>;
      })}
    </svg>
  );
}

// Animated counter
function AnimCounter({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const numVal = parseFloat(value);
  useEffect(() => {
    let start = 0, end = numVal, steps = 30;
    const step = end / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.round(current * 10) / 10);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}{suffix}</>;
}

export default function CognitiveDashboard() {
  const [range, setRange] = useState("week");
  const [activeConceptIdx, setActiveConceptIdx] = useState(null);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 30 });
  const containerRef = useRef();

  const DATA = range === "week" ? WEEK_DATA : range === "month" ? MONTH_DATA : QUARTER_DATA;

  useEffect(() => {
    const move = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setGlowPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "100vh",
        background: "#060b14",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "#e2e8f0",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated bg glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse 60% 50% at ${glowPos.x}% ${glowPos.y}%, rgba(56,189,248,0.07) 0%, transparent 70%)`,
        transition: "background 0.3s ease",
      }} />
      {/* Grid lines */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 24px 40px" }}>

        {/* NAV */}
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 0", borderBottom: "1px solid rgba(56,189,248,0.12)", marginBottom: 32,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#38bdf8,#2dd4bf)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#060b14",
            }}>C</div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", color: "#e2e8f0" }}>CKC-OS</span>
            <span style={{
              fontSize: 10, letterSpacing: "0.15em", color: "#2dd4bf", background: "rgba(45,212,191,0.1)",
              border: "1px solid rgba(45,212,191,0.25)", borderRadius: 4, padding: "2px 8px", marginLeft: 8,
            }}>ANALYTICS</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Overview","Modules","Architecture","Stack"].map(n => (
              <span key={n} style={{ fontSize: 13, color: n === "Overview" ? "#38bdf8" : "rgba(148,163,184,0.7)", cursor: "pointer", letterSpacing: "0.03em" }}>{n}</span>
            ))}
          </div>
          <button style={{
            background: "linear-gradient(135deg,#38bdf8,#2dd4bf)", color: "#060b14",
            border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.05em",
          }}>Get Started</button>
        </nav>

        {/* HEADER */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
            <span style={{ fontSize: 11, letterSpacing: "0.2em", color: "rgba(148,163,184,0.7)" }}>AI-POWERED · REAL-TIME · ADAPTIVE</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                <span style={{ color: "#e2e8f0" }}>Cognitive </span>
                <span style={{ background: "linear-gradient(90deg,#38bdf8,#2dd4bf)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Analytics</span>
              </h1>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(148,163,184,0.6)", letterSpacing: "0.03em" }}>
                Real-time intelligence · Knowledge graph engine v2.4
              </p>
            </div>
            {/* Range switcher */}
            <div style={{
              display: "flex", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(56,189,248,0.15)",
              borderRadius: 10, padding: 4, gap: 2,
            }}>
              {["week","month","quarter"].map(r => (
                <button key={r} onClick={() => setRange(r)} style={{
                  padding: "6px 16px", fontSize: 11, borderRadius: 7, border: "none", cursor: "pointer",
                  letterSpacing: "0.08em", fontFamily: "inherit",
                  background: range === r ? "linear-gradient(135deg,rgba(56,189,248,0.2),rgba(45,212,191,0.2))" : "transparent",
                  color: range === r ? "#38bdf8" : "rgba(148,163,184,0.5)",
                  boxShadow: range === r ? "inset 0 0 0 1px rgba(56,189,248,0.3)" : "none",
                  transition: "all 0.2s",
                }}>
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Productivity score", value: DATA.stats.prod, delta: DATA.stats.prodD, color: COLORS.cyan, sparkData: DATA.productivity, icon: "▲" },
            { label: "Avg focus depth", value: DATA.stats.focus, delta: DATA.stats.focusD, color: COLORS.teal, sparkData: DATA.deepWork, icon: "◎" },
            { label: "Sessions", value: DATA.stats.sessions, delta: DATA.stats.sessD, color: COLORS.purple, sparkData: DATA.deepWork.map((v,i)=>v+DATA.lightFocus[i]), icon: "◈" },
            { label: "Weak concepts", value: DATA.stats.weak, delta: DATA.stats.weakD, color: COLORS.red, sparkData: [5,5,5,5,5,5,5], icon: "⚠" },
          ].map((card) => (
            <div key={card.label} style={{
              background: "rgba(15,23,42,0.7)", border: `1px solid rgba(${card.color === COLORS.cyan ? "56,189,248" : card.color === COLORS.teal ? "45,212,191" : card.color === COLORS.purple ? "167,139,250" : "248,113,113"},0.18)`,
              borderRadius: 14, padding: "20px 20px 16px", position: "relative", overflow: "hidden",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 60, opacity: 0.4 }}>
                <Sparkline data={card.sparkData} color={card.color} width={120} height={60} />
              </div>
              <div style={{ fontSize: 18, marginBottom: 4, color: card.color }}>{card.icon}</div>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", letterSpacing: "0.08em", marginBottom: 6 }}>{card.label.toUpperCase()}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {card.value}
              </div>
              <div style={{ fontSize: 11, color: card.color === COLORS.red ? COLORS.red : "#4ade80", marginTop: 6, letterSpacing: "0.04em" }}>
                {card.delta}
              </div>
            </div>
          ))}
        </div>

        {/* CHARTS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Productivity Trend */}
          <div style={{
            background: "rgba(15,23,42,0.7)", border: "1px solid rgba(56,189,248,0.14)",
            borderRadius: 14, padding: "20px 20px 12px", backdropFilter: "blur(8px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", letterSpacing: "0.04em" }}>Productivity trend</span>
              <div style={{ display: "flex", gap: 12, fontSize: 10, color: "rgba(148,163,184,0.5)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 20, height: 1.5, background: "#38bdf8", display: "inline-block" }} /> Actual
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 20, height: 1.5, background: "rgba(45,212,191,0.4)", display: "inline-block", borderTop: "1px dashed rgba(45,212,191,0.4)", width: 20 }} /> Target
                </span>
              </div>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 10, color: "rgba(148,163,184,0.4)", letterSpacing: "0.08em" }}>
              {range === "week" ? "MON – SUN" : range === "month" ? "WEEK 1 – 4" : "JAN – MAR 2026"}
            </p>
            <ProdChart data={DATA} labels={DATA.labels} />
          </div>

          {/* Focus Distribution */}
          <div style={{
            background: "rgba(15,23,42,0.7)", border: "1px solid rgba(56,189,248,0.14)",
            borderRadius: 14, padding: "20px 20px 12px", backdropFilter: "blur(8px)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", letterSpacing: "0.04em" }}>Focus distribution</span>
            <p style={{ margin: "2px 0 8px", fontSize: 10, color: "rgba(148,163,184,0.4)", letterSpacing: "0.08em" }}>SESSION BREAKDOWN</p>
            <div style={{ display: "flex", gap: 12, fontSize: 10, marginBottom: 8, flexWrap: "wrap" }}>
              {[["Deep work", "#38bdf8"], ["Light focus", "#fbbf24"], ["Distracted", "#f87171"]].map(([lbl, clr]) => (
                <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(148,163,184,0.6)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: clr, display: "inline-block" }} />
                  {lbl}
                </span>
              ))}
            </div>
            <FocusChart data={DATA} labels={DATA.labels} />
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Weak Concepts */}
          <div style={{
            background: "rgba(15,23,42,0.7)", border: "1px solid rgba(56,189,248,0.14)",
            borderRadius: 14, padding: 20, backdropFilter: "blur(8px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", letterSpacing: "0.04em" }}>Weak concepts</span>
              <span style={{
                fontSize: 10, color: "#f87171", background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.25)", borderRadius: 4, padding: "2px 8px", letterSpacing: "0.08em",
              }}>REVIEW NOW</span>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 10, color: "rgba(148,163,184,0.4)", letterSpacing: "0.08em" }}>
              SORTED BY MASTERY GAP — CLICK TO EXPAND
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CONCEPTS.map((c, i) => {
                const ts = tagStyle(c.tag);
                const isActive = activeConceptIdx === i;
                return (
                  <div key={c.name}
                    onClick={() => setActiveConceptIdx(isActive ? null : i)}
                    style={{
                      background: isActive ? "rgba(56,189,248,0.06)" : "rgba(30,41,59,0.5)",
                      border: `1px solid ${isActive ? "rgba(56,189,248,0.3)" : "rgba(56,189,248,0.08)"}`,
                      borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.1em",
                          background: ts.bg, color: ts.text, border: `1px solid ${ts.border}`,
                        }}>{c.tag.toUpperCase()}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{c.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: ts.text, fontWeight: 700 }}>{c.mastery}%</span>
                    </div>
                    <div style={{ background: "rgba(15,23,42,0.6)", borderRadius: 4, height: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${c.mastery}%`,
                        background: `linear-gradient(90deg,${ts.text},${ts.text}88)`,
                        borderRadius: 4, transition: "width 0.8s ease",
                      }} />
                    </div>
                    {isActive && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(56,189,248,0.1)" }}>
                        <p style={{ margin: "0 0 6px", fontSize: 11, color: "rgba(148,163,184,0.5)" }}>Subject: <span style={{ color: "#38bdf8" }}>{c.subject}</span></p>
                        <p style={{ margin: 0, fontSize: 11, color: "rgba(148,163,184,0.5)" }}>
                          Mastery gap: <span style={{ color: ts.text }}>{100 - c.mastery}%</span> — Recommended sessions: <span style={{ color: "#4ade80" }}>{Math.ceil((100 - c.mastery) / 10)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Heatmap */}
          <div style={{
            background: "rgba(15,23,42,0.7)", border: "1px solid rgba(56,189,248,0.14)",
            borderRadius: 14, padding: 20, backdropFilter: "blur(8px)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", letterSpacing: "0.04em" }}>Focus heatmap</span>
            <p style={{ margin: "2px 0 14px", fontSize: 10, color: "rgba(148,163,184,0.4)", letterSpacing: "0.08em" }}>
              INTENSITY BY HOUR · THIS WEEK
            </p>
            {/* Hours header */}
            <div style={{ display: "grid", gridTemplateColumns: "36px repeat(8,1fr)", gap: 3, marginBottom: 4 }}>
              <div />
              {HEAT_HOURS.map(h => (
                <div key={h} style={{ fontSize: 9, color: "rgba(148,163,184,0.4)", textAlign: "center" }}>{h}</div>
              ))}
            </div>
            {HEAT_DAYS.map((day, di) => (
              <div key={day} style={{ display: "grid", gridTemplateColumns: "36px repeat(8,1fr)", gap: 3, marginBottom: 3 }}>
                <div style={{ fontSize: 10, color: "rgba(148,163,184,0.5)", display: "flex", alignItems: "center" }}>{day}</div>
                {HEATMAP[di].map((v, hi) => (
                  <div key={hi} style={{
                    height: 20, borderRadius: 3,
                    background: heatColor(v),
                    border: "1px solid rgba(56,189,248,0.08)",
                    transition: "transform 0.15s",
                    cursor: "default",
                  }}
                    title={`${day} ${HEAT_HOURS[hi]}: Focus ${v}/5`}
                    onMouseOver={e => e.currentTarget.style.transform = "scale(1.15)"}
                    onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                  />
                ))}
              </div>
            ))}
            {/* Legend */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>Low</span>
              {[1,2,3,4,5].map(v => (
                <div key={v} style={{ width: 16, height: 16, borderRadius: 3, background: heatColor(v), border: "1px solid rgba(56,189,248,0.15)" }} />
              ))}
              <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>High</span>
            </div>

            {/* Mini session log */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(56,189,248,0.1)" }}>
              <p style={{ margin: "0 0 10px", fontSize: 10, color: "rgba(148,163,184,0.4)", letterSpacing: "0.1em" }}>RECENT SESSIONS</p>
              {[
                { time: "Today 10:00", name: "analyzeCode(session)", dur: "3h 20m", depth: "deep" },
                { time: "Yesterday 14:00", name: "buildKnowledgeGraph(nodes)", dur: "2h 10m", depth: "medium" },
                { time: "Mon 09:00", name: "detectCognitiveState()", dur: "1h 45m", depth: "light" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#38bdf8", fontFamily: "'JetBrains Mono',monospace" }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>{s.time}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#e2e8f0" }}>{s.dur}</div>
                    <div style={{ fontSize: 10, color: s.depth === "deep" ? "#2dd4bf" : s.depth === "medium" ? "#fbbf24" : "rgba(148,163,184,0.4)" }}>
                      {s.depth}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 10, color: "rgba(148,163,184,0.3)", letterSpacing: "0.12em" }}>
          CKC-OS KNOWLEDGE ENGINE · COGNITIVE ANALYTICS MODULE · v2.4.1
        </div>
      </div>
    </div>
  );
}