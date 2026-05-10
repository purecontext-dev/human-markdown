import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

const distDir = join(__dirname, '../../dist')

describe('bundle size', () => {
  it('webview bundle is under 500KB gzipped', () => {
    const source = readFileSync(join(distDir, 'webview.js'))
    const gzipped = gzipSync(source)
    const sizeKB = gzipped.length / 1024

    console.log(
      `Webview bundle: ${(source.length / 1024).toFixed(0)}KB raw, ${sizeKB.toFixed(0)}KB gzipped`,
    )
    expect(sizeKB).toBeLessThan(500)
  })

  it('extension bundle is under 50KB gzipped', () => {
    const source = readFileSync(join(distDir, 'extension.js'))
    const gzipped = gzipSync(source)
    const sizeKB = gzipped.length / 1024

    console.log(
      `Extension bundle: ${(source.length / 1024).toFixed(0)}KB raw, ${sizeKB.toFixed(0)}KB gzipped`,
    )
    expect(sizeKB).toBeLessThan(50)
  })
})
