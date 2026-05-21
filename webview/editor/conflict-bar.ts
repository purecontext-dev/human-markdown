export class ConflictBar {
  private el: HTMLElement

  constructor(
    parent: HTMLElement,
    private onAccept: () => void,
    private onKeep: () => void,
  ) {
    this.el = document.createElement('div')
    this.el.className = 'conflict-bar hidden'

    const icon = document.createElement('span')
    icon.className = 'conflict-icon'
    icon.textContent = '⚠'

    const message = document.createElement('span')
    message.className = 'conflict-message'
    message.textContent = 'This file has been changed externally.'

    const acceptBtn = document.createElement('button')
    acceptBtn.className = 'conflict-btn accept'
    acceptBtn.textContent = 'Accept External'
    acceptBtn.addEventListener('click', () => {
      this.hide()
      this.onAccept()
    })

    const keepBtn = document.createElement('button')
    keepBtn.className = 'conflict-btn keep'
    keepBtn.textContent = 'Keep My Edits'
    keepBtn.addEventListener('click', () => {
      this.hide()
      this.onKeep()
    })

    this.el.append(icon, message, acceptBtn, keepBtn)
    parent.insertBefore(this.el, parent.querySelector('#preview-container'))
  }

  show() {
    this.el.classList.remove('hidden')
  }

  hide() {
    this.el.classList.add('hidden')
  }

  get isVisible() {
    return !this.el.classList.contains('hidden')
  }
}
