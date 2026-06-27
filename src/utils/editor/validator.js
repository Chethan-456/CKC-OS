// ═══════════ COMPREHENSIVE MULTI-LANGUAGE VALIDATOR ═══════════
// ═══════════════════════════════════════════════════════════════

export function validateCode(lang, code) {
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

