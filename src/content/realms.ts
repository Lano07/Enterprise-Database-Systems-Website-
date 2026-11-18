import type { Realm } from './types'

// One realm per topic folder in COMP2605_Lecture_Notes (the lab theory slides are folded
// into the SQL, XML and NoSQL realms they support).
export const REALMS: Realm[] = [
  {
    id: 'r1', n: 1, title: 'Database Foundations', short: 'Foundations',
    story: 'Your first client, ABC School District, runs on spreadsheets and paper. Show them what a DBMS really does.',
    blurb: 'Data vs information, data utility, abstraction, DBMS components and functions, users, and Codd’s relational model: relations, domains, keys, nulls and integrity.',
    source: '01_Introduction_and_Relational_Model', color: '#2253c4', icon: '🏫',
    boss: { name: 'The Flat-File Hydra', title: 'Every head is a duplicate copy of the same data', taunt: 'Cut one copy and two more disagree with it!', hp: 8 },
    tools: ['arena'],
  },
  {
    id: 'r2', n: 2, title: 'Business Rules & Relational Algebra', short: 'Rules & Algebra',
    story: 'LibBook’s managers speak in vague sentences. Turn them into atomic business rules, then answer their questions with relational algebra.',
    blurb: 'Writing atomic business rules (subject + must/may + verb + object, both directions), constraints vs assumptions, and the relational algebra operators with closure.',
    source: '02_Business_Rules_and_Relational_Operators', color: '#7b3fb3', icon: '📜',
    boss: { name: 'The Ambiguity Wraith', title: 'Speaks only in vague requirements', taunt: '“Customers have orders… sometimes… probably.”', hp: 8 },
    tools: ['ra'],
  },
  {
    id: 'r3', n: 3, title: 'Database Design & ER Modelling', short: 'ER Modelling',
    story: 'DreamHome is expanding. Walk the design lifecycle and draw the ERD that will hold the whole enterprise together.',
    blurb: 'The database system development lifecycle, fact-finding, entities, attributes, identifiers, relationships, cardinality and optionality, resolving M:N, supertypes/subtypes and UML notation.',
    source: '03_Database_Design_and_ER_Modelling', color: '#0b7f6e', icon: '🗺️',
    boss: { name: 'The Many-to-Many Minotaur', title: 'Lives in a maze of unresolved relationships', taunt: 'Student takes Course takes Student takes…', hp: 9 },
    tools: ['erd'],
  },
  {
    id: 'r4', n: 4, title: 'Functional Dependencies & Normalization', short: 'Normalization',
    story: 'A sports club’s flat file (SPORT_1, PRICE_1, SPORT_2…) is leaking anomalies everywhere. Forge it into 3NF.',
    blurb: 'Update, insertion and deletion anomalies, functional dependencies, determinants, partial and transitive dependencies, repeating groups, UNF → 1NF → 2NF → 3NF.',
    source: '04_Functional_Dependencies_and_Normalization', color: '#b5542a', icon: '⚒️',
    boss: { name: 'The Anomaly Golem', title: 'Built from one giant unnormalized table', taunt: 'Delete me and you lose the course price forever!', hp: 10 },
    tools: ['forge'],
  },
  {
    id: 'r5', n: 5, title: 'Query Processing & Access Methods', short: 'Query Processing',
    story: 'The reporting server is timing out. Trace how a query is processed and pick join methods that beat the block-read budget.',
    blurb: 'The steps in processing an SQL query, linear search vs index search, nested-loop, index and hash join costs measured in block accesses.',
    source: '05_Query_Processing_and_Access_Methods', color: '#9a6a00', icon: '⏱️',
    boss: { name: 'The Full-Table-Scan Titan', title: 'Reads every block, every time', taunt: 'Why use an index when you can read ALL the disk?', hp: 8 },
    tools: ['optimizer'],
  },
  {
    id: 'r6', n: 6, title: 'Indexing: B+ Trees & Hashing', short: 'B+ Trees & Hashing',
    story: 'Lookups are crawling. Grow balanced B+ trees and hash buckets until every key is a few block reads away.',
    blurb: 'Index concepts, B+ tree structure, order, search, insertion with leaf and internal splits, deletion basics, static hashing, collisions, overflow and dynamic hashing.',
    source: '06_Indexing_B_Plus_Trees_and_Hashing', color: '#1b8553', icon: '🌳',
    boss: { name: 'The Unbalanced Treant', title: 'All its leaves are at different depths', taunt: 'Search me in O(n), mortal!', hp: 8 },
    tools: ['btree', 'hash'],
  },
  {
    id: 'r7', n: 7, title: 'Transactions, Concurrency & Deadlocks', short: 'Transactions',
    story: 'Two bank tellers just withdrew from the same account at the same time. Defuse the race conditions and break the deadlocks.',
    blurb: 'ACID, transaction states, the log and recovery, concurrency problems (lost update, dirty read, inconsistent analysis), schedules, serializability, locking, 2PL, timestamps, deadlock prevention, detection and wait-for graphs.',
    source: '07_Transactions_Concurrency_and_Deadlocks', color: '#c23b37', icon: '🧵',
    boss: { name: 'The Deadlock Dragon', title: 'Holds one lock and waits forever for yours', taunt: 'T1 waits for T2 waits for T1 waits for…', hp: 10 },
    tools: ['concurrency'],
  },
  {
    id: 'r8', n: 8, title: 'SQL & PL/SQL', short: 'SQL',
    story: 'The DreamHome database is live. Write the DDL, the queries, the views, the triggers and the stored procedures that run the business.',
    blurb: 'SQL DDL, DML, SELECT with WHERE, ORDER BY, functions, joins, GROUP BY/HAVING, subqueries, views, transactions, PL/SQL blocks, stored procedures and triggers (from the lectures and Labs 1–5).',
    source: '08_SQL + 11_Lab_Theory_Slides', color: '#2a6fdb', icon: '⌨️',
    boss: { name: 'The Cartesian Kraken', title: 'Forgot its join condition', taunt: '6 staff × 5 branches = 30 rows of chaos!', hp: 10 },
    tools: ['arena'],
  },
  {
    id: 'r9', n: 9, title: 'XML & Semistructured Data', short: 'XML',
    story: 'A partner company only speaks XML. Build well-formed, valid documents and query them with XPath and XQuery.',
    blurb: 'HTML vs XML, well-formed vs valid, elements and attributes, DTDs and their regular expressions, XML Schema, namespaces, XPath, XQuery FLWOR and Oracle XMLType (Lab 6).',
    source: '09_XML + Lab 06', color: '#a4421a', icon: '🏷️',
    boss: { name: 'The Malformed Mimic', title: 'Every tag it opens, it forgets to close', taunt: '<book><title>Unclosed forever', hp: 8 },
    tools: ['xml'],
  },
  {
    id: 'r10', n: 10, title: 'NoSQL & JSON', short: 'NoSQL',
    story: 'The startup outgrew one server. Choose the right NoSQL model for each job and query native JSON in Oracle.',
    blurb: 'Why NoSQL, CAP and BASE, key-value, document, wide-column and graph models, choosing a model, polyglot persistence, and Oracle native JSON (Lab 7).',
    source: '10_NoSQL + Lab 07 / JSON pack', color: '#0b6f8c', icon: '🧩',
    boss: { name: 'The Schema-less Shapeshifter', title: 'Has no schema. Has every schema.', taunt: 'Which model am I today? Guess wrong and pay!', hp: 9 },
    tools: ['json'],
  },
]

export const realmById = (id: string) => REALMS.find((r) => r.id === id)
