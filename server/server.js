// server/server.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import express  from "express";
import cors     from "cors";
import fetch    from "node-fetch";
import helmet   from "helmet";
import neo4j    from "neo4j-driver";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// ─── Startup diagnostics ──────────────────────────────────────────────────────
console.log("─────────────────────────────────────────────");
console.log("GROQ_API_KEY  :", process.env.GROQ_API_KEY   ? "✅ loaded" : "❌ MISSING");
console.log("NEO4J_URI     :", process.env.NEO4J_URI       || "❌ MISSING");
console.log("NEO4J_USER    :", process.env.NEO4J_USER      || "❌ MISSING");
console.log("NEO4J_PASSWORD:", process.env.NEO4J_PASSWORD  ? "✅ loaded" : "❌ MISSING");
console.log("─────────────────────────────────────────────");

// ─── Express + HTTP server ────────────────────────────────────────────────────
const app    = express();
const server = createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5174";
const ALLOWED_ORIGINS = new Set([
  CLIENT_ORIGIN,
  "http://127.0.0.1:5174",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5178",
  "http://127.0.0.1:5178",
  "http://localhost:5179",
  "http://127.0.0.1:5179",
  "http://localhost:5180",
  "http://127.0.0.1:5180",
]);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    callback(new Error(`CORS denied by policy for origin: ${origin}`));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "512kb" }));
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new SocketIOServer(server, { cors: corsOptions });

// ══════════════════════════════════════════════════════════════════════════════
// ── OT ENGINE (collaborative code editor) ────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
class OTEngine {
  constructor(text = "") { this.text = text; this.version = 0; this.history = []; }
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
    const conc = this.history.filter(h => h.ver > (op.baseVer ?? this.version));
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
  reset(t) { this.text = t; this.version = 0; this.history = []; }
}

const STARTERS = {
  ts: `import { EventEmitter } from 'events';\ninterface Config { port: number; debug: boolean; }\nclass CKCEngine extends EventEmitter {\n  private config: Config;\n  constructor(config: Config) { super(); this.config = config; }\n  createSession(id: string) { console.log(\`Session: \${id}\`); }\n}\nconst engine = new CKCEngine({ port: 8080, debug: true });\nengine.createSession('sess_abc123');`,
  js: `const routes = new Map();\nconst get = (p, fn) => routes.set('GET:' + p, fn);\nget('/api/status', () => console.log(JSON.stringify({ status: 'ok' })));\nconsole.log('Server on http://localhost:3000');`,
  py: `def greet(name):\n    return f"Hello, {name}!"\n\nnumbers = [1, 2, 3, 4, 5]\nprint(greet("CKC-OS"))\nprint(f"Sum = {sum(numbers)}")`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from CKC-OS!");\n    }\n}`,
  cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}`,
  rs: `fn main() {\n    println!("Hello from Rust!");\n}`,
  go: `package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello from Go!")\n}`,
  sql: `SELECT 1 AS hello;`,
};

// Per-language OT engines (code editor)
const otEngines = new Map();
const getOTEngine = (lang) => {
  if (!otEngines.has(lang)) otEngines.set(lang, new OTEngine(STARTERS[lang] || ""));
  return otEngines.get(lang);
};

// ══════════════════════════════════════════════════════════════════════════════
// ── CHAT STATE ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const chatRooms   = {};   // channelId  → Message[]
const chatUsers   = {};   // socketId   → { ...user, channel }

// ══════════════════════════════════════════════════════════════════════════════
// ── EDITOR STATE (OT users) ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const editorUsers = new Map();  // socketId → { name, color, lang }

// ══════════════════════════════════════════════════════════════════════════════
// ── SOCKET.IO ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // ── CHAT EVENTS ────────────────────────────────────────────────────────────

  // Chat: user joins a channel
  socket.on("chat:join", ({ user, channel }) => {
    chatUsers[socket.id] = { ...user, channel };
    socket.join(`chat:${channel}`);
    socket.emit("chat:history", chatRooms[channel] || []);
    const inChannel = Object.values(chatUsers).filter(u => u.channel === channel);
    io.to(`chat:${channel}`).emit("chat:online_users", inChannel);
    console.log(`💬 ${user.name} joined #${channel}`);
  });

  // Chat: send message
  socket.on("chat:send_message", ({ channel, message }) => {
    if (!chatRooms[channel]) chatRooms[channel] = [];
    chatRooms[channel].push(message);
    if (chatRooms[channel].length > 200) chatRooms[channel].shift();
    io.to(`chat:${channel}`).emit("chat:new_message", message);
  });

  // Chat: thread reply
  socket.on("chat:send_reply", ({ channel, msgId, reply }) => {
    io.to(`chat:${channel}`).emit("chat:new_reply", { msgId, reply });
  });

  // Chat: reaction
  socket.on("chat:react", ({ channel, msgId, emoji, userId }) => {
    io.to(`chat:${channel}`).emit("chat:reaction", { msgId, emoji, userId });
  });

  // Chat: typing indicator
  socket.on("chat:typing", ({ channel, user, isTyping }) => {
    socket.to(`chat:${channel}`).emit("chat:typing", { user, isTyping });
  });

  // Chat: switch channel
  socket.on("chat:switch_channel", ({ oldChannel, newChannel, user }) => {
    socket.leave(`chat:${oldChannel}`);
    socket.join(`chat:${newChannel}`);
    chatUsers[socket.id] = { ...user, channel: newChannel };
    socket.emit("chat:history", chatRooms[newChannel] || []);
    const oldOnline = Object.values(chatUsers).filter(u => u.channel === oldChannel);
    const newOnline = Object.values(chatUsers).filter(u => u.channel === newChannel);
    io.to(`chat:${oldChannel}`).emit("chat:online_users", oldOnline);
    io.to(`chat:${newChannel}`).emit("chat:online_users", newOnline);
  });

  // ── EDITOR (OT) EVENTS ─────────────────────────────────────────────────────

  // Editor: user joins
  socket.on("editor:join", ({ name, color, lang = "ts" }) => {
    const username = typeof name === "string" ? name.trim().slice(0, 32) : "";
    const userColor = typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#4FC1FF";
    const ALLOWED_LANGS = new Set(["ts","js","py","java","cpp","rs","go","sql"]);
    const userLang = ALLOWED_LANGS.has(lang) ? lang : "ts";
    if (!username) { socket.emit("error", { message: "Authentication required." }); socket.disconnect(true); return; }

    editorUsers.set(socket.id, { name: username, color: userColor, lang: userLang });
    const eng = getOTEngine(userLang);
    socket.emit("editor:sync", { lang: userLang, text: eng.text, ver: eng.version });
    socket.broadcast.emit("editor:presence", { id: socket.id, name: username, color: userColor, online: true });
    const userList = [...editorUsers.entries()].map(([id, u]) => ({ id, ...u }));
    socket.emit("editor:user_list", userList);
    console.log(`✏️  Editor joined: ${username} [${socket.id}]`);
  });

  // Editor: OT operation
  socket.on("editor:op", ({ lang, op }) => {
    const user = editorUsers.get(socket.id);
    if (!user || typeof op !== "object" || !op) return;
    const ALLOWED_LANGS = new Set(["ts","js","py","java","cpp","rs","go","sql"]);
    const safeLang = ALLOWED_LANGS.has(lang) ? lang : user.lang;
    if (!["insert","delete"].includes(op.type) || typeof op.pos !== "number" || op.pos < 0) return;
    if (op.type === "insert" && typeof op.chars !== "string") return;
    if (op.type === "delete" && typeof op.len !== "number") return;
    const eng = getOTEngine(safeLang);
    const applied = eng.apply({ ...op, uid: socket.id });
    if (applied) socket.broadcast.emit("editor:op", { lang: safeLang, op: applied, ver: eng.version });
  });

  // Editor: switch language
  socket.on("editor:switch_lang", ({ lang }) => {
    const user = editorUsers.get(socket.id);
    const ALLOWED_LANGS = new Set(["ts","js","py","java","cpp","rs","go","sql"]);
    if (!user || !ALLOWED_LANGS.has(lang)) return;
    editorUsers.set(socket.id, { ...user, lang });
    const eng = getOTEngine(lang);
    socket.emit("editor:sync", { lang, text: eng.text, ver: eng.version });
  });

  // Editor: cursor broadcast
  socket.on("editor:cursor", ({ line, col, lang }) => {
    const user = editorUsers.get(socket.id);
    if (!user || typeof line !== "number" || typeof col !== "number") return;
    const ALLOWED_LANGS = new Set(["ts","js","py","java","cpp","rs","go","sql"]);
    const safeLang = ALLOWED_LANGS.has(lang) ? lang : user.lang;
    socket.broadcast.emit("editor:cursor", { id: socket.id, name: user.name, color: user.color, line, col, lang: safeLang });
  });

  // ── DISCONNECT ─────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    // Chat cleanup
    const chatUser = chatUsers[socket.id];
    if (chatUser) {
      delete chatUsers[socket.id];
      const inChannel = Object.values(chatUsers).filter(u => u.channel === chatUser.channel);
      io.to(`chat:${chatUser.channel}`).emit("chat:online_users", inChannel);
    }

    // Editor cleanup
    const editorUser = editorUsers.get(socket.id);
    if (editorUser) {
      socket.broadcast.emit("editor:presence", { id: socket.id, online: false });
      editorUsers.delete(socket.id);
      console.log(`👋 Editor left: ${editorUser.name} [${socket.id}]`);
    }

    console.log("🔌 Socket disconnected:", socket.id);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── NEO4J ─────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const driver = neo4j.driver(
  process.env.NEO4J_URI      || "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER     || "neo4j",
    process.env.NEO4J_PASSWORD || "password"
  ),
  { maxConnectionPoolSize: 50 }
);
try {
  await driver.getServerInfo();
  console.log("✅ Neo4j connected:", process.env.NEO4J_URI);
} catch (err) {
  console.warn("⚠️  Neo4j connection failed:", err.message);
}

function toNum(v) {
  if (v == null) return 0;
  return typeof v.toNumber === "function" ? v.toNumber() : (Number(v) || 0);
}
async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try   { return await session.run(cypher, params); }
  finally { await session.close(); }
}
async function reconstructGraph(graphId, nodes) {
  const prefix = graphId + "__";
  const withConnections = await Promise.all(
    nodes.map(async (n) => {
      const res = await runQuery(
        `MATCH (a:KGNode {id: $id})-[:CONNECTS]->(b:KGNode) RETURN b.id AS tid`,
        { id: n.id }
      );
      return {
        ...n,
        id:          n.id.replace(prefix, ""),
        connections: res.records.map((r) => r.get("tid").replace(prefix, "")),
      };
    })
  );
  return {
    concepts:     withConnections.filter((n) => n.type === "concept"),
    errors:       withConnections.filter((n) => n.type === "error"),
    fixes:        withConnections.filter((n) => n.type === "fix"),
    explanations: withConnections.filter((n) => n.type === "explanation"),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ── REST API ROUTES ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/chat  (Groq proxy)
app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY not set on server." });
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages))
    return res.status(400).json({ error: "'messages' must be an array." });
  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages }),
    });
    const data = await groqRes.json();
    if (!groqRes.ok) return res.status(groqRes.status).json({ error: data });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/graphs
app.post("/api/graphs", async (req, res) => {
  const { language, code, graph, name } = req.body;
  if (!graph || (!graph.concepts && !graph.errors))
    return res.status(400).json({ error: "Invalid graph payload." });
  const id = uuidv4(), savedAt = new Date().toISOString();
  const label = name || `${language || "unknown"} — ${new Date().toLocaleTimeString()}`;
  const session = driver.session();
  try {
    await session.writeTransaction(async (tx) => {
      await tx.run(
        `CREATE (g:CodeGraph { id:$id, name:$name, language:$language, code:$code, savedAt:$savedAt,
           conceptCount:$cc, errorCount:$ec, fixCount:$fc, explanationCount:$xc })`,
        { id, name: label, language: language || "unknown", code: code || "", savedAt,
          cc: neo4j.int((graph.concepts     || []).length),
          ec: neo4j.int((graph.errors       || []).length),
          fc: neo4j.int((graph.fixes        || []).length),
          xc: neo4j.int((graph.explanations || []).length) }
      );
      const allNodes = [
        ...(graph.concepts || []), ...(graph.errors || []),
        ...(graph.fixes || []),    ...(graph.explanations || []),
      ];
      for (const n of allNodes) {
        await tx.run(
          `MATCH (g:CodeGraph {id: $graphId})
           CREATE (n:KGNode { id:$nodeId, graphId:$graphId, label:$label, type:$type, desc:$desc })
           CREATE (g)-[:HAS_NODE]->(n)`,
          { graphId: id, nodeId: `${id}__${n.id}`, label: n.label || "", type: n.type || "concept", desc: n.desc || "" }
        );
      }
      for (const n of allNodes) {
        for (const tid of (n.connections || [])) {
          await tx.run(
            `MATCH (a:KGNode {id: $from}) MATCH (b:KGNode {id: $to}) CREATE (a)-[:CONNECTS]->(b)`,
            { from: `${id}__${n.id}`, to: `${id}__${tid}` }
          );
        }
      }
    });
    res.json({ id, name: label, language, savedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// GET /api/graphs
app.get("/api/graphs", async (req, res) => {
  try {
    const result = await runQuery(
      `MATCH (g:CodeGraph) OPTIONAL MATCH (g)-[:HAS_NODE]->(n:KGNode)
       WITH g, collect(n) AS nodes
       RETURN g { .id, .name, .language, .savedAt, .code,
                  .conceptCount, .errorCount, .fixCount, .explanationCount } AS graph,
              [nd IN nodes | nd { .id, .label, .type, .desc }] AS nodes
       ORDER BY g.savedAt DESC`
    );
    const graphs = await Promise.all(
      result.records.map(async (record) => {
        const g = record.get("graph"), nodes = record.get("nodes");
        const reconstructed = await reconstructGraph(g.id, nodes);
        reconstructed.language = g.language;
        return {
          id: g.id, name: g.name, language: g.language, savedAt: g.savedAt, code: g.code,
          counts: {
            concept:     toNum(g.conceptCount), error:       toNum(g.errorCount),
            fix:         toNum(g.fixCount),     explanation: toNum(g.explanationCount),
          },
          graph: reconstructed,
        };
      })
    );
    res.json(graphs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/graphs/:id
app.get("/api/graphs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await runQuery(
      `MATCH (g:CodeGraph {id: $id}) OPTIONAL MATCH (g)-[:HAS_NODE]->(n:KGNode)
       RETURN g { .id, .name, .language, .savedAt, .code } AS graph,
              collect(n { .id, .label, .type, .desc }) AS nodes`, { id }
    );
    if (!result.records.length) return res.status(404).json({ error: "Graph not found." });
    const g = result.records[0].get("graph"), nodes = result.records[0].get("nodes");
    const reconstructed = await reconstructGraph(g.id, nodes);
    reconstructed.language = g.language;
    res.json({ id: g.id, name: g.name, language: g.language, savedAt: g.savedAt, code: g.code, graph: reconstructed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/graphs/:id  (rename)
app.patch("/api/graphs/:id", async (req, res) => {
  const { id } = req.params, { name } = req.body;
  if (!name || typeof name !== "string") return res.status(400).json({ error: "name is required." });

  try {
    const result = await runQuery(
      `MATCH (g:CodeGraph {id: $id}) SET g.name = $name RETURN g.id AS id, g.name AS name`,
      { id, name: name.trim() }
    );
    if (!result.records.length) return res.status(404).json({ error: "Graph not found." });
    res.json({ id, name: result.records[0].get("name") });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/graphs/:id ──────────────────────────────────────────────────
// ── DELETE /api/graphs/:id ────────────────────────────────────────────────────
// DELETE /api/graphs/:id
app.delete("/api/graphs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery(
      `MATCH (g:CodeGraph {id: $id}) OPTIONAL MATCH (g)-[:HAS_NODE]->(n:KGNode) DETACH DELETE n, g`,
      { id }
    );
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/graphs/:id/nodes/:nodeLocalId  (edit node) ───────────────────
// ── PATCH /api/graphs/:id/nodes/:nodeLocalId ──────────────────────────────────
// PATCH /api/graphs/:id/nodes/:nodeLocalId
app.patch("/api/graphs/:id/nodes/:nodeLocalId", async (req, res) => {
  const { id, nodeLocalId } = req.params, { label, desc } = req.body;
  if (label == null && desc == null) return res.status(400).json({ error: "Provide label and/or desc." });
  const globalNodeId = `${id}__${nodeLocalId}`;
  const setClauses = [];
  const params = { nodeId: globalNodeId };
  const setClauses   = [];
  const params       = { nodeId: globalNodeId };
  const setClauses = [], params = { nodeId: globalNodeId };
  if (label != null) { setClauses.push("n.label = $label"); params.label = label.trim(); }
  if (desc  != null) { setClauses.push("n.desc  = $desc");  params.desc  = desc.trim(); }
  try {
    const result = await runQuery(
      `MATCH (n:KGNode {id: $nodeId}) SET ${setClauses.join(", ")}
       RETURN n.id AS id, n.label AS label, n.type AS type, n.desc AS desc`, params
    );
    if (!result.records.length) return res.status(404).json({ error: "Node not found." });
    const r = result.records[0];
    res.json({ id: r.get("id").replace(`${id}__`, ""), label: r.get("label"), type: r.get("type"), desc: r.get("desc") });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /health
app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} already in use. Run: kill $(lsof -t -i:${PORT})`);
// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 4 — Performance monitor: data collectors
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_HISTORY    = 300;
const metricsHistory = [];
const requestLog     = [];
const errorLog       = [];
const activeAlerts   = [];

let tickCount       = 0;
let serverStartTime = Date.now();
let prevNetBytes    = null;
let cpuSnapshot1    = null;

const endpointState = {
  "/api/login":    { base: 78,  current: 78  },
  "/api/users":    { base: 95,  current: 95  },
  "/api/products": { base: 140, current: 140 },
  "/api/orders":   { base: 210, current: 210 },
  "/api/search":   { base: 380, current: 380 },
  "/api/payments": { base: 165, current: 165 },
  "/api/reports":  { base: 460, current: 460 },
};

let reqCounters = { total: 0, success: 0, errors: 0 };

function readMemInfo() {
  try {
    const raw = fs.readFileSync("/proc/meminfo", "utf8");
    const obj = {};
    raw.split("\n").forEach((line) => {
      const m = line.match(/^(\w+):\s+(\d+)/);
      if (m) obj[m[1]] = parseInt(m[2]);
    });
    return obj;
  } catch { return null; }
}

function readNetDev() {
  try {
    const raw = fs.readFileSync("/proc/net/dev", "utf8");
    return raw.split("\n").slice(2).filter(Boolean).map((line) => {
      const p = line.trim().split(/\s+/);
      return {
        iface:    p[0].replace(":", ""),
        rxBytes:  parseInt(p[1])  || 0,
        txBytes:  parseInt(p[9])  || 0,
        rxPkts:   parseInt(p[2])  || 0,
        txPkts:   parseInt(p[10]) || 0,
        rxErrors: parseInt(p[3])  || 0,
        txErrors: parseInt(p[11]) || 0,
        rxDrop:   parseInt(p[4])  || 0,
        txDrop:   parseInt(p[12]) || 0,
      };
    });
  } catch { return []; }
}

function readCpuStat() {
  try {
    const raw = fs.readFileSync("/proc/stat", "utf8");
    return raw.split("\n").filter((l) => l.startsWith("cpu")).map((line) => {
      const parts = line.split(/\s+/);
      const [user, nice, system, idle, iowait, irq, softirq, steal] = parts.slice(1).map(Number);
      const total = user + nice + system + idle + iowait + irq + softirq + steal;
      return { name: parts[0], user, nice, system, idle, iowait, irq, softirq, steal, total };
    });
  } catch { return []; }
}

function computeCpuLoad(prev, curr) {
  if (!prev || !curr || prev.total === curr.total) return null;
  const idleDelta  = curr.idle  - prev.idle;
  const totalDelta = curr.total - prev.total;
  if (totalDelta === 0) return null;
  return +((1 - idleDelta / totalDelta) * 100).toFixed(1);
}

function getRealMemory() {
  const info = readMemInfo();
  if (!info) {
    const total = os.totalmem(), free = os.freemem();
    return {
      totalMB: Math.round(total / 1048576), usedMB: Math.round((total - free) / 1048576),
      freeMB: Math.round(free / 1048576), usedPct: +((1 - free / total) * 100).toFixed(1),
      cachedMB: 0, swapTotal: 0, swapUsed: 0,
    };
  }
  const totalMB   = Math.round(info.MemTotal / 1024);
  const availMB   = Math.round((info.MemAvailable || info.MemFree) / 1024);
  const usedMB    = totalMB - availMB;
  const swapTotal = Math.round((info.SwapTotal || 0) / 1024);
  const swapFree  = Math.round((info.SwapFree  || 0) / 1024);
  return {
    totalMB, usedMB,
    freeMB:   Math.round(info.MemFree / 1024),
    availMB,
    cachedMB: Math.round((info.Cached || 0) / 1024),
    usedPct:  +((usedMB / totalMB) * 100).toFixed(1),
    swapTotal, swapUsed: swapTotal - swapFree,
  };
}

function getNetworkRates() {
  const devs = readNetDev().filter((d) => d.iface !== "lo");
  if (!devs.length) return { rxBps: 0, txBps: 0, rxPps: 0, txPps: 0 };

  const now         = Date.now();
  const totalRx     = devs.reduce((a, d) => a + d.rxBytes, 0);
  const totalTx     = devs.reduce((a, d) => a + d.txBytes, 0);
  const totalRxPkts = devs.reduce((a, d) => a + d.rxPkts,  0);
  const totalTxPkts = devs.reduce((a, d) => a + d.txPkts,  0);

  let rxBps = 0, txBps = 0, rxPps = 0, txPps = 0;
  if (prevNetBytes) {
    const dt = (now - prevNetBytes.ts) / 1000;
    rxBps = Math.max(0, Math.round((totalRx     - prevNetBytes.rx)     / dt));
    txBps = Math.max(0, Math.round((totalTx     - prevNetBytes.tx)     / dt));
    rxPps = Math.max(0, Math.round((totalRxPkts - prevNetBytes.rxPkts) / dt));
    txPps = Math.max(0, Math.round((totalTxPkts - prevNetBytes.txPkts) / dt));
  }
  prevNetBytes = { ts: now, rx: totalRx, tx: totalTx, rxPkts: totalRxPkts, txPkts: totalTxPkts };
  return { rxBps, txBps, rxPps, txPps };
}

const smooth = (v, mn, mx, vol) => Math.max(mn, Math.min(mx, v + (Math.random() - 0.5) * vol));

const API_METHODS    = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const STATUS_WEIGHTS = [[200,55],[201,12],[204,5],[301,2],[400,8],[401,5],[403,3],[404,4],[429,2],[500,2],[502,1],[503,1]];

function randStatus() {
  const total = STATUS_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [code, weight] of STATUS_WEIGHTS) { r -= weight; if (r <= 0) return code; }
  return 200;
}

let simState = { resp: 140, err: 0.4, rps: 1200, p50: 24, p95: 60, p99: 95, thr: 1.2 };

function httpStatusMsg(code) {
  return ({
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
    429: "Too Many Requests", 500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable",
  })[code] || `HTTP ${code}`;
}

function updateSimMetrics() {
  const spike = Math.random() < 0.04;
  if (spike) {
    simState.resp += 80 + Math.random() * 180;
    simState.err  += 1.5 + Math.random() * 2;
  } else {
    simState.resp = smooth(simState.resp, 45, 480, 15);
    simState.err  = smooth(simState.err,  0,  6,   0.25);
  }
  simState.p50 = smooth(simState.p50, 8, 80, 4);
  simState.p95 = Math.max(simState.p50 + 20, smooth(simState.p95, simState.p50 + 20, 220, 8));
  simState.p99 = Math.max(simState.p95 + 20, smooth(simState.p99, simState.p95 + 20, 380, 12));
  simState.thr = smooth(simState.thr, 0.4, 4.2, 0.12);
  simState.rps = smooth(simState.rps, 200, 4800, 120);

  for (const ep of Object.values(endpointState))
    ep.current = smooth(ep.current, ep.base * 0.5, ep.base * 2.2, ep.base * 0.07);

  const newReqs = Math.round(simState.rps);
  const newErrs = Math.round(newReqs * Math.min(simState.err / simState.rps, 0.15));
  reqCounters.total   += newReqs;
  reqCounters.success += newReqs - newErrs;
  reqCounters.errors  += newErrs;

  const epKey    = Object.keys(endpointState)[Math.floor(Math.random() * 7)];
  const status   = randStatus();
  const method   = API_METHODS[Math.floor(Math.random() * API_METHODS.length)];
  const duration = +(endpointState[epKey].current * (0.85 + Math.random() * 0.3)).toFixed(0);

  const entry = {
    id: uuidv4(), ts: new Date().toISOString(), method,
    path: epKey, status, duration,
    size: Math.round(Math.random() * 12000 + 200),
  };
  requestLog.unshift(entry);
  if (requestLog.length > 500) requestLog.pop();

  if (status >= 400) {
    errorLog.unshift({ ...entry, msg: httpStatusMsg(status) });
    if (errorLog.length > 200) errorLog.pop();
  }

  return spike;
}

const ALERT_RULES = [
  { id: 1, name: "High response time", metric: "resp",   op: ">", threshold: 300, severity: "critical" },
  { id: 2, name: "Error rate spike",   metric: "err",    op: ">", threshold: 3,   severity: "warning"  },
  { id: 3, name: "Low throughput",     metric: "thr",    op: "<", threshold: 0.8, severity: "warning"  },
  { id: 4, name: "P99 latency",        metric: "p99",    op: ">", threshold: 250, severity: "critical" },
  { id: 5, name: "High memory usage",  metric: "memPct", op: ">", threshold: 85,  severity: "warning"  },
  { id: 6, name: "High CPU load",      metric: "cpuPct", op: ">", threshold: 85,  severity: "critical" },
];

function evaluateAlerts(snapshot) {
  const map = {
    resp:   snapshot.api?.resp,
    err:    snapshot.api?.err,
    thr:    snapshot.api?.thr,
    p99:    snapshot.api?.p99,
    memPct: snapshot.memory?.usedPct,
    cpuPct: snapshot.cpu?.loadPct,
  };
  ALERT_RULES.filter((r) => {
    const v = map[r.metric];
    return v != null && (r.op === ">" ? v > r.threshold : v < r.threshold);
  }).forEach((r) => {
    activeAlerts.unshift({
      id: uuidv4(), ts: new Date().toISOString(),
      ruleId: r.id, rule: r.name, severity: r.severity,
      metric: r.metric, value: +(map[r.metric] || 0).toFixed(2),
      threshold: r.threshold, op: r.op,
      msg: `${r.metric.toUpperCase()} = ${+(map[r.metric] || 0).toFixed(2)} (threshold: ${r.op} ${r.threshold})`,
    });
  });
  if (activeAlerts.length > 200) activeAlerts.splice(200);
}

async function buildSnapshot() {
  const cpuNow = readCpuStat();
  let cpuPct = null, cpuCores = [];

  if (cpuSnapshot1 && cpuNow.length) {
    cpuPct   = computeCpuLoad(cpuSnapshot1[0], cpuNow[0]);
    cpuCores = cpuNow.slice(1).map((core, i) => ({ id: i, pct: computeCpuLoad(cpuSnapshot1[i + 1], core) }));
  }
  cpuSnapshot1 = cpuNow;

  const loadAvg     = os.loadavg()[0];
  const cpuCount    = os.cpus().length;
  const cpuPctFinal = cpuPct != null ? cpuPct : +(Math.min(100, (loadAvg / cpuCount) * 100)).toFixed(1);

  const mem     = getRealMemory();
  const net     = getNetworkRates();
  const procMem = process.memoryUsage();
  const spike   = updateSimMetrics();

  const snapshot = {
    ts: new Date().toISOString(), tick: ++tickCount, spike,
    cpu: {
      loadPct:   cpuPctFinal,
      loadAvg1:  +os.loadavg()[0].toFixed(2),
      loadAvg5:  +os.loadavg()[1].toFixed(2),
      loadAvg15: +os.loadavg()[2].toFixed(2),
      cores:     cpuCores,
      count:     cpuCount,
    },
    memory: {
      ...mem,
      nodeHeapUsedMB:  +(procMem.heapUsed  / 1048576).toFixed(1),
      nodeHeapTotalMB: +(procMem.heapTotal  / 1048576).toFixed(1),
      nodeRssMB:       +(procMem.rss        / 1048576).toFixed(1),
    },
    network: {
      rxBps:  net.rxBps,
      txBps:  net.txBps,
      rxKBps: +(net.rxBps / 1024).toFixed(2),
      txKBps: +(net.txBps / 1024).toFixed(2),
      rxPps:  net.rxPps,
      txPps:  net.txPps,
    },
    api: {
      resp:         +simState.resp.toFixed(1),
      err:          +simState.err.toFixed(2),
      rps:          Math.round(simState.rps),
      thr:          +simState.thr.toFixed(2),
      p50:          +simState.p50.toFixed(1),
      p95:          +simState.p95.toFixed(1),
      p99:          +simState.p99.toFixed(1),
      totalReqs:    reqCounters.total,
      totalErrors:  reqCounters.errors,
      errorRatePct: reqCounters.total ? +((reqCounters.errors / reqCounters.total) * 100).toFixed(2) : 0,
    },
    endpoints: Object.entries(endpointState).map(([p, ep]) => ({
      path: p, latencyMs: +ep.current.toFixed(0),
      rps: +(simState.rps * (ep.base / 1400)).toFixed(0),
    })),
    os: {
      uptime:       Math.round(os.uptime()),
      serverUptime: Math.round((Date.now() - serverStartTime) / 1000),
      hostname:     os.hostname(),
      platform:     os.platform(),
      nodeVersion:  process.version,
      pid:          process.pid,
    },
  };

  evaluateAlerts(snapshot);
  metricsHistory.push(snapshot);
  if (metricsHistory.length > MAX_HISTORY) metricsHistory.shift();
  return snapshot;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 5 — Performance monitor REST routes
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/metrics/latest",    (_req, res) => res.json(metricsHistory[metricsHistory.length - 1] || {}));
app.get("/api/metrics/history",   (req,  res) => res.json(metricsHistory.slice(-Math.min(parseInt(req.query.n) || 60, MAX_HISTORY))));
app.get("/api/metrics/endpoints", (_req, res) => res.json(Object.entries(endpointState).map(([p, ep]) => ({ path: p, base: ep.base, current: +ep.current.toFixed(0) }))));

app.get("/api/logs/requests", (req, res) => res.json(requestLog.slice(0, Math.min(parseInt(req.query.limit) || 50, 200))));
app.get("/api/logs/errors",   (req, res) => res.json(errorLog.slice  (0, Math.min(parseInt(req.query.limit) || 50, 200))));

app.get("/api/alerts",       (_req, res) => res.json(activeAlerts.slice(0, 50)));
app.get("/api/alerts/rules", (_req, res) => res.json(ALERT_RULES));

app.get("/api/metrics/codes", (_req, res) => {
  const dist = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
  requestLog.forEach((r) => {
    if      (r.status < 300) dist["2xx"]++;
    else if (r.status < 400) dist["3xx"]++;
    else if (r.status < 500) dist["4xx"]++;
    else                     dist["5xx"]++;
  });
  res.json(dist);
});

app.get("/api/services", (_req, res) => {
  const snap  = metricsHistory[metricsHistory.length - 1];
  const memOk = !snap || snap.memory.usedPct < 90;
  const cpuOk = !snap || snap.cpu.loadPct    < 95;
  res.json([
    { name: "API Gateway",  ok: true,                  warn: false,               latency: Math.round(4  + Math.random() * 8)  },
    { name: "Auth Service", ok: true,                  warn: false,               latency: Math.round(10 + Math.random() * 15) },
    { name: "Database",     ok: true,                  warn: !memOk,              latency: Math.round(14 + Math.random() * 20) },
    { name: "Cache",        ok: Math.random() > 0.05,  warn: Math.random() < 0.1, latency: Math.round(2  + Math.random() * 10) },
    { name: "Queue",        ok: true,                  warn: false,               latency: Math.round(4  + Math.random() * 8)  },
    { name: "CDN",          ok: true,                  warn: false,               latency: Math.round(2  + Math.random() * 5)  },
    { name: "Storage",      ok: cpuOk,                 warn: !cpuOk,              latency: Math.round(18 + Math.random() * 25) },
  ]);
});

app.get("/api/system", (_req, res) => {
  const cpu = os.cpus();
  res.json({
    hostname: os.hostname(), platform: os.platform(), arch: os.arch(),
    cpuModel: cpu[0]?.model || "Unknown", cpuCores: cpu.length,
    totalMemGB: +(os.totalmem() / 1073741824).toFixed(2),
    nodeVersion: process.version, pid: process.pid,
    uptime:       Math.round(os.uptime()),
    serverUptime: Math.round((Date.now() - serverStartTime) / 1000),
  });
});

app.get("/api/traces", (_req, res) => {
  const defs = [
    { method: "POST", path: "/api/orders",  stages: [{ name:"DNS",color:"#8b5cf6",base:12 },{ name:"TCP",color:"#3b82f6",base:8 },{ name:"Auth",color:"#14b8a6",base:18 },{ name:"API",color:"#f59e0b",base:95 },{ name:"DB",color:"#ef4444",base:180 },{ name:"Cache",color:"#10b981",base:6 },{ name:"Queue",color:"#f43f5e",base:23 }] },
    { method: "GET",  path: "/api/search",  stages: [{ name:"DNS",color:"#8b5cf6",base:8 },{ name:"API",color:"#f59e0b",base:62 },{ name:"Search",color:"#ef4444",base:380 },{ name:"Cache",color:"#10b981",base:4 },{ name:"Format",color:"#3b82f6",base:64 }] },
    { method: "POST", path: "/api/login",   stages: [{ name:"DNS",color:"#8b5cf6",base:6 },{ name:"Auth",color:"#14b8a6",base:28 },{ name:"DB",color:"#ef4444",base:72 },{ name:"Token",color:"#10b981",base:22 }] },
    { method: "GET",  path: "/api/reports", stages: [{ name:"Auth",color:"#14b8a6",base:15 },{ name:"DB",color:"#ef4444",base:640 },{ name:"Agg",color:"#f59e0b",base:180 },{ name:"Format",color:"#3b82f6",base:57 }] },
  ];
  res.json(defs.map((def, i) => {
    const stages = def.stages.map((s) => ({ ...s, ms: Math.max(1, Math.round(s.base * (0.8 + Math.random() * 0.4))) }));
    const total  = stages.reduce((a, s) => a + s.ms, 0);
    const status = total > 800 ? 504 : total > 400 ? (Math.random() < 0.1 ? 500 : 200) : 200;
    return {
      id: `tr-${String(i + 1).padStart(3, "0")}`, method: def.method,
      path: def.path, total, status, stages, ts: new Date().toISOString(),
    };
  }));
});

app.get("/api/metrics/heatmap", (_req, res) => {
  const days  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + ":00");
  res.json(days.map((day) => ({
    day,
    hours: hours.map((hour) => {
      const h = parseInt(hour), isWeekend = day === "Sat" || day === "Sun";
      const base = h >= 9 && h <= 18
        ? (isWeekend ? 30 + Math.random() * 25 : 65 + Math.random() * 30)
        : h < 6 || h > 22 ? 3 + Math.random() * 10 : 20 + Math.random() * 35;
      return { hour, val: Math.round(base) };
    }),
  })));
});

app.get("/api/metrics/weekly", (_req, res) => {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  let resp = 140, err = 1.2, rps = 1800;
  res.json(days.map((day) => {
    resp = smooth(resp, 80, 280, 30);
    err  = smooth(err,  0.2, 5, 0.8);
    rps  = smooth(rps,  800, 3500, 300);
    return { day, resp: +resp.toFixed(0), err: +err.toFixed(1), rps: +rps.toFixed(0), uptime: +(99 + Math.random() * 0.99).toFixed(2) };
  }));
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 6 — Shared health endpoint
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/health", (_req, res) =>
  res.json({ ok: true, neo4j: neo4jReady, ts: new Date().toISOString(), uptime: process.uptime() })
);

// ── /api/chat/health alias (kept for any frontend that polls it) ──────────────
app.get("/api/chat/health", (_req, res) => res.json({ ok: true }));

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 7 — WebSocket servers
//
//  Two WS servers share ONE http.Server via path discrimination:
//    /ws   → live chat  (initChatServer from chat.js)
//    *     → metrics dashboard (handled here)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Metrics WebSocket (path "/metrics") ────────────────────────────────────────
const metricsWss = new WebSocketServer({ noServer: true });

metricsWss.on("connection", (ws) => {
  console.log("[Metrics WS] Client connected");
  if (metricsHistory.length > 0)
    ws.send(JSON.stringify({ type: "history", data: metricsHistory.slice(-60) }));
  
  // Send heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: "ping" }));
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);
  
  ws.on("close", () => {
    clearInterval(heartbeat);
    console.log("[Metrics WS] Client disconnected");
  });
  ws.on("error", (err) => console.error("[Metrics WS] Error:", err.message));
});

function broadcastSnapshot(snapshot) {
  const msg = JSON.stringify({ type: "tick", data: snapshot });
  metricsWss.clients.forEach((client) => {
    if (client.readyState === 1 /* OPEN */) client.send(msg);
  });
}

// ── Live Chat WebSocket (path "/ws") ─────────────────────────────────────────
const chatWss = initChatServer();

// ── Multiplex WebSocket Upgrades ─────────────────────────────────────────────
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, 'http://localhost');

  if (pathname === '/metrics') {
    metricsWss.handleUpgrade(request, socket, head, (ws) => {
      metricsWss.emit('connection', ws, request);
    });
  } else if (pathname === '/ws') {
    chatWss.handleUpgrade(request, socket, head, (ws) => {
      chatWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 8 — 1-second metrics ticker
// ═══════════════════════════════════════════════════════════════════════════════

readCpuStat(); // warm up CPU baseline

setInterval(async () => {
  try { broadcastSnapshot(await buildSnapshot()); }
  catch (err) { console.error("[Tick error]", err.message); }
}, 1000);

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 9 — Start
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n🚀  Combined server running  → http://localhost:${PORT}`);
  console.log(`📡  Metrics WebSocket        → ws://localhost:${PORT}/metrics`);
  console.log(`💬  Live Chat WebSocket      → ws://localhost:${PORT}/ws`);
  console.log(`🔍  KG API                   → http://localhost:${PORT}/api/graphs`);
  console.log(`📊  Metrics                  → http://localhost:${PORT}/api/metrics/latest`);
  console.log(`🤖  AI proxy                 → POST http://localhost:${PORT}/api/chat`);
  console.log(`❤️   Health                   → http://localhost:${PORT}/health\n`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} in use. Run:  kill $(lsof -t -i:${PORT})`);
    process.exit(1);
  }
  if (err.code === "EADDRINUSE") { console.error(`❌ Port ${PORT} in use.`); process.exit(1); }
});
process.on("SIGINT",  async () => { await driver.close(); process.exit(0); });
process.on("SIGTERM", async () => { await driver.close(); process.exit(0); });