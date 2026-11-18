import { useMemo, useState } from 'react'
import { flwor, parseDtd, parseXml, validate, xpath, type XPathOut } from '../engine/xml'
import { recordAnswer, useSave } from '../game/store'
import { CodeEditor } from '../ui/CodeEditor'

export const DOCS: Record<string, string> = {
  bib: `<Bib>
  <paper id="p1">
    <title>Foundations of Databases</title>
    <author><firstname>Serge</firstname><lastname>Abiteboul</lastname></author>
    <year>1995</year>
  </paper>
  <book id="b1">
    <title>Data on the Web</title>
    <publisher>Morgan Kaufmann</publisher>
    <year>1999</year>
  </book>
  <paper id="p2">
    <title>Principles of Database Theory</title>
    <author><firstname>Victor</firstname><lastname>Vianu</lastname></author>
    <year>1997</year>
  </paper>
</Bib>`,
  books: `<bibliography>
  <book id="b1"><title>Foundations of Databases</title><year>1995</year></book>
  <book id="b2"><title>Data on the Web</title><year>1999</year></book>
  <book id="b3"><title>The Character of Physical Law</title><year>1980</year></book>
</bibliography>`,
  profile: `<PROFILE createdBy="Nia">
  <EMAIL>nia@example.com</EMAIL>
  <PHONE>868-555-0101</PHONE>
  <PHONE>868-555-0199</PHONE>
  <LOCATION><CITY>Couva</CITY></LOCATION>
</PROFILE>`,
  booklist: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<BOOKLIST>
  <BOOK genre="Science" format="Hardcover">
    <AUTHOR><FIRSTNAME>Richard</FIRSTNAME><LASTNAME>Feynman</LASTNAME></AUTHOR>
    <TITLE>The Character of Physical Law</TITLE>
    <PUBLISHED>1980</PUBLISHED>
  </BOOK>
  <BOOK genre="Fiction">
    <AUTHOR><FIRSTNAME>R.K.</FIRSTNAME><LASTNAME>Narayan</LASTNAME></AUTHOR>
    <TITLE>Waiting for the Mahatma</TITLE>
    <PUBLISHED>1981</PUBLISHED>
  </BOOK>
</BOOKLIST>`,
  basket: `<Basket>
  <Apple/>
  <Cherry flavor="good"/>
  <Orange/>
</Basket>`,
}

export const BASKET_DTD = `<!ELEMENT Basket (Cherry+, (Apple | Orange)*) >
<!ELEMENT Cherry EMPTY>
<!ATTLIST Cherry flavor CDATA #REQUIRED>
<!ELEMENT Apple EMPTY>
<!ATTLIST Apple color CDATA #REQUIRED>
<!ELEMENT Orange EMPTY>
<!ATTLIST Orange location CDATA 'Florida'>`

interface XpCh { id: string; doc: string; prompt: string; ref: string }
const XPATH_CH: XpCh[] = [
  { id: 'x1', doc: 'bib', prompt: 'Select both paper elements (Bib.paper).', ref: '/Bib/paper' },
  { id: 'x2', doc: 'bib', prompt: 'Select the publisher of the book (Bib.book.publisher).', ref: '/Bib/book/publisher' },
  { id: 'x3', doc: 'bib', prompt: 'Select every lastname element, at any depth.', ref: '//lastname' },
  { id: 'x4', doc: 'bib', prompt: 'Select the lastname of the author of paper p2 only.', ref: '/Bib/paper[@id="p2"]/author/lastname' },
  { id: 'x5', doc: 'bib', prompt: 'Select the id attributes of the papers.', ref: '/Bib/paper/@id' },
  { id: 'x6', doc: 'profile', prompt: 'Select the second PHONE of the profile.', ref: '/PROFILE/PHONE[2]' },
  { id: 'x7', doc: 'profile', prompt: 'Select the createdBy attribute of the root.', ref: '/PROFILE/@createdBy' },
  { id: 'x8', doc: 'booklist', prompt: 'Select the TITLE of every BOOK whose genre is Fiction.', ref: '/BOOKLIST/BOOK[@genre="Fiction"]/TITLE' },
  { id: 'x9', doc: 'bib', prompt: 'Return the number of author elements in the document (a number, not nodes).', ref: 'count(//author)' },
]

interface DtdCh { id: string; prompt: string; starter: string; good: string[]; bad: string[] }
const DTD_CH: DtdCh[] = [
  { id: 'd1', prompt: 'Write a DTD for an address book: each person has exactly one name, at most one greet, any number of address lines, then any mixture of tel and fax, then any number of email elements. All leaf elements hold text.',
    starter: '<!ELEMENT addressbook (person*)>\n<!ELEMENT person ( )>\n<!ELEMENT name (#PCDATA)>\n',
    good: ['<addressbook><person><name>MacNiel, John</name><greet>Dr. John MacNiel</greet><address>1234 Huron Street</address><address>Rome, OH 98765</address><tel>(321) 786 2543</tel><fax>(321) 786 2543</fax><email>jm@abc.com</email></person></addressbook>', '<addressbook><person><name>Sue</name></person><person><name>Ann</name><fax>1</fax><tel>2</tel><fax>3</fax></person></addressbook>'],
    bad: ['<addressbook><person><greet>Hi</greet><name>X</name></person></addressbook>', '<addressbook><person><name>A</name><name>B</name></person></addressbook>', '<addressbook><person><name>A</name><greet>x</greet><greet>y</greet></person></addressbook>', '<addressbook><person><name>A</name><email>e</email><tel>1</tel></person></addressbook>'] },
  { id: 'd2', prompt: 'Write a DTD for the relational DB in grouped form: db contains projects then employees; projects holds any number of project (title, budget, managedBy); employees holds any number of employee (name, ssn, age).',
    starter: '<!ELEMENT db (projects, employees)>\n',
    good: ['<db><projects><project><title>Pattern recognition</title><budget>10000</budget><managedBy>Joe</managedBy></project></projects><employees><employee><name>Joe</name><ssn>344556</ssn><age>34</age></employee><employee><name>Sandra</name><ssn>2234</ssn><age>35</age></employee></employees></db>', '<db><projects></projects><employees></employees></db>'],
    bad: ['<db><employees></employees><projects></projects></db>', '<db><projects><project><title>T</title><managedBy>J</managedBy><budget>1</budget></project></projects><employees/></db>', '<db><projects><employee><name>x</name><ssn>1</ssn><age>2</age></employee></projects><employees/></db>'] },
]

function Out({ r }: { r: XPathOut | null }) {
  if (!r) return null
  return r.kind === 'value' ? <div className="q-explain mono">= {r.value}</div> : (
    <div className="res" style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
      <div className="small muted">{r.items.length} node{r.items.length === 1 ? '' : 's'} selected</div>
      {r.items.map((it, i) => <pre key={i} className="code" style={{ margin: '4px 0', padding: '6px 10px' }}>{it}</pre>)}
      {!r.items.length && <div className="muted small">Empty sequence: no node matches.</div>}
    </div>
  )
}
const same = (a: XPathOut, b: XPathOut) => a.kind === b.kind && (a.kind === 'value' ? a.value === (b as typeof a).value : a.items.join('\u0001') === (b as typeof a).items.join('\u0001'))

export function XmlPlayground() {
  const [tab, setTab] = useState<'xpath' | 'dtd' | 'xquery'>('xpath')
  return (
    <div>
      <div className="stage-tabs">
        {([['xpath', 'XPath'], ['dtd', 'Well-formed & DTD validity'], ['xquery', 'XQuery (FLWOR)']] as const).map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'xpath' && <XPathTab />}
      {tab === 'dtd' && <DtdTab />}
      {tab === 'xquery' && <XQueryTab />}
    </div>
  )
}

function XPathTab() {
  const s = useSave()
  const [docKey, setDocKey] = useState('bib')
  const [xml, setXml] = useState(DOCS.bib)
  const [expr, setExpr] = useState('/Bib/paper/title')
  const [res, setRes] = useState<XPathOut | null>(null)
  const [err, setErr] = useState('')
  const [ch, setCh] = useState<XpCh | null>(null)
  const [verdict, setVerdict] = useState<boolean | null>(null)
  const run = (e = expr) => {
    const p = parseXml(xml)
    if (!p.doc) { setErr('Not well-formed: ' + p.error); setRes(null); return null }
    try { const r = xpath(p.doc, e); setRes(r); setErr(''); return { r, doc: p.doc } } catch (x) { setErr('XPath error: ' + (x as Error).message); setRes(null); return null }
  }
  const pick = (c: XpCh) => { setCh(c); setDocKey(c.doc); setXml(DOCS[c.doc]); setExpr(''); setRes(null); setVerdict(null) }
  const check = () => {
    if (!ch) return
    const got = run()
    if (!got) { setVerdict(false); return }
    const ok = same(got.r, xpath(got.doc, ch.ref))
    setVerdict(ok)
    recordAnswer('xp-' + ch.id, 'r9', 'xpath', ok, { firstTry: !s.attempts['xp-' + ch.id] })
  }
  return (
    <div className="tool-grid">
      <div>
        {ch && <div className="card" style={{ marginBottom: 8 }}><div className="small muted">XPath challenge</div><b>{ch.prompt}</b></div>}
        <div className="row" style={{ marginBottom: 6 }}>
          <select value={docKey} onChange={(e) => { setDocKey(e.target.value); setXml(DOCS[e.target.value]); setRes(null) }} aria-label="Document">{Object.keys(DOCS).map((k) => <option key={k}>{k}</option>)}</select>
          <span className="small muted">Edit the document freely; it is re-parsed on every run.</span>
        </div>
        <CodeEditor value={xml} onChange={setXml} lang="xml" minRows={8} label="XML document" />
        <CodeEditor value={expr} onChange={setExpr} lang="xpath" minRows={1} onRun={() => run()} label="XPath expression"
          bar={<><span className="tag acc">XPath 1.0 (browser engine)</span><span className="spacer" /><button className="btn sm" onClick={() => run()}>▶ Evaluate</button>{ch && <button className="btn sm primary" onClick={check}>✔ Check</button>}</>} />
        {err && <div className="res-note">⚠️ {err}</div>}
        {verdict !== null && ch && <div className="q-explain" style={{ background: verdict ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>{verdict ? '✔ Correct selection!' : '✖ Not the expected nodes.'} {!verdict && <details><summary className="small">Reveal</summary><code>{ch.ref}</code></details>}</div>}
        <Out r={res} />
      </div>
      <div className="panel" style={{ alignSelf: 'start' }}>
        <h3>Challenges</h3>
        <div style={{ display: 'grid', gap: 4 }}>
          {XPATH_CH.map((c) => <button key={c.id} className="quest" style={{ padding: '6px 10px', textAlign: 'left', cursor: 'pointer', ...(ch?.id === c.id ? { borderColor: 'var(--accent)' } : {}) }} onClick={() => pick(c)}><span>{s.attempts['xp-' + c.id]?.right ? '✅' : '⬜'}</span><span className="qt"><b style={{ fontSize: '.84rem' }}>{c.prompt}</b><span>{c.doc}</span></span></button>)}
        </div>
        <div className="small muted" style={{ marginTop: 8 }}>/ child · // descendant · [@a="v"] predicate · @a attribute · text() · [2] second (1-based) · count(), string(), contains()</div>
      </div>
    </div>
  )
}

function DtdTab() {
  const s = useSave()
  const [xml, setXml] = useState(DOCS.basket)
  const [dtd, setDtd] = useState(BASKET_DTD)
  const [chi, setChi] = useState<number | null>(null)
  const [report, setReport] = useState<{ wf: string | null; errs: string[] } | null>(null)
  const [grade, setGrade] = useState<string[] | null>(null)
  const check = () => {
    const p = parseXml(xml)
    if (!p.doc) { setReport({ wf: p.error!, errs: [] }); return }
    const d = parseDtd((p.internalDtd || '') + '\n' + dtd)
    setReport({ wf: null, errs: validate(p.doc, d, p.root) })
  }
  const gradeDtd = () => {
    if (chi === null) return
    const c = DTD_CH[chi]
    const d = parseDtd(dtd)
    const problems: string[] = []
    c.good.forEach((g, i) => { const p = parseXml(g); const e = validate(p.doc!, d); if (e.length) problems.push(`Valid test document ${i + 1} was rejected: ${e[0]}`) })
    c.bad.forEach((b, i) => { const p = parseXml(b); const e = validate(p.doc!, d); if (!e.length) problems.push(`Invalid test document ${i + 1} was accepted: ${b.slice(0, 90)}…`) })
    setGrade(problems)
    recordAnswer('dtd-' + c.id, 'r9', 'dtd', problems.length === 0, { base: 25, firstTry: !s.attempts['dtd-' + c.id] })
  }
  return (
    <div className="tool-grid">
      <div>
        {chi !== null && <div className="card" style={{ marginBottom: 8 }}><div className="small muted">DTD challenge, graded against hidden valid and invalid documents</div><b>{DTD_CH[chi].prompt}</b></div>}
        {chi === null && <CodeEditor value={xml} onChange={setXml} lang="xml" minRows={6} label="XML document" bar={<span className="tag acc">XML (a DOCTYPE with an internal [subset] also works)</span>} />}
        <CodeEditor value={dtd} onChange={setDtd} lang="dtd" minRows={6} label="DTD" bar={<><span className="tag acc">DTD</span><span className="spacer" />{chi === null ? <button className="btn sm primary" onClick={check}>✔ Check well-formed & valid</button> : <button className="btn sm primary" onClick={gradeDtd}>✔ Grade my DTD</button>}</>} />
        {report && chi === null && (
          <div className="q-explain" style={{ background: report.wf || report.errs.length ? 'var(--bad-soft)' : 'var(--ok-soft)' }}>
            {report.wf ? <><b>✖ Not well-formed.</b> {report.wf}</> : report.errs.length ? <><b>Well-formed but INVALID</b><ul>{report.errs.map((e) => <li key={e}>{e}</li>)}</ul></> : <b>✔ Well-formed and valid!</b>}
          </div>
        )}
        {grade && chi !== null && <div className="q-explain" style={{ background: grade.length ? 'var(--bad-soft)' : 'var(--ok-soft)' }}>{grade.length ? <ul>{grade.map((g) => <li key={g}>{g}</li>)}</ul> : <b>✔ Your DTD accepts every valid test document and rejects every invalid one.</b>}</div>}
      </div>
      <div className="panel" style={{ alignSelf: 'start' }}>
        <h3>Presets</h3>
        <div style={{ display: 'grid', gap: 4 }}>
          <button className="btn sm" onClick={() => { setChi(null); setXml(DOCS.basket); setDtd(BASKET_DTD); setReport(null) }}>Basket (fix it to make it valid)</button>
          <button className="btn sm" onClick={() => { setChi(null); setXml('<basket>\n  <Cherry flavor=good>\n</Basket>'); setDtd('<!ELEMENT Basket (Cherry+)>\n<!ELEMENT Cherry EMPTY>\n<!ATTLIST Cherry flavor CDATA #REQUIRED>'); setReport(null) }}>Not well-formed example</button>
          <button className="btn sm" onClick={() => { setChi(null); setXml('<Job>\n  <Location>Home</Location>\n</Job>'); setDtd('<!ELEMENT Basket (Cherry+)>\n<!ELEMENT Cherry EMPTY>'); setReport(null) }}>Well-formed but invalid</button>
          {DTD_CH.map((c, i) => <button key={c.id} className="btn sm" onClick={() => { setChi(i); setDtd(c.starter); setGrade(null) }}>{s.attempts['dtd-' + c.id]?.right ? '✅ ' : ''}Challenge: {i === 0 ? 'address book DTD' : 'relational DB DTD'}</button>)}
        </div>
        <div className="small muted" style={{ marginTop: 8 }}>, sequence · | choice · * zero or more · + one or more · ? optional · EMPTY · ANY · (#PCDATA)</div>
      </div>
    </div>
  )
}

function XQueryTab() {
  const s = useSave()
  const [xml, setXml] = useState(DOCS.books)
  const [q, setQ] = useState('for $b in doc("bibliography.xml")/bibliography/book\nwhere xs:integer($b/year) >= 1999\nreturn <result>{ data($b/title) }</result>')
  const [res, setRes] = useState<{ out: string[]; trace: string[] } | null>(null)
  const [err, setErr] = useState('')
  const [solved, setSolved] = useState<boolean | null>(null)
  const run = () => {
    const p = parseXml(xml)
    if (!p.doc) { setErr('Not well-formed: ' + p.error); return null }
    try { const r = flwor(p.doc, q); setRes(r); setErr(''); return r } catch (e) { setErr((e as Error).message); setRes(null); return null }
  }
  const challenge = useMemo(() => ({ prompt: 'Return <t>…</t> elements holding the titles of ALL books, ordered by year from oldest to newest.', expect: ['<t>The Character of Physical Law</t>', '<t>Foundations of Databases</t>', '<t>Data on the Web</t>'] }), [])
  const check = () => {
    const r = run()
    const ok = !!r && r.out.join('') .replace(/\s+/g, '') === challenge.expect.join('').replace(/\s+/g, '')
    setSolved(ok)
    recordAnswer('xq-order', 'r9', 'xquery', ok, { base: 20, firstTry: !s.attempts['xq-order'] })
  }
  return (
    <div className="tool-grid">
      <div>
        <CodeEditor value={xml} onChange={setXml} lang="xml" minRows={5} label="XML document" />
        <CodeEditor value={q} onChange={setQ} lang="xquery" minRows={4} onRun={run} label="XQuery"
          bar={<><span className="tag acc">FLWOR subset: for · let · where · order by · return</span><span className="spacer" /><button className="btn sm" onClick={run}>▶ Run</button><button className="btn sm primary" onClick={check}>✔ Check challenge</button></>} />
        {err && <div className="res-note">⚠️ {err}</div>}
        {solved !== null && <div className="q-explain" style={{ background: solved ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>{solved ? '✔ Challenge solved!' : '✖ Not yet. Use order by with a numeric year and return <t>{data($b/title)}</t>.'}</div>}
        {res && (
          <div className="res" style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
            {res.out.map((o, i) => <pre key={i} className="code" style={{ margin: '4px 0', padding: '6px 10px' }}>{o}</pre>)}
            {!res.out.length && <div className="muted small">Empty result.</div>}
            <details style={{ marginTop: 6 }} open><summary className="small">Execution trace</summary><ol className="small">{res.trace.map((t, i) => <li key={i}>{t}</li>)}</ol></details>
          </div>
        )}
      </div>
      <div className="panel" style={{ alignSelf: 'start' }}>
        <h3>Challenge</h3>
        <p className="small">{challenge.prompt}</p>
        <p className="small muted">Paths inside clauses are relative to the bound variable ($b/year). xs:integer() and data() are supported. This is a teaching subset of XQuery, not a full engine.</p>
      </div>
    </div>
  )
}

// ---------------- lesson widgets ----------------
export function WellformedWidget() {
  const presets: [string, string][] = [['valid', '<Basket>\n  <Cherry flavor="good"/>\n</Basket>'], ['case mismatch', '<Book>Text</book>'], ['overlap', '<a><b></a></b>'], ['two roots', '<a/><b/>'], ['raw <', '<note>2 < 3</note>'], ['unquoted attribute', '<Cherry flavor=good/>']]
  const [xml, setXml] = useState(presets[0][1])
  const p = parseXml(xml)
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small" style={{ marginBottom: 6 }}><b>Well-formedness checker</b>{presets.map(([l, x]) => <button key={l} className="btn sm" onClick={() => setXml(x)}>{l}</button>)}</div>
      <CodeEditor value={xml} onChange={setXml} lang="xml" minRows={3} label="XML" />
      <div className="q-explain" style={{ background: p.doc ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>{p.doc ? '✔ Well-formed.' : '✖ Not well-formed: ' + p.error}</div>
    </div>
  )
}
export function DtdBasketWidget() {
  const [xml, setXml] = useState(DOCS.basket)
  const p = parseXml(xml)
  const errs = p.doc ? validate(p.doc, parseDtd(BASKET_DTD)) : []
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="small"><b>Make the basket valid.</b> DTD: Basket (Cherry+, (Apple | Orange)*); Cherry needs flavor; Apple needs color.</div>
      <CodeEditor value={xml} onChange={setXml} lang="xml" minRows={5} label="XML" />
      <div className="q-explain" style={{ background: p.doc && !errs.length ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>
        {!p.doc ? '✖ Not well-formed: ' + p.error : errs.length ? <><b>Well-formed but invalid:</b><ul>{errs.map((e) => <li key={e}>{e}</li>)}</ul></> : '✔ Well-formed and valid!'}
      </div>
    </div>
  )
}
export function XPathWidget() {
  const [expr, setExpr] = useState('/Bib/paper/author/lastname')
  const p = useMemo(() => parseXml(DOCS.bib), [])
  let r: XPathOut | null = null, err = ''
  try { r = xpath(p.doc!, expr) } catch (e) { err = (e as Error).message }
  return (
    <div className="panel" style={{ margin: '14px 0' }}>
      <div className="row small" style={{ marginBottom: 6 }}><b>XPath on the bibliography</b>{['/Bib/paper', '//title', '/Bib/paper[@id="p2"]/author/lastname', '/Bib/paper/@id', '//lastname/text()'].map((x) => <button key={x} className="btn sm" onClick={() => setExpr(x)}>{x}</button>)}</div>
      <details><summary className="small muted">show the document</summary><pre className="code">{DOCS.bib}</pre></details>
      <input type="text" value={expr} onChange={(e) => setExpr(e.target.value)} style={{ width: '100%', fontFamily: 'var(--f-code)', margin: '6px 0' }} aria-label="XPath" />
      {err ? <div className="res-note">⚠️ {err}</div> : <Out r={r} />}
    </div>
  )
}
