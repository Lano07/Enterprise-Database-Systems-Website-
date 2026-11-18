// Query Optimizer Tycoon: pick access methods to beat a read budget.
// Cost model (stated in the UI, following the Join Data Access Methods lecture):
//   record read = 1 · SEEK through an index = 1 index probe + 1 record read = 2
//   nested loop: read outer once; every qualifying outer row rescans the whole inner input
//   index join: read outer once; each qualifying outer row SEEKs the inner (needs an index on the inner join column)
//   hash join: read build input once + probe input once; if the build side exceeds memory, partitioning ≈ triples the I/O
import { useState } from 'react'
import { emit, recordAnswer, toolLevel, useSave } from '../game/store'

export interface Table { name: string; rows: number; filtered?: number; indexOn?: string }
export type Plan =
  | { m: 'linear'; unique: boolean; position?: number }
  | { m: 'index' }
  | { m: 'nested'; outer: 'A' | 'B' }
  | { m: 'indexjoin'; outer: 'A' | 'B' }
  | { m: 'hash'; build: 'A' | 'B' }

export interface Contract {
  id: string
  title: string
  brief: string
  sql: string
  kind: 'single' | 'join'
  A: Table
  B?: Table
  joinCol?: string
  memory?: number
  budget: number
  unique?: boolean
  targetPos?: number
  lesson: string
}

export function cost(c: Contract, p: Plan): { reads: number; comparisons: number; note: string; ok: boolean } {
  const A = c.A, B = c.B
  if (p.m === 'linear') {
    const reads = c.unique ? c.targetPos ?? A.rows : A.rows
    return { reads, comparisons: reads, note: c.unique ? `Unique key: the scan stops at record ${reads}.` : 'Non-unique column: the whole file must be scanned.', ok: true }
  }
  if (p.m === 'index') {
    if (!A.indexOn) return { reads: Infinity, comparisons: 0, note: `There is no index on ${A.name} for this column, so SEEK is impossible.`, ok: false }
    const matches = c.unique ? 1 : A.filtered ?? 1
    return { reads: 2 * matches, comparisons: matches, note: `${matches} SEEK${matches === 1 ? '' : 's'} × (1 index probe + 1 record read).`, ok: true }
  }
  if (!B) return { reads: Infinity, comparisons: 0, note: 'Not a join.', ok: false }
  const [O, I] = (p.m === 'hash' ? p.build : p.outer) === 'A' ? [A, B] : [B, A]
  const qual = O.filtered ?? O.rows
  if (p.m === 'nested') {
    const comparisons = qual * I.rows
    return { reads: O.rows + comparisons, comparisons, note: `Read ${O.name} once (${O.rows}); ${qual} qualifying row${qual === 1 ? '' : 's'} × ${I.rows} ${I.name} rows = ${comparisons.toLocaleString()} inner reads/comparisons.`, ok: true }
  }
  if (p.m === 'indexjoin') {
    if (I.indexOn !== c.joinCol) return { reads: Infinity, comparisons: 0, note: `${I.name} has no index on ${c.joinCol}, so it cannot be the inner table of an index join.`, ok: false }
    return { reads: O.rows + 2 * qual, comparisons: qual, note: `Read ${O.name} once (${O.rows}); ${qual} SEEK${qual === 1 ? '' : 's'} into ${I.name} × 2.`, ok: true }
  }
  // hash: O is the build side, I the probe side
  const build = O.filtered ?? O.rows
  const base = O.rows + I.rows
  const fits = !c.memory || build <= c.memory
  return {
    reads: fits ? base : 3 * base, comparisons: I.filtered ?? I.rows,
    note: fits ? `Build on ${O.name} (${build} rows in memory) + probe with ${I.name}: each input read once.` : `The ${build}-row build table exceeds memory (${c.memory}), so both inputs are partitioned: written and read again (≈3× I/O). Build on the smaller input!`, ok: true,
  }
}

export const CONTRACTS: Contract[] = [
  { id: 'c1', title: 'Find one book', kind: 'single', budget: 4, unique: true, targetPos: 650, lesson: 'A primary index turns a 650-read scan into a single SEEK.',
    brief: 'The catalogue has 1,000 unordered Book records. Find the BookId ADM3713 (it happens to be record 650). There is a primary index on BookId.',
    sql: "SELECT BookName FROM Book WHERE BookId = 'ADM3713';", A: { name: 'Book', rows: 1000, indexOn: 'BookId' } },
  { id: 'c2', title: 'Find every 4th edition', kind: 'single', budget: 1000, lesson: 'Without an index on the searched column, the only option is a full linear scan, and the budget allows for it. Not every query can be made fast.',
    brief: 'Find all books with Edition = 4 among 1,000 records. The only index is on BookId.',
    sql: 'SELECT BookName FROM Book WHERE Edition = 4;', A: { name: 'Book', rows: 1000, filtered: 40, indexOn: undefined } },
  { id: 'c3', title: 'The lecture join', kind: 'join', budget: 16, joinCol: 'BookId', lesson: 'An in-memory hash join reads each input once: 5 + 10 = 15 reads, versus 55 for the brute-force nested loop with Book outer.',
    brief: 'Books borrowed on 27-10-2005: Book has 5 records, Loan has 10 (5 on that date). No indexes on the join column.',
    sql: "SELECT b.BookId, b.BookName FROM Loan l JOIN Book b ON l.BookId = b.BookId WHERE l.DateOut = '27-10-2005';",
    A: { name: 'Book', rows: 5 }, B: { name: 'Loan', rows: 10, filtered: 5 }, memory: 100 },
  { id: 'c4', title: 'Big library, indexed', kind: 'join', budget: 11000, joinCol: 'BookId', lesson: 'With few qualifying outer rows and an index on the inner join column, the index join wins (10,000 + 2 × 100 = 10,200).',
    brief: 'Loan has 10,000 records (100 on the date asked for); Book has 2,000 records with an index on BookId. Hash memory: 5,000 rows.',
    sql: "SELECT b.BookId, b.BookName FROM Loan l JOIN Book b ON l.BookId = b.BookId WHERE l.DateOut = '2015-03-27';",
    A: { name: 'Loan', rows: 10000, filtered: 100 }, B: { name: 'Book', rows: 2000, indexOn: 'BookId' }, memory: 5000 },
  { id: 'c5', title: 'Big library, no index, tight memory', kind: 'join', budget: 13000, joinCol: 'MemberId', lesson: 'No useful index and large inputs: hash join, built on the smaller input so the table fits in memory (3,000 + 10,000 = 13,000). Building on Loan would overflow memory and triple the I/O.',
    brief: 'Join Member (3,000 records) with all 10,000 Loan records on MemberId. No index on MemberId in either table. Hash memory: 4,000 rows.',
    sql: 'SELECT m.MemberName, l.LoanId FROM Member m JOIN Loan l ON l.MemberId = m.MemberId;',
    A: { name: 'Member', rows: 3000 }, B: { name: 'Loan', rows: 10000 }, memory: 4000 },
]

function planLabel(c: Contract, p: Plan) {
  const nm = (x: 'A' | 'B') => (x === 'A' ? c.A.name : c.B!.name)
  switch (p.m) {
    case 'linear': return 'Linear search (file scan)'
    case 'index': return 'Index search (SEEK)'
    case 'nested': return `Nested loop, ${nm(p.outer)} outer`
    case 'indexjoin': return `Index join, ${nm(p.outer)} outer / ${nm(p.outer === 'A' ? 'B' : 'A')} inner`
    case 'hash': return `Hash join, build on ${nm(p.build)}`
  }
}

export function plansFor(c: Contract): Plan[] {
  if (c.kind === 'single') return [{ m: 'linear', unique: !!c.unique }, { m: 'index' }]
  return [{ m: 'nested', outer: 'A' }, { m: 'nested', outer: 'B' }, { m: 'indexjoin', outer: 'A' }, { m: 'indexjoin', outer: 'B' }, { m: 'hash', build: 'A' }, { m: 'hash', build: 'B' }]
}

export function Optimizer({ stage }: { stage?: string }) {
  const s = useSave()
  const cleared = s.tools['optimizer'] || 0
  const [i, setI] = useState(Math.min(Number(stage) || cleared, CONTRACTS.length - 1))
  const c = CONTRACTS[i]
  const [pick, setPick] = useState<number | null>(null)
  const [ran, setRan] = useState<null | { reads: number; ok: boolean; win: boolean; note: string }>(null)
  const [anim, setAnim] = useState(0)
  const plans = plansFor(c)
  const go = (k: number) => { setI(k); setPick(null); setRan(null) }
  const run = () => {
    if (pick === null) return
    const r = cost(c, plans[pick])
    const win = r.ok && r.reads <= c.budget
    setRan({ reads: r.reads, ok: r.ok, win, note: r.note })
    recordAnswer(`opt-${c.id}`, 'r5', c.kind === 'single' ? 'single-access' : plans[pick].m === 'hash' ? 'hash-join' : plans[pick].m === 'indexjoin' ? 'index-join' : 'nested-loop', win, { base: 15 })
    // animate the read counter
    if (r.ok && isFinite(r.reads)) {
      const steps = 30
      for (let t = 1; t <= steps; t++) setTimeout(() => setAnim(Math.round((r.reads * t) / steps)), t * 25)
    } else setAnim(0)
    if (win) { toolLevel('optimizer', i + 1, 50); emit({ type: 'toast', text: `💰 Contract “${c.title}” fulfilled!`, tone: 'ok' }) }
  }
  const best = Math.min(...plans.map((p) => { const r = cost(c, p); return r.ok ? r.reads : Infinity }))

  return (
    <div>
      <p className="lede">Each contract is a query with a <b>read budget</b>. Choose the access method (and which table is outer, inner or build) that finishes within budget. Costs follow the lecture’s model: a record read costs 1, and a SEEK through an index costs 2 (index probe + record read).</p>
      <div className="stage-tabs">
        {CONTRACTS.map((x, k) => <button key={x.id} className={(k === i ? 'on ' : '') + (k < cleared ? 'done' : '')} disabled={k > cleared && !s.settings.freeRoam} onClick={() => go(k)}>{k + 1}. {x.title}</button>)}
      </div>
      <div className="tool-grid">
        <div>
          <div className="panel">
            <div className="row"><h3 style={{ margin: 0 }}>Contract {i + 1}: {c.title}</h3><span className="spacer" /><span className="tag warn">budget ≤ {c.budget.toLocaleString()} reads</span></div>
            <p style={{ margin: '8px 0' }}>{c.brief}</p>
            <pre className="code" style={{ margin: 0 }}>{c.sql}</pre>
          </div>
          <div className="grid" style={{ marginTop: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {plans.map((p, k) => (
              <button key={k} className={'opt' + (pick === k ? ' sel' : '')} style={{ display: 'block', minHeight: 64 }} onClick={() => { setPick(k); setRan(null) }}>
                <b style={{ display: 'block' }}>{planLabel(c, p)}</b>
                <span className="small muted">{p.m === 'linear' ? 'read every record until done' : p.m === 'index' ? 'probe the index, then read the row' : p.m === 'nested' ? 'rescan the inner input for every qualifying outer row' : p.m === 'indexjoin' ? 'seek the inner table through its join-column index' : 'build an in-memory hash table, then probe it'}</span>
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" disabled={pick === null} onClick={run}>▶ Execute plan</button>
            {ran && <span className={'timer' + (ran.win ? '' : ' low')}>{ran.ok ? `${anim.toLocaleString()} reads` : '✖ invalid plan'}</span>}
          </div>
          {ran && (
            <div className="q-explain" style={{ marginTop: 10, background: ran.win ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>
              {ran.win ? <b className="ok">✔ Within budget! </b> : <b className="bad">✖ {ran.ok ? 'Over budget. ' : ''}</b>}{ran.note}
              {ran.win && <div style={{ marginTop: 4 }}>{c.lesson}{ran.reads > best ? ` (An even cheaper plan exists: ${best.toLocaleString()} reads.)` : ''}</div>}
              {ran.win && i + 1 < CONTRACTS.length && <div style={{ marginTop: 6 }}><button className="btn sm" onClick={() => go(i + 1)}>Next contract →</button></div>}
            </div>
          )}
        </div>
        <div className="panel" style={{ alignSelf: 'start' }}>
          <h3>Tables</h3>
          {[c.A, c.B].filter(Boolean).map((t) => (
            <div key={t!.name} className="rel-box">
              <b>{t!.name}</b>
              <div className="small">{t!.rows.toLocaleString()} records{t!.filtered !== undefined ? ` · ${t!.filtered.toLocaleString()} qualify` : ''}</div>
              <div className="small muted">{t!.indexOn ? `index on ${t!.indexOn}` : 'no index on the column used'}</div>
            </div>
          ))}
          {c.memory && <div className="small">Hash-table memory: <b>{c.memory.toLocaleString()} rows</b></div>}
          <hr style={{ margin: '12px 0' }} />
          <div className="small muted">Rules of thumb from the lecture: nested loop, when the outer is small or filtered; index join, when an index exists on the inner join column; hash join, when there is no useful index and the smaller input fits in memory.</div>
        </div>
      </div>
    </div>
  )
}
