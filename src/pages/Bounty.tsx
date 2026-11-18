import { useEffect, useMemo, useState } from 'react'
import { ALL_QUESTIONS } from '../content'
import { realmById } from '../content/realms'
import { bountyResult, getSave, useSave } from '../game/store'
import { isUnlocked } from '../game/progress'
import { QuestionCard } from '../ui/QuestionCard'

const TIME = 60

export function Bounty() {
  const s = useSave()
  const [state, setState] = useState<'ready' | 'run' | 'done'>('ready')
  const [left, setLeft] = useState(TIME)
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [misses, setMisses] = useState(0)
  const [seed, setSeed] = useState(0)
  const pool = useMemo(() => {
    const sv = getSave()
    // quick-fire kinds only; prefer realms you have unlocked
    return ALL_QUESTIONS.filter((q) => (q.kind === 'mcq' || q.kind === 'tf') && isUnlocked(q.realm, sv)).sort(() => Math.random() - 0.5)
  }, [seed])

  useEffect(() => {
    if (state !== 'run') return
    if (left <= 0) { setState('done'); bountyResult(score); return }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [state, left, score])

  const start = () => { setSeed((x) => x + 1); setI(0); setScore(0); setMisses(0); setLeft(TIME); setState('run') }
  const onDone = (ok: boolean) => {
    if (ok) setScore((n) => n + 1)
    else { setMisses((n) => n + 1); setLeft((l) => Math.max(0, l - 5)) }
    setTimeout(() => setI((n) => n + 1), ok ? 450 : 1400)
  }

  return (
    <div className="page narrow">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><a href="#/practice">Quests</a><span>›</span><span>Bug Bounty</span></div>
      <h1 className="title">🐞 Bug Bounty Time-Attack</h1>
      <p className="lede">The production database is on fire. You have 60 seconds to squash as many bugs as you can. A wrong fix costs 5 seconds. Questions come from every realm you have unlocked.</p>
      {state === 'ready' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.6rem' }}>⏱️</div>
          <p>Personal best: <b>{s.bounty.best}</b> bugs · runs: {s.bounty.runs}</p>
          <button className="btn primary" onClick={start} disabled={!pool.length}>Start the clock</button>
        </div>
      )}
      {state === 'run' && pool[i % Math.max(1, pool.length)] && (
        <>
          <div className="row">
            <span className={'timer' + (left <= 10 ? ' low' : '')}>⏱ {left}s</span>
            <span className="spacer" />
            <span className="tag ok">🐞 {score} fixed</span><span className="tag bad">{misses} missed</span>
          </div>
          <div className="bar" style={{ margin: '6px 0' }}><i style={{ width: `${(100 * left) / TIME}%`, background: left <= 10 ? 'var(--bad)' : 'var(--accent)' }} /></div>
          <QuestionCard key={i + '-' + seed} q={pool[i % pool.length]} attempts={1} label={'Bug #' + (i + 1) + ' · ' + realmById(pool[i % pool.length].realm)?.short} onDone={onDone} />
        </>
      )}
      {state === 'done' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.6rem' }}>{score >= s.bounty.best && score > 0 ? '🏆' : '🐞'}</div>
          <h2 style={{ fontFamily: 'var(--f-display)' }}>{score} bugs squashed</h2>
          <p>{misses} missed · +{score * 5} XP · best {s.bounty.best}</p>
          <div className="row" style={{ justifyContent: 'center' }}><button className="btn primary" onClick={start}>Run it back</button><a className="btn" href="#/raid">Fix weak spots</a></div>
        </div>
      )}
    </div>
  )
}
