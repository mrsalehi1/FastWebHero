import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { projectRoot, siteConfigPath } from "./paths.js";
import type { DeployConfig, NavItem, SiteConfig } from "./types.js";

dotenv.config({ path: path.join(projectRoot, ".env") });

export async function loadSiteConfig(): Promise<SiteConfig> {
  const raw = await fs.readFile(siteConfigPath, "utf8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse site/site.json: ${message}`);
  }

  if (!isRecord(parsed)) {
    throw new Error("site/site.json must contain an object");
  }

  const title = requiredString(parsed, "title");
  const description = requiredString(parsed, "description");
  const indexDocument = stringOr(parsed, "indexDocument", "index.html");
  const errorDocument = stringOr(parsed, "errorDocument", "404.html");

  assertDocumentName(indexDocument, "indexDocument");
  assertDocumentName(errorDocument, "errorDocument");

  return {
    title,
    description,
    indexDocument,
    errorDocument,
    nav: parseNav(parsed.nav),
  };
}

export function loadDeployConfig(site: SiteConfig): DeployConfig {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "";
  const bucket = process.env.S3_BUCKET || "";

  if (!region) {
    throw new Error("AWS_REGION is required. Copy .env.example to .env and set it.");
  }

  if (!bucket) {
    throw new Error("S3_BUCKET is required. Copy .env.example to .env and set it.");
  }

  assertBucketName(bucket);

  return {
    region,
    bucket,
    createBucket: envFlag("S3_CREATE_BUCKET", false),
    publicWebsite: envFlag("S3_PUBLIC_WEBSITE", true),
    deleteRemoved: envFlag("S3_DELETE_REMOVED", true),
    indexDocument: site.indexDocument,
    errorDocument: site.errorDocument,
  };
}

function parseNav(value: unknown): NavItem[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error("site/site.json nav must be an array");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Nav item ${index + 1} must be an object`);
    }

    const href = requiredString(item, "href");
    const label = requiredString(item, "label");

    if (
      !href.startsWith("/") &&
      !href.startsWith("#") &&
      !href.startsWith("https://") &&
      !href.startsWith("http://")
    ) {
      throw new Error(`Unsupported nav href: ${href}`);
    }

    return { href, label };
  });
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`site/site.json is missing a ${key} string`);
  }
  return value.trim();
}

function stringOr(record: Record<string, unknown>, key: string, fallback: string): string {
  const value = record[key];
  if (value === undefined) return fallback;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`site/site.json ${key} must be a non-empty string`);
  }
  return value.trim();
}

function assertDocumentName(name: string, label: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    throw new Error(`${label} must be a file name such as index.html`);
  }
}

function assertBucketName(name: string): void {
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(name)) {
    throw new Error(
      `Invalid S3 bucket name "${name}". Use 3-63 lowercase letters, numbers, dots, or hyphens.`,
    );
  }
}

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
