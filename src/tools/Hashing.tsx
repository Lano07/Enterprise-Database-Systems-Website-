import { useState } from 'react'
import { emit, recordAnswer, toolLevel, useSave } from '../game/store'

type Method = 'chaining' | 'linear' | 'double'
type Key = string | number

export const charSum = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0)
const h1 = (k: Key, n: number) => (typeof k === 'number' ? ((k % n) + n) % n : charSum(k) % n)
const h2 = (k: Key) => { const v = typeof k === 'number' ? k : charSum(k); return 7 - (v % 7) } // step for double hashing (never 0)

export interface HashState { n: number; method: Method; slots: Key[][] }
export interface Trace { visited: number[]; comparisons: number; found: boolean; slot: number; note: string }

export function hashInsert(st: HashState, k: Key): Trace {
  const start = h1(k, st.n)
  if (st.method === 'chaining') {
    const c = st.slots[start].length
    st.slots[start] = [...st.slots[start], k]
    return { visited: [start], comparisons: c, found: true, slot: start, note: c ? `h(${k}) = ${start}: collision, so append to the chain after ${st.slots[start].slice(0, -1).join(', ')}.` : `h(${k}) = ${start}: empty bucket, so store it there.` }
  }
  const step = st.method === 'linear' ? 1 : h2(k)
  const visited: number[] = []
  for (let i = 0; i < st.n; i++) {
    const s = (start + i * step) % st.n
    visited.push(s)
    if (!st.slots[s].length) {
      st.slots[s] = [k]
      return { visited, comparisons: i, found: true, slot: s, note: i ? `h(${k}) = ${start} is occupied; ${st.method === 'linear' ? 'probe the next slot' : `probe with step h2(${k}) = ${step}`} → slot ${s}.` : `h(${k}) = ${start}: empty slot, so store it there.` }
    }
  }
  return { visited, comparisons: st.n, found: false, slot: -1, note: 'The table is full. It must be resized and every entry remapped.' }
}

export function hashSearch(st: HashState, k: Key): Trace {
  const start = h1(k, st.n)
  if (st.method === 'chaining') {
    const chain = st.slots[start]
    let c = 0
    for (const x of chain) { c++; if (x === k) return { visited: [start], comparisons: c, found: true, slot: start, note: `h(${k}) = ${start}; compared ${chain.slice(0, c).join(', ')}; found after ${c} comparison${c === 1 ? '' : 's'}.` } }
    return { visited: [start], comparisons: c, found: false, slot: start, note: `h(${k}) = ${start}; compared ${chain.join(', ') || 'nothing (empty bucket)'}; not found. A non-empty bucket is not proof the key exists.` }
  }
  const step = st.method === 'linear' ? 1 : h2(k)
  const visited: number[] = []
  let c = 0
  for (let i = 0; i < st.n; i++) {
    const s = (start + i * step) % st.n
    visited.push(s)
    if (!st.slots[s].length) return { visited, comparisons: c, found: false, slot: s, note: `Followed the probe sequence ${visited.join(' → ')} and reached an empty slot: not found.` }
    c++
    if (st.slots[s][0] === k) return { visited, comparisons: c, found: true, slot: s, note: `Probe sequence ${visited.join(' → ')}: found after ${c} comparison${c === 1 ? '' : 's'}.` }
  }
  return { visited, comparisons: c, found: false, slot: -1, note: 'Probed every slot: not found.' }
}

export function HashTable({ st, hl = [], hit }: { st: HashState; hl?: number[]; hit?: number }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {st.slots.map((b, i) => (
        <div key={i} className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <span className="mono small" style={{ width: 26, textAlign: 'right', color: hl.includes(i) ? 'var(--accent)' : 'var(--muted)', fontWeight: hl.includes(i) ? 700 : 400 }}>{i}</span>
          <div style={{ display: 'flex', gap: 4, minHeight: 28, flex: 1, padding: 3, borderRadius: 6, border: '1px solid ' + (hl.includes(i) ? 'var(--accent)' : 'var(--line)'), background: i === hit ? 'var(--ok-soft)' : hl.includes(i) ? 'var(--accent-soft)' : 'var(--surface)' }}>
            {b.length ? b.map((k, j) => <span key={j} className="tag" style={{ fontFamily: 'var(--f-code)' }}>{j > 0 && '→ '}{String(k)}</span>) : <span className="muted small">—</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

const CHALLENGES: { q: string; options: string[]; answer: number; setup: (s: HashState) => void; n: number; method: Method; explain: string }[] = [
  { q: 'Ten slots, h(k) = k mod 10. In which slot is Student ID 105 stored?', options: ['0', '1', '5', '10'], answer: 2, n: 10, method: 'chaining', setup: (s) => { hashInsert(s, 105) }, explain: '105 mod 10 = 5; retrieval recomputes h(105) = 5 and compares the stored ID.' },
  { q: 'String keys, h = (sum of character codes) mod 10, chaining. After inserting Alice (478), Bob (275) and Charlie (696), where does David (488) go?', options: ['Bucket 5', 'Bucket 6', 'Bucket 8, after Alice', 'Bucket 8, replacing Alice'], answer: 2, n: 10, method: 'chaining', setup: (s) => { ['Alice', 'Bob', 'Charlie', 'David'].forEach((k) => hashInsert(s, k)) }, explain: '488 mod 10 = 8 collides with Alice; chaining appends David rather than replacing Alice.' },
  { q: 'Same table. How many stored-key comparisons does get("Eve") (sum 288) make?', options: ['0', '1', '2', '3'], answer: 2, n: 10, method: 'chaining', setup: (s) => { ['Alice', 'Bob', 'Charlie', 'David'].forEach((k) => hashInsert(s, k)) }, explain: 'Eve hashes to 8; compare Alice, then David; no match, so None after 2 comparisons.' },
]

export function HashTool() {
  const s = useSave()
  const cleared = s.tools['hash'] || 0
  const [ci, setCi] = useState(Math.min(cleared, CHALLENGES.length - 1))
  const [sel, setSel] = useState<number | null>(null)
  const ch = CHALLENGES[ci]
  const [demo, setDemo] = useState<HashState>(() => { const st: HashState = { n: ch.n, method: ch.method, slots: Array.from({ length: ch.n }, () => []) }; return st })
  const [n, setN] = useState(10)
  const [method, setMethod] = useState<Method>('chaining')
  const [free, setFree] = useState<HashState>({ n: 10, method: 'chaining', slots: Array.from({ length: 10 }, () => []) })
  const [key, setKey] = useState('')
  const [trace, setTrace] = useState<Trace | null>(null)
  const parseKey = (v: string): Key => (/^-?\d+$/.test(v.trim()) ? Number(v) : v.trim())

  const choose = (i: number) => {
    setSel(i)
    const ok = i === ch.answer
    recordAnswer(`hash-ch-${ci}`, 'r6', ci === 0 ? 'hashing' : 'collisions', ok, { firstTry: sel === null })
    if (ok) {
      const st: HashState = { n: ch.n, method: ch.method, slots: Array.from({ length: ch.n }, () => []) }
      ch.setup(st)
      setDemo(st)
      toolLevel('hash', ci + 1, 40)
      if (ci + 1 === CHALLENGES.length) emit({ type: 'toast', text: '#️⃣ Hash Lab cleared!', tone: 'ok' })
    }
  }
  const reconfigure = (nn: number, mm: Method) => { setN(nn); setMethod(mm); setFree({ n: nn, method: mm, slots: Array.from({ length: nn }, () => []) }); setTrace(null) }
  const doInsert = () => { if (!key.trim()) return; const st = { ...free, slots: free.slots.map((b) => [...b]) }; const t = hashInsert(st, parseKey(key)); setFree(st); setTrace(t); setKey('') }
  const doSearch = () => { if (!key.trim()) return; setTrace(hashSearch(free, parseKey(key))) }

  return (
    <div>
      <p className="lede">Hash keys into buckets, handle collisions three ways, and count the stored-key comparisons every lookup makes.</p>
      <div className="tool-grid">
        <div className="panel">
          <div className="stage-tabs">{CHALLENGES.map((_, k) => <button key={k} className={(k === ci ? 'on ' : '') + (k < cleared ? 'done' : '')} disabled={k > cleared && !s.settings.freeRoam} onClick={() => { setCi(k); setSel(null); setDemo({ n: CHALLENGES[k].n, method: CHALLENGES[k].method, slots: Array.from({ length: CHALLENGES[k].n }, () => []) }) }}>Challenge {k + 1}</button>)}</div>
          <div className="q-text">{ch.q}</div>
          <div className="opts">{ch.options.map((o, i) => <button key={o} className={'opt' + (sel === i ? (i === ch.answer ? ' good' : ' badc') : '')} onClick={() => choose(i)} disabled={sel === ch.answer}>{o}</button>)}</div>
          {sel === ch.answer && <div className="q-explain">✔ {ch.explain}{ci + 1 < CHALLENGES.length && <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => { setCi(ci + 1); setSel(null) }}>Next →</button>}</div>}
          <div style={{ marginTop: 10 }}><HashTable st={demo} /></div>
        </div>
        <div className="panel">
          <h3>🧪 Free play</h3>
          <div className="row" style={{ marginBottom: 8 }}>
            <label className="small">buckets <input type="number" min={3} max={23} value={n} onChange={(e) => reconfigure(Math.max(3, Math.min(23, +e.target.value || 10)), method)} style={{ width: 64 }} /></label>
            <select value={method} onChange={(e) => reconfigure(n, e.target.value as Method)} aria-label="Collision method">
              <option value="chaining">Chaining</option><option value="linear">Open addressing (linear probe)</option><option value="double">Double hashing</option>
            </select>
          </div>
          <div className="row" style={{ marginBottom: 8 }}>
            <input type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="105 or Alice" style={{ width: 130 }} onKeyDown={(e) => e.key === 'Enter' && doInsert()} aria-label="Key" />
            <button className="btn sm primary" onClick={doInsert}>Insert</button>
            <button className="btn sm" onClick={doSearch}>Lookup</button>
          </div>
          <div className="small muted" style={{ marginBottom: 6 }}>Numbers use h(k) = k mod {n}; text uses (sum of character codes) mod {n}{method === 'double' ? '; double-hash step h2 = 7 − (value mod 7)' : ''}.</div>
          <HashTable st={free} hl={trace?.visited} hit={trace?.found ? trace.slot : undefined} />
          {trace && <div className="q-explain">{trace.note} <span className="tag">{trace.comparisons} comparison{trace.comparisons === 1 ? '' : 's'}</span></div>}
        </div>
      </div>
    </div>
  )
}

/** Lesson widget: the lecture's string-key table with chaining, plus lookups. */
export function HashMini() {
  const make = () => { const st: HashState = { n: 10, method: 'chaining', slots: Array.from({ length: 10 }, () => []) }; ['Alice', 'Bob', 'Charlie', 'David'].forEach((k) => hashInsert(st, k)); return st }
  const [st, setSt] = useState<HashState>(make)
  const [key, setKey] = useState('Eve')
  const [trace, setTrace] = useState<Trace | null>(null)
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small" style={{ marginBottom: 6 }}><b>The lecture’s chained table: h = (sum of char codes) mod 10</b><span className="spacer" /><button className="btn sm" onClick={() => { setSt(make()); setTrace(null) }}>Reset</button></div>
      <div className="row" style={{ marginBottom: 6 }}>
        <input type="text" value={key} onChange={(e) => setKey(e.target.value)} style={{ width: 120 }} aria-label="Key" />
        <span className="small muted">sum = {charSum(key)}, bucket {charSum(key) % 10}</span>
        <button className="btn sm primary" onClick={() => setTrace(hashSearch(st, key))}>get()</button>
        <button className="btn sm" onClick={() => { const n = { ...st, slots: st.slots.map((b) => [...b]) }; setTrace(hashInsert(n, key)); setSt(n) }}>insert()</button>
      </div>
      <HashTable st={st} hl={trace?.visited} hit={trace?.found ? trace.slot : undefined} />
      {trace && <div className="q-explain">{trace.note} <span className="tag">{trace.comparisons} comparison{trace.comparisons === 1 ? '' : 's'}</span></div>}
    </div>
  )
}
