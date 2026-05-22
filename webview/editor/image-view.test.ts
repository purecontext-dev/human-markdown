import { afterEach, describe, expect, it } from 'vitest'
import { isLocalPath, loadedCache } from './image-view'

describe('isLocalPath', () => {
  it('returns true for relative paths', () => {
    expect(isLocalPath('./photo.png')).toBe(true)
    expect(isLocalPath('../images/hero.jpg')).toBe(true)
    expect(isLocalPath('assets/logo.svg')).toBe(true)
  })

  it('returns true for paths starting with /', () => {
    expect(isLocalPath('/absolute/path.png')).toBe(true)
  })

  it('returns true for empty string', () => {
    expect(isLocalPath('')).toBe(true)
  })

  it('returns false for https URIs', () => {
    expect(isLocalPath('https://example.com/img.png')).toBe(false)
  })

  it('returns false for http URIs', () => {
    expect(isLocalPath('http://example.com/img.png')).toBe(false)
  })

  it('returns false for data URIs', () => {
    expect(isLocalPath('data:image/png;base64,abc')).toBe(false)
  })

  it('returns false for vscode-webview scheme', () => {
    expect(isLocalPath('vscode-webview://abc/img.png')).toBe(false)
  })

  it('returns false for ftp scheme', () => {
    expect(isLocalPath('ftp://server/file.png')).toBe(false)
  })
})

describe('loadedCache', () => {
  afterEach(() => {
    loadedCache.clear()
  })

  it('starts empty', () => {
    expect(loadedCache.size).toBe(0)
  })

  it('stores and retrieves URIs', () => {
    loadedCache.set('./img.png', 'vscode-webview://ext/img.png')
    expect(loadedCache.get('./img.png')).toBe('vscode-webview://ext/img.png')
  })

  it('allows deletion for retry on error', () => {
    loadedCache.set('./missing.png', 'vscode-webview://ext/missing.png')
    loadedCache.delete('./missing.png')
    expect(loadedCache.has('./missing.png')).toBe(false)
  })
})
