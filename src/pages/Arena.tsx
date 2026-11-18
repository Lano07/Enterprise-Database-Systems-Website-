import { useEffect, useMemo, useRef, useState } from 'react'
import type { Database } from 'sql.js'
import { ALL_SQL } from '../content'
import { REALMS, realmById } from '../content/realms'
import type { SqlChallenge } from '../content/types'
import { DATASETS } from '../engine/datasets'
import { createDb, run, sameResult, tableInfo, type RunResult } from '../engine/sql'
import { inline } from '../engine/md'
import { breach, recharge, solveSql, spendMana, useSave } from '../game/store'
import { CodeEditor } from '../ui/CodeEditor'
import { ResultView } from '../ui/SqlBlock'
import { parseHash } from '../ui/router'
import { RaPlayground } from '../tools/RelAlgebra'
import { XmlPlayground } from '../tools/XmlLab'
import { JsonPlayground } from '../tools/JsonLab'

type Info = ReturnType<typeof tableInfo>

export function Arena({ challenge, lang }: { challenge?: string; lang?: string }) {
  const tabs: [string, string][] = [['sql', '⌨️ SQL'], ['ra', 'σ Relational algebra'], ['xml', '🏷️ XML · XPath · DTD'], ['json', '🧩 JSON · NoSQL']]
  const cur = lang || 'sql'
  return (
    <div className="page wide">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><span>Live Sandbox Arenas</span></div>
      <h1 className="title">Live Sandbox Arenas</h1>
      <div className="stage-tabs" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={cur === k} className={cur === k ? 'on' : ''} onClick={() => { location.hash = k === 'sql' ? '#/arena' : `#/arena?lang=${k}` }}>{l}</button>)}
      </div>
      {cur === 'sql' && <SqlArena challengeId={challenge} />}
      {cur === 'ra' && <RaPlayground />}
      {cur === 'xml' && <XmlPlayground />}
      {cur === 'json' && <JsonPlayground />}
    </div>
  )
}

function SqlArena({ challengeId }: { challengeId?: string }) {
  const s = useSave()
  const realmFilter = parseHash().query.get('realm') || ''
  const [filter, setFilter] = useState(realmFilter)
  const ch = ALL_SQL.find((c) => c.id === challengeId)
  const [dataset, setDataset] = useState(ch?.dataset || 'dreamhome')
  const [sql, setSql] = useState(ch?.starter || (ch ? '' : 'SELECT s.fName, s.lName, b.city\nFROM Staff s JOIN Branch b ON s.branchNo = b.branchNo\nORDER BY b.city;'))
  const [res, setRes] = useState<RunResult | null>(null)
  const [verdict, setVerdict] = useState<{ ok: boolean; why?: string } | null>(null)
  const [hint, setHint] = useState(false)
  const [info, setInfo] = useState<Info>([])
  const db = useRef<Database | null>(null)

  useEffect(() => {
    setDataset(ch?.dataset || dataset)
    setSql(ch ? ch.starter || '' : sql)
    setRes(null); setVerdict(null); setHint(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId])

  useEffect(() => {
    let live = true
    createDb(dataset).then((d) => { if (!live) { d.close(); return } db.current?.close(); db.current = d; setInfo(tableInfo(d)) })
    return () => { live = false }
  }, [dataset])

  const exec = () => {
    if (!db.current) return
    const r = run(db.current, sql)
    setRes(r)
    setInfo(tableInfo(db.current))
    if (r.breach) breach(r.breach, r.note || '')
    else if (!r.error) recharge(2)
  }
  const reset = async () => { db.current?.close(); db.current = await createDb(dataset); setInfo(tableInfo(db.current)); setRes(null) }

  const submit = async () => {
    if (!ch) return
    const mine = await createDb(ch.dataset)
    const ref = await createDb(ch.dataset)
    const a = run(mine, sql)
    if (a.error) {
      setRes(a); setVerdict({ ok: false, why: 'Your SQL raised an error, so fix it first.' })
      if (a.breach) breach(a.breach, a.note || '')
      mine.close(); ref.close(); return
    }
    const b = run(ref, ch.solution)
    let mineSet = a.sets[a.sets.length - 1], refSet = b.sets[b.sets.length - 1]
    if (ch.check) {
      const mc = run(mine, ch.check)
      if (mc.error) {
        setRes(a); setVerdict({ ok: false, why: `The checker could not test your schema (${mc.error}). Use the exact table and column names from the task.` })
        mine.close(); ref.close(); return
      }
      mineSet = mc.sets[mc.sets.length - 1]
      const rc = run(ref, ch.check)
      refSet = rc.sets[rc.sets.length - 1]
    }
    const v = sameResult(mineSet, refSet, ch.ordered)
    setRes(a)
    setVerdict(v)
    if (v.ok) solveSql(ch.id, ch.d)
    mine.close(); ref.close()
  }

  const list = useMemo(() => ALL_SQL.filter((c) => !filter || c.realm === filter), [filter])
  const idx = ch ? list.findIndex((c) => c.id === ch.id) : -1
  const nextCh: SqlChallenge | undefined = idx >= 0 ? list[idx + 1] : undefined

  return (
    <div className="tool-grid">
      <div>
        {ch ? (
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="row small muted"><span style={{ color: realmById(ch.realm)?.color }}>Realm {realmById(ch.realm)?.n}</span><span>·</span><span>{'★'.repeat(ch.d)}</span><span>·</span><span>dataset: {ch.dataset}</span>{s.sql[ch.id] && <span className="tag ok">accepted</span>}<span className="spacer" /><a href="#/arena">Free sandbox</a></div>
            <h3 style={{ margin: '6px 0' }}>{ch.title}</h3>
            <div>{inline(ch.prompt)}</div>
            {hint && ch.hint && <div className="q-hint">💧 {inline(ch.hint)}</div>}
          </div>
        ) : (
          <div className="row" style={{ marginBottom: 8 }}>
            <label className="small muted" htmlFor="ds">Database</label>
            <select id="ds" value={dataset} onChange={(e) => setDataset(e.target.value)}>
              {DATASETS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <span className="small muted">{DATASETS.find((d) => d.id === dataset)?.desc}</span>
          </div>
        )}
        <CodeEditor value={sql} onChange={setSql} onRun={exec} minRows={6} label="SQL editor"
          bar={<>
            <span className="tag acc">{dataset}</span><span className="hide-s">Ctrl+Enter runs · Oracle-isms like VARCHAR2, NVL, DUAL and MINUS are translated</span><span className="spacer" />
            <button className="btn sm" onClick={reset}>Reset data</button>
            <button className="btn sm" onClick={exec}>▶ Run</button>
            {ch && <button className="btn sm primary" onClick={submit}>✔ Submit</button>}
          </>} />
        {verdict && (
          <div className={'q-explain'} style={{ marginBottom: 8, background: verdict.ok ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>
            {verdict.ok ? <b className="ok">✔ Query accepted! Your result matches the reference.</b> : <><b className="bad">✖ Not accepted.</b> {verdict.why}</>}
            {ch && !verdict.ok && !hint && ch.hint && <button className="btn sm ghost" onClick={() => { if (spendMana(10)) setHint(true) }}>💧 Hint (10 mana)</button>}
            {ch && verdict.ok && nextCh && <a className="btn sm" style={{ marginLeft: 8 }} href={`#/arena/${nextCh.id}`}>Next quest →</a>}
            {ch && !verdict.ok && <details style={{ marginTop: 6 }}><summary className="small">Stuck? Reveal a model solution</summary><pre className="code">{ch.solution}</pre></details>}
          </div>
        )}
        {res && <ResultView res={res} />}
      </div>
      <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
        <div className="panel">
          <h3>Schema</h3>
          <div className="schema">
            {info.map((t) => (
              <details key={t.name} open={info.length <= 4}>
                <summary>{t.name}</summary>
                <div style={{ paddingLeft: 10 }}>{t.cols.map((c) => <div key={c.name}><span className={c.pk ? 'pk' : c.fk ? 'fk' : ''}>{c.name}</span> <span className="muted">{c.type}{c.fk ? ` → ${c.fk}` : ''}</span></div>)}</div>
              </details>
            ))}
            {!info.length && <div className="muted">No tables yet. CREATE one!</div>}
          </div>
          <div className="small muted" style={{ marginTop: 6 }}><span style={{ textDecoration: 'underline', fontWeight: 700 }}>underlined</span> = primary key · <span style={{ color: 'var(--accent)' }}>blue</span> = foreign key</div>
        </div>
        <div className="panel">
          <div className="row"><h3 style={{ margin: 0 }}>SQL quests</h3><span className="spacer" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter quests by realm">
              <option value="">All</option>
              {REALMS.filter((r) => ALL_SQL.some((c) => c.realm === r.id)).map((r) => <option key={r.id} value={r.id}>R{r.n} {r.short}</option>)}
            </select>
          </div>
          <div className="small muted" style={{ margin: '4px 0 8px' }}>{ALL_SQL.filter((c) => s.sql[c.id]).length}/{ALL_SQL.length} accepted</div>
          <div style={{ display: 'grid', gap: 4, maxHeight: 420, overflow: 'auto' }}>
            {list.map((c) => (
              <a key={c.id} href={`#/arena/${c.id}`} className="quest" style={{ padding: '6px 10px', ...(c.id === ch?.id ? { borderColor: 'var(--accent)' } : {}) }}>
                <span>{s.sql[c.id] ? '✅' : '⬜'}</span><span className="qt"><b style={{ fontSize: '.85rem' }}>{c.title}</b><span>{'★'.repeat(c.d)} · {c.dataset}</span></span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
