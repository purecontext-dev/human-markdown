import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['test/integration/suite.ts'],
  bundle: true,
  outfile: 'dist/integration/suite.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
})

console.log('Integration test bundle complete.')
