import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { MarkdownDoc } from '../../src/index.js'

interface Fixture {
  name: string
  source: string
}

interface EditableRange {
  start: number
  end: number
}

const corpusDirectory = fileURLToPath(new URL('../corpus', import.meta.url))

function readFixtures(directory: string, prefix = ''): Fixture[] {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      const name = prefix ? `${prefix}/${entry.name}` : entry.name

      if (entry.isDirectory()) {
        return readFixtures(path, name)
      }

      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        return []
      }

      return [{ name, source: readFileSync(path, 'utf8') }]
    })
}

function findEditableRange(doc: MarkdownDoc): EditableRange | undefined {
  const source = doc.getText()
  let result: EditableRange | undefined

  function visit(node: { type: string; position?: { start: { offset?: number }; end: { offset?: number } }; children?: readonly typeof node[] }, parentType?: string): void {
    if (result !== undefined) {
      return
    }

    const start = node.position?.start.offset
    const end = node.position?.end.offset
    if (node.type === 'text' && parentType === 'paragraph' && start !== undefined && end !== undefined) {
      for (let offset = start; offset < end; offset += 1) {
        if (/^[A-Za-z0-9]$/.test(source[offset] ?? '')) {
          result = { start: offset, end: offset + 1 }
          return
        }
      }
    }

    for (const child of node.children ?? []) {
      visit(child, node.type)
    }
  }

  visit(doc.getAST())
  return result
}

const fixtures = readFixtures(corpusDirectory)

describe('M5 corpus fidelity', () => {
  it('contains the pinned CommonMark and GFM corpus', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(300)
    expect(fixtures.some(({ name }) => name.startsWith('commonmark/'))).toBe(true)
    expect(fixtures.some(({ name }) => name.startsWith('gfm/'))).toBe(true)
  })

  it('preserves every corpus source exactly when untouched', () => {
    for (const fixture of fixtures) {
      const doc = new MarkdownDoc(fixture.source)
      expect(doc.getText(), fixture.name).toBe(fixture.source)
    }
  })

  it('preserves untouched regions for insert, replace, and delete edits', () => {
    let editableFixtureCount = 0

    for (const fixture of fixtures) {
      const original = fixture.source
      const baseDoc = new MarkdownDoc(original)
      const range = findEditableRange(baseDoc)
      if (range === undefined) {
        continue
      }

      editableFixtureCount += 1
      const edits = [
        { range: { start: range.start, end: range.start }, newText: 'X' },
        { range, newText: 'Y' },
        { range, newText: '' }
      ]

      for (const edit of edits) {
        const doc = new MarkdownDoc(original)
        doc.edit(edit.range, edit.newText)
        const updated = doc.getText()
        const replacementLength = edit.newText.length

        expect(updated.slice(0, edit.range.start), `${fixture.name} prefix`).toBe(original.slice(0, edit.range.start))
        expect(updated.slice(edit.range.start + replacementLength), `${fixture.name} suffix`).toBe(original.slice(edit.range.end))
      }
    }

    expect(editableFixtureCount).toBeGreaterThanOrEqual(100)
  })
})
