# Roadmap

The app today builds HTML from `site/` and uploads it to an S3 bucket. The product goal is a website builder for someone who is not a developer. They use a Mac or Windows app, follow a setup wizard, create a complete site, choose static or dynamic, and publish it. AWS is the first host. Azure and Google Cloud come after that path works.

## Make the current static publish path solid

- Add tests for front matter, page URLs, the layout template, and navigation.
- Add tests for content types and cache headers used during upload.
- Run `npm run typecheck` and the test suite on every push.
- Add a dry run that prints the objects that would be uploaded or deleted.
- Upload only files that changed since the last publish.
- Support redirects, such as `/about` to `/about/`, from `site/site.json`.
- Skip pages marked `draft: true` unless the command is a local preview.

## Mac and Windows app

Ship a desktop application for macOS and Windows so the person never has to use a terminal.

- Install and open one app on either system.
- Guide them with a wizard: site name, static or dynamic, AWS access key, and, when they choose dynamic, the database and where the server runs.
- Show the header, footer, pages, and shop inside the app.
- Run the build and the CloudFormation deploy from the wizard, then show the live site URL.
- Use the same project files on Mac and Windows.

## Publish on AWS from an access key

The person provides an AWS access key. The app does the rest.

- Create a CloudFormation stack for the site: the S3 bucket, a CloudFront distribution, and the permissions that stack needs.
- Build the site and deploy it through that stack.
- Serve the site over HTTPS on CloudFront. Prefer the AWS free tier when the account is new.
- On each publish, upload changed files to S3 and refresh the CloudFront cache.
- Print the site URL when the stack is ready.

## A complete site, without writing HTML

- Ship a starter site with a header, a footer, navigation, and the usual pages: home, about, and contact.
- Let the person edit the header and footer once and reuse them on every page.
- Add a visual page builder, in the style of a WordPress builder such as Elementor: sections, columns, text, images, and buttons.
- Save the builder layout as the source of the page, then render it to the published site.

## Static or dynamic

The person chooses the mode when they create the site.

- Static mode publishes files only. No database and no application server. Hosting stays on S3 and CloudFront.
- Dynamic mode adds an application server and a database. Use it for accounts, forms, and a shop.

## Shop and accounts

These belong to dynamic mode.

- Add user accounts: sign up, sign in, and a way for the site owner to manage users.
- Add a shop the owner can fill in without writing code: products, cart, and checkout.
- Publish the storefront to S3 and update CloudFront. Orders, accounts, and stock stay on the server.

## Database and where the server runs

The person chooses both.

- Support PostgreSQL and MySQL.
- Run the dynamic app on an EC2 instance or in Docker.
- Include the chosen database and compute option in the same deploy as the site.

## Azure and Google Cloud

After the AWS path is in place, offer the same choices on the other clouds.

- Azure: static hosting equivalent to S3 and CloudFront, plus a server and database option.
- Google Cloud: the same split between static files and a dynamic server.
- Keep one project format so a site can move between AWS, Azure, and Google Cloud without being rebuilt by hand.

## MCP for an AI assistant

- Expose an MCP server for the site.
- Let an assistant list pages, create content, and update the header, footer, and pages through that server.
- Apply those edits in the builder, then publish them with the same S3 and CloudFront deploy.
