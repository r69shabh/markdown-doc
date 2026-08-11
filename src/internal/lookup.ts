import type { Node } from 'unist'

export interface SourceRange {
  start: number
  end: number
}

export type NodeQuery = number | SourceRange

interface OffsetSpan {
  start: number
  end: number
}

interface Candidate {
  node: Node
  span: OffsetSpan
  depth: number
  startsAtPoint: boolean
}

type ChildNode = Node & { children?: readonly ChildNode[] }

function validateOffset(offset: number, sourceLength: number): void {
  if (!Number.isInteger(offset)) {
    throw new TypeError('Node lookup offsets must be integers.')
  }

  if (offset < 0 || offset > sourceLength) {
    throw new RangeError(`Node lookup offset must be between 0 and ${sourceLength}.`)
  }
}

function normalizeQuery(query: NodeQuery, sourceLength: number): { range: SourceRange; point: number | undefined } {
  if (typeof query === 'number') {
    validateOffset(query, sourceLength)
    return { range: { start: query, end: query }, point: query }
  }

  if (query === null || typeof query !== 'object') {
    throw new TypeError('Node lookup query must be an offset or a range.')
  }

  validateOffset(query.start, sourceLength)
  validateOffset(query.end, sourceLength)
  if (query.start > query.end) {
    throw new RangeError('Node lookup range start must not exceed end.')
  }

  return {
    range: query,
    point: query.start === query.end ? query.start : undefined
  }
}

function getOffsetSpan(node: Node): OffsetSpan | undefined {
  const start = node.position?.start.offset
  const end = node.position?.end.offset

  if (start === undefined || end === undefined) {
    return undefined
  }

  return { start, end }
}

function contains(span: OffsetSpan, query: { range: SourceRange; point: number | undefined }): boolean {
  if (query.point !== undefined) {
    return span.start <= query.point && query.point <= span.end
  }

  return span.start <= query.range.start && query.range.end <= span.end
}

function isBetterCandidate(next: Candidate, current: Candidate | undefined, queryPoint: number | undefined): boolean {
  if (current === undefined) {
    return true
  }

  const nextWidth = next.span.end - next.span.start
  const currentWidth = current.span.end - current.span.start
  if (nextWidth !== currentWidth) {
    return nextWidth < currentWidth
  }

  if (queryPoint !== undefined && next.startsAtPoint !== current.startsAtPoint) {
    return next.startsAtPoint
  }

  return next.depth > current.depth
}

/**
 * Finds the most specific positioned mdast node containing a source query.
 * This helper remains internal to the package entry point.
 */
export function findSmallestContainingNode(
  root: Node,
  query: NodeQuery,
  sourceLength: number
): Node | undefined {
  if (!Number.isInteger(sourceLength) || sourceLength < 0) {
    throw new RangeError('Source length must be a non-negative integer.')
  }

  const normalized = normalizeQuery(query, sourceLength)
  let best: Candidate | undefined

  function visit(node: ChildNode, depth: number): void {
    const span = getOffsetSpan(node)
    if (span !== undefined && contains(span, normalized)) {
      const candidate: Candidate = {
        node,
        span,
        depth,
        startsAtPoint: normalized.point !== undefined && span.start === normalized.point
      }

      if (isBetterCandidate(candidate, best, normalized.point)) {
        best = candidate
      }
    }

    for (const child of node.children ?? []) {
      visit(child, depth + 1)
    }
  }

  visit(root as ChildNode, 0)
  return best?.node
}
