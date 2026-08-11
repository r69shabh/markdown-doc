# Contributing to markdown-doc

Thanks for helping improve `markdown-doc`.

## Before opening a change

1. Read the [README](README.md) and [architecture note](docs/architecture.md).
2. Keep the source-preservation invariant in mind: an edit must not change source outside its requested range.
3. For behavior changes, add a focused test and update the README or roadmap when the public scope changes.

## Local workflow

```sh
pnpm install
pnpm check
pnpm test:build
pnpm compare:remark
```

The corpus tests are deterministic and offline. Do not replace pinned fixtures with generated or network-dependent test data in a pull request.

## Pull requests

- Use a short, descriptive commit or pull request title.
- Explain the source-preservation impact of the change.
- Include the test commands you ran.
- Keep unrelated formatting and dependency changes out of the pull request.

## Code style

The project uses strict TypeScript, ESM source modules, Vitest, and tsup. Prefer small functions, explicit range validation, and tests that demonstrate untouched source regions remain identical.
