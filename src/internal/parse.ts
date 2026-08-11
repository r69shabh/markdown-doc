import { frontmatterFromMarkdown } from 'mdast-util-frontmatter'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { frontmatter } from 'micromark-extension-frontmatter'
import type { Root } from 'mdast'

export function parseMarkdown(source: string): Root {
  return fromMarkdown(source, {
    extensions: [frontmatter(['yaml', 'toml'])],
    mdastExtensions: [frontmatterFromMarkdown(['yaml', 'toml'])]
  })
}
