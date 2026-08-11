import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  noExternal: ['mdast-util-from-markdown', 'mdast-util-to-markdown', 'mdast-util-frontmatter', 'micromark-extension-frontmatter']
})
