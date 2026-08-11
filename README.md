# markdown-doc

**A source-preserving Markdown document model for TypeScript.**

[![npm version](https://img.shields.io/npm/v/%40r69shabhjs%2Fmarkdown-doc?logo=npm)](https://www.npmjs.com/package/@r69shabhjs/markdown-doc)
[![npm downloads](https://img.shields.io/npm/dm/%40r69shabhjs%2Fmarkdown-doc?logo=npm)](https://www.npmjs.com/package/@r69shabhjs/markdown-doc)
[![GitHub stars](https://img.shields.io/github/stars/r69shabh/markdown-doc?style=social)](https://github.com/r69shabh/markdown-doc)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

`markdown-doc` is a source-preserving Markdown parser and document model for TypeScript. It parses Markdown into a read-only [mdast](https://github.com/syntax-tree/mdast) abstract syntax tree, keeps the original source string authoritative, and applies localized text edits without re-serializing unrelated parts of the document.

If you are building a Markdown editor, code action, content pipeline, documentation tool, or AST-powered transformation, `markdown-doc` gives you structure without forcing a whole-file formatting pass.

## Contents

- [Why markdown-doc](#why-markdown-doc)
- [Install](#install)
- [Quick start](#quick-start)
- [Core guarantee](#core-guarantee)
- [API](#api)
- [Supported syntax and limits](#supported-syntax-and-limits)
- [How it works](#how-it-works)
- [Open-source project](#open-source-project)
- [Development](#development)

## Why markdown-doc?

Most Markdown tools parse a document and later regenerate the whole file from an internal tree. Whole-document serialization is useful for formatting and generation, but it can change details the user never edited: list markers, emphasis delimiters, code fences, line endings, indentation, escaping, and whitespace.

`markdown-doc` uses a different source model:

| Capability | `markdown-doc` | remark stringify | Prettier | Plain text editing |
| --- | --- | --- | --- | --- |
| Exact source available after zero edits | Yes | Depends on a round-trip | No, formatting is intentional | Yes |
| Semantic Markdown AST | Yes, mdast | Yes, mdast | Not its primary API | No |
| Localized text edits | Yes, within supported leaves | Usually followed by serialization | Whole-document formatting | Yes, without Markdown semantics |
| UTF-16 source offsets | Yes | Available in parsed trees | Not the editing model | Yes, but without AST context |
| Read-only tree for inspection | Yes | Processor/tree APIs | No equivalent document API | No |

The distinction is deliberate. [`mdast-util-to-markdown`](https://github.com/syntax-tree/mdast-util-to-markdown) is excellent for generating Markdown from a tree; `markdown-doc` is for applications that need to inspect Markdown structure while preserving the source they did not change. [Prettier](https://prettier.io/) is excellent at formatting; formatting is outside this package’s source-preservation guarantee.

## Install

```sh
pnpm add @r69shabhjs/markdown-doc
```

```ts
import { MarkdownDoc } from '@r69shabhjs/markdown-doc'
```

The package is published under the `@r69shabhjs` scope because the unscoped `markdown-doc` name is already registered on npm.

## Quick start

```ts
import { MarkdownDoc } from '@r69shabhjs/markdown-doc'

const source = '# Hello\n\nHello, world!\r\n'
const doc = new MarkdownDoc(source)

// No edit means the original source string is returned exactly.
console.log(doc.getText() === source) // true

const start = doc.getText().indexOf('world')
doc.edit({ start, end: start + 'world'.length }, 'Markdown')

console.log(doc.getText())
// # Hello
//
// Hello, Markdown!\r\n
```

## Core guarantee

The original JavaScript string is the authoritative representation.

- With zero edits, `getText()` returns the exact constructor input.
- During a supported edit, the untouched prefix and suffix are sliced from the existing source.
- The complete document is reparsed after an edit so AST positions remain current.
- Existing CRLF/LF choices, indentation, list markers, fence styles, link forms, and unrelated whitespace are not normalized by a no-op or by an unrelated edit.

The replacement text may be escaped when necessary to keep its Markdown meaning. That is the only part of the source an edit is allowed to change.

## API

### `new MarkdownDoc(source: string)`

Parses `source` with the mdast/CommonMark ecosystem and stores the input string unchanged.

### `getText(): string`

Returns the current authoritative Markdown source.

### `getAST(): Root`

Returns a deeply frozen mdast `Root` for inspection. Positioned nodes use UTF-16 JavaScript offsets, matching `String#indexOf`, `String#slice`, and `edit()` ranges.

### `edit(range, newText): void`

Replaces the half-open range `[start, end)` with `newText`, then reparses the complete updated source.

```ts
doc.edit({ start: 0, end: 5 }, 'Updated')
```

Supported text-bearing contexts are:

- paragraph text
- headings
- emphasis and strong text
- inline links and reference links
- inline code content

Invalid offsets, reversed ranges, structural edits, edits spanning multiple Markdown leaves, and inline-code replacements that require changing delimiter length throw a `RangeError`.

## Supported syntax and limits

The current release recognizes CommonMark-style Markdown plus YAML and TOML frontmatter positions.

It intentionally does not provide:

- structural block moves or block insertion
- undo/redo history
- plugin APIs
- GFM-specific parsing extensions
- edits that require changing inline-code delimiters

These boundaries keep the first release focused on proving localized source edits. See the [roadmap](docs/roadmap.md) for planned follow-up work.

## How it works

The edit pipeline is intentionally small:

1. Parse the source once and retain the raw string.
2. Walk positioned mdast nodes to find the smallest node containing the edit range.
3. Serialize or escape only the replacement content needed by the selected leaf.
4. Splice the replacement into the original source.
5. Reparse the updated string to refresh AST positions.

The [architecture note](docs/architecture.md) explains the source-of-truth model and offset rules. The [remark comparison](docs/remark-comparison.md) shows a mixed-line-ending example where ordinary remark stringification changes formatting while `markdown-doc` preserves the input.

## Open-source project

Repository: [github.com/r69shabh/markdown-doc](https://github.com/r69shabh/markdown-doc)

The project is intentionally small and testable. Contributions should preserve the central invariant: an edit must not alter source outside its requested range.

- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Roadmap](docs/roadmap.md)
- [MIT license](LICENSE)

## Development

```sh
pnpm install
pnpm check        # strict TypeScript check plus all tests
pnpm test:build   # ESM, CommonJS, and declaration output
pnpm compare:remark
```

The deterministic corpus tests are offline. The repository includes 305 pinned CommonMark, GFM, and README fixtures. To refresh fixtures from local upstream checkouts:

```sh
node scripts/import-corpus.mjs \
  --commonmark /path/to/commonmark-spec/spec.txt \
  --gfm /path/to/cmark-gfm/test/spec.txt
```

## License

[MIT](LICENSE)
