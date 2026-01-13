import { execSync } from 'child_process'
import createLogger from './logger.mjs'

const log = createLogger('import-and-commit')

/**
 * execution
 * 1. checkout main
 * 2. import from obs
 * 3. make a commit
 */
execSync('git checkout main', { stdio: 'inherit' })
execSync('npm run import:obsidian', { stdio: 'inherit' })

const status = execSync('git status --porcelain src/content/blog', {
  encoding: 'utf-8',
})
if (status.trim()) {
  execSync('git add src/content/blog', { stdio: 'inherit' })
  try {
    execSync(`git commit -m "write:(blog) updated blogs"`, {
      stdio: 'inherit',
    })
    log.success('committed changes: updated blogs')
  } catch (e) {
    log.warn('no changes staged for commit')
  }
} else {
  log.info('no changes to commit')
}
