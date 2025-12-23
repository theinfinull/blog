/**
 * parses frontmatter from markdown content
 */
export function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = match[2];
  const frontmatter = {};
  const lines = frontmatterText.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      i++;
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      i++;
      continue;
    }

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    // check if this is a list (next line starts with -)
    if (i + 1 < lines.length && lines[i + 1].trim().startsWith("-")) {
      // parse YAML list format
      const arrayItems = [];
      i++; // move to first list item

      while (i < lines.length) {
        const listLine = lines[i].trim();
        if (!listLine.startsWith("-")) break;

        let item = listLine.slice(1).trim();
        // remove quotes
        if (
          (item.startsWith('"') && item.endsWith('"')) ||
          (item.startsWith("'") && item.endsWith("'"))
        ) {
          item = item.slice(1, -1);
        }
        arrayItems.push(item);
        i++;
      }

      frontmatter[key] = arrayItems;
      continue;
    }

    // remove quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // parse inline arrays
    if (value.startsWith("[") && value.endsWith("]")) {
      const arrayContent = value.slice(1, -1).trim();
      frontmatter[key] = arrayContent
        ? arrayContent.split(",").map((item) => item.trim().replace(/^["']|["']$/g, ""))
        : [];
    } else {
      frontmatter[key] = value;
    }

    i++;
  }

  return { frontmatter, body };
}

/**
 * checks if a file should be skipped
 */
export function shouldSkipFile(frontmatter) {
  if (frontmatter.can_skip === true || frontmatter.can_skip === "true") {
    return { shouldSkip: true, reason: "can skip property is true" };
  }

  if (frontmatter.is_draft === true || frontmatter.is_draft === "true") {
    return { shouldSkip: true, reason: "post is in draft state" };
  }

  const missing = [];
  if (!frontmatter.description || typeof frontmatter.description !== "string") {
    missing.push("description");
  }
  if (!frontmatter.date) {
    missing.push("date");
  } else {
    const date = new Date(frontmatter.date);
    if (isNaN(date.getTime())) {
      missing.push("date (invalid)");
    }
  }

  if (missing.length > 0) {
    return {
      shouldSkip: true,
      reason: `missing required properties: ${missing.join(", ")}`,
    };
  }

  return { shouldSkip: false };
}

/**
 * processes and normalizes frontmatter
 */
export function processFrontmatter(frontmatter, filename, getBasename) {
  const basename = getBasename(filename);
  
  // use existing title if provided, otherwise use filename
  if (!frontmatter.title || typeof frontmatter.title !== "string" || frontmatter.title.trim() === "") {
    frontmatter.title = basename;
  }

  // normalize arrays
  frontmatter.tags = normalizeArray(frontmatter.tags);
  frontmatter.authors = normalizeArray(frontmatter.authors);

  return frontmatter;
}

/**
 * normalizes a value to an array
 */
function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "string") return [value];
  return [];
}

/**
 * formats frontmatter as YAML string
 */
export function formatFrontmatter(frontmatter) {
  const lines = ["---"];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => `'${v}'`).join(", ")}]`);
    } else if (typeof value === "string" && value.includes(":")) {
      lines.push(`${key}: '${value}'`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}

