import { SITE } from '@/consts'
import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { getAllPosts } from '@/lib/data-utils'

const DEFAULT_MIME_TYPE = 'image/jpeg'
const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

function getImageMimeType(imageUrl: string): string {
  const urlWithoutQuery = imageUrl.split('?')[0]
  const extension = urlWithoutQuery.split('.').pop()?.toLowerCase() || ''
  return MIME_TYPES[extension] || DEFAULT_MIME_TYPE
}

function createImageUrl(imageSrc: string | undefined, siteUrl: string): string {
  return imageSrc
    ? new URL(imageSrc, siteUrl).toString()
    : new URL(SITE.defaultPostBanner, siteUrl).toString()
}

function createRssItem(post: CollectionEntry<'blog'>, siteUrl: string) {
  const imageUrl = createImageUrl(post.data.image?.src, siteUrl)
  const imageType = getImageMimeType(imageUrl)

  return {
    title: post.data.title,
    description: post.data.description,
    pubDate: post.data.date,
    link: `/blog/${post.id}/`,
    content: `<img src="${imageUrl}" alt="${post.data.title}" />`,
    customData: `<enclosure url="${imageUrl}" type="${imageType}" />`,
  }
}

function getSiteUrl(context: APIContext): string {
  // for production, using the environment variable
  const productionUrl = import.meta.env.PUBLIC_SITE_URL
  if (productionUrl) {
    return productionUrl
  }
  
  // for dev, using the context URL
  return context.url.origin
}

// Main
export async function GET(context: APIContext) {
  try {
    const posts = await getAllPosts()
    const siteUrl = getSiteUrl(context)

    return rss({
      title: SITE.title,
      description: SITE.description,
      site: siteUrl,
      items: posts.map((post) => createRssItem(post, siteUrl)),
    })
  } catch (error) {
    console.error('Error generating RSS feed:', error)
    return new Response('Error generating RSS feed', { status: 500 })
  }
}
