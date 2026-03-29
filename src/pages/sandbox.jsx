import { useState, useRef, useEffect, useCallback } from "react";

/* ─── STYLES ─── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --void:    #07090f;
    --deep:    #0b0f1a;
    --panel:   #0f1523;
    --card:    #121a2b;
    --edge:    #1a2540;
    --cyan:    #38bdf8;
    --teal:    #2dd4bf;
    --emerald: #34d399;
    --rose:    #fb7185;
    --amber:   #fbbf24;
    --violet:  #a78bfa;
  }

  .ckc-root {
    height: 100vh;
    background: var(--void);
    color: white;
    font-family: 'Syne', sans-serif;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .ckc-root ::-webkit-scrollbar { width: 4px; height: 4px; }
  .ckc-root ::-webkit-scrollbar-track { background: transparent; }
  .ckc-root ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.25); border-radius: 2px; }

  @keyframes fadeIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes glow     { 0%,100%{box-shadow:0 0 8px rgba(56,189,248,.2)} 50%{box-shadow:0 0 24px rgba(56,189,248,.5)} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes outputFade { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shieldPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes containerPulse { 0%{box-shadow:0 0 0 0 rgba(56,189,248,.4)} 70%{box-shadow:0 0 0 12px rgba(56,189,248,0)} 100%{box-shadow:0 0 0 0 rgba(56,189,248,0)} }

  .fade-in   { animation: fadeIn .3s ease both; }
  .blink-dot { animation: blink 1s step-end infinite; }
  .float     { animation: float 3s ease-in-out infinite; }
  .spin-anim { animation: spin .8s linear infinite; }
  .shield-pulse { animation: shieldPulse 2.5s ease-in-out infinite; }
  .container-pulse-anim { animation: containerPulse .6s ease; }

  .grid-bg {
    background-image:
      linear-gradient(rgba(56,189,248,.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,189,248,.04) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  .code-textarea {
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    width: 100%;
    font-family: 'JetBrains Mono', monospace;
    line-height: 1.7;
    color: rgba(255,255,255,.82);
    caret-color: #38bdf8;
    tab-size: 2;
  }

  .run-btn {
    background: linear-gradient(135deg, #38bdf8, #2dd4bf);
    box-shadow: 0 0 20px rgba(56,189,248,.35);
    transition: all .2s;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    border-radius: 8px;
    color: #07090f;
    font-weight: 700;
    font-family: 'Syne', sans-serif;
    font-size: 13px;
  }
  .run-btn:hover:not(:disabled) { box-shadow: 0 0 32px rgba(56,189,248,.6); transform: translateY(-1px); }
  .run-btn:active:not(:disabled) { transform: translateY(0); }
  .run-btn:disabled { opacity: .4; cursor: not-allowed; }

  .output-line { animation: outputFade .2s ease both; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.65; }

  .lang-node   { background: rgba(104,211,145,.12); color: #68d391; border: 1px solid rgba(104,211,145,.25); }
  .lang-python { background: rgba(252,196,25,.12);  color: #fcc419; border: 1px solid rgba(252,196,25,.25); }

  .line-nums {
    user-select: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.7;
    color: rgba(255,255,255,.18);
    text-align: right;
    padding: 16px 12px 16px 16px;
    min-width: 40px;
  }

  .status-bar { background: linear-gradient(90deg, rgba(56,189,248,.08), rgba(45,212,191,.08)); border-top: 1px solid rgba(56,189,248,.1); }

  .icon-btn { transition: all .15s; cursor: pointer; border: none; background: transparent; color: rgba(255,255,255,.3); }
  .icon-btn:hover { background: rgba(255,255,255,.06); color: rgba(255,255,255,.8); }

  .modal-overlay {
    position: fixed; inset: 0; z-index: 50;
    display: flex; align-items: center; justify-content: center;
    background: rgba(7,9,15,.85);
    backdrop-filter: blur(8px);
  }

  .modal-card {
    animation: fadeIn .3s ease both;
    background: var(--card);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,.08);
    padding: 24px;
    width: 480px;
    max-width: 90vw;
    box-shadow: 0 0 60px rgba(56,189,248,.12);
  }

  .snippet-btn {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    padding: 4px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.08);
    color: rgba(255,255,255,.35);
    background: transparent;
    cursor: pointer;
    transition: all .15s;
  }
  .snippet-btn:hover { color: rgba(255,255,255,.7); border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.03); }

  .history-item {
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    transition: all .15s;
  }
  .history-item:hover { border-color: rgba(56,189,248,.2); background: rgba(255,255,255,.02); }

  .drag-divider {
    width: 4px;
    background: rgba(255,255,255,.04);
    cursor: col-resize;
    flex-shrink: 0;
    transition: background .15s;
    position: relative;
  }
  .drag-divider:hover { background: rgba(56,189,248,.3); }

  .tab-btn {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    padding: 6px 12px;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    cursor: pointer;
    transition: all .15s;
    text-transform: capitalize;
  }
  .tab-active-style { border-bottom-color: #38bdf8 !important; color: #38bdf8 !important; }
  .tab-inactive-style { color: rgba(255,255,255,.3); }
  .tab-inactive-style:hover { color: rgba(255,255,255,.6); }

  .lang-tab-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all .15s;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(255,255,255,.3);
  }
  .lang-tab-btn:hover { color: rgba(255,255,255,.6); background: rgba(255,255,255,.03); }
`;

/* ─── SNIPPETS ─── */
const SNIPPETS = {
  node: {
    hello: `// Hello World\nconsole.log("Hello from CKC-OS Node.js!");\nconsole.log("Runtime: Node.js (Browser Sandbox)");\nconsole.log("Timestamp:", new Date().toISOString());`,
    fibonacci: `// Fibonacci Sequence\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst results = [];\nfor (let i = 0; i <= 10; i++) {\n  results.push(\`fib(\${i}) = \${fibonacci(i)}\`);\n}\nresults.forEach(r => console.log(r));\nconsole.log("\\n✅ Sequence complete!");`,
    fetch: `// Async/Await Example\nasync function fetchData() {\n  console.log("🚀 Starting async operation...");\n  const delay = ms => new Promise(r => setTimeout(r, ms));\n  await delay(500);\n  const data = { id: 1, name: "CKC-OS", status: "active" };\n  console.log("📦 Data received:", JSON.stringify(data));\n  await delay(300);\n  console.log("✅ Processing complete!");\n  return data;\n}\n\nfetchData().then(d => console.log("Result:", d.name));`,
    array: `// Array Operations\nconst devs = [\n  { name: "Arjun", role: "Lead", exp: 5 },\n  { name: "Priya", role: "Backend", exp: 3 },\n  { name: "Rohan", role: "DevOps", exp: 4 },\n  { name: "Sneha", role: "Frontend", exp: 2 },\n];\n\nconst seniors = devs.filter(d => d.exp >= 3);\nconsole.log("Seniors:", seniors.map(d => d.name).join(", "));\n\nconst total = devs.reduce((sum, d) => sum + d.exp, 0);\nconsole.log("Avg experience:", (total / devs.length).toFixed(1), "years");\n\nconst sorted = [...devs].sort((a,b) => b.exp - a.exp);\nconsole.log("Most experienced:", sorted[0].name);`,
  },
  python: {
    hello: `# Hello World\nprint("Hello from CKC-OS Python!")\nprint("Runtime: Python (Browser Sandbox)")\n\nimport datetime\nprint(f"Timestamp: {datetime.datetime.now().isoformat()}")`,
    fibonacci: `# Fibonacci Sequence\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nfor i in range(11):\n    print(f"fib({i}) = {fibonacci(i)}")\n\nprint("\\n✅ Sequence complete!")`,
    list: `# List Comprehensions\ndevs = [\n    {"name": "Arjun", "role": "Lead", "exp": 5},\n    {"name": "Priya", "role": "Backend", "exp": 3},\n    {"name": "Rohan", "role": "DevOps", "exp": 4},\n    {"name": "Sneha", "role": "Frontend", "exp": 2},\n]\n\nseniors = [d for d in devs if d["exp"] >= 3]\nprint("Seniors:", ", ".join(d["name"] for d in seniors))\n\ntotal = sum(d["exp"] for d in devs)\nprint(f"Avg experience: {total/len(devs):.1f} years")\n\nsorted_devs = sorted(devs, key=lambda d: d["exp"], reverse=True)\nprint(f"Most experienced: {sorted_devs[0]['name']}")`,
    class: `# Classes & OOP\nclass KnowledgeEngine:\n    def __init__(self, name):\n        self.name = name\n        self.modules = []\n        \n    def add_module(self, module):\n        self.modules.append(module)\n        print(f"✅ Module '{module}' added to {self.name}")\n        \n    def analyze(self, code):\n        lines = len(code.strip().split('\\n'))\n        print(f"📊 Analyzing {lines} lines of code...")\n        return {"lines": lines, "complexity": "O(n)"}\n    \n    def __str__(self):\n        return f"Engine({self.name}, {len(self.modules)} modules)"\n\nengine = KnowledgeEngine("CKC-OS Core")\nengine.add_module("parser")\nengine.add_module("graph-builder")\nresult = engine.analyze("def hello():\\n    pass\\n    return 42")\nprint(f"Result: {result}")\nprint(engine)`,
  },
};

/* ─── PYTHON INTERPRETER ─── */
function interpretPython(code) {
  const output = [];
  const printFn = (...args) => output.push(args.map((a) => String(a)).join(" "));

  try {
    let js = code
      .replace(/^#.*$/gm, "")
      .replace(/print\(f"([^"]+)"\)/g, (m, s) => {
        const converted = s.replace(/\{([^}]+)\}/g, "${$1}");
        return `__print__(\`${converted}\`)`;
      })
      .replace(/print\(f'([^']+)'\)/g, (m, s) => {
        const converted = s.replace(/\{([^}]+)\}/g, "${$1}");
        return `__print__(\`${converted}\`)`;
      })
      .replace(/print\(([^)]+)\)/g, "__print__($1)")
      .replace(/def (\w+)\(([^)]*)\):/g, "function $1($2) {")
      .replace(/class (\w+):/g, "class $1 {")
      .replace(/class (\w+)\((\w+)\):/g, "class $1 extends $2 {")
      .replace(/    def (\w+)\(self,?\s*([^)]*)\):/g, (m, name, args) => `  ${name}(${args}) {`)
      .replace(/    def (\w+)\(self\):/g, (m, name) => `  ${name}() {`)
      .replace(/\bself\./g, "this.")
      .replace(/\bself\b/g, "")
      .replace(/True/g, "true").replace(/False/g, "false").replace(/None/g, "null")
      .replace(/elif /g, "else if ")
      .replace(/and /g, "&& ").replace(/ or /g, " || ").replace(/\bnot /g, "!")
      .replace(/f"([^"]+)"/g, (m, s) => "`" + s.replace(/\{([^}]+)\}/g, "${$1}") + "`")
      .replace(/f'([^']+)'/g, (m, s) => "`" + s.replace(/\{([^}]+)\}/g, "${$1}") + "`")
      .replace(/range\((\d+)\)/g, "{length:$1}")
      .replace(/len\(([^)]+)\)/g, "$1.length")
      .replace(/\.append\(([^)]+)\)/g, ".push($1)")
      .replace(/import datetime/g, "")
      .replace(/datetime\.datetime\.now\(\)\.isoformat\(\)/g, "new Date().toISOString()");

    const lines = js.split("\n");
    const result = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) { result.push(""); continue; }
      const indent = line.match(/^(\s*)/)[1].length;
      const nextLine = lines[i + 1];
      const nextIndent = nextLine ? nextLine.match(/^(\s*)/)[1].length : 0;
      result.push(line.replace(/:\s*$/, " {"));
      if (nextIndent < indent && trimmed !== "") {
        const diff = Math.floor((indent - nextIndent) / 2);
        for (let d = 0; d < diff; d++) result.push("}");
      }
    }
    const opens = result.filter((l) => l.includes("{")).length;
    const closes = result.filter((l) => l.trim() === "}").length;
    if (opens > closes) result.push("}");

    const fn = new Function("__print__", result.join("\n"));
    fn(printFn);
  } catch (e) {
    try {
      const simpleLines = code.split("\n");
      for (const line of simpleLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const printMatch = trimmed.match(/^print\((.+)\)$/);
        if (printMatch) {
          try {
            const val = printMatch[1]
              .replace(/f"([^"]+)"/g, (m, s) => "`" + s.replace(/\{([^}]+)\}/g, "${$1}") + "`")
              .replace(/f'([^']+)'/g, (m, s) => "`" + s.replace(/\{([^}]+)\}/g, "${$1}") + "`");
            output.push(String(eval(val)));
          } catch { output.push(eval(printMatch[1].replace(/'/g, '"'))); }
        }
      }
    } catch (e2) {
      output.push(`Error: ${e2.message}`);
    }
  }
  return output;
}

/* ─── NODE EXECUTOR ─── */
function executeNode(code) {
  const output = [];
  const consoleMock = {
    log: (...args) => output.push({ type: "log", text: args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" ") }),
    error: (...args) => output.push({ type: "error", text: args.map(String).join(" ") }),
    warn: (...args) => output.push({ type: "warn", text: args.map(String).join(" ") }),
    info: (...args) => output.push({ type: "info", text: args.map(String).join(" ") }),
    table: (data) => output.push({ type: "table", text: JSON.stringify(data, null, 2) }),
  };
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const fn = new AsyncFunction("console", "setTimeout", "Promise", code);
    const result = fn(consoleMock, setTimeout, Promise);
    if (result && typeof result.then === "function") {
      result.catch((e) => output.push({ type: "error", text: e.message }));
    }
  } catch (e) {
    output.push({ type: "error", text: `SyntaxError: ${e.message}` });
  }
  return output;
}

/* ─── SUB-COMPONENTS ─── */

function TerminalDot({ color }) {
  const bg = { red: "#f87171", yellow: "#facc15", green: "#4ade80" }[color];
  return <div style={{ width: 12, height: 12, borderRadius: "50%", background: bg, opacity: 0.8 }} />;
}

function SecurityBadge() {
  return (
    <div className="shield-pulse" style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "5px 10px", borderRadius: 8,
      border: "1px solid rgba(52,211,153,.2)",
      background: "rgba(52,211,153,.05)",
    }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(52,211,153,.8)" }}>SANDBOXED</span>
    </div>
  );
}

function StatusIndicator({ running }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: running ? "#fbbf24" : "#34d399",
        ...(running ? { animation: "pulse 1s ease infinite" } : {}),
      }} />
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.4)" }}>
        {running ? "EXECUTING" : "READY"}
      </span>
    </div>
  );
}

function LineNumbers({ code }) {
  const lines = code.split("\n");
  return (
    <div className="line-nums">
      {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
    </div>
  );
}

function OutputLine({ line, idx }) {
  const colors = { log: "rgba(255,255,255,.8)", error: "#fb7185", warn: "#fbbf24", info: "#38bdf8", table: "#a78bfa", system: "rgba(255,255,255,.3)" };
  const prefixes = { error: "✖ ", warn: "⚠ ", info: "ℹ ", log: "  ", system: "  ", table: "  " };
  return (
    <div className="output-line" style={{ color: colors[line.type] || colors.log, padding: "2px 16px", display: "flex", gap: 8, animationDelay: `${idx * 30}ms` }}>
      <span style={{ color: "rgba(255,255,255,.2)", userSelect: "none", fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{String(idx + 1).padStart(2, "0")}</span>
      <span style={{ color: "rgba(255,255,255,.2)", userSelect: "none" }}>{prefixes[line.type] || "  "}</span>
      <span style={{ wordBreak: "break-all", whiteSpace: line.type === "table" ? "pre" : "normal" }}>{line.text}</span>
    </div>
  );
}

function SnippetPicker({ lang, onPick }) {
  const snips = SNIPPETS[lang];
  const labels = { hello: "Hello World", fibonacci: "Fibonacci", fetch: "Async/Await", array: "Array Ops", list: "List Comp", class: "Classes & OOP" };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {Object.keys(snips).map((k) => (
        <button key={k} className="snippet-btn" onClick={() => onPick(snips[k])}>{labels[k]}</button>
      ))}
    </div>
  );
}

function ShareModal({ output, onClose }) {
  const [copied, setCopied] = useState(false);
  const shareText = output.map((l, i) => `[${i + 1}] ${l.text}`).join("\n");
  const shareId = Math.random().toString(36).slice(2, 8).toUpperCase();

  return (
    <div className="modal-overlay">
      <div className="modal-card fade-in">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "rgba(56,189,248,.12)", color: "#38bdf8" }}>⬡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Share Output</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.3)" }}>Snapshot ID: {shareId}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: "rgba(255,255,255,.3)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={(e) => { e.target.style.color = "#fb7185"; e.target.style.background = "rgba(251,113,133,.1)"; }}
            onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,.3)"; e.target.style.background = "transparent"; }}>✕</button>
        </div>

        <div style={{ background: "var(--void)", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", padding: 16, marginBottom: 16, maxHeight: 192, overflowY: "auto" }}>
          <pre style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,.6)", whiteSpace: "pre-wrap" }}>{shareText || "// No output yet"}</pre>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "var(--panel)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: "8px 12px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            https://ckcos.dev/sandbox/{shareId.toLowerCase()}
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(`https://ckcos.dev/sandbox/${shareId.toLowerCase()}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ padding: "8px 16px", borderRadius: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .15s", background: copied ? "rgba(52,211,153,.2)" : "rgba(56,189,248,.15)", color: copied ? "#34d399" : "#38bdf8", border: `1px solid ${copied ? "rgba(52,211,153,.3)" : "rgba(56,189,248,.3)"}` }}>
            {copied ? "✓ Copied" : "Copy Link"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {["Download .txt", "Copy Output"].map((label, i) => (
            <button key={i} onClick={() => {
              if (i === 1) { navigator.clipboard?.writeText(shareText); }
              else {
                const blob = new Blob([shareText], { type: "text/plain" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = `ckcos-output-${shareId}.txt`; a.click();
              }
            }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,.4)", background: "transparent", cursor: "pointer", transition: "all .15s" }}
              onMouseEnter={(e) => { e.target.style.color = "rgba(255,255,255,.7)"; e.target.style.borderColor = "rgba(255,255,255,.2)"; }}
              onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,.4)"; e.target.style.borderColor = "rgba(255,255,255,.08)"; }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN APP ─── */
export default function CKCOSSandbox() {
  const [lang, setLang] = useState("node");
  const [code, setCode] = useState(SNIPPETS.node.hello);
  const [output, setOutput] = useState([]);
  const [running, setRunning] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [execTime, setExecTime] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [splitPane, setSplitPane] = useState(60);
  const [fontSize, setFontSize] = useState(13);
  const [activeTab, setActiveTab] = useState("output");
  const [history, setHistory] = useState([]);
  const [containerPulse, setContainerPulse] = useState(false);

  const outputRef = useRef(null);
  const textareaRef = useRef(null);
  const dragRef = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const runCode = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setContainerPulse(true);
    setTimeout(() => setContainerPulse(false), 600);

    const startTime = performance.now();
    const systemMsgs = [
      { type: "system", text: `▶ Initializing ${lang === "node" ? "Node.js" : "Python"} runtime...` },
      { type: "system", text: `⬡ Container: ckcos-sandbox-${Math.random().toString(36).slice(2, 6)}` },
      { type: "system", text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" },
    ];
    setOutput(systemMsgs);
    await new Promise((r) => setTimeout(r, 350));

    let execOutput = [];
    try {
      if (lang === "node") {
        execOutput = executeNode(code);
        await new Promise((r) => setTimeout(r, 100));
      } else {
        execOutput = interpretPython(code).map((t) => ({ type: "log", text: t }));
      }
    } catch (e) {
      execOutput = [{ type: "error", text: e.message }];
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
    setExecTime(elapsed);

    const finalOutput = [
      ...systemMsgs,
      ...execOutput,
      { type: "system", text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" },
      { type: "system", text: `✓ Execution complete in ${elapsed}s  |  ${execOutput.length} line(s) of output` },
    ];

    setOutput(finalOutput);
    setRunCount((c) => c + 1);
    setHistory((h) => [{ code, lang, output: finalOutput, time: new Date().toLocaleTimeString() }, ...h.slice(0, 9)]);
    setRunning(false);
  }, [code, lang, running]);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    setCode(SNIPPETS[newLang].hello);
    setOutput([]);
    setExecTime(null);
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runCode(); }
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.slice(0, start) + "  " + code.slice(end);
      setCode(newCode);
      setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 2; }, 0);
    }
  };

  const startDrag = () => {
    isDragging.current = true;
    const handleMove = (ev) => {
      if (!isDragging.current) return;
      const container = dragRef.current?.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = Math.min(80, Math.max(20, ((ev.clientX - rect.left) / rect.width) * 100));
      setSplitPane(pct);
    };
    const handleUp = () => { isDragging.current = false; window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const lineCount = code.split("\n").length;
  const charCount = code.length;

  return (
    <>
      <style>{styles}</style>
      <div className="ckc-root grid-bg">

        {/* ─── TOP NAV ─── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 56, borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(11,15,26,.8)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, background: "linear-gradient(135deg,#38bdf8,#2dd4bf)", boxShadow: "0 0 16px rgba(56,189,248,.3)" }}>⚡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.05em", lineHeight: 1 }}>CKC-OS</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(255,255,255,.3)", lineHeight: 1, marginTop: 2 }}>CODE SANDBOX</div>
            </div>
          </div>

          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,.08)", margin: "0 4px" }} />

          {/* Language tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: 4, borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "rgba(15,21,35,.5)" }}>
            {[{ id: "node", label: "Node.js", cls: "lang-node", icon: "⬡" }, { id: "python", label: "Python", cls: "lang-python", icon: "🐍" }].map((l) => (
              <button key={l.id} className={`lang-tab-btn ${lang === l.id ? l.cls : ""}`}
                style={lang === l.id ? {} : {}}
                onClick={() => handleLangChange(l.id)}>
                <span style={{ fontSize: 13 }}>{l.icon}</span>
                {l.label}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,.08)", margin: "0 4px" }} />

          <SnippetPicker lang={lang} onPick={(c) => { setCode(c); setOutput([]); }} />

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <SecurityBadge />

            {/* Font size */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "4px 8px" }}>
              <button onClick={() => setFontSize((s) => Math.max(10, s - 1))} style={{ color: "rgba(255,255,255,.3)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.4)", width: 24, textAlign: "center" }}>{fontSize}</span>
              <button onClick={() => setFontSize((s) => Math.min(18, s + 1))} style={{ color: "rgba(255,255,255,.3)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>

            <button onClick={() => setShowShare(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.4)", background: "transparent", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, transition: "all .15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,.7)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; }}>
              ⬡ Share
            </button>

            <button className="run-btn" onClick={runCode} disabled={running}>
              {running
                ? <><div className="spin-anim" style={{ width: 14, height: 14, border: "2px solid rgba(7,9,15,.4)", borderTopColor: "#07090f", borderRadius: "50%" }} />Running</>
                : <><span style={{ fontSize: 14 }}>▶</span>Run</>}
              <kbd style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, opacity: 0.6, marginLeft: 4 }}>⌘↵</kbd>
            </button>
          </div>
        </div>

        {/* ─── SPLIT PANE ─── */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

          {/* EDITOR */}
          <div className={containerPulse ? "container-pulse-anim" : ""} style={{ width: `${splitPane}%`, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,.06)", transition: "box-shadow .3s" }}>
            {/* Editor toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", background: "rgba(11,15,26,.4)", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <TerminalDot color="red" /><TerminalDot color="yellow" /><TerminalDot color="green" />
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,.3)", marginLeft: 8 }}>
                {lang === "node" ? "index.js" : "main.py"}
              </span>
              <span className={`${lang === "node" ? "lang-node" : "lang-python"}`} style={{ marginLeft: 8, padding: "0 6px", borderRadius: 4, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                {lang === "node" ? "JavaScript" : "Python 3"}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)" }}>{lineCount} lines</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)" }}>{charCount} chars</span>
                <button onClick={() => setCode("")} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)", background: "transparent", border: "none", cursor: "pointer", transition: "color .15s" }}
                  onMouseEnter={(e) => { e.target.style.color = "#fb7185"; }}
                  onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,.2)"; }}>clear</button>
              </div>
            </div>

            {/* Code area */}
            <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", background: "rgba(7,9,15,.6)" }}>
              <LineNumbers code={code} />
              <div style={{ width: 1, background: "rgba(255,255,255,.04)" }} />
              <div style={{ flex: 1, overflow: "auto", padding: "16px 16px 16px 12px" }}>
                <textarea
                  ref={textareaRef}
                  className="code-textarea"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  style={{ fontSize: `${fontSize}px`, minHeight: "100%", minWidth: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* DRAG DIVIDER */}
          <div ref={dragRef} className="drag-divider" onMouseDown={startDrag} />

          {/* OUTPUT */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
            {/* Output toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", background: "rgba(11,15,26,.4)", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <TerminalDot color="red" /><TerminalDot color="yellow" /><TerminalDot color="green" />
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,.3)", marginLeft: 8 }}>Terminal Output</span>

              {/* Tabs */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 16 }}>
                {["output", "history"].map((t) => (
                  <button key={t} className={`tab-btn ${activeTab === t ? "tab-active-style" : "tab-inactive-style"}`} onClick={() => setActiveTab(t)}>
                    {t}
                    {t === "history" && history.length > 0 && (
                      <span style={{ marginLeft: 6, background: "rgba(56,189,248,.2)", color: "#38bdf8", fontSize: 9, padding: "1px 6px", borderRadius: 9999 }}>{history.length}</span>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                <StatusIndicator running={running} />
                {execTime && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.25)" }}>{execTime}s</span>}
                {output.length > 0 && (
                  <button onClick={() => setOutput([])} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)", background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.target.style.color = "#fb7185"; }}
                    onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,.2)"; }}>clear</button>
                )}
              </div>
            </div>

            {/* Output content */}
            <div ref={outputRef} style={{ flex: 1, overflowY: "auto", background: "rgba(7,9,15,.4)", paddingTop: 12, paddingBottom: 12 }}>
              {activeTab === "output" ? (
                output.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: "rgba(255,255,255,.2)" }}>
                    <div className="float" style={{ fontSize: 48 }}>▶</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>Press Run to execute code</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.15)" }}>or use ⌘↵ keyboard shortcut</div>
                  </div>
                ) : (
                  <div>{output.map((line, i) => <OutputLine key={i} line={line} idx={i} />)}</div>
                )
              ) : (
                <div style={{ padding: "0 16px" }}>
                  {history.length === 0 ? (
                    <div style={{ textAlign: "center", paddingTop: 48, color: "rgba(255,255,255,.2)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>No execution history yet</div>
                  ) : history.map((h, i) => (
                    <div key={i} className="history-item" style={{ marginBottom: 8 }}
                      onClick={() => { setCode(h.code); setLang(h.lang); setOutput(h.output); setActiveTab("output"); }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={h.lang === "node" ? "lang-node" : "lang-python"} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>
                            {h.lang === "node" ? "Node.js" : "Python"}
                          </span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.3)" }}>Run #{history.length - i}</span>
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)" }}>{h.time}</span>
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.code.split("\n")[0]}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Share bar */}
            {output.length > 0 && runCount > 0 && (
              <div className="status-bar" style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.3)" }}>
                    {output.filter((o) => o.type === "log").length} lines · Run #{runCount}
                  </span>
                </div>
                <button onClick={() => setShowShare(true)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(56,189,248,.6)", background: "transparent", border: "none", cursor: "pointer", transition: "color .15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#38bdf8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(56,189,248,.6)"; }}>
                  ⬡ Share this output →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── STATUS BAR ─── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "6px 20px", borderTop: "1px solid rgba(255,255,255,.05)", background: "rgba(11,15,26,.6)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8" }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.25)" }}>CKC-OS Sandbox v1.0</span>
          </div>
          <div style={{ width: 1, height: 12, background: "rgba(255,255,255,.08)" }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)" }}>{lang === "node" ? "Node.js 18 LTS (Browser)" : "Python 3.11 (Browser)"}</span>
          <div style={{ width: 1, height: 12, background: "rgba(255,255,255,.08)" }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)" }}>UTF-8</span>
          <div style={{ width: 1, height: 12, background: "rgba(255,255,255,.08)" }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)" }}>LF</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)" }}>Ln {lineCount}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)" }}>Col {charCount}</span>
            <SecurityBadge />
          </div>
        </div>

        {showShare && <ShareModal output={output} onClose={() => setShowShare(false)} />}
      </div>
    </>
  );
}