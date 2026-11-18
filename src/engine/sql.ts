// In-browser SQL via sql.js (SQLite compiled to WebAssembly). Foreign keys are switched on
// so the Integrity Shields react to real constraint violations.
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { DATASETS } from './datasets'

let SQL: Promise<SqlJsStatic> | null = null
export function loadSql() {
  if (!SQL) SQL = initSqlJs({ locateFile: () => import.meta.env.BASE_URL + 'sql-wasm.wasm' })
  return SQL
}

export interface ResultSet { columns: string[]; values: unknown[][] }
export interface RunResult { sets: ResultSet[]; error?: string; changes: number; ms: number; breach?: 'entity' | 'ref'; note?: string }

/** Oracle-flavoured helpers so lab-style SQL runs (NVL, INITCAP, LPAD, RPAD). */
function addOracleFunctions(db: Database) {
  db.create_function('NVL', (a: unknown, b: unknown) => (a === null || a === undefined ? b : a))
  db.create_function('NVL2', (a: unknown, b: unknown, c: unknown) => (a === null || a === undefined ? c : b))
  db.create_function('INITCAP', (s: unknown) => (s == null ? null : String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())))
  db.create_function('LPAD', (s: unknown, n: number, p: unknown) => (s == null ? null : String(s).padStart(n, p == null ? ' ' : String(p)).slice(0, n)))
  db.create_function('RPAD', (s: unknown, n: number, p: unknown) => (s == null ? null : String(s).padEnd(n, p == null ? ' ' : String(p)).slice(0, n)))
}

export async function createDb(dataset: string): Promise<Database> {
  const S = await loadSql()
  const db = new S.Database()
  addOracleFunctions(db)
  db.run('PRAGMA foreign_keys = ON;')
  const ds = DATASETS.find((d) => d.id === dataset) || DATASETS[0]
  db.exec(ds.ddl)
  return db
}

/** Translate a little Oracle syntax to SQLite so lecture/lab statements run as written. */
export function oracleToSqlite(sql: string) {
  return sql
    .replace(/\bDATE\s+'(\d{4}-\d{2}-\d{2})'/gi, "'$1'")
    .replace(/\bTO_DATE\s*\(\s*'(\d{4}-\d{2}-\d{2})'\s*,\s*'YYYY-MM-DD'\s*\)/gi, "'$1'")
    .replace(/\bFROM\s+DUAL\b/gi, '')
    .replace(/\bSYSDATE\b/gi, "date('now')")
    .replace(/\bVARCHAR2\b/gi, 'VARCHAR')
    .replace(/\bNUMBER\s*\(/gi, 'NUMERIC(')
    .replace(/\bNUMBER\b/gi, 'NUMERIC')
    .replace(/\bMINUS\b/gi, 'EXCEPT')
}

export function classify(msg: string): 'entity' | 'ref' | undefined {
  if (/FOREIGN KEY constraint failed/i.test(msg)) return 'ref'
  if (/UNIQUE constraint failed|NOT NULL constraint failed|PRIMARY KEY/i.test(msg)) return 'entity'
  return undefined
}

export function explainError(msg: string): string {
  if (/FOREIGN KEY constraint failed/i.test(msg))
    return 'Referential integrity breach: a foreign key value must match a candidate key value in its home relation, or be wholly null. Either the parent row does not exist, or you tried to delete/update a parent that child rows still reference.'
  if (/UNIQUE constraint failed: (\w+)\.(\w+)/i.test(msg)) {
    const m = msg.match(/UNIQUE constraint failed: ([\w.,\s]+)/i)!
    return `Entity integrity breach: duplicate value for ${m[1].trim()}. A primary (or unique) key must identify every tuple uniquely; no two tuples may share it.`
  }
  if (/NOT NULL constraint failed: ([\w.]+)/i.test(msg)) {
    const m = msg.match(/NOT NULL constraint failed: ([\w.]+)/i)!
    return `Entity integrity breach: ${m[1]} cannot be null. No attribute of a primary key may be null (and NOT NULL columns must have a value).`
  }
  if (/no such table: (\w+)/i.test(msg)) return `There is no relation called “${msg.match(/no such table: (\w+)/i)![1]}”. Check the schema panel for the exact table names.`
  if (/no such column: ([\w.]+)/i.test(msg)) return `There is no attribute “${msg.match(/no such column: ([\w.]+)/i)![1]}”. Check spelling and which table it belongs to (qualify it, e.g. s.branchNo, if two tables share the name).`
  if (/ambiguous column name: (\w+)/i.test(msg)) return `“${msg.match(/ambiguous column name: (\w+)/i)![1]}” exists in more than one table in your FROM clause. Qualify it with a table name or alias.`
  if (/syntax error/i.test(msg)) return 'Syntax error near the quoted token. Check commas between columns, quotes around strings, and clause order: SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY.'
  if (/misuse of aggregate/i.test(msg)) return 'Aggregates (COUNT, SUM…) cannot be used in WHERE. Filter groups with HAVING instead.'
  return msg
}

export function run(db: Database, sql: string): RunResult {
  const t0 = performance.now()
  const src = oracleToSqlite(sql)
  try {
    const sets = db.exec(src).map((r) => ({ columns: r.columns, values: r.values as unknown[][] }))
    return { sets, changes: db.getRowsModified(), ms: performance.now() - t0 }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { sets: [], error: msg, changes: 0, ms: performance.now() - t0, breach: classify(msg), note: explainError(msg) }
  }
}

const norm = (v: unknown) => {
  if (v === null || v === undefined) return '∅'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(4)
  const s = String(v).trim()
  const n = Number(s)
  return s !== '' && !isNaN(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(4)) : s.toLowerCase()
}

/** Compare two result sets by value (column names ignored). */
export function sameResult(a: ResultSet | undefined, b: ResultSet | undefined, ordered = false): { ok: boolean; why?: string } {
  if (!a && !b) return { ok: true }
  if (!a || !b) return { ok: false, why: a ? 'The reference query returns no rows here.' : 'Your query returned no result set.' }
  if (a.columns.length !== b.columns.length) return { ok: false, why: `Your result has ${a.columns.length} column(s); the expected result has ${b.columns.length}.` }
  if (a.values.length !== b.values.length) return { ok: false, why: `Your result has ${a.values.length} row(s); the expected result has ${b.values.length}.` }
  const ra = a.values.map((r) => r.map(norm).join('\u0001'))
  const rb = b.values.map((r) => r.map(norm).join('\u0001'))
  if (ordered) {
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return { ok: false, why: `Row ${i + 1} differs (check the values and the ORDER BY).` }
    return { ok: true }
  }
  const sa = [...ra].sort(), sb = [...rb].sort()
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return { ok: false, why: 'Same shape, but some values differ. Check your filter conditions and which columns you selected.' }
  return { ok: true }
}

export function tableInfo(db: Database) {
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name")
  if (!tables.length) return []
  return tables[0].values.map(([name]) => {
    const cols = db.exec(`PRAGMA table_info("${name}")`)[0]?.values || []
    const fks = db.exec(`PRAGMA foreign_key_list("${name}")`)[0]?.values || []
    return {
      name: String(name),
      cols: cols.map((c) => ({ name: String(c[1]), type: String(c[2]), pk: Number(c[5]) > 0, fk: fks.find((f) => f[3] === c[1]) ? String(fks.find((f) => f[3] === c[1])![2]) : undefined })),
    }
  })
}
