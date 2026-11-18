// Widgets for realms 3-10, registered by id for {{w:id}} lesson embeds.
import { useState, type ComponentType } from 'react'
import { Forge } from './Forge'
import { WIDGETS_R5 } from './widgets3'
import { BptSearchWidget, BptInsertWidget, BptDeleteWidget } from './BTree'
import { HashMini } from './Hashing'
import { JsonValidator, FindTab, KvConsole, GraphPath, ModelPicker, JsonPathTab } from './JsonLab'
import { WellformedWidget, DtdBasketWidget, XPathWidget } from './XmlLab'
import { AnomalyReplay, PrecedenceBuilder, TwoPLChecker, DeadlockStage, RecoveryLists } from './Concurrency'

// ---------------- shared ERD drawing ----------------
export const MULTS = ['0..1', '1..1', '0..*', '1..*'] as const
export type Mult = (typeof MULTS)[number]

export function phrase(m: Mult) {
  return { '0..1': ['may', 'zero or one'], '1..1': ['must', 'one and only one'], '0..*': ['may', 'zero or more'], '1..*': ['must', 'one or more'] }[m] as [string, string]
}

/** Two entity boxes joined by a named line, multiplicities drawn beside each entity. */
export function RelSvg({ a, b, name, ma, mb, attrsA = [], attrsB = [], hlA, hlB }: {
  a: string; b: string; name: string; ma?: string; mb?: string; attrsA?: string[]; attrsB?: string[]; hlA?: boolean; hlB?: boolean
}) {
  const h = Math.max(70, 40 + 16 * Math.max(attrsA.length, attrsB.length))
  const box = (x: string, attrs: string[], left: number, hl?: boolean) => (
    <g>
      <rect x={left} y={10} width={150} height={h} rx={6} fill="var(--surface)" stroke={hl ? 'var(--accent)' : 'var(--ink-2)'} strokeWidth={hl ? 2.5 : 1.3} />
      <text x={left + 75} y={30} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink)">{x}</text>
      <line x1={left} y1={38} x2={left + 150} y2={38} stroke="var(--line)" />
      {attrs.map((t, i) => <text key={i} x={left + 8} y={54 + i * 16} fontSize="11" fill="var(--ink-2)">{t}</text>)}
    </g>
  )
  const y = 10 + h / 2
  return (
    <svg viewBox={`0 0 560 ${h + 20}`} style={{ width: '100%', maxWidth: 620, display: 'block' }} role="img" aria-label={`${a} ${name} ${b}`}>
      {box(a, attrsA, 10, hlA)}
      {box(b, attrsB, 400, hlB)}
      <line x1={160} y1={y} x2={400} y2={y} stroke="var(--ink-2)" strokeWidth={1.5} />
      <text x={280} y={y - 10} textAnchor="middle" fontSize="12" fill="var(--ink)">{name} ▸</text>
      {ma && <text x={168} y={y + 18} fontSize="13" fontWeight="700" fill="var(--accent)">{ma}</text>}
      {mb && <text x={392} y={y + 18} fontSize="13" fontWeight="700" textAnchor="end" fill="var(--accent)">{mb}</text>}
    </svg>
  )
}

// ---------------- multiplicity sentence generator ----------------
const EXAMPLES = [
  { a: 'Staff', b: 'Branch', verbAB: 'manage', verbBA: 'be managed by', name: 'Manages', ma: '1..1' as Mult, mb: '0..1' as Mult },
  { a: 'Staff', b: 'PropertyForRent', verbAB: 'oversee', verbBA: 'be overseen by', name: 'Oversees', ma: '0..1' as Mult, mb: '0..*' as Mult },
  { a: 'Newspaper', b: 'PropertyForRent', verbAB: 'advertise', verbBA: 'be advertised in', name: 'Advertises', ma: '0..*' as Mult, mb: '1..*' as Mult },
  { a: 'Department', b: 'Employee', verbAB: 'employ', verbBA: 'be employed in', name: 'employs', ma: '0..1' as Mult, mb: '1..*' as Mult },
]
function MultReader() {
  const [i, setI] = useState(0)
  const ex = EXAMPLES[i]
  const [ma, setMa] = useState<Mult>(ex.ma)
  const [mb, setMb] = useState<Mult>(ex.mb)
  const pick = (k: number) => { setI(k); setMa(EXAMPLES[k].ma); setMb(EXAMPLES[k].mb) }
  const [mod1, q1] = phrase(mb), [mod2, q2] = phrase(ma)
  const card = `${ma.endsWith('1') ? '1' : '*'}:${mb.endsWith('1') ? '1' : '*'}`
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small" style={{ marginBottom: 6 }}><b>Multiplicity reader</b>
        {EXAMPLES.map((e, k) => <button key={k} className={'btn sm' + (k === i ? ' primary' : '')} onClick={() => pick(k)}>{e.a} {e.name} {e.b}</button>)}</div>
      <div className="svg-wrap" style={{ padding: 8 }}><RelSvg a={ex.a} b={ex.b} name={ex.name} ma={ma} mb={mb} hlA hlB /></div>
      <div className="row" style={{ marginTop: 8 }}>
        <label className="small">beside {ex.a} <select value={ma} onChange={(e) => setMa(e.target.value as Mult)}>{MULTS.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label className="small">beside {ex.b} <select value={mb} onChange={(e) => setMb(e.target.value as Mult)}>{MULTS.map((m) => <option key={m}>{m}</option>)}</select></label>
        <span className="tag acc">cardinality {card}</span>
      </div>
      <div className="q-explain" style={{ marginTop: 8 }}>
        <div>➡ Each <b>{ex.a}</b> <b>{mod1}</b> {ex.verbAB} <b>{q1}</b> {ex.b} <span className="muted small">(read {mb} beside {ex.b})</span></div>
        <div>⬅ Each <b>{ex.b}</b> <b>{mod2}</b> {ex.verbBA} <b>{q2}</b> {ex.a} <span className="muted small">(read {ma} beside {ex.a})</span></div>
        <div className="small muted" style={{ marginTop: 4 }}>{ex.a} participation is {mb.startsWith('1') ? 'mandatory' : 'optional'} (minimum beside {ex.b}); {ex.b} participation is {ma.startsWith('1') ? 'mandatory' : 'optional'} (minimum beside {ex.a}).</div>
      </div>
    </div>
  )
}

// ---------------- many-to-many redundancy calculator ----------------
function MnDemo() {
  const [attrs, setAttrs] = useState(40)
  const [emps, setEmps] = useState(200)
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <b className="small">How much does the FK-in-Project design repeat?</b>
      <div className="row" style={{ margin: '8px 0' }}>
        <label className="small">Project descriptive attributes: <b>{attrs}</b> <input type="range" min={1} max={60} value={attrs} onChange={(e) => setAttrs(+e.target.value)} /></label>
        <label className="small">Employees on the project: <b>{emps}</b> <input type="range" min={1} max={400} value={emps} onChange={(e) => setEmps(+e.target.value)} /></label>
      </div>
      <div className="grid g3">
        <div className="card" style={{ borderColor: 'var(--bad)' }}><div className="small muted">Project facts with EmpNum in Project</div><div style={{ fontFamily: 'var(--f-display)', fontSize: '1.4rem', color: 'var(--bad)' }}>{(attrs * emps).toLocaleString()}</div><div className="small">values · a location change = {emps} row updates</div></div>
        <div className="card" style={{ borderColor: 'var(--ok)' }}><div className="small muted">Project facts with a bridge table</div><div style={{ fontFamily: 'var(--f-display)', fontSize: '1.4rem', color: 'var(--ok)' }}>{attrs}</div><div className="small">values · a location change = 1 row update</div></div>
        <div className="card"><div className="small muted">Bridge rows (Assignment)</div><div style={{ fontFamily: 'var(--f-display)', fontSize: '1.4rem' }}>{emps}</div><div className="small">each repeats only the identifiers</div></div>
      </div>
    </div>
  )
}

// ---------------- anomaly lab (student table) ----------------
type SRow = [number, string, string, string, number, string]
const STUDENT_ROWS: SRow[] = [
  [98710, 'Mike Aladdin', 'COMP420', 'Database Systems', 4, 'A'], [98710, 'Mike Aladdin', 'COMP325', 'Software Engineering', 4, 'C'],
  [98710, 'Mike Aladdin', 'COMP480', 'Advanced Programming', 3, 'B'], [85871, 'David Brown', 'COMP325', 'Software Engineering', 4, 'B'],
  [85871, 'David Brown', 'COMP370', 'Computer Graphics', 2, 'A'], [88701, 'Roger Flo', 'COMP420', 'Database Systems', 4, 'B'],
  [98733, 'Randy Martin', 'COMP420', 'Database Systems', 4, 'A'], [98734, 'Jack Smith', 'COMP455', 'Analysis of Algorithms', 4, 'C'],
]
function AnomalyLab() {
  const [rows, setRows] = useState<SRow[]>(STUDENT_ROWS)
  const [title, setTitle] = useState('DB Systems')
  const [credits, setCredits] = useState(3)
  const [log, setLog] = useState('')
  const courses = new Map<string, Set<string>>()
  rows.forEach((r) => { const k = r[2]; if (!courses.has(k)) courses.set(k, new Set()); courses.get(k)!.add(`${r[3]} (${r[4]})`) })
  const conflicts = [...courses.entries()].filter(([, v]) => v.size > 1).map(([k]) => k)
  const reset = () => { setRows(STUDENT_ROWS); setLog('') }
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small"><b>Anomaly lab</b><span className="muted">try each operation on the unnormalized table</span><span className="spacer" /><button className="btn sm" onClick={reset}>Reset</button></div>
      <div className="row" style={{ margin: '8px 0' }}>
        <span className="small">Insert 85871 → COMP420 as</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: 150 }} aria-label="Course title" />
        <input type="number" value={credits} onChange={(e) => setCredits(+e.target.value)} style={{ width: 60 }} aria-label="Credits" />
        <button className="btn sm" onClick={() => { setRows((r) => [...r, [85871, 'David Brown', 'COMP420', title, credits, 'B']]); setLog(`Inserted. COMP420 is now stored as: ${[...(courses.get('COMP420') || []), `${title} (${credits})`].join(' / ')}`) }}>Insert</button>
        <button className="btn sm" onClick={() => { const had = new Set(rows.map((r) => r[2])); const next = rows.filter((r) => r[1] !== 'Jack Smith'); const lost = [...had].filter((c) => !next.some((r) => r[2] === c)); setRows(next); setLog(lost.length ? `Deleted Jack Smith… and every fact about ${lost.join(', ')} (${lost.map((c) => STUDENT_ROWS.find((r) => r[2] === c)?.[3]).join(', ')}) vanished too. Deletion anomaly!` : 'Deleted.') }}>Delete Jack Smith</button>
        <button className="btn sm" onClick={() => { const at = rows.findIndex((x) => x[2] === 'COMP420' && x[4] !== 3); if (at < 0) return; setRows(rows.map((x, k) => (k === at ? ([x[0], x[1], x[2], x[3], 3, x[5]] as SRow) : x))); setLog('Changed COMP420 to 3 credits in ONE row only. Update anomaly: the course now has two credit values.') }}>Update one COMP420 row</button>
      </div>
      <div className="tbl-wrap" style={{ maxHeight: 260, overflow: 'auto' }}><table className="tbl" style={{ fontSize: '.8rem' }}>
        <thead><tr><th>StudentId</th><th>StudentName</th><th>CourseId</th><th>CourseTitle</th><th>Credits</th><th>Grade</th></tr></thead>
        <tbody>{rows.map((r, k) => <tr key={k} style={conflicts.includes(r[2]) ? { background: 'var(--bad-soft)' } : undefined}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table></div>
      {log && <div className="q-explain" style={{ background: conflicts.length || log.includes('anomaly') ? 'var(--bad-soft)' : undefined }}>{log}{conflicts.length > 0 && ` Inconsistent courses: ${conflicts.join(', ')}.`}</div>}
      <div className="small muted" style={{ marginTop: 6 }}>In the normalized design, Course(CourseId, CourseTitle, Credits) stores each course once, so none of these can happen.</div>
    </div>
  )
}

// ---------------- FD classifier ----------------
const FD_SETS = [
  { rel: 'ClientRental (clientNo, propertyNo, cName, pAddress, rentStart, rentFinish, rent, ownerNo, oName)', key: '(clientNo, propertyNo)', items: [['clientNo → cName', 'partial'], ['propertyNo → pAddress, rent, ownerNo, oName', 'partial'], ['ownerNo → oName', 'transitive'], ['(clientNo, propertyNo) → rentStart, rentFinish', 'full']] },
  { rel: 'Course (CourseId, CourseTitle, DeptId, DeptName)', key: 'CourseId', items: [['CourseId → CourseTitle, DeptId', 'full'], ['DeptId → DeptName', 'transitive']] },
  { rel: 'Enrolment (StudentId, CourseId, StudentName, CourseTitle, Credits, Grade)', key: '(StudentId, CourseId)', items: [['StudentId → StudentName', 'partial'], ['CourseId → CourseTitle, Credits', 'partial'], ['(StudentId, CourseId) → Grade', 'full']] },
]
function FdClassifier() {
  const [set, setSet] = useState(0)
  const [ans, setAns] = useState<Record<string, string>>({})
  const S = FD_SETS[set]
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small"><b>Classify the dependencies</b>{FD_SETS.map((x, k) => <button key={k} className={'btn sm' + (k === set ? ' primary' : '')} onClick={() => { setSet(k); setAns({}) }}>{x.rel.split(' ')[0]}</button>)}</div>
      <div className="small mono" style={{ margin: '6px 0' }}>{S.rel} · PK {S.key}</div>
      {S.items.map(([f, truth]) => (
        <div key={f} className="row small" style={{ margin: '4px 0' }}>
          <span className="mono" style={{ minWidth: 260 }}>{f}</span>
          {['full', 'partial', 'transitive'].map((k) => (
            <button key={k} className={'btn sm' + (ans[f] === k ? (k === truth ? ' ok' : ' danger') : '')} onClick={() => setAns((a) => ({ ...a, [f]: k }))}>{k}</button>
          ))}
          {ans[f] && <span>{ans[f] === truth ? '✔' : `✖ ${truth}`}</span>}
        </div>
      ))}
    </div>
  )
}

export const EXTRA_WIDGETS: Record<string, ComponentType> = {
  'mult-reader': MultReader,
  'mn-demo': MnDemo,
  'anomaly-lab': AnomalyLab,
  'fd-classifier': FdClassifier,
  'clientrental-forge': () => <ForgeEmbed />,
  ...WIDGETS_R5,
  'bpt-search': BptSearchWidget,
  'bpt-insert': BptInsertWidget,
  'bpt-delete': BptDeleteWidget,
  'hash-lab': HashMini,
  'recovery-lists': () => <RecoveryLists />,
  'anomaly-replay': AnomalyTabs,
  precedence: () => <PrecedenceBuilder />,
  twopl: () => <TwoPLChecker />,
  waitfor: () => <DeadlockStage />,
  wellformed: WellformedWidget,
  'dtd-basket': DtdBasketWidget,
  'xpath-lab': XPathWidget,
  'json-validator': JsonValidator,
  'doc-query': () => <FindTab compact />,
  'kv-console': KvConsole,
  'graph-path': GraphPath,
  'model-picker': ModelPicker,
  'json-path': () => <JsonPathTab compact />,
}

function AnomalyTabs() {
  const [k, setK] = useState<'lost' | 'dirty' | 'analysis'>('lost')
  return (
    <div style={{ margin: '14px 0' }}>
      <div className="row small">{(['lost', 'dirty', 'analysis'] as const).map((x) => <button key={x} className={'btn sm' + (k === x ? ' primary' : '')} onClick={() => setK(x)}>{x === 'lost' ? 'Lost update' : x === 'dirty' ? 'Dirty read' : 'Inconsistent analysis'}</button>)}</div>
      <AnomalyReplay key={k} id={k} />
    </div>
  )
}

function ForgeEmbed() {
  return <div className="panel" style={{ margin: '14px 0' }}><Forge stage="clientrental" embedded /></div>
}
