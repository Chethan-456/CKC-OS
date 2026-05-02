import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   CKC-OS · AUTH + SETTINGS MODULE
   Exports:
     - useAuth()          → read/write the global auth store
     - AuthProvider       → wrap your app root with this
     - SettingsPanel      → full settings UI (modal or page)
     - ProtectedRoute     → guards routes that need a session
     - authStore          → raw store (legacy compat with editor.jsx)
     - SettingsButton     → drop-in button for topbars
     - useSettings()      → convenience hook for open/close panel
   ═══════════════════════════════════════════════════════════════ */

// ─── Design tokens (matches CKC-OS dark system) ───────────────
const C = {
  bg:     "#080a0f",
  bg2:    "#0c0e15",
  bg3:    "#10131c",
  bg4:    "#151825",
  glass:  "rgba(255,255,255,.032)",
  rim:    "rgba(255,255,255,.06)",
  rim2:   "rgba(255,255,255,.1)",
  cyan:   "#00d4ff",
  green:  "#00ff9d",
  rose:   "#ff4d8d",
  amber:  "#ffb547",
  violet: "#a78bfa",
  red:    "#ff5555",
  text:   "#dde4f5",
  text2:  "#6b7a9e",
  text3:  "#343d54",
  mono:   "'JetBrains Mono', monospace",
  disp:   "'Syne', sans-serif",
  body:   "'DM Sans', sans-serif",
};

// ─── CSS ──────────────────────────────────────────────────────
const AUTH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=JetBrains+Mono:wght@400;500;600&display=swap');

*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,212,255,.2); border-radius: 2px; }

@keyframes settingsIn  { from { opacity:0; transform: translateY(12px) scale(.97); } to { opacity:1; transform: none; } }
@keyframes overlayIn   { from { opacity:0; } to { opacity:1; } }
@keyframes spin        { to { transform: rotate(360deg); } }
@keyframes toastIn     { from { opacity:0; transform: translateX(20px); } to { opacity:1; transform: none; } }
@keyframes toastOut    { from { opacity:1; transform: none; } to { opacity:0; transform: translateX(20px); } }

/* ── Settings overlay ── */
.ckc-settings-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(4,6,10,.85);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  animation: overlayIn .2s ease both;
}
.ckc-settings-panel {
  width: min(860px, 96vw);
  height: min(600px, 92vh);
  background: #0c0e15;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 18px;
  display: flex;
  overflow: hidden;
  animation: settingsIn .25s cubic-bezier(.22,1,.36,1) both;
  position: relative;
}

/* ── Sidebar nav ── */
.ckc-s-nav {
  width: 200px;
  flex-shrink: 0;
  background: #080a0f;
  border-right: 1px solid rgba(255,255,255,.05);
  display: flex;
  flex-direction: column;
  padding: 20px 0 16px;
  overflow-y: auto;
}
.ckc-s-nav-logo {
  display: flex; align-items: center; gap: 9px;
  padding: 0 18px 20px;
  border-bottom: 1px solid rgba(255,255,255,.05);
  margin-bottom: 12px;
}
.ckc-s-nav-logo-mark {
  width: 26px; height: 26px; border-radius: 7px;
  background: linear-gradient(135deg,#00d4ff,#00ff9d);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; flex-shrink: 0;
}
.ckc-s-nav-logo-text {
  font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800;
  background: linear-gradient(90deg,#00d4ff,#00ff9d);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.ckc-s-nav-section {
  font-size: 9px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: rgba(255,255,255,.2);
  padding: 10px 18px 5px;
}
.ckc-s-nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 18px; font-size: 12.5px; font-weight: 500;
  font-family: 'DM Sans', sans-serif;
  color: rgba(255,255,255,.38); cursor: pointer;
  border-left: 2px solid transparent;
  transition: all .15s;
}
.ckc-s-nav-item:hover { color: rgba(255,255,255,.7); background: rgba(255,255,255,.03); }
.ckc-s-nav-item.active {
  color: #00d4ff;
  background: rgba(0,212,255,.06);
  border-left-color: #00d4ff;
}
.ckc-s-nav-item .nav-icon { font-size: 13px; width: 16px; text-align: center; }

/* ── Content pane ── */
.ckc-s-content {
  flex: 1; overflow-y: auto; padding: 32px 36px;
  background: #0c0e15;
}
.ckc-s-header { margin-bottom: 28px; }
.ckc-s-title {
  font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800;
  color: #dde4f5; margin-bottom: 4px; letter-spacing: -.02em;
}
.ckc-s-desc { font-size: 12.5px; color: rgba(255,255,255,.35); }

/* ── Close button ── */
.ckc-s-close {
  position: absolute; top: 16px; right: 16px;
  width: 28px; height: 28px; border-radius: 7px;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08);
  color: rgba(255,255,255,.4); cursor: pointer; display: flex;
  align-items: center; justify-content: center; font-size: 14px;
  font-family: 'DM Sans', sans-serif; transition: all .15s;
}
.ckc-s-close:hover { background: rgba(255,75,75,.12); border-color: rgba(255,75,75,.3); color: #ff5555; }

/* ── Section label ── */
.ckc-s-section-label {
  font-size: 9px; font-weight: 700; letter-spacing: .1em;
  text-transform: uppercase; color: rgba(255,255,255,.25);
  margin: 24px 0 12px;
}
.ckc-s-section-label:first-child { margin-top: 0; }

/* ── Row ── */
.ckc-s-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 13px 0; border-bottom: 1px solid rgba(255,255,255,.04);
  gap: 16px;
}
.ckc-s-row:last-child { border-bottom: none; }
.ckc-s-row-left { flex: 1; min-width: 0; }
.ckc-s-row-label { font-size: 13px; color: #dde4f5; font-weight: 500; }
.ckc-s-row-desc  { font-size: 11.5px; color: rgba(255,255,255,.3); margin-top: 2px; }

/* ── Form controls ── */
.ckc-select {
  font-size: 12px; padding: 6px 10px; min-width: 140px;
  border-radius: 8px; border: 1px solid rgba(255,255,255,.1);
  background: #10131c; color: #dde4f5;
  font-family: 'DM Sans', sans-serif; cursor: pointer; outline: none;
  transition: border-color .15s;
}
.ckc-select:hover { border-color: rgba(0,212,255,.4); }
.ckc-select:focus { border-color: #00d4ff; }

.ckc-input {
  font-size: 12.5px; padding: 7px 12px; width: 180px;
  border-radius: 8px; border: 1px solid rgba(255,255,255,.1);
  background: #10131c; color: #dde4f5;
  font-family: 'DM Sans', sans-serif; outline: none; transition: border-color .15s;
}
.ckc-input:hover { border-color: rgba(0,212,255,.3); }
.ckc-input:focus { border-color: #00d4ff; }

/* ── Toggle ── */
.ckc-toggle { position: relative; width: 38px; height: 22px; flex-shrink: 0; }
.ckc-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.ckc-toggle-track {
  position: absolute; inset: 0; border-radius: 11px;
  background: rgba(255,255,255,.1); cursor: pointer; transition: background .2s;
}
.ckc-toggle input:checked + .ckc-toggle-track { background: linear-gradient(90deg,#00d4ff,#00ff9d); }
.ckc-toggle-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff; transition: transform .2s; pointer-events: none;
}
.ckc-toggle input:checked ~ .ckc-toggle-thumb { transform: translateX(16px); }

/* ── Color swatches ── */
.ckc-swatches { display: flex; gap: 7px; align-items: center; }
.ckc-swatch {
  width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
  border: 2px solid transparent; transition: transform .12s, border-color .12s;
}
.ckc-swatch.active { border-color: #fff; transform: scale(1.18); }

/* ── Pill buttons ── */
.ckc-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.ckc-pill {
  font-size: 11.5px; padding: 5px 13px; border-radius: 100px;
  border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.4);
  background: transparent; cursor: pointer; font-family: 'DM Sans', sans-serif;
  font-weight: 500; transition: all .15s;
}
.ckc-pill:hover { border-color: rgba(255,255,255,.2); color: rgba(255,255,255,.7); }
.ckc-pill.active {
  background: rgba(0,212,255,.12); color: #00d4ff;
  border-color: rgba(0,212,255,.4);
}

/* ── Avatar row ── */
.ckc-avatar-card {
  display: flex; align-items: center; gap: 14px;
  padding: 16px; margin-bottom: 20px;
  background: rgba(255,255,255,.02);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 12px;
}
.ckc-avatar {
  width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 800;
  flex-shrink: 0; border: 2px solid;
}
.ckc-avatar-info-name { font-size: 14px; font-weight: 600; color: #dde4f5; }
.ckc-avatar-info-sid  { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: rgba(255,255,255,.3); margin-top: 3px; }
.ckc-status-dot {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; color: #00ff9d; margin-top: 6px;
}
.ckc-status-dot::before {
  content: ''; width: 6px; height: 6px; border-radius: 50%;
  background: #00ff9d;
  box-shadow: 0 0 6px #00ff9d;
  animation: statusPulse 2s ease-in-out infinite;
}
@keyframes statusPulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

/* ── Stat chips ── */
.ckc-stats-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.ckc-stat-chip {
  flex: 1; min-width: 90px;
  padding: 12px; border-radius: 10px;
  background: rgba(255,255,255,.025);
  border: 1px solid rgba(255,255,255,.06);
}
.ckc-stat-val { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #dde4f5; }
.ckc-stat-lbl { font-size: 10px; color: rgba(255,255,255,.3); margin-top: 3px; text-transform: uppercase; letter-spacing: .06em; }

/* ── Keybind row ── */
.ckc-kbd {
  font-size: 11px; font-family: 'JetBrains Mono', monospace;
  padding: 3px 8px; border-radius: 5px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  color: rgba(255,255,255,.6);
  white-space: nowrap;
}

/* ── Danger zone ── */
.ckc-danger-card {
  border: 1px solid rgba(255,75,75,.2);
  border-radius: 12px; overflow: hidden;
}
.ckc-danger-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; gap: 16px;
  border-bottom: 1px solid rgba(255,255,255,.04);
}
.ckc-danger-row:last-child { border-bottom: none; }
.ckc-btn-danger {
  font-size: 11.5px; padding: 6px 14px; border-radius: 7px;
  border: 1px solid rgba(255,75,75,.35); color: #ff5555;
  background: transparent; cursor: pointer; font-family: 'DM Sans', sans-serif;
  font-weight: 600; white-space: nowrap; transition: all .15s;
}
.ckc-btn-danger:hover { background: rgba(255,75,75,.1); }
.ckc-btn-danger.filled { background: rgba(255,75,75,.15); }

/* ── Toast ── */
.ckc-toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  background: #10131c; border: 1px solid rgba(0,212,255,.3);
  border-radius: 10px; padding: 10px 16px;
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; color: #dde4f5; font-family: 'DM Sans', sans-serif;
  animation: toastIn .25s ease both;
  box-shadow: 0 8px 32px rgba(0,0,0,.5);
}
.ckc-toast.exit { animation: toastOut .2s ease both; }
.ckc-toast-dot { width: 7px; height: 7px; border-radius: 50%; background: #00ff9d; flex-shrink: 0; }

/* ── Protected page ── */
.ckc-protected {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: #080a0f; font-family: 'DM Sans', sans-serif;
  flex-direction: column; gap: 16px;
}
.ckc-protected-title {
  font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
  color: #dde4f5; letter-spacing: -.02em;
}
.ckc-protected-desc { font-size: 13px; color: rgba(255,255,255,.35); }
.ckc-btn-primary {
  margin-top: 8px; padding: 10px 28px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, #00d4ff, #00ff9d);
  color: #080a0f; font-size: 13px; font-weight: 700;
  font-family: 'Syne', sans-serif; cursor: pointer; transition: opacity .15s;
}
.ckc-btn-primary:hover { opacity: .88; }

/* ── Settings trigger button (for topbar) ── */
.ckc-settings-btn {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px; padding: 5px 11px; color: rgba(255,255,255,.4);
  font-size: 11px; font-weight: 600; cursor: pointer;
  font-family: 'DM Sans', sans-serif; transition: all .15s;
}
.ckc-settings-btn:hover { border-color: rgba(0,212,255,.4); color: #00d4ff; background: rgba(0,212,255,.06); }
`;

// ─── Default preferences ──────────────────────────────────────
const DEFAULT_PREFS = {
  editor: {
    tabSize: "2",
    fontSize: "14",
    wordWrap: false,
    vim: false,
    autoClose: true,
    showBehavior: true,
    lineNumbers: true,
  },
  appearance: {
    accent: "#00d4ff",
    density: "comfortable",
    reduceMotion: false,
    scanlines: true,
  },
  ai: {
    skillLevel: "auto",
    proactiveTips: true,
    alwaysShowBigO: false,
    model: "llama-3.3-70b-versatile",
  },
  keybindings: {
    openAI: "⌘K",
    toggleSidebar: "⌘\\",
    runCode: "⇧⌘R",
    openSettings: "⌘,",
  },
};

const CURSOR_COLORS = [
  { hex: "#00d4ff", label: "Cyan"   },
  { hex: "#00ff9d", label: "Green"  },
  { hex: "#ff4d8d", label: "Rose"   },
  { hex: "#ffb547", label: "Amber"  },
  { hex: "#a78bfa", label: "Violet" },
  { hex: "#f472b6", label: "Pink"   },
];

const LANG_OPTIONS = [
  "JavaScript","TypeScript","Python","Rust","Go","Java","C/C++","SQL",
];

// ─── Persistent store helpers ─────────────────────────────────
const STORE_KEY  = "ckc_s";
const PREFS_KEY  = "ckc_prefs";
const STATS_KEY  = "ckc_stats";

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || "null"); }
  catch { return null; }
}
function saveSession(v) {
  sessionStorage.setItem(STORE_KEY, JSON.stringify(v));
}
function clearSession() {
  sessionStorage.removeItem(STORE_KEY);
}
function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return deepMerge(DEFAULT_PREFS, JSON.parse(raw));
  } catch { return DEFAULT_PREFS; }
}
function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY) || "null") || { sessions: 0, totalKeys: 0, topLang: "—" }; }
  catch { return { sessions: 0, totalKeys: 0, topLang: "—" }; }
}
function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}
function deepMerge(defaults, overrides) {
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    if (overrides[key] && typeof overrides[key] === "object" && !Array.isArray(overrides[key])) {
      result[key] = deepMerge(defaults[key] || {}, overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

// ─── Legacy authStore shim (compat with editor.jsx + index.jsx) ──
export const authStore = {
  get:   loadSession,
  set:   saveSession,
  clear: clearSession,
};

// ─── Auth Context ─────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState]   = useState(() => loadSession());
  const [prefs, setPrefsState] = useState(() => loadPrefs());
  const [stats, setStatsState] = useState(() => loadStats());

  useEffect(() => {
    if (user) saveSession(user);
    else clearSession();
  }, [user]);

  useEffect(() => { savePrefs(prefs); }, [prefs]);
  useEffect(() => { saveStats(stats); }, [stats]);

  const login = useCallback((userData) => {
    const session = { ...userData, loginTime: Date.now() };
    setUserState(session);
    setStatsState(prev => ({ ...prev, sessions: (prev.sessions || 0) + 1 }));
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    clearSession();
  }, []);

  const updateUser = useCallback((patch) => {
    setUserState(prev => prev ? { ...prev, ...patch } : prev);
  }, []);

  const updatePref = useCallback((section, key, value) => {
    setPrefsState(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }, []);

  const updateStats = useCallback((patch) => {
    setStatsState(prev => ({ ...prev, ...patch }));
  }, []);

  const resetPrefs = useCallback(() => {
    setPrefsState(DEFAULT_PREFS);
    savePrefs(DEFAULT_PREFS);
  }, []);

  const value = { user, prefs, stats, login, logout, updateUser, updatePref, updateStats, resetPrefs };

  return (
    <AuthContext.Provider value={value}>
      <style>{AUTH_CSS}</style>
      {children}
    </AuthContext.Provider>
  );
}

// ─── useAuth hook ─────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ─── ProtectedRoute ───────────────────────────────────────────
// router-safe: uses dynamic import of useNavigate so it works
// both inside and outside a RouterProvider context
export function ProtectedRoute({ children, fallback }) {
  const { user } = useAuth();

  // Try to get navigate — if no router context, fall back gracefully
  let navigate = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useNavigate } = require("react-router-dom");
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigate = useNavigate();
  } catch {
    navigate = null;
  }

  if (user) return children;
  return (
    <div className="ckc-protected">
      <div style={{ fontSize: 32 }}>🔐</div>
      <div className="ckc-protected-title">Session required</div>
      <div className="ckc-protected-desc">You need an active CKC-OS session to access this page.</div>
      {fallback || (
        <button
          className="ckc-btn-primary"
          onClick={() => navigate ? navigate("/") : (window.location.href = "/")}
        >
          Go to login →
        </button>
      )}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2200);
    const t2 = setTimeout(onDone, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div className={`ckc-toast${exiting ? " exit" : ""}`}>
      <div className="ckc-toast-dot" />
      {message}
    </div>
  );
}

// ─── Toggle component ─────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <label className="ckc-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <div className="ckc-toggle-track" />
      <div className="ckc-toggle-thumb" />
    </label>
  );
}

// ─── Settings trigger button (for use in topbars) ────────────
export function SettingsButton({ onClick }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <button className="ckc-settings-btn" onClick={onClick}>
      ⚙ Settings
    </button>
  );
}

// ─── SettingsPanel ────────────────────────────────────────────
export function SettingsPanel({ onClose }) {
  const { user, prefs, stats, updateUser, updatePref, resetPrefs, logout } = useAuth();
  const [tab, setTab]     = useState("profile");
  const [toast, setToast] = useState(null);
  const overlayRef        = useRef();

  const notify = (msg) => setToast({ msg, id: Date.now() });

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleLogout = () => {
    logout();
    onClose?.();
    // Navigate without router dependency — works with or without react-router
    window.location.href = "/";
  };

  const handleResetPrefs = () => {
    resetPrefs();
    notify("All preferences reset to defaults");
  };

  if (!user) return null;

  const initials = user.name
    ? user.name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "DE";

  const accentColor = user.cursorColor || prefs.appearance?.accent || "#00d4ff";

  const NAV = [
    { section: "Account" },
    { id: "profile",     label: "Profile",       icon: "👤" },
    { id: "session",     label: "Session",        icon: "🔑" },
    { section: "Workspace" },
    { id: "editor",      label: "Editor",         icon: "📝" },
    { id: "appearance",  label: "Appearance",     icon: "🎨" },
    { id: "keybindings", label: "Keybindings",    icon: "⌨️" },
    { section: "AI" },
    { id: "ai",          label: "AI assistant",   icon: "🤖" },
    { section: "System" },
    { id: "danger",      label: "Danger zone",    icon: "⚠️" },
  ];

  return (
    <>
      <div className="ckc-settings-overlay" ref={overlayRef} onClick={handleOverlayClick}>
        <div className="ckc-settings-panel">

          {/* ── Sidebar ── */}
          <nav className="ckc-s-nav">
            <div className="ckc-s-nav-logo">
              <div className="ckc-s-nav-logo-mark">⚡</div>
              <span className="ckc-s-nav-logo-text">CKC-OS</span>
            </div>
            {NAV.map((item, i) =>
              item.section ? (
                <div key={i} className="ckc-s-nav-section">{item.section}</div>
              ) : (
                <div
                  key={item.id}
                  className={`ckc-s-nav-item${tab === item.id ? " active" : ""}`}
                  onClick={() => setTab(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </div>
              )
            )}
          </nav>

          {/* ── Content ── */}
          <div className="ckc-s-content">
            <button className="ckc-s-close" onClick={onClose}>✕</button>

            {/* ══ PROFILE ══ */}
            {tab === "profile" && (
              <>
                <div className="ckc-s-header">
                  <div className="ckc-s-title">Profile</div>
                  <div className="ckc-s-desc">Your identity across all CKC-OS modules</div>
                </div>

                <div className="ckc-avatar-card">
                  <div
                    className="ckc-avatar"
                    style={{ background: accentColor + "22", borderColor: accentColor + "66", color: accentColor }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div className="ckc-avatar-info-name">{user.name || "Developer"}</div>
                    <div className="ckc-avatar-info-sid">sid: {user.sid || "—"}</div>
                    <div className="ckc-status-dot">active session</div>
                  </div>
                </div>

                <div className="ckc-stats-row">
                  {[
                    ["Sessions",   stats.sessions  || 0,   ""],
                    ["Total keys", stats.totalKeys || 0,   ""],
                    ["Top lang",   stats.topLang   || "—", ""],
                    ["WPM best",   stats.wpmBest   || "—", ""],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="ckc-stat-chip">
                      <div className="ckc-stat-val">{val}</div>
                      <div className="ckc-stat-lbl">{lbl}</div>
                    </div>
                  ))}
                </div>

                <div className="ckc-s-section-label">Identity</div>

                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">Display name</div>
                    <div className="ckc-s-row-desc">Shown in editor and AI chat</div>
                  </div>
                  <input
                    className="ckc-input"
                    value={user.name || ""}
                    onChange={e => updateUser({ name: e.target.value })}
                    onBlur={() => notify("Name updated")}
                    placeholder="Your name…"
                    maxLength={22}
                  />
                </div>

                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">Cursor color</div>
                    <div className="ckc-s-row-desc">Shown to collaborators in editor</div>
                  </div>
                  <div className="ckc-swatches">
                    {CURSOR_COLORS.map(c => (
                      <div
                        key={c.hex}
                        className={`ckc-swatch${(user.cursorColor || "#00d4ff") === c.hex ? " active" : ""}`}
                        style={{ background: c.hex }}
                        title={c.label}
                        onClick={() => { updateUser({ cursorColor: c.hex }); notify(`Cursor color: ${c.label}`); }}
                      />
                    ))}
                  </div>
                </div>

                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">Preferred language</div>
                    <div className="ckc-s-row-desc">Default language on new sessions</div>
                  </div>
                  <select
                    className="ckc-select"
                    value={user.lang || "JavaScript"}
                    onChange={e => { updateUser({ lang: e.target.value }); notify("Language updated"); }}
                  >
                    {LANG_OPTIONS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* ══ SESSION ══ */}
            {tab === "session" && (
              <>
                <div className="ckc-s-header">
                  <div className="ckc-s-title">Session</div>
                  <div className="ckc-s-desc">Manage your active session and access</div>
                </div>

                <div className="ckc-s-section-label">Current session</div>

                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">Session ID</div>
                    <div className="ckc-s-row-desc">Share this to collaborate in editor</div>
                  </div>
                  <span
                    style={{ fontFamily: C.mono, fontSize: 11, color: C.cyan,
                      background: "rgba(0,212,255,.08)", padding: "5px 12px",
                      borderRadius: 7, border: "1px solid rgba(0,212,255,.2)", cursor: "pointer" }}
                    title="Click to copy"
                    onClick={() => { navigator.clipboard?.writeText(user.sid || ""); notify("Session ID copied!"); }}
                  >
                    {user.sid || "no-session"}
                  </span>
                </div>

                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">Auto-rejoin on refresh</div>
                    <div className="ckc-s-row-desc">Re-enters your last session automatically</div>
                  </div>
                  <Toggle
                    checked={prefs.editor?.autoRejoin ?? true}
                    onChange={v => { updatePref("editor", "autoRejoin", v); notify(v ? "Auto-rejoin on" : "Auto-rejoin off"); }}
                  />
                </div>

                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">Session timeout</div>
                    <div className="ckc-s-row-desc">Idle time before auto-logout</div>
                  </div>
                  <select
                    className="ckc-select"
                    value={prefs.editor?.sessionTimeout || "60"}
                    onChange={e => { updatePref("editor", "sessionTimeout", e.target.value); notify("Timeout updated"); }}
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="240">4 hours</option>
                    <option value="0">Never</option>
                  </select>
                </div>

                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">Login time</div>
                  </div>
                  <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text2 }}>
                    {user.loginTime ? new Date(user.loginTime).toLocaleTimeString() : "—"}
                  </span>
                </div>
              </>
            )}

            {/* ══ EDITOR ══ */}
            {tab === "editor" && (
              <>
                <div className="ckc-s-header">
                  <div className="ckc-s-title">Editor</div>
                  <div className="ckc-s-desc">Code editor preferences applied across all modules</div>
                </div>

                <div className="ckc-s-section-label">Formatting</div>
                {[
                  ["Tab size",  "tabSize",  ["2 spaces","4 spaces","Tab"], ["2","4","tab"]],
                  ["Font size", "fontSize", ["12px","14px","16px","18px"], ["12","14","16","18"]],
                ].map(([label, key, opts, vals]) => (
                  <div key={key} className="ckc-s-row">
                    <div className="ckc-s-row-left">
                      <div className="ckc-s-row-label">{label}</div>
                    </div>
                    <select
                      className="ckc-select"
                      value={prefs.editor?.[key] || vals[0]}
                      onChange={e => { updatePref("editor", key, e.target.value); notify(`${label} updated`); }}
                    >
                      {opts.map((o, i) => <option key={o} value={vals[i]}>{o}</option>)}
                    </select>
                  </div>
                ))}

                <div className="ckc-s-section-label">Behaviour</div>
                {[
                  ["Word wrap",           "wordWrap",     "Wrap long lines"],
                  ["Vim keybindings",     "vim",          "Enable Vim mode in CodeMirror"],
                  ["Auto-close brackets", "autoClose",    "Auto-pair (), [], {}"],
                  ["Line numbers",        "lineNumbers",  "Show line numbers in gutter"],
                  ["Show behavior HUD",   "showBehavior", "WPM, error rate overlay"],
                ].map(([label, key, desc]) => (
                  <div key={key} className="ckc-s-row">
                    <div className="ckc-s-row-left">
                      <div className="ckc-s-row-label">{label}</div>
                      <div className="ckc-s-row-desc">{desc}</div>
                    </div>
                    <Toggle
                      checked={prefs.editor?.[key] ?? DEFAULT_PREFS.editor[key]}
                      onChange={v => { updatePref("editor", key, v); notify(`${label}: ${v ? "on" : "off"}`); }}
                    />
                  </div>
                ))}
              </>
            )}

            {/* ══ APPEARANCE ══ */}
            {tab === "appearance" && (
              <>
                <div className="ckc-s-header">
                  <div className="ckc-s-title">Appearance</div>
                  <div className="ckc-s-desc">Visual style across all CKC-OS modules</div>
                </div>

                <div className="ckc-s-section-label">Theme</div>

                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">Accent color</div>
                    <div className="ckc-s-row-desc">Highlights, active states, glow effects</div>
                  </div>
                  <div className="ckc-swatches">
                    {CURSOR_COLORS.map(c => (
                      <div
                        key={c.hex}
                        className={`ckc-swatch${(prefs.appearance?.accent || "#00d4ff") === c.hex ? " active" : ""}`}
                        style={{ background: c.hex }}
                        title={c.label}
                        onClick={() => { updatePref("appearance", "accent", c.hex); notify(`Accent: ${c.label}`); }}
                      />
                    ))}
                  </div>
                </div>

                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">UI density</div>
                    <div className="ckc-s-row-desc">Spacing between elements</div>
                  </div>
                  <select
                    className="ckc-select"
                    value={prefs.appearance?.density || "comfortable"}
                    onChange={e => { updatePref("appearance", "density", e.target.value); notify("Density updated"); }}
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </div>

                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">Reduce motion</div>
                    <div className="ckc-s-row-desc">Disables animations and transitions</div>
                  </div>
                  <Toggle
                    checked={prefs.appearance?.reduceMotion ?? false}
                    onChange={v => { updatePref("appearance", "reduceMotion", v); notify(`Reduce motion: ${v ? "on" : "off"}`); }}
                  />
                </div>

                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">Scanline texture</div>
                    <div className="ckc-s-row-desc">Subtle CRT effect over the UI</div>
                  </div>
                  <Toggle
                    checked={prefs.appearance?.scanlines ?? true}
                    onChange={v => { updatePref("appearance", "scanlines", v); notify(`Scanlines: ${v ? "on" : "off"}`); }}
                  />
                </div>
              </>
            )}

            {/* ══ KEYBINDINGS ══ */}
            {tab === "keybindings" && (
              <>
                <div className="ckc-s-header">
                  <div className="ckc-s-title">Keybindings</div>
                  <div className="ckc-s-desc">Global shortcuts across CKC-OS</div>
                </div>

                <div className="ckc-s-section-label">Global</div>
                {[
                  ["Open AI assistant",  "openAI",        "⌘K"],
                  ["Toggle sidebar",     "toggleSidebar", "⌘\\"],
                  ["Run code",           "runCode",        "⇧⌘R"],
                  ["Open settings",      "openSettings",   "⌘,"],
                  ["New session",        "newSession",     "⇧⌘N"],
                  ["Copy response",      "copyResponse",   "⇧⌘C"],
                ].map(([label, key, defaultKbd]) => (
                  <div key={key} className="ckc-s-row">
                    <div className="ckc-s-row-left">
                      <div className="ckc-s-row-label">{label}</div>
                    </div>
                    <span className="ckc-kbd">
                      {prefs.keybindings?.[key] || defaultKbd}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 16, fontSize: 11.5, color: "rgba(255,255,255,.2)", fontStyle: "italic" }}>
                  Custom keybind editor coming soon
                </div>
              </>
            )}

            {/* ══ AI ASSISTANT ══ */}
            {tab === "ai" && (
              <>
                <div className="ckc-s-header">
                  <div className="ckc-s-title">AI assistant</div>
                  <div className="ckc-s-desc">Forge behaviour and model settings</div>
                </div>

                <div className="ckc-s-section-label">Skill level</div>
                <div className="ckc-s-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                  <div className="ckc-pills">
                    {[
                      ["auto",         "Auto-detect"],
                      ["beginner",     "Beginner"],
                      ["intermediate", "Intermediate"],
                      ["advanced",     "Advanced"],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        className={`ckc-pill${(prefs.ai?.skillLevel || "auto") === val ? " active" : ""}`}
                        onClick={() => { updatePref("ai", "skillLevel", val); notify(`Skill level: ${label}`); }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.25)" }}>
                    Auto-detect analyses message history and adapts tone dynamically
                  </div>
                </div>

                <div className="ckc-s-section-label">Behaviour</div>
                {[
                  ["Proactive tips",       "proactiveTips",  "Show usage tips between messages"],
                  ["Always show Big-O",    "alwaysShowBigO", "Include complexity in every code response"],
                  ["Code review on paste", "reviewOnPaste",  "Auto-analyse code when you paste it"],
                  ["Explain errors",       "explainErrors",  "Interpret lint errors in plain English"],
                ].map(([label, key, desc]) => (
                  <div key={key} className="ckc-s-row">
                    <div className="ckc-s-row-left">
                      <div className="ckc-s-row-label">{label}</div>
                      <div className="ckc-s-row-desc">{desc}</div>
                    </div>
                    <Toggle
                      checked={prefs.ai?.[key] ?? DEFAULT_PREFS.ai[key] ?? false}
                      onChange={v => { updatePref("ai", key, v); notify(`${label}: ${v ? "on" : "off"}`); }}
                    />
                  </div>
                ))}

                <div className="ckc-s-section-label">Model</div>
                <div className="ckc-s-row">
                  <div className="ckc-s-row-left">
                    <div className="ckc-s-row-label">Groq model</div>
                    <div className="ckc-s-row-desc">Used by Forge for all responses</div>
                  </div>
                  <select
                    className="ckc-select"
                    value={prefs.ai?.model || "llama-3.3-70b-versatile"}
                    onChange={e => { updatePref("ai", "model", e.target.value); notify("Model updated"); }}
                  >
                    <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B · Groq</option>
                    <option value="llama-3.1-8b-instant">LLaMA 3.1 8B · Fast</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B · Groq</option>
                  </select>
                </div>
              </>
            )}

            {/* ══ DANGER ZONE ══ */}
            {tab === "danger" && (
              <>
                <div className="ckc-s-header">
                  <div className="ckc-s-title">Danger zone</div>
                  <div className="ckc-s-desc">Irreversible actions — proceed carefully</div>
                </div>

                <div className="ckc-danger-card">
                  <div className="ckc-danger-row">
                    <div>
                      <div className="ckc-s-row-label">Clear AI chat history</div>
                      <div className="ckc-s-row-desc">Removes all Forge messages from this session</div>
                    </div>
                    <button className="ckc-btn-danger" onClick={() => {
                      sessionStorage.removeItem("ckc_forge_history");
                      notify("Chat history cleared");
                    }}>
                      Clear history
                    </button>
                  </div>

                  <div className="ckc-danger-row">
                    <div>
                      <div className="ckc-s-row-label">Clear activity stats</div>
                      <div className="ckc-s-row-desc">Resets sessions, WPM and keystrokes counters</div>
                    </div>
                    <button className="ckc-btn-danger" onClick={() => {
                      localStorage.removeItem(STATS_KEY);
                      notify("Stats cleared");
                    }}>
                      Clear stats
                    </button>
                  </div>

                  <div className="ckc-danger-row">
                    <div>
                      <div className="ckc-s-row-label">Reset all settings</div>
                      <div className="ckc-s-row-desc">Restore all preferences to factory defaults</div>
                    </div>
                    <button className="ckc-btn-danger" onClick={handleResetPrefs}>
                      Reset settings
                    </button>
                  </div>

                  <div className="ckc-danger-row">
                    <div>
                      <div className="ckc-s-row-label">End session</div>
                      <div className="ckc-s-row-desc">Logout and clear all session data</div>
                    </div>
                    <button className="ckc-btn-danger filled" onClick={handleLogout}>
                      End session
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <Toast key={toast.id} message={toast.msg} onDone={() => setToast(null)} />
      )}
    </>
  );
}

// ─── useSettings convenience hook ────────────────────────────
export function useSettings() {
  const [open, setOpen] = useState(false);
  const openSettings  = useCallback(() => setOpen(true),  []);
  const closeSettings = useCallback(() => setOpen(false), []);

  const panel = open
    ? <SettingsPanel onClose={closeSettings} />
    : null;

  return { open, openSettings, closeSettings, panel };
}

// ─── Default export ───────────────────────────────────────────
export default function AuthSettingsModule() {
  const { user } = useAuth();
  const { open, openSettings, panel } = useSettings();

  return (
    <div style={{ padding: 24, fontFamily: C.body, color: C.text }}>
      <style>{AUTH_CSS}</style>
      <p style={{ marginBottom: 12, fontSize: 13, color: C.text2 }}>
        Auth module loaded. User: <strong style={{ color: C.cyan }}>{user?.name || "not logged in"}</strong>
      </p>
      <button className="ckc-settings-btn" onClick={openSettings}>
        ⚙ Open Settings
      </button>
      {panel}
    </div>
  );
}