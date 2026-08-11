import { toMarkdown } from 'mdast-util-to-markdown'
import type { Root } from 'mdast'
import type { Node } from 'unist'

import { findSmallestContainingNode, type SourceRange } from '../internal/lookup.js'
import { parseMarkdown } from '../internal/parse.js'
import { deepFreeze } from '../internal/readonly.js'

type ChildNode = Node & { children?: readonly ChildNode[] }

function findParent(root: ChildNode, target: Node): Node | undefined {
  function visit(node: ChildNode): Node | undefined {
    for (const child of node.children ?? []) {
      if (child === target) {
        return node
      }

      const parent = visit(child)
      if (parent !== undefined) {
        return parent
      }
    }

    return undefined
  }

  return visit(root)
}

function serializeInlineText(value: string): string {
  const sentinel = 'x'
  const serialized = toMarkdown({
    type: 'paragraph',
    children: [{ type: 'text', value: value + sentinel }]
  })

  const suffix = `${sentinel}\n`
  if (!serialized.endsWith(suffix)) {
    throw new Error('Unable to serialize the Markdown text edit.')
  }

  return serialized.slice(0, -suffix.length)
}

function inlineCodeContentRange(source: string, start: number, end: number): SourceRange | undefined {
  const raw = source.slice(start, end)
  const opening = raw.match(/^`+/)?.[0]
  const closing = raw.match(/`+$/)?.[0]

  if (opening === undefined || closing === undefined || opening.length !== closing.length) {
    return undefined
  }

  return {
    start: start + opening.length,
    end: end - closing.length
  }
}

function hasSafeInlineCodeReplacement(value: string, delimiterLength: number): boolean {
  if (value.includes('\n') || value.includes('\r')) {
    return false
  }

  const runs = value.match(/`+/g) ?? []
  return runs.every((run) => run.length < delimiterLength)
}

function isEditableTextParent(node: Node | undefined): boolean {
  return node?.type === 'paragraph' || node?.type === 'heading' || node?.type === 'emphasis' || node?.type === 'strong' || node?.type === 'link' || node?.type === 'linkReference'
}

export class MarkdownDoc {
  #source: string
  #ast: Root

  constructor(source: string) {
    if (typeof source !== 'string') {
      throw new TypeError('MarkdownDoc source must be a string.')
    }

    this.#source = source
    this.#ast = deepFreeze(parseMarkdown(source))
  }

  getText(): string {
    return this.#source
  }

  getAST(): Root {
    return this.#ast
  }

  edit(range: SourceRange, newText: string): void {
    if (typeof newText !== 'string') {
      throw new TypeError('MarkdownDoc edit text must be a string.')
    }

    const node = findSmallestContainingNode(this.#ast, range, this.#source.length)
    const parent = node === undefined ? undefined : findParent(this.#ast as ChildNode, node)

    if (node === undefined || (node.type !== 'text' && node.type !== 'inlineCode') || !isEditableTextParent(parent)) {
      throw new RangeError('MarkdownDoc edits must be contained by an editable Markdown leaf node.')
    }

    const start = node.position?.start.offset
    const end = node.position?.end.offset
    if (start === undefined || end === undefined) {
      throw new RangeError('The editable Markdown leaf must have source offsets.')
    }

    const relativeStart = range.start - start
    const relativeEnd = range.end - start
    const originalNodeSource = this.#source.slice(start, end)
    let replacement: string

    if (node.type === 'text') {
      replacement = serializeInlineText(newText)
    } else {
      const content = inlineCodeContentRange(this.#source, start, end)
      if (content === undefined || range.start < content.start || range.end > content.end) {
        throw new RangeError('Inline code edits must stay inside the code content, excluding delimiters.')
      }

      const delimiterLength = content.start - start
      if (!hasSafeInlineCodeReplacement(newText, delimiterLength)) {
        throw new RangeError('This inline code edit would require changing its delimiter or line structure.')
      }

      replacement = newText
    }

    const editedNodeSource = originalNodeSource.slice(0, relativeStart) + replacement + originalNodeSource.slice(relativeEnd)
    const nextSource = this.#source.slice(0, start) + editedNodeSource + this.#source.slice(end)

    this.#source = nextSource
    this.#ast = deepFreeze(parseMarkdown(nextSource))
  }
}
