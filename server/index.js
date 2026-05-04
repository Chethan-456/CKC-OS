import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import authRouter from "./routes/auth.js";
import { getUserById } from "./db.js";

// ── Express ───────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: true }));
app.use(express.json());
app.use("/api/auth", authRouter);
app.get("/api/health", (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

const server = http.createServer(app);

// ── OT Engine ─────────────────────────────────────────────────
const STARTERS = {
  ts: `import { EventEmitter } from 'events';
interface Config { port: number; debug: boolean; maxSessions: number; }
class CKCEngine extends EventEmitter {
  private config: Config;
  constructor(config: Config) { super(); this.config = config; this.init(); }
  private init(): void { console.log(\`CKC Engine ready on port \${this.config.port}\`); }
  createSession(id: string) { console.log(\`Session created: \${id}\`); }
  broadcastOp(sessionId: string, op: unknown): void { console.log(\`Op broadcast: \${sessionId}\`); }
}
const engine = new CKCEngine({ port: 8080, debug: true, maxSessions: 100 });
engine.createSession('sess_abc123');`,
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
        System.out.println("Hello from CKC-OS!");
        for (int i = 1; i <= 5; i++) {
            System.out.println("Step " + i);
        }
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
    fmt.Println("Fibonacci sequence:")
    for i := 0; i < 10; i++ {
        fmt.Printf("  fib(%d) = %d\\n", i, fibonacci(i))
    }
}`,
  sql: `CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL UNIQUE,
    plan ENUM('free','pro','team') DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
SELECT id, username, plan FROM users WHERE plan = 'pro' ORDER BY created_at DESC LIMIT 20;`,
};

class OTEngine {
  constructor(text = "") {
    this.text = text;
    this.version = 0;
    this.history = [];
  }
  static xform(a, b) {
    let r = { ...b };
    if (a.type === "insert" && b.type === "insert") {
      if (a.pos < b.pos || (a.pos === b.pos && a.uid < b.uid)) r.pos = b.pos + a.chars.length;
    } else if (a.type === "insert" && b.type === "delete") {
      if (a.pos <= b.pos) r.pos = b.pos + a.chars.length;
    } else if (a.type === "delete" && b.type === "insert") {
      if (a.pos < b.pos) r.pos = Math.max(b.pos - a.len, a.pos);
    } else if (a.type === "delete" && b.type === "delete") {
      if (a.pos < b.pos) r.pos = Math.max(b.pos - a.len, a.pos);
      else if (a.pos === b.pos) r.skip = true;
    }
    return r;
  }
  apply(op) {
    let x = { ...op };
    const conc = this.history.filter((h) => h.ver > (op.baseVer ?? this.version));
    for (const h of conc) x = OTEngine.xform(h, x);
    if (x.skip) return null;
    if (x.type === "insert") {
      const p = Math.max(0, Math.min(x.pos, this.text.length));
      this.text = this.text.slice(0, p) + x.chars + this.text.slice(p);
    } else if (x.type === "delete") {
      const p = Math.max(0, Math.min(x.pos, this.text.length));
      const l = Math.min(x.len, this.text.length - p);
      if (l > 0) this.text = this.text.slice(0, p) + this.text.slice(p + l);
    }
    this.version++;
    const rec = { ...x, ver: this.version };
    this.history.push(rec);
    if (this.history.length > 300) this.history = this.history.slice(-150);
    return rec;
  }
}

// ── State ─────────────────────────────────────────────────────
const engines = new Map();
const clients = new Map();
const lockedLines = new Map();

function getEngine(lang) {
  if (!engines.has(lang)) engines.set(lang, new OTEngine(STARTERS[lang] || ""));
  return engines.get(lang);
}

function broadcast(msg, excludeUserId = null) {
  const data = JSON.stringify(msg);
  for (const [uid, client] of clients) {
    if (uid !== excludeUserId && client.ws.readyState === 1) {
      client.ws.send(data);
    }
  }
}

function broadcastPresence() {
  const online = [...clients.values()].map((c) => ({
    id: c.user.id,
    username: c.user.username,
    color: c.user.color,
    initials: c.user.initials,
    lang: c.lang,
    cursor: c.cursor,
  }));
  broadcast({ type: "presence_list", users: online });
}

function broadcastLineLocks() {
  const locks = {};
  for (const [key, userId] of lockedLines) {
    const client = clients.get(userId);
    if (client) locks[key] = { userId, color: client.user.color, username: client.user.username };
  }
  broadcast({ type: "line_locks", locks });
}

function releaseLinesForUser(userId) {
  for (const [key, uid] of lockedLines) {
    if (uid === userId) lockedLines.delete(key);
  }
}

// ── WebSocket Server ──────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", async (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  const token = url.searchParams.get("token");

  if (!token) {
    ws.send(JSON.stringify({ type: "error", message: "No token provided" }));
    ws.close(1008, "Unauthorized");
    return;
  }

  let userId;
  let userPublic;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.sub;
    userPublic = await getUserById(userId);
    if (!userPublic) throw new Error("User not found");
  } catch (err) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
    ws.close(1008, "Unauthorized");
    return;
  }

  console.log(`[WS] ${userPublic.username} connected`);

  if (clients.has(userId)) {
    const old = clients.get(userId);
    releaseLinesForUser(userId);
    old.ws.close(1000, "Replaced by new session");
  }

  clients.set(userId, { ws, user: userPublic, lang: "ts", cursor: { line: 1, col: 1 } });

  const initLang = "ts";
  const eng = getEngine(initLang);
  ws.send(JSON.stringify({
    type: "init",
    user: userPublic,
    lang: initLang,
    text: eng.text,
    version: eng.version,
  }));

  broadcastPresence();
  broadcastLineLocks();

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const client = clients.get(userId);
    if (!client) return;

    switch (msg.type) {
      case "op": {
        const eng = getEngine(msg.lang);
        const result = eng.apply({ ...msg.op, uid: userId });
        if (result) {
          broadcast(
            { type: "op", lang: msg.lang, op: result, ver: eng.version, from: userId },
            userId
          );
        }
        break;
      }
      case "cursor": {
        client.lang = msg.lang || client.lang;
        client.cursor = { line: msg.line, col: msg.col };
        releaseLinesForUser(userId);
        if (msg.line && msg.lang) {
          lockedLines.set(`${msg.lang}:${msg.line}`, userId);
        }
        broadcast({
          type: "cursor",
          id: userId,
          username: userPublic.username,
          initials: userPublic.initials,
          color: userPublic.color,
          line: msg.line,
          col: msg.col,
          lang: msg.lang,
        }, userId);
        broadcastLineLocks();
        break;
      }
      case "line_leave": {
        const lockKey = `${msg.lang}:${msg.line}`;
        if (lockedLines.get(lockKey) === userId) {
          lockedLines.delete(lockKey);
          broadcastLineLocks();
        }
        break;
      }
      case "sync": {
        const eng = getEngine(msg.lang || "ts");
        ws.send(JSON.stringify({ type: "sync", lang: msg.lang, text: eng.text, version: eng.version }));
        break;
      }
      case "switch_lang": {
        client.lang = msg.lang;
        releaseLinesForUser(userId);
        broadcastLineLocks();
        broadcastPresence();
        const eng = getEngine(msg.lang);
        ws.send(JSON.stringify({ type: "sync", lang: msg.lang, text: eng.text, version: eng.version }));
        break;
      }
    }
  });

  ws.on("close", () => {
    console.log(`[WS] ${userPublic.username} disconnected`);
    releaseLinesForUser(userId);
    clients.delete(userId);
    broadcastPresence();
    broadcastLineLocks();
    broadcast({ type: "user_left", id: userId });
  });

  ws.on("error", (err) => {
    console.error(`[WS] Error for ${userPublic.username}:`, err.message);
    releaseLinesForUser(userId);
    clients.delete(userId);
  });
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
  console.log(`✅ Supabase connected`);
});
