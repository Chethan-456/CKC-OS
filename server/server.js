/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CKC-OS  ·  Combined Server                                  ║
 * ║  File location:  CKC-OS/server/index.js                      ║
 * ║                                                              ║
 * ║  Handles:                                                    ║
 * ║   • Knowledge Graph API  (Neo4j)                             ║
 * ║   • Groq AI proxy        POST /api/chat                      ║
 * ║   • Live Chat WebSocket  ws://…/ws   (chat.js)               ║
 * ║   • Metrics WebSocket    ws://…/     (live dashboard)        ║
 * ║   • Performance monitor  /api/metrics/*                      ║
 * ║   • All original REST routes unchanged                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Setup
 * ──────
 *  npm install groq-sdk ws uuid neo4j-driver express cors node-fetch dotenv
 *
 *  .env
 *    GROQ_API_KEY=gsk_…
 *    NEO4J_URI=bolt://localhost:7687
 *    NEO4J_USER=neo4j
 *    NEO4J_PASSWORD=secret
 *    PORT=5000
 *
 *  chat.js must export: { initChatServer, chatRouter, getHistory, getPresenceForChannel }
 */

import dotenv from "dotenv";
import path   from "path";
import { fileURLToPath } from "url";
import { createRequire }  from "module";

// ─── ESM / CJS interop ───────────────────────────────────────────────────────
const require    = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import express  from "express";
import cors     from "cors";
import fetch    from "node-fetch";
import neo4j    from "neo4j-driver";
import { v4 as uuidv4 } from "uuid";
import http     from "http";
import { WebSocketServer } from "ws";
import os       from "os";
import fs       from "fs";

// ─── Chat module (CJS → ESM via createRequire) ───────────────────────────────
// chat.js uses require('ws') / require('uuid') / require('express') — all CJS.
import {
  initChatServer,
  chatRouter,
  getHistory,
  getPresenceForChannel,
} from "./chat.js";

// ─── Startup diagnostics ─────────────────────────────────────────────────────
console.log("─────────────────────────────────────────────");
console.log("GROQ_API_KEY  :", process.env.GROQ_API_KEY   ? "✅ (" + process.env.GROQ_API_KEY.slice(0, 8) + "...)" : "❌ MISSING");
console.log("NEO4J_URI     :", process.env.NEO4J_URI       || "❌ MISSING");
console.log("NEO4J_USER    :", process.env.NEO4J_USER      || "❌ MISSING");
console.log("NEO4J_PASSWORD:", process.env.NEO4J_PASSWORD  ? "✅ loaded"  : "❌ MISSING");
console.log("─────────────────────────────────────────────");

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 1 — Express app + shared HTTP server
// ═══════════════════════════════════════════════════════════════════════════════

const app    = express();
const server = http.createServer(app);   // single http.Server shared by ALL WebSocket servers

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 2 — Neo4j
// ═══════════════════════════════════════════════════════════════════════════════

const driver = neo4j.driver(
  process.env.NEO4J_URI      || "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER     || "neo4j",
    process.env.NEO4J_PASSWORD || "password"
  ),
  { 
    maxConnectionPoolSize: 50,
    logging: {
      level: 'error',
      logger: (level, message) => {
        // Suppress routing discovery spam when Neo4j is paused/offline
        if (message && !String(message).includes('Could not perform discovery')) {
          console.error(`[Neo4j ${level}] ${message}`);
        }
      }
    }
  }
);

let neo4jReady = false;
driver.getServerInfo()
  .then(() => { neo4jReady = true; console.log("✅ Neo4j connected:", process.env.NEO4J_URI); })
  .catch(err  => console.log("⚠️  Neo4j unavailable (save/load disabled). This is expected if the Aura DB is paused."));

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

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 3 — Knowledge Graph + Chat REST routes
// ═══════════════════════════════════════════════════════════════════════════════

// ── POST /api/chat  (Groq AI proxy — single authoritative definition) ─────────
// chat.js's chatRouter is mounted here; the old inline handler is removed.
// chat.js reads GROQ_API_KEY from process.env at request time, same as before.
app.use("/api/chat", chatRouter);

// ── Live-chat history / presence REST helpers ─────────────────────────────────
app.get("/api/chat/history/:channel",  (req, res) => res.json(getHistory(req.params.channel)));
app.get("/api/chat/presence/:channel", (req, res) => res.json({ users: getPresenceForChannel(req.params.channel) }));

// ── POST /api/graphs ──────────────────────────────────────────────────────────
app.post("/api/graphs", async (req, res) => {
  if (!neo4jReady) return res.status(503).json({ error: "Neo4j is not connected." });

  const { language, code, graph, name } = req.body;
  if (!graph || (!graph.concepts && !graph.errors))
    return res.status(400).json({ error: "Invalid graph payload." });

  const id      = uuidv4();
  const savedAt = new Date().toISOString();
  const label   = name || `${language || "unknown"} — ${new Date().toLocaleTimeString()}`;

  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `CREATE (g:CodeGraph {
           id:$id, name:$name, language:$language, code:$code, savedAt:$savedAt,
           conceptCount:$cc, errorCount:$ec, fixCount:$fc, explanationCount:$xc
         })`,
        {
          id, name: label, language: language || "unknown", code: code || "", savedAt,
          cc: neo4j.int((graph.concepts     || []).length),
          ec: neo4j.int((graph.errors       || []).length),
          fc: neo4j.int((graph.fixes        || []).length),
          xc: neo4j.int((graph.explanations || []).length),
        }
      );

      const allNodes = [
        ...(graph.concepts || []), ...(graph.errors || []),
        ...(graph.fixes    || []), ...(graph.explanations || []),
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

    console.log("✅ Graph saved:", id);
    res.json({ id, name: label, language, savedAt });
  } catch (err) {
    console.error("Neo4j save error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// ── GET /api/graphs ───────────────────────────────────────────────────────────
app.get("/api/graphs", async (req, res) => {
  if (!neo4jReady) return res.json([]);

  try {
    const result = await runQuery(
      `MATCH (g:CodeGraph)
       OPTIONAL MATCH (g)-[:HAS_NODE]->(n:KGNode)
       WITH g, collect(n) AS nodes
       RETURN g { .id, .name, .language, .savedAt, .code,
                  .conceptCount, .errorCount, .fixCount, .explanationCount } AS graph,
              [nd IN nodes | nd { .id, .label, .type, .desc }] AS nodes
       ORDER BY g.savedAt DESC`
    );

    const graphs = await Promise.all(
      result.records.map(async (record) => {
        const g     = record.get("graph");
        const nodes = record.get("nodes");
        const reconstructed = await reconstructGraph(g.id, nodes);
        reconstructed.language = g.language;
        return {
          id: g.id, name: g.name, language: g.language, savedAt: g.savedAt, code: g.code,
          counts: {
            concept:     toNum(g.conceptCount),
            error:       toNum(g.errorCount),
            fix:         toNum(g.fixCount),
            explanation: toNum(g.explanationCount),
          },
          graph: reconstructed,
        };
      })
    );

    res.json(graphs);
  } catch (err) {
    console.error("Neo4j list error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/graphs/:id ───────────────────────────────────────────────────────
app.get("/api/graphs/:id", async (req, res) => {
  if (!neo4jReady) return res.status(503).json({ error: "Neo4j not connected." });

  const { id } = req.params;
  try {
    const result = await runQuery(
      `MATCH (g:CodeGraph {id: $id})
       OPTIONAL MATCH (g)-[:HAS_NODE]->(n:KGNode)
       RETURN g { .id, .name, .language, .savedAt, .code } AS graph,
              collect(n { .id, .label, .type, .desc }) AS nodes`,
      { id }
    );
    if (!result.records.length) return res.status(404).json({ error: "Graph not found." });

    const g     = result.records[0].get("graph");
    const nodes = result.records[0].get("nodes");
    const reconstructed = await reconstructGraph(g.id, nodes);
    reconstructed.language = g.language;

    res.json({ id: g.id, name: g.name, language: g.language, savedAt: g.savedAt, code: g.code, graph: reconstructed });
  } catch (err) {
    console.error("Neo4j get error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/graphs/:id ─────────────────────────────────────────────────────
app.patch("/api/graphs/:id", async (req, res) => {
  if (!neo4jReady) return res.status(503).json({ error: "Neo4j not connected." });

  const { id }   = req.params;
  const { name } = req.body;
  if (!name || typeof name !== "string") return res.status(400).json({ error: "name is required." });

  try {
    const result = await runQuery(
      `MATCH (g:CodeGraph {id: $id}) SET g.name = $name RETURN g.id AS id, g.name AS name`,
      { id, name: name.trim() }
    );
    if (!result.records.length) return res.status(404).json({ error: "Graph not found." });
    res.json({ id, name: result.records[0].get("name") });
  } catch (err) {
    console.error("Neo4j rename error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/graphs/:id ────────────────────────────────────────────────────
app.delete("/api/graphs/:id", async (req, res) => {
  if (!neo4jReady) return res.status(503).json({ error: "Neo4j not connected." });

  const { id } = req.params;
  try {
    await runQuery(
      `MATCH (g:CodeGraph {id: $id})
       OPTIONAL MATCH (g)-[:HAS_NODE]->(n:KGNode)
       DETACH DELETE n, g`,
      { id }
    );
    res.json({ ok: true, id });
  } catch (err) {
    console.error("Neo4j delete error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/graphs/:id/nodes/:nodeLocalId ──────────────────────────────────
app.patch("/api/graphs/:id/nodes/:nodeLocalId", async (req, res) => {
  if (!neo4jReady) return res.status(503).json({ error: "Neo4j not connected." });

  const { id, nodeLocalId } = req.params;
  const { label, desc }     = req.body;
  if (label == null && desc == null) return res.status(400).json({ error: "Provide label and/or desc." });

  const globalNodeId = `${id}__${nodeLocalId}`;
  const setClauses   = [];
  const params       = { nodeId: globalNodeId };
  if (label != null) { setClauses.push("n.label = $label"); params.label = label.trim(); }
  if (desc  != null) { setClauses.push("n.desc  = $desc");  params.desc  = desc.trim();  }

  try {
    const result = await runQuery(
      `MATCH (n:KGNode {id: $nodeId}) SET ${setClauses.join(", ")}
       RETURN n.id AS id, n.label AS label, n.type AS type, n.desc AS desc`,
      params
    );
    if (!result.records.length) return res.status(404).json({ error: "Node not found." });
    const r = result.records[0];
    res.json({
      id:    r.get("id").replace(`${id}__`, ""),
      label: r.get("label"),
      type:  r.get("type"),
      desc:  r.get("desc"),
    });
  } catch (err) {
    console.error("Neo4j node edit error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

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
});

process.on("SIGINT",  async () => { await driver.close(); process.exit(0); });
process.on("SIGTERM", async () => { await driver.close(); process.exit(0); });