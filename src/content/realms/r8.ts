import type { RealmContent } from '../types'

// Source: 08_SQL (SQL and Oracle Database; SQL Triggers and Stored Procedures) and
// 11_Lab_Theory_Slides Labs 1–5 (SQL foundations, SELECT & functions, joins & aggregation,
// views & subqueries, PL/SQL procedures & triggers).

const r8: RealmContent = {
  topics: {
    'sql-basics': 'SQL categories & notation', datatypes: 'Oracle datatypes', ddl: 'DDL & constraints', select: 'SELECT, WHERE & functions',
    dml: 'INSERT, UPDATE, DELETE & transactions', aggregation: 'Aggregates, GROUP BY & HAVING', joins: 'Joins', subqueries: 'Subqueries', views: 'Views', plsql: 'PL/SQL, procedures & triggers',
  },
  lessons: [
    {
      id: 'r8-basics', realm: 'r8', title: 'SQL fundamentals and Oracle datatypes', mins: 11,
      src: ['01_COMP2605_SQL_Intro.pdf', 'Lab 01 SQL Foundations'],
      body: `
:::story Mission 8.1: Go live
DreamHome’s design is approved. Now the database must be built and queried, in the language every relational DBMS speaks.
:::

## Structured Query Language
- SQL works on **sets of rows**: one statement can retrieve or change many rows.
- SQL is **declarative**: you describe the required result and the DBMS chooses the execution plan.
- Standards: SQL-86, SQL-92, SQL:1999, SQL:2003 and beyond; vendors add extensions (Oracle adds **PL/SQL** for procedural programming).
- **Execution modes**: interactive (SQL*Plus), application (forms, reports), stored procedural code (PL/SQL), embedded SQL or a database API from a host language (a colon commonly marks a host variable).

## Statement categories
| Category | Purpose | Examples |
|---|---|---|
| **Query & DML** | Retrieve or change table data | SELECT, INSERT, UPDATE, DELETE, MERGE |
| **DDL** | Define or change database objects | CREATE, ALTER, DROP, RENAME, TRUNCATE |
| **Transaction control** | Group and confirm or undo changes | COMMIT, ROLLBACK, SAVEPOINT, SET TRANSACTION |
| **Privilege control (DCL)** | Give or remove access rights | GRANT, REVOKE |

SELECT is often taught separately as **DQL**. Other commands: EXPLAIN PLAN, LOCK TABLE, COMMENT, AUDIT, ALTER SESSION, ALTER SYSTEM.

{{q:r8-category}}

## Notation
Keywords and unquoted identifiers are case-insensitive. Use **single quotes for text** ('COM6') and **double quotes for quoted identifiers or headings** ("Product Code"). A semicolon ends a statement in SQL*Plus.

## Oracle datatypes
| Family | Types |
|---|---|
| Character | **CHAR(n)** (fixed length, space-padded, ≤ 2,000 bytes), **VARCHAR2(n)** (variable length; size required; 4,000 bytes standard), NCHAR, NVARCHAR2, CLOB, NCLOB, LONG |
| Numeric | **NUMBER(p, s)**, FLOAT, BINARY_FLOAT, BINARY_DOUBLE |
| Date/time | **DATE** (year to second, 7 bytes, no fractions or time zone), TIMESTAMP [WITH (LOCAL) TIME ZONE], INTERVAL YEAR TO MONTH, INTERVAL DAY TO SECOND |
| Binary / LOB | RAW, LONG RAW, BLOB, BFILE (locator for an external file) |
| Row identifiers | ROWID, UROWID |

## NUMBER(p, s): precision and scale
Precision **p** = significant digits (1–38); scale **s** = rounding position. NUMBER(p) = NUMBER(p, 0).
| Input | Type | Stored |
|---|---|---|
| 1234.6789 | NUMBER(6,2) | **1234.68** |
| 12345.123 | NUMBER(6,2) | **Error** (more than 4 integer digits) |
| 1234.98 | NUMBER(6) | **1235** |
| 12345.345 | NUMBER(5,-2) | **12300** (negative scale rounds left of the point) |
| 0.0123457 | NUMBER(4,5) | **0.01235** |
| 0.1 | NUMBER(4,5) | **Error** |

{{q:r8-number}}

ANSI names map to Oracle types: VARCHAR(n) → VARCHAR2(n), DECIMAL(p,s) → NUMBER(p,s), INTEGER → NUMBER(38,0). **Phone numbers are text**, because punctuation and leading zeros matter.

{{q:r8-phone}}
`,
    },
    {
      id: 'r8-ddl', realm: 'r8', title: 'DDL: tables, constraints, indexes and sequences', mins: 12,
      src: ['01_COMP2605_SQL_Intro.pdf', 'Lab 01 SQL Foundations'],
      body: `
## Vendor and Product
Vendor.V_Code is the PK of Vendor; Product.P_Code is the PK of Product; **Product.V_Code is a FK to Vendor.V_Code**. Create Vendor first, and insert a vendor before its products.

\`\`\`sql
CREATE TABLE Vendor (
  V_Code    NUMBER(5),
  V_Name    VARCHAR2(25 CHAR) NOT NULL,
  V_Address VARCHAR2(80 CHAR) NOT NULL,
  V_Phone   CHAR(8 CHAR),
  CONSTRAINT Vendor_PK PRIMARY KEY (V_Code)
);
CREATE TABLE Product (
  P_Code     VARCHAR2(8 CHAR),
  P_Descript VARCHAR2(35 CHAR) NOT NULL,
  P_Indate   DATE DEFAULT SYSDATE NOT NULL,
  P_Onhand   NUMBER(6) NOT NULL,
  P_Min      NUMBER(6) DEFAULT 0,
  P_Price    NUMBER(8,2) NOT NULL,
  V_Code     NUMBER(5),
  CONSTRAINT Product_PK PRIMARY KEY (P_Code),
  CONSTRAINT Product_Vendor_FK FOREIGN KEY (V_Code) REFERENCES Vendor(V_Code)
);
\`\`\`

## Integrity constraints
| Constraint | Effect |
|---|---|
| **NOT NULL** | A value is required |
| **UNIQUE** | No duplicate non-null values |
| **PRIMARY KEY** | Unique and non-null; one per table (may be composite: PRIMARY KEY (A, B)) |
| **FOREIGN KEY** | A non-null value must match a parent key |
| **CHECK** | Rejects values that make the condition false |
| **DEFAULT** | Supplies a value when an INSERT omits the column (not a constraint, and it doesn’t replace an explicit NULL) |

**Referential actions (Oracle):** no ON DELETE clause **rejects** deleting a referenced parent; **ON DELETE CASCADE** deletes the children; **ON DELETE SET NULL** nulls the child FK. Oracle has no ON UPDATE CASCADE.

Try the shields on the lecture data:
\`\`\`sql:vendor run
-- Vendor 9999 does not exist
INSERT INTO Product (P_Code, P_Descript, P_Onhand, P_Price, V_Code)
VALUES ('NEW-1', 'Mystery Box', 1, 10.00, 9999);
\`\`\`
\`\`\`sql:vendor run
-- Vendor 3061 still has products, so the default restriction applies
DELETE FROM Vendor WHERE V_Code = 3061;
\`\`\`

{{q:r8-ondelete}}

## CREATE TABLE AS SELECT, ALTER, DROP
\`\`\`sql:vendor run
CREATE TABLE Part AS
  SELECT P_Code AS Part_Code, P_Descript AS Part_Descript, P_Price AS Part_Price FROM Product;
ALTER TABLE Part ADD Part_Reorder CHAR(1) DEFAULT '0';
SELECT * FROM Part;
\`\`\`
- CTAS copies data and derived column definitions but **not all constraints, indexes, triggers or privileges**.
- ALTER TABLE … **MODIFY** changes a column; **ADD** adds columns or constraints (existing data must satisfy them).
- **DROP TABLE** removes the table and its data; **CASCADE CONSTRAINTS** removes FKs that reference it. **Oracle DDL implicitly commits**, so ROLLBACK cannot undo a DROP.

## Indexes
CREATE INDEX Product_Vendor_IX ON Product (V_Code); CREATE UNIQUE INDEX enforces uniqueness. Indexes help frequent filters and joins on small fractions of a table, but cost storage and slow down INSERT, UPDATE and DELETE (see Realm 5).

## Sequences (Lab 1)
A **sequence** is a separate Oracle object that generates numbers. It is not a table, inserts nothing by itself, and is **not gap-free** (rollbacks and caching leave gaps).
\`\`\`sql
CREATE SEQUENCE booking_seq START WITH 100 INCREMENT BY 5;
INSERT INTO booking (booking_id) VALUES (booking_seq.NEXTVAL);  -- 100, then 105, …
SELECT booking_seq.CURRVAL FROM dual;   -- last value this session obtained
\`\`\`

{{q:r8-sequence}}
{{q:r8-ddl-commit}}
`,
    },
    {
      id: 'r8-select', realm: 'r8', title: 'SELECT, WHERE, ORDER BY and single-row functions', mins: 14,
      src: ['01_COMP2605_SQL_Intro.pdf', 'Lab 02 SELECT and Functions'],
      body: `
## The shape of a query
\`\`\`text
SELECT columns / expressions      -- projection (keeps duplicates unless DISTINCT)
FROM   table                      -- row source
WHERE  condition                  -- restriction (row by row)
ORDER BY columns [ASC|DESC]       -- result order (otherwise not guaranteed)
\`\`\`
Logical processing order: **FROM → WHERE → SELECT → ORDER BY**.

\`\`\`sql:vendor run
SELECT P_Code, P_Price FROM Product WHERE V_Code = 3061 ORDER BY P_Price DESC;
\`\`\`

## Conditions
| Operator | Example | Note |
|---|---|---|
| = < <= > >= <> (!=) | V_Code > 4068 | |
| AND / OR / NOT | V_Code = 14021 AND P_Price < 900 | gives Surge Protect |
| **BETWEEN** | P_Price BETWEEN 1000 AND 2000 | **includes both ends**: PRI/XL2, PRI/XG, 2450-6 |
| **IS [NOT] NULL** | P_Min IS NULL | never use = NULL |
| **LIKE** | P_Descript LIKE 'X%' | % = any sequence, _ = exactly one character |
| **IN** | V_Code IN (3061, 4068) | list membership |

\`\`\`sql:vendor run
SELECT P_Code, P_Descript, P_Price FROM Product
WHERE P_Price BETWEEN 1000.00 AND 2000.00 OR P_Descript LIKE 'X_-Printer';
\`\`\`

{{q:r8-between}}
{{q:r8-like}}
{{q:r8-null}}

## DISTINCT, aliases and concatenation
\`\`\`sql:vendor run
SELECT DISTINCT V_Code FROM Product;
\`\`\`
\`\`\`sql:vendor run
SELECT V_Name || ' ' || V_Phone AS "Vendor Details" FROM Vendor;
\`\`\`
Oracle concatenates with **||**. Double-quoted aliases keep spaces and case. In Oracle, **DUAL** evaluates a standalone expression: SELECT 2 * 3 FROM dual.

## Single-row functions (Lab 2 and 3)
| Function | Example | Result |
|---|---|---|
| UPPER / LOWER / INITCAP | INITCAP('data ltd.') | Data Ltd. |
| LENGTH | LENGTH('NewTech') | 7 |
| SUBSTR(s, start, n) | SUBSTR('T-660 Notebook', 1, 5) | T-660 |
| ROUND / TRUNC | ROUND(1234.567, 1) / TRUNC(1234.567, 1) | 1234.6 / 1234.5 |
| NVL(x, y) | NVL(comm, 0) | replaces NULL (types must be compatible) |
| CASE | CASE WHEN P_Onhand <= P_Min THEN 'Reorder' ELSE 'OK' END | categories |
| Dates | SYSDATE, MONTHS_BETWEEN, ADD_MONTHS; date − date = days | compare dates as dates, not as formatted text |

**NULL propagates** through arithmetic: sal + comm is NULL when comm is NULL, so use NVL(comm, 0).

\`\`\`sql:company run
SELECT ename, sal, comm, sal + comm AS raw_total, sal + NVL(comm, 0) AS total_pay,
       CASE WHEN sal >= 3000 THEN 'High' WHEN sal >= 1500 THEN 'Mid' ELSE 'Entry' END AS band
FROM emp ORDER BY sal DESC;
\`\`\`

{{q:r8-nvl}}
`,
    },
    {
      id: 'r8-dml', realm: 'r8', title: 'INSERT, UPDATE, DELETE and transaction control', mins: 8,
      src: ['01_COMP2605_SQL_Intro.pdf', 'Lab 01 SQL Foundations'],
      body: `
## Changing data
\`\`\`sql:vendor run
INSERT INTO Vendor (V_Code, V_Name, V_Address, V_Phone)
VALUES (5000, 'Island Tech', '7 Main Rd, San Fernando, Trinidad', '652-1111');
INSERT INTO Product (P_Code, P_Descript, P_Indate, P_Onhand, P_Min, P_Price, V_Code)
VALUES ('MOU-1', 'Wireless Mouse', DATE '2006-12-01', 40, 10, 99.00, 5000);
SELECT * FROM Product WHERE V_Code = 5000;
\`\`\`
- **List the target columns** so every value has an explicit destination; text in single quotes; omitted columns get their DEFAULT.
- The parent (vendor) must exist **before** the child (product).

\`\`\`sql:vendor run
UPDATE Product SET P_Price = 9500.00 WHERE P_Code = 'COM8';
UPDATE Product SET P_Price = P_Price * 1.10;    -- no WHERE: every row!
SELECT P_Code, P_Price FROM Product;
\`\`\`

\`\`\`sql:vendor run
DELETE FROM Product WHERE P_Price < 1000.00;
SELECT COUNT(*) AS remaining FROM Product;
\`\`\`
DELETE keeps the table definition; without WHERE it deletes every row.

{{q:r8-update-nowhere}}

## COMMIT, ROLLBACK and SAVEPOINT
| Statement | Effect |
|---|---|
| **COMMIT** | End the transaction; make its changes permanent |
| **ROLLBACK** | Undo uncommitted changes; end the transaction |
| **SAVEPOINT name** | Mark a position inside a transaction |
| **ROLLBACK TO name** | Undo changes after the savepoint *without* ending the transaction |

\`\`\`sql:vendor run
BEGIN TRANSACTION;
UPDATE Product SET P_Price = 1.00 WHERE P_Code = 'COM6';
SAVEPOINT before_mass_change;
UPDATE Product SET P_Price = 0;
ROLLBACK TO before_mass_change;
COMMIT;
SELECT P_Code, P_Price FROM Product WHERE P_Code IN ('COM6', 'COM8');
\`\`\`

{{q:r8-savepoint}}
`,
    },
    {
      id: 'r8-agg', realm: 'r8', title: 'Aggregates, GROUP BY, HAVING and joins', mins: 15,
      src: ['01_COMP2605_SQL_Intro.pdf', 'Lab 03 Joins and Aggregation'],
      body: `
## Aggregate functions
| Function | Meaning |
|---|---|
| MIN / MAX | Smallest / largest non-null value |
| SUM / AVG | Total / mean of non-null values |
| COUNT(expr) | Number of **non-null** values |
| COUNT(*) | Number of **rows** |

\`\`\`sql:vendor run
SELECT MAX(P_Price) AS Highest, MIN(P_Price) AS Lowest, SUM(P_Onhand) AS Total_Units,
       SUM(P_Onhand * P_Price) AS Inventory_Value, AVG(P_Price) AS Average_Price
FROM Product;
\`\`\`
Expected (lecture): 10,000 · 199 · 105 · **198,701** · 3,368.375. Inventory value weights each price by its quantity; the average gives every product equal weight.

\`\`\`sql:vendor run
SELECT COUNT(*) AS rows_, COUNT(DISTINCT V_Code) AS vendors,
       (SELECT COUNT(DISTINCT V_Code) FROM Product WHERE P_Price > 2500) AS vendors_over_2500
FROM Product;
\`\`\`

## GROUP BY and HAVING
\`\`\`sql:vendor run
SELECT V_Code, COUNT(P_Code) AS Products, MIN(P_Price) AS Min_Price
FROM Product
GROUP BY V_Code
HAVING MIN(P_Price) < 1000.00;
\`\`\`
| Clause | Filters | When |
|---|---|---|
| **WHERE** | individual rows | **before** grouping |
| **HAVING** | groups | **after** aggregates are computed |

Every non-aggregate column in the SELECT list must appear in GROUP BY. Processing order: FROM/WHERE → GROUP BY → HAVING → SELECT → ORDER BY.

{{q:r8-having}}
{{q:r8-count}}

## Joins
\`\`\`sql:vendor run
SELECT p.P_Descript, v.V_Name
FROM Product p JOIN Vendor v ON p.V_Code = v.V_Code;
\`\`\`
- The **join predicate is not optional**: the comma form FROM Product, Vendor **without** WHERE p.V_Code = v.V_Code produces a **Cartesian product** (8 × 4 = 32 rows).
- Table aliases (p, v) resolve ambiguous names; in Oracle, table aliases omit AS.
- **NATURAL JOIN** derives equality conditions from **all** shared column names. Be careful.

**Self-join**: one table in two roles (employee and manager):
\`\`\`sql:company run
SELECT e.ename AS employee, m.ename AS manager
FROM emp e LEFT JOIN emp m ON e.mgr = m.empno
ORDER BY m.ename;
\`\`\`

**Left outer join**: keep every left row, so departments with no employees still appear:
\`\`\`sql:company run
SELECT d.dname, COUNT(e.empno) AS staff
FROM dept d LEFT JOIN emp e ON e.deptno = d.deptno
GROUP BY d.deptno, d.dname;
\`\`\`
:::warn Two outer-join traps (Lab 3)
1. **Count children, not placeholders**: COUNT(e.empno) gives 0 for OPERATIONS; COUNT(*) would wrongly give 1.
2. **A misplaced filter can undo an outer join**: WHERE e.job = 'CLERK' after a LEFT JOIN removes the null-padded rows; put the condition in the ON clause instead.
:::

{{q:r8-cartesian}}
{{q:r8-outer-count}}
`,
    },
    {
      id: 'r8-sub', realm: 'r8', title: 'Subqueries, EXISTS and top-N', mins: 13,
      src: ['01_COMP2605_SQL_Intro.pdf', 'Lab 04 Views and Subqueries'],
      body: `
## Subquery shapes
| Shape | Use with | Watch out |
|---|---|---|
| One value (one row, one column) | =, <, > … | must really return one row |
| One column, many rows | IN, NOT IN, ANY, ALL | NULLs change the result |
| Several columns | tuple comparison / tuple IN | positions and types must match |
| Rows in FROM | inline view | acts as a named row source |

\`\`\`sql:vendor run
-- One value: the highest-priced product(s); ties would all be returned
SELECT P_Code, P_Price FROM Product WHERE P_Price = (SELECT MAX(P_Price) FROM Product);
\`\`\`
\`\`\`sql:vendor run
-- Many values: products from vendors in Port of Spain (14021 and 4068)
SELECT P_Descript FROM Product
WHERE V_Code IN (SELECT V_Code FROM Vendor WHERE V_Address LIKE '%Port of Spain%');
\`\`\`

## EXISTS and correlated subqueries
\`\`\`sql:vendor run
SELECT v.V_Code, v.V_Name FROM Vendor v
WHERE EXISTS (SELECT 1 FROM Product p WHERE p.V_Code = v.V_Code);
\`\`\`
**EXISTS** is true when the subquery returns at least one row. It is **correlated** because it refers to the outer row v. (EXISTS tests for matching rows; it is not a NULL test.)

## The NOT IN null trap
NOT IN requires **every** inequality to be true. If the subquery returns a **NULL**, the comparison is UNKNOWN and **no rows come back**.
\`\`\`sql:company run
-- emp.mgr contains a NULL (KING), so this returns NOTHING:
SELECT ename FROM emp WHERE empno NOT IN (SELECT mgr FROM emp);
\`\`\`
\`\`\`sql:company run
-- Filter the inner NULLs (or use NOT EXISTS): employees who manage nobody
SELECT ename FROM emp WHERE empno NOT IN (SELECT mgr FROM emp WHERE mgr IS NOT NULL);
\`\`\`

{{q:r8-notin}}
{{q:r8-exists}}

## ANY and ALL
x > ALL (subquery) means greater than every value; x > ANY means greater than at least one. (SQLite lacks ANY/ALL; write them with MAX/MIN, as in the arena.)

## Top-N needs a tie policy (Lab 4)
“Top 3 salaries” can mean **exactly 3 rows** (add a deterministic tie-breaker), the **top 3 distinct values** (may return more rows), or first-N-with-ties. In Oracle you sort in an inline view and filter with **ROWNUM** (or FETCH FIRST n ROWS):
\`\`\`sql
SELECT * FROM (SELECT course_id, fee FROM course ORDER BY fee DESC, course_id)
WHERE ROWNUM <= 3;
\`\`\`
\`\`\`sql:company run
SELECT ename, sal FROM emp ORDER BY sal DESC, empno LIMIT 3;   -- SQLite equivalent
\`\`\`

{{q:r8-topn}}
`,
    },
    {
      id: 'r8-views', realm: 'r8', title: 'Views and access control', mins: 8,
      src: ['01_COMP2605_SQL_Intro.pdf', 'Lab 04 Views and Subqueries'],
      body: `
## A view is a virtual table
A **view** is a **named query** over tables or other views. An ordinary view stores only its **definition**, not a copy of the result; querying it reads the current base data. Views expose selected rows and columns, simplify joins, provide summaries and support access control.

\`\`\`sql:vendor run
CREATE VIEW Product_3 AS
  SELECT P_Descript, P_Onhand, P_Price FROM Product WHERE P_Price > 1000.00;
SELECT P_Descript, P_Price FROM Product_3;          -- six products
\`\`\`
\`\`\`sql:vendor run
CREATE VIEW VendorTotal (V_Code, TotalQty) AS
  SELECT V_Code, SUM(P_Onhand) FROM Product GROUP BY V_Code;
SELECT * FROM VendorTotal;                           -- 3061:17 4068:25 4516:4 14021:59
\`\`\`
\`\`\`sql:vendor run
CREATE VIEW Product_3 AS SELECT P_Descript, P_Onhand, P_Price FROM Product WHERE P_Price > 1000.00;
CREATE VIEW HighProduct AS SELECT P_Descript, P_Price FROM Product_3 WHERE P_Price > 2000.00;
SELECT * FROM HighProduct;                           -- a view built on a view
\`\`\`

## Updating through views
- Some simple views are **updatable**: an UPDATE through the view changes the base table.
- **Aggregate views** (VendorTotal) are not inherently updatable.
- **WITH CHECK OPTION** rejects changes that would make a row disappear from the view.
- **WITH READ ONLY** prohibits changes through the view.

## Privileges
\`\`\`sql
CREATE VIEW Product_ReadOnly AS SELECT P_Code, P_Descript, P_Price FROM Product WITH READ ONLY;
GRANT SELECT ON Product_ReadOnly TO Reporting_User;
REVOKE SELECT ON Product_ReadOnly FROM Reporting_User;
\`\`\`
Views plus privileges give **controlled access**, and they can isolate applications from some changes to the underlying tables.

{{q:r8-view-store}}
{{q:r8-checkoption}}
`,
    },
    {
      id: 'r8-plsql', realm: 'r8', title: 'PL/SQL: blocks, procedures and triggers', mins: 15,
      src: ['02_COMP2605_SQL_Triggers_Stored_Procedures.pdf', 'Lab 05 PL/SQL Procedures and Triggers'],
      body: `
## Procedural SQL
SQL describes *what*; procedural extensions add **variables, decisions and loops**. **PL/SQL** is Oracle’s procedural extension.
| Module | How it starts |
|---|---|
| **Trigger** | The DBMS invokes it **automatically** when its event occurs |
| **Stored procedure** | A client, application or program **calls it by name** |

## Anonymous blocks (Lab 5)
\`\`\`plsql
DECLARE
  v_capacity  NUMBER := 40;
  c_minimum   CONSTANT NUMBER := 20;          -- a constant cannot be reassigned
  v_building  room.building_code%TYPE;        -- same type as the column
BEGIN
  SELECT building_code INTO v_building FROM room WHERE room_id = 12;
  IF v_capacity < c_minimum THEN
    v_capacity := c_minimum;
  ELSIF v_capacity < 60 THEN                  -- ELSIF, not ELSEIF
    DBMS_OUTPUT.PUT_LINE('Medium room in ' || v_building);
  ELSE
    DBMS_OUTPUT.PUT_LINE('Large room');
  END IF;
EXCEPTION
  WHEN NO_DATA_FOUND THEN DBMS_OUTPUT.PUT_LINE('No such room');
END;
/
\`\`\`
- Assignment is **:=**; the **/** on its own line submits the block (a client instruction).
- **SET SERVEROUTPUT ON** (a client command) shows DBMS_OUTPUT text.
- **SELECT INTO is a contract for exactly one row**: no rows raises **NO_DATA_FOUND**; more than one raises **TOO_MANY_ROWS**.

{{q:r8-selectinto}}

## Stored procedures
\`\`\`plsql
CREATE OR REPLACE PROCEDURE product_sale (
  p_prod_code IN VARCHAR2,      -- no length in parameter declarations
  p_qty_sold  IN NUMBER         -- IN is the default mode
) AS
BEGIN
  UPDATE Product SET P_Onhand = P_Onhand - p_qty_sold WHERE P_Code = p_prod_code;
END;
/
EXECUTE product_sale('PRI/XL2', 12);
\`\`\`
Local variables go after AS/IS and before BEGIN. Calling a procedure **does not commit**; the caller decides. Compilation and execution are separate stages.

## Triggers
- A **DML trigger** responds to INSERT, UPDATE or DELETE.
- **Statement trigger**: fires once per statement. **Row trigger** (**FOR EACH ROW**): fires once per affected row.
- **BEFORE / AFTER** timing; a trigger runs **in the same transaction** (AFTER ≠ after COMMIT).
- **UPDATE OF col** limits the event to those columns; OR combines events.

| Event | :OLD | :NEW |
|---|---|---|
| INSERT | NULL | incoming value |
| UPDATE | before | after |
| DELETE | before | NULL |
A BEFORE row trigger may assign to :NEW (not :OLD).

**The reorder rule:** P_Reorder = 1 when P_Onhand ≤ P_Min, else 0.
\`\`\`plsql
CREATE OR REPLACE TRIGGER trg_product_reorder
BEFORE INSERT OR UPDATE OF P_Onhand, P_Min ON Product
FOR EACH ROW
BEGIN
  IF :NEW.P_Onhand <= :NEW.P_Min THEN :NEW.P_Reorder := 1;
  ELSE :NEW.P_Reorder := 0;
  END IF;
END;
/
\`\`\`
The lecture’s first version was a **statement** trigger (AFTER … UPDATE Product SET P_Reorder = 1 WHERE P_Onhand <= P_Min), which only ever **sets** flags and never resets them. The row trigger handles both states.

**Run it.** SQLite’s trigger syntax drops the colons and only has row triggers, but the logic is the same:
\`\`\`sql:vendor run
CREATE TRIGGER trg_product_reorder
AFTER UPDATE OF P_Onhand, P_Min ON Product
FOR EACH ROW
BEGIN
  UPDATE Product SET P_Reorder = CASE WHEN NEW.P_Onhand <= NEW.P_Min THEN 1 ELSE 0 END
  WHERE P_Code = NEW.P_Code;
END;
UPDATE Product SET P_Onhand = P_Onhand - 5 WHERE P_Code = 'PRI/XL2';      -- 14 → 9 (≤ 10)
SELECT P_Code, P_Onhand, P_Min, P_Reorder FROM Product WHERE P_Code = 'PRI/XL2';
\`\`\`

**Procedure + trigger together:** product_sale('PRI/XL2', 12) on 19 items: UPDATE to 7; the row trigger sees 7 ≤ 10 and sets P_Reorder = 1; the caller commits or rolls back.

{{q:r8-trigger-kind}}
{{q:r8-old-new}}
{{q:r8-reorder}}
`,
    },
  ],

  questions: [
    { id: 'r8-category', realm: 'r8', topic: 'sql-basics', kind: 'match', d: 1,
      q: 'Match each statement to its category.',
      pairs: [['CREATE TABLE', 'DDL'], ['UPDATE', 'DML'], ['SAVEPOINT', 'Transaction control'], ['GRANT', 'Privilege control (DCL)']],
      explain: 'Oracle also classifies GRANT/REVOKE as DDL, but they are usually taught as DCL.' },
    { id: 'r8-number', realm: 'r8', topic: 'datatypes', kind: 'mcq', d: 2,
      q: 'What is stored when 1234.6789 is inserted into a NUMBER(6,2) column?',
      options: ['1234.6789', '1234.68', '1234.67', 'Error'], answer: 1,
      explain: 'Scale 2 rounds to two decimals; 4 integer digits + 2 decimals fit precision 6.' },
    { id: 'r8-phone', realm: 'r8', topic: 'datatypes', kind: 'mcq', d: 1,
      q: 'Which type suits V_Phone values like 628-4598 or 0141-339-2178?',
      options: ['NUMBER(8)', 'CHAR or VARCHAR2', 'DATE', 'FLOAT'], answer: 1,
      explain: 'Phone numbers are text: punctuation and leading zeros matter, and nobody does arithmetic on them.' },
    { id: 'r8-ondelete', realm: 'r8', topic: 'ddl', kind: 'match', d: 2,
      q: 'Product.V_Code references Vendor. Match each FK definition to what happens when a vendor with products is deleted.',
      pairs: [['No ON DELETE clause', 'The delete is rejected'], ['ON DELETE CASCADE', 'The vendor’s products are deleted too'], ['ON DELETE SET NULL', 'Those products get V_Code = NULL']],
      explain: 'Oracle’s default is restriction; it has no ON UPDATE CASCADE.' },
    { id: 'r8-sequence', realm: 'r8', topic: 'ddl', kind: 'num', d: 2,
      q: 'CREATE SEQUENCE booking_seq START WITH 100 INCREMENT BY 5. What does the third call to booking_seq.NEXTVAL return?',
      answer: 110, explain: '100, 105, 110. Sequences allocate values; rolled-back values are not returned, so gaps are normal.' },
    { id: 'r8-ddl-commit', realm: 'r8', topic: 'ddl', kind: 'tf', d: 2,
      q: 'In Oracle, you can undo a completed DROP TABLE with ROLLBACK.',
      answer: false, explain: 'Oracle DDL causes an implicit commit.' },
    { id: 'r8-between', realm: 'r8', topic: 'select', kind: 'multi', d: 2,
      q: 'Which products satisfy P_Price BETWEEN 1000.00 AND 2000.00? (Prices: COM6 8000, COM8 10000, PRI/XL2 2000, PRI/XG 1599, CDR-R 2999, 2348 199, 2450-6 1500, NET-100 650.)',
      options: ['PRI/XL2', 'PRI/XG', '2450-6', 'NET-100', 'CDR-R'], answer: [0, 1, 2],
      explain: 'BETWEEN includes both boundaries, so 2000 is included.' },
    { id: 'r8-like', realm: 'r8', topic: 'select', kind: 'mcq', d: 1,
      q: 'Which description matches the pattern \'X_-Printer\'?',
      options: ['XL2-Printer', 'XG-Printer', 'Printer', 'XGG-Printer'], answer: 1,
      explain: '_ matches exactly one character: X, G, then -Printer.' },
    { id: 'r8-null', realm: 'r8', topic: 'select', kind: 'mcq', d: 1,
      q: 'How do you find products with no minimum recorded?',
      options: ['WHERE P_Min = NULL', 'WHERE P_Min IS NULL', 'WHERE P_Min = 0', 'WHERE NOT EXISTS P_Min'], answer: 1,
      explain: 'Comparisons with = NULL are never true; use IS NULL.' },
    { id: 'r8-nvl', realm: 'r8', topic: 'select', kind: 'mcq', d: 2,
      q: 'In EMP, SMITH has sal = 800 and comm = NULL. What is sal + comm?',
      options: ['800', '0', 'NULL', 'An error'], answer: 2,
      explain: 'NULL propagates through arithmetic; use sal + NVL(comm, 0).' },
    { id: 'r8-update-nowhere', realm: 'r8', topic: 'dml', kind: 'mcq', d: 1,
      q: 'What does UPDATE Product SET P_Price = P_Price * 1.10; do?',
      options: ['Nothing without WHERE', 'Raises an error', 'Increases every product’s price by 10%', 'Updates the first row only'], answer: 2,
      explain: 'Without WHERE, UPDATE applies to all rows.' },
    { id: 'r8-savepoint', realm: 'r8', topic: 'dml', kind: 'tf', d: 2,
      q: 'ROLLBACK TO a savepoint undoes the changes made after it and also ends the transaction.',
      answer: false, explain: 'ROLLBACK TO keeps the transaction open; a plain ROLLBACK ends it.' },
    { id: 'r8-having', realm: 'r8', topic: 'aggregation', kind: 'mcq', d: 2,
      q: 'Which clause keeps only vendors whose cheapest product costs under 1000?',
      options: ['WHERE MIN(P_Price) < 1000', 'HAVING MIN(P_Price) < 1000', 'GROUP BY P_Price < 1000', 'ORDER BY MIN(P_Price)'], answer: 1,
      explain: 'Aggregates cannot appear in WHERE; HAVING filters groups after aggregation (vendors 4068 and 14021).' },
    { id: 'r8-count', realm: 'r8', topic: 'aggregation', kind: 'match', d: 2,
      q: 'Product has 8 rows from 4 vendors; 2 vendors have a product over 2,500. Match each query to its result.',
      pairs: [['SELECT COUNT(*) FROM Product', '8'], ['SELECT COUNT(DISTINCT V_Code) FROM Product', '4'], ['… COUNT(DISTINCT V_Code) … WHERE P_Price > 2500', '2']],
      explain: 'COUNT(*) counts rows; COUNT(DISTINCT x) counts distinct non-null values.' },
    { id: 'r8-cartesian', realm: 'r8', topic: 'joins', kind: 'num', d: 2,
      q: 'SELECT * FROM Product, Vendor with no WHERE clause. Product has 8 rows and Vendor 4. How many rows come back?',
      answer: 32, explain: 'Omitting the join predicate gives a Cartesian product: 8 × 4.' },
    { id: 'r8-outer-count', realm: 'r8', topic: 'joins', kind: 'mcq', d: 3,
      q: 'dept LEFT JOIN emp, GROUP BY department. Why use COUNT(e.empno) instead of COUNT(*)?',
      options: ['COUNT(*) is slower', 'COUNT(*) counts the null-padded placeholder row, giving 1 for an empty department', 'COUNT(e.empno) includes NULLs', 'They are identical'], answer: 1,
      explain: 'Count children, not outer-join placeholders: OPERATIONS should show 0.' },
    { id: 'r8-notin', realm: 'r8', topic: 'subqueries', kind: 'mcq', d: 3,
      q: 'SELECT ename FROM emp WHERE empno NOT IN (SELECT mgr FROM emp) returns no rows, because…',
      options: ['Every employee is a manager', 'The subquery contains a NULL (KING has no manager), so every NOT IN comparison is unknown', 'NOT IN is not valid SQL', 'empno is the primary key'], answer: 1,
      explain: 'Filter inner NULLs (WHERE mgr IS NOT NULL) or use NOT EXISTS.' },
    { id: 'r8-exists', realm: 'r8', topic: 'subqueries', kind: 'mcq', d: 2,
      q: 'In SELECT v.V_Name FROM Vendor v WHERE EXISTS (SELECT 1 FROM Product p WHERE p.V_Code = v.V_Code), the subquery is…',
      options: ['Uncorrelated', 'Correlated: it refers to the outer row v', 'A view', 'An inline view'], answer: 1,
      explain: 'EXISTS is true when the correlated subquery returns at least one row.' },
    { id: 'r8-topn', realm: 'r8', topic: 'subqueries', kind: 'mcq', d: 3,
      q: 'In Oracle, why must ORDER BY be in an inline view when filtering with ROWNUM <= 3?',
      options: ['ROWNUM only works on views', 'ROWNUM is assigned before ORDER BY at the same level, so sort first, then limit', 'ORDER BY is not allowed with WHERE', 'It is optional'], answer: 1,
      explain: 'Sort in the inner query, filter ROWNUM in the outer query, and state your tie policy.' },
    { id: 'r8-view-store', realm: 'r8', topic: 'views', kind: 'tf', d: 1,
      q: 'An ordinary view stores a separate copy of its query result.',
      answer: false, explain: 'It stores only its definition; querying it reads the current base data.' },
    { id: 'r8-checkoption', realm: 'r8', topic: 'views', kind: 'match', d: 2,
      q: 'Match each view clause to its effect.',
      pairs: [['WITH CHECK OPTION', 'Rejects changes that would move a row out of the view'], ['WITH READ ONLY', 'Prohibits changes through the view'], ['GRANT SELECT ON view', 'Lets a user query the view']],
      explain: 'Views plus privileges support controlled access.' },
    { id: 'r8-selectinto', realm: 'r8', topic: 'plsql', kind: 'match', d: 2,
      q: 'SELECT … INTO in PL/SQL: match the query result to the behaviour.',
      pairs: [['Exactly one row', 'Assigns the values to the variables'], ['No rows', 'Raises NO_DATA_FOUND'], ['More than one row', 'Raises TOO_MANY_ROWS']],
      explain: 'SELECT INTO is a contract for exactly one row.' },
    { id: 'r8-trigger-kind', realm: 'r8', topic: 'plsql', kind: 'mcq', d: 2,
      q: 'An UPDATE changes 5 product rows. How many times does a FOR EACH ROW trigger fire, and how many times does a statement trigger fire?',
      options: ['5 and 5', '1 and 5', '5 and 1', '1 and 1'], answer: 2,
      explain: 'Row triggers fire per affected row; statement triggers once per triggering statement.' },
    { id: 'r8-old-new', realm: 'r8', topic: 'plsql', kind: 'mcq', d: 2,
      q: 'In a row trigger for DELETE, what are :OLD and :NEW?',
      options: [':OLD = NULL, :NEW = the row', ':OLD = the deleted row’s values, :NEW = NULL', 'Both hold the row', 'Both are NULL'], answer: 1,
      explain: 'INSERT: OLD null, NEW incoming. UPDATE: OLD before, NEW after. DELETE: OLD before, NEW null.' },
    { id: 'r8-reorder', realm: 'r8', topic: 'plsql', kind: 'mcq', d: 3,
      q: 'PRI/XL2 has 19 on hand, P_Min = 10, P_Reorder = 0. With the row trigger installed, EXECUTE product_sale(\'PRI/XL2\', 12) runs. What is the result?',
      options: ['P_Onhand 7, P_Reorder 0', 'P_Onhand 7, P_Reorder 1', 'P_Onhand 19, P_Reorder 1', 'Error: procedures cannot fire triggers'], answer: 1,
      explain: 'The procedure’s UPDATE leaves 7; the BEFORE row trigger sees 7 ≤ 10 and sets the flag. Nothing is committed until the caller commits.' },
    { id: 'r8-declarative', realm: 'r8', topic: 'sql-basics', kind: 'tf', d: 1,
      q: 'SQL is declarative: the query states the required result, and the DBMS chooses how to execute it.',
      answer: true, explain: 'The query processor parses, validates, optimizes and executes it.' },
    { id: 'r8-where-having', realm: 'r8', topic: 'aggregation', kind: 'order', d: 2,
      q: 'Order the logical processing of a grouped query.',
      items: ['FROM / WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY'],
      explain: 'Rows are filtered, grouped, groups filtered, then projected and sorted.' },
  ],

  written: [
    { id: 'r8-w1', realm: 'r8', topic: 'ddl', marks: 8,
      q: 'Write Oracle CREATE TABLE statements for Vendor(V_Code, V_Name, V_Address, V_Phone) and Product(P_Code, P_Descript, P_Indate, P_Onhand, P_Min, P_Price, V_Code) with appropriate datatypes, primary keys, the foreign key, NOT NULL constraints and defaults. Explain the effect of adding ON DELETE CASCADE.',
      model: 'CREATE TABLE Vendor (V_Code NUMBER(5), V_Name VARCHAR2(25) NOT NULL, V_Address VARCHAR2(80) NOT NULL, V_Phone CHAR(8), CONSTRAINT Vendor_PK PRIMARY KEY (V_Code)); CREATE TABLE Product (P_Code VARCHAR2(8), P_Descript VARCHAR2(35) NOT NULL, P_Indate DATE DEFAULT SYSDATE NOT NULL, P_Onhand NUMBER(6) NOT NULL, P_Min NUMBER(6) DEFAULT 0, P_Price NUMBER(8,2) NOT NULL, V_Code NUMBER(5), CONSTRAINT Product_PK PRIMARY KEY (P_Code), CONSTRAINT Product_Vendor_FK FOREIGN KEY (V_Code) REFERENCES Vendor(V_Code)); Vendor must be created first. Without an ON DELETE clause, deleting a vendor that still has products is rejected; with ON DELETE CASCADE, deleting the vendor also deletes its products.',
      points: ['Vendor table with sensible types', 'Vendor PK constraint', 'Product table with sensible types (NUMBER(8,2) price, DATE)', 'Product PK constraint', 'FK references Vendor', 'NOT NULL on required columns', 'DEFAULT SYSDATE / DEFAULT 0', 'ON DELETE CASCADE explained vs default restriction'] },
    { id: 'r8-w2', realm: 'r8', topic: 'aggregation', marks: 6,
      q: 'Using Product, write SQL to (a) list each vendor code with its number of products and minimum price, only for vendors that supply at least one product below 1,000; (b) list product descriptions with vendor names. Explain the difference between WHERE and HAVING.',
      model: '(a) SELECT V_Code, COUNT(P_Code) AS Products, MIN(P_Price) AS Min_Price FROM Product GROUP BY V_Code HAVING MIN(P_Price) < 1000.00; gives 4068 (1, 650) and 14021 (3, 199). (b) SELECT p.P_Descript, v.V_Name FROM Product p JOIN Vendor v ON p.V_Code = v.V_Code; WHERE filters individual rows before grouping; HAVING filters groups after aggregate values are computed. An aggregate condition such as MIN(P_Price) < 1000 must go in HAVING.',
      points: ['GROUP BY V_Code', 'COUNT and MIN', 'HAVING MIN(P_Price) < 1000', 'Correct join with predicate', 'WHERE explained', 'HAVING explained'] },
    { id: 'r8-w3', realm: 'r8', topic: 'plsql', marks: 8,
      q: 'Distinguish triggers from stored procedures. Write a PL/SQL row trigger that maintains P_Reorder (1 when P_Onhand ≤ P_Min, else 0) and a procedure product_sale(p_prod_code, p_qty_sold). Explain what happens when product_sale(\'PRI/XL2\', 12) is executed on 19 items with P_Min = 10.',
      model: 'A trigger is invoked automatically by the DBMS when its event (INSERT/UPDATE/DELETE) occurs; a stored procedure is called explicitly by name. CREATE OR REPLACE TRIGGER trg_product_reorder BEFORE INSERT OR UPDATE OF P_Onhand, P_Min ON Product FOR EACH ROW BEGIN IF :NEW.P_Onhand <= :NEW.P_Min THEN :NEW.P_Reorder := 1; ELSE :NEW.P_Reorder := 0; END IF; END; / CREATE OR REPLACE PROCEDURE product_sale (p_prod_code IN VARCHAR2, p_qty_sold IN NUMBER) AS BEGIN UPDATE Product SET P_Onhand = P_Onhand - p_qty_sold WHERE P_Code = p_prod_code; END; / Executing it updates P_Onhand from 19 to 7; the UPDATE fires the row trigger, which sees 7 ≤ 10 and sets P_Reorder = 1 before the row is stored. Neither commits; the caller decides.',
      points: ['Trigger vs procedure distinction', 'Row-level trigger (FOR EACH ROW)', 'BEFORE … UPDATE OF columns', 'Uses :NEW and := correctly', 'Procedure with IN parameters', 'UPDATE in procedure body', 'Result 7 and flag 1', 'No implicit commit'] },
  ],

  cards: [
    { id: 'r8-c1', realm: 'r8', front: 'SQL statement categories', back: 'DML/query (SELECT, INSERT, UPDATE, DELETE, MERGE); DDL (CREATE, ALTER, DROP, RENAME, TRUNCATE); transaction control (COMMIT, ROLLBACK, SAVEPOINT); DCL (GRANT, REVOKE).' },
    { id: 'r8-c2', realm: 'r8', front: 'CHAR vs VARCHAR2', back: 'CHAR: fixed length, space-padded, max 2,000 bytes. VARCHAR2: variable length, size required, max 4,000 bytes (standard).' },
    { id: 'r8-c3', realm: 'r8', front: 'NUMBER(p, s)', back: 'p = significant digits (1–38); s = rounding position. NUMBER(6,2): 1234.6789 → 1234.68; 12345.123 → error.' },
    { id: 'r8-c4', realm: 'r8', front: 'Oracle DATE', back: 'Year, month, day, hour, minute, second (7 bytes); no fractional seconds or time zone; use DATE literals or TO_DATE with a format.' },
    { id: 'r8-c5', realm: 'r8', front: 'Five constraints', back: 'NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY, CHECK (+ DEFAULT supplies values).' },
    { id: 'r8-c6', realm: 'r8', front: 'ON DELETE options', back: 'None: reject. CASCADE: delete children. SET NULL: null the child FK.' },
    { id: 'r8-c7', realm: 'r8', front: 'Sequence', back: 'Separate object generating numbers: START WITH, INCREMENT BY, NEXTVAL, CURRVAL; not gap-free.' },
    { id: 'r8-c8', realm: 'r8', front: 'BETWEEN / LIKE wildcards', back: 'BETWEEN includes both ends. LIKE: % any sequence, _ exactly one character.' },
    { id: 'r8-c9', realm: 'r8', front: 'NULL rules', back: 'Test with IS NULL; NULL propagates in arithmetic (use NVL); aggregates ignore NULLs except COUNT(*).' },
    { id: 'r8-c10', realm: 'r8', front: 'WHERE vs HAVING', back: 'WHERE filters rows before grouping; HAVING filters groups after aggregation.' },
    { id: 'r8-c11', realm: 'r8', front: 'Cartesian product trap', back: 'A comma join without a join predicate returns every combination (8 × 4 = 32).' },
    { id: 'r8-c12', realm: 'r8', front: 'Outer join traps', back: 'Count children (COUNT(child.key)), not placeholders; put child filters in ON, not WHERE.' },
    { id: 'r8-c13', realm: 'r8', front: 'NOT IN null trap', back: 'A NULL in the subquery makes NOT IN return no rows; filter NULLs or use NOT EXISTS.' },
    { id: 'r8-c14', realm: 'r8', front: 'View', back: 'A named stored query (virtual table). WITH CHECK OPTION / WITH READ ONLY; aggregate views not updatable.' },
    { id: 'r8-c15', realm: 'r8', front: 'PL/SQL block', back: 'DECLARE … BEGIN … EXCEPTION … END; / ; := assigns; %TYPE copies a column type; DBMS_OUTPUT.PUT_LINE prints.' },
    { id: 'r8-c16', realm: 'r8', front: 'SELECT INTO contract', back: 'One row: assigns. None: NO_DATA_FOUND. Many: TOO_MANY_ROWS.' },
    { id: 'r8-c17', realm: 'r8', front: 'Trigger vs stored procedure', back: 'Trigger: invoked automatically by an event. Procedure: called by name. Neither commits by itself.' },
    { id: 'r8-c18', realm: 'r8', front: ':OLD and :NEW', back: 'INSERT: null / new. UPDATE: before / after. DELETE: before / null. BEFORE row triggers can assign :NEW.' },
  ],

  terms: [
    { term: 'SQL', def: 'Structured Query Language: declarative, set-based language for relational databases.', realm: 'r8' },
    { term: 'DDL', def: 'Data Definition Language: CREATE, ALTER, DROP, RENAME, TRUNCATE.', realm: 'r8' },
    { term: 'DML', def: 'Data Manipulation Language: SELECT, INSERT, UPDATE, DELETE, MERGE.', realm: 'r8' },
    { term: 'DCL', def: 'Privilege control: GRANT and REVOKE.', realm: 'r8' },
    { term: 'VARCHAR2', def: 'Oracle variable-length character type; size required.', realm: 'r8' },
    { term: 'NUMBER(p,s)', def: 'Oracle numeric type with precision p and scale s.', realm: 'r8' },
    { term: 'CHECK constraint', def: 'Rejects values for which the declared condition is false.', realm: 'r8' },
    { term: 'ON DELETE CASCADE', def: 'Deleting a parent row deletes its referencing child rows.', realm: 'r8' },
    { term: 'Sequence', def: 'Oracle object that generates numeric values (NEXTVAL, CURRVAL).', realm: 'r8' },
    { term: 'Aggregate function', def: 'Summarises many rows: COUNT, SUM, AVG, MIN, MAX.', realm: 'r8' },
    { term: 'GROUP BY', def: 'Forms one result row per group of equal values.', realm: 'r8' },
    { term: 'HAVING', def: 'Filters groups after aggregation.', realm: 'r8' },
    { term: 'Self-join', def: 'A join of a table with itself in two roles.', realm: 'r8' },
    { term: 'Correlated subquery', def: 'A subquery that refers to the current row of the outer query.', realm: 'r8' },
    { term: 'Inline view', def: 'A subquery used as a row source in FROM.', realm: 'r8' },
    { term: 'View', def: 'A named query treated as a virtual table.', realm: 'r8' },
    { term: 'WITH CHECK OPTION', def: 'Prevents changes through a view that would make rows leave it.', realm: 'r8' },
    { term: 'PL/SQL', def: 'Oracle’s procedural extension to SQL.', realm: 'r8' },
    { term: 'Anonymous block', def: 'An unnamed PL/SQL block submitted for one-off execution.', realm: 'r8' },
    { term: 'Stored procedure', def: 'A named, parameterised PL/SQL program stored in the database.', realm: 'r8' },
    { term: 'Trigger', def: 'PL/SQL invoked automatically on a database event.', realm: 'r8' },
    { term: 'Row trigger', def: 'A trigger declared FOR EACH ROW that fires once per affected row.', realm: 'r8' },
  ],

  sql: [
    { id: 'r8-s1', realm: 'r8', topic: 'select', title: 'Vendor 3061’s products', dataset: 'vendor', d: 1,
      prompt: 'List P_Code and P_Price for products supplied by vendor **3061**, cheapest first.', solution: 'SELECT P_Code, P_Price FROM Product WHERE V_Code = 3061 ORDER BY P_Price;', ordered: true },
    { id: 'r8-s2', realm: 'r8', topic: 'select', title: 'Mid-range products', dataset: 'vendor', d: 1,
      prompt: 'List the P_Code of every product priced **from 1,000 to 2,000 inclusive**.', solution: 'SELECT P_Code FROM Product WHERE P_Price BETWEEN 1000 AND 2000;' },
    { id: 'r8-s3', realm: 'r8', topic: 'select', title: 'Pattern match', dataset: 'vendor', d: 1,
      prompt: 'List P_Descript and P_Price for products whose description **starts with X**.', solution: "SELECT P_Descript, P_Price FROM Product WHERE P_Descript LIKE 'X%';" },
    { id: 'r8-s4', realm: 'r8', topic: 'select', title: 'Cheap surge protection', dataset: 'vendor', d: 1,
      prompt: 'List P_Descript and P_Onhand for products from vendor **14021** that cost **less than 900**.', solution: 'SELECT P_Descript, P_Onhand FROM Product WHERE V_Code = 14021 AND P_Price < 900;' },
    { id: 'r8-s5', realm: 'r8', topic: 'aggregation', title: 'Inventory summary', dataset: 'vendor', d: 2,
      prompt: 'In one row, return the highest price, lowest price, total units on hand, total inventory value (units × price) and average price.',
      solution: 'SELECT MAX(P_Price), MIN(P_Price), SUM(P_Onhand), SUM(P_Onhand * P_Price), AVG(P_Price) FROM Product;' },
    { id: 'r8-s6', realm: 'r8', topic: 'aggregation', title: 'Cheapest per vendor', dataset: 'vendor', d: 2,
      prompt: 'For each vendor code, give the minimum product price (columns V_Code, Min_Price).', solution: 'SELECT V_Code, MIN(P_Price) AS Min_Price FROM Product GROUP BY V_Code;' },
    { id: 'r8-s7', realm: 'r8', topic: 'aggregation', title: 'HAVING a bargain', dataset: 'vendor', d: 2,
      prompt: 'List V_Code, number of products and minimum price for vendors that supply **at least one product below 1,000**.',
      solution: 'SELECT V_Code, COUNT(P_Code), MIN(P_Price) FROM Product GROUP BY V_Code HAVING MIN(P_Price) < 1000;' },
    { id: 'r8-s8', realm: 'r8', topic: 'subqueries', title: 'Most expensive product', dataset: 'vendor', d: 2,
      prompt: 'Using a subquery, list P_Code and P_Price of the product(s) with the **highest price**.', solution: 'SELECT P_Code, P_Price FROM Product WHERE P_Price = (SELECT MAX(P_Price) FROM Product);' },
    { id: 'r8-s9', realm: 'r8', topic: 'subqueries', title: 'Port of Spain suppliers', dataset: 'vendor', d: 2,
      prompt: 'List the descriptions of products supplied by vendors whose address contains **Port of Spain**.',
      solution: "SELECT P_Descript FROM Product WHERE V_Code IN (SELECT V_Code FROM Vendor WHERE V_Address LIKE '%Port of Spain%');" },
    { id: 'r8-s10', realm: 'r8', topic: 'joins', title: 'Products with vendor names', dataset: 'vendor', d: 1,
      prompt: 'List every product description with its vendor’s name.', solution: 'SELECT p.P_Descript, v.V_Name FROM Product p JOIN Vendor v ON p.V_Code = v.V_Code;' },
    { id: 'r8-s11', realm: 'r8', topic: 'views', title: 'Create a summary view', dataset: 'vendor', d: 2,
      prompt: 'Create a view **VendorTotal(V_Code, TotalQty)** giving the total units on hand per vendor. (The checker queries the view.)',
      solution: 'CREATE VIEW VendorTotal (V_Code, TotalQty) AS SELECT V_Code, SUM(P_Onhand) FROM Product GROUP BY V_Code;',
      check: 'SELECT V_Code, TotalQty FROM VendorTotal ORDER BY V_Code;' },
    { id: 'r8-s12', realm: 'r8', topic: 'plsql', title: 'Reorder trigger', dataset: 'vendor', d: 3,
      prompt: 'Create a SQLite trigger **trg_reorder** that, after P_Onhand or P_Min is updated, sets P_Reorder to 1 when P_Onhand ≤ P_Min and 0 otherwise. (The checker sells 5 PRI/XL2 and restocks 2348, then reads the flags.)',
      solution: 'CREATE TRIGGER trg_reorder AFTER UPDATE OF P_Onhand, P_Min ON Product FOR EACH ROW BEGIN UPDATE Product SET P_Reorder = CASE WHEN NEW.P_Onhand <= NEW.P_Min THEN 1 ELSE 0 END WHERE P_Code = NEW.P_Code; END;',
      check: "UPDATE Product SET P_Onhand = P_Onhand - 5 WHERE P_Code = 'PRI/XL2'; UPDATE Product SET P_Onhand = 5 WHERE P_Code = '2348'; UPDATE Product SET P_Onhand = 40 WHERE P_Code = '2348'; SELECT P_Code, P_Onhand, P_Reorder FROM Product WHERE P_Code IN ('PRI/XL2', '2348') ORDER BY P_Code;",
      hint: 'SQLite uses NEW.col (no colon) and BEGIN … END; inside the trigger. Use a CASE expression in an UPDATE.' },
    { id: 'r8-s13', realm: 'r8', topic: 'joins', title: 'Employees and managers', dataset: 'company', d: 2,
      prompt: 'Self-join emp: list each employee’s ename and their manager’s ename, **including KING** (who has no manager, so show NULL).',
      solution: 'SELECT e.ename, m.ename FROM emp e LEFT JOIN emp m ON e.mgr = m.empno;' },
    { id: 'r8-s14', realm: 'r8', topic: 'joins', title: 'Head count per department', dataset: 'company', d: 3,
      prompt: 'List every department’s dname with its number of employees, **showing 0** for empty departments.',
      solution: 'SELECT d.dname, COUNT(e.empno) FROM dept d LEFT JOIN emp e ON e.deptno = d.deptno GROUP BY d.deptno, d.dname;',
      hint: 'LEFT JOIN from dept and count a child column, not *.' },
    { id: 'r8-s15', realm: 'r8', topic: 'subqueries', title: 'Above average earners', dataset: 'company', d: 2,
      prompt: 'List ename and sal of employees earning **more than the average salary**.', solution: 'SELECT ename, sal FROM emp WHERE sal > (SELECT AVG(sal) FROM emp);' },
    { id: 'r8-s16', realm: 'r8', topic: 'subqueries', title: 'Empty departments', dataset: 'company', d: 2,
      prompt: 'Using NOT EXISTS, list the dname of departments with **no employees**.',
      solution: 'SELECT d.dname FROM dept d WHERE NOT EXISTS (SELECT 1 FROM emp e WHERE e.deptno = d.deptno);' },
    { id: 'r8-s17', realm: 'r8', topic: 'subqueries', title: 'Non-managers (NULL-safe)', dataset: 'company', d: 3,
      prompt: 'List the ename of every employee who manages **nobody**. Beware the NULL in emp.mgr!',
      solution: 'SELECT ename FROM emp WHERE empno NOT IN (SELECT mgr FROM emp WHERE mgr IS NOT NULL);' },
    { id: 'r8-s18', realm: 'r8', topic: 'subqueries', title: 'Top 3 earners', dataset: 'company', d: 2,
      prompt: 'Return exactly three rows: ename and sal of the highest earners, highest first, breaking ties by empno.',
      solution: 'SELECT ename, sal FROM emp ORDER BY sal DESC, empno LIMIT 3;', ordered: true, hint: 'ORDER BY sal DESC, empno then LIMIT 3 (Oracle: ROWNUM over a sorted inline view).' },
    { id: 'r8-s19', realm: 'r8', topic: 'joins', title: 'Salary grades', dataset: 'company', d: 3,
      prompt: 'Non-equi join: list each employee’s ename, sal and salary **grade** from salgrade (sal BETWEEN losal AND hisal).',
      solution: 'SELECT e.ename, e.sal, s.grade FROM emp e JOIN salgrade s ON e.sal BETWEEN s.losal AND s.hisal;' },
    { id: 'r8-s20', realm: 'r8', topic: 'aggregation', title: 'Departments with high payroll', dataset: 'company', d: 2,
      prompt: 'List deptno and total salary for departments whose total salary **exceeds 9,000**.',
      solution: 'SELECT deptno, SUM(sal) FROM emp GROUP BY deptno HAVING SUM(sal) > 9000;' },
  ],

  codex: `
## SQL map
DML (SELECT INSERT UPDATE DELETE MERGE) · DDL (CREATE ALTER DROP RENAME TRUNCATE; Oracle DDL auto-commits) · TC (COMMIT ROLLBACK SAVEPOINT) · DCL (GRANT REVOKE).

## Types
CHAR(n) fixed · VARCHAR2(n) variable · NUMBER(p,s) (6,2: 1234.6789→1234.68) · DATE (to the second) · TIMESTAMP · CLOB/BLOB · phone numbers = text.

## DDL
\`\`\`sql
CREATE TABLE Product (P_Code VARCHAR2(8) PRIMARY KEY, P_Price NUMBER(8,2) NOT NULL CHECK (P_Price > 0),
  P_Min NUMBER(6) DEFAULT 0, V_Code NUMBER(5) REFERENCES Vendor(V_Code) ON DELETE CASCADE);
CREATE SEQUENCE s START WITH 100 INCREMENT BY 5;  -- s.NEXTVAL / s.CURRVAL
\`\`\`

## SELECT
FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. BETWEEN inclusive · LIKE % _ · IS NULL · IN · DISTINCT · || · NVL · CASE.
WHERE = rows before grouping; HAVING = groups after. COUNT(*) counts rows; COUNT(col) counts non-nulls.

## Joins & subqueries
Always give a join predicate (no predicate = Cartesian). LEFT JOIN + COUNT(child.key). Self-join for managers.
= (single value) · IN / ANY / ALL (column) · EXISTS (correlated) · **NOT IN + NULL = no rows**. Top-N: sort inner, ROWNUM outer.

## Views
Stored query; CHECK OPTION; READ ONLY; aggregate views not updatable; GRANT SELECT ON view.

## PL/SQL
DECLARE / BEGIN / EXCEPTION / END; / · := · %TYPE · CONSTANT · IF/ELSIF/ELSE · SELECT INTO = exactly one row (NO_DATA_FOUND / TOO_MANY_ROWS).
Procedure: called by name (IN params, no lengths). Trigger: automatic; row (FOR EACH ROW) vs statement; BEFORE/AFTER; :OLD/:NEW.
`,
}

export default r8
