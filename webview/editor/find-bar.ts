export class FindBar {
  private el: HTMLElement
  private input: HTMLInputElement
  private countLabel: HTMLSpanElement
  private matches: Range[] = []
  private currentIndex = -1
  private searchHighlight: Highlight | null = null
  private currentHighlight: Highlight | null = null
  private getSearchRoot: () => HTMLElement | null

  constructor(parent: HTMLElement, getSearchRoot: () => HTMLElement | null) {
    this.getSearchRoot = getSearchRoot

    this.el = document.createElement('div')
    this.el.className = 'find-bar hidden'

    this.input = document.createElement('input')
    this.input.type = 'text'
    this.input.className = 'find-input'
    this.input.placeholder = 'Find'
    this.input.setAttribute('autocomplete', 'off')
    this.input.setAttribute('spellcheck', 'false')

    this.countLabel = document.createElement('span')
    this.countLabel.className = 'find-count'

    const prevBtn = this.makeButton('find-nav-btn', '↑', 'Previous Match (Shift+Enter)')
    const nextBtn = this.makeButton('find-nav-btn', '↓', 'Next Match (Enter)')
    const closeBtn = this.makeButton('find-nav-btn find-close', '×', 'Close (Escape)')

    this.el.append(this.input, this.countLabel, prevBtn, nextBtn, closeBtn)
    parent.prepend(this.el)

    this.input.addEventListener('input', () => this.search())
    prevBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.prev()
    })
    nextBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.next()
    })
    closeBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.hide()
    })

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        this.hide()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) this.prev()
        else this.next()
      }
    })

    if (typeof Highlight !== 'undefined' && CSS.highlights) {
      this.searchHighlight = new Highlight()
      this.currentHighlight = new Highlight()
      CSS.highlights.set('hm-search-results', this.searchHighlight)
      CSS.highlights.set('hm-search-current', this.currentHighlight)
    }
  }

  show() {
    this.el.classList.remove('hidden')
    this.input.focus()
    this.input.select()
    if (this.input.value) this.search()
  }

  hide() {
    this.el.classList.add('hidden')
    this.clearHighlights()
    this.matches = []
    this.currentIndex = -1
    this.countLabel.textContent = ''
  }

  get isVisible() {
    return !this.el.classList.contains('hidden')
  }

  refresh() {
    if (this.isVisible && this.input.value) this.search()
  }

  private search() {
    this.clearHighlights()
    this.matches = []
    this.currentIndex = -1

    const query = this.input.value
    if (!query) {
      this.countLabel.textContent = ''
      return
    }

    const root = this.getSearchRoot()
    if (!root) return

    const lowerQuery = query.toLowerCase()
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)

    for (
      let node = walker.nextNode() as Text | null;
      node !== null;
      node = walker.nextNode() as Text | null
    ) {
      const text = node.textContent?.toLowerCase() ?? ''
      let offset = 0
      while (true) {
        const idx = text.indexOf(lowerQuery, offset)
        if (idx === -1) break
        const range = new Range()
        range.setStart(node, idx)
        range.setEnd(node, idx + query.length)
        this.matches.push(range)
        this.searchHighlight?.add(range)
        offset = idx + 1
      }
    }

    if (this.matches.length > 0) {
      this.currentIndex = 0
      this.scrollToCurrent()
    }

    this.updateCount()
  }

  next() {
    if (this.matches.length === 0) return
    this.currentIndex = (this.currentIndex + 1) % this.matches.length
    this.scrollToCurrent()
    this.updateCount()
  }

  prev() {
    if (this.matches.length === 0) return
    this.currentIndex = (this.currentIndex - 1 + this.matches.length) % this.matches.length
    this.scrollToCurrent()
    this.updateCount()
  }

  private scrollToCurrent() {
    this.currentHighlight?.clear()
    if (this.currentIndex < 0 || this.currentIndex >= this.matches.length) return
    const range = this.matches[this.currentIndex]
    this.currentHighlight?.add(range)

    const rect = range.getBoundingClientRect()
    if (rect.top < 60 || rect.bottom > window.innerHeight - 20) {
      range.startContainer.parentElement?.scrollIntoView({ block: 'center' })
    }
  }

  private clearHighlights() {
    this.searchHighlight?.clear()
    this.currentHighlight?.clear()
  }

  private updateCount() {
    if (this.matches.length === 0 && this.input.value) {
      this.countLabel.textContent = 'No results'
      this.input.classList.add('no-results')
    } else if (this.matches.length > 0) {
      this.countLabel.textContent = `${this.currentIndex + 1} of ${this.matches.length}`
      this.input.classList.remove('no-results')
    } else {
      this.countLabel.textContent = ''
      this.input.classList.remove('no-results')
    }
  }

  private makeButton(className: string, text: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = className
    btn.textContent = text
    btn.title = title
    btn.tabIndex = -1
    return btn
  }
}
