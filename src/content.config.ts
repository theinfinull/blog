import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      order: z.number().optional(),
      image: image().optional(),
      tags: z.array(z.string()).optional(),
      authors: z.array(z.string()).optional(),
      draft: z.boolean().optional(),
    }),
})

const authors = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    pronouns: z.string().optional(),
    avatar: z.string().url().or(z.string().startsWith('/')),
    bio: z.string().optional(),
    mail: z.string().email().optional(),
    website: z.string().url().optional(),
    twitter: z.string().url().optional(),
    github: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    discord: z.string().url().optional(),
  }),
})

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      image: image(),
      link: z.string().url().optional(),
      sourceCodeLink: z.string().url().optional(),
      siteLink: z.string().url().optional(),
      relatedBlogsLink: z.string().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      featured: z.boolean().optional().default(false),
      order: z.number().optional(),
    }),
})

const experience = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/experience' }),
  schema: ({ image }) =>
    z.object({
      role: z.string(),
      company: z.string(),
      period: z.string(),
      key: z.string(),
      icon: z.string(),
      location: z.string(),
      companyLogo: image().optional(),
      companyUrl: z.string().url().optional(),
      current: z.boolean().optional(),
      order: z.number().optional(),
      badges: z.array(
        z.object({
          label: z.string(),
          icon: z.string(),
        })
      ).optional(),
    }),
})

export const collections = { blog, authors, projects, experience }
