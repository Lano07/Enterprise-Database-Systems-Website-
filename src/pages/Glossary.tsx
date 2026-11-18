import { useState } from 'react'
import { ALL_TERMS } from '../content'
import { realmById } from '../content/realms'

export function Glossary() {
  const [q, setQ] = useState('')
  const list = ALL_TERMS.filter((t) => !q || (t.term + ' ' + t.def).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="page narrow">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><span>Glossary</span></div>
      <h1 className="title">Glossary</h1>
      <p className="lede">{ALL_TERMS.length} terms from the COMP2605 lectures, each linked to the realm that teaches it.</p>
      <input type="search" placeholder="Search terms…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', marginBottom: 12 }} aria-label="Search glossary" />
      <div className="tbl-wrap"><table className="tbl"><tbody>
        {list.map((t, i) => {
          const r = realmById(t.realm)
          return <tr key={i}><td style={{ width: '28%' }}><b>{t.term}</b><div><a className="small" href={`#/realm/${t.realm}`} style={{ color: r?.color }}>R{r?.n} {r?.short}</a></div></td><td>{t.def}</td></tr>
        })}
      </tbody></table></div>
      {!list.length && <div className="empty">No terms match “{q}”.</div>}
    </div>
  )
}
