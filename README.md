# DBQuest: Enterprise Architect

A game-first study website for **COMP2605 Enterprise Database Systems**. Every lesson, challenge and simulator is built from the COMP2605 lecture modules and lab theory slides, with Connolly & Begg's *Database Systems* as the course textbook.

You start as a *Junior Data Apprentice* rescuing organisations from flat files and work through ten realms to become a *Principal Enterprise Data Architect*.

## What's inside

| Area | What it does |
|---|---|
| **Campaign map** | 10 unlockable realms, one per lecture module, each ending in a boss battle |
| **Story Quests** | 56 short lessons. Every concept is followed by an in-line challenge, and every SQL example runs live in the browser |
| **Quest board** | 209 auto-graded challenges (multiple choice, select-all, matching, ordering, numeric, fill-in) with first-try combo multipliers, hints paid for with Query Mana, and spaced repetition |
| **Live Sandbox Arenas** | Real SQL (SQLite compiled to WebAssembly) on DreamHome, Vendor/Product, EMP/DEPT and the sports club, plus 43 graded SQL quests. Also a relational algebra evaluator, an XML / XPath / DTD / XQuery lab and a JSON / NoSQL lab |
| **Integrity Shields** | Primary-key and foreign-key violations trigger a visible "shield breach" with an explanation |
| **Simulators** | ERD Forge, Normalization Forge, Query Optimizer Tycoon, B+ Tree Grove, Hash Bucket Lab, Concurrency & Deadlock Defuser |
| **Bug Bounty** | 60-second time attack |
| **Exam Arena** | Timed mock papers with a topic breakdown, realm bosses, written answers with marking points, and a Weakness Raid on every topic below 90% |
| **Revision** | Printable codex per realm, flashcards (Leitner boxes), a glossary, case-study campaigns, a progress dashboard and badges |

Progress is stored in the browser (localStorage). Settings has backup and restore to a file, and a **Free Roam** switch that unlocks everything for exam revision.

## Realms and sources

| Realm | Lecture module |
|---|---|
| 1 Database Foundations | 01_Introduction_and_Relational_Model |
| 2 Business Rules & Relational Algebra | 02_Business_Rules_and_Relational_Operators |
| 3 Database Design & ER Modelling | 03_Database_Design_and_ER_Modelling |
| 4 Functional Dependencies & Normalization | 04_Functional_Dependencies_and_Normalization |
| 5 Query Processing & Access Methods | 05_Query_Processing_and_Access_Methods |
| 6 Indexing: B+ Trees & Hashing | 06_Indexing_B_Plus_Trees_and_Hashing |
| 7 Transactions, Concurrency & Deadlocks | 07_Transactions_Concurrency_and_Deadlocks |
| 8 SQL & PL/SQL | 08_SQL + Lab theory 1–5 |
| 9 XML & Semistructured Data | 09_XML + Lab 6 |
| 10 NoSQL & JSON | 10_NoSQL + Lab 7 and the Oracle JSON pack |

The simulators reproduce the lectures' worked examples exactly. For example, the B+ tree engine produces the lecture's states for *insert 8 → delete 22 → delete 20 → delete 24*. The dependency engine decomposes ClientRental into the lecture's four 3NF relations. The join costs follow the lecture's counting (5 × 10 = 50 comparisons).

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the build
```

Requires Node 20+.

## Deployment

The site is hosted on **GitHub Pages** from the `gh-pages` branch. To publish an update:

```bash
npm run deploy     # builds, then pushes dist/ to the gh-pages branch
```

The app uses hash routing and a relative base path, so it works from the repository sub-path with no server configuration.

## Project layout

```
src/
  content/        realms.ts and realms/r1–r10.ts (lessons, questions, written answers, flashcards, glossary, SQL quests, codex)
  engine/         sql.ts (sql.js + Oracle-to-SQLite translation), ra.ts (relational algebra), fd.ts (functional dependencies),
                  bptree.ts (B+ tree with step snapshots), xml.ts (DTD validation, XPath, FLWOR), md.tsx (lesson markup)
  game/           store.ts (XP, levels, mana, combos, shields, spaced repetition, mastery), badges.ts, progress.ts
  tools/          the simulators and lesson widgets
  pages/          map, realm, lesson, quests, arena, boss, bounty, exam, flashcards, codex, glossary, progress, settings, campaigns
```

In development, `window.__dbq.checkAll()` validates every SQL quest, lesson SQL block, algebra reference and question link. `__dbq.forgeCheck()` and `__dbq.bptCheck()` replay the normalization and B+ tree lecture sequences.

## Notes and limits

- SQL runs on SQLite, not Oracle. Common Oracle forms (VARCHAR2, NUMBER, DATE '…', NVL, INITCAP, FROM DUAL, MINUS) are translated automatically. PL/SQL blocks, procedures and Oracle triggers are taught by reading and tracing, with runnable SQLite trigger equivalents.
- The XQuery lab supports a FLWOR teaching subset; XPath is the browser's native XPath 1.0 engine.
- Topics in the textbook that the COMP2605 lecture notes don't cover (for example distributed DBMSs, object-relational SQL and data warehousing) are not included.
