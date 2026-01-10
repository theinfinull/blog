/**
 * dev.to posting script
 *
 * posts or updates a blog post on dev.to platform
 *
 * usage:
 *   npm run publish:devto <post-id> [--publish] [--recreate]
 *   npm run publish:devto --recreate              # rebuild metadata from dev.to
 *
 * examples:
 *   npm run publish:devto first-blog               # posts as draft
 *   npm run publish:devto first-blog --publish     # publishes immediately
 *   npm run publish:devto --recreate               # rebuild metadata file from dev.to
 *
 * requirements:
 *   - DEVTO_API_KEY in .env file (get from https://dev.to/settings/extensions)
 *   - ORIGINAL_SITE_URL in .env file (optional)
 *
 * features:
 *   - detects if post already exists (by canonical URL)
 *   - updates existing posts instead of creating new ones
 *   - converts MDX to markdown (removes astro components, converts images)
 *   - extracts banner image from frontmatter and sets as main_image
 *   - converts all image paths to absolute URLs
 *   - tracks posted articles in scripts/data/.devto-post-metadata.json
 *   - supports draft and published modes
 */

import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import createLogger from './logger.mjs'

dotenv.config({ path: '.env' })

const DEVTO_API_KEY = process.env.DEVTO_API_KEY
const ORIGINAL_SITE_URL = process.env.ORIGINAL_SITE_URL
const DEFAULT_BANNER_URL =
  '/public/static/common/default-post-banner-1200x630.jpg'
const BLOG_DIR = 'src/content/blog'
const DEVTO_POST_METADATA_FILE = 'scripts/data/.devto-post-metadata.json'
const GITHUB_RAW_BASE_URL =
  'https://raw.githubusercontent.com/theinfinull/portfolio/refs/heads/main'

const log = createLogger('publish-devto')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

/**
 * loads the metadata file that tracks which posts have been posted to dev.to
 */
async function loadMetadataFromFile() {
  const metadataFilePath = path.join(rootDir, DEVTO_POST_METADATA_FILE)
  try {
    const content = await fs.readFile(metadataFilePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {}
    }
    throw error
  }
}

/**
 * saves the metadata file that tracks which posts have been posted to dev.to
 */
async function saveMetadataFile(metadata) {
  const metadataFilePath = path.join(rootDir, DEVTO_POST_METADATA_FILE)
  await fs.mkdir(path.dirname(metadataFilePath), { recursive: true })
  await fs.writeFile(
    metadataFilePath,
    JSON.stringify(metadata, null, 2),
    'utf-8',
  )
}

/**
 * checks if a file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * finds all blog posts (markdown files) from the blog directory
 */
async function findBlogPosts() {
  const blogPath = path.join(rootDir, BLOG_DIR)
  if (!(await fileExists(blogPath))) {
    throw new Error(`blog directory not found: ${blogPath}`)
  }

  const entries = await fs.readdir(blogPath, { withFileTypes: true })
  const posts = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const postDir = path.join(blogPath, entry.name)
    const files = await fs.readdir(postDir, { withFileTypes: true })

    const markdownFiles = files
      .filter(
        (f) =>
          f.isFile() && (f.name.endsWith('.mdx') || f.name.endsWith('.md')),
      )
      .map((f) => path.join(postDir, f.name))

    if (markdownFiles.length === 0) {
      log.warn(`no markdown files found in: ${postDir}`)
      continue
    }

    for (const file of markdownFiles) {
      posts.push({
        id: entry.name,
        path: file,
      })
    }
  }

  return posts
}

/**
 * converts a relative image path to an absolute URL (using github raw url as astro assets are optimized and added a random slug to the url (so they're not embeddable as a static link))
 */
function convertImagePathToUrl(imagePath, postId) {
  if (!imagePath || typeof imagePath !== 'string') {
    return null
  }

  // skip if already absolute URL (any public images from online)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }

  return `${GITHUB_RAW_BASE_URL}/src/content/blog/${postId}/${imagePath}`
}

/**
 * converts MDX content to markdown suitable for Dev.to
 * - removes astro component imports
 * - removes astro component usage (basic handling)
 * - converts relative image paths to absolute URLs
 */
function convertMdxToMarkdown(content, postId) {
  let markdown = content

  // remove astro component imports
  markdown = markdown.replace(
    /^import\s+[\w\s,{}]+\s+from\s+['"]@\/components\/[\w\/-]+\.astro['"];?\s*$/gm,
    '',
  )

  // convert relative image paths to absolute URLs
  markdown = markdown.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_match, alt, imagePath) => {
      const absoluteUrl = convertImagePathToUrl(imagePath, postId)
      return `![${alt}](${absoluteUrl})`
    },
  )

  // convert astro callout components to blockquotes
  markdown = markdown.replace(
    /<Callout[^>]*variant="([^"]*)"[^>]*>([\s\S]*?)<\/Callout>/g,
    (_match, variant, content) => {
      const variantEmoji = {
        note: 'ℹ️',
        warning: '⚠️',
        important: '❗',
        tip: '💡',
      }
      const emoji = variantEmoji[variant] || variantEmoji.note
      return `\n> ${emoji} ${content.trim()}\n`
    },
  )

  // remove any remaining JSX/component syntax
  markdown = markdown.replace(/<[A-Z]\w+[^>]*\/>/g, '')
  markdown = markdown.replace(/<[A-Z]\w+[^>]*>[\s\S]*?<\/[A-Z]\w+>/g, '')

  return markdown.trim()
}

/**
 * sanitizes tags for dev.to API (alphanumeric only, no spaces or hyphens)
 */
function sanitizeTags(tags) {
  if (!Array.isArray(tags)) {
    return []
  }

  return tags
    .map((tag) => {
      if (typeof tag !== 'string') {
        return null
      }
      // remove hyphens and spaces, convert to lowercase, keep only alphanumeric
      return tag
        .replace(/[-_\s]/g, '') // remove hyphens, underscores, and spaces
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // remove any remaining non-alphanumeric
        .trim()
    })
    .filter((tag) => tag && tag.length > 0)
    .slice(0, 4) // dev.to allows max 4 tags
}

/**
 * makes a request to dev.to API
 */
async function devToApiRequest(endpoint, options = {}) {
  const { method = 'GET', body } = options

  try {
    const response = await fetch(`https://dev.to/api/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'api-key': DEVTO_API_KEY,
      },
      ...(body && { body: JSON.stringify(body) }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          'invalid API key. check your DEVTO_API_KEY in .env file.',
        )
      }
      const errorText = await response.text()
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    return await response.json()
  } catch (error) {
    if (error.message.includes('invalid API key')) {
      throw error
    }
    log.error(`API request error: ${error.message}`)
    throw error
  }
}

/**
 * gets all articles from dev.to (including drafts)
 */
async function getAllDevToArticles() {
  return devToApiRequest('articles/me/all')
}

/**
 * gets existing article from dev.to by canonical URL
 */
async function getArticleByCanonicalUrl(canonicalUrl) {
  const articles = await getAllDevToArticles()
  return articles.find((article) => article.canonical_url === canonicalUrl)
}

/**
 * recreates the metadata file by fetching all articles from dev.to
 * and matching them with local blog posts based on canonical URLs
 */
async function recreateMetadataFile() {
  try {
    log.info('fetching all articles from dev.to...')
    const articles = await getAllDevToArticles()

    if (!articles || articles.length === 0) {
      log.warn('no articles found on dev.to')
      return {}
    }

    log.info(`found ${articles.length} article(s) on dev.to`)

    const localPosts = await findBlogPosts()
    const metadata = {}
    for (const article of articles) {
      if (!article.canonical_url) {
        continue
      }

      const canonicalMatch = article.canonical_url.match(
        new RegExp(
          `${ORIGINAL_SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/blog/([^/]+)`,
        ),
      )

      if (canonicalMatch && canonicalMatch[1]) {
        const postId = canonicalMatch[1]
        const localPost = localPosts.find((p) => p.id === postId)
        if (localPost) {
          metadata[postId] = {
            devtoId: article.id,
            devtoUrl: article.url,
            canonicalUrl: article.canonical_url,
            lastUpdated: article.published_at || new Date().toISOString(),
          }
          log.info(`matched: ${postId} -> dev.to article #${article.id}`)
        } else {
          log.warn(
            `found dev.to article with canonical URL ${article.canonical_url} but no matching local post found`,
          )
        }
      }
    }

    if (Object.keys(metadata).length === 0) {
      log.warn('no matching articles found. metadata file will be empty.')
      return {}
    }

    await saveMetadataFile(metadata)
    log.success(
      `recreated metadata file with ${Object.keys(metadata).length} entry(ies)`,
    )

    return metadata
  } catch (error) {
    log.error(`error recreating metadata file: ${error.message}`)
    throw error
  }
}

/**
 * creates a new article on dev.to
 */
async function createArticle(articleData) {
  return devToApiRequest('articles', {
    method: 'POST',
    body: { article: articleData },
  })
}

/**
 * updates an existing article on dev.to
 */
async function updateArticle(articleId, articleData) {
  return devToApiRequest(`articles/${articleId}`, {
    method: 'PUT',
    body: { article: articleData },
  })
}

/**
 * processes a single blog post and posts/updates it on dev.to
 */
async function processPost(post, metadata, publish = false) {
  const { id, path: postPath } = post

  try {
    log.info(`processing post: ${id}`)

    // read post content
    const content = await fs.readFile(postPath, 'utf-8')
    const { data: frontmatter, content: body } = matter(content)

    // convert mdx to markdown
    const markdownBody = convertMdxToMarkdown(body, id)

    // extract banner/main image from frontmatter
    let mainImage = null
    if (frontmatter.image) {
      mainImage = convertImagePathToUrl(frontmatter.image, id)
    } else {
      log.info('no banner image found in frontmatter, using default banner')
      mainImage = `${GITHUB_RAW_BASE_URL}${DEFAULT_BANNER_URL}`
    }

    const canonicalUrl = `${ORIGINAL_SITE_URL}/blog/${id}`
    const articleData = {
      title: frontmatter.title,
      body_markdown: markdownBody,
      tags: sanitizeTags(frontmatter.tags),
      published: publish,
      canonical_url: canonicalUrl,
      description: frontmatter.description || '',
      ...(mainImage && { main_image: mainImage }),
    }

    if (mainImage) {
      log.info(`setting banner image: ${mainImage}`)
    }

    // check if article already exists
    const existingArticle = await getArticleByCanonicalUrl(canonicalUrl)
    const existingMetadata = metadata[id]

    // determine article ID to update (if any)
    const articleId = existingArticle?.id || existingMetadata?.devtoId

    let result
    if (articleId) {
      // update existing article
      try {
        log.info(`updating existing article: ${articleId}`)
        result = await updateArticle(articleId, articleData)
        log.success(`updated article: ${result.url}`)
      } catch (error) {
        // if update fails, create new article
        log.warn(`update failed, creating new article: ${error.message}`)
        result = await createArticle(articleData)
        log.success(`created new article: ${result.url}`)
      }
    } else {
      // create new article
      log.info('creating new article')
      result = await createArticle(articleData)
      log.success(`created article: ${result.url}`)
    }

    metadata[id] = {
      devtoId: result.id,
      devtoUrl: result.url,
      canonicalUrl,
      lastUpdated: new Date().toISOString(),
    }

    return {
      skipped: false,
      id,
      devtoId: result.id,
      devtoUrl: result.url,
      published: result.published,
    }
  } catch (error) {
    log.error(`error processing ${id}: ${error.message}`)
    throw error
  }
}

/**
 * main execution function
 */
async function run() {
  try {
    // validate environment
    if (!DEVTO_API_KEY) {
      throw new Error(
        'DEVTO_API_KEY environment variable is required. add it to your .env file.',
      )
    }

    const args = process.argv.slice(2)
    const postId = args[0]
    const publishFlag = args.includes('--publish') || args.includes('-p')
    const recreateFlag = args.includes('--recreate') || args.includes('-r')

    if (recreateFlag && !postId) {
      log.info('recreating metadata file from dev.to...')
      const metadata = await recreateMetadataFile()
      log.success(
        `metadata file recreated with ${Object.keys(metadata).length} entry(ies)`,
      )
      process.exit(0)
    }

    if (!postId) {
      log.error('please provide a post ID as an argument.')
      log.info(
        'usage: npm run publish:devto <post-id> [--publish] [--recreate]',
      )
      log.info('examples:')
      log.info('  npm run publish:devto first-blog --publish')
      log.info(
        '  npm run publish:devto --recreate  # rebuild metadata from dev.to',
      )
      process.exit(1)
    }

    let metadata = await loadMetadataFromFile()

    if (Object.keys(metadata).length === 0) {
      log.info('metadata file is empty. attempting to recreate from dev.to...')
      try {
        metadata = await recreateMetadataFile()
        if (Object.keys(metadata).length === 0) {
          log.warn(
            'no matching articles found on dev.to. starting with empty metadata.',
          )
        }
      } catch (error) {
        log.warn(`could not recreate metadata file: ${error.message}`)
        log.info(
          'continuing with empty metadata. use --recreate flag to retry.',
        )
      }
    }

    const posts = await findBlogPosts()
    const post = posts.find((p) => p.id === postId)

    if (!post) {
      log.error(`post not found: ${postId}`)
      log.info('available posts:')
      posts.forEach((p) => log.info(`  - ${p.id}`))
      process.exit(1)
    }

    log.info(
      `posting to dev.to${publishFlag ? ' (publishing)' : ' (draft)'}...`,
    )
    const result = await processPost(post, metadata, publishFlag)

    if (result.skipped) {
      log.warn(`post skipped: ${result.reason}`)
      process.exit(0)
    }

    await saveMetadataFile(metadata)

    log.success('post processed successfully!')
    log.info(`dev.to URL: ${result.devtoUrl}`)
    log.info(`status: ${result.published ? 'published' : 'draft'}`)
  } catch (error) {
    log.error(`script failed: ${error.message}`)
    process.exit(1)
  }
}

run()
