# Roadmap

The roadmap is intentionally incremental. Each phase extends the source-preservation guarantee instead of replacing the underlying document model.

## Phase 1 — source-preserving text edits

Completed in the `0.1.0-alpha` line:

- mdast parsing with source positions
- exact source passthrough
- frozen AST inspection
- UTF-16 range validation and smallest-node lookup
- localized edits for supported text-bearing leaves
- deterministic CommonMark/GFM/readme corpus checks
- ESM, CommonJS, declaration, npm, and GitHub distribution

## Phase 2 — richer editing primitives

Planned work:

- explicit structural block edits
- multiple coordinated edits in one transaction
- clearer edit result metadata and affected ranges
- undo/redo history built on source snapshots or edit records

## Phase 3 — extensibility and compatibility

Potential follow-up work:

- opt-in GFM extensions
- parser/plugin configuration
- broader Markdown construct coverage
- upstream conformance suites and larger real-world corpora
- performance measurements for large documents

The roadmap is directional rather than a promise of specific release dates. New proposals should include a preservation test showing exactly which source span is allowed to change.
