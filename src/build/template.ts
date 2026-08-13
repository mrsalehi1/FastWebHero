export interface PageSource {
  data: Record<string, string>;
  body: string;
}

export function parseFrontMatter(source: string): PageSource {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: source.trim() };
  }

  const data: Record<string, string> = {};
  const frontMatter = match[1] ?? "";

  for (const line of frontMatter.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf(":");
    if (separator === -1) {
      throw new Error(`Invalid front matter line: ${trimmed}`);
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (!key) {
      throw new Error(`Invalid front matter line: ${trimmed}`);
    }

    data[key] = value;
  }

  return { data, body: (match[2] ?? "").trim() };
}

export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (placeholder, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) {
      throw new Error(`Unknown template placeholder ${placeholder}`);
    }
    return vars[key] ?? "";
  });
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderNav(items: { href: string; label: string }[], currentUrl: string): string {
  return items
    .map((item) => {
      const current = item.href === currentUrl ? ' aria-current="page"' : "";
      return `<a href="${escapeHtml(item.href)}"${current}>${escapeHtml(item.label)}</a>`;
    })
    .join("\n");
}

export function normalizePagePath(raw: string, sourceName: string): string {
  const trimmed = raw.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const slug = trimmed === "" ? "index" : trimmed;
  const parts = slug.split("/");

  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`Invalid path "${raw}" in ${sourceName}`);
  }

  return slug;
}

export function titleFromSlug(slug: string): string {
  const leaf = slug.split("/").at(-1) ?? slug;
  if (leaf === "index") return "Home";
  if (leaf === "404") return "Page not found";

  return leaf
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
