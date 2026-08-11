import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const scriptArgs = process.argv.slice(2)
const { values } = parseArgs({
  args: scriptArgs[0] === '--' ? scriptArgs.slice(1) : scriptArgs,
  options: {
    commonmark: { type: 'string' },
    gfm: { type: 'string' },
    readme: { type: 'string', multiple: true },
    output: { type: 'string', default: 'test/corpus' }
  }
})

const outputRoot = resolve(values.output)
const commonmarkPath = values.commonmark ? resolve(values.commonmark) : undefined
const gfmPath = values.gfm ? resolve(values.gfm) : undefined
const readmePaths = (values.readme ?? []).map((path) => resolve(path))

if (commonmarkPath === undefined && gfmPath === undefined && readmePaths.length === 0) {
  throw new Error('Provide at least one --commonmark, --gfm, or --readme path.')
}

function parseSpec(specPath) {
  const fence = '`'.repeat(32)
  const lines = readFileSync(specPath, 'utf8').split(/(?<=\n)/)
  const examples = []
  let state = 'document'
  let markdown = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === `${fence} example`) {
      state = 'markdown'
      markdown = []
      continue
    }

    if (state === 'html' && trimmed === fence) {
      examples.push(markdown.join('').replaceAll('→', '\t'))
      state = 'document'
      continue
    }

    if (trimmed === '.' && state === 'markdown') {
      state = 'html'
      continue
    }

    if (state === 'markdown') {
      markdown.push(line)
    }
  }

  return examples
}

function distributedSample(examples, limit) {
  if (examples.length <= limit) {
    return examples
  }

  const result = []
  for (let index = 0; index < limit; index += 1) {
    const sourceIndex = Math.round(index * (examples.length - 1) / (limit - 1))
    result.push(examples[sourceIndex])
  }
  return result
}

function writeCorpus(name, examples, limit) {
  const directory = join(outputRoot, name)
  mkdirSync(directory, { recursive: true })
  const selected = distributedSample(examples, limit)

  selected.forEach((source, index) => {
    const fileName = `${String(index + 1).padStart(3, '0')}.md`
    writeFileSync(join(directory, fileName), source, 'utf8')
  })

  return selected.length
}

const repositoryUrls = {
  'commonmark-spec': 'https://github.com/commonmark/commonmark-spec',
  'cmark-gfm': 'https://github.com/github/cmark-gfm',
  'markdown-doc-commonmark': 'https://github.com/commonmark/commonmark-spec',
  'markdown-doc-gfm': 'https://github.com/github/cmark-gfm',
  'markdown-doc-unified': 'https://github.com/unifiedjs/unified',
  'markdown-doc-remark': 'https://github.com/remarkjs/remark',
  'markdown-doc-micromark': 'https://github.com/micromark/micromark',
  unified: 'https://github.com/unifiedjs/unified',
  remark: 'https://github.com/remarkjs/remark',
  micromark: 'https://github.com/micromark/micromark'
}

function writeReadmes(paths) {
  const directory = join(outputRoot, 'readmes')
  mkdirSync(directory, { recursive: true })

  return paths.map((path, index) => {
    const repository = basename(resolve(path, '..'))
    const fileName = `${String(index + 1).padStart(2, '0')}-${repository}.md`
    writeFileSync(join(directory, fileName), readFileSync(path), 'utf8')

    let revision = 'unknown'
    try {
      revision = execFileSync('git', ['-C', resolve(path, '..'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    } catch {
      // A standalone README can still be used as a fixture without git metadata.
    }

    return {
      fileName,
      repository,
      revision,
      url: repositoryUrls[repository] ?? 'unknown'
    }
  })
}

rmSync(outputRoot, { recursive: true, force: true })
mkdirSync(outputRoot, { recursive: true })

const counts = []
let readmeSources = []
if (commonmarkPath !== undefined) {
  counts.push(`CommonMark: ${writeCorpus('commonmark', parseSpec(commonmarkPath), 200)} fixtures`)
}
if (gfmPath !== undefined) {
  counts.push(`GFM: ${writeCorpus('gfm', parseSpec(gfmPath), 100)} fixtures`)
}
if (readmePaths.length > 0) {
  readmeSources = writeReadmes(readmePaths)
  counts.push(`README: ${readmeSources.length} fixtures`)
}

writeFileSync(
  join(outputRoot, 'NOTICE.txt'),
  [
    'This directory contains fixtures extracted from upstream specification examples.',
    `CommonMark source: ${basename(commonmarkPath ?? 'not imported')}`,
    'CommonMark repository: https://github.com/commonmark/commonmark-spec',
    'CommonMark revision: 3da939428d80f146f270cd1765e4ba462e96bb1b',
    'CommonMark license: CC-BY-SA 4.0',
    `GFM source: ${basename(gfmPath ?? 'not imported')}`,
    'GFM repository: https://github.com/github/cmark-gfm',
    'GFM revision: 499789b49373bfa045d0e7547e5ee63444c77bca',
    'GFM license: see the upstream repository and specification.',
    'README sources:'
  ].concat(readmeSources.map(({ fileName, repository, revision, url }) => `- ${fileName}: ${repository} ${revision} ${url}`)).join('\n') + '\n',
  'utf8'
)

console.log(counts.join('\n'))
