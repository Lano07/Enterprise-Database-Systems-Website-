// Functional-dependency toolkit used by the Normalization Forge.
export interface FD { lhs: string[]; rhs: string[] }

export const fmt = (a: string[]) => (a.length === 1 ? a[0] : '(' + a.join(', ') + ')')
export const fdText = (f: FD) => `${fmt(f.lhs)} → ${f.rhs.join(', ')}`

export function closure(attrs: string[], fds: FD[]): Set<string> {
  const c = new Set(attrs)
  let changed = true
  while (changed) {
    changed = false
    for (const f of fds) if (f.lhs.every((a) => c.has(a)) && f.rhs.some((a) => !c.has(a))) { f.rhs.forEach((a) => c.add(a)); changed = true }
  }
  return c
}

export const isSuperkey = (x: string[], rel: string[], fds: FD[]) => { const c = closure(x, fds); return rel.every((a) => c.has(a)) }

function subsets<T>(arr: T[]): T[][] {
  const out: T[][] = []
  const n = arr.length
  for (let m = 1; m < 1 << n; m++) out.push(arr.filter((_, i) => m & (1 << i)))
  return out.sort((a, b) => a.length - b.length)
}

export function candidateKeys(rel: string[], fds: FD[]): string[][] {
  const keys: string[][] = []
  for (const s of subsets(rel)) {
    if (keys.some((k) => k.every((a) => s.includes(a)))) continue
    if (isSuperkey(s, rel, fds)) keys.push(s)
  }
  return keys
}

/** FDs that hold on the projection of the schema onto `rel` (non-trivial, minimal-ish LHS). */
export function projectFDs(rel: string[], fds: FD[]): FD[] {
  const out: FD[] = []
  for (const s of subsets(rel)) {
    const c = closure(s, fds)
    const rhs = rel.filter((a) => c.has(a) && !s.includes(a))
    if (!rhs.length) continue
    // skip if a smaller LHS already determines the same attributes
    const covered = out.filter((f) => f.lhs.every((a) => s.includes(a))).flatMap((f) => f.rhs)
    const fresh = rhs.filter((a) => !covered.includes(a))
    if (fresh.length) out.push({ lhs: s, rhs: fresh })
  }
  return out
}

export type Violation = { fd: FD; kind: 'partial' | 'transitive' }

/** 3NF violations of `rel` under `fds`: X → A with X not a superkey and A non-prime. */
export function violations(rel: string[], fds: FD[]): Violation[] {
  const keys = candidateKeys(rel, fds)
  const prime = new Set(keys.flat())
  const out: Violation[] = []
  for (const f of projectFDs(rel, fds)) {
    if (isSuperkey(f.lhs, rel, fds)) continue
    const bad = f.rhs.filter((a) => !prime.has(a))
    if (!bad.length) continue
    const partial = keys.some((k) => k.length > f.lhs.length && f.lhs.every((a) => k.includes(a)))
    out.push({ fd: { lhs: f.lhs, rhs: bad }, kind: partial ? 'partial' : 'transitive' })
  }
  return out
}

export function classifyFD(rel: string[], fds: FD[], fd: FD): 'full' | 'partial' | 'transitive' | 'key' {
  if (isSuperkey(fd.lhs, rel, fds)) return candidateKeys(rel, fds).some((k) => k.length === fd.lhs.length && k.every((a) => fd.lhs.includes(a))) ? 'full' : 'key'
  const keys = candidateKeys(rel, fds)
  return keys.some((k) => k.length > fd.lhs.length && fd.lhs.every((a) => k.includes(a))) ? 'partial' : 'transitive'
}

/** Chase test for a lossless-join decomposition. */
export function lossless(all: string[], parts: string[][], fds: FD[]): boolean {
  const rows = parts.map((p, i) => all.map((a) => (p.includes(a) ? 'a:' + a : `b${i}:${a}`)))
  let changed = true
  while (changed) {
    changed = false
    for (const f of fds) {
      const li = f.lhs.map((a) => all.indexOf(a)), ri = f.rhs.map((a) => all.indexOf(a))
      for (let x = 0; x < rows.length; x++) for (let y = x + 1; y < rows.length; y++) {
        if (li.every((i) => rows[x][i] === rows[y][i])) {
          for (const i of ri) {
            if (rows[x][i] !== rows[y][i]) {
              const keep = rows[x][i].startsWith('a:') ? rows[x][i] : rows[y][i].startsWith('a:') ? rows[y][i] : rows[x][i]
              const drop = keep === rows[x][i] ? rows[y][i] : rows[x][i]
              rows.forEach((r) => { if (r[i] === drop) r[i] = keep })
              changed = true
            }
          }
        }
      }
    }
  }
  return rows.some((r) => r.every((v) => v.startsWith('a:')))
}
