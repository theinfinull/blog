/**
 * normalizes a value to an array
 */
export function normalizeArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'string') return [value]
  return []
}

/**
 * checks if a file should be skipped based on frontmatter
 */
export function shouldSkipFile(frontmatter) {
  if (frontmatter.can_skip === true || frontmatter.can_skip === 'true') {
    return { shouldSkip: true, reason: 'can skip property is true' }
  }

  if (frontmatter.is_draft === true || frontmatter.is_draft === 'true') {
    return { shouldSkip: true, reason: 'post is in draft state' }
  }

  const missing = []
  if (
    !frontmatter.description ||
    typeof frontmatter.description !== 'string'
  ) {
    missing.push('description')
  }
  if (!frontmatter.date) {
    missing.push('date')
  } else {
    const date = new Date(frontmatter.date)
    if (isNaN(date.getTime())) {
      missing.push('date (invalid)')
    }
  }

  if (missing.length > 0) {
    return {
      shouldSkip: true,
      reason: `missing required properties: ${missing.join(', ')}`,
    }
  }

  return { shouldSkip: false }
}

/**
 * processes and normalizes frontmatter
 */
export function processFrontmatter(frontmatter, filename, getBasename) {
  const basename = getBasename(filename)

  // use existing title if provided, otherwise use filename
  if (
    !frontmatter.title ||
    typeof frontmatter.title !== 'string' ||
    frontmatter.title.trim() === ''
  ) {
    frontmatter.title = basename
  }

  // normalize arrays
  frontmatter.tags = normalizeArray(frontmatter.tags)
  frontmatter.authors = normalizeArray(frontmatter.authors)

  // clean tags: remove "#" prefix if present (obsidian format)
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

