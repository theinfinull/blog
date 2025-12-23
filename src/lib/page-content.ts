import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Extracts text content from Astro template strings
 */
function extractTextFromTemplate(content: string): string {
  // Remove frontmatter
  content = content.replace(/^---[\s\S]*?---\n/, '')
  
  // Remove import statements
  content = content.replace(/import\s+.*?from\s+['"].*?['"];?\n/g, '')
  
  // Extract text from JSX/HTML content
  // Match text content between tags (but not in attributes)
  const textMatches: string[] = []
  
  // Extract text nodes from JSX (content between > and <)
  const tagContentRegex = />([^<{]+)</g
  let match
  while ((match = tagContentRegex.exec(content)) !== null) {
    const text = match[1].trim()
    if (text.length > 5 && !text.match(/^(class|href|id|aria-)/)) {
      textMatches.push(text)
    }
  }
  
  // Extract string literals that look like descriptions
  const stringLiteralRegex = /(?:['"`])([^'"`]{20,})(?:['"`])/g
  while ((match = stringLiteralRegex.exec(content)) !== null) {
    const text = match[1].trim()
    if (!text.includes('http') && !text.includes('import') && text.length > 20) {
      textMatches.push(text)
    }
  }
  
  return textMatches.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Gets searchable content for static pages by reading the actual page files
 */
export async function getPageSearchData() {
  const pagesDir = join(__dirname, '..', 'pages')
  
  try {
    // Read home page
    const homeContentRaw = readFileSync(join(pagesDir, 'index.astro'), 'utf-8')
    const homeText = extractTextFromTemplate(homeContentRaw)
    
    // Extract description - look for the main description text
    const homeDescriptionMatch = homeText.match(/astro-erudite[^.]*\./i) || 
      homeText.match(/erudite[^.]*\./i) ||
      homeText.split('.').find(s => s.includes('astro-erudite') && s.length > 50)
    
    const homeDescription = homeDescriptionMatch?.[0]?.trim() || 
      'astro-erudite is an opinionated, unstyled static blogging template built with Astro, Tailwind, and shadcn/ui. Extraordinarily loosely based on the Astro Micro theme.'
    
    // Read about page
    const aboutContentRaw = readFileSync(join(pagesDir, 'about.astro'), 'utf-8')
    const aboutText = extractTextFromTemplate(aboutContentRaw)
    
    // Extract description - look for the main description text
    const aboutDescriptionMatch = aboutText.match(/astro-erudite[^.]*\./i) ||
      aboutText.split('.').find(s => s.includes('astro-erudite') && s.length > 50)
    
    const aboutDescription = aboutDescriptionMatch?.[0]?.trim() || 
      'astro-erudite is an opinionated, unstyled static blogging template that prioritizes simplicity and performance, built with Astro, Tailwind, and shadcn/ui. It provides a clean foundation for your content while being extremely easy to customize.'
    
    const homeContent = {
      id: 'home',
      title: 'Home',
      description: homeDescription.substring(0, 200),
      tags: ['home', 'erudite', 'template', 'astro', 'tailwind', 'shadcn'],
      slug: '/',
      type: 'page' as const,
    }
    
    const aboutContent = {
      id: 'about',
      title: 'About',
      description: aboutDescription.substring(0, 200),
      tags: ['about', 'template', 'astro', 'tailwind', 'shadcn'],
      slug: '/about',
      type: 'page' as const,
    }
    
    return [homeContent, aboutContent]
  } catch (error) {
    console.error('Error reading page files:', error)
    // Fallback to default content extracted from actual pages
    return [
      {
        id: 'home',
        title: 'Home',
        description: 'astro-erudite is an opinionated, unstyled static blogging template built with Astro, Tailwind, and shadcn/ui. Extraordinarily loosely based on the Astro Micro theme.',
        tags: ['home', 'erudite', 'template', 'astro', 'tailwind', 'shadcn'],
        slug: '/',
        type: 'page' as const,
      },
      {
        id: 'about',
        title: 'About',
        description: 'astro-erudite is an opinionated, unstyled static blogging template that prioritizes simplicity and performance, built with Astro, Tailwind, and shadcn/ui. It provides a clean foundation for your content while being extremely easy to customize.',
        tags: ['about', 'template', 'astro', 'tailwind', 'shadcn'],
        slug: '/about',
        type: 'page' as const,
      },
    ]
  }
}

