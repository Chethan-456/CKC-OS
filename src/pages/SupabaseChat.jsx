import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import Editor from "@monaco-editor/react";
import GitBridge from './Gitbridge.jsx';

// ═══════════════════════════════════════════════════════════
// SUPABASE CREDENTIALS
// ═══════════════════════════════════════════════════════════
const SUPABASE_URL = "https://ejedxeonttqvgcicawkw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWR4ZW9udHRxdmdjaWNhd2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MzI4MTgsImV4cCI6MjA5MjQwODgxOH0.ZUWuWZ13J7TxR_a6vx7NAV20mXw00dHyzC82cJGNjDk";

let _sb = null;
async function getSB() {
  if (_sb) return _sb;
  if (!window.__supabaseLoaded) {
    await new Promise((res, rej) => {
      if (window.supabase) { res(); return; }
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      s.onload = () => { window.__supabaseLoaded = true; res(); };
      s.onerror = () => rej(new Error("Failed to load Supabase"));
      document.head.appendChild(s);
    });
  }
  _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 40 } },
  });
  return _sb;
}

// ═══════════ MONACO LOADER ═══════════
let _monacoLoaded = false;
let _monacoWaiters = [];
async function loadMonaco() {
  if (window.monaco) return window.monaco;
  if (_monacoLoaded) return new Promise(r => _monacoWaiters.push(r));
  _monacoLoaded = true;
  // Load AMD loader
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  await new Promise((res) => {
    window.require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs" } });
    window.require(["vs/editor/editor.main"], () => {
      _monacoWaiters.forEach(r => r(window.monaco));
      _monacoWaiters = [];
      res(window.monaco);
    });
  });
  return window.monaco;
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
  ts:   { n: "TypeScript", ext: "engine.ts",   ic: "TS", c: "#4FC1FF", bg: "rgba(79,193,255,.15)", monaco: "typescript" },
  js:   { n: "JavaScript", ext: "server.js",   ic: "JS", c: "#f7df1e", bg: "rgba(247,223,30,.13)", monaco: "javascript" },
  py:   { n: "Python",     ext: "model.py",    ic: "PY", c: "#4EC9B0", bg: "rgba(78,201,176,.15)", monaco: "python" },
  java: { n: "Java",       ext: "Main.java",   ic: "JV", c: "#ed8b00", bg: "rgba(237,139,0,.15)",  monaco: "java" },
  cpp:  { n: "C++",        ext: "main.cpp",    ic: "C+", c: "#9CDCFE", bg: "rgba(156,220,254,.15)",monaco: "cpp" },
  rs:   { n: "Rust",       ext: "main.rs",     ic: "RS", c: "#CE9178", bg: "rgba(206,145,120,.15)",monaco: "rust" },
  go:   { n: "Go",         ext: "main.go",     ic: "GO", c: "#00acd7", bg: "rgba(0,172,215,.15)",  monaco: "go" },
  sql:  { n: "SQL",        ext: "schema.sql",  ic: "SQ", c: "#DCDCAA", bg: "rgba(220,220,170,.15)",monaco: "sql" },
};
export const LK = ["ts","js","py","java","cpp","rs","go","sql"];

const STARTERS = {
  ts: `interface Config { port: number; debug: boolean; maxSessions: number; }
class CKCEngine {
  private config: Config;
  constructor(config: Config) { this.config = config; this.init(); }
  private init(): void { console.log(\`CKC Engine ready on port \${this.config.port}\`); }
  createSession(id: string) { console.log(\`Session created: \${id}\`); }
  broadcastOp(sessionId: string, op: unknown): void { console.log(\`Op broadcast: \${sessionId}\`); }
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
  java: `import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
public class WorkerPool {
    private final BlockingQueue<Runnable> queue = new LinkedBlockingQueue<>();
    private final AtomicInteger done = new AtomicInteger(0);
    private volatile boolean running = true;
    public WorkerPool(int size) {
        for (int i = 0; i < size; i++) {
            Thread t = new Thread(this::loop, "worker-" + i);
            t.setDaemon(true); t.start();
        }
    }
    private void loop() {
        while (running || !queue.isEmpty()) {
            try {
                Runnable task = queue.poll(100, TimeUnit.MILLISECONDS);
                if (task != null) { task.run(); done.incrementAndGet(); }
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); return; }
        }
    }
    public void submit(Runnable task) { queue.offer(task); }
    public int completed() { return done.get(); }
    public void shutdown() { running = false; }
    public static void main(String[] args) {
        WorkerPool pool = new WorkerPool(4);
        System.out.println("WorkerPool initialized with 4 threads.");
        pool.shutdown();
    }
}`,
  cpp: `#include <iostream>
using namespace std;
int main() {
    cout << "Hello, World!" << endl;
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
    scores.insert("Carol", 92);
    for (name, score) in &scores {
        println!("{}: {}", name, score);
    }
    println!("Total students: {}", scores.len());
}`,
  go: `package main
import "fmt"
func fibonacci(n int) int {
    if n <= 1 { return n }
    return fibonacci(n-1) + fibonacci(n-2)
}
func main() {
    fmt.Println("Fibonacci sequence:")
    for i := 0; i < 10; i++ {
        fmt.Printf("  fib(%d) = %d\\n", i, fibonacci(i))
    }
}`,
  sql: `-- CKC-OS Analytics Schema
CREATE TABLE users (
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
  return (n||"?").split(" ").map(w=>w[0]||"").join("").toUpperCase().slice(0,2)||"?";
}
function nowTs() {
  return new Date().toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

// ═══════════ VALIDATOR ═══════════
function validateCode(lang, code) {
  const errors=[], warnings=[], lines=code.split("\n"), trim=code.trim();
  function countBalance(open,close) {
    let depth=0,inStr=false,strChar="",inLC=false;
    for(let i=0;i<code.length;i++){
      const ch=code[i],prev=code[i-1];
      if(ch==="\n"){inLC=false;continue;}
      if(inLC)continue;
      if(!inStr&&ch==="/"&&code[i+1]==="/"){inLC=true;continue;}
      if(!inStr&&(ch==='"'||ch==="'"||ch==="`")){inStr=true;strChar=ch;continue;}
      if(inStr&&ch===strChar&&prev!=="\\"){inStr=false;continue;}
      if(inStr)continue;
      if(ch===open)depth++;
      if(ch===close)depth--;
    }
    return depth;
  }
  function hasUnclosedString(){
    for(let li=0;li<lines.length;li++){
      const l=lines[li].replace(/\\["'`]/g,"");
      let singles=0,doubles=0;
      for(const ch of l){if(ch==="'")singles++;if(ch==='"')doubles++;}
      if(singles%2!==0)return{line:li+1,char:"'"};
      if(doubles%2!==0)return{line:li+1,char:'"'};
    }
    return null;
  }
  if(lang==="ts"||lang==="js"){
    const bd=countBalance("{","}");if(bd>0)errors.push(`SyntaxError: ${bd} unclosed '{' brace(s)`);if(bd<0)errors.push(`SyntaxError: ${Math.abs(bd)} unexpected '}'`);
    const pd=countBalance("(",")");if(pd>0)errors.push(`SyntaxError: ${pd} unclosed '('`);if(pd<0)errors.push(`SyntaxError: ${Math.abs(pd)} unexpected ')'`);
    const strErr=hasUnclosedString();if(strErr)errors.push(`SyntaxError: Unterminated string (line ${strErr.line})`);
    if(lang==="ts")lines.forEach((l,i)=>{if(/^(export\s+)?interface\s+\w+\s*$/.test(l.trim()))errors.push(`SyntaxError (line ${i+1}): Interface missing body '{}'`);});
  }
  if(lang==="py"){
    lines.forEach((l,i)=>{const t=l.trim();if(/^print\s+"/.test(t)||/^print\s+'/.test(t))errors.push(`SyntaxError (line ${i+1}): Use print()`);if(/^(def|class)\s+\w+\s*\(.*\)\s*$/.test(t))errors.push(`SyntaxError (line ${i+1}): Missing ':'`);});
    if(lines.some(l=>/^\t/.test(l))&&lines.some(l=>/^  /.test(l)))errors.push("TabError: Mixed tabs and spaces");
  }
  if(lang==="java"){
    if(!trim.match(/public\s+class\s+(\w+)/))errors.push(`error: Missing 'public class'`);
    if(!trim.includes("public static void main"))errors.push(`error: main() not found`);
    const jb=countBalance("{","}");if(jb>0)errors.push(`error: ${jb} unclosed '{'`);
  }
  if(lang==="cpp"){
    if(!/#include\s*[<"]/.test(trim))errors.push(`fatal error: No #include`);
    if(!/int\s+main\s*\(/.test(trim))errors.push(`error: 'main' not found`);
  }
  if(lang==="rs"){
    if(!/fn\s+main\s*\(\s*\)/.test(trim))errors.push(`error[E0601]: main not found`);
    lines.forEach((l,i)=>{if(/println\s*\(/.test(l)&&!/println!\s*\(/.test(l))errors.push(`error (line ${i+1}): Use 'println!()'`);});
  }
  if(lang==="go"){
    const fe=lines.find(l=>l.trim()&&!l.trim().startsWith("//"));
    if(!fe||!fe.trim().startsWith("package "))errors.push(`expected 'package'`);
    if(!/func\s+main\s*\(\s*\)/.test(trim))errors.push(`func main() not found`);
  }
  if(lang==="sql"){
    const nc=code.replace(/--[^\n]*/g,"").replace(/\/\*[\s\S]*?\*\//g,"").trim();
    if(/\bUPDATE\b/i.test(nc)&&!/\bWHERE\b/i.test(nc))warnings.push(`SQL Warning: UPDATE without WHERE`);
    if(/\bDELETE\b/i.test(nc)&&!/\bWHERE\b/i.test(nc))warnings.push(`SQL Warning: DELETE without WHERE`);
  }
  return {
    hasError:errors.length>0, hasWarning:warnings.length>0, errors, warnings,
    output:errors.length>0
      ?[`❌ [${LANGS[lang]?.n||lang}] Compilation failed — ${errors.length} error(s):`,"",...errors.map(e=>`  ✖ ${e}`),...(warnings.length?["",...warnings.map(w=>`  ⚠ ${w}`)]:[]),"","Fix error(s) above and run again."].join("\n")
      :warnings.length>0?[`⚠ [${LANGS[lang]?.n||lang}] ${warnings.length} warning(s):`, ...warnings.map(w=>`  ⚠ ${w}`)].join("\n"):null
  };
}

// ═══════════ PYODIDE ═══════════
const pyState={py:null,loading:false,waiters:[]};
async function loadPy(){
  if(pyState.py)return pyState.py;
  if(pyState.loading)return new Promise(r=>pyState.waiters.push(r));
  pyState.loading=true;
  if(!document.getElementById("_pyscript")){
    await new Promise((res,rej)=>{const s=document.createElement("script");s.id="_pyscript";s.src="https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  }
  const py=await window.loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"});
  py.runPython(`import sys,io as _io\nclass _Cap(_io.StringIO):pass\n_sc=_Cap();_ec=_Cap()`);
  pyState.py=py;pyState.waiters.forEach(r=>r(py));pyState.waiters=[];
  return py;
}
async function runPython(code){
  const py=await loadPy();
  py.runPython(`_sc=_Cap();_ec=_Cap();sys.stdout=_sc;sys.stderr=_ec`);
  let hasError=false,errorMsg="";
  try{py.runPython(code);}catch(e){hasError=true;errorMsg=String(e).replace(/^PythonError:\s*/i,"").split("\n").filter(l=>!l.includes("pyodide")&&!l.includes("    at ")).join("\n").trim();}
  const stdout=py.runPython("_sc.getvalue()");const stderr=py.runPython("_ec.getvalue()");
  py.runPython("sys.stdout=sys.__stdout__;sys.stderr=sys.__stderr__");
  let output="";if(stdout)output+=stdout;if(stderr&&!hasError)output+=(output?"\n":"")+stderr;if(hasError)output+=(output?"\n":"")+errorMsg;
  return{output:output.trim(),hasError,errorMsg:hasError?errorMsg:""};
}

// ═══════════ JS/TS RUNNER ═══════════
function runJS(code,isTS){
  return new Promise(resolve=>{
    const logs=[],errors=[];
    let src=isTS?code.replace(/^\s*import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm,"").replace(/interface\s+\w[\w\s]*\{[^}]*\}/gs,"").replace(/type\s+\w+\s*=\s*[^;{]+;/g,"").replace(/:\s*\w[\w<>\[\]|&\s,?]*/g,"").replace(/\bprivate\b|\bpublic\b|\bprotected\b|\breadonly\b|\bdeclare\b/g,"").replace(/<\w[\w\s,<>]*>/g,"").replace(/^\s*export\s+(default\s+)?/gm,"").replace(/^\s*abstract\s+/gm,""):code;
    const iframe=document.createElement("iframe");iframe.style.display="none";document.body.appendChild(iframe);const win=iframe.contentWindow;
    win.console={log:(...a)=>logs.push(a.map(x=>typeof x==="object"?JSON.stringify(x,null,2):String(x)).join(" ")),error:(...a)=>errors.push(a.map(String).join(" ")),warn:(...a)=>logs.push("⚠ "+a.map(String).join(" ")),info:(...a)=>logs.push(a.map(String).join(" "))};
    let hasError=false,errorMsg="";
    try{win.eval(src);}catch(e){hasError=true;errorMsg=e.stack||e.message||String(e);}
    document.body.removeChild(iframe);
    const out=[...logs];if(hasError)out.push(errorMsg);
    resolve({output:out.join("\n")||(hasError?"":"(no output)"),hasError,errorMsg});
  });
}

// ═══════════ COMPILED SIMULATORS ═══════════
function simulateCompiled(lang,code){
  const outputs=[];
  if(lang==="java"){const m=code.match(/public\s+class\s+(\w+)/);outputs.push(`Compiled: ${m?m[1]:"Main"}.class`);const ps=code.match(/System\.out\.println\s*\(([^)]+)\)/g)||[];ps.forEach(p=>{const a=p.replace(/System\.out\.println\s*\(\s*/,"").replace(/\)\s*$/,"").trim();if(a.startsWith('"')&&a.endsWith('"'))outputs.push(a.slice(1,-1));else outputs.push(`[${a}]`);});if(outputs.length===1)outputs.push("Process finished with exit code 0");}
  if(lang==="cpp"){outputs.push(`g++ -std=c++17 -o main main.cpp`);const cs=code.match(/cout\s*<<\s*"([^"]+)"/g)||[];cs.forEach(c=>{const m=c.match(/"([^"]+)"/);if(m)outputs.push(m[1]);});outputs.push("Process finished with exit code 0");}
  if(lang==="rs"){outputs.push(`   Compiling main v0.1.0`);outputs.push(`    Finished release [optimized]`);outputs.push(`     Running target/release/main`);const ps=code.match(/println!\s*\("([^"]+)"[^)]*\)/g)||[];ps.forEach(p=>{const m=p.match(/println!\s*\("([^"]+)"/);if(m)outputs.push(m[1].replace(/\{\}/g,"[value]"));});if(ps.length===0)outputs.push("(no output)");}
  if(lang==="go"){outputs.push(`go run main.go`);const ps=code.match(/fmt\.Println\s*\(([^)]+)\)/g)||[];ps.forEach(p=>{const m=p.match(/fmt\.Println\s*\(\s*"([^"]+)"/);if(m)outputs.push(m[1]);else{const vm=p.match(/fmt\.Println\s*\((.+)\)/);if(vm)outputs.push(`[${vm[1].trim()}]`);}});const pf=code.match(/fmt\.Printf\s*\("([^"]+)"/g)||[];pf.forEach(p=>{const m=p.match(/fmt\.Printf\s*\("([^"]+)"/);if(m)outputs.push(m[1].replace(/\\n/g,"").replace(/%[dsfvq]/g,"[value]").trim());});if(outputs.length===1)outputs.push("(no output)");outputs.push("\nProcess finished with exit code 0");}
  if(lang==="sql"){const stmts=code.split(";").map(s=>s.trim()).filter(Boolean);stmts.forEach(stmt=>{const u=stmt.toUpperCase();if(/^\s*--/.test(stmt))return;if(/CREATE TABLE/i.test(u)){const m=stmt.match(/CREATE TABLE\s+(\w+)/i);outputs.push(`Query OK — Table '${m?m[1]:"table"}' created`);}else if(/INSERT/i.test(u))outputs.push(`Query OK, ${Math.floor(Math.random()*5)+1} row(s) affected`);else if(/SELECT/i.test(u))outputs.push(`${Math.floor(Math.random()*20)+1} row(s) in set`);else if(/UPDATE/i.test(u))outputs.push(`Query OK, ${Math.floor(Math.random()*3)+1} row(s) affected`);else if(/DELETE/i.test(u))outputs.push(`Query OK, ${Math.floor(Math.random()*3)+1} row(s) deleted`);else outputs.push(`Query OK`);});}
  return{output:outputs.join("\n"),hasError:false};
}

export async function validateAndRun(lang,code,pyReady,setPyReady){
  const v=validateCode(lang,code);
  if(v.hasError)return{output:v.output,hasError:true,errorMsg:v.output};
  let result;
  if(lang==="py"){if(!pyReady){await loadPy();setPyReady(true);}result=await runPython(code);}
  else if(lang==="js"||lang==="ts"){result=await runJS(code,lang==="ts");if(v.hasWarning&&result.output)result={...result,output:v.output+"\n\n"+result.output};}
  else{await new Promise(r=>setTimeout(r,350));result=simulateCompiled(lang,code);if(v.hasWarning)result={...result,output:v.output+"\n\n"+result.output};}
  return result;
}

// ═══════════ OT ENGINE ═══════════
class OTEngine {
  constructor(text=""){this.text=text;this.version=0;this.history=[];this._subs=[];}
  subscribe(fn){this._subs.push(fn);return()=>{this._subs=this._subs.filter(f=>f!==fn);};}
  _emit(op){this._subs.forEach(fn=>fn(op,this.text,this.version));}
  static xform(a,b){
    let r={...b};
    if(a.type==="insert"&&b.type==="insert"){if(a.pos<b.pos||(a.pos===b.pos&&a.uid<b.uid))r.pos=b.pos+a.chars.length;}
    else if(a.type==="insert"&&b.type==="delete"){if(a.pos<=b.pos)r.pos=b.pos+a.chars.length;}
    else if(a.type==="delete"&&b.type==="insert"){if(a.pos<b.pos)r.pos=Math.max(b.pos-a.len,a.pos);}
    else if(a.type==="delete"&&b.type==="delete"){if(a.pos<b.pos)r.pos=Math.max(b.pos-a.len,a.pos);else if(a.pos===b.pos)r.skip=true;}
    return r;
  }
  apply(op){
    let x={...op};
    const conc=this.history.filter(h=>h.ver>(op.baseVer??this.version));
    for(const h of conc)x=OTEngine.xform(h,x);
    if(x.skip)return null;
    if(x.type==="insert"){const p=Math.max(0,Math.min(x.pos,this.text.length));this.text=this.text.slice(0,p)+x.chars+this.text.slice(p);}
    else if(x.type==="delete"){const p=Math.max(0,Math.min(x.pos,this.text.length));const l=Math.min(x.len,this.text.length-p);if(l>0)this.text=this.text.slice(0,p)+this.text.slice(p+l);}
    this.version++;const rec={...x,ver:this.version};this.history.push(rec);
    if(this.history.length>300)this.history=this.history.slice(-150);
    this._emit(rec);return rec;
  }
  reset(t){this.text=t;this.version=0;this.history=[];}
}

const localEngines={};
function getLocalEng(lk){if(!localEngines[lk])localEngines[lk]=new OTEngine(STARTERS[lk]||"");return localEngines[lk];}

// ═══════════ SERVER LOGS ═══════════
const LOG_TEMPLATES=[
  {level:"INFO",svc:"api-gateway",msg:"GET /api/status 200 12ms"},
  {level:"INFO",svc:"ws-server",msg:"Client connected [id: {id}]"},
  {level:"INFO",svc:"db-pool",msg:"Query executed in {n}ms — rows: {r}"},
  {level:"SUCCESS",svc:"auth-svc",msg:"Token validated for user:{id}"},
  {level:"INFO",svc:"cache",msg:"HIT ratio: {n}% — evictions: {r}"},
  {level:"DEBUG",svc:"scheduler",msg:"Job run:{id} queued (next: {n}s)"},
  {level:"WARN",svc:"api-gateway",msg:"Rate limit approaching — {n} req/s"},
  {level:"WARN",svc:"db-pool",msg:"Slow query detected: {n}ms"},
  {level:"ERROR",svc:"api-gateway",msg:"POST /api/ingest 500 — timeout after {n}ms"},
  {level:"ERROR",svc:"auth-svc",msg:"Invalid token — revoked session:{id}"},
  {level:"INFO",svc:"ws-server",msg:"OT op broadcast — ver:{n} clients:{r}"},
  {level:"SUCCESS",svc:"cache",msg:"Cache warmed — {n} keys loaded"},
  {level:"DEBUG",svc:"scheduler",msg:"Health check OK — uptime {n}s"},
];
function genLogEntry(){
  const t=LOG_TEMPLATES[Math.floor(Math.random()*LOG_TEMPLATES.length)];
  const id=Math.random().toString(36).slice(2,7);
  const n=Math.floor(Math.random()*900+10);
  const r=Math.floor(Math.random()*200+1);
  const msg=t.msg.replace(/\{id\}/g,id).replace(/\{n\}/g,n).replace(/\{r\}/g,r);
  return{level:t.level,svc:t.svc,msg,t:nowTs(),id:Math.random().toString(36).slice(2)};
}

// ═══════════ CSS ═══════════
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;overflow:hidden;}
body{font-family:'Inter',system-ui,sans-serif;background:#0d0f14;color:#e0e0e0;font-size:13px;}
:root{--bg:#0d0f14;--bg2:#151820;--bg3:#1c1f28;--bdr:rgba(255,255,255,.08);--bdr2:rgba(255,255,255,.05);--txt:#e0e0e0;--txt2:#8892a4;--txt3:#4a5568;--blue:#4FC1FF;--grn:#4EC9B0;--pink:#FF6B9D;--ylw:#DCDCAA;--sel:rgba(79,193,255,.12);--mono:'JetBrains Mono',Consolas,monospace;}
::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px;}::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.18);}

.auth-wrap{min-height:100vh;background:#080a0e;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
.auth-bg{position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(79,193,255,.06) 0%,transparent 70%),radial-gradient(ellipse 40% 40% at 80% 80%,rgba(78,201,176,.04) 0%,transparent 60%);pointer-events:none;}
.auth-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;}
.auth-glass{background:rgba(21,24,32,.9);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px;backdrop-filter:blur(20px);box-shadow:0 40px 100px rgba(0,0,0,.8);}
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

.topbar{height:46px;background:var(--bg2);border-bottom:1px solid var(--bdr);display:flex;align-items:center;padding:0 10px;gap:6px;flex-shrink:0;}
.tb-logo{display:flex;align-items:center;gap:6px;font-weight:700;font-size:.88rem;color:#fff;padding:0 6px;white-space:nowrap;}
.gem{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#4FC1FF,#4EC9B0);display:flex;align-items:center;justify-content:center;font-size:11px;}
.lp{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:5px;cursor:pointer;font-family:var(--mono);font-size:11px;font-weight:700;border:1px solid transparent;transition:all .12s;white-space:nowrap;}
.lp:hover{background:rgba(255,255,255,.06);}.lp.on{border-color:rgba(255,255,255,.15);}
.av{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--mono);border:2px solid transparent;transition:all .15s;flex-shrink:0;position:relative;}
.av:hover{transform:translateY(-2px);z-index:2;}.av.me{border-color:rgba(255,255,255,.4);}
.av .online-dot{position:absolute;bottom:-2px;right:-2px;width:7px;height:7px;border-radius:50%;border:1.5px solid var(--bg2);}
.new-ed-btn{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:6px;background:rgba(79,193,255,.12);border:1px solid rgba(79,193,255,.3);color:#4FC1FF;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.new-ed-btn:hover{background:rgba(79,193,255,.2);}
.run-btn{display:flex;align-items:center;gap:5px;padding:5px 14px;border-radius:5px;background:rgba(78,201,176,.15);border:1px solid rgba(78,201,176,.35);color:#4EC9B0;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;white-space:nowrap;}
.run-btn:hover{background:rgba(78,201,176,.25);border-color:#4EC9B0;}.run-btn.running{background:rgba(255,107,157,.12);border-color:rgba(255,107,157,.35);color:#FF6B9D;}.run-btn:disabled{opacity:.5;cursor:not-allowed;}
.tool-btn{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#8892a4;transition:all .15s;white-space:nowrap;}
.tool-btn:hover{background:rgba(255,255,255,.08);color:#e0e0e0;}
.tool-btn.dbg{background:rgba(255,107,157,.08);border-color:rgba(255,107,157,.2);color:#FF6B9Daa;}.tool-btn.dbg:hover{background:rgba(255,107,157,.18);color:#FF6B9D;}
.tool-btn.logs{background:rgba(79,193,255,.07);border-color:rgba(79,193,255,.18);color:#4FC1FFaa;}.tool-btn.logs:hover{background:rgba(79,193,255,.18);color:#4FC1FF;}

.sidebar{width:240px;background:var(--bg2);border-right:1px solid var(--bdr);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;}
.sec-hdr{padding:10px 12px 5px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt3);}
.ft{display:flex;align-items:center;gap:7px;height:26px;cursor:pointer;padding:0 10px;font-size:12px;white-space:nowrap;border-radius:4px;margin:0 4px 1px;}
.ft:hover{background:rgba(255,255,255,.05);}.ft.sel{background:var(--sel);}
.presence-card{display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:6px;margin:0 4px 2px;transition:background .15s;cursor:default;}
.presence-card:hover{background:rgba(255,255,255,.04);}
.presence-av{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:var(--mono);flex-shrink:0;border:2px solid transparent;position:relative;}
.presence-av .pdot{position:absolute;bottom:-2px;right:-2px;width:8px;height:8px;border-radius:50%;border:2px solid var(--bg2);}
.presence-info{flex:1;min-width:0;}.presence-name{font-size:12px;color:#e0e0e0;font-weight:500;display:flex;align-items:center;gap:5px;}.presence-pos{font-size:10px;margin-top:1px;}
.presence-typing{display:flex;align-items:center;gap:3px;}.typing-dot{width:4px;height:4px;border-radius:50%;display:inline-block;}

.tab{display:flex;align-items:center;gap:5px;padding:0 12px 0 14px;height:36px;border-right:1px solid var(--bdr2);cursor:pointer;font-size:12px;white-space:nowrap;flex-shrink:0;max-width:180px;position:relative;font-family:var(--mono);}
.tab.on{background:var(--bg);border-bottom:2px solid var(--blue);color:#e0e0e0;}.tab.off{background:var(--bg3);color:var(--txt2);}
.tab:hover .tx{opacity:1;}.tx{opacity:0;width:14px;height:14px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:11px;margin-left:auto;flex-shrink:0;color:var(--txt2);}
.tx:hover{background:rgba(255,255,255,.1);color:#fff;}

.out-panel{background:#0a0c10;border-top:1px solid var(--bdr);display:flex;flex-direction:column;flex-shrink:0;}
.out-hdr{display:flex;align-items:center;background:var(--bg3);border-bottom:1px solid var(--bdr);height:32px;flex-shrink:0;}
.out-tab{padding:0 14px;height:100%;display:flex;align-items:center;cursor:pointer;font-size:11px;font-weight:600;color:var(--txt2);border-bottom:2px solid transparent;gap:5px;}
.out-tab.on{color:#fff;border-bottom-color:var(--blue);}.out-tab:hover:not(.on){color:var(--txt);}
.rp-tab{padding:5px 14px;cursor:pointer;font-size:11px;font-weight:600;color:var(--txt2);border-bottom:2px solid transparent;white-space:nowrap;}
.rp-tab.on{color:var(--txt);border-bottom-color:var(--blue);}.rp-tab:hover:not(.on){color:var(--txt);}

.op-card{border-radius:6px;padding:7px 10px;margin-bottom:5px;animation:fadeIn .2s ease both;}
.op-card.insert{background:rgba(79,193,255,.08);border:1px solid rgba(79,193,255,.2);}
.op-card.retain{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);}
.op-card.delete{background:rgba(255,99,99,.07);border:1px solid rgba(255,99,99,.18);}
.op-badge{font-size:9px;font-weight:700;letter-spacing:.08em;padding:2px 6px;border-radius:3px;}
.op-badge.insert{background:rgba(79,193,255,.2);color:#4FC1FF;}.op-badge.retain{background:rgba(255,255,255,.08);color:var(--txt2);}.op-badge.delete{background:rgba(255,99,99,.15);color:#ff6363;}

.ws-entry{font-family:var(--mono);font-size:10px;padding:4px 6px;border-radius:4px;margin-bottom:3px;border-left:2px solid;word-break:break-all;line-height:1.6;animation:fadeIn .2s ease both;}
.ws-entry.in{background:rgba(78,201,176,.06);border-color:#4EC9B0;color:#4EC9B0bb;}.ws-entry.out{background:rgba(79,193,255,.06);border-color:#4FC1FF;color:#4FC1FFbb;}

.bc{height:24px;display:flex;align-items:center;padding:0 14px;gap:5px;font-size:11px;color:var(--txt2);background:var(--bg);border-bottom:1px solid var(--bdr2);flex-shrink:0;font-family:var(--mono);}
.statusbar{height:24px;background:#080a0d;border-top:1px solid var(--bdr);display:flex;align-items:center;padding:0 4px;flex-shrink:0;font-size:11px;color:var(--txt2);font-family:var(--mono);}
.st{display:flex;align-items:center;padding:0 8px;height:100%;cursor:pointer;gap:4px;white-space:nowrap;transition:background .1s;}
.st:hover{background:rgba(255,255,255,.05);}
.divider{height:1px;background:var(--bdr);margin:5px 0;}
.mm{width:52px;background:#0a0c10;border-left:1px solid var(--bdr2);flex-shrink:0;overflow:hidden;position:relative;opacity:.6;}
.py-badge{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;white-space:nowrap;flex-shrink:0;}
.new-tab-dot{width:6px;height:6px;border-radius:50%;background:#4EC9B0;box-shadow:0 0 6px #4EC9B0;display:inline-block;}
.live-badge{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(78,201,176,.08);border:1px solid rgba(78,201,176,.2);font-size:10px;font-weight:700;color:#4EC9B0;letter-spacing:.06em;white-space:nowrap;}
.live-dot{width:6px;height:6px;border-radius:50%;background:#4EC9B0;box-shadow:0 0 6px #4EC9B0;}
.val-pass{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(78,201,176,.08);border:1px solid rgba(78,201,176,.2);font-size:10px;font-weight:700;color:#4EC9B0;}
.val-fail{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(255,107,157,.1);border:1px solid rgba(255,107,157,.25);font-size:10px;font-weight:700;color:#FF6B9D;}
.val-warn{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(220,220,170,.08);border:1px solid rgba(220,220,170,.2);font-size:10px;font-weight:700;color:#DCDCAA;}

.err-ov{position:fixed;inset:0;z-index:800;display:flex;align-items:flex-start;justify-content:center;padding-top:54px;pointer-events:none;}
.err-box{pointer-events:all;width:700px;max-width:calc(100vw - 20px);background:#120607;border:1.5px solid rgba(255,107,157,.55);border-radius:12px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,107,157,.1),0 28px 70px rgba(0,0,0,.9);}
.err-head{display:flex;align-items:center;gap:10px;padding:11px 15px;background:rgba(255,107,157,.08);border-bottom:1px solid rgba(255,107,157,.2);}
.err-title{font-weight:700;font-size:13px;color:#FF6B9D;flex:1;}
.err-lang-pill{font-size:10px;font-weight:700;font-family:var(--mono);padding:2px 9px;border-radius:100px;background:rgba(255,107,157,.15);color:#FF6B9D;border:1px solid rgba(255,107,157,.3);}
.err-close{width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#FF6B9D;font-size:13px;background:rgba(255,107,157,.1);border:1px solid rgba(255,107,157,.2);line-height:1;transition:all .15s;}
.err-close:hover{background:rgba(255,107,157,.28);}
.err-body{padding:13px 16px;font-family:var(--mono);font-size:12px;line-height:1.75;max-height:260px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;}
.err-foot{padding:8px 15px;background:rgba(255,107,157,.04);border-top:1px solid rgba(255,107,157,.1);display:flex;align-items:center;justify-content:space-between;}
.err-hint{font-size:10px;color:rgba(255,107,157,.45);}
.err-view-btn{background:rgba(255,107,157,.12);border:1px solid rgba(255,107,157,.3);color:#FF6B9D;border-radius:5px;padding:3px 11px;font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;font-weight:600;transition:all .15s;}
.err-view-btn:hover{background:rgba(255,107,157,.22);}
.ol-ok{color:#4EC9B0;}.ol-err{color:#FF6B9D;}.ol-warn{color:#DCDCAA;}.ol-info{color:#e0e0e0;}.ol-dim{color:#6a7a8a;}.ol-tb{color:#8892a4;}.ol-build{color:#4FC1FF;}.ol-success{color:#4EC9B0;}

.cp-ov{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.6);display:flex;justify-content:center;padding-top:70px;}
.cp-box{width:560px;max-height:400px;background:var(--bg3);border:1px solid var(--bdr);border-radius:8px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.7);}
.cp-in{padding:10px 14px;font-size:13px;background:transparent;color:#fff;border:none;outline:none;border-bottom:1px solid var(--bdr);font-family:inherit;width:100%;}
.cp-row{padding:7px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:12px;}
.cp-row:hover,.cp-row.hi{background:var(--sel);}
.toast{position:fixed;bottom:30px;right:14px;background:var(--bg3);border:1px solid var(--bdr);border-radius:6px;padding:8px 14px;font-size:12px;z-index:999;max-width:300px;box-shadow:0 6px 24px rgba(0,0,0,.5);animation:fadeIn .2s ease both;}

.dbg-room-overlay{position:fixed;inset:0;z-index:850;display:flex;align-items:center;justify-content:center;background:rgba(5,7,12,.82);backdrop-filter:blur(4px);}
.dbg-room{width:720px;max-width:calc(100vw - 24px);max-height:calc(100vh - 60px);background:#10131a;border:1.5px solid rgba(255,107,157,.3);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 0 0 1px rgba(255,107,157,.08),0 32px 80px rgba(0,0,0,.95);}
.dbg-room-head{display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(255,107,157,.07);border-bottom:1px solid rgba(255,107,157,.18);flex-shrink:0;}
.dbg-room-title{font-size:13px;font-weight:700;color:#FF6B9D;flex:1;}
.dbg-room-body{display:flex;flex:1;min-height:0;overflow:hidden;}
.dbg-errors-panel{width:240px;border-right:1px solid rgba(255,255,255,.06);overflow-y:auto;padding:8px;}
.dbg-error-item{padding:7px 9px;border-radius:7px;margin-bottom:5px;cursor:pointer;transition:background .12s;border:1px solid transparent;}
.dbg-error-item:hover{background:rgba(255,107,157,.07);border-color:rgba(255,107,157,.15);}.dbg-error-item.sel{background:rgba(255,107,157,.1);border-color:rgba(255,107,157,.3);}
.dbg-chat-panel{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.dbg-chat-messages{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:7px;}
.dbg-msg{display:flex;gap:8px;animation:fadeIn .18s ease both;}
.dbg-msg-bubble{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:8px 8px 8px 3px;padding:7px 10px;max-width:85%;font-size:12px;line-height:1.65;}
.dbg-msg-bubble.me{background:rgba(79,193,255,.1);border-color:rgba(79,193,255,.2);border-radius:8px 8px 3px 8px;margin-left:auto;}
.dbg-msg-bubble.bot{background:rgba(255,107,157,.07);border-color:rgba(255,107,157,.18);}
.dbg-msg-time{font-size:9px;color:#4a5568;margin-top:3px;font-family:var(--mono);}
.dbg-chat-input-row{display:flex;gap:6px;padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;}
.dbg-chat-input{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:7px;padding:7px 12px;color:#e0e0e0;font-size:12px;font-family:'Inter',sans-serif;outline:none;transition:border-color .15s;}
.dbg-chat-input:focus{border-color:rgba(255,107,157,.4);}
.dbg-send-btn{padding:7px 14px;border-radius:7px;background:rgba(255,107,157,.15);border:1px solid rgba(255,107,157,.35);color:#FF6B9D;font-size:11px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;white-space:nowrap;}
.dbg-send-btn:hover{background:rgba(255,107,157,.28);}
.dbg-fix-btn{padding:3px 9px;border-radius:5px;background:rgba(78,201,176,.12);border:1px solid rgba(78,201,176,.3);color:#4EC9B0;font-size:10px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;margin-top:4px;display:inline-flex;align-items:center;gap:4px;}
.dbg-fix-btn:hover{background:rgba(78,201,176,.25);}
.dbg-room-foot{display:flex;align-items:center;gap:10px;padding:8px 16px;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.015);flex-shrink:0;}
.dbg-stat{font-size:10px;color:#4a5568;display:flex;align-items:center;gap:4px;}.dbg-stat span{color:#8892a4;}
.err-type-badge{display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;font-family:var(--mono);background:rgba(255,107,157,.15);color:#FF6B9D;border:1px solid rgba(255,107,157,.25);}
.warn-type-badge{display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;font-family:var(--mono);background:rgba(220,220,170,.12);color:#DCDCAA;border:1px solid rgba(220,220,170,.2);}

.logs-overlay{position:fixed;inset:0;z-index:860;display:flex;align-items:center;justify-content:center;background:rgba(5,7,12,.82);backdrop-filter:blur(4px);}
.logs-panel{width:860px;max-width:calc(100vw - 24px);height:calc(100vh - 80px);background:#0a0c11;border:1.5px solid rgba(79,193,255,.25);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 32px 80px rgba(0,0,0,.95);}
.logs-head{display:flex;align-items:center;gap:10px;padding:11px 16px;background:rgba(79,193,255,.06);border-bottom:1px solid rgba(79,193,255,.15);flex-shrink:0;}
.logs-title{font-size:13px;font-weight:700;color:#4FC1FF;flex:1;}
.logs-controls{display:flex;align-items:center;gap:6px;}
.log-filter-btn{padding:3px 9px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--mono);border:1px solid transparent;transition:all .12s;background:rgba(255,255,255,.04);color:#4a5568;}
.log-filter-btn.active-INFO{background:rgba(79,193,255,.15);border-color:rgba(79,193,255,.3);color:#4FC1FF;}
.log-filter-btn.active-WARN{background:rgba(220,220,170,.1);border-color:rgba(220,220,170,.25);color:#DCDCAA;}
.log-filter-btn.active-ERROR{background:rgba(255,107,157,.12);border-color:rgba(255,107,157,.3);color:#FF6B9D;}
.log-filter-btn.active-DEBUG{background:rgba(197,134,192,.1);border-color:rgba(197,134,192,.25);color:#C586C0;}
.log-filter-btn.active-SUCCESS{background:rgba(78,201,176,.1);border-color:rgba(78,201,176,.25);color:#4EC9B0;}
.log-filter-btn.active-ALL{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18);color:#e0e0e0;}
.logs-body{flex:1;overflow:hidden;display:flex;flex-direction:column;}
.logs-stats-bar{display:flex;align-items:center;border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;background:rgba(255,255,255,.015);}
.logs-stat-item{padding:6px 14px;font-size:10px;font-weight:700;font-family:var(--mono);border-right:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:5px;}
.logs-stream{flex:1;overflow-y:auto;padding:4px 0;}
.log-entry{display:flex;align-items:flex-start;padding:4px 14px;border-bottom:1px solid rgba(255,255,255,.025);font-family:var(--mono);font-size:11.5px;line-height:1.55;transition:background .1s;cursor:default;}
.log-entry:hover{background:rgba(255,255,255,.025);}
.log-entry.ERROR{border-left:2px solid rgba(255,107,157,.5);}.log-entry.WARN{border-left:2px solid rgba(220,220,170,.4);}.log-entry.SUCCESS{border-left:2px solid rgba(78,201,176,.4);}.log-entry.INFO{border-left:2px solid rgba(79,193,255,.2);}.log-entry.DEBUG{border-left:2px solid rgba(197,134,192,.25);}
.log-ts{color:#2d3748;width:82px;flex-shrink:0;font-size:10px;padding-top:1px;}
.log-level-pill{width:58px;flex-shrink:0;display:flex;align-items:center;}
.log-level-inner{font-size:9px;font-weight:800;letter-spacing:.06em;padding:1px 5px;border-radius:3px;}
.log-level-inner.INFO{background:rgba(79,193,255,.18);color:#4FC1FF;}.log-level-inner.WARN{background:rgba(220,220,170,.14);color:#DCDCAA;}.log-level-inner.ERROR{background:rgba(255,107,157,.18);color:#FF6B9D;}.log-level-inner.DEBUG{background:rgba(197,134,192,.14);color:#C586C0;}.log-level-inner.SUCCESS{background:rgba(78,201,176,.15);color:#4EC9B0;}
.log-svc{width:90px;flex-shrink:0;font-size:10px;color:#4a5568;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-top:1px;}
.log-msg{flex:1;color:#c0c8d8;word-break:break-all;}.log-msg.ERROR{color:#ff8090;}.log-msg.WARN{color:#DCDCAA;}.log-msg.SUCCESS{color:#4EC9B0;}.log-msg.DEBUG{color:#C586C0cc;}
.logs-foot{display:flex;align-items:center;padding:6px 14px;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.01);gap:10px;flex-shrink:0;}
.logs-streaming-dot{width:7px;height:7px;border-radius:50%;background:#4EC9B0;box-shadow:0 0 6px #4EC9B0;}.logs-streaming-dot.paused{background:#4a5568;box-shadow:none;}
.log-search{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:5px;padding:4px 10px;color:#e0e0e0;font-size:11px;font-family:var(--mono);outline:none;width:180px;transition:border-color .15s;}
.log-search:focus{border-color:rgba(79,193,255,.35);}
.logs-pause-btn{padding:4px 12px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#8892a4;transition:all .15s;}
.logs-pause-btn:hover{background:rgba(255,255,255,.08);}.logs-pause-btn.paused{background:rgba(78,201,176,.12);border-color:rgba(78,201,176,.3);color:#4EC9B0;}
.logs-clear-btn{padding:4px 12px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;border:1px solid rgba(255,107,157,.2);background:rgba(255,107,157,.06);color:#FF6B9D66;transition:all .15s;}
.logs-clear-btn:hover{background:rgba(255,107,157,.15);color:#FF6B9D;}

.monaco-wrap{flex:1;overflow:hidden;position:relative;}
.monaco-loading{height:100%;display:flex;align-items:center;justify-content:center;background:#0d0f14;flex-direction:column;gap:12px;color:#4a5568;}

@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.fi{animation:fadeIn .18s cubic-bezier(.34,1.4,.64,1) both;}
@keyframes errSlide{from{opacity:0;transform:translateY(-16px) scale(.97)}to{opacity:1;transform:none}}
.err-slide{animation:errSlide .2s cubic-bezier(.34,1.2,.64,1) both;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}.pulse{animation:pulse 1.8s ease-in-out infinite;}
@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .7s linear infinite;}
@keyframes typingBounce{0%,80%,100%{transform:scale(0);opacity:.5}40%{transform:scale(1);opacity:1}}
@keyframes errShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}.err-shake{animation:errShake .35s ease both;}
@keyframes valPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}.val-pop{animation:valPop .25s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes logSlide{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}.log-slide{animation:logSlide .18s ease both;}
@keyframes announcePop{0%{opacity:0;transform:scale(.93) translateY(4px)}100%{opacity:1;transform:none}}.announce-pop{animation:announcePop .22s cubic-bezier(.34,1.4,.64,1) both;}
.lock-toast{position:fixed;top:54px;left:50%;transform:translateX(-50%);background:rgba(20,8,14,.95);border:1.5px solid rgba(255,107,157,.5);border-radius:8px;padding:9px 20px;font-size:12px;font-weight:600;color:#FF6B9D;z-index:9999;pointer-events:none;box-shadow:0 8px 28px rgba(0,0,0,.7);animation:fadeIn .18s ease both;white-space:nowrap;display:flex;align-items:center;gap:8px;}
.lock-toast-icon{font-size:14px;}
.sess-wrap{min-height:100vh;background:#080a0e;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
.sess-glass{background:rgba(21,24,32,.92);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px;backdrop-filter:blur(20px);box-shadow:0 40px 100px rgba(0,0,0,.8);width:480px;max-width:calc(100vw - 32px);}
.sess-id-box{background:#0d0f14;border:1px solid rgba(79,193,255,.2);border-radius:10px;padding:14px 18px;font-family:var(--mono);font-size:22px;font-weight:700;color:#4FC1FF;letter-spacing:.15em;text-align:center;cursor:pointer;transition:all .2s;user-select:all;}
.sess-id-box:hover{border-color:rgba(79,193,255,.4);background:rgba(79,193,255,.05);}
.sess-join-input{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px 16px;color:#e0e0e0;font-size:15px;font-family:var(--mono);letter-spacing:.12em;outline:none;text-transform:uppercase;transition:all .2s;}
.sess-join-input:focus{border-color:rgba(78,201,176,.4);background:rgba(78,201,176,.04);}
.sess-btn{width:100%;padding:13px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;border:none;margin-top:6px;}
.sess-btn.create{background:linear-gradient(135deg,rgba(79,193,255,.25),rgba(78,201,176,.2));border:1px solid rgba(79,193,255,.4);color:#4FC1FF;}
.sess-btn.create:hover{background:linear-gradient(135deg,rgba(79,193,255,.4),rgba(78,201,176,.3));box-shadow:0 8px 24px rgba(79,193,255,.2);}
.sess-btn.join{background:rgba(78,201,176,.12);border:1px solid rgba(78,201,176,.3);color:#4EC9B0;}
.sess-btn.join:hover{background:rgba(78,201,176,.22);}
.sess-btn:disabled{opacity:.4;cursor:not-allowed;}
.sess-recent{border-top:1px solid rgba(255,255,255,.06);margin-top:20px;padding-top:16px;}
.sess-recent-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;transition:background .15s;border:1px solid transparent;}
.sess-recent-item:hover{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.07);}
`;

// ═══════════ MONACO EDITOR COMPONENT ═══════════
const MonacoEditor = forwardRef(function MonacoEditor({lang, initText, onLocalOp, onCursorMove, fileKey, remoteOps, cursors, readOnly=false, lockedLines, myUserId, onLineLock, onLineUnlock, showLockToast}, ref) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const suppressRef = useRef(false);
  const decorationsRef = useRef([]);
  const lockDecorationsRef = useRef([]);
  const prevTextRef = useRef(initText || "");
  const currentLineRef = useRef(null);
  // Refs kept current each render to avoid stale closures in Monaco event listeners
  const lockedLinesRef = useRef(lockedLines || {});
  const myUserIdRef = useRef(myUserId);
  const showLockToastRef = useRef(showLockToast);
  const onLineLockRef = useRef(onLineLock);
  const onLineUnlockRef = useRef(onLineUnlock);
  lockedLinesRef.current = lockedLines || {};
  myUserIdRef.current = myUserId;
  showLockToastRef.current = showLockToast;
  onLineLockRef.current = onLineLock;
  onLineUnlockRef.current = onLineUnlock;
  const [monacoReady, setMonacoReady] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Expose getText
  useEffect(() => {
    const api = { _getText: () => editorRef.current?.getValue() ?? prevTextRef.current };
    if (ref) { typeof ref === "function" ? ref(api) : (ref.current = api); }
  });

  // Load Monaco
  useEffect(() => {
    let cancelled = false;
    loadMonaco().then(monaco => {
      if (cancelled || !containerRef.current) return;
      monacoRef.current = monaco;

      // Define dark theme matching CKC-OS aesthetic
      monaco.editor.defineTheme("ckcos-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "4a5568", fontStyle: "italic" },
          { token: "keyword", foreground: "C586C0" },
          { token: "string", foreground: "CE9178" },
          { token: "number", foreground: "DCDCAA" },
          { token: "type", foreground: "4EC9B0" },
          { token: "function", foreground: "DCDCAA" },
          { token: "variable", foreground: "9CDCFE" },
          { token: "operator", foreground: "b4b4b4" },
        ],
        colors: {
          "editor.background": "#0d0f14",
          "editor.foreground": "#d4d4d4",
          "editor.lineHighlightBackground": "#1c1f28",
          "editor.selectionBackground": "#264f78",
          "editor.inactiveSelectionBackground": "#3a3d41",
          "editorLineNumber.foreground": "#2d3748",
          "editorLineNumber.activeForeground": "#4a5568",
          "editorCursor.foreground": "#4FC1FF",
          "editor.findMatchBackground": "#613315",
          "editor.findMatchHighlightBackground": "#3a2a1a",
          "editorGutter.background": "#0d0f14",
          "editorWidget.background": "#1c1f28",
          "editorWidget.border": "rgba(255,255,255,0.08)",
          "input.background": "#151820",
          "input.border": "rgba(255,255,255,0.08)",
          "scrollbarSlider.background": "rgba(255,255,255,0.1)",
          "scrollbarSlider.hoverBackground": "rgba(255,255,255,0.18)",
          "scrollbarSlider.activeBackground": "rgba(255,255,255,0.25)",
        }
      });

      const editor = monaco.editor.create(containerRef.current, {
        value: initText || "",
        language: LANGS[lang]?.monaco || "typescript",
        theme: "ckcos-dark",
        fontSize: 13.5,
        fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
        fontLigatures: true,
        lineHeight: 21,
        minimap: { enabled: false },
        readOnly,
        scrollBeyondLastLine: false,
        wordWrap: "off",
        renderWhitespace: "selection",
        smoothScrolling: true,
        cursorBlinking: "phase",
        cursorSmoothCaretAnimation: "on",
        tabSize: 2,
        insertSpaces: true,
        folding: true,
        glyphMargin: false,
        lineDecorationsWidth: 6,
        lineNumbersMinChars: 3,
        padding: { top: 8, bottom: 8 },
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
          verticalScrollbarSize: 5,
          horizontalScrollbarSize: 5,
        },
        suggest: { showStatusBar: false },
        quickSuggestions: { other: true, comments: false, strings: false },
      });

      editorRef.current = editor;
      prevTextRef.current = initText || "";

      // Track changes for OT
      editor.onDidChangeModelContent(e => {
        if (suppressRef.current || readOnly) return;
        const newText = editor.getValue();
        const old = prevTextRef.current;
        if (newText === old) return;

        // Compute diff
        let i = 0, oe = old.length, ne = newText.length;
        while (i < oe && i < ne && old[i] === newText[i]) i++;
        let oe2 = oe, ne2 = ne;
        while (oe2 > i && ne2 > i && old[oe2-1] === newText[ne2-1]) { oe2--; ne2--; }
        const del = old.slice(i, oe2), ins = newText.slice(i, ne2);
        if (del.length) onLocalOp?.({ type: "delete", pos: i, len: del.length });
        if (ins.length) onLocalOp?.({ type: "insert", pos: i, chars: ins });
        prevTextRef.current = newText;
      });

      // Track cursor position and handle line locking
      editor.onDidChangeCursorPosition(e => {
        const pos = e.position;
        onCursorMove?.(pos.lineNumber, pos.column, editor.getModel()?.getOffsetAt(pos) || 0);
        // Unlock old line, lock new line when cursor moves between lines
        const newLine = pos.lineNumber;
        const oldLine = currentLineRef.current;
        if (newLine !== oldLine) {
          if (oldLine) onLineUnlockRef.current?.(oldLine);
          currentLineRef.current = newLine;
          onLineLockRef.current?.(newLine);
        }
      });

      // Block editing on lines locked by other users
      editor.onKeyDown(e => {
        if (readOnly) return;
        const line = editor.getPosition()?.lineNumber;
        const lock = lockedLinesRef.current?.[line];
        if (!lock || lock.lockedBy === myUserIdRef.current) return;
        // Allow navigation keys (arrows=15-18, esc=9, pgUp=11, pgDn=12, end=13, home=14)
        const navKeys = new Set([9,11,12,13,14,15,16,17,18]);
        if (!navKeys.has(e.keyCode)) {
          e.preventDefault();
          e.stopPropagation();
          showLockToastRef.current?.(lock.userName);
        }
      });

      setMonacoReady(true);
    }).catch(e => {
      if (!cancelled) setLoadError(e.message);
    });
    return () => { cancelled = true; };
  }, []); // mount once

  // Cleanup on unmount
  useEffect(() => {
    return () => { editorRef.current?.dispose(); };
  }, []);

  // Update language when lang changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (model) monacoRef.current.editor.setModelLanguage(model, LANGS[lang]?.monaco || "typescript");
  }, [lang]);

  // Apply remote ops
  useEffect(() => {
    if (!remoteOps?.length || !editorRef.current || !monacoRef.current) return;
    suppressRef.current = true;
    try {
      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) return;
      let text = model.getValue();
      for (const op of remoteOps) {
        if (op.type === "reset") { text = op.text; continue; }
        if (op.type === "insert") {
          const p = Math.max(0, Math.min(op.pos, text.length));
          text = text.slice(0, p) + op.chars + text.slice(p);
        } else if (op.type === "delete") {
          const p = Math.max(0, Math.min(op.pos, text.length));
          const l = Math.min(op.len, text.length - p);
          if (l > 0) text = text.slice(0, p) + text.slice(p + l);
        }
      }
      const pos = editor.getPosition();
      model.pushEditOperations([], [{
        range: model.getFullModelRange(),
        text,
      }], () => null);
      if (pos) editor.setPosition(pos);
      prevTextRef.current = text;
    } finally {
      suppressRef.current = false;
    }
  }, [remoteOps]);

  // Update content when fileKey/lang changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    suppressRef.current = true;
    const model = editorRef.current.getModel();
    if (model) {
      model.pushEditOperations([], [{
        range: model.getFullModelRange(),
        text: initText || "",
      }], () => null);
      prevTextRef.current = initText || "";
    }
    suppressRef.current = false;
  }, [fileKey]);

  // Update peer cursor decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !monacoReady) return;
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;
    const newDecorations = (cursors || []).map(cur => {
      const lineCount = model.getLineCount();
      const line = Math.min(Math.max(cur.line || 1, 1), lineCount);
      const col = Math.min(Math.max(cur.col || 1, 1), model.getLineMaxColumn(line));
      return {
        range: new monacoRef.current.Range(line, col, line, col + 1),
        options: {
          className: `peer-cursor-${cur.id?.replace(/[^a-z0-9]/gi, "")}`,
          beforeContentClassName: `peer-cursor-before`,
          stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          after: {
            content: ` ${(cur.name || "?").split(" ")[0]} `,
            inlineClassName: "peer-cursor-label",
            cursorStops: monacoRef.current.editor.InjectedTextCursorStops.None,
          },
          inlineClassName: "peer-cursor-line",
        }
      };
    });
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [cursors, monacoReady]);

  // Apply locked-line decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !monacoReady) return;
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;
    const newDecorations = Object.entries(lockedLines || {}).map(([lineNum, lock]) => ({
      range: new monacoRef.current.Range(+lineNum, 1, +lineNum, 1),
      options: {
        isWholeLine: true,
        className: `locked-line-bg-${lock.lockedBy?.replace(/[^a-z0-9]/gi,'')}`,
        linesDecorationsClassName: `locked-line-gutter-${lock.lockedBy?.replace(/[^a-z0-9]/gi,'')}`,
        overviewRuler: { color: lock.color, position: 4 },
      }
    }));
    lockDecorationsRef.current = editor.deltaDecorations(lockDecorationsRef.current || [], newDecorations);
  }, [lockedLines, monacoReady]);

  // Inject CSS for locked-line colors
  useEffect(() => {
    if (!lockedLines || !Object.keys(lockedLines).length) return;
    const styleId = 'lock-line-styles';
    let el = document.getElementById(styleId);
    if (!el) { el = document.createElement('style'); el.id = styleId; document.head.appendChild(el); }
    el.textContent = Object.values(lockedLines).map(lock => {
      const id = lock.lockedBy?.replace(/[^a-z0-9]/gi,'') || 'x';
      return `.locked-line-bg-${id}{background:${lock.color}18!important;border-left:2px solid ${lock.color}!important;}
.locked-line-gutter-${id}{background:${lock.color};width:3px!important;border-radius:0 2px 2px 0;left:0;}`;
    }).join('\n');
  }, [lockedLines]);

  // Inject peer cursor CSS
  useEffect(() => {
    if (!cursors?.length) return;
    const styleId = "peer-cursor-styles";
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = cursors.map(cur => {
      const id = cur.id?.replace(/[^a-z0-9]/gi, "") || "x";
      return `.peer-cursor-${id} { background: ${cur.color}33; border-left: 2px solid ${cur.color}; }
.peer-cursor-label { background: ${cur.color}; color: white; font-size: 9px; font-weight: 700; padding: 0 4px; border-radius: 2px; font-family: Inter,sans-serif; }`;
    }).join("\n");
  }, [cursors]);

  if (loadError) {
    return (
      <div className="monaco-loading">
        <div style={{color:"#FF6B9D",fontSize:12}}>⚠ Monaco failed to load</div>
        <div style={{fontSize:10,color:"#4a5568"}}>{loadError}</div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {!monacoReady && (
        <div className="monaco-loading">
          <div className="spin" style={{width:20,height:20,borderRadius:"50%",border:"2px solid #4FC1FF",borderTopColor:"transparent"}}/>
          <div style={{fontSize:11,fontFamily:"var(--mono)"}}>Loading Monaco Editor…</div>
        </div>
      )}
      <div ref={containerRef} style={{ height: "100%", width: "100%", visibility: monacoReady ? "visible" : "hidden" }} />
    </div>
  );
});

// ═══════════ ERROR POPUP ═══════════
function ErrorPopup({error,lang,onClose,onOpenOutput}){
  if(!error)return null;
  const lines=error.split("\n");
  const langName=LANGS[lang]?.n||lang;
  const langColor=LANGS[lang]?.c||"#FF6B9D";
  const first=lines.find(l=>/error|warning|failed/i.test(l))||lines[0]||"";
  let errType="Error";
  if(/syntaxerror/i.test(first))errType="SyntaxError";
  else if(/nameerror/i.test(first))errType="NameError";
  else if(/typeerror/i.test(first))errType="TypeError";
  else if(/compilation failed|build failed/i.test(error))errType="Build Failed";
  else if(/error\[e\d+\]/i.test(first))errType="Rust Error";
  else if(/error:/i.test(first))errType="Compilation Error";
  return(
    <div className="err-ov">
      <div className="err-box err-slide">
        <div className="err-head">
          <span style={{width:8,height:8,borderRadius:"50%",background:"#FF6B9D",boxShadow:"0 0 8px #FF6B9D",display:"inline-block",flexShrink:0}} className="pulse"/>
          <div className="err-title">⊗ {errType}</div>
          <span className="err-lang-pill" style={{background:`${langColor}22`,color:langColor,borderColor:`${langColor}44`}}>{langName}</span>
          <button className="err-close" onClick={onClose}>✕</button>
        </div>
        <div className="err-body">
          {lines.map((line,i)=>{
            let color="#ffb3c0";
            if(/^❌/.test(line))color="#FF6B9D";else if(/^⚠/.test(line))color="#DCDCAA";else if(/^\s*✖/.test(line))color="#ff8090";else if(/Fix the error/i.test(line))color="#6a7585";
            return<div key={i} style={{color,fontFamily:"var(--mono)",fontSize:12,lineHeight:1.75}}>{line||"\u00A0"}</div>;
          })}
        </div>
        <div className="err-foot">
          <span className="err-hint">Fix error(s) and press ▶ Run again · Esc to dismiss</span>
          <button className="err-view-btn" onClick={()=>{onOpenOutput?.();onClose();}}>View in Output →</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════ TYPING INDICATOR ═══════════
function TypingIndicator({color}){
  return(<span className="presence-typing">{[0,1,2].map(i=>(<span key={i} className="typing-dot" style={{background:color,animation:`typingBounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>))}</span>);
}

// ═══════════ DEBUGGING ROOM ═══════════
function DebuggingRoom({errors,warnings,lang,me,onClose}){
  const[selectedIdx,setSelectedIdx]=useState(0);
  const[messages,setMessages]=useState([]);
  const[inputVal,setInputVal]=useState("");
  const messagesEndRef=useRef(null);
  const allIssues=[...errors.map(e=>({type:"error",text:e})),...warnings.map(w=>({type:"warning",text:w}))];

  const suggestions = {
    SyntaxError:["Check your brackets — one might be missing its pair!","Looks like a syntax issue. Double-check line endings."],
    TypeError:["Type mismatch — check argument types.","Null reference? Add a null check before this call."],
    default:["Try isolating the problematic section.","Add console.log / print statements to trace values.","Check the docs for this function."],
  };

  useEffect(()=>{
    if(allIssues.length===0)return;
    const issue=allIssues[selectedIdx];if(!issue)return;
    const sysMsg={id:Math.random().toString(36).slice(2),from:"system",text:`🔍 Debugging: ${issue.text.slice(0,80)}…`,t:nowTs()};
    setMessages([sysMsg]);
    setTimeout(()=>{
      const key=Object.keys(suggestions).find(k=>issue.text.toLowerCase().includes(k.toLowerCase()))||"default";
      const pool=suggestions[key];
      const tip=pool[Math.floor(Math.random()*pool.length)];
      setMessages(prev=>[...prev,{id:Math.random().toString(36).slice(2),from:"Assistant",color:"#FF6B9D",bg:"rgba(255,107,157,.15)",inits:"AI",text:tip,t:nowTs(),isBot:true}]);
    },700);
  },[selectedIdx,lang]);

  useEffect(()=>{messagesEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const sendMessage=()=>{
    const txt=inputVal.trim();if(!txt)return;
    setMessages(prev=>[...prev,{id:Math.random().toString(36).slice(2),from:me.name,color:me.color,bg:me.bg,inits:me.inits,text:txt,t:nowTs(),isMe:true}]);
    setInputVal("");
    setTimeout(()=>{
      const replies=["Good point! Let me analyze that section.",`In ${LANGS[lang]?.n||lang}, this pattern often causes scope issues.`,"Run a minimal reproduction — isolate the broken part!"];
      setMessages(prev=>[...prev,{id:Math.random().toString(36).slice(2),from:"Assistant",color:"#FF6B9D",bg:"rgba(255,107,157,.15)",inits:"AI",text:replies[Math.floor(Math.random()*replies.length)],t:nowTs(),isBot:true}]);
    },900);
  };

  return(
    <div className="dbg-room-overlay" onClick={onClose}>
      <div className="dbg-room announce-pop" onClick={e=>e.stopPropagation()}>
        <div className="dbg-room-head">
          <span style={{width:8,height:8,borderRadius:"50%",background:"#FF6B9D",boxShadow:"0 0 8px #FF6B9D",display:"inline-block",flexShrink:0}} className="pulse"/>
          <div className="dbg-room-title">🐛 Debugging Room</div>
          <span style={{fontSize:10,color:"#4a5568",fontFamily:"var(--mono)"}}>{LANGS[lang]?.n||lang} · {allIssues.length} issue{allIssues.length!==1?"s":""}</span>
          <button className="err-close" onClick={onClose}>✕</button>
        </div>
        <div className="dbg-room-body">
          <div className="dbg-errors-panel">
            <div style={{fontSize:9,color:"#4a5568",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",padding:"2px 4px 6px"}}>Issues</div>
            {allIssues.length===0&&<div style={{fontSize:11,color:"#4a5568",textAlign:"center",padding:"20px 8px"}}>✓ No issues</div>}
            {allIssues.map((issue,i)=>(
              <div key={i} className={`dbg-error-item${selectedIdx===i?" sel":""}`} onClick={()=>setSelectedIdx(i)}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>{issue.type==="error"?<span className="err-type-badge">ERR</span>:<span className="warn-type-badge">WARN</span>}</div>
                <div style={{fontSize:10,color:issue.type==="error"?"#ff8090":"#DCDCAA",fontFamily:"var(--mono)",lineHeight:1.5,wordBreak:"break-word"}}>{issue.text.slice(0,70)}…</div>
              </div>
            ))}
          </div>
          <div className="dbg-chat-panel">
            <div className="dbg-chat-messages">
              {messages.map(msg=>{
                if(msg.from==="system")return(<div key={msg.id} style={{textAlign:"center",padding:"4px 0"}}><span style={{fontSize:10,color:"#4a5568",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:100,padding:"2px 10px",fontFamily:"var(--mono)"}}>{msg.text}</span></div>);
                return(
                  <div key={msg.id} className="dbg-msg" style={{flexDirection:msg.isMe?"row-reverse":"row"}}>
                    <div style={{width:26,height:26,borderRadius:8,background:msg.bg||"rgba(79,193,255,.18)",color:msg.color||"#4FC1FF",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",flexShrink:0}}>{msg.inits||initials(msg.from)}</div>
                    <div style={{maxWidth:"78%"}}>
                      <div style={{fontSize:9,color:"#4a5568",marginBottom:2}}>{msg.from}</div>
                      <div className={`dbg-msg-bubble${msg.isMe?" me":msg.isBot?" bot":""}`}><span style={{color:msg.isMe?"#a8d8ff":msg.isBot?"#ffb3c6":"#e0e0e0"}}>{msg.text}</span></div>
                      <div className="dbg-msg-time">{msg.t}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef}/>
            </div>
            <div className="dbg-chat-input-row">
              <input className="dbg-chat-input" value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Describe what you're seeing…"/>
              <button className="dbg-send-btn" onClick={sendMessage}>Send ↑</button>
            </div>
          </div>
        </div>
        <div className="dbg-room-foot">
          <div className="dbg-stat">Errors: <span style={{color:"#FF6B9D"}}>{errors.length}</span></div>
          <div className="dbg-stat">Warnings: <span style={{color:"#DCDCAA"}}>{warnings.length}</span></div>
          <div className="dbg-stat">Lang: <span>{LANGS[lang]?.n||lang}</span></div>
        </div>
      </div>
    </div>
  );
}

// ═══════════ LIVE SERVER LOGS ═══════════
function LiveServerLogs({onClose}){
  const[logs,setLogs]=useState(()=>Array.from({length:18},genLogEntry).reverse());
  const[paused,setPaused]=useState(false);
  const[filter,setFilter]=useState("ALL");
  const[search,setSearch]=useState("");
  const streamRef=useRef(null);const logsEndRef=useRef(null);const[autoScroll,setAutoScroll]=useState(true);const pausedRef=useRef(false);
  useEffect(()=>{pausedRef.current=paused;},[paused]);
  useEffect(()=>{streamRef.current=setInterval(()=>{if(pausedRef.current)return;const count=Math.random()>.65?2:1;setLogs(prev=>[...Array.from({length:count},genLogEntry),...prev].slice(0,300));},1200);return()=>clearInterval(streamRef.current);},[]);
  useEffect(()=>{if(autoScroll&&logsEndRef.current&&!paused)logsEndRef.current.scrollIntoView({behavior:"smooth"});},[logs,autoScroll,paused]);
  const filteredLogs=logs.filter(e=>(filter==="ALL"||e.level===filter)&&(!search||e.msg.toLowerCase().includes(search.toLowerCase())||e.svc.includes(search.toLowerCase())));
  const counts=logs.reduce((acc,e)=>{acc[e.level]=(acc[e.level]||0)+1;return acc;},{});
  return(
    <div className="logs-overlay" onClick={onClose}>
      <div className="logs-panel announce-pop" onClick={e=>e.stopPropagation()}>
        <div className="logs-head">
          <div style={{width:8,height:8,borderRadius:"50%",background:paused?"#4a5568":"#4EC9B0",flexShrink:0,transition:"all .3s"}} className={paused?"":"pulse"}/>
          <div className="logs-title">📡 Live Server Logs</div>
          <div className="logs-controls">{["ALL","INFO","SUCCESS","WARN","ERROR","DEBUG"].map(lv=>(<button key={lv} className={`log-filter-btn${filter===lv?` active-${lv}`:""}`} onClick={()=>setFilter(lv)}>{lv==="ALL"?"All":lv}{lv!=="ALL"&&counts[lv]?<span style={{marginLeft:3,opacity:.7}}>({counts[lv]||0})</span>:null}</button>))}</div>
          <button className="err-close" onClick={onClose} style={{marginLeft:8,color:"#4a5568"}}>✕</button>
        </div>
        <div className="logs-body">
          <div className="logs-stats-bar">
            {[["ERROR","#FF6B9D","ERR"],["WARN","#DCDCAA","WARN"],["SUCCESS","#4EC9B0","OK"],["INFO","#4FC1FF","INFO"],["DEBUG","#C586C0","DBG"]].map(([lv,c,lb])=>(
              <div key={lv} className="logs-stat-item" style={{color:c}}><span style={{width:6,height:6,borderRadius:"50%",background:c,display:"inline-block"}}/><span style={{color:"#4a5568"}}>{lb}</span>{counts[lv]||0}</div>
            ))}
            <div className="logs-stat-item" style={{marginLeft:"auto",color:"#4a5568"}}>Total: <span style={{color:"#e0e0e0"}}>{logs.length}</span></div>
          </div>
          <div className="logs-stream" onScroll={e=>{const el=e.target;setAutoScroll(el.scrollHeight-el.scrollTop-el.clientHeight<40);}}>
            <div style={{display:"flex",padding:"3px 14px",borderBottom:"1px solid rgba(255,255,255,.04)",position:"sticky",top:0,background:"#0a0c11",zIndex:2}}>
              {[["82px","Time"],["58px","Level"],["90px","Service"],["1","Message"]].map(([w,lb])=>(<span key={lb} style={{width:w==="1"?undefined:w,flex:w==="1"?1:undefined,fontSize:9,color:"#2d3748",fontFamily:"var(--mono)",fontWeight:700,textTransform:"uppercase"}}>{lb}</span>))}
            </div>
            {[...filteredLogs].reverse().map((entry,i)=>(
              <div key={entry.id} className={`log-entry ${entry.level} log-slide`}>
                <span className="log-ts">{entry.t}</span>
                <span className="log-level-pill"><span className={`log-level-inner ${entry.level}`}>{entry.level}</span></span>
                <span className="log-svc">{entry.svc}</span>
                <span className={`log-msg ${entry.level}`}>{entry.msg}</span>
              </div>
            ))}
            <div ref={logsEndRef}/>
          </div>
        </div>
        <div className="logs-foot">
          <div className={`logs-streaming-dot${paused?" paused":""}`}/>
          <span style={{fontSize:10,color:paused?"#4a5568":"#4EC9B0",fontWeight:700}}>{paused?"PAUSED":"STREAMING"}</span>
          <input className="log-search" placeholder="Search logs…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{flex:1}}/>
          <span style={{fontSize:10,color:"#4a5568"}}>{filteredLogs.length} / {logs.length}</span>
          <button className={`logs-pause-btn${paused?" paused":""}`} onClick={()=>setPaused(p=>!p)}>{paused?"▶ Resume":"⏸ Pause"}</button>
          <button className="logs-clear-btn" onClick={()=>setLogs([])}>Clear</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════ SESSION PAGE ═══════════
function SessionPage({me,onJoin,onLogout}){
  const[mode,setMode]=useState('home'); // 'home' | 'create' | 'join'
  const[joinId,setJoinId]=useState('');
  const[newId,setNewId]=useState('');
  const[creating,setCreating]=useState(false);
  const[joining,setJoining]=useState(false);
  const[copied,setCopied]=useState(false);
  const[err,setErr]=useState('');
  const[recent,setRecent]=useState(()=>JSON.parse(localStorage.getItem('ckcos_sessions')||'[]'));

  // Enter create mode — show a spinner/loading state while DB generates UUID
  const enterCreate=()=>{
    setMode('create');setErr('');setNewId(''); // UUID shown after creation
  };

  const doCreate=async()=>{
    setCreating(true);setErr('');
    try{
      const sb=await getSB();
      const newUUID = crypto.randomUUID();
      // Insert new document using the UUID
      const{error:insertErr}=await sb
        .from('documents')
        .insert({id:newUUID,name:'CKC-OS Session',lang:'ts',content:STARTERS['ts']});
      if(insertErr)throw insertErr;
      const list=[{id:newUUID,name:'CKC-OS Session',t:Date.now()},...recent].slice(0,8);
      localStorage.setItem('ckcos_sessions',JSON.stringify(list));
      setRecent(list);
      onJoin(newUUID);
    }catch(e){
      // Fallback
      const fallbackId=crypto.randomUUID();
      const list=[{id:fallbackId,name:'CKC-OS Session (local)',t:Date.now()},...recent].slice(0,8);
      localStorage.setItem('ckcos_sessions',JSON.stringify(list));
      setRecent(list);
      onJoin(fallbackId);
    }
    setCreating(false);
  };

  const doJoin=async()=>{
    const id=(joinId||'').trim().toLowerCase();
    if(!id){setErr('Enter a session ID');return;}
    // Accept any non-empty string — full UUID or short fallback ID
    setJoining(true);
    try{
      // Optionally verify it exists in DB
      const sb=await getSB();
      const{data}=await sb.from('documents').select('id,name').eq('id',id).maybeSingle();
      if(!data){setErr('Session not found. Check the ID and try again.');setJoining(false);return;}
      const list=[{id,name:data.name||'Session',t:Date.now()},...recent.filter(r=>r.id!==id)].slice(0,8);
      localStorage.setItem('ckcos_sessions',JSON.stringify(list));
      onJoin(id);
    }catch(e){
      // Fallback: join without verification
      const list=[{id,name:'Session',t:Date.now()},...recent.filter(r=>r.id!==id)].slice(0,8);
      localStorage.setItem('ckcos_sessions',JSON.stringify(list));
      onJoin(id);
    }
  };

  const copyId=()=>{
    navigator.clipboard?.writeText(newId).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };
  // Friendly short display of UUID (first 8 chars)
  const shortId=newId?newId.slice(0,8).toUpperCase():'';

  return(
    <div className="sess-wrap">
      <style>{CSS}</style>
      <div className="auth-bg"/><div className="auth-grid"/>
      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:520,padding:'0 16px'}}>
        <div className="sess-glass">
          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div className="auth-gem">⚡</div>
              <div><div className="auth-brand">CKC-OS</div><div className="auth-sub">Collaborative Sessions</div></div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{fontSize:11,color:'#4a5568'}}>{me.name}</div>
              <div style={{width:28,height:28,borderRadius:8,background:me.bg,color:me.color,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--mono)'}}>{me.inits}</div>
              <button onClick={onLogout} style={{padding:'4px 10px',borderRadius:6,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'#4a5568',cursor:'pointer',fontSize:11,fontFamily:'Inter,sans-serif'}}>Exit</button>
            </div>
          </div>

          {mode==='home'&&(
            <div>
              <div style={{marginBottom:20}}>
                <button className="sess-btn create" onClick={enterCreate}>＋ Create New Session</button>
                <button className="sess-btn join" style={{marginTop:10}} onClick={()=>{setMode('join');setErr('');}}>
                  → Join Existing Session
                </button>
              </div>
              {recent.length>0&&(
                <div className="sess-recent">
                  <div style={{fontSize:10,color:'#4a5568',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Recent Sessions</div>
                  {recent.slice(0,5).map(r=>(
                    <div key={r.id} className="sess-recent-item" onClick={()=>onJoin(r.id)}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:'#4EC9B0',boxShadow:'0 0 6px #4EC9B0',flexShrink:0}}/>
                      <div style={{fontFamily:'var(--mono)',fontSize:13,color:'#e0e0e0',letterSpacing:'.08em'}}>{r.id}</div>
                      <div style={{marginLeft:'auto',fontSize:10,color:'#4a5568'}}>{new Date(r.t).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode==='create'&&(
            <div>
              <div style={{fontSize:11,color:'#4a5568',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Session ID</div>
              {!newId&&!creating&&(
                <>
                  <div style={{fontSize:12,color:'#6a7585',marginBottom:14,lineHeight:1.6}}>Click below to create your session and get a shareable ID</div>
                  <button className="sess-btn create" onClick={doCreate}>⚡ Generate Session</button>
                  <button className="sess-btn" style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',color:'#4a5568',marginTop:8}} onClick={()=>setMode('home')}>← Back</button>
                </>
              )}
              {creating&&(
                <div style={{textAlign:'center',padding:'20px 0',color:'#4a5568',fontSize:12}}
                ><span className="spin" style={{display:'inline-block',width:14,height:14,borderRadius:'50%',border:'2px solid #4FC1FF',borderTopColor:'transparent',marginRight:8}}/>
                Creating session…</div>
              )}
              {newId&&!creating&&(
                <>
                  <div className="sess-id-box" onClick={copyId} title="Click to copy">
                    <div style={{fontSize:11,color:'#4a5568',marginBottom:4,letterSpacing:'.04em',fontWeight:400}}>FULL UUID (share this)</div>
                    {newId}
                    <div style={{fontSize:10,color:copied?'#4EC9B0':'#4a5568',fontWeight:400,letterSpacing:'.04em',marginTop:4}}>
                      {copied?'✓ Copied to clipboard!':'📋 click to copy'}
                    </div>
                  </div>
                  <div style={{fontSize:11,color:'#4a5568',margin:'12px 0',lineHeight:1.6,textAlign:'center'}}>Share this ID with collaborators. They paste it in “Join Session”.</div>
                  {err&&<div className="auth-err">{err}</div>}
                  <button className="sess-btn join" onClick={()=>onJoin(newId)}>→ Open Editor →</button>
                </>
              )}
              {err&&!newId&&<div className="auth-err" style={{marginTop:10}}>{err}</div>}
            </div>
          )}

          {mode==='join'&&(
            <div>
              <div style={{fontSize:11,color:'#4a5568',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Paste Session ID</div>
              <input
                className="sess-join-input"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={joinId}
                onChange={e=>setJoinId(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&doJoin()}
                autoFocus
                style={{fontSize:12,letterSpacing:'.04em',textTransform:'none'}}
              />
              {err&&<div className="auth-err" style={{marginTop:10}}>{err}</div>}
              <button className="sess-btn join" onClick={doJoin} disabled={joining} style={{marginTop:12}}>
                {joining?<span style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}><span className="spin" style={{display:'inline-block',width:10,height:10,borderRadius:'50%',border:'1.5px solid currentColor',borderTopColor:'transparent'}}/> Verifying…</span>:'→ Join Session'}
              </button>
              <button className="sess-btn" style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',color:'#4a5568',marginTop:8}} onClick={()=>{setMode('home');setErr('');}}>← Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════ AUTH PAGE ═══════════
function AuthPage({onAuth}){
  const[tab,setTab]=useState("login");
  const[username,setUsername]=useState("");
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[colorIdx,setColorIdx]=useState(0);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");
  const[info,setInfo]=useState("");
  const[sbReady,setSbReady]=useState(false);
  const chosen=PALETTE[colorIdx];

  useEffect(()=>{
    getSB().then(()=>setSbReady(true)).catch(e=>setError("Could not connect: "+e.message));
  },[]);

  const handleSignup=async()=>{
    if(!username.trim()||!email.trim()||!password.trim()){setError("All fields are required.");return;}
    if(password.length<6){setError("Password must be at least 6 characters.");return;}
    setLoading(true);setError("");setInfo("");
    try{
      const sb=await getSB();
      const{data:authData,error:authErr}=await sb.auth.signUp({email:email.trim(),password,options:{data:{username:username.trim(),color:chosen.hex,color_bg:chosen.bg}}});
      if(authErr)throw authErr;
      if(!authData.user)throw new Error("Signup failed.");
      await sb.from("users").upsert({id:authData.user.id,username:username.trim(),email:email.trim(),password_hash:"managed_by_supabase_auth",color:{hex:chosen.hex,bg:chosen.bg}},{onConflict:"id"});
      if(authData.session){
        const me={id:authData.user.id,name:username.trim(),email:authData.user.email,color:chosen.hex,bg:chosen.bg,inits:initials(username.trim())};
        onAuth(me,authData.session);
      } else {
        setInfo("Account created! Check your email or sign in now.");setTab("login");
      }
    }catch(e){setError(e.message||"Signup failed.");}
    setLoading(false);
  };

  const handleLogin=async()=>{
    if(!email.trim()||!password.trim()){setError("Email and password required.");return;}
    setLoading(true);setError("");setInfo("");
    try{
      const sb=await getSB();
      const{data,error:authErr}=await sb.auth.signInWithPassword({email:email.trim(),password});
      if(authErr)throw authErr;
      if(!data.user)throw new Error("Login failed.");
      const{data:profile}=await sb.from("users").select("*").eq("id",data.user.id).single();
      const colorData=profile?.color||{hex:chosen.hex,bg:chosen.bg};
      const me={id:data.user.id,name:profile?.username||data.user.user_metadata?.username||email.split("@")[0],email:data.user.email,color:colorData.hex||"#4FC1FF",bg:colorData.bg||"rgba(79,193,255,.22)",inits:initials(profile?.username||email.split("@")[0])};
      onAuth(me,data.session);
    }catch(e){setError(e.message||"Login failed.");}
    setLoading(false);
  };

  return(
    <div className="auth-wrap">
      <style>{CSS}</style>
      <div className="auth-bg"/><div className="auth-grid"/>
      <div style={{position:"relative",zIndex:1,width:440,maxWidth:"calc(100vw - 32px)"}}>
        <div className="auth-glass">
          <div className="auth-logo">
            <div className="auth-gem">⚡</div>
            <div><div className="auth-brand">CKC-OS</div><div className="auth-sub">Collaborative Code Editor</div></div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:sbReady?"#4EC9B0":"#DCDCAA",boxShadow:sbReady?"0 0 8px #4EC9B0":"0 0 8px #DCDCAA"}} className="pulse"/>
              <span style={{fontSize:10,color:sbReady?"#4EC9B0":"#DCDCAA",fontWeight:700}}>{sbReady?"LIVE":"CONNECTING…"}</span>
            </div>
          </div>
          <div className="auth-tabs">{["login","signup"].map(t=>(<div key={t} className={`auth-tab${tab===t?" on":""}`} onClick={()=>{setTab(t);setError("");setInfo("");}}>{t==="login"?"Sign In":"Create Account"}</div>))}</div>
          {error&&<div className="auth-err">⊗ {error}</div>}
          {info&&<div className="auth-ok">✓ {info}</div>}
          <div className="auth-field"><label className="auth-label">Email</label><input className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(tab==="login"?handleLogin():handleSignup())}/></div>
          {tab==="signup"&&<div className="auth-field"><label className="auth-label">Username</label><input className="auth-input" placeholder="your handle" value={username} onChange={e=>setUsername(e.target.value)}/></div>}
          <div className="auth-field"><label className="auth-label">Password</label><input className="auth-input" type="password" placeholder={tab==="signup"?"min. 6 characters":"your password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(tab==="login"?handleLogin():handleSignup())}/></div>
          {tab==="signup"&&(
            <div className="auth-field">
              <label className="auth-label">Cursor Color</label>
              <div className="color-swatches">{PALETTE.map((p,i)=>(<div key={i} className={`color-swatch${colorIdx===i?" sel":""}`} style={{background:p.bg,borderColor:colorIdx===i?p.hex:"transparent"}} onClick={()=>setColorIdx(i)} title={p.label}><div style={{width:14,height:14,borderRadius:4,background:p.hex}}/></div>))}</div>
              <div style={{marginTop:8,fontSize:11,color:chosen.hex,fontFamily:"var(--mono)"}}>Selected: {chosen.label}</div>
            </div>
          )}
          <button className="auth-btn primary" onClick={tab==="login"?handleLogin:handleSignup} disabled={loading||!sbReady}>
            {loading?<span style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}><span className="spin" style={{display:"inline-block",width:12,height:12,borderRadius:"50%",border:"2px solid currentColor",borderTopColor:"transparent"}}/>{tab==="login"?"Signing in…":"Creating account…"}</span>:tab==="login"?"Sign In →":"Create Account →"}
          </button>
          <div style={{marginTop:20,padding:"12px 14px",background:"rgba(79,193,255,.05)",border:"1px solid rgba(79,193,255,.1)",borderRadius:10,fontSize:11,color:"#4FC1FF66",lineHeight:1.7}}>⚡ Monaco Editor · Supabase Auth + Realtime · OT Sync Engine · Live Cursors</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════ SHELL ═══════════
function Shell({me,sessionId,onLogout}){
  const myId=useRef(me?.id || "me-"+Math.random().toString(36).slice(2));
  const channelRef=useRef(null);
  const activeEditorRef=useRef(null);
  const notifTmr=useRef(null);
  const liveValTimer=useRef(null);
  const remBuf=useRef([]);
  const myLockedLineRef=useRef(null);
  const lockToastTmr=useRef(null);
  const saveTimer=useRef(null);          // debounce timer for auto-save
  const CHANNEL_NAME=`ckcos-session-${sessionId}`; // unique per session

  const[lang,setLang]=useState("ts");
  const[tabs,setTabs]=useState([{id:"t_eng",name:"engine.ts",lang:"ts",dirty:false,isNew:false}]);
  const[activeTab,setActiveTab]=useState("t_eng");
  const[cursor,setCursor]=useState({line:1,col:1});
  const[peers,setPeers]=useState({});
  const[remOps,setRemOps]=useState([]);
  const[crdt,setCrdt]=useState([]);
  const[wsLog,setWsLog]=useState([]);
  const[opCnt,setOpCnt]=useState(0);
  const[rpTab,setRpTab]=useState("crdt");
  const[outTab,setOutTab]=useState("output");
  const[outOpen,setOutOpen]=useState(false);
  const[output,setOutput]=useState("");
  const[outIsErr,setOutIsErr]=useState(false);
  const[running,setRunning]=useState(false);
  const[pyReady,setPyReady]=useState(false);
  const[pyLoading,setPyLoading]=useState(false);
  const[errPopup,setErrPopup]=useState(null);
  const[errShake,setErrShake]=useState(false);
  const[cmdOpen,setCmdOpen]=useState(false);
  const[cmdQ,setCmdQ]=useState("");
  const[cmdSel,setCmdSel]=useState(0);
  const[notif,setNotif]=useState(null);
  const[newEdLang,setNewEdLang]=useState("ts");
  const[liveValidation,setLiveValidation]=useState(null);
  const[showDebugRoom,setShowDebugRoom]=useState(false);
  const[showServerLogs,setShowServerLogs]=useState(false);
  const[sbStatus,setSbStatus]=useState("connecting");
  // ─── LINE LOCK STATE ───
  const[lockedLines,setLockedLines]=useState({});
  const[lockToastMsg,setLockToastMsg]=useState(null);
  // ─── SAVE STATUS ───
  const[saveStatus,setSaveStatus]=useState('idle'); // 'idle'|'saving'|'saved'|'error'
  // ─── GIT BRIDGE ───
  const[showGitBridge,setShowGitBridge]=useState(false);

  const toast=useCallback((msg,ms=2500)=>{clearTimeout(notifTmr.current);setNotif(msg);notifTmr.current=setTimeout(()=>setNotif(null),ms);},[]);

  // ─── SUPABASE REALTIME ───
  useEffect(()=>{
    // Guard: if channel already exists (StrictMode double-mount), skip
    if(channelRef.current)return;
    let mounted=true;
    (async()=>{
      try {
        const sb=await getSB();
        setSbStatus("connected");
        
        // Aggressively remove all existing channels to prevent StrictMode 'already subscribed' issues
        await sb.removeAllChannels();

        const channel=sb.channel(CHANNEL_NAME,{config:{presence:{key:myId.current},broadcast:{self:false}}});

        channel.on("presence",{event:"sync"},()=>{
          const state=channel.presenceState();
          if(!mounted)return;
          setPeers(prev=>{
            const n={...prev};
            Object.keys(n).forEach(k=>n[k].online=false); // Mark all offline initially
            Object.entries(state).forEach(([key,presences])=>{
              if(key===myId.current)return;
              const p=presences[0];
              if(p){
                n[key]={
                  ...(n[key]||{line:p.line||1,col:p.col||1,lang:p.lang||"ts"}),
                  name:p.name,color:p.color,bg:p.bg||"rgba(79,193,255,.18)",inits:initials(p.name),online:true
                };
              }
            });
            return n;
          });
        });
        channel.on("presence",{event:"join"},({key,newPresences})=>{
          const p=newPresences[0];if(!p||key===myId.current)return;
          if(mounted){
            setPeers(prev=>({
              ...prev,
              [key]:{
                ...(prev[key]||{line:1,col:1,lang:p.lang||"ts"}),
                name:p.name,color:p.color,bg:p.bg||"rgba(79,193,255,.18)",inits:initials(p.name),online:true
              }
            }));
            toast(`${p.name} joined the session`);
          }
        });
        channel.on("presence",{event:"leave"},({key,leftPresences})=>{
          const p=leftPresences[0];
          if(mounted){
            setPeers(prev=>{const n={...prev};delete n[key];return n;});
            if(p)toast(`${p.name} left`);
            // Automatically release any locks held by the disconnected user
            setLockedLines(prev=>{
              const n={...prev};
              Object.keys(n).forEach(lineNum=>{
                if(n[lineNum].lockedBy===key) delete n[lineNum];
              });
              return n;
            });
          }
        });
        channel.on("broadcast",{event:"op"},({payload})=>{
          if(!mounted||payload.from===myId.current)return;
          const eng=getLocalEng(payload.lang);const r=eng.apply({...payload.op,uid:payload.from});
          if(r&&payload.lang===lang){remBuf.current.push(payload.op);setRemOps([...remBuf.current]);remBuf.current=[];setCrdt(p=>[{...payload.op,from:payload.name,t:nowTs()},...p].slice(0,40));setOpCnt(c=>c+1);}
          setWsLog(prev=>[{dir:"←",msg:`op:${payload.op.type}@${payload.op.pos} ← ${payload.name}`,t:nowTs()},...prev].slice(0,80));
        });
        channel.on("broadcast",{event:"cursor"},({payload})=>{
          if(!mounted||payload.from===myId.current)return;
          setPeers(prev=>({
            ...prev,
            [payload.from]:{
              ...(prev[payload.from]||{}),
              line:payload.line,
              col:payload.col,
              lang:payload.lang,
              name:payload.name,
              color:payload.color,
              bg:payload.bg,
              inits:initials(payload.name),
              online:true
            }
          }));
        });
        channel.on("broadcast",{event:"sync"},({payload})=>{
          if(!mounted||payload.from===myId.current)return;
          const eng=getLocalEng(payload.lang);eng.reset(payload.text);
          if(payload.lang===lang){remBuf.current.push({type:"reset",text:payload.text});setRemOps([...remBuf.current]);remBuf.current=[];}
        });
        channel.on("broadcast",{event:"sync_request"},({payload})=>{
          if(payload.from===myId.current)return;
          const eng=getLocalEng(payload.lang);
          channel.send({type:"broadcast",event:"sync",payload:{from:myId.current,lang:payload.lang,text:eng.text}});
        });
        // ─── POSTGRES LINE LOCKS SYNC ───
        channel.on("postgres_changes",{event:"*",schema:"public",table:"line_locks",filter:`document_id=eq.${sessionId}`},({eventType,new:newRec,old:oldRec})=>{
          if(!mounted)return;
          setLockedLines(prev=>{
            const n={...prev};
            if(eventType==="DELETE"){
              // Find and remove lock by this user
              const userId=oldRec.locked_by;
              Object.keys(n).forEach(lineNum=>{
                if(n[lineNum].lockedBy===userId) delete n[lineNum];
              });
            }else if(eventType==="INSERT"||eventType==="UPDATE"){
              // Remove any old lock by this user
              Object.keys(n).forEach(lineNum=>{
                if(n[lineNum].lockedBy===newRec.locked_by) delete n[lineNum];
              });
              n[newRec.line_number]={
                lockedBy:newRec.locked_by,
                // UI info will be populated from peers map during render or we fetch it
              };
            }
            return n;
          });
        });
        
        await channel.subscribe(async(status)=>{
          if(status==="SUBSCRIBED"&&mounted){
            channelRef.current=channel;
            await channel.track({name:me.name,color:me.color,bg:me.bg,lang,line:1,col:1});
            channel.send({type:"broadcast",event:"sync_request",payload:{from:myId.current,lang}});
            // Fetch existing locks from DB
            try{
              const {data}=await sb.from("line_locks").select("*").eq("document_id",sessionId);
              if(data&&data.length>0){
                setLockedLines(prev=>{
                  const n={...prev};
                  data.forEach(l=>{
                    n[l.line_number]={lockedBy:l.locked_by};
                  });
                  return n;
                });
              }
            }catch(e){console.warn("Failed to fetch initial locks",e);}
          }
        });
      } catch(e) {
        setSbStatus("error");
        console.error("Supabase error:", e);
      }
    })();
    // Use synchronous _sb cleanup to avoid StrictMode race condition
    return()=>{
      mounted=false;
      const ch=channelRef.current;
      channelRef.current=null;
      if(ch&&_sb){
        try{_sb.removeChannel(ch);}catch(e){}
      }
    };
  },[me.id]);



  useEffect(()=>{
    if(lang==="py"&&!pyReady&&!pyLoading){setPyLoading(true);loadPy().then(()=>{setPyReady(true);setPyLoading(false);}).catch(()=>setPyLoading(false));}
  },[lang,pyReady,pyLoading]);

  const broadcastOp=useCallback((op,lk)=>{
    channelRef.current?.send({type:"broadcast",event:"op",payload:{from:myId.current,name:me.name,lang:lk,op}});
    setWsLog(prev=>[{dir:"→",msg:`op:${op.type}@${op.pos}`,t:nowTs()},...prev].slice(0,80));
  },[me.name]);

  // ─── AUTO-SAVE ───
  // Debounced save to Supabase documents table (fires 2s after last change)
  // Schema: id UUID, name TEXT, lang TEXT, content TEXT, created_at, updated_at
  const autoSave=useCallback((code,lk)=>{
    clearTimeout(saveTimer.current);
    setSaveStatus('idle');
    saveTimer.current=setTimeout(async()=>{
      setSaveStatus('saving');
      try{
        const sb=await getSB();
        // Use UPDATE (not upsert) — document was created on session start
        const{error}=await sb
          .from('documents')
          .update({content:code,lang:lk,updated_at:new Date().toISOString()})
          .eq('id',sessionId);
        if(error)throw error;
        setSaveStatus('saved');
        setTimeout(()=>setSaveStatus('idle'),3000);
      }catch(e){
        setSaveStatus('error');
        setTimeout(()=>setSaveStatus('idle'),4000);
      }
    },2000);
  },[sessionId]);

  const broadcastCursor=useCallback((line,col,lk)=>{
    channelRef.current?.send({type:"broadcast",event:"cursor",payload:{from:myId.current,name:me.name,color:me.color,bg:me.bg,line,col,lang:lk}});
  },[me.name,me.color,me.bg]);

  // ─── LINE LOCK POSTGRES MUTATIONS ───
  const broadcastLineLock=useCallback(async(lineNum)=>{
    if(!lineNum)return;
    // Optimistic UI update
    setLockedLines(prev=>({
      ...prev,
      [lineNum]:{lockedBy:myId.current,userName:me.name,color:me.color,bg:me.bg}
    }));
    try{
      const sb=await getSB();
      // Upsert lock for this user
      await sb.from("line_locks").upsert(
        {document_id:sessionId,locked_by:myId.current,line_number:lineNum},
        {onConflict:"document_id,locked_by"} // assuming unique constraint on (document_id, locked_by)
      );
    }catch(e){console.warn("Lock line error:",e);}
  },[me.name,me.color,me.bg,sessionId]);

  const broadcastLineUnlock=useCallback(async(lineNum)=>{
    if(!lineNum)return;
    // Optimistic UI update
    setLockedLines(prev=>{
      const n={...prev};
      if(n[lineNum]?.lockedBy===myId.current)delete n[lineNum];
      return n;
    });
    try{
      const sb=await getSB();
      await sb.from("line_locks").delete()
        .eq("document_id",sessionId)
        .eq("locked_by",myId.current);
    }catch(e){console.warn("Unlock line error:",e);}
  },[sessionId]);

  // Called by MonacoEditor when cursor moves to a new line
  const handleLineLock=useCallback((lineNum)=>{
    if(!lineNum)return;
    const prev=myLockedLineRef.current;
    if(prev===lineNum)return; // already locked this line
    if(prev){broadcastLineUnlock(prev);}
    myLockedLineRef.current=lineNum;
    broadcastLineLock(lineNum);
  },[broadcastLineLock,broadcastLineUnlock]);

  const handleLineUnlock=useCallback((lineNum)=>{
    if(!lineNum)return;
    broadcastLineUnlock(lineNum);
    myLockedLineRef.current=null;
  },[broadcastLineUnlock]);

  // Show "Line in use" toast
  const showLineLockToast=useCallback((userName)=>{
    setLockToastMsg(userName);
    clearTimeout(lockToastTmr.current);
    lockToastTmr.current=setTimeout(()=>setLockToastMsg(null),2200);
  },[]);

  const triggerLiveValidation=useCallback((code,lk)=>{
    clearTimeout(liveValTimer.current);
    liveValTimer.current=setTimeout(()=>{if(!code||code.trim().length<3){setLiveValidation(null);return;}setLiveValidation(validateCode(lk,code));},700);
  },[]);

  const handleLocalOp=useCallback(op=>{
    const eng=getLocalEng(lang);const r=eng.apply({...op,uid:myId.current,baseVer:eng.version-1});
    if(r){
      broadcastOp(r,lang);
      setOpCnt(c=>c+1);
      setTabs(p=>p.map(t=>t.id===activeTab?{...t,dirty:true}:t));
      const code=activeEditorRef.current?._getText?.()||eng.text;
      triggerLiveValidation(code,lang);
      autoSave(code,lang); // trigger debounced auto-save
    }
  },[lang,activeTab,broadcastOp,triggerLiveValidation,autoSave]);

  const handleCursorMove=useCallback((line,col)=>{setCursor({line,col});broadcastCursor(line,col,lang);},[lang,broadcastCursor]);

  const switchLang=useCallback(lk=>{setLang(lk);setRemOps([]);remBuf.current=[];setLiveValidation(null);channelRef.current?.track({name:me.name,color:me.color,bg:me.bg,lang:lk,line:cursor.line,col:cursor.col});},[me,cursor.line,cursor.col]);

  const triggerError=useCallback((msg,cLang)=>{setErrPopup({msg,lang:cLang});setErrShake(true);setTimeout(()=>setErrShake(false),400);},[]);

  const handleRun=useCallback(async()=>{
    setRunning(true);setOutOpen(true);setOutTab("output");setErrPopup(null);
    const currentTab=tabs.find(t=>t.id===activeTab);const cLang=currentTab?.lang||lang;
    let code=activeEditorRef.current?._getText?.()||"";
    if(!code.trim())code=getLocalEng(cLang).text;
    setOutput(`⟳  Validating ${LANGS[cLang]?.n||cLang} syntax…`);setOutIsErr(false);
    try{const result=await validateAndRun(cLang,code,pyReady,setPyReady);setOutput(result.output||(result.hasError?"":"(no output)"));setOutIsErr(result.hasError);if(result.hasError&&result.errorMsg)triggerError(result.errorMsg,cLang);}
    catch(e){const msg="Execution Error: "+e.message;setOutput(msg);setOutIsErr(true);triggerError(msg,cLang);}
    setRunning(false);
  },[lang,activeTab,tabs,pyReady,triggerError]);

  const createNewEditor=useCallback(()=>{
    const id="new-"+Date.now();const ext=LANGS[newEdLang]?.ext?.split(".")[1]||newEdLang;
    setTabs(p=>[...p,{id,name:`scratch.${ext}`,lang:newEdLang,dirty:false,isNew:true,code:""}]);
    setActiveTab(id);switchLang(newEdLang);toast(`New ${LANGS[newEdLang]?.n} editor opened`);
  },[newEdLang,switchLang,toast]);

  const handleLogout=async()=>{
    // Unlock any line this user holds before logging out
    if(myLockedLineRef.current){
      const lockLine=myLockedLineRef.current;
      myLockedLineRef.current=null;
      try{
        const sb=await getSB();
        await sb.from("line_locks").delete()
          .eq("document_id",sessionId)
          .eq("locked_by",myId.current);
      }catch(e){}
    }
    try{const sb=await getSB();await sb.auth.signOut();}catch(e){console.error(e);}
    onLogout();
  };

  const CMDS=[
    {ic:"▶",lb:"Run Code",kb:"Ctrl+Enter",fn:handleRun},
    {ic:"📄",lb:"New Editor",kb:"Ctrl+N",fn:createNewEditor},
    {ic:"💾",lb:"Save All",kb:"",fn:()=>{setTabs(p=>p.map(t=>({...t,dirty:false})));toast("All files saved");}},
    {ic:"🐛",lb:"Debugging Room",kb:"",fn:()=>setShowDebugRoom(true)},
    {ic:"📡",lb:"Server Logs",kb:"",fn:()=>setShowServerLogs(true)},
    {ic:"🚪",lb:"Sign Out",kb:"",fn:handleLogout},
    ...LK.map(lk=>({ic:LANGS[lk].ic,lb:`Switch to ${LANGS[lk].n}`,kb:"",fn:()=>{switchLang(lk);setCmdOpen(false);}})),
  ];
  const runCmd=c=>{c.fn();setCmdOpen(false);setCmdQ("");};
  const filtCmds=cmdQ.replace(/^>/,"").trim()?CMDS.filter(c=>c.lb.toLowerCase().includes(cmdQ.replace(/^>/,"").trim().toLowerCase())):CMDS;

  useEffect(()=>{
    const h=e=>{
      const C=e.ctrlKey||e.metaKey;
      if(C&&e.shiftKey&&e.key==="P"){e.preventDefault();setCmdOpen(o=>!o);setCmdQ("");}
      if(C&&e.key==="Enter"){e.preventDefault();handleRun();}
      if(C&&e.key==="n"){e.preventDefault();createNewEditor();}
      if(e.key==="Escape"){setCmdOpen(false);setErrPopup(null);setShowDebugRoom(false);setShowServerLogs(false);}
      if(cmdOpen){if(e.key==="ArrowDown"){e.preventDefault();setCmdSel(s=>Math.min(s+1,filtCmds.length-1));}if(e.key==="ArrowUp"){e.preventDefault();setCmdSel(s=>Math.max(s-1,0));}if(e.key==="Enter"&&filtCmds[cmdSel]){e.preventDefault();runCmd(filtCmds[cmdSel]);}}
    };
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[cmdOpen,cmdSel,handleRun,createNewEditor,filtCmds]);

  const closeTab=(id,e)=>{e.stopPropagation();setTabs(p=>{const nx=p.filter(t=>t.id!==id);if(activeTab===id&&nx.length)setActiveTab(nx[nx.length-1].id);return nx;});};

  const curEng=getLocalEng(lang);const curTab=tabs.find(t=>t.id===activeTab);
  const errCount=liveValidation?.errors?.length||0;const warnCount=liveValidation?.warnings?.length||0;
  const realPeerCursors=Object.entries(peers).filter(([,p])=>p.lang===lang&&p.online).map(([id,p])=>({id,...p}));
  const onlineCount=1+Object.values(peers).filter(p=>p.online).length;

  const renderOutput=(text)=>{
    if(!text)return<div className="ol-dim" style={{fontFamily:"var(--mono)",fontSize:12}}>Press ▶ Run or Ctrl+Enter to execute</div>;
    return text.split("\n").map((line,i)=>{
      let cls="ol-info";
      if(/^❌/.test(line))cls="ol-err";else if(/^⚠/.test(line))cls="ol-warn";else if(/^\s*✖/.test(line))cls="ol-err";else if(/^✓|^✅/.test(line))cls="ol-ok";else if(/^(⟳|Compiled:|Compiling|Finished|Running|go build|g\+\+)/.test(line))cls="ol-build";else if(/^(error:|sql error|fatal error)/i.test(line.trim()))cls="ol-err";else if(/^warning/i.test(line.trim()))cls="ol-warn";else if(/^Process finished with exit code 0/.test(line))cls="ol-success";else if(/Query OK|row(s)? in set/i.test(line))cls="ol-success";else if(/Fix the error/i.test(line))cls="ol-dim";
      return<div key={i} className={cls} style={{fontFamily:"var(--mono)",fontSize:12,lineHeight:1.8}}>{line||"\u00A0"}</div>;
    });
  };

  const renderValBadge=()=>{
    if(!liveValidation)return null;
    if(liveValidation.hasError)return<div className="val-fail val-pop">⊗ {errCount} error{errCount>1?"s":""}</div>;
    if(liveValidation.hasWarning)return<div className="val-warn val-pop">⚠ {warnCount} warning{warnCount>1?"s":""}</div>;
    return<div className="val-pass val-pop">✓ Valid {LANGS[lang]?.n}</div>;
  };

  const SB=({children,c,onClick})=><span className="st" style={{color:c||"#4a5568"}} onClick={onClick}>{children}</span>;

  return(
    <>
      <style>{CSS}</style>
      <ErrorPopup error={errPopup?.msg||null} lang={errPopup?.lang||lang} onClose={()=>setErrPopup(null)} onOpenOutput={()=>{setOutOpen(true);setOutTab("output");}}/>
      {showDebugRoom&&<DebuggingRoom errors={liveValidation?.errors||[]} warnings={liveValidation?.warnings||[]} lang={lang} me={me} onClose={()=>setShowDebugRoom(false)}/>}
      {showServerLogs&&<LiveServerLogs onClose={()=>setShowServerLogs(false)}/>}

      {/* TOPBAR */}
      <div className="topbar">
        <div className="tb-logo"><div className="gem">⚡</div>CKC-OS</div>
        <div className="live-badge">
          <div className={`live-dot${sbStatus==="connected"?" pulse":""}`} style={{background:sbStatus==="connected"?"#4EC9B0":sbStatus==="error"?"#FF6B9D":"#DCDCAA"}}/>
          LIVE · {onlineCount}
        </div>
        <div style={{display:"flex",gap:2,overflow:"hidden",flex:1,minWidth:0}}>
          {LK.map(lk=>{const l=LANGS[lk],on=lang===lk;return(<div key={lk} className={`lp${on?" on":""}`} style={{color:on?l.c:"#6a7585",background:on?l.bg:"transparent",borderColor:on?"rgba(255,255,255,.1)":"transparent"}} onClick={()=>switchLang(lk)}><span style={{fontFamily:"var(--mono)",fontSize:10,fontWeight:700}}>{l.ic}</span><span style={{fontSize:11}}>{l.n}</span></div>);})}
        </div>
        {lang==="py"&&(pyLoading?<div className="py-badge" style={{background:"rgba(220,220,170,.1)",border:"1px solid rgba(220,220,170,.25)",color:"#DCDCAA"}}><span className="spin" style={{display:"inline-block",width:9,height:9,borderRadius:"50%",border:"1.5px solid #DCDCAA",borderTopColor:"transparent"}}/>Loading…</div>:pyReady?<div className="py-badge" style={{background:"rgba(78,201,176,.08)",border:"1px solid rgba(78,201,176,.2)",color:"#4EC9B0"}}>🐍 Ready</div>:null)}
        {renderValBadge()}
        <div className={`tool-btn dbg${errShake?" err-shake":""}`} style={{cursor:"pointer"}} onClick={()=>{setOutOpen(true);setOutTab("problems");}}>🐛 {errCount+warnCount} issues</div>
        <button className="tool-btn dbg" onClick={()=>setShowDebugRoom(true)}>🔬 Debug Room</button>
        <button className="tool-btn logs" onClick={()=>setShowServerLogs(true)}>📡 Logs</button>
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <select value={newEdLang} onChange={e=>setNewEdLang(e.target.value)} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:5,color:"#8892a4",fontSize:11,padding:"4px 6px",fontFamily:"var(--mono)",cursor:"pointer",outline:"none"}}>{LK.map(lk=><option key={lk} value={lk}>{LANGS[lk].ic} {LANGS[lk].n}</option>)}</select>
          <button className="new-ed-btn" onClick={createNewEditor}>＋ New</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:2,flexShrink:0}}>
          {Object.entries(peers).filter(([,p])=>p.online).map(([id,p])=>(<div key={id} className="av" style={{background:p.bg,color:p.color,border:`2px solid ${p.color}55`}} title={`${p.name} — Ln ${p.line}`}>{p.inits}<div className="online-dot" style={{background:"#4EC9B0"}}/></div>))}
          <div className="av me" style={{background:me.bg||"rgba(79,193,255,.18)",color:me.color||"#4FC1FF"}} title={`${me.name} (you)`}>{me.inits}<div className="online-dot" style={{background:"#4EC9B0"}}/></div>
        </div>
        <button className={`run-btn${running?" running":""}`} onClick={handleRun} disabled={running} style={{flexShrink:0}}>{running?<span className="spin" style={{display:"inline-block",width:10,height:10,borderRadius:"50%",border:"1.5px solid currentColor",borderTopColor:"transparent"}}/>:"▶"}{running?"Running…":"Run"}</button>
        <button onClick={handleLogout} style={{padding:"4px 10px",borderRadius:5,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",color:"#4a5568",cursor:"pointer",fontSize:11,fontFamily:"Inter,sans-serif",whiteSpace:"nowrap",flexShrink:0}}>← Exit</button>
      </div>

      {/* MAIN */}
      <div style={{display:"flex",height:"calc(100vh - 70px)",overflow:"hidden"}}>

        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sec-hdr">Explorer</div>
          {[{id:"f_eng",name:"engine.ts",lang:"ts",icon:"🔷"},{id:"f_rm",name:"README.md",lang:"ts",icon:"📄"},{id:"f_env",name:".env",lang:"ts",icon:"⚙"}].map(f=>(
            <div key={f.id} className={`ft${activeTab===f.id?" sel":""}`} onClick={()=>{const lk=LANGS[f.lang]?f.lang:"ts";if(!tabs.find(t=>t.id===f.id))setTabs(p=>[...p,{id:f.id,name:f.name,lang:lk,dirty:false,isNew:false}]);setActiveTab(f.id);switchLang(lk);}}>
              <span style={{fontSize:12,flexShrink:0}}>{f.icon}</span>
              <span style={{color:activeTab===f.id?"#4FC1FF":"#c0c8d8",flex:1,overflow:"hidden",textOverflow:"ellipsis",fontSize:12}}>{f.name}</span>
              {LANGS[f.lang]&&<span style={{fontSize:9,fontWeight:700,color:LANGS[f.lang]?.c,fontFamily:"var(--mono)",flexShrink:0}}>{LANGS[f.lang]?.ic}</span>}
            </div>
          ))}
          {tabs.filter(t=>t.isNew).map(t=>(<div key={t.id} className={`ft${activeTab===t.id?" sel":""}`} onClick={()=>{setActiveTab(t.id);switchLang(t.lang);}}><span className="new-tab-dot" style={{flexShrink:0}}/><span style={{color:"#4EC9B0",flex:1,overflow:"hidden",textOverflow:"ellipsis",fontSize:12}}>{t.name}</span></div>))}
          <div className="divider"/>

          <div className="sec-hdr" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>Collaborators</span>
            <span style={{color:"#4EC9B0",fontSize:9,fontWeight:700,background:"rgba(78,201,176,.12)",border:"1px solid rgba(78,201,176,.2)",borderRadius:10,padding:"1px 6px"}}>{onlineCount} online</span>
          </div>
          <div className="presence-card">
            <div className="presence-av" style={{background:me.bg||"rgba(79,193,255,.18)",color:me.color||"#4FC1FF",borderColor:(me.color||"#4FC1FF")+"66"}}>{me.inits}<div className="pdot" style={{background:"#4EC9B0"}}/></div>
            <div className="presence-info">
              <div className="presence-name"><span>{me.name}</span><span style={{fontSize:9,color:"#4a5568",background:"rgba(255,255,255,.05)",padding:"1px 5px",borderRadius:4}}>you</span></div>
              <div className="presence-pos" style={{color:me.color||"#4FC1FF"}}>Ln {cursor.line} · Col {cursor.col} · {LANGS[lang]?.n}</div>
            </div>
          </div>
          {Object.entries(peers).filter(([,p])=>p.online).map(([id,p])=>{
            // Find if this peer has any locked line
            const peerLock=Object.entries(lockedLines).find(([,l])=>l.lockedBy===id);
            return(
              <div key={id} className="presence-card">
                <div className="presence-av" style={{background:p.bg,color:p.color,borderColor:p.color+"66"}}>{p.inits}<div className="pdot" style={{background:"#4EC9B0"}}/></div>
                <div className="presence-info">
                  <div className="presence-name" style={{color:"#c0c8d8"}}>{p.name}<span style={{fontSize:9,color:"#4EC9B0",background:"rgba(78,201,176,.1)",padding:"1px 5px",borderRadius:4,marginLeft:4}}>live</span></div>
                  <div className="presence-pos" style={{color:p.color}}>Ln {p.line} · Col {p.col} · {LANGS[p.lang]?.n||p.lang}</div>
                  {peerLock&&<div style={{fontSize:10,color:p.color,display:"flex",alignItems:"center",gap:3,marginTop:2}}><span>🔒</span><span>Ln {peerLock[0]} locked</span></div>}
                </div>
              </div>
            );
          })}

          <div className="divider"/>
          <div style={{padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"#4a5568",marginBottom:4,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"}}>Session</div>
            <div style={{fontFamily:"var(--mono)",fontSize:10,color:"#6a7585",lineHeight:1.8}}>
              <div>User: <span style={{color:me.color}}>{me.name}</span></div>
              <div>Ops: <span style={{color:"#4EC9B0"}}>{opCnt}</span></div>
              <div>OT Ver: <span style={{color:"#DCDCAA"}}>v{curEng.version}</span></div>
              <div>Size: <span style={{color:"#CE9178"}}>{curEng.text.length}ch</span></div>
              <div>Locks: <span style={{color:"#FF6B9D"}}>{Object.keys(lockedLines).length}</span></div>
              <div>Editor: <span style={{color:"#4FC1FF"}}>Monaco</span></div>
            </div>
          </div>

          <div style={{padding:"0 8px 8px"}}>
            <div onClick={()=>setShowDebugRoom(true)} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",borderRadius:7,background:"rgba(255,107,157,.06)",border:"1px solid rgba(255,107,157,.18)",cursor:"pointer",marginBottom:5,transition:"all .15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,107,157,.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,107,157,.06)"}>
              <span style={{fontSize:14}}>🔬</span><div style={{flex:1}}><div style={{fontSize:11,color:"#FF6B9D",fontWeight:600}}>Debugging Room</div><div style={{fontSize:10,color:"#4a5568"}}>Team error analysis</div></div>
              {(errCount+warnCount)>0&&<span style={{fontSize:9,background:"#FF6B9D",color:"#fff",borderRadius:10,padding:"1px 5px",fontWeight:700}}>{errCount+warnCount}</span>}
            </div>
            <div onClick={()=>setShowServerLogs(true)} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",borderRadius:7,background:"rgba(79,193,255,.06)",border:"1px solid rgba(79,193,255,.15)",cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(79,193,255,.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(79,193,255,.06)"}>
              <span style={{fontSize:14}}>📡</span><div style={{flex:1}}><div style={{fontSize:11,color:"#4FC1FF",fontWeight:600}}>Server Logs</div><div style={{fontSize:10,color:"#4a5568"}}>Live DevOps monitor</div></div>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#4EC9B0",boxShadow:"0 0 5px #4EC9B0"}} className="pulse"/>
            </div>
          </div>

          {liveValidation&&(liveValidation.hasError||liveValidation.hasWarning)&&(
            <div style={{margin:"0 8px 8px",borderRadius:7,background:liveValidation.hasError?"rgba(255,107,157,.06)":"rgba(220,220,170,.06)",border:`1px solid ${liveValidation.hasError?"rgba(255,107,157,.2)":"rgba(220,220,170,.2)"}`,padding:"7px 9px",maxHeight:140,overflowY:"auto"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:liveValidation.hasError?"#FF6B9D":"#DCDCAA"}}>{liveValidation.hasError?`⊗ ${errCount} Error(s)`:`⚠ ${warnCount} Warning(s)`}</div>
                <button onClick={()=>setShowDebugRoom(true)} style={{fontSize:9,color:"#FF6B9D",background:"rgba(255,107,157,.12)",border:"1px solid rgba(255,107,157,.25)",borderRadius:4,padding:"1px 6px",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:700}}>Debug →</button>
              </div>
              {liveValidation.errors.map((e,i)=>(<div key={i} style={{fontSize:10,color:"#ff8090",fontFamily:"var(--mono)",lineHeight:1.6,marginBottom:2,wordBreak:"break-word"}}>✖ {e}</div>))}
              {liveValidation.warnings.map((w,i)=>(<div key={i} style={{fontSize:10,color:"#DCDCAA",fontFamily:"var(--mono)",lineHeight:1.6,marginBottom:2,wordBreak:"break-word"}}>⚠ {w}</div>))}
            </div>
          )}
        </div>

        {/* EDITOR AREA */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
          {/* Tab bar */}
          <div style={{display:"flex",background:"var(--bg3)",height:36,flexShrink:0,overflowX:"auto",overflowY:"hidden",alignItems:"flex-end",borderBottom:"1px solid var(--bdr)"}}>
            {tabs.map(t=>{const tl=LANGS[t.lang]||LANGS.ts;return(
              <div key={t.id} className={`tab ${activeTab===t.id?"on":"off"}`} onClick={()=>{setActiveTab(t.id);if(LANGS[t.lang])switchLang(t.lang);}}>
                {t.isNew&&<span className="new-tab-dot" style={{marginRight:4}}/>}
                <span style={{fontSize:9,color:tl.c,fontWeight:700,flexShrink:0}}>{tl.ic}</span>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{t.name}</span>
                {t.dirty&&<span style={{fontSize:12,color:"#4a5568",lineHeight:1,flexShrink:0}}>●</span>}
                <span className="tx" onClick={e=>closeTab(t.id,e)}>✕</span>
              </div>
            );})}
            <div style={{flex:1}}/>
            <button className={`run-btn${running?" running":""}`} onClick={handleRun} disabled={running} style={{margin:"4px 8px 4px 0",padding:"3px 10px",fontSize:11}}>{running?"⟳ Running…":"▶ Run"}</button>
          </div>

          {/* Breadcrumb */}
          <div className="bc">
            <span>src</span><span style={{color:"var(--txt3)"}}>/</span>
            <span style={{color:"#e0e0e0"}}>{curTab?.name||"—"}</span>
            {curTab?.isNew&&<span style={{color:"#4EC9B0",marginLeft:4,fontSize:10}}>● new</span>}
            <span style={{marginLeft:"auto",fontSize:10,color:"var(--txt3)",fontFamily:"var(--mono)"}}>
              {realPeerCursors.length>0&&`${realPeerCursors.length} peer${realPeerCursors.length>1?"s":""} · `}OT v{curEng.version} · Monaco Editor
            </span>
            {liveValidation&&(<span style={{marginLeft:8,fontSize:10,color:liveValidation.hasError?"#FF6B9D":liveValidation.hasWarning?"#DCDCAA":"#4EC9B0",fontWeight:700,cursor:liveValidation.hasError?"pointer":"default"}} onClick={()=>liveValidation.hasError&&setShowDebugRoom(true)}>{liveValidation.hasError?`⊗ ${errCount} error(s) →`:liveValidation.hasWarning?`⚠ ${warnCount} warning(s)`:"✓ Valid"}</span>)}
          </div>

          {/* Monaco Editor */}
          <div style={{flex:1,overflow:"hidden",minHeight:0,display:"flex"}}>
            <div style={{flex:1,overflow:"hidden"}}>
              {activeTab?(
                <MonacoEditor
                  key={activeTab+lang}
                  ref={activeEditorRef}
                  lang={lang}
                  initText={curTab?.isNew?(curTab.code||""):curEng.text}
                  fileKey={activeTab}
                  onLocalOp={handleLocalOp}
                  onCursorMove={handleCursorMove}
                  remoteOps={curTab?.isNew?[]:remOps}
                  cursors={curTab?.isNew?[]:realPeerCursors}
                  readOnly={false}
                  lockedLines={curTab?.isNew?{}:Object.fromEntries(
                    Object.entries(lockedLines).map(([ln, lock]) => {
                      const p = lock.lockedBy === myId.current ? me : peers[lock.lockedBy];
                      return [ln, { ...lock, userName: p?.name || 'Unknown', color: p?.color || '#8892a4', bg: p?.bg }];
                    })
                  )}
                  myUserId={myId.current}
                  onLineLock={handleLineLock}
                  onLineUnlock={handleLineUnlock}
                  showLockToast={showLineLockToast}
                />
              ):(
                <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:"#4a5568"}}>
                  <div style={{fontSize:48,opacity:.1}}>⚡</div>
                  <div style={{fontSize:16,color:"#6a7585"}}>No file open</div>
                  <button className="new-ed-btn" onClick={createNewEditor}>＋ New Editor</button>
                </div>
              )}
            </div>
          </div>

          {/* Output panel */}
          {outOpen&&(
            <div className="out-panel" style={{height:220}}>
              <div className="out-hdr">
                {[["output","Output"],["terminal","Terminal"],["problems",`Problems (${errCount+warnCount})`]].map(([id,lb])=>(
                  <div key={id} className={`out-tab${outTab===id?" on":""}`} onClick={()=>setOutTab(id)}>
                    {id==="output"&&outIsErr&&<span style={{width:6,height:6,borderRadius:"50%",background:"#FF6B9D",display:"inline-block"}} className="pulse"/>}{lb}
                  </div>
                ))}
                <div style={{flex:1}}/>
                <button className={`run-btn${running?" running":""}`} onClick={handleRun} disabled={running} style={{margin:"4px 8px",padding:"3px 10px",fontSize:11}}>{running?"⟳ Running…":"▶ Run"}</button>
                <div style={{width:24,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#4a5568",fontSize:13}} onClick={()=>setOutOpen(false)}>✕</div>
              </div>
              {outTab==="output"&&(
                <div style={{flex:1,overflowY:"auto",padding:"10px 14px",background:"#0a0c10",minHeight:0,borderTop:outIsErr?"1px solid rgba(255,107,157,.18)":"none"}}>
                  {running?<div style={{color:"#4FC1FF",fontFamily:"var(--mono)",fontSize:12,display:"flex",alignItems:"center",gap:8}}><span className="spin" style={{display:"inline-block",width:10,height:10,borderRadius:"50%",border:"1.5px solid #4FC1FF",borderTopColor:"transparent"}}/>Running {LANGS[curTab?.lang||lang]?.n||"code"}…</div>:renderOutput(output)}
                </div>
              )}
              {outTab==="terminal"&&(
                <div style={{flex:1,padding:"8px 14px",fontFamily:"var(--mono)",fontSize:12,color:"#4FC1FF",background:"#0a0c10"}}>
                  <div>$ ckc-os run --lang={lang} --user={me.name}</div>
                  <div style={{color:"#4EC9B0"}}>✓ Session active · {onlineCount} collaborator(s) · OT v{curEng.version} · Supabase Realtime · Monaco Editor</div>
                  {lang==="py"&&<div style={{color:pyReady?"#4EC9B0":"#DCDCAA"}}>🐍 Pyodide: {pyReady?"loaded and ready":"press Run to load"}</div>}
                  <div style={{color:"#4a5568",marginTop:4}}>$ _</div>
                </div>
              )}
              {outTab==="problems"&&(
                <div style={{flex:1,overflowY:"auto",background:"#0a0c10"}}>
                  {liveValidation&&(liveValidation.errors.length>0||liveValidation.warnings.length>0)?(
                    <>
                      <div style={{padding:"6px 14px",borderBottom:"1px solid rgba(255,255,255,.04)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontSize:10,color:"#4a5568"}}>{errCount} error(s) · {warnCount} warning(s)</span>
                        <button onClick={()=>setShowDebugRoom(true)} style={{fontSize:10,color:"#FF6B9D",background:"rgba(255,107,157,.1)",border:"1px solid rgba(255,107,157,.25)",borderRadius:5,padding:"2px 9px",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:700}}>🔬 Debug Room</button>
                      </div>
                      {liveValidation.errors.map((e,i)=>(<div key={`e-${i}`} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"5px 14px",borderBottom:"1px solid rgba(255,255,255,.04)"}}><span style={{color:"#FF6B9D",fontSize:13,flexShrink:0}}>⊗</span><div><div style={{fontSize:12,color:"#c0c8d8"}}>{e}</div><div style={{fontSize:11,color:"#4a5568",marginTop:1}}>{LANGS[lang]?.ext}</div></div></div>))}
                      {liveValidation.warnings.map((w,i)=>(<div key={`w-${i}`} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"5px 14px",borderBottom:"1px solid rgba(255,255,255,.04)"}}><span style={{color:"#DCDCAA",fontSize:13,flexShrink:0}}>⚠</span><div><div style={{fontSize:12,color:"#c0c8d8"}}>{w}</div></div></div>))}
                    </>
                  ):(
                    <div style={{padding:"20px",textAlign:"center",color:"#4a5568",fontSize:12}}><div style={{fontSize:24,marginBottom:8}}>✓</div>No problems<div style={{fontSize:11,marginTop:4,color:"#333"}}>Start typing to validate</div></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={{width:210,background:"var(--bg2)",borderLeft:"1px solid var(--bdr)",display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
          <div style={{display:"flex",borderBottom:"1px solid var(--bdr)",flexShrink:0,background:"var(--bg3)"}}>
            {[["crdt","OT/CRDT"],["ws","WS Log"]].map(([id,lb])=>(<div key={id} className={`rp-tab${rpTab===id?" on":""}`} onClick={()=>setRpTab(id)} style={{flex:1,textAlign:"center"}}>{lb}</div>))}
          </div>
          {rpTab==="crdt"&&(
            <div style={{flex:1,overflowY:"auto",padding:"6px"}}>
              <div style={{fontSize:9,color:"#4a5568",padding:"2px 4px 4px",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"}}>OT Operations · {crdt.length}</div>
              {crdt.map((op,i)=>{const t=op.type||"retain";return(
                <div key={i} className={`op-card ${t}`}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}><span className={`op-badge ${t}`}>{t.toUpperCase()}</span><span style={{fontSize:9,color:"#4a5568",fontFamily:"var(--mono)"}}>{op.t}</span></div>
                  {t==="insert"&&<div style={{fontSize:10,fontFamily:"var(--mono)",color:"#4FC1FF",marginBottom:2,wordBreak:"break-all"}}>ins("{op.chars?.slice(0,12)?.replace(/\n/g,"↵")||"…"}",@{op.pos})</div>}
                  {t==="retain"&&<div style={{fontSize:10,fontFamily:"var(--mono)",color:"#6a7585"}}>retain(@{op.pos||0})</div>}
                  {t==="delete"&&<div style={{fontSize:10,fontFamily:"var(--mono)",color:"#ff6363"}}>del(@{op.pos},len:{op.len})</div>}
                  {op.from&&<div style={{fontSize:10,color:"#4FC1FF",display:"flex",alignItems:"center",gap:3,marginTop:2}}><span style={{width:5,height:5,borderRadius:"50%",background:"#4FC1FF",display:"inline-block"}}/>{op.from}</div>}
                </div>
              );})}
              {crdt.length===0&&<div style={{padding:"12px 8px",fontSize:11,color:"#333",textAlign:"center"}}>Waiting for ops…<br/><span style={{fontSize:10,color:"#2a3040"}}>Start typing to see operations</span></div>}
            </div>
          )}
          {rpTab==="ws"&&(
            <div style={{flex:1,overflowY:"auto",padding:"6px"}}>
              <div style={{fontSize:9,color:"#4a5568",padding:"2px 4px 4px",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"}}>Supabase Realtime</div>
              {wsLog.slice(0,25).map((e,i)=>(<div key={i} className={`ws-entry ${e.dir==="←"?"in":"out"}`}><span style={{fontSize:8,color:"#333",display:"block",marginBottom:1}}>{e.t}</span><span style={{marginRight:4}}>{e.dir==="←"?"↙":"↗"}</span>{e.msg}</div>))}
              {wsLog.length===0&&<div style={{padding:"12px 8px",fontSize:11,color:"#333",textAlign:"center"}}>No events yet</div>}
            </div>
          )}
          <div style={{padding:"8px 10px",borderTop:"1px solid var(--bdr)",flexShrink:0}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {[{label:"Ops",value:opCnt,color:"#4FC1FF"},{label:"Ver",value:`v${curEng.version}`,color:"#4EC9B0"},{label:"Size",value:`${curEng.text.length}ch`,color:"#DCDCAA"},{label:"Online",value:onlineCount,color:"#FF6B9D"}].map(s=>(
                <div key={s.label} style={{background:"rgba(255,255,255,.02)",borderRadius:5,padding:"4px 7px"}}><div style={{fontSize:9,color:"#4a5568",textTransform:"uppercase",letterSpacing:".08em"}}>{s.label}</div><div style={{fontSize:13,fontWeight:700,color:s.color,fontFamily:"var(--mono)"}}>{s.value}</div></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="statusbar">
        <SB c="#4EC9B0">⬡ {onlineCount} online</SB>
        <SB c={errCount>0?"#FF6B9D":"#4a5568"} onClick={()=>{setOutOpen(true);setOutTab("problems");}}>⊗ {errCount} · ⚠ {warnCount}</SB>
        <SB c="#4FC1FF">Supabase Realtime · OT v{curEng.version}</SB>
        <SB c="#FF6B9Daa" onClick={()=>setShowDebugRoom(true)}>🔬 Debug</SB>
        <SB c="#4FC1FFaa" onClick={()=>setShowServerLogs(true)}>📡 Logs</SB>
        <SB c={sbStatus==="connected"?"#4EC9B0":"#DCDCAA"}>● {sessionId}</SB>
        <SB c="#A78BFA" onClick={()=>setShowGitBridge(true)}>🔀 Git</SB>
        <div style={{flex:1}}/>
        {saveStatus==='saving'&&<SB c="#4FC1FF">↻ Saving…</SB>}
        {saveStatus==='saved'&&<SB c="#4EC9B0">✓ Saved</SB>}
        {saveStatus==='error'&&<SB c="#FF6B9D">⚠ Save failed</SB>}
        <SB>Ln {cursor.line}, Col {cursor.col}</SB>
        <SB>UTF-8</SB>
        <SB c="#FFB547">↕ {opCnt} ops</SB>
        <SB c="#4EC9B0">Monaco ⬡</SB>
        {lang==="py"&&<SB c={pyReady?"#4EC9B0":"#DCDCAA"}>🐍 {pyReady?"Pyodide":"…"}</SB>}
        <SB c={me.color}>● {me.name}</SB>
        <SB c="#4FC1FF">CKC-OS v6.0</SB>
      </div>

      {/* CMD PALETTE */}
      {cmdOpen&&(
        <div className="cp-ov" onClick={()=>setCmdOpen(false)}>
          <div className="cp-box fi" onClick={e=>e.stopPropagation()}>
            <input autoFocus className="cp-in" value={cmdQ} onChange={e=>{setCmdQ(e.target.value);setCmdSel(0);}} placeholder="> Commands, languages, run…"/>
            <div style={{overflowY:"auto",flex:1}}>
              {filtCmds.map((c,i)=>(<div key={i} className={`cp-row${cmdSel===i?" hi":""}`} onMouseEnter={()=>setCmdSel(i)} onClick={()=>runCmd(c)}><span style={{fontSize:14}}>{c.ic}</span><span style={{flex:1}}>{c.lb}</span>{c.kb&&<span style={{fontSize:10,color:"#4a5568",fontFamily:"var(--mono)"}}>{c.kb}</span>}</div>))}
            </div>
          </div>
        </div>
      )}

      {notif&&<div className="toast">{notif}</div>}
      {/* LINE LOCK TOAST — shown when another user tries to edit a locked line */}
      {lockToastMsg&&(
        <div className="lock-toast">
          <span className="lock-toast-icon">🔒</span>
          Line in use by <strong style={{color:"#ffb3c8",marginLeft:3}}>{lockToastMsg}</strong>
        </div>
      )}

      {/* GIT BRIDGE */}
      {showGitBridge && <GitBridge onClose={()=>setShowGitBridge(false)} editorCode={curEng.text} editorLang={lang} />}
    </>
  );
}

// ═══════════ ROOT APP ═══════════
export default function EditorPage(){
  const[authState,setAuthState]=useState(null);
  const[sessionId,setSessionId]=useState(null); // null = session page, string = in editor
  const[checking,setChecking]=useState(true);
  const[initError,setInitError]=useState("");

  useEffect(()=>{
    (async()=>{
      try {
        const sb=await getSB();
        const{data:{session}}=await sb.auth.getSession();
        if(session?.user){
          try {
            const{data:profile}=await sb.from("users").select("*").eq("id",session.user.id).single();
            const colorData=profile?.color||{hex:"#4FC1FF",bg:"rgba(79,193,255,.22)"};
            setAuthState({me:{id:session.user.id,name:profile?.username||session.user.email?.split("@")[0]||"User",email:session.user.email,color:colorData.hex||"#4FC1FF",bg:colorData.bg||"rgba(79,193,255,.22)",inits:initials(profile?.username||session.user.email?.split("@")[0]||"U")},session});
          } catch(e) {
            setAuthState({me:{id:session.user.id,name:session.user.email?.split("@")[0]||"User",email:session.user.email,color:"#4FC1FF",bg:"rgba(79,193,255,.22)",inits:initials(session.user.email?.split("@")[0]||"U")},session});
          }
        }
        sb.auth.onAuthStateChange(async(event,session)=>{
          if(event==="SIGNED_OUT"||!session){setAuthState(null);return;}
          if(event==="SIGNED_IN"&&session.user){
            try {
              const{data:profile}=await sb.from("users").select("*").eq("id",session.user.id).single();
              const colorData=profile?.color||{hex:"#4FC1FF",bg:"rgba(79,193,255,.22)"};
              setAuthState({me:{id:session.user.id,name:profile?.username||session.user.email?.split("@")[0]||"User",email:session.user.email,color:colorData.hex||"#4FC1FF",bg:colorData.bg||"rgba(79,193,255,.22)",inits:initials(profile?.username||session.user.email?.split("@")[0]||"U")},session});
            } catch(e) {
              setAuthState({me:{id:session.user.id,name:session.user.email?.split("@")[0]||"User",email:session.user.email,color:"#4FC1FF",bg:"rgba(79,193,255,.22)",inits:initials(session.user.email?.split("@")[0]||"U")},session});
            }
          }
        });
      } catch(e) {
        setInitError("Failed to connect: "+e.message);
      }
      setChecking(false);
    })();
  },[]);

  if(checking){
    return(
      <div style={{minHeight:"100vh",background:"#080a0e",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <style>{CSS}</style>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
          <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#4FC1FF,#4EC9B0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>⚡</div>
          <div style={{color:"#4a5568",fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>Connecting to Supabase…</div>
          <div className="spin" style={{width:20,height:20,borderRadius:"50%",border:"2px solid #4FC1FF",borderTopColor:"transparent"}}/>
        </div>
      </div>
    );
  }

  if(initError){
    return(
      <div style={{minHeight:"100vh",background:"#080a0e",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <style>{CSS}</style>
        <div style={{textAlign:"center",maxWidth:440,padding:32}}>
          <div style={{fontSize:32,marginBottom:16}}>⚠️</div>
          <div style={{color:"#FF6B9D",fontSize:14,fontWeight:700,marginBottom:8}}>Connection Error</div>
          <div style={{color:"#4a5568",fontSize:12,fontFamily:"monospace",lineHeight:1.6,background:"rgba(255,107,157,.06)",border:"1px solid rgba(255,107,157,.2)",borderRadius:8,padding:12}}>{initError}</div>
          <button onClick={()=>window.location.reload()} style={{marginTop:16,padding:"8px 20px",borderRadius:8,background:"rgba(79,193,255,.15)",border:"1px solid rgba(79,193,255,.3)",color:"#4FC1FF",cursor:"pointer",fontFamily:"Inter,sans-serif",fontSize:12,fontWeight:600}}>Retry</button>
        </div>
      </div>
    );
  }

  if(!authState){return<AuthPage onAuth={(me,session)=>setAuthState({me,session})}/>;}
  // Show session picker after auth if no active session
  if(!sessionId){
    return<SessionPage me={authState.me} onJoin={id=>setSessionId(id)} onLogout={()=>setAuthState(null)}/>;
  }
  return<Shell me={authState.me} sessionId={sessionId} onLogout={()=>{setAuthState(null);setSessionId(null);}}/>;
}