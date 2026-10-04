import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyTemplate,
  escapeHtml,
  normalizePagePath,
  parseFrontMatter,
  renderNav,
  titleFromSlug,
} from "../src/build/template.js";

describe("page templates", () => {
  it("parses front matter and trims the page body", () => {
    const page = parseFrontMatter(`---
title: "About us"
description: A test: with punctuation
---
<h1>About</h1>
`);

    assert.deepEqual(page.data, {
      title: "About us",
      description: "A test: with punctuation",
    });
    assert.equal(page.body, "<h1>About</h1>");
  });

  it("returns plain content when front matter is absent", () => {
    assert.deepEqual(parseFrontMatter("  <p>Hello</p>  "), {
      data: {},
      body: "<p>Hello</p>",
    });
  });

  it("rejects malformed front matter", () => {
    assert.throws(
      () => parseFrontMatter("---\ntitle\n---\nContent"),
      /Invalid front matter line/,
    );
  });

  it("applies known placeholders and rejects unknown ones", () => {
    assert.equal(applyTemplate("<title>{{ title }}</title>", { title: "Home" }), "<title>Home</title>");
    assert.throws(() => applyTemplate("{{missing}}", {}), /Unknown template placeholder/);
  });

  it("escapes text used in generated HTML", () => {
    assert.equal(escapeHtml(`<a title="'">A & B</a>`), "&lt;a title=&quot;&#39;&quot;&gt;A &amp; B&lt;/a&gt;");
  });

  it("marks the current navigation item and escapes labels", () => {
    const html = renderNav(
      [
        { href: "/", label: "Home" },
        { href: "/about/", label: "About & team" },
      ],
      "/about/",
    );

    assert.match(html, /href="\/about\/" aria-current="page"/);
    assert.match(html, /About &amp; team/);
    assert.doesNotMatch(html.split("\n")[0] ?? "", /aria-current/);
  });

  it("normalizes safe paths and rejects traversal", () => {
    assert.equal(normalizePagePath("/journal/notes/", "notes.html"), "journal/notes");
    assert.equal(normalizePagePath("", "index.html"), "index");
    assert.throws(() => normalizePagePath("../secret", "bad.html"), /Invalid path/);
    assert.throws(() => normalizePagePath("journal//notes", "bad.html"), /Invalid path/);
  });

  it("creates readable titles from slugs", () => {
    assert.equal(titleFromSlug("index"), "Home");
    assert.equal(titleFromSlug("journal/release-notes"), "Release Notes");
    assert.equal(titleFromSlug("404"), "Page not found");
  });
});
