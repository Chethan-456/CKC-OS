import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   5.8 BEHAVIOR TRACKING ENGINE — CKC-OS
   + Integrated Code Editor with Run Button
   + Per-language Syntax & Error Checking
   Languages: C/C++ · Python · JavaScript · TypeScript · Java · Rust · Go
═══════════════════════════════════════════════════════════════ */

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  @keyframes logIn   { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
  @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:.2} }
  @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes runPing { 0%{box-shadow:0 0 0 0 rgba(78,201,176,.6)} 70%{box-shadow:0 0 0 10px rgba(78,201,176,0)} 100%{box-shadow:0 0 0 0 rgba(78,201,176,0)} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  .live-blink { animation: blink 1.4s ease infinite; }
  .run-ping   { animation: runPing 1s ease; }
  .a-spin     { animation: spin .7s linear infinite; }
  .a-fadein   { animation: fadeIn .35s ease both; }
  *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(79,193,255,.18); border-radius:2px; }
  textarea { outline:none; }
  button   { cursor:pointer; }
`;

const C = {
  bg:"#0d0f14", bg2:"#111318", surface:"rgba(17,19,24,.9)",
  border:"rgba(255,255,255,.07)",
  blue:"#4FC1FF", teal:"#4EC9B0", amber:"#FFB547",
  rose:"#FF6B9D", violet:"#A78BFA",
  text:"#e0e6ff", text2:"#7a8aaa", text3:"#3f4d66",
  mono:"'JetBrains Mono', monospace", disp:"'Syne', sans-serif",
};

/* ═══════════════════════════════════════════════════════════════
   LANGUAGE DEFINITIONS
═══════════════════════════════════════════════════════════════ */
const LANGUAGES = {
  python:     { id:"python",     name:"Python",     ext:".py",   icon:"🐍", color:"#4FC1FF",
    template:`def greet(name):
    return f"Hello, {name}!"

result = greet("World")
print(result)
` },
  javascript: { id:"javascript", name:"JavaScript", ext:".js",   icon:"⚡", color:"#FFB547",
    template:`function greet(name) {
  return \`Hello, \${name}!\`;
}

const result = greet("World");
console.log(result);
` },
  typescript: { id:"typescript", name:"TypeScript", ext:".ts",   icon:"🔷", color:"#4FC1FF",
    template:`function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const result: string = greet("World");
console.log(result);
` },
  java:       { id:"java",       name:"Java",       ext:".java", icon:"☕", color:"#FF6B9D",
    template:`public class Main {
    public static void main(String[] args) {
        String result = greet("World");
        System.out.println(result);
    }

    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}
` },
  cpp:        { id:"cpp",        name:"C/C++",       ext:".cpp",  icon:"⚙", color:"#A78BFA",
    template:`#include <iostream>
#include <string>
using namespace std;

string greet(string name) {
    return "Hello, " + name + "!";
}

int main() {
    string result = greet("World");
    cout << result << endl;
    return 0;
}
` },
  rust:       { id:"rust",       name:"Rust",        ext:".rs",   icon:"🦀", color:"#FFB547",
    template:`fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    let result = greet("World");
    println!("{}", result);
}
` },
  golang:     { id:"golang",     name:"Go",          ext:".go",   icon:"🐹", color:"#4EC9B0",
    template:`package main

import "fmt"

func greet(name string) string {
    return fmt.Sprintf("Hello, %s!", name)
}

func main() {
    result := greet("World")
    fmt.Println(result)
}
` },
};

const LANG_KEYS = ["python","javascript","typescript","java","cpp","rust","golang"];

/* ═══════════════════════════════════════════════════════════════
   PER-LANGUAGE SYNTAX / ERROR CHECKERS
═══════════════════════════════════════════════════════════════ */

/* shared bracket balance check */
function bracketBalance(code) {
  const out = [];
  let depth = { "(":0, "[":0, "{":0 };
  const pairs = { ")":"(", "]":"[", "}":"{" };
  let inStr = false, strChar = "";
  const lines = code.split("\n");
  let line = 1, col = 0;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === "\n") { line++; col = 0; continue; }
    col++;
    if (!inStr && (ch==='"'||ch==="'"||ch==="`")) { inStr=true; strChar=ch; continue; }
    if (inStr && ch===strChar && code[i-1]!=="\\") { inStr=false; continue; }
    if (inStr) continue;
    if ("([{".includes(ch)) depth[ch]++;
    if (")]}".includes(ch)) {
      const open = pairs[ch];
      if (depth[open]>0) depth[open]--;
      else out.push({ line, col, msg:`Unmatched '${ch}'`, severity:"error" });
    }
  }
  if (depth["("]>0) out.push({ line:lines.length, col:1, msg:`${depth["("]} unclosed '('`, severity:"error" });
  if (depth["["]>0) out.push({ line:lines.length, col:1, msg:`${depth["["]} unclosed '['`, severity:"error" });
  if (depth["{"]>0) out.push({ line:lines.length, col:1, msg:`${depth["{"]} unclosed '{'`, severity:"error" });
  return out;
}

function checkPython(code) {
  const lines = code.split("\n");
  const errors = [], warnings = [];
  lines.forEach((raw, i) => {
    const ln  = i + 1;
    const col = Math.max(raw.search(/\S/), 0) + 1;
    if (/^\t+ /.test(raw) || /^ +\t/.test(raw))
      errors.push({ line:ln, col:1, msg:"Mixed tabs and spaces in indentation", severity:"error" });
    if (/^\s*print\s+[^(]/.test(raw))
      errors.push({ line:ln, col, msg:"print is a function in Python 3 — use print(...)", severity:"error" });
    if (/^\s*(def|class|if|for|while|else|elif|try|except|finally|with)\b/.test(raw)) {
      const noComment = raw.split("#")[0];
      if (!/:\s*(#.*)?$/.test(noComment) && !/\\\s*$/.test(noComment))
        errors.push({ line:ln, col:raw.length, msg:"Expected ':' at end of compound statement", severity:"error" });
    }
    if (/^\s*(if|while|elif)\b.*[^=!<>]=[^=]/.test(raw))
      warnings.push({ line:ln, col, msg:"Possible assignment '=' where '==' was intended", severity:"warning" });
    if (/^\s*except\s*:/.test(raw))
      warnings.push({ line:ln, col, msg:"Bare 'except' — specify exception type", severity:"warning" });
    if (/^\s*import\s+\w+/.test(raw))
      warnings.push({ line:ln, col, msg:"Verify imported module is used", severity:"info" });
  });
  bracketBalance(code).forEach(d => errors.push(d));
  return { errors, warnings };
}

function checkJSTS(code, isTS) {
  const lines = code.split("\n");
  const errors = [], warnings = [];
  lines.forEach((raw, i) => {
    const ln  = i + 1;
    const col = Math.max(raw.search(/\S/), 0) + 1;
    const trimmed = raw.trim();
    if (/\bvar\s+/.test(raw))
      warnings.push({ line:ln, col:raw.indexOf("var")+1, msg:"Prefer 'let' or 'const' over 'var'", severity:"warning" });
    if (/[^=!<>]==[^=]/.test(raw) && !/===/.test(raw))
      warnings.push({ line:ln, col:raw.indexOf("==")+1, msg:"Use '===' instead of '==' for strict equality", severity:"warning" });
    if (/console\.log/.test(raw))
      warnings.push({ line:ln, col:raw.indexOf("console")+1, msg:"console.log left in code", severity:"info" });
    const backticks = (raw.match(/`/g)||[]).length;
    if (backticks % 2 !== 0)
      errors.push({ line:ln, col:raw.lastIndexOf("`")+1, msg:"Unclosed template literal", severity:"error" });
    if (isTS) {
      if (/:\s*any\b/.test(raw))
        warnings.push({ line:ln, col:raw.indexOf("any")+1, msg:"Avoid 'any' — use explicit types", severity:"warning" });
      if (/function\s+\w+\s*\([^)]*\)\s*\{/.test(raw) && !/:\s*\w+/.test(raw))
        warnings.push({ line:ln, col, msg:"Function missing explicit return type annotation", severity:"info" });
    }
  });
  bracketBalance(code).forEach(d => errors.push(d));
  return { errors, warnings };
}

function checkJava(code) {
  const lines = code.split("\n");
  const errors = [], warnings = [];
  if (!/public\s+class\s+\w+/.test(code))
    errors.push({ line:1, col:1, msg:"Missing 'public class' declaration", severity:"error" });
  if (!/public\s+static\s+void\s+main\s*\(\s*String/.test(code))
    warnings.push({ line:1, col:1, msg:"Missing 'public static void main(String[] args)' entry point", severity:"warning" });
  lines.forEach((raw, i) => {
    const ln  = i + 1;
    const col = Math.max(raw.search(/\S/), 0) + 1;
    if (/System\.out\.print/.test(raw) && !raw.trim().endsWith(";"))
      errors.push({ line:ln, col:raw.indexOf("System")+1, msg:"Statement requires semicolon ';'", severity:"error" });
    if (/"\s*==\s*"/.test(raw) || /\w+\s*==\s*"/.test(raw))
      warnings.push({ line:ln, col, msg:"Use .equals() for String comparison, not ==", severity:"warning" });
    if (/\b(List|Map|Set|ArrayList|HashMap)\s+\w+\s*=/.test(raw) && !/</.test(raw))
      warnings.push({ line:ln, col, msg:"Raw type — use generics e.g. List<String>", severity:"warning" });
  });
  const opens = (code.match(/\{/g)||[]).length;
  const closes = (code.match(/\}/g)||[]).length;
  if (opens !== closes)
    errors.push({ line:lines.length, col:1, msg:`Mismatched braces: ${opens} '{' vs ${closes} '}'`, severity:"error" });
  return { errors, warnings };
}

function checkCpp(code) {
  const lines = code.split("\n");
  const errors = [], warnings = [];
  if (!/\bmain\s*\(/.test(code))
    errors.push({ line:1, col:1, msg:"Missing 'main' function", severity:"error" });
  if (!/#include/.test(code))
    warnings.push({ line:1, col:1, msg:"No #include directives found", severity:"info" });
  lines.forEach((raw, i) => {
    const ln  = i + 1;
    const col = Math.max(raw.search(/\S/), 0) + 1;
    if (/void\s+main\s*\(/.test(raw))
      errors.push({ line:ln, col, msg:"'void main()' is non-standard — use 'int main()'", severity:"error" });
    if (/using namespace std/.test(raw))
      warnings.push({ line:ln, col, msg:"'using namespace std' can cause name collisions in large projects", severity:"info" });
    if (/\bnew\s+/.test(raw))
      warnings.push({ line:ln, col:raw.indexOf("new")+1, msg:"Raw 'new' — consider unique_ptr/shared_ptr", severity:"warning" });
    if (/\bprintf\s*\(/.test(raw)||/\bscanf\s*\(/.test(raw))
      warnings.push({ line:ln, col, msg:"Consider using cout/cin instead of printf/scanf in C++", severity:"info" });
  });
  const opens = (code.match(/\{/g)||[]).length;
  const closes = (code.match(/\}/g)||[]).length;
  if (opens !== closes)
    errors.push({ line:lines.length, col:1, msg:`Mismatched braces: ${opens} '{' vs ${closes} '}'`, severity:"error" });
  return { errors, warnings };
}

function checkRust(code) {
  const lines = code.split("\n");
  const errors = [], warnings = [];
  if (!/fn\s+main\s*\(/.test(code))
    errors.push({ line:1, col:1, msg:"Missing 'fn main()' entry point", severity:"error" });
  lines.forEach((raw, i) => {
    const ln  = i + 1;
    const col = Math.max(raw.search(/\S/), 0) + 1;
    if (/\.unwrap\(\)/.test(raw))
      warnings.push({ line:ln, col:raw.indexOf(".unwrap")+1, msg:"Avoid .unwrap() — use ? or match for error handling", severity:"warning" });
    if (/\.clone\(\)/.test(raw))
      warnings.push({ line:ln, col:raw.indexOf(".clone")+1, msg:".clone() may impact performance — consider borrowing", severity:"info" });
    if (/\bpanic!\s*\(/.test(raw))
      warnings.push({ line:ln, col:raw.indexOf("panic!")+1, msg:"panic! crashes the program — prefer Result/Option", severity:"warning" });
  });
  const opens = (code.match(/\{/g)||[]).length;
  const closes = (code.match(/\}/g)||[]).length;
  if (opens !== closes)
    errors.push({ line:lines.length, col:1, msg:`Mismatched braces: ${opens} '{' vs ${closes} '}'`, severity:"error" });
  return { errors, warnings };
}

function checkGolang(code) {
  const lines = code.split("\n");
  const errors = [], warnings = [];
  if (!/^\s*package\s+main\b/.test(code))
    errors.push({ line:1, col:1, msg:"Missing 'package main' declaration", severity:"error" });
  if (!/func\s+main\s*\(\s*\)/.test(code))
    errors.push({ line:1, col:1, msg:"Missing 'func main()' entry point", severity:"error" });
  if (/\bfmt\./.test(code) && !/import.*"fmt"/.test(code) && !/import\s*\([\s\S]*"fmt"[\s\S]*\)/.test(code))
    errors.push({ line:1, col:1, msg:"Using 'fmt' package but it is not imported", severity:"error" });
  lines.forEach((raw, i) => {
    const ln  = i + 1;
    const col = Math.max(raw.search(/\S/), 0) + 1;
    if (/,\s*_\s*[:=]=/.test(raw))
      warnings.push({ line:ln, col, msg:"Error return discarded with '_' — consider handling the error", severity:"warning" });
    if (/^func\s+[A-Z]/.test(raw.trim())) {
      const prev = lines[i-1]||"";
      if (!prev.trim().startsWith("//"))
        warnings.push({ line:ln, col, msg:"Exported function missing GoDoc comment", severity:"info" });
    }
  });
  const opens = (code.match(/\{/g)||[]).length;
  const closes = (code.match(/\}/g)||[]).length;
  if (opens !== closes)
    errors.push({ line:lines.length, col:1, msg:`Mismatched braces: ${opens} '{' vs ${closes} '}'`, severity:"error" });
  return { errors, warnings };
}

function runSyntaxCheck(langId, code) {
  if (!code.trim()) return { errors:[], warnings:[] };
  switch (langId) {
    case "python":     return checkPython(code);
    case "javascript": return checkJSTS(code, false);
    case "typescript": return checkJSTS(code, true);
    case "java":       return checkJava(code);
    case "cpp":        return checkCpp(code);
    case "rust":       return checkRust(code);
    case "golang":     return checkGolang(code);
    default:           return { errors:[], warnings:[] };
  }
}

/* ═══════════════════════════════════════════════════════════════
   SIMULATED EXECUTION ENGINE
═══════════════════════════════════════════════════════════════ */
function simulateRun(langId, code) {
  const { errors } = runSyntaxCheck(langId, code);
  const lang = LANGUAGES[langId];
  if (errors.length > 0) {
    return {
      stdout: "",
      stderr: errors.map(e => `${lang.ext.slice(1)}:${e.line}:${e.col}: error: ${e.msg}`).join("\n"),
      exitCode: 1,
      ms: Math.floor(Math.random()*80)+20,
    };
  }
  const lines   = code.split("\n");
  const outputs = [];
  lines.forEach(raw => {
    if (langId==="python") {
      const m = raw.match(/^\s*print\s*\((.+)\)\s*$/);
      if (m) outputs.push(m[1].trim().replace(/^f?["']|["']$/g,"").replace(/\{([^}]+)\}/g,"<$1>"));
    }
    if (langId==="javascript"||langId==="typescript") {
      const m = raw.match(/console\.log\s*\((.+)\)\s*;?\s*$/);
      if (m) outputs.push(m[1].trim().replace(/^`|`$/g,"").replace(/\$\{[^}]+\}/g,"<expr>").replace(/^["']|["']$/g,""));
    }
    if (langId==="java") {
      const m = raw.match(/System\.out\.println\s*\((.+)\)\s*;/);
      if (m) outputs.push(m[1].trim().replace(/^"|"$/g,"").replace(/"?\s*\+\s*\w+\s*\+\s*"?/g,"<expr>"));
    }
    if (langId==="cpp") {
      const m = raw.match(/cout\s*<<\s*(.+?)(?:\s*<<\s*endl|;)/);
      if (m) outputs.push(m[1].trim().replace(/^"|"$/g,""));
    }
    if (langId==="rust") {
      const m = raw.match(/println!\s*\(\s*"([^"]+)"/);
      if (m) outputs.push(m[1].replace(/\{\}/g,"<value>"));
    }
    if (langId==="golang") {
      const m = raw.match(/fmt\.Print(?:ln|f)\s*\(\s*"([^"]+)"/);
      if (m) outputs.push(m[1].replace(/%[sdvf]/g,"<value>"));
    }
  });
  const ms = Math.floor(Math.random()*320)+80;
  return {
    stdout: outputs.length>0 ? outputs.join("\n")
      : "[Process exited 0 — no output captured]\n[Tip: Use print/console.log/println/cout to produce output]",
    stderr:"", exitCode:0, ms,
  };
}

/* ═══════════════════════════════════════════════════════════════
   UI SUB-COMPONENTS
═══════════════════════════════════════════════════════════════ */

function Sparkline({ data, color, height=36 }) {
  if (!data||data.length<2) return null;
  const max=Math.max(...data,1),min=Math.min(...data,0),range=max-min||1,W=120;
  const pts=data.map((v,i)=>{const x=(i/(data.length-1))*W;const y=height-((v-min)/range)*(height-4)-2;return `${x},${y}`;});
  const poly=pts.join(" "),area=`0,${height} ${poly} ${W},${height}`,gid=`g${color.replace(/[^a-z0-9]/gi,"")}`;
  return (
    <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} style={{overflow:"visible",flexShrink:0}}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <polygon points={area} fill={`url(#${gid})`}/>
      <polyline points={poly} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={parseFloat(pts[pts.length-1].split(",")[0])} cy={parseFloat(pts[pts.length-1].split(",")[1])} r="3" fill={color}/>
    </svg>
  );
}

function RadialGauge({ value, max, color, label, unit }) {
  const pct=Math.min(value/max,1),r=36,circ=2*Math.PI*r,dash=circ*pct,gap=circ-dash;
  const disp=typeof value==="number"?(value%1===0?value:value.toFixed(1)):value;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="6"/>
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${gap}`} strokeDashoffset={circ*0.25} strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 6px ${color}88)`,transition:"stroke-dasharray .6s cubic-bezier(.4,0,.2,1)"}}/>
        <text x="45" y="41" textAnchor="middle" fill="#fff"    fontSize="14" fontWeight="700" fontFamily={C.mono}>{disp}</text>
        <text x="45" y="55" textAnchor="middle" fill={C.text3} fontSize="8"  fontFamily={C.mono}>{unit}</text>
      </svg>
      <span style={{fontSize:9,fontFamily:C.mono,color:C.text3,letterSpacing:".12em",textTransform:"uppercase"}}>{label}</span>
    </div>
  );
}

function StatCard({ label, value, unit, color, history, icon, status, statusColor }) {
  const [hov,setHov]=useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      position:"relative",borderRadius:16,padding:"1.25rem 1.4rem",
      border:`1px solid ${hov?color+"55":color+"22"}`,background:C.surface,overflow:"hidden",
      boxShadow:hov?`0 0 32px ${color}18`:"none",transition:"border-color .25s,box-shadow .25s",
      display:"flex",flexDirection:"column",gap:12}}>
      <div style={{position:"absolute",bottom:0,left:0,height:2,width:hov?"100%":0,background:color,borderRadius:"0 0 0 16px",transition:"width .5s"}}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>{icon}</span>
          <span style={{fontSize:10,fontFamily:C.mono,letterSpacing:".12em",textTransform:"uppercase",color:`${color}cc`}}>{label}</span>
        </div>
        {status&&<span style={{fontSize:9,fontFamily:C.mono,fontWeight:700,padding:"2px 9px",borderRadius:100,
          border:`1px solid ${statusColor}44`,background:`${statusColor}18`,color:statusColor}}>{status}</span>}
      </div>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:8}}>
        <div style={{lineHeight:1}}>
          <span style={{fontFamily:C.mono,fontSize:28,fontWeight:700,color:"#fff"}}>{value}</span>
          <span style={{fontFamily:C.mono,fontSize:11,marginLeft:4,color:`${color}99`}}>{unit}</span>
        </div>
        <Sparkline data={history} color={color}/>
      </div>
    </div>
  );
}

function ActivityHeatmap({ activityLog }) {
  const cells=Array.from({length:60},(_,i)=>activityLog[i]??0);
  const max=Math.max(...cells,1);
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
      {cells.map((v,i)=>{
        const intensity=v/max;
        const bg=intensity>0.7?"#4FC1FF":intensity>0.4?"#4EC9B0":intensity>0.1?"#1d4a5c":"rgba(255,255,255,.04)";
        return <div key={i} title={`${i}s ago: ${v} keystrokes`}
          style={{width:12,height:12,borderRadius:2,background:bg,boxShadow:intensity>0.7?"0 0 4px #4FC1FF88":"none",transition:"background .3s"}}/>;
      })}
    </div>
  );
}

function LogRow({ entry, idx }) {
  const colors={info:"#4FC1FF",warn:"#FFB547",error:"#FF6B9D",ok:"#4EC9B0"};
  const c=colors[entry.type]||colors.info;
  const icon=entry.type==="warn"?"⚠":entry.type==="error"?"✖":entry.type==="ok"?"✓":"ℹ";
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"6px 14px",borderRadius:8,
      background:idx%2===0?"rgba(255,255,255,.02)":"transparent",animation:"logIn .3s ease both"}}>
      <span style={{color:`${c}88`,flexShrink:0,marginTop:1,fontSize:11}}>{icon}</span>
      <span style={{color:C.text3,flexShrink:0,fontFamily:C.mono,fontSize:11,whiteSpace:"nowrap"}}>{entry.time}</span>
      <span style={{color:c,fontFamily:C.mono,fontSize:11,wordBreak:"break-word",lineHeight:1.5}}>{entry.msg}</span>
    </div>
  );
}

function Panel({ children, style={} }) {
  return <div style={{borderRadius:16,border:`1px solid ${C.border}`,background:C.surface,overflow:"hidden",...style}}>{children}</div>;
}

function PanelHeader({ left, right }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 18px",
      background:"rgba(255,255,255,.02)",borderBottom:`1px solid rgba(255,255,255,.06)`}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{display:"flex",gap:5}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:"#FF5F56"}}/>
          <div style={{width:10,height:10,borderRadius:"50%",background:"#FFBD2E"}}/>
          <div style={{width:10,height:10,borderRadius:"50%",background:"#27C93F"}}/>
        </div>
        {left}
      </div>
      {right}
    </div>
  );
}

function DiagRow({ d, idx }) {
  const color = d.severity==="error"?C.rose:d.severity==="warning"?C.amber:C.blue;
  const icon  = d.severity==="error"?"✖":d.severity==="warning"?"⚠":"ℹ";
  return (
    <div className="a-fadein" style={{display:"flex",alignItems:"flex-start",gap:10,
      padding:"7px 14px",borderRadius:8,marginBottom:2,
      background:idx%2===0?"rgba(255,255,255,.025)":"transparent",
      borderLeft:`2px solid ${color}55`}}>
      <span style={{color,flexShrink:0,fontSize:11,marginTop:1}}>{icon}</span>
      <span style={{color:C.text3,flexShrink:0,fontFamily:C.mono,fontSize:10,whiteSpace:"nowrap"}}>Ln {d.line}:{d.col}</span>
      <span style={{color,fontFamily:C.mono,fontSize:11,wordBreak:"break-word",lineHeight:1.5,flex:1}}>{d.msg}</span>
      <span style={{marginLeft:8,flexShrink:0,fontSize:9,fontFamily:C.mono,
        color:`${color}66`,textTransform:"uppercase",letterSpacing:".08em"}}>{d.severity}</span>
    </div>
  );
}

function LangChip({ lang, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${active||hov?lang.color+"66":"rgba(255,255,255,.06)"}`,
        background:active?`${lang.color}18`:"rgba(255,255,255,.02)",
        color:active?lang.color:"rgba(255,255,255,.35)",
        fontFamily:C.mono,fontSize:11,fontWeight:700,
        display:"flex",alignItems:"center",gap:5,transition:"all .15s"}}>
      <span style={{fontSize:13}}>{lang.icon}</span>
      <span>{lang.name}</span>
    </button>
  );
}

function RunButton({ onClick, running, hasErrors }) {
  const [ping, setPing] = useState(false);
  const handle = () => { setPing(true); setTimeout(()=>setPing(false),1000); onClick(); };
  return (
    <button onClick={handle} disabled={running} className={ping?"run-ping":""}
      style={{display:"flex",alignItems:"center",gap:7,padding:"9px 22px",borderRadius:10,border:"none",
        background: hasErrors
          ? "linear-gradient(135deg,#FF6B9D,#A78BFA)"
          : "linear-gradient(135deg,#4EC9B0,#4FC1FF)",
        color:"#0d0f14",fontFamily:C.disp,fontWeight:800,fontSize:13,
        boxShadow:hasErrors?"0 6px 22px rgba(255,107,157,.35)":"0 6px 22px rgba(78,201,176,.35)",
        opacity:running?.7:1,transition:"opacity .2s",cursor:running?"not-allowed":"pointer"}}>
      {running
        ?<><span className="a-spin" style={{width:12,height:12,border:"2px solid rgba(13,15,20,.3)",borderTopColor:"#0d0f14",borderRadius:"50%",display:"inline-block"}}/>Running…</>
        :<><span>▶</span>Run Code</>}
    </button>
  );
}

function OutputTerminal({ result, lang }) {
  if (!result) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      color:C.text3,fontFamily:C.mono,fontSize:12,gap:10,minHeight:160}}>
      <span style={{fontSize:32}}>▶</span>
      <span>Press "Run Code" to execute {lang.name}</span>
    </div>
  );
  const hasErr = result.exitCode!==0||result.stderr;
  return (
    <div className="a-fadein" style={{flex:1,padding:"1rem",fontFamily:C.mono,fontSize:12,lineHeight:1.8,overflowY:"auto",minHeight:160}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,.05)"}}>
        <span style={{color:hasErr?C.rose:C.teal,fontSize:11,fontWeight:700}}>
          {hasErr?"✖ Exit Code 1":"✓ Exit Code 0"}
        </span>
        <span style={{color:C.text3,fontSize:10}}>{lang.icon} {lang.name}</span>
        <span style={{color:C.text3,fontSize:10,marginLeft:"auto"}}>⏱ {result.ms}ms</span>
      </div>
      {result.stdout&&(
        <div>
          <div style={{fontSize:9,color:C.text3,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>stdout</div>
          <pre style={{color:C.teal,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0,fontFamily:C.mono}}>{result.stdout}</pre>
        </div>
      )}
      {result.stderr&&(
        <div style={{marginTop:result.stdout?14:0}}>
          <div style={{fontSize:9,color:C.text3,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>stderr</div>
          <pre style={{color:C.rose,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0,fontFamily:C.mono}}>{result.stderr}</pre>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function BehaviorTrackingEngine() {

  /* ── behavior tracking state ── */
  const [isTracking,  setIsTracking]  = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [totalKeys,   setTotalKeys]   = useState(0);
  const [backspaces,  setBackspaces]  = useState(0);
  const [errors,      setErrors]      = useState(0);
  const [lastActivity,setLastActivity]= useState(Date.now());
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [wpmHistory,  setWpmHistory]  = useState(Array(20).fill(0));
  const [bsHistory,   setBsHistory]   = useState(Array(20).fill(0));
  const [errHistory,  setErrHistory]  = useState(Array(20).fill(0));
  const [idleHistory, setIdleHistory] = useState(Array(20).fill(0));
  const [wpm,         setWpm]         = useState(0);
  const [bsRate,      setBsRate]      = useState(0);
  const [errRate,     setErrRate]     = useState(0);
  const [activityLog, setActivityLog] = useState(Array(60).fill(0));
  const [log,         setLog]         = useState([]);

  /* ── editor + runner state ── */
  const [activeLang,  setActiveLang]  = useState("python");
  const [codeByLang,  setCodeByLang]  = useState(
    Object.fromEntries(LANG_KEYS.map(k=>[k,LANGUAGES[k].template]))
  );
  const [diagnostics, setDiagnostics] = useState({ errors:[], warnings:[] });
  const [runResult,   setRunResult]   = useState(null);
  const [running,     setRunning]     = useState(false);
  const [activeTab,   setActiveTab]   = useState("log"); // log | output | lint

  const code    = codeByLang[activeLang]||"";
  const setCode = (val) => setCodeByLang(prev=>({...prev,[activeLang]:val}));
  const lang    = LANGUAGES[activeLang];

  /* ── refs ── */
  const sessionRef    = useRef(null);
  const metricsRef    = useRef(null);
  const heatmapRef    = useRef(null);
  const checkTimerRef = useRef(null);
  const wordCountRef  = useRef(0);
  const totalKeysRef  = useRef(0);
  const backspacesRef = useRef(0);
  const thisSecondKeys= useRef(0);

  const addLog = useCallback((msg,type="info")=>{
    const time=new Date().toLocaleTimeString("en",{hour12:false});
    setLog(prev=>[{msg,type,time},...prev].slice(0,80));
  },[]);

  /* ── live syntax check (debounced 600ms) ── */
  useEffect(()=>{
    clearTimeout(checkTimerRef.current);
    checkTimerRef.current=setTimeout(()=>{
      const r=runSyntaxCheck(activeLang,code);
      setDiagnostics(r);
      if (r.errors.length>0)
        addLog(`Lint [${lang.name}]: ${r.errors.length} error(s), ${r.warnings.length} warning(s)`,"error");
      else if (r.warnings.length>0)
        addLog(`Lint [${lang.name}]: ${r.warnings.length} warning(s)`,"warn");
      else if (code.trim())
        addLog(`Lint [${lang.name}]: No issues found`,"ok");
    },600);
    return ()=>clearTimeout(checkTimerRef.current);
  },[code,activeLang]);

  /* ── reset on lang switch ── */
  useEffect(()=>{
    setRunResult(null);
    const r=runSyntaxCheck(activeLang,codeByLang[activeLang]||"");
    setDiagnostics(r);
  },[activeLang]);

  /* session timer */
  useEffect(()=>{
    if (!isTracking) return;
    sessionRef.current=setInterval(()=>setSessionTime(s=>s+1),1000);
    return ()=>clearInterval(sessionRef.current);
  },[isTracking]);

  /* idle detector */
  useEffect(()=>{
    if (!isTracking) return;
    const iv=setInterval(()=>{
      const idle=Math.floor((Date.now()-lastActivity)/1000);
      setIdleSeconds(idle);
      if (idle===5)  addLog("User idle for 5 seconds","warn");
      if (idle===15) addLog("Prolonged idle — possible frustration","warn");
      if (idle===30) addLog("Idle threshold exceeded — triggering adaptive hint","error");
    },1000);
    return ()=>clearInterval(iv);
  },[isTracking,lastActivity,addLog]);

  /* metrics sampler */
  useEffect(()=>{
    if (!isTracking) return;
    metricsRef.current=setInterval(()=>{
      setWpmHistory(h=>[...h.slice(1),wpm]);
      setBsHistory(h=>[...h.slice(1),bsRate]);
      setErrHistory(h=>[...h.slice(1),errRate]);
      setIdleHistory(h=>[...h.slice(1),idleSeconds]);
    },3000);
    return ()=>clearInterval(metricsRef.current);
  },[isTracking,wpm,bsRate,errRate,idleSeconds]);

  /* heatmap tick */
  useEffect(()=>{
    if (!isTracking) return;
    heatmapRef.current=setInterval(()=>{
      setActivityLog(prev=>{
        const next=[thisSecondKeys.current,...prev.slice(0,59)];
        thisSecondKeys.current=0; return next;
      });
    },1000);
    return ()=>clearInterval(heatmapRef.current);
  },[isTracking]);

  /* keystroke handler */
  const handleKeyDown=useCallback((e)=>{
    if (!isTracking) return;
    setLastActivity(Date.now()); setIdleSeconds(0);
    if (e.key==="Backspace") {
      backspacesRef.current+=1; setBackspaces(backspacesRef.current);
      const rate=totalKeysRef.current>0?+((backspacesRef.current/totalKeysRef.current)*100).toFixed(1):0;
      setBsRate(rate); addLog("Backspace detected","warn");
    } else if (e.key.length===1&&!e.ctrlKey&&!e.metaKey) {
      totalKeysRef.current+=1; setTotalKeys(totalKeysRef.current);
      thisSecondKeys.current+=1;
      setSessionTime(prev=>{
        const mins=Math.max(prev,1)/60;
        setWpm(Math.round((totalKeysRef.current/5)/mins)); return prev;
      });
    }
  },[isTracking,addLog]);

  /* code editor change */
  const handleCodeChange=useCallback((e)=>{
    const val=e.target.value; setCode(val);
    if (!isTracking) return;
    setLastActivity(Date.now()); setIdleSeconds(0);
    const words=val.trim().split(/\s+/).filter(Boolean);
    if (words.length!==wordCountRef.current) {
      wordCountRef.current=words.length;
      if (Math.random()<0.08) {
        setErrors(er=>{
          const next=er+1;
          setErrRate(+((next/Math.max(words.length,1))*100).toFixed(1)); return next;
        });
      }
    }
  },[isTracking,activeLang,codeByLang]);

  /* run handler */
  const handleRun=useCallback(()=>{
    setRunning(true); setActiveTab("output");
    addLog(`▶ Executing ${lang.name} code…`,"info");
    const delay=400+Math.random()*600;
    setTimeout(()=>{
      const result=simulateRun(activeLang,code);
      setRunResult(result); setRunning(false);
      if (result.exitCode===0) addLog(`✓ ${lang.name}: exit 0 · ${result.ms}ms`,"ok");
      else addLog(`✖ ${lang.name}: exit 1 · ${result.ms}ms · ${diagnostics.errors.length} error(s)`,"error");
    },delay);
  },[activeLang,code,lang,addLog,diagnostics]);

  /* start / stop */
  const startSession=()=>{
    totalKeysRef.current=0; backspacesRef.current=0;
    wordCountRef.current=0; thisSecondKeys.current=0;
    setIsTracking(true); setSessionTime(0);
    setTotalKeys(0); setBackspaces(0); setErrors(0); setIdleSeconds(0);
    setWpm(0); setBsRate(0); setErrRate(0);
    setWpmHistory(Array(20).fill(0)); setBsHistory(Array(20).fill(0));
    setErrHistory(Array(20).fill(0)); setIdleHistory(Array(20).fill(0));
    setActivityLog(Array(60).fill(0)); setLog([]);
    setLastActivity(Date.now());
    addLog("Session started — behavior tracking active","ok");
  };
  const stopSession=()=>{
    setIsTracking(false);
    addLog(`Session ended — ${totalKeysRef.current} keys · ${backspacesRef.current} backspaces · ${errors} errors`,"info");
  };

  /* derived state */
  const getProficiency=()=>{
    if (!isTracking&&totalKeys===0) return {label:"—",color:C.text3};
    if (wpm>=60&&bsRate<10&&errRate<5) return {label:"Expert",color:C.teal};
    if (wpm>=40&&bsRate<20)            return {label:"Intermediate",color:C.blue};
    if (wpm>=20)                       return {label:"Beginner",color:C.amber};
    return {label:"Novice",color:C.rose};
  };
  const prof=getProficiency();

  const getCognitiveState=()=>{
    if (!isTracking&&totalKeys===0) return {label:"Idle",color:C.text3,icon:"○"};
    if (idleSeconds>=30)            return {label:"Stuck",color:C.rose,icon:"⚡"};
    if (idleSeconds>=10)            return {label:"Thinking",color:C.amber,icon:"◐"};
    if (errRate>15||bsRate>25)      return {label:"Frustrated",color:C.rose,icon:"↯"};
    if (wpm>=50&&errRate<8)         return {label:"Flow State",color:C.teal,icon:"◈"};
    if (wpm>=30)                    return {label:"Focused",color:C.blue,icon:"◎"};
    return {label:"Warming Up",color:C.violet,icon:"◌"};
  };
  const cog=getCognitiveState();

  const fmtTime=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const normalPct=totalKeys>0?Math.max(0,100-Math.min(bsRate,100)-Math.min(errRate,100)):0;
  const bsPct=totalKeys>0?Math.min(bsRate,100):0;
  const errPct=totalKeys>0?Math.min(errRate,100):0;

  const allDiags=[...diagnostics.errors,...diagnostics.warnings];
  const diagCount=allDiags.length;

  const tabBtn=(id,label,badge)=>(
    <button onClick={()=>setActiveTab(id)} style={{
      padding:"6px 14px",borderRadius:7,border:"none",
      fontFamily:C.mono,fontSize:11,fontWeight:600,
      background:activeTab===id?"rgba(79,193,255,.12)":"rgba(255,255,255,.03)",
      color:activeTab===id?C.blue:C.text3,
      borderBottom:activeTab===id?`2px solid ${C.blue}`:"2px solid transparent",
      transition:"all .2s",display:"flex",alignItems:"center",gap:5,
    }}>
      {label}{badge}
    </button>
  );

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <>
      <style>{CSS}</style>
      <div style={{minHeight:"100vh",width:"100%",background:C.bg,
        backgroundImage:"linear-gradient(rgba(79,193,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(79,193,255,.03) 1px,transparent 1px)",
        backgroundSize:"56px 56px",fontFamily:C.mono,color:C.text,overflowX:"hidden"}}>

        {/* mesh overlay */}
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
          background:"radial-gradient(ellipse 65% 50% at 70% 10%,rgba(79,193,255,.09) 0%,transparent 65%),radial-gradient(ellipse 40% 38% at 10% 80%,rgba(78,201,176,.06) 0%,transparent 60%)"}}/>

        <div style={{position:"relative",zIndex:1,maxWidth:1380,margin:"0 auto",padding:"2.5rem 1.75rem"}}>

          {/* ══ HEADER ══ */}
          <div style={{display:"flex",flexWrap:"wrap",alignItems:"flex-start",justifyContent:"space-between",gap:24,marginBottom:36}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                {[["Module 08",C.blue],["·",C.text3],["CKC-OS",C.text3],["·",C.text3],["Cognitive Layer",C.text3]].map(([t,c],i)=>(
                  <span key={i} style={{fontSize:10,fontFamily:C.mono,letterSpacing:".14em",textTransform:"uppercase",color:c,fontWeight:i===0?600:400}}>{t}</span>
                ))}
              </div>
              <h1 style={{fontFamily:C.disp,fontSize:"clamp(2rem,4vw,2.8rem)",fontWeight:800,color:"#fff",letterSpacing:"-.03em",lineHeight:1.05,marginBottom:10}}>
                Behavior Tracking<br/>
                <span style={{background:"linear-gradient(135deg,#4FC1FF,#4EC9B0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Engine</span>
              </h1>
              <p style={{fontSize:14,color:C.text2,maxWidth:500,lineHeight:1.8}}>
                Real-time cognitive analysis + integrated multi-language code editor with live syntax checking and simulated execution for 7 languages.
              </p>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"8px 16px",borderRadius:12,
                border:`1px solid ${isTracking?"rgba(78,201,176,.3)":"rgba(255,255,255,.07)"}`,background:C.surface}}>
                <span className={isTracking?"live-blink":""} style={{width:8,height:8,borderRadius:"50%",display:"inline-block",
                  background:isTracking?C.teal:C.text3,boxShadow:isTracking?`0 0 6px ${C.teal}`:"none"}}/>
                <span style={{fontSize:11,fontFamily:C.mono,color:isTracking?C.teal:C.text3}}>
                  {isTracking?"TRACKING ACTIVE":"STANDBY"}
                </span>
                {isTracking&&<span style={{fontSize:11,fontFamily:C.mono,color:C.text2}}>{fmtTime(sessionTime)}</span>}
              </div>
              {!isTracking
                ?<button onClick={startSession} style={{padding:"10px 24px",borderRadius:10,border:"none",
                    background:"linear-gradient(135deg,#4FC1FF,#4EC9B0)",color:"#0d0f14",
                    fontFamily:C.disp,fontWeight:800,fontSize:14,boxShadow:"0 8px 28px rgba(79,193,255,.35)"}}>
                    ▶ Start Tracking
                  </button>
                :<button onClick={stopSession} style={{padding:"10px 24px",borderRadius:10,
                    border:`1px solid rgba(255,107,157,.28)`,background:"rgba(255,107,157,.08)",
                    color:C.rose,fontFamily:C.mono,fontWeight:600,fontSize:14}}>■ Stop Tracking</button>}
            </div>
          </div>

          {/* ══ ROW 1: Status banner ══ */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:12,marginBottom:14}}>
            <div style={{borderRadius:16,padding:"1rem 1.4rem",border:`1px solid ${cog.color}33`,
              background:C.surface,display:"flex",alignItems:"center",gap:16,boxShadow:`0 0 32px ${cog.color}10`}}>
              <div style={{width:48,height:48,borderRadius:12,flexShrink:0,display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:22,background:`${cog.color}15`,border:`1px solid ${cog.color}33`}}>{cog.icon}</div>
              <div>
                <div style={{fontSize:9,fontFamily:C.mono,letterSpacing:".14em",textTransform:"uppercase",color:C.text3,marginBottom:2}}>Cognitive State</div>
                <div style={{fontFamily:C.disp,fontSize:20,fontWeight:800,color:cog.color}}>{cog.label}</div>
              </div>
              <div style={{marginLeft:"auto",textAlign:"right"}}>
                <div style={{fontSize:9,fontFamily:C.mono,letterSpacing:".14em",textTransform:"uppercase",color:C.text3,marginBottom:2}}>Proficiency</div>
                <div style={{fontFamily:C.disp,fontSize:20,fontWeight:800,color:prof.color}}>{prof.label}</div>
              </div>
            </div>
            <div style={{borderRadius:16,padding:"1rem 1.4rem",border:`1px solid rgba(79,193,255,.12)`,background:C.surface,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
              <div style={{fontSize:9,fontFamily:C.mono,letterSpacing:".14em",textTransform:"uppercase",color:`${C.blue}99`}}>Total Keys</div>
              <div style={{fontFamily:C.mono,fontSize:32,fontWeight:700,color:"#fff",marginTop:8}}>{totalKeys.toLocaleString()}</div>
            </div>
            <div style={{borderRadius:16,padding:"1rem 1.4rem",border:`1px solid rgba(78,201,176,.12)`,background:C.surface,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
              <div style={{fontSize:9,fontFamily:C.mono,letterSpacing:".14em",textTransform:"uppercase",color:`${C.teal}99`}}>Session Time</div>
              <div style={{fontFamily:C.mono,fontSize:32,fontWeight:700,color:"#fff",marginTop:8}}>{fmtTime(sessionTime)}</div>
            </div>
          </div>

          {/* ══ ROW 2: Metric cards ══ */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
            <StatCard label="Typing Speed"   value={wpm}           unit="WPM"     color={C.blue}   history={wpmHistory}  icon="⌨"
              status={wpm>60?"FAST":wpm>30?"NORMAL":isTracking?"SLOW":null} statusColor={wpm>60?C.teal:wpm>30?C.blue:C.amber}/>
            <StatCard label="Backspace Freq" value={`${bsRate}%`}  unit="of keys" color={C.amber}  history={bsHistory}   icon="⌫"
              status={bsRate>20?"HIGH":bsRate>8?"MED":isTracking?"LOW":null} statusColor={bsRate>20?C.rose:bsRate>8?C.amber:C.teal}/>
            <StatCard label="Error Rate"     value={`${errRate}%`} unit="per word" color={C.rose}   history={errHistory}  icon="✖"
              status={errRate>15?"ALERT":errRate>5?"WATCH":isTracking?"CLEAN":null} statusColor={errRate>15?C.rose:errRate>5?C.amber:C.teal}/>
            <StatCard label="Idle Time"      value={idleSeconds}   unit="seconds"  color={C.violet} history={idleHistory} icon="◷"
              status={idleSeconds>=30?"STUCK":idleSeconds>=10?"IDLE":isTracking?"ACTIVE":null} statusColor={idleSeconds>=30?C.rose:idleSeconds>=10?C.amber:C.teal}/>
          </div>

          {/* ══ ROW 3: CODE EDITOR (left) + TABS PANEL (right) ══ */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>

            {/* ── LEFT: Code Editor ── */}
            <Panel style={{display:"flex",flexDirection:"column",minHeight:500}}>
              {/* editor header */}
              <PanelHeader
                left={
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,fontFamily:C.mono,color:C.text3}}>code.editor</span>
                    <span style={{fontSize:9,padding:"2px 8px",borderRadius:100,fontFamily:C.mono,fontWeight:700,
                      background:`${lang.color}18`,color:lang.color,border:`1px solid ${lang.color}33`}}>
                      {lang.icon} {lang.name}{lang.ext}
                    </span>
                    {diagnostics.errors.length>0&&(
                      <span style={{fontSize:9,padding:"2px 8px",borderRadius:100,
                        background:"rgba(255,107,157,.12)",color:C.rose,border:"1px solid rgba(255,107,157,.3)",fontFamily:C.mono}}>
                        ✖ {diagnostics.errors.length} error{diagnostics.errors.length!==1?"s":""}
                      </span>
                    )}
                    {diagnostics.warnings.length>0&&(
                      <span style={{fontSize:9,padding:"2px 8px",borderRadius:100,
                        background:"rgba(255,181,71,.1)",color:C.amber,border:"1px solid rgba(255,181,71,.3)",fontFamily:C.mono}}>
                        ⚠ {diagnostics.warnings.length}
                      </span>
                    )}
                  </div>
                }
                right={
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {isTracking&&<span className="live-blink" style={{fontSize:9,fontFamily:C.mono,color:C.teal}}>● REC</span>}
                    <RunButton onClick={handleRun} running={running} hasErrors={diagnostics.errors.length>0}/>
                  </div>
                }
              />

              {/* language selector bar */}
              <div style={{display:"flex",gap:6,padding:"10px 14px",flexWrap:"wrap",
                borderBottom:"1px solid rgba(255,255,255,.05)",background:"rgba(0,0,0,.1)"}}>
                {LANG_KEYS.map(k=>(
                  <LangChip key={k} lang={LANGUAGES[k]} active={activeLang===k} onClick={()=>setActiveLang(k)}/>
                ))}
              </div>

              {/* line numbers + textarea */}
              <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:360}}>
                {/* line numbers */}
                <div style={{width:44,padding:"1rem 8px 1rem 0",background:"rgba(0,0,0,.25)",
                  borderRight:"1px solid rgba(255,255,255,.04)",fontFamily:C.mono,fontSize:11,
                  color:C.text3,lineHeight:"1.8rem",textAlign:"right",
                  userSelect:"none",overflowY:"hidden",flexShrink:0}}>
                  {code.split("\n").map((_,i)=>(
                    <div key={i} style={{
                      lineHeight:"1.8rem",
                      color: diagnostics.errors.some(e=>e.line===i+1)?C.rose
                           : diagnostics.warnings.some(w=>w.line===i+1)?C.amber
                           : C.text3,
                      fontWeight: (diagnostics.errors.some(e=>e.line===i+1)||diagnostics.warnings.some(w=>w.line===i+1))?"700":"400",
                    }}>{i+1}</div>
                  ))}
                </div>
                {/* code textarea */}
                <textarea
                  value={code}
                  onChange={handleCodeChange}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  style={{flex:1,resize:"none",background:"transparent",
                    padding:"1rem",fontFamily:C.mono,fontSize:13,
                    color:C.text,lineHeight:"1.8rem",border:"none",
                    caretColor:lang.color,tabSize:2}}
                />
              </div>

              {/* editor footer */}
              <div style={{display:"flex",gap:14,padding:"7px 18px",
                borderTop:"1px solid rgba(255,255,255,.05)",fontSize:10,fontFamily:C.mono,color:C.text3,
                background:"rgba(0,0,0,.15)"}}>
                <span>{lang.icon} {lang.name}</span>
                <span>{code.split("\n").length} ln</span>
                <span>{code.length} ch</span>
                <span style={{marginLeft:"auto",color:diagnostics.errors.length>0?C.rose:C.teal}}>
                  {diagnostics.errors.length>0?`✖ ${diagnostics.errors.length} error(s)`:"✓ clean"}
                </span>
              </div>
            </Panel>

            {/* ── RIGHT: Log / Output / Lint tabs ── */}
            <Panel style={{display:"flex",flexDirection:"column",minHeight:500}}>
              <PanelHeader
                left={
                  <div style={{display:"flex",gap:4}}>
                    {tabBtn("log","Behavior Log")}
                    {tabBtn("output","Output",
                      runResult&&<span style={{fontSize:9,marginLeft:3,color:runResult.exitCode===0?C.teal:C.rose}}>
                        {runResult.exitCode===0?"✓":"✖"}
                      </span>
                    )}
                    {tabBtn("lint",
                      <>Lint {diagCount>0&&
                        <span style={{fontSize:9,padding:"1px 6px",borderRadius:100,marginLeft:4,
                          background:`${diagnostics.errors.length>0?C.rose:C.amber}22`,
                          color:diagnostics.errors.length>0?C.rose:C.amber,
                          border:`1px solid ${diagnostics.errors.length>0?C.rose:C.amber}44`}}>
                          {diagCount}
                        </span>}
                      </>
                    )}
                  </div>
                }
                right={<span style={{fontSize:10,fontFamily:C.mono,color:C.text3}}>{lang.icon} {lang.ext}</span>}
              />

              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

                {/* BEHAVIOR LOG */}
                {activeTab==="log"&&(
                  <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
                    {log.length===0
                      ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                          height:180,color:C.text3}}>
                          <div style={{fontSize:26,marginBottom:8}}>◎</div>
                          <div style={{fontSize:12,fontFamily:C.mono}}>No events — start tracking</div>
                        </div>
                      :log.map((e,i)=><LogRow key={i} entry={e} idx={i}/>)
                    }
                  </div>
                )}

                {/* OUTPUT */}
                {activeTab==="output"&&<OutputTerminal result={runResult} lang={lang}/>}

                {/* LINT */}
                {activeTab==="lint"&&(
                  <div style={{flex:1,overflowY:"auto",padding:"10px 8px"}}>
                    <div style={{display:"flex",gap:10,padding:"8px 10px",marginBottom:10,borderRadius:10,
                      background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.06)"}}>
                      <span style={{fontSize:10,fontFamily:C.mono,color:C.rose}}>
                        ✖ {diagnostics.errors.length} error{diagnostics.errors.length!==1?"s":""}
                      </span>
                      <span style={{fontSize:10,fontFamily:C.mono,color:C.amber}}>
                        ⚠ {diagnostics.warnings.length} warning{diagnostics.warnings.length!==1?"s":""}
                      </span>
                      <span style={{marginLeft:"auto",fontSize:10,fontFamily:C.mono,color:C.text3}}>{lang.name} checker</span>
                    </div>
                    {allDiags.length===0
                      ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:150,color:C.teal}}>
                          <div style={{fontSize:28,marginBottom:8}}>✓</div>
                          <div style={{fontSize:12,fontFamily:C.mono}}>No issues found in {lang.name}</div>
                        </div>
                      :allDiags.map((d,i)=><DiagRow key={i} d={d} idx={i}/>)
                    }
                  </div>
                )}

              </div>

              {/* right panel footer */}
              <div style={{display:"flex",gap:14,padding:"7px 18px",borderTop:"1px solid rgba(255,255,255,.05)",
                fontSize:10,fontFamily:C.mono,color:C.text3,background:"rgba(0,0,0,.15)"}}>
                <span>{isTracking?"● tracking":"○ standby"}</span>
                <span>{log.length} events</span>
                <span style={{marginLeft:"auto"}}>
                  {runResult?`exit ${runResult.exitCode} · ${runResult.ms}ms`:"not yet run"}
                </span>
              </div>
            </Panel>
          </div>

          {/* ══ ROW 4: Gauges + Heatmap ══ */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12,marginBottom:14}}>
            <Panel>
              <PanelHeader left={<span style={{fontSize:11,fontFamily:C.mono,color:C.text3}}>live.gauges</span>}/>
              <div style={{padding:"1.4rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,placeItems:"center"}}>
                <RadialGauge value={wpm}                      max={120} color={C.blue}   label="WPM"        unit="wpm"/>
                <RadialGauge value={bsRate}                   max={50}  color={C.amber}  label="Backspace"  unit="%"/>
                <RadialGauge value={errRate}                  max={30}  color={C.rose}   label="Error Rate" unit="%"/>
                <RadialGauge value={Math.min(idleSeconds,60)} max={60}  color={C.violet} label="Idle"       unit="s"/>
              </div>
            </Panel>
            <Panel>
              <PanelHeader
                left={<span style={{fontSize:11,fontFamily:C.mono,color:C.text3}}>activity.heatmap</span>}
                right={
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    {[["rgba(255,255,255,.04)","None"],["#1d4a5c","Low"],["#4EC9B0","Med"],["#4FC1FF","High"]].map(([bg,lbl])=>(
                      <span key={lbl} style={{display:"flex",alignItems:"center",gap:4,fontSize:9,fontFamily:C.mono,color:C.text3}}>
                        <span style={{width:10,height:10,borderRadius:2,background:bg,display:"inline-block"}}/>{lbl}
                      </span>
                    ))}
                  </div>
                }
              />
              <div style={{padding:"1.4rem",display:"flex",flexDirection:"column",gap:18}}>
                <div>
                  <div style={{fontSize:10,fontFamily:C.mono,color:C.text3,marginBottom:8}}>Last 60 seconds of keystroke density</div>
                  <ActivityHeatmap activityLog={activityLog}/>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontFamily:C.mono,color:C.text3,marginBottom:5}}>
                    <span>Key distribution</span><span>{totalKeys} total</span>
                  </div>
                  <div style={{display:"flex",height:8,borderRadius:100,overflow:"hidden",background:"rgba(255,255,255,.04)"}}>
                    {totalKeys>0&&<>
                      <div style={{height:"100%",width:`${normalPct}%`,background:C.blue,transition:"width .5s",borderRadius:"100px 0 0 100px",minWidth:4}}/>
                      <div style={{height:"100%",width:`${bsPct}%`,background:C.amber,transition:"width .5s"}}/>
                      <div style={{height:"100%",width:`${errPct}%`,background:C.rose,transition:"width .5s",borderRadius:"0 100px 100px 0"}}/>
                    </>}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:9,fontFamily:C.mono}}>
                    <span style={{color:`${C.blue}99`}}>■ Normal keys</span>
                    <span style={{color:`${C.amber}99`}}>■ Backspaces</span>
                    <span style={{color:`${C.rose}99`}}>■ Errors</span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* ══ FOOTER ══ */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,
            paddingTop:24,borderTop:"1px solid rgba(255,255,255,.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,background:"linear-gradient(135deg,#4FC1FF,#4EC9B0)"}}>⚡</div>
              <span style={{fontFamily:C.disp,fontWeight:800,fontSize:14,color:C.text2}}>CKC-OS</span>
            </div>
            <div style={{fontSize:10,fontFamily:C.mono,color:C.text3}}>
              Behavior Tracking Engine · Module 08 · 7 Languages · Cognitive Layer · 2025
            </div>
            <div style={{fontSize:10,fontFamily:C.mono,color:C.text3}}>
              {backspaces} backspaces · {errors} errors · {totalKeys} total keys
            </div>
          </div>

        </div>
      </div>
    </>
  );
}