import type { RealmContent } from '../types'

// Source: 04_Functional_Dependencies_and_Normalization (FD & Normalization Part 1; FD and Normalization
// handout; Normalization Part 2 (corrected); Normalization handout; Multivalued/Repeating Groups;
// Normalization Worksheet (Connolly & Begg 14.14–14.20) + worked solutions; tasks & practice solutions).

const r4: RealmContent = {
  topics: {
    anomalies: 'Update anomalies', fds: 'Functional dependencies', 'partial-transitive': 'Partial & transitive dependencies',
    '1nf': 'UNF → 1NF (repeating groups)', '2nf': 'Second normal form', '3nf': 'Third normal form', process: 'Normalization process & purpose',
  },
  lessons: [
    {
      id: 'r4-anomalies', realm: 'r4', title: 'Redundancy and the three update anomalies', mins: 9,
      src: ['01_COMP2605_Functional_Dependency_and_Normalization_Part_1.pdf', '02_FD_and_Normalization.pdf'],
      body: `
:::story Mission 4.1: The Anomaly Golem
The registry keeps one big table of students, courses and grades. Every time someone types a course title, the Golem grows a new, slightly different copy of it.
:::

## Why normalize?
**Normalization** is a design technique that begins by examining the relationships between attributes, called **functional dependencies**, and applies a series of tests, the **normal forms**, to find the optimal grouping of attributes into a set of suitable relations. Basically it **removes certain types of redundancy**, because redundancy causes **update anomalies**. The goal is to store data in **at most one place**, allowing some **controlled redundancy** (foreign keys).

## The student table (Figure 1)
| StudentId | StudentName | CourseId | CourseTitle | Credits | Grade |
|---|---|---|---|---|---|
| 98710 | Mike Aladdin | COMP420 | Database Systems | 4 | A |
| 98710 | Mike Aladdin | COMP325 | Software Engineering | 4 | C |
| 98710 | Mike Aladdin | COMP480 | Advanced Programming | 3 | B |
| 85871 | David Brown | COMP325 | Software Engineering | 4 | B |
| 85871 | David Brown | COMP370 | Computer Graphics | 2 | A |
| 88701 | Roger Flo | COMP420 | Database Systems | 4 | B |
| 98733 | Randy Martin | COMP420 | Database Systems | 4 | A |
| 98733 | Jack Smith | COMP455 | Analysis of Algorithms | 4 | C |

| Anomaly | What goes wrong in this table |
|---|---|
| **Insertion** | Recording that 85871 took COMP420 means re-typing the name, title and credits. A slip (“DB Systems”, 3 credits) leaves COMP420 with **two titles or two credit values**. |
| **Deletion** | Deleting Jack Smith deletes **everything known about COMP455**, because he was its only student. |
| **Update** | Changing Database Systems to 3 credits in **only some** rows leaves the table inconsistent. The credit should be stored in one place only. |

{{w:anomaly-lab}}

{{q:r4-anomaly-match}}
{{q:r4-deletion}}
`,
    },
    {
      id: 'r4-fd', realm: 'r4', title: 'Functional dependencies, partial and transitive', mins: 10,
      src: ['01_COMP2605_Functional_Dependency_and_Normalization_Part_1.pdf', '02_FD_and_Normalization.pdf'],
      body: `
## Functional dependency
:::def
For a table R with attributes A and B, **B is functionally dependent on A** (written **A → B**) if and only if, **for each value of A, no more than one value of B is associated**. A *determines* B. A and B can be sets of attributes.
:::
If several rows share the same A value, they all have the same B value. From Figure 1:
- **StudentId → StudentName**
- **CourseId → CourseTitle, Credits** (shorthand for CourseId → CourseTitle and CourseId → Credits)
- **(StudentId, CourseId) → Grade**

:::warn FDs come from the real world
How to find FDs is subjective, but they **must reflect the real-world situation**, not just today’s sample. Two students who happen to share a name don’t make StudentName a determinant of anything.
:::

{{q:r4-fd-def}}

## Partial dependency
Only possible with a **composite primary key**. If the key is (A, B) → C, but one **part** of the key determines an attribute (**A → C**), then A → C is a **partial dependency**.

Figure 1 has key (StudentId, CourseId), and both **StudentId → StudentName** and **CourseId → CourseTitle, Credits** are partial.

## Transitive dependency
With primary key A, if a **non-prime** attribute B determines another non-prime attribute C (**B → C**), then C depends on A *through* B: a **transitive dependency** (A → B → C).

Example: Course(CourseId, CourseTitle, DeptId, DeptName) has **DeptId → DeptName**.

{{w:fd-classifier}}

{{q:r4-partial}}
{{q:r4-transitive}}
`,
    },
    {
      id: 'r4-1nf', realm: 'r4', title: 'UNF to 1NF: removing repeating groups', mins: 11,
      src: ['03_COMP2605_Normalization_Part_2_Corrected.pdf', '05_COMP2605_Multivalued_Repeating_Groups_Student.pdf'],
      body: `
## The normal forms
Each stage removes one kind of dependency: **UNF** (repeating groups) → **1NF** (atomic values) → **2NF** (no partial dependencies) → **3NF** (no transitive dependencies). Forms run from 1NF to 5NF; in practice 1NF–3NF are common, 4NF occasional, 5NF rare. For the relational model **only 1NF is critical**; the rest are optional, but proceeding to **at least 3NF** is recommended to avoid update anomalies.

Normalization is **bottom-up**: it takes attributes from sample forms, writes them as an **unnormalized table (UNF)**, then applies each normal form in turn.

## Definitions
- **UNF**: a table that contains one or more **repeating groups**.
- **1NF**: a relation in which the intersection of each row and column contains **one and only one value**.
- **Repeating group**: an attribute or group of attributes that occurs with **multiple values for a single occurrence of the nominated key**.

:::key Multi-valued attribute vs repeating group
A **multi-valued attribute** is the conceptual property (a student has several phone numbers). A **repeating group** is how it shows up in an unnormalized table: Phone1/Phone2/Phone3 columns, Skill1/Skill2/Skill3, Author1/Author2, a comma-separated list, or nested arrays.
:::

{{q:r4-repeating}}

## Two approaches
| | Approach 1: flatten | Approach 2: separate |
|---|---|---|
| How | Fill the blanks by **duplicating the non-repeating data** in each row; extend the key | Move the repeating data, **with a copy of the original key**, into a separate relation (repeat for nested groups) |
| Result | One 1NF relation, **more redundancy** | Two or more relations, **less redundancy**, further along the process |

Whichever approach you take, you reach **the same set of 3NF relations**.

## DreamHome ClientRental (UNF)
Key **clientNo**; repeating group **(propertyNo, pAddress, rentStart, rentFinish, rent, ownerNo, oName)**: John Kay rented PG4 and PG16; Aline Stewart rented PG4, PG36 and PG16.

- **Approach 1:** ClientRental(**clientNo, propertyNo**, cName, pAddress, rentStart, rentFinish, rent, ownerNo, oName), which is in 1NF but full of redundancy.
- **Approach 2:** Client(**clientNo**, cName) and PropertyRentalOwner(**clientNo, propertyNo**, pAddress, rentStart, rentFinish, rent, ownerNo, oName).

{{q:r4-approach}}

## Lecture tasks
- *When checking for 1NF, what are you doing?* Checking that **every attribute holds a single value**: no multi-valued attributes or repeating groups.
- *SCHOOL BUILDING (code, name, address, classroom): in 1NF?* No. A building has **many** classrooms, so classroom is multi-valued. Move it to a CLASSROOM entity.
- *STUDENT … subject; SHOPPING MALL … store name, store floor*: subject and the store attributes are multi-valued.
`,
    },
    {
      id: 'r4-2nf3nf', realm: 'r4', title: '1NF → 2NF → 3NF', mins: 14,
      src: ['02_FD_and_Normalization.pdf', '03_COMP2605_Normalization_Part_2_Corrected.pdf', '04_Normalization.pdf'],
      body: `
## Second normal form
:::def 2NF
A relation is in 2NF if it is in 1NF and **every non-primary-key attribute is fully functionally dependent on the (whole) primary key**, i.e. there are **no partial dependencies**.
:::
- 2NF can only be violated when the key is **composite**. A relation with a single-attribute key is automatically in at least 2NF.
- **Procedure:** for R(A, B, C, D) with key (A, B) and partial dependency A → D, replace R with **R1(A, D)** (key A) and **R2(A, B, C)** (key (A, B)), where A in R2 is a **foreign key** to R1. In words: *place the partially dependent attribute(s) in a new relation together with a copy of their determinant.*

**Figure 1 → 2NF:**
\`\`\`text
Student   (StudentId, StudentName)
Course    (CourseId, CourseTitle, Credits)
Enrolment (StudentId*, CourseId*, Grade)
\`\`\`

## Third normal form
:::def 3NF
A relation is in 3NF if it is in 1NF and 2NF and **no non-primary-key attribute is transitively dependent** on the primary key.
:::
- **Procedure:** for R(A, B, C) with key A and transitive dependency B → C, replace R with **R1(B, C)** (key B) and **R2(A, B)** (key A), where B is a foreign key to R1.
- Course(CourseId, CourseTitle, DeptId, DeptName) with DeptId → DeptName gives **Course(CourseId, CourseTitle, DeptId)** and **Department(DeptId, DeptName)**.

{{q:r4-2nf-def}}
{{q:r4-auto2nf}}

## The full DreamHome walk-through
**1NF:** ClientRental(clientNo, propertyNo, cName, pAddress, rentStart, rentFinish, rent, ownerNo, oName)

**Dependencies:**
- clientNo → cName *(partial)*
- propertyNo → pAddress, rent, ownerNo, oName *(partial)*
- ownerNo → oName *(transitive, inside the property group)*
- (clientNo, propertyNo) → rentStart, rentFinish *(full)*

Changing PG4’s rent means updating two tuples, which is the update anomaly caused by the partial dependency.

**2NF:** Client(clientNo, cName) · Rental(clientNo, propertyNo, rentStart, rentFinish) · PropertyOwner(propertyNo, pAddress, rent, ownerNo, oName)

Updating Tony Shaw’s name (CO93) still means changing two PropertyOwner tuples, which is the transitive dependency propertyNo → ownerNo → oName.

**3NF:**
\`\`\`text
Client          (clientNo, cName)
Rental          (clientNo*, propertyNo*, rentStart, rentFinish)
PropertyForRent (propertyNo, pAddress, rent, ownerNo*)
Owner           (ownerNo, oName)
\`\`\`
The original relation can be **recreated by joining** the four through their PK/FK links: the decomposition is a series of relational algebra **projections** (π clientNo, cName → Client; …), and nothing is lost.

{{w:clientrental-forge}}

{{q:r4-clientrental}}
{{q:r4-3nf-why}}

## Purpose and benefits
A suitable set of relations has the **minimal number of attributes** needed, **closely related attributes** (FDs) in the same relation, and **minimal redundancy** (except foreign keys needed for joins). Benefits: easier for users to access and maintain the data, and minimal storage.

:::exam Lecture Task 5
CLASS ENROLLMENT resolves STUDENT–CLASS. If it holds attributes that depend on only one part of its composite key (e.g. a class name that depends on the class id alone), it **violates 2NF**: move them to CLASS (or STUDENT).
:::

:::tip Practise
The [Normalization Forge](#/tools/forge) lets you split real tables from these lectures one dependency at a time, while the anomaly meter falls to zero.
:::
`,
    },
  ],

  questions: [
    { id: 'r4-anomaly-match', realm: 'r4', topic: 'anomalies', kind: 'match', d: 1,
      q: 'Match each event in the student table to the anomaly it illustrates.',
      pairs: [['Typing “DB Systems, 3 credits” when adding 85871 to COMP420', 'Insertion anomaly'], ['Deleting Jack Smith loses all data on COMP455', 'Deletion anomaly'], ['Changing COMP420 credits in only some rows', 'Update anomaly']],
      explain: 'All three come from storing course facts once per enrolment instead of once per course.' },
    { id: 'r4-deletion', realm: 'r4', topic: 'anomalies', kind: 'mcq', d: 2,
      q: 'Why does deleting Jack Smith remove all information about COMP455?',
      options: ['Because COMP455 is the primary key', 'Because course facts are stored only in enrolment rows, and his was the only COMP455 row', 'Because of referential integrity', 'Because grades are derived'], answer: 1,
      explain: 'Course facts depend on CourseId alone but are stored with the enrolment; separate the Course relation and the fact survives.' },
    { id: 'r4-fd-def', realm: 'r4', topic: 'fds', kind: 'mcq', d: 1,
      q: 'A → B holds when…',
      options: ['Each value of B is associated with exactly one value of A', 'Each value of A is associated with no more than one value of B', 'A and B are both keys', 'A appears before B in the table'], answer: 1,
      explain: 'A determines B: rows that agree on A must agree on B.' },
    { id: 'r4-partial', realm: 'r4', topic: 'partial-transitive', kind: 'mcq', d: 2,
      q: 'Enrolment table with PK (StudentId, CourseId). Which dependency is **partial**?',
      options: ['(StudentId, CourseId) → Grade', 'CourseId → CourseTitle', 'DeptId → DeptName', 'StudentId → StudentId'], answer: 1,
      explain: 'CourseId is only part of the composite key, yet determines CourseTitle.' },
    { id: 'r4-transitive', realm: 'r4', topic: 'partial-transitive', kind: 'mcq', d: 2,
      q: 'PropertyOwner(propertyNo, pAddress, rent, ownerNo, oName) with PK propertyNo. Which dependency is **transitive**?',
      options: ['propertyNo → rent', 'ownerNo → oName', 'propertyNo → ownerNo', '(propertyNo, ownerNo) → oName'], answer: 1,
      explain: 'ownerNo is a non-prime attribute determining another non-prime attribute: propertyNo → ownerNo → oName.' },
    { id: 'r4-repeating', realm: 'r4', topic: '1nf', kind: 'multi', d: 1,
      q: 'Which of these are **repeating groups** in an unnormalized table? Select all.',
      options: ['Phone1, Phone2, Phone3 for one student', 'SPORT_1/PRICE_1, SPORT_2/PRICE_2', 'A comma-separated list of allergies in one cell', 'A single DOB column', 'Author1, Author2, Author3 in one book row'], answer: [0, 1, 2, 4],
      explain: 'Each stores several values of the same fact for one key occurrence. DOB is single-valued.' },
    { id: 'r4-approach', realm: 'r4', topic: '1nf', kind: 'tf', d: 2,
      q: 'Approach 1 (flattening) and Approach 2 (separating) lead to different final 3NF designs, so you must use the one taught in class.',
      answer: false, explain: 'Both reach the same 3NF relations. Flattening just starts with more redundancy.' },
    { id: 'r4-2nf-def', realm: 'r4', topic: '2nf', kind: 'mcq', d: 1,
      q: 'A relation is in 2NF when it is in 1NF and…',
      options: ['it has no transitive dependencies', 'every non-key attribute is fully functionally dependent on the whole primary key', 'it has a single-attribute key', 'it has no nulls'], answer: 1,
      explain: '2NF removes partial dependencies on part of a composite key.' },
    { id: 'r4-auto2nf', realm: 'r4', topic: '2nf', kind: 'tf', d: 1,
      q: 'A 1NF relation whose primary key is a single attribute is automatically in at least 2NF.',
      answer: true, explain: 'A partial dependency needs a proper part of a composite key, and a single attribute has none.' },
    { id: 'r4-clientrental', realm: 'r4', topic: '3nf', kind: 'multi', d: 3,
      q: 'Which relations appear in the **3NF** decomposition of ClientRental? Select all.',
      options: ['Client(clientNo, cName)', 'Rental(clientNo, propertyNo, rentStart, rentFinish)', 'PropertyOwner(propertyNo, pAddress, rent, ownerNo, oName)', 'PropertyForRent(propertyNo, pAddress, rent, ownerNo)', 'Owner(ownerNo, oName)'], answer: [0, 1, 3, 4],
      explain: 'PropertyOwner is the 2NF relation; it still has ownerNo → oName, so it splits into PropertyForRent and Owner.' },
    { id: 'r4-3nf-why', realm: 'r4', topic: '3nf', kind: 'mcq', d: 2,
      q: 'In the 2NF relation PropertyOwner, updating Tony Shaw’s name requires changing two tuples. Which normal form fixes this, and by doing what?',
      options: ['1NF, by flattening', '2NF, by removing partial dependencies', '3NF, by moving oName into Owner(ownerNo, oName)', 'It cannot be fixed'], answer: 2,
      explain: 'Place transitively dependent attributes in a new relation with a copy of their determinant.' },
    { id: 'r4-procedure-2nf', realm: 'r4', topic: '2nf', kind: 'mcq', d: 2,
      q: 'R(A, B, C, D), PK (A, B), partial dependency A → D. The lecture procedure replaces R with…',
      options: ['R1(A, B) and R2(C, D)', 'R1(A, D) with key A, and R2(A, B, C) with key (A, B), where A is a FK', 'R1(A, B, D) and R2(C)', 'R1(D) and R2(A, B, C)'], answer: 1,
      explain: 'Copy the determinant into a new relation with its dependents; leave the determinant in the original as a foreign key.' },
    { id: 'r4-procedure-3nf', realm: 'r4', topic: '3nf', kind: 'mcq', d: 2,
      q: 'Course(CourseId, CourseTitle, DeptId, DeptName) with DeptId → DeptName becomes…',
      options: ['Course(CourseId, CourseTitle) and Department(DeptId, DeptName)', 'Course(CourseId, CourseTitle, DeptId) and Department(DeptId, DeptName)', 'Course(CourseId, DeptName) and Department(DeptId, CourseTitle)', 'No change: it is already 3NF'], answer: 1,
      explain: 'DeptId stays in Course as a foreign key so the original can be rebuilt by a join.' },
    { id: 'r4-only1nf', realm: 'r4', topic: 'process', kind: 'mcq', d: 2,
      q: 'Which normal form is **critical** for a relation to exist in the relational model, and which is generally recommended?',
      options: ['3NF critical; 5NF recommended', '1NF critical; at least 3NF recommended', '2NF critical; 4NF recommended', 'None are critical'], answer: 1,
      explain: 'All relations must be in 1NF (one value per cell); proceeding to 3NF avoids the update anomalies.' },
    { id: 'r4-bottom-up', realm: 'r4', topic: 'process', kind: 'order', d: 1,
      q: 'Order the bottom-up normalization workflow.',
      items: ['Sample forms', 'Table format (UNF)', '1NF', '2NF', '3NF relations'],
      explain: 'Attributes are extracted from sample forms into an unnormalized table, then refined form by form.' },
    { id: 'r4-key-flat', realm: 'r4', topic: '1nf', kind: 'mcq', d: 2,
      q: 'After flattening ClientRental (Approach 1), what is the primary key of the 1NF relation?',
      options: ['clientNo', 'propertyNo', '(clientNo, propertyNo)', 'ownerNo'], answer: 2,
      explain: 'The key is extended: a client rents several properties and a property is rented by several clients.' },
    { id: 'r4-sports', realm: 'r4', topic: '3nf', kind: 'mcq', d: 2,
      q: 'The sports flat file (STUDENT_ID, SPORT_1, PRICE_1, SPORT_2, PRICE_2) normalizes to…',
      options: ['Student(studentId, sport1, sport2)', 'Student(studentId, …), Sport(sportId, name, price), Participation(studentId, sportId, …)', 'One table with columns SPORT and PRICE only', 'Sport(sportId, studentId, price)'], answer: 1,
      explain: 'Price depends on the sport alone (sport → price), and the student–sport fact is many-to-many, giving three relations.' },
    { id: 'r4-school-building', realm: 'r4', topic: '1nf', kind: 'tf', d: 1,
      q: 'SCHOOL BUILDING(code {PK}, name, address, classroom) is in 1NF, given that a building contains many classrooms.',
      answer: false, explain: 'classroom is multi-valued for one building; move it to its own entity.' },
    { id: 'r4-lossless', realm: 'r4', topic: 'process', kind: 'mcq', d: 3,
      q: 'Why can ClientRental be reconstructed exactly from Client, Rental, PropertyForRent and Owner?',
      options: ['Because each split kept a copy of the determinant as a primary-key/foreign-key link, so joining the projections loses nothing', 'Because the tables are small', 'Because SQL stores deleted rows', 'Because 3NF forbids nulls'], answer: 0,
      explain: 'Normalization decomposes with projections; the common attributes determine one side of each split, so the natural join rebuilds the original tuples.' },
    { id: 'r4-identify-fd-count', realm: 'r4', topic: 'partial-transitive', kind: 'num', d: 3,
      q: 'ClientRental 1NF: how many of these are **partial** dependencies? (1) clientNo → cName (2) propertyNo → pAddress, rent, ownerNo, oName (3) ownerNo → oName (4) (clientNo, propertyNo) → rentStart, rentFinish',
      answer: 2, explain: '(1) and (2) are partial; (3) is transitive; (4) is a full dependency on the whole key.' },
  ],

  written: [
    { id: 'r4-w1', realm: 'r4', topic: 'anomalies', marks: 6,
      q: 'Using the student table (StudentId, StudentName, CourseId, CourseTitle, Credits, Grade), describe the insertion, deletion and update anomalies with a concrete example of each, and explain their cause in terms of functional dependencies.',
      model: 'Insertion: recording that 85871 has taken COMP420 means repeating the student name, course title and credits; a mistake (e.g. “DB Systems”, 3 credits) gives COMP420 two titles/credit values. Deletion: deleting Jack Smith removes all data about COMP455 because he was its only student. Update: changing Database Systems to 3 credits in only some rows leaves the table inconsistent. Cause: the table’s key is (StudentId, CourseId), but partial dependencies exist: StudentId → StudentName and CourseId → CourseTitle, Credits. Facts about students and courses are stored once per enrolment rather than once per student/course.',
      points: ['Insertion anomaly with example', 'Deletion anomaly with example (COMP455)', 'Update anomaly with example', 'Identifies composite key (StudentId, CourseId)', 'Identifies partial dependencies', 'Explains redundancy as root cause'] },
    { id: 'r4-w2', realm: 'r4', topic: '3nf', marks: 10,
      q: 'Normalize the DreamHome ClientRental relation (clientNo, cName, propertyNo, pAddress, rentStart, rentFinish, rent, ownerNo, oName) from 1NF to 3NF. State the primary key, all functional dependencies, and the relations at each stage, with keys and foreign keys.',
      model: '1NF key: (clientNo, propertyNo). FDs: clientNo → cName (partial); propertyNo → pAddress, rent, ownerNo, oName (partial); ownerNo → oName (transitive); (clientNo, propertyNo) → rentStart, rentFinish (full). 2NF (remove partial dependencies by moving dependents with a copy of their determinant): Client(clientNo, cName); Rental(clientNo, propertyNo, rentStart, rentFinish) with clientNo and propertyNo as FKs; PropertyOwner(propertyNo, pAddress, rent, ownerNo, oName). 3NF (remove ownerNo → oName): PropertyForRent(propertyNo, pAddress, rent, ownerNo) with ownerNo FK to Owner(ownerNo, oName). Final: Client, Rental, PropertyForRent, Owner; the original can be rebuilt by joining on clientNo, propertyNo and ownerNo.',
      points: ['Correct 1NF composite key', 'clientNo → cName identified as partial', 'propertyNo → … identified as partial', 'ownerNo → oName identified as transitive', 'Full dependency for rentStart/rentFinish', '2NF relations correct', 'PropertyOwner recognised as not 3NF', '3NF relations correct', 'Keys underlined / FKs identified', 'States lossless reconstruction by join'] },
    { id: 'r4-w3', realm: 'r4', topic: '1nf', marks: 6,
      q: 'Define UNF, 1NF and repeating group. Explain the two approaches for removing repeating groups, and compare them.',
      model: 'UNF: a table containing one or more repeating groups. 1NF: a relation in which the intersection of every row and column contains one and only one value. A repeating group is an attribute or group of attributes occurring with multiple values for a single occurrence of the nominated key. Approach 1 (flattening) fills the empty columns by duplicating the non-repeating data in each row, extending the key; it introduces more redundancy. Approach 2 places the repeating data with a copy of the original key in a separate relation (applied repeatedly for nested groups); it produces less redundancy and moves further toward 3NF. Both give atomic values and the same final 3NF relations.',
      points: ['UNF defined', '1NF defined', 'Repeating group defined', 'Approach 1 explained', 'Approach 2 explained', 'Comparison: redundancy, same final 3NF'] },
  ],

  cards: [
    { id: 'r4-c1', realm: 'r4', front: 'Normalization', back: 'A technique that examines functional dependencies and applies normal-form tests to find suitable relations, removing redundancy that causes update anomalies.' },
    { id: 'r4-c2', realm: 'r4', front: 'Insertion anomaly', back: 'Adding data requires re-entering repeated facts, risking inconsistency (COMP420 typed as “DB Systems, 3 credits”).' },
    { id: 'r4-c3', realm: 'r4', front: 'Deletion anomaly', back: 'Deleting a row loses other facts (delete Jack Smith, lose COMP455).' },
    { id: 'r4-c4', realm: 'r4', front: 'Update anomaly', back: 'A change applied to only some copies leaves the data inconsistent.' },
    { id: 'r4-c5', realm: 'r4', front: 'Functional dependency A → B', back: 'For each value of A, no more than one value of B is associated. Must reflect the real world.' },
    { id: 'r4-c6', realm: 'r4', front: 'Partial dependency', back: 'Part of a composite primary key determines a non-key attribute: (A,B) is the key and A → C.' },
    { id: 'r4-c7', realm: 'r4', front: 'Transitive dependency', back: 'A non-prime attribute determines another non-prime attribute: A → B → C, with A the key.' },
    { id: 'r4-c8', realm: 'r4', front: 'UNF', back: 'A table with one or more repeating groups.' },
    { id: 'r4-c9', realm: 'r4', front: '1NF', back: 'Every row-column intersection holds one and only one value (no repeating groups).' },
    { id: 'r4-c10', realm: 'r4', front: '2NF', back: '1NF + every non-key attribute fully dependent on the whole primary key (no partial dependencies).' },
    { id: 'r4-c11', realm: 'r4', front: '3NF', back: '2NF + no non-key attribute transitively dependent on the primary key.' },
    { id: 'r4-c12', realm: 'r4', front: 'Approach 1 vs Approach 2 (UNF → 1NF)', back: '1: flatten (duplicate data, extend key; more redundancy). 2: separate the repeating group with a copy of the key (less redundancy). Same final 3NF.' },
    { id: 'r4-c13', realm: 'r4', front: '2NF procedure', back: 'R(A,B,C,D), key (A,B), A → D gives R1(A, D) + R2(A, B, C); A in R2 is an FK.' },
    { id: 'r4-c14', realm: 'r4', front: '3NF procedure', back: 'R(A,B,C), key A, B → C gives R1(B, C) + R2(A, B); B in R2 is an FK.' },
    { id: 'r4-c15', realm: 'r4', front: 'ClientRental in 3NF', back: 'Client(clientNo, cName); Rental(clientNo, propertyNo, rentStart, rentFinish); PropertyForRent(propertyNo, pAddress, rent, ownerNo); Owner(ownerNo, oName).' },
    { id: 'r4-c16', realm: 'r4', front: 'Characteristics of suitable relations', back: 'Minimal attributes; closely related attributes (FDs) together; minimal redundancy except foreign keys.' },
    { id: 'r4-c17', realm: 'r4', front: 'Multi-valued attribute vs repeating group', back: 'Multi-valued: the conceptual property (many phones). Repeating group: how it appears in a table (Phone1, Phone2…).' },
  ],

  terms: [
    { term: 'Normalization', def: 'Removing redundancy by decomposing relations according to functional dependencies.', realm: 'r4' },
    { term: 'Update anomaly', def: 'Inconsistency arising when only some copies of a repeated fact are changed.', realm: 'r4' },
    { term: 'Insertion anomaly', def: 'Problem adding data because facts must be repeated or are missing.', realm: 'r4' },
    { term: 'Deletion anomaly', def: 'Loss of unrelated facts when a row is deleted.', realm: 'r4' },
    { term: 'Functional dependency', def: 'A → B: each A value is associated with at most one B value.', realm: 'r4' },
    { term: 'Determinant', def: 'The left-hand side of a functional dependency.', realm: 'r4' },
    { term: 'Partial dependency', def: 'Dependency of a non-key attribute on part of a composite key.', realm: 'r4' },
    { term: 'Transitive dependency', def: 'Dependency of a non-key attribute on another non-key attribute.', realm: 'r4' },
    { term: 'Full functional dependency', def: 'Dependency on the whole key and on no proper part of it.', realm: 'r4' },
    { term: 'Repeating group', def: 'Attribute(s) with multiple values for one occurrence of the key.', realm: 'r4' },
    { term: 'UNF', def: 'Unnormalized form: a table with repeating groups.', realm: 'r4' },
    { term: '1NF', def: 'One value at every row–column intersection.', realm: 'r4' },
    { term: '2NF', def: '1NF with no partial dependencies.', realm: 'r4' },
    { term: '3NF', def: '2NF with no transitive dependencies.', realm: 'r4' },
    { term: 'Lossless decomposition', def: 'A split whose relations can be joined back to the original without losing or inventing tuples.', realm: 'r4' },
  ],

  sql: [
    { id: 'r4-s1', realm: 'r4', topic: '1nf', title: 'Flatten a repeating group', dataset: 'sports', d: 2,
      prompt: 'StudentSportsFlat has the repeating group (sport1, price1, sport2, price2). Produce its **1NF flattening**: one row per (studentId, sport, price), omitting empty slots.',
      solution: 'SELECT studentId, sport1 AS sport, price1 AS price FROM StudentSportsFlat WHERE sport1 IS NOT NULL UNION ALL SELECT studentId, sport2, price2 FROM StudentSportsFlat WHERE sport2 IS NOT NULL;',
      hint: 'UNION ALL two SELECTs, one per slot, filtering out NULL slots.' },
    { id: 'r4-s2', realm: 'r4', topic: '3nf', title: 'Reconstruct by joining', dataset: 'sports', d: 2,
      prompt: 'Show the decomposition is lossless: join Student, Participation and Sport to list studentId, studentName, sport and price for every participation.',
      solution: 'SELECT s.studentId, s.studentName, p.sport, sp.price FROM Student s JOIN Participation p ON s.studentId = p.studentId JOIN Sport sp ON sp.sport = p.sport;' },
    { id: 'r4-s3', realm: 'r4', topic: 'anomalies', title: 'No more deletion anomaly', dataset: 'sports', d: 1,
      prompt: 'Golf has no participants, yet its price survives in the normalized design. List every sport (sport, price) that **nobody** participates in.',
      solution: 'SELECT sport, price FROM Sport WHERE sport NOT IN (SELECT sport FROM Participation);' },
    { id: 'r4-s4', realm: 'r4', topic: '3nf', title: 'Update once', dataset: 'sports', d: 2,
      prompt: 'Raise the price of Tennis to 175 in the normalized design with **one** UPDATE. (The checker then reads every Tennis price.)',
      solution: "UPDATE Sport SET price = 175 WHERE sport = 'Tennis';",
      check: "SELECT s.studentId, sp.price FROM Participation s JOIN Sport sp ON sp.sport = s.sport WHERE s.sport = 'Tennis';" },
  ],

  codex: `
## Anomalies (student table)
Insertion (retype course facts, risk “DB Systems, 3”) · Deletion (delete Jack Smith, lose COMP455) · Update (change credits in only some rows). Cause: partial/transitive dependencies.

## Dependencies
- **A → B**: each A value has at most one B value (real-world meaning, not sample luck).
- **Partial**: key (A, B), A → C. Only possible with a composite key.
- **Transitive**: key A, non-key B → non-key C.

## Normal forms
| Form | Rule | Fix |
|---|---|---|
| UNF | has repeating groups | — |
| 1NF | one value per cell | flatten (extend key) or separate (copy key to child) |
| 2NF | no partial dependencies | move dependents + copy of determinant to new relation |
| 3NF | no transitive dependencies | move dependents + copy of determinant to new relation |
- Single-attribute key ⇒ already 2NF. 1NF critical; 3NF recommended.

## ClientRental → 3NF
\`\`\`text
Client(clientNo, cName)
Rental(clientNo*, propertyNo*, rentStart, rentFinish)
PropertyForRent(propertyNo, pAddress, rent, ownerNo*)
Owner(ownerNo, oName)
\`\`\`
Lossless: rebuild with joins on clientNo, propertyNo, ownerNo (decomposition = projections).
`,
}

export default r4
