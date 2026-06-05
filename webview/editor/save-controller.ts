export interface SaveControllerCallbacks {
  getCurrentContent: () => string
  setDirty: (dirty: boolean) => void
  postMessage: (msg: { type: string; content?: string }) => void
  hideConflict: () => void
  showError: () => void
}

const AUTO_SAVE_DELAY = 2000

export class SaveController {
  pendingSaveContent: string | null = null
  private autoSaveEnabled = false
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private cb: SaveControllerCallbacks) {}

  initiateSave() {
    this.clearAutoSaveTimer()
    this.pendingSaveContent = this.cb.getCurrentContent()
    this.cb.postMessage({ type: 'save', content: this.pendingSaveContent })
  }

  handleSuccess() {
    if (
      this.pendingSaveContent !== null &&
      this.cb.getCurrentContent() === this.pendingSaveContent
    ) {
      this.cb.setDirty(false)
      this.cb.hideConflict()
    }
    this.pendingSaveContent = null
  }

  handleFailure() {
    this.pendingSaveContent = null
    this.cb.showError()
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
    this.clearAutoSaveTimer()
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null
      this.initiateSave()
    }, AUTO_SAVE_DELAY)
  }

  private clearAutoSaveTimer() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }
}
