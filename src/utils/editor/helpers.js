import { genSid } from "../../constants.js";

// ═══════════ HELPERS ═══════════
export function nowTs() {
  return new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function applyOpToString(str, op) {
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


// ═══════════ BOTS & DEBUG HELPERS ═══════════
export function generateBotAnnotation(error, lang) {
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

export function genLogEntry() {
  const t = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
  const id = genSid();
  const n = Math.floor(Math.random() * 900 + 10);
  const r = Math.floor(Math.random() * 200 + 1);
  const msg = t.msg.replace(/\{id\}/g, id).replace(/\{n\}/g, n).replace(/\{r\}/g, r);
  return { level: t.level, svc: t.svc, msg, t: nowTs(), id: genSid() };
}

