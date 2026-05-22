export interface SaveControllerCallbacks {
  getCurrentContent: () => string
  setDirty: (dirty: boolean) => void
  postMessage: (msg: { type: string; content?: string }) => void
  hideConflict: () => void
  showError: () => void
}

export class SaveController {
  pendingSaveContent: string | null = null

  constructor(private cb: SaveControllerCallbacks) {}

  initiateSave() {
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
}
