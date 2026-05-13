import { useState, useRef, useCallback, useEffect, forwardRef } from "react";

// ═══════════ AUTH STORE ═══════════
export const authStore = {
  get: () => { try { return JSON.parse(sessionStorage.getItem("ckc_s") || "null"); } catch { return null; } },
  set: (v) => sessionStorage.setItem("ckc_s", JSON.stringify(v)),
  clear: () => sessionStorage.removeItem("ckc_s"),
};

// ═══════════ CONSTANTS ═══════════
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

// ═══════════ HELPERS ═══════════
export function initials(n) { return n.split(" ").map(w => w[0] || "").join("").toUpperCase().slice(0, 2) || "?"; }
function nowTs() { return new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
export function genSid() {
  const c = "abcdefghjkmnpqrstuvwxyz0123456789";
  const s = () => Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join("");
  return s() + "-" + s();
}

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
      if (!inStr && ch === "/" && code[i + 1] === "/") { inLineComment = true; continue; }
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
    if (tripleDouble % 2 !== 0) errors.push(`SyntaxError: Unterminated triple-quoted string (\"\"\")`);
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
  if (stderr && !hasError) output += (output ? "\n" : "") + stderr;
  if (hasError) output += (output ? "\n" : "") + errorMsg;
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
    resolve({ output: out.join("\n") || (hasError ? "" : "(no output)"), hasError, errorMsg });
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
        outputs.push(m[1].replace(/\{\}/g, "[value]").replace(/\{:\??\}/g, "[debug]"));
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
      if (/^\s*--/.test(stmt)) return;
      if (/CREATE DATABASE/i.test(upper)) outputs.push(`Query OK, 1 row affected`);
      else if (/CREATE TABLE/i.test(upper)) {
        const m = stmt.match(/CREATE TABLE\s+(\w+)/i);
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

  return { output: outputs.join("\n"), hasError: false };
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
      result = { ...result, output: validation.output + "\n\n" + result.output };
    }
  } else {
    await new Promise(r => setTimeout(r, 350));
    result = simulateCompiled(lang, code);
    if (validation.hasWarning) {
      result = { ...result, output: validation.output + "\n\n" + result.output };
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

// ═══════════ MOCK WEBSOCKET SERVER ═══════════
class MockWS {
  constructor() { this.clients = new Map(); this.engines = new Map(); this.log = []; this.onLog = null; }
  eng(lang) { if (!this.engines.has(lang)) this.engines.set(lang, new OTEngine(STARTERS[lang] || "")); return this.engines.get(lang); }
  connect(id, name, color, onMsg) {
    this.clients.set(id, { name, color, send: onMsg });
    this._bcast({ type: "presence", id, name, color, online: true }, id);
    this._log("←", `join:${name}`);
    return () => { this.clients.delete(id); this._bcast({ type: "presence", id, online: false }, id); };
  }
  send(cid, msg) {
    const m = typeof msg === "string" ? JSON.parse(msg) : msg;
    if (m.type === "op") { const e = this.eng(m.lang); const r = e.apply({ ...m.op, uid: cid }); if (r) { this._bcast({ type: "op", lang: m.lang, op: r, ver: e.version }, cid); this._log("←", `op:${r.type}@${r.pos}`); } }
    else if (m.type === "cursor") { this._bcast({ type: "cursor", id: cid, ...m }, cid); }
    else if (m.type === "sync") { const e = this.eng(m.lang); this.clients.get(cid)?.send({ type: "sync", lang: m.lang, text: e.text, ver: e.version }); }
  }
  _bcast(msg, ex) { this.clients.forEach((c, id) => { if (id !== ex) c.send(msg); }); }
  _log(dir, msg) { this.log.unshift({ dir, msg, t: nowTs() }); if (this.log.length > 80) this.log.pop(); this.onLog?.([...this.log]); }
}
const WS = new MockWS();

// ═══════════ BOTS ═══════════
export const BOTS = [
  { name: "Aria K.", inits: "AK", color: "#FF6B9D", bg: "rgba(255,107,157,.18)" },
  { name: "Dev M.", inits: "DM", color: "#4EC9B0", bg: "rgba(78,201,176,.18)" },
  { name: "Sam T.", inits: "ST", color: "#DCDCAA", bg: "rgba(220,220,170,.18)" },
];
const SNIPS = {
  ts: ["  // adaptive\n", "  return null;\n", "  await this.emit("],
  js: ["  // todo\n", "  return;\n", "  console.log("],
  py: ["    pass\n", "    return None\n", "    print(f\""],
  java: [";\n", "    return null;\n", "    System.out.println("],
  cpp: [";\n", "    return 0;", "    std::cout << "],
  rs: ["\n    Ok(())", "    None\n", "    let mut "],
  go: ["\n\treturn\n", "\tfmt.Println("],
  sql: ["\nWHERE ", "AND ", "ORDER BY "],
};

// ═══════════════════════════════════════════════════════
// ══════ 5.2 REAL-TIME DEBUGGING ROOM ENGINE ════════════
// ═══════════════════════════════════════════════════════

const DEBUG_BOT_NAMES = ["Aria K.", "Dev M.", "Sam T."];

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

// ═══════════════════════════════════════════════════════
// ════════ 5.3 LIVE SERVER LOGS ENGINE ══════════════════
// ═══════════════════════════════════════════════════════

const LOG_LEVELS = ["INFO", "WARN", "ERROR", "DEBUG", "SUCCESS"];
const LOG_SERVICES = ["api-gateway", "db-pool", "auth-svc", "cache", "ws-server", "scheduler"];

const LOG_TEMPLATES = [
  { level: "INFO",    svc: "api-gateway",  msg: "GET /api/status 200 12ms" },
  { level: "INFO",    svc: "ws-server",    msg: "Client connected [id: {id}]" },
  { level: "INFO",    svc: "db-pool",      msg: "Query executed in {n}ms — rows: {r}" },
  { level: "SUCCESS", svc: "auth-svc",     msg: "Token validated for user:{id}" },
  { level: "INFO",    svc: "cache",        msg: "HIT ratio: {n}% — evictions: {r}" },
  { level: "DEBUG",   svc: "scheduler",    msg: "Job run:{id} queued (next: {n}s)" },
  { level: "WARN",    svc: "api-gateway",  msg: "Rate limit approaching — {n} req/s" },
  { level: "WARN",    svc: "db-pool",      msg: "Slow query detected: {n}ms" },
  { level: "ERROR",   svc: "api-gateway",  msg: "POST /api/ingest 500 — timeout after {n}ms" },
  { level: "ERROR",   svc: "auth-svc",     msg: "Invalid token — revoked session:{id}" },
  { level: "ERROR",   svc: "db-pool",      msg: "Connection pool exhausted — {n} waiting" },
  { level: "INFO",    svc: "ws-server",    msg: "OT op broadcast — ver:{n} clients:{r}" },
  { level: "SUCCESS", svc: "cache",        msg: "Cache warmed — {n} keys loaded" },
  { level: "DEBUG",   svc: "scheduler",    msg: "Health check OK — uptime {n}s" },
];

function genLogEntry() {
  const t = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
  const id = Math.random().toString(36).slice(2, 7);
  const n = Math.floor(Math.random() * 900 + 10);
  const r = Math.floor(Math.random() * 200 + 1);
  const msg = t.msg.replace(/\{id\}/g, id).replace(/\{n\}/g, n).replace(/\{r\}/g, r);
  return { level: t.level, svc: t.svc, msg, t: nowTs(), id: Math.random().toString(36).slice(2) };
}

// ═══════════ CSS (original + new additions) ═══════════
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

/* ── TOPBAR ── */
.topbar{height:46px;background:var(--bg2);border-bottom:1px solid var(--bdr);display:flex;align-items:center;padding:0 10px;gap:6px;flex-shrink:0;}
.tb-logo{display:flex;align-items:center;gap:6px;font-weight:700;font-size:.88rem;color:#fff;padding:0 6px;white-space:nowrap;}
.gem{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#4FC1FF,#4EC9B0);display:flex;align-items:center;justify-content:center;font-size:11px;}
.lp{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:5px;cursor:pointer;font-family:var(--mono);font-size:11px;font-weight:700;border:1px solid transparent;transition:all .12s;white-space:nowrap;}
.lp:hover{background:rgba(255,255,255,.06);}
.lp.on{border-color:rgba(255,255,255,.15);}
.dbg-badge{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:5px;background:rgba(255,107,157,.12);border:1px solid rgba(255,107,157,.25);color:#FF6B9D;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;flex-shrink:0;}
.dbg-badge:hover{background:rgba(255,107,157,.2);}
.dbg-cnt{background:#FF6B9D;color:#fff;border-radius:10px;padding:0 5px;font-size:10px;}
.av{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--mono);border:2px solid transparent;transition:all .15s;flex-shrink:0;position:relative;}
.av:hover{transform:translateY(-2px);z-index:2;}
.av.me{border-color:rgba(255,255,255,.4);}
.av .online-dot{position:absolute;bottom:-2px;right:-2px;width:7px;height:7px;border-radius:50%;border:1.5px solid var(--bg2);}
.new-ed-btn{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:6px;background:rgba(79,193,255,.12);border:1px solid rgba(79,193,255,.3);color:#4FC1FF;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.new-ed-btn:hover{background:rgba(79,193,255,.2);}
.run-btn{display:flex;align-items:center;gap:5px;padding:5px 14px;border-radius:5px;background:rgba(78,201,176,.15);border:1px solid rgba(78,201,176,.35);color:#4EC9B0;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;white-space:nowrap;}
.run-btn:hover{background:rgba(78,201,176,.25);border-color:#4EC9B0;}
.run-btn.running{background:rgba(255,107,157,.12);border-color:rgba(255,107,157,.35);color:#FF6B9D;}
.run-btn:disabled{opacity:.5;cursor:not-allowed;}

/* ── SIDEBAR ── */
.sidebar{width:240px;background:var(--bg2);border-right:1px solid var(--bdr);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;}
.sec-hdr{padding:10px 12px 5px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--txt3);}
.ft{display:flex;align-items:center;gap:7px;height:26px;cursor:pointer;padding:0 10px;font-size:12px;white-space:nowrap;border-radius:4px;margin:0 4px 1px;}
.ft:hover{background:rgba(255,255,255,.05);}
.ft.sel{background:var(--sel);}

/* ── PRESENCE CARDS ── */
.presence-card{display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:6px;margin:0 4px 2px;transition:background .15s;cursor:default;}
.presence-card:hover{background:rgba(255,255,255,.04);}
.presence-av{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:var(--mono);flex-shrink:0;border:2px solid transparent;position:relative;}
.presence-av .pdot{position:absolute;bottom:-2px;right:-2px;width:8px;height:8px;border-radius:50%;border:2px solid var(--bg2);}
.presence-info{flex:1;min-width:0;}
.presence-name{font-size:12px;color:#e0e0e0;font-weight:500;display:flex;align-items:center;gap:5px;}
.presence-pos{font-size:10px;margin-top:1px;}
.presence-typing{display:flex;align-items:center;gap:3px;}
.typing-dot{width:4px;height:4px;border-radius:50%;display:inline-block;}

/* ── TABS ── */
.tab{display:flex;align-items:center;gap:5px;padding:0 12px 0 14px;height:36px;border-right:1px solid var(--bdr2);cursor:pointer;font-size:12px;white-space:nowrap;flex-shrink:0;max-width:180px;position:relative;font-family:var(--mono);}
.tab.on{background:var(--bg);border-bottom:2px solid var(--blue);color:#e0e0e0;}
.tab.off{background:var(--bg3);color:var(--txt2);}
.tab:hover .tx{opacity:1;}
.tx{opacity:0;width:14px;height:14px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:11px;margin-left:auto;flex-shrink:0;color:var(--txt2);}
.tx:hover{background:rgba(255,255,255,.1);color:#fff;}

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
.statusbar{height:24px;background:#080a0d;border-top:1px solid var(--bdr);display:flex;align-items:center;padding:0 4px;flex-shrink:0;font-size:11px;color:var(--txt2);font-family:var(--mono);}
.st{display:flex;align-items:padding:0 8px;height:100%;cursor:pointer;gap:4px;white-space:nowrap;transition:background .1s;align-items:center;padding:0 8px;}
.st:hover{background:rgba(255,255,255,.05);}
.divider{height:1px;background:var(--bdr);margin:5px 0;}
.mm{width:52px;background:#0a0c10;border-left:1px solid var(--bdr2);flex-shrink:0;overflow:hidden;position:relative;opacity:.6;}
.py-badge{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;white-space:nowrap;flex-shrink:0;}
.new-tab-dot{width:6px;height:6px;border-radius:50%;background:#4EC9B0;box-shadow:0 0 6px #4EC9B0;display:inline-block;}

/* ── LIVE BADGE ── */
.live-badge{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(78,201,176,.08);border:1px solid rgba(78,201,176,.2);font-size:10px;font-weight:700;color:#4EC9B0;letter-spacing:.06em;white-space:nowrap;}
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
.val-pass{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(78,201,176,.08);border:1px solid rgba(78,201,176,.2);font-size:10px;font-weight:700;color:#4EC9B0;}
.val-fail{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(255,107,157,.1);border:1px solid rgba(255,107,157,.25);font-size:10px;font-weight:700;color:#FF6B9D;}
.val-warn{display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;background:rgba(220,220,170,.08);border:1px solid rgba(220,220,170,.2);font-size:10px;font-weight:700;color:#DCDCAA;}

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

/* ══════════════════════════════════════════════════ */
/* ═══════ 5.2 DEBUGGING ROOM STYLES ═══════════════ */
/* ══════════════════════════════════════════════════ */
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
.dbg-msg-bubble.annotation{background:rgba(220,220,170,.07);border-color:rgba(220,220,170,.2);}
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

/* ══════════════════════════════════════════════════ */
/* ═══════ 5.3 LIVE SERVER LOGS STYLES ═════════════ */
/* ══════════════════════════════════════════════════ */
.logs-overlay{position:fixed;inset:0;z-index:860;display:flex;align-items:center;justify-content:center;background:rgba(5,7,12,.82);backdrop-filter:blur(4px);}
.logs-panel{width:860px;max-width:calc(100vw - 24px);height:calc(100vh - 80px);background:#0a0c11;border:1.5px solid rgba(79,193,255,.25);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 0 0 1px rgba(79,193,255,.07),0 32px 80px rgba(0,0,0,.95);}
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
.logs-stats-bar{display:flex;align-items:center;gap:0;border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;background:rgba(255,255,255,.015);}
.logs-stat-item{padding:6px 14px;font-size:10px;font-weight:700;font-family:var(--mono);border-right:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:5px;}
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
.logs-foot{display:flex;align-items:center;padding:6px 14px;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.01);gap:10px;flex-shrink:0;}
.logs-streaming-dot{width:7px;height:7px;border-radius:50%;background:#4EC9B0;box-shadow:0 0 6px #4EC9B0;}
.logs-streaming-dot.paused{background:#4a5568;box-shadow:none;}
.log-search{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:5px;padding:4px 10px;color:#e0e0e0;font-size:11px;font-family:var(--mono);outline:none;width:180px;transition:border-color .15s;}
.log-search:focus{border-color:rgba(79,193,255,.35);}
.logs-pause-btn{padding:4px 12px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#8892a4;transition:all .15s;}
.logs-pause-btn:hover{background:rgba(255,255,255,.08);}
.logs-pause-btn.paused{background:rgba(78,201,176,.12);border-color:rgba(78,201,176,.3);color:#4EC9B0;}
.logs-clear-btn{padding:4px 12px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;border:1px solid rgba(255,107,157,.2);background:rgba(255,107,157,.06);color:#FF6B9D66;transition:all .15s;}
.logs-clear-btn:hover{background:rgba(255,107,157,.15);color:#FF6B9D;}

/* ── Toolbar shortcut buttons ── */
.tool-btn{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#8892a4;transition:all .15s;white-space:nowrap;}
.tool-btn:hover{background:rgba(255,255,255,.08);color:#e0e0e0;}
.tool-btn.dbg{background:rgba(255,107,157,.08);border-color:rgba(255,107,157,.2);color:#FF6B9Daa;}
.tool-btn.dbg:hover{background:rgba(255,107,157,.18);color:#FF6B9D;}
.tool-btn.logs{background:rgba(79,193,255,.07);border-color:rgba(79,193,255,.18);color:#4FC1FFaa;}
.tool-btn.logs:hover{background:rgba(79,193,255,.18);color:#4FC1FF;}
`;

// ═══════════ CODEMIRROR ═══════════
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
          if (del.length) onLocalOp?.({ type: "delete", pos: i, len: del.length });
          if (ins.length) onLocalOp?.({ type: "insert", pos: i, chars: ins });
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
          if (!readOnly) { ta.addEventListener("input", e => { const nT = e.target.value, old = prevDoc.current; let i = 0, oe = old.length, ne = nT.length; while (i < oe && i < ne && old[i] === nT[i]) i++; const ins = nT.slice(i), del = old.slice(i, oe); if (del.length) onLocalOp?.({ type: "delete", pos: i, len: del.length }); if (ins.length) onLocalOp?.({ type: "insert", pos: i, chars: ins }); prevDoc.current = nT; }); }
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
    const mkExt = lk => { const b = [lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), highlightSpecialChars(), history(), foldGutter(), drawSelection(), dropCursor(), bracketMatching(), closeBrackets(), autocompletion(), rectangularSelection(), crosshairCursor(), highlightSelectionMatches(), indentOnInput(), syntaxHighlighting(defaultHighlightStyle, { fallback: true }), keymap.of([indentWithTab, ...closeBracketsKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, ...searchKeymap]), LM[lk] || LM.ts, oneDark, theme, listener, EditorView.lineWrapping]; if (readOnly) b.push(EditorView.editable.of(false)); return b; };
    suppress.current = true; viewRef.current.setState(EditorState.create({ doc: initText || "", extensions: mkExt(lang) })); prevDoc.current = initText || ""; suppress.current = false;
  }, [lang, fileKey]);
  return (
    <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
      {cursors?.map(cur => {
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
  else if (/\.go:/i.test(firstMeaningful)) errType = "Go Error";
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
          <span className="err-hint">Fix the error(s) and press ▶ Run again · Esc to dismiss</span>
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

// ══════════════════════════════════════════════════════════
// ═════════ 5.2 DEBUGGING ROOM COMPONENT ══════════════════
// ══════════════════════════════════════════════════════════
function DebuggingRoom({ errors, warnings, lang, me, onClose }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef(null);
  const botTypingRef = useRef(null);
  const allIssues = [
    ...errors.map(e => ({ type: "error", text: e })),
    ...warnings.map(w => ({ type: "warning", text: w })),
  ];

  // On mount and when selected issue changes, bots auto-annotate
  useEffect(() => {
    if (allIssues.length === 0) return;
    const issue = allIssues[selectedIdx];
    if (!issue) return;
    // Initial system message
    const sysMsg = {
      id: Math.random().toString(36).slice(2),
      from: "system",
      text: `🔍 Debugging: ${issue.text.slice(0, 80)}${issue.text.length > 80 ? "…" : ""}`,
      t: nowTs(),
    };
    setMessages([sysMsg]);
    // Bot 1 annotates after 700ms
    clearTimeout(botTypingRef.current);
    botTypingRef.current = setTimeout(() => {
      const bot = BOTS[0];
      const suggestion = generateBotAnnotation(issue.text, lang);
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        from: bot.name, color: bot.color, bg: bot.bg, inits: bot.inits,
        text: suggestion, t: nowTs(), isBot: true,
      }]);
      // Bot 2 after 1.6s
      setTimeout(() => {
        const bot2 = BOTS[1];
        const langHint = `In ${LANGS[lang]?.n || lang}: ${issue.text.includes("line") ? "check the highlighted line first." : "validate your syntax tree structure."}`;
        setMessages(prev => [...prev, {
          id: Math.random().toString(36).slice(2),
          from: bot2.name, color: bot2.color, bg: bot2.bg, inits: bot2.inits,
          text: langHint, t: nowTs(), isBot: true,
        }]);
      }, 1600);
    }, 700);
    return () => clearTimeout(botTypingRef.current);
  }, [selectedIdx, lang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const txt = inputVal.trim();
    if (!txt) return;
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      from: me.name, color: me.color, bg: me.bg, inits: me.inits,
      text: txt, t: nowTs(), isMe: true,
    }]);
    setInputVal("");
    // Bot response after 900ms
    setTimeout(() => {
      const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
      const replies = [
        "Good point! Let me look at that section more carefully.",
        `Try wrapping that in a try-catch block first.`,
        `In ${LANGS[lang]?.n || lang}, this pattern often causes issues with scope resolution.`,
        "Run a minimal reproduction — isolate just the broken part!",
        "Check if your dependencies are up to date. Version mismatches cause this.",
        "Did you try commenting it out and adding it back line by line?",
      ];
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        from: bot.name, color: bot.color, bg: bot.bg, inits: bot.inits,
        text: replies[Math.floor(Math.random() * replies.length)],
        t: nowTs(), isBot: true,
      }]);
    }, 900 + Math.random() * 600);
  };

  const totalIssues = allIssues.length;

  return (
    <div className="dbg-room-overlay" onClick={onClose}>
      <div className="dbg-room announce-pop" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dbg-room-head">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF6B9D", boxShadow: "0 0 8px #FF6B9D", display: "inline-block", flexShrink: 0 }} className="pulse" />
          <div className="dbg-room-title">🐛 Real-Time Debugging Room</div>
          <span style={{ fontSize: 10, color: "#4a5568", fontFamily: "var(--mono)", background: "rgba(255,255,255,.04)", padding: "2px 8px", borderRadius: 4 }}>
            {LANGS[lang]?.n || lang} · {totalIssues} issue{totalIssues !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", gap: 5, marginLeft: 6 }}>
            {BOTS.map((b, i) => (
              <div key={i} style={{ width: 22, height: 22, borderRadius: 6, background: b.bg, color: b.color, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", border: `1.5px solid ${b.color}44` }} title={b.name}>{b.inits}</div>
            ))}
          </div>
          <button className="err-close" onClick={onClose} style={{ marginLeft: 4 }}>✕</button>
        </div>

        <div className="dbg-room-body">
          {/* Error list */}
          <div className="dbg-errors-panel">
            <div style={{ fontSize: 9, color: "#4a5568", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", padding: "2px 4px 6px" }}>Issues</div>
            {allIssues.length === 0 && (
              <div style={{ fontSize: 11, color: "#4a5568", textAlign: "center", padding: "20px 8px" }}>✓ No issues<br /><span style={{ fontSize: 10, color: "#2d3748" }}>Code looks clean!</span></div>
            )}
            {allIssues.map((issue, i) => (
              <div key={i} className={`dbg-error-item${selectedIdx === i ? " sel" : ""}`} onClick={() => setSelectedIdx(i)}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  {issue.type === "error"
                    ? <span className="err-type-badge">ERR</span>
                    : <span className="warn-type-badge">WARN</span>}
                  <span style={{ fontSize: 9, color: "#4a5568", fontFamily: "var(--mono)", marginLeft: "auto" }}>#{i + 1}</span>
                </div>
                <div style={{ fontSize: 10, color: issue.type === "error" ? "#ff8090" : "#DCDCAA", fontFamily: "var(--mono)", lineHeight: 1.5, wordBreak: "break-word" }}>
                  {issue.text.slice(0, 70)}{issue.text.length > 70 ? "…" : ""}
                </div>
              </div>
            ))}
          </div>

          {/* Chat panel */}
          <div className="dbg-chat-panel">
            <div className="dbg-chat-messages">
              {messages.map(msg => {
                if (msg.from === "system") return (
                  <div key={msg.id} style={{ textAlign: "center", padding: "4px 0" }}>
                    <span style={{ fontSize: 10, color: "#4a5568", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 100, padding: "2px 10px", fontFamily: "var(--mono)" }}>{msg.text}</span>
                  </div>
                );
                return (
                  <div key={msg.id} className={`dbg-msg${msg.isMe ? "" : ""}`} style={{ flexDirection: msg.isMe ? "row-reverse" : "row" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: msg.bg || "rgba(79,193,255,.18)", color: msg.color || "#4FC1FF", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", flexShrink: 0, border: `1.5px solid ${msg.color || "#4FC1FF"}44` }}>{msg.inits || initials(msg.from)}</div>
                    <div style={{ maxWidth: "78%" }}>
                      <div style={{ fontSize: 9, color: "#4a5568", marginBottom: 2, textAlign: msg.isMe ? "right" : "left" }}>{msg.from}</div>
                      <div className={`dbg-msg-bubble${msg.isMe ? " me" : msg.isBot ? " bot" : ""}`}>
                        <span style={{ color: msg.isMe ? "#a8d8ff" : msg.isBot ? "#ffb3c6" : "#e0e0e0" }}>{msg.text}</span>
                        {msg.isBot && (
                          <div>
                            <button className="dbg-fix-btn" onClick={() => {}}>
                              ✓ Mark as helpful
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="dbg-msg-time" style={{ textAlign: msg.isMe ? "right" : "left" }}>{msg.t}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="dbg-chat-input-row">
              <input
                className="dbg-chat-input"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Describe what you're seeing, ask the team…"
              />
              <button className="dbg-send-btn" onClick={sendMessage}>Send ↑</button>
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="dbg-room-foot">
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

// ══════════════════════════════════════════════════════════
// ═════════ 5.3 LIVE SERVER LOGS COMPONENT ════════════════
// ══════════════════════════════════════════════════════════
function LiveServerLogs({ onClose }) {
  const [logs, setLogs] = useState(() => {
    // Seed with some initial entries
    return Array.from({ length: 18 }, genLogEntry).reverse();
  });
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
      setLogs(prev => {
        const newEntries = Array.from({ length: count }, genLogEntry);
        return [...newEntries, ...prev].slice(0, 300);
      });
    }, 1200);
    return () => clearInterval(streamRef.current);
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current && !paused) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, paused]);

  const filteredLogs = logs.filter(e => {
    const matchesFilter = filter === "ALL" || e.level === filter;
    const matchesSearch = !search || e.msg.toLowerCase().includes(search.toLowerCase()) || e.svc.includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = logs.reduce((acc, e) => { acc[e.level] = (acc[e.level] || 0) + 1; return acc; }, {});
  const errRate = ((counts.ERROR || 0) / Math.max(logs.length, 1) * 100).toFixed(1);

  const LEVEL_COLORS = {
    INFO: "#4FC1FF", WARN: "#DCDCAA", ERROR: "#FF6B9D", DEBUG: "#C586C0", SUCCESS: "#4EC9B0"
  };

  return (
    <div className="logs-overlay" onClick={onClose}>
      <div className="logs-panel announce-pop" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="logs-head">
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: paused ? "#4a5568" : "#4EC9B0", boxShadow: paused ? "none" : "0 0 8px #4EC9B0", flexShrink: 0, transition: "all .3s" }} className={paused ? "" : "pulse"} />
          <div className="logs-title">📡 Live Server Logs Dashboard</div>
          <div className="logs-controls">
            {["ALL", "INFO", "SUCCESS", "WARN", "ERROR", "DEBUG"].map(lv => (
              <button key={lv} className={`log-filter-btn${filter === lv ? ` active-${lv}` : ""}`} onClick={() => setFilter(lv)}>
                {lv === "ALL" ? "All" : lv}
                {lv !== "ALL" && counts[lv] ? <span style={{ marginLeft: 3, opacity: .7 }}>({counts[lv] || 0})</span> : null}
              </button>
            ))}
          </div>
          <button className="err-close" onClick={onClose} style={{ marginLeft: 8, color: "#4a5568", background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.1)" }}>✕</button>
        </div>

        <div className="logs-body">
          {/* Stats bar */}
          <div className="logs-stats-bar">
            <div className="logs-stat-item" style={{ color: "#FF6B9D" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B9D", display: "inline-block", boxShadow: (counts.ERROR || 0) > 0 ? "0 0 5px #FF6B9D" : "none" }} />
              <span style={{ color: "#4a5568" }}>ERR</span> {counts.ERROR || 0}
            </div>
            <div className="logs-stat-item" style={{ color: "#DCDCAA" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DCDCAA", display: "inline-block" }} />
              <span style={{ color: "#4a5568" }}>WARN</span> {counts.WARN || 0}
            </div>
            <div className="logs-stat-item" style={{ color: "#4EC9B0" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4EC9B0", display: "inline-block" }} />
              <span style={{ color: "#4a5568" }}>OK</span> {counts.SUCCESS || 0}
            </div>
            <div className="logs-stat-item" style={{ color: "#4FC1FF" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4FC1FF", display: "inline-block" }} />
              <span style={{ color: "#4a5568" }}>INFO</span> {counts.INFO || 0}
            </div>
            <div className="logs-stat-item" style={{ color: "#C586C0" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C586C0", display: "inline-block" }} />
              <span style={{ color: "#4a5568" }}>DBG</span> {counts.DEBUG || 0}
            </div>
            <div className="logs-stat-item" style={{ marginLeft: "auto", color: "#4a5568" }}>
              Total: <span style={{ color: "#e0e0e0" }}>{logs.length}</span>
            </div>
            <div className="logs-stat-item" style={{ color: parseFloat(errRate) > 5 ? "#FF6B9D" : "#4a5568" }}>
              Err rate: <span style={{ color: parseFloat(errRate) > 5 ? "#FF6B9D" : "#4EC9B0" }}>{errRate}%</span>
            </div>
          </div>

          {/* Log stream */}
          <div className="logs-stream" onScroll={e => {
            const el = e.target;
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            setAutoScroll(atBottom);
          }}>
            {/* Column header */}
            <div style={{ display: "flex", padding: "3px 14px 3px", borderBottom: "1px solid rgba(255,255,255,.04)", position: "sticky", top: 0, background: "#0a0c11", zIndex: 2 }}>
              <span style={{ width: 82, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>Time</span>
              <span style={{ width: 58, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>Level</span>
              <span style={{ width: 90, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>Service</span>
              <span style={{ flex: 1, fontSize: 9, color: "#2d3748", fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>Message</span>
            </div>

            {filteredLogs.length === 0 && (
              <div style={{ padding: "30px", textAlign: "center", color: "#4a5568", fontSize: 12 }}>No matching log entries</div>
            )}

            {[...filteredLogs].reverse().map((entry, i) => (
              <div key={entry.id} className={`log-entry ${entry.level} log-slide`} style={{ animationDelay: `${Math.min(i * 0.02, 0.3)}s` }}>
                <span className="log-ts">{entry.t}</span>
                <span className="log-level-pill">
                  <span className={`log-level-inner ${entry.level}`}>{entry.level}</span>
                </span>
                <span className="log-svc" title={entry.svc}>{entry.svc}</span>
                <span className={`log-msg ${entry.level}`}>
                  {search ? (
                    entry.msg.split(new RegExp(`(${search})`, "gi")).map((part, pi) =>
                      part.toLowerCase() === search.toLowerCase()
                        ? <mark key={pi} style={{ background: "rgba(220,220,170,.3)", color: "#DCDCAA", borderRadius: 2 }}>{part}</mark>
                        : part
                    )
                  ) : entry.msg}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Footer */}
        <div className="logs-foot">
          <div className={`logs-streaming-dot${paused ? " paused" : ""}`} />
          <span style={{ fontSize: 10, color: paused ? "#4a5568" : "#4EC9B0", fontWeight: 700 }}>
            {paused ? "PAUSED" : "STREAMING"}
          </span>
          <input
            className="log-search"
            placeholder="Search logs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "#4a5568" }}>{filteredLogs.length} / {logs.length} entries</span>
          <button className={`logs-pause-btn${paused ? " paused" : ""}`} onClick={() => setPaused(p => !p)}>
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button className="logs-clear-btn" onClick={() => setLogs([])}>Clear</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════ LOGIN PAGE ═══════════
function LoginPage({ onLogin }) {
  const [name, setName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [sid] = useState(() => genSid());
  const chosen = PALETTE[colorIdx];
  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ width: 420, background: "#151820", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 36, boxShadow: "0 32px 80px rgba(0,0,0,.8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div className="gem" style={{ width: 36, height: 36, borderRadius: 10, fontSize: 18 }}>⚡</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>CKC-OS</div>
            <div style={{ fontSize: 11, color: "#4a5568", fontFamily: "var(--mono)" }}>Live Collaborative Editor</div>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700 }}>Your Name</div>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && name.trim() && onLogin({ name: name.trim(), color: chosen.hex, bg: chosen.bg, inits: initials(name.trim()) }, sid)}
            placeholder="Enter your name…" style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "Inter,sans-serif", outline: "none", transition: "border-color .15s" }}
            onFocus={e => e.target.style.borderColor = chosen.hex} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,.1)"} autoFocus />
        </div>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700 }}>Cursor Color</div>
          <div style={{ display: "flex", gap: 8 }}>
            {PALETTE.map((p, i) => (
              <div key={i} onClick={() => setColorIdx(i)} style={{ width: 28, height: 28, borderRadius: 8, background: p.bg, border: `2px solid ${i === colorIdx ? p.hex : "transparent"}`, cursor: "pointer", transition: "all .15s", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: p.hex }} />
                {i === colorIdx && <div style={{ position: "absolute", inset: -4, borderRadius: 10, border: `1.5px solid ${p.hex}44` }} />}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: chosen.bg, border: `2px solid ${chosen.hex}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: chosen.hex, fontFamily: "var(--mono)" }}>
            {name ? initials(name) : "?"}
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#e0e0e0", fontWeight: 600 }}>{name || "Your name here"}</div>
            <div style={{ fontSize: 10, color: "#4a5568", fontFamily: "var(--mono)" }}>Session: {sid}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4EC9B0", boxShadow: "0 0 6px #4EC9B0" }} />
            <span style={{ fontSize: 10, color: "#4EC9B0", fontWeight: 600 }}>LIVE</span>
          </div>
        </div>
        <button onClick={() => { if (!name.trim()) return; onLogin({ name: name.trim(), color: chosen.hex, bg: chosen.bg, inits: initials(name.trim()) }, sid); }}
          disabled={!name.trim()}
          style={{ width: "100%", padding: "12px", borderRadius: 8, background: name.trim() ? `linear-gradient(135deg, ${chosen.hex}33, ${chosen.hex}22)` : "rgba(255,255,255,.04)", border: `1px solid ${name.trim() ? chosen.hex + "66" : "rgba(255,255,255,.08)"}`, color: name.trim() ? chosen.hex : "#4a5568", fontSize: 13, fontWeight: 700, cursor: name.trim() ? "pointer" : "not-allowed", fontFamily: "Inter,sans-serif", transition: "all .2s", letterSpacing: ".03em" }}>
          Join Session →
        </button>
        <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(79,193,255,.06)", border: "1px solid rgba(79,193,255,.12)", borderRadius: 8, fontSize: 11, color: "#4FC1FF88", lineHeight: 1.7 }}>
          ⚡ Powered by Operational Transformation (OT) · Real-time CRDT sync · WebSocket presence
        </div>
      </div>
    </div>
  );
}

// ═══════════ MAIN APP ═══════════
export default function App() {
  const [session, setSession] = useState(() => authStore.get());
  if (!session) return <LoginPage onLogin={(me, sid) => { const s = { me, sid, lang: "ts" }; authStore.set(s); setSession(s); }} />;
  return <Shell session={session} onLogout={() => { authStore.clear(); setSession(null); }} />;
}

// ═══════════ SHELL ═══════════
function Shell({ session, onLogout }) {
  const { me, sid, lang: initLang = "ts" } = session;
  const myId = useRef("me-" + Math.random().toString(36).slice(2));
  const getEng = useCallback(lk => WS.eng(lk), []);
  const [remOps, setRemOps] = useState([]); const remBuf = useRef([]);
  const [cursors, setCursors] = useState([]);
  const [crdt, setCrdt] = useState([]);
  const [wsLog, setWsLog] = useState([]);
  const [opCnt, setOpCnt] = useState(0);
  const [lang, setLang] = useState(initLang);
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
  const [pyLoading, setPyLoading] = useState(false);
  const [errPopup, setErrPopup] = useState(null);
  const [errShake, setErrShake] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQ, setCmdQ] = useState("");
  const [cmdSel, setCmdSel] = useState(0);
  const [notif, setNotif] = useState(null);
  const [newEdLang, setNewEdLang] = useState("ts");
  const [botTyping, setBotTyping] = useState({});
  const [connectedCount, setConnectedCount] = useState(1 + BOTS.length);
  const [liveValidation, setLiveValidation] = useState(null);
  const liveValTimer = useRef(null);
  const activeEditorRef = useRef(null);
  const notifTmr = useRef(null);

  // ── NEW: Debug Room + Server Logs state ──
  const [showDebugRoom, setShowDebugRoom] = useState(false);
  const [showServerLogs, setShowServerLogs] = useState(false);

  const toast = useCallback((msg, ms = 2500) => { clearTimeout(notifTmr.current); setNotif(msg); notifTmr.current = setTimeout(() => setNotif(null), ms); }, []);
  const botRefs = useRef(BOTS.map((b, i) => ({ id: "bot-" + i, ...b, line: 1, col: 1, typing: false })));

  useEffect(() => {
    if (lang === "py" && !pyReady && !pyLoading) {
      setPyLoading(true); loadPy().then(() => { setPyReady(true); setPyLoading(false); }).catch(() => setPyLoading(false));
    }
  }, [lang, pyReady, pyLoading]);

  useEffect(() => {
    WS.onLog = logs => setWsLog([...logs]);
    const disc = WS.connect(myId.current, me.name, me.color, msg => {
      if (msg.type === "op" && msg.lang === lang) {
        remBuf.current.push(msg.op); setRemOps([...remBuf.current]); remBuf.current = []; setOpCnt(c => c + 1);
        setCrdt(p => [{ ...msg.op, from: "remote", t: nowTs() }, ...p].slice(0, 40));
      }
      if (msg.type === "cursor") {
        setCursors(prev => {
          const rest = prev.filter(c => c.id !== msg.id); if (!msg.online) return rest;
          const b = botRefs.current.find(x => x.id === msg.id);
          return [...rest, { id: msg.id, name: msg.name || b?.name, color: msg.color || b?.color, line: msg.line || 1, col: msg.col || 1, lang: msg.lang }];
        });
      }
      if (msg.type === "presence") { setConnectedCount(c => msg.online ? c + 1 : Math.max(1, c - 1)); }
    });
    botRefs.current.forEach(b => { WS.connect(b.id, b.name, b.color, msg => { if (msg.type === "op") getEng(msg.lang).apply(msg.op); }); });
    WS.send(myId.current, { type: "sync", lang });
    return () => { disc(); botRefs.current.forEach(b => WS.clients.delete(b.id)); };
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      botRefs.current.forEach(bot => {
        if (Math.random() > .6) return;
        const eng = getEng(lang); const lines = eng.text.split("\n");
        const nl = Math.max(1, Math.min(Math.floor(Math.random() * lines.length) + 1, lines.length));
        const nc = Math.max(1, Math.floor(Math.random() * Math.max(1, (lines[nl - 1] || "").length)) + 1);
        bot.line = nl; bot.col = nc; bot.typing = true;
        setBotTyping(p => ({ ...p, [bot.id]: true }));
        if (Math.random() > .4) {
          const snips = SNIPS[lang] || SNIPS.ts; const snip = snips[Math.floor(Math.random() * snips.length)];
          const off = lines.slice(0, nl - 1).reduce((s, l) => s + l.length + 1, 0);
          const pos = off + Math.min(nc - 1, (lines[nl - 1] || "").length);
          WS.send(bot.id, { type: "op", lang, op: { type: "insert", pos, chars: snip, uid: bot.id, baseVer: eng.version } });
          setCrdt(p => [{ type: "insert", pos, chars: snip.slice(0, 12), from: bot.name, t: nowTs() }, ...p].slice(0, 40));
        } else {
          setCrdt(p => [{ type: "retain", pos: nc * 10, from: bot.name, t: nowTs() }, ...p].slice(0, 40));
        }
        WS.send(bot.id, { type: "cursor", name: bot.name, color: bot.color, line: nl, col: nc, lang });
        setOpCnt(c => c + 1);
        setTimeout(() => { bot.typing = false; setBotTyping(p => ({ ...p, [bot.id]: false })); }, 1200);
      });
    }, 2000);
    return () => clearInterval(iv);
  }, [lang]);

  const triggerLiveValidation = useCallback((code, lk) => {
    clearTimeout(liveValTimer.current);
    liveValTimer.current = setTimeout(() => {
      if (!code || code.trim().length < 3) { setLiveValidation(null); return; }
      const result = validateCode(lk, code);
      setLiveValidation(result);
    }, 600);
  }, []);

  const handleLocalOp = useCallback(op => {
    const eng = getEng(lang); const r = eng.apply({ ...op, uid: myId.current, baseVer: eng.version - 1 });
    if (r) {
      WS.send(myId.current, { type: "op", lang, op: r });
      setOpCnt(c => c + 1);
      setTabs(p => p.map(t => t.id === activeTab ? { ...t, dirty: true } : t));
      const code = activeEditorRef.current?._getText?.() || eng.text;
      triggerLiveValidation(code, lang);
    }
  }, [lang, activeTab, triggerLiveValidation]);

  const handleCursorMove = useCallback((line, col) => {
    setCursor({ line, col }); WS.send(myId.current, { type: "cursor", name: me.name, color: me.color, line, col, lang });
  }, [lang, me]);

  const switchLang = useCallback(lk => {
    setLang(lk); setRemOps([]); remBuf.current = []; setLiveValidation(null);
    WS.send(myId.current, { type: "sync", lang: lk });
  }, []);

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
    const id = "new-" + Date.now(); const ext = LANGS[newEdLang]?.ext?.split(".")[1] || newEdLang;
    setTabs(p => [...p, { id, name: `scratch.${ext}`, lang: newEdLang, dirty: false, isNew: true, code: "" }]);
    setActiveTab(id); switchLang(newEdLang); toast(`New ${LANGS[newEdLang]?.n} editor opened`);
  }, [newEdLang, switchLang, toast]);

  const CMDS = [
    { ic: "▶", lb: "Run Code", kb: "Ctrl+Enter", fn: handleRun },
    { ic: "📄", lb: "New Editor", kb: "Ctrl+N", fn: createNewEditor },
    { ic: "💾", lb: "Save All", kb: "Ctrl+K S", fn: () => { setTabs(p => p.map(t => ({ ...t, dirty: false }))); toast("All files saved"); } },
    { ic: "🐛", lb: "Open Debugging Room", kb: "", fn: () => setShowDebugRoom(true) },
    { ic: "📡", lb: "Open Server Logs", kb: "", fn: () => setShowServerLogs(true) },
    { ic: "🚪", lb: "Sign Out", kb: "", fn: onLogout },
    ...LK.map(lk => ({ ic: LANGS[lk].ic, lb: `Switch to ${LANGS[lk].n}`, kb: "", fn: () => { switchLang(lk); setCmdOpen(false); } })),
  ];
  const runCmd = c => { c.fn(); setCmdOpen(false); setCmdQ(""); };
  const filtCmds = cmdQ.replace(/^>/, "").trim() ? CMDS.filter(c => c.lb.toLowerCase().includes(cmdQ.replace(/^>/, "").trim().toLowerCase())) : CMDS;

  useEffect(() => {
    const h = e => {
      const C = e.ctrlKey || e.metaKey;
      if (C && e.shiftKey && e.key === "P") { e.preventDefault(); setCmdOpen(o => !o); setCmdQ(""); }
      if (C && e.key === "Enter") { e.preventDefault(); handleRun(); }
      if (C && e.key === "n") { e.preventDefault(); createNewEditor(); }
      if (e.key === "Escape") { setCmdOpen(false); setErrPopup(null); setShowDebugRoom(false); setShowServerLogs(false); }
      if (cmdOpen) {
        if (e.key === "ArrowDown") { e.preventDefault(); setCmdSel(s => Math.min(s + 1, filtCmds.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setCmdSel(s => Math.max(s - 1, 0)); }
        if (e.key === "Enter") { e.preventDefault(); runCmd(filtCmds[cmdSel]); }
      }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [cmdOpen, cmdSel, handleRun, createNewEditor, filtCmds]);

  const closeTab = (id, e) => {
    e.stopPropagation(); setTabs(p => { const nx = p.filter(t => t.id !== id); if (activeTab === id && nx.length) setActiveTab(nx[nx.length - 1].id); return nx; });
  };

  const activeCursors = cursors.filter(c => c.lang === lang);
  const curEng = getEng(lang); const curTab = tabs.find(t => t.id === activeTab);
  const errCount = (liveValidation?.errors?.length || 0);
  const warnCount = (liveValidation?.warnings?.length || 0);

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
    return <div className="val-pass val-pop">✓ Valid {LANGS[lang]?.n}</div>;
  };

  const SB = ({ children, c, onClick }) => <span className="st" style={{ color: c || "#4a5568" }} onClick={onClick}>{children}</span>;

  return (
    <>
      <style>{CSS}</style>
      <ErrorPopup error={errPopup?.msg || null} lang={errPopup?.lang || lang} onClose={() => setErrPopup(null)} onOpenOutput={() => { setOutOpen(true); setOutTab("output"); }} />

      {/* ══ 5.2 Debugging Room Modal ══ */}
      {showDebugRoom && (
        <DebuggingRoom
          errors={liveValidation?.errors || []}
          warnings={liveValidation?.warnings || []}
          lang={lang}
          me={me}
          onClose={() => setShowDebugRoom(false)}
        />
      )}

      {/* ══ 5.3 Live Server Logs Modal ══ */}
      {showServerLogs && (
        <LiveServerLogs onClose={() => setShowServerLogs(false)} />
      )}

      {/* ── TOPBAR ── */}
      <div className="topbar">
        <div className="tb-logo">
          <div className="gem">⚡</div>CKC-OS
        </div>

        <div className="live-badge">
          <div className="live-dot pulse" />
          LIVE · {connectedCount}
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

        {lang === "py" && (pyLoading
          ? <div className="py-badge" style={{ background: "rgba(220,220,170,.1)", border: "1px solid rgba(220,220,170,.25)", color: "#DCDCAA" }}><span className="spin" style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", border: "1.5px solid #DCDCAA", borderTopColor: "transparent" }} />Loading Python…</div>
          : pyReady ? <div className="py-badge" style={{ background: "rgba(78,201,176,.08)", border: "1px solid rgba(78,201,176,.2)", color: "#4EC9B0" }}>🐍 Ready</div> : null)}

        {renderValBadge()}

        <div className={`dbg-badge${errShake ? " err-shake" : ""}`} onClick={() => { setOutOpen(true); setOutTab("problems"); }}>
          🐛 Debug <span className="dbg-cnt">{errCount + warnCount}</span>
        </div>

        {/* ══ NEW: Tool buttons for 5.2 and 5.3 ══ */}
        <button className="tool-btn dbg" onClick={() => setShowDebugRoom(true)} title="Open Debugging Room (5.2)">
          🔬 Debug Room
        </button>
        <button className="tool-btn logs" onClick={() => setShowServerLogs(true)} title="Open Live Server Logs (5.3)">
          📡 Server Logs
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <select value={newEdLang} onChange={e => setNewEdLang(e.target.value)}
            style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 5, color: "#8892a4", fontSize: 11, padding: "4px 6px", fontFamily: "var(--mono)", cursor: "pointer", outline: "none" }}>
            {LK.map(lk => <option key={lk} value={lk}>{LANGS[lk].ic} {LANGS[lk].n}</option>)}
          </select>
          <button className="new-ed-btn" onClick={createNewEditor}>＋ New Editor</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {botRefs.current.map((b, i) => (
            <div key={i} className="av" style={{ background: b.bg, color: b.color, border: `2px solid ${b.color}44` }} title={b.name}>
              {b.inits}
              <div className="online-dot" style={{ background: botTyping[b.id] ? b.color : "#4EC9B0" }} />
            </div>
          ))}
          <div className="av me" style={{ background: me.bg || "rgba(79,193,255,.18)", color: me.color || "#4FC1FF" }} title={`${me.name} (you)`}>
            {me.inits}
            <div className="online-dot" style={{ background: "#4EC9B0" }} />
          </div>
        </div>

        <button className={`run-btn${running ? " running" : ""}`} onClick={handleRun} disabled={running} style={{ flexShrink: 0 }}>
          {running ? <span className="spin" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "1.5px solid currentColor", borderTopColor: "transparent" }} /> : "▶"}
          {running ? "Running…" : "Run"}
        </button>

        <button onClick={onLogout} style={{ padding: "4px 10px", borderRadius: 5, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", color: "#4a5568", cursor: "pointer", fontSize: 11, fontFamily: "Inter,sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>← Exit</button>
      </div>

      {/* ── MAIN ── */}
      <div style={{ display: "flex", height: "calc(100vh - 70px)", overflow: "hidden" }}>

        {/* ── SIDEBAR ── */}
        <div className="sidebar">
          <div className="sec-hdr">Explorer</div>
          {[{ id: "f_eng", name: "engine.ts", lang: "ts", icon: "🔷" }, { id: "f_rm", name: "README.md", lang: "md", icon: "📄" }, { id: "f_dir", name: "tests/", type: "d", icon: "📁" }, { id: "f_env", name: ".env", lang: "env", icon: "⚙" }].map(f => (
            <div key={f.id} className={`ft${activeTab === f.id ? " sel" : ""}`} onClick={() => {
              if (f.type === "d") { toast("tests/ folder"); return; }
              const lk = f.lang && LANGS[f.lang] ? f.lang : "ts";
              if (!tabs.find(t => t.id === f.id)) setTabs(p => [...p, { id: f.id, name: f.name, lang: lk, dirty: false, isNew: false }]);
              setActiveTab(f.id); switchLang(lk);
            }}>
              <span style={{ fontSize: 12, flexShrink: 0 }}>{f.icon}</span>
              <span style={{ color: activeTab === f.id ? "#4FC1FF" : "#c0c8d8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", fontSize: 12 }}>{f.name}</span>
              {f.lang && LANGS[f.lang] && <span style={{ fontSize: 9, fontWeight: 700, color: LANGS[f.lang]?.c, fontFamily: "var(--mono)", flexShrink: 0 }}>{LANGS[f.lang]?.ic}</span>}
            </div>
          ))}
          {tabs.filter(t => t.isNew).map(t => (
            <div key={t.id} className={`ft${activeTab === t.id ? " sel" : ""}`} onClick={() => { setActiveTab(t.id); switchLang(t.lang); }}>
              <span className="new-tab-dot" style={{ flexShrink: 0 }} />
              <span style={{ color: "#4EC9B0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", fontSize: 12 }}>{t.name}</span>
            </div>
          ))}

          <div className="divider" />

          {/* ── PRESENCE PANEL ── */}
          <div className="sec-hdr" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Collaborators</span>
            <span style={{ color: "#4EC9B0", fontSize: 9, fontWeight: 700, background: "rgba(78,201,176,.12)", border: "1px solid rgba(78,201,176,.2)", borderRadius: 10, padding: "1px 6px" }}>{connectedCount} online</span>
          </div>

          <div className="presence-card">
            <div className="presence-av" style={{ background: me.bg || "rgba(79,193,255,.18)", color: me.color || "#4FC1FF", borderColor: (me.color || "#4FC1FF") + "66" }}>
              {me.inits}
              <div className="pdot" style={{ background: "#4EC9B0" }} />
            </div>
            <div className="presence-info">
              <div className="presence-name">
                <span style={{ color: "#e0e0e0" }}>{me.name}</span>
                <span style={{ fontSize: 9, color: "#4a5568", background: "rgba(255,255,255,.05)", padding: "1px 5px", borderRadius: 4 }}>you</span>
              </div>
              <div className="presence-pos" style={{ color: me.color || "#4FC1FF" }}>Ln {cursor.line} · Col {cursor.col} · {LANGS[lang]?.n}</div>
            </div>
          </div>

          {botRefs.current.map((b, i) => {
            const cur = cursors.find(c => c.id === b.id);
            const isTyping = botTyping[b.id];
            return (
              <div key={i} className="presence-card">
                <div className="presence-av" style={{ background: b.bg, color: b.color, borderColor: b.color + "66" }}>
                  {b.inits}
                  <div className="pdot" style={{ background: isTyping ? b.color : "#4a5568" }} />
                </div>
                <div className="presence-info">
                  <div className="presence-name" style={{ color: "#c0c8d8" }}>{b.name}</div>
                  <div className="presence-pos" style={{ color: isTyping ? b.color : "#4a5568" }}>
                    {isTyping
                      ? <><TypingIndicator color={b.color} /><span style={{ marginLeft: 4 }}>typing…</span></>
                      : `Ln ${cur?.line || b.line} · Col ${cur?.col || b.col}`}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="divider" />

          <div style={{ padding: "8px 12px" }}>
            <div style={{ fontSize: 10, color: "#4a5568", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>Session</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a7585", lineHeight: 1.8 }}>
              <div>ID: <span style={{ color: "#4FC1FF" }}>{sid}</span></div>
              <div>Ops: <span style={{ color: "#4EC9B0" }}>{opCnt}</span></div>
              <div>Ver: <span style={{ color: "#DCDCAA" }}>v{curEng.version}</span></div>
              <div>Size: <span style={{ color: "#CE9178" }}>{curEng.text.length}ch</span></div>
            </div>
          </div>

          {/* ══ NEW: Quick-access buttons in sidebar for 5.2 and 5.3 ══ */}
          <div style={{ padding: "0 8px 8px" }}>
            <div style={{ fontSize: 10, color: "#4a5568", marginBottom: 5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>Tools</div>
            <div
              onClick={() => setShowDebugRoom(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, background: "rgba(255,107,157,.06)", border: "1px solid rgba(255,107,157,.18)", cursor: "pointer", marginBottom: 5, transition: "all .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,107,157,.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,107,157,.06)"}>
              <span style={{ fontSize: 14 }}>🔬</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#FF6B9D", fontWeight: 600 }}>Debugging Room</div>
                <div style={{ fontSize: 10, color: "#4a5568" }}>Team error analysis</div>
              </div>
              {(errCount + warnCount) > 0 && <span style={{ fontSize: 9, background: "#FF6B9D", color: "#fff", borderRadius: 10, padding: "1px 5px", fontWeight: 700 }}>{errCount + warnCount}</span>}
            </div>
            <div
              onClick={() => setShowServerLogs(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, background: "rgba(79,193,255,.06)", border: "1px solid rgba(79,193,255,.15)", cursor: "pointer", transition: "all .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(79,193,255,.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(79,193,255,.06)"}>
              <span style={{ fontSize: 14 }}>📡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#4FC1FF", fontWeight: 600 }}>Server Logs</div>
                <div style={{ fontSize: 10, color: "#4a5568" }}>Live DevOps monitor</div>
              </div>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4EC9B0", boxShadow: "0 0 5px #4EC9B0" }} className="pulse" />
            </div>
          </div>

          {/* ── INLINE VALIDATION PANEL ── */}
          {liveValidation && (liveValidation.hasError || liveValidation.hasWarning) && (
            <div style={{ margin: "0 8px 8px", borderRadius: 7, background: liveValidation.hasError ? "rgba(255,107,157,.06)" : "rgba(220,220,170,.06)", border: `1px solid ${liveValidation.hasError ? "rgba(255,107,157,.2)" : "rgba(220,220,170,.2)"}`, padding: "7px 9px", maxHeight: 140, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: liveValidation.hasError ? "#FF6B9D" : "#DCDCAA" }}>
                  {liveValidation.hasError ? `⊗ ${liveValidation.errors.length} Error(s)` : `⚠ ${liveValidation.warnings.length} Warning(s)`}
                </div>
                <button onClick={() => setShowDebugRoom(true)} style={{ fontSize: 9, color: "#FF6B9D", background: "rgba(255,107,157,.12)", border: "1px solid rgba(255,107,157,.25)", borderRadius: 4, padding: "1px 6px", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 700 }}>Debug →</button>
              </div>
              {liveValidation.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 10, color: "#ff8090", fontFamily: "var(--mono)", lineHeight: 1.6, marginBottom: 2, wordBreak: "break-word" }}>✖ {e}</div>
              ))}
              {liveValidation.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 10, color: "#DCDCAA", fontFamily: "var(--mono)", lineHeight: 1.6, marginBottom: 2, wordBreak: "break-word" }}>⚠ {w}</div>
              ))}
            </div>
          )}
        </div>

        {/* ── EDITOR AREA ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* Tab bar */}
          <div style={{ display: "flex", background: "var(--bg3)", height: 36, flexShrink: 0, overflowX: "auto", overflowY: "hidden", alignItems: "flex-end", borderBottom: "1px solid var(--bdr)" }}>
            {tabs.map(t => { const tl = LANGS[t.lang] || LANGS.ts; return (
              <div key={t.id} className={`tab ${activeTab === t.id ? "on" : "off"}`} onClick={() => { setActiveTab(t.id); if (LANGS[t.lang]) switchLang(t.lang); }}>
                {t.isNew && <span className="new-tab-dot" style={{ marginRight: 4 }} />}
                <span style={{ fontSize: 9, color: tl.c, fontWeight: 700, flexShrink: 0 }}>{tl.ic}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{t.name}</span>
                {t.dirty && <span style={{ fontSize: 12, color: "#4a5568", lineHeight: 1, flexShrink: 0 }}>●</span>}
                <span className="tx" onClick={e => closeTab(t.id, e)}>✕</span>
              </div>
            ); })}
            <div style={{ flex: 1 }} />
            <div style={{ padding: "0 12px", fontSize: 10, color: "#4a5568", fontFamily: "var(--mono)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
              <span>CodeMirror 6</span><span style={{ color: LANGS[lang]?.c || "#4FC1FF", fontWeight: 700 }}>{LANGS[lang]?.n}</span>
            </div>
            <button className={`run-btn${running ? " running" : ""}`} onClick={handleRun} disabled={running} style={{ margin: "4px 8px 4px 0", padding: "3px 10px", fontSize: 11 }}>
              {running ? "⟳ Running…" : "▶ Run"}
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="bc">
            <span style={{ cursor: "pointer" }} onClick={() => toast("src/")}>src</span>
            <span style={{ color: "var(--txt3)" }}>/</span>
            <span style={{ color: "#e0e0e0" }}>{curTab?.name || "—"}</span>
            {curTab?.isNew && <span style={{ color: "#4EC9B0", marginLeft: 4, fontSize: 10 }}>● new</span>}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--txt3)", fontFamily: "var(--mono)" }}>v{curEng.version}</span>
            {liveValidation && (
              <span
                style={{ marginLeft: 8, fontSize: 10, color: liveValidation.hasError ? "#FF6B9D" : liveValidation.hasWarning ? "#DCDCAA" : "#4EC9B0", fontWeight: 700, cursor: liveValidation.hasError ? "pointer" : "default" }}
                onClick={() => liveValidation.hasError && setShowDebugRoom(true)}>
                {liveValidation.hasError ? `⊗ ${liveValidation.errors.length} error(s) — open debug room →` : liveValidation.hasWarning ? `⚠ ${liveValidation.warnings.length} warning(s)` : "✓ Valid"}
              </span>
            )}
          </div>

          {/* Editor + minimap */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0, display: "flex" }}>
            <div style={{ flex: 1, overflow: "hidden" }}>
              {activeTab ? (
                <CMEditor key={activeTab + lang} ref={activeEditorRef} lang={lang}
                  initText={curTab?.isNew ? (curTab.code || "") : curEng.text} fileKey={activeTab}
                  onLocalOp={handleLocalOp} onCursorMove={handleCursorMove}
                  remoteOps={curTab?.isNew ? [] : remOps} cursors={curTab?.isNew ? [] : activeCursors} readOnly={false} />
              ) : (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#4a5568" }}>
                  <div style={{ fontSize: 48, opacity: .1 }}>⚡</div>
                  <div style={{ fontSize: 16, color: "#6a7585" }}>No file open</div>
                  <button className="new-ed-btn" onClick={createNewEditor}>＋ New Editor</button>
                </div>
              )}
            </div>
            {/* Minimap */}
            <div className="mm">
              <div style={{ position: "absolute", inset: 0, padding: "4px 2px" }}>
                {Array.from({ length: 55 }).map((_, i) => <div key={i} style={{ height: 2, marginBottom: 1, background: `rgba(79,193,255,${Math.random() * .12 + .02})`, borderRadius: 1, width: `${15 + Math.random() * 75}%` }} />)}
              </div>
              <div style={{ position: "absolute", top: "5%", left: 0, right: 0, height: "25%", background: "rgba(79,193,255,.05)", borderTop: "1px solid rgba(79,193,255,.1)", borderBottom: "1px solid rgba(79,193,255,.1)" }} />
            </div>
          </div>

          {/* Output panel */}
          {outOpen && (
            <div className="out-panel" style={{ height: 220 }}>
              <div className="out-hdr">
                {[["output", "Output"], ["terminal", "Terminal"], ["problems", `Problems (${errCount + warnCount})`]].map(([id, lb]) => (
                  <div key={id} className={`out-tab${outTab === id ? " on" : ""}`} onClick={() => setOutTab(id)}>
                    {id === "output" && outIsErr && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B9D", boxShadow: "0 0 5px #FF6B9D", display: "inline-block" }} className="pulse" />}
                    {lb}
                  </div>
                ))}
                <div style={{ flex: 1 }} />
                <button className={`run-btn${running ? " running" : ""}`} onClick={handleRun} disabled={running} style={{ margin: "4px 8px", padding: "3px 10px", fontSize: 11 }}>{running ? "⟳ Running…" : "▶ Run"}</button>
                <div style={{ width: 24, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#4a5568", fontSize: 13 }} onClick={() => setOutOpen(false)}>✕</div>
              </div>
              {outTab === "output" && (
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", background: "#0a0c10", minHeight: 0, borderTop: outIsErr ? "1px solid rgba(255,107,157,.18)" : "none" }}>
                  {running
                    ? <div style={{ color: "#4FC1FF", fontFamily: "var(--mono)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="spin" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "1.5px solid #4FC1FF", borderTopColor: "transparent" }} />
                        Validating &amp; running {LANGS[curTab?.lang || lang]?.n || "code"}…
                      </div>
                    : renderOutput(output)}
                </div>
              )}
              {outTab === "terminal" && (
                <div style={{ flex: 1, padding: "8px 14px", fontFamily: "var(--mono)", fontSize: 12, color: "#4FC1FF", background: "#0a0c10" }}>
                  <div>$ ckc-os run --lang={lang} --session={sid}</div>
                  <div style={{ color: "#4EC9B0" }}>✓ Session active · {1 + botRefs.current.length} collaborators · OT v{curEng.version}</div>
                  {lang === "py" && <div style={{ color: pyReady ? "#4EC9B0" : "#DCDCAA" }}>🐍 Pyodide: {pyReady ? "loaded" : "press Run to load"}</div>}
                  <div style={{ color: "#4a5568", marginTop: 4 }}>$ _</div>
                </div>
              )}
              {outTab === "problems" && (
                <div style={{ flex: 1, overflowY: "auto", background: "#0a0c10" }}>
                  {liveValidation && (liveValidation.errors.length > 0 || liveValidation.warnings.length > 0) ? (
                    <>
                      {/* ══ Open in Debug Room shortcut ══ */}
                      <div style={{ padding: "6px 14px", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, color: "#4a5568" }}>{liveValidation.errors.length} error(s) · {liveValidation.warnings.length} warning(s)</span>
                        <button onClick={() => setShowDebugRoom(true)} style={{ fontSize: 10, color: "#FF6B9D", background: "rgba(255,107,157,.1)", border: "1px solid rgba(255,107,157,.25)", borderRadius: 5, padding: "2px 9px", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                          🔬 Open Debug Room
                        </button>
                      </div>
                      {liveValidation.errors.map((e, i) => (
                        <div key={`e-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 14px", borderBottom: "1px solid rgba(255,255,255,.04)", cursor: "pointer" }}
                          onMouseEnter={ev => ev.currentTarget.style.background = "rgba(255,255,255,.03)"}
                          onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                          <span style={{ color: "#FF6B9D", fontSize: 13, flexShrink: 0, marginTop: 1 }}>⊗</span>
                          <div><div style={{ fontSize: 12, color: "#c0c8d8" }}>{e}</div><div style={{ fontSize: 11, color: "#4a5568", marginTop: 1 }}>{LANGS[lang]?.ext || "file"}</div></div>
                        </div>
                      ))}
                      {liveValidation.warnings.map((w, i) => (
                        <div key={`w-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 14px", borderBottom: "1px solid rgba(255,255,255,.04)", cursor: "pointer" }}
                          onMouseEnter={ev => ev.currentTarget.style.background = "rgba(255,255,255,.03)"}
                          onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                          <span style={{ color: "#DCDCAA", fontSize: 13, flexShrink: 0, marginTop: 1 }}>⚠</span>
                          <div><div style={{ fontSize: 12, color: "#c0c8d8" }}>{w}</div><div style={{ fontSize: 11, color: "#4a5568", marginTop: 1 }}>{LANGS[lang]?.ext || "file"}</div></div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ padding: "20px", textAlign: "center", color: "#4a5568", fontSize: 12 }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                      No problems detected
                      <div style={{ fontSize: 11, marginTop: 4, color: "#333" }}>Start typing to validate your code</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ width: 210, background: "var(--bg2)", borderLeft: "1px solid var(--bdr)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--bdr)", flexShrink: 0, background: "var(--bg3)" }}>
            {[["crdt", "OT/CRDT"], ["ws", "WS Log"]].map(([id, lb]) => (
              <div key={id} className={`rp-tab${rpTab === id ? " on" : ""}`} onClick={() => setRpTab(id)} style={{ flex: 1, textAlign: "center" }}>{lb}</div>
            ))}
          </div>

          {rpTab === "crdt" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "6px" }}>
              <div style={{ fontSize: 9, color: "#4a5568", padding: "2px 4px 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>
                Operation Log · {crdt.length} ops
              </div>
              {crdt.map((op, i) => {
                const t = op.type || "retain";
                const bot = BOTS.find(b => b.name === op.from);
                return (
                  <div key={i} className={`op-card ${t}`}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span className={`op-badge ${t}`}>{t.toUpperCase()}</span>
                      <span style={{ fontSize: 9, color: "#4a5568", fontFamily: "var(--mono)" }}>{op.t}</span>
                    </div>
                    {t === "insert" && <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "#4FC1FF", marginBottom: 2, wordBreak: "break-all" }}>ins("{op.chars?.slice(0, 12)?.replace(/\n/g, "↵") || "…"}",@{op.pos})</div>}
                    {t === "retain" && <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "#6a7585" }}>retain(@{op.pos || 0})</div>}
                    {t === "delete" && <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "#ff6363" }}>del(@{op.pos},len:{op.len})</div>}
                    {op.from && <div style={{ fontSize: 10, color: bot?.color || "#4FC1FF", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: bot?.color || "#4FC1FF", display: "inline-block" }} />{op.from}
                    </div>}
                  </div>
                );
              })}
              {crdt.length === 0 && <div style={{ padding: "12px 8px", fontSize: 11, color: "#333", textAlign: "center" }}>Waiting for ops…<br /><span style={{ fontSize: 10, color: "#2a3040" }}>Start typing to see operations</span></div>}
            </div>
          )}

          {rpTab === "ws" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "6px" }}>
              <div style={{ fontSize: 9, color: "#4a5568", padding: "2px 4px 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>
                WebSocket Events
              </div>
              {wsLog.slice(0, 25).map((e, i) => (
                <div key={i} className={`ws-entry ${e.dir === "←" ? "in" : "out"}`}>
                  <span style={{ fontSize: 8, color: "#333", display: "block", marginBottom: 1 }}>{e.t}</span>
                  <span style={{ marginRight: 4 }}>{e.dir === "←" ? "↙" : "↗"}</span>{e.msg}
                </div>
              ))}
              {wsLog.length === 0 && <div style={{ padding: "12px 8px", fontSize: 11, color: "#333", textAlign: "center" }}>No WS events yet</div>}
            </div>
          )}

          {/* Stats footer */}
          <div style={{ padding: "8px 10px", borderTop: "1px solid var(--bdr)", flexShrink: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "Ops", value: opCnt, color: "#4FC1FF" },
                { label: "Ver", value: `v${curEng.version}`, color: "#4EC9B0" },
                { label: "Size", value: `${curEng.text.length}ch`, color: "#DCDCAA" },
                { label: "Users", value: connectedCount, color: "#FF6B9D" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,.02)", borderRadius: 5, padding: "4px 7px" }}>
                  <div style={{ fontSize: 9, color: "#4a5568", textTransform: "uppercase", letterSpacing: ".08em" }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "var(--mono)" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div className="statusbar">
        <SB c="#4EC9B0">⬡ {connectedCount} online</SB>
        <SB c={errCount > 0 ? "#FF6B9D" : "#4a5568"} onClick={() => { setOutOpen(true); setOutTab("problems"); }}>⊗ {errCount} · ⚠ {warnCount}</SB>
        <SB c="#4FC1FF">OT v{curEng.version}</SB>
        {/* ══ NEW: Status bar shortcuts for 5.2 and 5.3 ══ */}
        <SB c="#FF6B9Daa" onClick={() => setShowDebugRoom(true)}>🔬 Debug Room</SB>
        <SB c="#4FC1FFaa" onClick={() => setShowServerLogs(true)}>📡 Server Logs</SB>
        <div style={{ flex: 1 }} />
        <SB>Ln {cursor.line}, Col {cursor.col}</SB>
        <SB>UTF-8</SB>
        <SB c="#FFB547">↕ {opCnt} ops</SB>
        <SB c="#4EC9B0">⬡ Live</SB>
        {lang === "py" && <SB c={pyReady ? "#4EC9B0" : "#DCDCAA"}>🐍 {pyReady ? "Pyodide" : "…"}</SB>}
        <SB c="#4FC1FF">CKC-OS v4.2</SB>
      </div>

      {/* ── CMD PALETTE ── */}
      {cmdOpen && (
        <div className="cp-ov" onClick={() => setCmdOpen(false)}>
          <div className="cp-box fi" onClick={e => e.stopPropagation()}>
            <input autoFocus className="cp-in" value={cmdQ} onChange={e => { setCmdQ(e.target.value); setCmdSel(0); }} placeholder="> Run, debug room, server logs, switch language…" />
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtCmds.map((c, i) => (
                <div key={i} className={`cp-row${cmdSel === i ? " hi" : ""}`} onMouseEnter={() => setCmdSel(i)} onClick={() => runCmd(c)}>
                  <span style={{ fontSize: 14 }}>{c.ic}</span>
                  <span style={{ flex: 1 }}>{c.lb}</span>
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