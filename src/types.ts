export type Site = {
  title: string
  description: string
  href: string
  author: string
  locale: string
  featuredPostCount: number
  featuredProjectCount: number
  postsPerPage: number
}

export type SocialLink = {
  href: string
  label: string
  icon?: string
  hideBelowPx?: number
}

export type IconEntry = string | { icon: string; color: string }

export type IconMap = {
  [key: string]: IconEntry
}

export type Person = {
  name: string
  birthDate: Date
  age: number
}