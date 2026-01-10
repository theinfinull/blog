import path from "path";
import fs from "fs-extra";

const OBSIDIAN_IMAGE_REGEX = /!\[\[\s*(.*?)\s*\]\]/g;

/**
 * normalizes image filename (lowercase + replace spaces with hyphens)
 */
export function normalizeImageName(imageName) {
  const ext = path.extname(imageName);
  const basename = path.basename(imageName, ext);
  const normalized = basename.toLowerCase().replace(/\s+/g, "-");
  return `${normalized}${ext}`;
}

/**
 * processes images in markdown content
 * @param {string} content - markdown content
 * @param {string} sourceDir - source directory for images
 * @param {string} destDir - destination directory
 * @returns {Promise<{ content: string, results: Array }>}
 */
export async function processImages(content, sourceDir, destDir) {
  const matches = [...content.matchAll(OBSIDIAN_IMAGE_REGEX)]
  if (matches.length === 0) return Promise.resolve({ content, results: [] })

  const assetsDir = path.join(destDir, "assets");
  await fs.ensureDir(assetsDir);

  let updatedContent = content;
  const imageTasks = [];

  for (const match of matches) {
    const originalImageName = match[1];
    const normalizedImageName = normalizeImageName(originalImageName);
    const sourceImagePath = path.join(sourceDir, originalImageName);
    const destImagePath = path.join(assetsDir, normalizedImageName);

    imageTasks.push(
      copyImage(sourceImagePath, destImagePath, originalImageName, normalizedImageName)
    );

    updatedContent = updatedContent.replace(
      match[0],
      `![${normalizedImageName}](./assets/${normalizedImageName})`
    );
  }

  const results = await Promise.all(imageTasks);
  return { content: updatedContent, results };
}

/**
 * copies a single image file
 */
async function copyImage(sourcePath, destPath, originalName, normalizedName) {
  const exists = await fs.pathExists(sourcePath);
  if (exists) {
    await fs.copy(sourcePath, destPath);
    return { success: true, originalName, normalizedName };
  }
  return { success: false, originalName, error: "missing" };
}

