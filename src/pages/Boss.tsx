import { useMemo, useState } from 'react'
import { CONTENT } from '../content'
import { realmById } from '../content/realms'
import type { RealmId } from '../content/types'
import { bossResult, useSave } from '../game/store'
import { QuestionCard } from '../ui/QuestionCard'

const PLAYER_HP = 3

export function Boss({ realm }: { realm: string }) {
  const r = realmById(realm)
  const s = useSave()
  const [seed, setSeed] = useState(0)
  const queue = useMemo(() => {
    if (!r) return []
    const qs = [...CONTENT[r.id as RealmId].questions].sort(() => Math.random() - 0.5)
    // three phases: warm-up (★), core (★★), finisher (★★★); fall back to whatever exists
    const by = (d: number) => qs.filter((q) => q.d === d)
    return [...by(1).slice(0, 3), ...by(2), ...by(3), ...by(1).slice(3)]
  }, [r, seed])
  const [i, setI] = useState(0)
  const [bossHp, setBossHp] = useState(r?.boss.hp || 8)
  const [hp, setHp] = useState(PLAYER_HP)
  const [hit, setHit] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [over, setOver] = useState<null | 'won' | 'lost'>(null)
  const [right, setRight] = useState(0)
  if (!r) return <div className="page">Unknown realm.</div>
  const maxHp = r.boss.hp

  const restart = () => { setSeed((x) => x + 1); setI(0); setBossHp(maxHp); setHp(PLAYER_HP); setOver(null); setAnswered(false); setRight(0) }
  const onDone = (ok: boolean) => {
    setAnswered(true)
    if (ok) {
      setHit((h) => h + 1); setRight((n) => n + 1)
      const nb = bossHp - 1
      setBossHp(nb)
      if (nb <= 0) { setOver('won'); bossResult(r.id, 1, true) }
    } else {
      const nh = hp - 1
      setHp(nh)
      if (nh <= 0) { setOver('lost'); bossResult(r.id, (maxHp - bossHp) / maxHp, false) }
    }
  }
  const next = () => {
    if (i + 1 >= queue.length) { setOver(bossHp <= 0 ? 'won' : 'lost'); if (bossHp > 0) bossResult(r.id, (maxHp - bossHp) / maxHp, false); return }
    setI(i + 1); setAnswered(false)
  }
  const phase = bossHp > maxHp * 0.66 ? 1 : bossHp > maxHp * 0.33 ? 2 : 3

  return (
    <div className="page narrow">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><a href={`#/realm/${r.id}`}>Realm {r.n}</a><span>›</span><span>Boss battle</span></div>
      <div className="boss-arena" style={{ marginTop: 10 }}>
        <div className="boss-top" style={{ borderColor: r.color }}>
          <div className="fighter you">
            <div className="nm">You {s.name ? `(${s.name})` : ''}</div>
            <div className="hp"><i style={{ width: `${(100 * hp) / PLAYER_HP}%` }} /></div>
            <div className="small muted">{'🛡️'.repeat(Math.max(0, hp))}{'▫️'.repeat(PLAYER_HP - Math.max(0, hp))} integrity</div>
          </div>
          <div className={'boss-face' + (hit ? ' hit' : '')} key={hit}>{over === 'won' ? '💥' : '💀'}</div>
          <div className="fighter" style={{ textAlign: 'right' }}>
            <div className="nm">{r.boss.name}</div>
            <div className="hp"><i style={{ width: `${(100 * Math.max(0, bossHp)) / maxHp}%`, marginLeft: 'auto' }} /></div>
            <div className="small muted">Phase {phase}/3 · {Math.max(0, bossHp)}/{maxHp} HP</div>
          </div>
        </div>
        {!over && <div className="small muted" style={{ textAlign: 'center' }}><i>“{r.boss.taunt}”</i> Each correct answer deals 1 damage. Each mistake costs you a shield. No second tries in a boss fight.</div>}

        {over ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>{over === 'won' ? '👑' : '🪦'}</div>
            <h2 style={{ fontFamily: 'var(--f-display)' }}>{over === 'won' ? `${r.boss.name} defeated!` : 'Your shields collapsed.'}</h2>
            <p>{over === 'won' ? `Realm ${r.n} is secured. ${right} hits landed.` : `You dealt ${maxHp - Math.max(0, bossHp)} of ${maxHp} damage. Review the realm and try again.`}</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn primary" onClick={restart}>{over === 'won' ? 'Fight again' : 'Retry'}</button>
              <a className="btn" href={`#/realm/${r.id}`}>Realm hub</a>
              {over === 'lost' && <a className="btn" href={`#/codex/${r.id}`}>Read the codex</a>}
            </div>
          </div>
        ) : queue[i] ? (
          <>
            <QuestionCard key={queue[i].id + seed} q={queue[i]} attempts={1} label={`Phase ${phase} attack`} onDone={onDone} />
            <div className="row"><span className="spacer" /><button className="btn primary" disabled={!answered} onClick={next}>Next attack →</button></div>
          </>
        ) : <div className="empty">This boss has no questions yet.</div>}
      </div>
    </div>
  )
}
