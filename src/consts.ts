import type { IconEntry, IconMap, SocialLink, Site, Person } from '@/types'

export const SITE: Site = {
  title: 'infinull',
  description:
    'Portfolio and Blog of Sedhu Madhav (aka infinull)',
  href: 'https://portfolio.theinfinull.workers.dev',
  author: 'infinull',
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
  // socials
  Website: 'lucide:globe',
  GitHub: 'simple-icons:github',
  LinkedIn: 'simple-icons:linkedin',
  Twitter: 'simple-icons:x',
  Instagram: 'lucide:instagram',
  Email: 'lucide:send',

  // tech
  typescript: { icon: 'simple-icons:typescript', color: '#3178C6' },
  node: { icon: 'simple-icons:nodedotjs', color: '#5FA04E' },
  javascript: { icon: 'simple-icons:javascript', color: '#F7DF1E' },
  html: { icon: 'simple-icons:html5', color: '#E34F26' },
  css: { icon: 'simple-icons:css3', color: '#1572B6' },
  react: { icon: 'simple-icons:react', color: '#61DAFB' },
  vue: { icon: 'simple-icons:vuedotjs', color: '#4FC08D' },
  angular: { icon: 'simple-icons:angular', color: '#DD0031' },
  svelte: { icon: 'simple-icons:svelte', color: '#FF3E00' },
  nextdotjs: { icon: 'simple-icons:nextdotjs', color: '#888888' },
  astro: { icon: 'simple-icons:astro', color: '#FF5D01' },
  remix: { icon: 'simple-icons:remix', color: '#121212' },
  nuxt: { icon: 'simple-icons:nuxt', color: '#00DC82' },
  express: { icon: 'simple-icons:express', color: '#888888' },
  mongodb: { icon: 'simple-icons:mongodb', color: '#47A248' },
  mysql: { icon: 'simple-icons:mysql', color: '#4479A1' },
  postgresql: { icon: 'simple-icons:postgresql', color: '#336791' },
  redis: { icon: 'simple-icons:redis', color: '#DC382D' },
  docker: { icon: 'simple-icons:docker', color: '#2496ED' },
  kubernetes: { icon: 'simple-icons:kubernetes', color: '#326CE5' },
  terraform: { icon: 'simple-icons:terraform', color: '#7B42BC' },
  git: { icon: 'simple-icons:git', color: '#F05032' },
  vercel: { icon: 'simple-icons:vercel', color: '#888888' },
  java : { icon: 'lucide:coffee', color: '#F8981D' },
  maven: { icon: 'simple-icons:apachemaven', color: '#C71A36' },
}

// Helper functions to extract icon name and color from ICON_MAP entry
export const getIconName = (entry: IconEntry | undefined): string | undefined =>
  typeof entry === 'string' ? entry : entry?.icon

export const getIconColor = (entry: IconEntry | undefined): string | undefined =>
  typeof entry === 'object' && entry ? entry.color : undefined

export const ME: Person = {
  name: 'Sedhu Madhav',
  birthDate: new Date('2002-12-12'),
  age: new Date().getFullYear() - 2002
}
