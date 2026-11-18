// Content model. Lessons are written in a small Markdown dialect (see engine/md.tsx);
// questions are typed so they can be auto-graded, scheduled and mined for weak spots.

export type RealmId =
  | 'r1' | 'r2' | 'r3' | 'r4' | 'r5' | 'r6' | 'r7' | 'r8' | 'r9' | 'r10'

export interface Realm {
  id: RealmId
  n: number
  title: string
  short: string
  /** One-line story hook for the campaign map. */
  story: string
  blurb: string
  /** Lecture folder in COMP2605_Lecture_Notes this realm is drawn from. */
  source: string
  color: string
  icon: string
  boss: { name: string; title: string; taunt: string; hp: number }
  /** Interactive tools that belong to this realm. */
  tools: string[]
}

export interface Lesson {
  id: string
  realm: RealmId
  title: string
  mins: number
  /** Lecture files the lesson is grounded in. */
  src: string[]
  /** Markdown dialect body. */
  body: string
}

export type Difficulty = 1 | 2 | 3

interface QBase {
  id: string
  realm: RealmId
  /** Sub-topic key used for mastery tracking, e.g. "keys", "2nf". */
  topic: string
  q: string
  explain: string
  d: Difficulty
  /** Optional hint (costs Query Mana). */
  hint?: string
}

export interface McqQ extends QBase { kind: 'mcq'; options: string[]; answer: number }
export interface MultiQ extends QBase { kind: 'multi'; options: string[]; answer: number[] }
export interface TfQ extends QBase { kind: 'tf'; answer: boolean }
/** Free text; any accepted answer matches after normalising case/whitespace. */
export interface FillQ extends QBase { kind: 'fill'; accept: string[]; placeholder?: string }
/** Put items in the right order; `items` is the correct order. */
export interface OrderQ extends QBase { kind: 'order'; items: string[] }
/** Pair each left item with its right item; pairs are given in correct order. */
export interface MatchQ extends QBase { kind: 'match'; pairs: [string, string][] }
/** Number answer with tolerance. */
export interface NumQ extends QBase { kind: 'num'; answer: number; tol?: number; unit?: string }

export type Question = McqQ | MultiQ | TfQ | FillQ | OrderQ | MatchQ | NumQ

/** Written (long-answer) exam question with a model answer and marking points. */
export interface Written {
  id: string
  realm: RealmId
  topic: string
  marks: number
  q: string
  model: string
  points: string[]
}

/** A SQL challenge graded by comparing result sets with a reference query. */
export interface SqlChallenge {
  id: string
  realm: RealmId
  topic: string
  title: string
  dataset: string
  prompt: string
  /** Reference solution; the player's result set must match it. */
  solution: string
  /** If true, row order matters (ORDER BY questions). */
  ordered?: boolean
  hint?: string
  d: Difficulty
  starter?: string
  /** Optional: run after the player's SQL; its result must match the same query after the solution. */
  check?: string
}

export interface Card { id: string; realm: RealmId; front: string; back: string }
export interface Term { term: string; def: string; realm: RealmId }

export interface RealmContent {
  lessons: Lesson[]
  questions: Question[]
  written: Written[]
  cards: Card[]
  terms: Term[]
  sql?: SqlChallenge[]
  /** Revision codex (cheat sheet) in the Markdown dialect. */
  codex: string
  /** Human names for topic keys used in mastery tables. */
  topics?: Record<string, string>
}
