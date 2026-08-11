import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

import { MarkdownDoc } from '../dist/index.js'

const source = '# Lossless comparison\r\n\r\n- first\r\n* second\n\r\nline with two spaces  \r\nnext\r\n'
const processor = unified().use(remarkParse).use(remarkStringify)
const remarkOutput = processor.stringify(processor.parse(source))
const engineOutput = new MarkdownDoc(source).getText()
const showLineEndings = (value) => value.replaceAll('\r', '<CR>').replaceAll('\n', '<LF>\n')
const fence = '`'.repeat(3)
const remarkChanged = remarkOutput !== source
const document = [
  '# Remark comparison',
  '',
  'This fixture intentionally mixes CRLF/LF line endings, bullet markers, and a hard break.',
  '',
  '## Input',
  '',
  `${fence}text`,
  showLineEndings(source),
  fence,
  '',
  '## Plain remark round-trip',
  '',
  `Remark stringify changed the source: **${remarkChanged}**.`,
  '',
  `${fence}text`,
  showLineEndings(remarkOutput),
  fence,
  '',
  '## markdown-doc result',
  '',
  `MarkdownDoc.getText() returned the original source byte-for-byte: **${engineOutput === source}**.`,
  '',
  `${fence}text`,
  showLineEndings(engineOutput),
  fence,
  '',
  'The package preserves the original source as the authority and only serializes a localized replacement during an edit.',
  ''
].join('\n')

const outputPath = resolve('docs/remark-comparison.md')
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, document, 'utf8')
console.log(`Wrote ${outputPath}`)
console.log(`remark changed source: ${remarkChanged}`)
console.log(`markdown-doc preserved source: ${engineOutput === source}`)
