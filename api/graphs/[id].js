import { runQuery, reconstructGraph } from "../_utils/neo4j.js";

export default async function handler(req, res) {
  const { id } = req.query;

  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const result = await runQuery(
        `MATCH (g:CodeGraph {id: $id})
         OPTIONAL MATCH (g)-[:HAS_NODE]->(n:KGNode)
         RETURN g { .id, .name, .language, .savedAt, .code } AS graph,
                collect(n { .id, .label, .type, .desc }) AS nodes`,
        { id }
      );
      if (!result.records.length) return res.status(404).json({ error: "Graph not found." });

      const g = result.records[0].get("graph");
      const nodes = result.records[0].get("nodes");
      const reconstructed = await reconstructGraph(g.id, nodes);
      reconstructed.language = g.language;

      return res.status(200).json({ id: g.id, name: g.name, language: g.language, savedAt: g.savedAt, code: g.code, graph: reconstructed });
    }

    if (req.method === "PATCH") {
      const { name } = req.body;
      if (!name || typeof name !== "string") return res.status(400).json({ error: "name is required." });
      
      const result = await runQuery(
        `MATCH (g:CodeGraph {id: $id}) SET g.name = $name RETURN g.id AS id, g.name AS name`,
        { id, name: name.trim() }
      );
      if (!result.records.length) return res.status(404).json({ error: "Graph not found." });
      return res.status(200).json({ id, name: result.records[0].get("name") });
    }

    if (req.method === "DELETE") {
      await runQuery(
        `MATCH (g:CodeGraph {id: $id})
         OPTIONAL MATCH (g)-[:HAS_NODE]->(n:KGNode)
         DETACH DELETE n, g`,
        { id }
      );
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Single Graph API error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
