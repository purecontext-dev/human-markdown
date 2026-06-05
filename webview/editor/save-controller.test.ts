import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SaveController } from './save-controller'

describe('SaveController', () => {
  let content: string
  let dirty: boolean
  let conflictActive: boolean
  let postMessage: ReturnType<typeof vi.fn>
  let hideConflict: ReturnType<typeof vi.fn>
  let showError: ReturnType<typeof vi.fn>
  let ctrl: SaveController

  beforeEach(() => {
    content = 'hello'
    dirty = true
    conflictActive = false
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
      isConflictActive: () => conflictActive,
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

  describe('auto-save', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('scheduleAutoSave fires initiateSave after 2s', () => {
      ctrl.setAutoSave(true)
      ctrl.scheduleAutoSave()
      expect(postMessage).not.toHaveBeenCalled()
      vi.advanceTimersByTime(2000)
      expect(postMessage).toHaveBeenCalledWith({ type: 'save', content: 'hello' })
    })

    it('scheduleAutoSave is a no-op when disabled', () => {
      ctrl.scheduleAutoSave()
      vi.advanceTimersByTime(2000)
      expect(postMessage).not.toHaveBeenCalled()
    })

    it('scheduleAutoSave is a no-op when conflict is active', () => {
      ctrl.setAutoSave(true)
      conflictActive = true
      ctrl.scheduleAutoSave()
      vi.advanceTimersByTime(2000)
      expect(postMessage).not.toHaveBeenCalled()
    })

    it('scheduleAutoSave skips when save is in flight', () => {
      ctrl.setAutoSave(true)
      ctrl.initiateSave()
      postMessage.mockClear()
      ctrl.scheduleAutoSave()
      vi.advanceTimersByTime(2000)
      expect(postMessage).not.toHaveBeenCalled()
    })

    it('timer callback bails if conflict becomes active before firing', () => {
      ctrl.setAutoSave(true)
      ctrl.scheduleAutoSave()
      conflictActive = true
      vi.advanceTimersByTime(2000)
      expect(postMessage).not.toHaveBeenCalled()
    })

    it('manual save resets failure counter', () => {
      ctrl.setAutoSave(true)
      ctrl.scheduleAutoSave()
      vi.advanceTimersByTime(2000)
      ctrl.handleFailure()
      ctrl.handleFailure()
      // 2 failures so far, manual save resets
      ctrl.initiateSave()
      postMessage.mockClear()
      // After manual save, auto-save should work again
      ctrl.handleFailure()
      content = 'changed'
      ctrl.handleFailure()
      // Still under retry cap since manual save reset it
      vi.advanceTimersByTime(2000)
      expect(postMessage).toHaveBeenCalledWith({ type: 'save', content: 'changed' })
    })

    it('handleFailure reschedules when content is dirty', () => {
      ctrl.setAutoSave(true)
      ctrl.scheduleAutoSave()
      vi.advanceTimersByTime(2000)
      content = 'changed'
      ctrl.handleFailure()
      vi.advanceTimersByTime(2000)
      expect(postMessage).toHaveBeenCalledTimes(2)
    })

    it('handleFailure stops retrying after max attempts', () => {
      ctrl.setAutoSave(true)
      content = 'dirty'
      for (let i = 0; i < 3; i++) {
        ctrl.scheduleAutoSave()
        vi.advanceTimersByTime(2000)
        ctrl.handleFailure()
      }
      // After 3 failures, should not reschedule
      vi.advanceTimersByTime(2000)
      expect(postMessage).toHaveBeenCalledTimes(3)
    })

    it('setAutoSave(false) clears pending timer', () => {
      ctrl.setAutoSave(true)
      ctrl.scheduleAutoSave()
      ctrl.setAutoSave(false)
      vi.advanceTimersByTime(2000)
      expect(postMessage).not.toHaveBeenCalled()
    })

    it('handleSuccess reschedules when content changed during save', () => {
      ctrl.setAutoSave(true)
      ctrl.initiateSave()
      content = 'changed during save'
      ctrl.handleSuccess()
      vi.advanceTimersByTime(2000)
      expect(postMessage).toHaveBeenCalledTimes(2)
    })
  })
})
