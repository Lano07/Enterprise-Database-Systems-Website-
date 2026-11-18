// Normalization Forge: decompose lecture tables from UNF/1NF to 3NF one dependency at a time.
import { useMemo, useState } from 'react'
import { candidateKeys, classifyFD, fdText, fmt, isSuperkey, lossless, projectFDs, violations, type FD } from '../engine/fd'
import { emit, recordAnswer, toolLevel, useSave } from '../game/store'

type Row = (string | number | null)[]
export interface ForgeStage {
  id: string
  title: string
  story: string
  attrs: string[]
  rows: Row[]
  fds: FD[]
  unf?: { key: string; group: string[]; approach2: string[][]; display: { head: string[]; rows: Row[] } }
  names: [string[], string][]
}

const fd = (l: string, r: string): FD => ({ lhs: l.split(',').map((s) => s.trim()), rhs: r.split(',').map((s) => s.trim()) })

export const FORGE_STAGES: ForgeStage[] = [
  {
    id: 'enrol', title: 'Student enrolments', story: 'Figure 1 from the FD & Normalization lecture. It is already in 1NF; make it 3NF.',
    attrs: ['StudentId', 'StudentName', 'CourseId', 'CourseTitle', 'Credits', 'Grade'],
    rows: [
      [98710, 'Mike Aladdin', 'COMP420', 'Database Systems', 4, 'A'], [98710, 'Mike Aladdin', 'COMP325', 'Software Engineering', 4, 'C'],
      [98710, 'Mike Aladdin', 'COMP480', 'Advanced Programming', 3, 'B'], [85871, 'David Brown', 'COMP325', 'Software Engineering', 4, 'B'],
      [85871, 'David Brown', 'COMP370', 'Computer Graphics', 2, 'A'], [88701, 'Roger Flo', 'COMP420', 'Database Systems', 4, 'B'],
      [98733, 'Randy Martin', 'COMP420', 'Database Systems', 4, 'A'], [98734, 'Jack Smith', 'COMP455', 'Analysis of Algorithms', 4, 'C'],
    ],
    fds: [fd('StudentId', 'StudentName'), fd('CourseId', 'CourseTitle, Credits'), fd('StudentId, CourseId', 'Grade')],
    names: [[['StudentId', 'StudentName'], 'Student'], [['CourseId', 'CourseTitle', 'Credits'], 'Course'], [['StudentId', 'CourseId', 'Grade'], 'Enrolment']],
  },
  {
    id: 'dept', title: 'Courses and departments', story: 'The 3NF example from the FD handout: Course(CourseId, CourseTitle, DeptId, DeptName).',
    attrs: ['CourseId', 'CourseTitle', 'DeptId', 'DeptName'],
    rows: [['COMP420', 'Database Systems', 'D1', 'Computing'], ['COMP325', 'Software Engineering', 'D1', 'Computing'], ['COMP370', 'Computer Graphics', 'D1', 'Computing'], ['MATH110', 'Calculus', 'D2', 'Mathematics'], ['MATH210', 'Linear Algebra', 'D2', 'Mathematics']],
    fds: [fd('CourseId', 'CourseTitle, DeptId'), fd('DeptId', 'DeptName')],
    names: [[['CourseId', 'CourseTitle', 'DeptId'], 'Course'], [['DeptId', 'DeptName'], 'Department']],
  },
  {
    id: 'sports', title: 'Sports club flat file', story: 'The Business Rules case: two fixed sport slots per student. Start from UNF.',
    attrs: ['studentId', 'studentName', 'sport', 'price'],
    rows: [[100, 'Ann', 'Football', 200], [100, 'Ann', 'Swimming', 50], [150, 'Bill', 'Tennis', 150], [175, 'Cara', 'Swimming', 50], [175, 'Cara', 'Tennis', 150], [200, 'Dev', 'Football', 200]],
    fds: [fd('studentId', 'studentName'), fd('sport', 'price')],
    unf: {
      key: 'studentId', group: ['sport', 'price'], approach2: [['studentId', 'studentName'], ['studentId', 'sport', 'price']],
      display: { head: ['studentId', 'studentName', 'SPORT_1', 'PRICE_1', 'SPORT_2', 'PRICE_2'], rows: [[100, 'Ann', 'Football', 200, 'Swimming', 50], [150, 'Bill', 'Tennis', 150, null, null], [175, 'Cara', 'Swimming', 50, 'Tennis', 150], [200, 'Dev', 'Football', 200, null, null]] },
    },
    names: [[['studentId', 'studentName'], 'Student'], [['sport', 'price'], 'Sport'], [['studentId', 'sport'], 'Participation']],
  },
  {
    id: 'clientrental', title: 'DreamHome ClientRental', story: 'Normalization Part 2, Example 1: two leases for John Kay and Aline Stewart. Start from UNF.',
    attrs: ['clientNo', 'cName', 'propertyNo', 'pAddress', 'rentStart', 'rentFinish', 'rent', 'ownerNo', 'oName'],
    rows: [
      ['CR76', 'John Kay', 'PG4', '6 Lawrence St, Glasgow', '1-Jul-12', '31-Aug-13', 350, 'CO40', 'Tina Murphy'],
      ['CR76', 'John Kay', 'PG16', '5 Novar Dr, Glasgow', '1-Sep-13', '1-Sep-14', 450, 'CO93', 'Tony Shaw'],
      ['CR56', 'Aline Stewart', 'PG4', '6 Lawrence St, Glasgow', '1-Sep-11', '10-Jun-12', 350, 'CO40', 'Tina Murphy'],
      ['CR56', 'Aline Stewart', 'PG36', '2 Manor Rd, Glasgow', '10-Oct-12', '1-Dec-13', 375, 'CO93', 'Tony Shaw'],
      ['CR56', 'Aline Stewart', 'PG16', '5 Novar Dr, Glasgow', '1-Nov-14', '10-Aug-15', 450, 'CO93', 'Tony Shaw'],
    ],
    fds: [fd('clientNo', 'cName'), fd('propertyNo', 'pAddress, rent, ownerNo, oName'), fd('ownerNo', 'oName'), fd('clientNo, propertyNo', 'rentStart, rentFinish')],
    unf: {
      key: 'clientNo', group: ['propertyNo', 'pAddress', 'rentStart', 'rentFinish', 'rent', 'ownerNo', 'oName'],
      approach2: [['clientNo', 'cName'], ['clientNo', 'propertyNo', 'pAddress', 'rentStart', 'rentFinish', 'rent', 'ownerNo', 'oName']],
      display: {
        head: ['clientNo', 'cName', 'propertyNo', 'pAddress', 'rentStart', 'rentFinish', 'rent', 'ownerNo', 'oName'],
        rows: [
          ['CR76', 'John Kay', 'PG4', '6 Lawrence St, Glasgow', '1-Jul-12', '31-Aug-13', 350, 'CO40', 'Tina Murphy'],
          ['', '', 'PG16', '5 Novar Dr, Glasgow', '1-Sep-13', '1-Sep-14', 450, 'CO93', 'Tony Shaw'],
          ['CR56', 'Aline Stewart', 'PG4', '6 Lawrence St, Glasgow', '1-Sep-11', '10-Jun-12', 350, 'CO40', 'Tina Murphy'],
          ['', '', 'PG36', '2 Manor Rd, Glasgow', '10-Oct-12', '1-Dec-13', 375, 'CO93', 'Tony Shaw'],
          ['', '', 'PG16', '5 Novar Dr, Glasgow', '1-Nov-14', '10-Aug-15', 450, 'CO93', 'Tony Shaw'],
        ],
      },
    },
    names: [[['clientNo', 'cName'], 'Client'], [['clientNo', 'propertyNo', 'rentStart', 'rentFinish'], 'Rental'], [['propertyNo', 'pAddress', 'rent', 'ownerNo'], 'PropertyForRent'], [['ownerNo', 'oName'], 'Owner'], [['propertyNo', 'pAddress', 'rent', 'ownerNo', 'oName'], 'PropertyOwner']],
  },
]

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

function nfOf(rel: string[], fds: FD[]) {
  const v = violations(rel, fds)
  if (v.some((x) => x.kind === 'partial')) return '1NF'
  if (v.length) return '2NF'
  return '3NF'
}

function project(stage: ForgeStage, rel: string[]) {
  const idx = rel.map((a) => stage.attrs.indexOf(a))
  const seen = new Set<string>()
  const out: Row[] = []
  for (const r of stage.rows) {
    const p = idx.map((i) => r[i])
    const k = JSON.stringify(p)
    if (!seen.has(k)) { seen.add(k); out.push(p) }
  }
  return out
}

export function Forge({ stage, embedded }: { stage?: string; embedded?: boolean }) {
  const s = useSave()
  const cleared = s.tools['forge'] || 0
  const fixed = FORGE_STAGES.findIndex((x) => x.id === stage)
  const [i, setI] = useState(fixed >= 0 ? fixed : Math.min(cleared, FORGE_STAGES.length - 1))
  return (
    <div>
      {!embedded && <p className="lede">Each table hides functional dependencies that cause anomalies. Pick the key, then split on each harmful dependency (classify it first!) until every relation is in 3NF and the anomaly meter reads zero.</p>}
      {!embedded && (
        <div className="stage-tabs">
          {FORGE_STAGES.map((st, k) => <button key={st.id} className={(k === i ? 'on ' : '') + (k < cleared ? 'done' : '')} disabled={k > cleared && !s.settings.freeRoam} onClick={() => setI(k)}>{k + 1}. {st.title}</button>)}
        </div>
      )}
      <ForgeStageView key={FORGE_STAGES[i].id} st={FORGE_STAGES[i]} onClear={() => { if (embedded) return; toolLevel('forge', i + 1, 60); if (i + 1 < FORGE_STAGES.length) setTimeout(() => setI(i + 1), 1200) }} />
    </div>
  )
}

function ForgeStageView({ st, onClear }: { st: ForgeStage; onClear: () => void }) {
  const [phase, setPhase] = useState<'unf' | 'key' | 'split' | 'done'>(st.unf ? 'unf' : 'key')
  const [rels, setRels] = useState<string[][]>([st.attrs])
  const [keySel, setKeySel] = useState<string[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, setPending] = useState<{ ri: number; f: FD } | null>(null)
  const startCells = useMemo(() => (st.unf ? st.unf.display.rows.length * st.unf.display.head.length : st.rows.length * st.attrs.length), [st])

  const keyTarget = rels[rels.length - 1]
  const allViol = rels.map((r) => violations(r, st.fds))
  const nViol = allViol.reduce((a, v) => a + v.length, 0)
  const cells = rels.reduce((a, r) => a + project(st, r).length * r.length, 0)

  const chooseApproach = (n: 1 | 2) => {
    setRels(n === 1 ? [st.attrs] : st.unf!.approach2)
    setPhase('key')
    setMsg({ ok: true, text: n === 1 ? 'Approach 1: the table is flattened, so the non-repeating data is copied into every row and the key is extended. Now find that key.' : `Approach 2: the repeating group moves to its own relation with a copy of ${st.unf!.key}. Now find the key of that new relation.` })
  }
  const checkKey = () => {
    const keys = candidateKeys(keyTarget, st.fds)
    const ok = keys.some((k) => sameSet(k, keySel))
    recordAnswer(`forge-${st.id}-key`, 'r4', '1nf', ok)
    if (ok) { setPhase('split'); setMsg({ ok: true, text: `Correct: ${fmt(keySel)} uniquely and minimally identifies each tuple. Now remove the dependencies that cause anomalies.` }) }
    else if (isSuperkey(keySel, keyTarget, st.fds)) setMsg({ ok: false, text: `${fmt(keySel)} is a superkey but not minimal; drop the attribute(s) you don’t need.` })
    else setMsg({ ok: false, text: `${fmt(keySel)} does not determine every attribute. Use the dependencies: what must you know to pin down one row?` })
  }
  const classify = (kind: 'full' | 'partial' | 'transitive') => {
    if (!pending) return
    const { ri, f } = pending
    const rel = rels[ri]
    const real = classifyFD(rel, st.fds, f)
    const truth = real === 'key' ? 'full' : real
    const ok = truth === kind
    recordAnswer(`forge-${st.id}-${fdText(f)}`, 'r4', 'partial-transitive', ok, { firstTry: true })
    if (!ok) { setMsg({ ok: false, text: `Not quite. ${fdText(f)} is a ${truth} dependency in this relation: ${truth === 'partial' ? 'its determinant is only part of a composite key.' : truth === 'transitive' ? 'its determinant is a non-key attribute.' : 'its determinant is a key, so it is exactly what a relation should contain.'}` }); setPending(null); return }
    if (truth === 'full') { setMsg({ ok: true, text: `Right: ${fdText(f)} is a full dependency on the key. It causes no anomaly, so keep it.` }); setPending(null); return }
    // split: R1 = X ∪ Y (within rel), R2 = rel − Y
    const y = f.rhs.filter((a) => rel.includes(a) && !f.lhs.includes(a))
    const r1 = [...f.lhs, ...y]
    const r2 = rel.filter((a) => !y.includes(a))
    const next = [...rels]
    next.splice(ri, 1, r2, r1)
    setRels(next)
    setPending(null)
    const left = next.reduce((a, r) => a + violations(r, st.fds).length, 0)
    if (left === 0) {
      setPhase('done')
      const ok2 = lossless(st.attrs, next, st.fds)
      setMsg({ ok: true, text: `All relations are in 3NF! ${ok2 ? 'The decomposition is lossless: joining the relations on their keys rebuilds the original table exactly.' : ''}` })
      emit({ type: 'toast', text: '⚒️ Forged into 3NF!', tone: 'ok' })
      onClear()
    } else setMsg({ ok: true, text: `Split on ${fdText(f)} (${kind}): ${fmt(y)} moved to a new relation with a copy of the determinant ${fmt(f.lhs)}. ${left} harmful dependenc${left === 1 ? 'y' : 'ies'} left.` })
  }
  const nameOf = (r: string[]) => st.names.find(([a]) => sameSet(a, r))?.[1]

  return (
    <div className="tool-grid">
      <div>
        <div className="panel" style={{ marginBottom: 12 }}>
          <div className="row"><h3 style={{ margin: 0 }}>{st.title}</h3><span className="spacer" /><span className="small muted">{st.story}</span></div>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="small">Anomaly meter</span>
            <div className="meter" style={{ maxWidth: 260 }}><i style={{ width: `${Math.min(100, nViol * 25)}%`, background: nViol ? 'var(--bad)' : 'var(--ok)' }} /></div>
            <span className={'tag ' + (nViol ? 'bad' : 'ok')}>{phase === 'unf' ? 'repeating groups!' : `${nViol} harmful dependenc${nViol === 1 ? 'y' : 'ies'}`}</span>
            <span className="tag">stored cells: {phase === 'unf' ? startCells : cells} (UNF/1NF start: {startCells})</span>
          </div>
        </div>

        {phase === 'unf' && st.unf && (
          <div className="panel">
            <h3>Unnormalized table: the repeating group is highlighted</h3>
            <div className="tbl-wrap"><table className="tbl"><thead><tr>{st.unf.display.head.map((h) => <th key={h} style={/SPORT|PRICE/.test(h) || st.unf!.group.includes(h) ? { background: 'var(--warn-soft)' } : undefined}>{h}</th>)}</tr></thead>
              <tbody>{st.unf.display.rows.map((r, k) => <tr key={k}>{r.map((v, j) => <td key={j} style={/SPORT|PRICE/.test(st.unf!.display.head[j]) || st.unf!.group.includes(st.unf!.display.head[j]) ? { background: 'var(--warn-soft)' } : undefined}>{v === null ? <span className="null">—</span> : v}</td>)}</tr>)}</tbody></table></div>
            <p className="small">Key of the UNF table: <b>{st.unf.key}</b>. Repeating group: <b>({st.unf.group.join(', ')})</b>. How will you reach 1NF?</p>
            <div className="row">
              <button className="btn primary" onClick={() => chooseApproach(1)}>Approach 1: flatten</button>
              <button className="btn primary" onClick={() => chooseApproach(2)}>Approach 2: separate the group</button>
            </div>
          </div>
        )}

        {phase !== 'unf' && rels.map((r, ri) => {
          const keys = candidateKeys(r, st.fds)
          const pk = keys[0] || r
          const nf = nfOf(r, st.fds)
          const fdsHere = projectFDs(r, st.fds)
          const fkTargets = rels.filter((o) => o !== r).map((o) => candidateKeys(o, st.fds)[0]).filter((k) => k && k.every((a) => r.includes(a)) && !sameSet(k, pk))
          const isKeyTarget = phase === 'key' && r === keyTarget
          return (
            <div key={ri + r.join()} className={'rel-box ' + (phase === 'key' ? '' : nf === '3NF' ? 'ok' : 'bad')}>
              <div className="row">
                <b className="mono">{nameOf(r) || `R${ri + 1}`}</b>
                <span className="mono small">(
                  {r.map((a, k) => (
                    <span key={a}>
                      {isKeyTarget
                        ? <span className={'attr-chip' + (keySel.includes(a) ? ' on' : '')} onClick={() => setKeySel((v) => (v.includes(a) ? v.filter((x) => x !== a) : [...v, a]))}>{a}</span>
                        : <span style={{ textDecoration: phase !== 'key' && pk.includes(a) ? 'underline' : undefined, fontWeight: phase !== 'key' && pk.includes(a) ? 700 : 400, color: fkTargets.some((k) => k.includes(a)) ? 'var(--accent)' : undefined }}>{a}</span>}
                      {k < r.length - 1 ? ', ' : ''}
                    </span>
                  ))})</span>
                <span className="spacer" />
                {phase !== 'key' && <span className={'tag ' + (nf === '3NF' ? 'ok' : nf === '2NF' ? 'warn' : 'bad')}>{nf}</span>}
              </div>
              {phase !== 'key' && (
                <div style={{ marginTop: 6 }}>
                  {fdsHere.map((f) => {
                    const harmful = allViol[ri].some((v) => v.fd.lhs.join() === f.lhs.join())
                    return (
                      <div key={fdText(f)} className="row small" style={{ margin: '2px 0' }}>
                        <span className="mono">{fdText(f)}</span>
                        {phase === 'split' && <button className="btn sm" onClick={() => { setPending({ ri, f }); setMsg(null) }}>{harmful ? '⚠ inspect' : 'inspect'}</button>}
                      </div>
                    )
                  })}
                </div>
              )}
              <details style={{ marginTop: 6 }} open={rels.length <= 2}>
                <summary className="small muted">data ({project(st, r).length} distinct rows)</summary>
                <div className="tbl-wrap"><table className="tbl" style={{ fontSize: '.8rem' }}><thead><tr>{r.map((a) => <th key={a}>{a}</th>)}</tr></thead><tbody>{project(st, r).map((row, k) => <tr key={k}>{row.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table></div>
              </details>
            </div>
          )
        })}

        {phase === 'key' && (
          <div className="row" style={{ marginTop: 6 }}>
            <span className="small">Click the attributes that form the primary key of <b>{nameOf(keyTarget) || 'the highlighted relation'}</b>:</span>
            <button className="btn primary" disabled={!keySel.length} onClick={checkKey}>Check key</button>
          </div>
        )}
        {pending && (
          <div className="q-explain" style={{ marginTop: 8 }}>
            <b>Classify {fdText(pending.f)}</b> in {nameOf(rels[pending.ri]) || 'this relation'}:
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn" onClick={() => classify('full')}>Full (on the whole key)</button>
              <button className="btn" onClick={() => classify('partial')}>Partial (on part of the key)</button>
              <button className="btn" onClick={() => classify('transitive')}>Transitive (non-key → non-key)</button>
              <button className="btn ghost sm" onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
        {msg && <div className="q-explain" style={{ marginTop: 8, background: msg.ok ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>{msg.ok ? '✔ ' : '✖ '}{msg.text}</div>}
      </div>
      <div className="panel" style={{ alignSelf: 'start' }}>
        <h3>Functional dependencies</h3>
        {st.fds.map((f) => <div key={fdText(f)} className="mono small">{fdText(f)}</div>)}
        <hr style={{ margin: '12px 0' }} />
        <div className="small">
          <p style={{ margin: '0 0 6px' }}><b>Partial</b>: determinant is part of a composite key, so the relation fails 2NF.</p>
          <p style={{ margin: '0 0 6px' }}><b>Transitive</b>: determinant is a non-key attribute, so it fails 3NF.</p>
          <p style={{ margin: 0 }}><b>Split rule</b> (from the lecture): move the dependent attributes into a new relation <i>with a copy of their determinant</i>; the determinant stays behind as a foreign key.</p>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}><u><b>underlined</b></u> = primary key · <span style={{ color: 'var(--accent)' }}>blue</span> = foreign key</p>
      </div>
    </div>
  )
}
