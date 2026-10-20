# FastWebHero

FastWebHero builds a small static website from HTML files and can publish that folder to an Amazon S3 bucket. It is for someone who wants a local preview and a publish command without a larger site framework.

`site/` is the website you edit. `src/` is the builder, written in TypeScript for Node.js. `npm run build` writes the finished site to `dist/`. `npm run dev` previews it on your machine. `npm run publish` uploads that folder and turns on S3 static website hosting.

The sample site is fictional. Its name in `site/site.json` is Lark. This release only builds and publishes files. Accounts, products, and the shop are planned in the web builder and are not in the current commands.

## Current status

This is an early static builder. It renders pages from `site/pages`, copies styles and scripts, serves a local preview, and can upload `dist/` to one S3 bucket.

Content is still HTML you write by hand. The planned product is a web builder with export, plus **multitenant** sites, **accounts**, **products**, a **shop**, and an **MCP server** other components can call. There is no desktop app.

The sample pages are made up. Local preview does not need an AWS account. Publish uses credentials the AWS SDK already finds on your machine, such as an environment variable, `AWS_PROFILE`, SSO, or an instance role. Do not put access keys in the repository.

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
- For publish only: an AWS account, and credentials the AWS SDK can find
- An S3 bucket used only for this site

## Setup

```bash
npm install
copy .env.example .env
```

On macOS or Linux, use `cp .env.example .env`. You can run `npm run dev` before editing `.env`. Set `AWS_REGION` and `S3_BUCKET` before `npm run publish`. Set `S3_CREATE_BUCKET=true` if the bucket does not exist yet.

`.env` is listed in `.gitignore`. `.env.example` has placeholders only.

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
| `AWS_REGION` | required for publish | Bucket region |
| `S3_BUCKET` | required for publish | Destination bucket |
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

## Plans

The web builder, export, tenants, accounts, products, shop, and MCP server are listed in [ROADMAP.md](ROADMAP.md), with the open builder bugs.

## License

MIT. The full text is in [LICENSE](LICENSE).
