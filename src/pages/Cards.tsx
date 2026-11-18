import { useMemo, useState } from 'react'
import { ALL_CARDS } from '../content'
import { REALMS, realmById } from '../content/realms'
import { cardReview, getSave, useSave } from '../game/store'
import { inline } from '../engine/md'

export function Cards({ realm }: { realm?: string }) {
  const s = useSave()
  const [r, setR] = useState(realm || '')
  const [round, setRound] = useState(0)
  const deck = useMemo(() => {
    const sv = getSave()
    const now = Date.now()
    const pool = ALL_CARDS.filter((c) => !r || c.realm === r)
    const due = pool.filter((c) => sv.cards[c.id] && sv.cards[c.id].due <= now)
    const fresh = pool.filter((c) => !sv.cards[c.id]).slice(0, 12)
    return [...due, ...fresh].sort(() => Math.random() - 0.5).slice(0, 20)
  }, [r, round])
  const [i, setI] = useState(0)
  const [flip, setFlip] = useState(false)
  const card = deck[i]
  const pool = ALL_CARDS.filter((c) => !r || c.realm === r)
  const boxes = [0, 1, 2, 3, 4, 5, 6].map((b) => pool.filter((c) => (s.cards[c.id]?.box ?? -1) === b).length)
  const answer = (ok: boolean) => { cardReview(card.id, ok); setFlip(false); setI(i + 1) }

  return (
    <div className="page narrow">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><span>Flashcards</span></div>
      <h1 className="title">🧠 Flashcards</h1>
      <p className="lede">Leitner boxes: a card you know moves up a box and comes back later (1, 2, 4, 8, 16, 32 days); a card you miss drops to box 0 and comes back today.</p>
      <div className="row" style={{ marginBottom: 12 }}>
        <select value={r} onChange={(e) => { setR(e.target.value); setI(0); setRound((x) => x + 1) }} aria-label="Deck">
          <option value="">All realms</option>
          {REALMS.filter((x) => ALL_CARDS.some((c) => c.realm === x.id)).map((x) => <option key={x.id} value={x.id}>Realm {x.n}: {x.short}</option>)}
        </select>
        <span className="small muted">New: {pool.filter((c) => !s.cards[c.id]).length} · {boxes.map((n, b) => `box ${b}: ${n}`).join(' · ')}</span>
      </div>
      {card ? (
        <div className="cards-stage">
          <div className="small muted" style={{ marginBottom: 8 }}>Card {i + 1} of {deck.length} · {realmById(card.realm)?.short} · {s.cards[card.id] ? `box ${s.cards[card.id].box}` : 'new'}</div>
          <button className="flash" onClick={() => setFlip(!flip)} aria-label="Flip card">
            {!flip ? <div className="f">{inline(card.front)}</div> : <div><div className="small muted" style={{ marginBottom: 6 }}>{card.front}</div><div className="b">{inline(card.back)}</div></div>}
          </button>
          <div className="row" style={{ marginTop: 12, justifyContent: 'center' }}>
            {!flip ? <button className="btn primary" onClick={() => setFlip(true)}>Show answer</button> : (
              <><button className="btn danger" onClick={() => answer(false)}>✖ Missed it</button><button className="btn ok" onClick={() => answer(true)}>✔ Knew it</button></>
            )}
          </div>
        </div>
      ) : (
        <div className="empty">Nothing due right now. Well done! <div style={{ marginTop: 10 }}><button className="btn" onClick={() => { setI(0); setRound((x) => x + 1) }}>Check again</button> <a className="btn" href="#/practice">Quest board</a></div></div>
      )}
    </div>
  )
}
