import { useState } from 'react'
import { ALL_WRITTEN } from '../content'
import { REALMS, realmById } from '../content/realms'
import { inline } from '../engine/md'
import { markWritten, useSave } from '../game/store'

export function WrittenPage({ id, realm }: { id?: string; realm?: string }) {
  const s = useSave()
  const w = id ? ALL_WRITTEN.find((x) => x.id === id) : undefined
  if (w) return <WrittenQ key={w.id} id={w.id} />
  const list = ALL_WRITTEN.filter((x) => !realm || x.realm === realm)
  return (
    <div className="page narrow">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><span>Written answers</span></div>
      <h1 className="title">✍️ Written answers</h1>
      <p className="lede">Exam-style long answers. Write your answer first (aim for the marks shown), then reveal the model answer and tick the marking points you genuinely hit.</p>
      <div className="row" style={{ marginBottom: 12 }}>
        <a className={'btn sm' + (!realm ? ' primary' : '')} href="#/written">All</a>
        {REALMS.filter((r) => ALL_WRITTEN.some((x) => x.realm === r.id)).map((r) => <a key={r.id} className={'btn sm' + (realm === r.id ? ' primary' : '')} href={`#/written?realm=${r.id}`}>R{r.n}</a>)}
      </div>
      <div className="quest-list">
        {list.map((x) => (
          <a key={x.id} className="quest" href={`#/written/${x.id}`}>
            <span className="qi">{s.written[x.id] ? '✅' : '✍️'}</span>
            <span className="qt"><b>{x.q.length > 120 ? x.q.slice(0, 118) + '…' : x.q}</b><span>{realmById(x.realm)?.short} · {x.marks} marks{s.written[x.id] ? ` · last: ${s.written[x.id].got}/${s.written[x.id].max}` : ''}</span></span>
          </a>
        ))}
      </div>
    </div>
  )
}

function WrittenQ({ id }: { id: string }) {
  const w = ALL_WRITTEN.find((x) => x.id === id)!
  const [text, setText] = useState('')
  const [show, setShow] = useState(false)
  const [ticks, setTicks] = useState<boolean[]>(w.points.map(() => false))
  const [saved, setSaved] = useState(false)
  const got = Math.min(w.marks, Math.round((ticks.filter(Boolean).length / w.points.length) * w.marks))
  const list = ALL_WRITTEN.filter((x) => x.realm === w.realm)
  const next = list[list.findIndex((x) => x.id === id) + 1]
  return (
    <div className="page narrow">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><a href="#/written">Written answers</a><span>›</span><span>{realmById(w.realm)?.short}</span></div>
      <div className="card" style={{ marginTop: 10 }}>
        <div className="q-head">{realmById(w.realm)?.title} · {w.marks} marks</div>
        <div className="q-text">{inline(w.q)}</div>
        <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your answer as you would in the exam…" aria-label="Your answer" />
        <div className="row" style={{ marginTop: 8 }}>
          <span className="small muted">{text.trim() ? text.trim().split(/\s+/).length : 0} words</span><span className="spacer" />
          {!show && <button className="btn primary" onClick={() => setShow(true)}>Reveal model answer &amp; mark</button>}
        </div>
      </div>
      {show && (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Model answer</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{w.model}</p>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Marking points: tick what your answer actually contains</h3>
            {w.points.map((p, i) => (
              <label key={i} className="row" style={{ alignItems: 'flex-start', margin: '6px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={ticks[i]} onChange={() => setTicks(ticks.map((t, j) => (j === i ? !t : t)))} style={{ marginTop: 5 }} />
                <span>{p}</span>
              </label>
            ))}
            <div className="row" style={{ marginTop: 10 }}>
              <b>Estimated mark: {got}/{w.marks}</b><span className="spacer" />
              {!saved ? <button className="btn primary" onClick={() => { markWritten(w.id, got, w.marks); setSaved(true) }}>Save mark</button> : <span className="tag ok">saved</span>}
              {next && <a className="btn" href={`#/written/${next.id}`}>Next question →</a>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
