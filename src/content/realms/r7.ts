import type { RealmContent } from '../types'

// Source: 07_Transactions_Concurrency_and_Deadlocks (Transaction Management; Transaction Processing
// (illustrated); Transaction Practical; Transaction Log & Recovery notes; Concurrency & Deadlock (revised);
// Deadlocks (combined, updated)).

const r7: RealmContent = {
  topics: {
    acid: 'Transactions & ACID', log: 'Log, WAL & recovery', checkpoint: 'Checkpoints, UNDO & REDO', anomalies: 'Concurrency anomalies',
    serializability: 'Schedules & serializability', locking: 'Locks & two-phase locking', timestamps: 'Timestamps & MVCC', deadlock: 'Deadlocks',
  },
  lessons: [
    {
      id: 'r7-acid', realm: 'r7', title: 'Transactions and the ACID properties', mins: 10,
      src: ['01_COMP2605_Transaction_Management.pdf', '02_COMP2605_Transaction_Processing_Illustrated.pdf'],
      body: `
:::story Mission 7.1: The vanishing $500
A transfer of $500 from C12 to S26 credited S26 and then crashed before debiting C12. The bank just created money. Make sure that never happens again.
:::

## A transaction is one logical unit of work
**Either all of its intended effects commit, or none do.** It can be one SQL statement or several. An updating transaction must take the database **from one consistent state to another**. Intermediate states exist while it runs but must never be accepted as the final result.

**Transfer $500 from C12 ($2,000) to S26 ($1,000):** credit S26 (total briefly $3,500, an intermediate state), debit C12, then **COMMIT**. If the debit fails, **ROLLBACK** restores both balances.

\`\`\`sql:empty run
CREATE TABLE Account (AcctNum CHAR(3) PRIMARY KEY, AcctBalance NUMERIC CHECK (AcctBalance >= 0));
INSERT INTO Account VALUES ('C12', 2000), ('S26', 1000);
BEGIN TRANSACTION;
UPDATE Account SET AcctBalance = AcctBalance + 500 WHERE AcctNum = 'S26';
UPDATE Account SET AcctBalance = AcctBalance - 500 WHERE AcctNum = 'C12';
COMMIT;
SELECT *, (SELECT SUM(AcctBalance) FROM Account) AS total FROM Account;
\`\`\`

\`\`\`sql:empty run
CREATE TABLE Account (AcctNum CHAR(3) PRIMARY KEY, AcctBalance NUMERIC);
INSERT INTO Account VALUES ('C12', 2000), ('S26', 1000);
BEGIN TRANSACTION;
UPDATE Account SET AcctBalance = AcctBalance + 500 WHERE AcctNum = 'S26';
-- the debit fails a business check, so undo everything:
ROLLBACK;
SELECT * FROM Account;
\`\`\`

**Credit sale:** sell 100 units of X (stock 300) to customer Y (owes $1,000) for $3,000. Reduce the stock to 200, then increase the balance to $4,000, then COMMIT. The intermediate pair (200, 1000) records the stock leaving but not the debt, so it must not be kept.

## ACID
| Property | Question | Example check |
|---|---|---|
| **Atomicity** | Did the complete unit happen? All effects or none | Both account updates commit together |
| **Consistency** | Were the rules preserved? | The transfer preserves the total balance |
| **Isolation** | Is concurrent interference controlled? | A concurrent reader gets a permitted view (strongest goal: equivalent to a serial execution) |
| **Durability** | Do committed effects survive failure? | Committed work survives a crash |

:::warn Consistency needs correct logic
You can commit an *incorrect* calculation atomically. Consistency also depends on correct application logic and constraints.
:::

{{q:r7-acid-match}}

## Transaction states
**Active**, then **Partially committed** (last statement finished), then **Committed**. A failure leads to **Failed**, then **Aborted** (effects rolled back). Finishing the last statement is not the same as completing the commit.

## Boundaries
COMMIT ends the transaction and makes its work durable; ROLLBACK undoes uncommitted changes. **Autocommit** makes each statement its own transaction. Oracle starts transactions implicitly, and a **PL/SQL BEGIN … END is a block, not BEGIN TRANSACTION**: the end of a block does not necessarily commit.

{{q:r7-states}}
{{q:r7-plsql}}
`,
    },
    {
      id: 'r7-recovery', realm: 'r7', title: 'The transaction log, WAL and recovery', mins: 14,
      src: ['01_COMP2605_Transaction_Management.pdf', '04_TransactionLogandRecoveryNotes.pdf'],
      body: `
## The transaction log
The DBMS records enough to **reconstruct or reverse** work: transaction IDs, operation types, affected items and **before/after values**. **UNDO** information (before-values) reverses uncommitted work; **REDO** information (after-values) restores committed changes; the **COMMIT record** separates finished work from unfinished work.

| Log | Txn | Record | Item | Before | After |
|---|---|---|---|---|---|
| 1 | T2 | BEGIN | – | – | – |
| 2 | T2 | UPDATE | X.qty | 300 | 200 |
| 3 | T2 | UPDATE | Y.balance | 1,000 | 4,000 |
| 4 | T2 | COMMIT | – | – | – |

The **transaction manager** coordinates the **scheduler and lock manager** (concurrency control) and the **recovery manager**, plus the buffer and storage managers.

## Write-ahead logging (WAL)
An update modifies a page in the **buffer** first (a **dirty page**); the disk copy may still hold the old value. **WAL rule: before a changed data page reaches disk, its log records must be durable** (log before data). A durable commit need not flush every data page: flush the log through the COMMIT record, acknowledge, and write the data pages later (**no-force**).

| Crash… | Data page | Durable log | Recovery |
|---|---|---|---|
| before durable commit | may hold an uncommitted value | UPDATE but no COMMIT | treat as uncommitted, **UNDO** |
| after durable commit | may still hold the old value | UPDATE + COMMIT | keep committed, **REDO** |

{{q:r7-wal}}

## Failure types
| Failure | What happens | Response |
|---|---|---|
| **Transaction** | One unit fails a check, errors, or is a deadlock victim | Roll back that transaction |
| **System** | A crash loses volatile memory; data files and log survive | Restart and recover from the log |
| **Media** | A device fails or files are corrupted | Restore a backup and apply available logs |

## Deferred vs immediate update; steal and no-force
| Policy | Data files before commit | Recovery |
|---|---|---|
| **Deferred update** | Changes not installed before commit | No undo for uncommitted changes; redo may be needed |
| **Immediate update** | Changed pages may reach disk before commit (subject to WAL) | **Undo** for losers, **redo** for winners |

**Steal** (uncommitted pages may be written) creates the need for **UNDO**; **no-force** (commit doesn’t write every page) creates the need for **REDO**. Steal + no-force needs both.

{{q:r7-steal}}

## Checkpoints, UNDO and REDO lists
A **checkpoint** records a known recovery position (in the simple model: flush buffers and record the **active** transactions). The worked example (AB = 240, CD = 150):

| Log | Txn | Op | Item | Before | After |
|---|---|---|---|---|---|
| 1 | T1 | BEGIN | | | |
| 2 | T1 | UPDATE | AB | 240 | 200 |
| 3 | T2 | BEGIN | | | |
| 4 | T2 | UPDATE | CD | 150 | 130 |
| 5 | T1 | COMMIT | | | |
| 6 | T3 | BEGIN | | | |
| 7 | T3 | UPDATE | AB | 200 | 300 |
| 8 | – | **CHECKPOINT (T2, T3 active)** | | | |
| 9 | T2 | COMMIT | | | |
| 10 | T4 | BEGIN | | | |
| 11 | T4 | UPDATE | CD | 130 | 105 |
| 12 | T4 | COMMIT | | | |
| 13 | T5 | BEGIN | | | |
| 14 | T5 | UPDATE | CD | 105 | 75 |
| | | **CRASH** | | | |

**Algorithm:** start UNDO = the checkpoint’s active list {T2, T3} and REDO = ∅; scan forward: on **BEGIN**, add to UNDO; on **COMMIT**, move from UNDO to REDO; UPDATEs change neither list.

Result: **UNDO = {T3, T5}** (losers), **REDO = {T2, T4}**; T1 committed before the checkpoint, so **neither**. Undo backward (T5: CD 75 → 105; T3: AB 300 → 200, going back past the checkpoint), then redo forward (T2: CD = 130; T4: CD = 105). Final **AB = 200, CD = 105**, exactly the effects of T1, T2 and T4.

{{w:recovery-lists}}

{{q:r7-undo-redo}}
{{q:r7-practice}}
`,
    },
    {
      id: 'r7-anomalies', realm: 'r7', title: 'Concurrency problems: lost update, dirty read, inconsistent analysis', mins: 12,
      src: ['05_COMP2605_Concurrency_Deadlock_Revised.pdf'],
      body: `
## Why concurrency control?
Interleaving operations improves resource use and throughput, but uncontrolled interleaving gives wrong results. A **race condition** is when the outcome depends on the relative timing of concurrent operations. A **critical section** is code or an operation that accesses shared resources; locks, latches, mutexes or semaphores restrict access to it. The goal: **serializability** with acceptable throughput.

## Lost update
Two transactions read the same old value and one write **overwrites** the other. PROD_QOH = 35; T1 purchases 100, T2 sells 30. Serial T1 then T2 gives **105**.
| Time | Tx | Operation | Stored |
|---|---|---|---|
| 1 | T1 | read 35 | 35 |
| 2 | T2 | read 35 | 35 |
| 3 | T1 | compute 35 + 100 | 35 |
| 4 | T2 | compute 35 − 30 | 35 |
| 5 | T1 | write 135 | 135 |
| 6 | T2 | write 5 | **5** |
T1’s update is lost (should be 105). Prevent it with an **exclusive lock over the whole read-modify-write**, an **atomic UPDATE** (qoh = qoh + 100), optimistic version checks, or serializable isolation with retry.

## Uncommitted data (dirty read)
T2 reads a value written by T1 **before T1 commits**. T1 writes 135 (uncommitted); T2 reads 135, sells 30 and writes 105; then **T1 aborts**. The correct result is 35 − 30 = **5**, and T2 must also abort, which is a **cascading rollback**. Prevent it with **strict 2PL** (hold X locks until commit), Read Committed or stronger, or MVCC visibility.

## Inconsistent retrieval (inconsistent analysis)
T1 sums PROD_QOH over six products while T2 transfers 30 units from 345TYX to 125TYZ (the total stays **455**). T1 reads the **new** 125TYZ (100) but the **old** 345TYX (35) and reports **485**, a mixture of values that never existed together. Prevent it with a stable snapshot or serializable isolation.

{{w:anomaly-replay}}

{{q:r7-anomaly-match}}
{{q:r7-dirty}}

## SQL isolation levels
| Level | Dirty read | Nonrepeatable read | Phantom | Serializable effect |
|---|---|---|---|---|
| Read Uncommitted | possible | possible | possible | no |
| Read Committed | prevented | possible | possible | no |
| Repeatable Read | prevented | prevented | permitted by the standard | DBMS-specific |
| Serializable | prevented | prevented | prevented | **yes** |

A **nonrepeatable read** changes a row you already read; a **phantom** changes the *set* of rows satisfying a predicate.

{{q:r7-isolation}}
`,
    },
    {
      id: 'r7-serial', realm: 'r7', title: 'Schedules, conflicts and precedence graphs', mins: 10,
      src: ['05_COMP2605_Concurrency_Deadlock_Revised.pdf', '01_COMP2605_Transaction_Management.pdf'],
      body: `
## Notation
**ri(X)**: Ti reads X · **wi(X)**: Ti writes X · **ci**: commit · **ai**: abort. A **schedule** interleaves operations while keeping each transaction’s internal order, e.g. S = r1(X), r2(X), w1(X), w2(X), c1, c2.

A **serial** schedule runs one transaction completely before the next. An interleaved schedule is correct only if it is equivalent to some serial order. A schedule can be **nonserial yet serializable**.

## Conflicts
Two operations **conflict** when they (1) belong to **different transactions**, (2) access the **same item**, and (3) **at least one is a write**. (r–r never conflicts.)

## Precedence graph test
1. One node per transaction.
2. Add **Ti → Tj** when an operation of Ti **precedes and conflicts** with an operation of Tj.
3. The schedule is **conflict serializable exactly when the graph is acyclic**.
4. A **topological order** of the graph gives the equivalent serial schedule.

For S = r1(X), r2(X), w1(X), w2(X): r1(X) before w2(X) gives T1 → T2; r2(X) before w1(X) gives T2 → T1. That is a **cycle**, so S is **not** conflict serializable (it is the lost update!).

The unsafe reader from the locking lecture: T2 reads A before T1 writes A (T2 → T1), and T1 writes B before T2 reads B (T1 → T2). That is a cycle, which explains its inconsistent total of 2,500.

{{w:precedence}}

{{q:r7-conflict}}
{{q:r7-graph}}
`,
    },
    {
      id: 'r7-locking', realm: 'r7', title: 'Locks, two-phase locking, timestamps and MVCC', mins: 13,
      src: ['05_COMP2605_Concurrency_Deadlock_Revised.pdf', '01_COMP2605_Transaction_Management.pdf'],
      body: `
## Locking
A **lock manager** records granted locks and waiting requests. **Granularity**: database, table, page, row/key range, field. **Coarser** means fewer locks, less overhead, less concurrency; **finer** means more concurrency but more lock-manager memory and CPU.

| Mode | Permits | Compatibility |
|---|---|---|
| **Shared (S)** | Read | Many S locks may coexist |
| **Exclusive (X)** | Read and change | No other S or X on the item |

| Requested ↓ · Held → | S | X |
|---|---|---|
| **S** | compatible | wait |
| **X** | wait | wait |

With X locks, the PROD_QOH example serializes: T1 gets X, reads 35, writes 135 and commits; T2 waits, then reads 135 and writes **105**. No lost update.

## Holding locks long enough
Locking each read is not enough. Reader T2 reads A = 1,000 and **unlocks**; writer T1 moves 500 from B to A and commits; T2 then reads B = 1,500 and displays **2,500** instead of 3,000. We need rules about **how long** locks are held.

## Two-phase locking (2PL)
- **Growing phase**: acquire locks, release none. **Shrinking phase**: release locks, acquire none.
- **Once a transaction releases its first lock, it may not obtain any new lock.**
- **Lock point** = the moment of the final acquisition; lock-point order gives the equivalent serial order.
- **Basic 2PL guarantees conflict serializability**, but **not freedom from deadlock**.

| Protocol | Rule | Benefit |
|---|---|---|
| Basic 2PL | No new locks after the first unlock | Conflict serializability |
| **Strict 2PL** | 2PL + keep **X locks** until commit/abort | Nobody reads or overwrites uncommitted writes (no cascading aborts) |
| **Rigorous 2PL** | Keep **S and X** locks until commit/abort | Commit order = serialization order |

{{w:twopl}}

{{q:r7-2pl}}
{{q:r7-2pl-deadlock}}

## Timestamp ordering
Each transaction gets a unique timestamp **TS(T)**; each item stores **RTS(X)** and **WTS(X)**.
- **Read**: allow only if **TS(T) ≥ WTS(X)** (otherwise T is too old: abort/restart); then RTS(X) = max(RTS(X), TS(T)).
- **Write**: allow only if **TS(T) ≥ RTS(X) and TS(T) ≥ WTS(X)**; otherwise abort/restart (or the Thomas write rule for an obsolete write).
Classical timestamp ordering is **non-blocking, so there are no lock deadlocks**, but high contention causes **restarts** and possible starvation.

## MVCC
**Multiversion concurrency control** keeps multiple committed versions and gives each statement/transaction a **snapshot**. Readers often don’t block writers, and writers create new versions. Write-write and serializable conflicts still need validation, locking or abort/retry.

{{q:r7-ts}}
{{q:r7-mvcc}}
`,
    },
    {
      id: 'r7-deadlock', realm: 'r7', title: 'Deadlocks: detection, prevention and recovery', mins: 11,
      src: ['06_COMP2605_Deadlocks_Combined_Updated.pdf', '05_COMP2605_Concurrency_Deadlock_Revised.pdf'],
      body: `
:::story Mission 7.2: The Deadlock Dragon
T3 holds X(B) and wants A. T4 holds S(A) and wants B. Neither will ever let go.
:::

## Deadlock
A **deadlock** is a **cycle** of transactions in which each waits for a resource held by another in the cycle. It is a **liveness** failure, not a consistency failure. Ordinary blocking (the holder can still finish) is not deadlock; **starvation** (one transaction repeatedly loses or is repeatedly chosen as victim) needs no cycle.

**The lecture example:** T3 lock-X(B), updates B; T4 lock-S(A), reads A; T4 requests S(B), so it **waits for T3**; T3 requests X(A), so it **waits for T4**. That is a cycle.

## Four necessary (Coffman) conditions
1. **Mutual exclusion**: a resource can’t be shared compatibly.
2. **Hold and wait**: holding resources while requesting more.
3. **No preemption**: resources aren’t forcibly removed.
4. **Circular wait**: a cycle of waits.
All four are necessary; break any one and that class of deadlock disappears.

## Wait-for graph detection
One node per active transaction; **Ti → Tj when Ti waits for a lock held by Tj**. A **cycle means deadlock** (single site). The detector chooses a **victim**, rolls it back (undoing its uncommitted changes), releases its locks, and restarts it later.

{{w:waitfor}}

{{q:r7-waitfor}}

## Managing deadlocks
- **Timeout**: abort after waiting too long. Simple, but it may abort without a true deadlock.
- **Detection + recovery**: search the wait-for graph and roll back a victim (cost and fairness; avoid choosing the same victim repeatedly).
- **Prevention**: lock ordering (e.g. always A before B), timestamps, conservative acquisition; keep transactions short; retry safely.

## Wait-die and wound-wait (smaller timestamp = older)
| Requester vs holder | **Wait-die** | **Wound-wait** |
|---|---|---|
| Requester is **older** | requester **waits** | **abort the younger holder** (wound) |
| Requester is **younger** | **abort the requester** (dies) | requester **waits** |
In wait-die, waits only go older → younger; in wound-wait, waits only go younger → older, so no cycle can form. Keeping the original timestamp on restart helps prevent starvation.

{{q:r7-waitdie}}
{{q:r7-woundwait}}

## Semaphores
A **semaphore** coordinates access to shared resources. A **binary** semaphore has one permit (mutual exclusion); a **counting** semaphore has N interchangeable permits (connection pools, buffer slots). The atomic operations are **wait / P** (acquire, blocking if none) and **signal / V** (release, waking a waiter).

{{q:r7-coffman}}

:::tip Play it
Defuse lost updates, draw precedence graphs and break deadlocks in the [Concurrency & Deadlock Defuser](#/tools/concurrency).
:::
`,
    },
  ],

  questions: [
    { id: 'r7-acid-match', realm: 'r7', topic: 'acid', kind: 'match', d: 1,
      q: 'Match each ACID property to its check.',
      pairs: [['Atomicity', 'Both transfer updates commit together, or neither does'], ['Consistency', 'The transfer preserves the total balance'], ['Isolation', 'A concurrent reader gets a permitted view'], ['Durability', 'Committed work survives a system crash']],
      explain: 'ACID is four separate checks on the same business operation.' },
    { id: 'r7-states', realm: 'r7', topic: 'acid', kind: 'order', d: 2,
      q: 'Order the states of a transaction that commits successfully.',
      items: ['Active', 'Partially committed', 'Committed'],
      explain: 'Partially committed = last statement finished, but the commit protocol is not yet complete; a failure there can still force an abort.' },
    { id: 'r7-plsql', realm: 'r7', topic: 'acid', kind: 'tf', d: 2,
      q: 'In Oracle, reaching the END of a PL/SQL BEGIN … END block always commits the transaction.',
      answer: false, explain: 'A PL/SQL block is not BEGIN TRANSACTION; a block boundary is not necessarily a transaction boundary.' },
    { id: 'r7-wal', realm: 'r7', topic: 'log', kind: 'mcq', d: 2,
      q: 'Under write-ahead logging, which must reach durable storage first?',
      options: ['The changed data page', 'The log records describing the change', 'Neither: the order does not matter', 'The checkpoint record'], answer: 1,
      explain: 'Log before data: the relevant log records must be durable before the changed data page is written.' },
    { id: 'r7-steal', realm: 'r7', topic: 'log', kind: 'match', d: 3,
      q: 'Match each buffer policy to the recovery information it makes necessary.',
      pairs: [['Steal (uncommitted pages may be written to disk)', 'UNDO'], ['No-force (commit need not write every page)', 'REDO']],
      explain: 'Steal + no-force explains why recovery needs both UNDO and REDO lists.' },
    { id: 'r7-undo-redo', realm: 'r7', topic: 'checkpoint', kind: 'match', d: 3,
      q: 'In the checkpoint example (checkpoint lists T2, T3 active; T2 and T4 commit after it; T5 starts after it; crash before T3 and T5 commit), classify each transaction.',
      pairs: [['T1 (committed before the checkpoint)', 'Neither'], ['T2', 'REDO'], ['T3', 'UNDO'], ['T4', 'REDO'], ['T5', 'UNDO']],
      explain: 'Start UNDO = {T2, T3}; COMMIT T2 → REDO; BEGIN T4 → UNDO; COMMIT T4 → REDO; BEGIN T5 → UNDO. Final UNDO = {T3, T5}, REDO = {T2, T4}.' },
    { id: 'r7-practice', realm: 'r7', topic: 'checkpoint', kind: 'mcq', d: 2,
      q: 'Log: BEGIN U1; U1 updates P 80 → 60; COMMIT U1; BEGIN U2; U2 updates Q 50 → 70; crash (no COMMIT U2). What must recovery produce?',
      options: ['P = 80, Q = 50', 'P = 60, Q = 50', 'P = 60, Q = 70', 'P = 80, Q = 70'], answer: 1,
      explain: 'UNDO = {U2} restores Q = 50; REDO = {U1} ensures P = 60.' },
    { id: 'r7-anomaly-match', realm: 'r7', topic: 'anomalies', kind: 'match', d: 2,
      q: 'Match each scenario to its problem.',
      pairs: [['T1 and T2 both read 35, T1 writes 135, T2 writes 5', 'Lost update'], ['T2 reads 135 written by T1, then T1 aborts', 'Dirty read (uncommitted data)'], ['A SUM sees the new 125TYZ but the old 345TYX, reporting 485', 'Inconsistent analysis'], ['Re-running the same WHERE query returns an extra row', 'Phantom']],
      explain: 'These are the concurrency phenomena from the lecture.' },
    { id: 'r7-dirty', realm: 'r7', topic: 'anomalies', kind: 'num', d: 2,
      q: 'PROD_QOH = 35. T1 writes 135 (uncommitted). T2 reads 135, sells 30 and writes 105. T1 aborts. What should the correct quantity be?',
      answer: 5, explain: 'Without T1’s aborted purchase: 35 − 30 = 5. T2 must abort too (cascading rollback).' },
    { id: 'r7-isolation', realm: 'r7', topic: 'anomalies', kind: 'mcq', d: 2,
      q: 'Which is the weakest SQL isolation level that prevents dirty reads?',
      options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'], answer: 1,
      explain: 'Read Committed prevents dirty reads but still allows nonrepeatable reads and phantoms.' },
    { id: 'r7-conflict', realm: 'r7', topic: 'serializability', kind: 'multi', d: 2,
      q: 'Which pairs of operations **conflict**? Select all.',
      options: ['r1(X) and r2(X)', 'r1(X) and w2(X)', 'w1(X) and w2(X)', 'w1(X) and r2(Y)', 'w1(Y) and r2(Y)'], answer: [1, 2, 4],
      explain: 'Different transactions, same item, and at least one write. Two reads never conflict; different items never conflict.' },
    { id: 'r7-graph', realm: 'r7', topic: 'serializability', kind: 'mcq', d: 3,
      q: 'S = r1(X), r2(X), w1(X), w2(X), c1, c2. Is S conflict serializable?',
      options: ['Yes, equivalent to T1 then T2', 'Yes, equivalent to T2 then T1', 'No: the precedence graph has the cycle T1 → T2 → T1', 'It cannot be determined'], answer: 2,
      explain: 'r1(X)…w2(X) gives T1 → T2; r2(X)…w1(X) gives T2 → T1. This is the lost-update pattern.' },
    { id: 'r7-2pl', realm: 'r7', topic: 'locking', kind: 'mcq', d: 2,
      q: 'A transaction does: lock-S(A), read A, unlock(A), lock-S(B), read B, unlock(B). Does it obey 2PL?',
      options: ['Yes', 'No: it acquires S(B) after releasing S(A)', 'No: it uses shared locks', 'Yes, because it reads only'], answer: 1,
      explain: 'The first unlock ends the growing phase; acquire S(B) before releasing S(A) to repair it.' },
    { id: 'r7-2pl-deadlock', realm: 'r7', topic: 'locking', kind: 'tf', d: 2,
      q: 'Basic two-phase locking guarantees conflict serializability and freedom from deadlock.',
      answer: false, explain: 'It guarantees conflict serializability only; transactions can still deadlock during their growing phases.' },
    { id: 'r7-strict', realm: 'r7', topic: 'locking', kind: 'match', d: 2,
      q: 'Match each protocol to its rule.',
      pairs: [['Basic 2PL', 'No new locks after the first unlock'], ['Strict 2PL', 'Also hold X locks until commit/abort'], ['Rigorous 2PL', 'Hold S and X locks until commit/abort']],
      explain: 'Strict 2PL prevents reading/overwriting uncommitted writes; rigorous 2PL aligns commit order with serialization order.' },
    { id: 'r7-compat', realm: 'r7', topic: 'locking', kind: 'mcq', d: 1,
      q: 'T1 holds S(A). T2 requests S(A); T3 requests X(A). What happens?',
      options: ['Both wait', 'T2 is granted; T3 waits', 'T3 is granted; T2 waits', 'Both are granted'], answer: 1,
      explain: 'S is compatible with S; X conflicts with S.' },
    { id: 'r7-granularity', realm: 'r7', topic: 'locking', kind: 'mcq', d: 1,
      q: 'Compared with table-level locks, row-level locks give…',
      options: ['Less concurrency and less overhead', 'More concurrency but more lock-management overhead', 'No difference', 'Fewer deadlocks always'], answer: 1,
      explain: 'Finer granularity means more concurrency and more locks to manage.' },
    { id: 'r7-ts', realm: 'r7', topic: 'timestamps', kind: 'mcq', d: 3,
      q: 'Under basic timestamp ordering, T with TS(T) = 10 wants to read X, where WTS(X) = 20. What happens?',
      options: ['The read is allowed', 'T is too old: abort and restart', 'T waits for a lock', 'RTS(X) becomes 10'], answer: 1,
      explain: 'A read needs TS(T) ≥ WTS(X); a younger transaction has already written X.' },
    { id: 'r7-mvcc', realm: 'r7', topic: 'timestamps', kind: 'tf', d: 2,
      q: 'Under MVCC, readers can often read a committed snapshot version without blocking writers.',
      answer: true, explain: 'Writers create new versions; write-write conflicts still need validation or locking.' },
    { id: 'r7-waitfor', realm: 'r7', topic: 'deadlock', kind: 'mcq', d: 2,
      q: 'T3 holds X(B) and requests X(A); T4 holds S(A) and requests S(B). What does the wait-for graph contain?',
      options: ['T3 → T4 only', 'T4 → T3 only', 'T3 → T4 and T4 → T3: a cycle, so deadlock', 'No edges'], answer: 2,
      explain: 'Each waits for a lock the other holds; edges point from waiter to holder.' },
    { id: 'r7-waitdie', realm: 'r7', topic: 'deadlock', kind: 'mcq', d: 3,
      q: 'Wait-die: T1 (TS = 10, older) holds A. T2 (TS = 20, younger) requests A. What happens?',
      options: ['T2 waits', 'T2 is aborted (dies)', 'T1 is aborted', 'Both abort'], answer: 1,
      explain: 'In wait-die a younger requester dies; only older requesters may wait.' },
    { id: 'r7-woundwait', realm: 'r7', topic: 'deadlock', kind: 'mcq', d: 3,
      q: 'Wound-wait: T1 (TS = 10, older) requests B held by T2 (TS = 20, younger). What happens?',
      options: ['T1 waits', 'T1 is aborted', 'T2, the younger holder, is aborted (wounded)', 'Nothing'], answer: 2,
      explain: 'In wound-wait an older requester wounds a younger holder; a younger requester waits.' },
    { id: 'r7-coffman', realm: 'r7', topic: 'deadlock', kind: 'multi', d: 2,
      q: 'Which are the necessary (Coffman) conditions for deadlock? Select all.',
      options: ['Mutual exclusion', 'Hold and wait', 'No preemption', 'Circular wait', 'Write-ahead logging'], answer: [0, 1, 2, 3],
      explain: 'All four are necessary; breaking any one prevents that class of deadlock.' },
    { id: 'r7-lost-fix', realm: 'r7', topic: 'anomalies', kind: 'mcq', d: 2,
      q: 'Which change prevents the PROD_QOH lost update most directly in SQL?',
      options: ['SELECT the value, compute in the app, then UPDATE', 'A single atomic UPDATE Product SET qoh = qoh + 100 WHERE …', 'Adding an index on qoh', 'Using Read Uncommitted'], answer: 1,
      explain: 'Read-modify-write in the application invites lost updates; an atomic update (or an X lock across the read-modify-write) protects the invariant.' },
  ],

  written: [
    { id: 'r7-w1', realm: 'r7', topic: 'checkpoint', marks: 10,
      q: 'Using the recovery log (AB = 240, CD = 150; T1 updates AB 240 → 200 and commits; T2 updates CD 150 → 130; T3 updates AB 200 → 300; CHECKPOINT with T2, T3 active; T2 commits; T4 updates CD 130 → 105 and commits; T5 updates CD 105 → 75; crash), build the UNDO and REDO lists, explain each step, and give the final values of AB and CD.',
      model: 'Start at the checkpoint: UNDO = {T2, T3}, REDO = ∅ (T1 committed before the checkpoint, so neither). Scan forward: record 9 COMMIT T2 moves T2 to REDO, giving UNDO {T3}, REDO {T2}. Record 10 BEGIN T4 adds T4 to UNDO, giving {T3, T4}. Record 12 COMMIT T4 moves T4, giving UNDO {T3}, REDO {T2, T4}. Record 13 BEGIN T5 gives UNDO {T3, T5}. Updates change neither list. Undo backward: T5 (record 14) sets CD from 75 back to 105; T3 (record 7, before the checkpoint) sets AB from 300 back to 200. Redo forward: T2 (record 4) sets CD = 130; T4 (record 11) sets CD = 105. Final AB = 200 and CD = 105, i.e. 240 − 40 and 150 − 20 − 25: the effects of the committed T1, T2 and T4 only.',
      points: ['Initial lists from checkpoint', 'T1 classified neither', 'COMMIT moves to REDO', 'BEGIN adds to UNDO', 'Final UNDO {T3, T5}', 'Final REDO {T2, T4}', 'Undo backward incl. pre-checkpoint record', 'Redo forward in log order', 'AB = 200', 'CD = 105'] },
    { id: 'r7-w2', realm: 'r7', topic: 'anomalies', marks: 9,
      q: 'Explain the lost update, uncommitted data (dirty read) and inconsistent analysis problems with the PROD_QOH examples, and state how each can be prevented.',
      model: 'Lost update: with PROD_QOH = 35, T1 (purchase 100) and T2 (sale 30) both read 35; T1 writes 135, then T2 writes 5, overwriting T1; the correct serial result is 105. Prevent with an X lock across read-modify-write, an atomic UPDATE, or serializable isolation with retry. Dirty read: T1 writes 135 without committing; T2 reads 135, writes 105; T1 aborts, so the correct value is 5 and T2 must cascade-abort. Prevent with strict 2PL (hold X locks until commit), Read Committed or stronger, or MVCC visibility. Inconsistent analysis: T1 sums quantities while T2 transfers 30 units from 345TYX to 125TYZ; T1 reads the new 125TYZ and the old 345TYX and reports 485 instead of 455. Prevent with a stable snapshot or serializable isolation (locking the read set).',
      points: ['Lost update scenario', 'Correct result 105 vs 5', 'Lost update prevention', 'Dirty read scenario', 'Cascading rollback / correct value 5', 'Dirty read prevention', 'Inconsistent analysis scenario', '485 vs 455', 'Inconsistent analysis prevention'] },
    { id: 'r7-w3', realm: 'r7', topic: 'deadlock', marks: 8,
      q: 'Define deadlock and state the four necessary conditions. Using the T3/T4 example, draw the wait-for graph and explain how a DBMS detects and resolves the deadlock. Compare wait-die and wound-wait.',
      model: 'A deadlock is a cycle of transactions each waiting for a resource held by another in the cycle. Conditions: mutual exclusion, hold and wait, no preemption, circular wait. T3 holds X(B) and T4 holds S(A); T4 requests S(B) and waits for T3 (edge T4 → T3); T3 requests X(A) and waits for T4 (edge T3 → T4): a cycle. The DBMS builds a wait-for graph (Ti → Tj when Ti waits for a lock Tj holds), detects the cycle (or uses a timeout), chooses a victim (e.g. T3) by cost/fairness, rolls back its uncommitted changes to B, releases its locks so T4 proceeds, and restarts T3. Wait-die: an older requester waits, a younger requester dies. Wound-wait: an older requester aborts (wounds) the younger holder, a younger requester waits. Both use timestamps to prevent cycles.',
      points: ['Deadlock defined', 'Four conditions', 'Correct wait-for edges', 'Cycle identified', 'Detection method', 'Victim rollback + lock release', 'Wait-die rule', 'Wound-wait rule'] },
  ],

  cards: [
    { id: 'r7-c1', realm: 'r7', front: 'Transaction', back: 'A logical unit of work: all its effects commit or none do; moves the database between consistent states.' },
    { id: 'r7-c2', realm: 'r7', front: 'ACID', back: 'Atomicity (all or nothing), Consistency (rules preserved), Isolation (controlled interference), Durability (committed work survives).' },
    { id: 'r7-c3', realm: 'r7', front: 'Transaction states', back: 'Active → Partially committed → Committed; or Failed → Aborted.' },
    { id: 'r7-c4', realm: 'r7', front: 'WAL rule', back: 'Log records must be durable before the changed data page is written to disk.' },
    { id: 'r7-c5', realm: 'r7', front: 'Steal / no-force', back: 'Steal needs UNDO; no-force needs REDO.' },
    { id: 'r7-c6', realm: 'r7', front: 'Three failure types', back: 'Transaction (roll back), system (recover from log), media (restore backup + logs).' },
    { id: 'r7-c7', realm: 'r7', front: 'UNDO/REDO list algorithm', back: 'UNDO = checkpoint active list, REDO = ∅; forward scan: BEGIN → UNDO; COMMIT → move to REDO.' },
    { id: 'r7-c8', realm: 'r7', front: 'Lost update', back: 'Two transactions read the same value; one write overwrites the other (35 → 5 instead of 105).' },
    { id: 'r7-c9', realm: 'r7', front: 'Dirty read', back: 'Reading an uncommitted value that is later rolled back; can cause cascading rollback.' },
    { id: 'r7-c10', realm: 'r7', front: 'Inconsistent analysis', back: 'A summary mixes old and new values during a concurrent update (485 instead of 455).' },
    { id: 'r7-c11', realm: 'r7', front: 'Conflicting operations', back: 'Different transactions, same item, at least one write.' },
    { id: 'r7-c12', realm: 'r7', front: 'Precedence graph test', back: 'Edge Ti → Tj when Ti’s operation precedes and conflicts with Tj’s; acyclic ⇔ conflict serializable.' },
    { id: 'r7-c13', realm: 'r7', front: 'S/X compatibility', back: 'S–S compatible; S–X, X–S, X–X wait.' },
    { id: 'r7-c14', realm: 'r7', front: '2PL', back: 'Growing phase then shrinking phase; no new locks after the first unlock. Conflict serializable, but can deadlock.' },
    { id: 'r7-c15', realm: 'r7', front: 'Strict vs rigorous 2PL', back: 'Strict: hold X locks to commit. Rigorous: hold S and X locks to commit.' },
    { id: 'r7-c16', realm: 'r7', front: 'Timestamp ordering rules', back: 'Read if TS(T) ≥ WTS(X); write if TS(T) ≥ RTS(X) and ≥ WTS(X); else abort/restart. No lock deadlocks.' },
    { id: 'r7-c17', realm: 'r7', front: 'Coffman conditions', back: 'Mutual exclusion, hold and wait, no preemption, circular wait.' },
    { id: 'r7-c18', realm: 'r7', front: 'Wait-die vs wound-wait', back: 'Wait-die: older waits, younger dies. Wound-wait: older wounds the younger holder, younger waits.' },
    { id: 'r7-c19', realm: 'r7', front: 'Semaphore', back: 'Binary (1 permit) or counting (N permits); wait/P acquires, signal/V releases.' },
  ],

  terms: [
    { term: 'Transaction', def: 'Logical unit of work that commits entirely or not at all.', realm: 'r7' },
    { term: 'ACID', def: 'Atomicity, Consistency, Isolation, Durability.', realm: 'r7' },
    { term: 'Transaction log', def: 'Record of transaction operations with before/after values used for recovery.', realm: 'r7' },
    { term: 'Write-ahead logging (WAL)', def: 'Log records are made durable before the corresponding data pages.', realm: 'r7' },
    { term: 'Checkpoint', def: 'A known recovery position recording the active transactions.', realm: 'r7' },
    { term: 'UNDO / REDO', def: 'Reversing uncommitted work / reapplying committed work during recovery.', realm: 'r7' },
    { term: 'Dirty page', def: 'A modified page in the buffer whose disk copy is out of date.', realm: 'r7' },
    { term: 'Lost update', def: 'One transaction’s write overwrites another’s concurrent update.', realm: 'r7' },
    { term: 'Dirty read', def: 'Reading a value written by an uncommitted transaction.', realm: 'r7' },
    { term: 'Inconsistent analysis', def: 'A summary reads a mixture of old and new values.', realm: 'r7' },
    { term: 'Phantom', def: 'A change in the set of rows satisfying a predicate between reads.', realm: 'r7' },
    { term: 'Serializability', def: 'A concurrent schedule has the same effect as some serial order.', realm: 'r7' },
    { term: 'Precedence graph', def: 'Graph of conflict order between transactions; acyclic means conflict serializable.', realm: 'r7' },
    { term: 'Shared lock', def: 'Read lock compatible with other shared locks.', realm: 'r7' },
    { term: 'Exclusive lock', def: 'Write lock incompatible with any other lock.', realm: 'r7' },
    { term: 'Two-phase locking', def: 'Protocol with a growing phase and a shrinking phase; no locks after the first unlock.', realm: 'r7' },
    { term: 'Timestamp ordering', def: 'Concurrency control that orders conflicting operations by transaction timestamps.', realm: 'r7' },
    { term: 'MVCC', def: 'Multiversion concurrency control: readers use snapshot versions.', realm: 'r7' },
    { term: 'Deadlock', def: 'A cycle of transactions each waiting for a lock held by the next.', realm: 'r7' },
    { term: 'Wait-for graph', def: 'Graph with Ti → Tj when Ti waits for a lock held by Tj.', realm: 'r7' },
    { term: 'Starvation', def: 'A transaction repeatedly loses access or is chosen as victim.', realm: 'r7' },
    { term: 'Semaphore', def: 'Synchronization primitive with wait (P) and signal (V) operations.', realm: 'r7' },
  ],

  sql: [
    { id: 'r7-s1', realm: 'r7', topic: 'acid', title: 'Atomic transfer', dataset: 'empty', d: 2,
      prompt: 'Create Account(AcctNum CHAR(3) PRIMARY KEY, AcctBalance NUMERIC), insert C12 = 2000 and S26 = 1000, then transfer **500 from C12 to S26 inside one transaction** and commit. (The checker reads both balances.)',
      solution: "CREATE TABLE Account (AcctNum CHAR(3) PRIMARY KEY, AcctBalance NUMERIC);\nINSERT INTO Account VALUES ('C12', 2000), ('S26', 1000);\nBEGIN TRANSACTION;\nUPDATE Account SET AcctBalance = AcctBalance - 500 WHERE AcctNum = 'C12';\nUPDATE Account SET AcctBalance = AcctBalance + 500 WHERE AcctNum = 'S26';\nCOMMIT;",
      check: 'SELECT AcctNum, AcctBalance FROM Account ORDER BY AcctNum;' },
    { id: 'r7-s2', realm: 'r7', topic: 'anomalies', title: 'Lost-update-proof update', dataset: 'dreamhome', d: 1,
      prompt: 'Give every member of staff at branch B003 a 1,000 raise using a **single atomic UPDATE** (no read-then-write). The checker lists B003 salaries.',
      solution: "UPDATE Staff SET salary = salary + 1000 WHERE branchNo = 'B003';",
      check: "SELECT staffNo, salary FROM Staff WHERE branchNo = 'B003' ORDER BY staffNo;" },
  ],

  codex: `
## Transactions
ACID: **A** all-or-nothing · **C** rules preserved · **I** controlled interference (goal: serial-equivalent) · **D** committed work survives.
States: Active → Partially committed → Committed | Failed → Aborted. PL/SQL BEGIN…END ≠ BEGIN TRANSACTION.

## Logging & recovery
- Log = before/after values + BEGIN/COMMIT. **WAL**: log durable before the data page.
- Steal ⇒ UNDO; no-force ⇒ REDO. Deferred update: no undo. Immediate update: undo losers, redo winners.
- Failures: transaction / system / media.
- **Checkpoint algorithm**: UNDO = active at the checkpoint; scan forward: BEGIN → UNDO, COMMIT → REDO. Undo backward, redo forward.
- Worked: UNDO {T3, T5}, REDO {T2, T4}, T1 neither → AB = 200, CD = 105.

## Anomalies (PROD_QOH = 35, +100, −30)
Lost update (5 vs 105) · dirty read (T1 aborts → 5; cascade) · inconsistent analysis (485 vs 455) · nonrepeatable read · phantom.
Isolation: RU < RC (no dirty) < RR (no nonrepeatable) < Serializable (no phantoms).

## Serializability
Conflict = different txns + same item + ≥ 1 write. Precedence graph Ti → Tj; **acyclic ⇔ conflict serializable**; topological order = serial order.

## Locking
S/S ok; anything with X waits. **2PL**: grow then shrink, no lock after the first unlock → serializable, may deadlock. Strict: X locks to commit. Rigorous: all locks to commit.
Timestamps: read needs TS ≥ WTS; write needs TS ≥ RTS and ≥ WTS → else restart; no deadlock. MVCC: snapshot versions.

## Deadlock
Coffman: mutual exclusion · hold & wait · no preemption · circular wait. Wait-for graph cycle → victim rollback.
Wait-die: older waits / younger dies. Wound-wait: older wounds the younger holder / younger waits.
`,
}

export default r7
