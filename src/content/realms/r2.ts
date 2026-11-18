import type { RealmContent } from '../types'

// Source: 02_Business_Rules_and_Relational_Operators (Business Rules: From Requirements to
// Database Constraints; Relational Operators (revised); Relational Operators handout;
// Relational Algebra Operators note).

const r2: RealmContent = {
  topics: {
    'db-solution': 'Why a database solution', rules: 'Writing business rules', 'rule-types': 'Rule types & classification',
    'ra-basics': 'Algebra basics & closure', unary: 'Selection & projection', setops: 'Set operations & product',
    joins: 'Joins (theta, equi, natural, outer, semi)', division: 'Division',
  },
  lessons: [
    {
      id: 'r2-why', realm: 'r2', title: 'Why an organisation needs a database solution', mins: 7,
      src: ['01_COMP2605_Business_Rules_Revised.pdf'],
      body: `
:::story Mission 2.1: The sports-club spreadsheet
A university sports office keeps one flat file. Each student row has room for two sports and their prices. It worked fine until a student signed up for a third sport.
:::

## When is a database solution worth it?
A database solution is valuable when an organisation must coordinate **multiple users**, **multiple data items**, **multiple application components**, and **concurrent updates with shared reporting**. The design objective: *provide one controlled representation of data that supports consistent access and enforceable rules*, with centralised structure, integrity, security, concurrency control and consistent access.

## The flat file
| STUDENT_ID | SPORT_1 | PRICE_1 | SPORT_2 | PRICE_2 |
|---|---|---|---|---|
| ST0001 | Tennis | $100 | Badminton | $150 |
| ST0002 | Soccer | $175 | Tennis | $100 |
| ST0003 | Cycling | $200 | Badminton | $150 |

**SPORT_1/PRICE_1** and **SPORT_2/PRICE_2** form a **repeating group**: they repeat the same kind of fact. The file assumes a fixed maximum of two sports per student, and it repeats each sport’s price (Tennis $100 is stored twice).

:::key Key clarification
The repeating columns are a *structural symptom*. The underlying issue is that **one student may select many sports**. The file mixes three independent subjects: student details, sport details and price, and the fact that a student participates in a sport.
:::

The consequences: **redundancy**, **update anomalies** (change the Tennis price and you must find every copy), **insert/delete anomalies**, and a **fixed number of repeating columns**.

{{q:r2-flat-symptom}}

## The database solution: three relations
\`\`\`text
Student       (studentId, firstName, lastName)
Sport         (sportId, name, price)
Participation (studentId*, sportId*, semesterDetails)    -- PK = (studentId, sportId)
\`\`\`
A Student makes **0..*** Participations; each Participation belongs to exactly **1..1** Student. A Sport is selected in **0..*** Participations; each Participation refers to **1..1** Sport. This removes repeated sport facts and supports **any number** of selections. (Assumption: students and sports may be recorded before any selection is made, hence the minimum 0.)

Try it on the normalized version of the sports club data:

\`\`\`sql:sports run
SELECT s.studentName, p.sport, sp.price
FROM Student s JOIN Participation p ON s.studentId = p.studentId
JOIN Sport sp ON sp.sport = p.sport
ORDER BY s.studentName;
\`\`\`

## Start from meaning, not tables
Business statements become **atomic, testable business rules**. Those rules give you **entities, attributes and relationships**, then **cardinality and constraints**, and finally the **database schema**. Each important table, relationship, key, validation rule or workflow constraint should be **traceable** to an approved business requirement.

{{q:r2-traceability}}
`,
    },
    {
      id: 'r2-rules', realm: 'r2', title: 'Business rules: sources, types and how to write them', mins: 12,
      src: ['01_COMP2605_Business_Rules_Revised.pdf', '03_COMP2605_Relational_Model_Revised.pdf (LibBook task)'],
      body: `
## Why business rules matter
Identifying and documenting business rules lets the developer understand **relationships and constraints** among entities and the **standard procedures** the organisation uses for its data. Rules should be **simple, easy to understand, approved by the business, and kept up to date**. Unclear rules lead to ambiguous requirements, and ambiguous requirements lead to inconsistent data and software behaviour.

## Where rules come from
- Managers and policy makers
- End-user interviews
- Documentation, procedures, standards and operation manuals
- Laws and regulations
- Existing forms, reports and systems

## What is a business rule?
:::def
A **business rule** is a precise, declarative statement that defines or constrains an aspect of the business. It describes what **must, may, or must not** be true, is independent of any particular software implementation, and should be **atomic, unambiguous, testable**, and owned by an identifiable business authority.
:::
Good: *“Each member must be assigned to exactly one membership type.”* Weak: *“The membership screen should be user-friendly.”* That is a quality goal, not a precise data rule.

{{q:r2-good-rule}}

## Rule types relevant to databases
| Rule type | What it specifies | Example |
|---|---|---|
| Structural fact | Entities and relationships | A member belongs to a membership type |
| Cardinality / participation | Minimum and maximum participation | Each member must have exactly one membership type |
| Domain / value constraint | Allowed values, ranges or formats | Membership type must be Bronze, Silver or Gold |
| Derivation | How a value is calculated | Total fee equals base fee plus applicable charges |
| Temporal / state | When change is allowed | A membership type cannot be changed after activation |
| Process / authorization | Who may perform an action | Only a manager may approve a fee waiver |

A rule may be enforced by a **database constraint, a trigger, application logic, workflow, or a documented manual control**. Not every rule belongs inside the database.

{{q:r2-rule-type}}

## Seven guidelines for writing clear rules
1. Write **one rule per statement**.
2. Use business vocabulary consistently and define important terms.
3. Use explicit modal words: **must, must not, may**.
4. State quantities precisely: **exactly one, at least one, at most three, zero or more**.
5. State conditions, exceptions and effective dates explicitly.
6. Avoid implementation details unless the rule is genuinely technical.
7. Confirm the rule can be tested with examples **and counterexamples**.

## The sentence pattern
| Subject | Modal | Verb | Object + quantity |
|---|---|---|---|
| Each Member | must / may | belong to | exactly one type |

Write **both directions** of every relationship:
- Forward: *Each Member **must** belong to **exactly one** MembershipType.*
- Reverse: *Each MembershipType **may** classify **zero or more** Members.*

{{q:r2-reverse}}

## Case: SunStar Online Book Rentals
SunStar attracts new customers easily, rentals are growing rapidly, but the customer base is not stable. A proposed change introduces **Bronze** (free), **Silver** and **Gold** (fee + privileges) memberships; more types may come later; once assigned, a type cannot be changed.

The vague statement *“members will pay membership fees”* is **not accurate**, because Bronze is free. The precise rule set:
1. Each member must be assigned to exactly one membership type.
2. A membership type must have a unique name.
3. Initially, the permitted types are Bronze, Silver and Gold.
4. Bronze membership has a fee of zero.
5. Silver and Gold memberships incur a fee and provide defined privileges.
6. A member’s assigned membership type must not be changed after activation.
7. New membership types may be introduced through an approved business process.

These imply a **Member** entity, a **MembershipType** entity, a many-to-one relationship Member (0..*) to MembershipType (1..1), plus value and state constraints on type and fee.

:::warn Rule timing to confirm
The proposal says “after **assignment**”; the precise rule says “after **activation**”. A good analyst flags the difference and confirms when the type becomes unchangeable.
:::

## Rule, assumption or problem?
| Business rule | Assumption | Problem |
|---|---|---|
| Defines or constrains the business; can be validated against business activity or data | Taken for granted until verified; recorded and assigned for confirmation | A situation that needs attention and a possible solution |

- *“New book arrivals must occur on the 21st of every month.”* is a **business rule** (prescribes required behaviour).
- *“The librarian cannot easily identify DVDs that are more than two weeks overdue.”* is a **problem** (a deficiency that needs a solution).
- *“The current system probably uses Oracle Database 10g and runs on UNIX.”* is an **assumption** (“probably”, so it must be verified).

{{q:r2-classify}}

## Review checklist before approving a rule
A clear name, statement, scope and owner; one principal idea; explicit quantities, conditions, exceptions and time limits; passing examples and failing counterexamples; source, rationale, effective date and version history; an identified **enforcement location** (database, application, workflow or manual); and no conflict with another approved rule.

:::tip Lecture task: LibBook
LibBook (a digital library renting CDs) introduces corporate, student and individual memberships; student membership is free; corporate and faculty memberships incur a fee but carry privileges; the type can change only with sufficient justification. Write the rules in the subject–modal–verb–object pattern, both directions, and name the enforcement location of each. *(One answer: “Each member must hold exactly one membership type”; “A student membership must have a fee of zero”; “A member’s membership type may be changed only when a justification is recorded and approved” (workflow + a trigger that rejects changes without an approval).)*
:::

{{q:r2-libbook}}
`,
    },
    {
      id: 'r2-ra-intro', realm: 'r2', title: 'Relational algebra: closure and the five fundamental operations', mins: 7,
      src: ['02_COMP2605_Relational_Operators_Revised.pdf', '03_Relational_Operators.pdf'],
      body: `
## Query languages of the relational model
Part of any data model is a manipulation mechanism (query language). Codd (1971) defined two as the basis for relational languages:

| | Relational algebra | Relational calculus |
|---|---|---|
| Style | High-level **procedural**: tells the DBMS *how* to build a new relation | **Non-procedural**: defines the relation in terms of existing relations |
| Relationship | **Formally equivalent**: every expression in one has an equivalent in the other | |

## Closure
Relational algebra operations work on one or more relations to define **another relation** without changing the originals. Operands and results are both relations, so the output of one operation can be the input to another, and expressions can be **nested** like arithmetic. This is **closure**: relations are closed under the algebra, just as numbers are closed under arithmetic.

It is a **relation-at-a-time (set-at-a-time)** language: all tuples are manipulated in one statement without looping. Non-relational systems are typically *record-at-a-time* (e.g. a Pascal program processing one file record at a time).

{{w:ra-closure}}

## The operations
- Codd (1972a) originally proposed **eight** operations.
- The **five fundamental** operations: **Selection, Projection, Cartesian product, Union, Set difference**. They perform most retrieval tasks.
- **Join, Intersection and Division** can be expressed in terms of the five.
- Selection and Projection are **unary** (one relation); the others are **binary** (pairs of relations).
- The three most commonly used are **Restrict (Select), Project and Join**.

{{q:r2-fundamental}}
{{q:r2-closure}}
`,
    },
    {
      id: 'r2-unary', realm: 'r2', title: 'Selection (σ) and projection (π)', mins: 8,
      src: ['02_COMP2605_Relational_Operators_Revised.pdf', '04_Relational_Algebra_Operators.pdf'],
      body: `
## Selection (restriction): a horizontal subset
**σ predicate (R)** defines a relation containing only those tuples of R that satisfy the predicate. It keeps matching tuples (with **all** their attributes) and discards the rest. Predicates can be combined with AND (∧), OR (∨) and NOT (¬).

*List all staff with a salary greater than 10000:* **σ salary > 10000 (Staff)**, which gives 4 tuples, still with all 8 attributes.

{{w:ra-select}}

## Projection: a vertical subset
**π a1, …, an (R)** defines a relation containing a vertical subset of R: the values of the specified attributes, in the specified order, **with duplicate tuples eliminated**.

*Produce a list of salaries for all staff, showing only staffNo, fName, lName and salary:* **π staffNo, fName, lName, salary (Staff)**.

{{w:ra-project}}

:::warn Duplicates disappear
Relations are sets. π position (Staff) returns 3 tuples (Manager, Assistant, Supervisor), not 6. SQL keeps duplicates unless you write SELECT DISTINCT, which is one of the classic differences between SQL and the algebra.
:::

{{q:r2-select-proj}}
{{q:r2-proj-dup}}

## Nesting (closure in action)
*Names of managers:* **π fName, lName (σ position = 'Manager' (Staff))**. The inner σ produces a relation; π consumes it.

{{q:r2-nest}}
`,
    },
    {
      id: 'r2-setops', realm: 'r2', title: 'Union, set difference, intersection and Cartesian product', mins: 9,
      src: ['02_COMP2605_Relational_Operators_Revised.pdf'],
      body: `
## Union-compatibility
Union, set difference and intersection require **union-compatible** relations: the schemas must match (same number of attributes, from matching domains). You usually **project first** to make relations compatible.

## Union: R ∪ S
All tuples in R, in S, or in both, **duplicates eliminated**. If R has I tuples and S has J, the union has **at most I + J**.

*All cities with a branch office or a property for rent:* **π city (Branch) ∪ π city (PropertyForRent)**, which gives London, Aberdeen, Glasgow, Bristol.

## Set difference: R − S
Tuples in R but not in S. *Cities with a branch but no properties:* **π city (Branch) − π city (PropertyForRent)**, which gives **Bristol**.

## Intersection: R ∩ S
Tuples in both. *Cities with both a branch and at least one property:* **π city (Branch) ∩ π city (PropertyForRent)**, which gives Aberdeen, London, Glasgow. Identity: **R ∩ S = R − (R − S)**.

{{w:ra-setops}}

{{q:r2-difference}}
{{q:r2-identity}}

## Cartesian product: R × S
Concatenates **every tuple of R with every tuple of S**. If R has I tuples and N attributes and S has J tuples and M attributes, the result has **I × J tuples** and **N + M attributes**. Clashing attribute names are prefixed with the relation name (Client.clientNo, Viewing.clientNo).

*π clientNo, fName, lName (Client) × π clientNo, propertyNo, comment (Viewing)* gives **4 × 5 = 20 tuples** with **3 + 3 = 6 attributes**. Most pairs are meaningless (different clientNo values), so we select the matching ones: **σ Client.clientNo = Viewing.clientNo (… × …)**, and that is exactly what a join does.

{{q:r2-product}}
`,
    },
    {
      id: 'r2-joins', realm: 'r2', title: 'Joins, semijoin and division', mins: 12,
      src: ['02_COMP2605_Relational_Operators_Revised.pdf', '03_Relational_Operators.pdf'],
      body: `
## Join = selection over a Cartesian product
A Join combines two relations into a new relation. It is a derivative of the Cartesian product: a Selection using the join predicate over R × S. Join is one of the **most important and most expensive** operations in an RDBMS.

| Join | Definition |
|---|---|
| **Theta join** R ⋈F S | Tuples of R × S satisfying predicate F of the form R.a θ S.b, θ ∈ {<, ≤, >, ≥, =, ≠}. **R ⋈F S = σF (R × S)**. Degree = sum of degrees |
| **Equijoin** | A theta join whose predicate contains only **equality**. Both copies of the join attribute are kept |
| **Natural join** R ⋈ S | An equijoin over **all common attributes**, with **one occurrence of each common attribute eliminated**. Degree = deg(R) + deg(S) − number of common attributes |
| **(Left) outer join** R ⟕ S | Tuples of R with no match in S are also included, with S’s attributes set to **null**. Information is preserved |
| Right outer / full outer | Keep every tuple of the right relation / of both, padding with nulls |
| **Semijoin** R ▷F S | Join, then project over R’s attributes: **R ▷F S = πA (R ⋈F S)**. It reduces the tuples handled |

{{w:ra-joins}}

{{q:r2-natural-degree}}
{{q:r2-equi-vs-natural}}

## The outer-join status report
*Produce a status report on property viewings*, keeping properties that were never viewed:
**π propertyNo, street, city (PropertyForRent) ⟕ Viewing**. PL94, PG21 and PG16 have no viewings, so their Viewing attributes are null.

{{q:r2-outer}}

## Semijoin
*Complete details of all staff who work at the branch in Glasgow:* **Staff ▷ Staff.branchNo = Branch.branchNo (σ city = 'Glasgow' (Branch))**. Only Staff attributes are returned.

## Division: “related to every …”
**R ÷ S**: for R(A, B) and S(B), the result is defined over attributes **C = attributes of R not in S** and contains the tuples of R that match **every** tuple in S. Use it for queries of the form *“find all x related to every y in a set.”*

*Clients who have viewed **all** properties with three rooms:*
**π clientNo, propertyNo (Viewing) ÷ π propertyNo (σ rooms = 3 (PropertyForRent))**. The three-room properties are PG4 and PG36; only **CR56** viewed both.

{{w:ra-division}}

{{q:r2-division}}

## Summary
| Operation | Notation | Function |
|---|---|---|
| Selection | σ p (R) | Tuples of R satisfying the predicate |
| Projection | π a1…an (R) | Vertical subset of R; duplicates eliminated |
| Union | R ∪ S | Tuples in R, S or both; union-compatible |
| Set difference | R − S | Tuples in R not in S; union-compatible |
| Intersection | R ∩ S | Tuples in both; union-compatible |
| Cartesian product | R × S | Every tuple of R with every tuple of S |
| Theta join | R ⋈F S | Tuples of R × S satisfying F |
| Equijoin | R ⋈F S | Theta join with only equality comparisons |
| Natural join | R ⋈ S | Equijoin over all common attributes, one copy kept |
| (Left) outer join | R ⟕ S | Unmatched R tuples kept, padded with nulls |
| Semijoin | R ▷F S | Tuples of R that participate in the join |
| Division | R ÷ S | Tuples over C matching every tuple of S |

:::tip Practise in the arena
The [Relational Algebra Pipeline](#/arena?lang=ra) evaluates any expression on the DreamHome relations and shows the relation produced at every step.
:::
`,
    },
  ],

  questions: [
    { id: 'r2-flat-symptom', realm: 'r2', topic: 'db-solution', kind: 'mcq', d: 2,
      q: 'In the sports flat file (STUDENT_ID, SPORT_1, PRICE_1, SPORT_2, PRICE_2), what is the **underlying** issue that the repeating columns are a symptom of?',
      options: ['Prices are stored as text', 'One student may select many sports', 'STUDENT_ID is not numeric', 'The file has too few rows'], answer: 1,
      explain: 'The lecture’s key clarification: repeating columns are a structural symptom; the real issue is the one-to-many (in fact many-to-many) fact that a student may select many sports.' },
    { id: 'r2-traceability', realm: 'r2', topic: 'db-solution', kind: 'order', d: 1,
      q: 'Order the steps from business statements to a database design.',
      items: ['Business statements', 'Atomic, testable business rules', 'Entities, attributes, relationships', 'Cardinality and constraints', 'Database schema'],
      explain: 'A design begins with the meaning and constraints of the business, not with tables. Each element should be traceable back to an approved requirement.' },
    { id: 'r2-good-rule', realm: 'r2', topic: 'rules', kind: 'mcq', d: 1,
      q: 'Which is a well-formed business rule?',
      options: ['The membership screen should be user-friendly.', 'Members will pay membership fees.', 'Each member must be assigned to exactly one membership type.', 'The system should probably use Oracle.'], answer: 2,
      explain: 'It is atomic, uses an explicit modal (must) and a precise quantity (exactly one), and is testable. “User-friendly” is a quality goal; “will pay fees” is inaccurate (Bronze is free); “probably” marks an assumption.' },
    { id: 'r2-rule-type', realm: 'r2', topic: 'rule-types', kind: 'match', d: 2,
      q: 'Match each rule to its type.',
      pairs: [['Membership type must be Bronze, Silver or Gold', 'Domain / value constraint'], ['Total fee equals base fee plus applicable charges', 'Derivation'], ['A membership type cannot be changed after activation', 'Temporal / state'], ['Only a manager may approve a fee waiver', 'Process / authorization'], ['Each member must have exactly one membership type', 'Cardinality / participation']],
      explain: 'These are the database-relevant rule types from the Business Rules lecture.' },
    { id: 'r2-reverse', realm: 'r2', topic: 'rules', kind: 'mcq', d: 2,
      q: 'Forward rule: “Each Member must belong to exactly one MembershipType.” Which is the correct **reverse** rule (given new types may exist before anyone joins them)?',
      options: ['Each MembershipType must classify exactly one Member.', 'Each MembershipType may classify zero or more Members.', 'Each MembershipType must classify at least one Member.', 'Members may belong to many types.'], answer: 1,
      explain: 'Relationship rules are written in both directions. A type can exist with no members yet, so the reverse is optional (may) with “zero or more”.' },
    { id: 'r2-classify', realm: 'r2', topic: 'rule-types', kind: 'match', d: 1,
      q: 'Classify each statement.',
      pairs: [['New book arrivals must occur on the 21st of every month.', 'Business rule'], ['The librarian cannot easily identify DVDs that are more than two weeks overdue.', 'Problem'], ['The current system probably uses Oracle Database 10g and runs on UNIX.', 'Assumption']],
      explain: 'A rule prescribes required behaviour; a problem describes a deficiency needing a solution; an assumption contains uncertainty and must be verified.' },
    { id: 'r2-libbook', realm: 'r2', topic: 'rules', kind: 'mcq', d: 2,
      q: 'LibBook: “The type of membership can be changed only if sufficient justification is provided.” Where is this rule most naturally enforced?',
      options: ['By a domain constraint on the fee column', 'By workflow/approval, possibly backed by a trigger that rejects changes without an approved justification', 'By the primary key of Member', 'It cannot be enforced at all'], answer: 1,
      explain: 'It is a temporal/state + process rule. Rules can be enforced by constraints, triggers, application logic, workflow or manual controls; this one needs an approval step.' },
    { id: 'r2-fundamental', realm: 'r2', topic: 'ra-basics', kind: 'multi', d: 2,
      q: 'Which are among the **five fundamental** relational algebra operations? Select all.',
      options: ['Selection', 'Join', 'Projection', 'Cartesian product', 'Intersection', 'Union', 'Set difference', 'Division'], answer: [0, 2, 3, 5, 6],
      explain: 'Selection, Projection, Cartesian product, Union and Set difference. Join, Intersection and Division can be expressed in terms of them.' },
    { id: 'r2-closure', realm: 'r2', topic: 'ra-basics', kind: 'mcq', d: 1,
      q: 'What does the **closure** property of relational algebra mean?',
      options: ['Relations are closed to concurrent users', 'Every operation takes relations and returns a relation, so operations can be nested', 'Every query must end with a projection', 'Tables are locked after each operation'], answer: 1,
      explain: 'Operands and results are both relations, so the output of one operation can be the input to another.' },
    { id: 'r2-select-proj', realm: 'r2', topic: 'unary', kind: 'match', d: 1,
      q: 'Match each description to its operation.',
      pairs: [['Horizontal subset: keeps tuples satisfying a predicate', 'Selection (σ)'], ['Vertical subset: keeps chosen attributes, removes duplicates', 'Projection (π)'], ['Every tuple of R paired with every tuple of S', 'Cartesian product (×)'], ['Tuples in R but not in S', 'Set difference (−)']],
      explain: 'Selection = rows, projection = columns.' },
    { id: 'r2-proj-dup', realm: 'r2', topic: 'unary', kind: 'num', d: 2,
      q: 'Staff has 6 tuples with positions Manager, Assistant, Supervisor, Assistant, Manager, Assistant. How many tuples are in **π position (Staff)**?',
      answer: 3, explain: 'Projection eliminates duplicate tuples: {Manager, Assistant, Supervisor}.' },
    { id: 'r2-nest', realm: 'r2', topic: 'unary', kind: 'mcq', d: 2,
      q: 'Which expression lists the first and last names of staff who earn more than 20000?',
      options: ['σ fName, lName (π salary > 20000 (Staff))', 'π fName, lName (σ salary > 20000 (Staff))', 'π salary > 20000 (Staff)', 'σ salary > 20000 (π fName, lName (Staff))'], answer: 1,
      explain: 'Select first (σ keeps rows), then project (π keeps columns). The last option fails because salary is projected away before the selection needs it.' },
    { id: 'r2-difference', realm: 'r2', topic: 'setops', kind: 'fill', d: 2,
      q: 'π city (Branch) − π city (PropertyForRent) returns exactly one city in DreamHome. Which?',
      accept: ['Bristol'], explain: 'Bristol has a branch (B004) but no property for rent.' },
    { id: 'r2-identity', realm: 'r2', topic: 'setops', kind: 'mcq', d: 3,
      q: 'Which identity expresses intersection using only set difference?',
      options: ['R ∩ S = R − S', 'R ∩ S = R − (R − S)', 'R ∩ S = (R ∪ S) − R', 'R ∩ S = S − R'], answer: 1,
      explain: 'Remove from R everything that is not in S, and what is left is what R and S share.' },
    { id: 'r2-product', realm: 'r2', topic: 'setops', kind: 'num', d: 2,
      q: 'R has 4 tuples and 3 attributes; S has 5 tuples and 3 attributes. How many **tuples** are in R × S?',
      answer: 20, explain: 'I × J = 4 × 5 = 20 tuples (with N + M = 6 attributes), as in the Client × Viewing example.' },
    { id: 'r2-natural-degree', realm: 'r2', topic: 'joins', kind: 'num', d: 3,
      q: 'π clientNo, fName, lName (Client) ⋈ π clientNo, propertyNo, comment (Viewing). What is the **degree** of this natural join?',
      answer: 5, hint: 'Degree = deg(R) + deg(S) − number of common attributes.',
      explain: '3 + 3 − 1 (clientNo) = 5: clientNo, fName, lName, propertyNo, comment.' },
    { id: 'r2-equi-vs-natural', realm: 'r2', topic: 'joins', kind: 'mcq', d: 2,
      q: 'What distinguishes a **natural join** from an **equijoin** on the same attribute?',
      options: ['A natural join keeps unmatched tuples', 'A natural join eliminates one occurrence of each common attribute', 'An equijoin may only use the < operator', 'A natural join is a Cartesian product'], answer: 1,
      explain: 'The equijoin keeps both clientNo columns; the natural join keeps one.' },
    { id: 'r2-outer', realm: 'r2', topic: 'joins', kind: 'mcq', d: 2,
      q: 'π propertyNo, street, city (PropertyForRent) ⟕ Viewing. What happens to PL94, which has never been viewed?',
      options: ['It is omitted', 'It appears once with null clientNo, viewDate and comment', 'It causes an error', 'It is paired with every viewing'], answer: 1,
      explain: 'A left outer join keeps every tuple of the left relation, padding missing values with nulls.' },
    { id: 'r2-division', realm: 'r2', topic: 'division', kind: 'fill', d: 3,
      q: 'π clientNo, propertyNo (Viewing) ÷ π propertyNo (σ rooms = 3 (PropertyForRent)). The three-room properties are PG4 and PG36. Which clientNo is returned?',
      accept: ['CR56'], explain: 'Only CR56 viewed every three-room property (PG4 and PG36).' },
    { id: 'r2-semijoin', realm: 'r2', topic: 'joins', kind: 'mcq', d: 2,
      q: 'Staff ▷ Staff.branchNo = Branch.branchNo (σ city = \'Glasgow\' (Branch)) returns…',
      options: ['Branch attributes for Glasgow', 'Complete Staff tuples for staff at the Glasgow branch, Staff attributes only', 'Staff and Branch attributes combined', 'All staff, with nulls for non-Glasgow'], answer: 1,
      explain: 'A semijoin joins, then projects over the attributes of the first operand.' },
    { id: 'r2-calculus', realm: 'r2', topic: 'ra-basics', kind: 'tf', d: 1,
      q: 'Relational algebra is procedural, relational calculus is non-procedural, and the two are formally equivalent.',
      answer: true, explain: 'Every expression in one has an equivalent expression in the other (Codd 1971).' },
    { id: 'r2-union-compat', realm: 'r2', topic: 'setops', kind: 'mcq', d: 2,
      q: 'Why must we project Branch and PropertyForRent over city **before** taking their union?',
      options: ['Union only works on one attribute', 'The two relations must be union-compatible (matching schemas)', 'To sort the cities', 'To remove nulls'], answer: 1,
      explain: 'Union, difference and intersection require union-compatible relations; projecting both over city makes their schemas match.' },
    { id: 'r2-theta', realm: 'r2', topic: 'joins', kind: 'mcq', d: 2,
      q: 'Which expression is equivalent to the theta join R ⋈F S?',
      options: ['πF (R × S)', 'σF (R × S)', 'R − (R − S)', 'σF (R) × S'], answer: 1,
      explain: 'A theta join is a selection, using the join predicate F, over the Cartesian product.' },
    { id: 'r2-set-at-a-time', realm: 'r2', topic: 'ra-basics', kind: 'tf', d: 1,
      q: 'Relational operators work one record at a time, like a Pascal program reading a file.',
      answer: false, explain: 'They are set-at-a-time: operations act on whole relations (sets of tuples). Record-at-a-time processing is typical of non-relational systems.' },
  ],

  written: [
    { id: 'r2-w1', realm: 'r2', topic: 'rules', marks: 8,
      q: 'SunStar Online Book Rentals proposes Bronze (free), Silver and Gold (fee + privileges) memberships. More types may be added later, and a member’s type cannot be changed once assigned. (a) Explain why “members will pay membership fees” is a poor rule. (b) Write a precise rule set. (c) Identify the entities and relationship implied.',
      model: '(a) It is inaccurate and not atomic: Bronze membership is free, so not all members pay; it also lacks a modal and quantity. (b) Each member must be assigned to exactly one membership type. A membership type must have a unique name. Initially the permitted types are Bronze, Silver and Gold. Bronze membership has a fee of zero. Silver and Gold memberships incur a fee and provide defined privileges. A member’s assigned type must not be changed after activation. New types may be introduced through an approved business process. (c) Member and MembershipType entities; many-to-one: each Member belongs to exactly one MembershipType (1..1), each MembershipType may classify zero or more Members (0..*); value constraints on type name and fee, and a state constraint on changing type.',
      points: ['Identifies Bronze-is-free inaccuracy', 'Rules use must/may and precise quantities', 'Exactly-one membership type rule', 'Unique type name / permitted values rule', 'Fee rules distinguishing Bronze vs Silver/Gold', 'No-change-after-activation (state) rule', 'Member and MembershipType entities', 'Correct many-to-one cardinality in both directions'] },
    { id: 'r2-w2', realm: 'r2', topic: 'joins', marks: 6,
      q: 'Distinguish theta join, equijoin, natural join and left outer join. Use Client and Viewing in your examples.',
      model: 'A theta join R ⋈F S returns the tuples of R × S that satisfy a predicate F of the form R.a θ S.b (θ one of <, ≤, >, ≥, =, ≠); it equals σF(R × S) and its degree is the sum of the degrees. An equijoin is a theta join whose predicate uses only equality, e.g. Client ⋈ Client.clientNo = Viewing.clientNo Viewing, which keeps both clientNo columns. A natural join is an equijoin over all common attributes with one occurrence of each common attribute removed: Client ⋈ Viewing keeps one clientNo. A left outer join Client ⟕ Viewing also keeps clients with no viewings (e.g. CR74), padding the Viewing attributes with nulls, so information is preserved.',
      points: ['Theta join defined with comparison operators', 'Theta join = σF(R × S)', 'Equijoin = equality only, both join columns kept', 'Natural join removes duplicate common attribute', 'Left outer join keeps unmatched left tuples with nulls', 'Uses Client/Viewing examples correctly'] },
    { id: 'r2-w3', realm: 'r2', topic: 'division', marks: 5,
      q: 'Write a relational algebra expression to find the clients who have viewed every property with three rooms, and explain how division produces the answer for the DreamHome instance.',
      model: 'π clientNo, propertyNo (Viewing) ÷ π propertyNo (σ rooms = 3 (PropertyForRent)). The divisor is the set of three-room properties {PG4, PG36}. The dividend pairs clients with properties they viewed: (CR56, PA14), (CR76, PG4), (CR56, PG4), (CR62, PA14), (CR56, PG36). Division returns the clientNo values that appear with every divisor tuple: CR56 appears with PG4 and PG36; CR76 only with PG4. Result: {CR56}.',
      points: ['Correct selection σ rooms = 3', 'Correct projections for dividend and divisor', 'Uses ÷ correctly', 'Explains "matches every tuple of S"', 'Correct result CR56 with reasoning'] },
    { id: 'r2-w4', realm: 'r2', topic: 'rule-types', marks: 6,
      q: 'Define business rule, assumption and problem, and give one example of each from the lecture case studies. Then list four items you would check before approving a business rule.',
      model: 'A business rule defines or constrains the business and can be validated against business activity or data, e.g. “New book arrivals must occur on the 21st of every month.” An assumption is taken for granted until verified and must be recorded for confirmation, e.g. “The current system probably uses Oracle Database 10g and runs on UNIX.” A problem is a situation requiring attention and a possible solution, e.g. “The librarian cannot easily identify DVDs more than two weeks overdue.” Before approval check: a clear name, statement, scope and owner; one principal idea with defined terms; explicit quantities, conditions, exceptions and time limits; examples and counterexamples; source, rationale, effective date and version; enforcement location; no conflict with other rules.',
      points: ['Business rule defined + example', 'Assumption defined + example', 'Problem defined + example', 'Checklist item 1', 'Checklist item 2', 'Checklists items 3-4'] },
  ],

  cards: [
    { id: 'r2-c1', realm: 'r2', front: 'When is a database solution valuable?', back: 'When an organisation must coordinate multiple users, multiple data items, multiple application components, and concurrent updates/shared reporting.' },
    { id: 'r2-c2', realm: 'r2', front: 'Repeating group', back: 'Columns that repeat the same kind of fact (SPORT_1/PRICE_1, SPORT_2/PRICE_2). A symptom of a one-to-many fact stored in one row.' },
    { id: 'r2-c3', realm: 'r2', front: 'Business rule', back: 'A precise, declarative statement defining or constraining an aspect of the business: atomic, unambiguous, testable, implementation-independent, owned.' },
    { id: 'r2-c4', realm: 'r2', front: 'Sources of business rules', back: 'Managers/policy makers; end-user interviews; documentation, procedures, standards, manuals; laws and regulations; existing forms, reports and systems.' },
    { id: 'r2-c5', realm: 'r2', front: 'Six database-relevant rule types', back: 'Structural fact; cardinality/participation; domain/value; derivation; temporal/state; process/authorization.' },
    { id: 'r2-c6', realm: 'r2', front: 'Business-rule sentence pattern', back: 'Subject + Modal (must/may) + Verb + Object + quantity, written in both forward and reverse directions.' },
    { id: 'r2-c7', realm: 'r2', front: 'Rule vs assumption vs problem', back: 'Rule: what must be true. Assumption: believed but unconfirmed. Problem: why change is needed.' },
    { id: 'r2-c8', realm: 'r2', front: 'Algebra vs calculus', back: 'Algebra: procedural (how). Calculus: non-procedural (what). Formally equivalent (Codd 1971).' },
    { id: 'r2-c9', realm: 'r2', front: 'Closure', back: 'Operations take relations and produce relations, so they can be nested.' },
    { id: 'r2-c10', realm: 'r2', front: 'Five fundamental operations', back: 'Selection, Projection, Cartesian product, Union, Set difference.' },
    { id: 'r2-c11', realm: 'r2', front: 'Selection σ', back: 'Horizontal subset: tuples satisfying a predicate (all attributes kept).' },
    { id: 'r2-c12', realm: 'r2', front: 'Projection π', back: 'Vertical subset: chosen attributes in the given order, duplicates eliminated.' },
    { id: 'r2-c13', realm: 'r2', front: 'Union-compatible', back: 'Relations with matching schemas; required for ∪, −, ∩.' },
    { id: 'r2-c14', realm: 'r2', front: 'Cartesian product size', back: 'I × J tuples and N + M attributes.' },
    { id: 'r2-c15', realm: 'r2', front: 'Theta join', back: 'R ⋈F S = σF(R × S), with F of the form R.a θ S.b.' },
    { id: 'r2-c16', realm: 'r2', front: 'Natural join degree', back: 'deg(R) + deg(S) − number of common attributes.' },
    { id: 'r2-c17', realm: 'r2', front: 'Semijoin', back: 'R ▷F S = πA(R ⋈F S): the tuples of R that participate in the join (R’s attributes only).' },
    { id: 'r2-c18', realm: 'r2', front: 'Division', back: 'R ÷ S: tuples over C (attributes of R not in S) that match every tuple of S. “Related to every…” queries.' },
  ],

  terms: [
    { term: 'Business rule', def: 'Precise, declarative statement that defines or constrains an aspect of the business.', realm: 'r2' },
    { term: 'Assumption', def: 'A statement taken for granted until verified; recorded and assigned for confirmation.', realm: 'r2' },
    { term: 'Problem (requirements)', def: 'A situation requiring attention and a possible solution.', realm: 'r2' },
    { term: 'Traceability', def: 'Every table, relationship, key or rule can be traced to an approved business requirement.', realm: 'r2' },
    { term: 'Repeating group', def: 'Columns repeating the same kind of fact within one record.', realm: 'r2' },
    { term: 'Relational algebra', def: 'Procedural language of operations that build new relations from existing ones.', realm: 'r2' },
    { term: 'Relational calculus', def: 'Non-procedural language defining a relation in terms of existing relations.', realm: 'r2' },
    { term: 'Closure', def: 'Relational operations produce relations, so they can be nested.', realm: 'r2' },
    { term: 'Selection (restriction)', def: 'σ: tuples of a relation that satisfy a predicate.', realm: 'r2' },
    { term: 'Projection', def: 'π: specified attributes of a relation, duplicates eliminated.', realm: 'r2' },
    { term: 'Union', def: 'R ∪ S: tuples in R, S or both; requires union-compatibility.', realm: 'r2' },
    { term: 'Set difference', def: 'R − S: tuples in R but not in S.', realm: 'r2' },
    { term: 'Intersection', def: 'R ∩ S: tuples in both R and S.', realm: 'r2' },
    { term: 'Cartesian product', def: 'R × S: every tuple of R concatenated with every tuple of S.', realm: 'r2' },
    { term: 'Union-compatible', def: 'Relations whose schemas match, allowing set operations.', realm: 'r2' },
    { term: 'Theta join', def: 'Tuples of R × S satisfying a comparison predicate F.', realm: 'r2' },
    { term: 'Equijoin', def: 'A theta join using only equality.', realm: 'r2' },
    { term: 'Natural join', def: 'Equijoin over all common attributes with one copy of each kept.', realm: 'r2' },
    { term: 'Outer join', def: 'Join that keeps unmatched tuples, padding with nulls (left, right or full).', realm: 'r2' },
    { term: 'Semijoin', def: 'Join projected onto the first operand’s attributes.', realm: 'r2' },
    { term: 'Division (relational)', def: 'R ÷ S: tuples of R over the non-S attributes that pair with every tuple of S.', realm: 'r2' },
  ],

  sql: [
    { id: 'r2-s1', realm: 'r2', topic: 'unary', title: 'σ then π in SQL', dataset: 'dreamhome', d: 1,
      prompt: 'Translate **π staffNo, fName, lName, salary (σ salary > 10000 (Staff))** into SQL.',
      solution: 'SELECT staffNo, fName, lName, salary FROM Staff WHERE salary > 10000;' },
    { id: 'r2-s2', realm: 'r2', topic: 'setops', title: 'Union of cities', dataset: 'dreamhome', d: 2,
      prompt: 'List all cities where there is either a branch office or a property for rent (**π city (Branch) ∪ π city (PropertyForRent)**).',
      solution: 'SELECT city FROM Branch UNION SELECT city FROM PropertyForRent;', hint: 'SQL UNION eliminates duplicates, just like the algebra.' },
    { id: 'r2-s3', realm: 'r2', topic: 'setops', title: 'Set difference', dataset: 'dreamhome', d: 2,
      prompt: 'List the cities where there is a branch office but **no** properties for rent.',
      solution: 'SELECT city FROM Branch EXCEPT SELECT city FROM PropertyForRent;', hint: 'SQL’s set difference is EXCEPT (Oracle calls it MINUS).' },
    { id: 'r2-s4', realm: 'r2', topic: 'joins', title: 'Outer-join status report', dataset: 'dreamhome', d: 2,
      prompt: 'Produce the property viewing status report: propertyNo, street, city, clientNo, viewDate, comment for **every** property, including those never viewed.',
      solution: 'SELECT p.propertyNo, p.street, p.city, v.clientNo, v.viewDate, v.comment FROM PropertyForRent p LEFT JOIN Viewing v ON p.propertyNo = v.propertyNo;' },
    { id: 'r2-s5', realm: 'r2', topic: 'joins', title: 'Semijoin', dataset: 'dreamhome', d: 2,
      prompt: 'List complete details (all Staff attributes only) of all staff who work at the branch in **Glasgow**.',
      solution: "SELECT s.* FROM Staff s WHERE s.branchNo IN (SELECT branchNo FROM Branch WHERE city = 'Glasgow');" },
    { id: 'r2-s6', realm: 'r2', topic: 'division', title: 'Division with NOT EXISTS', dataset: 'dreamhome', d: 3,
      prompt: 'Find the clientNo of every client who has viewed **all** properties with three rooms.',
      solution: 'SELECT DISTINCT v.clientNo FROM Viewing v WHERE NOT EXISTS (SELECT * FROM PropertyForRent p WHERE p.rooms = 3 AND NOT EXISTS (SELECT * FROM Viewing v2 WHERE v2.clientNo = v.clientNo AND v2.propertyNo = p.propertyNo));',
      hint: 'Division = “there is no three-room property this client has NOT viewed”: a double NOT EXISTS.' },
  ],

  codex: `
## Business rules
- Pattern: **Subject + must/may + verb + object + quantity**; write both directions.
- 7 guidelines: one rule per statement · consistent vocabulary · explicit modals · precise quantities · explicit conditions/exceptions/dates · no implementation detail · testable with examples and counterexamples.
- Types: structural · cardinality · domain/value · derivation · temporal/state · process/authorization.
- Rule (must be true) ≠ assumption (unconfirmed) ≠ problem (needs solving).
- Enforce via constraint, trigger, application, workflow or manual control.

## Relational algebra
| Op | Notation | Note |
|---|---|---|
| Selection | σ p (R) | rows; all attributes kept |
| Projection | π a,b (R) | columns; duplicates removed |
| Union | R ∪ S | union-compatible; ≤ I+J tuples |
| Difference | R − S | in R not S |
| Intersection | R ∩ S | = R − (R − S) |
| Product | R × S | I×J tuples, N+M attributes |
| Theta join | R ⋈F S | = σF(R × S) |
| Natural join | R ⋈ S | common attrs once; degree = N+M−common |
| Left outer | R ⟕ S | unmatched R kept, nulls |
| Semijoin | R ▷F S | = πR(R ⋈F S) |
| Division | R ÷ S | “related to every” |
- Five fundamental: σ, π, ×, ∪, −. Closure: relation in, relation out. Set-at-a-time.
- Algebra procedural; calculus non-procedural; formally equivalent.
`,
}

export default r2
