import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import express  from "express";
import cors     from "cors";
import fetch    from "node-fetch";
import neo4j    from "neo4j-driver";
import { v4 as uuidv4 } from "uuid";

// ─── Startup diagnostics ──────────────────────────────────────────────────────
console.log("─────────────────────────────────────────────");
console.log("GROQ_API_KEY  :", process.env.GROQ_API_KEY   ? "✅ loaded (" + process.env.GROQ_API_KEY.slice(0,8)  + "...)" : "❌ MISSING");
console.log("NEO4J_URI     :", process.env.NEO4J_URI       || "❌ MISSING");
console.log("NEO4J_USER    :", process.env.NEO4J_USER      || "❌ MISSING");
console.log("NEO4J_PASSWORD:", process.env.NEO4J_PASSWORD  ? "✅ loaded"  : "❌ MISSING");
console.log("─────────────────────────────────────────────");

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ─── Neo4j ────────────────────────────────────────────────────────────────────
const driver = neo4j.driver(
  process.env.NEO4J_URI      || "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER     || "neo4j",
    process.env.NEO4J_PASSWORD || "password"
  ),
  { maxConnectionPoolSize: 50 }
);

// ✅ FIX 1: Do NOT await this at the top level.
// If Neo4j is down, the old code threw here and Express never called .listen(),
// leaving port 5000 closed → Vite proxy got a 502 on every request.
// Now we connect in the background; the server always starts.
let neo4jReady = false;
driver.getServerInfo()
  .then(() => {
    neo4jReady = true;
    console.log("✅ Neo4j connected:", process.env.NEO4J_URI);
  })
  .catch(err => {
    console.warn("⚠️  Neo4j connection failed (save/load features disabled):", err.message);
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── POST /api/chat  (Groq proxy) ────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY not set on server." });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages))
    return res.status(400).json({ error: "'messages' must be an array." });

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      console.error("Groq error:", data);
      return res.status(groqRes.status).json({ error: data });
    }
    res.json(data);
  } catch (err) {
    console.error("Chat proxy error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/graphs  (save) ────────────────────────────────────────────────
app.post("/api/graphs", async (req, res) => {
  if (!neo4jReady)
    return res.status(503).json({ error: "Neo4j is not connected. Check NEO4J_URI / credentials in .env." });

  const { language, code, graph, name } = req.body;
  if (!graph || (!graph.concepts && !graph.errors))
    return res.status(400).json({ error: "Invalid graph payload." });

  const id      = uuidv4();
  const savedAt = new Date().toISOString();
  const label   = name || `${language || "unknown"} — ${new Date().toLocaleTimeString()}`;

  const session = driver.session();
  try {
    // ✅ FIX 2: neo4j-driver v6 removed writeTransaction / readTransaction.
    // Use executeWrite / executeRead instead.
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
        ...(graph.concepts     || []),
        ...(graph.errors       || []),
        ...(graph.fixes        || []),
        ...(graph.explanations || []),
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

// ─── GET /api/graphs  (list) ─────────────────────────────────────────────────
app.get("/api/graphs", async (req, res) => {
  if (!neo4jReady) return res.json([]); // return empty list gracefully

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
          id:       g.id,
          name:     g.name,
          language: g.language,
          savedAt:  g.savedAt,
          code:     g.code,
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

// ─── GET /api/graphs/:id  (single) ───────────────────────────────────────────
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

// ─── PATCH /api/graphs/:id  (rename) ─────────────────────────────────────────
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

// ─── DELETE /api/graphs/:id ──────────────────────────────────────────────────
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

// ─── PATCH /api/graphs/:id/nodes/:nodeLocalId  (edit node) ───────────────────
app.patch("/api/graphs/:id/nodes/:nodeLocalId", async (req, res) => {
  if (!neo4jReady) return res.status(503).json({ error: "Neo4j not connected." });

  const { id, nodeLocalId } = req.params;
  const { label, desc }     = req.body;
  if (label == null && desc == null) return res.status(400).json({ error: "Provide label and/or desc." });

  const globalNodeId = `${id}__${nodeLocalId}`;
  const setClauses = [];
  const params = { nodeId: globalNodeId };
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

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true, neo4j: neo4jReady, ts: new Date().toISOString() }));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`🚀  Server running on http://localhost:${PORT}`)
);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} already in use. Run: kill $(lsof -t -i:${PORT})`);
    process.exit(1);
  }
});

process.on("SIGINT",  async () => { await driver.close(); process.exit(0); });
process.on("SIGTERM", async () => { await driver.close(); process.exit(0); });