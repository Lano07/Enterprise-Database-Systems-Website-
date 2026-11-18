// ERD Forge: turn paired business-rule sentences into UML multiplicities, then resolve M:N.
import { useState } from 'react'
import { toolLevel, recordAnswer, useSave, emit } from '../game/store'
import { MULTS, RelSvg, type Mult } from './widgets2'

interface Stage {
  title: string
  story: string
  a: string; b: string; name: string
  rules: [string, string]
  ma: Mult; mb: Mult
  attrsA: string[]; attrsB: string[]
  resolve?: {
    bridge: string
    pool: string[]           // attributes offered
    keep: string[]           // must be in the bridge
    pk: string[]             // exact primary key
    note: string
    fks: string[]
  }
}

const STAGES: Stage[] = [
  {
    title: 'Manages (1:1)', story: 'DreamHome: every branch has a manager; most staff manage nothing.',
    a: 'Staff', b: 'Branch', name: 'Manages', rules: ['Each member of Staff may manage zero or one Branch.', 'Each Branch must be managed by one and only one member of Staff.'],
    ma: '1..1', mb: '0..1', attrsA: ['staffNo {PK}', 'name', 'position'], attrsB: ['branchNo {PK}', 'address'],
  },
  {
    title: 'Oversees (1:*)', story: 'SG37 oversees PG21 and PG36; SG5 oversees none; PG4 is overseen by nobody.',
    a: 'Staff', b: 'PropertyForRent', name: 'Oversees', rules: ['Each member of Staff may oversee zero or more PropertyForRent.', 'Each PropertyForRent may be overseen by zero or one member of Staff.'],
    ma: '0..1', mb: '0..*', attrsA: ['staffNo {PK}', 'name'], attrsB: ['propertyNo {PK}', 'rooms', 'rent'],
  },
  {
    title: 'Enrolment (M:N)', story: 'Academic Database, Task 2 rule 2. Then resolve it, as in Task 1 of the ERD lecture.',
    a: 'Student', b: 'Course', name: 'enrolls in', rules: ['Each STUDENT may enroll in one or more COURSE.', 'Each COURSE must have enrolled one or more STUDENT.'],
    ma: '1..*', mb: '0..*', attrsA: ['studentId {PK}', 'firstName', 'lastName'], attrsB: ['courseId {PK}', 'name'],
    resolve: {
      bridge: 'Enrollment', pool: ['studentId', 'courseId', 'registrationYear', 'eligibilityForExam', 'firstName', 'name', 'lastName'],
      keep: ['studentId', 'courseId', 'registrationYear', 'eligibilityForExam'], pk: ['studentId', 'courseId'], fks: ['studentId', 'courseId'],
      note: 'registrationYear and eligibilityForExam describe one student’s enrolment in one course, so they belong in the bridge. Names describe the parents and stay there.',
    },
  },
  {
    title: 'Advertises (M:N)', story: 'Newspapers advertise many properties; a property appears in many newspapers on different dates, each at a cost.',
    a: 'Newspaper', b: 'PropertyForRent', name: 'Advertises', rules: ['Each Newspaper must advertise one or more PropertyForRent.', 'Each PropertyForRent may be advertised in zero or more Newspapers.'],
    ma: '0..*', mb: '1..*', attrsA: ['newspaperName {PK}', 'telNo'], attrsB: ['propertyNo {PK}', 'rent'],
    resolve: {
      bridge: 'Advert', pool: ['propertyNo', 'newspaperName', 'dateAdvert', 'cost', 'rent', 'telNo'],
      keep: ['propertyNo', 'newspaperName', 'dateAdvert', 'cost'], pk: ['propertyNo', 'newspaperName', 'dateAdvert'], fks: ['propertyNo', 'newspaperName'],
      note: 'The lecture’s Advert entity: a property can be advertised in the same newspaper on different dates, so dateAdvert must join the composite key.',
    },
  },
  {
    title: 'Borrows (M:N)', story: 'Library DB: a member may borrow the same book again next month, and every loan must be kept.',
    a: 'Member', b: 'Book', name: 'borrows', rules: ['Each Member may borrow zero or more Books.', 'Each Book may be borrowed by zero or more Members.'],
    ma: '0..*', mb: '0..*', attrsA: ['memberId {PK}', 'name', 'dateJoined'], attrsB: ['bookId {PK}', 'bookName', 'edition'],
    resolve: {
      bridge: 'Loan', pool: ['loanId', 'memberId', 'bookId', 'dateBorrowed', 'dateDue', 'dateReturned', 'bookName', 'dateJoined'],
      keep: ['loanId', 'memberId', 'bookId', 'dateBorrowed', 'dateDue', 'dateReturned'], pk: ['loanId'], fks: ['memberId', 'bookId'],
      note: '(memberId, bookId) would forbid borrowing the same book twice, the assumption the lecture warns about. A surrogate loanId is the primary key; memberId and bookId remain foreign keys.',
    },
  },
]

export function ErdForge({ stage }: { stage?: string }) {
  const s = useSave()
  const cleared = s.tools['erd'] || 0
  const [i, setI] = useState(Math.min(Number(stage) || cleared, STAGES.length - 1))
  return (
    <div>
      <p className="lede">Read each pair of business rules, place the multiplicity beside each entity, and resolve every many-to-many relationship into a bridge entity. Remember: the number beside an entity counts <b>that</b> entity for <b>one</b> instance at the other end.</p>
      <div className="stage-tabs">
        {STAGES.map((st, k) => <button key={k} className={(k === i ? 'on ' : '') + (k < cleared ? 'done' : '')} disabled={k > cleared && !s.settings.freeRoam} onClick={() => setI(k)}>{k + 1}. {st.title}</button>)}
      </div>
      <StageView key={i} st={STAGES[i]} idx={i} onClear={() => { toolLevel('erd', i + 1, 50); if (i + 1 < STAGES.length) setTimeout(() => setI(i + 1), 900) }} />
    </div>
  )
}

function tag(x: string, r: NonNullable<Stage['resolve']>) {
  const t = [r.pk.includes(x) ? 'PK' : '', r.fks.includes(x) ? 'FK' : ''].filter(Boolean)
  return t.length ? ' {' + t.join(', ') + '}' : ''
}

function StageView({ st, idx, onClear }: { st: Stage; idx: number; onClear: () => void }) {
  const [ma, setMa] = useState<Mult | ''>('')
  const [mb, setMb] = useState<Mult | ''>('')
  const [phase, setPhase] = useState<'mult' | 'resolve' | 'done'>('mult')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [inBridge, setInBridge] = useState<string[]>([])
  const [pk, setPk] = useState<string[]>([])
  const [bma, setBma] = useState<Mult | ''>('')
  const [bmb, setBmb] = useState<Mult | ''>('')

  const checkMult = () => {
    const ok = ma === st.ma && mb === st.mb
    recordAnswer(`erd-${idx}-mult`, 'r3', 'multiplicity', ok)
    if (!ok) {
      const tips: string[] = []
      if (mb !== st.mb) tips.push(`Beside ${st.b}: rule 1 says each ${st.a} “${st.rules[0].split(' ').slice(-4).join(' ')}”. Translate must/may into the minimum and the quantity into the maximum.`)
      if (ma !== st.ma) tips.push(`Beside ${st.a}: rule 2 describes how many ${st.a} relate to one ${st.b}.`)
      setMsg({ ok: false, text: tips.join(' ') })
      return
    }
    if (st.resolve) { setMsg({ ok: true, text: `Correct: ${st.ma.endsWith('*') && st.mb.endsWith('*') ? 'this is many-to-many, so it cannot be implemented with a foreign key. Resolve it with a bridge entity.' : ''}` }); setPhase('resolve') }
    else { setMsg({ ok: true, text: 'Correct multiplicities! Stage cleared.' }); setPhase('done'); onClear() }
  }
  const r = st.resolve
  const checkBridge = () => {
    if (!r) return
    const missing = r.keep.filter((x) => !inBridge.includes(x))
    const extra = inBridge.filter((x) => !r.keep.includes(x))
    const pkOk = pk.length === r.pk.length && r.pk.every((x) => pk.includes(x))
    // multiplicities beside the bridge: Student-side link takes the old multiplicity beside Course, and vice versa
    const multOk = bma === st.mb && bmb === st.ma
    const ok = !missing.length && !extra.length && pkOk && multOk
    recordAnswer(`erd-${idx}-bridge`, 'r3', 'mn-resolve', ok, { base: 20 })
    if (ok) { setMsg({ ok: true, text: `${r.bridge} resolves the M:N into two one-to-many relationships. ${r.note}` }); setPhase('done'); onClear(); emit({ type: 'toast', text: `🗺️ ${r.bridge} forged!`, tone: 'ok' }) }
    else {
      const t: string[] = []
      if (missing.length) t.push(`Missing from ${r.bridge}: ${missing.join(', ')}.`)
      if (extra.length) t.push(`${extra.join(', ')} describe${extra.length === 1 ? 's' : ''} a parent entity, not the relationship.`)
      if (!pkOk) t.push('Check the primary key: which attributes together identify one occurrence of the bridge?')
      if (!multOk) t.push(`Check the multiplicities beside ${r.bridge}: the ${st.a}–${r.bridge} link keeps the old multiplicity that was beside ${st.b}, and the ${st.b}–${r.bridge} link keeps the one beside ${st.a}.`)
      setMsg({ ok: false, text: t.join(' ') })
    }
  }

  return (
    <div className="tool-grid">
      <div className="panel">
        <h3>{st.title}</h3>
        <p className="small muted" style={{ marginTop: 0 }}>{st.story}</p>
        <div className="q-explain" style={{ marginTop: 0 }}><div>1️⃣ {st.rules[0]}</div><div>2️⃣ {st.rules[1]}</div></div>
        <div className="svg-wrap" style={{ marginTop: 10, padding: 8 }}>
          <RelSvg a={st.a} b={st.b} name={st.name} ma={ma || '?'} mb={mb || '?'} attrsA={st.attrsA} attrsB={st.attrsB} />
        </div>
        {phase === 'mult' && (
          <div className="row" style={{ marginTop: 10 }}>
            <label className="small">beside <b>{st.a}</b> <select value={ma} onChange={(e) => setMa(e.target.value as Mult)}><option value="">?</option>{MULTS.map((m) => <option key={m}>{m}</option>)}</select></label>
            <label className="small">beside <b>{st.b}</b> <select value={mb} onChange={(e) => setMb(e.target.value as Mult)}><option value="">?</option>{MULTS.map((m) => <option key={m}>{m}</option>)}</select></label>
            <button className="btn primary" disabled={!ma || !mb} onClick={checkMult}>Check</button>
          </div>
        )}
        {phase !== 'mult' && r && (
          <div style={{ marginTop: 12 }}>
            <h3>Resolve with a bridge entity: <span className="mono">{r.bridge}</span></h3>
            <div className="small muted">Click attributes to put them in {r.bridge}; click ★ to mark primary-key attributes.</div>
            <div style={{ margin: '8px 0' }}>
              {r.pool.map((x) => (
                <span key={x} className={'attr-chip' + (inBridge.includes(x) ? ' on' : '') + (pk.includes(x) ? ' pk' : '')} onClick={() => phase === 'resolve' && setInBridge((v) => (v.includes(x) ? v.filter((y) => y !== x) : [...v, x]))}>
                  {x}
                  {inBridge.includes(x) && <b role="button" aria-label={`toggle ${x} as key`} onClick={(e) => { e.stopPropagation(); if (phase === 'resolve') setPk((v) => (v.includes(x) ? v.filter((y) => y !== x) : [...v, x])) }} style={{ marginLeft: 4 }}>{pk.includes(x) ? '★' : '☆'}</b>}
                </span>
              ))}
            </div>
            <div className="row">
              <label className="small">beside <b>{r.bridge}</b> on the {st.a} link <select value={bma} onChange={(e) => setBma(e.target.value as Mult)} disabled={phase === 'done'}><option value="">?</option>{MULTS.map((m) => <option key={m}>{m}</option>)}</select></label>
              <label className="small">beside <b>{r.bridge}</b> on the {st.b} link <select value={bmb} onChange={(e) => setBmb(e.target.value as Mult)} disabled={phase === 'done'}><option value="">?</option>{MULTS.map((m) => <option key={m}>{m}</option>)}</select></label>
              {phase === 'resolve' && <button className="btn primary" disabled={!inBridge.length || !pk.length || !bma || !bmb} onClick={checkBridge}>Forge bridge</button>}
            </div>
            {phase === 'done' && (
              <div className="svg-wrap" style={{ marginTop: 10, padding: 8 }}>
                <RelSvg a={st.a} b={r.bridge} name="has" ma="1..1" mb={st.mb} attrsA={st.attrsA.slice(0, 1)} attrsB={r.keep.map((x) => x + tag(x, r))} hlB />
                <RelSvg a={st.b} b={r.bridge} name="has" ma="1..1" mb={st.ma} attrsA={st.attrsB.slice(0, 1)} attrsB={[]} hlB />
              </div>
            )}
          </div>
        )}
        {msg && <div className="q-explain" style={{ background: msg.ok ? 'var(--ok-soft)' : 'var(--bad-soft)' }}>{msg.ok ? '✔ ' : '✖ '}{msg.text}</div>}
      </div>
      <div className="panel" style={{ alignSelf: 'start' }}>
        <h3>Cheat strip</h3>
        <div className="kv small">
          <dt>must</dt><dd>minimum 1</dd><dt>may</dt><dd>minimum 0</dd><dt>one and only one</dt><dd>maximum 1</dd><dt>one or more / zero or more</dt><dd>maximum *</dd>
        </div>
        <p className="small" style={{ marginTop: 10 }}>Rule 1 talks about one <b>{st.a}</b>, so its answer goes <b>beside {st.b}</b>. Rule 2 talks about one <b>{st.b}</b>, so its answer goes <b>beside {st.a}</b>.</p>
        <p className="small muted">Cardinality = the maximums. Participation = the minimums, read on the opposite side.</p>
      </div>
    </div>
  )
}
