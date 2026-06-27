import { validateCode } from "./validator.js";

// ═══════════ PYODIDE ═══════════
const pyState = { py: null, loading: false, waiters: [] };
export async function loadPy() {
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

export async function runPython(code) {
  const py = await loadPy();
  py.runPython(`_sc=_Cap();_ec=_Cap();sys.stdout=_sc;sys.stderr=_ec`);
  let hasError = false, errorMsg = "";
  try { py.runPython(code); } catch (e) {
    hasError = true;
    errorMsg = String(e).replace(/^PythonError:\s*/i, "").split("\n")
      .filter(l => !l.includes("pyodide") && !l.includes("    at ")).join("\n").trim();
  }
  const stdout = py.runPython("_sc.getvalue()");
  const stderr = py.runPython("_ec.getvalue()");
  py.runPython("sys.stdout=sys.__stdout__;sys.stderr=sys.__stderr__");
  let output = "";
  if (stdout) output += stdout;
  if (stderr && !hasError) output += (output ? "\\n" : "") + stderr;
  if (hasError) output += (output ? "\\n" : "") + errorMsg;
  return { output: output.trim(), hasError, errorMsg: hasError ? errorMsg : "" };
}

// ═══════════ JS/TS RUNNER ═══════════
export function runJS(code, isTS) {
  return new Promise(resolve => {
    const logs = [], errors = [];
    let src = code;
    if (isTS) {
      src = src
        .replace(/^\s*import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, "")
        .replace(/interface\s+\w[\w\s]*\{[^}]*\}/gs, "")
        .replace(/type\s+\w+\s*=\s*[^;{]+;/g, "")
        .replace(/:\s*\w[\w<>\[\]|&\s,?]*/g, "")
        .replace(/\bprivate\b|\bpublic\b|\bprotected\b|\breadonly\b|\bdeclare\b/g, "")
        .replace(/<\w[\w\s,<>]*>/g, "")
        .replace(/^\s*export\s+(default\s+)?/gm, "")
        .replace(/^\s*abstract\s+/gm, "");
    }
    const iframe = document.createElement("iframe"); iframe.style.display = "none";
    document.body.appendChild(iframe); const win = iframe.contentWindow;
    win.console = {
      log: (...a) => logs.push(a.map(x => typeof x === "object" ? JSON.stringify(x, null, 2) : String(x)).join(" ")),
      error: (...a) => errors.push(a.map(String).join(" ")),
      warn: (...a) => logs.push("⚠ " + a.map(String).join(" ")),
      info: (...a) => logs.push(a.map(String).join(" ")),
    };
    let hasError = false, errorMsg = "";
    try { win.eval(src); } catch (e) { hasError = true; errorMsg = e.stack || e.message || String(e); }
    document.body.removeChild(iframe);
    const out = [...logs]; if (hasError) out.push(errorMsg);
    resolve({ output: out.join("\\n") || (hasError ? "" : "(no output)"), hasError, errorMsg });
  });
}

// ═══════════ COMPILED LANGUAGE SIMULATORS ═══════════
export function simulateCompiled(lang, code) {
  const lines = code.split("\n");
  const outputs = [];

  if (lang === "java") {
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : "Main";
    outputs.push(`Compiled: ${className}.class`);
    const printlns = code.match(/System\.out\.println\s*\(([^)]+)\)/g) || [];
    printlns.forEach(p => {
      const arg = p.replace(/System\.out\.println\s*\(\s*/, "").replace(/\)\s*$/, "").trim();
      if (arg.startsWith('"') && arg.endsWith('"')) {
        outputs.push(arg.slice(1, -1));
      } else {
        outputs.push(`[${arg}]`);
      }
    });
    if (outputs.length === 1) outputs.push("Process finished with exit code 0");
  }

  if (lang === "cpp") {
    outputs.push(`g++ -std=c++17 -o main main.cpp`);
    const couts = code.match(/cout\s*<<\s*"([^"]+)"/g) || [];
    couts.forEach(c => {
      const m = c.match(/cout\s*<<\s*"([^"]+)"/);
      if (m) outputs.push(m[1]);
    });
    const coutVars = code.match(/cout\s*<<\s*(\w+)\s*<<\s*endl/g) || [];
    coutVars.forEach(c => {
      const m = c.match(/cout\s*<<\s*(\w+)/);
      if (m && !outputs.some(o => o.includes(m[1]))) outputs.push(`[${m[1]}]`);
    });
    outputs.push("Process finished with exit code 0");
  }

  if (lang === "rs") {
    outputs.push(`   Compiling main v0.1.0`);
    outputs.push(`    Finished release [optimized] target(s)`);
    outputs.push(`     Running \`target/release/main\``);
    const printlns = code.match(/println!\s*\("([^"]+)"[^)]*\)/g) || [];
    printlns.forEach(p => {
      const m = p.match(/println!\s*\("([^"]+)"/);
      if (m) {
        outputs.push(m[1].replace(/{}/g, "[value]").replace(/{:\??}/g, "[debug]"));
      }
    });
    if (printlns.length === 0) outputs.push("(no output)");
  }

  if (lang === "go") {
    outputs.push(`go build ./...`);
    outputs.push(`go run main.go`);
    const printlns = code.match(/fmt\.Println\s*\(([^)]+)\)/g) || [];
    const printfs = code.match(/fmt\.Printf\s*\("([^"]+)"/g) || [];
    printlns.forEach(p => {
      const m = p.match(/fmt\.Println\s*\(\s*"([^"]+)"/);
      if (m) outputs.push(m[1]);
      else {
        const vm = p.match(/fmt\.Println\s*\((.+)\)/);
        if (vm) outputs.push(`[${vm[1].trim()}]`);
      }
    });
    printfs.forEach(p => {
      const m = p.match(/fmt\.Printf\s*\("([^"]+)"/);
      if (m) outputs.push(m[1].replace(/\\n/g, "").replace(/%[dsfvq]/g, "[value]").trim());
    });
    if (outputs.length === 2) outputs.push("(no output)");
    outputs.push("\nProcess finished with exit code 0");
  }

  if (lang === "sql") {
    const stmts = code.split(";").map(s => s.trim()).filter(Boolean);
    stmts.forEach(stmt => {
      const upper = stmt.toUpperCase();
      if (/^\\s*--/.test(stmt)) return;
      if (/CREATE DATABASE/i.test(upper)) outputs.push(`Query OK, 1 row affected`);
      else if (/CREATE TABLE/i.test(upper)) {
        const m = stmt.match(/CREATE TABLE\\s+(\\w+)/i);
        outputs.push(`Query OK, 0 rows affected — Table '${m ? m[1] : "table"}' created`);
      }
      else if (/INSERT/i.test(upper)) outputs.push(`Query OK, ${Math.floor(Math.random() * 5) + 1} row(s) affected`);
      else if (/SELECT/i.test(upper)) {
        const rows = Math.floor(Math.random() * 20) + 1;
        outputs.push(`${rows} row(s) in set`);
      }
      else if (/UPDATE/i.test(upper)) outputs.push(`Query OK, ${Math.floor(Math.random() * 3) + 1} row(s) affected`);
      else if (/DELETE/i.test(upper)) outputs.push(`Query OK, ${Math.floor(Math.random() * 3) + 1} row(s) affected`);
      else if (/USE /i.test(upper)) outputs.push(`Database changed`);
      else outputs.push(`Query OK`);
    });
  }

  return { output: outputs.join("\\n"), hasError: false };
}

// ═══════════ UNIFIED RUNNER ═══════════
export async function validateAndRun(lang, code, pyReady, setPyReady) {
  const validation = validateCode(lang, code);
  if (validation.hasError) {
    return { output: validation.output, hasError: true, errorMsg: validation.output };
  }
  let result;
  if (lang === "py") {
    if (!pyReady) {
      await loadPy();
      setPyReady(true);
    }
    result = await runPython(code);
  } else if (lang === "js" || lang === "ts") {
    result = await runJS(code, lang === "ts");
    if (validation.hasWarning && result.output) {
      result = { ...result, output: validation.output + "\\n\\n" + result.output };
    }
  } else {
    await new Promise(r => setTimeout(r, 350));
    result = simulateCompiled(lang, code);
    if (validation.hasWarning) {
      result = { ...result, output: validation.output + "\\n\\n" + result.output };
    }
  }
  return result;
}

