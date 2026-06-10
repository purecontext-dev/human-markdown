export interface SaveControllerCallbacks {
  getCurrentContent: () => string
  setDirty: (dirty: boolean) => void
  postMessage: (msg: { type: string; content?: string; requestId?: number }) => void
  hideConflict: () => void
  showError: () => void
  isConflictActive: () => boolean
}

const AUTO_SAVE_DELAY = 2000
const MAX_AUTO_SAVE_RETRIES = 3

export class SaveController {
  pendingSaveContent: string | null = null
  private autoSaveEnabled = false
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  private autoSaveFailures = 0
  private autoSaveBlockedUntil = 0
  private nextSaveRequestId = 1
  private pendingSaveRequestId: number | null = null

  constructor(private cb: SaveControllerCallbacks) {}

  initiateSave() {
    this.clearAutoSaveTimer()
    this.autoSaveFailures = 0
    this.pendingSaveContent = this.cb.getCurrentContent()
    this.pendingSaveRequestId = this.nextSaveRequestId++
    this.cb.postMessage({
      type: 'save',
      content: this.pendingSaveContent,
      requestId: this.pendingSaveRequestId,
    })
  }

  handleSuccess(requestId?: number) {
    if (!this.isCurrentSaveResponse(requestId)) return
    const savedContent = this.pendingSaveContent
    if (savedContent === null || this.cb.getCurrentContent() === savedContent) {
      this.cb.setDirty(false)
      this.cb.hideConflict()
    }
    this.pendingSaveContent = null
    this.pendingSaveRequestId = null
    this.autoSaveFailures = 0
    this.rescheduleIfDirty(savedContent)
  }

  handleFailure(requestId?: number, reason: 'apply' | 'save' | 'stale-content' = 'save') {
    if (!this.isCurrentSaveResponse(requestId)) return
    const savedContent = this.pendingSaveContent
    this.pendingSaveContent = null
    this.pendingSaveRequestId = null
    if (reason === 'apply' || reason === 'stale-content') {
      this.cb.showError()
    }
    this.autoSaveFailures++
    if (this.autoSaveFailures < MAX_AUTO_SAVE_RETRIES) {
      this.rescheduleIfDirty(savedContent)
    }
  }

  setAutoSave(enabled: boolean) {
    this.autoSaveEnabled = enabled
    if (!enabled) {
      this.clearAutoSaveTimer()
    }
  }

  get isAutoSaveEnabled() {
    return this.autoSaveEnabled
  }

  scheduleAutoSave() {
    if (!this.autoSaveEnabled) return
    if (this.pendingSaveContent !== null) return
    if (this.cb.isConflictActive()) return
    this.clearAutoSaveTimer()
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null
      if (this.pendingSaveContent !== null) return
      if (this.cb.isConflictActive()) return
      if (Date.now() < this.autoSaveBlockedUntil) {
        this.scheduleAutoSave()
        return
      }
      this.initiateSave()
    }, AUTO_SAVE_DELAY)
  }

  deferAutoSave(ms: number) {
    this.autoSaveBlockedUntil = Math.max(this.autoSaveBlockedUntil, Date.now() + ms)
    if (this.autoSaveEnabled && this.pendingSaveContent === null && !this.cb.isConflictActive()) {
      this.scheduleAutoSave()
    }
  }

  private rescheduleIfDirty(savedContent: string | null) {
    if (!this.autoSaveEnabled) return
    if (this.cb.getCurrentContent() !== savedContent) {
      this.scheduleAutoSave()
    }
  }

  private clearAutoSaveTimer() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }

  private isCurrentSaveResponse(requestId?: number): boolean {
    return requestId === undefined || requestId === this.pendingSaveRequestId
  }
}
