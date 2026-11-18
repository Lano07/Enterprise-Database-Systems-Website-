import { REALMS } from '../content/realms'
import { CONTENT, ALL_LESSONS, ALL_SQL } from '../content'
import { levelOf, mastery, titleOf, topicKey, useSave, TITLES } from '../game/store'
import { realmProgress, topicName } from '../game/progress'
import { BADGES } from '../game/badges'

export function Progress() {
  const s = useSave()
  const lv = levelOf(s.xp)
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-CA'))
  const maxQ = Math.max(1, ...days.map((d) => s.activity[d]?.q || 0))
  const totalQ = Object.values(s.attempts).reduce((a, b) => a + b.n, 0)
  const totalR = Object.values(s.attempts).reduce((a, b) => a + b.right, 0)
  return (
    <div className="page">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><span>Progress</span></div>
      <h1 className="title">Your progress</h1>
      <div className="grid g3">
        <div className="card"><div className="muted small">Level</div><div style={{ fontFamily: 'var(--f-display)', fontSize: '1.4rem' }}>{lv.level}</div><div className="small">{titleOf(lv.level)}</div></div>
        <div className="card"><div className="muted small">Schema XP</div><div style={{ fontFamily: 'var(--f-display)', fontSize: '1.4rem' }}>{s.xp}</div><div className="small">{lv.need - lv.into} to next level</div></div>
        <div className="card"><div className="muted small">Lessons</div><div style={{ fontFamily: 'var(--f-display)', fontSize: '1.4rem' }}>{Object.keys(s.lessons).length}/{ALL_LESSONS.length}</div><div className="small">SQL quests {Object.keys(s.sql).length}/{ALL_SQL.length}</div></div>
        <div className="card"><div className="muted small">Accuracy</div><div style={{ fontFamily: 'var(--f-display)', fontSize: '1.4rem' }}>{totalQ ? Math.round((100 * totalR) / totalQ) : 0}%</div><div className="small">{totalQ} answers · best combo {s.bestCombo}</div></div>
      </div>

      <div className="sec-h"><h2>Activity, last 30 days</h2><span className="muted small">streak {s.streak.days} day{s.streak.days === 1 ? '' : 's'}</span></div>
      <div className="card">
        <svg viewBox="0 0 300 70" style={{ width: '100%', height: 90 }} role="img" aria-label="Questions answered per day">
          {days.map((d, i) => {
            const a = s.activity[d]
            const h = a ? (56 * a.q) / maxQ : 0
            return <g key={d}><rect x={i * 10 + 1} y={60 - h} width={8} height={Math.max(h, 0.5)} rx={1.5} fill={a?.q ? 'var(--accent)' : 'var(--line)'}><title>{d}: {a?.q || 0} answered, {a?.r || 0} right, {a?.xp || 0} XP</title></rect></g>
          })}
          <text x="0" y="69" fontSize="6" fill="var(--muted)">{days[0]}</text><text x="300" y="69" fontSize="6" textAnchor="end" fill="var(--muted)">today</text>
        </svg>
      </div>

      <div className="sec-h"><h2>Mastery matrix</h2><span className="muted small">green ≥ 90% · amber ≥ 60% · red &lt; 60% (retention decays with time)</span></div>
      {REALMS.filter((r) => CONTENT[r.id].questions.length).map((r) => {
        const p = realmProgress(r.id, s)
        const topics = [...new Set(CONTENT[r.id].questions.map((q) => q.topic))]
        return (
          <div key={r.id} style={{ marginBottom: 12 }}>
            <div className="row small" style={{ marginBottom: 4 }}><b style={{ color: r.color }}>R{r.n} {r.title}</b><span className="muted">{p.done}/{p.total} lessons · {p.right}/{p.qTotal} challenges solved{p.boss?.beaten ? ' · 👑' : ''}</span></div>
            <div className="heat">
              {topics.map((t) => {
                const m = mastery(topicKey(r.id, t), s)
                const v = m?.retention ?? 0
                return (
                  <a key={t} href={`#/practice?realm=${r.id}&topic=${t}`} style={{ background: !m ? 'var(--surface)' : v >= 0.9 ? 'var(--ok-soft)' : v >= 0.6 ? 'var(--warn-soft)' : 'var(--bad-soft)', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', fontSize: '.8rem', color: 'inherit', textDecoration: 'none' }}>
                    <b style={{ display: 'block' }}>{topicName(t)}</b>{m ? `${Math.round(m.acc * 100)}% acc · ${Math.round(v * 100)}% retained` : '—'}
                  </a>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="sec-h"><h2>Badges</h2><span className="muted small">{Object.keys(s.badges).length}/{BADGES.length}</span></div>
      <div className="badge-grid">
        {BADGES.map((b) => <div key={b.id} className={'badge' + (s.badges[b.id] ? '' : ' off')}><span className="bi">{b.icon}</span><div><b>{b.name}</b><span>{b.desc}</span></div></div>)}
      </div>

      <div className="sec-h"><h2>Career ladder</h2></div>
      <div className="row">{TITLES.map(([l, t]) => <span key={l} className={'tag' + (lv.level >= l ? ' acc' : '')}>L{l} {t}</span>)}</div>
    </div>
  )
}
