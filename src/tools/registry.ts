export interface ToolMeta { id: string; name: string; icon: string; desc: string; href: string; realm: string; stages: number }

export const TOOL_META: Record<string, ToolMeta> = {
  arena: { id: 'arena', name: 'SQL Sandbox Arena', icon: '⌨️', desc: 'Run real SQL on DreamHome, EMP/DEPT and the sports club. Constraint violations breach your Integrity Shields.', href: '#/arena', realm: 'r8', stages: 0 },
  ra: { id: 'ra', name: 'Relational Algebra Pipeline', icon: 'σ', desc: 'Type σ, π, ⋈, ∪, −, × expressions and watch each operator output a new relation (closure).', href: '#/arena?lang=ra', realm: 'r2', stages: 0 },
  erd: { id: 'erd', name: 'ERD Forge', icon: '🗺️', desc: 'Read business rules, set cardinality and optionality on each relationship end, and resolve M:N with intersection entities.', href: '#/tools/erd', realm: 'r3', stages: 5 },
  forge: { id: 'forge', name: 'Normalization Forge', icon: '⚒️', desc: 'Split unnormalized tables through 1NF, 2NF and 3NF while the anomaly meter falls to zero.', href: '#/tools/forge', realm: 'r4', stages: 4 },
  optimizer: { id: 'optimizer', name: 'Query Optimizer Tycoon', icon: '💰', desc: 'Choose linear search, index search, nested-loop, index or hash joins to beat the block-read budget.', href: '#/tools/optimizer', realm: 'r5', stages: 5 },
  btree: { id: 'btree', name: 'B+ Tree Grove', icon: '🌳', desc: 'Insert and search keys in a B+ tree and watch leaf and internal splits propagate upward.', href: '#/tools/btree', realm: 'r6', stages: 4 },
  hash: { id: 'hash', name: 'Hash Bucket Lab', icon: '#️⃣', desc: 'Hash keys into buckets, handle collisions and overflow, and count the block reads.', href: '#/tools/hash', realm: 'r6', stages: 3 },
  concurrency: { id: 'concurrency', name: 'Concurrency & Deadlock Defuser', icon: '💣', desc: 'Step through interleaved schedules, spot lost updates and dirty reads, draw precedence graphs and break deadlocks.', href: '#/tools/concurrency', realm: 'r7', stages: 7 },
  xml: { id: 'xml', name: 'XML · XPath · DTD Lab', icon: '🏷️', desc: 'Check well-formedness, validate against a DTD and query nodes with real XPath.', href: '#/arena?lang=xml', realm: 'r9', stages: 0 },
  json: { id: 'json', name: 'JSON & NoSQL Lab', icon: '🧩', desc: 'Model documents, query them with filters and dot paths, and pick the right NoSQL model.', href: '#/arena?lang=json', realm: 'r10', stages: 0 },
}
