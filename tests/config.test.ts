import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { loadDeployConfig } from "../src/config.js";
import type { SiteConfig } from "../src/types.js";

const ENV_NAMES = [
  "AWS_REGION",
  "AWS_DEFAULT_REGION",
  "S3_BUCKET",
  "S3_CREATE_BUCKET",
  "S3_PUBLIC_WEBSITE",
  "S3_DELETE_REMOVED",
] as const;

const site: SiteConfig = {
  title: "Test site",
  description: "A test site",
  indexDocument: "index.html",
  errorDocument: "404.html",
  nav: [],
};

let originalEnvironment: Partial<Record<(typeof ENV_NAMES)[number], string>>;

describe("deployment configuration", () => {
  beforeEach(() => {
    originalEnvironment = {};
    for (const name of ENV_NAMES) {
      originalEnvironment[name] = process.env[name];
      delete process.env[name];
    }
  });

  afterEach(() => {
    for (const name of ENV_NAMES) {
      const value = originalEnvironment[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("loads required values and safe defaults", () => {
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "example-site";

    assert.deepEqual(loadDeployConfig(site), {
      region: "us-east-1",
      bucket: "example-site",
      createBucket: false,
      publicWebsite: true,
      deleteRemoved: true,
      indexDocument: "index.html",
      errorDocument: "404.html",
    });
  });

  it("parses boolean environment flags", () => {
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "example-site";
    process.env.S3_CREATE_BUCKET = "yes";
    process.env.S3_PUBLIC_WEBSITE = "false";
    process.env.S3_DELETE_REMOVED = "0";

    const config = loadDeployConfig(site);
    assert.equal(config.createBucket, true);
    assert.equal(config.publicWebsite, false);
    assert.equal(config.deleteRemoved, false);
  });

  it("requires an AWS region and bucket", () => {
    assert.throws(() => loadDeployConfig(site), /AWS_REGION is required/);
    process.env.AWS_REGION = "us-east-1";
    assert.throws(() => loadDeployConfig(site), /S3_BUCKET is required/);
  });

  it("rejects invalid S3 bucket names", () => {
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "Invalid_Bucket";
    assert.throws(() => loadDeployConfig(site), /Invalid S3 bucket name/);
  });
});
