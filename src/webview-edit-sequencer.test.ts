import { describe, expect, it, vi } from 'vitest'
import { WebviewEditSequencer } from './webview-edit-sequencer'

describe('WebviewEditSequencer', () => {
  it('ignores an older edit revision when a newer edit arrives first', async () => {
    const applied: string[] = []
    const sequencer = new WebviewEditSequencer({
      applyEdit: async (content) => {
        applied.push(content)
        return true
      },
      save: async () => {},
    })

    const oldEdit = sequencer.enqueueEdit('deleted-word-state', 1)
    const newEdit = sequencer.enqueueEdit('restored-word-state', 2, 'history')

    await Promise.all([oldEdit, newEdit])

    expect(applied).toEqual(['restored-word-state'])
  })

  it('saves only after all pending webview edits have applied', async () => {
    let documentText = 'initial'
    const events: string[] = []
    let finishFirstEdit!: () => void
    let firstEditStarted!: () => void
    const firstEditDidStart = new Promise<void>((resolve) => {
      firstEditStarted = resolve
    })
    const firstEditCanFinish = new Promise<void>((resolve) => {
      finishFirstEdit = resolve
    })

    const sequencer = new WebviewEditSequencer({
      applyEdit: async (content) => {
        events.push(`apply:${content}`)
        if (content === 'deleted-word-state') {
          firstEditStarted()
          await firstEditCanFinish
        }
        documentText = content
        return true
      },
      save: async (content) => {
        events.push(`save:${content}`)
        expect(documentText).toBe('restored-word-state')
      },
    })

    const firstEdit = sequencer.enqueueEdit('deleted-word-state', 1)
    await firstEditDidStart
    const historyEdit = sequencer.enqueueEdit('restored-word-state', 2, 'history')
    const save = sequencer.enqueueSave('restored-word-state')

    finishFirstEdit()
    await Promise.all([firstEdit, historyEdit, save])

    expect(events).toEqual([
      'apply:deleted-word-state',
      'apply:restored-word-state',
      'save:restored-word-state',
    ])
  })

  it('notifies when a history edit is applied', async () => {
    const onHistoryEditApplied = vi.fn()
    const sequencer = new WebviewEditSequencer({
      applyEdit: async () => true,
      save: async () => {},
      onHistoryEditApplied,
    })

    await sequencer.enqueueEdit('restored-word-state', 1, 'history')

    expect(onHistoryEditApplied).toHaveBeenCalledOnce()
  })
})
