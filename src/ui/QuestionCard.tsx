import { useMemo, useState } from 'react'
import type { Question } from '../content/types'
import { inline } from '../engine/md'
import { recordAnswer, spendMana } from '../game/store'
import { realmById } from '../content/realms'

const HINT_COST = 10

function shuffle<T>(a: T[], seed: number) {
  const r = [...a]
  let s = seed || 1
  for (let i = r.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1));
    [r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0
export const normText = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').replace(/[.;]+$/, '').trim()

export type QState = 'idle' | 'right' | 'wrong' | 'revealed'

export function gradeQuestion(q: Question, a: unknown): boolean {
  switch (q.kind) {
    case 'mcq': return a === q.answer
    case 'tf': return a === q.answer
    case 'multi': { const s = new Set(a as number[]); return s.size === q.answer.length && q.answer.every((x) => s.has(x)) }
    case 'fill': return q.accept.some((x) => normText(x) === normText(String(a ?? '')))
    case 'num': { const v = Number(String(a).replace(/,/g, '')); return !isNaN(v) && Math.abs(v - q.answer) <= (q.tol ?? 1e-9) }
    case 'order': return (a as string[]).every((x, i) => x === q.items[i])
    case 'match': return (a as string[]).every((x, i) => x === q.pairs[i][1])
  }
}

export function QuestionCard({ q, onDone, attempts = 2, feedback = true, record = true, label, compact }: {
  q: Question
  onDone?: (correct: boolean, firstTry: boolean) => void
  attempts?: number
  feedback?: boolean
  record?: boolean
  label?: string
  compact?: boolean
}) {
  const seed = useMemo(() => hash(q.id) + Math.floor(Math.random() * 1000), [q.id])
  const mcqOrder = useMemo(() => (q.kind === 'mcq' || q.kind === 'multi' ? shuffle(q.options.map((_, i) => i), seed) : []), [q, seed])
  const initial = useMemo(() => {
    if (q.kind === 'order') { let s = shuffle(q.items, seed); if (s.every((x, i) => x === q.items[i])) s = [...s].reverse(); return s }
    if (q.kind === 'match') return q.pairs.map(() => '')
    if (q.kind === 'multi') return [] as number[]
    return null
  }, [q, seed])
  const [ans, setAns] = useState<unknown>(initial)
  const [state, setState] = useState<QState>('idle')
  const [tries, setTries] = useState(0)
  const [hint, setHint] = useState(false)
  const [elim, setElim] = useState<number[]>([])
  // distinct right-hand choices (several left items may share an answer, e.g. UNDO/REDO)
  const rights = useMemo(() => (q.kind === 'match' ? shuffle([...new Set(q.pairs.map((p) => p[1]))], seed + 3) : []), [q, seed])
  const locked = state !== 'idle'

  const ready = (() => {
    if (q.kind === 'mcq' || q.kind === 'tf') return ans !== null && ans !== undefined
    if (q.kind === 'multi') return (ans as number[]).length > 0
    if (q.kind === 'fill' || q.kind === 'num') return String(ans ?? '').trim() !== ''
    if (q.kind === 'match') return (ans as string[]).every(Boolean)
    return true
  })()

  const submit = () => {
    const ok = gradeQuestion(q, ans)
    const n = tries + 1
    setTries(n)
    const first = n === 1
    if (ok) {
      setState('right')
      if (record) recordAnswer(q.id, q.realm, q.topic, true, { firstTry: first })
      onDone?.(true, first)
    } else if (n >= attempts || !feedback) {
      setState('wrong')
      if (record && first) recordAnswer(q.id, q.realm, q.topic, false)
      onDone?.(false, first)
    } else {
      // first miss in practice: record it, keep the card open for one more try
      if (record) recordAnswer(q.id, q.realm, q.topic, false)
      setState('idle')
      setShakeKey((k) => k + 1)
    }
  }
  const [shakeKey, setShakeKey] = useState(0)
  const useHint = () => {
    if (hint || !spendMana(HINT_COST)) return
    setHint(true)
    if ((q.kind === 'mcq' || q.kind === 'multi') && !q.hint) {
      const wrong = q.options.map((_, i) => i).filter((i) => (q.kind === 'mcq' ? i !== q.answer : !q.answer.includes(i)))
      setElim(shuffle(wrong, seed + 9).slice(0, Math.max(1, Math.floor(wrong.length / 2))))
    }
  }
  const reveal = () => { setState('revealed'); if (record && tries === 0) recordAnswer(q.id, q.realm, q.topic, false); onDone?.(false, tries === 0) }

  const optClass = (i: number) => {
    const chosen = q.kind === 'multi' ? (ans as number[]).includes(i) : ans === i
    if (!locked || !feedback) return chosen ? 'opt sel' : 'opt'
    const correct = q.kind === 'mcq' ? q.answer === i : q.kind === 'multi' ? q.answer.includes(i) : false
    if (correct) return 'opt good'
    if (chosen) return 'opt badc'
    return 'opt'
  }
  const realm = realmById(q.realm)
  const missed = tries > 0 && state === 'idle'

  return (
    <div className={'qcard ' + (feedback && state === 'right' ? 'right' : feedback && (state === 'wrong' || state === 'revealed') ? 'wrong' : '')}>
      {!compact && (
        <div className="q-head">
          <span style={{ color: realm?.color }}>{label || 'Challenge'}</span>
          <span>·</span><span>{'★'.repeat(q.d)}{'☆'.repeat(3 - q.d)}</span>
          {q.kind === 'multi' && <span className="tag">select all that apply</span>}
          {q.kind === 'order' && <span className="tag">put in order</span>}
          {q.kind === 'match' && <span className="tag">match</span>}
        </div>
      )}
      <div className="q-text" key={shakeKey} style={missed ? { animation: 'shake .4s' } : undefined}>{inline(q.q)}</div>

      {(q.kind === 'mcq' || q.kind === 'multi') && (
        <div className="opts">
          {mcqOrder.map((i, k) => elim.includes(i) && !locked ? null : (
            <button key={i} className={optClass(i)} disabled={locked} onClick={() => {
              if (q.kind === 'mcq') setAns(i)
              else { const s = new Set(ans as number[]); s.has(i) ? s.delete(i) : s.add(i); setAns([...s]) }
            }}>
              <span className="k">{q.kind === 'multi' ? ((ans as number[]).includes(i) ? '☑' : '☐') : String.fromCharCode(65 + k)}</span>
              <span>{inline(q.options[i])}</span>
            </button>
          ))}
        </div>
      )}
      {q.kind === 'tf' && (
        <div className="opts" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {[true, false].map((v) => {
            let c = ans === v ? 'opt sel' : 'opt'
            if (locked && feedback) c = v === q.answer ? 'opt good' : ans === v ? 'opt badc' : 'opt'
            return <button key={String(v)} className={c} disabled={locked} onClick={() => setAns(v)}><span>{v ? 'True' : 'False'}</span></button>
          })}
        </div>
      )}
      {(q.kind === 'fill' || q.kind === 'num') && (
        <div className="row">
          <input type="text" inputMode={q.kind === 'num' ? 'decimal' : 'text'} value={String(ans ?? '')} disabled={locked} style={{ minWidth: 220, flex: 1, maxWidth: 420 }}
            placeholder={q.kind === 'fill' ? q.placeholder || 'Type your answer' : 'Number'} onChange={(e) => setAns(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && ready && !locked) submit() }} aria-label="Answer" />
          {q.kind === 'num' && q.unit && <span className="muted">{q.unit}</span>}
        </div>
      )}
      {q.kind === 'order' && (
        <div className="order-list">
          {(ans as string[]).map((it, i, arr) => (
            <div key={it} className="order-item" style={locked && feedback ? { borderColor: it === q.items[i] ? 'var(--ok)' : 'var(--bad)' } : undefined}>
              <div className="mv">
                <button disabled={locked || i === 0} aria-label="Move up" onClick={() => { const a = [...arr]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setAns(a) }}>▲</button>
                <button disabled={locked || i === arr.length - 1} aria-label="Move down" onClick={() => { const a = [...arr]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; setAns(a) }}>▼</button>
              </div>
              <span className="mono muted small">{i + 1}</span><span>{inline(it)}</span>
            </div>
          ))}
        </div>
      )}
      {q.kind === 'match' && (
        <div>
          {q.pairs.map(([l], i) => (
            <div className="match-row" key={i}>
              <div>{inline(l)}</div>
              <select value={(ans as string[])[i]} disabled={locked} aria-label={'Match for ' + l}
                style={locked && feedback ? { borderColor: (ans as string[])[i] === q.pairs[i][1] ? 'var(--ok)' : 'var(--bad)' } : undefined}
                onChange={(e) => { const a = [...(ans as string[])]; a[i] = e.target.value; setAns(a) }}>
                <option value="">Choose…</option>
                {rights.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {missed && <div className="q-hint" style={{ background: 'var(--bad-soft)' }}>Not quite. One more try{q.kind === 'order' || q.kind === 'match' ? '; check each position' : ''}.</div>}
      {hint && q.hint && <div className="q-hint">💧 {inline(q.hint)}</div>}
      {hint && !q.hint && elim.length > 0 && <div className="q-hint">💧 {elim.length} wrong option{elim.length > 1 ? 's' : ''} removed.</div>}

      <div className="q-actions">
        {!locked && <button className="btn primary" disabled={!ready} onClick={submit}>{missed ? 'Try again' : 'Check'}</button>}
        {!locked && feedback && !hint && (q.hint || q.kind === 'mcq' || q.kind === 'multi') && (
          <button className="btn sm ghost" onClick={useHint} title={`Costs ${HINT_COST} Query Mana`}>💧 Hint ({HINT_COST} mana)</button>
        )}
        {!locked && feedback && missed && <button className="btn sm ghost" onClick={reveal}>Show answer</button>}
      </div>

      {locked && feedback && (
        <div className="q-explain">
          {state === 'right' ? <b className="ok">✔ Correct{tries === 1 ? ' on the first try!' : '.'}</b> : <b className="bad">✖ {state === 'revealed' ? 'Answer revealed.' : 'Not this time.'}</b>}{' '}
          {state !== 'right' && <CorrectAnswer q={q} />}
          <div style={{ marginTop: 4 }}>{inline(q.explain)}</div>
        </div>
      )}
    </div>
  )
}

export function CorrectAnswer({ q }: { q: Question }) {
  switch (q.kind) {
    case 'mcq': return <span>Answer: <b>{inline(q.options[q.answer])}</b>.</span>
    case 'multi': return <span>Answer: <b>{q.answer.map((i) => q.options[i]).join('; ')}</b>.</span>
    case 'tf': return <span>Answer: <b>{q.answer ? 'True' : 'False'}</b>.</span>
    case 'fill': return <span>Answer: <b>{q.accept[0]}</b>.</span>
    case 'num': return <span>Answer: <b>{q.answer}{q.unit ? ' ' + q.unit : ''}</b>.</span>
    case 'order': return <span>Order: <b>{q.items.join(' → ')}</b>.</span>
    case 'match': return <span>{q.pairs.map(([l, r]) => `${l} → ${r}`).join('; ')}.</span>
  }
}
