import type { ResultSet } from '../engine/sql'

export function ResultTable({ set, max = 200 }: { set: ResultSet; max?: number }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr>{set.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>
          {set.values.slice(0, max).map((r, i) => (
            <tr key={i}>{r.map((v, j) => <td key={j}>{v === null ? <span className="null">NULL</span> : String(v)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SimpleTable({ head, rows, hl }: { head: string[]; rows: (string | number | null)[][]; hl?: (r: number, c: number) => string | undefined }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr>{head.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={hl?.(i, j) ? { background: hl(i, j) } : undefined}>{v === null ? <span className="null">NULL</span> : v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
