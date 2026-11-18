// Lightweight editor: a transparent textarea over a syntax-highlighted <pre>.
import { useRef, type KeyboardEvent, type ReactNode } from 'react'

const SQL_KW = new Set(('select from where and or not in is null like between exists all any some distinct as join inner left right full outer on group by having order asc desc ' +
  'union intersect except minus insert into values update set delete create table view index drop alter add constraint primary key foreign references unique check default ' +
  'begin end commit rollback savepoint transaction declare procedure function trigger before after for each row when then else case if elsif loop while return returns is replace ' +
  'cursor open fetch close exception raise varchar varchar2 char number numeric integer int decimal date boolean text clob xmltype json with recursive limit offset grant revoke ' +
  'natural cross using count sum avg min max new old instead of exit out nocopy type rowtype dbms_output put_line').split(' '))

function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

export function highlight(code: string, lang: string): string {
  if (lang === 'sql' || lang === 'plsql') {
    return code.replace(/(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w$#]*)|([^\w'-]+|-)/g, (_m, c, s, n, w, o) => {
      if (c) return `<span class="sx-c">${esc(c)}</span>`
      if (s) return `<span class="sx-s">${esc(s)}</span>`
      if (n) return `<span class="sx-n">${n}</span>`
      if (w) return SQL_KW.has(w.toLowerCase()) ? `<span class="sx-k">${w}</span>` : esc(w)
      return esc(o)
    })
  }
  if (lang === 'xml' || lang === 'dtd' || lang === 'html') {
    return esc(code)
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="sx-c">$1</span>')
      .replace(/(&lt;!\w+)/g, '<span class="sx-k">$1</span>')
      .replace(/(&lt;\/?)([\w:.-]+)/g, '$1<span class="sx-f">$2</span>')
      .replace(/([\w:-]+)=(&quot;|")(.*?)\2/g, '<span class="sx-t">$1</span>=<span class="sx-s">"$3"</span>')
  }
  if (lang === 'json' || lang === 'js') {
    return esc(code).replace(/("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g, (_m, s, colon, k, n) => {
      if (s) return colon ? `<span class="sx-f">${s}</span>${colon}` : `<span class="sx-s">${s}</span>`
      if (k) return `<span class="sx-k">${k}</span>`
      return `<span class="sx-n">${n}</span>`
    })
  }
  if (lang === 'xpath' || lang === 'xquery' || lang === 'ra') {
    return esc(code).replace(/("[^"]*"|'[^']*')|\b(for|let|where|order|by|return|in|and|or|div|mod|ascending|descending|select|project|join|union|intersect|minus|times|rename|divide)\b|(\$[\w-]+)|(\b\d+\b)/g, (_m, s, k, v, n) => {
      if (s) return `<span class="sx-s">${s}</span>`
      if (k) return `<span class="sx-k">${k}</span>`
      if (v) return `<span class="sx-t">${v}</span>`
      return `<span class="sx-n">${n}</span>`
    })
  }
  return esc(code)
}

export function CodeEditor({ value, onChange, lang = 'sql', onRun, minRows = 3, bar, label }: {
  value: string; onChange: (v: string) => void; lang?: string; onRun?: () => void; minRows?: number; bar?: ReactNode; label?: string
}) {
  const ta = useRef<HTMLTextAreaElement>(null)
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun?.(); return }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      const t = e.currentTarget, s = t.selectionStart, en = t.selectionEnd
      const v = t.value.slice(0, s) + '  ' + t.value.slice(en)
      onChange(v)
      requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2 })
    }
  }
  const lines = Math.max(minRows, value.split('\n').length)
  return (
    <div className="ed">
      {bar && <div className="ed-bar">{bar}</div>}
      <div className="ed-area" style={{ minHeight: `calc(${lines} * 1.55em + 24px)` }}>
        <pre aria-hidden dangerouslySetInnerHTML={{ __html: highlight(value, lang) + '\n' }} />
        <textarea ref={ta} value={value} spellCheck={false} aria-label={label || 'Code editor'} onChange={(e) => onChange(e.target.value)} onKeyDown={onKey}
          autoCapitalize="off" autoCorrect="off" />
      </div>
    </div>
  )
}
