import type { RealmContent } from '../types'

// Source: 10_NoSQL (Introduction to NoSQL (revised); NoSQL Models illustrated; NoSQL Uses & Retrieval;
// NoSQL Graph; key-value / document / wide-column / graph model notes) and Lab 07 / Oracle JSON pack.

const r10: RealmContent = {
  topics: {
    'why-nosql': 'Why NoSQL', json: 'JSON', document: 'Document model', keyvalue: 'Key-value model', widecolumn: 'Wide-column model',
    graph: 'Graph model', tradeoffs: 'CAP, sharding & choosing a model', oraclejson: 'Oracle native JSON',
  },
  lessons: [
    {
      id: 'r10-intro', realm: 'r10', title: 'Why NoSQL, and JSON', mins: 10,
      src: ['01_COMP2605_NoSQL_Revised.pdf', '02_COMP2605_NoSQL_Models_Illustrated.pdf'],
      body: `
:::story Mission 10.1: The startup outgrew one server
User profiles keep changing shape, the session store needs microsecond lookups, sensors write thousands of readings a second, and the fraud team wants to follow money through networks of accounts. One relational design won’t fit every job.
:::

## What NoSQL is (and isn’t)
- **NoSQL = “Not Only SQL”**: an **umbrella term** for several families of non-relational, often distributed stores, **not one technology**.
- Driven by workloads needing **flexible records, horizontal distribution, high write rates, low-latency access, or relationship-centric queries**.
- Key characteristics: **flexible data models** (documents, key-value pairs, wide-column rows, graphs) · **horizontal scalability** (partition data across nodes) · **replication and availability** · **workload-specific design** (schemas shaped by access patterns) · trade-offs in consistency, latency, availability, query flexibility and operational complexity.
- **SQL databases remain right for many workloads**: NoSQL is an additional option, not a universal replacement.

:::warn Common misconception
NoSQL does **not** mean no structure, no validation, no transactions or automatic scaling. Many systems are **schema-flexible, not schema-free**: you can add validation rules, and distribution still needs capacity planning, partition-key design, monitoring and failure handling.
:::

{{q:r10-nosql-meaning}}

## JSON
**JSON (JavaScript Object Notation)** is a lightweight, text-based, language-independent **data-interchange format**, widely used in APIs and as the representation of document databases. It is a **format, not a database**.
- **Objects**: unordered name/value members in { }. **Arrays**: ordered values in [ ].
- Types: **string, number, boolean, null, object, array**; objects and arrays nest.
- Syntax: member names and strings in **double quotes**; a colon separates name and value; commas separate members; **no trailing commas**.

\`\`\`json
{
  "title": "To Kill a Mockingbird",
  "author": "Harper Lee",
  "publishedYear": 1960,
  "genre": ["Fiction", "Southern Gothic"],
  "publisher": { "name": "Harper & Row", "location": "New York" },
  "characters": [
    { "name": "Atticus Finch", "role": "Father and Lawyer" },
    { "name": "Scout Finch", "role": "Narrator" }
  ]
}
\`\`\`
Scalars describe the book; **genre** is a multi-valued **array**; **publisher** is a **nested object** (one-to-one); **characters** is an **array of objects** (one-to-many).

{{w:json-validator}}

{{q:r10-json-valid}}

## JSON vs XML
Both represent hierarchical data. **JSON** is concise and maps directly to programming-language structures; **XML** offers elements, attributes, namespaces, mixed content and mature schema technologies. Choose by the interchange and validation requirements.

{{q:r10-json-xml}}
`,
    },
    {
      id: 'r10-document', realm: 'r10', title: 'The document model', mins: 11,
      src: ['01_COMP2605_NoSQL_Revised.pdf', '06_Document_Model_Transitions_with_Popup_Notes.pdf'],
      body: `
## Documents, collections, fields
Data is stored as **self-contained documents** (JSON-like or BSON) representing an **application aggregate**: a user, order, article or product. A **collection** groups related documents (like a table groups rows) but documents may **vary in shape**. **Fields** hold primitives, arrays or sub-documents; **indexes** can support lookups on selected fields and nested paths. Examples: **MongoDB, CouchDB**.

\`\`\`json
{
  "_id": 1, "firstName": "John", "lastName": "Doe", "email": "john.doe@example.com",
  "address": { "street": "123 Main St", "city": "Anytown", "state": "CA", "postalCode": "12345" },
  "orders": [
    { "orderId": "A123", "orderDate": "2023-10-27", "totalAmount": 50.00 },
    { "orderId": "B456", "orderDate": "2023-10-28", "totalAmount": 75.00 }
  ]
}
\`\`\`
**address** is embedded one-to-one data; **orders** is an embedded one-to-many array. **One read** retrieves the customer and both orders: the document boundary is the unit retrieved and updated together.

## Back to relational?
Flattening gives columns like address.city; the orders array produces **multiple rows**, and the customer data **repeats for each order**, reintroducing the redundancy normalization removed (Realm 4). A relational design separates Customer and Order and links them with keys.

## Embed or reference?
| Embed | Reference |
|---|---|
| Data is **bounded**, **owned** by the parent, and usually **read or updated with it** | Related data is **large, shared, independently updated, or many-to-many** |

**Good fits:** content management, product catalogues with varying attributes, user profiles and application state, aggregates read and written as one unit. **Use caution:** highly connected many-to-many data, **unbounded** embedded arrays, frequent cross-document joins, duplicated fields needing coordinated updates. *Shape the document around the frequent query.*

**Heterogeneous collections:** an Article and a Book can share a collection using a **discriminator** such as "type". Still govern the schema: canonical names and types, validate required fields and ranges, version documents, and watch for field proliferation and type drift.

{{w:doc-query}}

{{q:r10-embed}}
{{q:r10-doc-fit}}
`,
    },
    {
      id: 'r10-kv-wide', realm: 'r10', title: 'Key-value and wide-column models', mins: 11,
      src: ['01_COMP2605_NoSQL_Revised.pdf', '05_Key_Value_Model_Transitions_with_Popup_Notes.pdf', '07_Wide_Column_Model_Transitions_with_Popup_Notes.pdf'],
      body: `
## Key-value
Each value is stored under a **unique key**; the key is the **primary access path**, and the value may be **opaque** bytes or a typed structure. Operations: **GET, SET, DELETE** plus product-specific atomic commands. Examples: **Redis, Riak** (and DynamoDB).
| Key | Value |
|---|---|
| user123 | {"username": "alice", "email": "alice@example.com", "age": 28, …} |
| artist:1:name | AC/DC |
| 123456789 | APPL, Buy, 100, 84.47 |

- **Simplicity and performance**: predictable low-latency lookups when keys are well distributed.
- **Atomic operations** (e.g. counters) avoid read-modify-write races on one key (the lost update from Realm 7!).
- **TTL (time-to-live)** removes temporary keys automatically: sessions, caches, tokens, rate-limit windows.
- **The application is responsible** for secondary access paths, relationships and cross-key consistency.

**Fits:** caches, sessions, feature flags, counters, leaderboards, shopping carts. **Poor fit:** queries that don’t start from a known key, joins, reporting across many values, cross-key invariants.

{{w:kv-console}}

{{q:r10-kv-fit}}
{{q:r10-ttl}}

## Wide-column
Data is organised by **partition keys, rows, clustering order and flexible columns**. Related rows are grouped into **partitions** distributed across nodes; rows can be **sparse** (no null placeholders). Examples: **Cassandra, HBase** (Bigtable-inspired).
- **Partition key** determines placement and groups rows read together (e.g. **sensorId**).
- **Clustering columns** order rows within a partition and support **range reads** (e.g. **timestamp**).
- **Key design determines query design**: queries identify a partition, then a clustering range. A poor partition key creates **hotspots** or oversized partitions. Tables are often **denormalised per query**, and duplication is accepted for predictable access.
- **Keyspace** is the top-level namespace (broadly like a relational schema; holds replication settings) containing **column families/tables**; each row has a key and its own columns.

:::warn Wide-column ≠ analytic columnar
A wide-column NoSQL store addresses data by partition and row keys with flexible columns. An **analytic columnar** database stores values of the same column together to speed up scans and compression. The names are similar; the designs are not.
:::

{{q:r10-partition}}
{{q:r10-columnar}}
`,
    },
    {
      id: 'r10-graph', realm: 'r10', title: 'The graph model', mins: 8,
      src: ['04_COMP2605_NoSQL_Graph_Illustrated.pdf', '08_Graph_Model_Transitions_with_Popup_Notes.pdf'],
      body: `
## Nodes, relationships, labels and properties
A **graph model** represents data as **nodes** (entities) and **relationships** (typed, directed connections from a source to a target node). **Labels** classify node types; **key-value properties** describe both nodes and relationships. Examples: **Neo4j, Amazon Neptune**.

**Property graph:** Alice (age 18) **KNOWS** Bob (age 22), with property **since: 2001-10-03** on the relationship; both are **MEMBER_OF** the Chess group node. John **FRIENDS** Alice since 2010. More users and relationships can be added without changing a fixed table join structure.

## Traversal
Queries **follow paths and patterns** through adjacent relationships instead of repeatedly constructing joins. **Path queries**: the shortest connection between two users, or the chain of accounts money moved through. **Pattern queries**: triangles, shared neighbours, repeated transaction motifs, recommendations. Indexes still help find **starting nodes**; large distributed graphs need careful partitioning because traversals may cross nodes.

{{w:graph-path}}

**Fits:** social and organisational networks, fraud and anti-money-laundering paths, recommendations and knowledge graphs, network/dependency/route analysis. **Poor fit:** simple exact-key lookups, wide analytical scans over independent records.

{{q:r10-graph-parts}}
{{q:r10-graph-fit}}
`,
    },
    {
      id: 'r10-tradeoffs', realm: 'r10', title: 'CAP, sharding, data categories and choosing a model', mins: 12,
      src: ['01_COMP2605_NoSQL_Revised.pdf', '03_COMP2605_NoSQL_Uses_Retrieval_Illustrated.pdf'],
      body: `
## Four models at a glance
| Model | Primary lookup | Strength | Typical limitation |
|---|---|---|---|
| **Document** | key and indexed fields | aggregates and evolving records | cross-document joins limited or costly |
| **Key-value** | exact key | extremely simple, low-latency | weak ad-hoc queries |
| **Wide-column** | partition key + clustering range | scalable writes, ordered partition reads | queries must match the key design |
| **Graph** | node/relationship pattern | traversals, relationship-heavy queries | bulk tabular analytics harder |
**Design principle:** begin with the **questions the application must answer**, then choose the model whose native access path matches them.

{{w:model-picker}}

## CAP, precisely
CAP concerns a **replicated service during a network partition**:
- **Consistency (C)**: operations behave like one up-to-date copy.
- **Availability (A)**: every request to a non-failing node gets a response.
- **Partition tolerance (P)**: the system continues despite lost or delayed messages.
**During a partition**, a design cannot guarantee both atomic consistency and availability for every request: preserve consistency (some requests fail or wait) or preserve availability (responses may be stale). CAP is **not** “pick any two at all times”.

**PACELC:** if there is a **P**artition, trade **A** vs **C**; **E**lse, in normal operation, trade **L**atency vs **C**onsistency. Labels like “AP” or “CP” are simplifications; many products have tunable read/write consistency.

{{q:r10-cap}}
{{q:r10-pacelc}}

## Sharding vs replication
| Sharding / partitioning | Replication |
|---|---|
| Splits **distinct** data across nodes (A–I, J–R, S–Z) for **capacity and throughput** | Stores **copies of the same** data on several nodes for **availability and read locality** |
Many systems combine both: **replicated shards**.

{{q:r10-shard}}

## Data categories
**Structured** (explicit schema: tables, fixed fields), **semi-structured** (recognisable fields/tags but optional or nested structure: JSON, XML) and **unstructured** (free text, images, audio, video; its *metadata* may still be structured). Don’t choose a model only from the category: query patterns, correctness, scale and operations decide.

## Choosing, and polyglot persistence
Consider: **data model** (aggregate shape, relationships, sparsity), **access patterns** (exact key, ranges, paths, joins, ad-hoc analysis), **scale** (volume, request rate, read/write ratio, hotspots), **correctness** (transactions, consistency, uniqueness), **operations** (backups, rebalancing, cost), **ecosystem** (drivers, tooling, security).

**Polyglot persistence:** one system may use several models: relational for transactions, a document catalogue, a key-value cache, a graph for recommendations. The benefit must outweigh duplicated data, integration logic, consistency boundaries, security, backups and operational complexity.

{{q:r10-polyglot}}
`,
    },
    {
      id: 'r10-oracle-json', realm: 'r10', title: 'Native JSON in Oracle (Lab 7)', mins: 11,
      src: ['Lab 07 Native JSON Theory', 'Oracle JSON Theory Slides', 'Oracle JSON student pack'],
      body: `
## Three things called “JSON”
| Term | Meaning |
|---|---|
| JSON document/value | Structured content: objects, arrays, scalars |
| SQL **JSON data type** | Oracle’s native typed representation (stored as **OSON**) |
| Serialized JSON text | Characters for display or exchange |

\`\`\`sql
CREATE TABLE asset_catalog (
  asset_id    NUMBER PRIMARY KEY,
  supplier_id NUMBER,
  doc         JSON
);
INSERT INTO asset_catalog (asset_id, supplier_id, doc)
VALUES (701, 8, JSON(q'~{"label":"Tripod","cost":90,"units":6,
  "features":{"colour":"black"},"labels":["loan","studio"],
  "feedback":[{"person":"Ana","score":4},{"person":"Raj","score":5}]}~'));
SELECT asset_id, JSON_SERIALIZE(doc RETURNING CLOB PRETTY) AS readable_doc FROM asset_catalog;
\`\`\`
Parsing is only the **first** validation layer; add CHECK constraints for business rules (type **and** range).

## SQL/JSON paths start at $
| Path | Meaning |
|---|---|
| $ | the whole value |
| $.label | root member label |
| $.features.colour | nested member |
| $.labels[0] | **first** array item (**JSON arrays are 0-based**; XML positions are 1-based!) |
| $.feedback[*] | every array item |
| $.labels[*]?(@ == "loan") | filter: items equal to "loan" |
Member names are **case-sensitive** ($.label ≠ $.Label).

## Choose the function by the result
| Need | Function |
|---|---|
| One scalar as an SQL value | **JSON_VALUE** |
| A complete object/array fragment | **JSON_QUERY** |
| A path/filter match test | **JSON_EXISTS** |
| Relational rows and columns | **JSON_TABLE** |
| Character text for display | **JSON_SERIALIZE** |
| A changed document value | **JSON_TRANSFORM** |

\`\`\`sql
SELECT JSON_VALUE(doc, '$.label' RETURNING VARCHAR2(60)) AS label,
       JSON_VALUE(doc, '$.cost'  RETURNING NUMBER ERROR ON ERROR) AS cost
FROM asset_catalog;

SELECT asset_id FROM asset_catalog WHERE JSON_EXISTS(doc, '$.labels[*]?(@ == "loan")');

SELECT a.asset_id, f.entry_no, f.person, f.score
FROM asset_catalog a,
     JSON_TABLE(a.doc, '$.feedback[*]'
       COLUMNS (entry_no FOR ORDINALITY,
                person VARCHAR2(30) PATH '$.person',
                score  NUMBER       PATH '$.score')) f;
\`\`\`
- **Missing field, JSON null and SQL NULL are distinct**; several can give one SQL NULL from JSON_VALUE, so state **NULL/ERROR ON EMPTY/ERROR** policies and use JSON_EXISTS as evidence.
- **FOR ORDINALITY** numbers rows from 1; it is not the JSON array index.
- Use **LEFT JOIN JSON_TABLE(…)** to keep parents whose optional array is empty.
- SAVEPOINT / ROLLBACK TO can isolate a trial insert (but DDL commits implicitly).

{{w:json-path}}

{{q:r10-json-fn}}
{{q:r10-json-index}}
`,
    },
  ],

  questions: [
    { id: 'r10-nosql-meaning', realm: 'r10', topic: 'why-nosql', kind: 'multi', d: 2,
      q: 'Which statements about NoSQL are **true**? Select all.',
      options: ['It usually stands for “Not Only SQL”', 'It is an umbrella term for several families of stores', 'It means the data has no structure or validation', 'Many NoSQL systems are schema-flexible rather than schema-free', 'It replaces relational databases for every workload'], answer: [0, 1, 3],
      explain: 'NoSQL adds design options; validation, transactions and capacity planning still matter.' },
    { id: 'r10-json-valid', realm: 'r10', topic: 'json', kind: 'mcq', d: 2,
      q: 'Which is **valid** JSON?',
      options: ["{ name: 'John' }", '{ "name": "John", }', '{ "name": "John", "skills": ["SQL", "Python"], "active": true }', '{ "name" = "John" }'], answer: 2,
      explain: 'Member names and strings need double quotes, a colon separates name and value, and trailing commas are not allowed.' },
    { id: 'r10-json-xml', realm: 'r10', topic: 'json', kind: 'mcq', d: 1,
      q: 'Which feature does XML offer that JSON does not?',
      options: ['Arrays', 'Nesting', 'Attributes, namespaces and mixed content', 'Human-readable text'], answer: 2,
      explain: 'Both nest hierarchical data; XML adds attributes, namespaces, mixed content and mature schema languages.' },
    { id: 'r10-embed', realm: 'r10', topic: 'document', kind: 'match', d: 2,
      q: 'Embed or reference?',
      pairs: [['A customer’s single shipping address, always read with the customer', 'Embed'], ['Products shared by thousands of orders and updated independently', 'Reference'], ['An unbounded, ever-growing log of page views', 'Reference'], ['The two line items of a small order', 'Embed']],
      explain: 'Embed bounded, owned data read together; reference large, shared, independently updated or many-to-many data.' },
    { id: 'r10-doc-fit', realm: 'r10', topic: 'document', kind: 'mcq', d: 2,
      q: 'Flattening the customer document (address + orders array) into one relational table causes…',
      options: ['Nothing: it is equivalent', 'Customer data repeated for every order, reintroducing redundancy', 'Loss of all orders', 'Automatic normalization'], answer: 1,
      explain: 'A relational design would separate Customer and Order and link them with keys.' },
    { id: 'r10-kv-fit', realm: 'r10', topic: 'keyvalue', kind: 'mcq', d: 1,
      q: 'Which workload suits a key-value store best?',
      options: ['Ad-hoc reports joining many tables', 'Session storage looked up by session id', 'Finding friends-of-friends', 'Range scans over sensor timestamps'], answer: 1,
      explain: 'Key-value stores excel at direct lookups by a known key (sessions, caches, carts, counters).' },
    { id: 'r10-ttl', realm: 'r10', topic: 'keyvalue', kind: 'mcq', d: 2,
      q: 'What does a TTL (time-to-live) on a key do?',
      options: ['Encrypts the key', 'Automatically removes the key after a deadline', 'Replicates the key', 'Locks the key'], answer: 1,
      explain: 'Useful for sessions, caches, temporary tokens and rate-limit windows.' },
    { id: 'r10-partition', realm: 'r10', topic: 'widecolumn', kind: 'match', d: 2,
      q: 'Sensor readings queried as “sensor S7 between 9:00 and 10:00”. Match each key role.',
      pairs: [['sensorId', 'Partition key (placement, rows read together)'], ['timestamp', 'Clustering key (order within partition, range reads)'], ['value, status', 'Regular (possibly sparse) columns']],
      explain: 'Queries identify a partition, then apply a clustering-key range.' },
    { id: 'r10-columnar', realm: 'r10', topic: 'widecolumn', kind: 'tf', d: 2,
      q: 'A wide-column NoSQL store such as Cassandra is the same thing as an analytic columnar database.',
      answer: false, explain: 'Wide-column addresses data by partition/row keys with flexible columns; analytic columnar stores keep each column’s values together for scans.' },
    { id: 'r10-graph-parts', realm: 'r10', topic: 'graph', kind: 'match', d: 1,
      q: 'In “Alice KNOWS Bob since 2001-10-03”, match each part.',
      pairs: [['Alice, Bob', 'Nodes'], ['KNOWS', 'Relationship type'], ['since: 2001-10-03', 'Relationship property'], ['Person', 'Label']],
      explain: 'Nodes and relationships can both carry key-value properties; labels classify nodes.' },
    { id: 'r10-graph-fit', realm: 'r10', topic: 'graph', kind: 'mcq', d: 1,
      q: 'Tracing the chain of accounts through which stolen funds moved is best served by…',
      options: ['A key-value store', 'A graph database (path query)', 'A wide-column store', 'A flat file'], answer: 1,
      explain: 'Path and pattern queries follow adjacent relationships, which is what graphs are built for.' },
    { id: 'r10-cap', realm: 'r10', topic: 'tradeoffs', kind: 'mcq', d: 3,
      q: 'According to the precise interpretation of CAP in the lecture, when must a system trade consistency against availability?',
      options: ['Always, by permanently choosing any two', 'During a network partition', 'Only when the disk is full', 'Never'], answer: 1,
      explain: 'CAP concerns a replicated service during a partition; it is not “pick any two” at all times.' },
    { id: 'r10-pacelc', realm: 'r10', topic: 'tradeoffs', kind: 'fill', d: 2,
      q: 'PACELC: if Partition, trade Availability vs Consistency; Else, trade ______ vs Consistency.',
      accept: ['latency', 'Latency'], explain: 'Even without a partition, stronger coordination costs latency.' },
    { id: 'r10-shard', realm: 'r10', topic: 'tradeoffs', kind: 'match', d: 1,
      q: 'Match each technique to its purpose.',
      pairs: [['Sharding', 'Split distinct data across nodes for capacity and throughput'], ['Replication', 'Store copies of the same data for availability and read locality']],
      explain: 'Many systems combine both: replicated shards.' },
    { id: 'r10-polyglot', realm: 'r10', topic: 'tradeoffs', kind: 'mcq', d: 2,
      q: 'What is polyglot persistence?',
      options: ['Storing data in several human languages', 'Using more than one database model in a system because subsystems have different access patterns', 'Replicating one database worldwide', 'Writing SQL in several dialects'], answer: 1,
      explain: 'E.g. relational transactions, a document catalogue, a key-value cache and a graph recommender, with costs in integration and operations.' },
    { id: 'r10-json-fn', realm: 'r10', topic: 'oraclejson', kind: 'match', d: 2,
      q: 'Match each Oracle SQL/JSON function to what it returns.',
      pairs: [['JSON_VALUE', 'One scalar as an SQL value'], ['JSON_QUERY', 'An object or array fragment'], ['JSON_EXISTS', 'A true/false match test'], ['JSON_TABLE', 'Relational rows and columns'], ['JSON_SERIALIZE', 'Character text for display']],
      explain: 'Choose the function from the required result shape.' },
    { id: 'r10-json-index', realm: 'r10', topic: 'oraclejson', kind: 'mcq', d: 2,
      q: 'In a SQL/JSON path, what does $.labels[0] select, and how does that differ from XPath’s PHONE[1]?',
      options: ['The second label; XPath is also 0-based', 'The first label: JSON arrays are 0-based while XML sibling positions are 1-based', 'The labels member itself', 'Nothing'], answer: 1,
      explain: 'A frequent exam trap between Labs 6 and 7.' },
    { id: 'r10-schemaflex', realm: 'r10', topic: 'document', kind: 'mcq', d: 2,
      q: 'An Article and a Book share one collection. What helps applications handle both safely?',
      options: ['Removing all fields', 'A discriminator field such as "type" plus validation rules per subtype', 'Storing them as images', 'A wide-column partition key'], answer: 1,
      explain: 'Schema-flexible still needs governance: canonical names/types, validation, versioning.' },
  ],

  written: [
    { id: 'r10-w1', realm: 'r10', topic: 'tradeoffs', marks: 10,
      q: 'Describe the four major NoSQL data models. For each, give an example product, its primary access pattern, a suitable use and a limitation. Then recommend a model for (a) shopping-cart sessions, (b) a product catalogue with varying attributes, (c) IoT sensor readings queried by sensor and time range, (d) fraud detection across money transfers.',
      model: 'Document (MongoDB, CouchDB): self-contained JSON/BSON aggregates looked up by key or indexed fields; good for content, catalogues and profiles; cross-document joins are limited/costly. Key-value (Redis, Riak): a unique key maps to an opaque or typed value with GET/SET/DELETE and TTL; good for caching, sessions and counters; weak ad-hoc queries. Wide-column (Cassandra, HBase): partitioned rows with flexible columns and clustering order, accessed by partition key plus clustering range; good for high-write events and time series; queries must match the key design. Graph (Neo4j, Neptune): nodes, typed relationships, labels and properties, accessed by traversal and pattern; good for social networks, fraud and recommendations; bulk tabular analytics are harder. Recommendations: (a) key-value with TTL; (b) document (flexible schema, aggregate per product); (c) wide-column with sensorId partition key and timestamp clustering key; (d) graph for path/pattern queries over transfers.',
      points: ['Document model described', 'Key-value model described', 'Wide-column model described', 'Graph model described', 'Examples for each', 'Access patterns stated', 'Limitations stated', '(a) key-value', '(b) document', '(c) wide-column + (d) graph justified'] },
    { id: 'r10-w2', realm: 'r10', topic: 'tradeoffs', marks: 6,
      q: 'Explain the CAP theorem precisely and the PACELC extension. Distinguish sharding from replication.',
      model: 'CAP concerns a replicated service during a network partition. Consistency means operations behave like one up-to-date copy; availability means every request to a non-failing node receives a response; partition tolerance means the system continues despite lost or delayed messages. During a partition, a design cannot guarantee both atomic consistency and availability for every request: preserving consistency means some requests fail or wait, preserving availability means responses may be stale. It is not a rule to pick any two at all times. PACELC: if a Partition occurs, trade Availability vs Consistency; Else, in normal operation, trade Latency vs Consistency. Sharding splits distinct data across nodes for capacity and throughput; replication stores copies of the same data on multiple nodes for availability and read locality; systems often use replicated shards.',
      points: ['CAP scope: replicated system during a partition', 'C, A, P defined', 'Trade-off during partition explained', 'Not "pick any two" always', 'PACELC explained', 'Sharding vs replication'] },
  ],

  cards: [
    { id: 'r10-c1', realm: 'r10', front: 'NoSQL', back: '“Not Only SQL”: an umbrella for document, key-value, wide-column and graph stores; schema-flexible, not schema-free.' },
    { id: 'r10-c2', realm: 'r10', front: 'JSON value types', back: 'string, number, boolean, null, object { }, array [ ].' },
    { id: 'r10-c3', realm: 'r10', front: 'JSON syntax rules', back: 'Double-quoted names and strings; colon between name and value; commas between items; no trailing commas.' },
    { id: 'r10-c4', realm: 'r10', front: 'Document model', back: 'Self-contained JSON/BSON aggregates in collections; nested sub-documents and arrays; MongoDB, CouchDB.' },
    { id: 'r10-c5', realm: 'r10', front: 'Embed vs reference', back: 'Embed: bounded, owned, read together. Reference: large, shared, independently updated, many-to-many.' },
    { id: 'r10-c6', realm: 'r10', front: 'Key-value model', back: 'Unique key → value; GET/SET/DELETE, atomic counters, TTL; Redis, Riak. Weak for ad-hoc queries.' },
    { id: 'r10-c7', realm: 'r10', front: 'Wide-column model', back: 'Partition key (placement) + clustering columns (order/range) + flexible sparse columns; Cassandra, HBase.' },
    { id: 'r10-c8', realm: 'r10', front: 'Graph model', back: 'Nodes, typed relationships, labels, key-value properties; traversal and pattern queries; Neo4j, Neptune.' },
    { id: 'r10-c9', realm: 'r10', front: 'CAP (precise)', back: 'During a network partition a replicated system cannot guarantee both consistency and availability for every request.' },
    { id: 'r10-c10', realm: 'r10', front: 'PACELC', back: 'Partition: A vs C; Else: Latency vs C.' },
    { id: 'r10-c11', realm: 'r10', front: 'Sharding vs replication', back: 'Sharding splits distinct data for capacity; replication copies data for availability.' },
    { id: 'r10-c12', realm: 'r10', front: 'Polyglot persistence', back: 'Using several database models in one system for different access patterns.' },
    { id: 'r10-c13', realm: 'r10', front: 'Oracle SQL/JSON functions', back: 'JSON_VALUE scalar · JSON_QUERY fragment · JSON_EXISTS test · JSON_TABLE rows · JSON_SERIALIZE text · JSON_TRANSFORM change.' },
    { id: 'r10-c14', realm: 'r10', front: 'SQL/JSON path basics', back: '$ root · .member · [0] first (0-based) · [*] all · ?(@ == "x") filter · case-sensitive.' },
  ],

  terms: [
    { term: 'NoSQL', def: 'Not Only SQL: non-relational, often distributed data stores.', realm: 'r10' },
    { term: 'JSON', def: 'JavaScript Object Notation: text-based data-interchange format of objects and arrays.', realm: 'r10' },
    { term: 'Document database', def: 'Stores self-contained JSON-like documents in collections.', realm: 'r10' },
    { term: 'Collection', def: 'A group of related documents in a document store.', realm: 'r10' },
    { term: 'Key-value store', def: 'Stores values under unique keys accessed by GET/SET/DELETE.', realm: 'r10' },
    { term: 'TTL', def: 'Time-to-live: automatic expiry of a key after a deadline.', realm: 'r10' },
    { term: 'Wide-column store', def: 'Partitioned rows with flexible columns and clustering order.', realm: 'r10' },
    { term: 'Partition key', def: 'Wide-column key determining data placement.', realm: 'r10' },
    { term: 'Clustering key', def: 'Wide-column key ordering rows within a partition.', realm: 'r10' },
    { term: 'Keyspace', def: 'Top-level namespace in a wide-column store.', realm: 'r10' },
    { term: 'Graph database', def: 'Stores nodes and typed relationships with properties.', realm: 'r10' },
    { term: 'Traversal', def: 'Following relationships from a start node to find paths or patterns.', realm: 'r10' },
    { term: 'CAP theorem', def: 'During a partition, consistency and availability cannot both be guaranteed.', realm: 'r10' },
    { term: 'PACELC', def: 'Extension of CAP: else, trade latency vs consistency.', realm: 'r10' },
    { term: 'Sharding', def: 'Splitting distinct data across nodes.', realm: 'r10' },
    { term: 'Replication', def: 'Keeping copies of the same data on several nodes.', realm: 'r10' },
    { term: 'Polyglot persistence', def: 'Using multiple database models within one system.', realm: 'r10' },
    { term: 'JSON_TABLE', def: 'Oracle function projecting JSON into relational rows and columns.', realm: 'r10' },
  ],

  sql: [
    { id: 'r10-s1', realm: 'r10', topic: 'oraclejson', title: 'JSON_VALUE in SQLite', dataset: 'empty', d: 2,
      prompt: 'SQLite has json_extract (like Oracle’s JSON_VALUE). Create assets(id INTEGER PRIMARY KEY, doc TEXT), insert asset 701 with doc {"label":"Tripod","cost":90,"labels":["loan","studio"]}, then select the id, label and first label using paths $.label and $.labels[0].',
      solution: `CREATE TABLE assets (id INTEGER PRIMARY KEY, doc TEXT);\nINSERT INTO assets VALUES (701, '{"label":"Tripod","cost":90,"labels":["loan","studio"]}');\nSELECT id, json_extract(doc, '$.label'), json_extract(doc, '$.labels[0]') FROM assets;`,
      hint: "json_extract(doc, '$.label') and json_extract(doc, '$.labels[0]'): JSON arrays are 0-based." },
    { id: 'r10-s2', realm: 'r10', topic: 'oraclejson', title: 'JSON_TABLE-style expansion', dataset: 'empty', d: 3,
      prompt: 'Expand an array into rows (SQLite’s json_each plays JSON_TABLE’s role). Create assets(id, doc) with asset 701: {"feedback":[{"person":"Ana","score":4},{"person":"Raj","score":5}]}. Return id, person and score, one row per feedback entry.',
      solution: `CREATE TABLE assets (id INTEGER PRIMARY KEY, doc TEXT);\nINSERT INTO assets VALUES (701, '{"feedback":[{"person":"Ana","score":4},{"person":"Raj","score":5}]}');\nSELECT a.id, json_extract(f.value, '$.person'), json_extract(f.value, '$.score') FROM assets a, json_each(a.doc, '$.feedback') f;`,
      hint: "FROM assets a, json_each(a.doc, '$.feedback') f, then json_extract(f.value, '$.person')." },
  ],

  codex: `
## NoSQL
“Not Only SQL” · umbrella of families · flexible models, horizontal scale, replication, workload-driven design · schema-flexible ≠ schema-free.

## JSON
Objects {"name": value} · arrays [ ] · string/number/boolean/null · double quotes · no trailing commas · a format, not a database.

## Four models
| Model | Lookup | Use | Limit |
|---|---|---|---|
| Document (MongoDB) | key + indexed fields | catalogues, profiles | cross-doc joins |
| Key-value (Redis) | exact key | cache, sessions, counters, TTL | ad-hoc queries |
| Wide-column (Cassandra) | partition + clustering range | time series, high writes | key design dictates queries |
| Graph (Neo4j) | traversal/pattern | fraud, social, recommendations | bulk analytics |
Embed bounded/owned/read-together data; reference large/shared/many-to-many data. Wide-column ≠ analytic columnar.

## Trade-offs
CAP: during a partition, C or A (not "pick 2 always"). PACELC: else Latency vs C. Sharding = split; replication = copy. Polyglot persistence. Start from the queries.

## Oracle JSON
JSON column (OSON) · JSON(...) constructor · $ paths: $.a.b · [0] (0-based) · [*] · ?(@ == "x") · JSON_VALUE / QUERY / EXISTS / TABLE (FOR ORDINALITY, LEFT JOIN) / SERIALIZE / TRANSFORM · missing ≠ JSON null ≠ SQL NULL.
`,
}

export default r10
