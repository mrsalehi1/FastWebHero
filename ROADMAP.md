# Roadmap

FastWebHero becomes a **web builder**. There is no Mac or Windows app. A person opens it in the browser, builds a site, manages products, and exports or publishes the result.

The current command-line builder stays the engine underneath that website.

## **Multitenant**

One installation hosts many tenants. This is the base for accounts, products, and the shop.

Estimated effort: 10 to 14 hours.

- Each tenant has its own site, catalog, shop, and members.
- A tenant cannot read or change another tenant's pages, products, or orders.
- Export and publish run for one tenant at a time.
- Sample tenants in development use fictional names and fictional catalog data.

Done when two tenants can exist side by side, and an export from one never includes the other's products or pages.

## **Accounts**

Estimated effort: 8 to 12 hours.

- A tenant owner signs in to the web builder and invites people who may edit that tenant.
- A shopper can create an account, sign in, and see their own orders.
- Passwords are stored only as hashes. Sessions belong to one tenant.
- The owner can disable a member of their tenant. They cannot see another tenant's members.

Done when an owner and a shopper can sign in to the same tenant, and neither can open the other tenant.

## **Products**

Estimated effort: 8 to 12 hours.

- The owner adds a product with a name, description, price, and images they upload.
- Products can be drafted or published.
- A published product appears on the tenant's site and in the shop.
- Export includes the published product pages. Draft products stay out of the export.

Done when a tenant can create a product in the browser and see it on the exported site without writing HTML.

## **Shop**

Estimated effort: 12 to 16 hours.

- The shop lists that tenant's published products.
- A shopper can add a product to a cart and check out against their account.
- The owner sees orders for their tenant only.
- Stock and prices live with the product. The cart uses those values at checkout.
- Checkout in the sample tenants uses fictional products and fictional orders.

Done when a shopper can sign in, buy a published product, and the owner can see that order in the web builder.

## **Web builder and export**

Estimated effort: 10 to 14 hours.

- Edit pages, header, footer, and navigation in the browser.
- Preview the tenant site before export.
- **Export** writes a static `dist/` folder for that tenant: pages, product pages, styles, and scripts.
- Publish sends that export to the tenant's S3 bucket with the existing deploy command.
- The same export can be downloaded without publishing.

Done when a tenant can change a page and a product in the browser, export a folder, and open that folder with `npm run preview`.

## **MCP server**

Estimated effort: 8 to 10 hours.

Other components talk to a tenant through an MCP server. The server is the only extra door. It does not replace the web builder.

- List pages, products, and orders for the tenant the caller is allowed to use.
- Create or update a product, and update a page, through that server.
- Apply those edits in the same tenant store the web builder uses.
- Export or publish after those edits with the same export path.
- Reject a call that names a tenant the caller cannot access.

Done when a second component can add a product and export the site through MCP, and a call for the wrong tenant fails.

## Fix the current builder

Estimated effort: 6 to 8 hours.

1. Serve the error document named in `site.json`. See [issue 1](https://github.com/mrsalehi1/FastWebHero/issues/1).
2. Preview the configured index document, not only `index.html`. See [issue 2](https://github.com/mrsalehi1/FastWebHero/issues/2).
3. Reject boolean environment values the builder does not understand. See [issue 3](https://github.com/mrsalehi1/FastWebHero/issues/3).
4. Keep pages marked `draft: true` out of an export unless the command is a local preview. See [issue 4](https://github.com/mrsalehi1/FastWebHero/issues/4).
5. Build HTML files in subfolders of `site/pages`, or report that they were skipped. See [issue 5](https://github.com/mrsalehi1/FastWebHero/issues/5).
6. Reject S3 bucket names that look like IP addresses. See [issue 7](https://github.com/mrsalehi1/FastWebHero/issues/7).
7. Mark the current navigation link when the href and the page URL differ by a trailing slash. See [issue 8](https://github.com/mrsalehi1/FastWebHero/issues/8).

Done when the fictional Lark sample still builds and these issues have passing tests.

## Predictable publish

Estimated effort: 6 to 8 hours.

1. Add a dry run that prints the objects that would be uploaded or deleted, and uploads nothing. See [issue 6](https://github.com/mrsalehi1/FastWebHero/issues/6).
2. Upload only files whose bytes changed since the last publish.
3. Limit deletion to objects this tenant published.
4. Support redirects such as `/about` to `/about/` in preview and on the published site.

Done when a second publish of an unchanged export uploads nothing.

## Planning estimate

The work above is estimated at 68 to 94 hours. The open issues sit inside the builder fixes and predictable publish, and are not counted again.

None of the web builder, tenants, accounts, products, shop, or MCP server is started.

## Sample data

Development uses fictional tenants, fictional products, and fictional orders. Real shopper records are not part of the sample site.
