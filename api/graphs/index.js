import { v4 as uuidv4 } from "uuid";
import neo4j from "neo4j-driver";
import { getDriver, runQuery, reconstructGraph, toNum } from "../_utils/neo4j.js";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
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
          const g = record.get("graph");
          const nodes = record.get("nodes");
          const reconstructed = await reconstructGraph(g.id, nodes);
          reconstructed.language = g.language;
          return {
            id: g.id,
            name: g.name,
            language: g.language,
            savedAt: g.savedAt,
            code: g.code,
            counts: {
              concept: toNum(g.conceptCount),
              error: toNum(g.errorCount),
              fix: toNum(g.fixCount),
              explanation: toNum(g.explanationCount),
            },
            graph: reconstructed,
          };
        })
      );
      return res.status(200).json(graphs);
    }

    if (req.method === "POST") {
      const { language, code, graph, name } = req.body;
      if (!graph || (!graph.concepts && !graph.errors)) {
        return res.status(400).json({ error: "Invalid graph payload." });
      }

      const id = uuidv4();
      const savedAt = new Date().toISOString();
      const label = name || `${language || "unknown"} — ${new Date().toLocaleTimeString()}`;

      const driver = getDriver();
      const session = driver.session();
      try {
        await session.writeTransaction(async (tx) => {
          await tx.run(
            `CREATE (g:CodeGraph {
               id:$id, name:$name, language:$language, code:$code, savedAt:$savedAt,
               conceptCount:$cc, errorCount:$ec, fixCount:$fc, explanationCount:$xc
             })`,
            {
              id, name: label, language: language || "unknown", code: code || "", savedAt,
              cc: neo4j.int((graph.concepts || []).length),
              ec: neo4j.int((graph.errors || []).length),
              fc: neo4j.int((graph.fixes || []).length),
              xc: neo4j.int((graph.explanations || []).length),
            }
          );

          const allNodes = [
            ...(graph.concepts || []),
            ...(graph.errors || []),
            ...(graph.fixes || []),
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
        return res.status(200).json({ id, name: label, language, savedAt });
      } finally {
        await session.close();
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Graphs API error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
