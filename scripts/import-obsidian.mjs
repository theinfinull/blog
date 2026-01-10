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
import createLogger from './logger.mjs'
import { slugify, isMarkdownFile, getBasename } from './utils/file-utils.mjs'
import { processImages } from './utils/obsidian-image-utils.mjs'
import {
  shouldSkipFile,
  processFrontmatter,
} from './utils/frontmatter-utils.mjs'

dotenv.config({ path: '.env' })

const SOURCE_MARKDOWN_DIR = process.env.SOURCE_MARKDOWN_DIR
const SOURCE_ATTACHMENT_DIR = process.env.SOURCE_ATTACHMENT_DIR
const TARGET_DIR = process.env.TARGET_DIR

const log = createLogger('import-obsidian')

/**
 * validates required environment variables
 */
function validateEnvironment() {
  const missing = []
  if (!SOURCE_MARKDOWN_DIR) missing.push('SOURCE_MARKDOWN_DIR')
  if (!SOURCE_ATTACHMENT_DIR) missing.push('SOURCE_ATTACHMENT_DIR')
  if (!TARGET_DIR) missing.push('TARGET_DIR')

  if (missing.length > 0) {
    throw new Error(
      `missing required environment variables: ${missing.join(', ')}`,
    )
  }
}

/**
 * processes a single obsidian note file
 */
async function processNote(filePath) {
  const filename = path.basename(filePath)
  try {
    // read and parse markdown content
    const content = await fs.readFile(filePath, 'utf-8')
    const { data: frontmatter, content: body } = matter(content)

    // check if file should be skipped
    const skipCheck = shouldSkipFile(frontmatter)
    if (skipCheck.shouldSkip) {
      return { skipped: true, reason: skipCheck.reason, filename }
    }

    // create destination directory
    const slug = slugify(getBasename(filePath))
    const destinationDir = path.join(TARGET_DIR, slug)
    await fs.ensureDir(destinationDir)

    // process and normalize frontmatter
    const processedFrontmatter = processFrontmatter(
      frontmatter,
      filePath,
      getBasename,
    )

    // process images from obsidian attachments
    const imageProcessResult = await processImages(
      body,
      SOURCE_ATTACHMENT_DIR,
      destinationDir,
    )
    const processedBody = imageProcessResult.content
    const imageResults = imageProcessResult.results

    // log image processing results
    if (imageResults && imageResults.length > 0) {
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

    // write MDX file using gray-matter's stringify method
    const finalContent = matter.stringify(processedBody, processedFrontmatter)
    const destMarkdownPath = path.join(destinationDir, 'index.mdx')
    await fs.writeFile(destMarkdownPath, finalContent)

    return { skipped: false, slug, filename }
  } catch (error) {
    log.error(`error processing ${filePath}: ${error.message}`)
    throw error
  }
}

/**
 * processes files with concurrency limit
 */
async function processFilesInParallel(files, concurrency = 5) {
  const results = []
  const filePaths = files.map((file) => path.join(SOURCE_MARKDOWN_DIR, file))

  for (let i = 0; i < filePaths.length; i += concurrency) {
    const batch = filePaths.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map((filePath) => processNote(filePath)),
    )

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        const filePath = batch[idx]
        const filename = path.basename(filePath)
        log.error(
          `failed to process ${filePath}: ${result.reason?.message || result.reason}`,
        )
        results.push({ skipped: true, reason: 'processing error', filename })
      }
    })
  }

  return results
}

/**
 * main execution function
 */
async function run() {
  try {
    validateEnvironment()

    log.info('starting import: obsidian → astro MDX blog')
    const files = await fs.readdir(SOURCE_MARKDOWN_DIR)
    const markdownFiles = files.filter(isMarkdownFile)
    if (markdownFiles.length === 0) {
      log.warn('no markdown files found in source directory')
      return
    }
    log.info(`found ${markdownFiles.length} markdown file(s)`)

    const results = await processFilesInParallel(markdownFiles)
    const imported = results.filter((r) => !r.skipped)
    const skipped = results.filter((r) => r.skipped)

    imported.forEach((result) => {
      log.success(
        `imported: '${result.filename}' → '${result.slug}/index.mdx'`,
      )
    })
    skipped.forEach((result) => {
      log.warn(`skipped '${result.filename}': ${result.reason}`)
    })
    log.success(
      `import completed: '${imported.length}' imported, '${skipped.length}' skipped`,
    )
  } catch (error) {
    log.error(`import failed: ${error.message}`)
    process.exit(1)
  }
}

run()
