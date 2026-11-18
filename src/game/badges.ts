import type { Save } from './store'

export interface Badge { id: string; name: string; desc: string; icon: string; test?: (s: Save) => boolean }

const realms = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10']

export const BADGES: Badge[] = [
  { id: 'first-lesson', name: 'Hired!', desc: 'Clear your first lesson.', icon: '🎫', test: (s) => Object.keys(s.lessons).length >= 1 },
  { id: 'ten-lessons', name: 'Rising Apprentice', desc: 'Clear 10 lessons.', icon: '📘', test: (s) => Object.keys(s.lessons).length >= 10 },
  { id: 'all-lessons', name: 'Walking Textbook', desc: 'Clear every lesson.', icon: '🏛️' },
  { id: 'first-sql', name: 'Hello, SELECT', desc: 'Get your first SQL challenge accepted.', icon: '⌨️', test: (s) => Object.keys(s.sql).length >= 1 },
  { id: 'sql-15', name: 'Query Artisan', desc: 'Solve 15 SQL challenges.', icon: '🛠️', test: (s) => Object.keys(s.sql).length >= 15 },
  { id: 'combo-5', name: 'On a Roll', desc: 'Reach a 5× first-try combo.', icon: '🔥', test: (s) => s.bestCombo >= 5 },
  { id: 'combo-15', name: 'Unbreakable', desc: 'Reach a 15× first-try combo.', icon: '⚡', test: (s) => s.bestCombo >= 15 },
  { id: 'streak-3', name: 'Habit Forming', desc: 'Study 3 days in a row.', icon: '📅', test: (s) => s.streak.days >= 3 },
  { id: 'streak-7', name: 'Week of Integrity', desc: 'Study 7 days in a row.', icon: '🗓️', test: (s) => s.streak.days >= 7 },
  { id: 'breach', name: 'Learned the Hard Way', desc: 'Trigger your first Integrity Shield breach.', icon: '🛡️' },
  { id: 'boss-1', name: 'Boss Slayer', desc: 'Defeat a realm boss.', icon: '⚔️', test: (s) => Object.values(s.bosses).some((b) => b.beaten) },
  { id: 'boss-all', name: 'Enterprise Rescued', desc: 'Defeat all ten realm bosses.', icon: '👑', test: (s) => realms.every((r) => s.bosses[r]?.beaten) },
  { id: 'exam-70', name: 'First Class Honours', desc: 'Score 70%+ on a mock exam.', icon: '🎓', test: (s) => s.exams.some((e) => e.score / e.max >= 0.7) },
  { id: 'exam-90', name: 'A+ Material', desc: 'Score 90%+ on a mock exam.', icon: '🏆', test: (s) => s.exams.some((e) => e.score / e.max >= 0.9) },
  { id: 'bounty-10', name: 'Bounty Hunter', desc: 'Fix 10 bugs in one Bug Bounty run.', icon: '🐞', test: (s) => s.bounty.best >= 10 },
  { id: 'forge', name: 'Normalization Smith', desc: 'Clear every stage of the Normalization Forge.', icon: '⚒️', test: (s) => (s.tools['forge'] || 0) >= 4 },
  { id: 'tycoon', name: 'Optimizer Tycoon', desc: 'Clear every Query Optimizer contract.', icon: '💰', test: (s) => (s.tools['optimizer'] || 0) >= 5 },
  { id: 'defuser', name: 'Deadlock Defuser', desc: 'Clear every Concurrency Defuser scenario.', icon: '💣', test: (s) => (s.tools['concurrency'] || 0) >= 7 },
  { id: 'arborist', name: 'Arborist', desc: 'Clear every B+ tree challenge.', icon: '🌳', test: (s) => (s.tools['btree'] || 0) >= 4 },
  { id: 'cards-50', name: 'Memory Palace', desc: 'Get 50 flashcards to box 3 or higher.', icon: '🧠', test: (s) => Object.values(s.cards).filter((c) => c.box >= 3).length >= 50 },
]
