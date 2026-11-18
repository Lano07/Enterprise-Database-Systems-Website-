import { useMemo, useState } from 'react'
import { ALL_QUESTIONS, CONTENT } from '../content'
import { REALMS, realmById } from '../content/realms'
import type { Question, RealmId } from '../content/types'
import { dueQuestionIds, getSave, mastery, topicKey, useSave } from '../game/store'
import { topicName, weakTopics } from '../game/progress'
import { QuestionCard } from '../ui/QuestionCard'
import { parseHash } from '../ui/router'

const SESSION = 10

function pickQueue(pool: Question[], n = SESSION) {
  const s = getSave()
  const now = Date.now()
  const score = (q: Question) => {
    const a = s.attempts[q.id]
    if (!a) return 1 + Math.random() // unseen
    if (a.due <= now) return 3 + Math.random() // due for review
    const m = mastery(topicKey(q.realm, q.topic), s)
    return (m ? 1 - m.acc : 0.5) + Math.random() * 0.5
  }
  return [...pool].sort((a, b) => score(b) - score(a)).slice(0, n)
}

export function Practice({ realm, topic, raid }: { realm?: string; topic?: string; raid?: boolean }) {
  const s = useSave()
  const due = parseHash().query.get('due') === '1'
  const [sel, setSel] = useState<{ realm?: string; topic?: string }>({ realm, topic })
  const [run, setRun] = useState(0)

  const pool = useMemo(() => {
    if (raid) {
      const weak = weakTopics(getSave())
      const keys = new Set(weak.map((w) => topicKey(w.realm, w.topic)))
      return ALL_QUESTIONS.filter((q) => keys.has(topicKey(q.realm, q.topic)))
    }
    if (due) {
      const ids = new Set(dueQuestionIds(getSave()))
      return ALL_QUESTIONS.filter((q) => ids.has(q.id))
    }
    return ALL_QUESTIONS.filter((q) => (!sel.realm || q.realm === sel.realm) && (!sel.topic || q.topic === sel.topic))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raid, due, sel.realm, sel.topic, run])

  const queue = useMemo(() => pickQueue(pool), [pool])
  const [i, setI] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [answered, setAnswered] = useState(false)
  const xpStart = useMemo(() => getSave().xp, [queue]) // eslint-disable-line react-hooks/exhaustive-deps

  const restart = () => { setRun((r) => r + 1); setI(0); setResults([]); setAnswered(false) }
  const finished = i >= queue.length && queue.length > 0
  const title = raid ? 'Weakness Raid' : due ? 'Spaced-repetition review' : 'Quest board'
  const weak = raid ? weakTopics(s) : []

  return (
    <div className="page narrow">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><span>{title}</span></div>
      <h1 className="title">{raid ? '🎯 ' : due ? '🔁 ' : '🗺️ '}{title}</h1>
      <p className="lede">
        {raid ? 'A raid on every topic where your accuracy is below 90%. Clear them until they turn green.'
          : due ? 'These challenges are due for review. Answer them before your retention decays.'
            : 'Ten challenges per run. You get unseen and overdue questions first, then your weakest topics. First-try answers build your combo multiplier.'}
      </p>

      {!raid && !due && (
        <div className="row" style={{ marginBottom: 12 }}>
          <select value={sel.realm || ''} onChange={(e) => { setSel({ realm: e.target.value || undefined }); restart() }} aria-label="Realm">
            <option value="">All realms</option>
            {REALMS.filter((r) => CONTENT[r.id].questions.length).map((r) => <option key={r.id} value={r.id}>Realm {r.n}: {r.short}</option>)}
          </select>
          {sel.realm && (
            <select value={sel.topic || ''} onChange={(e) => { setSel({ realm: sel.realm, topic: e.target.value || undefined }); restart() }} aria-label="Topic">
              <option value="">All topics</option>
              {[...new Set(CONTENT[sel.realm as RealmId].questions.map((q) => q.topic))].map((t) => <option key={t} value={t}>{topicName(t)}</option>)}
            </select>
          )}
          <span className="spacer" />
          <a className="btn sm" href="#/raid">🎯 Weakness Raid</a>
          <a className="btn sm" href="#/bounty">🐞 Bug Bounty</a>
          <a className="btn sm" href="#/cards">🧠 Flashcards</a>
        </div>
      )}
      {raid && weak.length > 0 && (
        <div className="row" style={{ marginBottom: 10 }}>{weak.slice(0, 8).map((w) => <span key={w.realm + w.topic} className="tag bad">{realmById(w.realm)?.short}: {topicName(w.topic)} {Math.round(w.acc * 100)}%</span>)}</div>
      )}

      {!queue.length ? (
        <div className="empty">
          {raid ? 'No weak spots yet. Answer some questions first (or you are above 90% everywhere, so well done).' : due ? 'Nothing is due. Come back later, or take a normal run.' : 'No challenges here yet.'}
          <div style={{ marginTop: 10 }}><a className="btn" href="#/practice">Quest board</a></div>
        </div>
      ) : finished ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem' }}>{results.filter(Boolean).length / results.length >= 0.8 ? '🏆' : results.filter(Boolean).length / results.length >= 0.5 ? '⚔️' : '🛠️'}</div>
          <h2 style={{ fontFamily: 'var(--f-display)' }}>{results.filter(Boolean).length} / {results.length} correct</h2>
          <p>+{getSave().xp - xpStart} XP this run · best combo {s.bestCombo}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={restart}>Another run</button>
            <a className="btn" href="#/raid">Weakness Raid</a>
            <a className="btn" href="#/">Map</a>
          </div>
        </div>
      ) : (
        <>
          <div className="row small muted">
            <span>Challenge {i + 1} of {queue.length}</span>
            <span className="spacer" />
            <span>{realmById(queue[i].realm)?.short} · {topicName(queue[i].topic)}</span>
          </div>
          <div className="bar" style={{ margin: '6px 0' }}><i style={{ width: `${(100 * i) / queue.length}%` }} /></div>
          <QuestionCard key={queue[i].id + run} q={queue[i]} label={realmById(queue[i].realm)?.title} onDone={(ok) => { setResults((r) => [...r, ok]); setAnswered(true) }} />
          <div className="row">
            <span className="spacer" />
            <button className="btn primary" disabled={!answered} onClick={() => { setI(i + 1); setAnswered(false) }}>{i + 1 === queue.length ? 'Finish run' : 'Next challenge →'}</button>
          </div>
        </>
      )}
    </div>
  )
}
