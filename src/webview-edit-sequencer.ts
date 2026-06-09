export type WebviewEditOrigin = 'edit' | 'history'

export interface WebviewEditSequencerCallbacks {
  applyEdit: (content: string, source?: unknown) => Promise<boolean>
  save: (content: string, requestId?: number) => Promise<void>
  onHistoryEditApplied?: () => void
}

export class WebviewEditSequencer {
  private latestRevision = 0
  private editGeneration = 0
  private queue: Promise<void> = Promise.resolve()

  constructor(private readonly callbacks: WebviewEditSequencerCallbacks) {}

  enqueueEdit(
    content: string,
    revision: number,
    origin: WebviewEditOrigin = 'edit',
    source?: unknown,
  ) {
    this.latestRevision = Math.max(this.latestRevision, revision)
    const generation = this.editGeneration
    return this.enqueue(async () => {
      if (generation !== this.editGeneration) return
      if (revision < this.latestRevision) return
      const applied = await this.callbacks.applyEdit(content, source)
      if (applied && origin === 'history') {
        this.callbacks.onHistoryEditApplied?.()
      }
    })
  }

  enqueueSave(content: string, requestId?: number) {
    return this.enqueue(() => this.callbacks.save(content, requestId))
  }

  enqueueConflictResolution(task: () => Promise<void> | void) {
    this.invalidatePendingEdits()
    return this.enqueue(task)
  }

  enqueueExternalChange(task: () => Promise<void> | void) {
    return this.enqueue(task)
  }

  invalidatePendingEdits() {
    this.editGeneration += 1
  }

  private enqueue(task: () => Promise<void> | void) {
    const run = this.queue.then(task)
    this.queue = run.catch(() => {})
    return run
  }
}
