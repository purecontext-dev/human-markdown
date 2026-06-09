export type WebviewEditOrigin = 'edit' | 'history'

export interface WebviewEditSequencerCallbacks {
  applyEdit: (content: string) => Promise<boolean>
  save: (content: string, requestId?: number) => Promise<void>
  onHistoryEditApplied?: () => void
}

export class WebviewEditSequencer {
  private latestRevision = 0
  private queue: Promise<void> = Promise.resolve()

  constructor(private readonly callbacks: WebviewEditSequencerCallbacks) {}

  enqueueEdit(content: string, revision: number, origin: WebviewEditOrigin = 'edit') {
    this.latestRevision = Math.max(this.latestRevision, revision)
    return this.enqueue(async () => {
      if (revision < this.latestRevision) return
      const applied = await this.callbacks.applyEdit(content)
      if (applied && origin === 'history') {
        this.callbacks.onHistoryEditApplied?.()
      }
    })
  }

  enqueueSave(content: string, requestId?: number) {
    return this.enqueue(() => this.callbacks.save(content, requestId))
  }

  private enqueue(task: () => Promise<void> | void) {
    const run = this.queue.then(task)
    this.queue = run.catch(() => {})
    return run
  }
}
