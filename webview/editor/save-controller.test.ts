import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SaveController } from './save-controller'

describe('SaveController', () => {
  let content: string
  let dirty: boolean
  let postMessage: ReturnType<typeof vi.fn>
  let hideConflict: ReturnType<typeof vi.fn>
  let showError: ReturnType<typeof vi.fn>
  let ctrl: SaveController

  beforeEach(() => {
    content = 'hello'
    dirty = true
    postMessage = vi.fn()
    hideConflict = vi.fn()
    showError = vi.fn()
    ctrl = new SaveController({
      getCurrentContent: () => content,
      setDirty: (d) => {
        dirty = d
      },
      postMessage,
      hideConflict,
      showError,
    })
  })

  it('initiateSave snapshots content and posts save message', () => {
    ctrl.initiateSave()
    expect(ctrl.pendingSaveContent).toBe('hello')
    expect(postMessage).toHaveBeenCalledWith({ type: 'save', content: 'hello' })
  })

  it('handleSuccess clears dirty when content unchanged since save', () => {
    ctrl.initiateSave()
    ctrl.handleSuccess()
    expect(dirty).toBe(false)
    expect(hideConflict).toHaveBeenCalledOnce()
    expect(ctrl.pendingSaveContent).toBeNull()
  })

  it('handleSuccess preserves dirty when content changed since save', () => {
    ctrl.initiateSave()
    content = 'edited after save'
    dirty = true
    ctrl.handleSuccess()
    expect(dirty).toBe(true)
    expect(hideConflict).not.toHaveBeenCalled()
    expect(ctrl.pendingSaveContent).toBeNull()
  })

  it('handleSuccess is a no-op without a pending save', () => {
    ctrl.handleSuccess()
    expect(dirty).toBe(true)
    expect(hideConflict).not.toHaveBeenCalled()
  })

  it('handleFailure shows error and clears pending state', () => {
    ctrl.initiateSave()
    ctrl.handleFailure()
    expect(showError).toHaveBeenCalledOnce()
    expect(ctrl.pendingSaveContent).toBeNull()
    expect(dirty).toBe(true)
  })

  it('second save overwrites pending content snapshot', () => {
    ctrl.initiateSave()
    content = 'v2'
    ctrl.initiateSave()
    expect(ctrl.pendingSaveContent).toBe('v2')
    ctrl.handleSuccess()
    expect(dirty).toBe(false)
  })
})
