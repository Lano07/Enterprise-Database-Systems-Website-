// Runnable SQL inside lessons. Each block owns a fresh database so experiments never leak
// between blocks; constraint violations trigger an Integrity Shield breach.
import { useRef, useState } from 'react'
import type { Database } from 'sql.js'
import { createDb, run, type RunResult } from '../engine/sql'
import { breach, recharge } from '../game/store'
import { CodeEditor } from './CodeEditor'
import { ResultTable } from './ResultTable'

export function SqlBlock({ code, dataset = 'dreamhome' }: { code: string; dataset?: string }) {
  const [sql, setSql] = useState(code)
  const [res, setRes] = useState<RunResult | null>(null)
  const [busy, setBusy] = useState(false)
  const db = useRef<Database | null>(null)
  const exec = async () => {
    setBusy(true)
    try {
      if (!db.current) db.current = await createDb(dataset)
      const r = run(db.current, sql)
      setRes(r)
      if (r.breach) breach(r.breach, r.note || r.error || '')
      else if (!r.error) recharge(2)
    } catch (e) {
      setRes({ sets: [], error: 'Could not start the SQL engine: ' + (e instanceof Error ? e.message : String(e)), changes: 0, ms: 0 })
    } finally { setBusy(false) }
  }
  const reset = () => { db.current?.close(); db.current = null; setRes(null); setSql(code) }
  return (
    <div>
      <CodeEditor value={sql} onChange={setSql} onRun={exec} lang="sql" label="SQL"
        bar={<>
          <span className="tag acc">SQL · {dataset}</span><span className="hide-s">Ctrl+Enter to run</span><span className="spacer" />
          <button className="btn sm" onClick={reset} title="Restore the original statement and data">Reset</button>
          <button className="btn sm primary" onClick={exec} disabled={busy}>{busy ? 'Running…' : '▶ Run'}</button>
        </>} />
      {res && <ResultView res={res} />}
    </div>
  )
}

export function ResultView({ res }: { res: RunResult }) {
  return (
    <div className="res" style={{ border: '1px solid var(--line)', borderRadius: 8, marginTop: -6 }}>
      {res.error ? (
        <>
          <div className="res-err">✖ {res.error}</div>
          {res.note && res.note !== res.error && <div className="res-note">{res.breach ? '🛡️ ' : '💡 '}{res.note}</div>}
        </>
      ) : res.sets.length ? (
        res.sets.map((s, i) => (
          <div key={i}>
            <ResultTable set={s} />
            <div className="muted small">{s.values.length} row{s.values.length === 1 ? '' : 's'} · {res.ms.toFixed(1)} ms</div>
          </div>
        ))
      ) : (
        <div className="res-ok">✔ Statement executed. {res.changes} row{res.changes === 1 ? '' : 's'} affected.</div>
      )}
    </div>
  )
}
