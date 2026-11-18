import type { RealmContent } from '../types'

// Source: 05_Query_Processing_and_Access_Methods (Query Processing (revised); Steps in Processing an
// SQL Query; Linear Search and Index Search; Nested Loops; Index Join; Join Data Access Methods (revised)).

const r5: RealmContent = {
  topics: {
    steps: 'Steps in processing a query', trees: 'Query trees & optimization', 'single-access': 'Linear vs index search',
    indexes: 'Index costs & benefits', 'nested-loop': 'Nested loop join', 'index-join': 'Index join', 'hash-join': 'Hash join',
  },
  lessons: [
    {
      id: 'r5-steps', realm: 'r5', title: 'The four steps in processing an SQL query', mins: 9,
      src: ['01_COMP2605_Query_Processing_Revised.pdf', '02_Steps_in_Processing_an_SQL_Query.pdf'],
      body: `
:::story Mission 5.1: The timing-out report
The library’s reporting query takes minutes. Before you can speed it up, follow it through the Query Manager step by step.
:::

## From SQL text to result
When an SQL SELECT is submitted to the **Query Manager**, distinct steps convert the high-level query into an executable plan and evaluate it against the stored data.

| Step | What happens |
|---|---|
| **1. Query decomposition** | **Scanning**: the scanner identifies the language components (**tokens**). **Parsing**: checks the **syntax** and breaks the statement into component parts stored in an internal **query tree**. **Validating**: checks that all **attribute and relation names are valid and semantically meaningful**. |
| **2. Query optimization** | Devise an **execution strategy**. A query typically has many; choosing a suitable one is **query optimization**. The optimizer produces the **execution plan**. |
| **3. Query code generation** | The code generator produces the code to execute the plan, run directly (**interpreted mode**) or stored for later (**compiled mode**). |
| **4. Runtime database processing** | The runtime database processor runs the code to produce the result; runtime errors produce an error message. |

{{w:query-pipeline}}

{{q:r5-steps-order}}
{{q:r5-validate}}

## The optimizer is cost-based
Among the candidate plans, the optimizer chooses the one with the **lowest estimated cost**, using available facts (**statistics**) and considering **I/O, CPU and communication** costs. (That is why the introduction lecture lists *updating statistics* as routine maintenance.)

{{q:r5-modes}}
`,
    },
    {
      id: 'r5-trees', realm: 'r5', title: 'Query trees: restrict before you join', mins: 8,
      src: ['01_COMP2605_Query_Processing_Revised.pdf', '02_Steps_in_Processing_an_SQL_Query.pdf'],
      body: `
## Query tree
A **query tree** corresponds to a relational algebra expression: **input relations are leaf nodes** and **operations are internal nodes**. An internal node executes when its operands are available and is replaced by its result; execution ends when the **root** produces the result relation.

**Example 1.** Book(BookId, BookName, Edition):
\`\`\`sql
SELECT BookName FROM Book WHERE BookId = 'ADM3713';
\`\`\`
**π BookName (σ BookId = 'ADM3713' (Book))** gives a tree with Book as the leaf, σ above it, and π at the root.

**Example 2.** Books borrowed on 27 March 2007:
\`\`\`sql
SELECT BookId, BookName FROM Loan, Book
WHERE Loan.BookId = Book.BookId AND DateOut = '27-Mar-2007';
\`\`\`
**π BookId, BookName ((σ DateOut = '27-Mar-2007' (Loan)) ⋈ Loan.BookId = Book.BookId Book)**

{{w:query-tree}}

## Many trees, one answer
Several query trees can answer the same query: the join could be done *before* the restriction on Loan. **In general it is more efficient to perform the restriction before the join**, because fewer tuples reach the join operation.

{{q:r5-restrict-first}}
{{q:r5-tree-leaves}}
`,
    },
    {
      id: 'r5-single', realm: 'r5', title: 'Single-table access: linear search vs index search', mins: 10,
      src: ['03_Linear_Search_and_Index_Search_Data_Access_Methods.pdf', '01_COMP2605_Query_Processing_Revised.pdf'],
      body: `
## Why access methods matter
A submitted query is translated into low-level **READ** operations. The time to read data from disk is a **major contributor** to processing time, so the query processor selects the most efficient data access method.

## Linear search (file scan)
Assume Book is an **unordered file**. Read each record from the start and test BookId.
\`\`\`text
WHILE NOT EOF(BookFile) DO
  Bookrec = READ(BookFile)
  IF Bookrec.BookId = 'ADM3713' THEN
    OUTPUT Bookrec.BookName
    STOP          // BookId is unique
  END IF
END WHILE
\`\`\`
- On a **unique** field (BookId) you can **stop at the first match**. ADM3713 is the 2nd record, so 2 reads.
- On a **non-unique** field (Edition) you must **read the whole file** to find every match.

## Index search
An **index** is a data structure that gives quick lookup of values in one or more columns: conceptually a **sorted list of (key value, pointer to row)**. Large indexes are organised as **trees** (commonly a **B+ tree**, wide and shallow) so a lookup branches from root to leaf. An index on a **unique** field like BookId is called a **primary index** here.
\`\`\`text
Bookrec = SEEK(Book, BookId, 'ADM3713')   -- table, indexed column, value
\`\`\`
SEEK searches the index and returns a pointer; that record is then read directly.

{{w:search-race}}

{{q:r5-unique-stop}}
{{q:r5-nonunique}}

## The price of indexes
- The DBMS **automatically creates an index on the primary key** of each table; users add more with **CREATE INDEX**.
- A table can have **several** indexes (in the extreme, one per column).
- Indexes cost work on **INSERT, UPDATE and DELETE**: inserting or deleting a row means updating **every** index on the table; updating a column means maintaining the indexes on that column.
- So many indexes speed up SELECTs but **slow down modifications**. Index design balances read performance against write-maintenance cost.

\`\`\`sql run
CREATE INDEX idx_staff_position ON Staff(position);
SELECT name, tbl_name FROM sqlite_master WHERE type = 'index';
\`\`\`

{{q:r5-index-cost}}
{{q:r5-auto-index}}
`,
    },
    {
      id: 'r5-joins', realm: 'r5', title: 'Join access methods: nested loop, index and hash join', mins: 15,
      src: ['04_Nested_Loops_Data_Access_Methods.pdf', '05_Index_Join_Data_Access_Method.pdf', '06_COMP2605_Join_Data_Access_Methods_Revised_1.pdf'],
      body: `
## Four join access methods
**Access cost** is the time taken to retrieve the required data from disk, and it depends on the method.
| Method | Main strategy |
|---|---|
| **Nested loop join** | Repeatedly scan the inner input |
| **Index join** | Use an index to find matching inner rows |
| **Hash join** | Build and probe a hash table |
| Sort-merge join | Merge inputs ordered on the join key |

The running example (Library DB): **Book(BookId, BookName, Edition)** with 5 rows and **Loan(LoanId, MemberId, BookId, DateOut, DateDue, DateReturned)** with 10 rows. Query: books borrowed on **27 October 2005** (5 of the 10 loans).

## Nested loop join (brute force)
1. Choose an **outer** and an **inner** file.
2. Scan the outer file.
3. For **each** outer row, scan the inner file for matching join values.
4. Concatenate every match with the current outer row.

\`\`\`text
FOR EACH book IN Book                 -- outer: 5 rows
  FOR EACH loan IN Loan               -- inner: restarted for every book
    IF book.BookId = loan.BookId AND loan.DateOut = '27-10-2005'
      OUTPUT book.BookId, book.BookName
\`\`\`
**Work: 5 × 10 = 50 join-predicate comparisons.** (Physical disk reads also depend on pages, buffering and caching.) The join produces 10 rows before the date filter, and 5 survive.

With **Loan as the outer file**, keep each Loan row whose DateOut is 27-10-2005, and scan Book only for those: 5 qualifying × 5 = 25 comparisons.

Nested loop works well when **the outer table is small** or **predicates reduce the qualifying outer rows**.

{{q:r5-nl-count}}
{{q:r5-nl-outer}}

## Index join (indexed nested loop)
If an index exists on the **inner table’s join column**, seek the matches instead of rescanning.
1. The table with the **indexed field is the inner table** (Book, indexed on BookId).
2. Scan the outer table (Loan) once and test DateOut.
3. For each qualifying row, **SEEK** the matching Book row through the index.
4. Output the combined fields.

\`\`\`text
FOR EACH loan IN Loan
  IF loan.DateOut = '27-10-2005' THEN
    book = SEEK(Book, BookId, loan.BookId)
    OUTPUT book.BookId, book.BookName
\`\`\`
Five qualifying Loan rows give **five index lookups**, with no full inner scan.

{{q:r5-index-inner}}

## Hash join
An in-memory hash join can **read each input once**.
1. **Build phase**: read one input and hash each row’s join value h(key) into a bucket of an in-memory hash table.
2. **Probe phase**: read the other input, hash its join value, search that bucket and **compare the actual join values** (collisions!), outputting every match.

\`\`\`text
CREATE empty hash table H
FOR EACH book IN Book                       -- build
  H[h(book.BookId)].append(book)
FOR EACH loan IN Loan                       -- probe
  IF loan.DateOut = '2015-03-27' THEN
    FOR EACH book IN H[h(loan.BookId)]
      IF book.BookId = loan.BookId THEN OUTPUT book.BookId, book.BookName
DROP H
\`\`\`
- Useful when there is **no suitable index** on the join column; works well for **large, unsorted inputs**.
- The hash table needs **memory**: **build with the smaller input** when practical, and **filter before building** to store fewer rows.
- If the build table cannot fit in memory, **partition** both inputs and process matching partitions; the extra partition writes and reads add I/O.

{{w:join-race}}

{{q:r5-hash-build}}
{{q:r5-choose-method}}

:::exam
A favourite question: “Under what conditions would each join method work well?” **Nested loop**: small outer table, or selective predicates on the outer. **Index join**: an index exists on the inner table’s join column and few outer rows qualify. **Hash join**: no useful index, large unsorted inputs, and the smaller (filtered) input fits in memory.
:::

:::tip Run the numbers yourself
Beat the read budget on five contracts in the [Query Optimizer Tycoon](#/tools/optimizer).
:::
`,
    },
  ],

  questions: [
    { id: 'r5-steps-order', realm: 'r5', topic: 'steps', kind: 'order', d: 1,
      q: 'Put the steps in processing an SQL query in order.',
      items: ['Query decomposition (scan, parse, validate)', 'Query optimization', 'Query code generation', 'Runtime database processing'],
      explain: 'Decompose, optimize, generate code, then the runtime database processor executes it.' },
    { id: 'r5-validate', realm: 'r5', topic: 'steps', kind: 'match', d: 2,
      q: 'Match each sub-step of query decomposition to its job.',
      pairs: [['Scanning', 'Identifies the tokens in the query text'], ['Parsing', 'Checks syntax and builds the query tree'], ['Validating', 'Checks attribute and relation names are valid and meaningful']],
      explain: 'The scanner tokenizes, the parser checks the grammar and builds the internal structure, and the validator checks semantics.' },
    { id: 'r5-modes', realm: 'r5', topic: 'steps', kind: 'mcq', d: 1,
      q: 'Generated query code that is stored and executed later whenever needed runs in…',
      options: ['Interpreted mode', 'Compiled mode', 'Validated mode', 'Parsed mode'], answer: 1,
      explain: 'Code can be executed directly (interpreted) or stored and run later (compiled).' },
    { id: 'r5-restrict-first', realm: 'r5', topic: 'trees', kind: 'mcq', d: 2,
      q: 'Why is σ DateOut = d (Loan) ⋈ Book usually better than σ DateOut = d (Loan ⋈ Book)?',
      options: ['It returns different rows', 'Restricting first means fewer tuples reach the expensive join', 'Joins cannot follow selections', 'Selections are only allowed on leaves'], answer: 1,
      explain: 'Both trees give the same answer; performing the restriction before the join is generally more efficient.' },
    { id: 'r5-tree-leaves', realm: 'r5', topic: 'trees', kind: 'mcq', d: 1,
      q: 'In a query tree, what are the leaf nodes and the internal nodes?',
      options: ['Leaves: operations; internal: relations', 'Leaves: input relations; internal: relational algebra operations', 'Leaves: indexes; internal: tables', 'Leaves: tokens; internal: keywords'], answer: 1,
      explain: 'Each internal operation runs when its operands are available and is replaced by its result.' },
    { id: 'r5-unique-stop', realm: 'r5', topic: 'single-access', kind: 'num', d: 2,
      q: 'Book is an unordered file: ROB7600, ADM3713, OSB14565, ELM1074, HMN8660. A linear search for BookId = \'ADM3713\' stops at the first match. How many records are read?',
      answer: 2, explain: 'BookId is unique, so the search terminates at the 2nd record.' },
    { id: 'r5-nonunique', realm: 'r5', topic: 'single-access', kind: 'mcq', d: 2,
      q: 'A linear search on the non-unique column Edition must…',
      options: ['Stop at the first match', 'Read through the entire file to find every matching value', 'Use the primary index', 'Sort the file first'], answer: 1,
      explain: 'Several rows can share an Edition, so the scan cannot stop early.' },
    { id: 'r5-index-cost', realm: 'r5', topic: 'indexes', kind: 'multi', d: 2,
      q: 'Which operations become **more expensive** as you add indexes to a table? Select all.',
      options: ['INSERT', 'DELETE', 'UPDATE of an indexed column', 'SELECT with a WHERE on an indexed column'], answer: [0, 1, 2],
      explain: 'Every index must be maintained when rows are inserted, deleted, or indexed columns change; SELECTs benefit.' },
    { id: 'r5-auto-index', realm: 'r5', topic: 'indexes', kind: 'tf', d: 1,
      q: 'The DBMS automatically creates an index on the primary key of each table.',
      answer: true, explain: 'Additional indexes are created with CREATE INDEX.' },
    { id: 'r5-nl-count', realm: 'r5', topic: 'nested-loop', kind: 'num', d: 1,
      q: 'Nested loop join with Book (5 records) as outer and Loan (10 records) as inner. How many join-predicate comparisons?',
      answer: 50, explain: '5 × 10 = 50: the inner file is scanned once for every outer record.' },
    { id: 'r5-nl-outer', realm: 'r5', topic: 'nested-loop', kind: 'num', d: 3,
      q: 'Now Loan (10 records) is the outer file and only Loan rows with DateOut = 27-10-2005 (5 rows) trigger a scan of Book (5 records). How many join comparisons?',
      answer: 25, hint: 'Only qualifying outer rows cause an inner scan.',
      explain: '5 qualifying outer rows × 5 Book records = 25. Applying the predicate to the outer file first reduces the work, which is why selective predicates suit nested loops.' },
    { id: 'r5-index-inner', realm: 'r5', topic: 'index-join', kind: 'mcq', d: 2,
      q: 'In an index join with an index on Book.BookId, which table is the inner table?',
      options: ['Loan, because it is larger', 'Book, the table with the indexed join field', 'Whichever has fewer columns', 'Neither; index joins have no inner table'], answer: 1,
      explain: 'The indexed table is sought through its index for each qualifying outer row.' },
    { id: 'r5-hash-build', realm: 'r5', topic: 'hash-join', kind: 'mcq', d: 2,
      q: 'Which input should normally be used for the **build** phase of a hash join?',
      options: ['The larger input', 'The smaller input (after filtering), so the hash table fits in memory', 'The input with an index', 'It never matters'], answer: 1,
      explain: 'The hash table lives in memory; if it doesn’t fit, partitioning adds extra writes and reads.' },
    { id: 'r5-choose-method', realm: 'r5', topic: 'hash-join', kind: 'match', d: 3,
      q: 'Match each situation to the most suitable join method.',
      pairs: [['Tiny outer table, no index anywhere', 'Nested loop join'], ['Few qualifying outer rows, index on the inner join column', 'Index join'], ['Two large unsorted inputs, no useful index, enough memory for the smaller', 'Hash join']],
      explain: 'This mirrors the performance considerations in the join access methods lecture.' },
    { id: 'r5-hash-collision', realm: 'r5', topic: 'hash-join', kind: 'mcq', d: 3,
      q: 'During the probe phase, why does the algorithm compare the actual join values after finding the bucket?',
      options: ['To sort the output', 'Because different keys can hash to the same bucket (collisions)', 'Because the build input was filtered', 'To update the index'], answer: 1,
      explain: 'The lecture stores complete rows in each bucket so collisions can be checked.' },
    { id: 'r5-hash-reads', realm: 'r5', topic: 'hash-join', kind: 'num', d: 2,
      q: 'An in-memory hash join reads each input once. With Book (5 rows) and Loan (10 rows), how many record reads does it need?',
      answer: 15, explain: 'Build reads 5, probe reads 10: 15 in total, compared with repeated inner scans in a nested loop.' },
    { id: 'r5-primary-index', realm: 'r5', topic: 'single-access', kind: 'fill', d: 1,
      q: 'An index on a unique field such as BookId is referred to in the notes as a ______ index.',
      accept: ['primary'], explain: 'An index on a unique field is a primary index.' },
    { id: 'r5-bplus-shape', realm: 'r5', topic: 'single-access', kind: 'mcq', d: 1,
      q: 'Why are large indexes organised as trees such as B+ trees rather than sequential lists?',
      options: ['Trees use less disk', 'Lists become hard to search and maintain in sorted order as the file grows; a wide, shallow tree keeps lookups to a few levels', 'Trees avoid primary keys', 'SQL requires trees'], answer: 1,
      explain: 'A B+ tree’s rules keep it wide and not too deep, improving search time.' },
  ],

  written: [
    { id: 'r5-w1', realm: 'r5', topic: 'steps', marks: 8,
      q: 'Describe the steps a DBMS uses to process an SQL SELECT statement, and draw (or describe) the query tree for: SELECT BookId, BookName FROM Loan, Book WHERE Loan.BookId = Book.BookId AND DateOut = \'27-Mar-2007\'. Explain why restricting before joining is preferred.',
      model: 'Step 1, query decomposition: the scanner identifies tokens; the parser checks syntax and builds an internal query tree; the validator checks that relation and attribute names are valid and meaningful. Step 2, query optimization: the optimizer evaluates candidate execution strategies using statistics and I/O, CPU and communication costs, and selects the lowest-cost plan. Step 3, code generation: code is generated to execute the plan in interpreted or compiled mode. Step 4, runtime database processing: the runtime processor executes the code and returns the result or an error. Query tree: leaves Loan and Book; σ DateOut = 27-Mar-2007 above Loan; ⋈ Loan.BookId = Book.BookId joining that result with Book; π BookId, BookName at the root. Restricting first is preferred because fewer tuples reach the join, which is the expensive operation.',
      points: ['Scanning described', 'Parsing described (syntax + query tree)', 'Validation described', 'Optimization (cost-based, statistics)', 'Code generation (interpreted/compiled)', 'Runtime processing', 'Correct query tree', 'Restrict-before-join justification'] },
    { id: 'r5-w2', realm: 'r5', topic: 'nested-loop', marks: 9,
      q: 'Using Book (5 records) and Loan (10 records), write the algorithm and work out the effort for (a) a nested loop join with Book as outer, (b) an index join with an index on Book.BookId, and (c) a hash join. State when each works well.',
      model: '(a) For each Book record, scan all Loan records and output pairs where BookId matches and DateOut = 27-10-2005: 5 × 10 = 50 comparisons; works well when the outer table is small or predicates reduce qualifying outer rows. (b) Book (indexed) is the inner table. Scan Loan once (10 reads); for each of the 5 rows with DateOut = 27-10-2005, SEEK Book via the BookId index: 5 lookups, no inner scans; works well when an index exists on the inner join column and few outer rows qualify. (c) Build a hash table on Book (5 reads, hashing BookId into buckets); probe with Loan (10 reads), hashing each qualifying row’s BookId and comparing actual values in the bucket: each input is read once (15 reads); works well for large unsorted inputs without a useful index when the smaller input fits in memory, otherwise partitioning adds I/O.',
      points: ['Nested loop algorithm', '50 comparisons', 'Nested loop conditions', 'Index join: indexed table is inner', 'Index join: 5 seeks after one scan', 'Index join conditions', 'Hash build/probe phases', 'Each input read once', 'Hash join conditions incl. memory'] },
  ],

  cards: [
    { id: 'r5-c1', realm: 'r5', front: 'Four steps in processing an SQL query', back: '1 Decomposition (scan, parse, validate) · 2 Optimization · 3 Code generation · 4 Runtime database processing.' },
    { id: 'r5-c2', realm: 'r5', front: 'Scanner / parser / validator', back: 'Scanner: tokens. Parser: syntax + query tree. Validator: names valid and meaningful.' },
    { id: 'r5-c3', realm: 'r5', front: 'Query optimization', back: 'Choosing a suitable execution strategy; cost-based using statistics, I/O, CPU and communication.' },
    { id: 'r5-c4', realm: 'r5', front: 'Interpreted vs compiled mode', back: 'Interpreted: executed directly. Compiled: stored and executed later when needed.' },
    { id: 'r5-c5', realm: 'r5', front: 'Query tree', back: 'Relational algebra as a tree: input relations = leaves, operations = internal nodes; executes bottom-up to the root.' },
    { id: 'r5-c6', realm: 'r5', front: 'Restrict before join?', back: 'Yes, generally more efficient: fewer tuples reach the join.' },
    { id: 'r5-c7', realm: 'r5', front: 'Linear search (file scan)', back: 'Read records from the start; stop at first match on a unique field; read the whole file on a non-unique field.' },
    { id: 'r5-c8', realm: 'r5', front: 'Index / primary index', back: 'Data structure for quick lookup: sorted (key, pointer) entries, usually a B+ tree. On a unique field = primary index.' },
    { id: 'r5-c9', realm: 'r5', front: 'Cost of indexes', back: 'Faster SELECTs but slower INSERT/DELETE/UPDATE because every affected index must be maintained.' },
    { id: 'r5-c10', realm: 'r5', front: 'Nested loop join', back: 'For each outer row, scan the inner file. Book(5) × Loan(10) = 50 comparisons. Good with a small outer table or selective outer predicates.' },
    { id: 'r5-c11', realm: 'r5', front: 'Index join', back: 'Indexed table is inner; scan outer once, SEEK matching inner rows. Good when an inner join-column index exists.' },
    { id: 'r5-c12', realm: 'r5', front: 'Hash join', back: 'Build an in-memory hash table on one input, probe with the other; each input read once. Build with the smaller input; partition if it does not fit.' },
    { id: 'r5-c13', realm: 'r5', front: 'Four join access methods', back: 'Nested loop, index join, hash join, sort-merge join.' },
  ],

  terms: [
    { term: 'Query Manager', def: 'DBMS component that receives SQL and coordinates its processing.', realm: 'r5' },
    { term: 'Scanner', def: 'Identifies the tokens in query text.', realm: 'r5' },
    { term: 'Parser', def: 'Checks query syntax and builds the internal query tree.', realm: 'r5' },
    { term: 'Query optimization', def: 'Choosing a suitable execution strategy for a query.', realm: 'r5' },
    { term: 'Execution plan', def: 'The strategy produced by the optimizer for evaluating a query.', realm: 'r5' },
    { term: 'Query tree', def: 'Tree form of a relational algebra expression; relations are leaves, operations internal nodes.', realm: 'r5' },
    { term: 'Linear search', def: 'File scan reading records sequentially until matches are found.', realm: 'r5' },
    { term: 'Index search', def: 'Using an index structure to locate records without a full scan.', realm: 'r5' },
    { term: 'SEEK', def: 'Generic index lookup: SEEK(table, indexed column, value) returns a record pointer.', realm: 'r5' },
    { term: 'Access cost', def: 'Time taken to retrieve the required data from disk.', realm: 'r5' },
    { term: 'Nested loop join', def: 'Join that scans the inner input for every outer row.', realm: 'r5' },
    { term: 'Index join', def: 'Nested loop that seeks inner rows through an index on the join column.', realm: 'r5' },
    { term: 'Hash join', def: 'Join with a build phase (hash table) and a probe phase.', realm: 'r5' },
  ],

  sql: [
    { id: 'r5-s1', realm: 'r5', topic: 'indexes', title: 'Create an index', dataset: 'dreamhome', d: 1,
      prompt: 'Create an index called **idx_prop_city** on PropertyForRent(city). (The checker lists your indexes.)',
      solution: 'CREATE INDEX idx_prop_city ON PropertyForRent(city);',
      check: "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'PropertyForRent' AND name NOT LIKE 'sqlite_%' ORDER BY name;" },
    { id: 'r5-s2', realm: 'r5', topic: 'trees', title: 'Restrict, then join', dataset: 'dreamhome', d: 2,
      prompt: 'Write the query for this tree: π propertyNo, fName, lName ((σ city = \'Glasgow\' (PropertyForRent)) ⋈ PropertyForRent.staffNo = Staff.staffNo Staff).',
      solution: "SELECT p.propertyNo, s.fName, s.lName FROM PropertyForRent p JOIN Staff s ON p.staffNo = s.staffNo WHERE p.city = 'Glasgow';" },
  ],

  codex: `
## Processing pipeline
1. **Decomposition**: scan (tokens) → parse (syntax, query tree) → validate (names)
2. **Optimization**: cost-based (statistics; I/O, CPU, communication) → execution plan
3. **Code generation**: interpreted or compiled mode
4. **Runtime processing**: result or runtime error

## Query trees
Leaves = relations; internal nodes = operations; root = result. **Restrict before join.**

## Single table
- **Linear search**: unique key, stop at the match; non-unique, read the whole file.
- **Index search**: SEEK(table, column, value) through a B+ tree index. PK indexes are automatic; CREATE INDEX for more. More indexes = faster SELECT, slower INSERT/UPDATE/DELETE.

## Joins (Book 5 rows, Loan 10 rows, 5 qualifying loans)
| Method | Work | Best when |
|---|---|---|
| Nested loop | 5 × 10 = 50 comparisons (Loan outer, filtered first: 5 × 5 = 25) | small outer / selective outer predicate |
| Index join | scan outer once + 1 SEEK per qualifying row (5) | index on inner join column |
| Hash join | each input read once (5 + 10 = 15) | no index, large unsorted inputs; build the smaller in memory |
`,
}

export default r5
