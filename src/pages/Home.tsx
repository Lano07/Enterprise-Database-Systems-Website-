import { REALMS } from '../content/realms'
import { ALL_LESSONS, ALL_QUESTIONS, ALL_SQL } from '../content'
import { levelOf, setName, titleOf, useSave } from '../game/store'
import { bossReady, dueCounts, isUnlocked, maintenanceTopics, nextLesson, realmProgress, topicName, weakTopics } from '../game/progress'
import { realmById } from '../content/realms'
import { useState } from 'react'

export function Home() {
  const s = useSave()
  const lv = levelOf(s.xp)
  const nl = nextLesson(s)
  const due = dueCounts(s)
  const maint = maintenanceTopics(s)
  const weak = weakTopics(s).slice(0, 1)[0]
  const started = Object.keys(s.lessons).length > 0
  const [nm, setNm] = useState('')
  const examDays = s.settings.examDate ? Math.ceil((new Date(s.settings.examDate + 'T09:00').getTime() - Date.now()) / 86400000) : null

  return (
    <div className="page wide">
      <section className="hero">
        <div className="hero-main">
          <svg className="db-art" viewBox="0 0 32 32" aria-hidden><ellipse cx="16" cy="7" rx="11" ry="4" fill="currentColor" /><path d="M5 7v18c0 2.2 4.9 4 11 4s11-1.8 11-4V7c0 2.2-4.9 4-11 4S5 9.2 5 7z" fill="currentColor" /></svg>
          <div className="muted small mono">THE ENTERPRISE RESCUE</div>
          <h1>{s.name ? `Welcome back, ${s.name}.` : started ? 'Welcome back, Architect.' : 'Your first day as a Junior Data Apprentice.'}</h1>
          <p>
            Organisations everywhere are drowning in flat files, redundant copies and update anomalies. Clear ten realms of COMP2605,
            from foundations to NoSQL, defeat each realm boss, and rise to <b>Principal Enterprise Data Architect</b>.
          </p>
          {!s.name && !started && (
            <form className="row" style={{ marginBottom: 12 }} onSubmit={(e) => { e.preventDefault(); if (nm.trim()) setName(nm.trim()) }}>
              <input type="text" placeholder="Your architect name (optional)" value={nm} onChange={(e) => setNm(e.target.value)} aria-label="Your name" />
              <button className="btn" type="submit">Save</button>
            </form>
          )}
          <div className="row">
            {nl ? <a className="btn primary" href={`#/lesson/${nl.id}`}>{started ? 'Continue: ' : 'Start: '}{nl.title}</a> : <a className="btn primary" href="#/exam">All lessons cleared, enter the Exam Arena</a>}
            <a className="btn" href="#/practice">Quest board</a>
            <a className="btn" href="#/arena">SQL sandbox</a>
          </div>
        </div>
        <div className="card" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <div className="row"><b style={{ fontFamily: 'var(--f-display)' }}>Level {lv.level}</b><span className="muted">{titleOf(lv.level)}</span></div>
          <div className="bar"><i style={{ width: `${(100 * lv.into) / lv.need}%`, background: 'var(--xp)' }} /></div>
          <div className="small muted">{lv.need - lv.into} XP to level {lv.level + 1} · {s.xp} XP total · best combo {s.bestCombo}</div>
          {examDays !== null && examDays >= 0 && <div className="tag warn" style={{ justifySelf: 'start' }}>Final exam in {examDays} day{examDays === 1 ? '' : 's'}</div>}
          <div className="quest-list">
            {(due.questions > 0 || due.cards > 0) && (
              <a className="quest" href={due.questions ? '#/practice?due=1' : '#/cards'}>
                <span className="qi">🔁</span><span className="qt"><b>Spaced-repetition reviews due</b><span>{due.questions} question{due.questions === 1 ? '' : 's'} · {due.cards} flashcard{due.cards === 1 ? '' : 's'}</span></span>
              </a>
            )}
            {weak && (
              <a className="quest" href="#/raid">
                <span className="qi">🎯</span><span className="qt"><b>Weakness Raid: {topicName(weak.topic)}</b><span>{Math.round(weak.acc * 100)}% accuracy in {realmById(weak.realm)?.short}. Target: 90%</span></span>
              </a>
            )}
            <a className="quest" href="#/bounty"><span className="qi">🐞</span><span className="qt"><b>Daily Bug Bounty</b><span>60-second time attack · best {s.bounty.best}</span></span></a>
            <a className="quest" href="#/campaigns"><span className="qi">🏢</span><span className="qt"><b>Case-study campaigns</b><span>DreamHome, the Academic DB, LibBook, the sports club and more</span></span></a>
          </div>
        </div>
      </section>

      {maint.length > 0 && (
        <div className="maint" style={{ marginTop: 14 }}>
          <span style={{ fontSize: '1.4rem' }}>🧰</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <b>Database Maintenance required.</b> Your statistics are going stale on {maint.slice(0, 3).map((m) => topicName(m.topic)).join(', ')}{maint.length > 3 ? ` and ${maint.length - 3} more` : ''}.
            Like a DBA updating optimizer statistics, run a quick refresh before retention drops further.
          </div>
          <a className="btn" href={`#/practice?realm=${maint[0].realm}&topic=${maint[0].topic}`}>Run maintenance</a>
        </div>
      )}

      <div className="sec-h">
        <h2>The campaign map</h2>
        <span className="muted small">{ALL_LESSONS.length} lessons · {ALL_QUESTIONS.length} challenges · {ALL_SQL.length} SQL quests · 10 bosses</span>
      </div>
      <div className="map">
        {REALMS.map((r) => {
          const p = realmProgress(r.id, s)
          const open = isUnlocked(r.id, s)
          return (
            <a key={r.id} className={'realm-node' + (open ? '' : ' locked')} href={`#/realm/${r.id}`} style={{ ['--rc' as string]: r.color }}>
              <div className="rn-top">
                <div className="rn-ic">{open ? r.icon : '🔒'}</div>
                <div>
                  <div className="rn-n">REALM {r.n}</div>
                  <h3>{r.title}</h3>
                </div>
              </div>
              <p>{r.story}</p>
              <div className="rn-foot">
                <span>{p.done}/{p.total}</span>
                <div className="bar"><i style={{ width: `${p.pct * 100}%` }} /></div>
                <span className={'boss-chip' + (p.boss?.beaten ? ' won' : '')}>{p.boss?.beaten ? '👑 Boss defeated' : bossReady(r.id, s) && open ? '⚔️ Boss ready' : '💀 ' + r.boss.name}</span>
              </div>
            </a>
          )
        })}
      </div>

      <div className="sec-h"><h2>Four ways to play</h2></div>
      <div className="grid">
        <a className="card" href="#/learn"><h3>📖 Story Quests</h3><p>Short concept briefings, each followed straight away by a challenge. Every SQL example runs live.</p></a>
        <a className="card" href="#/arena"><h3>⌨️ Live Sandbox Arenas</h3><p>Real SQL on DreamHome and EMP/DEPT, plus relational algebra, XML/XPath and JSON playgrounds.</p></a>
        <a className="card" href="#/bounty"><h3>🐞 Bug Bounty Time-Attacks</h3><p>60 seconds, rapid-fire fixes. Anomalies, bad joins, broken locks. How many can you squash?</p></a>
        <a className="card" href="#/exam"><h3>⚔️ Boss Battles &amp; Exam Arena</h3><p>Multi-stage realm bosses, timed mock exams, written answers with marking rubrics, and Weakness Raids.</p></a>
      </div>
    </div>
  )
}
