# markdown-doc

`markdown-doc` is a source-preserving Markdown document model for TypeScript.

It treats the original string as authoritative. Parsing exposes a read-only mdast tree for inspection, while edits update only the selected source span and reparse the document. With no edits, `getText()` returns the input string exactly.

## Install

```sh
pnpm add @r69shabhjs/markdown-doc
```

```ts
import { MarkdownDoc } from '@r69shabhjs/markdown-doc'
```

## Quick start

```ts
import { MarkdownDoc } from '@r69shabhjs/markdown-doc'

const doc = new MarkdownDoc('# Hello\n\nHello, world!\n')
const start = doc.getText().indexOf('world')

doc.edit({ start, end: start + 'world'.length }, 'Markdown')

console.log(doc.getText())
// # Hello
//
// Hello, Markdown!
```

## Guarantee

For an unchanged document, `doc.getText()` is byte-for-byte identical to the constructor input. For a supported edit, text before the edit range and text after the edit range are sliced from the original source, so they are not normalized or re-serialized.

This means existing line endings, indentation, list markers, fence styles, link forms, and unrelated whitespace remain intact. The replacement itself can be escaped when Markdown syntax requires it.

## API

### `new MarkdownDoc(source)`

Parses `source` and stores it unchanged as the document text.

### `getText(): string`

Returns the current authoritative Markdown source.

### `getAST(): Root`

Returns a deeply frozen mdast `Root`. Every positioned node uses UTF-16 JavaScript offsets, matching `String#indexOf`, `slice`, and `edit` ranges.

### `edit(range, newText): void`

Replaces the half-open range `[start, end)` with `newText`, then reparses the full document so positions stay current.

```ts
doc.edit({ start: 0, end: 5 }, 'Updated')
```

Supported text-bearing contexts are paragraphs, headings, emphasis, strong text, inline links, reference links, and inline code. Inline-code edits must stay inside the code content and cannot require a different delimiter length.

Invalid offsets, reversed ranges, structural edits, and edits spanning multiple Markdown leaf nodes throw a `RangeError`.

## Parsing and scope

The parser uses the mdast/CommonMark ecosystem and also recognizes YAML and TOML frontmatter. The current release intentionally does not provide structural block edits, undo/redo, plugins, or GFM syntax extensions.

This package is published as `@r69shabhjs/markdown-doc`; the unscoped `markdown-doc` name is already registered on npm.

## Repository layout

```text
src/
  index.ts                 Public exports
  document/MarkdownDoc.ts  Source-preserving document model and edit flow
  internal/                Parser, AST lookup, and read-only helpers
test/
  unit/                    API and lookup behavior
  integration/             Edge cases and corpus fidelity checks
  fixtures/                Small deterministic test inputs
  corpus/                  Pinned CommonMark, GFM, and README fixtures
scripts/                   Corpus import and comparison generation
docs/                      Architecture and round-trip comparison notes
```

See [the architecture note](docs/architecture.md) for the edit pipeline and [the remark comparison](docs/remark-comparison.md) for a concrete mixed-line-ending example.

## Development

```sh
pnpm install
pnpm check        # strict TypeScript check plus all tests
pnpm test:build   # ESM, CommonJS, and declaration output
pnpm compare:remark
```

Corpus tests are offline and deterministic. To refresh fixtures from local upstream checkouts:

```sh
node scripts/import-corpus.mjs \
  --commonmark /path/to/commonmark-spec/spec.txt \
  --gfm /path/to/cmark-gfm/test/spec.txt
```

## License

[MIT](LICENSE)
