import type { Node } from 'unist'
import { describe, expect, it } from 'vitest'

import { MarkdownDoc } from '../../src/index.js'
import { findSmallestContainingNode } from '../../src/internal/lookup.js'

const source = 'intro **bold** tail'

function span(node: Node): { start: number; end: number } {
  const start = node.position?.start.offset
  const end = node.position?.end.offset
  if (start === undefined || end === undefined) {
    throw new Error(`Expected ${node.type} to have a position.`)
  }
  return { start, end }
}

describe('findSmallestContainingNode', () => {
  const doc = new MarkdownDoc(source)
  const root = doc.getAST()

  it('finds the narrowest node for a non-empty range', () => {
    const boldStart = source.indexOf('bold')
    const node = findSmallestContainingNode(root, {
      start: boldStart,
      end: boldStart + 'bold'.length
    }, source.length)

    expect(node?.type).toBe('text')
    expect(span(node as Node)).toEqual({ start: boldStart, end: boldStart + 4 })
  })

  it('prefers the deeper node when spans are identical', () => {
    const paragraph = root.children[0]
    if (paragraph === undefined) {
      throw new Error('Expected a paragraph node.')
    }
    const node = findSmallestContainingNode(root, span(paragraph), source.length)

    expect(node?.type).toBe('paragraph')
  })

  it('supports point queries and prefers the node starting at a boundary', () => {
    const tailStart = source.indexOf('tail') - 1
    const node = findSmallestContainingNode(root, tailStart, source.length)

    expect(node?.type).toBe('text')
    expect(span(node as Node)).toEqual({ start: tailStart, end: source.length })
  })

  it('supports zero-length ranges as point queries', () => {
    const boldStart = source.indexOf('bold')
    const node = findSmallestContainingNode(root, { start: boldStart, end: boldStart }, source.length)

    expect(node?.type).toBe('text')
  })

  it('ignores unpositioned nodes', () => {
    const rootWithUnpositionedChild = {
      type: 'root',
      position: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 2, offset: 1 } },
      children: [{ type: 'custom', children: [] }]
    } as unknown as Node

    expect(findSmallestContainingNode(rootWithUnpositionedChild, { start: 0, end: 1 }, 1)?.type).toBe('root')
  })

  it.each([
    { start: -1, end: 0 },
    { start: 0, end: source.length + 1 },
    { start: 3, end: 2 },
    { start: 1.5, end: 2 }
  ])('rejects invalid range %#', (range) => {
    expect(() => findSmallestContainingNode(root, range, source.length)).toThrow()
  })

  it('rejects invalid point offsets', () => {
    expect(() => findSmallestContainingNode(root, -1, source.length)).toThrow()
    expect(() => findSmallestContainingNode(root, source.length + 1, source.length)).toThrow()
  })
})
