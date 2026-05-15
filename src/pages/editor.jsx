import React, { useState, useEffect, useRef, useCallback, forwardRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "./auth.jsx";
import KnowledgeGraphEngine from "./Knowledge.jsx";

import { authStore, PALETTE, LANGS, LK, initials, genSid } from "../constants.js";

// ═══════════ HELPERS ═══════════
function nowTs() {
  return new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function applyOpToString(str, op) {
  if (!op) return str;
  if (op.type === "insert") {
    return str.slice(0, op.pos) + op.chars + str.slice(op.pos);
  } else if (op.type === "delete") {
    return str.slice(0, op.pos) + str.slice(op.pos + op.len);
  } else if (op.type === "replace") {
    return str.slice(0, op.pos) + op.chars + str.slice(op.pos + op.len);
  }
  return str;
}

// ═══════════ STARTERS ═══════════
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
  py: `# CKC-OS Python — edit and press Run!
def greet(name):
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
CREATE DATABASE IF NOT EXISTS ckcos;
USE ckcos;
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL UNIQUE,
    plan ENUM('free','pro','team','enterprise') DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE sessions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    owner_id BIGINT NOT NULL REFERENCES users(id),
    language VARCHAR(32) NOT NULL,
    ops_count INT UNSIGNED DEFAULT 0
);
SELECT s.id, u.username, s.language, s.ops_count
FROM sessions s JOIN users u ON u.id = s.owner_id
WHERE s.ops_count > 0 ORDER BY s.ops_count DESC LIMIT 20;`,
};

// ═══════════════════════════════════════════════════════════════
// ═══════════ COMPREHENSIVE MULTI-LANGUAGE VALIDATOR ═══════════
// ═══════════════════════════════════════════════════════════════

function validateCode(lang, code) {
  const errors = [];
  const warnings = [];
  const lines = code.split("\n");
  const trim = code.trim();

  function countBalance(open, close) {
    let depth = 0, inStr = false, strChar = "", inLineComment = false;
    for (let i = 0; i < code.length; i++) {
      const ch = code[i], prev = code[i - 1];
      if (ch === "\n") { inLineComment = false; continue; }
      if (inLineComment) continue;
      if (!inStr) {
        if (ch === "/" && code[i + 1] === "/") { inLineComment = true; i++; continue; }
        if (lang === "py" && ch === "#") { inLineComment = true; continue; }
      }
      if (!inStr && (ch === '"' || ch === "'" || ch === "`")) { inStr = true; strChar = ch; continue; }
      if (inStr && ch === strChar && prev !== "\\") { inStr = false; continue; }
      if (inStr) continue;
      if (ch === open) depth++;
      if (ch === close) depth--;
    }
    return depth;
  }

  function hasUnclosedString() {
    for (let li = 0; li < lines.length; li++) {
      const l = lines[li].replace(/\\["'`]/g, "");
      let singles = 0, doubles = 0, ticks = 0;
      for (const ch of l) {
        if (ch === "'") singles++;
        if (ch === '"') doubles++;
        if (ch === "`") ticks++;
      }
      if (singles % 2 !== 0) return { line: li + 1, char: "'" };
      if (doubles % 2 !== 0) return { line: li + 1, char: '"' };
    }
    return null;
  }

  if (lang === "ts" || lang === "js") {
    const braceDepth = countBalance("{", "}");
    if (braceDepth > 0) errors.push(`SyntaxError: ${braceDepth} unclosed '{' brace(s) — missing '}'`);
    if (braceDepth < 0) errors.push(`SyntaxError: ${Math.abs(braceDepth)} unexpected '}' — missing '{'`);
    const parenDepth = countBalance("(", ")");
    if (parenDepth > 0) errors.push(`SyntaxError: ${parenDepth} unclosed '(' — missing ')'`);
    if (parenDepth < 0) errors.push(`SyntaxError: ${Math.abs(parenDepth)} unexpected ')' — missing '('`);
    const sqDepth = countBalance("[", "]");
    if (sqDepth > 0) errors.push(`SyntaxError: ${sqDepth} unclosed '[' — missing ']'`);
    if (sqDepth < 0) errors.push(`SyntaxError: ${Math.abs(sqDepth)} unexpected ']' — missing '['`);
    const strErr = hasUnclosedString();
    if (strErr) errors.push(`SyntaxError: Unterminated string literal (line ${strErr.line}, char: ${strErr.char})`);
    lines.forEach((l, i) => {
      const stripped = l.trim();
      if (/^(export\s+)?const\s+\w+\s*$/.test(stripped)) {
        errors.push(`SyntaxError (line ${i + 1}): 'const' declaration missing initializer`);
      }
      if (/if\s*\([^)]*=[^>=][^)]*\)/.test(stripped) && !/if\s*\([^)]*[!=<>]=[^)]*\)/.test(stripped)) {
        warnings.push(`Warning (line ${i + 1}): Possible assignment in condition — did you mean '==' or '==='?`);
      }
    });
    if (lang === "ts") {
      lines.forEach((l, i) => {
        if (/^(export\s+)?interface\s+\w+\s*$/.test(l.trim())) {
          errors.push(`SyntaxError (line ${i + 1}): Interface declaration missing body '{}'`);
        }
      });
    }
  }

  if (lang === "py") {
    lines.forEach((l, i) => {
      const t = l.trim();
      if (/^print\s+"/.test(t) || /^print\s+'/.test(t)) {
        errors.push(`SyntaxError (line ${i + 1}): Python 3 requires print() function — use print("...") not print "..."`);
      }
      if (/^(def|class)\s+\w+\s*\(.*\)\s*$/.test(t)) {
        errors.push(`SyntaxError (line ${i + 1}): Missing ':' at end of '${t.split("(")[0].trim()}' definition`);
      } else if (/^(if|elif|for|while)\s+.+$/.test(t) && !t.includes(":")) {
        errors.push(`SyntaxError (line ${i + 1}): Missing ':' at end of '${t.split(/\s/)[0]}' statement`);
      }
    });
    const hasTabIndent = lines.some(l => /^\t/.test(l));
    const hasSpaceIndent = lines.some(l => /^  /.test(l));
    if (hasTabIndent && hasSpaceIndent) {
      errors.push(`TabError: Mixed tabs and spaces for indentation — use spaces only (PEP 8)`);
    }
    const tripleDouble = (code.match(/"""/g) || []).length;
    const tripleSingle = (code.match(/'''/g) || []).length;
    if (tripleDouble % 2 !== 0) errors.push(`SyntaxError: Unterminated triple-quoted string (""")`);
    if (tripleSingle % 2 !== 0) errors.push(`SyntaxError: Unterminated triple-quoted string (''')`);
    const pyParen = countBalance("(", ")");
    if (pyParen > 0) errors.push(`SyntaxError: ${pyParen} unclosed parenthesis '(' — missing ')'`);
    if (pyParen < 0) errors.push(`SyntaxError: ${Math.abs(pyParen)} unexpected ')' — missing '('`);
    lines.forEach((l, i) => {
      if (/\/\s*0\b/.test(l) && !/\/\s*0\.\d/.test(l)) {
        warnings.push(`Warning (line ${i + 1}): Division by zero detected`);
      }
    });
  }

  if (lang === "java") {
    const classMatch = trim.match(/public\s+class\s+(\w+)/);
    if (!classMatch) {
      errors.push(`error: Class declaration must be 'public class ClassName { ... }'`);
    }
    if (!trim.includes("public static void main")) {
      errors.push(`error: Main method not found — add 'public static void main(String[] args) { ... }'`);
    } else {
      if (!/public\s+static\s+void\s+main\s*\(\s*String\s*(\[\s*\]|\.\.\.)?\s*\w+\s*\)/.test(trim)) {
        errors.push(`error: Invalid main signature — must be 'public static void main(String[] args)'`);
      }
    }
    const javaBrace = countBalance("{", "}");
    if (javaBrace > 0) errors.push(`error: ${javaBrace} unclosed '{' — missing '}'`);
    if (javaBrace < 0) errors.push(`error: ${Math.abs(javaBrace)} extra '}' — missing '{'`);
    const javaParen = countBalance("(", ")");
    if (javaParen > 0) errors.push(`error: ${javaParen} unclosed '(' — missing ')'`);
    if (javaParen < 0) errors.push(`error: ${Math.abs(javaParen)} extra ')' — missing '('`);
    lines.forEach((l, i) => {
      const t = l.trim();
      if (!t || t.startsWith("//") || t.startsWith("*") || t.startsWith("@") ||
        t.endsWith("{") || t.endsWith("}") || t.endsWith(",") || t.endsWith(";") ||
        /^(public|private|protected|class|import|package|if|else|for|while|do|try|catch|finally|switch|case|default|return\s*$)/.test(t)) {
        return;
      }
      if (/^(return\s+.+|[a-zA-Z_$][\w$.]*\s*(=|\(|\.)[^{]*)$/.test(t) && !t.endsWith(";")) {
        errors.push(`error (line ${i + 1}): Missing semicolon ';' — '${t.slice(0, 40)}'`);
      }
    });
    lines.forEach((l, i) => {
      if (l.includes("system.out") || l.includes("System.Out")) {
        errors.push(`error (line ${i + 1}): Incorrect capitalization — use 'System.out.println()'`);
      }
    });
    const javaStrErr = hasUnclosedString();
    if (javaStrErr) errors.push(`error (line ${javaStrErr.line}): Unterminated string literal`);
  }

  if (lang === "cpp") {
    if (!/#include\s*[<"]/.test(trim)) {
      errors.push(`fatal error: No #include directive found — add '#include <iostream>'`);
    }
    if (!/int\s+main\s*\(/.test(trim)) {
      errors.push(`error: 'main' function not found — add 'int main() { ... return 0; }'`);
    }
    const cppBrace = countBalance("{", "}");
    if (cppBrace > 0) errors.push(`error: ${cppBrace} unclosed '{' brace(s) — missing '}'`);
    if (cppBrace < 0) errors.push(`error: ${Math.abs(cppBrace)} extra '}' — missing '{'`);
    const cppParen = countBalance("(", ")");
    if (cppParen > 0) errors.push(`error: ${cppParen} unclosed '(' — missing ')'`);
    if (cppParen < 0) errors.push(`error: ${Math.abs(cppParen)} extra ')' — missing '('`);
    if (trim.includes("cout") && !trim.includes("std::cout") && !trim.includes("using namespace std")) {
      errors.push(`error: 'cout' not declared — add 'using namespace std;' or use 'std::cout'`);
    }
    if (trim.includes("cin") && !trim.includes("std::cin") && !trim.includes("using namespace std")) {
      errors.push(`error: 'cin' not declared — add 'using namespace std;' or use 'std::cin'`);
    }
    if (trim.includes("endl") && !trim.includes("std::endl") && !trim.includes("using namespace std")) {
      errors.push(`error: 'endl' not declared — add 'using namespace std;' or use 'std::endl'`);
    }
    lines.forEach((l, i) => {
      const t = l.trim();
      if (!t || t.startsWith("//") || t.startsWith("#") || t.startsWith("/*") || t.startsWith("*")) return;
      if (t.endsWith("{") || t.endsWith("}") || t.endsWith(",") || t.endsWith(";") || t.endsWith("\\")) return;
      if (/^(if|else|for|while|do|switch|class|struct|namespace|public:|private:|protected:)/.test(t)) return;
      if (/^(int|void|char|float|double|bool|auto|string|long|short|unsigned)\s+\w+\s*\(/.test(t)) return;
      if (/^(return\s+.+|cout\s*<<|cin\s*>>|[a-zA-Z_][\w:]*\s*(=|\(|\[))/.test(t)) {
        errors.push(`error (line ${i + 1}): Expected ';' at end of statement — '${t.slice(0, 40)}'`);
      }
    });
    if (/void\s+main\s*\(/.test(trim)) {
      errors.push(`warning: 'main' should return 'int', not 'void' (undefined behavior)`);
    }
    if (!/return\s+0\s*;/.test(trim) && /int\s+main/.test(trim)) {
      warnings.push(`warning: 'main' function missing 'return 0;'`);
    }
    const cppStrErr = hasUnclosedString();
    if (cppStrErr) errors.push(`error (line ${cppStrErr.line}): Unterminated string literal`);
  }

  if (lang === "rs") {
    if (!/fn\s+main\s*\(\s*\)/.test(trim)) {
      errors.push(`error[E0601]: \`main\` function not found in crate — add 'fn main() { ... }'`);
    }
    const rsBrace = countBalance("{", "}");
    if (rsBrace > 0) errors.push(`error: ${rsBrace} unclosed '{' — missing '}'`);
    if (rsBrace < 0) errors.push(`error: ${Math.abs(rsBrace)} extra '}' — missing '{'`);
    const rsParen = countBalance("(", ")");
    if (rsParen > 0) errors.push(`error: ${rsParen} unclosed '(' — missing ')'`);
    if (rsParen < 0) errors.push(`error: ${Math.abs(rsParen)} extra ')' — missing '('`);
    lines.forEach((l, i) => {
      const t = l.trim();
      if (!t || t.startsWith("//") || t.startsWith("/*") || t.startsWith("*")) return;
      if (t.endsWith("{") || t.endsWith("}") || t.endsWith(",") || t.endsWith(";") || t.endsWith("=>")) return;
      if (/^(fn|let|struct|enum|impl|use|pub|mod|trait|type|const|static|if|else|for|while|loop|match|return$)/.test(t)) return;
      if (/^let\s+(mut\s+)?\w+/.test(t) && !t.endsWith(";") && !t.endsWith("{") && !t.endsWith(",")) {
        errors.push(`error (line ${i + 1}): Expected ';' after 'let' binding — '${t.slice(0, 40)}'`);
      }
    });
    lines.forEach((l, i) => {
      if (/println\s*\(/.test(l) && !/println!\s*\(/.test(l)) {
        errors.push(`error (line ${i + 1}): 'println' is not a function — use 'println!()' macro`);
      }
      if (/print\s*\(/.test(l) && !/print!\s*\(/.test(l) && !/println/.test(l)) {
        errors.push(`error (line ${i + 1}): 'print' is not a function — use 'print!()' macro`);
      }
    });
    const rsStrErr = hasUnclosedString();
    if (rsStrErr) errors.push(`error (line ${rsStrErr.line}): Unterminated string literal`);
  }

  if (lang === "go") {
    const firstNonEmpty = lines.find(l => l.trim() && !l.trim().startsWith("//"));
    if (!firstNonEmpty || !firstNonEmpty.trim().startsWith("package ")) {
      errors.push(`./main.go:1:1: expected 'package', found '${(firstNonEmpty || "EOF").trim().slice(0, 20)}'`);
    }
    if (!/func\s+main\s*\(\s*\)/.test(trim)) {
      errors.push(`./main.go: runtime error: 'func main()' not found — Go programs require a main function`);
    }
    const goBrace = countBalance("{", "}");
    if (goBrace > 0) errors.push(`syntax error: ${goBrace} unclosed '{' — missing '}'`);
    if (goBrace < 0) errors.push(`syntax error: ${Math.abs(goBrace)} extra '}' — missing '{'`);
    const goParen = countBalance("(", ")");
    if (goParen > 0) errors.push(`syntax error: ${goParen} unclosed '(' — missing ')'`);
    if (goParen < 0) errors.push(`syntax error: ${Math.abs(goParen)} extra ')' — missing '('`);
    lines.forEach((l, i) => {
      const t = l.trim();
      if (/^func\s+/.test(t) && !t.endsWith("{") && !t.endsWith(")") && !t.endsWith(",")) {
        if (lines[i + 1] && lines[i + 1].trim() === "{") {
          errors.push(`./main.go:${i + 2}: syntax error: unexpected '{' — opening brace must be on same line as function declaration`);
        }
      }
    });
    const imports = [];
    let inImportBlock = false;
    lines.forEach(l => {
      const t = l.trim();
      if (t === "import (") { inImportBlock = true; return; }
      if (inImportBlock && t === ")") { inImportBlock = false; return; }
      if (inImportBlock) {
        const m = t.match(/["']([^"']+)["']/);
        if (m) imports.push(m[1].split("/").pop());
      }
      if (/^import\s+"([^"]+)"/.test(t)) {
        const m = t.match(/import\s+"([^"]+)"/);
        if (m) imports.push(m[1].split("/").pop());
      }
    });
    imports.forEach(pkg => {
      const used = code.includes(pkg + ".") || code.includes(pkg + "(");
      if (!used) {
        errors.push(`./main.go: imported and not used: "${pkg}"`);
      }
    });
    const goStrErr = hasUnclosedString();
    if (goStrErr) errors.push(`./main.go:${goStrErr.line}: syntax error: unterminated string literal`);
  }

  if (lang === "sql") {
    const sqlNoComments = code.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const selectStatements = sqlNoComments.match(/SELECT\b[^;]*/gi) || [];
    selectStatements.forEach((stmt, i) => {
      if (!/FROM\b/i.test(stmt) && !/SELECT\s+\d+\s*$/i.test(stmt) && !/SELECT\s+NULL/i.test(stmt)) {
        errors.push(`SQL Error: SELECT statement #${i + 1} is missing FROM clause`);
      }
    });
    const insertStatements = sqlNoComments.match(/INSERT\b[^;]*/gi) || [];
    insertStatements.forEach((stmt, i) => {
      if (!/VALUES\b/i.test(stmt) && !/SELECT\b/i.test(stmt)) {
        errors.push(`SQL Error: INSERT statement #${i + 1} missing VALUES or SELECT clause`);
      }
    });
    const updateStatements = sqlNoComments.match(/UPDATE\b[^;]*/gi) || [];
    updateStatements.forEach((stmt, i) => {
      if (!/SET\b/i.test(stmt)) {
        errors.push(`SQL Error: UPDATE statement #${i + 1} missing SET clause`);
      }
    });
    if (/\bUPDATE\b/i.test(sqlNoComments) && /\bWHERE\b/i.test(sqlNoComments)) {
      // (logic unchanged)
    }
    if (/\bUPDATE\b/i.test(sqlNoComments) && !/\bWHERE\b/i.test(sqlNoComments)) {
      warnings.push(`SQL Warning: UPDATE without WHERE clause will modify all rows`);
    }
    if (/\bDELETE\b/i.test(sqlNoComments) && !/\bWHERE\b/i.test(sqlNoComments)) {
      warnings.push(`SQL Warning: DELETE without WHERE clause will delete all rows`);
    }
    const sqlParen = countBalance("(", ")");
    if (sqlParen > 0) errors.push(`SQL Error: ${sqlParen} unclosed '(' in query`);
    if (sqlParen < 0) errors.push(`SQL Error: ${Math.abs(sqlParen)} extra ')' in query`);
    const joinMatches = sqlNoComments.match(/\b(INNER|LEFT|RIGHT|FULL)\s+(OUTER\s+)?JOIN\b[^;]*/gi) || [];
    joinMatches.forEach((stmt, i) => {
      if (!/\bON\b/i.test(stmt) && !/\bUSING\b/i.test(stmt)) {
        errors.push(`SQL Error: JOIN #${i + 1} missing ON condition`);
      }
    });
    const singleQuotes = (sqlNoComments.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) errors.push(`SQL Error: Unterminated string literal — unmatched single quote '`);
  }

  return {
    hasError: errors.length > 0,
    hasWarning: warnings.length > 0,
    errors,
    warnings,
    output: errors.length > 0
      ? [`❌ [${LANGS[lang].n}] Compilation failed with ${errors.length} error(s)${warnings.length ? ` and ${warnings.length} warning(s)` : ""}:`,
        "",
      ...errors.map(e => `  ✖ ${e}`),
      ...(warnings.length ? ["", ...warnings.map(w => `  ⚠ ${w}`)] : []),
        "",
        "Fix the error(s) above and run again."
      ].join("\n")
      : warnings.length > 0
        ? [`⚠ [${LANGS[lang].n}] ${warnings.length} warning(s):`, ...warnings.map(w => `  ⚠ ${w}`)].join("\n")
        : null
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
function runJS(code, isTS) {
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
function simulateCompiled(lang, code) {
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

// ═══════════ OT ENGINE ═══════════
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
    this.version++; const rec = { ...x, ver: this.version }; this.history.push(rec);
    if (this.history.length > 300) this.history = this.history.slice(-150);
    this._emit(rec); return rec;
  }
  reset(t) { this.text = t; this.version = 0; this.history = []; }
}

class WSManager {
  constructor() { this.engines = new Map(); }
  eng(lang) { if (!this.engines.has(lang)) this.engines.set(lang, new OTEngine(STARTERS[lang] || "")); return this.engines.get(lang); }
  send(uid, msg) { console.log(`[WS] Send to ${uid}:`, msg); }
}
const WS = new WSManager();

const BOTS = [
  { name: "Aria K.", color: "#FF6B9D", bg: "rgba(255,107,157,0.15)", inits: "AK" },
  { name: "Dev M.", color: "#4FC1FF", bg: "rgba(79,193,255,0.15)", inits: "DM" },
  { name: "Sam T.", color: "#4EC9B0", bg: "rgba(78,201,176,0.15)", inits: "ST" },
];

// ═══════════ BOTS & DEBUG HELPERS ═══════════
function generateBotAnnotation(error, lang) {
  const suggestions = {
    SyntaxError: [
      "Check your brackets — one might be missing its pair!",
      "Looks like a syntax issue. Double-check line endings.",
      "Missing closing symbol. Try folding the code to spot it.",
    ],
    TypeError: [
      "Type mismatch — make sure you're passing the right argument types.",
      "Null reference? Consider adding a null check before this call.",
    ],
    NameError: [
      "Variable not defined. Did you declare it in the right scope?",
      "Check for typos in the variable name!",
    ],
    TabError: [
      "Mixed indentation detected. Run auto-format to fix this quickly.",
    ],
    default: [
      "Try isolating the problematic section into a smaller test.",
      "Add console.log / print statements to trace the value here.",
      "Have you tried rubber-duck debugging? 🦆",
      "Check the docs for this function — it might have changed.",
    ],
  };
  const key = Object.keys(suggestions).find(k => error.toLowerCase().includes(k.toLowerCase())) || "default";
  const pool = suggestions[key];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ═══════════ LIVE SERVER LOGS ENGINE ═══════════
const LOG_TEMPLATES = [
  { level: "INFO", svc: "api-gateway", msg: "GET /api/status 200 12ms" },
  { level: "INFO", svc: "ws-server", msg: "Client connected [id: {id}]" },
  { level: "INFO", svc: "db-pool", msg: "Query executed in {n}ms — rows: {r}" },
  { level: "SUCCESS", svc: "auth-svc", msg: "Token validated for user:{id}" },
  { level: "INFO", svc: "cache", msg: "HIT ratio: {n}% — evictions: {r}" },
  { level: "DEBUG", svc: "scheduler", msg: "Job run:{id} queued (next: {n}s)" },
  { level: "WARN", svc: "api-gateway", msg: "Rate limit approaching — {n} req/s" },
  { level: "WARN", svc: "db-pool", msg: "Slow query detected: {n}ms" },
  { level: "ERROR", svc: "api-gateway", msg: "POST /api/ingest 500 — timeout after {n}ms" },
  { level: "ERROR", svc: "auth-svc", msg: "Invalid token — revoked session:{id}" },
  { level: "ERROR", svc: "db-pool", msg: "Connection pool exhausted — {n} waiting" },
  { level: "INFO", svc: "ws-server", msg: "OT op broadcast — ver:{n} clients:{r}" },
  { level: "SUCCESS", svc: "cache", msg: "Cache warmed — {n} keys loaded" },
  { level: "DEBUG", svc: "scheduler", msg: "Health check OK — uptime {n}s" },
];

function genLogEntry() {
  const t = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
  const id = genSid();
  const n = Math.floor(Math.random() * 900 + 10);
  const r = Math.floor(Math.random() * 200 + 1);
  const msg = t.msg.replace(/\{id\}/g, id).replace(/\{n\}/g, n).replace(/\{r\}/g, r);
  return { level: t.level, svc: t.svc, msg, t: nowTs(), id: genSid() };
}

// ═══════════ CSS ═══════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;overflow:hidden;}
body{font-family:'Inter',system-ui,sans-serif;background:#0d0f14;color:#e0e0e0;font-size:13px;}
:root{
  --bg:#0d0f14;--bg2:rgba(21,24,32,0.85);--bg3:rgba(28,31,40,0.92);
  --bdr:rgba(255,255,255,.08);--bdr2:rgba(255,255,255,.05);
  --txt:#e0e0e0;--txt2:#8892a4;--txt3:#4a5568;
  --blue:#4FC1FF;--grn:#4EC9B0;--pink:#FF6B9D;--ylw:#DCDCAA;
  --sel:rgba(79,193,255,.12);--mono:'JetBrains Mono',Consolas,monospace;
  --topbar-h:48px;
  --statusbar-h:24px;
  --glass-bg:rgba(15,18,25,0.7);
}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:10px;border:1px solid transparent;background-clip:padding-box;}
::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.2);border:1px solid transparent;background-clip:padding-box;}

/* ── TOPBAR ── */
.topbar{height:var(--topbar-h);background:var(--bg2);backdrop-filter:blur(16px) saturate(180%);border-bottom:1px solid var(--bdr);display:flex;align-items:center;padding:0 12px;gap:8px;flex-shrink:0;overflow-x:auto;overflow-y:hidden;z-index:100;position:relative;}
.topbar::-webkit-scrollbar{display:none;}
.tb-logo{display:flex;align-items:center;gap:8px;font-weight:800;font-size:.9rem;color:#fff;padding:0 6px;white-space:nowrap;flex-shrink:0;letter-spacing:-0.02em;}
.gem{width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,#4FC1FF,#4EC9B0);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;box-shadow:0 0 15px rgba(79,193,255,0.3);}
.lp{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:6px;cursor:pointer;font-family:var(--mono);font-size:11px;font-weight:700;border:1px solid transparent;transition:all .15s cubic-bezier(.4,0,.2,1);white-space:nowrap;color:var(--txt2);}
.lp:hover{background:rgba(255,255,255,.08);color:#fff;transform:translateY(-1px);}
.lp.on{border-color:rgba(79,193,255,.3);background:rgba(79,193,255,.08);color:#fff;}
.dbg-badge{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:7px;background:rgba(255,107,157,.1);border:1px solid rgba(255,107,157,.2);color:#FF6B9D;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;flex-shrink:0;}
.dbg-badge:hover{background:rgba(255,107,157,.18);border-color:rgba(255,107,157,.4);transform:scale(1.02);}
.dbg-cnt{background:#FF6B9D;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;box-shadow:0 2px 8px rgba(255,107,157,0.4);}
.av{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;cursor:pointer;font-family:var(--mono);border:2px solid transparent;transition:all .2s;flex-shrink:0;position:relative;background:var(--bg3);}
.av:hover{transform:translateY(-3px) scale(1.05);z-index:2;box-shadow:0 5px 15px rgba(0,0,0,0.3);}
.av.me{border-color:rgba(79,193,255,.5);box-shadow:0 0 10px rgba(79,193,255,0.2);}
.av .online-dot{position:absolute;bottom:-3px;right:-3px;width:9px;height:9px;border-radius:50%;border:2px solid #151820;background:#4EC9B0;box-shadow:0 0 5px #4EC9B0;}
.new-ed-btn{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;background:rgba(79,193,255,.1);border:1px solid rgba(79,193,255,.2);color:#4FC1FF;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0;}
.new-ed-btn:hover{background:rgba(79,193,255,.18);border-color:rgba(79,193,255,.4);transform:translateY(-1px);}
.run-btn{display:flex;align-items:center;gap:6px;padding:6px 16px;border-radius:8px;background:linear-gradient(135deg,rgba(78,201,176,.15),rgba(78,201,176,.05));border:1px solid rgba(78,201,176,.3);color:#4EC9B0;font-size:11px;font-weight:800;cursor:pointer;transition:all .2s cubic-bezier(.4,0,.2,1);font-family:'Inter',sans-serif;white-space:nowrap;flex-shrink:0;text-transform:uppercase;letter-spacing:0.04em;}
.run-btn:hover:not(:disabled){background:rgba(78,201,176,.25);border-color:#4EC9B0;box-shadow:0 0 20px rgba(78,201,176,0.2);transform:translateY(-1px);}
.run-btn.running{background:rgba(255,107,157,.12);border-color:rgba(255,107,157,.35);color:#FF6B9D;}
.run-btn:disabled{opacity:.4;cursor:not-allowed;}

/* ── SIDEBAR ── */
.sidebar{width:250px;background:var(--bg2);backdrop-filter:blur(20px);border-right:1px solid var(--bdr);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;transition:all .25s cubic-bezier(.4,0,.2,1);z-index:90;}
.sidebar:hover{width:260px;}
.sec-hdr{padding:14px 16px 8px;font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--txt3);}
.ft{display:flex;align-items:center;gap:9px;height:32px;cursor:pointer;padding:0 12px;font-size:12.5px;white-space:nowrap;border-radius:8px;margin:1px 8px;transition:all .15s;}
.ft:hover{background:rgba(255,255,255,.06);transform:translateX(3px);}
.ft.sel{background:rgba(79,193,255,.1);color:#fff;font-weight:600;}

/* ── PRESENCE CARDS ── */
.presence-card{display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:10px;margin:2px 8px;transition:all .2s;cursor:default;border:1px solid transparent;}
.presence-card:hover{background:rgba(255,255,255,.04);border-color:var(--bdr2);transform:translateX(3px);}
.presence-av{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;font-family:var(--mono);flex-shrink:0;border:2px solid transparent;position:relative;box-shadow:0 4px 10px rgba(0,0,0,0.2);}
.presence-av .pdot{position:absolute;bottom:-3px;right:-3px;width:10px;height:10px;border-radius:50%;border:2px solid #151820;}
.presence-info{flex:1;min-width:0;}
.presence-name{font-size:13px;color:#e0e0e0;font-weight:600;display:flex;align-items:center;gap:6px;}
.presence-pos{font-size:10.5px;color:var(--txt2);margin-top:2px;font-family:var(--mono);}
.presence-typing{display:flex;align-items:center;gap:3px;margin-top:2px;}
.typing-dot{width:4px;height:4px;border-radius:50%;display:inline-block;animation:typingBounce 1.4s infinite ease-in-out;}

/* ── TABS ── */
.tab{display:flex;align-items:center;gap:7px;padding:0 14px 0 16px;height:40px;border-right:1px solid var(--bdr2);cursor:pointer;font-size:12.5px;white-space:nowrap;flex-shrink:0;max-width:200px;position:relative;font-family:var(--mono);transition:all .2s;}
.tab.on{background:var(--bg);border-bottom:2px solid var(--blue);color:#fff;}
.tab.on::after{content:'';position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(to top, rgba(79,193,255,0.2), transparent);pointer-events:none;}
.tab.off{background:rgba(21,24,32,0.4);color:var(--txt2);}
.tab:hover{background:rgba(255,255,255,.03);color:#fff;}
.tab:hover .tx{opacity:1;transform:scale(1);}
.tx{opacity:0;width:16px;height:16px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;margin-left:auto;flex-shrink:0;color:var(--txt2);transition:all .15s;transform:scale(0.8);}
.tx:hover{background:rgba(255,99,99,.15);color:#ff6363;}

/* ── OUTPUT ── */
.out-panel{background:#0a0c10;border-top:1px solid var(--bdr);display:flex;flex-direction:column;flex-shrink:0;}
.out-hdr{display:flex;align-items:center;background:var(--bg3);border-bottom:1px solid var(--bdr);height:32px;flex-shrink:0;}
.out-tab{padding:0 14px;height:100%;display:flex;align-items:center;cursor:pointer;font-size:11px;font-weight:600;color:var(--txt2);border-bottom:2px solid transparent;gap:5px;}
.out-tab.on{color:#fff;border-bottom-color:var(--blue);}
.out-tab:hover:not(.on){color:var(--txt);}
.rp-tab{padding:5px 14px;cursor:pointer;font-size:11px;font-weight:600;color:var(--txt2);border-bottom:2px solid transparent;white-space:nowrap;}
.rp-tab.on{color:var(--txt);border-bottom-color:var(--blue);}
.rp-tab:hover:not(.on){color:var(--txt);}

/* ── CRDT OPS ── */
.op-card{border-radius:6px;padding:7px 10px;margin-bottom:5px;animation:fadeIn .2s ease both;}
.op-card.insert{background:rgba(79,193,255,.08);border:1px solid rgba(79,193,255,.2);}
.op-card.retain{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);}
.op-card.delete{background:rgba(255,99,99,.07);border:1px solid rgba(255,99,99,.18);}
.op-badge{font-size:9px;font-weight:700;letter-spacing:.08em;padding:2px 6px;border-radius:3px;}
.op-badge.insert{background:rgba(79,193,255,.2);color:#4FC1FF;}
.op-badge.retain{background:rgba(255,255,255,.08);color:var(--txt2);}
.op-badge.delete{background:rgba(255,99,99,.15);color:#ff6363;}

/* ── WS LOG ── */
.ws-entry{font-family:var(--mono);font-size:10px;padding:4px 6px;border-radius:4px;margin-bottom:3px;border-left:2px solid;word-break:break-all;line-height:1.6;animation:fadeIn .2s ease both;}
.ws-entry.in{background:rgba(78,201,176,.06);border-color:#4EC9B0;color:#4EC9B0bb;}
.ws-entry.out{background:rgba(79,193,255,.06);border-color:#4FC1FF;color:#4FC1FFbb;}

/* ── MISC ── */
.bc{height:24px;display:flex;align-items:center;padding:0 14px;gap:5px;font-size:11px;color:var(--txt2);background:var(--bg);border-bottom:1px solid var(--bdr2);flex-shrink:0;font-family:var(--mono);}
.statusbar{height:var(--statusbar-h);background:#080a0d;border-top:1px solid var(--bdr);display:flex;align-items:center;padding:0 4px;flex-shrink:0;font-size:11px;color:var(--txt2);font-family:var(--mono);overflow:hidden;}
.st{display:flex;align-items:center;padding:0 8px;height:100%;cursor:pointer;gap:4px;white-space:nowrap;transition:background .1s;}
.st:hover{background:rgba(255,255,255,.05);}
.divider{height:1px;background:var(--bdr);margin:5px 0;}
.mm{width:52px;background:#0a0c10;border-left:1px solid var(--bdr2);flex-shrink:0;overflow:hidden;position:relative;opacity:.6;}
.py-badge{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;white-space:nowrap;flex-shrink:0;}
.new-tab-dot{width:6px;height:6px;border-radius:50%;background:#4EC9B0;box-shadow:0 0 6px #4EC9B0;display:inline-block;}

/* ── LIVE BADGE ── */
.live-badge{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(78,201,176,.08);border:1px solid rgba(78,201,176,.2);font-size:10px;font-weight:700;color:#4EC9B0;letter-spacing:.06em;white-space:nowrap;flex-shrink:0;}
.live-dot{width:6px;height:6px;border-radius:50%;background:#4EC9B0;box-shadow:0 0 6px #4EC9B0;}

/* ── ERROR POPUP ── */
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
.ol-ok{color:#4EC9B0;}
.ol-err{color:#FF6B9D;}
.ol-warn{color:#DCDCAA;}
.ol-info{color:#e0e0e0;}
.ol-dim{color:#6a7a8a;}
.ol-tb{color:#8892a4;}
.ol-build{color:#4FC1FF;}
.ol-success{color:#4EC9B0;}

/* ── CMD PALETTE ── */
.cp-ov{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.6);display:flex;justify-content:center;padding-top:70px;}
.cp-box{width:560px;max-height:400px;background:var(--bg3);border:1px solid var(--bdr);border-radius:8px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.7);}
.cp-in{padding:10px 14px;font-size:13px;background:transparent;color:#fff;border:none;outline:none;border-bottom:1px solid var(--bdr);font-family:inherit;width:100%;}
.cp-row{padding:7px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:12px;}
.cp-row:hover,.cp-row.hi{background:var(--sel);}
.toast{position:fixed;bottom:30px;right:14px;background:var(--bg3);border:1px solid var(--bdr);border-radius:6px;padding:8px 14px;font-size:12px;z-index:999;max-width:300px;box-shadow:0 6px 24px rgba(0,0,0,.5);animation:fadeIn .2s ease both;}

/* ── VALIDATION BADGE ── */
.val-pass{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(78,201,176,.08);border:1px solid rgba(78,201,176,.2);font-size:10px;font-weight:700;color:#4EC9B0;flex-shrink:0;}
.val-fail{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(255,107,157,.1);border:1px solid rgba(255,107,157,.25);font-size:10px;font-weight:700;color:#FF6B9D;flex-shrink:0;}
.val-warn{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(220,220,170,.08);border:1px solid rgba(220,220,170,.2);font-size:10px;font-weight:700;color:#DCDCAA;flex-shrink:0;}

/* ── ANIMATIONS ── */
@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.fi{animation:fadeIn .18s cubic-bezier(.34,1.4,.64,1) both;}
@keyframes errSlide{from{opacity:0;transform:translateY(-16px) scale(.97)}to{opacity:1;transform:none}}
.err-slide{animation:errSlide .2s cubic-bezier(.34,1.2,.64,1) both;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.pulse{animation:pulse 1.8s ease-in-out infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.spin{animation:spin .7s linear infinite;}
@keyframes typingBounce{0%,80%,100%{transform:scale(0);opacity:.5}40%{transform:scale(1);opacity:1}}
@keyframes errShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
.err-shake{animation:errShake .35s ease both;}
@keyframes slideIn{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}
.slide-in{animation:slideIn .2s ease both;}
@keyframes valPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
.val-pop{animation:valPop .25s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes logSlide{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
.log-slide{animation:logSlide .18s ease both;}
@keyframes announcePop{0%{opacity:0;transform:scale(.93) translateY(4px)}100%{opacity:1;transform:none}}
.announce-pop{animation:announcePop .22s cubic-bezier(.34,1.4,.64,1) both;}

/* ── DEBUGGING ROOM ── */
.dbg-room-overlay{position:fixed;inset:0;z-index:850;display:flex;align-items:center;justify-content:center;background:rgba(5,7,12,.82);backdrop-filter:blur(4px);}
.dbg-room{width:720px;max-width:calc(100vw - 24px);max-height:calc(100vh - 60px);background:#10131a;border:1.5px solid rgba(255,107,157,.3);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 0 0 1px rgba(255,107,157,.08),0 32px 80px rgba(0,0,0,.95);}
.dbg-room-head{display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(255,107,157,.07);border-bottom:1px solid rgba(255,107,157,.18);flex-shrink:0;}
.dbg-room-title{font-size:13px;font-weight:700;color:#FF6B9D;flex:1;}
.dbg-room-body{display:flex;flex:1;min-height:0;overflow:hidden;}
.dbg-errors-panel{width:240px;border-right:1px solid rgba(255,255,255,.06);overflow-y:auto;padding:8px;}
.dbg-error-item{padding:7px 9px;border-radius:7px;margin-bottom:5px;cursor:pointer;transition:background .12s;border:1px solid transparent;}
.dbg-error-item:hover{background:rgba(255,107,157,.07);border-color:rgba(255,107,157,.15);}
.dbg-error-item.sel{background:rgba(255,107,157,.1);border-color:rgba(255,107,157,.3);}
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
.dbg-stat{font-size:10px;color:#4a5568;display:flex;align-items:center;gap:4px;}
.dbg-stat span{color:#8892a4;}
.err-type-badge{display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;font-family:var(--mono);background:rgba(255,107,157,.15);color:#FF6B9D;border:1px solid rgba(255,107,157,.25);}
.warn-type-badge{display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;font-family:var(--mono);background:rgba(220,220,170,.12);color:#DCDCAA;border:1px solid rgba(220,220,170,.2);}

/* ── LIVE SERVER LOGS ── */
.logs-overlay{position:fixed;inset:0;z-index:860;display:flex;align-items:center;justify-content:center;background:rgba(5,7,12,.82);backdrop-filter:blur(4px);}
.logs-panel{width:860px;max-width:calc(100vw - 24px);height:calc(100vh - 80px);background:#0a0c11;border:1.5px solid rgba(79,193,255,.25);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 0 0 1px rgba(79,193,255,.07),0 32px 80px rgba(0,0,0,.95);}
.logs-head{display:flex;align-items:center;gap:10px;padding:11px 16px;background:rgba(79,193,255,.06);border-bottom:1px solid rgba(79,193,255,.15);flex-shrink:0;flex-wrap:wrap;}
.logs-title{font-size:13px;font-weight:700;color:#4FC1FF;flex:1;white-space:nowrap;}
.logs-controls{display:flex;align-items:center;gap:4px;flex-wrap:wrap;}
.log-filter-btn{padding:3px 9px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--mono);border:1px solid transparent;transition:all .12s;background:rgba(255,255,255,.04);color:#4a5568;}
.log-filter-btn.active-INFO{background:rgba(79,193,255,.15);border-color:rgba(79,193,255,.3);color:#4FC1FF;}
.log-filter-btn.active-WARN{background:rgba(220,220,170,.1);border-color:rgba(220,220,170,.25);color:#DCDCAA;}
.log-filter-btn.active-ERROR{background:rgba(255,107,157,.12);border-color:rgba(255,107,157,.3);color:#FF6B9D;}
.log-filter-btn.active-DEBUG{background:rgba(197,134,192,.1);border-color:rgba(197,134,192,.25);color:#C586C0;}
.log-filter-btn.active-SUCCESS{background:rgba(78,201,176,.1);border-color:rgba(78,201,176,.25);color:#4EC9B0;}
.log-filter-btn.active-ALL{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18);color:#e0e0e0;}
.logs-body{flex:1;overflow:hidden;display:flex;flex-direction:column;}
.logs-stats-bar{display:flex;align-items:center;gap:0;border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;background:rgba(255,255,255,.015);overflow-x:auto;}
.logs-stat-item{padding:6px 14px;font-size:10px;font-weight:700;font-family:var(--mono);border-right:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:5px;white-space:nowrap;}
.logs-stream{flex:1;overflow-y:auto;padding:4px 0;}
.log-entry{display:flex;align-items:flex-start;gap:0;padding:4px 14px;border-bottom:1px solid rgba(255,255,255,.025);font-family:var(--mono);font-size:11.5px;line-height:1.55;transition:background .1s;cursor:default;}
.log-entry:hover{background:rgba(255,255,255,.025);}
.log-entry.ERROR{border-left:2px solid rgba(255,107,157,.5);}
.log-entry.WARN{border-left:2px solid rgba(220,220,170,.4);}
.log-entry.SUCCESS{border-left:2px solid rgba(78,201,176,.4);}
.log-entry.INFO{border-left:2px solid rgba(79,193,255,.2);}
.log-entry.DEBUG{border-left:2px solid rgba(197,134,192,.25);}
.log-ts{color:#2d3748;width:82px;flex-shrink:0;font-size:10px;padding-top:1px;}
.log-level-pill{width:58px;flex-shrink:0;display:flex;align-items:center;}
.log-level-inner{font-size:9px;font-weight:800;letter-spacing:.06em;padding:1px 5px;border-radius:3px;}
.log-level-inner.INFO{background:rgba(79,193,255,.18);color:#4FC1FF;}
.log-level-inner.WARN{background:rgba(220,220,170,.14);color:#DCDCAA;}
.log-level-inner.ERROR{background:rgba(255,107,157,.18);color:#FF6B9D;}
.log-level-inner.DEBUG{background:rgba(197,134,192,.14);color:#C586C0;}
.log-level-inner.SUCCESS{background:rgba(78,201,176,.15);color:#4EC9B0;}
.log-svc{width:90px;flex-shrink:0;font-size:10px;color:#4a5568;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-top:1px;}
.log-msg{flex:1;color:#c0c8d8;word-break:break-all;}
.log-msg.ERROR{color:#ff8090;}
.log-msg.WARN{color:#DCDCAA;}
.log-msg.SUCCESS{color:#4EC9B0;}
.log-msg.DEBUG{color:#C586C0cc;}
.logs-foot{display:flex;align-items:center;padding:6px 14px;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.01);gap:10px;flex-shrink:0;flex-wrap:wrap;}
.logs-streaming-dot{width:7px;height:7px;border-radius:50%;background:#4EC9B0;box-shadow:0 0 6px #4EC9B0;flex-shrink:0;}
.logs-streaming-dot.paused{background:#4a5568;box-shadow:none;}
.log-search{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:5px;padding:4px 10px;color:#e0e0e0;font-size:11px;font-family:var(--mono);outline:none;width:180px;transition:border-color .15s;}
.log-search:focus{border-color:rgba(79,193,255,.35);}
.logs-pause-btn{padding:4px 12px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#8892a4;transition:all .15s;}
.logs-pause-btn:hover{background:rgba(255,255,255,.08);}
.logs-pause-btn.paused{background:rgba(78,201,176,.12);border-color:rgba(78,201,176,.3);color:#4EC9B0;}
.logs-clear-btn{padding:4px 12px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;border:1px solid rgba(255,107,157,.2);background:rgba(255,107,157,.06);color:#FF6B9D66;transition:all .15s;}
.logs-clear-btn:hover{background:rgba(255,107,157,.15);color:#FF6B9D;}

/* ── TOOL BUTTONS ── */
.tool-btn{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#8892a4;transition:all .15s;white-space:nowrap;flex-shrink:0;}
.tool-btn:hover{background:rgba(255,255,255,.08);color:#e0e0e0;}
.tool-btn.dbg{background:rgba(255,107,157,.08);border-color:rgba(255,107,157,.2);color:#FF6B9Daa;}
.tool-btn.dbg:hover{background:rgba(255,107,157,.18);color:#FF6B9D;}
.tool-btn.logs{background:rgba(79,193,255,.07);border-color:rgba(79,193,255,.18);color:#4FC1FFaa;}
.tool-btn.logs:hover{background:rgba(79,193,255,.18);color:#4FC1FF;}

/* ── RIGHT PANEL ── */
.right-panel{width:210px;background:var(--bg2);border-left:1px solid var(--bdr);display:flex;flex-direction:column;overflow:hidden;flex-shrink:0;}

/* ── ACCESS TERMINAL ── */
.access-terminal{height:100vh;display:flex;align-items:center;justify-content:center;background:#05070a;color:#fff;overflow:hidden;position:relative;font-family:'Inter',sans-serif;}
.terminal-bg{display:none;}
.grid-overlay{position:absolute;inset:0;background-image:linear-gradient(rgba(79,193,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(79,193,255,0.04) 1px,transparent 1px);background-size:50px 50px;opacity:.5;mask-image:radial-gradient(circle at center,black,transparent 80%);}
.nebula{position:absolute;width:800px;height:800px;filter:blur(150px);opacity:.15;border-radius:50%;pointer-events:none;}
.nebula.blue{background:radial-gradient(circle,#4FC1FF,transparent 70%);top:-300px;left:-200px;animation:float-nebula 25s infinite alternate;}
.nebula.pink{background:radial-gradient(circle,#FF6B9D,transparent 70%);bottom:-300px;right:-200px;animation:float-nebula 30s infinite alternate-reverse;}
@keyframes float-nebula{0%{transform:translate(0,0) scale(1)}100%{transform:translate(150px,100px) scale(1.1)}}
.terminal-container{position:relative;z-index:10;width:400px;background:rgba(15,18,25,.85);border:1px solid rgba(255,255,255,.12);border-radius:28px;padding:32px;backdrop-filter:blur(40px) saturate(180%);box-shadow:0 40px 100px rgba(0,0,0,.9),inset 0 0 0 1px rgba(255,255,255,.05);transition:all .5s cubic-bezier(.34,1.56,.64,1);}
.terminal-container:hover{transform:translateY(-5px);border-color:rgba(255,255,255,.15);}
.terminal-header{text-align:center;margin-bottom:28px;}
.terminal-brand{display:flex;flex-direction:column;align-items:center;gap:16px;}
.brand-icon{font-size:48px;filter:drop-shadow(0 0 20px rgba(79,193,255,.6));animation:icon-glow 3s infinite alternate;}
@keyframes icon-glow{from{filter:drop-shadow(0 0 10px rgba(79,193,255,.4))}to{filter:drop-shadow(0 0 25px rgba(79,193,255,.8));transform:scale(1.05)}}
.brand-text h1{font-size:36px;font-weight:800;letter-spacing:-2px;background:linear-gradient(135deg,#fff 30%,#4FC1FF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;}
.brand-text span{font-size:11px;color:rgba(255,255,255,.4);letter-spacing:5px;font-weight:700;text-transform:uppercase;display:block;margin-top:4px;}
.terminal-status{font-size:10px;color:#4EC9B0;display:inline-flex;align-items:center;gap:8px;padding:4px 14px;background:rgba(78,201,176,.08);border-radius:100px;border:1px solid rgba(78,201,176,.2);font-weight:700;margin-top:16px;}
.pulse-dot{width:8px;height:8px;border-radius:50%;background:#4EC9B0;box-shadow:0 0 12px #4EC9B0;animation:pulse-ring 2s infinite;}
@keyframes pulse-ring{0%{transform:scale(.95);box-shadow:0 0 0 0 rgba(78,201,176,.7)}70%{transform:scale(1);box-shadow:0 0 0 10px rgba(78,201,176,0)}100%{transform:scale(.95);box-shadow:0 0 0 0 rgba(78,201,176,0)}}
.terminal-nav{display:flex;background:rgba(255,255,255,.04);border-radius:16px;padding:5px;margin-bottom:24px;border:1px solid rgba(255,255,255,.06);position:relative;}
.nav-item{flex:1;padding:12px;border:none;background:none;color:rgba(255,255,255,.4);font-size:12px;font-weight:700;cursor:pointer;transition:all .3s;border-radius:12px;z-index:2;position:relative;}
.nav-item.active{color:#fff;}
.nav-indicator{position:absolute;top:5px;left:5px;height:calc(100% - 10px);width:calc(50% - 5px);background:rgba(255,255,255,.1);border-radius:12px;transition:transform .5s cubic-bezier(.34,1.56,.64,1);border:1px solid rgba(255,255,255,.15);box-shadow:0 4px 15px rgba(0,0,0,.3);}
.terminal-input-group{margin-bottom:16px;}
.terminal-input-group label{display:block;font-size:10px;color:rgba(255,255,255,.5);margin-bottom:6px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}
.input-wrapper{position:relative;}
.input-wrapper input{width:100%;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);padding:12px 18px;border-radius:14px;color:#fff;font-size:14px;outline:none;transition:all .3s;}
.input-wrapper input:focus{background:rgba(255,255,255,.06);border-color:rgba(79,193,255,.6);box-shadow:0 0 25px rgba(79,193,255,.15);transform:scale(1.02);}
.terminal-submit{width:100%;padding:16px;background:linear-gradient(135deg,#fff,#e0e0e0);border:none;border-radius:14px;color:#000;font-weight:900;font-size:14px;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);margin-top:8px;box-shadow:0 15px 35px rgba(0,0,0,.3);text-transform:uppercase;letter-spacing:1px;}
.terminal-submit:hover:not(:disabled){transform:translateY(-3px) scale(1.02);box-shadow:0 20px 45px rgba(255,255,255,.2);background:#fff;}
.terminal-submit:active:not(:disabled){transform:translateY(-1px) scale(.98);}
.terminal-submit:disabled{opacity:.3;cursor:not-allowed;filter:grayscale(1);}
.terminal-footer{margin-top:24px;text-align:center;}
.footer-line{height:1px;background:linear-gradient(to right,transparent,rgba(255,255,255,.1),transparent);margin-bottom:14px;}
.footer-content{display:flex;justify-content:center;gap:24px;font-size:10px;color:rgba(255,255,255,.25);font-weight:700;letter-spacing:2px;}
.terminal-alert{display:flex;align-items:center;gap:14px;padding:16px;border-radius:16px;margin-bottom:24px;font-size:13px;line-height:1.4;backdrop-filter:blur(10px);}
.terminal-alert.error{background:rgba(255,107,157,.15);border:1px solid rgba(255,107,157,.3);color:#FFB3CD;}
.terminal-alert.warning{background:rgba(220,220,170,.15);border:1px solid rgba(220,220,170,.3);color:#F0F0C0;display:flex;flex-direction:column;gap:12px;}
.local-bypass-btn{width:100%;padding:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;}
.local-bypass-btn:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.4);}
.terminal-alert.info{background:rgba(79,193,255,.15);border:1px solid rgba(79,193,255,.3);color:#A5E0FF;}
.fi-pop{animation:fi-pop .6s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes fi-pop{from{opacity:0;transform:scale(.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}

/* ── MOBILE BOTTOM BAR ── */
.mobile-bottom-bar{display:none;position:fixed;bottom:0;left:0;right:0;height:52px;background:var(--bg2);border-top:1px solid var(--bdr);z-index:100;align-items:center;justify-content:space-around;padding:0 4px;}
.mbb-btn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 10px;border-radius:8px;cursor:pointer;border:none;background:transparent;color:#4a5568;font-size:9px;font-weight:700;font-family:'Inter',sans-serif;transition:all .15s;min-width:52px;}
.mbb-btn.active{color:#4FC1FF;background:rgba(79,193,255,.1);}
.mbb-btn:hover{background:rgba(255,255,255,.06);color:#8892a4;}
.mbb-icon{font-size:18px;line-height:1;}
.mobile-sidebar-overlay{display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);}
.mobile-sidebar-drawer{position:fixed;left:0;top:0;bottom:0;width:280px;background:var(--bg2);border-right:1px solid var(--bdr);z-index:201;overflow-y:auto;transform:translateX(-100%);transition:transform .25s cubic-bezier(.34,1.2,.64,1);}
.mobile-sidebar-drawer.open{transform:translateX(0);}

/* ════════════════════════════════════════════════════ */
/* ══════════  MEDIA QUERIES — FULLY RESPONSIVE  ══════ */
/* ════════════════════════════════════════════════════ */

/* ── 0. Large Desktop & Ultrawide ≥ 1600px ── */
@media screen and (min-width:1600px){
  .sidebar{width:280px;}
  .right-panel{width:260px;}
  body{font-size:14px;}
  .topbar{height:52px;padding:0 20px;}
  .tab{font-size:13px;height:40px;padding:0 18px;}
}

/* ── 1. Large Tablets & Small Laptops ≤ 1024px ── */
@media screen and (max-width:1024px){
  .sidebar{width:60px;min-width:60px;}
  .sidebar .presence-info,.sidebar .sec-hdr,.sidebar .divider,.sidebar .presence-pos{display:none;}
  .ft{padding:8px;justify-content:center;}
  .ft span:last-child{display:none;}
  .right-panel{width:60px;min-width:60px;}
  .right-panel > *:not(.ot-hdr){display:none;}
  .tool-btn span:last-child{display:none;}
  .tool-btn{padding:4px 6px;}
}

/* ── 2. Tablets ≤ 768px ── */
@media screen and (max-width:768px){
  :root{--topbar-h:42px;}
  .topbar{padding:0 8px;gap:4px;}
  .tb-logo{font-size:.8rem;}
  .tb-logo span:last-child{display:none;}
  .live-badge{font-size:9px;padding:2px 7px;}
  .val-pass,.val-fail,.val-warn{display:none;}
  .py-badge{display:none;}
  .tool-btn.dbg,.tool-btn.logs{display:none !important;}
  .sb-tool{display:none !important;}
  .dbg-badge span:not(.dbg-cnt){display:none;}
  .dbg-badge{padding:4px 8px;}
  .tab{padding:0 10px;font-size:11px;height:32px;}
  .bc{padding:4px 10px;font-size:10px;}
  .out-hdr{height:30px;}
  .out-tab{padding:0 10px;font-size:10px;}
  /* collapse sidebar to icon strip */
  .sidebar{width:48px;min-width:48px;}
  .sidebar .presence-card,.sidebar .sec-hdr,.sidebar .divider,.sidebar .session-info,.sidebar .tools-section{display:none;}
  .ft{padding:6px;justify-content:center;}
  .ft > span:not(:first-child){display:none;}
  /* right panel hidden */
  .right-panel{display:none;}
  .mm{display:none;}
  .terminal-container{width:92%;padding:24px;border-radius:20px;}
  .brand-text h1{font-size:28px;}
}

/* ── iPhone SE, Newer iPhones with safe areas & Android Modern ── */
@media screen and (max-width: 600px) {
  :root {
    --topbar-h: 44px;
    --statusbar-h: 0px;
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-left: env(safe-area-inset-left, 0px);
    --safe-right: env(safe-area-inset-right, 0px);
  }

  body {
    overscroll-behavior-y: contain; /* Android pull-to-refresh fix */
    -webkit-tap-highlight-color: transparent;
  }

  .topbar {
    padding: var(--safe-top) calc(6px + var(--safe-right)) 0 calc(6px + var(--safe-left));
    gap: 4px;
    height: calc(var(--topbar-h) + var(--safe-top));
    overflow: hidden;
  }
  
  .divider-v { display: none !important; }

  .editor-main-area {
    padding-bottom: calc(52px + var(--safe-bottom));
  }

  .mobile-bottom-bar {
    display: flex !important;
    height: calc(52px + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    padding-left: var(--safe-left);
    padding-right: var(--safe-right);
    backdrop-filter: blur(20px);
    background: rgba(21, 24, 32, 0.85);
  }

  /* hide heavy panels */
  .sidebar{display:none !important;}
  .right-panel{display:none !important;}
  .mm{display:none !important;}
  .statusbar{display:none !important;}
  .tool-btn{display:none !important;}
  .dbg-badge{display:none !important;}
  .live-badge{display:none !important;}
  .py-badge{display:none !important;}
  .val-pass,.val-fail,.val-warn{display:none !important;}

  /* topbar — keep only essentials */
  .tb-logo .gem{width:20px;height:20px;font-size:10px;}
  .tb-logo{font-size:.8rem;padding:0 4px;}

  /* hide lang switcher text, keep icons */
  .lp span:last-child{display:none;}
  .lp{padding:4px 7px; min-height: 32px; display: flex; align-items: center;}

  /* lang switcher scroll */
  .lang-switcher-row{overflow-x:auto;-webkit-overflow-scrolling:touch;}
  .lang-switcher-row::-webkit-scrollbar{display:none;}

  /* new editor controls — hide select, simplify */
  .new-ed-select{display:none !important;}
  .new-ed-btn{padding:5px 12px;font-size:10px; min-height: 32px;}

  /* run button compact */
  .run-btn{padding:5px 14px;font-size:11px; min-height: 32px;}
  .run-btn span:not(.spin){display:none;}

  /* avatars — show only 2 */
  .av-group .av:nth-child(n+3){display:none;}

  /* tab bar */
  .tab{min-width:70px;max-width:130px;font-size:11px;padding:0 8px;height:32px;}

  /* breadcrumb */
  .bc{padding:3px 10px;font-size:10px;}
  .bc span:nth-child(n+4){display:none;}

  /* output panel compact */
  .out-panel{height:180px !important;}
  .out-hdr{height:28px;}
  .out-tab{padding:0 10px;font-size:10px;}

  /* modals full screen */
  .dbg-room{width:100vw !important;height:calc(100vh - 44px) !important;border-radius:0 !important;max-width:100vw !important;max-height:calc(100vh - 44px) !important;}
  .dbg-room-overlay{align-items:flex-end;padding:0;}
  .dbg-room-body{flex-direction:column;}
  .dbg-errors-panel{width:100% !important;height:160px !important;border-right:none !important;border-bottom:1px solid rgba(255,255,255,.05);}
  .logs-panel{width:100vw !important;height:calc(100vh - 44px) !important;border-radius:0 !important;max-width:100vw !important;}
  .logs-overlay{align-items:flex-end;padding:0;}
  .logs-head{padding:8px 12px;gap:6px;}
  .logs-title{font-size:12px;}
  .logs-controls{gap:3px;}
  .log-filter-btn{padding:2px 6px;font-size:9px;}
  .log-ts{width:60px;font-size:9px;}
  .log-svc{width:70px;font-size:9px;}
  .log-entry{font-size:10.5px;padding:3px 10px;}

  /* cmd palette */
  .cp-box{width:calc(100vw - 16px);max-width:calc(100vw - 16px);}
  .cp-ov{padding-top:50px;padding-left:8px;padding-right:8px;}

  /* error popup */
  .err-ov{padding-top:50px;padding-left:8px;padding-right:8px;}
  .err-body{max-height:180px;font-size:11px;}

  /* toast */
  .toast{right:8px;left:8px;max-width:100%;bottom:calc(62px + var(--safe-bottom));}

  /* terminal */
  .terminal-container{width:calc(100vw - 24px);padding:20px 18px;border-radius:20px;}
  .brand-icon{font-size:36px;}
  .brand-text h1{font-size:26px;letter-spacing:-1px;}
  .brand-text span{font-size:9px;letter-spacing:3px;}
  .terminal-nav{margin-bottom:16px;}
  .nav-item{padding:10px 6px;font-size:11px;}
  .terminal-submit{padding:13px;font-size:13px;}
  .footer-content{gap:12px;font-size:9px;}
  .input-wrapper input{padding:10px 14px;font-size:13px;}
  .terminal-alert{padding:12px;font-size:12px;gap:10px;}
}

/* ── 4. Small phones ≤ 390px (iPhone SE 1st gen, older Androids) ── */
@media screen and (max-width:390px){
  :root{--topbar-h:40px;}
  .tb-logo{display:none;}
  .lp{padding:3px 5px;}
  .run-btn{padding:4px 10px;}
  .tab{min-width:60px;max-width:110px;font-size:10px;padding:0 6px;}
  .brand-text h1{font-size:22px;}
  .terminal-container{padding:16px 14px;}
  .footer-content span:last-child{display:none;}
  .out-panel{height:150px !important;}
  .mbb-btn{min-width:44px;padding:5px 6px;font-size:8px;}
}

/* ── 5. Landscape mode on phones ── */
@media screen and (max-width:900px) and (orientation:landscape){
  :root{--topbar-h:36px;}
  .topbar{height:var(--topbar-h);}
  .out-panel{height:140px !important;}
  .mobile-bottom-bar{height:44px;}
  .mbb-icon{font-size:15px;}
  .mbb-btn{font-size:8px;padding:4px 8px;}
  .terminal-container{padding:16px 20px;}
  .terminal-header{margin-bottom:14px;}
  .brand-icon{font-size:28px;}
  .brand-text h1{font-size:22px;}
  .terminal-nav{margin-bottom:12px;}
  .terminal-input-group{margin-bottom:10px;}
  .input-wrapper input{padding:8px 14px;font-size:13px;}
  .terminal-submit{padding:11px;}
  .terminal-footer{margin-top:12px;}
}

/* ── 6. Foldables & large phones 600–768px ── */
@media screen and (min-width:601px) and (max-width:768px){
  .sidebar{width:52px;min-width:52px;}
  .right-panel{display:none;}
  .mm{display:none;}
  .tool-btn span{display:none;}
  .tool-btn{padding:4px 7px;}
}

/* ── 7. Touch Device Optimizations (Global) ── */
@media (pointer: coarse) {
  .ft, .tab, .lp, .new-ed-btn, .run-btn, .mbb-btn {
    min-height: 38px;
  }
  .tx {
    width: 24px;
    height: 24px;
    opacity: 0.8;
  }
}
`;

// ═══════════ CODEMIRROR ═══════════
const CMEditor = forwardRef(({ lang, initText, onLocalOp, onCursorMove, cursors, lineLocks, myId, fileKey, readOnly = false }, ref) => {
  const domRef = useRef(null), viewRef = useRef(null), modsRef = useRef(null);
  const inited = useRef(false), suppress = useRef(false), prevDoc = useRef(initText || "");
  useEffect(() => {
    const api = { 
      _getText: () => viewRef.current?.state.doc.toString() ?? prevDoc.current,
      _applyRemoteOp: (op, fullCode) => {
        if (!viewRef.current) return;
        suppress.current = true;
        try {
          const v = viewRef.current;
          const currentText = v.state.doc.toString();
          
          if (fullCode !== undefined && fullCode !== currentText) {
            let i = 0, oe = currentText.length, ne = fullCode.length;
            while (i < oe && i < ne && currentText[i] === fullCode[i]) i++;
            let oe2 = oe, ne2 = ne;
            while (oe2 > i && ne2 > i && currentText[oe2 - 1] === fullCode[ne2 - 1]) { oe2--; ne2--; }
            v.dispatch({ changes: { from: i, to: oe2, insert: fullCode.slice(i, ne2) } });
          } else if (fullCode === undefined) {
            const dl = currentText.length;
            let change = null;
            if (op.type === "insert") change = { from: Math.max(0, Math.min(op.pos, dl)), insert: op.chars };
            else if (op.type === "delete") {
              const f = Math.max(0, Math.min(op.pos, dl));
              const t = Math.min(f + op.len, dl);
              if (t > f) change = { from: f, to: t };
            }
            else if (op.type === "replace") {
              const f = Math.max(0, Math.min(op.pos, dl));
              const t = Math.min(f + op.len, dl);
              change = { from: f, to: t, insert: op.chars };
            }
            if (change) v.dispatch({ changes: change });
          }
          prevDoc.current = v.state.doc.toString();
        } finally {
          suppress.current = false;
        }
      }
    };
    if (ref) { typeof ref === "function" ? ref(api) : (ref.current = api); }
  });
  useEffect(() => {
    if (inited.current || !domRef.current) return; inited.current = true;
    (async () => {
      try {
        const [{ EditorState }, { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, indentOnInput }, { defaultKeymap, history, historyKeymap, indentWithTab }, { searchKeymap, highlightSelectionMatches }, { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap }, { foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle }, { javascript }, { python }, { java }, { cpp }, { rust }, { go }, { sql }, { oneDark }] = await Promise.all([
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
          ".cm-tooltip": { backgroundColor: "#1c1f28", border: "1px solid rgba(255,255,255,.1)", borderRadius: "6px", color: "#e0e0e0" },
          ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "rgba(79,193,255,.15)" },
        }, { dark: true });
        const listener = EditorView.updateListener.of(upd => {
          if (upd.selectionSet) { const pos = upd.state.selection.main.head; const ln = upd.state.doc.lineAt(pos); onCursorMove?.(ln.number, pos - ln.from + 1, pos); }
          if (!upd.docChanged || suppress.current || readOnly) return;
          const newText = upd.state.doc.toString(); const old = prevDoc.current; if (newText === old) return;
          let i = 0, oe = old.length, ne = newText.length;
          while (i < oe && i < ne && old[i] === newText[i]) i++;
          let oe2 = oe, ne2 = ne;
          while (oe2 > i && ne2 > i && old[oe2 - 1] === newText[ne2 - 1]) { oe2--; ne2--; }
          const del = old.slice(i, oe2), ins = newText.slice(i, ne2);
          if (del.length && ins.length) onLocalOp?.({ type: "replace", pos: i, len: del.length, chars: ins });
          else if (del.length) onLocalOp?.({ type: "delete", pos: i, len: del.length });
          else if (ins.length) onLocalOp?.({ type: "insert", pos: i, chars: ins });
          prevDoc.current = newText;
        });
        modsRef.current = { EditorState, EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, indentOnInput, history, historyKeymap, indentWithTab, searchKeymap, highlightSelectionMatches, autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle, oneDark, theme, listener, LM };
        const mkExt = lk => {
          const b = [lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), highlightSpecialChars(), history(), foldGutter(), drawSelection(), dropCursor(), bracketMatching(), closeBrackets(), autocompletion(), rectangularSelection(), crosshairCursor(), highlightSelectionMatches(), indentOnInput(), syntaxHighlighting(defaultHighlightStyle, { fallback: true }), keymap.of([indentWithTab, ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap]), LM[lk] || LM.ts, oneDark, theme, listener, EditorView.lineWrapping];
          if (readOnly) b.push(EditorView.editable.of(false)); return b;
        };
        const view = new EditorView({ state: EditorState.create({ doc: initText || "", extensions: mkExt(lang) }), parent: domRef.current });
        viewRef.current = view; prevDoc.current = view.state.doc.toString();
      } catch (err) {
        if (domRef.current) {
          domRef.current.innerHTML = "";
          const ta = document.createElement("textarea"); ta.value = initText || "";
          ta.style.cssText = "width:100%;height:100%;background:#0d0f14;color:#d4d4d4;font-family:'JetBrains Mono',monospace;font-size:13.5px;line-height:21px;padding:8px 14px;border:none;outline:none;resize:none;tab-size:4;";
          if (!readOnly) {
            ta.addEventListener("input", e => {
              const nT = e.target.value, old = prevDoc.current;
              let i = 0, oe = old.length, ne = nT.length;
              while (i < oe && i < ne && old[i] === nT[i]) i++;
              let oe2 = oe, ne2 = ne;
              while (oe2 > i && ne2 > i && old[oe2 - 1] === nT[ne2 - 1]) { oe2--; ne2--; }
              const del = old.slice(i, oe2), ins = nT.slice(i, ne2);
              if (del.length && ins.length) onLocalOp?.({ type: "replace", pos: i, len: del.length, chars: ins });
              else if (del.length) onLocalOp?.({ type: "delete", pos: i, len: del.length });
              else if (ins.length) onLocalOp?.({ type: "insert", pos: i, chars: ins });
              prevDoc.current = nT;
            });
          }
          domRef.current.appendChild(ta);
          if (ref) { const api = { _getText: () => ta.value }; typeof ref === "function" ? ref(api) : (ref.current = api); }
        }
      }
    })();
    return () => { if (viewRef.current) { viewRef.current.destroy(); viewRef.current = null; inited.current = false; } };
  }, []);
  useEffect(() => {
    if (!viewRef.current || !modsRef.current) return;
    const { EditorState, EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, indentOnInput, history, historyKeymap, indentWithTab, searchKeymap, highlightSelectionMatches, autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle, oneDark, theme, listener, LM } = modsRef.current;
    const mkExt = lk => {
      const b = [lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), highlightSpecialChars(), history(), foldGutter(), drawSelection(), dropCursor(), bracketMatching(), closeBrackets(), autocompletion(), rectangularSelection(), crosshairCursor(), highlightSelectionMatches(), indentOnInput(), syntaxHighlighting(defaultHighlightStyle, { fallback: true }), keymap.of([indentWithTab, ...closeBracketsKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, ...searchKeymap]), LM[lk] || LM.ts, oneDark, theme, listener, EditorView.lineWrapping];
      if (readOnly) b.push(EditorView.editable.of(false)); return b;
    };
    suppress.current = true;
    viewRef.current.setState(EditorState.create({ doc: initText || "", extensions: mkExt(lang) }));
    prevDoc.current = initText || "";
    suppress.current = false;
  }, [lang, fileKey]);
  return (
    <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
      {Object.values(lineLocks || {}).filter(lock => lock.user_id !== myId).map(lock => (
        <div key={`lock-${lock.line_number}`} style={{ pointerEvents: "none", position: "absolute", inset: 0, overflow: "hidden", zIndex: 10 }}>
          <div style={{ position: "absolute", top: (lock.line_number - 1) * 21, left: 0, right: 0, height: 21, background: lock.color + "15", borderLeft: `4px solid ${lock.color}`, pointerEvents: "none" }}>
            <div style={{ position: "absolute", right: 10, top: 2, display: "flex", alignItems: "center", gap: 5, background: lock.color, color: "#fff", padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>
              🔒 {lock.user_name}
            </div>
          </div>
        </div>
      ))}
      {cursors?.filter(c => c.id !== myId).map(cur => {
        const top = (cur.line - 1) * 21, left = 48 + (cur.col - 1) * 8.1;
        return (
          <div key={cur.id} style={{ pointerEvents: "none", position: "absolute", inset: 0, overflow: "hidden", zIndex: 15 }}>
            <div style={{ position: "absolute", top, left: 48, right: 0, height: 21, background: cur.color + "0a", borderLeft: `2px solid ${cur.color}22`, pointerEvents: "none" }} />
            <div style={{ position: "absolute", top, left, width: 2, height: 21, background: cur.color, borderRadius: 1, transition: "top .2s ease, left .2s ease", boxShadow: `0 0 6px ${cur.color}88` }} />
            <div style={{ position: "absolute", top: Math.max(0, top - 18), left: Math.max(48, left), background: cur.color, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: "3px 3px 3px 0", fontFamily: "Inter,sans-serif", whiteSpace: "nowrap", pointerEvents: "none", boxShadow: `0 2px 8px ${cur.color}66`, transition: "top .2s ease, left .2s ease", opacity: .95 }}>
              {cur.name.split(" ")[0]}
            </div>
          </div>
        );
      })}
      <div ref={domRef} style={{ height: "100%", width: "100%", overflow: "auto" }} />
    </div>
  );
});

// ═══════════ ERROR POPUP ═══════════
function ErrorPopup({ error, lang, onClose, onOpenOutput }) {
  if (!error) return null;
  const lines = error.split("\n");
  const langName = LANGS[lang]?.n || lang;
  const langColor = LANGS[lang]?.c || "#FF6B9D";
  const firstMeaningful = lines.find(l => /error|warning|failed/i.test(l)) || lines[0] || "";
  let errType = "Error";
  if (/syntaxerror/i.test(firstMeaningful)) errType = "SyntaxError";
  else if (/nameerror/i.test(firstMeaningful)) errType = "NameError";
  else if (/typeerror/i.test(firstMeaningful)) errType = "TypeError";
  else if (/valueerror/i.test(firstMeaningful)) errType = "ValueError";
  else if (/tabError/i.test(firstMeaningful)) errType = "TabError";
  else if (/traceback/i.test(lines[0])) errType = "Runtime Error";
  else if (/compilation failed|build failed/i.test(error)) errType = "Build Failed";
  else if (/error\[e\d+\]/i.test(firstMeaningful)) errType = "Rust Error";
  else if (/\\.go:/i.test(firstMeaningful)) errType = "Go Error";
  else if (/sql error/i.test(firstMeaningful)) errType = "SQL Error";
  else if (/fatal error/i.test(firstMeaningful)) errType = "Fatal Error";
  else if (/error:/i.test(firstMeaningful)) errType = "Compilation Error";
  return (
    <div className="err-ov">
      <div className="err-box err-slide">
        <div className="err-head">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF6B9D", boxShadow: "0 0 8px #FF6B9D", display: "inline-block", flexShrink: 0 }} className="pulse" />
          <div className="err-title">⊗ {errType}</div>
          <span className="err-lang-pill" style={{ background: `${langColor}22`, color: langColor, borderColor: `${langColor}44` }}>{langName}</span>
          <button className="err-close" onClick={onClose}>✕</button>
        </div>
        <div className="err-body">
          {lines.map((line, i) => {
            let color = "#ffb3c0";
            if (/^❌/.test(line)) color = "#FF6B9D";
            else if (/^⚠/.test(line)) color = "#DCDCAA";
            else if (/^\s*✖/.test(line)) color = "#ff8090";
            else if (/Fix the error/i.test(line)) color = "#6a7585";
            else if (/^traceback/i.test(line)) color = "#DCDCAA";
            else if (/^\s+file /i.test(line)) color = "#8892a4";
            else if (/^\s+\^+\s*$/.test(line)) color = "#FF6B9D";
            else if (/^(\w+error|\w+exception)/i.test(line.trim())) color = "#ff6060";
            else if (/^(error(\[e\d+\])?:|sql error|compilation failed)/i.test(line.trim())) color = "#ff6060";
            else if (/^warning/i.test(line.trim())) color = "#DCDCAA";
            else if (/^\s+/.test(line) && line.trim()) color = "#8892a4";
            return <div key={i} style={{ color, fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.75 }}>{line || "\u00A0"}</div>;
          })}
        </div>
        <div className="err-foot">
          <span className="err-hint">Fix errors and press ▶ Run · Esc to dismiss</span>
          <button className="err-view-btn" onClick={() => { onOpenOutput(); onClose(); }}>View in Output →</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════ TYPING INDICATOR ═══════════
function TypingIndicator({ color }) {
  return (
    <span className="presence-typing">
      {[0, 1, 2].map(i => (
        <span key={i} className="typing-dot" style={{ background: color, animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </span>
  );
}

// ═══════════ DEBUGGING ROOM ═══════════
function DebuggingRoom({ errors, warnings, lang, me, onLocalOp, onClose }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef(null);
  const botTypingRef = useRef(null);
  const channelRef = useRef(null);

  const allIssues = [
    ...errors.map(e => ({ type: "error", text: e })),
    ...warnings.map(w => ({ type: "warning", text: w })),
  ];

  useEffect(() => {
    if (allIssues.length === 0) return;
    const issue = allIssues[selectedIdx];
    if (!issue) return;
    const sysMsg = { id: Math.random().toString(36).slice(2), from: "system", text: `🔍 Debugging: ${issue.text.slice(0, 80)}${issue.text.length > 80 ? "…" : ""}`, t: nowTs() };
    setMessages([sysMsg]);
    clearTimeout(botTypingRef.current);
    botTypingRef.current = setTimeout(() => {
      const bot = BOTS[0];
      const suggestion = generateBotAnnotation(issue.text, lang);
      setMessages(prev => [...prev, { id: Math.random().toString(36).slice(2), from: bot.name, color: bot.color, bg: bot.bg, inits: bot.inits, text: suggestion, t: nowTs(), isBot: true }]);
      setTimeout(() => {
        const bot2 = BOTS[1];
        const langHint = `In ${LANGS[lang]?.n || lang}: ${issue.text.includes("line") ? "check the highlighted line first." : "validate your syntax tree structure."}`;
        setMessages(prev => [...prev, { id: Math.random().toString(36).slice(2), from: bot2.name, color: bot2.color, bg: bot2.bg, inits: bot2.inits, text: langHint, t: nowTs(), isBot: true }]);
      }, 1600);
    }, 700);
    return () => clearTimeout(botTypingRef.current);
  }, [selectedIdx, lang]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const channel = supabase.channel(`debug:${lang}`);
    channelRef.current = channel;
    channel.on("broadcast", { event: "msg" }, ({ payload }) => { setMessages(prev => [...prev, payload]); }).subscribe();
    return () => channel.unsubscribe();
  }, [lang]);

  const sendMessage = (txt = inputVal.trim()) => {
    if (!txt) return;
    const msg = { id: Math.random().toString(36).slice(2), from: me.name, color: me.cursorColor, bg: me.bg, inits: initials(me.name), text: txt, t: nowTs(), isMe: true };
    setMessages(prev => [...prev, msg]);
    channelRef.current?.send({ type: "broadcast", event: "msg", payload: { ...msg, isMe: false } });
    setInputVal("");
  };

  const totalIssues = allIssues.length;

  return (
    <div className="dbg-room-overlay" onClick={onClose}>
      <div className="dbg-room announce-pop" onClick={e => e.stopPropagation()}>
        <div className="dbg-room-head">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF6B9D", boxShadow: "0 0 8px #FF6B9D", display: "inline-block", flexShrink: 0 }} className="pulse" />
          <div className="dbg-room-title">🐛 Real-Time Debugging Room</div>
          <span style={{ fontSize: 10, color: "#4a5568", fontFamily: "var(--mono)", background: "rgba(255,255,255,.04)", padding: "2px 8px", borderRadius: 4 }}>
            ${LANGS[lang]?.n || lang} · ${totalIssues} issue${totalIssues !== 1 ? "s" : ""}
          </span>
          <button className="err-close" onClick={onClose} style={{ marginLeft: 4 }}>✕</button>
        </div>
        <div className="dbg-room-body">
          <div className="dbg-errors-panel">
            <div style={{ fontSize: 9, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", padding: "2px 4px 6px" }}>Issues</div>
            {allIssues.length === 0 && (
              <div style={{ fontSize: 11, color: "#4a5568", textAlign: "center", padding: "20px 8px" }}>✓ No issues<br /><span style={{ fontSize: 10, color: "#2d3748" }}>Code looks clean!</span></div>
            )}
            {allIssues.map((issue, i) => (
              <div key={i} className={`dbg-error-item${selectedIdx === i ? " sel" : ""}`} onClick={() => setSelectedIdx(i)}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  {issue.type === "error" ? <span className="err-type-badge">ERR</span> : <span className="warn-type-badge">WARN</span>}
                  <span style={{ fontSize: 9, color: "#4a5568", fontFamily: "var(--mono)", marginLeft: "auto" }}>#${i + 1}</span>
                </div>
                <div style={{ fontSize: 10, color: issue.type === "error" ? "#ff8090" : "#DCDCAA", fontFamily: "var(--mono)", lineHeight: 1.5, wordBreak: "break-word" }}>
                  {issue.text.slice(0, 70)}{issue.text.length > 70 ? "…" : ""}
                </div>
              </div>
            ))}
          </div>
          <div className="dbg-chat-panel">
            <div className="dbg-chat-messages">
              {messages.map(msg => {
                if (msg.from === "system") return (
                  <div key={msg.id} style={{ textAlign: "center", padding: "4px 0" }}>
                    <span style={{ fontSize: 10, color: "#4a5568", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 100, padding: "2px 10px", fontFamily: "var(--mono)" }}>{msg.text}</span>
                  </div>
                );
                return (
                  <div key={msg.id} className="dbg-msg" style={{ flexDirection: msg.isMe ? "row-reverse" : "row" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: msg.bg || "rgba(79,193,255,.18)", color: msg.color || "#4FC1FF", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", flexShrink: 0, border: `1.5px solid ${msg.color || "#4FC1FF"}44` }}>{msg.inits || initials(msg.from)}</div>
                    <div style={{ maxWidth: "78%" }}>
                      <div style={{ fontSize: 9, color: "#4a5568", marginBottom: 2, textAlign: msg.isMe ? "right" : "left" }}>{msg.from}</div>
                      <div className={`dbg-msg-bubble${msg.isMe ? " me" : msg.isBot ? " bot" : ""}`}>
                        <span style={{ color: msg.isMe ? "#a8d8ff" : msg.isBot ? "#ffb3c6" : "#e0e0e0" }}>{msg.text}</span>
                        {msg.isBot && (<div><button className="dbg-fix-btn">✓ Mark as helpful</button></div>)}
                      </div>
                      <div className="dbg-msg-time" style={{ textAlign: msg.isMe ? "right" : "left" }}>{msg.t}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="dbg-chat-input-row">
              <input className="dbg-chat-input" value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Describe what you're seeing, ask the team…" />
              <button className="dbg-send-btn" onClick={() => sendMessage()}>Send ↑</button>
            </div>
          </div>
        </div>
        <div className="dbg-room-foot">
          <div style={{ flex: 1 }} />
          <div className="dbg-stat">Errors: <span style={{ color: "#FF6B9D" }}>{errors.length}</span></div>
          <div className="dbg-stat">Warnings: <span style={{ color: "#DCDCAA" }}>{warnings.length}</span></div>
          <div className="dbg-stat">Lang: <span>{LANGS[lang]?.n || lang}</span></div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#4EC9B0" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4EC9B0", boxShadow: "0 0 5px #4EC9B0" }} />
            {1 + BOTS.length} in room
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════ LIVE SERVER LOGS ═══════════
function LiveServerLogs({ onClose }) {
  const [logs, setLogs] = useState(() => Array.from({ length: 18 }, genLogEntry).reverse());
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const streamRef = useRef(null);
  const logsEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    streamRef.current = setInterval(() => {
      if (pausedRef.current) return;
      const count = Math.random() > 0.65 ? 2 : 1;
      setLogs(prev => [...Array.from({ length: count }, genLogEntry), ...prev].slice(0, 300));
    }, 1200);
    return () => clearInterval(streamRef.current);
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current && !paused) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs, autoScroll, paused]);

  const filteredLogs = logs.filter(e => {
    const matchesFilter = filter === "ALL" || e.level === filter;
    const matchesSearch = !search || e.msg.toLowerCase().includes(search.toLowerCase()) || e.svc.includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = logs.reduce((acc, e) => { acc[e.level] = (acc[e.level] || 0) + 1; return acc; }, {});
  const errRate = ((counts.ERROR || 0) / Math.max(logs.length, 1) * 100).toFixed(1);

  return (
    <div className="logs-overlay" onClick={onClose}>
      <div className="logs-panel announce-pop" onClick={e => e.stopPropagation()}>
        <div className="logs-head">
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: paused ? "#4a5568" : "#4EC9B0", boxShadow: paused ? "none" : "0 0 8px #4EC9B0", flexShrink: 0, transition: "all .3s" }} className={paused ? "" : "pulse"} />
          <div className="logs-title">📡 Live Server Logs</div>
          <div className="logs-controls">
            {["ALL", "INFO", "SUCCESS", "WARN", "ERROR", "DEBUG"].map(lv => (
              <button key={lv} className={`log-filter-btn${filter === lv ? ` active-${lv}` : ""}`} onClick={() => setFilter(lv)}>
                {lv === "ALL" ? "All" : lv}{lv !== "ALL" && counts[lv] ? <span style={{ marginLeft: 3, opacity: .7 }}>({counts[lv] || 0})</span> : null}
              </button>
            ))}
          </div>
          <button className="err-close" onClick={onClose} style={{ marginLeft: 8, color: "#4a5568", background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.1)", flexShrink: 0 }}>✕</button>
        </div>
        <div className="logs-body">
          <div className="logs-stats-bar">
            {[["ERROR","#FF6B9D"],["WARN","#DCDCAA"],["SUCCESS","#4EC9B0"],["INFO","#4FC1FF"],["DEBUG","#C586C0"]].map(([lv,col]) => (
              <div key={lv} className="logs-stat-item" style={{ color: col }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: col, display: "inline-block" }} />
                <span style={{ color: "#4a5568" }}>{lv.slice(0,3)}</span> {counts[lv] || 0}
              </div>
            ))}
            <div className="logs-stat-item" style={{ marginLeft: "auto", color: "#4a5568" }}>Total: <span style={{ color: "#e0e0e0" }}>{logs.length}</span></div>
            <div className="logs-stat-item" style={{ color: parseFloat(errRate) > 5 ? "#FF6B9D" : "#4a5568" }}>Err%: <span style={{ color: parseFloat(errRate) > 5 ? "#FF6B9D" : "#4EC9B0" }}>{errRate}%</span></div>
          </div>
          <div className="logs-stream" onScroll={e => { const el = e.target; setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40); }}>
            <div style={{ display: "flex", padding: "3px 14px", borderBottom: "1px solid rgba(255,255,255,.04)", position: "sticky", top: 0, background: "#0a0c11", zIndex: 2 }}>
              <span style={{ width: 82, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase" }}>Time</span>
              <span style={{ width: 58, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase" }}>Level</span>
              <span style={{ width: 90, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase" }}>Service</span>
              <span style={{ flex: 1, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase" }}>Message</span>
            </div>
            {filteredLogs.length === 0 && <div style={{ padding: "30px", textAlign: "center", color: "#4a5568", fontSize: 12 }}>No matching log entries</div>}
            {[...filteredLogs].reverse().map((entry, i) => (
              <div key={entry.id} className={`log-entry ${entry.level} log-slide`} style={{ animationDelay: `${Math.min(i * 0.02, 0.3)}s` }}>
                <span className="log-ts">{entry.t}</span>
                <span className="log-level-pill"><span className={`log-level-inner ${entry.level}`}>{entry.level}</span></span>
                <span className="log-svc" title={entry.svc}>{entry.svc}</span>
                <span className={`log-msg ${entry.level}`}>
                  {search ? entry.msg.split(new RegExp(`(${search})`, "gi")).map((part, pi) =>
                    part.toLowerCase() === search.toLowerCase()
                      ? <mark key={pi} style={{ background: "rgba(220,220,170,.3)", color: "#DCDCAA", borderRadius: 2 }}>{part}</mark>
                      : part
                  ) : entry.msg}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
        <div className="logs-foot">
          <div className={`logs-streaming-dot${paused ? " paused" : ""}`} />
          <span style={{ fontSize: 10, color: paused ? "#4a5568" : "#4EC9B0", fontWeight: 700 }}>{paused ? "PAUSED" : "STREAMING"}</span>
          <input className="log-search" placeholder="Search logs…" value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "#4a5568" }}>{filteredLogs.length}/{logs.length}</span>
          <button className={`logs-pause-btn${paused ? " paused" : ""}`} onClick={() => setPaused(p => !p)}>{paused ? "▶ Resume" : "⏸ Pause"}</button>
          <button className="logs-clear-btn" onClick={() => setLogs([])}>Clear</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════ ACCESS TERMINAL ═══════════
function AccessTerminal() {
  const { login, loginGuest } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoBypassCounter, setAutoBypassCounter] = useState(3);
  const isConfigured = !!import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (!isConfigured && autoBypassCounter > 0) {
      const timer = setTimeout(() => setAutoBypassCounter(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (!isConfigured && autoBypassCounter === 0) { loginGuest(); navigate("/editor"); }
  }, [isConfigured, autoBypassCounter, loginGuest, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/editor");
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setLoading(true); setError(null);
    try {
      const chosen = PALETTE[colorIdx];
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name || email.split("@")[0], cursor_color: chosen.hex } } });
      if (signUpError) throw signUpError;
      if (data?.user && !data.session) { setError("Activation required. Check your inbox."); }
      else { navigate("/editor"); }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="access-terminal">
      <div className="grid-overlay" />
      <div className="nebula blue" />
      <div className="nebula pink" />
      <div className="terminal-container fi-pop">
        <div className="terminal-header">
          <div className="terminal-brand">
            <div className="brand-icon">⚡</div>
            <div className="brand-text">
              <h1>CKC-OS</h1>
              <span>COLLABORATIVE OPERATING SYSTEM</span>
            </div>
          </div>
          <div className="terminal-status">
            <span className="pulse-dot" />
            {isConfigured ? "SYSTEM_ACTIVE_v4.2" : "CONFIG_REQUIRED"}
          </div>
        </div>
        {!isConfigured && (
          <div className="terminal-alert warning" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>⚠</span>
              <div>
                <div style={{ fontWeight: 700 }}>Supabase not configured.</div>
                <div style={{ fontSize: 10, opacity: .8, marginTop: 4 }}>Auto-rectifying to Local Mode in {autoBypassCounter}s...</div>
              </div>
            </div>
            <button className="local-bypass-btn" onClick={() => { loginGuest(); navigate("/editor"); }}>Enter Local Mode Now</button>
          </div>
        )}
        <div className="terminal-nav">
          <div className="nav-indicator" style={{ transform: `translateX(${activeTab === "login" ? "0" : "100%"})` }} />
          <button className={`nav-item ${activeTab === "login" ? "active" : ""}`} onClick={() => setActiveTab("login")}>ACCESS</button>
          <button className={`nav-item ${activeTab === "register" ? "active" : ""}`} onClick={() => setActiveTab("register")}>REGISTER</button>
        </div>
        {error && (
          <div className={`terminal-alert ${error.includes("Activation") ? "info" : "error"}`}>
            <span>{error.includes("Activation") ? "✉" : "⚠"}</span>
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={activeTab === "login" ? handleLogin : handleRegister}>
          {activeTab === "register" && (
            <div className="terminal-input-group">
              <label>INITIAL_ID</label>
              <div className="input-wrapper"><input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name..." required /></div>
            </div>
          )}
          <div className="terminal-input-group">
            <label>UPLINK_EMAIL</label>
            <div className="input-wrapper"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@ckc-os.io" required /></div>
          </div>
          <div className="terminal-input-group">
            <label>ACCESS_KEY</label>
            <div className="input-wrapper"><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required /></div>
          </div>
          {activeTab === "register" && (
            <div className="terminal-input-group">
              <label>WORKSPACE_HUE</label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {PALETTE.map((p, i) => (
                  <div key={i} onClick={() => setColorIdx(i)} style={{ width: 28, height: 28, borderRadius: 8, background: p.bg, border: `2px solid ${colorIdx === i ? p.hex : "transparent"}`, cursor: "pointer", transition: "all .15s", boxShadow: colorIdx === i ? `0 0 10px ${p.hex}66` : "none" }} />
                ))}
              </div>
            </div>
          )}
          <button className="terminal-submit" disabled={loading}>
            {loading ? "•••" : (activeTab === "login" ? "ESTABLISH CONNECTION →" : "INITIALIZE NODE →")}
          </button>
        </form>
        <div className="terminal-footer">
          <div className="footer-line" />
          <div className="footer-content">
            <span>SECURE</span><span>v4.2.1</span><span>SUPABASE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════ MAIN APP ═══════════
export default function EditorPage() {
  const { user, loading: authLoading, logout } = useAuth();
  if (authLoading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#05070a" }}>
      <div className="spin" style={{ width: 40, height: 40, border: "3px solid rgba(79,193,255,.1)", borderTopColor: "#4FC1FF", borderRadius: "50%" }} />
    </div>
  );
  if (!user) return (<><style dangerouslySetInnerHTML={{ __html: CSS }} /><AccessTerminal /></>);
  return (<><style dangerouslySetInnerHTML={{ __html: CSS }} /><Shell user={user} onLogout={logout} /></>);
}

// ═══════════ SHELL ═══════════
function Shell({ user, onLogout }) {
  const me = {
    name: user?.name || "Developer",
    color: user?.cursorColor || "#4FC1FF",
    cursorColor: user?.cursorColor || "#4FC1FF",
    bg: user?.bg || "rgba(79,193,255,0.15)",
    inits: user?.inits || "D",
    id: user?.id || "anon",
    email: user?.email || "",
  };
  const sid = user?.sid || "default-session";
  const myId = useRef(user.id);
  const instanceId = useRef(Math.random().toString(36).substring(7)).current;
  const [cursors, setCursors] = useState([]);
  const [crdt, setCrdt] = useState([]);
  const [wsLog, setWsLog] = useState([]);
  const [opCnt, setOpCnt] = useState(0);
  const [lang, setLang] = useState("ts");
  const [tabs, setTabs] = useState([
    { id: "t_eng", name: "engine.ts", lang: "ts", dirty: false, isNew: false },
    { id: "t_test", name: "test.ts", lang: "ts", dirty: false, isNew: false }
  ]);
  const [activeTab, setActiveTab] = useState("t_eng");
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [rpTab, setRpTab] = useState("crdt");
  const [outTab, setOutTab] = useState("output");
  const [outOpen, setOutOpen] = useState(false);
  const [output, setOutput] = useState("");
  const [outIsErr, setOutIsErr] = useState(false);
  const [running, setRunning] = useState(false);
  const [pyReady, setPyReady] = useState(false);
  const [errPopup, setErrPopup] = useState(null);
  const [errShake, setErrShake] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQ, setCmdQ] = useState("");
  const [cmdSel, setCmdSel] = useState(0);
  const [notif, setNotif] = useState(null);
  const [newEdLang, setNewEdLang] = useState("ts");
  const [connectedCount, setConnectedCount] = useState(1);
  const [liveValidation, setLiveValidation] = useState(null);
  const [lineLocks, setLineLocks] = useState({});
  const [showDebugRoom, setShowDebugRoom] = useState(false);
  const [showServerLogs, setShowServerLogs] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState("editor");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [knowledgeCode, setKnowledgeCode] = useState("");

  const channelRef = useRef(null);
  const liveValTimer = useRef(null);
  const activeEditorRef = useRef(null);
  const notifTmr = useRef(null);

  const getEng = useCallback((lk) => WS.eng(lk), []);
  const toast = useCallback((msg, ms = 2500) => { clearTimeout(notifTmr.current); setNotif(msg); notifTmr.current = setTimeout(() => setNotif(null), ms); }, []);

  useEffect(() => {
    const channel = supabase.channel("global-workspace");
    channelRef.current = channel;
    const bc = new BroadcastChannel("ckc_os_sync");

    const handleMessage = ({ type, payload }) => {
      if (payload.instanceId === instanceId) return;
      
      switch (type) {
        case "join":
          bc.postMessage({ type: "presence", payload: { id: me.id, instanceId, name: me.name, color: me.cursorColor, line: cursor.line, col: cursor.col, tabId: activeTab } });
          break;
        case "op":
          if (payload.tabId === activeTab) {
            activeEditorRef.current?._applyRemoteOp?.(payload.op, payload.fullCode);
          }
          setTabs(prev => prev.map(t => t.id === payload.tabId ? { ...t, code: payload.fullCode ?? applyOpToString(t.code || "", payload.op) } : t));
          setOpCnt(c => c + 1);
          setCrdt(p => [{ ...payload.op, from: payload.name, t: nowTs() }, ...p].slice(0, 40));
          break;
        case "cursor":
          setCursors(prev => [...prev.filter(c => c.id !== payload.id), { ...payload, online: true }]);
          break;
        case "tabSync":
          setTabs(prev => {
            const exists = prev.find(t => t.id === payload.tab.id);
            if (exists) return prev;
            return [...prev, payload.tab];
          });
          toast(`${payload.name} opened ${payload.tab.name}`);
          bc.postMessage({ type: "stateRequest", payload: { tabId: payload.tab.id, requesterId: me.id } });
          channel.send({ type: "broadcast", event: "stateRequest", payload: { tabId: payload.tab.id, requesterId: me.id } });
          break;
        case "stateRequest":
          if (payload.requesterId !== me.id) {
            const tab = tabs.find(t => t.id === payload.tabId);
            const currentCode = (payload.tabId === activeTab) ? (activeEditorRef.current?._getText?.() || "") : (tab?.code || "");
            if (currentCode) {
              const resp = { type: "stateResponse", payload: { tabId: payload.tabId, code: currentCode, toId: payload.requesterId } };
              bc.postMessage(resp);
              channel.send({ type: "broadcast", event: "stateResponse", payload: resp.payload });
            }
          }
          break;
        case "stateResponse":
          if (payload.toId === me.id) {
            setTabs(prev => prev.map(t => t.id === payload.tabId ? { ...t, code: payload.code } : t));
          }
          break;
        case "presence":
          setCursors(prev => {
            const exists = prev.find(c => c.id === payload.id);
            if (exists) return prev.map(c => c.id === payload.id ? { ...c, ...payload, online: true } : c);
            return [...prev, { ...payload, online: true }];
          });
          break;
      }
    };

    bc.onmessage = (e) => handleMessage(e.data);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setConnectedCount(users.length);
        setCursors(prev => {
          const remote = users.map(u => ({ id: u.user_id, name: u.name, color: u.color, line: u.line || 1, col: u.col || 1, tabId: u.tabId, online: true }));
          const local = prev.filter(c => c.id.startsWith("guest_") && !users.find(u => u.user_id === c.id));
          return [...remote, ...local];
        });
      })
      .on("broadcast", { event: "op" }, ({ payload }) => handleMessage({ type: "op", payload }))
      .on("broadcast", { event: "cursor" }, ({ payload }) => handleMessage({ type: "cursor", payload }))
      .on("broadcast", { event: "tabSync" }, ({ payload }) => handleMessage({ type: "tabSync", payload }))
      .on("broadcast", { event: "stateRequest" }, ({ payload }) => handleMessage({ type: "stateRequest", payload }))
      .on("broadcast", { event: "stateResponse" }, ({ payload }) => handleMessage({ type: "stateResponse", payload }))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: me.id, name: me.name, color: me.cursorColor, line: cursor.line, col: cursor.col, tabId: activeTab, online: true });
          bc.postMessage({ type: "join", payload: { id: me.id } });
          bc.postMessage({ type: "presence", payload: { id: me.id, name: me.name, color: me.cursorColor, line: cursor.line, col: cursor.col, tabId: activeTab } });
          tabs.forEach(t => {
            channel.send({ type: "broadcast", event: "stateRequest", payload: { tabId: t.id, requesterId: me.id } });
            bc.postMessage({ type: "stateRequest", payload: { tabId: t.id, requesterId: me.id } });
          });
        }
      });

    const lockSub = supabase.channel("line_locks")
      .on("postgres_changes", { event: "*", schema: "public", table: "line_locks" }, payload => {
        if (payload.eventType === "DELETE") {
          setLineLocks(prev => { const next = { ...prev }; delete next[payload.old.line_number]; return next; });
        } else {
          setLineLocks(prev => ({ ...prev, [payload.new.line_number]: payload.new }));
        }
      }).subscribe();

    supabase.from("line_locks").select("*").then(({ data }) => {
      if (data) { const locks = {}; data.forEach(l => locks[l.line_number] = l); setLineLocks(locks); }
    });

    return () => { channel.unsubscribe(); lockSub.unsubscribe(); };
  }, [activeTab, tabs.length]);

  const triggerLiveValidation = useCallback((code, lk) => {
    clearTimeout(liveValTimer.current);
    liveValTimer.current = setTimeout(() => {
      if (!code || code.trim().length < 3) { setLiveValidation(null); return; }
      setLiveValidation(validateCode(lk, code));
    }, 600);
  }, []);

  const handleLocalOp = useCallback(op => {
    if (lineLocks[cursor.line] && lineLocks[cursor.line].user_id !== me.id) { toast("Line locked by " + lineLocks[cursor.line].user_name); return; }
    const fullCode = activeEditorRef.current?._getText?.() || "";
    const payload = { uid: me.id, instanceId, name: me.name, lang, op, tabId: activeTab, tabName: tabs.find(t => t.id === activeTab)?.name || "scratch", fullCode };
    channelRef.current?.send({ type: "broadcast", event: "op", payload });
    new BroadcastChannel("ckc_os_sync").postMessage({ type: "op", payload });

    setOpCnt(c => c + 1);
    setCrdt(p => [{ ...op, from: "me", t: nowTs() }, ...p].slice(0, 40));
    triggerLiveValidation(fullCode, lang);
  }, [lang, me, instanceId, cursor, lineLocks, toast, triggerLiveValidation, activeTab, tabs]);

  const handleCursorMove = useCallback(async (line, col) => {
    setCursor({ line, col });
    const payload = { id: me.id, instanceId, name: me.name, color: me.cursorColor, line, col, lang, tabId: activeTab };
    channelRef.current?.send({ type: "broadcast", event: "cursor", payload });
    new BroadcastChannel("ckc_os_sync").postMessage({ type: "cursor", payload });

    try {
      if (!me.id.startsWith("guest_")) {
        await supabase.from("line_locks").delete().eq("user_id", me.id);
        await supabase.from("line_locks").insert({ document_id: lang, line_number: line, user_id: me.id, user_name: me.name, color: me.cursorColor });
      }
    } catch (err) { console.error("Lock error:", err); }
  }, [lang, me, instanceId, activeTab]);

  const switchLang = useCallback(lk => {
    if (activeTab) { const txt = activeEditorRef.current?._getText() || ""; setTabs(p => p.map(t => t.id === activeTab ? { ...t, code: txt } : t)); }
    setLang(lk); setLiveValidation(null);
  }, [activeTab]);

  const triggerError = useCallback((msg, cLang) => {
    setErrPopup({ msg, lang: cLang }); setErrShake(true); setTimeout(() => setErrShake(false), 400);
  }, []);

  const handleRun = useCallback(async () => {
    setRunning(true); setOutOpen(true); setOutTab("output"); setErrPopup(null);
    const currentTab = tabs.find(t => t.id === activeTab);
    const cLang = currentTab?.lang || lang;
    let code = activeEditorRef.current?._getText?.() || "";
    if (!code.trim()) code = getEng(cLang).text;
    setOutput(`⟳  Validating ${LANGS[cLang]?.n || cLang} syntax…`);
    setOutIsErr(false);
    try {
      const result = await validateAndRun(cLang, code, pyReady, setPyReady);
      setOutput(result.output || (result.hasError ? "" : "(no output)"));
      setOutIsErr(result.hasError);
      if (result.hasError && result.errorMsg) triggerError(result.errorMsg, cLang);
    } catch (e) {
      const msg = "Execution Error: " + e.message;
      setOutput(msg); setOutIsErr(true); triggerError(msg, cLang);
    }
    setRunning(false);
  }, [lang, activeTab, tabs, getEng, pyReady, triggerError]);

  const createNewEditor = useCallback(() => {
    const id = "new-" + Date.now();
    const ext = LANGS[newEdLang]?.ext?.split(".")[1] || newEdLang;
    const shortName = me.name ? me.name.split(" ")[0].toLowerCase() : "user";
    const newTab = { id, name: `scratch-${shortName}.${ext}`, lang: newEdLang, dirty: false, isNew: true, code: "" };
    setTabs(p => [...p, newTab]);
    setActiveTab(id); switchLang(newEdLang);
    toast(`New ${LANGS[newEdLang]?.n} editor opened`);
    const payload = { uid: me.id, instanceId, name: me.name, tab: newTab };
    channelRef.current?.send({ type: "broadcast", event: "tabSync", payload });
    new BroadcastChannel("ckc_os_sync").postMessage({ type: "tabSync", payload });
  }, [newEdLang, switchLang, toast, me.id, me.name, instanceId]);

  const CMDS = [
    { ic: "▶", lb: "Run Code", kb: "Ctrl+Enter", fn: handleRun },
    { ic: "📄", lb: "New Editor", kb: "Ctrl+N", fn: createNewEditor },
    { ic: "💾", lb: "Save All", kb: "Ctrl+K S", fn: () => { setTabs(p => p.map(t => ({ ...t, dirty: false }))); toast("All files saved"); } },
    { ic: "🐛", lb: "Open Debugging Room", kb: "", fn: () => setShowDebugRoom(true) },
    { ic: "📡", lb: "Open Server Logs", kb: "", fn: () => setShowServerLogs(true) },
    { ic: "◈", lb: "Analyze with Knowledge Graph", kb: "", fn: () => { setKnowledgeCode(activeEditorRef.current?._getText?.() || ""); setOutOpen(true); setOutTab("knowledge"); } },
    { ic: "🚪", lb: "Sign Out", kb: "", fn: onLogout },
    ...LK.map(lk => ({ ic: LANGS[lk].ic, lb: `Switch to ${LANGS[lk].n}`, kb: "", fn: () => { switchLang(lk); setCmdOpen(false); } })),
  ];
  const filtCmds = cmdQ.replace(/^>/, "").trim() ? CMDS.filter(c => c.lb.toLowerCase().includes(cmdQ.replace(/^>/, "").trim().toLowerCase())) : CMDS;
  const runCmd = c => { c.fn(); setCmdOpen(false); setCmdQ(""); };

  useEffect(() => {
    const h = e => {
      const C = e.ctrlKey || e.metaKey;
      if (C && e.shiftKey && e.key === "P") { e.preventDefault(); setCmdOpen(o => !o); setCmdQ(""); }
      if (C && e.key === "Enter") { e.preventDefault(); handleRun(); }
      if (C && e.key === "n") { e.preventDefault(); createNewEditor(); }
      if (e.key === "Escape") { setCmdOpen(false); setErrPopup(null); setShowDebugRoom(false); setShowServerLogs(false); setMobileSidebarOpen(false); }
      if (cmdOpen) {
        if (e.key === "ArrowDown") { e.preventDefault(); setCmdSel(s => Math.min(s + 1, filtCmds.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setCmdSel(s => Math.max(s - 1, 0)); }
        if (e.key === "Enter") { e.preventDefault(); runCmd(filtCmds[cmdSel]); }
      }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [cmdOpen, cmdSel, handleRun, createNewEditor, filtCmds]);

  const closeTab = (id, e) => {
    e.stopPropagation();
    setTabs(p => { const nx = p.filter(t => t.id !== id); if (activeTab === id && nx.length) setActiveTab(nx[nx.length - 1].id); return nx; });
  };

  const activeCursors = cursors.filter(c => c.lang === lang && c.tabId === activeTab);
  const curEng = getEng(lang);
  const curTab = tabs.find(t => t.id === activeTab);
  const errCount = liveValidation?.errors?.length || 0;
  const warnCount = liveValidation?.warnings?.length || 0;

  const renderOutput = (text) => {
    if (!text) return <div className="ol-dim" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>Press ▶ Run or Ctrl+Enter to execute</div>;
    return text.split("\n").map((line, i) => {
      let cls = "ol-info";
      if (/^❌/.test(line)) cls = "ol-err";
      else if (/^⚠/.test(line)) cls = "ol-warn";
      else if (/^\s*✖/.test(line)) cls = "ol-err";
      else if (/^✓|^✅/.test(line)) cls = "ol-ok";
      else if (/^(⟳|Compiled:|Compiling|Finished|Running|go build|g\+\+)/.test(line)) cls = "ol-build";
      else if (/^(traceback)/i.test(line.trim())) cls = "ol-warn";
      else if (/^(\w+error|\w+exception|syntaxerror)/i.test(line.trim())) cls = "ol-err";
      else if (/^(error(\[e\d+\])?:|sql error|compilation failed|fatal error)/i.test(line.trim())) cls = "ol-err";
      else if (/^warning/i.test(line.trim())) cls = "ol-warn";
      else if (line.startsWith("  File ") || /^\s+\^\s*$/.test(line)) cls = "ol-tb";
      else if (/^Process finished with exit code 0/.test(line)) cls = "ol-success";
      else if (/Query OK|row(s)? in set|row(s)? affected|Database changed/i.test(line)) cls = "ol-success";
      else if (/Fix the error/i.test(line)) cls = "ol-dim";
      return <div key={i} className={cls} style={{ fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.8 }}>{line || "\u00A0"}</div>;
    });
  };

  const renderValBadge = () => {
    if (!liveValidation) return null;
    if (liveValidation.hasError) return <div className="val-fail val-pop">⊗ {liveValidation.errors.length} error{liveValidation.errors.length > 1 ? "s" : ""}</div>;
    if (liveValidation.hasWarning) return <div className="val-warn val-pop">⚠ {liveValidation.warnings.length} warning{liveValidation.warnings.length > 1 ? "s" : ""}</div>;
    return <div className="val-pass val-pop">✓ Valid</div>;
  };

  const SB = ({ children, c, onClick }) => <span className="st" style={{ color: c || "#4a5568" }} onClick={onClick}>{children}</span>;

  // ── Sidebar content (reused for both desktop sidebar and mobile drawer) ──
  const SidebarContent = () => (
    <>
      <div className="sec-hdr">Explorer</div>
      {[{ id: "f_eng", name: "engine.ts", lang: "ts", icon: "🔷" }, { id: "f_rm", name: "README.md", lang: "md", icon: "📄" }, { id: "f_dir", name: "tests/", type: "d", icon: "📁" }, { id: "f_env", name: ".env", lang: "env", icon: "⚙" }].map(f => (
        <div key={f.id} className={`ft${activeTab === f.id ? " sel" : ""}`} onClick={() => {
          if (f.type === "d") { toast("tests/ folder"); setMobileSidebarOpen(false); return; }
          const lk = f.lang && LANGS[f.lang] ? f.lang : "ts";
          if (!tabs.find(t => t.id === f.id)) setTabs(p => [...p, { id: f.id, name: f.name, lang: lk, dirty: false, isNew: false }]);
          setActiveTab(f.id); switchLang(lk); setMobileSidebarOpen(false);
        }}>
          <span style={{ fontSize: 12, flexShrink: 0 }}>{f.icon}</span>
          <span style={{ color: activeTab === f.id ? "#4FC1FF" : "#c0c8d8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", fontSize: 12 }}>{f.name}</span>
          {f.lang && LANGS[f.lang] && <span style={{ fontSize: 9, fontWeight: 700, color: LANGS[f.lang]?.c, fontFamily: "var(--mono)", flexShrink: 0 }}>{LANGS[f.lang]?.ic}</span>}
        </div>
      ))}
      {tabs.filter(t => t.isNew).map(t => (
        <div key={t.id} className={`ft${activeTab === t.id ? " sel" : ""}`} onClick={() => { setActiveTab(t.id); switchLang(t.lang); setMobileSidebarOpen(false); }}>
          <span className="new-tab-dot" style={{ flexShrink: 0 }} />
          <span style={{ color: "#4EC9B0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", fontSize: 12 }}>{t.name}</span>
        </div>
      ))}
      <div className="divider" />
      <div className="sec-hdr" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Collaborators</span>
        <span style={{ color: "#4EC9B0", fontSize: 9, fontWeight: 700, background: "rgba(78,201,176,.12)", border: "1px solid rgba(78,201,176,.2)", borderRadius: 10, padding: "1px 6px" }}>{connectedCount} online</span>
      </div>
      <div className="presence-card">
        <div className="presence-av" style={{ background: me.bg, color: me.color, borderColor: me.color + "66" }}>
          {me.inits}<div className="pdot" style={{ background: "#4EC9B0" }} />
        </div>
        <div className="presence-info">
          <div className="presence-name"><span style={{ color: "#e0e0e0" }}>{me.name}</span><span style={{ fontSize: 9, color: "#4a5568", background: "rgba(255,255,255,.05)", padding: "1px 5px", borderRadius: 4 }}>you</span></div>
          <div className="presence-pos" style={{ color: me.color }}>Ln {cursor.line} · Col {cursor.col}</div>
        </div>
      </div>
      {cursors.filter(c => c.id !== me.id).map((b, i) => (
        <div key={i} className="presence-card">
          <div className="presence-av" style={{ background: b.bg || "rgba(255,255,255,.05)", color: b.color, borderColor: b.color + "66" }}>
            {initials(b.name)}<div className="pdot" style={{ background: "#4EC9B0" }} />
          </div>
          <div className="presence-info">
            <div className="presence-name" style={{ color: "#c0c8d8" }}>{b.name}</div>
            <div className="presence-pos" style={{ color: b.color }}>Ln {b.line} · Col {b.col}</div>
          </div>
        </div>
      ))}
      <div className="divider" />
      <div style={{ padding: "8px 12px" }}>
        <div style={{ fontSize: 10, color: "#4a5568", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>Session</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a7585", lineHeight: 1.8 }}>
          <div>ID: <span style={{ color: "#4FC1FF" }}>{sid.slice(0, 8)}</span></div>
          <div>Ops: <span style={{ color: "#4EC9B0" }}>{opCnt}</span></div>
          <div>Ver: <span style={{ color: "#DCDCAA" }}>v{curEng.version}</span></div>
          <div>Size: <span style={{ color: "#CE9178" }}>{curEng.text.length}ch</span></div>
        </div>
      </div>
      <div className="divider" />
      <div style={{ padding: "0 8px 8px" }}>
        <div style={{ fontSize: 10, color: "#4a5568", marginBottom: 5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>Tools</div>
        <div onClick={() => { setShowDebugRoom(true); setMobileSidebarOpen(false); }} className="tool-btn dbg" style={{ marginBottom: 5, padding: "7px 10px", width: "100%" }}>
          <span>🔬</span> Debugging Room {errCount + warnCount > 0 && <span className="dbg-cnt">{errCount + warnCount}</span>}
        </div>
        <div onClick={() => { setShowServerLogs(true); setMobileSidebarOpen(false); }} className="tool-btn logs" style={{ padding: "7px 10px", width: "100%" }}>
          <span>📡</span> Server Logs Dashboard
        </div>
        <div onClick={onLogout} className="tool-btn" style={{ padding: "7px 10px", width: "100%", marginTop: 5, color: "#ff5555", background: "rgba(255,75,75,.08)", border: "1px solid rgba(255,75,75,.2)" }}>
          <span>🚪</span> Logout Session
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <ErrorPopup error={errPopup?.msg || null} lang={errPopup?.lang || lang} onClose={() => setErrPopup(null)} onOpenOutput={() => { setOutOpen(true); setOutTab("output"); }} />
      {showDebugRoom && <DebuggingRoom errors={liveValidation?.errors || []} warnings={liveValidation?.warnings || []} lang={lang} me={me} onLocalOp={handleLocalOp} onClose={() => setShowDebugRoom(false)} />}
      {showServerLogs && <LiveServerLogs onClose={() => setShowServerLogs(false)} />}

      <div className="topbar">
        <div className="tb-logo"><div className="gem">⚡</div><span>CKC-OS</span></div>
        <div className="live-badge"><div className="live-dot" />LIVE · {connectedCount}</div>
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,.06)", margin: "0 4px" }} className="divider-v" />
        
        <div onClick={() => setShowDebugRoom(true)} className="tool-btn dbg topbar-btn" style={{ marginLeft: 4 }}>
          <span>🔬</span> Debug Room {errCount + warnCount > 0 && <span className="dbg-cnt">{errCount + warnCount}</span>}
        </div>
        <div onClick={() => setShowServerLogs(true)} className="tool-btn logs topbar-btn" style={{ marginLeft: 4 }}>
          <span>📡</span> Server Logs
        </div>
        <div onClick={() => { 
          setKnowledgeCode(activeEditorRef.current?._getText?.() || "");
          setOutOpen(true); 
          setOutTab("knowledge"); 
        }} className="tool-btn logs topbar-btn" style={{ marginLeft: 4, background: "rgba(124,111,247,.12)", borderColor: "rgba(124,111,247,.3)", color: "#7c6ff7" }}>
          <span>◈</span> Knowledge Graph
        </div>

        <div style={{ flex: 1 }} />
        <div className="lang-switcher-row" style={{ display: "flex", gap: 3 }}>
          {LK.map(lk => (
            <div key={lk} className={`lp${lang === lk ? " on" : ""}`} style={{ color: LANGS[lk].c, background: lang === lk ? LANGS[lk].bg : "transparent" }} onClick={() => switchLang(lk)}>
              <span>{LANGS[lk].ic}</span><span>{LANGS[lk].n}</span>
            </div>
          ))}
        </div>
        <div className="av-group" style={{ display: "flex", alignItems: "center", gap: -5, marginLeft: 8 }}>
          {cursors.map((b, i) => (
            <div key={i} className={`av${b.id === me.id ? " me" : ""}`} style={{ background: b.bg || "rgba(255,255,255,.05)", color: b.color, border: `2px solid ${b.color}44`, marginLeft: i > 0 ? -8 : 0 }} title={b.name}>
              {initials(b.name)}<div className="online-dot" style={{ background: "#4EC9B0" }} />
            </div>
          ))}
        </div>
        <div className="new-ed-row" style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          <select value={newEdLang} onChange={e => setNewEdLang(e.target.value)} className="new-ed-select" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 5, color: "#8892a4", fontSize: 10, padding: "2px 4px", outline: "none" }}>
            {LK.map(lk => <option key={lk} value={lk}>{LANGS[lk].n}</option>)}
          </select>
          <button className="new-ed-btn" onClick={createNewEditor}>+ New</button>
        </div>
        <button className={`run-btn${running ? " running" : ""}`} onClick={handleRun} disabled={running} style={{ marginLeft: 8 }}>
          {running ? <span className="spin" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "1.5px solid currentColor", borderTopColor: "transparent" }} /> : "▶"}
          <span>{running ? "Running…" : "Run"}</span>
        </button>
        <button onClick={onLogout} style={{ padding: "5px 12px", borderRadius: 6, background: "rgba(255,75,75,.12)", border: "1px solid rgba(255,75,75,.3)", color: "#ff6b9d", cursor: "pointer", fontSize: 11, fontFamily: "Inter,sans-serif", fontWeight: 600, whiteSpace: "nowrap", marginLeft: 12, display: "flex", alignItems: "center", gap: 6, transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.background="rgba(255,75,75,.2)"; }} onMouseLeave={e => { e.currentTarget.style.background="rgba(255,75,75,.12)"; }}>
          <span style={{ fontSize: 12 }}>🚪</span> Logout
        </button>
      </div>


      <div style={{ display: "flex", height: "calc(100vh - var(--topbar-h))", overflow: "hidden" }} className="main-layout">
        <div className="sidebar"><SidebarContent /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }} className="editor-main-area">
          <div style={{ display: "flex", background: "var(--bg3)", height: 36, flexShrink: 0, overflowX: "auto", overflowY: "hidden", alignItems: "flex-end", borderBottom: "1px solid var(--bdr)" }}>
            {tabs.map(t => {
              const tl = LANGS[t.lang] || LANGS.ts;
              return (
                <div key={t.id} className={`tab${activeTab === t.id ? " on" : " off"}`} onClick={() => { setActiveTab(t.id); setLang(t.lang); }} style={{ borderBottomColor: activeTab === t.id ? tl.c : "transparent" }}>
                  <span style={{ color: tl.c, fontSize: 10 }}>{tl.ic}</span>
                  <span style={{ color: activeTab === t.id ? "#fff" : "#8892a4" }}>{t.name}</span>
                  <div className="tx" onClick={e => closeTab(t.id, e)}>✕</div>
                </div>
              );
            })}
          </div>
          <div className="bc">
            <span>CKC-OS</span><span>›</span><span>workspace</span><span>›</span>
            <span style={{ color: "#fff" }}>{curTab?.name || "engine.ts"}</span>
            <div style={{ flex: 1 }} />
            {renderValBadge()}
          </div>
          <div style={{ flex: 1, overflow: "hidden", background: "#0d0f14" }} className={errShake ? "err-shake" : ""}>
            <CMEditor
              ref={activeEditorRef}
              lang={lang}
              fileKey={activeTab}
              initText={curTab?.code || getEng(lang).text}
              onLocalOp={handleLocalOp}
              onCursorMove={handleCursorMove}
              cursors={activeCursors}
              lineLocks={lineLocks}
              myId={me.id}
            />
          </div>
          <div className="out-panel" style={{ height: outOpen ? (outTab === "knowledge" ? 450 : 220) : 32 }}>
            <div className="out-hdr">
              <div className={`out-tab${outTab === "output" ? " on" : ""}`} onClick={() => { setOutOpen(true); setOutTab("output"); }}><span>▣</span> Output</div>
              <div className={`out-tab${outTab === "problems" ? " on" : ""}`} onClick={() => { setOutOpen(true); setOutTab("problems"); }}>
                <span>⚠</span> Problems {errCount > 0 && <span style={{ background: "#FF6B9D", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 9 }}>{errCount}</span>}
              </div>
              <div className={`out-tab${outTab === "knowledge" ? " on" : ""}`} onClick={() => { 
                setKnowledgeCode(activeEditorRef.current?._getText?.() || "");
                setOutOpen(true); 
                setOutTab("knowledge"); 
              }}>
                <span>◈</span> Knowledge Graph
              </div>
              <div style={{ flex: 1, height: "100%", cursor: "pointer" }} onClick={() => setOutOpen(!outOpen)} />
              <button onClick={() => setOutOpen(!outOpen)} style={{ background: "transparent", border: "none", color: "#4a5568", padding: "0 10px", cursor: "pointer", fontSize: 10 }}>{outOpen ? "▼" : "▲"}</button>
            </div>
            {outOpen && (
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", background: "#080a0d" }}>
                {outTab === "output" ? renderOutput(output) : (
                  outTab === "problems" ? (
                    liveValidation?.errors.length ? liveValidation.errors.map((e, i) => <div key={i} style={{ color: "#ff8090", fontFamily: "var(--mono)", fontSize: 11, marginBottom: 4 }}>✖ {e}</div>) : <div style={{ color: "#4EC9B0", fontSize: 11 }}>✓ No problems detected</div>
                  ) : (
                    <KnowledgeGraphEngine isEmbedded={true} initialCode={knowledgeCode} />
                  )
                )}
              </div>
            )}
          </div>
        </div>
        <div className="right-panel">
          <div style={{ display: "flex", borderBottom: "1px solid var(--bdr)", flexShrink: 0, background: "var(--bg3)" }}>
            {[["crdt", "OT/CRDT"], ["ws", "WS Log"]].map(([id, lb]) => (
              <div key={id} className={`rp-tab${rpTab === id ? " on" : ""}`} onClick={() => setRpTab(id)} style={{ flex: 1, textAlign: "center" }}>{lb}</div>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {rpTab === "crdt" ? (
              crdt.length ? crdt.map((o, i) => (
                <div key={i} className={`op-card ${o.type}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <span className={`op-badge ${o.type}`}>{o.type.toUpperCase()}</span>
                    <span style={{ fontSize: 9, color: "#4a5568", fontFamily: "var(--mono)" }}>{o.from} · {o.t}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#e0e0e0", fontFamily: "var(--mono)", wordBreak: "break-all" }}>
                    {o.type === "insert" ? `"${o.chars}" at ${o.pos}` : `len ${o.len} from ${o.pos}`}
                  </div>
                </div>
              )) : <div style={{ padding: "20px", textAlign: "center", color: "#4a5568", fontSize: 11 }}>Waiting for ops..</div>
            ) : (
              wsLog.map((l, i) => <div key={i} className={`ws-entry ${l.type}`}>[{l.t}] {l.msg}</div>)
            )}
          </div>
        </div>
      </div>

      <div className="statusbar">
        <SB c="#4EC9B0">⬡ {connectedCount} online</SB>
        <SB c={errCount > 0 ? "#FF6B9D" : "#4a5568"} onClick={() => { setOutOpen(true); setOutTab("problems"); }}>⊗ {errCount} · ⚠ {warnCount}</SB>
        <SB c="#4FC1FF">OT v{curEng.version}</SB>
        <div style={{ flex: 1 }} />
        <SB onClick={() => setShowDebugRoom(true)} c="#FF6B9D" className="sb-tool">🔬 Debug Room</SB>
        <SB onClick={() => setShowServerLogs(true)} c="#4FC1FF" className="sb-tool">📡 Server Logs</SB>
        <SB>Ln {cursor.line}, Col {cursor.col}</SB>
        <SB>UTF-8</SB>
        <SB c="#4EC9B0">⬡ Live</SB>
        <SB c="#4FC1FF">CKC-OS v4.2</SB>
      </div>


      <div className="mobile-bottom-bar">
        <button className={`mbb-btn${mobilePanelTab === "editor" ? " active" : ""}`} onClick={() => setMobilePanelTab("editor")}>
          <span className="mbb-icon">📝</span><span>Editor</span>
        </button>
        <button className="mbb-btn" onClick={() => setMobileSidebarOpen(true)}>
          <span className="mbb-icon">📁</span><span>Files</span>
        </button>
        <button className={`mbb-btn${mobilePanelTab === "output" ? " active" : ""}`} onClick={() => { setMobilePanelTab("output"); setOutOpen(true); }}>
          <span className="mbb-icon">▣</span><span>Output</span>
        </button>
        <button className="mbb-btn" onClick={() => setShowServerLogs(true)}>
          <span className="mbb-icon">📡</span><span>Logs</span>
        </button>
      </div>

      <div className={`mobile-sidebar-overlay${mobileSidebarOpen ? " open" : ""}`} style={{ display: mobileSidebarOpen ? "block" : "none" }} onClick={() => setMobileSidebarOpen(false)} />
      <div className={`mobile-sidebar-drawer${mobileSidebarOpen ? " open" : ""}`}><SidebarContent /></div>

      {cmdOpen && (
        <div className="cp-ov" onClick={() => setCmdOpen(false)}>
          <div className="cp-box fi" onClick={e => e.stopPropagation()}>
            <input autoFocus className="cp-in" value={cmdQ} onChange={e => { setCmdQ(e.target.value); setCmdSel(0); }} placeholder="> Run, debug room, server logs, switch language…" />
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtCmds.map((c, i) => (
                <div key={i} className={`cp-row${cmdSel === i ? " hi" : ""}`} onMouseEnter={() => setCmdSel(i)} onClick={() => runCmd(c)}>
                  <span style={{ fontSize: 14 }}>{c.ic}</span><span style={{ flex: 1 }}>{c.lb}</span>
                  {c.kb && <span style={{ fontSize: 10, color: "#4a5568", fontFamily: "var(--mono)" }}>{c.kb}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {notif && <div className="toast">{notif}</div>}
    </>
  );
}