// XML helpers: well-formedness (browser DOMParser), DTD validation (content models compiled
// to regular expressions), XPath (browser document.evaluate) and a small XQuery FLWOR subset.

export interface ParseResult { doc?: XMLDocument; error?: string; internalDtd?: string; root?: string }

export function parseXml(text: string): ParseResult {
  let internalDtd: string | undefined
  let root: string | undefined
  const stripped = text.replace(/<!DOCTYPE\s+([\w:.-]+)\s*\[([\s\S]*?)\]\s*>/i, (_m, r, body) => { root = r; internalDtd = body; return '' })
  const doc = new DOMParser().parseFromString(stripped, 'application/xml')
  const err = doc.getElementsByTagName('parsererror')[0]
  if (err) {
    const msg = (err.textContent || 'Parse error').replace(/\s+/g, ' ').replace(/^.*?error on line/i, 'Error on line').trim()
    return { error: msg.slice(0, 300), internalDtd, root }
  }
  return { doc, internalDtd, root }
}

// ---------------- DTD ----------------
interface ElemDecl { name: string; model: string; re?: RegExp; kind: 'EMPTY' | 'ANY' | 'PCDATA' | 'MIXED' | 'CHILDREN'; mixed?: string[] }
interface AttDecl { name: string; type: string; def: string }
export interface Dtd { elements: Map<string, ElemDecl>; attlists: Map<string, AttDecl[]>; errors: string[] }

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')

export function parseDtd(src: string): Dtd {
  const elements = new Map<string, ElemDecl>()
  const attlists = new Map<string, AttDecl[]>()
  const errors: string[] = []
  const text = src.replace(/<!--[\s\S]*?-->/g, '')
  for (const m of text.matchAll(/<!ELEMENT\s+([\w:.-]+)\s+([\s\S]*?)>/g)) {
    const name = m[1], model = m[2].trim()
    try { elements.set(name, compileModel(name, model)) } catch (e) { errors.push(`ELEMENT ${name}: ${(e as Error).message}`) }
  }
  for (const m of text.matchAll(/<!ATTLIST\s+([\w:.-]+)\s+([\s\S]*?)>/g)) {
    const el = m[1]
    const list = attlists.get(el) || []
    const toks = m[2].match(/"[^"]*"|'[^']*'|\([^)]*\)|#\w+|[^\s]+/g) || []
    for (let i = 0; i < toks.length;) {
      const name = toks[i++], type = toks[i++] || 'CDATA'
      let def = toks[i++] || '#IMPLIED'
      if (def === '#FIXED') def = '#FIXED ' + (toks[i++] || '')
      // The lecture writes <!ATTLIST Orange location 'Florida'> with the type omitted: the quoted
      // value is then read as the "type" and the attribute is simply optional with a default.
      list.push({ name, type, def })
    }
    attlists.set(el, list)
  }
  return { elements, attlists, errors }
}

function compileModel(name: string, model: string): ElemDecl {
  const m = model.replace(/\s+/g, '')
  if (m === 'EMPTY') return { name, model, kind: 'EMPTY' }
  if (m === 'ANY') return { name, model, kind: 'ANY' }
  if (m === '(#PCDATA)' || m === '#PCDATA') return { name, model, kind: 'PCDATA' }
  if (m.startsWith('(#PCDATA')) {
    const names = m.replace(/^\(#PCDATA\|?/, '').replace(/\)\*?$/, '').split('|').filter(Boolean)
    return { name, model, kind: 'MIXED', mixed: names }
  }
  if (!m.startsWith('(')) throw new Error(`content model must be EMPTY, ANY or a parenthesised expression, not “${model}”`)
  let depth = 0
  let out = ''
  const toks = m.match(/[\w:.-]+|[(),|*+?]/g) || []
  for (const t of toks) {
    if (t === '(') { depth++; out += '(?:' }
    else if (t === ')') { depth--; out += ')' }
    else if (t === ',') out += ''
    else if (t === '|') out += '|'
    else if ('*+?'.includes(t)) out += t
    else out += `(?:${esc(t)},)`
  }
  if (depth !== 0) throw new Error('unbalanced parentheses')
  return { name, model, kind: 'CHILDREN', re: new RegExp(`^(?:${out})$`) }
}

export function validate(doc: XMLDocument, dtd: Dtd, rootName?: string): string[] {
  const errs: string[] = [...dtd.errors]
  const rootEl = doc.documentElement
  if (rootName && rootEl.nodeName !== rootName) errs.push(`The DOCTYPE names root <${rootName}> but the document root is <${rootEl.nodeName}>.`)
  const walk = (el: Element) => {
    const decl = dtd.elements.get(el.nodeName)
    const kids = [...el.children]
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
    if (!decl) errs.push(`<${el.nodeName}> is not declared in the DTD.`)
    else {
      if (decl.kind === 'EMPTY' && (kids.length || hasText)) errs.push(`<${el.nodeName}> is declared EMPTY but has content.`)
      if (decl.kind === 'PCDATA' && kids.length) errs.push(`<${el.nodeName}> may contain only text (#PCDATA), but contains <${kids[0].nodeName}>.`)
      if (decl.kind === 'MIXED') kids.filter((k) => !decl.mixed!.includes(k.nodeName)).forEach((k) => errs.push(`<${k.nodeName}> is not allowed inside <${el.nodeName}>.`))
      if (decl.kind === 'CHILDREN') {
        if (hasText) errs.push(`<${el.nodeName}> has element content only; text is not allowed directly inside it.`)
        const seq = kids.map((k) => k.nodeName + ',').join('')
        if (!decl.re!.test(seq)) errs.push(`Children of <${el.nodeName}> are (${kids.map((k) => k.nodeName).join(', ') || 'none'}), which does not match ${decl.model}.`)
      }
    }
    const atts = dtd.attlists.get(el.nodeName) || []
    for (const a of atts) if (a.def === '#REQUIRED' && !el.hasAttribute(a.name)) errs.push(`<${el.nodeName}> is missing the required attribute ${a.name}.`)
    for (const at of [...el.attributes]) if (!atts.some((a) => a.name === at.name)) errs.push(`Attribute ${at.name} on <${el.nodeName}> is not declared.`)
    kids.forEach(walk)
  }
  walk(rootEl)
  return [...new Set(errs)]
}

// ---------------- XPath ----------------
export type XPathOut = { kind: 'nodes'; items: string[] } | { kind: 'value'; value: string }

export function serializeNode(n: Node): string {
  if (n.nodeType === 2) return `${(n as Attr).name}="${(n as Attr).value}"`
  if (n.nodeType === 3) return n.textContent || ''
  return new XMLSerializer().serializeToString(n).replace(/ xmlns="[^"]*"/, '')
}

export function xpath(doc: XMLDocument, expr: string, ctx: Node = doc): XPathOut {
  const r = doc.evaluate(expr, ctx, null, XPathResult.ANY_TYPE, null)
  switch (r.resultType) {
    case XPathResult.NUMBER_TYPE: return { kind: 'value', value: String(r.numberValue) }
    case XPathResult.STRING_TYPE: return { kind: 'value', value: r.stringValue }
    case XPathResult.BOOLEAN_TYPE: return { kind: 'value', value: String(r.booleanValue) }
    default: {
      const items: string[] = []
      let n = r.iterateNext()
      while (n) { items.push(serializeNode(n)); n = r.iterateNext() }
      return { kind: 'nodes', items }
    }
  }
}

// ---------------- XQuery FLWOR subset ----------------
export function flwor(doc: XMLDocument, q: string): { out: string[]; trace: string[] } {
  const src = q.replace(/\(:[\s\S]*?:\)/g, '').trim()
  const m = src.match(/^for\s+\$(\w+)\s+in\s+([\s\S]+?)(?=\s+let\s|\s+where\s|\s+order\s+by\s|\s+return\s)([\s\S]*)$/i)
  if (!m) throw new Error('Expected: for $var in <path> [let …] [where …] [order by …] return …')
  const v = m[1]
  const path = m[2].trim().replace(/^doc\(\s*["'][^"']*["']\s*\)/, '')
  let rest = m[3]
  const lets: [string, string][] = []
  let lm: RegExpMatchArray | null
  while ((lm = rest.match(/^\s+let\s+\$(\w+)\s*:=\s*([\s\S]+?)(?=\s+let\s|\s+where\s|\s+order\s+by\s|\s+return\s)/i))) { lets.push([lm[1], lm[2].trim()]); rest = rest.slice(lm[0].length) }
  const wm = rest.match(/^\s+where\s+([\s\S]+?)(?=\s+order\s+by\s|\s+return\s)/i)
  if (wm) rest = rest.slice(wm[0].length)
  const om = rest.match(/^\s+order\s+by\s+([\s\S]+?)(\s+(ascending|descending))?(?=\s+return\s)/i)
  if (om) rest = rest.slice(om[0].length)
  const rm = rest.match(/^\s+return\s+([\s\S]+)$/i)
  if (!rm) throw new Error('Missing return clause.')
  const ret = rm[1].trim()

  const toXPath = (e: string) => {
    let x = e
    for (let k = lets.length - 1; k >= 0; k--) x = x.replace(new RegExp('\\$' + lets[k][0] + '\\b', 'g'), `(${lets[k][1]})`)
    return x.replace(new RegExp('\\$' + v + '/', 'g'), './').replace(new RegExp('\\$' + v + '\\b', 'g'), '.')
      .replace(/xs:(integer|decimal|double|float)\s*\(/g, 'number(').replace(/\bdata\s*\(/g, 'string(').replace(/\bfn:/g, '')
  }
  const absPath = path.startsWith('/') ? path : '/' + path
  const res = doc.evaluate(absPath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
  let nodes: Node[] = []
  for (let i = 0; i < res.snapshotLength; i++) nodes.push(res.snapshotItem(i)!)
  const trace: string[] = [`for $${v} binds ${nodes.length} node(s) from ${absPath}`]
  if (wm) {
    const cond = toXPath(wm[1])
    nodes = nodes.filter((n, i) => {
      const ok = doc.evaluate(cond, n, null, XPathResult.BOOLEAN_TYPE, null).booleanValue
      trace.push(`binding ${i + 1}: where ${wm[1].trim()} is ${ok}`)
      return ok
    })
  }
  if (om) {
    const key = toXPath(om[1])
    const desc = /descending/i.test(om[3] || '')
    const val = (n: Node) => { const s = doc.evaluate(`string(${key})`, n, null, XPathResult.STRING_TYPE, null).stringValue; const num = Number(s); return s !== '' && !isNaN(num) ? num : s }
    nodes = [...nodes].sort((a, b) => { const x = val(a), y = val(b); const c = x < y ? -1 : x > y ? 1 : 0; return desc ? -c : c })
    trace.push(`order by ${om[1].trim()}${desc ? ' descending' : ''}`)
  }
  const out = nodes.map((n) => {
    if (ret.startsWith('<')) {
      return ret.replace(/\{([^}]*)\}/g, (_m, e) => {
        const r = xpath(doc, toXPath(e), n)
        return r.kind === 'value' ? r.value : r.items.join('')
      })
    }
    const r = xpath(doc, toXPath(ret), n)
    return r.kind === 'value' ? r.value : r.items.join('')
  })
  trace.push(`return produced ${out.length} item(s)`)
  return { out, trace }
}
