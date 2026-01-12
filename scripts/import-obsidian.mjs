/**
 * obsidian import script
 *
 * imports markdown files from obsidian vault to astro blog format
 *
 * usage:
 *   npm run import:obsidian
 *
 * requirements:
 *   - SOURCE_MARKDOWN_DIR in .env file (obsidian markdown files directory)
 *   - SOURCE_ATTACHMENT_DIR in .env file (obsidian attachments directory)
 *   - TARGET_DIR in .env file (target directory for converted files)
 *
 * features:
 *   - converts obsidian markdown to astro MDX format
 *   - processes frontmatter and normalizes tags
 *   - copies and processes images from obsidian attachments
 *   - handles multiple files with concurrency control
 *   - skips drafts and files with missing required fields
 */

import dotenv from 'dotenv'
import fs from 'fs-extra'
import path from 'path'
import matter from 'gray-matter'
import { fileURLToPath } from 'url'
import createLogger from './logger.mjs'
import {
  validateEnvironment,
  getEnvConfig,
  isMarkdownFile,
  slugify,
  getBasename,
  validateFrontmatter,
  getSkipReason,
  parseObsidianFrontMatter,
  processImages,
  buildMdxContent,
} from './utils/import-obsidian-utils.mjs'

dotenv.config({ path: '.env' })

const filename = path.basename(fileURLToPath(import.meta.url))
const log = createLogger(filename)

// ============================================================================
// NOTE PROCESSING HELPERS
// ============================================================================

/**
 * reads and parses note file
 */
async function readNoteFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8')
  const { data: frontmatter, content: body } = matter(content)
  return { frontmatter, body }
}

/**
 * writes MDX file to destination directory
 */
async function writeMdxFile(destinationDir, content) {
  const destPath = path.join(destinationDir, 'index.mdx')
  await fs.writeFile(destPath, content)
}

/**
 * logs image processing results
 */
function logImageResults(imageResults) {
  if (!imageResults || imageResults.length === 0) return

  imageResults.forEach((result) => {
    if (result.success) {
      log.info(
        `copied image: ${result.originalName} → assets/${result.normalizedName}`,
      )
    } else {
      log.warn(`missing image: ${result.originalName}`)
    }
  })
}

/**
 * processes a single obsidian note file, returns { status, filename, message?, slug? }
 */
async function processNote(filePath, config) {
  const filename = path.basename(filePath)
  try {
    const { frontmatter, body } = await readNoteFile(filePath)
    const skipReason = getSkipReason(frontmatter)
    if (skipReason) {
      return { status: 'skipped', message: skipReason, filename }
    }

    const validationError = validateFrontmatter(frontmatter)
    if (validationError) {
      return { status: 'error', message: validationError, filename }
    }

    const slug = slugify(getBasename(filePath))
    const destinationDir = path.join(config.targetDir, slug)
    await fs.ensureDir(destinationDir)

    const processedFrontmatter = parseObsidianFrontMatter(
      frontmatter,
      filePath,
      getBasename,
    )

    const imageResult = await processImages(
      body,
      config.sourceAttachmentDir,
      destinationDir,
    )
    logImageResults(imageResult.results)

    const finalContent = buildMdxContent(
      imageResult.content,
      processedFrontmatter,
    )
    await writeMdxFile(destinationDir, finalContent)

    return { status: 'imported', filename, slug }
  } catch (error) {
    log.error(`error processing ${filePath}: ${error.message}`)
    return { status: 'error', filename, message: error.message }
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * processes files with concurrency limit, returns array of { status, filename, message?, slug? }
 */
async function processFilesInParallel(files, config, concurrency = 8) {
  const results = []
  const filePaths = files.map((file) =>
    path.join(config.sourceMarkdownDir, file),
  )

  for (let i = 0; i < filePaths.length; i += concurrency) {
    const batch = filePaths.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map((filePath) => processNote(filePath, config)),
    )

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        const filePath = batch[idx]
        const filename = path.basename(filePath)
        const errorMessage =
          result.reason?.message || String(result.reason) || 'unknown error'
        log.error(`failed to process ${filePath}: ${errorMessage}`)
        results.push({ status: 'error', filename, message: errorMessage })
      }
    })
  }

  return results
}

// ============================================================================
// RESULT LOGGING
// ============================================================================

/**
 * logs final import results summary
 */
function logImportResults(results) {
  const imported = results.filter((r) => r.status === 'imported')
  const skipped = results.filter((r) => r.status === 'skipped')
  const errors = results.filter((r) => r.status === 'error')

  imported.forEach((r) => {
    log.success(`imported: '${r.filename}' → '${r.slug}/index.mdx'`)
  })

  skipped.forEach((r) => {
    log.warn(`skipped '${r.filename}': ${r.message}`)
  })

  errors.forEach((r) => {
    log.error(`error '${r.filename}': ${r.message}`)
  })

  log.success(
    `import completed: ${imported.length} imported, ${skipped.length} skipped, ${errors.length} errors`,
  )
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

/**
 * main execution function
 */
async function run() {
  try {
    validateEnvironment()
    const config = getEnvConfig()

    log.info('starting import: obsidian → astro MDX blog')

    const files = await fs.readdir(config.sourceMarkdownDir)
    const markdownFiles = files.filter(isMarkdownFile)

    if (markdownFiles.length === 0) {
      log.warn('no markdown files found in source directory')
      return
    }

    log.info(`found ${markdownFiles.length} markdown file(s)`)

    const results = await processFilesInParallel(markdownFiles, config)
    logImportResults(results)
  } catch (error) {
    log.error(`import failed: ${error.message}`)
    process.exit(1)
  }
}

run()
