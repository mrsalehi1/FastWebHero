# Static website builder

A Node.js app, written in TypeScript, that builds a static website and hosts it from an Amazon S3 bucket.

It is for someone who writes a small site as HTML files and wants a local preview plus a publish command, without a larger site framework. `site/` is the website you edit. `src/` is the builder. `npm run build` writes the finished site to `dist/`. `npm run publish` uploads that folder and turns on S3 static website hosting.

Planned work is listed in [ROADMAP.md](ROADMAP.md). The code is released under the [MIT License](LICENSE).

## Layout

```text
site/
  site.json            Site title, description, and navigation
  layouts/default.html Shared document wrapper
  pages/               One HTML fragment per page
  styles/              Stylesheets copied to dist/styles
  scripts/             Scripts copied to dist/scripts
  public/              Files copied to the site root
src/
  cli.ts               build, dev, preview, deploy, publish
  build/               Reads site/ and writes dist/
  deploy/              Uploads dist/ and configures the bucket
  preview/             Local static server
dist/                  Generated site. Do not edit by hand.
```

A page file named `about.html` is published at `/about/`. `index.html` stays at the site root. `404.html` is the S3 error document.

## Requirements

- Node.js 20 or newer
- An AWS account, and credentials the AWS SDK can find (environment variables, `AWS_PROFILE`, SSO, or an instance role)
- An S3 bucket used only for this site

## Setup

```bash
npm install
copy .env.example .env
```

Edit `.env` and set `AWS_REGION` and `S3_BUCKET`. Set `S3_CREATE_BUCKET=true` if the bucket does not exist yet.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Build, serve `dist/` at http://localhost:3000, and rebuild when `site/` changes |
| `npm run build` | Render `site/` into `dist/` |
| `npm run preview` | Serve the current `dist/` folder |
| `npm run deploy` | Upload `dist/` and enable S3 website hosting |
| `npm run publish` | Build, then deploy |
| `npm test` | Run the automated test suite |
| `npm run typecheck` | Check the TypeScript without writing files |
| `npm run check` | Type-check, test, and build as CI does |

`npm run dev -- --port 4173` uses another preview port.

## Contributing

Changes are made through reviewed pull requests with required CI checks. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

## Edit the site

Change the name and links in `site/site.json`. Page files start with a small header:

```html
---
title: About
description: What this page is about.
---
<section>
  <h1>About</h1>
</section>
```

The layout can use `{{documentTitle}}`, `{{description}}`, `{{siteTitle}}`, `{{nav}}`, `{{content}}`, and `{{year}}`. Set `path: journal/notes` in the header when the URL should not follow the file name. Set `layout: default` to pick a file in `site/layouts`.

## Deploy

`npm run publish` does four things:

1. Builds `dist/`.
2. Creates the bucket only when `S3_CREATE_BUCKET=true`.
3. Enables static website hosting with `index.html` and `404.html`.
4. When `S3_PUBLIC_WEBSITE=true` (the default), allows public `s3:GetObject` on the bucket and uploads every file.

The command prints the website endpoint, for example `http://your-site-bucket.s3-website-us-east-1.amazonaws.com`.

S3 website endpoints serve HTTP only. For HTTPS, put Amazon CloudFront in front of the bucket. If an account-level Block Public Access setting is on, AWS will reject the public bucket policy until that setting allows bucket policies.

`S3_DELETE_REMOVED=true` deletes objects in the bucket that are not in the latest build. Point it at a bucket that contains only this site.

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `AWS_REGION` | required | Bucket region |
| `S3_BUCKET` | required | Destination bucket |
| `S3_CREATE_BUCKET` | `false` | Create the bucket when it is missing |
| `S3_PUBLIC_WEBSITE` | `true` | Enable public reads and website hosting access |
| `S3_DELETE_REMOVED` | `true` | Remove objects that are no longer in `dist/` |

### IAM permissions

The credentials used for deploy need:

- `s3:ListBucket`
- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`
- `s3:GetBucketPolicy`
- `s3:PutBucketPolicy`
- `s3:PutBucketWebsite`
- `s3:PutPublicAccessBlock`
- `s3:CreateBucket`, only if the tool should create the bucket
