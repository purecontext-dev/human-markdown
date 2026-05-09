import * as esbuild from 'esbuild'

const isWatch = process.argv.includes('--watch')

const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
}

const webviewConfig = {
  entryPoints: ['webview/editor/index.ts'],
  bundle: true,
  outfile: 'dist/webview.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
}

async function build() {
  if (isWatch) {
    const extCtx = await esbuild.context(extensionConfig)
    const webCtx = await esbuild.context(webviewConfig)
    await Promise.all([extCtx.watch(), webCtx.watch()])
    console.log('Watching for changes...')
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
    ])
    console.log('Build complete.')
  }
}

build().catch(() => process.exit(1))
