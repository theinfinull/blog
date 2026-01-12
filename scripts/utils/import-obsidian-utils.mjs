import fs from 'fs-extra'
import path from 'path'
import matter from 'gray-matter'
import createLogger from '../logger.mjs'

const log = createLogger('import-obsidian-utils')

// ============================================================================
// FILE UTILITIES
// ============================================================================

const MARKDOWN_EXTENSIONS = ['.md', '.mdx']

/**
 * converts a filename to a URL-friendly slug
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * checks if a file is a markdown file (.md or .mdx)
 */
export function isMarkdownFile(filename) {
  return MARKDOWN_EXTENSIONS.some((ext) => filename.endsWith(ext))
}

/**
 * gets basename without extension
 */
export function getBasename(filePath) {
  return path.basename(filePath, path.extname(filePath))
}

// ============================================================================
// ENVIRONMENT UTILITIES
// ============================================================================

/**
 * validates required environment variables for obsidian import
 */
export function validateEnvironment() {
  const required = [
    'SOURCE_MARKDOWN_DIR',
    'SOURCE_ATTACHMENT_DIR',
    'TARGET_DIR',
  ]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `missing required environment variables: ${missing.join(', ')}`,
    )
  }
}

/**
 * gets environment configuration for obsidian import
 */
export function getEnvConfig() {
  return {
    sourceMarkdownDir: process.env.SOURCE_MARKDOWN_DIR,
    sourceAttachmentDir: process.env.SOURCE_ATTACHMENT_DIR,
    targetDir: process.env.TARGET_DIR,
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * validates frontmatter fields, returns error message string or null if valid
 */
export function validateFrontmatter(frontmatter) {
  const issues = []

  // description validation
  if (!frontmatter.description) {
    issues.push('description (missing)')
  } else if (typeof frontmatter.description !== 'string') {
    issues.push('description (invalid type, expected string)')
  }

  // date validation
  if (!frontmatter.date) {
    issues.push('date (missing)')
  } else {
    const date = new Date(frontmatter.date)
    if (isNaN(date.getTime())) {
      issues.push(`date (invalid: "${frontmatter.date}")`)
    }
  }

  return issues.length > 0
    ? `frontmatter validation failed: ${issues.join(', ')}`
    : null
}

/**
 * checks if blog should be skipped, returns skip reason string or null
 */
export function getSkipReason(frontmatter) {
  if (frontmatter.can_skip === true || frontmatter.can_skip === 'true') {
    return 'can_skip property is set to true'
  }

  if (frontmatter.is_draft === true || frontmatter.is_draft === 'true') {
    return 'post is marked as draft'
  }

  return null
}

// ============================================================================
// FRONTMATTER UTILITIES
// ============================================================================

/**
 * normalizes Obsidian format value to array
 * Obsidian format examples:
 *   - "#tag" → ["tag"]
 *   - "tag" → ["tag"]
 *   - "#my-tag" → ["my-tag"]
 *   - ["#tag", "tag", "#my-tag"] → ["tag", "tag", "my-tag"]
 *   - null/undefined → []
 */
function normalizeObsidianArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'string') return [value]
  return []
}

/**
 * parses Obsidian frontmatter format to normalized Astro format
 *
 * Obsidian format examples (tags can be unquoted, single-quoted, or double-quoted):
 *   tags:
 *     - #tag         (unquoted with #)
 *     - tag          (unquoted)
 *     - "#tag"       (double-quoted with #)
 *     - "tag"        (double-quoted)
 *     - '#tag'       (single-quoted with #)
 *     - 'tag'        (single-quoted)
 *     - "#my-tag"
 *     - "#TagName"
 *     - "tag_name"
 *
 * Converts to normalized YAML array format:
 *   tags:
 *     - tag
 *     - tag
 *     - tag
 *     - tag
 *     - tag
 *     - tag
 *     - my-tag
 *     - TagName
 *     - tag_name
 */
export function parseObsidianFrontMatter(frontmatter, filename, getBasename) {
  const basename = getBasename(filename)

  // TITLE: use existing title if provided, otherwise use filename
  if (
    !frontmatter.title ||
    typeof frontmatter.title !== 'string' ||
    frontmatter.title.trim() === ''
  ) {
    frontmatter.title = basename
  }

  // TAGS: convert from Obsidian format to normalized array
  // Obsidian uses "#tag" format, normalize to "tag"
  frontmatter.tags = normalizeObsidianArray(frontmatter.tags)
  if (Array.isArray(frontmatter.tags)) {
    frontmatter.tags = frontmatter.tags.map((tag) => {
      if (typeof tag === 'string') {
        return tag.startsWith('#') ? tag.slice(1) : tag
      }
      return tag
    })
  }

  return frontmatter
}

// ============================================================================
// IMAGE PROCESSING UTILITIES
// ============================================================================

// matches Obsidian image syntax: ![[image.png]] or ![[path/to/image.png]]
const OBSIDIAN_IMAGE_REGEX = /!\[\[([^\]]+)\]\]/g

/**
 * normalizes image filename: lowercase basename, replace spaces with hyphens, preserve extension
 */
function normalizeImageName(imageName) {
  const ext = path.extname(imageName)
  const basename = path.basename(imageName, ext)
  const normalized = basename.toLowerCase().replace(/\s+/g, '-')
  return `${normalized}${ext}`
}

/**
 * copies a single image file, returns { success, originalName, normalizedName, error? }
 */
async function copyImage(sourcePath, destPath, originalName, normalizedName) {
  try {
    const exists = await fs.pathExists(sourcePath)
    if (!exists) {
      return { success: false, originalName, normalizedName }
    }

    await fs.copy(sourcePath, destPath)
    return { success: true, originalName, normalizedName }
  } catch (error) {
    return {
      success: false,
      originalName,
      normalizedName,
      error: error.message,
    }
  }
}

/**
 * processes Obsidian images in markdown content, returns { content, results }
 * results is array of { success, originalName, normalizedName? }
 */
export async function processImages(content, sourceDir, destDir) {
  const matches = [...content.matchAll(OBSIDIAN_IMAGE_REGEX)]
  if (matches.length === 0) {
    return { content, results: [] }
  }

  const assetsDir = path.join(destDir, 'assets')
  await fs.ensureDir(assetsDir)

  const imageTasks = matches.map((match) => {
    const originalImageName = match[1].trim()
    const normalizedImageName = normalizeImageName(originalImageName)
    const sourceImagePath = path.join(sourceDir, originalImageName)
    const destImagePath = path.join(assetsDir, normalizedImageName)

    return copyImage(
      sourceImagePath,
      destImagePath,
      originalImageName,
      normalizedImageName,
    )
  })

  const results = await Promise.all(imageTasks)

  // replace all image references in content
  let updatedContent = content
  matches.forEach((match, index) => {
    const result = results[index]
    updatedContent = updatedContent.replace(
      match[0],
      `![${result.normalizedName}](./assets/${result.normalizedName})`,
    )
  })

  return { content: updatedContent, results }
}

// ============================================================================
// MDX UTILITIES
// ============================================================================

/**
 * formats date to YYYY-MM-DD format
 */
function formatDate(date) {
  if (date instanceof Date) {
    return date.toISOString().split('T')[0]
  }
  return date
}

/**
 * builds MDX content with formatted frontmatter
 */
export function buildMdxContent(body, frontmatter) {
  const formatted = { ...frontmatter }
  if (formatted.date) {
    formatted.date = formatDate(formatted.date)
  }
  return matter.stringify(body, formatted)
}
