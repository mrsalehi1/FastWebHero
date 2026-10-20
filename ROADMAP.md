# Roadmap

FastWebHero's next stage is a dependable static site builder: write HTML, preview it locally, and publish the folder to one S3 bucket. The plan stays on that builder.

## Starting point

The current app renders `site/` into `dist/`, serves a local preview, and can upload that folder to S3. Tests cover config, templating, files, and the website endpoint. CI runs the type check, tests, and build. The sample site is fictional. Setup and CI already in the repo are excluded from the estimates below.

## 1. Fix preview and content bugs

Estimated effort: 6 to 8 hours.

1. Serve the error document named in `site.json`. See [issue 1](https://github.com/mrsalehi1/FastWebHero/issues/1).
2. Preview the configured index document, not only `index.html`. See [issue 2](https://github.com/mrsalehi1/FastWebHero/issues/2).
3. Reject boolean environment values the builder does not understand. See [issue 3](https://github.com/mrsalehi1/FastWebHero/issues/3).
4. Keep pages marked `draft: true` out of `dist/` unless the command is a local preview. See [issue 4](https://github.com/mrsalehi1/FastWebHero/issues/4).
5. Build HTML files in subfolders of `site/pages`, or report that they were skipped. See [issue 5](https://github.com/mrsalehi1/FastWebHero/issues/5).
6. Reject S3 bucket names that look like IP addresses. See [issue 7](https://github.com/mrsalehi1/FastWebHero/issues/7).
7. Mark the current navigation link when the href and the page URL differ by a trailing slash. See [issue 8](https://github.com/mrsalehi1/FastWebHero/issues/8).
8. Add regression tests for each fix.

Done when the sample site still builds, invalid config fails with a clear message, and these issues have passing tests.

## 2. Make publish predictable

Estimated effort: 6 to 8 hours.

1. Add a dry run that prints the objects that would be uploaded or deleted, and uploads nothing. See [issue 6](https://github.com/mrsalehi1/FastWebHero/issues/6).
2. Upload only files whose bytes changed since the last publish.
3. Limit deletion to objects this site published. Leave other objects in the bucket alone unless the owner confirms the bucket is only for this site.
4. Test content types and cache headers used during upload.

Done when a second publish of an unchanged site uploads nothing, and a dry run lists actions without calling S3.

## 3. Redirects and page URLs

Estimated effort: 4 to 6 hours.

1. Support redirects, such as `/about` to `/about/`, from `site/site.json`.
2. Use the same redirect rules in the local preview and in the published website config.
3. Document how a page file name becomes a URL, including `path` in the page header.

Done when `/about` and `/about/` reach the same page locally and on the S3 website endpoint.

## 4. Document a repeatable publish

Estimated effort: 4 to 6 hours.

1. Document the IAM actions, the bucket region, and how to remove the site from the bucket.
2. Keep account-specific values in `.env`, using the placeholders in `.env.example`.
3. Check a fresh local build before describing a publish, and write down what a failed upload looks like.
4. Note that the S3 website endpoint is HTTP, and that HTTPS is a later CloudFront step in front of the same bucket.

Done when someone can preview the fictional sample with Node.js alone, and can publish only after filling in their own bucket settings.

## Planning estimate

The open work above is estimated at 20 to 28 hours, including implementation, tests, and documentation. These are planning estimates based on the current builder. Update them as work is completed or a task changes.

All four stages remain planned. The open issues are part of stage 1 and stage 2, rather than extra work counted twice.

## Product boundaries

Development examples use the fictional Lark sample. This plan does not add visitor accounts, contact storage, a shop, checkout, or other people's personal or payment records.

The builder does not call a model, retrieve documents for an assistant, or ship an assistant connection. Any later change in direction should be written down before that work begins.
