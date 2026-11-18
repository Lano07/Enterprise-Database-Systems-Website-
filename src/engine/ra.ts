// A small relational algebra evaluator with set semantics.
// Syntax (Unicode or ASCII keywords):
//   σ[pred](E)  select[pred](E)        π[a, b](E)  project[a, b](E)      ρ[Name](E)  rename[Name](E)
//   E ∪ E  union     E − E / E - E  minus     E ∩ E  intersect     E × E  times
//   E ⋈ E  join (natural)     E ⋈[pred] E  join[pred] (theta/equi)
//   E ⟕ E  ljoin     E ⟖ E  rjoin     E ⟗ E  fjoin      E ▷[pred] E  semijoin     E ÷ E  divide
// Predicates: comparisons (= <> != ≠ < > <= >= ≤ ≥) combined with AND/∧, OR/∨, NOT/¬ and parentheses.

export interface Col { name: string; rel: string }
export interface Rel { cols: Col[]; rows: unknown[][] }
export interface Step { label: string; rel: Rel; depth: number }

type Node =
  | { t: 'rel'; name: string }
  | { t: 'select'; pred: Pred; src: string; e: Node }
  | { t: 'project'; attrs: string[]; e: Node }
  | { t: 'rename'; name: string; attrs?: string[]; e: Node }
  | { t: 'bin'; op: BinOp; pred?: Pred; predSrc?: string; l: Node; r: Node }

type BinOp = 'union' | 'minus' | 'intersect' | 'times' | 'join' | 'ljoin' | 'rjoin' | 'fjoin' | 'semijoin' | 'divide'
const BIN_SYMBOL: Record<BinOp, string> = { union: '∪', minus: '−', intersect: '∩', times: '×', join: '⋈', ljoin: '⟕', rjoin: '⟖', fjoin: '⟗', semijoin: '▷', divide: '÷' }
const BIN_WORDS: Record<string, BinOp> = {
  '∪': 'union', union: 'union', '−': 'minus', '-': 'minus', minus: 'minus', except: 'minus', '∩': 'intersect', intersect: 'intersect',
  '×': 'times', times: 'times', '⋈': 'join', join: 'join', '⟕': 'ljoin', ljoin: 'ljoin', '⟖': 'rjoin', rjoin: 'rjoin', '⟗': 'fjoin', fjoin: 'fjoin',
  '▷': 'semijoin', '⋉': 'semijoin', semijoin: 'semijoin', '÷': 'divide', divide: 'divide',
}

// ---------------- tokenizer ----------------
type Tok = { k: 'id' | 'op' | 'lp' | 'rp' | 'br' | 'comma' | 'end'; v: string; pos: number }
function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (c === '(') { out.push({ k: 'lp', v: c, pos: i }); i++; continue }
    if (c === ')') { out.push({ k: 'rp', v: c, pos: i }); i++; continue }
    if (c === ',') { out.push({ k: 'comma', v: c, pos: i }); i++; continue }
    if (c === '[') {
      const j = src.indexOf(']', i)
      if (j < 0) throw new RaError('Missing ] to close the subscript that starts here.', i)
      out.push({ k: 'br', v: src.slice(i + 1, j), pos: i }); i = j + 1; continue
    }
    if ('σπρ∪−∩×⋈⟕⟖⟗▷⋉÷-'.includes(c)) { out.push({ k: 'op', v: c, pos: i }); i++; continue }
    const m = src.slice(i).match(/^[A-Za-z_][\w.]*/)
    if (m) { out.push({ k: 'id', v: m[0], pos: i }); i += m[0].length; continue }
    throw new RaError(`Unexpected character “${c}”.`, i)
  }
  out.push({ k: 'end', v: '', pos: src.length })
  return out
}

export class RaError extends Error { pos: number; constructor(msg: string, pos = -1) { super(msg); this.pos = pos } }

// ---------------- parser ----------------
export function parseRa(src: string): Node {
  const toks = tokenize(src)
  let p = 0
  const peek = () => toks[p]
  const next = () => toks[p++]
  const expect = (k: Tok['k'], what: string) => {
    const t = next()
    if (t.k !== k) throw new RaError(`Expected ${what} but found “${t.v || 'end of input'}”.`, t.pos)
    return t
  }
  const isUnary = (t: Tok) => (t.k === 'op' && 'σπρ'.includes(t.v)) || (t.k === 'id' && /^(select|project|rename)$/i.test(t.v))
  const binOf = (t: Tok): BinOp | undefined => (t.k === 'op' || t.k === 'id') ? BIN_WORDS[t.v.toLowerCase()] ?? BIN_WORDS[t.v] : undefined

  function expr(): Node {
    let left = term()
    for (;;) {
      const t = peek()
      const op = binOf(t)
      if (!op) break
      next()
      let pred: Pred | undefined, predSrc: string | undefined
      if (peek().k === 'br') {
        if (!['join', 'ljoin', 'rjoin', 'fjoin', 'semijoin'].includes(op)) throw new RaError(`${BIN_SYMBOL[op]} does not take a predicate.`, peek().pos)
        predSrc = next().v
        pred = parsePred(predSrc)
      }
      const right = term()
      left = { t: 'bin', op, pred, predSrc, l: left, r: right }
    }
    return left
  }
  function term(): Node {
    const t = peek()
    if (isUnary(t)) {
      next()
      const kind = t.v === 'σ' || /^select$/i.test(t.v) ? 'select' : t.v === 'π' || /^project$/i.test(t.v) ? 'project' : 'rename'
      const sub = expect('br', `a [subscript] after ${t.v}`)
      expect('lp', '(')
      const e = expr()
      expect('rp', ')')
      if (kind === 'select') return { t: 'select', pred: parsePred(sub.v), src: sub.v.trim(), e }
      if (kind === 'project') return { t: 'project', attrs: sub.v.split(',').map((s) => s.trim()).filter(Boolean), e }
      const m = sub.v.trim().match(/^(\w+)\s*(?:\(([^)]*)\))?$/)
      if (!m) throw new RaError('ρ expects a new name, e.g. ρ[S2](Staff) or ρ[S2(a, b)](R).', sub.pos)
      return { t: 'rename', name: m[1], attrs: m[2] ? m[2].split(',').map((s) => s.trim()) : undefined, e }
    }
    if (t.k === 'lp') { next(); const e = expr(); expect('rp', ')'); return e }
    if (t.k === 'id') { next(); return { t: 'rel', name: t.v } }
    throw new RaError(`Expected a relation, σ/π/ρ or “(” but found “${t.v || 'end of input'}”.`, t.pos)
  }
  const n = expr()
  if (peek().k !== 'end') throw new RaError(`Unexpected “${peek().v}”. Did you forget an operator between relations?`, peek().pos)
  return n
}

// ---------------- predicates ----------------
type Operand = { t: 'attr'; name: string } | { t: 'lit'; v: unknown }
type Pred =
  | { t: 'cmp'; op: string; a: Operand; b: Operand }
  | { t: 'and' | 'or'; a: Pred; b: Pred }
  | { t: 'not'; a: Pred }

function parsePred(src: string): Pred {
  const toks: string[] = []
  const re = /\s*(<>|!=|<=|>=|≤|≥|≠|=|<|>|\(|\)|∧|∨|¬|'(?:[^']|'')*'|"[^"]*"|-?\d+(?:\.\d+)?|[A-Za-z_][\w.]*)/y
  let m: RegExpExecArray | null
  let i = 0
  while (i < src.length) {
    if (/^\s*$/.test(src.slice(i))) break
    re.lastIndex = i
    m = re.exec(src)
    if (!m) throw new RaError(`Could not read the predicate near “${src.slice(i).trim()}”.`)
    toks.push(m[1]); i = re.lastIndex
  }
  let p = 0
  const peek = () => toks[p]
  const isKw = (t: string | undefined, ...ks: string[]) => !!t && ks.includes(t.toUpperCase())
  function or(): Pred { let a = and(); while (isKw(peek(), 'OR', '∨')) { p++; a = { t: 'or', a, b: and() } } return a }
  function and(): Pred { let a = not(); while (isKw(peek(), 'AND', '∧')) { p++; a = { t: 'and', a, b: not() } } return a }
  function not(): Pred {
    if (isKw(peek(), 'NOT', '¬')) { p++; return { t: 'not', a: not() } }
    if (peek() === '(') { p++; const a = or(); if (toks[p++] !== ')') throw new RaError('Missing ) in predicate.'); return a }
    const a = operand()
    const op = toks[p++]
    if (!op || !['=', '<>', '!=', '≠', '<', '>', '<=', '>=', '≤', '≥'].includes(op)) throw new RaError(`Expected a comparison operator after “${opText(a)}”.`)
    return { t: 'cmp', op, a, b: operand() }
  }
  function operand(): Operand {
    const t = toks[p++]
    if (t === undefined) throw new RaError('Predicate ended too early.')
    if (/^'/.test(t)) return { t: 'lit', v: t.slice(1, -1).replace(/''/g, "'") }
    if (/^"/.test(t)) return { t: 'lit', v: t.slice(1, -1) }
    if (/^-?\d/.test(t)) return { t: 'lit', v: Number(t) }
    if (/^null$/i.test(t)) return { t: 'lit', v: null }
    return { t: 'attr', name: t }
  }
  const out = or()
  if (p < toks.length) throw new RaError(`Unexpected “${toks[p]}” in predicate.`)
  return out
}
const opText = (o: Operand) => (o.t === 'attr' ? o.name : String(o.v))

// ---------------- evaluation ----------------
function findCol(rel: Rel, ref: string): number {
  const dot = ref.lastIndexOf('.')
  const hits = rel.cols.map((c, i) => [c, i] as const).filter(([c]) => (dot > 0 ? c.rel.toLowerCase() === ref.slice(0, dot).toLowerCase() && c.name.toLowerCase() === ref.slice(dot + 1).toLowerCase() : c.name.toLowerCase() === ref.toLowerCase()))
  if (!hits.length) throw new RaError(`No attribute “${ref}”. Available: ${rel.cols.map((c) => displayName(rel, c)).join(', ')}.`)
  if (hits.length > 1) throw new RaError(`“${ref}” is ambiguous here. Qualify it, e.g. ${hits.map(([c]) => c.rel + '.' + c.name).join(' or ')}.`)
  return hits[0][1]
}
export function displayName(rel: Rel, c: Col) {
  return rel.cols.filter((x) => x.name.toLowerCase() === c.name.toLowerCase()).length > 1 ? `${c.rel}.${c.name}` : c.name
}
function cmp(a: unknown, b: unknown, op: string) {
  if (a === null || b === null || a === undefined || b === undefined) return false // comparisons with null are unknown
  const na = Number(a), nb = Number(b)
  const bothNum = typeof a !== 'boolean' && typeof b !== 'boolean' && String(a).trim() !== '' && String(b).trim() !== '' && !isNaN(na) && !isNaN(nb)
  const x = bothNum ? na : String(a), y = bothNum ? nb : String(b)
  switch (op) {
    case '=': return x === y
    case '<>': case '!=': case '≠': return x !== y
    case '<': return x < y
    case '>': return x > y
    case '<=': case '≤': return x <= y
    case '>=': case '≥': return x >= y
  }
  return false
}
function compilePred(pred: Pred, rel: Rel): (row: unknown[]) => boolean {
  const val = (o: Operand) => (o.t === 'lit' ? () => o.v : ((i) => (r: unknown[]) => r[i])(findCol(rel, o.name)))
  switch (pred.t) {
    case 'cmp': { const a = val(pred.a), b = val(pred.b); return (r) => cmp(a(r), b(r), pred.op) }
    case 'and': { const a = compilePred(pred.a, rel), b = compilePred(pred.b, rel); return (r) => a(r) && b(r) }
    case 'or': { const a = compilePred(pred.a, rel), b = compilePred(pred.b, rel); return (r) => a(r) || b(r) }
    case 'not': { const a = compilePred(pred.a, rel); return (r) => !a(r) }
  }
}
const key = (r: unknown[]) => JSON.stringify(r)
function dedupe(rows: unknown[][]) { const seen = new Set<string>(); return rows.filter((r) => { const k = key(r); if (seen.has(k)) return false; seen.add(k); return true }) }
function compatible(a: Rel, b: Rel, op: string) {
  if (a.cols.length !== b.cols.length) throw new RaError(`${op} needs union-compatible relations, but the left has ${a.cols.length} attribute(s) and the right has ${b.cols.length}. Project both onto matching attributes first.`)
}

export function label(n: Node): string {
  switch (n.t) {
    case 'rel': return n.name
    case 'select': return `σ ${n.src} (${label(n.e)})`
    case 'project': return `π ${n.attrs.join(', ')} (${label(n.e)})`
    case 'rename': return `ρ ${n.name}${n.attrs ? '(' + n.attrs.join(', ') + ')' : ''} (${label(n.e)})`
    case 'bin': return `${wrap(n.l)} ${BIN_SYMBOL[n.op]}${n.predSrc ? ' ' + n.predSrc.trim() : ''} ${wrap(n.r)}`
  }
}
const wrap = (n: Node) => (n.t === 'bin' ? `(${label(n)})` : label(n))

export function evaluate(root: Node, db: Record<string, Rel>): { result: Rel; steps: Step[] } {
  const steps: Step[] = []
  const ev = (n: Node, depth: number): Rel => {
    let out: Rel
    switch (n.t) {
      case 'rel': {
        const k = Object.keys(db).find((x) => x.toLowerCase() === n.name.toLowerCase())
        if (!k) throw new RaError(`There is no relation “${n.name}”. Relations: ${Object.keys(db).join(', ')}.`)
        return db[k]
      }
      case 'select': {
        const r = ev(n.e, depth + 1)
        const f = compilePred(n.pred, r)
        out = { cols: r.cols, rows: r.rows.filter(f) }
        break
      }
      case 'project': {
        const r = ev(n.e, depth + 1)
        const idx = n.attrs.map((a) => findCol(r, a))
        out = { cols: idx.map((i) => r.cols[i]), rows: dedupe(r.rows.map((row) => idx.map((i) => row[i]))) }
        break
      }
      case 'rename': {
        const r = ev(n.e, depth + 1)
        if (n.attrs && n.attrs.length !== r.cols.length) throw new RaError(`ρ lists ${n.attrs.length} attribute names but the relation has ${r.cols.length}.`)
        out = { cols: r.cols.map((c, i) => ({ name: n.attrs ? n.attrs[i] : c.name, rel: n.name })), rows: r.rows }
        break
      }
      case 'bin': {
        const l = ev(n.l, depth + 1), r = ev(n.r, depth + 1)
        out = binary(n, l, r)
        break
      }
    }
    steps.push({ label: label(n), rel: out, depth })
    return out
  }
  const result = ev(root, 0)
  if (!steps.length) steps.push({ label: label(root), rel: result, depth: 0 })
  return { result, steps }
}

function binary(n: Extract<Node, { t: 'bin' }>, l: Rel, r: Rel): Rel {
  const prod = (): Rel => ({ cols: [...l.cols, ...r.cols], rows: l.rows.flatMap((a) => r.rows.map((b) => [...a, ...b])) })
  const common = () => l.cols.map((c, i) => [i, r.cols.findIndex((d) => d.name.toLowerCase() === c.name.toLowerCase())] as const).filter(([, j]) => j >= 0)
  switch (n.op) {
    case 'union': compatible(l, r, 'Union'); return { cols: l.cols, rows: dedupe([...l.rows, ...r.rows]) }
    case 'minus': { compatible(l, r, 'Set difference'); const s = new Set(r.rows.map(key)); return { cols: l.cols, rows: dedupe(l.rows.filter((x) => !s.has(key(x)))) } }
    case 'intersect': { compatible(l, r, 'Intersection'); const s = new Set(r.rows.map(key)); return { cols: l.cols, rows: dedupe(l.rows.filter((x) => s.has(key(x)))) } }
    case 'times': return dedupeRel(prod())
    case 'join': case 'ljoin': case 'rjoin': case 'fjoin': {
      if (n.pred) {
        const P = prod()
        const f = compilePred(n.pred, P)
        const matched = P.rows.filter(f)
        return dedupeRel({ cols: P.cols, rows: outerPad(n.op, matched, l, r, (a, b) => f([...a, ...b])) })
      }
      const cm = common()
      if (!cm.length) {
        if (n.op === 'join') return dedupeRel(prod())
        throw new RaError('A natural outer join needs at least one common attribute name. Add a predicate, e.g. ⟕[R.a = S.a].')
      }
      const rKeep = r.cols.map((_, j) => j).filter((j) => !cm.some(([, cj]) => cj === j))
      const match = (a: unknown[], b: unknown[]) => cm.every(([i, j]) => a[i] !== null && a[i] === b[j])
      const rows: unknown[][] = []
      const usedR = new Set<number>()
      l.rows.forEach((a) => {
        let hit = false
        r.rows.forEach((b, bj) => { if (match(a, b)) { hit = true; usedR.add(bj); rows.push([...a, ...rKeep.map((j) => b[j])]) } })
        if (!hit && (n.op === 'ljoin' || n.op === 'fjoin')) rows.push([...a, ...rKeep.map(() => null)])
      })
      if (n.op === 'rjoin' || n.op === 'fjoin') r.rows.forEach((b, bj) => {
        if (!usedR.has(bj)) rows.push([...l.cols.map((_, i) => { const c = cm.find(([li]) => li === i); return c ? b[c[1]] : null }), ...rKeep.map((j) => b[j])])
      })
      return { cols: [...l.cols, ...rKeep.map((j) => r.cols[j])], rows: dedupe(rows) }
    }
    case 'semijoin': {
      if (n.pred) {
        const P = prod()
        const f = compilePred(n.pred, P)
        return { cols: l.cols, rows: dedupe(l.rows.filter((a) => r.rows.some((b) => f([...a, ...b])))) }
      }
      const cm = common()
      if (!cm.length) throw new RaError('A natural semijoin needs a common attribute. Add a predicate, e.g. ▷[R.a = S.a].')
      return { cols: l.cols, rows: dedupe(l.rows.filter((a) => r.rows.some((b) => cm.every(([i, j]) => a[i] === b[j])))) }
    }
    case 'divide': {
      const bIdx = r.cols.map((c) => l.cols.findIndex((d) => d.name.toLowerCase() === c.name.toLowerCase()))
      if (bIdx.some((i) => i < 0)) throw new RaError('For R ÷ S, every attribute of S must also be an attribute of R.')
      const aIdx = l.cols.map((_, i) => i).filter((i) => !bIdx.includes(i))
      if (!aIdx.length) throw new RaError('R ÷ S needs R to have attributes that S does not.')
      const have = new Set(l.rows.map((row) => key([...aIdx.map((i) => row[i]), ...bIdx.map((i) => row[i])])))
      const cands = dedupe(l.rows.map((row) => aIdx.map((i) => row[i])))
      return { cols: aIdx.map((i) => l.cols[i]), rows: cands.filter((a) => r.rows.every((b) => have.has(key([...a, ...b])))) }
    }
  }
}
function outerPad(op: BinOp, matched: unknown[][], l: Rel, r: Rel, f: (a: unknown[], b: unknown[]) => boolean) {
  const rows = [...matched]
  if (op === 'ljoin' || op === 'fjoin') l.rows.forEach((a) => { if (!r.rows.some((b) => f(a, b))) rows.push([...a, ...r.cols.map(() => null)]) })
  if (op === 'rjoin' || op === 'fjoin') r.rows.forEach((b) => { if (!l.rows.some((a) => f(a, b))) rows.push([...l.cols.map(() => null), ...b]) })
  return rows
}
function dedupeRel(r: Rel): Rel { return { cols: r.cols, rows: dedupe(r.rows) } }

export function sameRel(a: Rel, b: Rel) {
  if (a.cols.length !== b.cols.length || a.rows.length !== b.rows.length) return false
  const s = new Set(a.rows.map(key))
  return b.rows.every((r) => s.has(key(r)))
}
