// Player save profile: local-first, stored in localStorage (wrapped in try/catch so a
// private window or blocked storage still gives a working, if forgetful, game).
import { useSyncExternalStore } from 'react'
import { BADGES } from './badges'

export interface Attempt { n: number; right: number; last: number; box: number; due: number }
export interface TopicHit { t: number; ok: boolean }

export interface Save {
  v: 1
  name: string
  xp: number
  mana: number
  manaAt: number
  combo: number
  bestCombo: number
  streak: { days: number; last: string }
  shields: { entity: number; ref: number }
  lessons: Record<string, number>
  attempts: Record<string, Attempt>
  topics: Record<string, TopicHit[]>
  cards: Record<string, { box: number; due: number }>
  sql: Record<string, number>
  bosses: Record<string, { best: number; beaten?: number }>
  exams: { date: number; title: string; score: number; max: number }[]
  bounty: { best: number; runs: number }
  badges: Record<string, number>
  tools: Record<string, number>
  written: Record<string, { got: number; max: number; t: number }>
  activity: Record<string, { q: number; r: number; xp: number }>
  settings: { freeRoam: boolean; theme: 'auto' | 'light' | 'dark'; motion: boolean; examDate: string }
}

const KEY = 'dbquest.save.v1'
export const MANA_MAX = 100
const MANA_REGEN_MS = 2 * 60 * 1000
const DAY = 86400000
/** Leitner intervals in days for boxes 0..6. */
const BOX_DAYS = [0, 1, 2, 4, 8, 16, 32]

function fresh(): Save {
  return {
    v: 1, name: '', xp: 0, mana: MANA_MAX, manaAt: Date.now(), combo: 0, bestCombo: 0,
    streak: { days: 0, last: '' }, shields: { entity: 100, ref: 100 },
    lessons: {}, attempts: {}, topics: {}, cards: {}, sql: {}, bosses: {}, exams: [],
    bounty: { best: 0, runs: 0 }, badges: {}, tools: {}, written: {}, activity: {},
    settings: { freeRoam: false, theme: 'auto', motion: true, examDate: '' },
  }
}

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      const f = fresh()
      return { ...f, ...s, settings: { ...f.settings, ...(s.settings || {}) }, shields: { ...f.shields, ...(s.shields || {}) } }
    }
  } catch { /* storage unavailable */ }
  return fresh()
}

let state: Save = load()
const subs = new Set<() => void>()

function commit(next: Save) {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  subs.forEach((f) => f())
}
function mutate(fn: (s: Save) => void) {
  const s: Save = structuredClone(state)
  fn(s)
  commit(s)
}

export function useSave(): Save {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state)
}
export const getSave = () => state

// ---------- events (toasts, level-ups, shield breaches) ----------
export type GameEvent =
  | { type: 'xp'; amount: number; reason: string }
  | { type: 'level'; level: number; title: string }
  | { type: 'badge'; id: string }
  | { type: 'breach'; kind: 'entity' | 'ref'; detail: string }
  | { type: 'toast'; text: string; tone?: 'ok' | 'bad' | 'info' }
const listeners = new Set<(e: GameEvent) => void>()
export function onGame(fn: (e: GameEvent) => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export function emit(e: GameEvent) { listeners.forEach((f) => f(e)) }

// ---------- levels ----------
export const TITLES: [number, string][] = [
  [1, 'Junior Data Apprentice'], [3, 'Data Clerk'], [5, 'Schema Scout'], [7, 'Query Artisan'],
  [9, 'Normalization Knight'], [11, 'Index Engineer'], [13, 'Transaction Guardian'],
  [15, 'Database Architect'], [18, 'Senior Data Architect'], [21, 'Principal Enterprise Data Architect'],
]
/** XP needed to go from level L to L+1. */
const need = (L: number) => 100 + 60 * (L - 1)
export function levelOf(xp: number) {
  let L = 1
  let rest = xp
  while (rest >= need(L)) { rest -= need(L); L++ }
  return { level: L, into: rest, need: need(L) }
}
export function titleOf(level: number) {
  let t = TITLES[0][1]
  for (const [l, name] of TITLES) if (level >= l) t = name
  return t
}

const today = () => new Date().toLocaleDateString('en-CA')

function touchDay(s: Save, dq = 0, dr = 0, dxp = 0) {
  const d = today()
  const a = s.activity[d] || { q: 0, r: 0, xp: 0 }
  s.activity[d] = { q: a.q + dq, r: a.r + dr, xp: a.xp + dxp }
  if (s.streak.last !== d) {
    const y = new Date(Date.now() - DAY).toLocaleDateString('en-CA')
    s.streak = { days: s.streak.last === y ? s.streak.days + 1 : 1, last: d }
  }
}

export function gainXP(amount: number, reason: string) {
  if (amount <= 0) return
  const before = levelOf(state.xp).level
  mutate((s) => { s.xp += amount; touchDay(s, 0, 0, amount) })
  emit({ type: 'xp', amount, reason })
  const after = levelOf(state.xp).level
  if (after > before) emit({ type: 'level', level: after, title: titleOf(after) })
  checkBadges()
}

// ---------- mana ----------
export function manaNow(s: Save = state) {
  const regen = Math.floor((Date.now() - s.manaAt) / MANA_REGEN_MS)
  return Math.min(MANA_MAX, s.mana + regen)
}
function settleMana(s: Save) {
  const m = manaNow(s)
  const used = Math.floor((Date.now() - s.manaAt) / MANA_REGEN_MS)
  s.mana = m
  s.manaAt = m >= MANA_MAX ? Date.now() : s.manaAt + used * MANA_REGEN_MS
}
/** Spend mana for a hint. Returns false (and spends nothing) if there is not enough. */
export function spendMana(n: number): boolean {
  if (manaNow() < n) { emit({ type: 'toast', text: `Not enough Query Mana (need ${n}). It refills over time and with correct answers.`, tone: 'bad' }); return false }
  mutate((s) => { settleMana(s); s.mana -= n })
  return true
}

// ---------- answering ----------
export function topicKey(realm: string, topic: string) { return realm + ':' + topic }

/**
 * Record an answer. First-try correct answers build the combo multiplier.
 * Returns the XP awarded.
 */
export function recordAnswer(qid: string, realm: string, topic: string, correct: boolean, opts: { firstTry?: boolean; base?: number; silent?: boolean } = {}) {
  const firstTry = opts.firstTry ?? true
  const base = opts.base ?? 10
  let xp = 0
  mutate((s) => {
    const a = s.attempts[qid] || { n: 0, right: 0, last: 0, box: 0, due: 0 }
    a.n++
    a.last = Date.now()
    if (correct) {
      a.right++
      a.box = Math.min(BOX_DAYS.length - 1, firstTry ? a.box + 1 : Math.max(1, a.box))
    } else a.box = 0
    a.due = Date.now() + BOX_DAYS[a.box] * DAY
    s.attempts[qid] = a
    const k = topicKey(realm, topic)
    s.topics[k] = [...(s.topics[k] || []), { t: Date.now(), ok: correct }].slice(-20)
    if (correct && firstTry) {
      s.combo++
      s.bestCombo = Math.max(s.bestCombo, s.combo)
    } else if (!correct) s.combo = 0
    const mult = comboMult(s.combo)
    xp = correct ? Math.round(base * (firstTry ? mult : 0.5)) : 0
    if (correct) { settleMana(s); s.mana = Math.min(MANA_MAX, s.mana + 3) }
    touchDay(s, 1, correct ? 1 : 0, 0)
  })
  if (xp) gainXP(xp, opts.silent ? '' : state.combo >= 3 ? `Combo ×${comboMult(state.combo).toFixed(1)}` : 'Correct')
  else checkBadges()
  return xp
}
export function comboMult(combo: number) { return Math.min(3, 1 + Math.floor(combo / 3) * 0.5) }

// ---------- integrity shields ----------
export function breach(kind: 'entity' | 'ref', detail: string) {
  mutate((s) => { s.shields[kind] = Math.max(0, s.shields[kind] - 25); s.combo = 0; s.badges['breach'] ??= Date.now() })
  emit({ type: 'breach', kind, detail })
}
export function recharge(n = 10) {
  mutate((s) => { s.shields.entity = Math.min(100, s.shields.entity + n); s.shields.ref = Math.min(100, s.shields.ref + n) })
}

// ---------- progress ----------
export function completeLesson(id: string) {
  if (state.lessons[id]) return
  mutate((s) => { s.lessons[id] = Date.now(); touchDay(s) })
  gainXP(50, 'Lesson cleared')
}
export function solveSql(id: string, d: number) {
  const first = !state.sql[id]
  mutate((s) => { s.sql[id] ??= Date.now() })
  recharge(15)
  if (first) gainXP(20 + 15 * d, 'Query accepted')
}
export function toolLevel(id: string, level: number, xp = 40) {
  const prev = state.tools[id] || 0
  if (level <= prev) return
  mutate((s) => { s.tools[id] = level })
  gainXP(xp, 'Simulator stage cleared')
}
export function bossResult(realm: string, pct: number, won: boolean) {
  const firstWin = won && !state.bosses[realm]?.beaten
  mutate((s) => {
    const b = s.bosses[realm] || { best: 0 }
    b.best = Math.max(b.best, pct)
    if (won) b.beaten ??= Date.now()
    s.bosses[realm] = b
  })
  if (firstWin) gainXP(300, 'Realm boss defeated')
  checkBadges()
}
export function examResult(title: string, score: number, max: number) {
  mutate((s) => { s.exams = [{ date: Date.now(), title, score, max }, ...s.exams].slice(0, 30) })
  gainXP(Math.round(150 * score / Math.max(1, max)), 'Exam completed')
}
export function bountyResult(score: number) {
  mutate((s) => { s.bounty = { best: Math.max(s.bounty.best, score), runs: s.bounty.runs + 1 } })
  gainXP(score * 5, 'Bug bounty paid out')
}
export function cardReview(id: string, ok: boolean) {
  mutate((s) => {
    const c = s.cards[id] || { box: 0, due: 0 }
    c.box = ok ? Math.min(BOX_DAYS.length - 1, c.box + 1) : 0
    c.due = Date.now() + BOX_DAYS[c.box] * DAY
    s.cards[id] = c
    touchDay(s)
  })
  if (ok) gainXP(2, '')
}
export function markWritten(id: string, got: number, max: number) {
  mutate((s) => { s.written[id] = { got, max, t: Date.now() } })
  gainXP(Math.round(5 * got), 'Written answer marked')
}
export function setSettings(p: Partial<Save['settings']>) { mutate((s) => { s.settings = { ...s.settings, ...p } }) }
export function setName(name: string) { mutate((s) => { s.name = name.slice(0, 40) }) }
export function awardBadge(id: string) {
  if (state.badges[id]) return
  mutate((s) => { s.badges[id] = Date.now() })
  emit({ type: 'badge', id })
}

// ---------- mastery & spaced repetition ----------
/** Recency-weighted accuracy for a topic, decayed by time since last practice (half-life 14 days). */
export function mastery(key: string, s: Save = state) {
  const hits = s.topics[key]
  if (!hits || !hits.length) return null
  let w = 0, tot = 0
  hits.forEach((h, i) => { const wt = 1 + i / hits.length; tot += wt; if (h.ok) w += wt })
  const acc = w / tot
  const days = (Date.now() - hits[hits.length - 1].t) / DAY
  const retention = acc * Math.pow(0.5, days / 14)
  return { acc, retention, n: hits.length, days }
}
export function dueQuestionIds(s: Save = state) {
  const now = Date.now()
  return Object.entries(s.attempts).filter(([, a]) => a.due <= now).sort((a, b) => a[1].due - b[1].due).map(([id]) => id)
}

// ---------- backups ----------
export function exportSave() { return JSON.stringify(state, null, 2) }
export function importSave(json: string) {
  const s = JSON.parse(json)
  if (!s || s.v !== 1 || typeof s.xp !== 'number') throw new Error('This file is not a DBQuest save.')
  commit({ ...fresh(), ...s })
}
export function resetSave() { commit(fresh()) }

// ---------- badges ----------
function checkBadges() {
  const s = state
  for (const b of BADGES) if (!s.badges[b.id] && b.test && b.test(s)) awardBadge(b.id)
}
