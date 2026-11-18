import type { RealmContent } from '../types'

// Source: 01_Introduction_and_Relational_Model (Introduction to Relational Databases;
// DBMS Functions & Components illustrated guide; The Relational Model; Intro to the Relational Model).

const r1: RealmContent = {
  topics: {
    data: 'Data, information & utility', abstraction: 'Abstraction & data independence', components: 'DBMS functions & components',
    dbtypes: 'Database types', users: 'Database users', relational: 'Relational terminology', keys: 'Relational keys', integrity: 'Nulls & integrity rules',
  },
  lessons: [
    {
      id: 'r1-data', realm: 'r1', title: 'Data, information and data utility', mins: 8,
      src: ['01_COMP2605_Introduction_Relational_Databases.pdf'],
      body: `
:::story Mission 1.1: The spreadsheet swamp
ABC School District wants an on-line student registration system. Before you design anything, you must speak the language of data. Clear this briefing to earn your first XP.
:::

## Data is raw; information has meaning
**Data** is a collection of facts, statistics or information: numbers, text, images, sounds or other formats. Data on its own is *raw and unorganised*. It only becomes valuable when it is **processed and analysed** to give insight, support decisions or provide context. Processed, meaningful data is **information**.

## Five ways to classify data
| Classification | One side | The other side |
|---|---|---|
| Structure | **Structured**: organised in tables with a predefined format | **Unstructured**: no fixed format (document text, images) |
| Measurement | **Quantitative**: numeric values (sales figures, temperatures) | **Qualitative**: non-numeric (comments, reviews) |
| Origin | **Primary**: collected directly from original sources | **Secondary**: sourced from existing data created by others |
| Change | **Static**: stays unchanged over time | **Dynamic**: constantly updated (live stock prices) |
| Scale | **Big Data**: datasets so large and complex that traditional processing struggles; mixes structured and unstructured data from many sources | |

{{q:r1-classify}}

## Data utility
**Utility** is the value or usefulness of data in its processed form: how far it can be used to achieve objectives or support decisions. The lecture lists the aspects that raise (or lower) utility:

- **Accessibility**: authorised users or systems can reach it when needed.
- **Relevance**: pertinent to the task; irrelevant data adds noise.
- **Accuracy**: reliable and trustworthy; errors cause poor decisions.
- **Timeliness**: up to date when real-time information is needed.
- **Completeness**: no missing details.
- **Consistency**: uniform across sources and parts of the dataset.
- **Context**: knowing how and why it was collected.
- **Security and Privacy**: protected from unauthorised access, which builds trust.
- **Interoperability**: integrates with other datasets and systems through standard formats.
- **Scalability**: stays valuable as data and needs grow.
- **Visualization and Presentation**: clear presentation makes complex information easier to analyse.
- **Data Governance**: policies that ensure quality, security and compliance.

:::exam
A classic short question: “Explain three aspects of data utility, with an example of each.” Name the aspect, define it in one line, then give a concrete example (e.g. *timeliness*: yesterday’s stock price is useless to a day-trader).
:::

{{q:r1-utility}}

## Why this course exists
Virtually every app (booking a flight, liking a post, transferring money, buying on Amazon) is backed by a database system. COMP2605 is about how to develop database systems that **efficiently manage, maintain, process, query, transact with and make sense of data**.

:::tip Lecture task (try it)
List the data ABC School District should capture for on-line registration (student ID, names, date of birth, address, parent/guardian contacts, previous school, courses, emergency contacts…). Then ask: what *information* could the district derive from it? (Enrolment trends, class sizes, attendance risk.)
:::
`,
    },
    {
      id: 'r1-dbms', realm: 'r1', title: 'Databases, abstraction and the DBMS', mins: 8,
      src: ['01_COMP2605_Introduction_Relational_Databases.pdf'],
      body: `
## What is a database?
A **database** is a structured collection of data organised and stored in a computer system for efficient **retrieval, management and manipulation**: easy to store, access, update and query.

A **database system**, or **Database Management System (DBMS)**, is the *software* that manages the storage, retrieval, organisation and manipulation of that data. It is an **intermediary layer** between users/applications and the physical storage, giving a structured, controlled environment.

## Abstraction: separate *how it is stored* from *how it is used*
Abstraction puts a layer between the physical implementation of storage and the way users interact with data. The lecture’s benefits:

| Benefit | What it means |
|---|---|
| **Data independence** | Changing the physical storage structure does not change the logical structure or how users access data |
| Simplified data access | Users write high-level queries (SQL) without knowing how data is stored or indexed |
| Flexibility | Designers can change the logical model without touching the physical implementation |
| Security and access control | Role-based permissions are set at the logical level |
| Portability | The same logical model (e.g. SQL) works across DBMSs |
| Query optimization | The optimizer picks efficient plans while hiding storage details |
| Aggregation and transformation | Complex operations without worrying about storage |
| Data integration | Different sources abstracted into one common model (data warehousing) |
| Ease of maintenance | Modular, incremental changes without breaking existing functionality |

{{q:r1-independence}}

## Units of storage
The lecture lists units as powers of two: a **bit** is 0 or 1, a **nibble** is 4 bits, a **byte** is 8 bits, and each step after that (KB, MB, GB, TB, PB, EB, ZB) multiplies by 1,024 (2^10, 2^20 … 2^70). The binary-prefixed names (KiB, MiB, GiB…) make the 1,024 meaning explicit.

## Major database operations
Create database, create table, **INSERT**, **UPDATE**, **DELETE**, query with **SELECT** (WHERE, JOIN, GROUP BY, ORDER BY), indexing, transaction management (**BEGIN TRANSACTION, COMMIT, ROLLBACK**), integrity constraints (primary, unique, foreign and check), joins, aggregate functions (SUM, AVG, COUNT, MIN, MAX), grouping, sorting, backup and restore, security management, optimization, maintenance (updating statistics, monitoring health) and import/export.

Try one right now against the DreamHome database:

\`\`\`sql run
SELECT branchNo, city FROM Branch ORDER BY city;
\`\`\`

:::tip
Every SQL block marked **Run** in a lesson executes in a real in-browser SQL engine. Edit it and run again. Nothing can break; a reset button restores the data.
:::
`,
    },
    {
      id: 'r1-components', realm: 'r1', title: 'DBMS functions and components', mins: 12,
      src: ['02_COMP2605_DBMS_Functions_Components_Illustrated.pdf', '01_COMP2605_Introduction_Relational_Databases.pdf'],
      body: `
## Two complementary views
| View | Question it answers | Examples |
|---|---|---|
| **Functions** | What responsibilities must the DBMS fulfil? | Query processing, security management, backup and recovery |
| **Components** | Which parts of the system do the work? | Query Processor, Storage Manager, Transaction Manager |

A function is a *responsibility*; a component is a *part that carries out work*. One function can depend on several components, and one component can support several functions.

## The seven DBMS functions
1. **Data Dictionary Management**: stores the schema and other metadata; records structural definitions; supports constraint validation and application views.
2. **Data Storage Management**: organises physical storage and files; creates and maintains indexes.
3. **Query Processing**: converts a high-level request into an access plan and instructions that retrieve the data.
4. **Multi-user Access Control**: coordinates simultaneous use so concurrent transactions don’t interfere.
5. **Back up and Recovery Management**: routine backups plus log-based recovery after failures.
6. **Security Management**: which users may access which data and perform which operations (read, add, delete, modify).
7. **Database Communication Interface**: accepts requests through network-facing interfaces: forms, browser access, HTML reports.

:::warn Two kinds of control
**Security** asks *whether* a user may perform an operation. **Multi-user access control** asks *how* permitted concurrent operations proceed without interfering. An authorised ATM withdrawal can still be delayed by the Transaction Manager.
:::

{{q:r1-func-vs-comp}}

## The architecture: three managers and storage
Three request categories enter at the top, **Schema Modifications**, **Queries** and **Updates**, and all of them go to the **Query Processor** (also called the **Query Manager**).

| Component | Role |
|---|---|
| **Query Processor / Query Manager** | Parses and optimizes; turns a high-level request into a sequence of requests for stored data. Handles retrieval **and** data/metadata changes. |
| **Storage Manager** | Obtains and modifies information in storage. Contains the **File Manager** (tracks file locations on disk, obtains blocks) and the **Buffer Manager** (manages main-memory pages: obtains blocks via the File Manager, decides residency and reuse). |
| **Transaction Manager** | Groups queries and modifications into transactions; coordinates concurrent work with the Query Manager; works with the Storage Manager to log changes for recovery. |
| **Storage** | Holds **data** and **metadata** (and indexes). |

{{w:dbms-flow}}

## Data, metadata and an index
In the account-number example: the **data** is the actual account numbers and balances. The **metadata** describes the relation, attribute types and which attributes are indexed. The **index** is the stored lookup structure; its *description* is metadata.

{{q:r1-metadata}}

## Classify the request
Ask: does the request change the database *description* (schema modification), *retrieve* information (query), or *change stored values* (update)? Adding a column is a schema modification. Changing a value in a row is an update. Retrieving that value is a query.

{{q:r1-request-type}}

## The full component list from the introduction lecture
DDL, DML, Database Engine, Query Processor, Storage Manager, Transaction Manager (ACID), Concurrency Control, Security and Authorization, Backup and Recovery Manager, Query Optimizer, **Data Dictionary/Metadata Repository**, Logging and Monitoring, Utilities and Tools, and an API.
`,
    },
    {
      id: 'r1-types-users', realm: 'r1', title: 'Database types and database users', mins: 7,
      src: ['01_COMP2605_Introduction_Relational_Databases.pdf'],
      body: `
## Types of database
| Type | Idea | Examples |
|---|---|---|
| **Relational (RDBMS)** | Tables of rows and columns, manipulated with SQL | MySQL, PostgreSQL, Oracle, SQL Server |
| **NoSQL** | Unstructured or semi-structured, big data and real-time | Document (MongoDB), key-value (Redis, DynamoDB), column-family (Cassandra, HBase), graph (Neo4j) |
| Object-oriented | Objects that encapsulate data *and* behaviour | db4o, Versant |
| In-memory | Entirely in RAM for speed | Redis, Memcached |
| NewSQL | SQL + ACID with NoSQL-style scalability | Google Spanner, CockroachDB |
| Time-series | Time-stamped data (IoT, monitoring) | InfluxDB, Prometheus |
| Spatial | GIS data | PostGIS, Oracle Spatial |
| Multimodal | Several data models in one system | ArangoDB, OrientDB |
| Distributed | Data across nodes for scale and fault tolerance | Amazon Aurora, Cloud Spanner |
| Cloud | Hosted and managed in the cloud | Amazon RDS, Azure SQL |
| Columnar | Stores columns, not rows; good for analytics | Redshift, Parquet |
| Blockchain | Tamper-resistant distributed ledger | Bitcoin, Ethereum |
| XML | Stores and queries XML | BaseX, eXist-db |

{{q:r1-dbtype}}

## Who uses a database?
- **End users**: *casual* (occasional, basic queries), *naïve* (simple interfaces, minimal knowledge), *power* (complex queries and reports).
- **Application developers**: front-end (build interfaces) and back-end (tables, schemas, stored procedures).
- **Database Administrators (DBAs)**: install, configure, back up, recover, secure and tune.
- **Data architects** and **database designers**: design the schema, relationships and constraints.
- **Data analysts** (extract, clean, report) and **data scientists** (statistics and ML).
- **Business executives and managers**: dashboards for decisions.
- **Security administrators and compliance officers** (HIPAA, GDPR), **auditors and compliance inspectors**.
- **External users** (customers, suppliers) and **report writers**.

{{q:r1-users}}
`,
    },
    {
      id: 'r1-relational', realm: 'r1', title: 'The relational model: relations, domains, degree and cardinality', mins: 10,
      src: ['03_COMP2605_Relational_Model_Revised.pdf', '04_Introduction_to_the_Relational_Model.pdf'],
      body: `
:::story Mission 1.2: Meet DreamHome
The rest of the course uses **DreamHome**, a property rental company with branches, staff, properties, owners, clients and viewings. Its data lives in relations. Learn to read them.
:::

## Codd’s relational model
The RDBMS is the dominant data-processing software and the **second generation** of DBMSs, based on the relational data model proposed by **E. F. Codd (1970)**. All data is logically structured in **relations (tables)**; each relation has a name and named **attributes (columns)**, and each **tuple (row)** holds one value per attribute.

Codd’s objectives: (1) a high degree of **data independence**, so programs aren’t affected by changes to file organisation, record order or access paths; (2) a sound basis for dealing with **semantics, consistency and redundancy** (normalized relations); (3) enabling **set-oriented** data manipulation languages.

The model has three components: a collection of **data object types** (logical data structure), a collection of general **integrity rules** (data integrity), and a collection of **operators** (data manipulation).

## Terminology
| Term | Meaning |
|---|---|
| **Relation** | A table with columns and rows |
| **Attribute** | A named column of a relation |
| **Domain** | The set of allowable values for one or more attributes |
| **Tuple** | A row of a relation |
| **Degree** | The number of attributes (property of the *intension*) |
| **Cardinality** | The number of tuples (property of the *extension*; changes as rows are added or deleted) |
| **Relational database** | A collection of normalized relations with distinct names |
| **Relation schema** | A named relation defined by a set of attribute–domain pairs |
| **Relational database schema** | A set of relation schemas, each with a distinct name |

A relation of degree 1 is **unary**, 2 is **binary**, 3 is **ternary**, and beyond that **n-ary**.

\`\`\`sql run
SELECT * FROM Branch;
\`\`\`

Branch has **degree 4** (branchNo, street, city, postcode) and **cardinality 5**.

{{q:r1-degree}}

## Alternative terminology
| Formal | Alternative 1 | Alternative 2 |
|---|---|---|
| Relation | Table | File |
| Tuple | Row | Record |
| Attribute | Column | Field |

## Why domains matter
Domains let the system catch semantically wrong operations: comparing a street name with a phone number is nonsense even though both are strings. But multiplying monthly rent (money) by number of months (integer) is legal even though the domains differ.

## Properties of relations
- The relation name is distinct from all other relation names in the schema.
- Each cell holds exactly **one atomic value**.
- Each attribute has a distinct name.
- All values of an attribute come from the same domain.
- **No duplicate tuples**.
- The order of attributes has no significance.
- The order of tuples has no significance (in theory; in practice it can affect access efficiency).

{{q:r1-properties}}
`,
    },
    {
      id: 'r1-keys', realm: 'r1', title: 'Relational keys', mins: 10,
      src: ['03_COMP2605_Relational_Model_Revised.pdf'],
      body: `
## Why keys?
A relation has no duplicate tuples, so some attribute(s) must uniquely identify each tuple. These are the **relational keys**.

| Key | Definition |
|---|---|
| **Superkey** | An attribute or set of attributes that uniquely identifies a tuple (may contain unnecessary extras) |
| **Candidate key** | A superkey such that **no proper subset** is a superkey. It has **uniqueness** and **irreducibility** |
| **Composite key** | A key made of more than one attribute |
| **Primary key** | The candidate key *selected* to identify tuples |
| **Alternate key** | A candidate key *not* selected as primary key |
| **Foreign key** | An attribute (set) in one relation that matches the candidate key of some (possibly the same) relation |

## Worked example from the lecture: Employee(Emp_SSN, Emp_Number, Emp_Name)
**Superkeys:** {Emp_SSN}, {Emp_Number}, {Emp_SSN, Emp_Number}, {Emp_SSN, Emp_Name}, {Emp_SSN, Emp_Number, Emp_Name}, {Emp_Number, Emp_Name}.

**Candidate keys:** only **{Emp_SSN}** and **{Emp_Number}**. Every other superkey contains a redundant attribute, e.g. {Emp_SSN, Emp_Name} is not a candidate key because {Emp_SSN} alone already identifies a row.

:::key
All candidate keys are superkeys, but not all superkeys are candidate keys. Candidate keys are the superkeys you cannot remove any attribute from.
:::

{{w:key-finder}}

## DreamHome examples
- **Branch**: **city** can’t be a candidate key (London has two branches). **branchNo** is a candidate key, and so is **postcode**. Choose branchNo as primary key and postcode becomes an **alternate key**.
- **Viewing(clientNo, propertyNo, viewDate, comment)**: a client views many properties and a property is viewed by many clients, so neither alone is a key; **{clientNo, propertyNo}** is the composite candidate (and therefore primary) key. If a client could view the same property twice, viewDate would have to join the key.

:::warn An instance cannot prove a key
No duplicates *today* doesn’t mean duplicates are impossible. lName looks unique in the Staff sample, but a second “White” could join tomorrow. An instance can only *disprove* a key (by showing duplicates). Keys come from real-world meaning.
:::

{{q:r1-candidate}}

## Foreign keys link relations
**branchNo** is the primary key of Branch. In Staff, branchNo exists to match staff to their branch, so it is a **foreign key** in Staff that targets the **home relation** Branch.

The DreamHome schema (primary keys first; FKs in italics):
\`\`\`text
Branch (branchNo, street, city, postcode)
Staff (staffNo, fName, lName, position, sex, DOB, salary, branchNo*)
PropertyForRent (propertyNo, street, city, postcode, type, rooms, rent, ownerNo*, staffNo*, branchNo*)
Client (clientNo, fName, lName, telNo, prefType, maxRent, eMail)
PrivateOwner (ownerNo, fName, lName, address, telNo, eMail, password)
Viewing (clientNo*, propertyNo*, viewDate, comment)
Registration (clientNo*, branchNo*, staffNo*, dateJoined)
\`\`\`

{{q:r1-fk}}
`,
    },
    {
      id: 'r1-integrity', realm: 'r1', title: 'Nulls, entity integrity and referential integrity', mins: 9,
      src: ['03_COMP2605_Relational_Model_Revised.pdf'],
      body: `
## Null
A **null** represents a value that is currently **unknown or not applicable** for a tuple. It is *not* zero and *not* a string of spaces: those are values. Null is the absence of a value, so it must be treated differently.

## Integrity constraints
Every attribute has a domain, and **domain constraints** restrict its allowed values. On top of that, two principal integrity rules apply to *every* instance of the database:

:::def Entity integrity
In a base relation, **no attribute of a primary key can be null**.
:::
Why? A primary key is a *minimal* identifier. Allowing a null in part of it would imply that not all of its attributes are needed for uniqueness, which contradicts minimality. For Viewing(clientNo, propertyNo), neither clientNo nor propertyNo nor both may be null.

:::def Referential integrity
If a foreign key exists in a relation, either the foreign key value must **match a candidate key value** of some tuple in its home relation, or the foreign key value must be **wholly null**.
:::
You can’t create a staff record with branchNo **B025** unless branch B025 already exists. But a new staff member not yet assigned to a branch may have a **null** branchNo.

## Feel the Integrity Shields
Your Integrity Shields protect the DreamHome database. Run each statement below and watch what happens.

\`\`\`sql run
-- Entity integrity: a duplicate primary key
INSERT INTO Branch VALUES ('B005', '1 New St', 'London', 'SW9 9ZZ');
\`\`\`

\`\`\`sql run
-- Referential integrity: branch B025 does not exist
INSERT INTO Staff VALUES ('SG99', 'Ada', 'Grant', 'Assistant', 'F', '1990-01-01', 9500, 'B025');
\`\`\`

\`\`\`sql run
-- Legal: a wholly null foreign key (not yet assigned to a branch)
INSERT INTO Staff VALUES ('SG99', 'Ada', 'Grant', 'Assistant', 'F', '1990-01-01', 9500, NULL);
SELECT staffNo, fName, branchNo FROM Staff WHERE branchNo IS NULL;
\`\`\`

{{q:r1-entity}}
{{q:r1-ref}}

:::exam
Be precise with the wording of referential integrity: “**match a candidate key value of some tuple in its home relation, or be wholly null**.” Students who write “must match the primary key” lose the subtle mark, and “wholly” matters for composite foreign keys.
:::
`,
    },
  ],

  questions: [
    { id: 'r1-classify', realm: 'r1', topic: 'data', kind: 'match', d: 1,
      q: 'Match each example to its data classification.',
      pairs: [['Customer reviews on a website', 'Qualitative'], ['Live stock market prices', 'Dynamic'], ['A government census you download and reuse', 'Secondary'], ['Rows in an Oracle table with fixed columns', 'Structured']],
      explain: 'Reviews are non-numeric (qualitative); live prices keep changing (dynamic); reusing data someone else collected is secondary; fixed-format tables are structured.' },
    { id: 'r1-utility', realm: 'r1', topic: 'data', kind: 'mcq', d: 1,
      q: 'A hospital dashboard shows bed availability from last week. Which aspect of data utility is most clearly lacking?',
      options: ['Interoperability', 'Timeliness', 'Context', 'Scalability'], answer: 1,
      explain: 'Timeliness: out-of-date data has limited utility when up-to-date information is required.' },
    { id: 'r1-independence', realm: 'r1', topic: 'abstraction', kind: 'mcq', d: 1,
      q: 'The DBA moves a table to a faster disk and rebuilds its file organisation. Application queries keep working unchanged. Which benefit of abstraction is this?',
      options: ['Portability', 'Data independence', 'Data integration', 'Query optimization'], answer: 1,
      explain: 'Data independence: changes to physical storage do not affect the logical structure or how users access data.' },
    { id: 'r1-func-vs-comp', realm: 'r1', topic: 'components', kind: 'multi', d: 2,
      q: 'Which of these are DBMS **components** (parts that do work) rather than **functions** (responsibilities)? Select all.',
      options: ['Storage Manager', 'Security Management', 'Transaction Manager', 'Back up and Recovery Management', 'Query Processor'], answer: [0, 2, 4],
      explain: 'Storage Manager, Transaction Manager and Query Processor are components in the architecture. Security Management and Back up & Recovery Management are among the seven functions.' },
    { id: 'r1-metadata', realm: 'r1', topic: 'components', kind: 'mcq', d: 2,
      q: 'In the account-number index example, which of these is **metadata**?',
      options: ['The balance 1,250.00 stored for account 4411', 'The B+ tree pages of the account-number index', 'The fact that attribute accountNo is of type CHAR(10) and is indexed', 'The rows returned by a balance query'], answer: 2,
      explain: 'Metadata describes the data: relation and attribute names, types, keys, constraints and which attributes have indexes. The index pages themselves are stored data, and a balance is a data value.' },
    { id: 'r1-request-type', realm: 'r1', topic: 'components', kind: 'match', d: 1,
      q: 'Classify each request.',
      pairs: [['ALTER TABLE Account ADD email VARCHAR(50)', 'Schema modification'], ['Find the balance of account 4411', 'Query'], ['Delete the row for account 9001', 'Update']],
      explain: 'Changing the database description is a schema modification; retrieving is a query; changing stored values (insert, delete, change) is an update. All three enter through the Query Processor.' },
    { id: 'r1-dbtype', realm: 'r1', topic: 'dbtypes', kind: 'mcq', d: 1,
      q: 'An IoT company stores millions of sensor readings, each stamped with the time it was taken, and mostly queries by time range. Which database type is the best fit?',
      options: ['Spatial database', 'Time-series database', 'XML database', 'Object-oriented database'], answer: 1,
      explain: 'Time-series databases (InfluxDB, Prometheus) are optimised for time-stamped data such as IoT and monitoring.' },
    { id: 'r1-users', realm: 'r1', topic: 'users', kind: 'mcq', d: 1,
      q: 'Who is responsible for installation, configuration, backup, recovery, security and performance tuning of the database system?',
      options: ['Data analyst', 'Database Administrator (DBA)', 'Power user', 'Report writer'], answer: 1,
      explain: 'The DBA manages and maintains the database system.' },
    { id: 'r1-degree', realm: 'r1', topic: 'relational', kind: 'num', d: 1,
      q: 'The DreamHome **Staff** relation has attributes staffNo, fName, lName, position, sex, DOB, salary, branchNo and holds 6 tuples. What is its **degree**?',
      answer: 8, explain: 'Degree = number of attributes = 8. (Cardinality = number of tuples = 6.)' },
    { id: 'r1-properties', realm: 'r1', topic: 'relational', kind: 'multi', d: 2,
      q: 'Which are properties of a relation? Select all that apply.',
      options: ['Each cell contains exactly one atomic value', 'Tuples must be stored in primary-key order', 'There are no duplicate tuples', 'Each attribute has a distinct name', 'An attribute may mix values from different domains'], answer: [0, 2, 3],
      explain: 'Order of tuples has no significance, and all values of an attribute come from the same domain.' },
    { id: 'r1-candidate', realm: 'r1', topic: 'keys', kind: 'mcq', d: 2,
      q: 'Employee(Emp_SSN, Emp_Number, Emp_Name). Why is {Emp_SSN, Emp_Name} a superkey but **not** a candidate key?',
      options: ['Emp_Name can contain nulls', 'It has a proper subset, {Emp_SSN}, that is already a superkey', 'Composite keys cannot be candidate keys', 'Emp_SSN is the primary key'], answer: 1,
      explain: 'A candidate key must be irreducible: no proper subset may itself be a superkey.' },
    { id: 'r1-fk', realm: 'r1', topic: 'keys', kind: 'mcq', d: 1,
      q: 'In DreamHome, Staff(staffNo, …, branchNo). branchNo in Staff is:',
      options: ['The primary key of Staff', 'An alternate key of Staff', 'A foreign key that targets Branch.branchNo', 'A composite key'], answer: 2,
      explain: 'branchNo appears in Staff to link each staff member to their branch; it references the home relation Branch.' },
    { id: 'r1-entity', realm: 'r1', topic: 'integrity', kind: 'tf', d: 1,
      q: 'Entity integrity allows one attribute of a composite primary key to be null, as long as the other is not.',
      answer: false, explain: 'No attribute of a primary key may be null; for Viewing neither clientNo nor propertyNo may be null.' },
    { id: 'r1-ref', realm: 'r1', topic: 'integrity', kind: 'mcq', d: 2,
      q: 'Which Staff row violates **referential integrity**? (Branches B002–B007 exist.)',
      options: ["('SG99', …, branchNo = NULL)", "('SG98', …, branchNo = 'B003')", "('SG97', …, branchNo = 'B025')", "('SG96', …, branchNo = 'B005')"], answer: 2,
      explain: 'B025 matches no branch. A wholly null foreign key is allowed (not yet assigned).' },
    { id: 'r1-null', realm: 'r1', topic: 'integrity', kind: 'mcq', d: 1,
      q: 'What does a null represent?',
      options: ['The number zero', 'An empty string of spaces', 'A value that is unknown or not applicable', 'A deleted tuple'], answer: 2,
      explain: 'Zero and spaces are values; null is the absence of a value.' },
    { id: 'r1-alternate', realm: 'r1', topic: 'keys', kind: 'fill', d: 1,
      q: 'Branch has candidate keys branchNo and postcode. branchNo is chosen as primary key. postcode is therefore called an ______ key.',
      accept: ['alternate', 'alternate key', 'alternative', 'alternative key'], explain: 'Candidate keys not chosen as the primary key are alternate keys.' },
    { id: 'r1-codd', realm: 'r1', topic: 'relational', kind: 'mcq', d: 1,
      q: 'Who proposed the relational data model, and when?',
      options: ['Peter Chen, 1976', 'E. F. Codd, 1970', 'C. J. Date, 1983', 'Charles Bachman, 1965'], answer: 1,
      explain: 'E. F. Codd proposed the relational model in 1970; RDBMSs are the second generation of DBMSs.' },
    { id: 'r1-cardinality', realm: 'r1', topic: 'relational', kind: 'tf', d: 1,
      q: 'Cardinality is a property of the intension of a relation, while degree is a property of its extension.',
      answer: false, explain: 'It is the other way round: degree belongs to the intension (schema); cardinality belongs to the extension (current instance) and changes as tuples are added or deleted.' },
    { id: 'r1-sec-vs-conc', realm: 'r1', topic: 'components', kind: 'mcq', d: 2,
      q: 'An authorised teller’s withdrawal is delayed because another ATM is updating the same account. Which DBMS function caused the delay?',
      options: ['Security Management', 'Multi-user Access Control', 'Data Dictionary Management', 'Database Communication Interface'], answer: 1,
      explain: 'Security decides whether an operation is allowed; multi-user access control (via the Transaction Manager) decides how concurrent permitted operations proceed.' },
    { id: 'r1-buffer', realm: 'r1', topic: 'components', kind: 'mcq', d: 2,
      q: 'Which component chooses main-memory pages for disk blocks and manages how long they stay there?',
      options: ['File Manager', 'Buffer Manager', 'Query Manager', 'Transaction Manager'], answer: 1,
      explain: 'The Buffer Manager manages main-memory pages; it obtains blocks through the File Manager, which tracks file locations on disk.' },
    { id: 'r1-components3', realm: 'r1', topic: 'relational', kind: 'order', d: 2,
      q: 'The relational model has three components. Put them in the order the notes list them.',
      items: ['Data object types (logical data structure)', 'General integrity rules (data integrity)', 'Operators (data manipulation)'],
      explain: 'Structure, integrity, manipulation.' },
    { id: 'r1-superkey-count', realm: 'r1', topic: 'keys', kind: 'num', d: 3,
      q: 'R(A, B, C). The only candidate keys are {A} and {B}. How many superkeys does R have?',
      answer: 6, hint: 'Every superset of a candidate key is a superkey. Count the subsets containing A or B.',
      explain: 'Subsets containing A: {A},{A,B},{A,C},{A,B,C} (4). Subsets containing B but not A: {B},{B,C} (2). Total 6, matching the lecture’s Employee example.' },
  ],

  written: [
    { id: 'r1-w1', realm: 'r1', topic: 'keys', marks: 6,
      q: 'Define superkey, candidate key and primary key. Using Employee(Emp_SSN, Emp_Number, Emp_Name), list the candidate keys and explain why {Emp_SSN, Emp_Name} is not one.',
      model: 'A superkey is an attribute or set of attributes that uniquely identifies a tuple within a relation. A candidate key is a superkey such that no proper subset is a superkey: it has uniqueness and irreducibility. The primary key is the candidate key selected to identify tuples uniquely. In Employee the candidate keys are {Emp_SSN} and {Emp_Number}. {Emp_SSN, Emp_Name} is a superkey, but it is reducible: its proper subset {Emp_SSN} already uniquely identifies each row, so Emp_Name is redundant.',
      points: ['Superkey defined (uniquely identifies a tuple)', 'Candidate key defined with irreducibility / no proper subset is a superkey', 'Primary key = selected candidate key', 'Candidate keys {Emp_SSN} and {Emp_Number}', '{Emp_SSN, Emp_Name} reducible because {Emp_SSN} alone is a superkey', 'Mentions uniqueness + irreducibility properties'] },
    { id: 'r1-w2', realm: 'r1', topic: 'integrity', marks: 6,
      q: 'State the two principal integrity rules of the relational model. For each, give a DreamHome example of a violating operation and explain why it is rejected.',
      model: 'Entity integrity: in a base relation no attribute of a primary key can be null. Example: inserting a Viewing tuple with propertyNo = NULL; this is rejected because the primary key is a minimal identifier and a null would imply not all key attributes are needed. Referential integrity: if a foreign key exists, its value must match a candidate key value of some tuple in its home relation or be wholly null. Example: inserting a Staff tuple with branchNo = B025 when no branch B025 exists; it is rejected because the staff member would reference a non-existent branch. A staff tuple with branchNo NULL is allowed (not yet assigned).',
      points: ['Entity integrity stated correctly', 'Entity integrity example + reason (minimality)', 'Referential integrity stated: match candidate key OR wholly null', 'Referential integrity example (e.g. B025)', 'Notes null FK is allowed', 'Clear link to DreamHome relations'] },
    { id: 'r1-w3', realm: 'r1', topic: 'components', marks: 8,
      q: 'Trace a request to retrieve an account balance through a relational database system. Name each component involved and what passes between them, and distinguish data, metadata and the index in your answer.',
      model: 'The user supplies the account number through a generic SQL interface or an application. The Query Processor (Query Manager) interprets the high-level request and selects a plan, here using the account-number index, turning it into a sequence of requests for stored data. The Storage Manager obtains the blocks: the File Manager locates the blocks on disk and the Buffer Manager brings them into main-memory pages. The index identifies the matching data. The Transaction Manager coordinates the operation with other concurrent work. The balance returns through storage and query processing to the user. Data = account numbers and balances; metadata = the description of the relation, attribute types and that accountNo is indexed (in the data dictionary); the index = the stored lookup structure.',
      points: ['Request enters through Query Processor/Manager', 'Plan/access path chosen (query optimization)', 'Storage Manager with File Manager (disk blocks) and Buffer Manager (memory pages)', 'Transaction Manager coordinates concurrent work', 'Result returned to user', 'Data defined', 'Metadata defined (data dictionary)', 'Index defined as access structure'] },
    { id: 'r1-w4', realm: 'r1', topic: 'abstraction', marks: 5,
      q: 'Explain what is meant by abstraction in databases and discuss four benefits it provides.',
      model: 'Abstraction provides a layer of separation between the physical implementation of data storage and the way users and applications interact with the data. Benefits: data independence (physical changes do not affect the logical structure or access); simplified data access (users write SQL without knowing storage or indexing details); security and access control at the logical level (role-based permissions); portability (the same logical model, e.g. SQL, across DBMSs); query optimization (the optimizer chooses plans while hiding storage details); ease of maintenance.',
      points: ['Defines abstraction as separation of physical storage from logical use', 'Benefit 1 explained', 'Benefit 2 explained', 'Benefit 3 explained', 'Benefit 4 explained'] },
  ],

  cards: [
    { id: 'r1-c1', realm: 'r1', front: 'Data vs information', back: 'Data: raw, unorganised facts. Information: data that has been processed and analysed to give meaning, insight or context.' },
    { id: 'r1-c2', realm: 'r1', front: 'Five classifications of data', back: 'Structured/unstructured; quantitative/qualitative; primary/secondary; static/dynamic; Big Data.' },
    { id: 'r1-c3', realm: 'r1', front: 'DBMS', back: 'Software that manages efficient storage, retrieval, organisation and manipulation of data; an intermediary layer between users/applications and physical storage.' },
    { id: 'r1-c4', realm: 'r1', front: 'Data independence', back: 'Changes to the physical storage structure do not affect the logical structure or the way users access data.' },
    { id: 'r1-c5', realm: 'r1', front: 'The seven DBMS functions', back: 'Data dictionary mgmt; data storage mgmt; query processing; multi-user access control; backup & recovery mgmt; security mgmt; database communication interface.' },
    { id: 'r1-c6', realm: 'r1', front: 'Three request categories', back: 'Schema modifications, queries, updates. All enter through the Query Processor (Query Manager).' },
    { id: 'r1-c7', realm: 'r1', front: 'File Manager vs Buffer Manager', back: 'File Manager: tracks file locations on disk, obtains blocks. Buffer Manager: manages main-memory pages, obtains blocks via the File Manager, controls residency and reuse.' },
    { id: 'r1-c8', realm: 'r1', front: 'Transaction Manager interactions', back: 'With the Query Manager, to know which data operations use and coordinate conflicts. With the Storage Manager, to log changes for recovery.' },
    { id: 'r1-c9', realm: 'r1', front: 'Degree vs cardinality', back: 'Degree = number of attributes (intension). Cardinality = number of tuples (extension; changes over time).' },
    { id: 'r1-c10', realm: 'r1', front: 'Domain', back: 'The set of allowable values for one or more attributes.' },
    { id: 'r1-c11', realm: 'r1', front: 'Seven properties of a relation', back: 'Distinct name; atomic cells; distinct attribute names; values from one domain per attribute; no duplicate tuples; attribute order irrelevant; tuple order irrelevant (theoretically).' },
    { id: 'r1-c12', realm: 'r1', front: 'Superkey', back: 'An attribute or set of attributes that uniquely identifies a tuple within a relation.' },
    { id: 'r1-c13', realm: 'r1', front: 'Candidate key', back: 'A superkey such that no proper subset is a superkey. Properties: uniqueness and irreducibility.' },
    { id: 'r1-c14', realm: 'r1', front: 'Primary vs alternate key', back: 'Primary: the candidate key selected to identify tuples. Alternate: candidate keys not selected.' },
    { id: 'r1-c15', realm: 'r1', front: 'Foreign key', back: 'An attribute (or set) in one relation that matches the candidate key of some (possibly the same) relation; it represents a relationship.' },
    { id: 'r1-c16', realm: 'r1', front: 'Null', back: 'A value that is currently unknown or not applicable. Not zero, not spaces: the absence of a value.' },
    { id: 'r1-c17', realm: 'r1', front: 'Entity integrity', back: 'In a base relation, no attribute of a primary key can be null.' },
    { id: 'r1-c18', realm: 'r1', front: 'Referential integrity', back: 'A foreign key value must match a candidate key value of some tuple in its home relation, or be wholly null.' },
    { id: 'r1-c19', realm: 'r1', front: 'Codd’s three objectives', back: 'High data independence; a sound basis for semantics, consistency and redundancy (normalization); set-oriented data manipulation languages.' },
    { id: 'r1-c20', realm: 'r1', front: 'Security vs multi-user access control', back: 'Security: whether a user may perform an operation. Multi-user access control: how permitted concurrent operations proceed without interfering.' },
  ],

  terms: [
    { term: 'Data', def: 'Raw facts, statistics or information in any format; lacks meaning until processed.', realm: 'r1' },
    { term: 'Data utility', def: 'The value or usefulness of data in its processed form for objectives and decisions.', realm: 'r1' },
    { term: 'Database', def: 'A structured collection of data organised for efficient retrieval, management and manipulation.', realm: 'r1' },
    { term: 'DBMS', def: 'Database Management System: software managing storage, retrieval, organisation and manipulation of data.', realm: 'r1' },
    { term: 'Abstraction', def: 'Separation between physical data storage and the way users and applications interact with data.', realm: 'r1' },
    { term: 'Data independence', def: 'Physical storage changes do not affect the logical structure or user access.', realm: 'r1' },
    { term: 'Metadata', def: 'Data about data: relation and attribute names, types, keys, constraints and index descriptions, held in the data dictionary.', realm: 'r1' },
    { term: 'Data dictionary', def: 'System catalog storing the schema and other metadata.', realm: 'r1' },
    { term: 'Query Processor', def: 'Component (Query Manager) that parses, optimizes and turns requests into access plans; handles queries, updates and schema changes.', realm: 'r1' },
    { term: 'Storage Manager', def: 'Component that obtains and modifies stored information; contains the File and Buffer Managers.', realm: 'r1' },
    { term: 'Buffer Manager', def: 'Manages main-memory pages holding disk blocks.', realm: 'r1' },
    { term: 'Transaction Manager', def: 'Groups operations into transactions, coordinates concurrency and logs changes for recovery.', realm: 'r1' },
    { term: 'Relation', def: 'A table with columns and rows.', realm: 'r1' },
    { term: 'Attribute', def: 'A named column of a relation.', realm: 'r1' },
    { term: 'Tuple', def: 'A row of a relation.', realm: 'r1' },
    { term: 'Domain', def: 'The set of allowable values for one or more attributes.', realm: 'r1' },
    { term: 'Degree', def: 'The number of attributes in a relation.', realm: 'r1' },
    { term: 'Cardinality (relation)', def: 'The number of tuples in a relation.', realm: 'r1' },
    { term: 'Superkey', def: 'Attribute(s) that uniquely identify a tuple.', realm: 'r1' },
    { term: 'Candidate key', def: 'A minimal superkey: unique and irreducible.', realm: 'r1' },
    { term: 'Primary key', def: 'The candidate key selected to identify tuples.', realm: 'r1' },
    { term: 'Alternate key', def: 'A candidate key not chosen as the primary key.', realm: 'r1' },
    { term: 'Composite key', def: 'A key consisting of more than one attribute.', realm: 'r1' },
    { term: 'Foreign key', def: 'Attribute(s) matching the candidate key of a (possibly the same) relation.', realm: 'r1' },
    { term: 'Null', def: 'Unknown or not-applicable value; the absence of a value.', realm: 'r1' },
    { term: 'Entity integrity', def: 'No attribute of a primary key may be null.', realm: 'r1' },
    { term: 'Referential integrity', def: 'A foreign key matches a candidate key value in its home relation or is wholly null.', realm: 'r1' },
  ],

  sql: [
    { id: 'r1-s1', realm: 'r1', topic: 'relational', title: 'Read a relation', dataset: 'dreamhome', d: 1,
      prompt: 'List every attribute of every tuple in the **Branch** relation.', solution: 'SELECT * FROM Branch;' },
    { id: 'r1-s2', realm: 'r1', topic: 'relational', title: 'Measure the cardinality', dataset: 'dreamhome', d: 1,
      prompt: 'Return the **cardinality** of the Staff relation as a single number.', solution: 'SELECT COUNT(*) FROM Staff;', hint: 'COUNT(*) counts tuples.' },
    { id: 'r1-s3', realm: 'r1', topic: 'keys', title: 'Follow a foreign key', dataset: 'dreamhome', d: 2,
      prompt: 'Staff.branchNo references Branch.branchNo. List each staff member’s **staffNo** and the **city** of the branch they work at.',
      solution: 'SELECT s.staffNo, b.city FROM Staff s JOIN Branch b ON s.branchNo = b.branchNo;', hint: 'Join on the foreign key = primary key.' },
    { id: 'r1-s4', realm: 'r1', topic: 'keys', title: 'Disprove a key', dataset: 'dreamhome', d: 2,
      prompt: 'Show that **city** cannot be a candidate key of Branch: list each city that appears more than once, with its count (columns city, n).',
      solution: 'SELECT city, COUNT(*) AS n FROM Branch GROUP BY city HAVING COUNT(*) > 1;', hint: 'GROUP BY city HAVING COUNT(*) > 1.' },
  ],

  codex: `
## Data
- **Data** = raw facts; **information** = processed data with meaning.
- Classifications: structured/unstructured · quantitative/qualitative · primary/secondary · static/dynamic · Big Data.
- Utility aspects: accessibility, relevance, accuracy, timeliness, completeness, consistency, context, security & privacy, interoperability, scalability, visualization, governance.

## DBMS
- Abstraction separates physical storage from logical use, which gives **data independence**.
- 7 functions: dictionary · storage · query processing · multi-user access control · backup & recovery · security · communication interface.
- Architecture: Schema mods / Queries / Updates → **Query Processor** ↔ **Transaction Manager** ↔ **Storage Manager** (File Mgr + Buffer Mgr) → Storage (data + metadata).
- Security = *may* you? Concurrency control = *how* do permitted ops coexist?

## Relational model (Codd 1970)
| Formal | Table | File |
|---|---|---|
| Relation | Table | File |
| Tuple | Row | Record |
| Attribute | Column | Field |
- Degree = # attributes (intension). Cardinality = # tuples (extension).
- Properties: distinct name, atomic cells, distinct attribute names, one domain per attribute, no duplicate tuples, no ordering.

## Keys
superkey ⊇ candidate key (unique + irreducible) → primary key (chosen) / alternate keys (the rest). Composite = >1 attribute. FK matches a candidate key of the home relation.

## Integrity
- **Entity**: no PK attribute is null.
- **Referential**: FK matches a candidate key value in its home relation **or is wholly null**.
- Null ≠ 0 ≠ spaces.
`,
}

export default r1
