import { REALMS } from '../content/realms'
import { CONTENT, ALL_LESSONS, ALL_QUESTIONS, ALL_CARDS } from '../content'
import type { RealmId } from '../content/types'
import { dueQuestionIds, mastery, topicKey, type Save } from './store'

export function realmProgress(id: RealmId, s: Save) {
  const c = CONTENT[id]
  const done = c.lessons.filter((l) => s.lessons[l.id]).length
  const qs = c.questions
  const tried = qs.filter((q) => s.attempts[q.id]).length
  const right = qs.filter((q) => s.attempts[q.id]?.right).length
  return {
    done, total: c.lessons.length, pct: c.lessons.length ? done / c.lessons.length : 0,
    tried, right, qTotal: qs.length,
    sqlDone: (c.sql || []).filter((x) => s.sql[x.id]).length, sqlTotal: (c.sql || []).length,
    boss: s.bosses[id],
  }
}

/** Realm n unlocks when realm n-1 is half cleared or its boss is beaten (or Free Roam is on). */
export function isUnlocked(id: RealmId, s: Save) {
  if (s.settings.freeRoam) return true
  const i = REALMS.findIndex((r) => r.id === id)
  if (i <= 0) return true
  const prev = REALMS[i - 1].id
  const p = realmProgress(prev, s)
  return p.pct >= 0.5 || !!s.bosses[prev]?.beaten
}

export function bossReady(id: RealmId, s: Save) {
  const p = realmProgress(id, s)
  return s.settings.freeRoam || p.pct >= 0.6
}

/** Topics whose retention has decayed: they need "Database Maintenance". */
export function maintenanceTopics(s: Save) {
  const out: { realm: RealmId; topic: string; retention: number }[] = []
  for (const r of REALMS) {
    const topics = new Set(CONTENT[r.id].questions.map((q) => q.topic))
    topics.forEach((t) => {
      const m = mastery(topicKey(r.id, t), s)
      if (m && m.n >= 3 && m.retention < 0.6) out.push({ realm: r.id, topic: t, retention: m.retention })
    })
  }
  return out.sort((a, b) => a.retention - b.retention)
}

export function weakTopics(s: Save, threshold = 0.9) {
  const out: { realm: RealmId; topic: string; acc: number; n: number }[] = []
  for (const r of REALMS) {
    const topics = new Set(CONTENT[r.id].questions.map((q) => q.topic))
    topics.forEach((t) => {
      const m = mastery(topicKey(r.id, t), s)
      if (m && m.acc < threshold) out.push({ realm: r.id, topic: t, acc: m.acc, n: m.n })
    })
  }
  return out.sort((a, b) => a.acc - b.acc)
}

export function nextLesson(s: Save) {
  return ALL_LESSONS.find((l) => !s.lessons[l.id] && isUnlocked(l.realm, s))
}

export function dueCounts(s: Save) {
  const now = Date.now()
  const known = new Set(ALL_QUESTIONS.map((q) => q.id))
  return {
    questions: dueQuestionIds(s).filter((id) => known.has(id)).length,
    cards: ALL_CARDS.filter((c) => s.cards[c.id] && s.cards[c.id].due <= now).length,
    newCards: ALL_CARDS.filter((c) => !s.cards[c.id]).length,
  }
}

const TOPIC_NAMES: Record<string, string> = Object.assign({}, ...REALMS.map((r) => CONTENT[r.id].topics || {}))
export const topicName = (t: string) => TOPIC_NAMES[t] || t.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
