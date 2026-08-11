# Architecture

`MarkdownDoc` is built around one rule: source text is the authority, not a serialized AST.

## Edit pipeline

```text
source string
  │
  ├─ parse with mdast-util-from-markdown ──> frozen mdast tree with offsets
  │
  └─ edit(range, text)
       │
       ├─ find the smallest positioned Markdown leaf containing the range
       ├─ serialize only the replacement text when Markdown escaping is needed
       ├─ splice the changed source span into the original string
       └─ reparse the complete updated source to refresh positions
```

The untouched prefix and suffix are never sent through a document serializer. That is why CRLF/LF choices, list markers, whitespace, code fences, and unrelated formatting remain stable.

## Positions

Offsets are UTF-16 JavaScript string indices. Ranges are half-open: `[start, end)`. A point query is represented by a zero-length range or a single offset.

The internal lookup walker ignores unpositioned nodes and selects the narrowest containing positioned node. Equal spans are resolved by depth; point boundaries prefer the node that starts at the cursor.

## Deliberate limits

This release edits text within one supported inline leaf at a time. It does not move blocks, preserve an edit history, or expose plugins. Replacing text may escape characters that would otherwise change Markdown meaning; only the requested edit span can change as a result.
