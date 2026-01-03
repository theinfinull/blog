import type { APIContext } from 'astro'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date) {
  return Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function calculateWordCountFromHtml(
  html: string | null | undefined,
): number {
  if (!html) return 0
  const textOnly = html.replace(/<[^>]+>/g, '')
  return textOnly.split(/\s+/).filter(Boolean).length
}

export function readingTime(wordCount: number): string {
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200))
  return `${readingTimeMinutes} min read`
}

export function getHeadingMargin(depth: number): string {
  const margins: Record<number, string> = {
    3: 'ml-4',
    4: 'ml-8',
    5: 'ml-12',
    6: 'ml-16',
  }
  return margins[depth] || ''
}

// NOTE: this function is only used in ts files, in astro files, you can use Astro.url.origin directly. ref @PageHead.astro, @PostHead.astro
export function getSiteUrl(context: APIContext): URL {
  // for dev, use the context.origin.url
  if (import.meta.env.DEV) {
    return new URL(context.url.origin)
  }

  // for production, using the {site} from astro.config.ts (and fallback to the 'https://portfolio.theinfinull.workers.dev')
  return new URL(context.site || 'https://portfolio.theinfinull.workers.dev')
}