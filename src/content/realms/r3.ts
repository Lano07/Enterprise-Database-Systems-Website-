import type { RealmContent } from '../types'

// Source: 03_Database_Design_and_ER_Modelling (Database Design (revised); ER Modeling handout;
// Entity Relationship Diagrams (updated); ERD questions + task/worksheet/practice solutions).

const r3: RealmContent = {
  topics: {
    'er-concepts': 'Entities & relationships', degree: 'Relationship degree & recursion', attributes: 'Attribute types',
    'er-keys': 'Keys in ER models', multiplicity: 'Multiplicity, cardinality & participation', 'mn-resolve': 'Resolving many-to-many', 'uml-notation': 'UML notation & reading ERDs',
  },
  lessons: [
    {
      id: 'r3-entities', realm: 'r3', title: 'ER modelling: entities, relationships and occurrences', mins: 10,
      src: ['01_COMP2605_Database_Design_Revised.pdf', '02_ER_Modeling.pdf'],
      body: `
:::story Mission 3.1: Blueprint for DreamHome
DreamHome needs a conceptual model before anyone writes CREATE TABLE. You will decide what base relations should exist and what attributes they hold, starting with the entities.
:::

## Why model first?
Database design from a conceptual view asks: *How do we decide on a suitable structure for the data? Which base relations should exist? What attributes should they have?* An **Entity Relationship Diagram (ERD)** is a graphical representation of an organisation’s data storage requirements. ERDs identify the data that must be captured, stored and retrieved; the data needed to report on performance measures; and the relationships between entities.

**ER modelling is top-down**: first identify the important data (**entities**) and the **relationships** between them; then add detail (the **attributes** of entities and relationships, and **constraints**). The course uses **UML** notation.

The four essential elements: **entities, attributes of entities, relationships, attributes of relationships**.

## Entity type
:::def
An **entity type** is a group of objects with the same properties, identified by the enterprise as having an **independent existence**. It may have a physical (“real”) existence, e.g. Staff or PropertyForRent, or a conceptual (“abstract”) existence, e.g. a Viewing or an Inspection.
:::
Each uniquely identifiable object of an entity type is an **entity occurrence** (instance). In UML an entity type is a rectangle labelled with a **singular noun**, each word capitalised: Staff, PropertyForRent.

## Relationship type and occurrence
A **relationship type** is a set of meaningful associations among entity types, named for its function (POwns associates PrivateOwner and PropertyForRent). A **relationship occurrence** is a uniquely identifiable association that includes **one occurrence from each participating entity type**, e.g. r1 associates branch **B003** with staff **SG37** in *Branch Has Staff*.

A **semantic net** is an object-level model showing individual occurrences (• for entities, ◆ for relationships). It is too detailed for a whole enterprise, so the ER model raises the abstraction by grouping occurrences into types.

In UML, a relationship is a **line** labelled with a **verb** or verb phrase (Has, Manages, LeasedBy), named in one direction with a small **arrow/triangle** showing how to read it: *Branch Has Staff* makes more sense than *Staff Has Branch*.

{{q:r3-entity-type}}
{{q:r3-occurrence}}
`,
    },
    {
      id: 'r3-degree', realm: 'r3', title: 'Degree of a relationship, recursion and role names', mins: 8,
      src: ['01_COMP2605_Database_Design_Revised.pdf'],
      body: `
## Degree
The **degree** of a relationship type is the number of participating entity types.

| Degree | Name | DreamHome example |
|---|---|---|
| 2 | **Binary** (the most common) | Branch *Has* Staff; PrivateOwner *POwns* PropertyForRent |
| 3 | **Ternary** | *Registers*: Staff registers a Client at a Branch |
| 4 | **Quaternary** | *Arranges*: a Solicitor arranges a Bid on behalf of a Buyer supported by a FinancialInstitution |

Relationships of degree higher than two are called **complex relationships**. UML draws them with a **diamond** holding the relationship name (and no direction arrow).

{{q:r3-degree}}

## Recursive relationships
A **recursive** relationship is one in which the **same entity type participates more than once in different roles**. *Staff (Supervisor) Supervises Staff (Supervisee).* Recursive relationships are sometimes called **unary** relationships.

## Role names
**Role names** state the purpose each participant plays. They are important for recursive relationships (Supervisor / Supervisee) and when two entities are linked by more than one relationship: Staff and Branch are linked by **Manages** (Manager manages Branch Office) and **Has** (Branch Office has Member of Staff). They are usually unnecessary when the roles are unambiguous.

{{q:r3-recursive}}
`,
    },
    {
      id: 'r3-attributes', realm: 'r3', title: 'Attributes: simple, composite, multi-valued and derived', mins: 9,
      src: ['01_COMP2605_Database_Design_Revised.pdf'],
      body: `
## Attribute and attribute domain
An **attribute** is a property of an entity **or a relationship** type. Its **domain** is the set of allowable values, e.g. rooms is an integer between 1 and 15. Attributes may share a domain (the addresses of Branch, PrivateOwner and BusinessOwner), and domains can be composed of sub-domains (address = street + city + postcode).

## Four classifications
| Attribute | Definition | Example |
|---|---|---|
| **Simple** (atomic) | A single component with an independent existence; cannot be subdivided | position, salary of Staff |
| **Composite** | Multiple components, each with independent existence | address (163 Main St, Glasgow, G11 9QX) = street + city + postcode |
| **Single-valued** | One value per entity occurrence (the majority) | branchNo of Branch |
| **Multi-valued** | Several values per occurrence, possibly with limits | telNo of Branch: B003 has 0141-339-2178 and 0141-339-4439; **[1..3]** |
| **Derived** | Derivable from related attribute(s), not necessarily in the same entity | duration from rentStart and rentFinish; totalStaff by counting Staff; deposit = twice the property’s monthly rent |

Whether address is simple or composite depends on whether **users refer to it as one unit or by its components**.

{{q:r3-attr-types}}

## UML attribute notation
- The entity box is split: name on top, attributes below. The **primary key is listed first**, tagged **{PK}**; also **{PPK}** (partial primary key), **{AK}** (alternate key), **{FK}**.
- Attribute names start lowercase, with each later word capitalised: address, telNo.
- **Composite**: list the composite name, then its components indented beneath.
- **Multi-valued**: give the range, e.g. **telNo [1..3]** or **[1..*]**.
- **Derived**: prefix with “/”, e.g. **/totalStaff**.

\`\`\`text
┌──────────────────┐     ┌──────────────────┐
│ Staff            │     │ Branch           │
├──────────────────┤     ├──────────────────┤
│ staffNo {PK}     │     │ branchNo {PK}    │
│ name             │     │ address          │
│ position         │     │    street        │
│ salary           │     │    city          │
│ /totalStaff      │     │    postcode      │
└──────────────────┘     │ telNo [1..3]     │
                         └──────────────────┘
\`\`\`

{{q:r3-uml-attr}}

## Attributes on relationships
Relationships can have attributes: *Newspaper Advertises PropertyForRent* records **dateAdvert** and **cost**; *Manages* records **mgrStartDate** and **bonus**. UML shows them in a box linked to the relationship by a **dashed line** (an association or **bridge class**).

:::key
One or more attributes on a relationship may indicate that the relationship **conceals an unidentified entity type**. dateAdvert and cost on Advertises point to an entity called **Advert**.
:::

{{q:r3-rel-attr}}
`,
    },
    {
      id: 'r3-keys', realm: 'r3', title: 'Keys in the ER model', mins: 6,
      src: ['01_COMP2605_Database_Design_Revised.pdf'],
      body: `
## Candidate, primary, alternate and composite keys
- **Candidate key**: the minimal set of attributes that uniquely identifies each occurrence of an entity type. It must be unique for every occurrence, so it **cannot contain a null**.
- **Primary key**: the candidate key selected to identify each occurrence.
- **Alternate key**: an unselected candidate key.
- **Composite key**: a candidate key of two or more attributes.

## Choosing the primary key
Choose based on **attribute length**, the **minimal number of attributes**, and the **future certainty of uniqueness**. Staff has a company staffNo (max 5 characters, e.g. SG14) and a government National Insurance Number, NIN (max 9 characters, e.g. WL220658D). Select **staffNo** as the PK; NIN becomes the **alternate key**.

## A composite key example: Advert
Many properties are advertised in many newspapers on a given date, so an **Advert** occurrence needs **propertyNo + newspaperName + dateAdvert** together as its composite primary key.

{{q:r3-pk-choice}}
{{q:r3-advert-key}}
`,
    },
    {
      id: 'r3-multiplicity', realm: 'r3', title: 'Multiplicity: cardinality and participation', mins: 12,
      src: ['01_COMP2605_Database_Design_Revised.pdf', '03_COMP2605_Entity_Relationship_Diagrams_Updated.pdf'],
      body: `
## Structural constraints
Constraints on relationships should reflect real-world restrictions (*a property for rent must have an owner*, *each branch must have staff*). The main type is **multiplicity**: the number (or range) of possible occurrences of an entity type that may relate to a **single** occurrence of an associated entity type through a particular relationship. Multiplicity represents the enterprise’s **business rules**.

:::warn Read the number at the far end
The multiplicity written **beside an entity** states how many instances of **that** entity relate to **one** instance at the **other** end of the line.
:::

## The three binary relationship types
| Type | DreamHome example | Multiplicities |
|---|---|---|
| **1:1** | Staff *Manages* Branch | **1..1** beside Staff (each branch is managed by one member of staff), **0..1** beside Branch (a member of staff manages zero or one branch) |
| **1:*** | Staff *Oversees* PropertyForRent | **0..1** beside Staff (each property is overseen by zero or one staff), **0..*** beside PropertyForRent (a member of staff oversees zero or more properties; 0..100 if the maximum is known) |
| **\*:\*** | Newspaper *Advertises* PropertyForRent | **0..*** beside Newspaper (a property is advertised in zero or more newspapers), **1..*** beside PropertyForRent (each newspaper advertises one or more properties) |

The semantic-net evidence for Oversees: SG37 oversees PG21 and PG36; SA9 oversees PA14; SG5 oversees none; PG4 is overseen by nobody. Sample data must be a **true representation** of all the data to reach the right conclusion.

{{w:mult-reader}}

## Cardinality vs participation
Multiplicity is made of two separate constraints:

| | Cardinality | Participation |
|---|---|---|
| Describes | The **maximum** number of possible relationship occurrences for an entity | Whether **all** (mandatory) or only **some** (optional) occurrences participate |
| Shown by | The **maximum** values of the multiplicity ranges (1:1, 1:*, \*:\*) | The **minimum** values: **0 = optional**, **1 = mandatory** |

For Manages: cardinality is **1:1**. Branch participation is **mandatory** (all branches are managed), shown by the minimum 1 in **1..1 beside Staff**. Staff participation is **optional** (not all staff manage), shown by the minimum 0 in **0..1 beside Branch**.

:::exam
“The participation for a given entity in a relationship is represented by the minimum value on the **opposite** side of the relationship.” This is the most common source of lost marks.
:::

{{q:r3-participation}}
{{q:r3-read-diagram}}

## Writing the sentences
The Academic Database task gives cardinalities as paired sentences, which is exactly the business-rule pattern from Realm 2:
- Each ACADEMIC SESSION **must** schedule **one or more** COURSE / Each COURSE **must** be scheduled in **one and only one** ACADEMIC SESSION.
- Each STUDENT **may** enroll in **one or more** COURSE / Each COURSE **must** have enrolled **one or more** STUDENT.
- Each COURSE must be offered by one and only one DEPARTMENT / Each DEPARTMENT may offer one or more COURSES.
- Each STUDENT may have one and only one PARENT INFORMATION / Each PARENT INFORMATION must be for one and only one STUDENT.

“must” gives minimum 1; “may” gives minimum 0; “one and only one” gives maximum 1; “one or more” gives maximum *.

{{q:r3-task1}}

:::tip Not every rule fits a line
“A member of staff receives an extra day’s holiday for every year of employment” is hard to show in an ER model. Occupancy limits and date clashes are also aggregate rules that need extra validation (a CHECK, trigger or application rule).
:::
`,
    },
    {
      id: 'r3-mn', realm: 'r3', title: 'Resolving many-to-many relationships with bridge entities', mins: 12,
      src: ['03_COMP2605_Entity_Relationship_Diagrams_Updated.pdf', '06_COMP2605_ERD_Task_1_2_Solutions.pdf', '09_COMP2605_ERD_Practice_Scenarios_Sol.pdf'],
      body: `
:::story Mission 3.2: The Many-to-Many Minotaur
An employee may be assigned to many projects; a project has many employees. Try to store that with a single foreign key and the Minotaur multiplies your rows.
:::

## Why a foreign key fails
**Case 1: EmpNum in the Project table.** To record five assignments, project rows must repeat (P1 Payroll Chaguanas ×3, P2 Website ×2). ProjectNum is no longer unique, so the PK is violated. Even with PK (ProjectNum, EmpNum), every project fact repeats per employee: with 40 descriptive attributes and 200 employees that is **40 × 200 = 8,000** values instead of 40, and changing the location could need 200 updates.

**Case 2: ProjectNum in the Employee table.** The same thing happens in reverse: 30 employee attributes × 20 projects = **600** values instead of 30.

Using foreign keys on either side would create **multi-valued cells** or repeated rows.

## The bridge (intersection / associative) entity
Keep one row per employee and one per project, and record the links in a separate **Assignment** relation:
\`\`\`text
Employee   (EmpNum, EmpName, DOB, DeptNum*)
Project    (ProjectNum, ProjectName, Location)
Assignment (EmpNum*, ProjectNum*, DateStarted, NumHours)   -- PK = (EmpNum, ProjectNum)
\`\`\`
- Composite PK **(EmpNum, ProjectNum)**: each pair occurs once, and either identifier may repeat.
- Both components are also **foreign keys**: {PK, FK}.
- **DateStarted** and **NumHours** describe the *assignment*: they are attributes of the relationship.
- The M:N becomes **two 1:\* relationships**: Employee 1..1 to 1..\* Assignment, and Project 1..1 to 0..\* Assignment. *Repeat identifiers, not entity facts.*

{{w:mn-demo}}

{{q:r3-mn-why}}
{{q:r3-bridge-key}}

## Library example
Member *borrows* Book (0..* both ways) is resolved with **Loan(MemberId, BookId, DateBorrowed, DateDue, DateReturned)**. A composite key (MemberId, BookId) assumes a member can’t borrow the same book twice, so a surrogate **LoanId** is a better PK when repeat loans are allowed. Books with several authors: **BookAuthor(BookId, AuthorId)**. A book has one publisher: put **PublisherId** in Book as an FK (1:\*, no bridge needed).

{{q:r3-loan}}

## One-to-one
Extra employee data can go in the same table, or in a separate table **with the same primary key**: EmployeeSalary(EmpNum {PK, FK}, JobTitle, Salary).

## Worked practice (Library Book Management scenario)
BOOK (a title) is separate from COPY (a physical copy); BORROWING (a checkout transaction) is separate from BORROWING_ITEM (the copies in it).
| Relationship | Left → right | Right → left |
|---|---|---|
| BOOK — COPY | one book has 2..* copies (“multiple” read literally; 1..* is fine if stated) | one copy belongs to 1..1 book |
| MEMBER — BORROWING | a member makes 0..* borrowings | a borrowing belongs to 1..1 member |
| BORROWING — BORROWING_ITEM | a borrowing contains 1..* items | an item belongs to 1..1 borrowing |
| COPY — BORROWING_ITEM | a copy appears in 0..* items over time | an item refers to 1..1 copy |

:::exam Marks come from assumptions
The solution scheme gives explicit marks for **stated assumptions** (e.g. “a member may be registered before borrowing, so 0..*”). Lifetime participation (a copy borrowed many times over the years) is not the same as simultaneous use (one active checkout), which is a separate current-state rule.
:::

## Try the ERD Forge
Set multiplicities from business rules and resolve M:N relationships in the [ERD Forge](#/tools/erd).
`,
    },
  ],

  questions: [
    { id: 'r3-entity-type', realm: 'r3', topic: 'er-concepts', kind: 'mcq', d: 1,
      q: 'An **entity type** is…',
      options: ['A single row in a table', 'A group of objects with the same properties that the enterprise identifies as having an independent existence', 'A verb connecting two tables', 'Any attribute that is a primary key'], answer: 1,
      explain: 'A single uniquely identifiable object of that type is an entity occurrence.' },
    { id: 'r3-occurrence', realm: 'r3', topic: 'er-concepts', kind: 'mcq', d: 2,
      q: 'In the semantic net for Branch *Has* Staff, r1 links B003 and SG37. r1 is a…',
      options: ['Relationship type', 'Relationship occurrence', 'Entity type', 'Composite attribute'], answer: 1,
      explain: 'A relationship occurrence is a uniquely identifiable association including one occurrence from each participating entity type.' },
    { id: 'r3-degree', realm: 'r3', topic: 'degree', kind: 'match', d: 1,
      q: 'Match each relationship to its degree.',
      pairs: [['Branch Has Staff', 'Binary (2)'], ['Staff registers a Client at a Branch', 'Ternary (3)'], ['Solicitor arranges a Bid for a Buyer with a FinancialInstitution', 'Quaternary (4)'], ['Staff Supervises Staff', 'Recursive (unary)']],
      explain: 'Degree is the number of participating entity types; a recursive relationship has one entity type in two roles.' },
    { id: 'r3-recursive', realm: 'r3', topic: 'degree', kind: 'mcq', d: 2,
      q: 'Why are **role names** especially important in the Staff *Supervises* Staff relationship?',
      options: ['Because UML forbids recursive relationships', 'Because the same entity type participates twice, so Supervisor and Supervisee distinguish the two roles', 'Because Supervises is ternary', 'Because role names replace multiplicities'], answer: 1,
      explain: 'Role names show the function of each participant, which matters most when one entity type appears in two roles.' },
    { id: 'r3-attr-types', realm: 'r3', topic: 'attributes', kind: 'match', d: 2,
      q: 'Classify each attribute.',
      pairs: [['address = street + city + postcode', 'Composite'], ['Branch telNo, one to three numbers', 'Multi-valued'], ['Lease duration from rentStart and rentFinish', 'Derived'], ['Staff salary', 'Simple']],
      explain: 'Composite attributes have components; multi-valued hold several values; derived values are calculated; simple attributes cannot be subdivided.' },
    { id: 'r3-uml-attr', realm: 'r3', topic: 'uml-notation', kind: 'match', d: 2,
      q: 'Match each UML attribute notation to its meaning.',
      pairs: [['/totalStaff', 'Derived attribute'], ['telNo [1..3]', 'Multi-valued with 1 to 3 values'], ['staffNo {PK}', 'Primary key'], ['propertyNo {PPK}', 'Part of a composite primary key']],
      explain: 'Derived attributes are prefixed with “/”, multi-valued ones carry a range, and {PK}/{PPK}/{AK}/{FK} tag keys.' },
    { id: 'r3-rel-attr', realm: 'r3', topic: 'attributes', kind: 'mcq', d: 2,
      q: 'The Advertises relationship carries attributes dateAdvert and cost. What does this suggest?',
      options: ['The model is wrong and must drop the attributes', 'The relationship may conceal an unidentified entity type (Advert)', 'dateAdvert should be the PK of Newspaper', 'The relationship is recursive'], answer: 1,
      explain: 'Attributes on a relationship often signal a hidden entity (here Advert), which becomes the bridge entity when the M:N is resolved.' },
    { id: 'r3-pk-choice', realm: 'r3', topic: 'er-keys', kind: 'multi', d: 2,
      q: 'Which considerations does the lecture list for choosing a primary key from several candidate keys? Select all.',
      options: ['Attribute length', 'Minimal number of attributes', 'Future certainty of uniqueness', 'Alphabetical order of the attribute name', 'Whether the attribute is derived'], answer: [0, 1, 2],
      explain: 'That is why staffNo (5 characters) is preferred over NIN (9 characters).' },
    { id: 'r3-advert-key', realm: 'r3', topic: 'er-keys', kind: 'mcq', d: 2,
      q: 'What is the primary key of the Advert entity (propertyNo, newspaperName, dateAdvert, cost)?',
      options: ['propertyNo', '(propertyNo, newspaperName)', '(propertyNo, newspaperName, dateAdvert)', 'cost'], answer: 2,
      explain: 'Many properties are advertised in many newspapers on given dates, so all three are needed for uniqueness.' },
    { id: 'r3-participation', realm: 'r3', topic: 'multiplicity', kind: 'mcq', d: 3,
      q: 'Staff (1..1) —Manages— (0..1) Branch. Where is Branch’s **mandatory participation** shown?',
      options: ['The 0..1 beside Branch', 'The minimum 1 in the 1..1 beside Staff', 'The maximum 1 in the 0..1 beside Branch', 'It is not shown'], answer: 1,
      explain: 'Participation is the minimum value on the opposite side: 1..1 beside Staff means every branch is managed by exactly one member of staff.' },
    { id: 'r3-read-diagram', realm: 'r3', topic: 'multiplicity', kind: 'mcq', d: 2,
      q: 'EMPLOYEE (1..*) —assigned to / responsible for— (1..1) DEPARTMENT. Which reading is correct?',
      options: ['Each EMPLOYEE may be assigned to one or more DEPARTMENTS.', 'Each EMPLOYEE must be assigned to exactly one DEPARTMENT; each DEPARTMENT must be responsible for one or more EMPLOYEES.', 'Each DEPARTMENT may be responsible for exactly one EMPLOYEE.', 'Each EMPLOYEE may be assigned to zero departments.'], answer: 1,
      explain: '1..1 beside DEPARTMENT: an employee has exactly one department. 1..* beside EMPLOYEE: a department has at least one employee. (Lecture Task 1.)' },
    { id: 'r3-task1', realm: 'r3', topic: 'multiplicity', kind: 'match', d: 2,
      q: 'Academic DB: “Each COURSE must be offered by one and only one DEPARTMENT. Each DEPARTMENT may offer one or more COURSES.” Give each multiplicity.',
      pairs: [['Beside DEPARTMENT', '1..1'], ['Beside COURSE', '0..*']],
      explain: '“must … one and only one” gives 1..1 at DEPARTMENT; “may … one or more” gives optional many, 0..*, at COURSE.' },
    { id: 'r3-mn-why', realm: 'r3', topic: 'mn-resolve', kind: 'mcq', d: 2,
      q: 'Why can’t a many-to-many relationship between Employee and Project be implemented by putting EmpNum in Project?',
      options: ['Foreign keys cannot reference employees', 'Project rows (and their facts) would repeat for every assigned employee, violating the PK or creating redundancy', 'SQL does not allow two tables to share a column', 'It would make Project a weak entity'], answer: 1,
      explain: 'Either side’s foreign key forces repeated rows or multi-valued cells; a bridge relation stores each fact once.' },
    { id: 'r3-bridge-key', realm: 'r3', topic: 'mn-resolve', kind: 'mcq', d: 2,
      q: 'Assignment(EmpNum, ProjectNum, DateStarted, NumHours) resolves Employee–Project. What is its primary key, and what are EmpNum and ProjectNum?',
      options: ['DateStarted; ordinary attributes', '(EmpNum, ProjectNum); each is also a foreign key', 'EmpNum; ProjectNum is an alternate key', 'NumHours; both are derived'], answer: 1,
      explain: 'The composite key ensures each employee–project pair occurs once, and both components reference their parent tables.' },
    { id: 'r3-loan', realm: 'r3', topic: 'mn-resolve', kind: 'mcq', d: 3,
      q: 'Loan(MemberId, BookId, DateBorrowed, DateDue, DateReturned) with PK (MemberId, BookId). What assumption does this key make, and what is the alternative?',
      options: ['That books have one author; use BookAuthor', 'That a member cannot borrow the same book more than once; use a surrogate LoanId', 'That loans are never returned; drop DateReturned', 'That members have one address; split the address'], answer: 1,
      explain: 'The lecture notes this assumption and that a new attribute LoanId could have been the primary key.' },
    { id: 'r3-oversees', realm: 'r3', topic: 'multiplicity', kind: 'match', d: 2,
      q: 'Staff *Oversees* PropertyForRent: a member of staff oversees zero or more properties; a property is overseen by zero or one member of staff. Place the multiplicities.',
      pairs: [['Beside Staff', '0..1'], ['Beside PropertyForRent', '0..*']],
      explain: 'Each number describes how many of THAT entity relate to one at the other end.' },
    { id: 'r3-card-vs-part', realm: 'r3', topic: 'multiplicity', kind: 'tf', d: 1,
      q: 'Cardinality is shown by the minimum values of the multiplicity ranges, and participation by the maximum values.',
      answer: false, explain: 'Reversed: cardinality = maximum values; participation = minimum values (0 optional, 1 mandatory).' },
    { id: 'r3-complex-uml', realm: 'r3', topic: 'uml-notation', kind: 'mcq', d: 1,
      q: 'How does UML draw a relationship of degree higher than two?',
      options: ['As a dashed line', 'As a diamond containing the relationship name', 'As a double rectangle', 'It cannot be drawn'], answer: 1,
      explain: 'Complex relationships use a diamond; the directional arrow is omitted.' },
    { id: 'r3-multiple', realm: 'r3', topic: 'mn-resolve', kind: 'mcq', d: 3,
      q: 'In the Library practice solution, why is COPY — BORROWING_ITEM 0..* beside BORROWING_ITEM rather than 0..1?',
      options: ['Because a copy can be in two transactions at the same time', 'Because over its lifetime a copy can be borrowed many times; the one-active-checkout rule is a separate current-state rule', 'Because BORROWING_ITEM has no key', 'Because COPY is a weak entity'], answer: 1,
      explain: 'Lifetime participation is not simultaneous use. A maximum of one item would wrongly forbid later borrowing.' },
    { id: 'r3-composite-room', realm: 'r3', topic: 'er-keys', kind: 'mcq', d: 2,
      q: 'Room numbers are unique within a hall but repeat across halls. What is the best primary key for ROOM?',
      options: ['RoomNumber', 'BuildingID', '(BuildingID, RoomNumber)', 'Capacity'], answer: 2,
      explain: 'Worksheet 3, Q1: neither alone identifies a room; the pair does.' },
    { id: 'r3-erd-purpose', realm: 'r3', topic: 'er-concepts', kind: 'tf', d: 1,
      q: 'ER modelling is a bottom-up approach that starts from individual attribute values.',
      answer: false, explain: 'It is top-down: entities and relationships first, then attributes and constraints.' },
  ],

  written: [
    { id: 'r3-w1', realm: 'r3', topic: 'multiplicity', marks: 8,
      q: 'Using Staff *Manages* Branch (1:1), Staff *Oversees* PropertyForRent (1:*) and Newspaper *Advertises* PropertyForRent (*:*), explain multiplicity, cardinality and participation, and state the multiplicities on each relationship.',
      model: 'Multiplicity is the number (or range) of occurrences of an entity type that may relate to a single occurrence of an associated entity type through a relationship; it represents business rules and consists of cardinality and participation. Cardinality is the maximum number of possible relationship occurrences (shown by the maximum values: 1:1, 1:*, *:*). Participation is whether all (mandatory, minimum 1) or only some (optional, minimum 0) occurrences participate, read from the minimum on the opposite side. Manages: 1..1 beside Staff (each branch is managed by exactly one member of staff, so Branch participation is mandatory), 0..1 beside Branch (a member of staff manages zero or one branch, so Staff participation is optional). Oversees: 0..1 beside Staff, 0..* beside PropertyForRent. Advertises: 0..* beside Newspaper, 1..* beside PropertyForRent.',
      points: ['Multiplicity defined', 'Cardinality = maximum values', 'Participation = minimum values, opposite side', 'Manages multiplicities correct', 'Manages participation explained (branch mandatory, staff optional)', 'Oversees multiplicities correct', 'Advertises multiplicities correct', 'Links multiplicity to business rules'] },
    { id: 'r3-w2', realm: 'r3', topic: 'mn-resolve', marks: 7,
      q: 'An employee may be assigned to many projects and a project can have many employees. Explain why foreign keys alone cannot represent this, and show how a bridge entity resolves it (relational schema, keys and multiplicities).',
      model: 'Putting EmpNum in Project forces one Project row per assigned employee, so ProjectNum is no longer unique and every project fact repeats (e.g. 40 attributes × 200 employees = 8,000 values), causing update problems; putting ProjectNum in Employee repeats employee facts in the same way. Introduce Assignment(EmpNum, ProjectNum, DateStarted, NumHours) with composite PK (EmpNum, ProjectNum); EmpNum references Employee and ProjectNum references Project. DateStarted and NumHours are attributes of the relationship. The M:N becomes two 1:* relationships: Employee 1..1 to 1..* Assignment and Project 1..1 to 0..* Assignment. Identifiers repeat, entity facts do not.',
      points: ['FK in Project repeats project facts / violates PK', 'FK in Employee repeats employee facts', 'Bridge entity named with attributes', 'Composite PK stated', 'Both components are FKs', 'Relationship attributes placed in bridge', 'Two 1:* relationships with multiplicities'] },
    { id: 'r3-w3', realm: 'r3', topic: 'attributes', marks: 6,
      q: 'Define simple, composite, multi-valued and derived attributes, give a DreamHome example of each, and show how each is written in UML.',
      model: 'Simple: one component with independent existence, cannot be subdivided (Staff position, salary), listed by name. Composite: several components each with independent existence (Branch address = street, city, postcode), written as address with its components indented below. Multi-valued: several values per occurrence (Branch telNo, 1 to 3 numbers), written telNo [1..3]. Derived: derivable from other attributes (Lease duration from rentStart and rentFinish; totalStaff), written with a / prefix, e.g. /totalStaff.',
      points: ['Simple defined + example', 'Composite defined + example', 'Multi-valued defined + example', 'Derived defined + example', 'UML notation for composite + multi-valued', 'UML notation for derived (/)'] },
  ],

  cards: [
    { id: 'r3-c1', realm: 'r3', front: 'ERD', back: 'A graphical representation of an organisation’s data storage requirements: entities, attributes, relationships and constraints.' },
    { id: 'r3-c2', realm: 'r3', front: 'Four essential elements of ER modelling', back: 'Entities, attributes of entities, relationships, attributes of relationships.' },
    { id: 'r3-c3', realm: 'r3', front: 'Entity type vs occurrence', back: 'Type: a group of objects with the same properties and independent existence. Occurrence: one uniquely identifiable object of that type.' },
    { id: 'r3-c4', realm: 'r3', front: 'Relationship occurrence', back: 'A uniquely identifiable association including one occurrence from each participating entity type.' },
    { id: 'r3-c5', realm: 'r3', front: 'Degree of a relationship', back: 'Number of participating entity types: binary (2), ternary (3), quaternary (4); >2 = complex (UML diamond).' },
    { id: 'r3-c6', realm: 'r3', front: 'Recursive relationship', back: 'The same entity type participates more than once in different roles (Staff Supervises Staff). Also called unary.' },
    { id: 'r3-c7', realm: 'r3', front: 'Composite vs simple attribute', back: 'Composite: several components with independent existence (address). Simple: a single atomic component.' },
    { id: 'r3-c8', realm: 'r3', front: 'Multi-valued attribute + UML', back: 'Holds several values per occurrence; UML shows a range, e.g. telNo [1..3].' },
    { id: 'r3-c9', realm: 'r3', front: 'Derived attribute + UML', back: 'Value derivable from other attributes; UML prefixes “/”, e.g. /totalStaff.' },
    { id: 'r3-c10', realm: 'r3', front: 'Attributes on a relationship signal…', back: 'A possibly hidden entity type (dateAdvert + cost on Advertises → Advert).' },
    { id: 'r3-c11', realm: 'r3', front: 'Choosing a primary key', back: 'Attribute length, minimal number of attributes, future certainty of uniqueness.' },
    { id: 'r3-c12', realm: 'r3', front: 'Multiplicity', back: 'Number/range of occurrences of an entity type that may relate to a single occurrence of an associated entity type through a relationship.' },
    { id: 'r3-c13', realm: 'r3', front: 'Cardinality vs participation', back: 'Cardinality = maximum values (1:1, 1:*, *:*). Participation = minimum values (0 optional, 1 mandatory), read on the opposite side.' },
    { id: 'r3-c14', realm: 'r3', front: 'Manages multiplicities', back: 'Staff 1..1 —Manages— 0..1 Branch.' },
    { id: 'r3-c15', realm: 'r3', front: 'Oversees multiplicities', back: 'Staff 0..1 —Oversees— 0..* PropertyForRent.' },
    { id: 'r3-c16', realm: 'r3', front: 'Advertises multiplicities', back: 'Newspaper 0..* —Advertises— 1..* PropertyForRent.' },
    { id: 'r3-c17', realm: 'r3', front: 'Bridge (intersection) entity', back: 'Resolves M:N into two 1:* relationships; composite PK of both parent keys (each also an FK); holds relationship attributes.' },
    { id: 'r3-c18', realm: 'r3', front: '“must … one and only one” / “may … one or more”', back: '1..1 / 0..*' },
  ],

  terms: [
    { term: 'Entity type', def: 'Group of objects with the same properties and an independent existence.', realm: 'r3' },
    { term: 'Entity occurrence', def: 'A uniquely identifiable object of an entity type.', realm: 'r3' },
    { term: 'Relationship type', def: 'A set of meaningful associations among entity types.', realm: 'r3' },
    { term: 'Semantic net', def: 'Object-level model showing individual entity and relationship occurrences.', realm: 'r3' },
    { term: 'Degree (relationship)', def: 'The number of participating entity types.', realm: 'r3' },
    { term: 'Complex relationship', def: 'A relationship of degree higher than two (UML diamond).', realm: 'r3' },
    { term: 'Recursive relationship', def: 'One entity type participating more than once in different roles.', realm: 'r3' },
    { term: 'Role name', def: 'Name describing the function a participant plays in a relationship.', realm: 'r3' },
    { term: 'Composite attribute', def: 'Attribute with multiple components each with independent existence.', realm: 'r3' },
    { term: 'Multi-valued attribute', def: 'Attribute holding multiple values per entity occurrence.', realm: 'r3' },
    { term: 'Derived attribute', def: 'Attribute whose value is derivable from other attributes.', realm: 'r3' },
    { term: 'Multiplicity', def: 'Range of occurrences of an entity that may relate to one occurrence of another through a relationship.', realm: 'r3' },
    { term: 'Cardinality (relationship)', def: 'Maximum number of relationship occurrences for an entity (1:1, 1:*, *:*).', realm: 'r3' },
    { term: 'Participation', def: 'Whether all (mandatory) or some (optional) entity occurrences participate in a relationship.', realm: 'r3' },
    { term: 'Bridge entity', def: 'Intersection/associative entity resolving a many-to-many relationship.', realm: 'r3' },
    { term: 'UML', def: 'Unified Modeling Language, the diagram notation used for ERDs in the course.', realm: 'r3' },
  ],

  sql: [
    { id: 'r3-s1', realm: 'r3', topic: 'mn-resolve', title: 'Build a bridge table', dataset: 'empty', d: 2,
      prompt: 'Create Employee(EmpNum PK, EmpName), Project(ProjectNum PK, ProjectName) and the bridge **Assignment(EmpNum, ProjectNum, DateStarted, NumHours)** with a composite primary key and both foreign keys. (The checker inserts test rows to verify your keys.)',
      solution: 'CREATE TABLE Employee (EmpNum VARCHAR(5) PRIMARY KEY, EmpName VARCHAR(30));\nCREATE TABLE Project (ProjectNum VARCHAR(5) PRIMARY KEY, ProjectName VARCHAR(30));\nCREATE TABLE Assignment (EmpNum VARCHAR(5) REFERENCES Employee(EmpNum), ProjectNum VARCHAR(5) REFERENCES Project(ProjectNum), DateStarted DATE, NumHours INTEGER, PRIMARY KEY (EmpNum, ProjectNum));',
      check: "INSERT INTO Employee VALUES ('E1','Lopez'); INSERT INTO Project VALUES ('P1','Payroll'); INSERT INTO Assignment VALUES ('E1','P1','2026-02-03',12); INSERT OR IGNORE INTO Assignment VALUES ('E1','P1','2026-02-04',3); SELECT (SELECT COUNT(*) FROM Assignment) AS rows_after_duplicate, (SELECT COUNT(*) FROM pragma_foreign_key_list('Assignment')) AS fk_count, (SELECT COUNT(*) FROM pragma_table_info('Assignment') WHERE pk > 0) AS pk_columns;",
      hint: 'PRIMARY KEY (EmpNum, ProjectNum) as a table constraint, plus REFERENCES on each column.' },
    { id: 'r3-s2', realm: 'r3', topic: 'multiplicity', title: 'Check a participation claim', dataset: 'dreamhome', d: 2,
      prompt: 'Staff *Oversees* PropertyForRent is 0..1 beside Staff. Prove that participation of PropertyForRent is optional: list the propertyNo of every property **not overseen** by any member of staff.',
      solution: 'SELECT propertyNo FROM PropertyForRent WHERE staffNo IS NULL;' },
  ],

  codex: `
## ER building blocks (UML)
- **Entity type**: group of objects with the same properties and independent existence; rectangle, singular noun (PropertyForRent).
- **Relationship**: named line (verb), read-direction arrow; complex (>2) = diamond.
- Degree: binary 2 · ternary 3 · quaternary 4 · **recursive** = same entity in two roles (use role names).

## Attributes
| Kind | Example | UML |
|---|---|---|
| Simple | salary | salary |
| Composite | address | address + indented street, city, postcode |
| Multi-valued | telNo | telNo [1..3] |
| Derived | totalStaff | /totalStaff |
| Keys | staffNo | {PK} {PPK} {AK} {FK} |
- Attributes on a relationship may reveal a hidden entity (Advertises → Advert).
- PK choice: shortest, fewest attributes, most certain uniqueness (staffNo over NIN).

## Multiplicity
- The number beside an entity = how many of THAT entity per ONE at the other end.
- **Cardinality = max values** (1:1, 1:*, \*:\*). **Participation = min values** (0 optional, 1 mandatory), read on the opposite side.
- Staff 1..1 —Manages— 0..1 Branch · Staff 0..1 —Oversees— 0..* Property · Newspaper 0..* —Advertises— 1..* Property.
- “must” = min 1 · “may” = min 0 · “one and only one” = max 1 · “one or more” = max *.

## Resolving M:N
Bridge entity with composite PK (A_id, B_id), both {PK, FK}, plus relationship attributes. M:N becomes 1:* + 1:*. Use a surrogate (LoanId) if the same pair can repeat. State assumptions: they earn marks.
`,
}

export default r3
