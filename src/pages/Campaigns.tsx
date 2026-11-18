import { realmById } from '../content/realms'
import { useSave, type Save } from '../game/store'

type Step = { label: string; href: string; done: (s: Save) => boolean }
interface Campaign { id: string; icon: string; title: string; client: string; brief: string; steps: Step[] }

const lesson = (id: string) => (s: Save) => !!s.lessons[id]
const tool = (id: string, n: number) => (s: Save) => (s.tools[id] || 0) >= n
const sql = (...ids: string[]) => (s: Save) => ids.every((i) => s.sql[i])
const q = (...ids: string[]) => (s: Save) => ids.every((i) => s.attempts[i]?.right)

const CAMPAIGNS: Campaign[] = [
  {
    id: 'dreamhome', icon: '🏠', title: 'DreamHome Property Rental', client: 'DreamHome (Relational Model, Relational Operators, ER Modelling, Normalization, SQL lectures)',
    brief: 'Take DreamHome from scattered lease forms to a normalized, queryable database: relations and keys, relational algebra reports, an ER model, a 3NF design and working SQL.',
    steps: [
      { label: 'Read the DreamHome relations and their keys', href: '#/lesson/r1-keys', done: lesson('r1-keys') },
      { label: 'Survive the Integrity Shields on DreamHome data', href: '#/lesson/r1-integrity', done: lesson('r1-integrity') },
      { label: 'Answer management’s questions with relational algebra', href: '#/arena?lang=ra', done: q('ra-ra4', 'ra-ra9') },
      { label: 'Model Manages, Oversees and Advertises in the ERD Forge', href: '#/tools/erd', done: tool('erd', 4) },
      { label: 'Normalize the ClientRental lease form to 3NF', href: '#/tools/forge', done: tool('forge', 4) },
      { label: 'Ship the SQL: semijoin, division and the outer-join status report', href: '#/arena/r2-s4', done: sql('r2-s4', 'r2-s5', 'r2-s6') },
    ],
  },
  {
    id: 'academic', icon: '🎓', title: 'Academic Database (School Management System)', client: 'Relational Model Task 5 · ERD Tasks 1–2 · Normalization Task 5',
    brief: 'Departments offer courses in academic sessions, faculty teach them, students enrol, parents are recorded, attendance decides exam eligibility, and faculty logins are logged.',
    steps: [
      { label: 'Identify entities, attributes and unique identifiers', href: '#/lesson/r3-entities', done: lesson('r3-entities') },
      { label: 'Write the cardinalities from the paired “must/may” sentences', href: '#/lesson/r3-multiplicity', done: lesson('r3-multiplicity') },
      { label: 'Resolve STUDENT–COURSE with an Enrollment bridge entity', href: '#/tools/erd/2', done: tool('erd', 3) },
      { label: 'Check CLASS ENROLLMENT against 2NF', href: '#/lesson/r4-2nf3nf', done: lesson('r4-2nf3nf') },
    ],
  },
  {
    id: 'abc', icon: '🏫', title: 'ABC School District Registration', client: 'Introduction lecture, Task 1–2',
    brief: 'Design what an on-line student registration and profile-update system must capture, and what information the district can derive from it.',
    steps: [
      { label: 'Data vs information and data utility', href: '#/lesson/r1-data', done: lesson('r1-data') },
      { label: 'What a DBMS will do for the district', href: '#/lesson/r1-components', done: lesson('r1-components') },
      { label: 'Defeat the Flat-File Hydra (Realm 1 boss)', href: '#/boss/r1', done: (s) => !!s.bosses['r1']?.beaten },
    ],
  },
  {
    id: 'libbook', icon: '💿', title: 'LibBook Digital Library', client: 'Relational Model Task 1 · Business Rules lecture',
    brief: 'Introduce corporate, student and individual memberships with fees, privileges and justification-gated changes. Turn it all into atomic business rules.',
    steps: [
      { label: 'Learn the business-rule pattern and rule types', href: '#/lesson/r2-rules', done: lesson('r2-rules') },
      { label: 'Decide where the “change only with justification” rule is enforced', href: '#/practice?realm=r2&topic=rules', done: q('r2-libbook') },
      { label: 'Write the SunStar/LibBook rule set (written answer)', href: '#/written/r2-w1', done: (s) => !!s.written['r2-w1'] },
    ],
  },
  {
    id: 'sports', icon: '🏓', title: 'SunStar Rentals & the Sports-Club Flat File', client: 'Business Rules lecture · FD & Normalization',
    brief: 'A flat file with SPORT_1/PRICE_1/SPORT_2/PRICE_2 repeating groups is leaking anomalies. Rescue it into Student, Sport and Participation.',
    steps: [
      { label: 'Why the flat file is fragile', href: '#/lesson/r2-why', done: lesson('r2-why') },
      { label: 'Forge the sports file from UNF to 3NF', href: '#/tools/forge', done: tool('forge', 3) },
      { label: 'Flatten, rebuild and update the data in SQL', href: '#/arena/r4-s1', done: sql('r4-s1', 'r4-s2', 'r4-s3', 'r4-s4') },
    ],
  },
  {
    id: 'library', icon: '📚', title: 'Library Database (Book, Member, Loan)', client: 'ERD lecture Example 4–5 · Query Processing & Join Access Methods',
    brief: 'Model loans as a bridge entity, then make the “books borrowed on a date” report fast with the right access methods.',
    steps: [
      { label: 'Resolve Member borrows Book with Loan', href: '#/tools/erd/4', done: tool('erd', 5) },
      { label: 'Trace the query through the Query Manager', href: '#/lesson/r5-steps', done: lesson('r5-steps') },
      { label: 'Beat every read budget in the Optimizer Tycoon', href: '#/tools/optimizer', done: tool('optimizer', 5) },
    ],
  },
  {
    id: 'inventory', icon: '📦', title: 'Vendor & Product Inventory', client: 'SQL and Oracle Database · Triggers and Stored Procedures',
    brief: 'Build, query and automate the vendor/product inventory, ending with a trigger that maintains reorder flags.',
    steps: [
      { label: 'DDL: tables, constraints and referential actions', href: '#/lesson/r8-ddl', done: lesson('r8-ddl') },
      { label: 'Aggregates and HAVING on the inventory', href: '#/arena/r8-s5', done: sql('r8-s5', 'r8-s7') },
      { label: 'Create the VendorTotal view', href: '#/arena/r8-s11', done: sql('r8-s11') },
      { label: 'Automate reorder flags with a trigger', href: '#/arena/r8-s12', done: sql('r8-s12') },
    ],
  },
  {
    id: 'bank', icon: '🏦', title: 'The Bank That Created Money', client: 'Transaction Management · Concurrency Control and Deadlock',
    brief: 'A half-finished transfer, two ATMs racing, and a crash mid-shift. Restore ACID, serializability and the committed state.',
    steps: [
      { label: 'Make the $500 transfer atomic', href: '#/arena/r7-s1', done: sql('r7-s1') },
      { label: 'Defuse the lost update, dirty read and inconsistent analysis', href: '#/tools/concurrency', done: tool('concurrency', 3) },
      { label: 'Break the T3/T4 deadlock', href: '#/tools/concurrency/5', done: tool('concurrency', 6) },
      { label: 'Recover after the crash with UNDO and REDO lists', href: '#/tools/concurrency/6', done: tool('concurrency', 7) },
    ],
  },
]

export function Campaigns() {
  const s = useSave()
  return (
    <div className="page">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><span>Case-study campaigns</span></div>
      <h1 className="title">🏢 Case-study campaigns</h1>
      <p className="lede">Each campaign strings together lessons, simulators and SQL quests around one of the case studies used in the COMP2605 lecture notes. Steps tick themselves off as you complete them anywhere in DBQuest.</p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {CAMPAIGNS.map((c) => {
          const done = c.steps.filter((st) => st.done(s)).length
          return (
            <section key={c.id} className="card">
              <div className="row"><span style={{ fontSize: '1.6rem' }}>{c.icon}</span><div style={{ flex: 1 }}><h3 style={{ margin: 0 }}>{c.title}</h3><div className="small muted">{c.client}</div></div>{done === c.steps.length && <span className="tag ok">complete</span>}</div>
              <p style={{ marginTop: 8 }}>{c.brief}</p>
              <div className="bar" style={{ marginBottom: 8 }}><i style={{ width: `${(100 * done) / c.steps.length}%` }} /></div>
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                {c.steps.map((st, i) => <li key={i} style={{ margin: '4px 0' }}><a href={st.href} style={{ textDecoration: st.done(s) ? 'line-through' : undefined, color: st.done(s) ? 'var(--muted)' : undefined }}>{st.label}</a> {st.done(s) && '✅'}</li>)}
              </ol>
            </section>
          )
        })}
      </div>
      <p className="small muted" style={{ marginTop: 16 }}>Realms involved: {['r1', 'r2', 'r3', 'r4', 'r5', 'r7', 'r8'].map((r) => realmById(r)?.short).join(' · ')}</p>
    </div>
  )
}
