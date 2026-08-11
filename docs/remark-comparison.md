# Remark comparison

This fixture intentionally mixes CRLF/LF line endings, bullet markers, and a hard break.

## Input

```text
# Lossless comparison<CR><LF>
<CR><LF>
- first<CR><LF>
* second<LF>
<CR><LF>
line with two spaces  <CR><LF>
next<CR><LF>

```

## Plain remark round-trip

Remark stringify changed the source: **true**.

```text
# Lossless comparison<LF>
<LF>
* first<LF>
<LF>
- second<LF>
<LF>
line with two spaces\<LF>
next<LF>

```

## markdown-doc result

MarkdownDoc.getText() returned the original source byte-for-byte: **true**.

```text
# Lossless comparison<CR><LF>
<CR><LF>
- first<CR><LF>
* second<LF>
<CR><LF>
line with two spaces  <CR><LF>
next<CR><LF>

```

The package preserves the original source as the authority and only serializes a localized replacement during an edit.
