import type { Card, Lesson, Question, RealmContent, RealmId, SqlChallenge, Term, Written } from './types'
import { REALMS } from './realms'
import r1 from './realms/r1'
import r2 from './realms/r2'
import r3 from './realms/r3'
import r4 from './realms/r4'
import r5 from './realms/r5'
import r6 from './realms/r6'
import r7 from './realms/r7'
import r8 from './realms/r8'
import r9 from './realms/r9'
import r10 from './realms/r10'

export const CONTENT: Record<RealmId, RealmContent> = { r1, r2, r3, r4, r5, r6, r7, r8, r9, r10 }

export const ALL_LESSONS: Lesson[] = REALMS.flatMap((r) => CONTENT[r.id].lessons)
export const ALL_QUESTIONS: Question[] = REALMS.flatMap((r) => CONTENT[r.id].questions)
export const ALL_WRITTEN: Written[] = REALMS.flatMap((r) => CONTENT[r.id].written)
export const ALL_CARDS: Card[] = REALMS.flatMap((r) => CONTENT[r.id].cards)
export const ALL_TERMS: Term[] = REALMS.flatMap((r) => CONTENT[r.id].terms).sort((a, b) => a.term.localeCompare(b.term))
export const ALL_SQL: SqlChallenge[] = REALMS.flatMap((r) => CONTENT[r.id].sql || [])

const qIndex = new Map(ALL_QUESTIONS.map((q) => [q.id, q]))
export const questionById = (id: string) => qIndex.get(id)
export const lessonById = (id: string) => ALL_LESSONS.find((l) => l.id === id)

/** Topic labels for mastery tables. */
export function topicsOf(realm: RealmId) {
  const set = new Set<string>()
  CONTENT[realm].questions.forEach((q) => set.add(q.topic))
  return [...set]
}
