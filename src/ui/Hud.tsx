import { useEffect, useState } from 'react'
import { comboMult, levelOf, manaNow, MANA_MAX, onGame, titleOf, useSave, type GameEvent } from '../game/store'
import { BADGES } from '../game/badges'

export function Hud() {
  const s = useSave()
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t) }, [])
  const lv = levelOf(s.xp)
  const mana = manaNow(s)
  return (
    <div className="hud" role="status" aria-label="Player status">
      <div className="hud-in">
        <div className="hud-lv" title={`${s.xp} XP total`}>
          <b>LV {lv.level}</b>
          <span className="t">{titleOf(lv.level)}</span>
          <div className="meter" aria-label={`Schema XP ${lv.into} of ${lv.need}`}><i style={{ width: `${(100 * lv.into) / lv.need}%` }} /></div>
          <span className="muted mono" style={{ fontSize: '.72rem' }}>{lv.into}/{lv.need}</span>
        </div>
        <span className="chip" title="Query Mana pays for hints. Refills 1 every 2 minutes and +3 per correct answer.">💧<div className="meter mana"><i style={{ width: `${(100 * mana) / MANA_MAX}%` }} /></div><b>{mana}</b></span>
        <span className={'chip' + (s.combo >= 3 ? ' combo-hot' : '')} title="Consecutive first-try correct answers. Every 3 adds +0.5× XP (max 3×).">🔥 <b>{s.combo}</b>{s.combo >= 3 && <span>×{comboMult(s.combo).toFixed(1)}</span>}</span>
        <span className="chip hide-s" title="Days in a row with study activity">📅 <b>{s.streak.days}</b>d</span>
        <span className="shield-set">
          <span className="chip" title="Entity Integrity Shield: drops when you violate primary key uniqueness or NOT NULL.">🛡️E<div className={'meter ent' + (s.shields.entity < 40 ? ' low' : '')}><i style={{ width: s.shields.entity + '%' }} /></div></span>
          <span className="chip" title="Referential Integrity Shield: drops when a foreign key points at nothing.">🔗R<div className={'meter ref' + (s.shields.ref < 40 ? ' low' : '')}><i style={{ width: s.shields.ref + '%' }} /></div></span>
        </span>
      </div>
    </div>
  )
}

interface Toast { id: number; text: string; tone: string }

export function Overlays() {
  const s = useSave()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [level, setLevel] = useState<{ level: number; title: string } | null>(null)
  const [flash, setFlash] = useState(0)
  const [conf, setConf] = useState(0)
  useEffect(() => onGame((e: GameEvent) => {
    const push = (text: string, tone: string, ms = 3200) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t.slice(-3), { id, text, tone }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms)
    }
    if (e.type === 'xp' && e.reason) floatXP(e.amount, e.reason)
    if (e.type === 'level') { setLevel({ level: e.level, title: e.title }); setConf((c) => c + 1) }
    if (e.type === 'badge') { const b = BADGES.find((x) => x.id === e.id); if (b) push(`${b.icon} Badge unlocked: ${b.name}. ${b.desc}`, 'badge', 5000); setConf((c) => c + 1) }
    if (e.type === 'breach') { setFlash((f) => f + 1); push(`${e.kind === 'entity' ? '🛡️ Entity' : '🔗 Referential'} Integrity Shield breached! ${e.detail}`, 'bad', 7000) }
    if (e.type === 'toast') push(e.text, e.tone || 'info')
  }), [])
  return (
    <>
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={'toast ' + t.tone}>{t.text}</div>)}</div>
      {flash > 0 && <div key={flash} className="breach-flash" />}
      {conf > 0 && s.settings.motion && <Confetti key={conf} />}
      {level && (
        <div className="modal-bg" onClick={() => setLevel(null)}>
          <div className="modal" role="dialog" aria-label="Level up" onClick={(e) => e.stopPropagation()}>
            <div className="big">⬆️</div>
            <h2>Level {level.level}!</h2>
            <p>You are now a <b>{level.title}</b>.</p>
            <p className="muted small">Keep clearing quests to rise toward Principal Enterprise Data Architect.</p>
            <button className="btn primary" onClick={() => setLevel(null)} autoFocus>Continue</button>
          </div>
        </div>
      )}
    </>
  )
}

function floatXP(amount: number, reason: string) {
  const el = document.createElement('div')
  el.className = 'xp-float'
  el.textContent = `+${amount} XP${reason && reason !== 'Correct' ? ' · ' + reason : ''}`
  el.style.left = Math.max(12, Math.min(window.innerWidth - 220, window.innerWidth / 2 - 60)) + 'px'
  el.style.top = window.innerHeight * 0.32 + 'px'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1200)
}

function Confetti() {
  const colors = ['#2253c4', '#7b3fb3', '#1b8553', '#f3bf3f', '#c23b37', '#0b6f8c']
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 40 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 10) * 0.05}s`, animationDuration: `${1.2 + (i % 5) * 0.2}s` }} />
      ))}
    </div>
  )
}
