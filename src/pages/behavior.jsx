import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   CKC-OS · UNIFIED COGNITIVE ENGINE
   Behavior Tracking + Frustration Detection + Code Editor
   Languages: Python · JavaScript · TypeScript · Java · C++ · Rust · Go · SQL
═══════════════════════════════════════════════════════════════ */

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  @keyframes logIn    { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.15} }
  @keyframes fadeIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes runPing  { 0%{box-shadow:0 0 0 0 rgba(34,211,165,.6)} 70%{box-shadow:0 0 0 10px rgba(34,211,165,0)} 100%{box-shadow:0 0 0 0 rgba(34,211,165,0)} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes slideIn  { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes glow     { 0%,100%{box-shadow:0 0 8px rgba(34,211,165,.3)} 50%{box-shadow:0 0 20px rgba(34,211,165,.6)} }
  @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }

  .live-blink  { animation: blink 1.4s ease infinite; }
  .run-ping    { animation: runPing 1s ease; }
  .a-spin      { animation: spin .7s linear infinite; }
  .a-fadein    { animation: fadeIn .35s ease both; }
  .a-pulse     { animation: pulse 1.2s ease infinite; }
  .a-glow      { animation: glow 2.5s ease infinite; }
  .a-slidein   { animation: slideIn .3s ease both; }

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(34,211,165,.2); border-radius:2px; }
  textarea { outline:none; resize:none; }
  button   { cursor:pointer; font-family:inherit; }
`;

/* ── Design Tokens (navy/teal theme matching landing) ── */
const C = {
  bg:      "#060d1a",
  bg2:     "#070f1e",
  bg3:     "#080f1e",
  surface: "rgba(7,15,30,.92)",
  border:  "rgba(255,255,255,.06)",
  border2: "#111e30",

  teal:    "#22d3a5",
  cyan:    "#0ea5e9",
  blue:    "#3b82f6",
  amber:   "#f59e0b",
  rose:    "#ef4444",
  violet:  "#a855f7",
  white:   "#e2eaf8",

  text:    "#c9d9f0",
  text2:   "#6b7280",
  text3:   "#3d5a7a",
  text4:   "#2d4060",

  mono:    "'JetBrains Mono', monospace",
  disp:    "'Syne', sans-serif",
};

/* ── Language Definitions ── */
const LANGUAGES = {
  python:     { id:"python",     name:"Python",     ext:".py",   icon:"🐍", color:C.cyan,
    template:`def greet(name):
    return f"Hello, {name}!"

result = greet("World")
print(result)
` },
  javascript: { id:"javascript", name:"JavaScript", ext:".js",   icon:"⚡", color:C.amber,
    template:`function greet(name) {
  return \`Hello, \${name}!\`;
}

const result = greet("World");
console.log(result);
` },
  typescript: { id:"typescript", name:"TypeScript", ext:".ts",   icon:"🔷", color:C.blue,
    template:`function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const result: string = greet("World");
console.log(result);
` },
  java:       { id:"java",       name:"Java",       ext:".java", icon:"☕", color:"#f97316",
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
  cpp:        { id:"cpp",        name:"C++",        ext:".cpp",  icon:"⚙",  color:"#a78bfa",
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
  rust:       { id:"rust",       name:"Rust",       ext:".rs",   icon:"🦀", color:C.amber,
    template:`fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    let result = greet("World");
    println!("{}", result);
}
` },
  golang:     { id:"golang",     name:"Go",         ext:".go",   icon:"🐹", color:C.teal,
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
  sql:        { id:"sql",        name:"SQL",        ext:".sql",  icon:"🗄",  color:"#60a5fa",
    template:`-- SQL Example
SELECT 'Hello, World!' AS greeting;

-- Try a more complex query
SELECT
  name,
  COUNT(*) as count
FROM users
GROUP BY name
ORDER BY count DESC
LIMIT 10;
` },
};

const LANG_KEYS = ["python","javascript","typescript","java","cpp","rust","golang","sql"];

/* ── Hints / Learning / Suggestions per language ── */
const HINTS = {
  python:     ["Python uses indentation instead of braces — check your spacing.","Use print() to debug variables.","Lists use [], dictionaries use {}."],
  javascript: ["Use console.log() to inspect values.","Arrow functions: const fn = (x) => x * 2","Check for missing semicolons or unclosed brackets."],
  typescript: ["Check your type annotations — `: string` after a param defines its type.","Use console.log() to debug values at runtime.","TypeScript compiles to JavaScript — watch for type mismatches."],
  java:       ["Every Java program needs a main method inside a class.","Don't forget semicolons at line ends.","Check that your class name matches the filename."],
  cpp:        ["Include headers like #include <iostream> for I/O.","Use std::cout << value; to print.","Don't forget return 0; in main()."],
  rust:       ["Rust is memory-safe — ownership rules prevent bugs.","Use println!() macro to print.","Variables are immutable by default — use let mut to mutate."],
  golang:     ["Go uses := for short variable declarations.","Every package must start with package main.","Use fmt.Println() for output."],
  sql:        ["SQL keywords are case-insensitive: SELECT = select.","Use WHERE to filter rows.","Always end statements with a semicolon."],
};

const LEARNING = {
  python:     { title:"Python Basics", steps:["Variables don't need type declarations","Indentation defines code blocks (4 spaces)","Functions: def name(params):","Run with python3 file.py"] },
  javascript: { title:"JavaScript Basics", steps:["Variables: let, const, var","Functions: function fn() {} or const fn = () => {}","Arrays: [], Objects: {}","Run in browser console or Node.js"] },
  typescript: { title:"TypeScript Basics", steps:["Declare types with : type after variable names","Use interface for object shapes","Generics use angle brackets: Array<string>","Run with npx ts-node file.ts"] },
  java:       { title:"Java Basics", steps:["Everything is inside a class","Main entry: public static void main(String[] args)","Compile: javac Main.java","Run: java Main"] },
  cpp:        { title:"C++ Basics", steps:["Include standard headers: #include <iostream>","Use std:: prefix for standard library","Compile: g++ file.cpp -o output","Run: ./output"] },
  rust:       { title:"Rust Basics", steps:["Variables are immutable by default","Use let mut for mutable variables","Compile: rustc file.rs","Or use Cargo: cargo run"] },
  golang:     { title:"Go Basics", steps:["All files start with package main","Import packages with import","Run: go run main.go","Build: go build"] },
  sql:        { title:"SQL Basics", steps:["SELECT retrieves data: SELECT * FROM table","Filter with WHERE: WHERE column = value","JOIN combines tables","GROUP BY aggregates rows"] },
};

const SUGGESTIONS = {
  python:     ["Try Python Tutor to visualize code step by step","Use Python REPL for quick experiments","Check indentation with a linter"],
  javascript: ["Open browser DevTools (F12) for live JS execution","Use MDN Web Docs for reference","Try ESLint to catch common errors"],
  typescript: ["Try the TypeScript playground at typescriptlang.org","Use VSCode for real-time TS error highlighting","Break your code into smaller typed functions"],
  java:       ["Use IntelliJ IDEA for Java development","Check the Java Docs for class references","Break large classes into smaller methods"],
  cpp:        ["Use a debugger like GDB to trace errors","Compile with -Wall to see all warnings","Check for memory leaks with Valgrind"],
  rust:       ["Read the Rust Book (doc.rust-lang.org/book)","Use cargo check for fast compile errors","The borrow checker message often has fix hints"],
  golang:     ["Use go run . to quickly run your code","Read Effective Go for idiomatic patterns","Use go vet to catch suspicious constructs"],
  sql:        ["Use a sandbox like DB Fiddle to test queries","Break complex queries into CTEs","Explain queries with EXPLAIN ANALYZE"],
};

/* ── Syntax Checkers ── */
function bracketBalance(code) {
  const out=[];let depth={"(":0,"[":0,"{":0};const pairs={")":" (",")":" (",")":" (","]":" [","}":" {"};
  const pairsFixed={")":"(","]":"[","}":"{"};
  let inStr=false,strChar="";const lines=code.split("\n");let line=1,col=0;
  for(let i=0;i<code.length;i++){const ch=code[i];if(ch==="\n"){line++;col=0;continue;}col++;
    if(!inStr&&(ch==='"'||ch==="'"||ch==="`")){inStr=true;strChar=ch;continue;}
    if(inStr&&ch===strChar&&code[i-1]!=="\\"){inStr=false;continue;}
    if(inStr)continue;
    if("([{".includes(ch))depth[ch]++;
    if(")]}".includes(ch)){const open=pairsFixed[ch];if(depth[open]>0)depth[open]--;else out.push({line,col,msg:`Unmatched '${ch}'`,severity:"error"});}}
  if(depth["("]>0)out.push({line:lines.length,col:1,msg:`${depth["("]} unclosed '('`,severity:"error"});
  if(depth["["]>0)out.push({line:lines.length,col:1,msg:`${depth["["]} unclosed '['`,severity:"error"});
  if(depth["{"]>0)out.push({line:lines.length,col:1,msg:`${depth["{"]} unclosed '{'`,severity:"error"});
  return out;
}

function checkPython(code){const lines=code.split("\n");const errors=[],warnings=[];lines.forEach((raw,i)=>{const ln=i+1;const col=Math.max(raw.search(/\S/),0)+1;if(/^\t+ /.test(raw)||/^ +\t/.test(raw))errors.push({line:ln,col:1,msg:"Mixed tabs and spaces",severity:"error"});if(/^\s*print\s+[^(]/.test(raw))errors.push({line:ln,col,msg:"print() needs parentheses in Python 3",severity:"error"});if(/^\s*(def|class|if|for|while|else|elif|try|except|finally|with)\b/.test(raw)){const nc=raw.split("#")[0];if(!/:\s*(#.*)?$/.test(nc)&&!/\\\s*$/.test(nc))errors.push({line:ln,col:raw.length,msg:"Expected ':' at end of statement",severity:"error"});}if(/^\s*(if|while|elif)\b.*[^=!<>]=[^=]/.test(raw))warnings.push({line:ln,col,msg:"Possible assignment '=' where '==' was intended",severity:"warning"});if(/^\s*except\s*:/.test(raw))warnings.push({line:ln,col,msg:"Bare 'except' — specify exception type",severity:"warning"});});bracketBalance(code).forEach(d=>errors.push(d));return{errors,warnings};}

function checkJSTS(code,isTS){const lines=code.split("\n");const errors=[],warnings=[];lines.forEach((raw,i)=>{const ln=i+1;const col=Math.max(raw.search(/\S/),0)+1;if(/\bvar\s+/.test(raw))warnings.push({line:ln,col:raw.indexOf("var")+1,msg:"Prefer 'let' or 'const' over 'var'",severity:"warning"});if(/[^=!<>]==[^=]/.test(raw)&&!/===/.test(raw))warnings.push({line:ln,col:raw.indexOf("==")+1,msg:"Use '===' instead of '==' for strict equality",severity:"warning"});if(/console\.log/.test(raw))warnings.push({line:ln,col:raw.indexOf("console")+1,msg:"console.log left in code",severity:"info"});const bt=(raw.match(/`/g)||[]).length;if(bt%2!==0)errors.push({line:ln,col:raw.lastIndexOf("`")+1,msg:"Unclosed template literal",severity:"error"});if(isTS){if(/:\s*any\b/.test(raw))warnings.push({line:ln,col:raw.indexOf("any")+1,msg:"Avoid 'any' — use explicit types",severity:"warning"});}});bracketBalance(code).forEach(d=>errors.push(d));return{errors,warnings};}

function checkJava(code){const lines=code.split("\n");const errors=[],warnings=[];if(!/public\s+class\s+\w+/.test(code))errors.push({line:1,col:1,msg:"Missing 'public class' declaration",severity:"error"});if(!/public\s+static\s+void\s+main\s*\(\s*String/.test(code))warnings.push({line:1,col:1,msg:"Missing main() entry point",severity:"warning"});lines.forEach((raw,i)=>{const ln=i+1;if(/"\s*==\s*"/.test(raw)||/\w+\s*==\s*"/.test(raw))warnings.push({line:ln,col:1,msg:"Use .equals() for String comparison",severity:"warning"});});const o=(code.match(/\{/g)||[]).length,c=(code.match(/\}/g)||[]).length;if(o!==c)errors.push({line:lines.length,col:1,msg:`Mismatched braces: ${o} '{' vs ${c} '}'`,severity:"error"});return{errors,warnings};}

function checkCpp(code){const lines=code.split("\n");const errors=[],warnings=[];if(!/\bmain\s*\(/.test(code))errors.push({line:1,col:1,msg:"Missing 'main' function",severity:"error"});if(!/#include/.test(code))warnings.push({line:1,col:1,msg:"No #include directives found",severity:"info"});lines.forEach((raw,i)=>{const ln=i+1;if(/void\s+main\s*\(/.test(raw))errors.push({line:ln,col:1,msg:"'void main()' is non-standard — use 'int main()'",severity:"error"});if(/\bnew\s+/.test(raw))warnings.push({line:ln,col:raw.indexOf("new")+1,msg:"Raw 'new' — consider smart pointers",severity:"warning"});});const o=(code.match(/\{/g)||[]).length,c=(code.match(/\}/g)||[]).length;if(o!==c)errors.push({line:lines.length,col:1,msg:`Mismatched braces: ${o} '{' vs ${c} '}'`,severity:"error"});return{errors,warnings};}

function checkRust(code){const lines=code.split("\n");const errors=[],warnings=[];if(!/fn\s+main\s*\(/.test(code))errors.push({line:1,col:1,msg:"Missing 'fn main()' entry point",severity:"error"});lines.forEach((raw,i)=>{const ln=i+1;if(/\.unwrap\(\)/.test(raw))warnings.push({line:ln,col:raw.indexOf(".unwrap")+1,msg:"Avoid .unwrap() — use ? or match",severity:"warning"});if(/\bpanic!\s*\(/.test(raw))warnings.push({line:ln,col:raw.indexOf("panic!")+1,msg:"panic! crashes — prefer Result/Option",severity:"warning"});});const o=(code.match(/\{/g)||[]).length,c=(code.match(/\}/g)||[]).length;if(o!==c)errors.push({line:lines.length,col:1,msg:`Mismatched braces: ${o} '{' vs ${c} '}'`,severity:"error"});return{errors,warnings};}

function checkGolang(code){const lines=code.split("\n");const errors=[],warnings=[];if(!/^\s*package\s+main\b/.test(code))errors.push({line:1,col:1,msg:"Missing 'package main' declaration",severity:"error"});if(!/func\s+main\s*\(\s*\)/.test(code))errors.push({line:1,col:1,msg:"Missing 'func main()' entry point",severity:"error"});if(/\bfmt\./.test(code)&&!/import.*"fmt"/.test(code)&&!/import\s*\([\s\S]*"fmt"[\s\S]*\)/.test(code))errors.push({line:1,col:1,msg:"Using 'fmt' but not imported",severity:"error"});const o=(code.match(/\{/g)||[]).length,c=(code.match(/\}/g)||[]).length;if(o!==c)errors.push({line:lines.length,col:1,msg:`Mismatched braces: ${o} '{' vs ${c} '}'`,severity:"error"});return{errors,warnings};}

function checkSQL(code){const errors=[],warnings=[];if(code.trim()&&!code.trim().endsWith(";"))warnings.push({line:1,col:1,msg:"SQL statement should end with a semicolon",severity:"warning"});if(/\bSELECT\s+\*/i.test(code))warnings.push({line:1,col:1,msg:"SELECT * — consider selecting specific columns",severity:"info"});return{errors,warnings};}

function runSyntaxCheck(langId,code){if(!code.trim())return{errors:[],warnings:[]};switch(langId){case"python":return checkPython(code);case"javascript":return checkJSTS(code,false);case"typescript":return checkJSTS(code,true);case"java":return checkJava(code);case"cpp":return checkCpp(code);case"rust":return checkRust(code);case"golang":return checkGolang(code);case"sql":return checkSQL(code);default:return{errors:[],warnings:[]};}}

/* ── Simulated Execution ── */
function simulateRun(langId,code){
  const{errors}=runSyntaxCheck(langId,code);const lang=LANGUAGES[langId];
  if(errors.length>0)return{stdout:"",stderr:errors.map(e=>`${lang.ext.slice(1)}:${e.line}:${e.col}: error: ${e.msg}`).join("\n"),exitCode:1,ms:Math.floor(Math.random()*80)+20};
  const lines=code.split("\n"),outputs=[];
  lines.forEach(raw=>{
    if(langId==="python"){const m=raw.match(/^\s*print\s*\((.+)\)\s*$/);if(m)outputs.push(m[1].trim().replace(/^f?["']|["']$/g,"").replace(/\{([^}]+)\}/g,"<$1>"));}
    if(langId==="javascript"||langId==="typescript"){const m=raw.match(/console\.log\s*\((.+)\)\s*;?\s*$/);if(m)outputs.push(m[1].trim().replace(/^`|`$/g,"").replace(/\$\{[^}]+\}/g,"<expr>").replace(/^["']|["']$/g,""));}
    if(langId==="java"){const m=raw.match(/System\.out\.println\s*\((.+)\)\s*;/);if(m)outputs.push(m[1].trim().replace(/^"|"$/g,"").replace(/"?\s*\+\s*\w+\s*\+\s*"?/g,"<expr>"));}
    if(langId==="cpp"){const m=raw.match(/cout\s*<<\s*(.+?)(?:\s*<<\s*endl|;)/);if(m)outputs.push(m[1].trim().replace(/^"|"$/g,""));}
    if(langId==="rust"){const m=raw.match(/println!\s*\(\s*"([^"]+)"/);if(m)outputs.push(m[1].replace(/\{\}/g,"<value>"));}
    if(langId==="golang"){const m=raw.match(/fmt\.Print(?:ln|f)\s*\(\s*"([^"]+)"/);if(m)outputs.push(m[1].replace(/%[sdvf]/g,"<value>"));}
    if(langId==="sql"){const m=raw.match(/SELECT\s+'([^']+)'/i);if(m)outputs.push(`greeting\n---------\n${m[1]}\n(1 row)`);}
  });
  const ms=Math.floor(Math.random()*320)+80;
  return{stdout:outputs.length>0?outputs.join("\n"):"[Process exited 0 — no output captured]\n[Tip: use print/console.log/println to produce output]",stderr:"",exitCode:0,ms};
}

/* ════════════════════════════════════
   UI COMPONENTS
════════════════════════════════════ */

function Sparkline({data,color,height=32}){
  if(!data||data.length<2)return null;
  const max=Math.max(...data,1),min=Math.min(...data,0),range=max-min||1,W=100;
  const pts=data.map((v,i)=>{const x=(i/(data.length-1))*W;const y=height-((v-min)/range)*(height-4)-2;return`${x},${y}`;});
  const poly=pts.join(" "),area=`0,${height} ${poly} ${W},${height}`,gid=`g${color.replace(/[^a-z0-9]/gi,"")}`;
  return(<svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} style={{overflow:"visible",flexShrink:0}}>
    <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    <polygon points={area} fill={`url(#${gid})`}/>
    <polyline points={poly} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    <circle cx={parseFloat(pts[pts.length-1].split(",")[0])} cy={parseFloat(pts[pts.length-1].split(",")[1])} r="2.5" fill={color}/>
  </svg>);
}

function FrustrationBar({level}){
  const color=level<30?C.teal:level<60?C.amber:C.rose;
  const label=level<30?"Focused":level<60?"Struggling":"Frustrated";
  return(<div style={{display:"flex",flexDirection:"column",gap:5}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontFamily:C.mono,fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.text3}}>Frustration Index</span>
      <span style={{fontFamily:C.mono,fontSize:10,color,fontWeight:700}}>{label} · {level}%</span>
    </div>
    <div style={{background:"rgba(255,255,255,.05)",borderRadius:4,height:5,overflow:"hidden"}}>
      <div style={{width:`${level}%`,background:`linear-gradient(90deg,${C.teal},${color})`,height:"100%",borderRadius:4,transition:"width .6s ease,background .6s ease"}}/>
    </div>
  </div>);
}

function MetricCard({label,value,unit,color,history,icon,status,statusColor}){
  const [hov,setHov]=useState(false);
  return(<div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
    position:"relative",borderRadius:12,padding:"1.1rem 1.2rem",
    border:`1px solid ${hov?color+"55":color+"1a"}`,background:C.surface,overflow:"hidden",
    boxShadow:hov?`0 0 28px ${color}12`:"none",transition:"border-color .25s,box-shadow .25s",
    display:"flex",flexDirection:"column",gap:10}}>
    <div style={{position:"absolute",bottom:0,left:0,height:2,width:hov?"100%":0,background:color,transition:"width .5s"}}/>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:13}}>{icon}</span>
        <span style={{fontSize:9,fontFamily:C.mono,letterSpacing:".12em",textTransform:"uppercase",color:`${color}bb`}}>{label}</span>
      </div>
      {status&&<span style={{fontSize:9,fontFamily:C.mono,fontWeight:700,padding:"2px 8px",borderRadius:100,
        border:`1px solid ${statusColor}40`,background:`${statusColor}15`,color:statusColor}}>{status}</span>}
    </div>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:8}}>
      <div style={{lineHeight:1}}>
        <span style={{fontFamily:C.mono,fontSize:24,fontWeight:700,color:C.white}}>{value}</span>
        <span style={{fontFamily:C.mono,fontSize:10,marginLeft:3,color:`${color}88`}}>{unit}</span>
      </div>
      <Sparkline data={history} color={color}/>
    </div>
  </div>);
}

function ActivityHeatmap({activityLog}){
  const cells=Array.from({length:60},(_,i)=>activityLog[i]??0);
  const max=Math.max(...cells,1);
  return(<div style={{display:"flex",flexWrap:"wrap",gap:3}}>
    {cells.map((v,i)=>{
      const intensity=v/max;
      const bg=intensity>0.7?C.teal:intensity>0.4?"#0ea5e9":intensity>0.1?"#0d3050":"rgba(255,255,255,.04)";
      return<div key={i} title={`${i}s ago: ${v} keystrokes`}
        style={{width:11,height:11,borderRadius:2,background:bg,transition:"background .3s",
          boxShadow:intensity>0.7?`0 0 4px ${C.teal}66`:"none"}}/>;
    })}
  </div>);
}

function LogRow({entry,idx}){
  const colors={info:C.cyan,warn:C.amber,error:C.rose,ok:C.teal};
  const c=colors[entry.type]||colors.info;
  const icon=entry.type==="warn"?"⚠":entry.type==="error"?"✖":entry.type==="ok"?"✓":"ℹ";
  return(<div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"5px 14px",borderRadius:6,
    background:idx%2===0?"rgba(255,255,255,.018)":"transparent",animation:"logIn .3s ease both"}}>
    <span style={{color:`${c}88`,flexShrink:0,marginTop:1,fontSize:11}}>{icon}</span>
    <span style={{color:C.text3,flexShrink:0,fontFamily:C.mono,fontSize:10,whiteSpace:"nowrap"}}>{entry.time}</span>
    <span style={{color:c,fontFamily:C.mono,fontSize:11,wordBreak:"break-word",lineHeight:1.5}}>{entry.msg}</span>
  </div>);
}

function DiagRow({d,idx}){
  const color=d.severity==="error"?C.rose:d.severity==="warning"?C.amber:C.cyan;
  const icon=d.severity==="error"?"✖":d.severity==="warning"?"⚠":"ℹ";
  return(<div className="a-fadein" style={{display:"flex",alignItems:"flex-start",gap:10,
    padding:"6px 12px",borderRadius:6,marginBottom:2,
    background:idx%2===0?"rgba(255,255,255,.02)":"transparent",
    borderLeft:`2px solid ${color}44`}}>
    <span style={{color,flexShrink:0,fontSize:11,marginTop:1}}>{icon}</span>
    <span style={{color:C.text3,flexShrink:0,fontFamily:C.mono,fontSize:10,whiteSpace:"nowrap"}}>Ln {d.line}:{d.col}</span>
    <span style={{color,fontFamily:C.mono,fontSize:11,wordBreak:"break-word",lineHeight:1.5,flex:1}}>{d.msg}</span>
    <span style={{marginLeft:8,flexShrink:0,fontSize:9,fontFamily:C.mono,color:`${color}66`,textTransform:"uppercase"}}>{d.severity}</span>
  </div>);
}

function HintPanel({hints,langId}){
  const [idx,setIdx]=useState(0);
  return(<div style={{background:"rgba(34,211,165,.04)",border:`1px solid ${C.teal}33`,borderRadius:10,padding:"14px 16px"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:C.teal}}/>
      <span style={{fontFamily:C.mono,fontSize:11,color:C.teal,fontWeight:700,letterSpacing:".1em"}}>ADAPTIVE HINT</span>
    </div>
    <p style={{color:C.text,fontSize:13,lineHeight:1.7,marginBottom:12}}>{hints[langId]?.[idx]}</p>
    <div style={{display:"flex",gap:6}}>
      {(hints[langId]||[]).map((_,i)=>(
        <button key={i} onClick={()=>setIdx(i)} style={{width:18,height:5,borderRadius:3,background:i===idx?C.teal:"rgba(255,255,255,.08)",border:"none",transition:"background .2s"}}/>
      ))}
    </div>
  </div>);
}

function LearningPanel({content}){
  const [step,setStep]=useState(0);
  if(!content)return null;
  return(<div style={{background:"rgba(59,130,246,.04)",border:`1px solid ${C.blue}33`,borderRadius:10,padding:"14px 16px"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:C.blue}}/>
      <span style={{fontFamily:C.mono,fontSize:11,color:C.blue,fontWeight:700,letterSpacing:".1em"}}>LEARNING MODE</span>
    </div>
    <p style={{fontFamily:C.mono,fontSize:12,color:C.blue,marginBottom:10}}>{content.title}</p>
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {content.steps.map((s,i)=>(
        <div key={i} onClick={()=>setStep(i)} style={{display:"flex",gap:10,padding:"7px 10px",borderRadius:6,
          background:step===i?"rgba(59,130,246,.1)":"transparent",cursor:"pointer",
          border:`1px solid ${step===i?C.blue+"44":"transparent"}`,transition:"all .2s"}}>
          <span style={{fontFamily:C.mono,fontSize:11,color:step===i?C.blue:C.text4,minWidth:20}}>{String(i+1).padStart(2,"0")}</span>
          <span style={{fontSize:12,color:step===i?C.text:C.text2,lineHeight:1.5}}>{s}</span>
        </div>
      ))}
    </div>
  </div>);
}

function SuggestionsPanel({suggestions}){
  if(!suggestions)return null;
  return(<div style={{background:"rgba(168,85,247,.04)",border:`1px solid ${C.violet}33`,borderRadius:10,padding:"14px 16px"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:C.violet}}/>
      <span style={{fontFamily:C.mono,fontSize:11,color:C.violet,fontWeight:700,letterSpacing:".1em"}}>SUGGESTIONS</span>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {suggestions.map((s,i)=>(
        <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{color:C.violet,fontFamily:C.mono,fontSize:12,marginTop:1}}>→</span>
          <span style={{fontSize:13,color:C.text,lineHeight:1.6}}>{s}</span>
        </div>
      ))}
    </div>
  </div>);
}

function RunButton({onClick,running,hasErrors}){
  const[ping,setPing]=useState(false);
  const handle=()=>{setPing(true);setTimeout(()=>setPing(false),1000);onClick();};
  return(<button onClick={handle} disabled={running} className={ping?"run-ping":""}
    style={{display:"flex",alignItems:"center",gap:7,padding:"8px 20px",borderRadius:8,border:"none",
      background:hasErrors?"linear-gradient(135deg,#ef4444,#a855f7)":"linear-gradient(135deg,#22d3a5,#0ea5e9)",
      color:"#060d1a",fontFamily:C.disp,fontWeight:800,fontSize:12,letterSpacing:".05em",
      boxShadow:hasErrors?"0 4px 18px rgba(239,68,68,.3)":"0 4px 18px rgba(34,211,165,.3)",
      opacity:running?.65:1,transition:"opacity .2s",cursor:running?"not-allowed":"pointer"}}>
    {running
      ?<><span className="a-spin" style={{width:11,height:11,border:"2px solid rgba(6,13,26,.3)",borderTopColor:"#060d1a",borderRadius:"50%",display:"inline-block"}}/>Running…</>
      :<><span>▶</span>Run Code</>}
  </button>);
}

function OutputTerminal({result,lang}){
  if(!result)return(
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      color:C.text3,fontFamily:C.mono,fontSize:12,gap:10,minHeight:160}}>
      <span style={{fontSize:28,opacity:.4}}>▶</span>
      <span>Press "Run Code" to execute {lang.name}</span>
    </div>);
  const hasErr=result.exitCode!==0||result.stderr;
  return(<div className="a-fadein" style={{flex:1,padding:"1rem",fontFamily:C.mono,fontSize:12,lineHeight:1.8,overflowY:"auto"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
      <span style={{color:hasErr?C.rose:C.teal,fontSize:11,fontWeight:700}}>{hasErr?"✖ Exit 1":"✓ Exit 0"}</span>
      <span style={{color:C.text3,fontSize:10}}>{lang.icon} {lang.name}</span>
      <span style={{color:C.text3,fontSize:10,marginLeft:"auto"}}>⏱ {result.ms}ms</span>
    </div>
    {result.stdout&&<div><div style={{fontSize:9,color:C.text3,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>stdout</div>
      <pre style={{color:C.teal,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0,fontFamily:C.mono}}>{result.stdout}</pre></div>}
    {result.stderr&&<div style={{marginTop:result.stdout?14:0}}>
      <div style={{fontSize:9,color:C.text3,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>stderr</div>
      <pre style={{color:C.rose,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0,fontFamily:C.mono}}>{result.stderr}</pre></div>}
  </div>);
}

function Panel({children,style={}}){
  return<div style={{borderRadius:14,border:`1px solid ${C.border}`,background:C.surface,overflow:"hidden",...style}}>{children}</div>;
}

function PanelHeader({left,right}){
  return(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 16px",
    background:"rgba(255,255,255,.015)",borderBottom:`1px solid rgba(255,255,255,.05)`}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{display:"flex",gap:5}}>
        <div style={{width:9,height:9,borderRadius:"50%",background:"#FF5F56"}}/>
        <div style={{width:9,height:9,borderRadius:"50%",background:"#FFBD2E"}}/>
        <div style={{width:9,height:9,borderRadius:"50%",background:"#27C93F"}}/>
      </div>
      {left}
    </div>
    {right}
  </div>);
}

function LangChip({lang,active,onClick}){
  const[hov,setHov]=useState(false);
  return(<button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{padding:"4px 11px",borderRadius:6,border:`1px solid ${active||hov?lang.color+"55":"rgba(255,255,255,.06)"}`,
      background:active?`${lang.color}18`:"rgba(255,255,255,.02)",
      color:active?lang.color:"rgba(255,255,255,.3)",
      fontFamily:C.mono,fontSize:10,fontWeight:700,
      display:"flex",alignItems:"center",gap:5,transition:"all .15s"}}>
    <span style={{fontSize:12}}>{lang.icon}</span>
    <span>{lang.name}</span>
  </button>);
}

/* ════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════ */
export default function CKCOSUnified(){

  /* ── Tracking State ── */
  const [isTracking,   setIsTracking]   = useState(false);
  const [sessionTime,  setSessionTime]  = useState(0);
  const [totalKeys,    setTotalKeys]    = useState(0);
  const [backspaces,   setBackspaces]   = useState(0);
  const [errors,       setErrors]       = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [idleSeconds,  setIdleSeconds]  = useState(0);
  const [wpm,          setWpm]          = useState(0);
  const [bsRate,       setBsRate]       = useState(0);
  const [errRate,      setErrRate]      = useState(0);
  const [wpmHistory,   setWpmHistory]   = useState(Array(20).fill(0));
  const [bsHistory,    setBsHistory]    = useState(Array(20).fill(0));
  const [errHistory,   setErrHistory]   = useState(Array(20).fill(0));
  const [idleHistory,  setIdleHistory]  = useState(Array(20).fill(0));
  const [activityLog,  setActivityLog]  = useState(Array(60).fill(0));
  const [log,          setLog]          = useState([]);

  /* ── Frustration State ── */
  const [frustration,  setFrustration]  = useState(0);
  const [editCount,    setEditCount]    = useState(0);
  const [deletionCount,setDeletionCount]= useState(0);
  const [showHints,    setShowHints]    = useState(false);
  const [showLearning, setShowLearning] = useState(false);
  const [showSuggestions,setShowSuggestions]=useState(false);
  const [activeAssist, setActiveAssist] = useState(null); // hints|learning|suggestions
  const [notification, setNotification] = useState(null);

  /* ── Editor State ── */
  const [activeLang,  setActiveLang]   = useState("python");
  const [codeByLang,  setCodeByLang]   = useState(
    Object.fromEntries(LANG_KEYS.map(k=>[k,LANGUAGES[k].template]))
  );
  const [diagnostics, setDiagnostics]  = useState({errors:[],warnings:[]});
  const [runResult,   setRunResult]    = useState(null);
  const [running,     setRunning]      = useState(false);
  const [activeTab,   setActiveTab]    = useState("log");

  const code    = codeByLang[activeLang]||"";
  const setCode = (val)=>setCodeByLang(prev=>({...prev,[activeLang]:val}));
  const lang    = LANGUAGES[activeLang];

  /* ── Refs ── */
  const sessionRef    = useRef(null);
  const metricsRef    = useRef(null);
  const heatmapRef    = useRef(null);
  const checkTimerRef = useRef(null);
  const stuckRef      = useRef(null);
  const notifRef      = useRef(null);
  const wordCountRef  = useRef(0);
  const totalKeysRef  = useRef(0);
  const backspacesRef = useRef(0);
  const thisSecondKeys= useRef(0);
  const lastCodeRef   = useRef(code);
  const stuckCounter  = useRef(0);

  const addLog = useCallback((msg,type="info")=>{
    const time=new Date().toLocaleTimeString("en",{hour12:false});
    setLog(prev=>[{msg,type,time},...prev].slice(0,80));
  },[]);

  const triggerNotif = useCallback((msg,color)=>{
    setNotification({msg,color});
    clearTimeout(notifRef.current);
    notifRef.current=setTimeout(()=>setNotification(null),3500);
  },[]);

  /* ── Frustration thresholds ── */
  useEffect(()=>{
    if(frustration>=30&&!showHints){setShowHints(true);triggerNotif("Hint system triggered — you seem stuck!",C.teal);addLog("Adaptive hints activated","warn");}
    if(frustration>=55&&!showLearning){setShowLearning(true);triggerNotif("Learning mode activated!",C.blue);addLog("Learning mode activated","warn");}
    if(frustration>=80&&!showSuggestions){setShowSuggestions(true);triggerNotif("Suggestions panel unlocked!",C.violet);addLog("Suggestions panel unlocked","error");}
  },[frustration]);

  /* ── Stuck timer (frustration ramp) ── */
  useEffect(()=>{
    if(!isTracking)return;
    stuckRef.current=setInterval(()=>{
      stuckCounter.current+=1;
      if(stuckCounter.current>0&&stuckCounter.current%8===0){
        setFrustration(f=>Math.min(100,f+5));
      }
    },1000);
    return()=>clearInterval(stuckRef.current);
  },[isTracking]);

  /* ── Live syntax check ── */
  useEffect(()=>{
    clearTimeout(checkTimerRef.current);
    checkTimerRef.current=setTimeout(()=>{
      const r=runSyntaxCheck(activeLang,code);
      setDiagnostics(r);
      if(r.errors.length>0)addLog(`Lint [${lang.name}]: ${r.errors.length} error(s), ${r.warnings.length} warning(s)`,"error");
      else if(r.warnings.length>0)addLog(`Lint [${lang.name}]: ${r.warnings.length} warning(s)`,"warn");
      else if(code.trim())addLog(`Lint [${lang.name}]: No issues found`,"ok");
    },600);
    return()=>clearTimeout(checkTimerRef.current);
  },[code,activeLang]);

  /* ── Reset on lang switch ── */
  useEffect(()=>{
    setRunResult(null);
    const r=runSyntaxCheck(activeLang,codeByLang[activeLang]||"");
    setDiagnostics(r);
  },[activeLang]);

  /* Session timer */
  useEffect(()=>{
    if(!isTracking)return;
    sessionRef.current=setInterval(()=>setSessionTime(s=>s+1),1000);
    return()=>clearInterval(sessionRef.current);
  },[isTracking]);

  /* Idle detector */
  useEffect(()=>{
    if(!isTracking)return;
    const iv=setInterval(()=>{
      const idle=Math.floor((Date.now()-lastActivity)/1000);
      setIdleSeconds(idle);
      if(idle===5)addLog("User idle for 5 seconds","warn");
      if(idle===15)addLog("Prolonged idle — possible frustration","warn");
      if(idle===30)addLog("Idle threshold exceeded — triggering adaptive hints","error");
    },1000);
    return()=>clearInterval(iv);
  },[isTracking,lastActivity,addLog]);

  /* Metrics sampler */
  useEffect(()=>{
    if(!isTracking)return;
    metricsRef.current=setInterval(()=>{
      setWpmHistory(h=>[...h.slice(1),wpm]);
      setBsHistory(h=>[...h.slice(1),bsRate]);
      setErrHistory(h=>[...h.slice(1),errRate]);
      setIdleHistory(h=>[...h.slice(1),idleSeconds]);
    },3000);
    return()=>clearInterval(metricsRef.current);
  },[isTracking,wpm,bsRate,errRate,idleSeconds]);

  /* Heatmap tick */
  useEffect(()=>{
    if(!isTracking)return;
    heatmapRef.current=setInterval(()=>{
      setActivityLog(prev=>{const next=[thisSecondKeys.current,...prev.slice(0,59)];thisSecondKeys.current=0;return next;});
    },1000);
    return()=>clearInterval(heatmapRef.current);
  },[isTracking]);

  /* Keystroke handler */
  const handleKeyDown=useCallback((e)=>{
    if(!isTracking)return;
    setLastActivity(Date.now());setIdleSeconds(0);stuckCounter.current=0;
    if(e.key==="Backspace"){
      backspacesRef.current+=1;setBackspaces(backspacesRef.current);
      const rate=totalKeysRef.current>0?+((backspacesRef.current/totalKeysRef.current)*100).toFixed(1):0;
      setBsRate(rate);
      setFrustration(f=>Math.min(100,f+1));
    }else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){
      totalKeysRef.current+=1;setTotalKeys(totalKeysRef.current);
      thisSecondKeys.current+=1;
      setSessionTime(prev=>{const mins=Math.max(prev,1)/60;setWpm(Math.round((totalKeysRef.current/5)/mins));return prev;});
    }
  },[isTracking]);

  /* Code change handler */
  const handleCodeChange=useCallback((e)=>{
    const val=e.target.value;
    // frustration from deletions
    const deletions=lastCodeRef.current.length-val.length;
    if(deletions>3){setDeletionCount(d=>d+1);setFrustration(f=>Math.min(100,f+3));}
    lastCodeRef.current=val;
    setCode(val);
    if(!isTracking)return;
    setLastActivity(Date.now());setIdleSeconds(0);stuckCounter.current=0;
    const words=val.trim().split(/\s+/).filter(Boolean);
    if(words.length!==wordCountRef.current){
      wordCountRef.current=words.length;
      if(Math.random()<0.08){
        setErrors(er=>{const next=er+1;setErrRate(+((next/Math.max(words.length,1))*100).toFixed(1));return next;});
      }
    }
    setEditCount(c=>{
      const n=c+1;if(n%15===0)setFrustration(f=>Math.max(0,f-5));return n;
    });
  },[isTracking,activeLang]);

  /* Run handler */
  const handleRun=useCallback(()=>{
    setRunning(true);setActiveTab("output");
    addLog(`▶ Executing ${lang.name} code…`,"info");
    setTimeout(()=>{
      const result=simulateRun(activeLang,code);
      setRunResult(result);setRunning(false);
      if(result.exitCode===0){addLog(`✓ ${lang.name}: exit 0 · ${result.ms}ms`,"ok");setFrustration(f=>Math.max(0,f-20));}
      else addLog(`✖ ${lang.name}: exit 1 · ${result.ms}ms`,"error");
    },400+Math.random()*600);
  },[activeLang,code,lang,addLog]);

  /* Start / Stop */
  const startSession=()=>{
    totalKeysRef.current=0;backspacesRef.current=0;wordCountRef.current=0;thisSecondKeys.current=0;stuckCounter.current=0;
    setIsTracking(true);setSessionTime(0);setTotalKeys(0);setBackspaces(0);setErrors(0);setIdleSeconds(0);
    setWpm(0);setBsRate(0);setErrRate(0);setFrustration(0);setEditCount(0);setDeletionCount(0);
    setWpmHistory(Array(20).fill(0));setBsHistory(Array(20).fill(0));setErrHistory(Array(20).fill(0));setIdleHistory(Array(20).fill(0));
    setActivityLog(Array(60).fill(0));setLog([]);setLastActivity(Date.now());
    setShowHints(false);setShowLearning(false);setShowSuggestions(false);setActiveAssist(null);
    addLog("Session started — cognitive tracking active","ok");
  };
  const stopSession=()=>{
    setIsTracking(false);
    addLog(`Session ended — ${totalKeysRef.current} keys · ${backspacesRef.current} backspaces · ${errors} errors`,"info");
  };
  const resetFrustration=()=>{
    setFrustration(0);setShowHints(false);setShowLearning(false);setShowSuggestions(false);setActiveAssist(null);
    stuckCounter.current=0;
  };

  /* Derived */
  const getCogState=()=>{
    if(!isTracking&&totalKeys===0)return{label:"Standby",color:C.text3,icon:"○"};
    if(idleSeconds>=30)return{label:"Stuck",color:C.rose,icon:"⚡"};
    if(idleSeconds>=10)return{label:"Thinking",color:C.amber,icon:"◐"};
    if(frustration>=80)return{label:"Frustrated",color:C.rose,icon:"↯"};
    if(frustration>=55)return{label:"Struggling",color:C.amber,icon:"◑"};
    if(wpm>=50&&errRate<8)return{label:"Flow State",color:C.teal,icon:"◈"};
    if(wpm>=30)return{label:"Focused",color:C.cyan,icon:"◎"};
    return{label:"Warming Up",color:C.violet,icon:"◌"};
  };
  const cog=getCogState();
  const getProficiency=()=>{
    if(!isTracking&&totalKeys===0)return{label:"—",color:C.text3};
    if(wpm>=60&&bsRate<10&&errRate<5)return{label:"Expert",color:C.teal};
    if(wpm>=40&&bsRate<20)return{label:"Intermediate",color:C.cyan};
    if(wpm>=20)return{label:"Beginner",color:C.amber};
    return{label:"Novice",color:C.rose};
  };
  const prof=getProficiency();
  const fmtTime=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const allDiags=[...diagnostics.errors,...diagnostics.warnings];

  const tabBtn=(id,label,badge)=>(
    <button onClick={()=>setActiveTab(id)} style={{
      padding:"5px 12px",borderRadius:6,border:"none",fontFamily:C.mono,fontSize:10,fontWeight:600,
      background:activeTab===id?"rgba(34,211,165,.1)":"rgba(255,255,255,.025)",
      color:activeTab===id?C.teal:C.text3,
      borderBottom:activeTab===id?`2px solid ${C.teal}`:"2px solid transparent",
      transition:"all .2s",display:"flex",alignItems:"center",gap:5}}>
      {label}{badge}
    </button>
  );

  const assistBtn=(id,label,color,show)=>show&&(
    <button onClick={()=>setActiveAssist(activeAssist===id?null:id)} style={{
      padding:"5px 12px",borderRadius:6,border:`1px solid ${activeAssist===id?color:C.border2}`,
      background:activeAssist===id?`${color}18`:"rgba(255,255,255,.02)",
      color:activeAssist===id?color:C.text3,
      fontFamily:C.mono,fontSize:10,fontWeight:700,transition:"all .2s",
      letterSpacing:".08em"}}>
      {label}
    </button>
  );

  /* ══════════════════════ RENDER ══════════════════════ */
  return(
    <>
      <style>{CSS}</style>
      <div style={{minHeight:"100vh",width:"100%",background:C.bg,
        backgroundImage:`linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`,
        backgroundSize:"52px 52px",fontFamily:C.mono,color:C.text,overflowX:"hidden"}}>

        {/* Ambient glow */}
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
          background:`radial-gradient(ellipse 60% 45% at 75% 5%,rgba(34,211,165,.08) 0%,transparent 65%),
                      radial-gradient(ellipse 40% 35% at 5% 85%,rgba(14,165,233,.06) 0%,transparent 60%),
                      radial-gradient(ellipse 30% 25% at 95% 90%,rgba(168,85,247,.05) 0%,transparent 55%)`}}/>

        {/* Scan line effect */}
        <div style={{position:"fixed",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,transparent,${C.teal}33,transparent)`,
          animation:"scanline 8s linear infinite",pointerEvents:"none",zIndex:1,opacity:.5}}/>

        {/* ── NOTIFICATION ── */}
        {notification&&(
          <div className="a-slidein" style={{position:"fixed",top:20,right:20,zIndex:1000,
            background:"rgba(6,13,26,.95)",border:`1px solid ${notification.color}55`,borderRadius:10,
            padding:"10px 16px",display:"flex",gap:10,alignItems:"center",
            boxShadow:`0 0 24px ${notification.color}20,0 8px 32px rgba(0,0,0,.5)`}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:notification.color}}/>
            <span style={{fontSize:12,color:notification.color,fontFamily:C.mono}}>{notification.msg}</span>
          </div>
        )}

        <div style={{position:"relative",zIndex:1,maxWidth:1440,margin:"0 auto",padding:"2rem 1.5rem"}}>

          {/* ══ HEADER ══ */}
          <div style={{display:"flex",flexWrap:"wrap",alignItems:"flex-start",justifyContent:"space-between",gap:20,marginBottom:28}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#22d3a5,#0ea5e9)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>⚡</div>
                  <span style={{fontFamily:C.disp,fontWeight:800,fontSize:18,color:C.white,letterSpacing:".08em"}}>CKC-OS</span>
                </div>
                <span style={{color:C.text4,fontSize:12}}>|</span>
                {[["Module 08+09",C.teal],["·",C.text3],["Cognitive Engine",C.text3]].map(([t,c],i)=>(
                  <span key={i} style={{fontSize:9,fontFamily:C.mono,letterSpacing:".14em",textTransform:"uppercase",color:c,fontWeight:i===0?700:400}}>{t}</span>
                ))}
              </div>
              <h1 style={{fontFamily:C.disp,fontSize:"clamp(1.8rem,3.5vw,2.5rem)",fontWeight:800,color:C.white,letterSpacing:"-.03em",lineHeight:1.1,marginBottom:8}}>
                Unified Cognitive<br/>
                <span style={{background:"linear-gradient(135deg,#22d3a5,#0ea5e9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
                  Behavior Engine
                </span>
              </h1>
              <p style={{fontSize:13,color:C.text2,maxWidth:520,lineHeight:1.8}}>
                Real-time keystroke analysis · frustration detection · adaptive hints · multi-language code editor with live lint & simulated execution.
              </p>
            </div>

            {/* Status + Controls */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"7px 14px",borderRadius:10,
                border:`1px solid ${isTracking?"rgba(34,211,165,.3)":C.border}`,background:C.surface}}>
                <span className={isTracking?"live-blink":""} style={{width:7,height:7,borderRadius:"50%",
                  background:isTracking?C.teal:C.text3,boxShadow:isTracking?`0 0 6px ${C.teal}`:"none"}}/>
                <span style={{fontSize:10,fontFamily:C.mono,color:isTracking?C.teal:C.text3,letterSpacing:".1em"}}>
                  {isTracking?"TRACKING ACTIVE":"STANDBY"}
                </span>
                {isTracking&&<span style={{fontSize:10,fontFamily:C.mono,color:C.text2}}>{fmtTime(sessionTime)}</span>}
              </div>
              <div style={{display:"flex",gap:8}}>
                {!isTracking
                  ?<button onClick={startSession} style={{padding:"9px 22px",borderRadius:9,border:"none",
                      background:"linear-gradient(135deg,#22d3a5,#0ea5e9)",color:"#060d1a",
                      fontFamily:C.disp,fontWeight:800,fontSize:13,letterSpacing:".05em",
                      boxShadow:"0 6px 24px rgba(34,211,165,.35)"}}>
                      ▶ Start Tracking
                    </button>
                  :<button onClick={stopSession} style={{padding:"9px 22px",borderRadius:9,
                      border:`1px solid rgba(239,68,68,.3)`,background:"rgba(239,68,68,.07)",
                      color:C.rose,fontFamily:C.mono,fontWeight:600,fontSize:13}}>■ Stop</button>}
                {frustration>0&&<button onClick={resetFrustration} style={{padding:"9px 14px",borderRadius:9,
                  border:`1px solid ${C.border}`,background:"rgba(255,255,255,.03)",
                  color:C.text3,fontFamily:C.mono,fontSize:11}}>Reset FI</button>}
              </div>
            </div>
          </div>

          {/* ══ FRUSTRATION BANNER ══ */}
          {frustration>=30&&(
            <div style={{marginBottom:14,borderRadius:10,padding:"10px 18px",
              background:frustration>=80?"rgba(26,10,10,.9)":frustration>=55?"rgba(26,20,10,.9)":"rgba(10,26,18,.9)",
              border:`1px solid ${frustration>=80?C.rose+"33":frustration>=55?C.amber+"33":C.teal+"33"}`,
              display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span className={frustration>=55?"a-pulse":""} style={{width:7,height:7,borderRadius:"50%",
                  display:"inline-block",background:frustration>=80?C.rose:frustration>=55?C.amber:C.teal}}/>
                <span style={{fontSize:11,color:frustration>=80?C.rose:frustration>=55?C.amber:C.teal,fontFamily:C.mono}}>
                  {frustration>=80?"HIGH FRUSTRATION — All adaptive systems active":
                   frustration>=55?"STRUGGLING DETECTED — Learning mode & hints active":
                   "STUCK PATTERN — Hint system activated"}
                </span>
              </div>
              <div style={{display:"flex",gap:6}}>
                {assistBtn("hints","💡 Hints",C.teal,showHints)}
                {assistBtn("learning","📖 Learn",C.blue,showLearning)}
                {assistBtn("suggestions","🔮 Suggest",C.violet,showSuggestions)}
              </div>
            </div>
          )}

          {/* ══ ROW 1: Status overview ══ */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div style={{borderRadius:12,padding:"1rem 1.4rem",border:`1px solid ${cog.color}2a`,
              background:C.surface,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <div style={{width:44,height:44,borderRadius:10,flexShrink:0,display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:20,background:`${cog.color}12`,border:`1px solid ${cog.color}2a`}}>{cog.icon}</div>
              <div>
                <div style={{fontSize:8,fontFamily:C.mono,letterSpacing:".14em",textTransform:"uppercase",color:C.text3,marginBottom:1}}>Cognitive State</div>
                <div style={{fontFamily:C.disp,fontSize:18,fontWeight:800,color:cog.color}}>{cog.label}</div>
              </div>
              <div style={{marginLeft:"auto",textAlign:"right"}}>
                <div style={{fontSize:8,fontFamily:C.mono,letterSpacing:".14em",textTransform:"uppercase",color:C.text3,marginBottom:1}}>Proficiency</div>
                <div style={{fontFamily:C.disp,fontSize:18,fontWeight:800,color:prof.color}}>{prof.label}</div>
              </div>
              <div style={{marginLeft:16,flex:"0 0 200px"}}>
                <FrustrationBar level={frustration}/>
              </div>
            </div>
            <div style={{borderRadius:12,padding:"1rem 1.4rem",border:`1px solid rgba(34,211,165,.12)`,background:C.surface}}>
              <div style={{fontSize:8,fontFamily:C.mono,letterSpacing:".14em",textTransform:"uppercase",color:`${C.teal}99`,marginBottom:6}}>Total Keys</div>
              <div style={{fontFamily:C.mono,fontSize:28,fontWeight:700,color:C.white}}>{totalKeys.toLocaleString()}</div>
              <div style={{fontSize:10,fontFamily:C.mono,color:C.text3,marginTop:4}}>{editCount} edits · {deletionCount} deletions</div>
            </div>
            <div style={{borderRadius:12,padding:"1rem 1.4rem",border:`1px solid rgba(14,165,233,.12)`,background:C.surface}}>
              <div style={{fontSize:8,fontFamily:C.mono,letterSpacing:".14em",textTransform:"uppercase",color:`${C.cyan}99`,marginBottom:6}}>Session Time</div>
              <div style={{fontFamily:C.mono,fontSize:28,fontWeight:700,color:C.white}}>{fmtTime(sessionTime)}</div>
              <div style={{fontSize:10,fontFamily:C.mono,color:C.text3,marginTop:4}}>idle {idleSeconds}s</div>
            </div>
          </div>

          {/* ══ ROW 2: Metric cards ══ */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
            <MetricCard label="Typing Speed"   value={wpm}          unit="WPM"    color={C.cyan}   history={wpmHistory} icon="⌨"
              status={wpm>60?"FAST":wpm>30?"NORMAL":isTracking?"SLOW":null} statusColor={wpm>60?C.teal:wpm>30?C.cyan:C.amber}/>
            <MetricCard label="Backspace Rate" value={`${bsRate}%`} unit="of keys" color={C.amber}  history={bsHistory}  icon="⌫"
              status={bsRate>20?"HIGH":bsRate>8?"MED":isTracking?"LOW":null} statusColor={bsRate>20?C.rose:bsRate>8?C.amber:C.teal}/>
            <MetricCard label="Error Rate"     value={`${errRate}%`} unit="per word" color={C.rose}  history={errHistory}  icon="✖"
              status={errRate>15?"ALERT":errRate>5?"WATCH":isTracking?"CLEAN":null} statusColor={errRate>15?C.rose:errRate>5?C.amber:C.teal}/>
            <MetricCard label="Idle Time"      value={idleSeconds}  unit="seconds" color={C.violet} history={idleHistory} icon="◷"
              status={idleSeconds>=30?"STUCK":idleSeconds>=10?"IDLE":isTracking?"ACTIVE":null} statusColor={idleSeconds>=30?C.rose:idleSeconds>=10?C.amber:C.teal}/>
          </div>

          {/* ══ ROW 3: Editor + Tabs + optional Assist panel ══ */}
          <div style={{display:"grid",gridTemplateColumns:activeAssist?"1fr 1fr 300px":"1fr 1fr",gap:12,marginBottom:10,transition:"grid-template-columns .3s"}}>

            {/* ── Code Editor ── */}
            <Panel style={{display:"flex",flexDirection:"column",minHeight:480}}>
              <PanelHeader
                left={
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,fontFamily:C.mono,color:C.text3}}>code.editor</span>
                    <span style={{fontSize:8,padding:"2px 8px",borderRadius:100,fontFamily:C.mono,fontWeight:700,
                      background:`${lang.color}18`,color:lang.color,border:`1px solid ${lang.color}2a`}}>
                      {lang.icon} {lang.name}{lang.ext}
                    </span>
                    {diagnostics.errors.length>0&&(
                      <span style={{fontSize:8,padding:"2px 7px",borderRadius:100,
                        background:"rgba(239,68,68,.1)",color:C.rose,border:"1px solid rgba(239,68,68,.25)",fontFamily:C.mono}}>
                        ✖ {diagnostics.errors.length}
                      </span>
                    )}
                    {diagnostics.warnings.length>0&&(
                      <span style={{fontSize:8,padding:"2px 7px",borderRadius:100,
                        background:"rgba(245,158,11,.08)",color:C.amber,border:"1px solid rgba(245,158,11,.25)",fontFamily:C.mono}}>
                        ⚠ {diagnostics.warnings.length}
                      </span>
                    )}
                  </div>
                }
                right={
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {isTracking&&<span className="live-blink" style={{fontSize:9,fontFamily:C.mono,color:C.teal,letterSpacing:".08em"}}>● REC</span>}
                    <RunButton onClick={handleRun} running={running} hasErrors={diagnostics.errors.length>0}/>
                  </div>
                }
              />
              {/* Language bar */}
              <div style={{display:"flex",gap:5,padding:"9px 12px",flexWrap:"wrap",
                borderBottom:`1px solid rgba(255,255,255,.04)`,background:"rgba(0,0,0,.12)"}}>
                {LANG_KEYS.map(k=>(
                  <LangChip key={k} lang={LANGUAGES[k]} active={activeLang===k} onClick={()=>setActiveLang(k)}/>
                ))}
              </div>
              {/* Editor area */}
              <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:340}}>
                <div style={{width:42,padding:"1rem 8px 1rem 0",background:"rgba(0,0,0,.28)",
                  borderRight:`1px solid rgba(255,255,255,.04)`,fontFamily:C.mono,fontSize:11,
                  color:C.text3,lineHeight:"1.85rem",textAlign:"right",userSelect:"none",overflowY:"hidden",flexShrink:0}}>
                  {code.split("\n").map((_,i)=>(
                    <div key={i} style={{lineHeight:"1.85rem",
                      color:diagnostics.errors.some(e=>e.line===i+1)?C.rose:diagnostics.warnings.some(w=>w.line===i+1)?C.amber:C.text4,
                      fontWeight:(diagnostics.errors.some(e=>e.line===i+1)||diagnostics.warnings.some(w=>w.line===i+1))?"700":"400"}}>{i+1}</div>
                  ))}
                </div>
                <textarea value={code} onChange={handleCodeChange} onKeyDown={handleKeyDown} spellCheck={false}
                  style={{flex:1,background:"transparent",padding:"1rem",fontFamily:C.mono,fontSize:12,
                    color:C.text,lineHeight:"1.85rem",border:"none",caretColor:lang.color,tabSize:2}}/>
              </div>
              {/* Footer */}
              <div style={{display:"flex",gap:12,padding:"6px 16px",borderTop:`1px solid rgba(255,255,255,.04)`,
                fontSize:9,fontFamily:C.mono,color:C.text3,background:"rgba(0,0,0,.18)"}}>
                <span>{lang.icon} {lang.name}</span>
                <span>{code.split("\n").length} ln</span>
                <span>{code.length} ch</span>
                <span style={{marginLeft:"auto",color:diagnostics.errors.length>0?C.rose:C.teal}}>
                  {diagnostics.errors.length>0?`✖ ${diagnostics.errors.length} error(s)`:"✓ clean"}
                </span>
              </div>
            </Panel>

            {/* ── Log/Output/Lint Panel ── */}
            <Panel style={{display:"flex",flexDirection:"column",minHeight:480}}>
              <PanelHeader
                left={
                  <div style={{display:"flex",gap:4}}>
                    {tabBtn("log","Behavior Log")}
                    {tabBtn("output","Output",runResult&&
                      <span style={{fontSize:9,marginLeft:2,color:runResult.exitCode===0?C.teal:C.rose}}>
                        {runResult.exitCode===0?"✓":"✖"}
                      </span>)}
                    {tabBtn("lint",<>Lint {allDiags.length>0&&
                      <span style={{fontSize:8,padding:"1px 5px",borderRadius:100,marginLeft:3,
                        background:`${diagnostics.errors.length>0?C.rose:C.amber}1a`,
                        color:diagnostics.errors.length>0?C.rose:C.amber,
                        border:`1px solid ${diagnostics.errors.length>0?C.rose:C.amber}33`}}>
                        {allDiags.length}
                      </span>}</>)}
                  </div>
                }
                right={<span style={{fontSize:9,fontFamily:C.mono,color:C.text3}}>{lang.icon} {lang.ext}</span>}
              />
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                {/* BEHAVIOR LOG */}
                {activeTab==="log"&&(
                  <div style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
                    {log.length===0
                      ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:180,color:C.text3}}>
                          <div style={{fontSize:24,marginBottom:8,opacity:.4}}>◎</div>
                          <div style={{fontSize:11,fontFamily:C.mono}}>No events — start tracking</div>
                        </div>
                      :log.map((e,i)=><LogRow key={i} entry={e} idx={i}/>)}
                  </div>
                )}
                {/* OUTPUT */}
                {activeTab==="output"&&<OutputTerminal result={runResult} lang={lang}/>}
                {/* LINT */}
                {activeTab==="lint"&&(
                  <div style={{flex:1,overflowY:"auto",padding:"8px 6px"}}>
                    <div style={{display:"flex",gap:12,padding:"7px 10px",marginBottom:8,borderRadius:8,
                      background:"rgba(255,255,255,.02)",border:`1px solid ${C.border}`}}>
                      <span style={{fontSize:10,fontFamily:C.mono,color:C.rose}}>✖ {diagnostics.errors.length} error{diagnostics.errors.length!==1?"s":""}</span>
                      <span style={{fontSize:10,fontFamily:C.mono,color:C.amber}}>⚠ {diagnostics.warnings.length} warning{diagnostics.warnings.length!==1?"s":""}</span>
                      <span style={{marginLeft:"auto",fontSize:10,fontFamily:C.mono,color:C.text3}}>{lang.name} checker</span>
                    </div>
                    {allDiags.length===0
                      ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:140,color:C.teal}}>
                          <div style={{fontSize:26,marginBottom:8}}>✓</div>
                          <div style={{fontSize:11,fontFamily:C.mono}}>No issues in {lang.name}</div>
                        </div>
                      :allDiags.map((d,i)=><DiagRow key={i} d={d} idx={i}/>)}
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:12,padding:"6px 16px",borderTop:`1px solid rgba(255,255,255,.04)`,
                fontSize:9,fontFamily:C.mono,color:C.text3,background:"rgba(0,0,0,.18)"}}>
                <span>{isTracking?"● tracking":"○ standby"}</span>
                <span>{log.length} events</span>
                <span style={{marginLeft:"auto"}}>{runResult?`exit ${runResult.exitCode} · ${runResult.ms}ms`:"not run"}</span>
              </div>
            </Panel>

            {/* ── Adaptive Assist Panel ── */}
            {activeAssist&&(
              <Panel style={{display:"flex",flexDirection:"column",minHeight:480}}>
                <PanelHeader
                  left={<span style={{fontSize:10,fontFamily:C.mono,color:
                    activeAssist==="hints"?C.teal:activeAssist==="learning"?C.blue:C.violet}}>
                    {activeAssist==="hints"?"💡 Adaptive Hints":activeAssist==="learning"?"📖 Learning Mode":"🔮 Suggestions"}
                  </span>}
                  right={<button onClick={()=>setActiveAssist(null)} style={{background:"none",border:"none",color:C.text3,fontSize:16,padding:"0 4px"}}>✕</button>}
                />
                <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {activeAssist==="hints"&&<HintPanel hints={HINTS} langId={activeLang}/>}
                    {activeAssist==="learning"&&<LearningPanel content={LEARNING[activeLang]}/>}
                    {activeAssist==="suggestions"&&<SuggestionsPanel suggestions={SUGGESTIONS[activeLang]}/>}

                    {/* Detection metrics */}
                    <div style={{background:"rgba(255,255,255,.02)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px"}}>
                      <p style={{fontSize:9,letterSpacing:".12em",textTransform:"uppercase",color:C.text3,marginBottom:10}}>Detection Metrics</p>
                      {[
                        {label:"Frustration",val:`${frustration}%`,trigger:frustration>50},
                        {label:"Idle time",val:`${idleSeconds}s`,trigger:idleSeconds>8},
                        {label:"Edit bursts",val:editCount,trigger:editCount>20},
                        {label:"Deletions",val:deletionCount,trigger:deletionCount>3},
                      ].map(({label,val,trigger})=>(
                        <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                          <span style={{fontSize:11,color:C.text3}}>{label}</span>
                          <span style={{fontSize:11,color:trigger?C.rose:C.teal,fontWeight:700,fontFamily:C.mono}}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Trigger status */}
                    <div style={{background:"rgba(255,255,255,.02)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px"}}>
                      <p style={{fontSize:9,letterSpacing:".12em",textTransform:"uppercase",color:C.text3,marginBottom:10}}>Trigger Status</p>
                      {[
                        {label:"Hints",active:showHints,color:C.teal,threshold:"FI ≥ 30%"},
                        {label:"Learning Mode",active:showLearning,color:C.blue,threshold:"FI ≥ 55%"},
                        {label:"Suggestions",active:showSuggestions,color:C.violet,threshold:"FI ≥ 80%"},
                      ].map(({label,active,color,threshold})=>(
                        <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                          <div style={{display:"flex",gap:7,alignItems:"center"}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:active?color:"rgba(255,255,255,.08)"}}/>
                            <span style={{fontSize:11,color:active?color:C.text3}}>{label}</span>
                          </div>
                          <span style={{fontSize:10,color:C.text4,fontFamily:C.mono}}>{threshold}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            )}
          </div>

          {/* ══ ROW 4: Heatmap ══ */}
          <Panel style={{marginBottom:12}}>
            <PanelHeader
              left={<span style={{fontSize:10,fontFamily:C.mono,color:C.text3}}>activity.heatmap · last 60s</span>}
              right={
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  {[["rgba(255,255,255,.04)","None"],["#0d3050","Low"],["#0ea5e9","Med"],[C.teal,"High"]].map(([bg,lbl])=>(
                    <span key={lbl} style={{display:"flex",alignItems:"center",gap:4,fontSize:9,fontFamily:C.mono,color:C.text3}}>
                      <span style={{width:10,height:10,borderRadius:2,background:bg,display:"inline-block"}}/>{lbl}
                    </span>
                  ))}
                </div>
              }
            />
            <div style={{padding:"1.2rem 1.4rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              <div>
                <div style={{fontSize:10,fontFamily:C.mono,color:C.text3,marginBottom:10}}>Keystroke density</div>
                <ActivityHeatmap activityLog={activityLog}/>
              </div>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontFamily:C.mono,color:C.text3,marginBottom:8}}>
                  <span>Key distribution</span><span>{totalKeys} total keys</span>
                </div>
                {(() => {
                  const normalPct=totalKeys>0?Math.max(0,100-Math.min(bsRate,100)-Math.min(errRate,100)):0;
                  const bsPct=totalKeys>0?Math.min(bsRate,100):0;
                  const errPct=totalKeys>0?Math.min(errRate,100):0;
                  return(<>
                    <div style={{display:"flex",height:7,borderRadius:100,overflow:"hidden",background:"rgba(255,255,255,.04)",marginBottom:8}}>
                      {totalKeys>0&&<>
                        <div style={{height:"100%",width:`${normalPct}%`,background:C.cyan,transition:"width .5s",borderRadius:"100px 0 0 100px",minWidth:4}}/>
                        <div style={{height:"100%",width:`${bsPct}%`,background:C.amber,transition:"width .5s"}}/>
                        <div style={{height:"100%",width:`${errPct}%`,background:C.rose,transition:"width .5s",borderRadius:"0 100px 100px 0"}}/>
                      </>}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:9,fontFamily:C.mono}}>
                      <span style={{color:`${C.cyan}99`}}>■ Normal</span>
                      <span style={{color:`${C.amber}99`}}>■ Backspaces</span>
                      <span style={{color:`${C.rose}99`}}>■ Errors</span>
                    </div>
                  </>);
                })()}
              </div>
            </div>
          </Panel>

          {/* ══ FOOTER ══ */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,
            paddingTop:20,borderTop:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,background:"linear-gradient(135deg,#22d3a5,#0ea5e9)"}}>⚡</div>
              <span style={{fontFamily:C.disp,fontWeight:800,fontSize:13,color:C.text2}}>CKC-OS</span>
            </div>
            <div style={{fontSize:9,fontFamily:C.mono,color:C.text3}}>
              Behavior Tracking Engine · Frustration Detection System · Module 08+09 · 8 Languages
            </div>
            <div style={{fontSize:9,fontFamily:C.mono,color:C.text3}}>
              FI: {frustration}% · {backspaces} BS · {errors} err · {totalKeys} keys
            </div>
          </div>

        </div>
      </div>
    </>
  );
}