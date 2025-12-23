import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: 'infinull',
  description:
    'astro-erudite is a opinionated, unstyled blogging template—built with Astro, Tailwind, and shadcn/ui.',
  href: 'https://blog.theinfinull.workers.dev',
  author: 'theinfinull',
  locale: 'en-US',
  featuredPostCount: 2,
  featuredProjectCount: 3,
  postsPerPage: 3,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/search',
    label: '',
    icon: 'lucide:search',
  },
  {
    href: '/about',
    label: 'about',
  },
  {
    href: '/projects',
    label: 'projects',
  },
  {
    href: '/blog',
    label: 'blog',
  },
  {
    href: '/tags',
    label: 'tags',
    hideBelowPx: 350,
  }
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'mailto:theinfinull@gmail.com',
    label: 'Email',
  },
  {
    href: 'https://linkedin.com/in/sedhumadhav',
    label: 'LinkedIn',
  },
  {
    href: 'https://github.com/theinfinull',
    label: 'GitHub',
  },
  {
    href: 'https://twitter.com/iam_sedhumadhav',
    label: 'Twitter',
  },
  {
    href: 'https://instagram.com/sedhu_madhav_',
    label: 'Instagram',
  }
]

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:x',
  Instagram: 'lucide:instagram',
  Email: 'lucide:send',
}
