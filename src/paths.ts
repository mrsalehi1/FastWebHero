import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDir = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(sourceDir, "..");
export const siteDir = path.join(projectRoot, "site");
export const pagesDir = path.join(siteDir, "pages");
export const layoutsDir = path.join(siteDir, "layouts");
export const stylesDir = path.join(siteDir, "styles");
export const scriptsDir = path.join(siteDir, "scripts");
export const publicDir = path.join(siteDir, "public");
export const distDir = path.join(projectRoot, "dist");
export const siteConfigPath = path.join(siteDir, "site.json");
