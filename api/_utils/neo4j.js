import neo4j from "neo4j-driver";

let driver;

export function getDriver() {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI || "bolt://localhost:7687",
      neo4j.auth.basic(
        process.env.NEO4J_USER || "neo4j",
        process.env.NEO4J_PASSWORD || "password"
      )
    );
  }
  return driver;
}

export async function runQuery(cypher, params = {}) {
  const d = getDriver();
  const session = d.session();
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

export function toNum(v) {
  if (v == null) return 0;
  return typeof v.toNumber === "function" ? v.toNumber() : (Number(v) || 0);
}

export async function reconstructGraph(graphId, nodes) {
  const prefix = graphId + "__";
  const withConnections = await Promise.all(
    nodes.map(async (n) => {
      const res = await runQuery(
        `MATCH (a:KGNode {id: $id})-[:CONNECTS]->(b:KGNode) RETURN b.id AS tid`,
        { id: n.id }
      );
      return {
        ...n,
        id: n.id.replace(prefix, ""),
        connections: res.records.map((r) => r.get("tid").replace(prefix, "")),
      };
    })
  );
  return {
    concepts: withConnections.filter((n) => n.type === "concept"),
    errors: withConnections.filter((n) => n.type === "error"),
    fixes: withConnections.filter((n) => n.type === "fix"),
    explanations: withConnections.filter((n) => n.type === "explanation"),
  };
}
