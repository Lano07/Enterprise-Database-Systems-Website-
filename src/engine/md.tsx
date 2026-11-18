// A deliberately small Markdown dialect for lessons and codices.
//   ## Heading / ### Sub-heading      paragraphs, - lists, 1. lists
//   | a | b |  tables (second row |---| is the separator)
//   ```sql run   fenced code (add "run" to make SQL executable in place)
//   :::exam Title ... :::   callouts: tip, warn, exam, key, story, def
//   {{q:question-id}}       inline challenge (Story Quest check)
//   {{w:widget-id}}         embedded interactive widget
//   inline: **bold**, *italic*, `code`, [label](#/route)
import { Fragment, type ReactNode } from 'react'

export interface MdHooks {
  question?: (id: string) => ReactNode
  widget?: (id: string) => ReactNode
  code?: (lang: string, code: string, run: boolean) => ReactNode
}

type Node =
  | { k: 'h'; level: 2 | 3; text: string }
  | { k: 'p'; text: string }
  | { k: 'ul' | 'ol'; items: string[] }
  | { k: 'table'; head: string[]; rows: string[][] }
  | { k: 'code'; lang: string; run: boolean; code: string }
  | { k: 'call'; kind: string; title: string; body: Node[] }
  | { k: 'q'; id: string }
  | { k: 'w'; id: string }

const cells = (line: string) =>
  line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'))

export function parse(src: string): Node[] {
  const lines = src.replace(/\r/g, '').split('\n')
  const out: Node[] = []
  let i = 0
  const para: string[] = []
  const flush = () => {
    if (para.length) out.push({ k: 'p', text: para.join(' ') })
    para.length = 0
  }
  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) { flush(); i++; continue }
    let m: RegExpMatchArray | null
    if ((m = line.match(/^```([\w:]+)?\s*(run)?/))) {
      flush()
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i++])
      i++
      out.push({ k: 'code', lang: m[1] || 'text', run: !!m[2], code: dedent(body).join('\n') })
      continue
    }
    if ((m = line.match(/^:::(\w+)\s*(.*)$/))) {
      flush()
      const body: string[] = []
      i++
      let depth = 0
      while (i < lines.length) {
        const t = lines[i].trim()
        if (/^:::\w/.test(t)) depth++
        else if (t === ':::') { if (depth === 0) break; depth-- }
        body.push(lines[i++])
      }
      i++
      out.push({ k: 'call', kind: m[1], title: m[2], body: parse(body.join('\n')) })
      continue
    }
    if ((m = line.match(/^\{\{(q|w):([\w-]+)\}\}$/))) {
      flush()
      out.push({ k: m[1] as 'q' | 'w', id: m[2] })
      i++
      continue
    }
    if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      flush()
      out.push({ k: 'h', level: m[1].length as 2 | 3, text: m[2] })
      i++
      continue
    }
    if (line.startsWith('|')) {
      flush()
      const head = cells(line)
      i++
      if (i < lines.length && /^\|?\s*:?-{2,}/.test(lines[i].trim())) i++
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]))
      out.push({ k: 'table', head, rows })
      continue
    }
    if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      flush()
      const ordered = /^\d/.test(line)
      const items: string[] = []
      while (i < lines.length) {
        const t = lines[i].trim()
        const mm = ordered ? t.match(/^\d+[.)]\s+(.*)$/) : t.match(/^[-*]\s+(.*)$/)
        if (mm) { items.push(mm[1]); i++; continue }
        // continuation line of the previous item (indented)
        if (t && /^\s{2,}/.test(lines[i]) && items.length) { items[items.length - 1] += ' ' + t; i++; continue }
        break
      }
      out.push({ k: ordered ? 'ol' : 'ul', items })
      continue
    }
    para.push(line)
    i++
  }
  flush()
  return out
}

function dedent(lines: string[]) {
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length))
  return isFinite(ind) ? lines.map((l) => l.slice(ind)) : lines
}

/**
 * Inline formatting: **bold**, *italic*, `code`, [label](href).
 * Multiplicities such as 0..* and 1..* must survive, so italics open only after
 * whitespace/start/bracket and must contain a letter; bold may contain single asterisks.
 */
const INLINE_RE = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*(?=\S)(.+?)(?<=\S)\*\*(?!\*))|((?<=^|[\s(“"'—])\*(?=[^\s*])([^*]*?[A-Za-z][^*]*?)(?<=\S)\*(?![\w]))/g
export function inline(text: string, key = 0): ReactNode {
  const parts: ReactNode[] = []
  const re = new RegExp(INLINE_RE.source, 'g')
  let last = 0
  let m: RegExpExecArray | null
  let n = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const t = m[0]
    if (m[1]) parts.push(<code key={n++}>{t.slice(1, -1)}</code>)
    else if (m[2]) {
      const mm = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!
      parts.push(<a key={n++} href={mm[2]}>{mm[1]}</a>)
    } else if (m[3]) parts.push(<strong key={n++}>{inline(m[4], n)}</strong>)
    else parts.push(<em key={n++}>{m[6]}</em>)
    last = m.index + t.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <Fragment key={key}>{parts}</Fragment>
}

const CALL_LABEL: Record<string, string> = {
  tip: 'Tip', warn: 'Watch out', exam: 'Exam focus', key: 'Key idea', story: 'Mission briefing', def: 'Definition',
}

export function Md({ src, hooks = {} }: { src: string; hooks?: MdHooks }) {
  return <div className="md">{render(parse(src), hooks)}</div>
}

function render(nodes: Node[], hooks: MdHooks): ReactNode {
  return nodes.map((nd, i) => {
    switch (nd.k) {
      case 'h':
        return nd.level === 2 ? <h2 key={i}>{inline(nd.text)}</h2> : <h3 key={i}>{inline(nd.text)}</h3>
      case 'p':
        return <p key={i}>{inline(nd.text)}</p>
      case 'ul':
        return <ul key={i}>{nd.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>
      case 'ol':
        return <ol key={i}>{nd.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>
      case 'table':
        return (
          <div className="tbl-wrap" key={i}>
            <table className="tbl">
              <thead><tr>{nd.head.map((h, j) => <th key={j}>{inline(h)}</th>)}</tr></thead>
              <tbody>{nd.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )
      case 'code':
        return hooks.code ? <Fragment key={i}>{hooks.code(nd.lang, nd.code, nd.run)}</Fragment> : <pre key={i} className="code"><code>{nd.code}</code></pre>
      case 'call':
        return (
          <aside key={i} className={'call call-' + nd.kind}>
            <div className="call-t">{nd.title ? inline(nd.title) : CALL_LABEL[nd.kind] || nd.kind}</div>
            {render(nd.body, hooks)}
          </aside>
        )
      case 'q':
        return <Fragment key={i}>{hooks.question ? hooks.question(nd.id) : null}</Fragment>
      case 'w':
        return <Fragment key={i}>{hooks.widget ? hooks.widget(nd.id) : null}</Fragment>
    }
  })
}

/** Plain-text section headings of a lesson (for the on-page outline). */
export function headings(src: string) {
  return parse(src).filter((n): n is Extract<Node, { k: 'h' }> => n.k === 'h' && n.level === 2).map((n) => n.text)
}
