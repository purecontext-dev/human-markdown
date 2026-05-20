import { copyFileSync, mkdirSync } from 'node:fs'
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
  outfile: 'dist/webview/index.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
}

const mermaidConfig = {
  entryPoints: ['webview/editor/mermaid-loader.ts'],
  bundle: true,
  outfile: 'dist/mermaid.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  minify: true,
  external: ['fs'],
}

const shikiConfig = {
  entryPoints: ['webview/editor/shiki-loader.ts'],
  bundle: true,
  outfile: 'dist/shiki.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  minify: true,
}

const katexConfig = {
  entryPoints: ['webview/editor/katex-loader.ts'],
  bundle: true,
  outfile: 'dist/katex.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  minify: true,
}

function copyStaticAssets() {
  mkdirSync('dist/webview', { recursive: true })
  copyFileSync('webview/editor/editor.css', 'dist/webview/editor.css')
}

async function build() {
  if (isWatch) {
    const extCtx = await esbuild.context(extensionConfig)
    const webCtx = await esbuild.context(webviewConfig)
    const mermaidCtx = await esbuild.context(mermaidConfig)
    const shikiCtx = await esbuild.context(shikiConfig)
    const katexCtx = await esbuild.context(katexConfig)
    copyStaticAssets()
    await Promise.all([
      extCtx.watch(),
      webCtx.watch(),
      mermaidCtx.watch(),
      shikiCtx.watch(),
      katexCtx.watch(),
    ])
    console.log('Watching for changes...')
  } else {
    copyStaticAssets()
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
      esbuild.build(mermaidConfig),
      esbuild.build(shikiConfig),
      esbuild.build(katexConfig),
    ])
    console.log('Build complete.')
  }
}

build().catch(() => process.exit(1))
