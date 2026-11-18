// Interactive widgets embedded in lessons with {{w:id}}.
import { useState, type ReactNode } from 'react'
import { RaMini } from './RelAlgebra'
import { EXTRA_WIDGETS } from './widgets2'

const RA_PRESETS: Record<string, [string, string?]> = {
  'ra-closure': ["π[fName, lName](σ[position = 'Manager'](Staff))", 'The inner σ outputs a relation, which becomes the input of π. Try adding another operation around it.'],
  'ra-select': ['σ[salary > 10000](Staff)', 'Try a compound predicate: σ[salary > 10000 AND sex = \'F\'](Staff)'],
  'ra-project': ['π[staffNo, fName, lName, salary](Staff)', 'Now try π[position](Staff) and count the tuples: duplicates are eliminated.'],
  'ra-setops': ['π[city](Branch) ∪ π[city](PropertyForRent)', 'Swap ∪ for − or ∩ and compare the results with the lecture.'],
  'ra-joins': ['π[clientNo, fName, lName](Client) ⋈ π[clientNo, propertyNo, comment](Viewing)', 'Natural join. Try the equijoin form: π[clientNo, fName, lName](Client) ⋈[Client.clientNo = Viewing.clientNo] π[clientNo, propertyNo, comment](Viewing), or the outer join π[propertyNo, street, city](PropertyForRent) ⟕ Viewing'],
  'ra-division': ['π[clientNo, propertyNo](Viewing) ÷ π[propertyNo](σ[rooms = 3](PropertyForRent))', 'The divisor is the set of 3-room properties. Only clients paired with every one of them survive.'],
}

export function Widget({ id }: { id: string }) {
  if (RA_PRESETS[id]) return <RaMini initial={RA_PRESETS[id][0]} note={RA_PRESETS[id][1]} />
  if (id === 'dbms-flow') return <DbmsFlow />
  if (id === 'key-finder') return <KeyFinder />
  const W = EXTRA_WIDGETS[id]
  if (W) return <W />
  return <div className="empty">Widget “{id}” is not available.</div>
}

// ---------------- DBMS request flow ----------------
const FLOW: { title: string; text: string; on: string[] }[] = [
  { title: '1. Request', text: 'A teller’s application asks: “What is the balance of account 4411?” It is a query, so it enters the Query Processor.', on: ['user', 'a-uq'] },
  { title: '2. Plan', text: 'The Query Processor (Query Manager) parses the request and chooses a plan: use the account-number index rather than scanning every block.', on: ['qp'] },
  { title: '3. Coordinate', text: 'The Transaction Manager learns which data the operation touches, so it can avoid conflicts with other ATMs updating the same account.', on: ['qp', 'tm', 'a-qt'] },
  { title: '4. Fetch blocks', text: 'The Storage Manager asks the File Manager to locate the index and data blocks on disk; the Buffer Manager places them in main-memory pages.', on: ['qp', 'sm', 'a-qs', 'a-ss'] },
  { title: '5. Read data + metadata', text: 'Metadata (the relation, attribute types, “accountNo is indexed”) guides access; the index finds the row; the balance is a data value.', on: ['sm', 'disk', 'a-ss'] },
  { title: '6. Result', text: 'The balance travels back up through storage and query processing to the user. The Transaction Manager also logs changes (for updates) so recovery is possible.', on: ['user', 'qp', 'a-uq'] },
]
function DbmsFlow() {
  const [i, setI] = useState(0)
  const on = new Set(FLOW[i].on)
  const box = (id: string, x: number, y: number, w: number, h: number, label: ReactNode) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={on.has(id) ? 'var(--accent-soft)' : 'var(--surface)'} stroke={on.has(id) ? 'var(--accent)' : 'var(--line)'} strokeWidth={on.has(id) ? 2.5 : 1.2} />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="12" fill="var(--ink)">{label}</text>
    </g>
  )
  const arrow = (id: string, x1: number, y1: number, x2: number, y2: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={on.has(id) ? 'var(--accent)' : 'var(--line)'} strokeWidth={on.has(id) ? 3 : 1.5} markerEnd="url(#ah)" />
  )
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small" style={{ marginBottom: 6 }}><b>Trace a request: retrieve an account balance</b><span className="spacer" />
        <button className="btn sm" disabled={i === 0} onClick={() => setI(i - 1)}>◀</button><span className="mono">{i + 1}/{FLOW.length}</span><button className="btn sm primary" disabled={i === FLOW.length - 1} onClick={() => setI(i + 1)}>▶</button></div>
      <div className="svg-wrap">
        <svg viewBox="0 0 560 300" style={{ width: '100%', minWidth: 480, display: 'block' }} role="img" aria-label="DBMS architecture diagram">
          <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)" /></marker></defs>
          {box('user', 150, 10, 260, 34, 'Schema modifications · Queries · Updates')}
          {arrow('a-uq', 280, 44, 280, 70)}
          {box('qp', 190, 72, 180, 40, 'Query Processor')}
          {arrow('a-qt', 370, 92, 420, 92)}
          {box('tm', 422, 72, 128, 40, 'Transaction Mgr')}
          {arrow('a-qs', 280, 112, 280, 140)}
          {box('sm', 150, 142, 260, 62, '')}
          <text x={280} y={160} textAnchor="middle" fontSize="12" fill="var(--ink)">Storage Manager</text>
          <rect x={165} y={170} width={110} height={26} rx={5} fill="var(--sunk)" /><text x={220} y={187} textAnchor="middle" fontSize="11" fill="var(--ink-2)">File Manager</text>
          <rect x={285} y={170} width={110} height={26} rx={5} fill="var(--sunk)" /><text x={340} y={187} textAnchor="middle" fontSize="11" fill="var(--ink-2)">Buffer Manager</text>
          <line x1={486} y1={112} x2={410} y2={160} stroke="var(--line)" strokeWidth={1.5} markerEnd="url(#ah)" />
          {arrow('a-ss', 280, 204, 280, 232)}
          <g>
            <ellipse cx={280} cy={240} rx={90} ry={10} fill={on.has('disk') ? 'var(--accent-soft)' : 'var(--sunk)'} stroke={on.has('disk') ? 'var(--accent)' : 'var(--line)'} />
            <path d="M190 240v38c0 5.5 40 10 90 10s90-4.5 90-10v-38" fill={on.has('disk') ? 'var(--accent-soft)' : 'var(--sunk)'} stroke={on.has('disk') ? 'var(--accent)' : 'var(--line)'} />
            <text x={280} y={272} textAnchor="middle" fontSize="12" fill="var(--ink)">Storage: data + metadata</text>
          </g>
        </svg>
      </div>
      <div className="q-explain" style={{ marginTop: 8 }}><b>{FLOW[i].title}</b> {FLOW[i].text}</div>
    </div>
  )
}

// ---------------- Superkey / candidate key finder ----------------
const EMP = { cols: ['Emp_SSN', 'Emp_Number', 'Emp_Name'], rows: [['123456789', '226', 'Steve'], ['999999321', '227', 'Ajeet'], ['888997212', '228', 'Chaitanya'], ['777778888', '229', 'Robert']] }
const CANDS = [['Emp_SSN'], ['Emp_Number']]
function KeyFinder() {
  const [sel, setSel] = useState<string[]>([])
  const [found, setFound] = useState<string[]>([])
  const isSuper = CANDS.some((c) => c.every((a) => sel.includes(a)))
  const isCand = isSuper && CANDS.some((c) => c.length === sel.length && c.every((a) => sel.includes(a)))
  const toggle = (a: string) => setSel((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]))
  const label = `{${sel.join(', ')}}`
  const record = () => {
    if (!isSuper || found.includes(label)) return
    const f = [...found, label]
    setFound(f)
  }
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="small"><b>Key finder.</b> Pick attributes of Employee to test them. (Semantics: SSN and employee number are each unique in the real world; names are not.)</div>
      <div style={{ margin: '8px 0' }}>{EMP.cols.map((c) => <span key={c} className={'attr-chip' + (sel.includes(c) ? ' on' : '')} onClick={() => toggle(c)} role="checkbox" aria-checked={sel.includes(c)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && toggle(c)}>{c}</span>)}</div>
      <div className="tbl-wrap"><table className="tbl"><thead><tr>{EMP.cols.map((c) => <th key={c} style={sel.includes(c) ? { background: 'var(--accent-soft)' } : undefined}>{c}</th>)}</tr></thead>
        <tbody>{EMP.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={sel.includes(EMP.cols[j]) ? { background: 'var(--accent-soft)' } : undefined}>{v}</td>)}</tr>)}</tbody></table></div>
      {sel.length > 0 && (
        <div className="q-explain">
          <b className={isSuper ? 'ok' : 'bad'}>{label} is {isSuper ? '' : 'not '}a superkey</b>{isSuper && (isCand ? <> and it <b className="ok">is a candidate key</b> (no proper subset is a superkey).</> : <>, but <b className="bad">not a candidate key</b>: drop an attribute and it still identifies every tuple.</>)}
          {!isSuper && ' Two different employees could share these values (e.g. two people named Steve).'}
          {isSuper && <button className="btn sm" style={{ marginLeft: 8 }} onClick={record}>Add to my superkey list</button>}
        </div>
      )}
      {found.length > 0 && <div className="small" style={{ marginTop: 6 }}>Superkeys found ({found.length}/6): {found.join('  ')} {found.length === 6 && '🎉 All six, matching the lecture.'}</div>}
    </div>
  )
}
