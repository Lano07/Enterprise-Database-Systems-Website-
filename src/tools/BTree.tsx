import { useMemo, useState } from 'react'
import { afterInsert8, BPlusTree, lectureTree, type BNode, type Snap } from '../engine/bptree'
import { emit, recordAnswer, toolLevel, useSave } from '../game/store'

// ---------------- SVG view ----------------
export function BptView({ root, m, hl = [], bad = [], onNode, picked = [] }: { root: BNode; m: number; hl?: number[]; bad?: number[]; onNode?: (n: BNode) => void; picked?: number[] }) {
  const slot = 30, pad = 4
  const W = m * slot + pad * 2, H = 28, gapX = 14, gapY = 64
  const pos = new Map<number, { x: number; y: number }>()
  const levels: BNode[][] = []
  const walk = (n: BNode, d: number) => { (levels[d] ||= []).push(n); n.kids.forEach((k) => walk(k, d + 1)) }
  walk(root, 0)
  const leaves = levels[levels.length - 1]
  leaves.forEach((n, i) => pos.set(n.id, { x: 10 + i * (W + gapX), y: 10 + (levels.length - 1) * gapY }))
  for (let d = levels.length - 2; d >= 0; d--) levels[d].forEach((n) => {
    const a = pos.get(n.kids[0].id)!, b = pos.get(n.kids[n.kids.length - 1].id)!
    pos.set(n.id, { x: (a.x + b.x) / 2, y: 10 + d * gapY })
  })
  const width = Math.max(10 + leaves.length * (W + gapX), W + 20)
  const height = 20 + (levels.length - 1) * gapY + H
  return (
    <div className="svg-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: Math.min(width, 640), display: 'block' }} role="img" aria-label="B+ tree">
        {levels.flat().filter((n) => !n.leaf).map((n) => n.kids.map((k, i) => {
          const p = pos.get(n.id)!, c = pos.get(k.id)!
          const px = p.x + pad + (i * (m * slot)) / Math.max(1, n.kids.length - 1)
          return <line key={n.id + '-' + k.id} x1={n.kids.length === 1 ? p.x + W / 2 : px} y1={p.y + H} x2={c.x + W / 2} y2={c.y} stroke={hl.includes(k.id) && hl.includes(n.id) ? 'var(--accent)' : 'var(--muted)'} strokeWidth={hl.includes(k.id) && hl.includes(n.id) ? 2.5 : 1} />
        }))}
        {leaves.slice(0, -1).map((n, i) => { const a = pos.get(n.id)!, b = pos.get(leaves[i + 1].id)!; return <line key={'l' + n.id} x1={a.x + W} y1={a.y + H / 2} x2={b.x} y2={b.y + H / 2} stroke="var(--muted)" strokeDasharray="3 3" /> })}
        {levels.flat().map((n) => {
          const p = pos.get(n.id)!
          const isBad = bad.includes(n.id), isHl = hl.includes(n.id), isPick = picked.includes(n.id)
          const slots = Math.max(m, n.keys.length)
          const w = slots * slot + pad * 2
          return (
            <g key={n.id} onClick={() => onNode?.(n)} style={{ cursor: onNode ? 'pointer' : undefined }}>
              <rect x={p.x - (w - W) / 2} y={p.y} width={w} height={H} rx={5} fill={isPick ? 'var(--accent-soft)' : n.leaf ? 'var(--ok-soft)' : 'var(--surface)'} stroke={isBad ? 'var(--bad)' : isHl ? 'var(--accent)' : 'var(--ink-2)'} strokeWidth={isBad || isHl ? 2.5 : 1} />
              {Array.from({ length: slots }, (_, i) => (
                <g key={i}>
                  {i > 0 && <line x1={p.x - (w - W) / 2 + pad + i * slot} y1={p.y + 4} x2={p.x - (w - W) / 2 + pad + i * slot} y2={p.y + H - 4} stroke="var(--line)" />}
                  <text x={p.x - (w - W) / 2 + pad + i * slot + slot / 2} y={p.y + H / 2 + 4} textAnchor="middle" fontSize="12" fontWeight={n.leaf ? 400 : 700} fill={i >= m ? 'var(--bad)' : 'var(--ink)'}>{n.keys[i] ?? ''}</text>
                </g>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function Stepper({ snaps, m }: { snaps: Snap[]; m: number }) {
  const [i, setI] = useState(snaps.length - 1)
  const s = snaps[Math.min(i, snaps.length - 1)]
  if (!s) return null
  return (
    <div>
      <div className="row small" style={{ marginBottom: 6 }}>
        <button className="btn sm" disabled={i <= 0} onClick={() => setI(i - 1)}>◀</button>
        <span className="mono">step {Math.min(i, snaps.length - 1) + 1}/{snaps.length}</span>
        <button className="btn sm" disabled={i >= snaps.length - 1} onClick={() => setI(i + 1)}>▶</button>
        <button className="btn sm ghost" onClick={() => setI(0)}>⏮ first</button>
      </div>
      <BptView root={s.root} m={m} hl={s.hl} bad={s.bad} />
      <div className="q-explain" style={{ background: s.kind === 'warn' ? 'var(--warn-soft)' : s.kind === 'ok' ? 'var(--ok-soft)' : undefined }}>{s.caption}</div>
    </div>
  )
}

// ---------------- the Grove ----------------
const STAGES = ['Trace a search', 'Insert 8 (d = 2)', 'Build from empty (max 3 keys)', 'Delete 22, 20, 24'] as const

export function BTreeTool() {
  const s = useSave()
  const cleared = s.tools['btree'] || 0
  const [st, setSt] = useState<number>(Math.min(cleared, 3))
  const [free, setFree] = useState(false)
  return (
    <div>
      <p className="lede">Grow and prune B+ trees using the lecture’s rules. Every step shows the page that changes, and overflows and underflows are outlined in red.</p>
      <div className="stage-tabs">
        {STAGES.map((t, k) => <button key={t} className={(!free && k === st ? 'on ' : '') + (k < cleared ? 'done' : '')} disabled={k > cleared && !s.settings.freeRoam} onClick={() => { setFree(false); setSt(k) }}>{k + 1}. {t}</button>)}
        <button className={free ? 'on' : ''} onClick={() => setFree(true)}>🧪 Free play</button>
      </div>
      {free ? <FreePlay /> : st === 0 ? <SearchStage key="s0" /> : st === 1 ? <InsertStage key="s1" /> : st === 2 ? <BuildStage key="s2" /> : <DeleteStage key="s3" />}
    </div>
  )
}

function SearchStage() {
  const root = useMemo(() => afterInsert8(), [])
  const target = 27
  const truth = useMemo(() => { const t = new BPlusTree(4, root); return t.path(target).nodes.map((n) => n.id) }, [root])
  const [picked, setPicked] = useState<number[]>([])
  const [msg, setMsg] = useState('')
  const click = (n: BNode) => {
    const next = [...picked, n.id]
    const ok = truth[picked.length] === n.id
    if (!ok) { setMsg(`✖ Page [${n.keys.join(' | ')}] is not next on the path. Compare ${target} with the separators (equality goes right).`); recordAnswer('bpt-search-27', 'r6', 'bpt-search', false); return }
    setPicked(next)
    if (next.length === truth.length) { setMsg(`✔ Found ${target} after reading ${truth.length} pages (root → internal → leaf). With the root cached it would be ${truth.length - 1}.`); recordAnswer('bpt-search-27', 'r6', 'bpt-search', true); toolLevel('btree', 1, 40) }
    else setMsg(`✔ Good. Now choose the child of [${n.keys.join(' | ')}] whose interval contains ${target}.`)
  }
  return (
    <div className="panel">
      <h3>Click the pages a search for <span className="mono">{target}</span> visits, from the root down.</h3>
      <BptView root={root} m={4} onNode={click} picked={picked} />
      {msg && <div className="q-explain">{msg}</div>}
      <button className="btn sm" style={{ marginTop: 8 }} onClick={() => { setPicked([]); setMsg('') }}>Reset</button>
    </div>
  )
}

function Predict({ q, options, answer, onRight, id, topic }: { q: string; options: string[]; answer: number; onRight: () => void; id: string; topic: string }) {
  const [sel, setSel] = useState<number | null>(null)
  return (
    <div className="q-explain" style={{ marginBottom: 8 }}>
      <b>Predict:</b> {q}
      <div className="row" style={{ marginTop: 6 }}>
        {options.map((o, i) => (
          <button key={o} className={'btn sm' + (sel === i ? (i === answer ? ' ok' : ' danger') : '')} disabled={sel !== null && sel === answer}
            onClick={() => { setSel(i); recordAnswer(id, 'r6', topic, i === answer, { firstTry: sel === null }); if (i === answer) onRight() }}>{o}</button>
        ))}
        {sel !== null && sel !== answer && <span className="small">Try again.</span>}
      </div>
    </div>
  )
}

function InsertStage() {
  const [p1, setP1] = useState(false)
  const [p2, setP2] = useState(false)
  const snaps = useMemo(() => { const t = new BPlusTree(4, lectureTree()); t.insert(8); return t.snaps }, [])
  const done = p1 && p2
  return (
    <div className="panel">
      <h3>Insert 8 into the lecture tree (d = 2, so at most 4 entries per node)</h3>
      {!done && <BptView root={lectureTree()} m={4} />}
      <Predict id="bpt-ins8-copy" topic="bpt-insert" q="The leaf [2 3 5 7] overflows. After the split, which key is copied up into the parent?" options={['3', '5', '7', '8']} answer={1} onRight={() => setP1(true)} />
      {p1 && <Predict id="bpt-ins8-root" topic="bpt-insert" q="The parent becomes [5 13 17 24 30] and overflows. Which key is pushed up into a new root?" options={['5', '13', '17', '24']} answer={2} onRight={() => { setP2(true); toolLevel('btree', 2, 50); emit({ type: 'toast', text: '🌳 Tree grown to 3 levels!', tone: 'ok' }) }} />}
      {done && <Stepper snaps={snaps} m={4} />}
    </div>
  )
}

function BuildStage() {
  const seq = [1, 3, 5, 7, 9, 2, 4, 6, 8, 10]
  const [t] = useState(() => new BPlusTree(3))
  const [i, setI] = useState(0)
  const [snaps, setSnaps] = useState<Snap[]>([])
  const [ask, setAsk] = useState<null | boolean>(null)
  const [score, setScore] = useState(0)
  const willSplit = () => { const probe = new BPlusTree(3, t.root); probe.insert(seq[i]); return probe.snaps.some((s) => s.kind === 'warn') }
  const answer = (guess: boolean) => {
    const truth = willSplit()
    const ok = guess === truth
    recordAnswer(`bpt-build-${seq[i]}`, 'r6', 'bpt-insert', ok, { base: 8 })
    if (ok) setScore((x) => x + 1)
    setAsk(truth)
    t.insert(seq[i])
    setSnaps(t.snaps)
    const n = i + 1
    setI(n)
    if (n === seq.length) { toolLevel('btree', 3, 50) }
  }
  return (
    <div className="panel">
      <h3>Worked example: max 3 keys per node. Insert {seq.join(', ')}</h3>
      {i < seq.length ? (
        <div className="row" style={{ margin: '6px 0' }}>
          <span>Next key: <b className="mono">{seq[i]}</b>. Will inserting it cause a split?</span>
          <button className="btn sm" onClick={() => answer(true)}>Yes, a split</button>
          <button className="btn sm" onClick={() => answer(false)}>No, it fits</button>
        </div>
      ) : <div className="q-explain" style={{ background: 'var(--ok-soft)' }}>✔ Built! Final root: [{t.root.keys.join(' | ')}], height {t.height()}. You predicted {score}/{seq.length} splits correctly.</div>}
      {ask !== null && i > 0 && <div className="small muted">Inserting {seq[i - 1]} {ask ? 'caused a split' : 'fit without a split'}.</div>}
      {snaps.length ? <Stepper key={i} snaps={snaps} m={3} /> : <div className="empty">Empty tree: the root is also a leaf.</div>}
    </div>
  )
}

function DeleteStage() {
  const seq: [number, number, string][] = [[22, 0, 'none'], [20, 1, 'redistribute'], [24, 2, 'merge']]
  const [t] = useState(() => new BPlusTree(4, afterInsert8()))
  const [i, setI] = useState(0)
  const [snaps, setSnaps] = useState<Snap[]>([])
  const opts = ['No repair needed', 'Redistribute from a sibling', 'Merge with a sibling']
  return (
    <div className="panel">
      <h3>Continuous deletion sequence from the tree after inserting 8 (d = 2)</h3>
      {i < seq.length ? (
        <Predict key={i} id={`bpt-del-${seq[i][0]}`} topic="bpt-delete" q={`Delete ${seq[i][0]}. What repair will the leaf need?`} options={opts} answer={seq[i][1]}
          onRight={() => { t.delete(seq[i][0]); setSnaps(t.snaps); const n = i + 1; setI(n); if (n === seq.length) { toolLevel('btree', 4, 60); emit({ type: 'toast', text: '🌳 Deletion sequence mastered!', tone: 'ok' }) } }} />
      ) : <div className="q-explain" style={{ background: 'var(--ok-soft)' }}>✔ Sequence complete. Root [{t.root.keys.join(' | ')}], {t.leaves().length} leaves, {t.height()} levels, matching the lecture’s final state.</div>}
      {snaps.length ? <Stepper key={i} snaps={snaps} m={4} /> : <BptView root={t.root} m={4} />}
    </div>
  )
}

function FreePlay() {
  const [m, setM] = useState(4)
  const [t, setT] = useState(() => new BPlusTree(4, lectureTree()))
  const [snaps, setSnaps] = useState<Snap[]>([])
  const [key, setKey] = useState('')
  const [ver, setVer] = useState(0)
  const act = (op: 'insert' | 'delete' | 'search') => {
    const k = Number(key)
    if (!Number.isFinite(k) || key.trim() === '') return
    t[op](k)
    setSnaps(t.snaps)
    setVer((v) => v + 1)
  }
  const reset = (mm: number, lecture: boolean) => { setM(mm); setT(new BPlusTree(mm, lecture && mm === 4 ? lectureTree() : undefined)); setSnaps([]); setVer((v) => v + 1) }
  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 8 }}>
        <label className="small">max keys per node <select value={m} onChange={(e) => reset(+e.target.value, false)}>{[3, 4, 5, 6].map((x) => <option key={x} value={x}>{x}{x % 2 === 0 ? ` (d = ${x / 2})` : ''}</option>)}</select></label>
        <input type="number" value={key} onChange={(e) => setKey(e.target.value)} placeholder="key" style={{ width: 90 }} onKeyDown={(e) => e.key === 'Enter' && act('insert')} aria-label="Key" />
        <button className="btn sm primary" onClick={() => act('insert')}>Insert</button>
        <button className="btn sm" onClick={() => act('delete')}>Delete</button>
        <button className="btn sm" onClick={() => act('search')}>Search</button>
        <span className="spacer" />
        <button className="btn sm" onClick={() => reset(4, true)}>Lecture tree</button>
        <button className="btn sm" onClick={() => reset(m, false)}>Empty</button>
      </div>
      <div className="small muted" style={{ marginBottom: 6 }}>Leaves {t.leaves().length} · height {t.height()} · leaf minimum {t.leafMin} · internal minimum {t.innerMin}</div>
      {snaps.length ? <Stepper key={ver} snaps={snaps} m={m} /> : <BptView root={t.root} m={m} />}
    </div>
  )
}

/** Lesson widget: search any key in the lecture tree (after inserting 8) and step through the pages. */
export function BptSearchWidget() {
  const root = useMemo(() => afterInsert8(), [])
  const [key, setKey] = useState('27')
  const [snaps, setSnaps] = useState<Snap[]>([])
  const [ver, setVer] = useState(0)
  const run = () => { const k = Number(key); if (!Number.isFinite(k)) return; const t = new BPlusTree(4, root); t.search(k); setSnaps(t.snaps); setVer((v) => v + 1) }
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small" style={{ marginBottom: 6 }}><b>Search the lecture tree (d = 2)</b>
        <input type="number" value={key} onChange={(e) => setKey(e.target.value)} style={{ width: 80 }} onKeyDown={(e) => e.key === 'Enter' && run()} aria-label="Search key" />
        <button className="btn sm primary" onClick={run}>Search</button><span className="muted">try 27, 24, 17 or 40</span></div>
      {snaps.length ? <Stepper key={ver} snaps={snaps} m={4} /> : <BptView root={root} m={4} />}
    </div>
  )
}
export function BptInsertWidget() { return <div style={{ margin: '14px 0' }}><InsertStage /></div> }
export function BptDeleteWidget() { return <div style={{ margin: '14px 0' }}><DeleteStage /></div> }
