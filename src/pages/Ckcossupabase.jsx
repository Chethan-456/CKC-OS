import { useState, useRef, useCallback, useEffect, forwardRef } from "react";

// ═══════════════════════════════════════════════════════════
// ⚠️  PASTE YOUR SUPABASE CREDENTIALS HERE
// ═══════════════════════════════════════════════════════════
const SUPABASE_URL = "https://ejedxeonttqvgcicawkw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWR4ZW9udHRxdmdjaWNhd2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MzI4MTgsImV4cCI6MjA5MjQwODgxOH0.ZUWuWZ13J7TxR_a6vx7NAV20mXw00dHyzC82cJGNjDk";

// ═══════════ SUPABASE CLIENT (no npm needed) ═══════════
let _sb = null;
async function getSB() {
  if (_sb) return _sb;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 40 } },
  });
  return _sb;
}

// ═══════════ CONSTANTS ═══════════
export const PALETTE = [
  { hex: "#4FC1FF", bg: "rgba(79,193,255,.22)", label: "Cyan" },
  { hex: "#FF6B9D", bg: "rgba(255,107,157,.22)", label: "Pink" },
  { hex: "#4EC9B0", bg: "rgba(78,201,176,.22)", label: "Teal" },
  { hex: "#CE9178", bg: "rgba(206,145,120,.22)", label: "Rust" },
  { hex: "#DCDCAA", bg: "rgba(220,220,170,.22)", label: "Gold" },
  { hex: "#C586C0", bg: "rgba(197,134,192,.22)", label: "Violet" },
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

const STARTERS = {
  ts: `import { EventEmitter } from 'events';
interface Config { port: number; debug: boolean; maxSessions: number; }
class CKCEngine extends EventEmitter {
  private config: Config;
  constructor(config: Config) { super(); this.config = config; this.init(); }
  private init(): void { console.log(\`CKC Engine ready on port \${this.config.port}\`); }
  createSession(id: string) { console.log(\`Session created: \${id}\`); }
  broadcastOp(sessionId: string, op: unknown): void { console.log(\`Op broadcast for session: \${sessionId}\`); }
}
const engine = new CKCEngine({ port: 8080, debug: true, maxSessions: 100 });
engine.createSession('sess_abc123');
engine.broadcastOp('sess_abc123', { type: 'insert', pos: 0 });`,
  js: `const routes = new Map();
const get = (p, fn) => routes.set('GET:' + p, fn);
get('/api/status', (_, res) => { console.log(JSON.stringify({ status: 'ok', uptime: 123 })); });
console.log('Server on http://localhost:3000');
console.log('Routes registered:', routes.size);`,
  py: `def greet(name):
    return f"Hello, {name}!"

numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
print(greet("CKC-OS"))
print(f"Sum of {numbers} = {total}")
for i in range(3):
    print(f"  Step {i + 1}: processing...")
print("Done!")`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("CKC-OS Java Runner");
        for (int i = 1; i <= 5; i++) {
            System.out.println("Step " + i + " complete");
        }
    }
}`,
  cpp: `#include <iostream>
using namespace std;
int main() {
    cout << "Hello from CKC-OS!" << endl;
    for (int i = 1; i <= 5; i++) {
        cout << "Step " << i << " done" << endl;
    }
    return 0;
}`,
  rs: `use std::collections::HashMap;
fn main() {
    let mut scores: HashMap<&str, i32> = HashMap::new();
    scores.insert("Alice", 95);
    scores.insert("Bob", 87);
    for (name, score) in &scores {
        println!("{}: {}", name, score);
    }
}`,
  go: `package main
import "fmt"
func fibonacci(n int) int {
    if n <= 1 { return n }
    return fibonacci(n-1) + fibonacci(n-2)
}
func main() {
    for i := 0; i < 10; i++ {
        fmt.Printf("fib(%d) = %d\\n", i, fibonacci(i))
    }
}`,
  sql: `CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL UNIQUE,
    color VARCHAR(32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
SELECT u.username, u.color, COUNT(*) as sessions
FROM users u
GROUP BY u.id
ORDER BY sessions DESC LIMIT 10;`,
};

// ═══════════ HELPERS ═══════════
export function initials(n) {
  return (n || "?").split(" ").map(w => w[0] || "").join("").toUpperCase().slice(0, 2) || "?";
}
function nowTs() {
  return new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
export function genSid() {
  const c = "abcdefghjkmnpqrstuvwxyz0123456789";
  const s = () => Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join("");
  return s() + "-" + s();
}

// ═══════════ VALIDATOR (abbreviated — same as original) ═══════════
function validateCode(lang, code) {
  const errors = [], warnings = [], lines = code.split("\n"), trim = code.trim();
  function countBalance(open, close) {
    let depth = 0, inStr = false, strChar = "", inLC = false;
    for (let i = 0; i < code.length; i++) {
      const ch = code[i], prev = code[i - 1];
      if (ch === "\n") { inLC = false; continue; }
      if (inLC) continue;
      if (!inStr && ch === "/" && code[i + 1] === "/") { inLC = true; continue; }
      if (!inStr && (ch === '"' || ch === "'" || ch === "`")) { inStr = true; strChar = ch; continue; }
      if (inStr && ch === strChar && prev !== "\\") { inStr = false; continue; }
      if (inStr) continue;
      if (ch === open) depth++;
      if (ch === close) depth--;
    }
    return depth;
  }
  if (lang === "ts" || lang === "js") {
    const bd = countBalance("{", "}"); if (bd > 0) errors.push(`SyntaxError: ${bd} unclosed '{' brace(s)`); if (bd < 0) errors.push(`SyntaxError: ${Math.abs(bd)} unexpected '}'`);
    const pd = countBalance("(", ")"); if (pd > 0) errors.push(`SyntaxError: ${pd} unclosed '('`); if (pd < 0) errors.push(`SyntaxError: ${Math.abs(pd)} unexpected ')'`);
  }
  if (lang === "py") {
    lines.forEach((l, i) => { const t = l.trim(); if (/^(def|class)\s+\w+\s*\(.*\)\s*$/.test(t)) errors.push(`SyntaxError (line ${i + 1}): Missing ':'`); });
  }
  if (lang === "java") {
    if (!trim.includes("public static void main")) errors.push(`error: Main method not found`);
    const bd = countBalance("{", "}"); if (bd !== 0) errors.push(`error: Unbalanced braces`);
  }
  if (lang === "cpp") {
    if (!/#include/.test(trim)) errors.push(`fatal error: No #include found`);
    if (!/int\s+main/.test(trim)) errors.push(`error: 'main' not found`);
  }
  if (lang === "rs") {
    if (!/fn\s+main\s*\(\s*\)/.test(trim)) errors.push(`error[E0601]: main function not found`);
  }
  if (lang === "go") {
    if (!/^package\s+main/.test(trim)) errors.push(`expected 'package', found something else`);
    if (!/func\s+main\s*\(\s*\)/.test(trim)) errors.push(`runtime: func main() not found`);
  }
  return {
    hasError: errors.length > 0, hasWarning: warnings.length > 0, errors, warnings,
    output: errors.length > 0
      ? [`❌ Compilation failed with ${errors.length} error(s):`, "", ...errors.map(e => `  ✖ ${e}`), "", "Fix the error(s) above and run again."].join("\n")
      : null,
  };
}

// ═══════════ PYODIDE ═══════════
const pyState = { py: null, loading: false, waiters: [] };
async function loadPy() {
  if (pyState.py) return pyState.py;
  if (pyState.loading) return new Promise(r => pyState.waiters.push(r));
  pyState.loading = true;
  if (!document.getElementById("_pyscript")) {
    await new Promise((res, rej) => {
      const s = document.createElement("script"); s.id = "_pyscript";
      s.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  const py = await window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/" });
  py.runPython(`import sys,io as _io\nclass _Cap(_io.StringIO):pass\n_sc=_Cap();_ec=_Cap()`);
  pyState.py = py; pyState.waiters.forEach(r => r(py)); pyState.waiters = [];
  return py;
}
async function runPython(code) {
  const py = await loadPy();
  py.runPython(`_sc=_Cap();_ec=_Cap();sys.stdout=_sc;sys.stderr=_ec`);
  let hasError = false, errorMsg = "";
  try { py.runPython(code); } catch (e) { hasError = true; errorMsg = String(e).replace(/^PythonError:\s*/i, "").split("\n").filter(l => !l.includes("pyodide") && !l.includes("    at ")).join("\n").trim(); }
  const stdout = py.runPython("_sc.getvalue()");
  py.runPython("sys.stdout=sys.__stdout__;sys.stderr=sys.__stderr__");
  let output = stdout || "";
  if (hasError) output += (output ? "\n" : "") + errorMsg;
  return { output: output.trim(), hasError, errorMsg: hasError ? errorMsg : "" };
}
function runJS(code, isTS) {
  return new Promise(resolve => {
    const logs = [], errors = [];
    let src = isTS ? code.replace(/^\s*import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, "").replace(/interface\s+\w[\w\s]*\{[^}]*\}/gs, "").replace(/:\s*\w[\w<>[|&\s,?]*/g, "").replace(/\bprivate\b|\bpublic\b|\bprotected\b|\breadonly\b/g, "").replace(/^\s*export\s+/gm, "") : code;
    const iframe = document.createElement("iframe"); iframe.style.display = "none"; document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    win.console = { log: (...a) => logs.push(a.map(x => typeof x === "object" ? JSON.stringify(x, null, 2) : String(x)).join(" ")), error: (...a) => errors.push(a.map(String).join(" ")), warn: (...a) => logs.push("⚠ " + a.map(String).join(" ")), info: (...a) => logs.push(a.map(String).join(" ")) };
    let hasError = false, errorMsg = "";
    try { win.eval(src); } catch (e) { hasError = true; errorMsg = e.stack || e.message || String(e); }
    document.body.removeChild(iframe);
    const out = [...logs]; if (hasError) out.push(errorMsg);
    resolve({ output: out.join("\n") || "(no output)", hasError, errorMsg });
  });
}
function simulateCompiled(lang, code) {
  const outputs = [];
  if (lang === "java") { const m = code.match(/public\s+class\s+(\w+)/); outputs.push(`Compiled: ${m ? m[1] : "Main"}.class`); const ps = code.match(/System\.out\.println\s*\("([^"]+)"\)/g) || []; ps.forEach(p => { const m = p.match(/"([^"]+)"/); if (m) outputs.push(m[1]); }); outputs.push("Exit code 0"); }
  if (lang === "cpp") { outputs.push("g++ -std=c++17 -o main main.cpp"); const cs = code.match(/cout\s*<<\s*"([^"]+)"/g) || []; cs.forEach(c => { const m = c.match(/"([^"]+)"/); if (m) outputs.push(m[1]); }); outputs.push("Exit code 0"); }
  if (lang === "rs") { outputs.push("   Compiling main v0.1.0"); outputs.push("    Finished release"); const ps = code.match(/println!\s*\("([^"]+)"/g) || []; ps.forEach(p => { const m = p.match(/"([^"]+)"/); if (m) outputs.push(m[1].replace(/\{\}/g, "[value]")); }); }
  if (lang === "go") { outputs.push("go run main.go"); const ps = code.match(/fmt\.Println\s*\("([^"]+)"\)/g) || []; ps.forEach(p => { const m = p.match(/"([^"]+)"/); if (m) outputs.push(m[1]); }); outputs.push("Exit code 0"); }
  if (lang === "sql") { const stmts = code.split(";").filter(s => s.trim()); stmts.forEach(s => { if (/CREATE TABLE/i.test(s)) { const m = s.match(/CREATE TABLE\s+(\w+)/i); outputs.push(`Table '${m ? m[1] : "table"}' created`); } else if (/SELECT/i.test(s)) outputs.push(`${Math.floor(Math.random() * 20) + 1} row(s) returned`); else if (/INSERT/i.test(s)) outputs.push("1 row inserted"); else if (/UPDATE/i.test(s)) outputs.push("Row(s) updated"); }); }
  return { output: outputs.join("\n") || "(no output)", hasError: false };
}
export async function validateAndRun(lang, code, pyReady, setPyReady) {
  const validation = validateCode(lang, code);
  if (validation.hasError) return { output: validation.output, hasError: true, errorMsg: validation.output };
  if (lang === "py") { if (!pyReady) { await loadPy(); setPyReady(true); } return runPython(code); }
  if (lang === "js" || lang === "ts") return runJS(code, lang === "ts");
  await new Promise(r => setTimeout(r, 350));
  return simulateCompiled(lang, code);
}

// ═══════════ OT ENGINE (local) ═══════════
class OTEngine {
  constructor(text = "") { this.text = text; this.version = 0; this.history = []; this._subs = []; }
  subscribe(fn) { this._subs.push(fn); return () => { this._subs = this._subs.filter(f => f !== fn); }; }
  _emit(op) { this._subs.forEach(fn => fn(op, this.text, this.version)); }
  static xform(a, b) {
    let r = { ...b };
    if (a.type === "insert" && b.type === "insert") { if (a.pos < b.pos || (a.pos === b.pos && a.uid < b.uid)) r.pos = b.pos + a.chars.length; }
    else if (a.type === "insert" && b.type === "delete") { if (a.pos <= b.pos) r.pos = b.pos + a.chars.length; }
    else if (a.type === "delete" && b.type === "insert") { if (a.pos < b.pos) r.pos = Math.max(b.pos - a.len, a.pos); }
    else if (a.type === "delete" && b.type === "delete") { if (a.pos < b.pos) r.pos = Math.max(b.pos - a.len, a.pos); else if (a.pos === b.pos) r.skip = true; }
    return r;
  }
  apply(op) {
    let x = { ...op };
    const conc = this.history.filter(h => h.ver > (op.baseVer ?? this.version));
    for (const h of conc) x = OTEngine.xform(h, x);
    if (x.skip) return null;
    if (x.type === "insert") { const p = Math.max(0, Math.min(x.pos, this.text.length)); this.text = this.text.slice(0, p) + x.chars + this.text.slice(p); }
    else if (x.type === "delete") { const p = Math.max(0, Math.min(x.pos, this.text.length)); const l = Math.min(x.len, this.text.length - p); if (l > 0) this.text = this.text.slice(0, p) + this.text.slice(p + l); }
    this.version++;
    const rec = { ...x, ver: this.version };
    this.history.push(rec);
    if (this.history.length > 300) this.history = this.history.slice(-150);
    this._emit(rec);
    return rec;
  }
  reset(t) { this.text = t; this.version = 0; this.history = []; }
}

// Local OT engines per language
const localEngines = {};
function getEng(lk) {
  if (!localEngines[lk]) localEngines[lk] = new OTEngine(STARTERS[lk] || "");
  return localEngines[lk];
}

// ═══════════ CSS ═══════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;overflow:hidden;}
body{font-family:'Inter',system-ui,sans-serif;background:#0d0f14;color:#e0e0e0;font-size:13px;}
:root{
  --bg:#0d0f14;--bg2:#151820;--bg3:#1c1f28;
  --bdr:rgba(255,255,255,.08);--bdr2:rgba(255,255,255,.05);
  --txt:#e0e0e0;--txt2:#8892a4;--txt3:#4a5568;
  --blue:#4FC1FF;--grn:#4EC9B0;--pink:#FF6B9D;--ylw:#DCDCAA;
  --sel:rgba(79,193,255,.12);--mono:'JetBrains Mono',Consolas,monospace;
}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px;}
::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.18);}

/* LOGIN */
.auth-wrap{min-height:100vh;background:#080a0e;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
.auth-bg{position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(79,193,255,.06) 0%,transparent 70%),radial-gradient(ellipse 40% 40% at 80% 80%,rgba(78,201,176,.04) 0%,transparent 60%);pointer-events:none;}
.auth-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;}
.auth-card{position:relative;z-index:1;width:440px;max-width:calc(100vw - 32px);}
.auth-glass{background:rgba(21,24,32,.9);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px;backdrop-filter:blur(20px);box-shadow:0 40px 100px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.03);}
.auth-logo{display:flex;align-items:center;gap:12px;margin-bottom:32px;}
.auth-gem{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#4FC1FF,#4EC9B0);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 8px 24px rgba(79,193,255,.3);}
.auth-brand{font-size:22px;font-weight:800;color:#fff;letter-spacing:-.03em;}
.auth-sub{font-size:12px;color:#4a5568;font-family:var(--mono);margin-top:2px;}
.auth-tabs{display:flex;background:rgba(255,255,255,.04);border-radius:10px;padding:3px;margin-bottom:28px;}
.auth-tab{flex:1;padding:8px;border-radius:8px;text-align:center;cursor:pointer;font-size:12px;font-weight:600;color:#4a5568;transition:all .2s;}
.auth-tab.on{background:rgba(79,193,255,.15);color:#4FC1FF;border:1px solid rgba(79,193,255,.25);}
.auth-field{margin-bottom:16px;}
.auth-label{font-size:11px;color:#4a5568;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;display:block;}
.auth-input{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:11px 14px;color:#e0e0e0;font-size:13px;font-family:'Inter',sans-serif;outline:none;transition:all .2s;}
.auth-input:focus{border-color:rgba(79,193,255,.4);background:rgba(79,193,255,.05);box-shadow:0 0 0 3px rgba(79,193,255,.08);}
.auth-input::placeholder{color:#4a5568;}
.auth-btn{width:100%;padding:13px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;border:none;margin-top:8px;}
.auth-btn.primary{background:linear-gradient(135deg,rgba(79,193,255,.3),rgba(78,201,176,.25));border:1px solid rgba(79,193,255,.4);color:#4FC1FF;}
.auth-btn.primary:hover{background:linear-gradient(135deg,rgba(79,193,255,.45),rgba(78,201,176,.35));box-shadow:0 8px 24px rgba(79,193,255,.2);}
.auth-btn:disabled{opacity:.4;cursor:not-allowed;}
.auth-err{background:rgba(255,107,157,.1);border:1px solid rgba(255,107,157,.25);border-radius:8px;padding:10px 14px;color:#FF6B9D;font-size:12px;margin-bottom:14px;}
.auth-ok{background:rgba(78,201,176,.1);border:1px solid rgba(78,201,176,.25);border-radius:8px;padding:10px 14px;color:#4EC9B0;font-size:12px;margin-bottom:14px;}
.color-swatches{display:flex;gap:8px;flex-wrap:wrap;}
.color-swatch{width:32px;height:32px;border-radius:9px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;border:2px solid transparent;}
.color-swatch.sel{transform:scale(1.15);}

/* TOPBAR */
.topbar{height:46px;background:var(--bg2);border-bottom:1px solid var(--bdr);display:flex;align-items:center;padding:0 10px;gap:6px;flex-shrink:0;}
.tb-logo{display:flex;align-items:center;gap:6px;font-weight:700;font-size:.88rem;color:#fff;padding:0 6px;white-space:nowrap;}
.gem{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#4FC1FF,#4EC9B0);display:flex;align-items:center;justify-content:center;font-size:11px;}
.lp{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:5px;cursor:pointer;font-family:var(--mono);font-size:11px;font-weight:700;border:1px solid transparent;transition:all .12s;white-space:nowrap;}
.lp:hover{background:rgba(255,255,255,.06);}
.lp.on{border-color:rgba(255,255,255,.15);}
.av{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--mono);border:2px solid transparent;transition:all .15s;flex-shrink:0;position:relative;}
.av:hover{transform:translateY(-2px);z-index:2;}
.av.me{border-color:rgba(255,255,255,.4);}
.av .online-dot{position:absolute;bottom:-2px;right:-2px;width:7px;height:7px;border-radius:50%;border:1.5px solid var(--bg2);}
.run-btn{display:flex;align-items:center;gap:5px;padding:5px 14px;border-radius:5px;background:rgba(78,201,176,.15);border:1px solid rgba(78,201,176,.35);color:#4EC9B0;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;white-space:nowrap;}
.run-btn:hover{background:rgba(78,201,176,.25);}
.run-btn.running{background:rgba(255,107,157,.12);border-color:rgba(255,107,157,.35);color:#FF6B9D;}
.run-btn:disabled{opacity:.5;cursor:not-allowed;}

/* SIDEBAR */
.sidebar{width:240px;background:var(--bg2);border-right:1px solid var(--bdr);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;}
.sec-hdr{padding:10px 12px 5px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt3);}
.ft{display:flex;align-items:center;gap:7px;height:26px;cursor:pointer;padding:0 10px;font-size:12px;white-space:nowrap;border-radius:4px;margin:0 4px 1px;}
.ft:hover{background:rgba(255,255,255,.05);}
.ft.sel{background:var(--sel);}

/* PRESENCE */
.presence-card{display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:6px;margin:0 4px 2px;transition:background .15s;}
.presence-card:hover{background:rgba(255,255,255,.04);}
.presence-av{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:var(--mono);flex-shrink:0;border:2px solid transparent;position:relative;}
.presence-av .pdot{position:absolute;bottom:-2px;right:-2px;width:8px;height:8px;border-radius:50%;border:2px solid var(--bg2);}
.presence-info{flex:1;min-width:0;}
.presence-name{font-size:12px;color:#e0e0e0;font-weight:500;display:flex;align-items:center;gap:5px;}
.presence-pos{font-size:10px;margin-top:1px;}

/* TABS */
.tab{display:flex;align-items:center;gap:5px;padding:0 12px 0 14px;height:36px;border-right:1px solid var(--bdr2);cursor:pointer;font-size:12px;white-space:nowrap;flex-shrink:0;max-width:180px;position:relative;font-family:var(--mono);}
.tab.on{background:var(--bg);border-bottom:2px solid var(--blue);color:#e0e0e0;}
.tab.off{background:var(--bg3);color:var(--txt2);}
.tx{opacity:0;width:14px;height:14px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:11px;margin-left:auto;}
.tab:hover .tx{opacity:1;}
.tx:hover{background:rgba(255,255,255,.1);color:#fff;}

/* OUTPUT */
.out-panel{background:#0a0c10;border-top:1px solid var(--bdr);display:flex;flex-direction:column;flex-shrink:0;}
.out-hdr{display:flex;align-items:center;background:var(--bg3);border-bottom:1px solid var(--bdr);height:32px;flex-shrink:0;}
.out-tab{padding:0 14px;height:100%;display:flex;align-items:center;cursor:pointer;font-size:11px;font-weight:600;color:var(--txt2);border-bottom:2px solid transparent;gap:5px;}
.out-tab.on{color:#fff;border-bottom-color:var(--blue);}
.rp-tab{padding:5px 14px;cursor:pointer;font-size:11px;font-weight:600;color:var(--txt2);border-bottom:2px solid transparent;white-space:nowrap;}
.rp-tab.on{color:var(--txt);border-bottom-color:var(--blue);}

/* MISC */
.bc{height:24px;display:flex;align-items:center;padding:0 14px;gap:5px;font-size:11px;color:var(--txt2);background:var(--bg);border-bottom:1px solid var(--bdr2);flex-shrink:0;font-family:var(--mono);}
.statusbar{height:24px;background:#080a0d;border-top:1px solid var(--bdr);display:flex;align-items:center;padding:0 4px;flex-shrink:0;font-size:11px;color:var(--txt2);font-family:var(--mono);}
.st{display:flex;align-items:center;padding:0 8px;height:100%;cursor:pointer;gap:4px;white-space:nowrap;transition:background .1s;}
.st:hover{background:rgba(255,255,255,.05);}
.divider{height:1px;background:var(--bdr);margin:5px 0;}
.live-badge{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(78,201,176,.08);border:1px solid rgba(78,201,176,.2);font-size:10px;font-weight:700;color:#4EC9B0;letter-spacing:.06em;white-space:nowrap;}
.live-dot{width:6px;height:6px;border-radius:50%;background:#4EC9B0;box-shadow:0 0 6px #4EC9B0;}
.val-pass{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(78,201,176,.08);border:1px solid rgba(78,201,176,.2);font-size:10px;font-weight:700;color:#4EC9B0;}
.val-fail{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(255,107,157,.1);border:1px solid rgba(255,107,157,.25);font-size:10px;font-weight:700;color:#FF6B9D;}
.val-warn{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(220,220,170,.08);border:1px solid rgba(220,220,170,.2);font-size:10px;font-weight:700;color:#DCDCAA;}

/* ERR POPUP */
.err-ov{position:fixed;inset:0;z-index:800;display:flex;align-items:flex-start;justify-content:center;padding-top:54px;pointer-events:none;}
.err-box{pointer-events:all;width:700px;max-width:calc(100vw - 20px);background:#120607;border:1.5px solid rgba(255,107,157,.55);border-radius:12px;overflow:hidden;box-shadow:0 28px 70px rgba(0,0,0,.9);}
.err-head{display:flex;align-items:center;gap:10px;padding:11px 15px;background:rgba(255,107,157,.08);border-bottom:1px solid rgba(255,107,157,.2);}
.err-title{font-weight:700;font-size:13px;color:#FF6B9D;flex:1;}
.err-close{width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#FF6B9D;font-size:13px;background:rgba(255,107,157,.1);border:1px solid rgba(255,107,157,.2);}
.err-body{padding:13px 16px;font-family:var(--mono);font-size:12px;line-height:1.75;max-height:260px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;}

/* CRDT */
.op-card{border-radius:6px;padding:7px 10px;margin-bottom:5px;animation:fadeIn .2s ease both;}
.op-card.insert{background:rgba(79,193,255,.08);border:1px solid rgba(79,193,255,.2);}
.op-card.retain{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);}
.op-card.delete{background:rgba(255,99,99,.07);border:1px solid rgba(255,99,99,.18);}
.op-badge{font-size:9px;font-weight:700;letter-spacing:.08em;padding:2px 6px;border-radius:3px;}
.op-badge.insert{background:rgba(79,193,255,.2);color:#4FC1FF;}
.op-badge.retain{background:rgba(255,255,255,.08);color:var(--txt2);}
.op-badge.delete{background:rgba(255,99,99,.15);color:#ff6363;}

/* WS */
.ws-entry{font-family:var(--mono);font-size:10px;padding:4px 6px;border-radius:4px;margin-bottom:3px;border-left:2px solid;word-break:break-all;line-height:1.6;animation:fadeIn .2s ease both;}
.ws-entry.in{background:rgba(78,201,176,.06);border-color:#4EC9B0;color:#4EC9B0bb;}
.ws-entry.out{background:rgba(79,193,255,.06);border-color:#4FC1FF;color:#4FC1FFbb;}

/* TOAST */
.toast{position:fixed;bottom:30px;right:14px;background:var(--bg3);border:1px solid var(--bdr);border-radius:6px;padding:8px 14px;font-size:12px;z-index:999;max-width:300px;box-shadow:0 6px 24px rgba(0,0,0,.5);animation:fadeIn .2s ease both;}

/* ANIMATIONS */
@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.fi{animation:fadeIn .18s cubic-bezier(.34,1.4,.64,1) both;}
@keyframes errSlide{from{opacity:0;transform:translateY(-16px) scale(.97)}to{opacity:1;transform:none}}
.err-slide{animation:errSlide .2s cubic-bezier(.34,1.2,.64,1) both;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.pulse{animation:pulse 1.8s ease-in-out infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.spin{animation:spin .7s linear infinite;}
@keyframes valPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
.val-pop{animation:valPop .25s cubic-bezier(.34,1.56,.64,1) both;}
`;

// ═══════════ CODEMIRROR EDITOR ═══════════
const CMEditor = forwardRef(function CMEditor(
  { lang, initText, onLocalOp, onCursorMove, fileKey, remoteOps, cursors, readOnly = false }, ref
) {
  const domRef = useRef(null), viewRef = useRef(null), modsRef = useRef(null);
  const inited = useRef(false), suppress = useRef(false), prevDoc = useRef(initText || "");

  useEffect(() => {
    const api = { _getText: () => viewRef.current?.state.doc.toString() ?? prevDoc.current };
    if (ref) { typeof ref === "function" ? ref(api) : (ref.current = api); }
  });

  useEffect(() => {
    if (!remoteOps?.length || !viewRef.current) return;
    suppress.current = true;
    try {
      const v = viewRef.current;
      for (const op of remoteOps) {
        const dl = v.state.doc.length;
        if (op.type === "insert") { const p = Math.max(0, Math.min(op.pos, dl)); v.dispatch({ changes: { from: p, insert: op.chars } }); }
        else if (op.type === "delete") { const f = Math.max(0, Math.min(op.pos, dl)); const t = Math.min(f + op.len, dl); if (t > f) v.dispatch({ changes: { from: f, to: t } }); }
      }
      prevDoc.current = v.state.doc.toString();
    } finally { suppress.current = false; }
  }, [remoteOps]);

  useEffect(() => {
    if (inited.current || !domRef.current) return; inited.current = true;
    (async () => {
      try {
        const [
          { EditorState }, { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, indentOnInput },
          { defaultKeymap, history, historyKeymap, indentWithTab }, { searchKeymap, highlightSelectionMatches },
          { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap }, { foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle },
          { javascript }, { python }, { java }, { cpp }, { rust }, { go }, { sql }, { oneDark }
        ] = await Promise.all([
          import("https://esm.sh/@codemirror/state@6.4.1"), import("https://esm.sh/@codemirror/view@6.26.3"),
          import("https://esm.sh/@codemirror/commands@6.6.0"), import("https://esm.sh/@codemirror/search@6.5.6"),
          import("https://esm.sh/@codemirror/autocomplete@6.17.0"), import("https://esm.sh/@codemirror/language@6.10.2"),
          import("https://esm.sh/@codemirror/lang-javascript@6.2.2"), import("https://esm.sh/@codemirror/lang-python@6.1.6"),
          import("https://esm.sh/@codemirror/lang-java@6.0.1"), import("https://esm.sh/@codemirror/lang-cpp@6.0.2"),
          import("https://esm.sh/@codemirror/lang-rust@6.0.1"), import("https://esm.sh/@codemirror/lang-go@6.0.0"),
          import("https://esm.sh/@codemirror/lang-sql@6.8.0"), import("https://esm.sh/@codemirror/theme-one-dark@6.1.2"),
        ]);
        const LM = { ts: javascript({ typescript: true }), js: javascript(), py: python(), java: java(), cpp: cpp(), rs: rust(), go: go(), sql: sql() };
        const theme = EditorView.theme({
          "&": { backgroundColor: "#0d0f14", color: "#d4d4d4", height: "100%", fontSize: "13.5px" },
          ".cm-content": { caretColor: "#4FC1FF", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: "13.5px", lineHeight: "21px" },
          ".cm-cursor,.cm-dropCursor": { borderLeftColor: "#4FC1FF", borderLeftWidth: "2px" },
          ".cm-activeLine": { backgroundColor: "rgba(79,193,255,.04)" },
          ".cm-selectionBackground": { backgroundColor: "rgba(79,193,255,.18) !important" },
          "&.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(79,193,255,.22) !important" },
          ".cm-gutters": { backgroundColor: "#0d0f14", borderRight: "1px solid rgba(255,255,255,.05)", color: "#4a5568", minWidth: "48px" },
          ".cm-lineNumbers .cm-gutterElement": { minWidth: "38px", textAlign: "right", paddingRight: "10px" },
          ".cm-activeLineGutter": { backgroundColor: "rgba(79,193,255,.04)", color: "#8892a4" },
          ".cm-matchingBracket": { backgroundColor: "rgba(79,193,255,.15)", color: "#fff !important" },
          ".cm-tooltip": { backgroundColor: "#1c1f28", border: "1px solid rgba(255,255,255,.1)", borderRadius: "6px" },
        }, { dark: true });
        const listener = EditorView.updateListener.of(upd => {
          if (upd.selectionSet) { const pos = upd.state.selection.main.head; const ln = upd.state.doc.lineAt(pos); onCursorMove?.(ln.number, pos - ln.from + 1, pos); }
          if (!upd.docChanged || suppress.current || readOnly) return;
          const newText = upd.state.doc.toString(), old = prevDoc.current;
          if (newText === old) return;
          let i = 0, oe = old.length, ne = newText.length;
          while (i < oe && i < ne && old[i] === newText[i]) i++;
          let oe2 = oe, ne2 = ne;
          while (oe2 > i && ne2 > i && old[oe2 - 1] === newText[ne2 - 1]) { oe2--; ne2--; }
          const del = old.slice(i, oe2), ins = newText.slice(i, ne2);
          if (del.length) onLocalOp?.({ type: "delete", pos: i, len: del.length });
          if (ins.length) onLocalOp?.({ type: "insert", pos: i, chars: ins });
          prevDoc.current = newText;
        });
        modsRef.current = { EditorState, EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, indentOnInput, history, historyKeymap, indentWithTab, searchKeymap, highlightSelectionMatches, autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle, oneDark, theme, listener, LM };
        const mkExt = lk => {
          const b = [lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), highlightSpecialChars(), history(), foldGutter(), drawSelection(), dropCursor(), bracketMatching(), closeBrackets(), autocompletion(), rectangularSelection(), crosshairCursor(), highlightSelectionMatches(), indentOnInput(), syntaxHighlighting(defaultHighlightStyle, { fallback: true }), keymap.of([indentWithTab, ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap]), LM[lk] || LM.ts, oneDark, theme, listener, EditorView.lineWrapping];
          if (readOnly) b.push(EditorView.editable.of(false));
          return b;
        };
        const view = new EditorView({ state: EditorState.create({ doc: initText || "", extensions: mkExt(lang) }), parent: domRef.current });
        viewRef.current = view; prevDoc.current = view.state.doc.toString();
      } catch {
        if (domRef.current) {
          const ta = document.createElement("textarea"); ta.value = initText || "";
          ta.style.cssText = "width:100%;height:100%;background:#0d0f14;color:#d4d4d4;font-family:'JetBrains Mono',monospace;font-size:13.5px;line-height:21px;padding:8px 14px;border:none;outline:none;resize:none;";
          if (!readOnly) { ta.addEventListener("input", e => { const nT = e.target.value, old = prevDoc.current; let i = 0, oe = old.length, ne = nT.length; while (i < oe && i < ne && old[i] === nT[i]) i++; const ins = nT.slice(i), del = old.slice(i, oe); if (del.length) onLocalOp?.({ type: "delete", pos: i, len: del.length }); if (ins.length) onLocalOp?.({ type: "insert", pos: i, chars: ins }); prevDoc.current = nT; }); }
          domRef.current.innerHTML = ""; domRef.current.appendChild(ta);
          if (ref) { const api = { _getText: () => ta.value }; typeof ref === "function" ? ref(api) : (ref.current = api); }
        }
      }
    })();
    return () => { if (viewRef.current) { viewRef.current.destroy(); viewRef.current = null; inited.current = false; } };
  }, []);

  useEffect(() => {
    if (!viewRef.current || !modsRef.current) return;
    const { EditorState, EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, indentOnInput, history, historyKeymap, indentWithTab, searchKeymap, highlightSelectionMatches, autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle, oneDark, theme, listener, LM } = modsRef.current;
    const mkExt = lk => { const b = [lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), highlightSpecialChars(), history(), foldGutter(), drawSelection(), dropCursor(), bracketMatching(), closeBrackets(), autocompletion(), rectangularSelection(), crosshairCursor(), highlightSelectionMatches(), indentOnInput(), syntaxHighlighting(defaultHighlightStyle, { fallback: true }), keymap.of([indentWithTab, ...closeBracketsKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, ...searchKeymap]), LM[lk] || LM.ts, oneDark, theme, listener, EditorView.lineWrapping]; if (readOnly) b.push(EditorView.editable.of(false)); return b; };
    suppress.current = true;
    viewRef.current.setState(EditorState.create({ doc: initText || "", extensions: mkExt(lang) }));
    prevDoc.current = initText || ""; suppress.current = false;
  }, [lang, fileKey]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
      {cursors?.map(cur => {
        const top = (cur.line - 1) * 21, left = 48 + (cur.col - 1) * 8.1;
        return (
          <div key={cur.id} style={{ pointerEvents: "none", position: "absolute", inset: 0, overflow: "hidden", zIndex: 15 }}>
            <div style={{ position: "absolute", top, left: 48, right: 0, height: 21, background: cur.color + "0a", borderLeft: `2px solid ${cur.color}22` }} />
            <div style={{ position: "absolute", top, left, width: 2, height: 21, background: cur.color, borderRadius: 1, boxShadow: `0 0 6px ${cur.color}88`, transition: "top .2s,left .2s" }} />
            <div style={{ position: "absolute", top: Math.max(0, top - 18), left: Math.max(48, left), background: cur.color, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: "3px 3px 3px 0", fontFamily: "Inter,sans-serif", whiteSpace: "nowrap", boxShadow: `0 2px 8px ${cur.color}66`, transition: "top .2s,left .2s" }}>
              {cur.name?.split(" ")[0] || "?"}
            </div>
          </div>
        );
      })}
      <div ref={domRef} style={{ height: "100%", width: "100%", overflow: "auto" }} />
    </div>
  );
});

// ═══════════ ERROR POPUP ═══════════
function ErrorPopup({ error, lang, onClose }) {
  if (!error) return null;
  return (
    <div className="err-ov">
      <div className="err-box err-slide">
        <div className="err-head">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF6B9D", boxShadow: "0 0 8px #FF6B9D", display: "inline-block" }} className="pulse" />
          <div className="err-title">⊗ Compilation Error — {LANGS[lang]?.n || lang}</div>
          <button className="err-close" onClick={onClose}>✕</button>
        </div>
        <div className="err-body">
          {error.split("\n").map((line, i) => {
            let color = "#ffb3c0";
            if (/^❌/.test(line)) color = "#FF6B9D";
            else if (/^\s*✖/.test(line)) color = "#ff8090";
            else if (/Fix the error/i.test(line)) color = "#6a7585";
            return <div key={i} style={{ color, fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.75 }}>{line || "\u00A0"}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ═══════ AUTH PAGE ══════════════════════════
// ═══════════════════════════════════════════
function AuthPage({ onAuth }) {
  const [tab, setTab] = useState("login"); // "login" | "signup"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const chosen = PALETTE[colorIdx];

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) { setError("All fields are required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError(""); setInfo("");
    try {
      const sb = await getSB();
      // Create auth user
      const { data: authData, error: authErr } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: username.trim(), color: chosen.hex, color_bg: chosen.bg } },
      });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Signup failed — no user returned.");

      // Insert into users table
      const { error: dbErr } = await sb.from("users").insert({
        id: authData.user.id,
        username: username.trim(),
        email: email.trim(),
        password_hash: "managed_by_supabase_auth",
        color: { hex: chosen.hex, bg: chosen.bg },
      });
      if (dbErr && !dbErr.message.includes("duplicate")) throw dbErr;

      setInfo("Account created! Check your email to confirm, then log in.");
      setTab("login");
    } catch (e) {
      setError(e.message || "Signup failed.");
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError("Email and password required."); return; }
    setLoading(true); setError(""); setInfo("");
    try {
      const sb = await getSB();
      const { data, error: authErr } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (authErr) throw authErr;
      if (!data.user) throw new Error("Login failed.");

      // Fetch user profile
      const { data: profile } = await sb.from("users").select("*").eq("id", data.user.id).single();

      const colorData = profile?.color || { hex: "#4FC1FF", bg: "rgba(79,193,255,.22)" };
      const me = {
        id: data.user.id,
        name: profile?.username || data.user.user_metadata?.username || email.split("@")[0],
        email: data.user.email,
        color: colorData.hex || "#4FC1FF",
        bg: colorData.bg || "rgba(79,193,255,.22)",
        inits: initials(profile?.username || email.split("@")[0]),
      };
      onAuth(me, data.session);
    } catch (e) {
      setError(e.message || "Login failed.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <style>{CSS}</style>
      <div className="auth-bg" />
      <div className="auth-grid" />
      <div className="auth-card">
        <div className="auth-glass">
          <div className="auth-logo">
            <div className="auth-gem">⚡</div>
            <div>
              <div className="auth-brand">CKC-OS</div>
              <div className="auth-sub">Collaborative Code Editor</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4EC9B0", boxShadow: "0 0 8px #4EC9B0" }} className="pulse" />
              <span style={{ fontSize: 10, color: "#4EC9B0", fontWeight: 700 }}>LIVE</span>
            </div>
          </div>

          <div className="auth-tabs">
            {["login", "signup"].map(t => (
              <div key={t} className={`auth-tab${tab === t ? " on" : ""}`} onClick={() => { setTab(t); setError(""); setInfo(""); }}>
                {t === "login" ? "Sign In" : "Create Account"}
              </div>
            ))}
          </div>

          {error && <div className="auth-err">⊗ {error}</div>}
          {info && <div className="auth-ok">✓ {info}</div>}

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleSignup())} />
          </div>

          {tab === "signup" && (
            <div className="auth-field">
              <label className="auth-label">Username</label>
              <input className="auth-input" placeholder="your handle" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input className="auth-input" type="password" placeholder={tab === "signup" ? "min. 6 characters" : "your password"}
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleSignup())} />
          </div>

          {tab === "signup" && (
            <div className="auth-field">
              <label className="auth-label">Your Cursor Color</label>
              <div className="color-swatches">
                {PALETTE.map((p, i) => (
                  <div key={i} className={`color-swatch${colorIdx === i ? " sel" : ""}`}
                    style={{ background: p.bg, borderColor: colorIdx === i ? p.hex : "transparent" }}
                    onClick={() => setColorIdx(i)} title={p.label}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: p.hex }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: chosen.hex, fontFamily: "var(--mono)" }}>
                Selected: {chosen.label} — your cursor will appear in this color to collaborators
              </div>
            </div>
          )}

          <button
            className="auth-btn primary"
            onClick={tab === "login" ? handleLogin : handleSignup}
            disabled={loading}
          >
            {loading
              ? <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <span className="spin" style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent" }} />
                  {tab === "login" ? "Signing in…" : "Creating account…"}
                </span>
              : tab === "login" ? "Sign In →" : "Create Account →"}
          </button>

          <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(79,193,255,.05)", border: "1px solid rgba(79,193,255,.1)", borderRadius: 10, fontSize: 11, color: "#4FC1FF66", lineHeight: 1.7 }}>
            ⚡ Powered by Supabase Auth + Realtime · OT sync engine · Live cursors per user
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ════════════ MAIN SHELL WITH SUPABASE REALTIME ════════════
// ═══════════════════════════════════════════════════════════
function Shell({ me, onLogout }) {
  const channelRef = useRef(null);
  const activeEditorRef = useRef(null);

  const [lang, setLang] = useState("ts");
  const [tabs, setTabs] = useState([
    { id: "t_eng", name: "engine.ts", lang: "ts", dirty: false },
    { id: "t_srv", name: "server.js", lang: "js", dirty: false },
  ]);
  const [activeTab, setActiveTab] = useState("t_eng");
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [peers, setPeers] = useState({}); // id -> { name, color, bg, inits, line, col, online }
  const [remOps, setRemOps] = useState([]);
  const remBuf = useRef([]);
  const [crdt, setCrdt] = useState([]);
  const [wsLog, setWsLog] = useState([]);
  const [rpTab, setRpTab] = useState("crdt");
  const [outTab, setOutTab] = useState("output");
  const [outOpen, setOutOpen] = useState(false);
  const [output, setOutput] = useState("");
  const [outIsErr, setOutIsErr] = useState(false);
  const [running, setRunning] = useState(false);
  const [pyReady, setPyReady] = useState(false);
  const [errPopup, setErrPopup] = useState(null);
  const [liveValidation, setLiveValidation] = useState(null);
  const liveValTimer = useRef(null);
  const [notif, setNotif] = useState(null);
  const notifTmr = useRef(null);
  const [opCnt, setOpCnt] = useState(0);

  const toast = useCallback((msg, ms = 2500) => { clearTimeout(notifTmr.current); setNotif(msg); notifTmr.current = setTimeout(() => setNotif(null), ms); }, []);

  // ─── SUPABASE REALTIME SETUP ───
  useEffect(() => {
    let mounted = true;
    (async () => {
      const sb = await getSB();

      // Subscribe to Realtime channel for this editor session
      const channel = sb.channel("ckcos-editor", {
        config: { presence: { key: me.id }, broadcast: { self: false } },
      });

      // Track presence (who's online)
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const newPeers = {};
        Object.entries(state).forEach(([key, presences]) => {
          if (key === me.id) return;
          const p = presences[0];
          if (p) newPeers[key] = { name: p.name, color: p.color, bg: p.bg || "rgba(79,193,255,.18)", inits: initials(p.name), line: p.line || 1, col: p.col || 1, lang: p.lang || "ts", online: true };
        });
        if (mounted) setPeers(newPeers);
      });

      channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
        const p = newPresences[0];
        if (!p || key === me.id) return;
        if (mounted) {
          setPeers(prev => ({ ...prev, [key]: { name: p.name, color: p.color, bg: p.bg || "rgba(79,193,255,.18)", inits: initials(p.name), line: 1, col: 1, lang: p.lang || "ts", online: true } }));
          toast(`${p.name} joined the session`);
          setWsLog(prev => [{ dir: "←", msg: `join:${p.name}`, t: nowTs() }, ...prev].slice(0, 80));
        }
      });

      channel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        const p = leftPresences[0];
        if (mounted) {
          setPeers(prev => { const n = { ...prev }; delete n[key]; return n; });
          if (p) toast(`${p.name} left the session`);
        }
      });

      // Receive OT ops from peers
      channel.on("broadcast", { event: "op" }, ({ payload }) => {
        if (!mounted || payload.from === me.id) return;
        const eng = getEng(payload.lang);
        const r = eng.apply({ ...payload.op, uid: payload.from });
        if (r && payload.lang === lang) {
          remBuf.current.push(payload.op);
          setRemOps([...remBuf.current]);
          remBuf.current = [];
          setCrdt(p => [{ ...payload.op, from: payload.name, t: nowTs() }, ...p].slice(0, 40));
          setOpCnt(c => c + 1);
        }
        setWsLog(prev => [{ dir: "←", msg: `op:${payload.op.type}@${payload.op.pos} from ${payload.name}`, t: nowTs() }, ...prev].slice(0, 80));
      });

      // Receive cursor positions from peers
      channel.on("broadcast", { event: "cursor" }, ({ payload }) => {
        if (!mounted || payload.from === me.id) return;
        setPeers(prev => ({
          ...prev,
          [payload.from]: { ...(prev[payload.from] || {}), line: payload.line, col: payload.col, lang: payload.lang, name: payload.name, color: payload.color, bg: payload.bg, inits: initials(payload.name) },
        }));
      });

      // Receive full text sync from a peer
      channel.on("broadcast", { event: "sync" }, ({ payload }) => {
        if (!mounted || payload.from === me.id) return;
        const eng = getEng(payload.lang);
        eng.reset(payload.text);
        if (payload.lang === lang) {
          remBuf.current.push({ type: "reset", text: payload.text });
          setRemOps([...remBuf.current]);
          remBuf.current = [];
        }
      });

      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && mounted) {
          // Announce presence
          await channel.track({ name: me.name, color: me.color, bg: me.bg, lang, line: 1, col: 1 });
          channelRef.current = channel;

          // Request a sync from any peer who responds
          channel.send({ type: "broadcast", event: "sync_request", payload: { from: me.id, lang } });
        }
      });

      // Respond to sync requests by broadcasting current state
      channel.on("broadcast", { event: "sync_request" }, ({ payload }) => {
        if (payload.from === me.id) return;
        const eng = getEng(payload.lang);
        channel.send({ type: "broadcast", event: "sync", payload: { from: me.id, lang: payload.lang, text: eng.text } });
      });
    })();

    return () => {
      mounted = false;
      if (channelRef.current) {
        getSB().then(sb => sb.removeChannel(channelRef.current));
        channelRef.current = null;
      }
    };
  }, [me.id]);

  // Update presence when lang or cursor changes
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.track({ name: me.name, color: me.color, bg: me.bg, lang, line: cursor.line, col: cursor.col });
    }
  }, [lang, cursor.line, cursor.col]);

  const broadcastOp = useCallback((op, lk) => {
    channelRef.current?.send({
      type: "broadcast", event: "op",
      payload: { from: me.id, name: me.name, lang: lk, op },
    });
    setWsLog(prev => [{ dir: "→", msg: `op:${op.type}@${op.pos}`, t: nowTs() }, ...prev].slice(0, 80));
  }, [me.id, me.name]);

  const broadcastCursor = useCallback((line, col, lk) => {
    channelRef.current?.send({
      type: "broadcast", event: "cursor",
      payload: { from: me.id, name: me.name, color: me.color, bg: me.bg, line, col, lang: lk },
    });
  }, [me.id, me.name, me.color, me.bg]);

  const triggerLiveValidation = useCallback((code, lk) => {
    clearTimeout(liveValTimer.current);
    liveValTimer.current = setTimeout(() => {
      if (!code || code.trim().length < 3) { setLiveValidation(null); return; }
      setLiveValidation(validateCode(lk, code));
    }, 600);
  }, []);

  const handleLocalOp = useCallback(op => {
    const eng = getEng(lang);
    const r = eng.apply({ ...op, uid: me.id, baseVer: eng.version - 1 });
    if (r) {
      broadcastOp(r, lang);
      setOpCnt(c => c + 1);
      setTabs(p => p.map(t => t.id === activeTab ? { ...t, dirty: true } : t));
      const code = activeEditorRef.current?._getText?.() || eng.text;
      triggerLiveValidation(code, lang);
    }
  }, [lang, activeTab, broadcastOp, me.id, triggerLiveValidation]);

  const handleCursorMove = useCallback((line, col) => {
    setCursor({ line, col });
    broadcastCursor(line, col, lang);
  }, [lang, broadcastCursor]);

  const switchLang = useCallback(lk => {
    setLang(lk);
    setRemOps([]);
    remBuf.current = [];
    setLiveValidation(null);
    // Broadcast that we switched langs so cursors filter correctly
    channelRef.current?.track({ name: me.name, color: me.color, bg: me.bg, lang: lk, line: cursor.line, col: cursor.col });
  }, [me, cursor.line, cursor.col]);

  const handleRun = useCallback(async () => {
    setRunning(true); setOutOpen(true); setOutTab("output"); setErrPopup(null);
    const curTab = tabs.find(t => t.id === activeTab);
    const cLang = curTab?.lang || lang;
    let code = activeEditorRef.current?._getText?.() || "";
    if (!code.trim()) code = getEng(cLang).text;
    setOutput(`⟳  Validating ${LANGS[cLang]?.n} syntax…`); setOutIsErr(false);
    try {
      const result = await validateAndRun(cLang, code, pyReady, setPyReady);
      setOutput(result.output || "(no output)");
      setOutIsErr(result.hasError);
      if (result.hasError && result.errorMsg) setErrPopup({ msg: result.errorMsg, lang: cLang });
    } catch (e) {
      const msg = "Execution Error: " + e.message;
      setOutput(msg); setOutIsErr(true); setErrPopup({ msg, lang: cLang });
    }
    setRunning(false);
  }, [lang, activeTab, tabs, pyReady]);

  const handleLogout = async () => {
    const sb = await getSB();
    await sb.auth.signOut();
    onLogout();
  };

  const closeTab = (id, e) => {
    e.stopPropagation();
    setTabs(p => { const nx = p.filter(t => t.id !== id); if (activeTab === id && nx.length) { setActiveTab(nx[nx.length - 1].id); switchLang(nx[nx.length - 1].lang); } return nx; });
  };

  const activeCursors = Object.entries(peers)
    .filter(([, p]) => p.lang === lang && p.online)
    .map(([id, p]) => ({ id, ...p }));

  const curEng = getEng(lang);
  const curTab = tabs.find(t => t.id === activeTab);
  const errCount = liveValidation?.errors?.length || 0;
  const warnCount = liveValidation?.warnings?.length || 0;
  const onlineCount = 1 + Object.values(peers).filter(p => p.online).length;

  const renderOutput = (text) => {
    if (!text) return <div style={{ color: "#4a5568", fontFamily: "var(--mono)", fontSize: 12 }}>Press ▶ Run or Ctrl+Enter to execute</div>;
    return text.split("\n").map((line, i) => {
      let color = "#c0c8d8";
      if (/^❌/.test(line)) color = "#FF6B9D";
      else if (/^\s*✖/.test(line)) color = "#ff8090";
      else if (/^(⟳|Compiled:|Compiling|Finished|Running)/.test(line)) color = "#4FC1FF";
      else if (/^(Process finished|Exit code 0)/.test(line)) color = "#4EC9B0";
      else if (/Fix the error/i.test(line)) color = "#4a5568";
      return <div key={i} style={{ color, fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.8 }}>{line || "\u00A0"}</div>;
    });
  };

  const renderValBadge = () => {
    if (!liveValidation) return null;
    if (liveValidation.hasError) return <div className="val-fail val-pop">⊗ {errCount} error{errCount > 1 ? "s" : ""}</div>;
    if (liveValidation.hasWarning) return <div className="val-warn val-pop">⚠ {warnCount} warning{warnCount > 1 ? "s" : ""}</div>;
    return <div className="val-pass val-pop">✓ Valid {LANGS[lang]?.n}</div>;
  };

  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleRun(); }
      if (e.key === "Escape") setErrPopup(null);
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [handleRun]);

  return (
    <>
      <style>{CSS}</style>
      <ErrorPopup error={errPopup?.msg} lang={errPopup?.lang || lang} onClose={() => setErrPopup(null)} />

      {/* ── TOPBAR ── */}
      <div className="topbar">
        <div className="tb-logo">
          <div className="gem">⚡</div>CKC-OS
        </div>

        <div className="live-badge">
          <div className="live-dot pulse" />
          LIVE · {onlineCount}
        </div>

        {/* Language switcher */}
        <div style={{ display: "flex", gap: 2, overflow: "hidden", flex: 1, minWidth: 0 }}>
          {LK.map(lk => { const l = LANGS[lk], on = lang === lk; return (
            <div key={lk} className={`lp${on ? " on" : ""}`}
              style={{ color: on ? l.c : "#6a7585", background: on ? l.bg : "transparent", borderColor: on ? "rgba(255,255,255,.1)" : "transparent" }}
              onClick={() => switchLang(lk)}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700 }}>{l.ic}</span>
              <span style={{ fontSize: 11 }}>{l.n}</span>
            </div>
          ); })}
        </div>

        {renderValBadge()}

        {/* Peer avatars */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {Object.entries(peers).filter(([,p]) => p.online).map(([id, p]) => (
            <div key={id} className="av" style={{ background: p.bg, color: p.color, border: `2px solid ${p.color}55` }} title={`${p.name} — Ln ${p.line}, Col ${p.col}`}>
              {p.inits}
              <div className="online-dot" style={{ background: "#4EC9B0" }} />
            </div>
          ))}
          <div className="av me" style={{ background: me.bg, color: me.color, border: `2px solid ${me.color}88` }} title={`${me.name} (you)`}>
            {me.inits}
            <div className="online-dot" style={{ background: "#4EC9B0" }} />
          </div>
        </div>

        <button className={`run-btn${running ? " running" : ""}`} onClick={handleRun} disabled={running} style={{ flexShrink: 0 }}>
          {running ? <span className="spin" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "1.5px solid currentColor", borderTopColor: "transparent" }} /> : "▶"}
          {running ? "Running…" : "Run"}
        </button>

        <button onClick={handleLogout}
          style={{ padding: "4px 10px", borderRadius: 5, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", color: "#4a5568", cursor: "pointer", fontSize: 11, fontFamily: "Inter,sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
          ← Exit
        </button>
      </div>

      {/* ── MAIN ── */}
      <div style={{ display: "flex", height: "calc(100vh - 70px)", overflow: "hidden" }}>

        {/* ── SIDEBAR ── */}
        <div className="sidebar">
          <div className="sec-hdr">Explorer</div>
          {[
            { id: "f_eng", name: "engine.ts", lang: "ts", icon: "🔷" },
            { id: "f_srv", name: "server.js", lang: "js", icon: "🟨" },
            { id: "f_py", name: "model.py", lang: "py", icon: "🐍" },
          ].map(f => (
            <div key={f.id} className={`ft${activeTab === f.id ? " sel" : ""}`} onClick={() => {
              if (!tabs.find(t => t.id === f.id)) setTabs(p => [...p, { id: f.id, name: f.name, lang: f.lang, dirty: false }]);
              setActiveTab(f.id); switchLang(f.lang);
            }}>
              <span style={{ fontSize: 12 }}>{f.icon}</span>
              <span style={{ color: activeTab === f.id ? "#4FC1FF" : "#c0c8d8", flex: 1, fontSize: 12 }}>{f.name}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: LANGS[f.lang]?.c, fontFamily: "var(--mono)" }}>{LANGS[f.lang]?.ic}</span>
            </div>
          ))}

          <div className="divider" />

          {/* ── PRESENCE ── */}
          <div className="sec-hdr" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Collaborators</span>
            <span style={{ color: "#4EC9B0", fontSize: 9, fontWeight: 700, background: "rgba(78,201,176,.12)", border: "1px solid rgba(78,201,176,.2)", borderRadius: 10, padding: "1px 6px" }}>
              {onlineCount} online
            </span>
          </div>

          {/* Me */}
          <div className="presence-card">
            <div className="presence-av" style={{ background: me.bg, color: me.color, borderColor: me.color + "66" }}>
              {me.inits}
              <div className="pdot" style={{ background: "#4EC9B0" }} />
            </div>
            <div className="presence-info">
              <div className="presence-name">
                <span>{me.name}</span>
                <span style={{ fontSize: 9, color: "#4a5568", background: "rgba(255,255,255,.05)", padding: "1px 5px", borderRadius: 4 }}>you</span>
              </div>
              <div className="presence-pos" style={{ color: me.color }}>Ln {cursor.line} · Col {cursor.col} · {LANGS[lang]?.n}</div>
            </div>
          </div>

          {/* Peers */}
          {Object.entries(peers).filter(([, p]) => p.online).map(([id, p]) => (
            <div key={id} className="presence-card">
              <div className="presence-av" style={{ background: p.bg, color: p.color, borderColor: p.color + "66" }}>
                {p.inits}
                <div className="pdot" style={{ background: "#4EC9B0" }} />
              </div>
              <div className="presence-info">
                <div className="presence-name" style={{ color: "#c0c8d8" }}>{p.name}</div>
                <div className="presence-pos" style={{ color: p.color }}>Ln {p.line} · Col {p.col} · {LANGS[p.lang]?.n || p.lang}</div>
              </div>
            </div>
          ))}

          <div className="divider" />

          {/* Session info */}
          <div style={{ padding: "8px 12px" }}>
            <div style={{ fontSize: 10, color: "#4a5568", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>Session</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a7585", lineHeight: 1.9 }}>
              <div>User: <span style={{ color: me.color }}>{me.name}</span></div>
              <div>Email: <span style={{ color: "#4a5568" }}>{me.email}</span></div>
              <div>Ops: <span style={{ color: "#4EC9B0" }}>{opCnt}</span></div>
              <div>OT ver: <span style={{ color: "#DCDCAA" }}>v{curEng.version}</span></div>
              <div>Doc size: <span style={{ color: "#CE9178" }}>{curEng.text.length}ch</span></div>
            </div>
          </div>

          {/* Live validation summary */}
          {liveValidation && (errCount > 0 || warnCount > 0) && (
            <div style={{ margin: "0 8px 8px", borderRadius: 7, background: errCount > 0 ? "rgba(255,107,157,.06)" : "rgba(220,220,170,.06)", border: `1px solid ${errCount > 0 ? "rgba(255,107,157,.2)" : "rgba(220,220,170,.2)"}`, padding: "7px 9px", maxHeight: 120, overflowY: "auto" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: errCount > 0 ? "#FF6B9D" : "#DCDCAA", marginBottom: 4 }}>
                {errCount > 0 ? `⊗ ${errCount} Error(s)` : `⚠ ${warnCount} Warning(s)`}
              </div>
              {liveValidation.errors.map((e, i) => <div key={i} style={{ fontSize: 10, color: "#ff8090", fontFamily: "var(--mono)", lineHeight: 1.6, marginBottom: 2, wordBreak: "break-word" }}>✖ {e}</div>)}
              {liveValidation.warnings.map((w, i) => <div key={i} style={{ fontSize: 10, color: "#DCDCAA", fontFamily: "var(--mono)", lineHeight: 1.6, marginBottom: 2, wordBreak: "break-word" }}>⚠ {w}</div>)}
            </div>
          )}
        </div>

        {/* ── EDITOR AREA ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* Tab bar */}
          <div style={{ display: "flex", background: "var(--bg3)", height: 36, flexShrink: 0, overflowX: "auto", overflowY: "hidden", alignItems: "flex-end", borderBottom: "1px solid var(--bdr)" }}>
            {tabs.map(t => { const tl = LANGS[t.lang] || LANGS.ts; return (
              <div key={t.id} className={`tab ${activeTab === t.id ? "on" : "off"}`} onClick={() => { setActiveTab(t.id); if (LANGS[t.lang]) switchLang(t.lang); }}>
                <span style={{ fontSize: 9, color: tl.c, fontWeight: 700, flexShrink: 0 }}>{tl.ic}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{t.name}</span>
                {t.dirty && <span style={{ fontSize: 12, color: "#4a5568" }}>●</span>}
                <span className="tx" onClick={e => closeTab(t.id, e)}>✕</span>
              </div>
            ); })}
            <div style={{ flex: 1 }} />
            <button className={`run-btn${running ? " running" : ""}`} onClick={handleRun} disabled={running} style={{ margin: "4px 8px", padding: "3px 10px", fontSize: 11 }}>
              {running ? "⟳" : "▶"} {running ? "Running…" : "Run"}
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="bc">
            <span>src</span>
            <span style={{ color: "var(--txt3)" }}>/</span>
            <span style={{ color: "#e0e0e0" }}>{curTab?.name || "—"}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#4a5568" }}>
              {activeCursors.length > 0 && `${activeCursors.length} peer${activeCursors.length > 1 ? "s" : ""} here · `}
              OT v{curEng.version}
            </span>
          </div>

          {/* Editor */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
            <CMEditor
              key={activeTab + lang}
              ref={activeEditorRef}
              lang={lang}
              initText={curEng.text}
              fileKey={activeTab}
              onLocalOp={handleLocalOp}
              onCursorMove={handleCursorMove}
              remoteOps={remOps}
              cursors={activeCursors}
              readOnly={false}
            />
          </div>

          {/* Output panel */}
          {outOpen && (
            <div className="out-panel" style={{ height: 200 }}>
              <div className="out-hdr">
                {[["output", "Output"], ["problems", `Problems (${errCount + warnCount})`]].map(([id, lb]) => (
                  <div key={id} className={`out-tab${outTab === id ? " on" : ""}`} onClick={() => setOutTab(id)}>
                    {id === "output" && outIsErr && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B9D", display: "inline-block" }} className="pulse" />}
                    {lb}
                  </div>
                ))}
                <div style={{ flex: 1 }} />
                <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#4a5568" }} onClick={() => setOutOpen(false)}>✕</div>
              </div>
              {outTab === "output" && (
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", background: "#0a0c10" }}>
                  {running
                    ? <div style={{ color: "#4FC1FF", fontFamily: "var(--mono)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="spin" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "1.5px solid #4FC1FF", borderTopColor: "transparent" }} />
                        Running {LANGS[lang]?.n}…
                      </div>
                    : renderOutput(output)}
                </div>
              )}
              {outTab === "problems" && (
                <div style={{ flex: 1, overflowY: "auto", background: "#0a0c10" }}>
                  {liveValidation && (errCount > 0 || warnCount > 0) ? (
                    <>
                      {liveValidation.errors.map((e, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, padding: "5px 14px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                          <span style={{ color: "#FF6B9D", flexShrink: 0 }}>⊗</span>
                          <span style={{ fontSize: 12, color: "#c0c8d8" }}>{e}</span>
                        </div>
                      ))}
                      {liveValidation.warnings.map((w, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, padding: "5px 14px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                          <span style={{ color: "#DCDCAA", flexShrink: 0 }}>⚠</span>
                          <span style={{ fontSize: 12, color: "#c0c8d8" }}>{w}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ padding: 20, textAlign: "center", color: "#4a5568", fontSize: 12 }}>✓ No problems detected</div>
                  )}
                </div>
              )}
            </div>
          )}

          {!outOpen && (
            <div style={{ height: 28, background: "var(--bg3)", borderTop: "1px solid var(--bdr)", display: "flex", alignItems: "center", padding: "0 12px", cursor: "pointer", gap: 6 }} onClick={() => setOutOpen(true)}>
              <span style={{ fontSize: 10, color: outIsErr ? "#FF6B9D" : "#4a5568" }}>{outIsErr ? "⊗ Errors in output" : "▲ Output"}</span>
              {(errCount + warnCount) > 0 && <span style={{ fontSize: 9, background: "#FF6B9D", color: "#fff", borderRadius: 10, padding: "1px 5px" }}>{errCount + warnCount}</span>}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ width: 200, background: "var(--bg2)", borderLeft: "1px solid var(--bdr)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--bdr)", flexShrink: 0, background: "var(--bg3)" }}>
            {[["crdt", "OT Ops"], ["ws", "Events"]].map(([id, lb]) => (
              <div key={id} className={`rp-tab${rpTab === id ? " on" : ""}`} onClick={() => setRpTab(id)} style={{ flex: 1, textAlign: "center" }}>{lb}</div>
            ))}
          </div>

          {rpTab === "crdt" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
              {crdt.map((op, i) => {
                const t = op.type || "retain";
                return (
                  <div key={i} className={`op-card ${t}`}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span className={`op-badge ${t}`}>{t.toUpperCase()}</span>
                      <span style={{ fontSize: 9, color: "#4a5568" }}>{op.t}</span>
                    </div>
                    {t === "insert" && <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "#4FC1FF", wordBreak: "break-all" }}>"{op.chars?.slice(0, 12)?.replace(/\n/g, "↵") || "…"}"@{op.pos}</div>}
                    {t === "delete" && <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "#ff6363" }}>del @{op.pos} len:{op.len}</div>}
                    {op.from && <div style={{ fontSize: 10, color: peers[op.from]?.color || "#4FC1FF", marginTop: 2 }}>{op.from}</div>}
                  </div>
                );
              })}
              {crdt.length === 0 && <div style={{ padding: "12px 8px", fontSize: 11, color: "#333", textAlign: "center" }}>No ops yet — start typing</div>}
            </div>
          )}

          {rpTab === "ws" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
              {wsLog.slice(0, 30).map((e, i) => (
                <div key={i} className={`ws-entry ${e.dir === "←" ? "in" : "out"}`}>
                  <span style={{ fontSize: 8, color: "#333", display: "block" }}>{e.t}</span>
                  {e.dir === "←" ? "↙" : "↗"} {e.msg}
                </div>
              ))}
              {wsLog.length === 0 && <div style={{ padding: 12, fontSize: 11, color: "#333", textAlign: "center" }}>No events yet</div>}
            </div>
          )}

          {/* Stats */}
          <div style={{ padding: "8px 10px", borderTop: "1px solid var(--bdr)", flexShrink: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "Ops", value: opCnt, color: "#4FC1FF" },
                { label: "OT Ver", value: `v${curEng.version}`, color: "#4EC9B0" },
                { label: "Size", value: `${curEng.text.length}ch`, color: "#DCDCAA" },
                { label: "Online", value: onlineCount, color: "#FF6B9D" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,.02)", borderRadius: 5, padding: "4px 7px" }}>
                  <div style={{ fontSize: 9, color: "#4a5568", textTransform: "uppercase" }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "var(--mono)" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div className="statusbar">
        <span className="st" style={{ color: "#4EC9B0" }}>⬡ {onlineCount} online</span>
        <span className="st" style={{ color: errCount > 0 ? "#FF6B9D" : "#4a5568" }} onClick={() => { setOutOpen(true); setOutTab("problems"); }}>
          ⊗ {errCount} · ⚠ {warnCount}
        </span>
        <span className="st" style={{ color: "#4FC1FF" }}>Supabase Realtime</span>
        <div style={{ flex: 1 }} />
        <span className="st">Ln {cursor.line}, Col {cursor.col}</span>
        <span className="st">UTF-8</span>
        <span className="st" style={{ color: me.color }}>● {me.name}</span>
        <span className="st" style={{ color: "#4EC9B0" }}>⬡ Live</span>
        <span className="st" style={{ color: "#4FC1FF" }}>CKC-OS v5.0</span>
      </div>

      {notif && <div className="toast">{notif}</div>}
    </>
  );
}

// ═══════════ ROOT APP ═══════════
export default function App() {
  const [authState, setAuthState] = useState(null); // null | { me, session }
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = await getSB();
      // Check for existing session
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        const { data: profile } = await sb.from("users").select("*").eq("id", session.user.id).single();
        const colorData = profile?.color || { hex: "#4FC1FF", bg: "rgba(79,193,255,.22)" };
        setAuthState({
          me: {
            id: session.user.id,
            name: profile?.username || session.user.email?.split("@")[0] || "User",
            email: session.user.email,
            color: colorData.hex || "#4FC1FF",
            bg: colorData.bg || "rgba(79,193,255,.22)",
            inits: initials(profile?.username || session.user.email?.split("@")[0] || "U"),
          },
          session,
        });
      }
      setChecking(false);

      // Listen for auth changes
      sb.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_OUT" || !session) { setAuthState(null); return; }
        if (event === "SIGNED_IN" && session.user) {
          const { data: profile } = await sb.from("users").select("*").eq("id", session.user.id).single();
          const colorData = profile?.color || { hex: "#4FC1FF", bg: "rgba(79,193,255,.22)" };
          setAuthState({
            me: {
              id: session.user.id,
              name: profile?.username || session.user.email?.split("@")[0] || "User",
              email: session.user.email,
              color: colorData.hex || "#4FC1FF",
              bg: colorData.bg || "rgba(79,193,255,.22)",
              inits: initials(profile?.username || session.user.email?.split("@")[0] || "U"),
            },
            session,
          });
        }
      });
    })();
  }, []);

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#080a0e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div className="auth-gem" style={{ width: 48, height: 48, borderRadius: 14, fontSize: 24 }}>⚡</div>
          <div style={{ color: "#4a5568", fontSize: 12, fontFamily: "var(--mono)" }}>Connecting to Supabase…</div>
        </div>
      </div>
    );
  }

  if (!authState) {
    return <AuthPage onAuth={(me, session) => setAuthState({ me, session })} />;
  }

  return <Shell me={authState.me} onLogout={() => setAuthState(null)} />;
}