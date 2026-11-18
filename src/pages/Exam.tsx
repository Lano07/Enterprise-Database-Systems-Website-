import { useEffect, useMemo, useState } from 'react'
import { ALL_QUESTIONS, ALL_WRITTEN, CONTENT } from '../content'
import { REALMS, realmById } from '../content/realms'
import type { Question, RealmId } from '../content/types'
import { examResult, useSave } from '../game/store'
import { topicName } from '../game/progress'
import { QuestionCard, CorrectAnswer } from '../ui/QuestionCard'
import { inline } from '../engine/md'

interface Config { title: string; realms: RealmId[]; n: number; minutes: number }

function buildPaper(c: Config): Question[] {
  const pool = ALL_QUESTIONS.filter((q) => c.realms.includes(q.realm))
  // stratify across realms, then difficulty
  const per = Math.max(1, Math.ceil(c.n / c.realms.length))
  const out: Question[] = []
  c.realms.forEach((r) => {
    const qs = pool.filter((q) => q.realm === r).sort(() => Math.random() - 0.5)
    out.push(...qs.slice(0, per))
  })
  return out.sort(() => Math.random() - 0.5).slice(0, c.n).sort((a, b) => a.d - b.d)
}

export function ExamArena({ mode }: { mode?: string }) {
  const s = useSave()
  const [cfg, setCfg] = useState<Config | null>(null)
  if (cfg) return <MockExam cfg={cfg} onExit={() => setCfg(null)} />
  const ready = REALMS.filter((r) => CONTENT[r.id].questions.length)
  void mode
  return (
    <div className="page">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><span>Exam Arena</span></div>
      <h1 className="title">⚔️ Exam Arena</h1>
      <p className="lede">Timed, auto-graded mock papers built from every realm, with a topic-by-topic breakdown and full review at the end. Mix them with written answers, because COMP2605 exams reward clear definitions, worked calculations and diagrams.</p>
      <div className="grid">
        <div className="card">
          <h3>🎓 Whole-course mock exam</h3>
          <p>40 questions across all realms, 60 minutes. The closest thing to the final.</p>
          <button className="btn primary" onClick={() => setCfg({ title: 'Whole-course mock exam', realms: ready.map((r) => r.id), n: 40, minutes: 60 })}>Start (60 min)</button>
        </div>
        <div className="card">
          <h3>⚡ Sprint paper</h3>
          <p>15 questions, 20 minutes, across every realm. Good for a daily warm-up.</p>
          <button className="btn" onClick={() => setCfg({ title: 'Sprint paper', realms: ready.map((r) => r.id), n: 15, minutes: 20 })}>Start (20 min)</button>
        </div>
        <div className="card">
          <h3>📚 Realm paper</h3>
          <p>Focus on one realm: 15 questions, 25 minutes.</p>
          <div className="row">
            <select id="rp" defaultValue={ready[0]?.id} aria-label="Realm">{ready.map((r) => <option key={r.id} value={r.id}>Realm {r.n}: {r.short}</option>)}</select>
            <button className="btn" onClick={() => { const v = (document.getElementById('rp') as HTMLSelectElement).value as RealmId; setCfg({ title: `Realm ${realmById(v)?.n} paper: ${realmById(v)?.title}`, realms: [v], n: 15, minutes: 25 }) }}>Start</button>
          </div>
        </div>
        <a className="card" href="#/written"><h3>✍️ Written answers</h3><p>{ALL_WRITTEN.length} long-answer questions with model answers and marking points. Mark yourself honestly.</p></a>
        <a className="card" href="#/raid"><h3>🎯 Weakness Raid</h3><p>Targets every topic where your accuracy is below 90%.</p></a>
        <a className="card" href="#/codex"><h3>📜 Revision codices</h3><p>Concise, printable cheat sheets for every realm.</p></a>
      </div>
      <div className="sec-h"><h2>Realm bosses</h2></div>
      <div className="grid g3">
        {REALMS.map((r) => (
          <a key={r.id} className="card" href={`#/boss/${r.id}`} style={{ borderTop: `3px solid ${r.color}` }}>
            <h3>{s.bosses[r.id]?.beaten ? '👑' : '💀'} {r.boss.name}</h3>
            <p>Realm {r.n}: {r.short}{s.bosses[r.id] ? ` · best ${Math.round(s.bosses[r.id].best * 100)}%` : ''}</p>
          </a>
        ))}
      </div>
      {s.exams.length > 0 && (
        <>
          <div className="sec-h"><h2>Your mock exams</h2></div>
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Date</th><th>Paper</th><th>Score</th></tr></thead><tbody>
            {s.exams.map((e, i) => <tr key={i}><td>{new Date(e.date).toLocaleDateString()}</td><td>{e.title}</td><td>{e.score}/{e.max} ({Math.round((100 * e.score) / e.max)}%)</td></tr>)}
          </tbody></table></div>
        </>
      )}
    </div>
  )
}

function MockExam({ cfg, onExit }: { cfg: Config; onExit: () => void }) {
  const paper = useMemo(() => buildPaper(cfg), [cfg])
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [left, setLeft] = useState(cfg.minutes * 60)
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (done) return
    if (left <= 0) { finish(); return }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  })
  const finish = () => {
    if (done) return
    setDone(true)
    const score = paper.filter((q) => answers[q.id]).length
    examResult(cfg.title, score, paper.length)
    window.scrollTo(0, 0)
  }
  const mm = Math.floor(left / 60), ss = left % 60
  const score = paper.filter((q) => answers[q.id]).length
  const byTopic = new Map<string, { n: number; r: number; realm: RealmId }>()
  paper.forEach((q) => { const k = q.realm + ':' + q.topic; const v = byTopic.get(k) || { n: 0, r: 0, realm: q.realm }; v.n++; if (answers[q.id]) v.r++; byTopic.set(k, v) })

  return (
    <div className="page narrow">
      <div className="row" style={{ position: 'sticky', top: 104, zIndex: 5, background: 'var(--bg)', padding: '8px 0' }}>
        <b>{cfg.title}</b><span className="spacer" />
        {!done && <span className={'timer' + (left < 120 ? ' low' : '')}>⏱ {mm}:{String(ss).padStart(2, '0')}</span>}
        {!done && <span className="small muted">{Object.keys(answers).length}/{paper.length} answered</span>}
        {!done ? <button className="btn primary sm" onClick={finish}>Hand in</button> : <button className="btn sm" onClick={onExit}>Back to Exam Arena</button>}
      </div>
      {done && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--f-display)', margin: '0 0 6px' }}>{score}/{paper.length} · {Math.round((100 * score) / paper.length)}%</h2>
          <p className="muted">{score / paper.length >= 0.9 ? 'A+ territory. Keep it fresh with spaced reviews.' : score / paper.length >= 0.7 ? 'Solid. Raid the red topics below to push into the A range.' : 'Use the breakdown to plan your revision, then try again.'}</p>
          <div className="heat">
            {[...byTopic.entries()].sort((a, b) => a[1].r / a[1].n - b[1].r / b[1].n).map(([k, v]) => (
              <a key={k} href={`#/practice?realm=${v.realm}&topic=${k.split(':')[1]}`} style={{ background: v.r === v.n ? 'var(--ok-soft)' : v.r / v.n >= 0.5 ? 'var(--warn-soft)' : 'var(--bad-soft)', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', fontSize: '.82rem', color: 'inherit', textDecoration: 'none' }}>
                <b style={{ display: 'block' }}>{topicName(k.split(':')[1])}</b>{v.r}/{v.n} · R{realmById(v.realm)?.n}
              </a>
            ))}
          </div>
        </div>
      )}
      {paper.map((q, i) => done ? (
        <div key={q.id} className={'qcard ' + (answers[q.id] ? 'right' : 'wrong')}>
          <div className="q-head">Q{i + 1} · {realmById(q.realm)?.short} · {answers[q.id] ? '✔ correct' : q.id in answers ? '✖ wrong' : '— unanswered'}</div>
          <div className="q-text">{inline(q.q)}</div>
          <div className="q-explain"><CorrectAnswer q={q} /> <div style={{ marginTop: 4 }}>{inline(q.explain)}</div></div>
        </div>
      ) : (
        <div key={q.id}>
          <div className="small muted" style={{ marginBottom: -10 }}>Question {i + 1}</div>
          <QuestionCard q={q} attempts={1} feedback={false} label={realmById(q.realm)?.short} onDone={(ok) => setAnswers((a) => ({ ...a, [q.id]: ok }))} />
        </div>
      ))}
      {!done && <div className="row"><span className="spacer" /><button className="btn primary" onClick={finish}>Hand in paper</button></div>}
    </div>
  )
}

