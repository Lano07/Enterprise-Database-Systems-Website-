// Realm 5 widgets: query pipeline, query trees, search race and join race.
import { useEffect, useState, type ComponentType } from 'react'

// ---------------- query pipeline ----------------
const CATALOG: Record<string, string[]> = { Book: ['BookId', 'BookName', 'Edition'], Loan: ['LoanId', 'MemberId', 'BookId', 'DateOut', 'DateDue', 'DateReturned'] }
const PRESETS = [
  "SELECT BookName FROM Book WHERE BookId = 'ADM3713';",
  "SELECT BookTitle FROM Book WHERE BookId = 'ADM3713';",
  "SELECT BookName Book WHERE BookId = 'ADM3713';",
]
function QueryPipeline() {
  const [sql, setSql] = useState(PRESETS[0])
  const [step, setStep] = useState(0)
  const tokens = sql.match(/'[^']*'|\w+|[=;,*.<>]/g) || []
  const kw = new Set(['SELECT', 'FROM', 'WHERE', 'AND'])
  const m = sql.match(/^\s*SELECT\s+([\w\s,*]+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(\w+)\s*=\s*('[^']*'|\d+))?\s*;?\s*$/i)
  const parseErr = m ? '' : 'Syntax error: expected SELECT <columns> FROM <table> [WHERE <column> = <value>]. Check for a missing keyword such as FROM.'
  const cols = m ? m[1].split(',').map((s) => s.trim()) : []
  const table = m?.[2] || ''
  const whereCol = m?.[3]
  const known = CATALOG[table]
  const badNames = m ? [...(!known ? [`relation ${table}`] : []), ...(known ? [...cols.filter((c) => c !== '*' && !known.includes(c)), ...(whereCol && !known.includes(whereCol) ? [whereCol] : [])].map((c) => `attribute ${c}`) : [])] : []
  const stages = [
    { t: 'Scanning', ok: true, body: <div className="row" style={{ gap: 4 }}>{tokens.map((t, i) => <span key={i} className={'tag' + (kw.has(t.toUpperCase()) ? ' acc' : t.startsWith("'") ? ' warn' : '')}>{t}</span>)}</div> },
    { t: 'Parsing', ok: !parseErr, body: parseErr ? <span className="res-err">{parseErr}</span> : <span className="mono">π {cols.join(', ')} ({whereCol ? `σ ${whereCol} = ${m![4]} (` : ''}{table}{whereCol ? ')' : ''})</span> },
    { t: 'Validating', ok: !parseErr && !badNames.length, body: parseErr ? <span className="muted">(skipped: parsing failed)</span> : badNames.length ? <span className="res-err">Invalid {badNames.join(', ')}: not in the data dictionary.</span> : <span>All names exist in the data dictionary: {table}({known.join(', ')}).</span> },
    { t: 'Optimization', ok: !parseErr && !badNames.length, body: <span>{whereCol === 'BookId' ? 'BookId has a primary index, so the plan is an index search: SEEK(Book, BookId, value).' : 'No usable index, so the plan is a linear search (file scan).'}</span> },
    { t: 'Code generation', ok: !parseErr && !badNames.length, body: <span>Code produced for the plan (interpreted now, or compiled and stored for reuse).</span> },
    { t: 'Runtime processing', ok: !parseErr && !badNames.length, body: <span>Result: <b>Modern Database Management</b></span> },
  ]
  const failAt = stages.findIndex((s) => !s.ok)
  const shown = failAt >= 0 ? Math.min(step, failAt) : step
  useEffect(() => setStep(0), [sql])
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small"><b>Follow a query through the Query Manager</b>{PRESETS.map((p, i) => <button key={i} className={'btn sm' + (p === sql ? ' primary' : '')} onClick={() => setSql(p)}>{['valid', 'bad column', 'missing FROM'][i]}</button>)}</div>
      <input type="text" value={sql} onChange={(e) => setSql(e.target.value)} style={{ width: '100%', margin: '8px 0', fontFamily: 'var(--f-code)' }} aria-label="SQL query" />
      {stages.slice(0, shown + 1).map((s, i) => (
        <div key={i} className="row small" style={{ alignItems: 'flex-start', margin: '4px 0' }}>
          <span className={'tag ' + (s.ok ? 'ok' : 'bad')} style={{ minWidth: 120 }}>{i + 1}. {s.t}</span><div style={{ flex: 1 }}>{s.body}</div>
        </div>
      ))}
      <div className="row" style={{ marginTop: 6 }}>
        <button className="btn sm primary" disabled={shown >= stages.length - 1 || (failAt >= 0 && shown >= failAt)} onClick={() => setStep(shown + 1)}>Next step ▶</button>
        <button className="btn sm" onClick={() => setStep(0)}>Restart</button>
        {failAt >= 0 && shown >= failAt && <span className="small res-err">Processing stops at {stages[failAt].t.toLowerCase()}, and an error is returned to the user.</span>}
      </div>
    </div>
  )
}

// ---------------- query trees: restrict first vs join first ----------------
function QueryTree() {
  const [first, setFirst] = useState<'restrict' | 'join'>('restrict')
  const nodes = first === 'restrict'
    ? [{ x: 200, y: 30, t: 'π BookId, BookName', n: 5 }, { x: 200, y: 95, t: '⋈ Loan.BookId = Book.BookId', n: 5 }, { x: 110, y: 160, t: "σ DateOut = '27-Mar-2007'", n: 5 }, { x: 110, y: 225, t: 'Loan', n: 10 }, { x: 300, y: 225, t: 'Book', n: 5 }]
    : [{ x: 200, y: 30, t: 'π BookId, BookName', n: 5 }, { x: 200, y: 95, t: "σ DateOut = '27-Mar-2007'", n: 5 }, { x: 200, y: 160, t: '⋈ Loan.BookId = Book.BookId', n: 10 }, { x: 110, y: 225, t: 'Loan', n: 10 }, { x: 300, y: 225, t: 'Book', n: 5 }]
  const edges = first === 'restrict' ? [[0, 1], [1, 2], [1, 4], [2, 3]] : [[0, 1], [1, 2], [2, 3], [2, 4]]
  const joinIn = first === 'restrict' ? 5 + 5 : 10 + 5
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small"><b>Two query trees, one answer</b>
        <button className={'btn sm' + (first === 'restrict' ? ' primary' : '')} onClick={() => setFirst('restrict')}>Restrict before join</button>
        <button className={'btn sm' + (first === 'join' ? ' primary' : '')} onClick={() => setFirst('join')}>Join before restrict</button></div>
      <div className="svg-wrap" style={{ marginTop: 8 }}>
        <svg viewBox="0 0 420 260" style={{ width: '100%', maxWidth: 520, display: 'block', margin: '0 auto' }} role="img" aria-label="Query tree">
          {edges.map(([a, b], i) => <line key={i} x1={nodes[a].x} y1={nodes[a].y + 12} x2={nodes[b].x} y2={nodes[b].y - 12} stroke="var(--muted)" />)}
          {nodes.map((n, i) => (
            <g key={i}>
              <rect x={n.x - 95} y={n.y - 14} width={190} height={28} rx={6} fill={n.t.startsWith('⋈') ? 'var(--warn-soft)' : 'var(--surface)'} stroke="var(--line)" />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="11" fill="var(--ink)">{n.t}</text>
              <text x={n.x + 100} y={n.y + 4} fontSize="10" fill="var(--accent)">{n.n} rows</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="q-explain">The join receives <b>{joinIn}</b> input tuples {first === 'restrict' ? '(5 filtered loans + 5 books).' : '(all 10 loans + 5 books), and the date filter only runs afterwards.'} With thousands of loans the difference becomes enormous, which is why the optimizer pushes restrictions down.</div>
    </div>
  )
}

// ---------------- linear vs index search race ----------------
function SearchRace() {
  const [n, setN] = useState(1000)
  const [pos, setPos] = useState(650)
  const [unique, setUnique] = useState(true)
  const linear = unique ? Math.min(pos, n) : n
  const levels = Math.max(1, Math.ceil(Math.log(n) / Math.log(100)))
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <b className="small">Linear search vs index search</b>
      <div className="row" style={{ margin: '8px 0' }}>
        <label className="small">records: <b>{n.toLocaleString()}</b> <input type="range" min={5} max={100000} step={5} value={n} onChange={(e) => { setN(+e.target.value); setPos((p) => Math.min(p, +e.target.value)) }} /></label>
        <label className="small">target position: <b>{Math.min(pos, n).toLocaleString()}</b> <input type="range" min={1} max={n} value={Math.min(pos, n)} onChange={(e) => setPos(+e.target.value)} disabled={!unique} /></label>
        <label className="small"><input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} /> searching a unique column</label>
      </div>
      <div className="grid g3">
        <div className="card"><div className="small muted">Linear search reads</div><div style={{ fontFamily: 'var(--f-display)', fontSize: '1.4rem' }}>{linear.toLocaleString()}</div><div className="small">{unique ? 'stops at the match' : 'must read the whole file'}</div></div>
        <div className="card"><div className="small muted">Index search (B+ tree, ~100 keys per node)</div><div style={{ fontFamily: 'var(--f-display)', fontSize: '1.4rem', color: 'var(--ok)' }}>{levels} + 1</div><div className="small">{levels} index level{levels === 1 ? '' : 's'} + 1 record read per match</div></div>
      </div>
      <div className="small muted" style={{ marginTop: 6 }}>Index search assumes an index exists on the searched column. Remember, it also adds maintenance cost to every INSERT, UPDATE and DELETE.</div>
    </div>
  )
}

// ---------------- join race on the lecture data ----------------
const BOOKS = ['ROB7600', 'ADM3713', 'OSB14565', 'ELM1074', 'HMN8660']
const LOANS: [string, string, boolean][] = [['01234', 'ROB7600', true], ['01235', 'ADM3713', true], ['01236', 'OSB14565', true], ['01237', 'ROB7600', false], ['01238', 'ELM1074', true], ['01239', 'ADM3713', false], ['01240', 'OSB14565', false], ['01241', 'ELM1074', false], ['01242', 'HMN8660', true], ['01243', 'ADM3713', false]]
function JoinRace() {
  const [m, setM] = useState<'nested' | 'index' | 'hash'>('nested')
  const [t, setT] = useState(0)
  const [play, setPlay] = useState(false)
  // build an event list of (bookIdx | -1, loanIdx | -1, kind)
  const events: { b: number; l: number; k: string }[] = []
  if (m === 'nested') BOOKS.forEach((_, b) => LOANS.forEach((_, l) => events.push({ b, l, k: 'compare' })))
  if (m === 'index') LOANS.forEach((ln, l) => { events.push({ b: -1, l, k: 'scan' }); if (ln[2]) events.push({ b: BOOKS.indexOf(ln[1]), l, k: 'seek' }) })
  if (m === 'hash') { BOOKS.forEach((_, b) => events.push({ b, l: -1, k: 'build' })); LOANS.forEach((ln, l) => events.push({ b: ln[2] ? BOOKS.indexOf(ln[1]) : -1, l, k: 'probe' })) }
  useEffect(() => { setT(0); setPlay(false) }, [m])
  useEffect(() => {
    if (!play) return
    if (t >= events.length) { setPlay(false); return }
    const id = setTimeout(() => setT((x) => x + 1), m === 'nested' ? 40 : 160)
    return () => clearTimeout(id)
  }, [play, t, events.length, m])
  const cur = events[t - 1]
  const count = (k: string) => events.slice(0, t).filter((e) => e.k === k).length
  const cell = (on: boolean, hit: boolean) => ({ padding: '3px 6px', borderRadius: 4, fontFamily: 'var(--f-code)', fontSize: '.75rem', border: '1px solid var(--line)', background: on ? (hit ? 'var(--ok-soft)' : 'var(--hl-soft)') : 'var(--surface)' })
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small"><b>Join race: Book (5) ⋈ Loan (10), DateOut = 27-10-2005</b>
        {(['nested', 'index', 'hash'] as const).map((k) => <button key={k} className={'btn sm' + (m === k ? ' primary' : '')} onClick={() => setM(k)}>{k === 'nested' ? 'Nested loop' : k === 'index' ? 'Index join' : 'Hash join'}</button>)}
        <span className="spacer" /><button className="btn sm primary" onClick={() => { if (t >= events.length) setT(0); setPlay(!play) }}>{play ? '❚❚ Pause' : t >= events.length ? '↺ Replay' : '▶ Run'}</button></div>
      <div className="row" style={{ alignItems: 'flex-start', marginTop: 8, gap: 16 }}>
        <div><div className="small muted">Book {m === 'hash' ? '(build)' : m === 'index' ? '(inner, indexed)' : '(outer)'}</div>{BOOKS.map((b, i) => <div key={b} style={cell(cur?.b === i, cur?.k === 'seek' || cur?.k === 'probe' || (cur?.k === 'compare' && LOANS[cur.l][1] === b))}>{b}</div>)}</div>
        <div><div className="small muted">Loan {m === 'nested' ? '(inner)' : m === 'index' ? '(outer)' : '(probe)'}</div>{LOANS.map((l, i) => <div key={l[0]} style={{ ...cell(cur?.l === i, cur?.k === 'compare' ? BOOKS[cur.b] === l[1] && l[2] : l[2]), opacity: l[2] ? 1 : 0.6 }}>{l[0]} {l[1]} {l[2] ? '27-10' : 'other'}</div>)}</div>
        <div className="kv small" style={{ minWidth: 180 }}>
          {m === 'nested' && <><dt>comparisons</dt><dd>{count('compare')} / 50</dd></>}
          {m === 'index' && <><dt>Loan reads</dt><dd>{count('scan')} / 10</dd><dt>SEEKs into Book</dt><dd>{count('seek')} / 5</dd></>}
          {m === 'hash' && <><dt>build reads</dt><dd>{count('build')} / 5</dd><dt>probe reads</dt><dd>{count('probe')} / 10</dd></>}
          <dt>step</dt><dd>{t} / {events.length}</dd>
        </div>
      </div>
    </div>
  )
}

export const WIDGETS_R5: Record<string, ComponentType> = {
  'query-pipeline': QueryPipeline,
  'query-tree': QueryTree,
  'search-race': SearchRace,
  'join-race': JoinRace,
}
