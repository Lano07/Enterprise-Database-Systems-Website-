// Dev-only self-checks: validates every SQL challenge, RA challenge and question reference.
import { ALL_SQL, ALL_QUESTIONS, ALL_LESSONS, questionById } from './content'
import { createDb, run } from './engine/sql'
import { evaluate, parseRa } from './engine/ra'
import { loadRelations, RA_CHALLENGES } from './tools/RelAlgebra'

export function install() {
  ;(window as unknown as Record<string, unknown>).__dbq = { checkAll, forgeCheck, bptCheck }
}

/** Replays the lecture's B+ tree sequences and reports the resulting shapes. */
async function bptCheck() {
  const { BPlusTree, lectureTree } = await import('./engine/bptree')
  const shape = (t: InstanceType<typeof BPlusTree>) => ({ root: t.root.keys.join(','), kids: t.root.kids.map((k) => k.keys.join(',')).join(' | '), leaves: t.leaves().map((l) => l.join(',')).join(' | '), height: t.height() })
  const a = new BPlusTree(4, lectureTree())
  a.insert(8); const afterInsert = shape(a)
  a.delete(22); const d22 = shape(a)
  a.delete(20); const d20 = shape(a)
  a.delete(24); const d24 = shape(a)
  const b = new BPlusTree(3)
  ;[1, 3, 5, 7, 9, 2, 4, 6, 8, 10].forEach((k) => b.insert(k))
  return { afterInsert, d22, d20, d24, worked: shape(b), search27: new BPlusTree(4, a.root).search(27) }
}

/** Auto-normalize every Forge stage by repeatedly splitting on the first 3NF violation. */
async function forgeCheck() {
  const { FORGE_STAGES } = await import('./tools/Forge')
  const { candidateKeys, violations, lossless } = await import('./engine/fd')
  return FORGE_STAGES.map((st) => {
    let rels = [st.attrs]
    const key = candidateKeys(st.attrs, st.fds)
    for (let guard = 0; guard < 20; guard++) {
      const at = rels.findIndex((r) => violations(r, st.fds).length)
      if (at < 0) break
      const v = violations(rels[at], st.fds)[0]
      const y = v.fd.rhs.filter((a) => !v.fd.lhs.includes(a))
      rels = [...rels.slice(0, at), rels[at].filter((a) => !y.includes(a)), [...v.fd.lhs, ...y], ...rels.slice(at + 1)]
    }
    return { stage: st.id, key: key.map((k) => k.join('+')), final: rels.map((r) => r.join(',')), lossless: lossless(st.attrs, rels, st.fds) }
  })
}

async function checkAll() {
  const problems: string[] = []
  // SQL challenges: the reference solution must run and return a result set
  for (const c of ALL_SQL) {
    const db = await createDb(c.dataset)
    const r = run(db, c.solution)
    if (r.error) problems.push(`SQL ${c.id}: ${r.error}`)
    else if (!c.check && !r.sets.length) problems.push(`SQL ${c.id}: no result set`)
    if (c.check) { const k = run(db, c.check); if (k.error) problems.push(`SQL ${c.id} check: ${k.error}`) }
    db.close()
  }
  // RA challenges
  const rels = await loadRelations()
  for (const c of RA_CHALLENGES) {
    try { const { result } = evaluate(parseRa(c.ref), rels); if (!result.rows.length) problems.push(`RA ${c.id}: empty result`) } catch (e) { problems.push(`RA ${c.id}: ${(e as Error).message}`) }
  }
  // Lesson references to questions, and runnable SQL blocks
  for (const l of ALL_LESSONS) {
    l.body.replace(/\{\{q:([\w-]+)\}\}/g, (_m, id) => { if (!questionById(id)) problems.push(`Lesson ${l.id}: missing question ${id}`); return '' })
    const blocks = [...l.body.matchAll(/```(sql(?::\w+)?) run\n([\s\S]*?)```/g)]
    for (const b of blocks) {
      const ds = b[1].split(':')[1] || 'dreamhome'
      const db = await createDb(ds)
      const r = run(db, b[2])
      if (r.error && !/constraint failed/i.test(r.error)) problems.push(`Lesson ${l.id} SQL block: ${r.error}`)
      db.close()
    }
  }
  // Question sanity
  const ids = new Set<string>()
  for (const q of ALL_QUESTIONS) {
    if (ids.has(q.id)) problems.push(`Duplicate question id ${q.id}`)
    ids.add(q.id)
    if (q.kind === 'mcq' && (q.answer < 0 || q.answer >= q.options.length)) problems.push(`Question ${q.id}: answer index out of range`)
    if (q.kind === 'multi' && q.answer.some((a) => a >= q.options.length)) problems.push(`Question ${q.id}: answer index out of range`)
  }
  return { ok: problems.length === 0, problems, counts: { lessons: ALL_LESSONS.length, questions: ALL_QUESTIONS.length, sql: ALL_SQL.length } }
}
