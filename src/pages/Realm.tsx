import { REALMS, realmById } from '../content/realms'
import { CONTENT } from '../content'
import type { RealmId } from '../content/types'
import { mastery, topicKey, useSave } from '../game/store'
import { bossReady, isUnlocked, realmProgress, topicName } from '../game/progress'
import { TOOL_META } from '../tools/registry'

export function LearnIndex() {
  const s = useSave()
  return (
    <div className="page">
      <div className="title">All realms and lessons</div>
      <p className="lede">Every lesson comes from a COMP2605 lecture module. Clear a lesson by reading it and passing its in-line challenges. Clearing half a realm unlocks the next realm{s.settings.freeRoam ? ' (Free Roam is on, so everything is open)' : ''}.</p>
      {REALMS.map((r) => {
        const c = CONTENT[r.id]
        const open = isUnlocked(r.id, s)
        const p = realmProgress(r.id, s)
        return (
          <section key={r.id} style={{ marginBottom: 22 }}>
            <div className="sec-h">
              <h2><span style={{ color: r.color }}>Realm {r.n}</span> · {r.title} {open ? '' : '🔒'}</h2>
              <span className="muted small">{p.done}/{p.total} cleared · <a href={`#/realm/${r.id}`}>realm hub</a></span>
            </div>
            <div className="quest-list">
              {c.lessons.map((l, i) => (
                <a key={l.id} className="quest" href={open ? `#/lesson/${l.id}` : `#/realm/${r.id}`} style={open ? undefined : { opacity: 0.6 }}>
                  <span className="qi">{s.lessons[l.id] ? '✅' : open ? i + 1 : '🔒'}</span>
                  <span className="qt"><b>{l.title}</b><span>{l.mins} min · {l.src[0]}</span></span>
                </a>
              ))}
              {!c.lessons.length && <div className="empty">Lessons for this realm are being written.</div>}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function RealmPage({ id }: { id: string }) {
  const s = useSave()
  const r = realmById(id)
  if (!r) return <div className="page">Unknown realm. <a href="#/">Back to the map</a>.</div>
  const c = CONTENT[r.id as RealmId]
  const open = isUnlocked(r.id, s)
  const p = realmProgress(r.id, s)
  const topics = [...new Set(c.questions.map((q) => q.topic))]
  const prev = REALMS[r.n - 2]
  return (
    <div className="page">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><span>Realm {r.n}</span></div>
      <div className="row" style={{ marginTop: 6 }}>
        <span style={{ fontSize: '2rem' }}>{r.icon}</span>
        <div><div className="title" style={{ color: r.color }}>Realm {r.n}: {r.title}</div><div className="muted small">From lecture module {r.source}</div></div>
      </div>
      <aside className="call call-story"><div className="call-t">Mission briefing</div><p>{r.story}</p></aside>
      <p className="lede">{r.blurb}</p>

      {!open && (
        <div className="maint">
          <span style={{ fontSize: '1.4rem' }}>🔒</span>
          <div style={{ flex: 1 }}>This realm unlocks when you clear half of <b>Realm {prev?.n}: {prev?.title}</b> or defeat its boss. Revising for an exam? Turn on <a href="#/settings">Free Roam</a> to open everything.</div>
          {prev && <a className="btn" href={`#/realm/${prev.id}`}>Go to Realm {prev.n}</a>}
        </div>
      )}

      <div className="sec-h"><h2>Story Quests</h2><span className="muted small">{p.done}/{p.total} cleared</span></div>
      <div className="quest-list">
        {c.lessons.map((l, i) => (
          <a key={l.id} className="quest" href={open ? `#/lesson/${l.id}` : undefined} aria-disabled={!open} style={open ? undefined : { opacity: 0.55, pointerEvents: 'none' }}>
            <span className="qi">{s.lessons[l.id] ? '✅' : i + 1}</span>
            <span className="qt"><b>{l.title}</b><span>{l.mins} min</span></span>
          </a>
        ))}
      </div>

      <div className="sec-h"><h2>Train &amp; fight</h2></div>
      <div className="grid g3">
        <a className="card" href={`#/practice?realm=${r.id}`}><h3>🎯 Quest board</h3><p>{c.questions.length} auto-graded challenges with combos and spaced repetition.</p></a>
        {(c.sql || []).length > 0 && <a className="card" href={`#/arena?realm=${r.id}`}><h3>⌨️ SQL quests</h3><p>{p.sqlDone}/{p.sqlTotal} accepted. Real queries, graded against reference results.</p></a>}
        {r.tools.filter((t) => TOOL_META[t]).map((t) => (
          <a key={t} className="card" href={TOOL_META[t].href}><h3>{TOOL_META[t].icon} {TOOL_META[t].name}</h3><p>{TOOL_META[t].desc}</p></a>
        ))}
        <a className="card" href={`#/cards?realm=${r.id}`}><h3>🧠 Flashcards</h3><p>{c.cards.length} cards with Leitner-box spaced repetition.</p></a>
        <a className="card" href={`#/written?realm=${r.id}`}><h3>✍️ Written answers</h3><p>{c.written.length} exam-style long answers with model answers and marking points.</p></a>
        <a className="card" href={`#/codex/${r.id}`}><h3>📜 Revision codex</h3><p>A one-page cheat sheet for this realm. Printable.</p></a>
      </div>

      <div className="sec-h"><h2>Realm boss</h2></div>
      <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', borderColor: r.color }}>
        <div style={{ fontSize: '2.6rem' }}>{p.boss?.beaten ? '👑' : '💀'}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3>{r.boss.name}</h3>
          <p style={{ margin: 0 }}>{r.boss.title}. <i>“{r.boss.taunt}”</i></p>
          <div className="small muted">{p.boss ? `Best: ${Math.round(p.boss.best * 100)}%` : 'Not yet challenged'} · a multi-stage, exam-style battle drawn from the whole realm</div>
        </div>
        {bossReady(r.id, s) && open ? <a className="btn primary" href={`#/boss/${r.id}`}>⚔️ Fight</a> : <span className="tag">Clear 60% of the lessons to challenge</span>}
      </div>

      {topics.length > 0 && (
        <>
          <div className="sec-h"><h2>Mastery</h2><span className="muted small">recency-weighted accuracy, decays if you stop practising</span></div>
          <div className="heat">
            {topics.map((t) => {
              const m = mastery(topicKey(r.id, t), s)
              const v = m ? m.retention : 0
              const bg = !m ? 'var(--surface)' : v >= 0.9 ? 'var(--ok-soft)' : v >= 0.6 ? 'var(--warn-soft)' : 'var(--bad-soft)'
              return (
                <a key={t} href={`#/practice?realm=${r.id}&topic=${t}`} style={{ background: bg, textDecoration: 'none', color: 'inherit', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', fontSize: '.82rem' }}>
                  <b style={{ display: 'block' }}>{topicName(t)}</b>{m ? `${Math.round(m.acc * 100)}% · ${m.n} tries` : 'not started'}
                </a>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
