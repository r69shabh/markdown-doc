import { describe, expect, it } from 'vitest'

import { MarkdownDoc } from '../../src/index.js'

describe('M7 Markdown edge cases', () => {
  it('preserves mixed LF and CRLF line endings through parsing and edits', () => {
    const source = 'first\r\nsecond world\nthird\r\nfourth'
    const doc = new MarkdownDoc(source)
    const start = source.indexOf('world')

    doc.edit({ start, end: start + 5 }, 'line')

    expect(doc.getText()).toBe('first\r\nsecond line\nthird\r\nfourth')
  })

  it('preserves mixed list bullet markers and tab indentation', () => {
    const listSource = '- dash\n* star\n+ plus\n'
    const listDoc = new MarkdownDoc(listSource)
    const tabDoc = new MarkdownDoc('\tindented code\n')

    expect(listDoc.getText()).toBe(listSource)
    expect(listDoc.getAST().children.map((node) => node.type)).toEqual(['list', 'list', 'list'])
    expect(tabDoc.getText()).toBe('\tindented code\n')
    expect(tabDoc.getAST().children[0]?.type).toBe('code')
  })

  it('preserves reference-style and inline links while editing link text', () => {
    const source = '[reference][id] and [inline](https://example.com)\n\n[id]: https://example.org\n'
    const doc = new MarkdownDoc(source)
    const start = source.indexOf('reference')

    doc.edit({ start, end: start + 'reference'.length }, 'source')

    expect(doc.getText()).toBe('[source][id] and [inline](https://example.com)\n\n[id]: https://example.org\n')
  })

  it('preserves hard line breaks while editing the preceding text', () => {
    const source = 'first line  \nsecond line\\\nthird line'
    const doc = new MarkdownDoc(source)
    const start = source.indexOf('first')

    doc.edit({ start, end: start + 5 }, 'updated')

    expect(doc.getText()).toBe('updated line  \nsecond line\\\nthird line')
  })

  it('preserves code fence spelling and info strings', () => {
    const source = '~~~typescript\nconst value = 1;\n~~~\n\n```js\nconst other = 2;\n```\n'
    const doc = new MarkdownDoc(source)

    expect(doc.getText()).toBe(source)
    expect(doc.getAST().children.map((node) => node.type)).toEqual(['code', 'code'])
  })

  it('parses YAML and TOML frontmatter with exact positions', () => {
    const yaml = '---\ntitle: YAML\n---\n\nBody\n'
    const toml = '+++\ntitle = "TOML"\n+++\n\nBody\n'

    const yamlDoc = new MarkdownDoc(yaml)
    const tomlDoc = new MarkdownDoc(toml)

    expect(yamlDoc.getText()).toBe(yaml)
    expect(yamlDoc.getAST().children[0]?.type).toBe('yaml')
    expect(yamlDoc.getAST().children[0]?.position?.start.offset).toBe(0)
    expect(tomlDoc.getText()).toBe(toml)
    expect(tomlDoc.getAST().children[0]?.type).toBe('toml')
    expect(tomlDoc.getAST().children[0]?.position?.end.offset).toBe(toml.indexOf('+++', 3) + 3)
  })
})
