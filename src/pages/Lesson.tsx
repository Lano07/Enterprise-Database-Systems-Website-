import { useMemo, useState } from 'react'
import { CONTENT, lessonById, questionById } from '../content'
import { realmById } from '../content/realms'
import { Md, parse } from '../engine/md'
import { completeLesson, useSave } from '../game/store'
import { isUnlocked } from '../game/progress'
import { QuestionCard } from '../ui/QuestionCard'
import { SqlBlock } from '../ui/SqlBlock'
import { highlight } from '../ui/CodeEditor'
import { Widget } from '../tools/widgets'

export function LessonPage({ id }: { id: string }) {
  const s = useSave()
  const lesson = lessonById(id)
  const [answered, setAnswered] = useState<Set<string>>(new Set())
  const checks = useMemo(() => (lesson ? collectChecks(lesson.body) : []), [lesson])
  if (!lesson) return <div className="page">Lesson not found. <a href="#/learn">All lessons</a>.</div>
  const realm = realmById(lesson.realm)!
  const list = CONTENT[lesson.realm].lessons
  const idx = list.findIndex((l) => l.id === id)
  const next = list[idx + 1]
  const done = !!s.lessons[id]
  const allAnswered = checks.every((c) => answered.has(c))
  const open = isUnlocked(lesson.realm, s)
  const heads = parse(lesson.body).filter((n) => n.k === 'h' && n.level === 2) as { text: string }[]

  return (
    <div className="page wide">
      <div className="lesson-wrap">
        <nav className="lesson-side" aria-label="Lessons in this realm">
          <div className="small muted" style={{ marginBottom: 6 }}><a href={`#/realm/${realm.id}`} style={{ color: realm.color, fontWeight: 600 }}>{realm.icon} Realm {realm.n}: {realm.short}</a></div>
          {list.map((l) => <a key={l.id} href={`#/lesson/${l.id}`} className={(l.id === id ? 'on ' : '') + (s.lessons[l.id] ? 'done' : '')}>{l.title}</a>)}
          {heads.length > 1 && (
            <>
              <div className="small muted" style={{ margin: '14px 0 4px' }}>On this page</div>
              {heads.map((h, i) => <a key={i} href={`#/lesson/${id}`} onClick={(e) => { e.preventDefault(); document.querySelectorAll('.md h2')[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className="small">{h.text.replace(/\*\*/g, '')}</a>)}
            </>
          )}
        </nav>
        <article>
          <div className="crumbs"><a href="#/">Map</a><span>›</span><a href={`#/realm/${realm.id}`}>Realm {realm.n}</a><span>›</span><span>Lesson {idx + 1} of {list.length}</span></div>
          <h1 className="title">{lesson.title}</h1>
          <div className="muted small">{lesson.mins} min · Source: {lesson.src.join(', ')} {done && <span className="tag ok">cleared</span>}</div>
          {!open && <div className="maint" style={{ marginTop: 12 }}>🔒 This realm is still locked, but you can read ahead. Challenges here still earn XP.</div>}
          <Md src={lesson.body} hooks={{
            question: (qid) => {
              const q = questionById(qid)
              if (!q) return <div className="empty">Missing challenge {qid}</div>
              return <QuestionCard q={q} label="Story Quest check" onDone={() => setAnswered((a) => new Set(a).add(qid))} />
            },
            widget: (wid) => <Widget id={wid} />,
            code: (lang, code, runnable) => {
              const [base, ds] = lang.split(':')
              if (base === 'sql' && runnable) return <SqlBlock code={code} dataset={ds || 'dreamhome'} />
              return <pre className="code"><code dangerouslySetInnerHTML={{ __html: highlight(code, base) }} /></pre>
            },
          }} />
          <div className="lesson-foot">
            {done ? (
              <span className="tag ok">✔ Lesson cleared</span>
            ) : (
              <button className="btn primary" disabled={!allAnswered} onClick={() => completeLesson(id)}>
                {allAnswered ? 'Clear lesson (+50 XP)' : `Answer all ${checks.length} challenge${checks.length === 1 ? '' : 's'} to clear (${checks.filter((c) => answered.has(c)).length}/${checks.length})`}
              </button>
            )}
            <span className="spacer" />
            {next ? <a className="btn" href={`#/lesson/${next.id}`}>Next: {next.title} →</a> : <a className="btn" href={`#/realm/${realm.id}`}>Back to the realm hub →</a>}
          </div>
        </article>
      </div>
    </div>
  )
}

function collectChecks(src: string) {
  const out: string[] = []
  src.replace(/\{\{q:([\w-]+)\}\}/g, (_m, id) => { out.push(id); return '' })
  return out
}
