import { CONTENT } from '../content'
import { REALMS, realmById } from '../content/realms'
import type { RealmId } from '../content/types'
import { Md } from '../engine/md'
import { highlight } from '../ui/CodeEditor'

const hooks = { code: (lang: string, code: string) => <pre className="code"><code dangerouslySetInnerHTML={{ __html: highlight(code, lang.split(':')[0]) }} /></pre> }

export function Codex({ realm }: { realm?: string }) {
  const r = realm ? realmById(realm) : undefined
  const list = r ? [r] : REALMS.filter((x) => CONTENT[x.id].codex)
  return (
    <div className="page narrow">
      <div className="crumbs no-print"><a href="#/">Map</a><span>›</span><a href="#/codex">Revision codices</a>{r && <><span>›</span><span>Realm {r.n}</span></>}</div>
      <div className="row no-print">
        <h1 className="title">📜 {r ? `Codex: ${r.title}` : 'Revision codices'}</h1><span className="spacer" />
        <button className="btn" onClick={() => window.print()}>Print / save as PDF</button>
      </div>
      {!r && <p className="lede no-print">One-page summaries of every realm: the definitions, rules, formulas and syntax most likely to earn marks. Open one or print them all.</p>}
      {!r && <div className="row no-print" style={{ marginBottom: 16 }}>{REALMS.map((x) => <a key={x.id} className="btn sm" href={`#/codex/${x.id}`}>{x.icon} R{x.n}</a>)}</div>}
      {list.map((x) => (
        <section key={x.id} className="card" style={{ marginBottom: 16, borderTop: `3px solid ${x.color}` }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--f-display)', fontSize: '1.05rem' }}>Realm {x.n}: {x.title}</h2>
          {CONTENT[x.id as RealmId].codex ? <Md src={CONTENT[x.id as RealmId].codex} hooks={hooks} /> : <p className="muted">Codex coming soon.</p>}
        </section>
      ))}
    </div>
  )
}
