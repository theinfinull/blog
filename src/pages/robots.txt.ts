import type { APIRoute } from 'astro'

const getRobotsTxt = (sitemapURL: URL) => `
User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`

export const GET: APIRoute = (context) => {
  const productionUrl = import.meta.env.PUBLIC_SITE_URL
  let sitemapURL: URL
  if (productionUrl) {
    sitemapURL = new URL('sitemap-index.xml', productionUrl)
  } else {
    sitemapURL = new URL('sitemap-index.xml', context.url.origin)
  }
  return new Response(getRobotsTxt(sitemapURL))
}
