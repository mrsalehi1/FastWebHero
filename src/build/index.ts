import fs from "node:fs/promises";
import path from "node:path";
import { loadSiteConfig } from "../config.js";
import { copyTree, displayPath, resetDir } from "../files.js";
import {
  distDir,
  layoutsDir,
  pagesDir,
  publicDir,
  scriptsDir,
  stylesDir,
} from "../paths.js";
import type { BuiltPage, SiteConfig } from "../types.js";
import {
  applyTemplate,
  escapeHtml,
  normalizePagePath,
  parseFrontMatter,
  renderNav,
  titleFromSlug,
} from "./template.js";

export async function buildSite(): Promise<BuiltPage[]> {
  const site = await loadSiteConfig();
  const pageFiles = await listPageFiles();

  if (pageFiles.length === 0) {
    throw new Error("Add at least one HTML file to site/pages.");
  }

  await resetDir(distDir);

  const pages: BuiltPage[] = [];
  const written = new Set<string>();

  for (const filePath of pageFiles) {
    const page = await renderPage(filePath, site);
    if (written.has(page.outputFile)) {
      throw new Error(`Two pages write to ${displayPath(page.outputFile)}`);
    }
    written.add(page.outputFile);
    await fs.mkdir(path.dirname(page.outputFile), { recursive: true });
    await fs.writeFile(page.outputFile, page.html, "utf8");
    pages.push({ title: page.title, url: page.url, outputFile: page.outputFile });
  }

  await ensureRequiredDocuments(site, pages);
  const styles = await copyTree(stylesDir, path.join(distDir, "styles"));
  const scripts = await copyTree(scriptsDir, path.join(distDir, "scripts"));
  const assets = await copyTree(publicDir, distDir, { failIfExists: true });

  console.log(`Built ${pages.length} pages into ${distDir}`);
  for (const page of pages) {
    console.log(`  ${page.url.padEnd(18)} ${displayPath(page.outputFile)}`);
  }
  console.log(`Copied ${styles.length + scripts.length + assets.length} assets`);

  return pages;
}

async function listPageFiles(): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(pagesDir, { withFileTypes: true });
  } catch (error) {
    if (isMissing(error)) {
      throw new Error("Missing site/pages directory.");
    }
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => path.join(pagesDir, entry.name))
    .sort();
}

async function renderPage(
  filePath: string,
  site: SiteConfig,
): Promise<BuiltPage & { html: string }> {
  const sourceName = path.basename(filePath);
  const source = await fs.readFile(filePath, "utf8");
  const { data, body } = parseFrontMatter(source);
  const fallbackSlug = sourceName.replace(/\.html$/, "");
  const slug = normalizePagePath(data.path ?? fallbackSlug, sourceName);
  const title = data.title?.trim() || titleFromSlug(slug);
  const description = data.description?.trim() || site.description;
  const layoutName = data.layout?.trim() || "default";
  const destination = destinationFor(slug, site);
  const documentTitle =
    title === site.title ? site.title : `${title} · ${site.title}`;

  const layout = await readLayout(layoutName);
  const html = applyTemplate(layout, {
    documentTitle: escapeHtml(documentTitle),
    description: escapeHtml(description),
    siteTitle: escapeHtml(site.title),
    nav: renderNav(site.nav, destination.url),
    content: body,
    year: String(new Date().getFullYear()),
  });

  return {
    title,
    url: destination.url,
    outputFile: destination.outputFile,
    html,
  };
}

function destinationFor(
  slug: string,
  site: SiteConfig,
): { url: string; outputFile: string } {
  if (slug === "index") {
    return {
      url: "/",
      outputFile: path.join(distDir, site.indexDocument),
    };
  }

  const errorSlug = site.errorDocument.replace(/\.html$/, "");
  if (slug === "404" || slug === errorSlug) {
    return {
      url: `/${site.errorDocument}`,
      outputFile: path.join(distDir, site.errorDocument),
    };
  }

  return {
    url: `/${slug}/`,
    outputFile: path.join(distDir, ...slug.split("/"), "index.html"),
  };
}

async function readLayout(layoutName: string): Promise<string> {
  if (!/^[A-Za-z0-9_-]+$/.test(layoutName)) {
    throw new Error(`Invalid layout name "${layoutName}"`);
  }

  const layoutPath = path.join(layoutsDir, `${layoutName}.html`);
  try {
    return await fs.readFile(layoutPath, "utf8");
  } catch (error) {
    if (isMissing(error)) {
      throw new Error(`Missing layout site/layouts/${layoutName}.html`);
    }
    throw error;
  }
}

async function ensureRequiredDocuments(site: SiteConfig, pages: BuiltPage[]): Promise<void> {
  const indexFile = path.join(distDir, site.indexDocument);
  const errorFile = path.join(distDir, site.errorDocument);

  try {
    await fs.access(indexFile);
  } catch {
    throw new Error(`The build has no ${site.indexDocument}. Add site/pages/index.html.`);
  }

  try {
    await fs.access(errorFile);
  } catch {
    const html = await renderFallbackError(site);
    await fs.writeFile(errorFile, html, "utf8");
    pages.push({
      title: "Page not found",
      url: `/${site.errorDocument}`,
      outputFile: errorFile,
    });
  }
}

async function renderFallbackError(site: SiteConfig): Promise<string> {
  const layout = await readLayout("default");
  return applyTemplate(layout, {
    documentTitle: escapeHtml(`Page not found · ${site.title}`),
    description: escapeHtml("The page you requested is not on this site."),
    siteTitle: escapeHtml(site.title),
    nav: renderNav(site.nav, `/${site.errorDocument}`),
    content: `<section class="hero"><p class="eyebrow">404</p><h1>That page is not here.</h1><p class="lede"><a href="/">Back to the home page</a></p></section>`,
    year: String(new Date().getFullYear()),
  });
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
