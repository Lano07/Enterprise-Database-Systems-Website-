import { useEffect } from 'react'
import { useRoute } from './ui/router'
import { Hud, Overlays } from './ui/Hud'
import { useSave } from './game/store'
import { Home } from './pages/Home'
import { LearnIndex, RealmPage } from './pages/Realm'
import { LessonPage } from './pages/Lesson'
import { Practice } from './pages/Practice'
import { Arena } from './pages/Arena'
import { Boss } from './pages/Boss'
import { Bounty } from './pages/Bounty'
import { ExamArena } from './pages/Exam'
import { Cards } from './pages/Cards'
import { Codex } from './pages/Codex'
import { Glossary } from './pages/Glossary'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { WrittenPage } from './pages/Written'
import { ToolsIndex, ToolPage } from './pages/Tools'
import { Campaigns } from './pages/Campaigns'

const NAV: [string, string, string[]][] = [
  ['#/', 'Map', ['']],
  ['#/learn', 'Learn', ['learn', 'realm', 'lesson']],
  ['#/practice', 'Quests', ['practice', 'bounty', 'raid', 'cards', 'written']],
  ['#/arena', 'Sandbox', ['arena']],
  ['#/tools', 'Simulators', ['tools']],
  ['#/exam', 'Exam Arena', ['exam', 'boss']],
  ['#/progress', 'Progress', ['progress']],
  ['#/settings', '⚙', ['settings']],
]

export default function App() {
  const { parts, query } = useRoute()
  const s = useSave()
  const [p0 = '', p1, p2] = parts

  useEffect(() => {
    const root = document.documentElement
    if (s.settings.theme === 'auto') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', s.settings.theme)
    root.classList.toggle('reduce-motion', !s.settings.motion)
  }, [s.settings.theme, s.settings.motion])

  let page
  switch (p0) {
    case '': page = <Home />; break
    case 'learn': page = <LearnIndex />; break
    case 'realm': page = <RealmPage key={p1} id={p1} />; break
    case 'lesson': page = <LessonPage key={p1} id={p1} />; break
    case 'practice': page = <Practice key={query.toString()} realm={query.get('realm') || undefined} topic={query.get('topic') || undefined} />; break
    case 'raid': page = <Practice raid />; break
    case 'arena': page = <Arena challenge={p1} lang={query.get('lang') || undefined} />; break
    case 'boss': page = <Boss key={p1} realm={p1} />; break
    case 'bounty': page = <Bounty />; break
    case 'exam': page = <ExamArena mode={p1} />; break
    case 'cards': page = <Cards key={query.toString()} realm={query.get('realm') || undefined} />; break
    case 'codex': page = <Codex key={p1} realm={p1} />; break
    case 'glossary': page = <Glossary />; break
    case 'progress': page = <Progress />; break
    case 'settings': page = <Settings />; break
    case 'written': page = <WrittenPage key={(p1 || '') + query.toString()} id={p1} realm={query.get('realm') || undefined} />; break
    case 'tools': page = p1 ? <ToolPage key={p1 + '/' + (p2 || '')} id={p1} stage={p2} /> : <ToolsIndex />; break
    case 'campaigns': page = <Campaigns />; break
    default: page = <div className="page"><h1 className="title">Lost in the data lake</h1><p>That page does not exist. <a href="#/">Back to the map</a>.</p></div>
  }

  return (
    <>
      <header className="top">
        <div className="top-in">
          <a className="brand" href="#/"><b>DB<i>Quest</i></b><span>COMP2605 · Enterprise Architect</span></a>
          <nav className="nav" aria-label="Main">
            {NAV.map(([href, label, keys]) => (
              <a key={href} href={href} className={keys.includes(p0) ? 'on' : ''} aria-label={label === '⚙' ? 'Settings' : undefined}>{label}</a>
            ))}
          </nav>
        </div>
        <Hud />
      </header>
      <main>{page}</main>
      <footer className="foot no-print">
        DBQuest teaches COMP2605 Enterprise Database Systems from the course lecture notes (Dr. Koffka Khan) and Connolly &amp; Begg, <i>Database Systems</i>. Progress is saved in this browser. <a href="#/settings">Back it up</a>.
      </footer>
      <Overlays />
    </>
  )
}
