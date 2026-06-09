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

  it('tracks latest edit revision independently for each source', async () => {
    const applied: string[] = []
    const firstSource = {}
    const secondSource = {}
    const sequencer = new WebviewEditSequencer({
      applyEdit: async (content) => {
        applied.push(content)
        return true
      },
      save: async () => {},
    })

    const firstEdit = sequencer.enqueueEdit('first-source-revision-1', 1, 'edit', firstSource)
    const secondEdit = sequencer.enqueueEdit('first-source-revision-2', 2, 'edit', firstSource)
    const thirdEdit = sequencer.enqueueEdit('second-source-revision-1', 1, 'edit', secondSource)

    await Promise.all([firstEdit, secondEdit, thirdEdit])

    expect(applied).toEqual(['first-source-revision-2', 'second-source-revision-1'])
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
      save: async (content, requestId) => {
        events.push(`save:${content}:${requestId}`)
        expect(documentText).toBe('restored-word-state')
      },
    })

    const firstEdit = sequencer.enqueueEdit('deleted-word-state', 1)
    await firstEditDidStart
    const historyEdit = sequencer.enqueueEdit('restored-word-state', 2, 'history')
    const save = sequencer.enqueueSave('restored-word-state', 42)

    finishFirstEdit()
    await Promise.all([firstEdit, historyEdit, save])

    expect(events).toEqual([
      'apply:deleted-word-state',
      'apply:restored-word-state',
      'save:restored-word-state:42',
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

  it('ignores queued edits after invalidation', async () => {
    const applied: string[] = []
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
        applied.push(content)
        if (content === 'in-flight') {
          firstEditStarted()
          await firstEditCanFinish
        }
        return true
      },
      save: async () => {},
    })

    const inFlight = sequencer.enqueueEdit('in-flight', 1)
    await firstEditDidStart
    const staleQueued = sequencer.enqueueEdit('stale-after-accept-external', 2)

    sequencer.invalidatePendingEdits()
    finishFirstEdit()
    await Promise.all([inFlight, staleQueued])

    expect(applied).toEqual(['in-flight'])
  })

  it('runs conflict resolution after in-flight work and cancels stale queued edits', async () => {
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
        if (content === 'in-flight') {
          firstEditStarted()
          await firstEditCanFinish
        }
        return true
      },
      save: async () => {},
    })

    const inFlight = sequencer.enqueueEdit('in-flight', 1)
    await firstEditDidStart
    const staleQueued = sequencer.enqueueEdit('stale-after-conflict', 2)
    const resolution = sequencer.enqueueConflictResolution(() => {
      events.push('resolve-conflict')
    })

    finishFirstEdit()
    await Promise.all([inFlight, staleQueued, resolution])

    expect(events).toEqual(['apply:in-flight', 'resolve-conflict'])
  })

  it('runs external changes after pending webview edits', async () => {
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
        if (content === 'in-flight') {
          firstEditStarted()
          await firstEditCanFinish
        }
        return true
      },
      save: async () => {},
    })

    const inFlight = sequencer.enqueueEdit('in-flight', 1)
    await firstEditDidStart
    const queuedEdit = sequencer.enqueueEdit('latest-local', 2)
    const externalChange = sequencer.enqueueExternalChange(() => {
      events.push('external-change')
    })

    finishFirstEdit()
    await Promise.all([inFlight, queuedEdit, externalChange])

    expect(events).toEqual(['apply:in-flight', 'apply:latest-local', 'external-change'])
  })
})
