/* ═══════════════════════════════════════════════════════════════
   editorUtils.js  —  CKC-OS shared utilities
═══════════════════════════════════════════════════════════════ */

/* ── Auth store (simple in-memory singleton) ── */
let _authData = null;
export const authStore = {
  get: ()      => _authData,
  set: (data)  => { _authData = data; },
  clear: ()    => { _authData = null; },
};

/* ── Cursor colour palette ── */
export const PALETTE = [
  { hex: "#4FC1FF", bg: "rgba(79,193,255,.18)"  },
  { hex: "#4EC9B0", bg: "rgba(78,201,176,.18)"  },
  { hex: "#FF6B9D", bg: "rgba(255,107,157,.18)" },
  { hex: "#FFB547", bg: "rgba(255,181,71,.18)"  },
  { hex: "#A78BFA", bg: "rgba(167,139,250,.18)" },
  { hex: "#7c83ff", bg: "rgba(124,131,255,.18)" },
  { hex: "#f87171", bg: "rgba(248,113,113,.18)" },
  { hex: "#34d399", bg: "rgba(52,211,153,.18)"  },
];

/* ── Language definitions ── */
export const LANGS = {
  ts:   { n: "TypeScript", ext: ".ts",   ic: "TS",  c: "#4FC1FF", bg: "rgba(79,193,255,.12)"  },
  js:   { n: "JavaScript", ext: ".js",   ic: "JS",  c: "#FFB547", bg: "rgba(255,181,71,.12)"  },
  py:   { n: "Python",     ext: ".py",   ic: "PY",  c: "#4EC9B0", bg: "rgba(78,201,176,.12)"  },
  java: { n: "Java",       ext: ".java", ic: "JV",  c: "#FF6B9D", bg: "rgba(255,107,157,.12)" },
  cpp:  { n: "C++",        ext: ".cpp",  ic: "C+",  c: "#A78BFA", bg: "rgba(167,139,250,.12)" },
  rs:   { n: "Rust",       ext: ".rs",   ic: "RS",  c: "#FFB547", bg: "rgba(255,181,71,.12)"  },
  go:   { n: "Go",         ext: ".go",   ic: "GO",  c: "#4FC1FF", bg: "rgba(79,193,255,.12)"  },
  sql:  { n: "SQL",        ext: ".sql",  ic: "SQ",  c: "#4EC9B0", bg: "rgba(78,201,176,.12)"  },
};

/* ── LK: ordered array of language keys (must be an array!) ── */
export const LK = ["ts", "js", "py", "java", "cpp", "rs", "go", "sql"];

/* ── Helpers ── */
export const initials = (name = "") =>
  name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "??";

export const genSid = () =>
  "ckc-" + Math.random().toString(36).slice(2, 7).toUpperCase();