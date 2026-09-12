import fs from "node:fs/promises";
import path from "node:path";
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetBucketPolicyCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  PutBucketWebsiteCommand,
  PutObjectCommand,
  PutPublicAccessBlockCommand,
  S3Client,
  type BucketLocationConstraint,
} from "@aws-sdk/client-s3";
import { cacheControlFor, contentTypeFor, toPosixKey, walkFiles } from "../files.js";
import { distDir } from "../paths.js";
import type { DeployConfig } from "../types.js";
import { websiteEndpoint } from "./endpoint.js";

const UPLOAD_CONCURRENCY = 8;

export async function deploySite(config: DeployConfig): Promise<string> {
  const indexFile = path.join(distDir, config.indexDocument);
  try {
    await fs.access(indexFile);
  } catch {
    throw new Error("dist/ has no index document. Run the build before deploying.");
  }

  const client = new S3Client({ region: config.region });
  const created = await ensureBucket(client, config);
  console.log(created ? `Created bucket ${config.bucket}` : `Using bucket ${config.bucket}`);

  if (config.publicWebsite) {
    await allowPublicPolicy(client, config.bucket);
    await enableWebsiteHosting(client, config);
    await ensurePublicReadPolicy(client, config.bucket);
    console.log("Static website hosting is on, and objects are publicly readable.");
  } else {
    await enableWebsiteHosting(client, config);
    console.log("Static website hosting is on. Public access was left unchanged.");
  }

  await syncDist(client, config);

  const endpoint = websiteEndpoint(config.bucket, config.region);
  console.log(`Website endpoint: ${endpoint}`);
  return endpoint;
}

async function ensureBucket(client: S3Client, config: DeployConfig): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    return false;
  } catch (error) {
    if (isRedirect(error)) {
      throw new Error(
        `Bucket ${config.bucket} is not in ${config.region}. Set AWS_REGION to the bucket's region.`,
      );
    }

    if (!isNotFound(error)) throw error;
    if (!config.createBucket) {
      throw new Error(
        `Bucket ${config.bucket} was not found. Set S3_CREATE_BUCKET=true to create it.`,
      );
    }
  }

  const input =
    config.region === "us-east-1"
      ? { Bucket: config.bucket }
      : {
          Bucket: config.bucket,
          CreateBucketConfiguration: {
            LocationConstraint: config.region as BucketLocationConstraint,
          },
        };

  await client.send(new CreateBucketCommand(input));
  await waitUntilVisible(client, config.bucket);
  return true;
}

async function waitUntilVisible(client: S3Client, bucket: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return;
    } catch (error) {
      if (!isNotFound(error) || attempt === 4) throw error;
      await delay(1000 * (attempt + 1));
    }
  }
}

async function allowPublicPolicy(client: S3Client, bucket: string): Promise<void> {
  await client.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }),
  );
}

async function enableWebsiteHosting(client: S3Client, config: DeployConfig): Promise<void> {
  await client.send(
    new PutBucketWebsiteCommand({
      Bucket: config.bucket,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: config.indexDocument },
        ErrorDocument: { Key: config.errorDocument },
      },
    }),
  );
}

async function ensurePublicReadPolicy(client: S3Client, bucket: string): Promise<void> {
  const statement = {
    Sid: "PublicReadGetObject",
    Effect: "Allow",
    Principal: "*",
    Action: "s3:GetObject",
    Resource: `arn:aws:s3:::${bucket}/*`,
  };

  let statements: unknown[] = [];
  let version = "2012-10-17";

  try {
    const existing = await client.send(new GetBucketPolicyCommand({ Bucket: bucket }));
    if (existing.Policy) {
      const parsed: unknown = JSON.parse(existing.Policy);
      const document = readPolicyDocument(parsed, bucket);
      version = document.version;
      statements = document.statements;
    }
  } catch (error) {
    if (!isNoSuchPolicy(error)) throw error;
  }

  const policy = {
    Version: version,
    Statement: [
      ...statements.filter((item) => {
        if (!item || typeof item !== "object" || !("Sid" in item)) return true;
        return item.Sid !== "PublicReadGetObject";
      }),
      statement,
    ],
  };

  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(policy),
    }),
  );
}

async function syncDist(client: S3Client, config: DeployConfig): Promise<void> {
  const files = await walkFiles(distDir);
  const uploaded = new Set<string>();
  let bytes = 0;

  await runPool(files, UPLOAD_CONCURRENCY, async (filePath) => {
    const key = toPosixKey(distDir, filePath);
    const body = await fs.readFile(filePath);
    bytes += body.byteLength;
    uploaded.add(key);

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentTypeFor(filePath),
        CacheControl: cacheControlFor(filePath),
      }),
    );
    console.log(`  uploaded ${key}`);
  });

  console.log(`Uploaded ${files.length} files (${formatBytes(bytes)}) to s3://${config.bucket}`);

  if (!config.deleteRemoved) return;

  const remoteKeys = await listKeys(client, config.bucket);
  const stale = remoteKeys.filter((key) => !uploaded.has(key));

  if (stale.length === 0) {
    console.log("No removed files to delete");
    return;
  }

  await deleteKeys(client, config.bucket, stale);
  console.log(`Deleted ${stale.length} removed files`);
}

async function listKeys(client: S3Client, bucket: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: token,
      }),
    );

    for (const object of page.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }

    token = page.IsTruncated ? page.NextContinuationToken : undefined;
    if (page.IsTruncated && !token) break;
  } while (token);

  return keys;
}

async function deleteKeys(client: S3Client, bucket: string, keys: string[]): Promise<void> {
  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000);
    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
          Quiet: false,
        },
      }),
    );

    const failure = result.Errors?.[0];
    if (failure) {
      throw new Error(`Failed to delete ${failure.Key ?? "an object"}: ${failure.Message ?? "unknown error"}`);
    }
  }
}

async function runPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;

  let next = 0;
  const workers = Math.min(limit, items.length);

  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (next < items.length) {
        const current = next;
        next += 1;
        const item = items[current];
        if (item !== undefined) await worker(item);
      }
    }),
  );
}

function readPolicyDocument(
  value: unknown,
  bucket: string,
): { version: string; statements: unknown[] } {
  if (typeof value !== "object" || value === null || !("Statement" in value)) {
    throw new Error(`Bucket ${bucket} has a policy this tool cannot update safely.`);
  }

  const version =
    "Version" in value && typeof value.Version === "string" ? value.Version : "2012-10-17";
  const statement = value.Statement;

  if (Array.isArray(statement)) return { version, statements: statement };
  if (typeof statement === "object" && statement !== null) {
    return { version, statements: [statement] };
  }

  throw new Error(`Bucket ${bucket} has a policy this tool cannot update safely.`);
}

function isNotFound(error: unknown): boolean {
  return errorName(error) === "NotFound" || errorName(error) === "NoSuchBucket" || statusCode(error) === 404;
}

function isNoSuchPolicy(error: unknown): boolean {
  return errorName(error) === "NoSuchBucketPolicy";
}

function isRedirect(error: unknown): boolean {
  return errorName(error) === "PermanentRedirect" || statusCode(error) === 301;
}

function errorName(error: unknown): string {
  if (typeof error === "object" && error !== null && "name" in error && typeof error.name === "string") {
    return error.name;
  }
  return "";
}

function statusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("$metadata" in error)) return undefined;
  const metadata = error.$metadata;
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "httpStatusCode" in metadata &&
    typeof metadata.httpStatusCode === "number"
  ) {
    return metadata.httpStatusCode;
  }
  return undefined;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
