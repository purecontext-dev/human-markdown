export type WebviewEditOrigin = 'edit' | 'history'

export interface WebviewEditSequencerCallbacks {
  applyEdit: (content: string, source?: unknown) => Promise<boolean>
  save: (content: string, requestId?: number, source?: unknown) => Promise<void>
  onHistoryEditApplied?: () => void
}

export class WebviewEditSequencer {
  private latestUnscopedRevision = 0
  private readonly latestRevisionBySource = new WeakMap<object, number>()
  private editGeneration = 0
  private queue: Promise<void> = Promise.resolve()

  constructor(private readonly callbacks: WebviewEditSequencerCallbacks) {}

  enqueueEdit(
    content: string,
    revision: number,
    origin: WebviewEditOrigin = 'edit',
    source?: unknown,
  ) {
    this.noteLatestRevision(source, revision)
    const generation = this.editGeneration
    return this.enqueue(async () => {
      if (generation !== this.editGeneration) return
      if (revision < this.getLatestRevision(source)) return
      const applied = await this.callbacks.applyEdit(content, source)
      if (applied && origin === 'history') {
        this.callbacks.onHistoryEditApplied?.()
      }
    })
  }

  enqueueSave(content: string, requestId?: number, source?: unknown) {
    return this.enqueue(() => this.callbacks.save(content, requestId, source))
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

  private noteLatestRevision(source: unknown, revision: number) {
    if (isRevisionSource(source)) {
      const latestRevision = this.latestRevisionBySource.get(source) ?? 0
      this.latestRevisionBySource.set(source, Math.max(latestRevision, revision))
      return
    }
    this.latestUnscopedRevision = Math.max(this.latestUnscopedRevision, revision)
  }

  private getLatestRevision(source: unknown) {
    if (isRevisionSource(source)) {
      return this.latestRevisionBySource.get(source) ?? 0
    }
    return this.latestUnscopedRevision
  }
}

function isRevisionSource(source: unknown): source is object {
  return (typeof source === 'object' && source !== null) || typeof source === 'function'
}
