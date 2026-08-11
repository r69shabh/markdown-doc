import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { MarkdownDoc } from '../../src/index.js'

const fixturePath = fileURLToPath(new URL('../fixtures/passthrough.md', import.meta.url))
const fixture = readFileSync(fixturePath, 'utf8')

describe('MarkdownDoc', () => {
  it.each([
    '',
    'plain text',
    '# heading\n',
    'line one\r\nline two\nline three\r\n',
    '  indented\n\t tabbed\n',
    '---\ntitle: Example\n---\n\nBody\n',
    fixture
  ])('returns the exact source without edits', (source) => {
    const doc = new MarkdownDoc(source)

    expect(doc.getText()).toBe(source)
  })

  it('parses CommonMark and protects the AST from mutation', () => {
    const doc = new MarkdownDoc('# Title\n\nBody')
    const ast = doc.getAST()

    expect(ast.type).toBe('root')
    expect(ast.children.map((node) => node.type)).toEqual(['heading', 'paragraph'])
    expect(Object.isFrozen(ast)).toBe(true)
    expect(Object.isFrozen(ast.children)).toBe(true)
  })

  it('preserves UTF-16 offsets for Unicode source', () => {
    const source = '# 😀\n\nCafé **bold**'
    const doc = new MarkdownDoc(source)
    const paragraph = doc.getAST().children[1]
    if (paragraph === undefined) {
      throw new Error('Expected a paragraph node.')
    }

    expect(paragraph.position?.start.offset).toBe(source.indexOf('Café'))
    expect(paragraph.position?.end.offset).toBe(source.length)
  })

  it('replaces text inside a paragraph and reparses offsets', () => {
    const source = 'before world\n\nafter'
    const doc = new MarkdownDoc(source)
    const start = source.indexOf('world')

    doc.edit({ start, end: start + 'world'.length }, 'universe')

    expect(doc.getText()).toBe('before universe\n\nafter')
    expect(doc.getAST().children[0]?.position?.end.offset).toBe('before universe'.length)
    expect(doc.getAST().children[1]?.position?.start.offset).toBe(doc.getText().indexOf('after'))
  })

  it('keeps line endings outside the edited range byte-identical', () => {
    const source = 'first\r\nsecond world\r\nthird'
    const doc = new MarkdownDoc(source)
    const start = source.indexOf('world')

    doc.edit({ start, end: start + 'world'.length }, 'line')

    expect(doc.getText()).toBe('first\r\nsecond line\r\nthird')
  })

  it('supports insertion and deletion without changing untouched source bytes', () => {
    const source = 'keep left and right'
    const doc = new MarkdownDoc(source)
    const andStart = source.indexOf('and')

    doc.edit({ start: andStart, end: andStart }, 'middle ')
    expect(doc.getText()).toBe('keep left middle and right')

    const rightStart = doc.getText().indexOf('right')
    doc.edit({ start: rightStart - 1, end: rightStart }, '')
    expect(doc.getText()).toBe('keep left middle andright')
  })

  it('serializes Markdown punctuation as literal paragraph text', () => {
    const doc = new MarkdownDoc('literal word')
    const wordStart = doc.getText().indexOf('word')

    doc.edit({ start: wordStart, end: wordStart + 4 }, '*')

    expect(doc.getText()).toBe('literal \\*')
    const paragraph = doc.getAST().children[0]
    expect(paragraph?.type).toBe('paragraph')
    if (paragraph?.type !== 'paragraph') {
      throw new Error('Expected an edited paragraph.')
    }
    expect(paragraph.children[0]?.type).toBe('text')
  })

  it('edits text in headings, emphasis, strong, and links', () => {
    const heading = new MarkdownDoc('# heading')
    heading.edit({ start: 2, end: 9 }, 'title')
    expect(heading.getText()).toBe('# title')

    const styled = new MarkdownDoc('*soft* **bold** [label](https://example.com)')
    styled.edit({ start: 1, end: 5 }, 'gentle')
    styled.edit({ start: styled.getText().indexOf('bold'), end: styled.getText().indexOf('bold') + 4 }, 'strong')
    const labelStart = styled.getText().indexOf('label')
    styled.edit({ start: labelStart, end: labelStart + 5 }, 'name')

    expect(styled.getText()).toBe('*gentle* **strong** [name](https://example.com)')
  })

  it('edits inline code content while preserving its delimiters', () => {
    const doc = new MarkdownDoc('Use `code` here')
    const start = doc.getText().indexOf('code')

    doc.edit({ start, end: start + 4 }, 'data')

    expect(doc.getText()).toBe('Use `data` here')
  })

  it('rejects edits outside editable leaf content', () => {
    const source = new MarkdownDoc('# heading')
    expect(() => source.edit({ start: 0, end: 1 }, 'title')).toThrow(RangeError)

    const code = new MarkdownDoc('Use `code` here')
    expect(() => code.edit({ start: 4, end: 5 }, 'x')).toThrow(RangeError)

    const styled = new MarkdownDoc('**bold**')
    expect(() => styled.edit({ start: 0, end: 8 }, 'strong')).toThrow(RangeError)

    const unsafeCode = new MarkdownDoc('Use ``code`` here')
    const codeStart = unsafeCode.getText().indexOf('code')
    expect(() => unsafeCode.edit({ start: codeStart, end: codeStart + 4 }, '``')).toThrow(RangeError)
  })
})
