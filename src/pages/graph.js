/**
 * routes/graphs.js  —  Neo4j persistence for KnowledgeGraph Engine
 *
 * Mount in your Express app:
 *   const graphRoutes = require('./routes/graphs');
 *   app.use('/api/graphs', graphRoutes);
 *
 * Env vars required:
 *   NEO4J_URI      e.g. bolt://localhost:7687  or  neo4j+s://xxxxx.databases.neo4j.io
 *   NEO4J_USER     e.g. neo4j
 *   NEO4J_PASSWORD e.g. yourpassword
 *
 * npm install neo4j-driver uuid
 */

const express = require("express");
const router  = express.Router();
const neo4j   = require("neo4j-driver");
const { v4: uuidv4 } = require("uuid");

// ── Driver (singleton) ────────────────────────────────────────────────────────
const driver = neo4j.driver(
  process.env.NEO4J_URI      || "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER     || "neo4j",
    process.env.NEO4J_PASSWORD || "password"
  )
);

// Verify connectivity on startup (non-fatal)
driver.verifyConnectivity()
  .then(() => console.log("✅ Neo4j connected"))
  .catch(e => console.warn("⚠️  Neo4j connection warning:", e.message));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Run a Cypher query, always close the session. */
async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

/**
 * Persist one graph:
 *  - Creates a (:CodeGraph) node
 *  - Creates (:KGNode) nodes for each concept/error/fix/explanation
 *  - Creates [:HAS_NODE] relationships from graph → nodes
 *  - Creates [:CONNECTS] relationships between nodes (from connections[])
 */
async function saveGraphToNeo4j({ id, name, language, code, graph, savedAt }) {
  const session = driver.session();
  try {
    await session.writeTransaction(async tx => {

      // 1. Create the root CodeGraph node
      await tx.run(
        `CREATE (g:CodeGraph {
          id: $id,
          name: $name,
          language: $language,
          code: $code,
          savedAt: $savedAt,
          conceptCount:     $conceptCount,
          errorCount:       $errorCount,
          fixCount:         $fixCount,
          explanationCount: $explanationCount
        })`,
        {
          id,
          name,
          language,
          code: code || "",
          savedAt,
          conceptCount:     neo4j.int((graph.concepts     || []).length),
          errorCount:       neo4j.int((graph.errors       || []).length),
          fixCount:         neo4j.int((graph.fixes        || []).length),
          explanationCount: neo4j.int((graph.explanations || []).length),
        }
      );

      // 2. Collect all nodes from every category
      const allNodes = [
        ...(graph.concepts     || []),
        ...(graph.errors       || []),
        ...(graph.fixes        || []),
        ...(graph.explanations || []),
      ];

      // 3. Create each KGNode and link to its parent CodeGraph
      for (const n of allNodes) {
        await tx.run(
          `MATCH (g:CodeGraph {id: $graphId})
           CREATE (n:KGNode {
             id:      $nodeId,
             graphId: $graphId,
             label:   $label,
             type:    $type,
             desc:    $desc
           })
           CREATE (g)-[:HAS_NODE]->(n)`,
          {
            graphId: id,
            nodeId:  `${id}__${n.id}`,   // globally unique
            label:   n.label || "",
            type:    n.type  || "concept",
            desc:    n.desc  || "",
          }
        );
      }

      // 4. Create CONNECTS edges between KGNodes
      for (const n of allNodes) {
        for (const targetLocalId of (n.connections || [])) {
          await tx.run(
            `MATCH (a:KGNode {id: $fromId})
             MATCH (b:KGNode {id: $toId})
             CREATE (a)-[:CONNECTS]->(b)`,
            {
              fromId: `${id}__${n.id}`,
              toId:   `${id}__${targetLocalId}`,
            }
          );
        }
      }
    });
  } finally {
    await session.close();
  }
}

// ── POST /api/graphs  — save a graph ─────────────────────────────────────────
router.post("/", async (req, res) => {
  const { language, code, graph, name } = req.body;

  if (!graph || (!graph.concepts && !graph.errors)) {
    return res.status(400).json({ error: "Invalid graph payload" });
  }

  const id      = uuidv4();
  const savedAt = new Date().toISOString();
  const label   = name || `${language || "unknown"} graph`;

  try {
    await saveGraphToNeo4j({ id, name: label, language, code, graph, savedAt });
    res.json({ id, name: label, language, savedAt });
  } catch (e) {
    console.error("Neo4j save error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/graphs  — list all saved graphs ──────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await runQuery(
      `MATCH (g:CodeGraph)
       OPTIONAL MATCH (g)-[:HAS_NODE]->(n:KGNode)
       WITH g, collect(n) AS nodes
       RETURN g {
         .id, .name, .language, .savedAt, .code,
         counts: {
           concept:     g.conceptCount,
           error:       g.errorCount,
           fix:         g.fixCount,
           explanation: g.explanationCount
         }
       } AS graph,
       [nd IN nodes | nd { .id, .label, .type, .desc }] AS nodes
       ORDER BY g.savedAt DESC`
    );

    const graphs = await Promise.all(
      result.records.map(async record => {
        const g     = record.get("graph");
        const nodes = record.get("nodes");

        // Re-fetch connections for each node to rebuild the graph shape
        const withConnections = await Promise.all(
          nodes.map(async n => {
            const connResult = await runQuery(
              `MATCH (a:KGNode {id: $id})-[:CONNECTS]->(b:KGNode)
               RETURN b.id AS targetId`,
              { id: n.id }
            );
            // Strip the graphId prefix to get back the local id
            const prefix = g.id + "__";
            const connections = connResult.records.map(r =>
              r.get("targetId").replace(prefix, "")
            );
            return { ...n, id: n.id.replace(prefix, ""), connections };
          })
        );

        // Reconstruct graph object by type
        const byType = type => withConnections.filter(n => n.type === type);
        const reconstructed = {
          language:     g.language,
          concepts:     byType("concept"),
          errors:       byType("error"),
          fixes:        byType("fix"),
          explanations: byType("explanation"),
        };

        return {
          id:       g.id,
          name:     g.name,
          language: g.language,
          savedAt:  g.savedAt,
          code:     g.code,
          counts: {
            concept:     (g.counts?.concept     || neo4j.int(0)).toNumber?.() ?? 0,
            error:       (g.counts?.error       || neo4j.int(0)).toNumber?.() ?? 0,
            fix:         (g.counts?.fix         || neo4j.int(0)).toNumber?.() ?? 0,
            explanation: (g.counts?.explanation || neo4j.int(0)).toNumber?.() ?? 0,
          },
          graph: reconstructed,
        };
      })
    );

    res.json(graphs);
  } catch (e) {
    console.error("Neo4j list error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/graphs/:id  — get a single graph ─────────────────────────────────
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await runQuery(
      `MATCH (g:CodeGraph {id: $id})
       OPTIONAL MATCH (g)-[:HAS_NODE]->(n:KGNode)
       RETURN g { .id, .name, .language, .savedAt, .code } AS graph,
              collect(n { .id, .label, .type, .desc }) AS nodes`,
      { id }
    );

    if (!result.records.length) {
      return res.status(404).json({ error: "Graph not found" });
    }

    const g     = result.records[0].get("graph");
    const nodes = result.records[0].get("nodes");
    const prefix = id + "__";

    const withConnections = await Promise.all(
      nodes.map(async n => {
        const connResult = await runQuery(
          `MATCH (a:KGNode {id: $nid})-[:CONNECTS]->(b:KGNode) RETURN b.id AS targetId`,
          { nid: n.id }
        );
        return {
          ...n,
          id: n.id.replace(prefix, ""),
          connections: connResult.records.map(r => r.get("targetId").replace(prefix, "")),
        };
      })
    );

    const byType = type => withConnections.filter(n => n.type === type);
    res.json({
      id: g.id, name: g.name, language: g.language, savedAt: g.savedAt, code: g.code,
      graph: {
        language: g.language,
        concepts:     byType("concept"),
        errors:       byType("error"),
        fixes:        byType("fix"),
        explanations: byType("explanation"),
      }
    });
  } catch (e) {
    console.error("Neo4j get error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/graphs/:id  — delete a graph and all its nodes ────────────────
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery(
      `MATCH (g:CodeGraph {id: $id})
       OPTIONAL MATCH (g)-[:HAS_NODE]->(n:KGNode)
       OPTIONAL MATCH (n)-[r:CONNECTS]->()
       DELETE r, n, g`,
      { id }
    );
    res.json({ ok: true, id });
  } catch (e) {
    console.error("Neo4j delete error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;