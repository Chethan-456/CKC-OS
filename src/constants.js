/* ═══════════════════════════════════════════════════════════════
   CKC-OS · SHARED CONSTANTS & HELPERS
   Extracting these from editor.jsx to prevent circular dependencies.
═══════════════════════════════════════════════════════════════ */

export const authStore = {
  get: () => { try { return JSON.parse(sessionStorage.getItem("ckc_s") || "null"); } catch { return null; } },
  set: (v) => sessionStorage.setItem("ckc_s", JSON.stringify(v)),
  clear: () => sessionStorage.removeItem("ckc_s"),
};

export function initials(n) {
  return (n || "?").split(" ").map(w => w[0] || "").join("").toUpperCase().slice(0, 2) || "?";
}

export function genSid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const PALETTE = [
  { hex: "#4FC1FF", bg: "rgba(79,193,255,.22)" }, { hex: "#FF6B9D", bg: "rgba(255,107,157,.22)" },
  { hex: "#4EC9B0", bg: "rgba(78,201,176,.22)" }, { hex: "#CE9178", bg: "rgba(206,145,120,.22)" },
  { hex: "#DCDCAA", bg: "rgba(220,220,170,.22)" }, { hex: "#C586C0", bg: "rgba(197,134,192,.22)" },
];

export const LANGS = {
  ts: { n: "TypeScript", ext: "engine.ts", ic: "TS", c: "#4FC1FF", bg: "rgba(79,193,255,.15)" },
  js: { n: "JavaScript", ext: "server.js", ic: "JS", c: "#f7df1e", bg: "rgba(247,223,30,.13)" },
  py: { n: "Python", ext: "model.py", ic: "PY", c: "#4EC9B0", bg: "rgba(78,201,176,.15)" },
  java: { n: "Java", ext: "Main.java", ic: "JV", c: "#ed8b00", bg: "rgba(237,139,0,.15)" },
  cpp: { n: "C++", ext: "main.cpp", ic: "C+", c: "#9CDCFE", bg: "rgba(156,220,254,.15)" },
  rs: { n: "Rust", ext: "main.rs", ic: "RS", c: "#CE9178", bg: "rgba(206,145,120,.15)" },
  go: { n: "Go", ext: "main.go", ic: "GO", c: "#00acd7", bg: "rgba(0,172,215,.15)" },
  sql: { n: "SQL", ext: "schema.sql", ic: "SQ", c: "#DCDCAA", bg: "rgba(220,220,170,.15)" },
};

export const LK = ["ts", "js", "py", "java", "cpp", "rs", "go", "sql"];
