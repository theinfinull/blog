import path from "path";

export const MARKDOWN_EXTENSIONS = [".md", ".mdx"];

/**
 * converts a filename to a URL-friendly slug
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * checks if a file is a markdown file
 */
export function isMarkdownFile(filename) {
  return (
    MARKDOWN_EXTENSIONS.some((ext) => filename.endsWith(ext))
  );
}

/**
 * gets basename without extension
 */
export function getBasename(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

