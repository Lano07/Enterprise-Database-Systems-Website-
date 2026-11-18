import type { RealmContent } from '../types'

// Source: 06_Indexing_B_Plus_Trees_and_Hashing (B+ Tree Lecture Notes (illustrated); B+ Trees for
// Database Indexing; B+ Tree Worked Example (max 3 keys); transitions; Hashing for Database Indexing).

const r6: RealmContent = {
  topics: {
    'bpt-structure': 'B+ tree structure & order', 'bpt-search': 'Equality & range search', 'bpt-insert': 'Insertion & splits',
    'bpt-delete': 'Deletion: redistribute & merge', 'bpt-cost': 'Counting page reads', hashing: 'Hash functions & tables', collisions: 'Collision handling',
  },
  lessons: [
    {
      id: 'r6-bpt', realm: 'r6', title: 'B+ tree structure, order and search', mins: 12,
      src: ['01_COMP2605_B_Plus_Tree_Lecture_Illustrated.pdf', '02_COMP2605_B_Plus_Trees_Illustrated.pdf'],
      body: `
:::story Mission 6.1: The Unbalanced Treant
Every lookup in the student index crawls through page after page. A B+ tree keeps every leaf at the same depth, so no key is ever more than a few page reads away.
:::

## Two kinds of index
| Index | Main use |
|---|---|
| **Hash index** | **Equality** search: expected constant I/O for search and insertion in the simple model |
| **B+ tree index** | **Equality and range** search: ordered entries and linked leaves support sequential range scans |

## Structure
A **B+ tree** is a dynamic, **height-balanced** multiway search tree. Each node is one physical **page**.
| Part | Contents |
|---|---|
| **Root** | The starting page for a search |
| **Internal node** | Sorted **routing separators** and child-page pointers |
| **Leaf node** | Sorted **data entries**: keys and **record identifiers (rids)** |
| **Leaf links** | Pointers to the next and previous leaves in key order (for range scans) |

All data keys live in the **leaves**. Separators only route searches; they are not a second copy of the data.

## Order d
The lecture defines **order d** by entry count: a **non-root node holds between d and 2d entries**. An internal node with **m separators has m + 1 child pointers**. The root may have as few as **1 separator (2 children)**.

| Node (d = 2) | Completed-state occupancy |
|---|---|
| Non-root internal | 2 to 4 separators; 3 to 5 child pointers |
| Internal root | 1 to 4 separators; at least 2 children |
| Non-root leaf | 2 to 4 data entries |

For d = 2, **5 entries is a temporary overflow** and **1 is an underflow**.

:::warn Different texts, different “order”
The worked example uses **m = maximum keys per node = 3**. With odd m = 2d + 1 (d = 1), a non-root **leaf needs d + 1 = 2** keys, but a non-root **internal node needs only d = 1** key. Always state the convention you are using.
:::

{{q:r6-order}}

## Routing rule: equality goes right
For adjacent children L and R separated by s: **max(L) < s ≤ min(R)**. A search key equal to a separator follows the **right** child. Finding the key in an internal node is not a completed lookup; you must continue down to the leaf.

## Equality search: find 34
Root **[60]**: 34 < 60, so go left. Internal **[20 | 40]**: 20 ≤ 34 < 40, so take the middle child. Leaf **[25 | 34 | 35]** contains 34, and its rid locates the record.

## Range search: 34 ≤ key ≤ 63
Descend once to the first qualifying entry, then **follow the leaf links**: [25 | 34 | 35] gives 34, 35; then [55] gives 55; then [62 | 63 | 64] gives 62, 63 and stops at 64. Result: **{34, 35, 55, 62, 63}**. The scan never revisits the root.

{{w:bpt-search}}

{{q:r6-equal-right}}
{{q:r6-range}}

## Counting page reads
One node = one page. Count **distinct index pages read**, not comparisons inside a page.
| Lookup | Pages visited | Cold cache | Root cached |
|---|---|---|---|
| Equality: 34 | root + internal + leaf | **3** | **2** |
| Range 34 to 63 | root + internal + 3 leaves | **5** | **4** |
Record-page reads via the rids are a separate cost.

{{q:r6-pages}}
`,
    },
    {
      id: 'r6-insert', realm: 'r6', title: 'B+ tree insertion: copy up, push up', mins: 12,
      src: ['01_COMP2605_B_Plus_Tree_Lecture_Illustrated.pdf', '03_COMP2605_B_Plus_Tree_Worked_Illustrated.pdf'],
      body: `
## The procedure
1. Find the leaf whose interval contains the new key.
2. Insert the entry in key order. If the leaf is within capacity, **stop**. A full node is still valid.
3. If the leaf **overflows**, split it and **copy** a separator (the first key of the new right leaf) into the parent, with the new child pointer.
4. If the parent overflows, split that internal node and **push** its middle separator upward. Continue toward the root if needed; a root split adds a level.

:::key Copy up from a leaf; push up from an internal node
After a **leaf** split the separator is **copied**: the data entry stays in the right leaf. After an **internal** split the middle separator is **pushed**: it moves up and is kept in neither child.
:::

## Worked example: insert 8 (d = 2)
Start: root **[13 | 17 | 24 | 30]**, leaves **[2 3 5 7] [14 16] [19 20 22] [24 27 29] [33 34 38 39]** (16 keys).
1. 8 < 13, so go to [2 3 5 7], which is already full. Temporary **[2 3 5 7 8]** overflows (max 2d = 4).
2. Split: keep **d = 2** on the left and **d + 1 = 3** on the right: **[2 3]** and **[5 7 8]**. **Copy up 5**.
3. Parent becomes **[5 | 13 | 17 | 24 | 30]**, which has 5 separators and overflows.
4. Split the internal node around the middle separator **17**: **[5 | 13]** and **[24 | 30]**, and **push 17** into a **new root**.
5. Result: root [17]; height grows from **2 to 3 levels**; 17 data entries; all leaves at the same depth.

{{w:bpt-insert}}

{{q:r6-copy-push}}
{{q:r6-insert8-root}}

## Worked example 2: max 3 keys, insert 1, 3, 5, 7, 9, 2, 4, 6, 8, 10
- 1, 3, 5 fill the root leaf. Inserting **7** splits [1 3 5 7] into **[1 3] [5 7]**, and **5** is copied into a new root.
- 9 goes to [5 7 9] and 2 to [1 2 3]: both fit.
- **4** splits [1 2 3 4] into [1 2] [3 4], copying **3**, so the root becomes [3 | 5].
- **6** splits [5 6 7 9] into [5 6] [7 9], copying **7**, so the root becomes [3 | 5 | 7] (full). **8** goes to [7 8 9].
- **10** splits [7 8 9 10] into [7 8] [9 10], copying **9**, so the root [3 | 5 | 7 | 9] overflows. **Push 7** into a new root, leaving [3 | 5] and [9].

{{q:r6-worked-root}}

Insertion costs roughly an exact search plus any page changes along the path, and the tree stays **height-balanced**.
`,
    },
    {
      id: 'r6-delete', realm: 'r6', title: 'B+ tree deletion: redistribute or merge', mins: 11,
      src: ['01_COMP2605_B_Plus_Tree_Lecture_Illustrated.pdf'],
      body: `
## Choosing the repair
Locate the leaf and remove the entry. Then:
| Situation (d = 2) | Action |
|---|---|
| Leaf still has 2–4 entries | No repair needed |
| Leaf has 1 entry; a sibling can lend | **Redistribute** entries and **adjust the separator** between them |
| Leaf has 1 entry; the sibling cannot lend | **Merge** the leaves and **remove** the redundant parent separator and pointer |
| A non-root internal node drops below d separators | Repair it too (borrow or merge), and keep going upward |

The examples are **one continuous sequence**, starting from the tree after inserting 8.

**Delete 22.** Leaf [19 20 22] becomes [19 20]: 2 = d entries, still valid. Nothing else changes.

**Delete 20.** [19 20] becomes **[19]**, an underflow. The right sibling **[24 27 29]** has 3 entries and can lend: move **24** left, giving **[19 24]** and **[27 29]**, and **replace separator 24 with 27** (otherwise a search for 24 would go to the wrong leaf).

**Delete 24.** [19 24] becomes **[19]**, an underflow. The right sibling [27 29] has only the minimum 2, so **merge** them into **[19 27 29]** and remove separator 27 from the parent. The parent **[30]** now has 1 separator, below d = 2. Its sibling **[5 | 13]** is also at the minimum, so **merge the internal nodes, pulling down 17**: **[5 | 13 | 17 | 30]**. The root is now empty and contracts, so the tree returns to **2 levels**.

{{w:bpt-delete}}

| State | Root separators | Leaf entries | Leaves | Levels |
|---|---|---|---|---|
| Start | 13, 17, 24, 30 | 16 | 5 | 2 |
| Insert 8 | 17 | 17 | 6 | 3 |
| Delete 22 | 17 | 16 | 6 | 3 |
| Delete 20 | 17 | 15 | 6 | 3 |
| Delete 24 | 5, 13, 17, 30 | 14 | 5 | 2 |

{{q:r6-delete20}}
{{q:r6-delete24}}

:::tip Validation checklist
Sorted keys and a globally ordered leaf chain · only the requested entry added or removed · m separators means m + 1 children · every child key inside its parent interval · d-to-2d occupancy · all leaves at the same depth · no obsolete one-child root.
:::
`,
    },
    {
      id: 'r6-hash', realm: 'r6', title: 'Hashing: buckets, collisions and lookups', mins: 11,
      src: ['05_COMP2605_Hashing_Illustrated.pdf', '06_COMP2605_Hashing_Transitions.pdf'],
      body: `
## Key → hash function → bucket
**Hashing** maps a search key to a **bucket** so an exact-match lookup can start at a calculated location. The **same function** is used for insertion and retrieval.
| Term | Student ID example |
|---|---|
| Search key | Student ID **105** |
| Hash value / bucket index | **h(105) = 105 mod 10 = 5** |
| Bucket / slot | Slot **5** |

A good hash function **spreads** the expected keys across the buckets. A **hash table** is an array of buckets (in memory or on disk).

## Collisions
A **collision** occurs when **different keys produce the same hash value**. A unique key does **not** imply a unique hash value. Collision handling must keep enough information to tell the original keys apart, and **a lookup must always compare the stored key**.

| Method | Idea |
|---|---|
| **Chaining** | Each bucket holds a **collection** (e.g. a list) of colliding entries; retrieval compares keys within the bucket |
| **Open addressing** | On a collision, follow a **probe sequence** to find another free slot in the table; lookups must follow the same sequence |
| **Double hashing** | A probing approach where a **second hash function** chooses the alternative locations (not a second copy of the record) |

## The string-key example: h(key) = sum of character codes mod 10
| Key | Code sum | Bucket |
|---|---|---|
| Alice | 478 | 8 |
| Bob | 275 | 5 |
| Charlie | 696 | 6 |
| David | 488 | 8 (collides with Alice: chained after it) |
| Eve | 288 | 8 (not inserted) |

| get(…) | Keys compared | Result | Comparisons |
|---|---|---|---|
| Alice | Alice | 25 | 1 |
| David | Alice, David | 28 | 2 |
| Eve | Alice, David | None | 2 |

{{w:hash-lab}}

{{q:r6-hash-105}}
{{q:r6-collision}}
{{q:r6-eve}}

## Advantages and limits
- **Advantage:** rapid **exact-match** access without a sequential scan (constant time in the simple, low-collision model).
- **No range support:** hashing does **not** keep key order, so it can’t do range scans or sorted output (use a B+ tree).
- **Distribution:** crowded buckets mean more searching.
- **Growth:** a table may need **resizing and remapping** (with 20 buckets, Alice and David separate).

{{q:r6-range-hash}}
`,
    },
  ],

  questions: [
    { id: 'r6-order', realm: 'r6', topic: 'bpt-structure', kind: 'mcq', d: 2,
      q: 'With order d = 2, how many separator entries and child pointers can a **non-root internal node** have?',
      options: ['1–2 separators; 2–3 pointers', '2–4 separators; 3–5 pointers', '2–4 separators; 2–4 pointers', '4 separators exactly'], answer: 1,
      explain: 'Non-root nodes hold d to 2d entries, and m separators need m + 1 child pointers.' },
    { id: 'r6-equal-right', realm: 'r6', topic: 'bpt-search', kind: 'mcq', d: 1,
      q: 'An internal node holds separators [20 | 40]. A search for exactly 40 follows…',
      options: ['The left child', 'The middle child', 'The right child', 'It stops at the internal node'], answer: 2,
      explain: 'Equality goes right: max(L) < s ≤ min(R). The search must still continue down to a leaf.' },
    { id: 'r6-range', realm: 'r6', topic: 'bpt-search', kind: 'mcq', d: 2,
      q: 'After locating the first key of a range scan, how does a B+ tree find the rest?',
      options: ['Restarts at the root for each key', 'Follows next-leaf links sequentially', 'Reads every internal node', 'Hashes each key'], answer: 1,
      explain: 'Linked leaves give the ordered continuation without returning to the root.' },
    { id: 'r6-pages', realm: 'r6', topic: 'bpt-cost', kind: 'num', d: 2,
      q: 'In a three-level B+ tree (root → internal → leaf), how many index pages does a **cold-cache** equality search read?',
      answer: 3, explain: 'One page per level: root, internal node, leaf. If the root is cached, 2.' },
    { id: 'r6-copy-push', realm: 'r6', topic: 'bpt-insert', kind: 'match', d: 2,
      q: 'Match each split to what happens to the separator.',
      pairs: [['Leaf split', 'Copied up: the entry also stays in the right leaf'], ['Internal-node split', 'Pushed up: kept in neither child']],
      explain: '“Copy up from a leaf; push up from an internal node.”' },
    { id: 'r6-insert8-root', realm: 'r6', topic: 'bpt-insert', kind: 'fill', d: 3,
      q: 'Inserting 8 into the d = 2 tree with root [13 | 17 | 24 | 30] splits the leaf and then the root. Which key ends up alone in the new root?',
      accept: ['17'], explain: 'The parent overflows as [5 | 13 | 17 | 24 | 30]; its middle separator 17 is pushed up to a new root.' },
    { id: 'r6-worked-root', realm: 'r6', topic: 'bpt-insert', kind: 'fill', d: 3,
      q: 'Max 3 keys per node; insert 1, 3, 5, 7, 9, 2, 4, 6, 8, 10 into an empty tree. What key is in the final root?',
      accept: ['7'], explain: 'The last insertion overflows the root [3 | 5 | 7 | 9]; 7 is pushed up, leaving [3 | 5] and [9].' },
    { id: 'r6-delete20', realm: 'r6', topic: 'bpt-delete', kind: 'mcq', d: 3,
      q: 'Deleting 20 leaves [19] (underflow). The right sibling is [24 | 27 | 29]. What happens?',
      options: ['Merge [19] with [24 27 29]', 'Redistribute: move 24 left, giving [19 24] and [27 29], and change the separator to 27', 'Delete the leaf entirely', 'Push 19 up to the root'], answer: 1,
      explain: 'The sibling can lend while keeping its minimum of 2, so redistribute and adjust the separator.' },
    { id: 'r6-delete24', realm: 'r6', topic: 'bpt-delete', kind: 'mcq', d: 3,
      q: 'After deleting 24 (the leaves merge and the parent [30] underflows, with its sibling [5 | 13] at the minimum), what is the final root?',
      options: ['[17]', '[5 | 13 | 17 | 30]', '[13 | 30]', '[27 | 30]'], answer: 1,
      explain: 'The internal nodes merge, pulling down 17; the old root becomes empty and contracts, so the tree returns to two levels.' },
    { id: 'r6-height', realm: 'r6', topic: 'bpt-structure', kind: 'tf', d: 1,
      q: 'In a B+ tree, all leaves are at the same depth.',
      answer: true, explain: 'B+ trees are height-balanced; splits and merges preserve this.' },
    { id: 'r6-data-leaves', realm: 'r6', topic: 'bpt-structure', kind: 'mcq', d: 1,
      q: 'Where are the data entries (keys + rids) stored in a B+ tree?',
      options: ['In the root only', 'In internal nodes only', 'In the leaves; internal nodes hold routing separators', 'In both, duplicated everywhere'], answer: 2,
      explain: 'Separators are routing boundaries, not a second copy of every data record.' },
    { id: 'r6-hash-105', realm: 'r6', topic: 'hashing', kind: 'num', d: 1,
      q: 'With ten slots and h(k) = k mod 10, which slot holds Student ID 105?',
      answer: 5, explain: '105 mod 10 = 5.' },
    { id: 'r6-collision', realm: 'r6', topic: 'collisions', kind: 'mcq', d: 1,
      q: 'What is a collision?',
      options: ['Two transactions writing the same row', 'Two different keys producing the same hash value', 'A full B+ tree leaf', 'A duplicate primary key'], answer: 1,
      explain: 'The records stay distinct; their first destination is the same.' },
    { id: 'r6-eve', realm: 'r6', topic: 'collisions', kind: 'num', d: 2,
      q: 'Bucket 8 holds [Alice, David] (chaining). Eve also hashes to 8 but was never inserted. How many stored-key comparisons does get("Eve") make?',
      answer: 2, explain: 'It compares Alice, then David, finds no match and returns None.' },
    { id: 'r6-range-hash', realm: 'r6', topic: 'hashing', kind: 'mcq', d: 2,
      q: 'Why is a hash index a poor choice for WHERE salary BETWEEN 9000 AND 20000?',
      options: ['Hashing is slower than scanning', 'Hashing does not maintain key order, so it cannot support range scans', 'Hash tables cannot store numbers', 'Ranges cause collisions'], answer: 1,
      explain: 'Use a B+ tree for range queries; hashing is for exact matches.' },
    { id: 'r6-double', realm: 'r6', topic: 'collisions', kind: 'match', d: 2,
      q: 'Match each collision-handling method to its description.',
      pairs: [['Chaining', 'Colliding entries share a bucket collection'], ['Open addressing', 'Probe for another free slot in the table'], ['Double hashing', 'A second hash function chooses alternative slots']],
      explain: 'Double hashing is a probing approach, not a second copy of the record.' },
    { id: 'r6-leafsplit', realm: 'r6', topic: 'bpt-insert', kind: 'mcq', d: 2,
      q: 'With d = 2, the leaf [2 3 5 7] receives 8. How is [2 3 5 7 8] split, and what is copied up?',
      options: ['[2 3 5] [7 8], copy 7', '[2 3] [5 7 8], copy 5', '[2] [3 5 7 8], copy 3', '[2 3 5 7] [8], copy 8'], answer: 1,
      explain: 'Keep d = 2 on the left and d + 1 = 3 on the right; the first key of the new right leaf (5) is copied up.' },
    { id: 'r6-string-hash', realm: 'r6', topic: 'hashing', kind: 'num', d: 2,
      q: '“Bob” has character-code sum 275. With h(key) = sum mod 10, which bucket does Bob go in?',
      answer: 5, explain: '275 mod 10 = 5.' },
  ],

  written: [
    { id: 'r6-w1', realm: 'r6', topic: 'bpt-insert', marks: 8,
      q: 'A B+ tree of order d = 2 has root [13 | 17 | 24 | 30] and leaves [2 3 5 7], [14 16], [19 20 22], [24 27 29], [33 34 38 39]. Show the tree after inserting 8, explaining each split and the difference between copying up and pushing up.',
      model: '8 < 13 routes to [2 3 5 7]. The temporary leaf [2 3 5 7 8] exceeds 2d = 4 entries, so it splits into [2 3] (d entries) and [5 7 8] (d+1). Separator 5, the first key of the new right leaf, is copied into the parent; the data entry 5 stays in the leaf. The parent becomes [5 | 13 | 17 | 24 | 30], which has 5 separators and overflows. It splits around its middle separator 17 into [5 | 13] and [24 | 30], and 17 is pushed up into a new root (it is not kept in either child). Final tree: root [17]; internal nodes [5 | 13] (children [2 3], [5 7 8], [14 16]) and [24 | 30] (children [19 20 22], [24 27 29], [33 34 38 39]). Height grows from 2 to 3; all leaves at the same depth; 17 data entries.',
      points: ['Correct leaf located', 'Leaf overflow identified (max 2d)', 'Correct leaf split [2 3] / [5 7 8]', '5 copied up (stays in leaf)', 'Parent overflow identified', '17 pushed up (removed from children)', 'Correct final tree', 'Height/balance observation'] },
    { id: 'r6-w2', realm: 'r6', topic: 'collisions', marks: 6,
      q: 'Explain hashing for database indexing using h(k) = k mod 10. Define collision, describe chaining, open addressing and double hashing, and state one advantage and two limitations of hash indexes.',
      model: 'A hash function maps a search key to a bucket index; e.g. h(105) = 105 mod 10 = 5, so record 105 is stored in and retrieved from slot 5 using the same function. A collision occurs when different keys give the same hash value (e.g. 105 and 215 both give 5). Chaining keeps a collection of colliding entries in the bucket and compares stored keys on lookup. Open addressing probes a sequence of other slots in the table for a free one; lookups must follow the same probe sequence. Double hashing uses a second hash function to choose the alternative slots. Advantage: fast exact-match lookup without scanning. Limitations: no key order, so no range scans or sorted output; crowded buckets from poor distribution slow searching; growth needs resizing and remapping.',
      points: ['Hash function + example', 'Collision defined', 'Chaining', 'Open addressing', 'Double hashing', 'Advantage + two limitations'] },
  ],

  cards: [
    { id: 'r6-c1', realm: 'r6', front: 'B+ tree', back: 'Dynamic, height-balanced multiway search tree; internal nodes route, leaves hold sorted data entries (key + rid) linked in key order.' },
    { id: 'r6-c2', realm: 'r6', front: 'Order d (lecture convention)', back: 'Non-root nodes hold d to 2d entries; m separators means m + 1 children; root may have 1 separator.' },
    { id: 'r6-c3', realm: 'r6', front: 'Routing rule', back: 'max(L) < s ≤ min(R): equality with a separator goes right.' },
    { id: 'r6-c4', realm: 'r6', front: 'Range search in a B+ tree', back: 'Descend once to the lower bound, then follow next-leaf links until a key exceeds the upper bound.' },
    { id: 'r6-c5', realm: 'r6', front: 'Leaf split (d = 2)', back: '2d + 1 = 5 entries: left d = 2, right d + 1 = 3; copy up the first key of the right leaf.' },
    { id: 'r6-c6', realm: 'r6', front: 'Internal split', back: 'Push the middle separator up; it stays in neither child. A root split adds a level.' },
    { id: 'r6-c7', realm: 'r6', front: 'Deletion repairs', back: 'Still ≥ d: nothing. Underflow + sibling can lend: redistribute and fix the separator. Else merge and remove the parent separator; repair internal underflow upward; contract an empty root.' },
    { id: 'r6-c8', realm: 'r6', front: 'Page reads for equality search', back: 'One page per level (root, internal, leaf = 3 cold; 2 with the root cached). Comparisons within a page are CPU work.' },
    { id: 'r6-c9', realm: 'r6', front: 'Hash index vs B+ tree index', back: 'Hash: equality only, ~constant I/O. B+ tree: equality and range (ordered, linked leaves).' },
    { id: 'r6-c10', realm: 'r6', front: 'Collision', back: 'Different keys produce the same hash value; lookups must compare stored keys.' },
    { id: 'r6-c11', realm: 'r6', front: 'Chaining / open addressing / double hashing', back: 'Bucket collection / probe sequence for a free slot / a second hash function picks alternative slots.' },
    { id: 'r6-c12', realm: 'r6', front: 'Limits of hashing', back: 'No order (no range scans), distribution matters, growth needs resizing/remapping.' },
  ],

  terms: [
    { term: 'B+ tree', def: 'Height-balanced multiway search tree index with data entries in linked leaves.', realm: 'r6' },
    { term: 'Order (B+ tree)', def: 'In the lecture convention, non-root nodes hold d to 2d entries.', realm: 'r6' },
    { term: 'Separator', def: 'Routing key in an internal node; equality goes to the right child.', realm: 'r6' },
    { term: 'rid', def: 'Record identifier stored with a leaf entry, locating the data record.', realm: 'r6' },
    { term: 'Leaf link', def: 'Next/previous pointer between leaves supporting range scans.', realm: 'r6' },
    { term: 'Copy up', def: 'After a leaf split, the first key of the right leaf is copied into the parent.', realm: 'r6' },
    { term: 'Push up', def: 'After an internal split, the middle separator moves to the parent.', realm: 'r6' },
    { term: 'Redistribution', def: 'Borrowing entries from a sibling to fix an underflow, adjusting the separator.', realm: 'r6' },
    { term: 'Merge (B+ tree)', def: 'Combining an underfull node with a sibling and removing a parent separator.', realm: 'r6' },
    { term: 'Hash function', def: 'Maps a search key to a bucket index, e.g. h(k) = k mod 10.', realm: 'r6' },
    { term: 'Collision', def: 'Different keys producing the same hash value.', realm: 'r6' },
    { term: 'Chaining', def: 'Collision handling with a collection of entries per bucket.', realm: 'r6' },
    { term: 'Open addressing', def: 'Collision handling by probing other slots in the table.', realm: 'r6' },
    { term: 'Double hashing', def: 'Open addressing where a second hash function picks alternative slots.', realm: 'r6' },
  ],

  sql: [
    { id: 'r6-s1', realm: 'r6', topic: 'bpt-search', title: 'Range query', dataset: 'dreamhome', d: 1,
      prompt: 'A B+ tree index on salary makes range queries cheap. List staffNo and salary for staff earning **between 9000 and 20000** inclusive, ordered by salary.',
      solution: 'SELECT staffNo, salary FROM Staff WHERE salary BETWEEN 9000 AND 20000 ORDER BY salary;', ordered: true },
  ],

  codex: `
## B+ tree (order d: non-root nodes hold d to 2d entries)
- Internal: m separators means m + 1 children. Root: ≥ 1 separator. Leaves: sorted key + rid, linked.
- Routing: **max(L) < s ≤ min(R)**; equality goes right; always finish at a leaf.
- Range: descend once, then follow the leaf links.
- Page reads = levels (3 cold / 2 with the root cached for 3 levels).

## Insert
Leaf overflow (2d+1): split **d | d+1**, **copy up** the first key of the right leaf. Internal overflow: **push up** the middle. A root split adds a level.
Insert 8 into root [13|17|24|30]: [2 3] [5 7 8], copy 5; parent [5|13|17|24|30] overflows, push 17 → root [17].

## Delete
≥ d: done · underflow + rich sibling: **redistribute** + fix separator · else **merge** + drop separator → maybe an internal underflow: borrow or merge (pull separator down) → contract an empty root.

## Hashing
h(k) = k mod 10 → h(105) = 5 · collisions: chaining / open addressing / double hashing · lookups compare stored keys · exact match only, no ranges · resize = remap.
`,
}

export default r6
