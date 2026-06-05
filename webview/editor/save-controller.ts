export interface SaveControllerCallbacks {
  getCurrentContent: () => string
  setDirty: (dirty: boolean) => void
  postMessage: (msg: { type: string; content?: string }) => void
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

  constructor(private cb: SaveControllerCallbacks) {}

  initiateSave() {
    this.clearAutoSaveTimer()
    this.autoSaveFailures = 0
    this.pendingSaveContent = this.cb.getCurrentContent()
    this.cb.postMessage({ type: 'save', content: this.pendingSaveContent })
  }

  handleSuccess() {
    const savedContent = this.pendingSaveContent
    if (savedContent !== null && this.cb.getCurrentContent() === savedContent) {
      this.cb.setDirty(false)
      this.cb.hideConflict()
    }
    this.pendingSaveContent = null
    this.autoSaveFailures = 0
    this.rescheduleIfDirty(savedContent)
  }

  handleFailure() {
    const savedContent = this.pendingSaveContent
    this.pendingSaveContent = null
    this.cb.showError()
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
      this.initiateSave()
    }, AUTO_SAVE_DELAY)
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
}
