// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictBar } from './conflict-bar'

describe('ConflictBar', () => {
  let parent: HTMLElement
  let onAccept: ReturnType<typeof vi.fn>
  let onKeep: ReturnType<typeof vi.fn>
  let bar: ConflictBar

  beforeEach(() => {
    document.body.innerHTML = ''
    parent = document.createElement('div')
    const previewContainer = document.createElement('div')
    previewContainer.id = 'preview-container'
    parent.appendChild(previewContainer)
    document.body.appendChild(parent)
    onAccept = vi.fn()
    onKeep = vi.fn()
    bar = new ConflictBar(parent, onAccept, onKeep)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('starts hidden', () => {
    expect(bar.isVisible).toBe(false)
  })

  it('show() makes it visible', () => {
    bar.show()
    expect(bar.isVisible).toBe(true)
  })

  it('hide() makes it hidden', () => {
    bar.show()
    bar.hide()
    expect(bar.isVisible).toBe(false)
  })

  it('Accept button calls onAccept and hides the bar', () => {
    bar.show()
    const acceptBtn = parent.querySelector('.conflict-btn.accept') as HTMLButtonElement
    acceptBtn.click()
    expect(onAccept).toHaveBeenCalledOnce()
    expect(bar.isVisible).toBe(false)
  })

  it('Keep button calls onKeep and hides the bar', () => {
    bar.show()
    const keepBtn = parent.querySelector('.conflict-btn.keep') as HTMLButtonElement
    keepBtn.click()
    expect(onKeep).toHaveBeenCalledOnce()
    expect(bar.isVisible).toBe(false)
  })

  it('is inserted before #preview-container', () => {
    const children = Array.from(parent.children).map((el) => el.className || el.id)
    const conflictIdx = children.findIndex((c) => c.includes('conflict-bar'))
    const previewIdx = children.findIndex((c) => c === 'preview-container')
    expect(conflictIdx).toBeGreaterThanOrEqual(0)
    expect(previewIdx).toBeGreaterThanOrEqual(0)
    expect(conflictIdx).toBeLessThan(previewIdx)
  })
})
