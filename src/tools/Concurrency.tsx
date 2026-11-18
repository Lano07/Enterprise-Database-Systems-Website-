import { useMemo, useState } from 'react'
import { emit, recordAnswer, toolLevel, useSave } from '../game/store'

// ---------------- schedule engine ----------------
export interface Op { t: number; k: 'r' | 'w' | 'c' | 'a'; x?: string }
export function parseSchedule(s: string): Op[] {
  return (s.match(/[rwca]\d+(\([A-Za-z]\))?/g) || []).map((tok) => ({ k: tok[0] as Op['k'], t: Number(tok.match(/\d+/)![0]), x: tok.match(/\(([A-Za-z])\)/)?.[1] }))
}
export const opText = (o: Op) => `${o.k}${o.t}${o.x ? `(${o.x})` : ''}`
export function precedence(ops: Op[]) {
  const edges = new Map<string, string>() // "1>2" → reason
  ops.forEach((a, i) => ops.slice(i + 1).forEach((b) => {
    if (a.t !== b.t && a.x && a.x === b.x && (a.k === 'w' || b.k === 'w') && (a.k === 'r' || a.k === 'w') && (b.k === 'r' || b.k === 'w')) {
      const key = `${a.t}>${b.t}`
      if (!edges.has(key)) edges.set(key, `${opText(a)} before ${opText(b)}`)
    }
  }))
  return edges
}
export function topo(nodes: number[], edges: Map<string, string>): number[] | null {
  const inDeg = new Map(nodes.map((n) => [n, 0]))
  edges.forEach((_, k) => { const [, b] = k.split('>').map(Number); inDeg.set(b, (inDeg.get(b) || 0) + 1) })
  const q = nodes.filter((n) => inDeg.get(n) === 0).sort()
  const out: number[] = []
  while (q.length) {
    const n = q.shift()!
    out.push(n)
    edges.forEach((_, k) => { const [a, b] = k.split('>').map(Number); if (a === n) { inDeg.set(b, inDeg.get(b)! - 1); if (inDeg.get(b) === 0) q.push(b) } })
  }
  return out.length === nodes.length ? out : null
}

function Graph({ nodes, edges, hl }: { nodes: number[]; edges: string[]; hl?: string[] }) {
  const R = 70, cx = 130, cy = 95
  const pos = (i: number) => ({ x: cx + R * Math.cos((2 * Math.PI * i) / nodes.length - Math.PI / 2), y: cy + R * Math.sin((2 * Math.PI * i) / nodes.length - Math.PI / 2) })
  const P = new Map(nodes.map((n, i) => [n, pos(i)]))
  return (
    <svg viewBox="0 0 260 190" style={{ width: '100%', maxWidth: 300 }} role="img" aria-label="Graph">
      <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)" /></marker></defs>
      {edges.map((e) => {
        const [a, b] = e.split('>').map(Number)
        const p = P.get(a)!, q = P.get(b)!
        const both = edges.includes(`${b}>${a}`)
        const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1
        const ox = both ? (-dy / L) * 8 : 0, oy = both ? (dx / L) * 8 : 0
        return <line key={e} x1={p.x + (dx / L) * 22 + ox} y1={p.y + (dy / L) * 22 + oy} x2={q.x - (dx / L) * 24 + ox} y2={q.y - (dy / L) * 24 + oy} stroke={hl?.includes(e) ? 'var(--bad)' : 'var(--accent)'} strokeWidth={2} markerEnd="url(#arr)" />
      })}
      {nodes.map((n) => { const p = P.get(n)!; return <g key={n}><circle cx={p.x} cy={p.y} r={20} fill="var(--surface)" stroke="var(--ink-2)" strokeWidth={1.5} /><text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">T{n}</text></g> })}
    </svg>
  )
}

// ---------------- anomaly replays ----------------
interface Step { t: 'T1' | 'T2' | '—'; op: string; val: string }
const SCENARIOS: Record<string, { title: string; steps: Step[]; ask: string; options: string[]; answer: number; numQ: string; num: number; explain: string; fix: Step[] }> = {
  lost: {
    title: 'Lost update: PROD_QOH = 35; T1 buys 100, T2 sells 30',
    steps: [{ t: 'T1', op: 'read PROD_QOH', val: '35' }, { t: 'T2', op: 'read PROD_QOH', val: '35' }, { t: 'T1', op: 'compute 35 + 100', val: '35' }, { t: 'T2', op: 'compute 35 − 30', val: '35' }, { t: 'T1', op: 'write 135', val: '135' }, { t: 'T2', op: 'write 5', val: '5' }, { t: '—', op: 'both commit', val: '5' }],
    ask: 'What went wrong?', options: ['Lost update', 'Dirty read', 'Inconsistent analysis', 'Nothing'], answer: 0, numQ: 'What should PROD_QOH be after both transactions?', num: 105,
    explain: 'Both read the same old value; T2’s write overwrote T1’s purchase. Serial execution gives 35 + 100 − 30 = 105.',
    fix: [{ t: 'T1', op: 'lock-X(PROD_QOH) granted; read 35', val: '35' }, { t: 'T2', op: 'lock-X(PROD_QOH) WAITS', val: '35' }, { t: 'T1', op: 'write 135; commit; unlock', val: '135' }, { t: 'T2', op: 'lock granted; read 135', val: '135' }, { t: 'T2', op: 'write 105; commit', val: '105' }],
  },
  dirty: {
    title: 'Uncommitted data: T1 buys 100 but later aborts; T2 sells 30',
    steps: [{ t: 'T1', op: 'read 35; write 135 (uncommitted)', val: '135' }, { t: 'T2', op: 'read 135', val: '135' }, { t: 'T2', op: 'compute 135 − 30; write 105', val: '105' }, { t: 'T1', op: 'ABORT: undo +100', val: '?' }],
    ask: 'What went wrong?', options: ['Lost update', 'Dirty read (uncommitted data)', 'Inconsistent analysis', 'Nothing'], answer: 1, numQ: 'What is the correct PROD_QOH once T1 has aborted?', num: 5,
    explain: 'T2 used a value that never committed. The correct result is 35 − 30 = 5, so T2 must cascade-abort and restart.',
    fix: [{ t: 'T1', op: 'lock-X; write 135 (held until commit/abort: strict 2PL)', val: '135' }, { t: 'T2', op: 'lock-S WAITS: cannot read uncommitted data', val: '135' }, { t: 'T1', op: 'ABORT; restore 35; release lock', val: '35' }, { t: 'T2', op: 'read 35; write 5; commit', val: '5' }],
  },
  analysis: {
    title: 'Inconsistent analysis: T1 sums 6 products while T2 moves 30 units from 345TYX to 125TYZ',
    steps: [{ t: 'T1', op: 'read 104XCV = 100, 110YGH = 120', val: 'sum 220' }, { t: 'T2', op: 'write 125TYZ = 70 + 30 = 100', val: '—' }, { t: 'T1', op: 'read new 125TYZ = 100', val: 'sum 320' }, { t: 'T1', op: 'read old 345TYX = 35', val: 'sum 355' }, { t: 'T2', op: 'write 345TYX = 5; commit', val: '—' }, { t: 'T1', op: 'read remaining 100 and 30', val: 'sum 485' }],
    ask: 'What went wrong?', options: ['Lost update', 'Dirty read', 'Inconsistent analysis (inconsistent retrieval)', 'Phantom'], answer: 2, numQ: 'What is the correct total quantity?', num: 455,
    explain: 'T1 mixed the new 125TYZ with the old 345TYX. The transfer preserves the total (455) both before and after.',
    fix: [{ t: 'T1', op: 'read all six rows from one stable snapshot (Serializable / MVCC)', val: 'sum 455' }, { t: 'T2', op: 'transfer runs; T1 is unaffected', val: '—' }],
  },
}

export function AnomalyReplay({ id, onSolved }: { id: keyof typeof SCENARIOS; onSolved?: () => void }) {
  const sc = SCENARIOS[id]
  const [n, setN] = useState(0)
  const [pick, setPick] = useState<number | null>(null)
  const [num, setNum] = useState('')
  const [numOk, setNumOk] = useState<boolean | null>(null)
  const [fix, setFix] = useState(false)
  const solved = pick === sc.answer && numOk
  const rows = fix ? sc.fix : sc.steps.slice(0, n)
  return (
    <div className="panel" style={{ margin: '10px 0' }}>
      <h3>{sc.title}</h3>
      <div className="timeline" style={{ marginBottom: 8 }}>
        <div className="tl-row head" style={{ gridTemplateColumns: '50px 1fr 1fr 110px' }}><div>Time</div><div>T1</div><div>T2</div><div>Value</div></div>
        {rows.map((s, i) => (
          <div key={i} className={'tl-row' + (i === rows.length - 1 ? ' cur' : ' past')} style={{ gridTemplateColumns: '50px 1fr 1fr 110px' }}>
            <div>{i + 1}</div><div className={s.op.includes('WAIT') && s.t === 'T1' ? 'wait' : s.op.includes('ABORT') && s.t === 'T1' ? 'abort' : ''}>{s.t === 'T1' || s.t === '—' ? s.op : ''}</div><div className={s.op.includes('WAIT') ? 'wait' : ''}>{s.t === 'T2' ? s.op : ''}</div><div>{s.val}</div>
          </div>
        ))}
      </div>
      {!fix && n < sc.steps.length && <button className="btn sm primary" onClick={() => setN(n + 1)}>Step ▶</button>}
      {!fix && n >= sc.steps.length && (
        <>
          <div className="q-text">{sc.ask}</div>
          <div className="row">{sc.options.map((o, i) => <button key={o} className={'btn sm' + (pick === i ? (i === sc.answer ? ' ok' : ' danger') : '')} onClick={() => { setPick(i); recordAnswer(`anom-${id}`, 'r7', 'anomalies', i === sc.answer, { firstTry: pick === null }) }}>{o}</button>)}</div>
          {pick === sc.answer && (
            <div className="row" style={{ marginTop: 8 }}>
              <span>{sc.numQ}</span>
              <input type="text" value={num} onChange={(e) => setNum(e.target.value)} style={{ width: 90 }} aria-label="Correct value" />
              <button className="btn sm" onClick={() => { const ok = Number(num) === sc.num; setNumOk(ok); if (ok) onSolved?.() }}>Check</button>
              {numOk === false && <span className="res-err small">Not quite: think about the serial result.</span>}
            </div>
          )}
          {solved && <div className="q-explain" style={{ background: 'var(--ok-soft)' }}>✔ {sc.explain} <button className="btn sm" onClick={() => setFix(true)}>Replay with the fix ▶</button></div>}
        </>
      )}
      {fix && <div className="q-explain">With proper concurrency control the result is correct. <button className="btn sm ghost" onClick={() => { setFix(false); setN(0); setPick(null); setNum(''); setNumOk(null) }}>Restart</button></div>}
    </div>
  )
}

// ---------------- precedence-graph builder ----------------
const SCHEDULES = [
  'r1(X) r2(X) w1(X) w2(X) c1 c2',
  'r1(X) w1(X) r2(X) w2(X) r1(Y) w1(Y) c1 c2',
  'r2(A) r1(A) w1(A) w1(B) c1 r2(B) c2',
  'r1(X) r2(Y) w2(X) r3(Y) w1(Y) w3(Z) c1 c2 c3',
  'r1(A) w2(A) w1(A) w3(A) c1 c2 c3',
  'r2(X) w2(X) r1(X) r3(Y) w1(Y) w3(Y) c1 c2 c3',
]
export function PrecedenceBuilder({ onSolved }: { onSolved?: () => void }) {
  const [si, setSi] = useState(0)
  const ops = useMemo(() => parseSchedule(SCHEDULES[si]), [si])
  const nodes = [...new Set(ops.map((o) => o.t))].sort()
  const truth = useMemo(() => precedence(ops), [ops])
  const [mine, setMine] = useState<string[]>([])
  const [phase, setPhase] = useState<'edges' | 'verdict' | 'done'>('edges')
  const [msg, setMsg] = useState('')
  const order = topo(nodes, truth)
  const toggle = (e: string) => setMine((m) => (m.includes(e) ? m.filter((x) => x !== e) : [...m, e]))
  const checkEdges = () => {
    const t = [...truth.keys()]
    const ok = t.length === mine.length && t.every((e) => mine.includes(e))
    recordAnswer(`prec-${si}-edges`, 'r7', 'serializability', ok)
    if (ok) { setPhase('verdict'); setMsg('✔ Correct edges. Now: is the schedule conflict serializable?') }
    else {
      const missing = t.filter((e) => !mine.includes(e)), extra = mine.filter((e) => !truth.has(e))
      setMsg(`✖ ${missing.length ? `Missing ${missing.map((e) => 'T' + e.replace('>', '→T')).join(', ')} (${missing.map((e) => truth.get(e)).join('; ')}). ` : ''}${extra.length ? `No conflict justifies ${extra.map((e) => 'T' + e.replace('>', '→T')).join(', ')}.` : ''}`)
    }
  }
  const verdict = (yes: boolean) => {
    const ok = yes === !!order
    recordAnswer(`prec-${si}-verdict`, 'r7', 'serializability', ok)
    setMsg(ok ? (order ? `✔ Acyclic, so conflict serializable. Equivalent serial order: ${order.map((n) => 'T' + n).join(' → ')}.` : '✔ The graph has a cycle, so it is NOT conflict serializable.') : `✖ ${order ? 'The graph is acyclic, so it is serializable.' : 'Look again: there is a cycle.'}`)
    if (ok) { setPhase('done'); onSolved?.() }
  }
  const next = () => { setSi((si + 1) % SCHEDULES.length); setMine([]); setPhase('edges'); setMsg('') }
  return (
    <div className="panel" style={{ margin: '10px 0' }}>
      <div className="row"><h3 style={{ margin: 0 }}>Build the precedence graph</h3><span className="spacer" /><span className="small muted">schedule {si + 1}/{SCHEDULES.length}</span></div>
      <div className="row" style={{ gap: 4, margin: '8px 0' }}>{ops.map((o, i) => <span key={i} className="tag" style={{ fontFamily: 'var(--f-code)', background: o.k === 'w' ? 'var(--bad-soft)' : o.k === 'r' ? 'var(--accent-soft)' : undefined }}>{opText(o)}</span>)}</div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Graph nodes={nodes} edges={phase === 'edges' ? mine : [...truth.keys()]} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="small muted">Click to toggle an edge Ti → Tj (Ti’s conflicting operation comes first):</div>
          <div className="row" style={{ gap: 4, marginTop: 6 }}>
            {nodes.flatMap((a) => nodes.filter((b) => b !== a).map((b) => `${a}>${b}`)).map((e) => (
              <button key={e} className={'btn sm' + (mine.includes(e) ? ' primary' : '')} disabled={phase !== 'edges'} onClick={() => toggle(e)}>T{e.replace('>', ' → T')}</button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            {phase === 'edges' && <button className="btn primary" onClick={checkEdges}>Check edges</button>}
            {phase === 'verdict' && <><button className="btn" onClick={() => verdict(true)}>Serializable</button><button className="btn" onClick={() => verdict(false)}>Not serializable</button></>}
            {phase === 'done' && <button className="btn" onClick={next}>Next schedule →</button>}
          </div>
        </div>
      </div>
      {msg && <div className="q-explain">{msg}</div>}
    </div>
  )
}

// ---------------- 2PL checker ----------------
const LOCK_SEQS: { seq: string[]; violation: number; title: string }[] = [
  { title: 'Lecture practice', seq: ['lock-S(A)', 'read(A)', 'unlock(A)', 'lock-S(B)', 'read(B)', 'unlock(B)'], violation: 3 },
  { title: 'Two-phase reader', seq: ['lock-S(A)', 'read(A)', 'lock-S(B)', 'read(B)', 'unlock(A)', 'unlock(B)', 'display(A+B)'], violation: -1 },
  { title: 'Transfer', seq: ['lock-X(B)', 'read(B)', 'write(B)', 'unlock(B)', 'lock-X(A)', 'read(A)', 'write(A)', 'unlock(A)'], violation: 4 },
  { title: 'Strict transfer', seq: ['lock-X(B)', 'read(B)', 'write(B)', 'lock-X(A)', 'read(A)', 'write(A)', 'commit', 'unlock(A)', 'unlock(B)'], violation: -1 },
]
export function TwoPLChecker({ onSolved }: { onSolved?: () => void }) {
  const [i, setI] = useState(0)
  const [ans, setAns] = useState<number | null>(null)
  const S = LOCK_SEQS[i]
  const lockPoint = S.seq.reduce((lp, op, k) => (op.startsWith('lock') && (S.violation < 0 || k < S.violation) ? k : lp), -1)
  const choose = (k: number) => {
    setAns(k)
    const ok = k === S.violation
    recordAnswer(`2pl-${i}`, 'r7', 'locking', ok)
    if (ok && i === LOCK_SEQS.length - 1) onSolved?.()
  }
  return (
    <div className="panel" style={{ margin: '10px 0' }}>
      <div className="row"><h3 style={{ margin: 0 }}>Is it two-phase? {S.title}</h3><span className="spacer" />{LOCK_SEQS.map((_, k) => <button key={k} className={'btn sm' + (k === i ? ' primary' : '')} onClick={() => { setI(k); setAns(null) }}>{k + 1}</button>)}</div>
      <p className="small muted">Click the first operation that breaks 2PL (a lock acquired after an unlock), or choose “Obeys 2PL”.</p>
      <div className="row" style={{ gap: 4 }}>
        {S.seq.map((op, k) => (
          <button key={k} className={'btn sm' + (ans !== null && k === S.violation ? ' danger' : '') + (ans !== null && k === lockPoint ? ' ok' : '')} onClick={() => choose(k)} style={{ fontFamily: 'var(--f-code)' }}>{op}</button>
        ))}
        <button className={'btn sm' + (ans === -1 ? (S.violation === -1 ? ' ok' : ' danger') : '')} onClick={() => choose(-1)}>✔ Obeys 2PL</button>
      </div>
      {ans !== null && (
        <div className="q-explain" style={{ background: ans === S.violation ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>
          {ans === S.violation ? '✔ ' : '✖ '}
          {S.violation >= 0 ? `${S.seq[S.violation]} comes after ${S.seq.slice(0, S.violation).filter((o) => o.startsWith('unlock')).join(', ')}, so the transaction acquired a lock in its shrinking phase. Repair: acquire it before the first unlock.` : `Every lock is acquired before the first unlock. The lock point (green) is ${S.seq[lockPoint]}.${S.title.startsWith('Strict') ? ' Holding the X locks until commit also makes it strict 2PL.' : ''}`}
          {i < LOCK_SEQS.length - 1 && ans === S.violation && <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => { setI(i + 1); setAns(null) }}>Next →</button>}
        </div>
      )}
    </div>
  )
}

// ---------------- deadlock / wait-for graph ----------------
const DL_STEPS: { who: 3 | 4; req: string; item: 'A' | 'B'; mode: 'S' | 'X' }[] = [
  { who: 3, req: 'lock-X(B)', item: 'B', mode: 'X' },
  { who: 4, req: 'lock-S(A)', item: 'A', mode: 'S' },
  { who: 4, req: 'lock-S(B)', item: 'B', mode: 'S' },
  { who: 3, req: 'lock-X(A)', item: 'A', mode: 'X' },
]
export function DeadlockStage({ onSolved }: { onSolved?: () => void }) {
  const [k, setK] = useState(0)
  const [held, setHeld] = useState<Record<string, [number, 'S' | 'X'][]>>({ A: [], B: [] })
  const [edges, setEdges] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [phase, setPhase] = useState<'steps' | 'victim' | 'quiz' | 'done'>('steps')
  const [quiz, setQuiz] = useState<Record<string, string>>({})
  const step = DL_STEPS[k]
  const decide = (grant: boolean) => {
    const holders = held[step.item].filter(([t]) => t !== step.who)
    const conflict = holders.some(([, m]) => m === 'X' || step.mode === 'X')
    const ok = grant === !conflict
    recordAnswer(`dl-step-${k}`, 'r7', 'locking', ok)
    if (!ok) { setMsg(`✖ ${conflict ? `T${holders[0][0]} holds ${holders[0][1]}(${step.item}), which is incompatible with ${step.mode}, so T${step.who} must wait.` : 'No incompatible lock is held, so the request is granted.'}`); return }
    if (!conflict) { setHeld((h) => ({ ...h, [step.item]: [...h[step.item], [step.who, step.mode]] })); setMsg(`✔ Granted: T${step.who} now holds ${step.mode}(${step.item}).`) }
    else {
      const e = `${step.who}>${holders[0][0]}`
      const ne = [...edges, e]
      setEdges(ne)
      const cyc = ne.includes(`${holders[0][0]}>${step.who}`)
      setMsg(`✔ T${step.who} waits for T${holders[0][0]}: add edge T${step.who} → T${holders[0][0]}.${cyc ? ' The wait-for graph now has a CYCLE, so this is a deadlock!' : ' A single wait is not yet a deadlock.'}`)
      if (cyc) setPhase('victim')
    }
    setK(k + 1)
  }
  const QUIZ = [
    { id: 'wd1', q: 'Wait-die: T1 (TS 10, older) requests A held by T2 (TS 20).', a: 'T1 waits', opts: ['T1 waits', 'T1 aborts', 'T2 aborts'] },
    { id: 'wd2', q: 'Wait-die: T2 (TS 20, younger) requests A held by T1 (TS 10).', a: 'T2 aborts', opts: ['T2 waits', 'T2 aborts', 'T1 aborts'] },
    { id: 'ww1', q: 'Wound-wait: T1 (TS 10, older) requests B held by T2 (TS 20).', a: 'T2 aborts', opts: ['T1 waits', 'T1 aborts', 'T2 aborts'] },
    { id: 'ww2', q: 'Wound-wait: T2 (TS 20, younger) requests B held by T1 (TS 10).', a: 'T2 waits', opts: ['T2 waits', 'T2 aborts', 'T1 aborts'] },
  ]
  return (
    <div className="panel" style={{ margin: '10px 0' }}>
      <h3>The T3/T4 deadlock</h3>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="kv small"><dt>Locks on A</dt><dd>{held.A.map(([t, m]) => `T${t}:${m}`).join(', ') || '—'}</dd><dt>Locks on B</dt><dd>{held.B.map(([t, m]) => `T${t}:${m}`).join(', ') || '—'}</dd></div>
          {phase === 'steps' && step && (
            <div className="q-explain"><b>T{step.who} requests {step.req}.</b> Grant it or make it wait?
              <div className="row" style={{ marginTop: 6 }}><button className="btn sm" onClick={() => decide(true)}>Grant</button><button className="btn sm" onClick={() => decide(false)}>Wait</button></div></div>
          )}
          {phase === 'victim' && (
            <div className="q-explain">Break the deadlock: choose a victim to roll back.
              <div className="row" style={{ marginTop: 6 }}>
                <button className="btn sm" onClick={() => { setMsg('✔ Roll back T3: undo its uncommitted change to B and release X(B). T4 is granted S(B) and can finish; T3 restarts later.'); setPhase('quiz') }}>Victim: T3</button>
                <button className="btn sm" onClick={() => { setMsg('✔ Roll back T4: release S(A). T3 is granted X(A) and finishes; T4 restarts later. (Either victim breaks the cycle; DBMSs weigh cost and fairness.)'); setPhase('quiz') }}>Victim: T4</button>
              </div></div>
          )}
          {phase === 'quiz' && (
            <div style={{ marginTop: 8 }}>
              <b className="small">Prevention by timestamps (smaller = older):</b>
              {QUIZ.map((qq) => (
                <div key={qq.id} className="row small" style={{ margin: '4px 0' }}>
                  <span style={{ minWidth: 260 }}>{qq.q}</span>
                  {qq.opts.map((o) => <button key={o} className={'btn sm' + (quiz[qq.id] === o ? (o === qq.a ? ' ok' : ' danger') : '')} onClick={() => { setQuiz((z) => ({ ...z, [qq.id]: o })); recordAnswer(`dl-${qq.id}`, 'r7', 'deadlock', o === qq.a) }}>{o}</button>)}
                </div>
              ))}
              {QUIZ.every((qq) => quiz[qq.id] === qq.a) && phase === 'quiz' && <button className="btn primary sm" onClick={() => { setPhase('done'); onSolved?.() }}>Finish ✔</button>}
            </div>
          )}
          {phase === 'done' && <div className="q-explain" style={{ background: 'var(--ok-soft)' }}>✔ Deadlock defused. Wait-die lets only older transactions wait; wound-wait lets only younger ones wait. Either way, no cycle can form.</div>}
        </div>
        <div><div className="small muted" style={{ textAlign: 'center' }}>wait-for graph</div><Graph nodes={[3, 4]} edges={edges} hl={edges.length === 2 ? edges : []} /></div>
      </div>
      {msg && <div className="q-explain">{msg}</div>}
    </div>
  )
}

// ---------------- recovery lists ----------------
const LOG: [string, string, string][] = [['1', 'T1', 'BEGIN'], ['2', 'T1', 'UPDATE AB 240→200'], ['3', 'T2', 'BEGIN'], ['4', 'T2', 'UPDATE CD 150→130'], ['5', 'T1', 'COMMIT'], ['6', 'T3', 'BEGIN'], ['7', 'T3', 'UPDATE AB 200→300'], ['8', '—', 'CHECKPOINT (active: T2, T3)'], ['9', 'T2', 'COMMIT'], ['10', 'T4', 'BEGIN'], ['11', 'T4', 'UPDATE CD 130→105'], ['12', 'T4', 'COMMIT'], ['13', 'T5', 'BEGIN'], ['14', 'T5', 'UPDATE CD 105→75'], ['—', '—', '💥 CRASH']]
const TRUTH: Record<string, string> = { T1: 'Neither', T2: 'REDO', T3: 'UNDO', T4: 'REDO', T5: 'UNDO' }
export function RecoveryLists({ onSolved }: { onSolved?: () => void }) {
  const [ans, setAns] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const [vals, setVals] = useState({ AB: '', CD: '' })
  const [valsOk, setValsOk] = useState<boolean | null>(null)
  const allOk = Object.keys(TRUTH).every((t) => ans[t] === TRUTH[t])
  return (
    <div className="panel" style={{ margin: '10px 0' }}>
      <h3>Recovery after the crash (AB = 240, CD = 150 at start)</h3>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="timeline" style={{ flex: 1, minWidth: 260 }}>
          {LOG.map((r, i) => <div key={i} className={'tl-row' + (r[2].startsWith('CHECK') || r[2].includes('CRASH') ? ' cur' : '')} style={{ gridTemplateColumns: '40px 50px 1fr' }}><div>{r[0]}</div><div>{r[1]}</div><div>{r[2]}</div></div>)}
        </div>
        <div style={{ minWidth: 230 }}>
          {Object.keys(TRUTH).map((t) => (
            <div key={t} className="row small" style={{ margin: '4px 0' }}><b style={{ width: 28 }}>{t}</b>
              {['UNDO', 'REDO', 'Neither'].map((o) => <button key={o} className={'btn sm' + (ans[t] === o ? (checked ? (o === TRUTH[t] ? ' ok' : ' danger') : ' primary') : '')} onClick={() => { setAns((a) => ({ ...a, [t]: o })); setChecked(false) }}>{o}</button>)}
            </div>
          ))}
          <button className="btn primary sm" disabled={Object.keys(ans).length < 5} onClick={() => { setChecked(true); recordAnswer('recovery-lists', 'r7', 'checkpoint', allOk, { base: 20 }) }}>Check lists</button>
          {checked && allOk && (
            <div style={{ marginTop: 8 }}>
              <div className="small">✔ UNDO = {'{'}T3, T5{'}'}, REDO = {'{'}T2, T4{'}'}. Now: final values after undo (backward) and redo (forward)?</div>
              <div className="row" style={{ marginTop: 4 }}>
                <label className="small">AB <input type="text" value={vals.AB} onChange={(e) => setVals({ ...vals, AB: e.target.value })} style={{ width: 60 }} /></label>
                <label className="small">CD <input type="text" value={vals.CD} onChange={(e) => setVals({ ...vals, CD: e.target.value })} style={{ width: 60 }} /></label>
                <button className="btn sm" onClick={() => { const ok = Number(vals.AB) === 200 && Number(vals.CD) === 105; setValsOk(ok); if (ok) onSolved?.() }}>Check</button>
              </div>
              {valsOk === true && <div className="q-explain" style={{ background: 'var(--ok-soft)' }}>✔ AB = 240 − 40 = 200 and CD = 150 − 20 − 25 = 105: only the committed T1, T2 and T4 survive.</div>}
              {valsOk === false && <div className="small res-err">Undo T5 (CD 75 → 105) and T3 (AB 300 → 200), then redo T2 (CD = 130) and T4 (CD = 105).</div>}
            </div>
          )}
          {checked && !allOk && <div className="small res-err" style={{ marginTop: 6 }}>Start UNDO with the checkpoint’s active list; BEGIN adds to UNDO, COMMIT moves to REDO. What about T1, which committed before the checkpoint?</div>}
        </div>
      </div>
    </div>
  )
}

// ---------------- the Defuser ----------------
const STAGES = ['Lost update', 'Dirty read', 'Inconsistent analysis', 'Precedence graphs', 'Two-phase locking', 'Deadlock', 'Recovery'] as const
export function Concurrency({ stage }: { stage?: string }) {
  const s = useSave()
  const cleared = s.tools['concurrency'] || 0
  const [i, setI] = useState(Math.min(Number(stage) || cleared, STAGES.length - 1))
  const win = (k: number) => () => { toolLevel('concurrency', k + 1, 50); emit({ type: 'toast', text: `💣 ${STAGES[k]} defused!`, tone: 'ok' }) }
  return (
    <div>
      <p className="lede">Interleaved transactions are ticking bombs. Step through each schedule, name the problem, and defuse it with locks, graphs, timestamps and the transaction log.</p>
      <div className="stage-tabs">{STAGES.map((t, k) => <button key={t} className={(k === i ? 'on ' : '') + (k < cleared ? 'done' : '')} disabled={k > cleared && !s.settings.freeRoam} onClick={() => setI(k)}>{k + 1}. {t}</button>)}</div>
      {i === 0 && <AnomalyReplay key="lost" id="lost" onSolved={win(0)} />}
      {i === 1 && <AnomalyReplay key="dirty" id="dirty" onSolved={win(1)} />}
      {i === 2 && <AnomalyReplay key="analysis" id="analysis" onSolved={win(2)} />}
      {i === 3 && <PrecedenceBuilder onSolved={win(3)} />}
      {i === 4 && <TwoPLChecker onSolved={win(4)} />}
      {i === 5 && <DeadlockStage onSolved={win(5)} />}
      {i === 6 && <RecoveryLists onSolved={win(6)} />}
    </div>
  )
}
