import fs from "node:fs/promises";
import path from "node:path";
import mime from "mime-types";
import { projectRoot } from "./paths.js";

export async function resetDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

export async function walkFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function copyTree(
  source: string,
  destination: string,
  options?: { failIfExists?: boolean },
): Promise<string[]> {
  const copied: string[] = [];
  let entries;

  try {
    entries = await fs.readdir(source, { withFileTypes: true });
  } catch (error) {
    if (isMissingFile(error)) return copied;
    throw error;
  }

  await fs.mkdir(destination, { recursive: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copied.push(...(await copyTree(from, to, options)));
      continue;
    }

    if (!entry.isFile()) continue;

    if (options?.failIfExists) {
      try {
        await fs.access(to);
        throw new Error(
          `Refusing to overwrite ${displayPath(to)} with ${displayPath(from)}`,
        );
      } catch (error) {
        if (!isMissingFile(error)) throw error;
      }
    }

    await fs.copyFile(from, to);
    copied.push(to);
  }

  return copied;
}

export function contentTypeFor(filePath: string): string {
  const lookedUp = mime.lookup(filePath);
  const type = typeof lookedUp === "string" ? lookedUp : "application/octet-stream";
  const needsCharset =
    type.startsWith("text/") ||
    type === "application/javascript" ||
    type === "application/json" ||
    type === "image/svg+xml";

  return needsCharset ? `${type}; charset=utf-8` : type;
}

export function cacheControlFor(filePath: string): string {
  return filePath.endsWith(".html")
    ? "public, max-age=0, must-revalidate"
    : "public, max-age=86400";
}

export function toPosixKey(root: string, filePath: string): string {
  return path.relative(root, filePath).split(path.sep).join("/");
}

export function displayPath(filePath: string): string {
  const relative = path.relative(projectRoot, filePath);
  return relative.split(path.sep).join("/");
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
