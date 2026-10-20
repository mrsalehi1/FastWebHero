# Contributing

Thank you for contributing to FastWebHero.

## Development workflow

1. Fork the repository and create a focused branch from `dev`.
2. Install Node.js 20 or newer and run `npm ci`.
3. Make the smallest change that solves the problem.
4. Add or update tests for changed behavior.
5. Run `npm run check`.
6. Open a pull request into `dev`.

`main` is the release-ready branch. Changes normally reach it through a reviewed pull request from `dev`. Urgent fixes may target `main` when the maintainer requests it.

## Pull requests

- Explain the problem and the reason for the chosen solution.
- Keep unrelated formatting or refactoring out of the change.
- Update the README when commands, configuration, or user behavior changes.
- Never commit `.env` files, AWS credentials, tokens, or generated `dist/` output.
- Resolve review conversations and wait for required checks and approval before merging.

## Reporting bugs

Use the bug-report issue form and include reproduction steps, your operating system, your Node.js version, and relevant logs with secrets removed.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
