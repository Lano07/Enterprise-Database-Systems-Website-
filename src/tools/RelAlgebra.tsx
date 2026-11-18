import { useEffect, useRef, useState } from 'react'
import { createDb } from '../engine/sql'
import { displayName, evaluate, parseRa, RaError, sameRel, type Rel, type Step } from '../engine/ra'
import { recordAnswer, useSave } from '../game/store'
import { CodeEditor } from '../ui/CodeEditor'
import { inline } from '../engine/md'

let cache: Promise<Record<string, Rel>> | null = null
/** DreamHome relations (from the SQL dataset) plus Employee/Department from the Relational Operators handout. */
export function loadRelations() {
  if (!cache) cache = (async () => {
    const db = await createDb('dreamhome')
    const out: Record<string, Rel> = {}
    for (const t of ['Branch', 'Staff', 'PropertyForRent', 'Client', 'PrivateOwner', 'Viewing', 'Registration']) {
      const r = db.exec(`SELECT * FROM ${t}`)[0]
      out[t] = { cols: r.columns.map((c) => ({ name: c, rel: t })), rows: r.values as unknown[][] }
    }
    db.close()
    out.Employee = { cols: ['EmpNum', 'EmpName', 'DeptNum', 'Salary'].map((c) => ({ name: c, rel: 'Employee' })), rows: [['E1', 'Lopez', 'D1', 60000], ['E2', 'Chang', 'D1', 55000], ['E3', 'Smith', 'D2', 36000], ['E4', 'Ali', 'D2', 48000]] }
    out.Department = { cols: ['DeptNum', 'DeptName', 'Budget'].map((c) => ({ name: c, rel: 'Department' })), rows: [['D1', 'Marketing', 500000], ['D2', 'Production', 2000000], ['D3', 'Research', 300000]] }
    return out
  })()
  return cache
}

export const RA_CHALLENGES: { id: string; title: string; prompt: string; ref: string; d: 1 | 2 | 3 }[] = [
  { id: 'ra1', d: 1, title: 'Selection', prompt: 'List all staff with a salary greater than 10000.', ref: 'σ[salary > 10000](Staff)' },
  { id: 'ra2', d: 1, title: 'Projection', prompt: 'Produce a list of salaries for all staff, showing only staffNo, fName, lName and salary.', ref: 'π[staffNo, fName, lName, salary](Staff)' },
  { id: 'ra3', d: 1, title: 'Nesting', prompt: 'List the first and last names of all managers.', ref: "π[fName, lName](σ[position = 'Manager'](Staff))" },
  { id: 'ra4', d: 2, title: 'Union', prompt: 'List all cities where there is either a branch office or a property for rent.', ref: 'π[city](Branch) ∪ π[city](PropertyForRent)' },
  { id: 'ra5', d: 2, title: 'Set difference', prompt: 'List all cities where there is a branch office but no properties for rent.', ref: 'π[city](Branch) − π[city](PropertyForRent)' },
  { id: 'ra6', d: 2, title: 'Intersection', prompt: 'List all cities where there is both a branch office and at least one property for rent.', ref: 'π[city](Branch) ∩ π[city](PropertyForRent)' },
  { id: 'ra7', d: 2, title: 'Natural join', prompt: 'List clientNo, fName, lName, propertyNo and comment for every client who has viewed a property (one clientNo column).', ref: 'π[clientNo, fName, lName](Client) ⋈ π[clientNo, propertyNo, comment](Viewing)' },
  { id: 'ra8', d: 2, title: 'Equijoin', prompt: 'Same clients and viewings, but as an equijoin that keeps both clientNo columns: π clientNo, fName, lName (Client) joined to π clientNo, propertyNo, comment (Viewing).', ref: 'π[clientNo, fName, lName](Client) ⋈[Client.clientNo = Viewing.clientNo] π[clientNo, propertyNo, comment](Viewing)' },
  { id: 'ra9', d: 3, title: 'Left outer join', prompt: 'Produce a status report on property viewings: propertyNo, street, city of every property, with its viewings (if any).', ref: 'π[propertyNo, street, city](PropertyForRent) ⟕ Viewing' },
  { id: 'ra10', d: 3, title: 'Semijoin', prompt: 'List complete details of all staff who work at the branch in Glasgow (Staff attributes only).', ref: "Staff ▷[Staff.branchNo = Branch.branchNo] σ[city = 'Glasgow'](Branch)" },
  { id: 'ra11', d: 3, title: 'Division', prompt: 'Identify all clients who have viewed all properties with three rooms.', ref: 'π[clientNo, propertyNo](Viewing) ÷ π[propertyNo](σ[rooms = 3](PropertyForRent))' },
  { id: 'ra12', d: 2, title: 'Handout: join + select', prompt: 'Using Employee and Department, list the names of employees who work in Marketing.', ref: "π[EmpName](Employee ⋈ σ[DeptName = 'Marketing'](Department))" },
  { id: 'ra13', d: 3, title: 'Self-join with ρ', prompt: 'List pairs of staffNo values (two columns) for different staff members who work at the same branch.', ref: 'π[S1.staffNo, S2.staffNo](ρ[S1](Staff) ⋈[S1.branchNo = S2.branchNo AND S1.staffNo <> S2.staffNo] ρ[S2](Staff))' },
]

const SYMBOLS: [string, string][] = [['σ[]()', 'σ select'], ['π[]()', 'π project'], ['ρ[]()', 'ρ rename'], [' ∪ ', '∪ union'], [' − ', '− difference'], [' ∩ ', '∩ intersect'], [' × ', '× product'], [' ⋈ ', '⋈ natural join'], [' ⋈[] ', '⋈[p] theta join'], [' ⟕ ', '⟕ left outer'], [' ⟖ ', '⟖ right outer'], [' ⟗ ', '⟗ full outer'], [' ▷[] ', '▷ semijoin'], [' ÷ ', '÷ division']]

export function RelView({ rel, max = 50 }: { rel: Rel; max?: number }) {
  return (
    <div className="tbl-wrap" style={{ margin: '4px 0 0' }}>
      <table className="tbl" style={{ fontFamily: 'var(--f-code)', fontSize: '.8rem' }}>
        <thead><tr>{rel.cols.map((c, i) => <th key={i}>{displayName(rel, c)}</th>)}</tr></thead>
        <tbody>
          {rel.rows.slice(0, max).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v === null ? <span className="null">null</span> : String(v)}</td>)}</tr>)}
          {!rel.rows.length && <tr><td colSpan={rel.cols.length} className="muted">∅ empty relation</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export function useRaRunner(initial: string) {
  const [expr, setExpr] = useState(initial)
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [err, setErr] = useState('')
  const run = async (src = expr) => {
    try {
      const db = await loadRelations()
      const { steps } = evaluate(parseRa(src), db)
      setSteps(steps); setErr('')
      return steps[steps.length - 1].rel
    } catch (e) {
      setSteps(null); setErr(e instanceof RaError || e instanceof Error ? e.message : String(e))
      return null
    }
  }
  return { expr, setExpr, steps, err, run }
}

export function Pipeline({ steps }: { steps: Step[] }) {
  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      {steps.map((s, i) => (
        <div key={i} className="panel" style={{ marginLeft: Math.min(s.depth, 4) * 0, borderLeft: `3px solid ${i === steps.length - 1 ? 'var(--ok)' : 'var(--accent)'}` }}>
          <div className="row small"><b className="mono" style={{ wordBreak: 'break-word' }}>{s.label}</b><span className="spacer" />
            <span className="tag">degree {s.rel.cols.length}</span><span className="tag">cardinality {s.rel.rows.length}</span>
            {i === steps.length - 1 && <span className="tag ok">result</span>}</div>
          <RelView rel={s.rel} max={i === steps.length - 1 ? 60 : 12} />
          {i < steps.length - 1 && <div className="small muted" style={{ marginTop: 4 }}>↓ this relation feeds the next operation (closure)</div>}
        </div>
      ))}
    </div>
  )
}

/** Compact runner embedded in lessons. */
export function RaMini({ initial, note }: { initial: string; note?: string }) {
  const r = useRaRunner(initial)
  const ran = useRef(false)
  useEffect(() => { if (!ran.current) { ran.current = true; r.run() } }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small" style={{ marginBottom: 4 }}><b>σ Relational algebra runner</b><span className="muted">edit and run; every step shows the relation it produces</span></div>
      {note && <div className="small muted" style={{ marginBottom: 6 }}>{inline(note)}</div>}
      <CodeEditor value={r.expr} onChange={r.setExpr} lang="ra" minRows={1} onRun={() => r.run()} label="Relational algebra expression"
        bar={<><span className="tag acc">DreamHome</span><span className="spacer" /><button className="btn sm primary" onClick={() => r.run()}>▶ Evaluate</button></>} />
      {r.err && <div className="res-note">⚠️ {r.err}</div>}
      {r.steps && <Pipeline steps={r.steps.length > 4 ? r.steps.slice(-4) : r.steps} />}
    </div>
  )
}

export function RaPlayground() {
  const s = useSave()
  const [cur, setCur] = useState<string | null>(null)
  const ch = RA_CHALLENGES.find((c) => c.id === cur)
  const r = useRaRunner("π[fName, lName, city](Staff ⋈ σ[city = 'Glasgow'](Branch))")
  const [verdict, setVerdict] = useState<null | boolean>(null)
  const [names, setNames] = useState<string[]>([])
  useEffect(() => { loadRelations().then((d) => setNames(Object.keys(d))); r.run() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const insert = (sym: string) => r.setExpr((e) => (e.trim() ? e + sym : sym.trim()))
  const check = async () => {
    if (!ch) return
    const mine = await r.run()
    if (!mine) { setVerdict(false); return }
    const db = await loadRelations()
    const ref = evaluate(parseRa(ch.ref), db).result
    const ok = sameRel(mine, ref)
    setVerdict(ok)
    recordAnswer('ra-' + ch.id, 'r2', ch.d === 3 ? 'joins' : ch.id === 'ra11' ? 'division' : 'unary', ok, { firstTry: !s.attempts['ra-' + ch.id], base: 10 + 5 * ch.d })
  }
  return (
    <div className="tool-grid">
      <div>
        {ch ? (
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="row small muted"><span>Challenge · {'★'.repeat(ch.d)}</span>{s.attempts['ra-' + ch.id]?.right ? <span className="tag ok">solved</span> : null}<span className="spacer" /><button className="btn sm ghost" onClick={() => { setCur(null); setVerdict(null) }}>Free play</button></div>
            <h3 style={{ margin: '4px 0' }}>{ch.title}</h3><div>{ch.prompt}</div>
          </div>
        ) : <p className="lede" style={{ marginBottom: 8 }}>Type any expression over the DreamHome relations (and Employee/Department from the handout). Each operator outputs a new relation, shown step by step. That is closure.</p>}
        <div className="row" style={{ gap: 4, marginBottom: 6 }}>
          {SYMBOLS.map(([ins, lab]) => <button key={lab} className="btn sm" onClick={() => insert(ins)} title={lab}>{lab.split(' ')[0]}</button>)}
        </div>
        <CodeEditor value={r.expr} onChange={r.setExpr} lang="ra" minRows={2} onRun={() => r.run()} label="Relational algebra expression"
          bar={<><span className="hide-s">Subscripts go in [brackets]: σ[salary &gt; 10000](Staff), π[a, b](R), R ⋈[R.x = S.x] S. ASCII words work too: select, project, join, union, minus.</span><span className="spacer" />
            <button className="btn sm" onClick={() => r.run()}>▶ Evaluate</button>{ch && <button className="btn sm primary" onClick={check}>✔ Check</button>}</>} />
        {verdict !== null && ch && (
          <div className="q-explain" style={{ background: verdict ? 'var(--ok-soft)' : 'var(--bad-soft)', marginBottom: 8 }}>
            {verdict ? <b className="ok">✔ Correct relation!</b> : <><b className="bad">✖ Not the expected relation.</b> Compare degree and cardinality with what the question asks for.</>}
            {!verdict && <details style={{ marginTop: 6 }}><summary className="small">Reveal a model expression</summary><pre className="code">{ch.ref}</pre></details>}
          </div>
        )}
        {r.err && <div className="res-note" style={{ marginBottom: 8 }}>⚠️ {r.err}</div>}
        {r.steps && <Pipeline steps={r.steps} />}
      </div>
      <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
        <div className="panel">
          <h3>Challenges</h3>
          <div style={{ display: 'grid', gap: 4 }}>
            {RA_CHALLENGES.map((c) => (
              <button key={c.id} className="quest" style={{ padding: '6px 10px', textAlign: 'left', cursor: 'pointer', ...(c.id === cur ? { borderColor: 'var(--accent)' } : {}) }} onClick={() => { setCur(c.id); setVerdict(null); r.setExpr('') }}>
                <span>{s.attempts['ra-' + c.id]?.right ? '✅' : '⬜'}</span><span className="qt"><b style={{ fontSize: '.85rem' }}>{c.title}</b><span>{'★'.repeat(c.d)}</span></span>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Relations</h3>
          <div className="small mono" style={{ display: 'grid', gap: 2 }}>{names.map((n) => <button key={n} className="btn sm ghost" style={{ justifyContent: 'flex-start' }} onClick={() => r.setExpr((e) => e + n)}>{n}</button>)}</div>
          <div className="small muted" style={{ marginTop: 6 }}>Tip: a natural join matches on <i>every</i> common attribute name. PropertyForRent ⋈ Branch matches on street, city, postcode and branchNo, which is usually not what you want!</div>
        </div>
      </div>
    </div>
  )
}
