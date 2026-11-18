// Publish the production build (dist/) to the gh-pages branch for GitHub Pages.
// Usage: npm run deploy   (runs `npm run build` first)
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' })
const out = (cmd, cwd) => execSync(cmd, { cwd, encoding: 'utf8' }).trim()

const root = out('git rev-parse --show-toplevel')
const dist = join(root, 'dist')
if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/ is missing: run npm run build first')

const source = out('git rev-parse --short HEAD', root)
const work = mkdtempSync(join(tmpdir(), 'dbquest-pages-'))
const hasRemote = out('git ls-remote --heads origin gh-pages', root) !== ''

try {
  if (hasRemote) {
    run('git fetch origin gh-pages', root)
    run(`git worktree add "${work}" origin/gh-pages --detach`, root)
  } else {
    run(`git worktree add "${work}" --detach`, root)
    run('git checkout --orphan gh-pages-tmp', work)
  }
  // replace the worktree contents with the fresh build
  for (const f of readdirSync(work)) if (f !== '.git') rmSync(join(work, f), { recursive: true, force: true })
  cpSync(dist, work, { recursive: true })
  writeFileSync(join(work, '.nojekyll'), '')
  run('git add -A', work)
  const changed = out('git status --porcelain', work) !== ''
  if (changed) {
    run(`git commit -q -m "Deploy ${source} to GitHub Pages"`, work)
    run('git push origin HEAD:gh-pages', work)
    console.log(`\nDeployed ${source} to gh-pages.`)
  } else console.log('\nNo changes to deploy.')
} finally {
  run(`git worktree remove --force "${work}"`, root)
}
