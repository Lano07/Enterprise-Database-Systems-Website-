import { useEffect, useMemo, useState } from 'react'
import { recordAnswer, useSave } from '../game/store'
import { CodeEditor } from '../ui/CodeEditor'

type J = unknown

// ---------------- SQL/JSON-style path evaluator (lax mode) ----------------
export function jsonPath(root: J, path: string): J[] {
  const p = path.trim()
  if (!p.startsWith('$')) throw new Error('A SQL/JSON path starts with $')
  let i = 1
  let cur: J[] = [root]
  const unwrap = (xs: J[]) => xs.flatMap((x) => (Array.isArray(x) ? x : [x]))
  while (i < p.length) {
    const c = p[i]
    if (c === ' ') { i++; continue }
    if (c === '.') {
      i++
      if (p[i] === '*') { i++; cur = unwrap(cur).flatMap((x) => (x && typeof x === 'object' ? Object.values(x as object) : [])); continue }
      let name = ''
      if (p[i] === '"') { const j = p.indexOf('"', i + 1); name = p.slice(i + 1, j); i = j + 1 }
      else { const m = p.slice(i).match(/^[\w$]+/); if (!m) throw new Error(`Expected a member name at position ${i}`); name = m[0]; i += name.length }
      cur = unwrap(cur).flatMap((x) => (x && typeof x === 'object' && !Array.isArray(x) && name in (x as object) ? [(x as Record<string, J>)[name]] : []))
      continue
    }
    if (c === '[') {
      const j = p.indexOf(']', i)
      if (j < 0) throw new Error('Missing ]')
      const inner = p.slice(i + 1, j).trim()
      i = j + 1
      if (inner === '*') cur = cur.flatMap((x) => (Array.isArray(x) ? x : [x]))
      else {
        const idx = inner.split(',').map((s) => s.trim()).flatMap((s) => { const r = s.match(/^(\d+)\s+to\s+(\d+)$/); return r ? Array.from({ length: +r[2] - +r[1] + 1 }, (_, k) => +r[1] + k) : [Number(s)] })
        if (idx.some((n) => !Number.isInteger(n))) throw new Error(`Array index must be a whole number, got [${inner}]`)
        cur = cur.flatMap((x) => (Array.isArray(x) ? idx.filter((n) => n < x.length).map((n) => x[n]) : idx.includes(0) ? [x] : []))
      }
      continue
    }
    if (c === '?') {
      const open = p.indexOf('(', i)
      let depth = 0, j = open
      for (; j < p.length; j++) { if (p[j] === '(') depth++; else if (p[j] === ')') { depth--; if (depth === 0) break } }
      const cond = p.slice(open + 1, j)
      i = j + 1
      cur = unwrap(cur).filter((x) => evalFilter(cond, x))
      continue
    }
    throw new Error(`Unexpected “${c}” at position ${i}`)
  }
  return cur
}

function evalFilter(cond: string, at: J): boolean {
  const toks = cond.match(/"(?:[^"\\]|\\.)*"|'[^']*'|==|!=|<=|>=|&&|\|\||[<>()!]|@[\w.[\]*]*|-?\d+(?:\.\d+)?|true|false|null|exists/g) || []
  let k = 0
  const val = (t: string): J => {
    if (t.startsWith('@')) { const r = jsonPath(at, '$' + t.slice(1)); return r.length ? r[0] : undefined }
    if (t.startsWith('"') || t.startsWith("'")) return t.slice(1, -1)
    if (t === 'true') return true
    if (t === 'false') return false
    if (t === 'null') return null
    return Number(t)
  }
  function or(): boolean { let a = and(); while (toks[k] === '||') { k++; const b = and(); a = a || b } return a }
  function and(): boolean { let a = not(); while (toks[k] === '&&') { k++; const b = not(); a = a && b } return a }
  function not(): boolean {
    if (toks[k] === '!') { k++; return !not() }
    if (toks[k] === '(') { k++; const r = or(); k++; return r }
    if (toks[k] === 'exists') { k += 2; const t = toks[k++]; k++; return jsonPath(at, '$' + t.slice(1)).length > 0 }
    const a = val(toks[k++])
    const op = toks[k]
    if (!['==', '!=', '<', '<=', '>', '>='].includes(op)) return Boolean(a)
    k++
    const b = val(toks[k++])
    switch (op) {
      case '==': return a === b
      case '!=': return a !== b
      case '<': return (a as number) < (b as number)
      case '<=': return (a as number) <= (b as number)
      case '>': return (a as number) > (b as number)
      default: return (a as number) >= (b as number)
    }
  }
  return or()
}

// ---------------- Mongo-style find ----------------
function getPath(doc: J, path: string): J[] {
  let cur: J[] = [doc]
  for (const part of path.split('.')) cur = cur.flatMap((x) => (Array.isArray(x) ? x : [x])).flatMap((x) => (x && typeof x === 'object' && part in (x as object) ? [(x as Record<string, J>)[part]] : []))
  return cur.flatMap((x) => (Array.isArray(x) ? [x, ...x] : [x]))
}
const deq = (a: J, b: J) => JSON.stringify(a) === JSON.stringify(b)
export function matches(doc: J, filter: Record<string, J>): boolean {
  return Object.entries(filter).every(([k, cond]) => {
    if (k === '$or') return (cond as Record<string, J>[]).some((f) => matches(doc, f))
    if (k === '$and') return (cond as Record<string, J>[]).every((f) => matches(doc, f))
    const vals = getPath(doc, k)
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && Object.keys(cond).some((o) => o.startsWith('$'))) {
      return Object.entries(cond as Record<string, J>).every(([op, v]) => {
        switch (op) {
          case '$gt': return vals.some((x) => typeof x === typeof v && (x as number) > (v as number))
          case '$gte': return vals.some((x) => typeof x === typeof v && (x as number) >= (v as number))
          case '$lt': return vals.some((x) => typeof x === typeof v && (x as number) < (v as number))
          case '$lte': return vals.some((x) => typeof x === typeof v && (x as number) <= (v as number))
          case '$ne': return !vals.some((x) => deq(x, v))
          case '$in': return vals.some((x) => (v as J[]).some((y) => deq(x, y)))
          case '$exists': return (vals.length > 0) === Boolean(v)
          default: throw new Error(`Unsupported operator ${op}`)
        }
      })
    }
    return vals.some((x) => deq(x, cond))
  })
}

export const CUSTOMERS = [
  { _id: 1, firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', address: { street: '123 Main St', city: 'Anytown', postalCode: '12345' }, orders: [{ orderId: 'A123', orderDate: '2023-10-27', totalAmount: 50.0 }, { orderId: 'B456', orderDate: '2023-10-28', totalAmount: 75.0 }] },
  { _id: 2, firstName: 'Alice', lastName: 'Ng', email: 'alice@example.com', age: 28, address: { street: '456 Elm St', city: 'Somewhere', postalCode: '54321' }, hobbies: ['reading', 'chess'] },
  { _id: 3, firstName: 'Bob', lastName: 'Ali', phone: '(123) 456-7890', address: { city: 'Anytown' }, orders: [{ orderId: 'C789', orderDate: '2023-11-02', totalAmount: 120.0 }] },
  { _id: 4, type: 'Article', author: 'Derick Rethans', title: 'Document Databases', date: '2013-04-24' },
]
export const ASSET = { label: 'Tripod', cost: 90, units: 6, features: { colour: 'black', weightKg: 1.4 }, labels: ['loan', 'studio'], feedback: [{ person: 'Ana', score: 4 }, { person: 'Raj', score: 5 }, { person: 'Lee', score: 2 }] }

const PATH_CH = [
  { id: 'jp1', prompt: 'Select the label member.', ref: '$.label' },
  { id: 'jp2', prompt: 'Select the colour inside features.', ref: '$.features.colour' },
  { id: 'jp3', prompt: 'Select the FIRST item of labels.', ref: '$.labels[0]' },
  { id: 'jp4', prompt: 'Select every feedback score.', ref: '$.feedback[*].score' },
  { id: 'jp5', prompt: 'Select the feedback entries (objects) whose score is at least 4.', ref: '$.feedback[*]?(@.score >= 4)' },
  { id: 'jp6', prompt: 'Select the labels equal to "loan" (a filter on array items).', ref: '$.labels[*]?(@ == "loan")' },
]
const FIND_CH = [
  { id: 'jf1', prompt: 'Find customers who live in Anytown.', ref: { 'address.city': 'Anytown' } },
  { id: 'jf2', prompt: 'Find customers who have ANY order over 100.', ref: { 'orders.totalAmount': { $gt: 100 } } },
  { id: 'jf3', prompt: 'Find documents that have a hobbies field containing "chess".', ref: { hobbies: 'chess' } },
  { id: 'jf4', prompt: 'Find documents WITHOUT an email field.', ref: { email: { $exists: false } } },
]

function show(v: J) { return JSON.stringify(v, null, 2) }

// ---------------- widgets / tabs ----------------
export function JsonValidator() {
  const presets: [string, string][] = [['valid', '{\n  "name": "John",\n  "age": 30,\n  "car": null,\n  "skills": ["SQL", "Python"]\n}'], ['single quotes', "{ 'name': 'John' }"], ['trailing comma', '{ "name": "John", }'], ['unquoted name', '{ name: "John" }']]
  const [t, setT] = useState(presets[0][1])
  let out: { ok: boolean; msg: string; types?: string[] }
  try {
    const v = JSON.parse(t)
    const types: string[] = []
    const walk = (x: J, path: string) => { const ty = x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x; types.push(`${path}: ${ty}`); if (ty === 'object') Object.entries(x as object).forEach(([k, y]) => walk(y, `${path}.${k}`)); if (ty === 'array') (x as J[]).forEach((y, i) => walk(y, `${path}[${i}]`)) }
    walk(v, '$')
    out = { ok: true, msg: 'Valid JSON.', types }
  } catch (e) { out = { ok: false, msg: (e as Error).message } }
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small" style={{ marginBottom: 6 }}><b>JSON validator</b>{presets.map(([l, x]) => <button key={l} className="btn sm" onClick={() => setT(x)}>{l}</button>)}</div>
      <CodeEditor value={t} onChange={setT} lang="json" minRows={4} label="JSON" />
      <div className="q-explain" style={{ background: out.ok ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>{out.ok ? '✔ ' : '✖ '}{out.msg}{out.types && <div className="small mono" style={{ marginTop: 4 }}>{out.types.slice(0, 12).join(' · ')}</div>}</div>
    </div>
  )
}

export function JsonPathTab({ compact }: { compact?: boolean }) {
  const s = useSave()
  const [doc, setDoc] = useState(show(ASSET))
  const [path, setPath] = useState('$.feedback[*]?(@.score >= 4).person')
  const [ch, setCh] = useState<(typeof PATH_CH)[number] | null>(null)
  const [verdict, setVerdict] = useState<boolean | null>(null)
  let res: J[] | null = null, err = ''
  try { res = jsonPath(JSON.parse(doc), path) } catch (e) { err = (e as Error).message }
  const check = () => {
    if (!ch || !res) { setVerdict(false); return }
    const ok = deq(res, jsonPath(ASSET, ch.ref))
    setVerdict(ok)
    recordAnswer('jp-' + ch.id, 'r10', 'oraclejson', ok, { firstTry: !s.attempts['jp-' + ch.id] })
  }
  return (
    <div className={compact ? 'panel' : 'tool-grid'} style={compact ? { margin: '14px 0' } : undefined}>
      <div>
        {compact && <b className="small">SQL/JSON path playground (lax mode, like Oracle’s JSON_VALUE/JSON_QUERY paths)</b>}
        {ch && <div className="card" style={{ marginBottom: 8 }}><div className="small muted">Path challenge</div><b>{ch.prompt}</b></div>}
        {!compact && <CodeEditor value={doc} onChange={setDoc} lang="json" minRows={8} label="JSON document" />}
        {compact && <details><summary className="small muted">show the document</summary><pre className="code">{doc}</pre></details>}
        <CodeEditor value={path} onChange={setPath} lang="xpath" minRows={1} label="JSON path" bar={<><span className="tag acc">$ · .member · [0] · [*] · ?(@.x &gt;= 4)</span><span className="spacer" />{ch && <button className="btn sm primary" onClick={check}>✔ Check</button>}</>} />
        {err ? <div className="res-note">⚠️ {err}</div> : <div className="res" style={{ border: '1px solid var(--line)', borderRadius: 8 }}><div className="small muted">{res!.length} item{res!.length === 1 ? '' : 's'}</div><pre className="code" style={{ margin: 0 }}>{res!.map((r) => JSON.stringify(r)).join('\n') || '(empty: no match)'}</pre></div>}
        {verdict !== null && ch && <div className="q-explain" style={{ background: verdict ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>{verdict ? '✔ Correct!' : <>✖ Not the expected items. <details><summary className="small">Reveal</summary><code>{ch.ref}</code></details></>}</div>}
      </div>
      {!compact && (
        <div className="panel" style={{ alignSelf: 'start' }}>
          <h3>Path challenges</h3>
          <div style={{ display: 'grid', gap: 4 }}>{PATH_CH.map((c) => <button key={c.id} className="quest" style={{ padding: '6px 10px', textAlign: 'left', cursor: 'pointer', ...(ch?.id === c.id ? { borderColor: 'var(--accent)' } : {}) }} onClick={() => { setCh(c); setPath('$'); setVerdict(null); setDoc(show(ASSET)) }}><span>{s.attempts['jp-' + c.id]?.right ? '✅' : '⬜'}</span><span className="qt"><b style={{ fontSize: '.84rem' }}>{c.prompt}</b></span></button>)}</div>
          <p className="small muted" style={{ marginTop: 8 }}>JSON arrays are 0-based ($.labels[0] is the first item), unlike XPath positions, which start at 1.</p>
        </div>
      )}
    </div>
  )
}

export function FindTab({ compact }: { compact?: boolean }) {
  const s = useSave()
  const [f, setF] = useState('{ "address.city": "Anytown" }')
  const [ch, setCh] = useState<(typeof FIND_CH)[number] | null>(null)
  const [verdict, setVerdict] = useState<boolean | null>(null)
  let res: J[] | null = null, err = ''
  try { const filter = JSON.parse(f); res = CUSTOMERS.filter((d) => matches(d, filter)) } catch (e) { err = (e as Error).message }
  const check = () => {
    if (!ch || !res) { setVerdict(false); return }
    const want = CUSTOMERS.filter((d) => matches(d, ch.ref as Record<string, J>)).map((d) => d._id)
    const ok = deq(res.map((d) => (d as { _id: number })._id), want)
    setVerdict(ok)
    recordAnswer('jf-' + ch.id, 'r10', 'document', ok, { firstTry: !s.attempts['jf-' + ch.id] })
  }
  return (
    <div className={compact ? 'panel' : 'tool-grid'} style={compact ? { margin: '14px 0' } : undefined}>
      <div>
        <b className="small">db.customers.find( filter ) on a schema-flexible collection</b>
        {ch && <div className="card" style={{ margin: '6px 0' }}><b>{ch.prompt}</b></div>}
        <CodeEditor value={f} onChange={setF} lang="json" minRows={1} label="Filter" bar={<><span className="tag acc">dot paths · $gt $gte $lt $lte $ne $in $exists $or</span><span className="spacer" />{ch && <button className="btn sm primary" onClick={check}>✔ Check</button>}</>} />
        {err ? <div className="res-note">⚠️ {err}</div> : <div className="small muted">{res!.length} document{res!.length === 1 ? '' : 's'} matched</div>}
        {res && res.map((d) => <pre key={(d as { _id: number })._id} className="code" style={{ margin: '4px 0', maxHeight: 160, overflow: 'auto' }}>{JSON.stringify(d)}</pre>)}
        {verdict !== null && <div className="q-explain" style={{ background: verdict ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>{verdict ? '✔ Correct documents!' : '✖ Not the expected documents.'}</div>}
      </div>
      {!compact && (
        <div className="panel" style={{ alignSelf: 'start' }}>
          <h3>Find challenges</h3>
          <div style={{ display: 'grid', gap: 4 }}>{FIND_CH.map((c) => <button key={c.id} className="quest" style={{ padding: '6px 10px', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setCh(c); setF('{ }'); setVerdict(null) }}><span>{s.attempts['jf-' + c.id]?.right ? '✅' : '⬜'}</span><span className="qt"><b style={{ fontSize: '.84rem' }}>{c.prompt}</b></span></button>)}</div>
          <p className="small muted" style={{ marginTop: 8 }}>Notice the 4th document is an Article in the same collection: a heterogeneous collection. A "type" discriminator helps.</p>
        </div>
      )}
    </div>
  )
}

export function KvConsole() {
  const [store, setStore] = useState<Record<string, { v: string; exp?: number }>>({ 'session:8f2': { v: '{"user":"alice","cart":["COM6"]}' }, 'artist:1:name': { v: 'AC/DC' } })
  const [log, setLog] = useState<string[]>(['Try: GET artist:1:name · SET counter 0 · INCR counter · SET session:9a1 alice EX 10 · TTL session:9a1 · KEYS'])
  const [cmd, setCmd] = useState('')
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t) }, [])
  const live = (k: string) => { const e = store[k]; if (!e) return undefined; if (e.exp && e.exp <= Date.now()) return undefined; return e }
  const run = () => {
    const parts = cmd.trim().match(/"[^"]*"|\S+/g) || []
    const [op = '', key = '', ...rest] = parts.map((p) => p.replace(/^"|"$/g, ''))
    let out = ''
    const s = { ...store }
    switch (op.toUpperCase()) {
      case 'SET': { const exi = rest.findIndex((r) => r.toUpperCase() === 'EX'); const val = exi >= 0 ? rest.slice(0, exi).join(' ') : rest.join(' '); s[key] = { v: val, exp: exi >= 0 ? Date.now() + Number(rest[exi + 1]) * 1000 : undefined }; out = 'OK'; break }
      case 'GET': out = live(key)?.v ?? '(nil)'; break
      case 'DEL': out = live(key) ? '(integer) 1' : '(integer) 0'; delete s[key]; break
      case 'INCR': { const e = live(key); const n = Number(e?.v ?? 0); if (isNaN(n)) { out = 'ERR value is not an integer'; break } s[key] = { v: String(n + 1), exp: e?.exp }; out = `(integer) ${n + 1}  ← atomic: no read-modify-write race`; break }
      case 'EXPIRE': { const e = live(key); if (!e) { out = '(integer) 0'; break } s[key] = { ...e, exp: Date.now() + Number(rest[0]) * 1000 }; out = '(integer) 1'; break }
      case 'TTL': { const e = live(key); out = !e ? '(integer) -2  (no such key)' : e.exp ? `(integer) ${Math.ceil((e.exp - Date.now()) / 1000)}` : '(integer) -1  (no expiry)'; break }
      case 'KEYS': out = Object.keys(s).filter((k) => live(k)).join('  ') || '(empty)'; break
      default: out = 'Commands: SET k v [EX s] · GET k · DEL k · INCR k · EXPIRE k s · TTL k · KEYS'
    }
    setStore(s)
    setLog((l) => [...l.slice(-12), `> ${cmd}`, out])
    setCmd('')
  }
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <b className="small">Key-value console (Redis-style commands)</b>
      <pre className="code" style={{ minHeight: 120, maxHeight: 220, overflow: 'auto' }}>{log.join('\n')}</pre>
      <div className="row"><input type="text" value={cmd} onChange={(e) => setCmd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} placeholder="SET user:1 alice" style={{ flex: 1, fontFamily: 'var(--f-code)' }} aria-label="Key-value command" /><button className="btn sm primary" onClick={run}>Send</button></div>
      <div className="small muted" style={{ marginTop: 4 }}>Live keys: {Object.keys(store).filter((k) => live(k)).map((k) => `${k}${store[k].exp ? ` (${Math.max(0, Math.ceil((store[k].exp! - Date.now()) / 1000))}s)` : ''}`).join(' · ')}</div>
    </div>
  )
}

const G_NODES: Record<string, { label: string; x: number; y: number; props: string }> = {
  Alice: { label: 'Person', x: 70, y: 60, props: 'age:18' }, Bob: { label: 'Person', x: 230, y: 50, props: 'age:22' }, John: { label: 'Person', x: 60, y: 170, props: 'age:30, New York' },
  Carol: { label: 'Person', x: 390, y: 70, props: 'age:25' }, Dan: { label: 'Person', x: 400, y: 190, props: 'age:41' }, Chess: { label: 'Group', x: 230, y: 180, props: 'name:Chess' },
}
const G_EDGES: [string, string, string, string][] = [['Alice', 'Bob', 'KNOWS', 'since: 2001-10-03'], ['John', 'Alice', 'FRIENDS', 'since: 2010'], ['Alice', 'Chess', 'MEMBER_OF', ''], ['Bob', 'Chess', 'MEMBER_OF', ''], ['Bob', 'Carol', 'KNOWS', ''], ['Carol', 'Dan', 'KNOWS', ''], ['Dan', 'Chess', 'MEMBER_OF', '']]
export function GraphPath() {
  const people = Object.keys(G_NODES).filter((n) => G_NODES[n].label === 'Person')
  const [from, setFrom] = useState('John')
  const [to, setTo] = useState('Dan')
  const [viaGroups, setViaGroups] = useState(false)
  const path = useMemo(() => {
    const adj = new Map<string, string[]>()
    G_EDGES.forEach(([a, b]) => { if (!viaGroups && (G_NODES[a].label === 'Group' || G_NODES[b].label === 'Group')) return; adj.set(a, [...(adj.get(a) || []), b]); adj.set(b, [...(adj.get(b) || []), a]) })
    const prev = new Map<string, string>(); const q = [from]; const seen = new Set([from])
    while (q.length) { const n = q.shift()!; if (n === to) break; for (const m of adj.get(n) || []) if (!seen.has(m)) { seen.add(m); prev.set(m, n); q.push(m) } }
    if (!seen.has(to)) return null
    const out = [to]; while (out[0] !== from) out.unshift(prev.get(out[0])!)
    return out
  }, [from, to, viaGroups])
  const onPath = (a: string, b: string) => !!path && path.some((n, i) => i > 0 && ((path[i - 1] === a && n === b) || (path[i - 1] === b && n === a)))
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small"><b>Property graph: shortest path</b>
        <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From">{people.map((p) => <option key={p}>{p}</option>)}</select>→
        <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="To">{people.map((p) => <option key={p}>{p}</option>)}</select>
        <label><input type="checkbox" checked={viaGroups} onChange={(e) => setViaGroups(e.target.checked)} /> allow paths through groups</label></div>
      <div className="svg-wrap" style={{ marginTop: 8 }}>
        <svg viewBox="0 0 470 240" style={{ width: '100%', maxWidth: 560, display: 'block', margin: '0 auto' }} role="img" aria-label="Property graph">
          {G_EDGES.map(([a, b, t, pr]) => { const A = G_NODES[a], B = G_NODES[b]; return <g key={a + b}><line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={onPath(a, b) ? 'var(--bad)' : 'var(--muted)'} strokeWidth={onPath(a, b) ? 3 : 1.2} /><text x={(A.x + B.x) / 2} y={(A.y + B.y) / 2 - 4} fontSize="9" textAnchor="middle" fill="var(--accent)">{t}{pr ? ` {${pr}}` : ''}</text></g> })}
          {Object.entries(G_NODES).map(([n, d]) => <g key={n}><rect x={d.x - 36} y={d.y - 16} width={72} height={32} rx={d.label === 'Group' ? 4 : 16} fill={path?.includes(n) ? 'var(--hl-soft)' : 'var(--surface)'} stroke="var(--ink-2)" /><text x={d.x} y={d.y - 2} fontSize="11" fontWeight="700" textAnchor="middle" fill="var(--ink)">{n}</text><text x={d.x} y={d.y + 10} fontSize="8" textAnchor="middle" fill="var(--muted)">:{d.label} {d.props.split(',')[0]}</text></g>)}
        </svg>
      </div>
      <div className="q-explain">{path ? <>Shortest path ({path.length - 1} hop{path.length === 2 ? '' : 's'}): <b>{path.join(' → ')}</b>. A graph database follows adjacent relationships; in SQL this would be {path.length - 1} self-join{path.length === 2 ? '' : 's'}.</> : 'No path without passing through a group.'}</div>
    </div>
  )
}

const SCENARIOS: { s: string; a: string; why: string }[] = [
  { s: 'Store shopping-cart sessions that expire after 30 minutes, looked up by session id.', a: 'Key-value', why: 'Exact-key lookups plus TTL expiry.' },
  { s: 'A product catalogue where cameras, shirts and books have very different attributes.', a: 'Document', why: 'Flexible, evolving aggregates per product.' },
  { s: 'Millions of sensor readings per hour, queried as “sensor X between 9:00 and 10:00”.', a: 'Wide-column', why: 'Partition by sensor, cluster by timestamp; scalable writes and range reads.' },
  { s: 'Detect rings of accounts moving money in circles.', a: 'Graph', why: 'Path and pattern queries over relationships.' },
  { s: 'Movie recommendations from “people who liked what your friends liked”.', a: 'Graph', why: 'Multi-hop traversal over social and preference edges.' },
  { s: 'A page-view counter incremented thousands of times a second.', a: 'Key-value', why: 'Atomic counters avoid read-modify-write races.' },
  { s: 'User profiles read and updated as one unit, with optional fields that keep changing.', a: 'Document', why: 'The document boundary matches the aggregate.' },
  { s: 'An activity log per user, always read as the latest 50 events for one user.', a: 'Wide-column', why: 'Partition by user, cluster by time descending.' },
]
export function ModelPicker() {
  const [i, setI] = useState(0)
  const [pick, setPick] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const sc = SCENARIOS[i % SCENARIOS.length]
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small"><b>Pick the model</b><span className="spacer" /><span className="tag">{score} right</span></div>
      <p style={{ margin: '8px 0' }}>{sc.s}</p>
      <div className="row">{['Document', 'Key-value', 'Wide-column', 'Graph'].map((m) => <button key={m} className={'btn sm' + (pick === m ? (m === sc.a ? ' ok' : ' danger') : '')} disabled={pick !== null} onClick={() => { setPick(m); const ok = m === sc.a; if (ok) setScore((x) => x + 1); recordAnswer('mp-' + (i % SCENARIOS.length), 'r10', 'tradeoffs', ok) }}>{m}</button>)}</div>
      {pick && <div className="q-explain">{pick === sc.a ? '✔ ' : `✖ Best fit: ${sc.a}. `}{sc.why} <button className="btn sm" onClick={() => { setI(i + 1); setPick(null) }}>Next →</button></div>}
    </div>
  )
}

export function JsonPlayground() {
  const [tab, setTab] = useState<'path' | 'find' | 'kv' | 'graph' | 'model'>('path')
  return (
    <div>
      <div className="stage-tabs">
        {([['path', 'SQL/JSON paths'], ['find', 'Document find()'], ['kv', 'Key-value console'], ['graph', 'Graph traversal'], ['model', 'Pick the model']] as const).map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'path' && <JsonPathTab />}
      {tab === 'find' && <FindTab />}
      {tab === 'kv' && <KvConsole />}
      {tab === 'graph' && <GraphPath />}
      {tab === 'model' && <ModelPicker />}
    </div>
  )
}
