import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { cacheControlFor, contentTypeFor, toPosixKey } from "../src/files.js";

describe("published file metadata", () => {
  it("adds UTF-8 to textual content types", () => {
    assert.equal(contentTypeFor("index.html"), "text/html; charset=utf-8");
    assert.equal(contentTypeFor("styles/main.css"), "text/css; charset=utf-8");
    assert.equal(contentTypeFor("data.json"), "application/json; charset=utf-8");
    assert.equal(contentTypeFor("image.svg"), "image/svg+xml; charset=utf-8");
  });

  it("leaves binary content types unchanged", () => {
    assert.equal(contentTypeFor("image.png"), "image/png");
    assert.equal(contentTypeFor("unknown.custom-extension"), "application/octet-stream");
  });

  it("revalidates HTML and caches static assets", () => {
    assert.equal(cacheControlFor("index.html"), "public, max-age=0, must-revalidate");
    assert.equal(cacheControlFor("styles/main.css"), "public, max-age=86400");
  });

  it("creates platform-independent S3 object keys", () => {
    const root = path.join("project", "dist");
    const file = path.join(root, "journal", "index.html");
    assert.equal(toPosixKey(root, file), "journal/index.html");
  });
});
