import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { websiteEndpoint } from "../src/deploy/endpoint.js";

describe("S3 website endpoints", () => {
  it("uses the hyphen endpoint for older AWS regions", () => {
    assert.equal(
      websiteEndpoint("example-site", "us-east-1"),
      "http://example-site.s3-website-us-east-1.amazonaws.com",
    );
  });

  it("uses the dot endpoint for newer AWS regions", () => {
    assert.equal(
      websiteEndpoint("example-site", "eu-central-1"),
      "http://example-site.s3-website.eu-central-1.amazonaws.com",
    );
  });
});
