import { TOOL_META } from '../tools/registry'
import { realmById } from '../content/realms'
import { useSave } from '../game/store'
import { Forge } from '../tools/Forge'
import { Optimizer } from '../tools/Optimizer'
import { Concurrency } from '../tools/Concurrency'
import { BTreeTool } from '../tools/BTree'
import { HashTool } from '../tools/Hashing'
import { ErdForge } from '../tools/Erd'

export function ToolsIndex() {
  const s = useSave()
  return (
    <div className="page">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><span>Simulators</span></div>
      <h1 className="title">Simulators &amp; mini-games</h1>
      <p className="lede">Hands-on machines for the parts of COMP2605 that are easier to understand by doing: normalizing, costing joins, growing B+ trees, hashing and defusing deadlocks.</p>
      <div className="grid">
        {Object.values(TOOL_META).map((t) => {
          const r = realmById(t.realm)
          return (
            <a key={t.id} className="card" href={t.href} style={{ borderTop: `3px solid ${r?.color}` }}>
              <h3>{t.icon} {t.name}</h3>
              <p>{t.desc}</p>
              <div className="small muted">Realm {r?.n}: {r?.short}{t.stages ? ` · ${s.tools[t.id] || 0}/${t.stages} stages cleared` : ''}</div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

export function ToolPage({ id, stage }: { id: string; stage?: string }) {
  const t = TOOL_META[id]
  const r = t ? realmById(t.realm) : undefined
  const body = (() => {
    switch (id) {
      case 'forge': return <Forge stage={stage} />
      case 'optimizer': return <Optimizer stage={stage} />
      case 'concurrency': return <Concurrency stage={stage} />
      case 'btree': return <BTreeTool />
      case 'hash': return <HashTool />
      case 'erd': return <ErdForge stage={stage} />
      default: return <p>Unknown simulator.</p>
    }
  })()
  return (
    <div className="page wide">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><a href="#/tools">Simulators</a>{r && <><span>›</span><a href={`#/realm/${r.id}`}>Realm {r.n}</a></>}</div>
      <h1 className="title">{t?.icon} {t?.name}</h1>
      {body}
    </div>
  )
}
