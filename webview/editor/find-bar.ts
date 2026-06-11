export interface SearchBackend {
  search(query: string): number
  goToMatch(index: number): void
  clear(): void
}

export class DomSearchBackend implements SearchBackend {
  private matches: Range[] = []
  private searchHL: Highlight | null = null
  private currentHL: Highlight | null = null

  constructor(private getRoot: () => HTMLElement | null) {
    if (typeof Highlight !== 'undefined' && CSS.highlights) {
      this.searchHL = new Highlight()
      this.currentHL = new Highlight()
      CSS.highlights.set('hm-search-results', this.searchHL)
      CSS.highlights.set('hm-search-current', this.currentHL)
    }
  }

  search(query: string): number {
    this.clear()
    const root = this.getRoot()
    if (!root) return 0

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
        this.searchHL?.add(range)
        offset = idx + 1
      }
    }

    return this.matches.length
  }

  goToMatch(index: number): void {
    this.currentHL?.clear()
    const range = this.matches[index]
    if (!range) return
    this.currentHL?.add(range)

    const rect = range.getBoundingClientRect()
    if (rect.top < 60 || rect.bottom > window.innerHeight - 20) {
      range.startContainer.parentElement?.scrollIntoView({ block: 'center' })
    }
  }

  clear(): void {
    this.searchHL?.clear()
    this.currentHL?.clear()
    this.matches = []
  }
}

export class FindBar {
  private el: HTMLElement
  private input: HTMLInputElement
  private countLabel: HTMLSpanElement
  private matchCount = 0
  private currentIndex = -1
  private getBackend: () => SearchBackend
  private activeBackend: SearchBackend | null = null

  constructor(parent: HTMLElement, getBackend: () => SearchBackend) {
    this.getBackend = getBackend

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
  }

  show() {
    this.el.classList.remove('hidden')
    this.input.focus()
    this.input.select()
    if (this.input.value) this.search()
  }

  hide() {
    this.el.classList.add('hidden')
    this.activeBackend?.clear()
    this.activeBackend = null
    this.matchCount = 0
    this.currentIndex = -1
    this.countLabel.textContent = ''
    this.input.classList.remove('no-results')
  }

  get isVisible() {
    return !this.el.classList.contains('hidden')
  }

  get state() {
    return {
      visible: this.isVisible,
      value: this.input.value,
      count: this.countLabel.textContent,
    }
  }

  setQueryForTest(query: string) {
    this.input.value = query
    this.search()
  }

  refresh() {
    if (this.isVisible && this.input.value) this.search()
  }

  private search() {
    const backend = this.getBackend()
    if (backend !== this.activeBackend) {
      this.activeBackend?.clear()
      this.activeBackend = backend
    }

    this.currentIndex = -1
    const query = this.input.value
    if (!query) {
      this.activeBackend.clear()
      this.matchCount = 0
      this.countLabel.textContent = ''
      this.input.classList.remove('no-results')
      return
    }

    this.matchCount = this.activeBackend.search(query)

    if (this.matchCount > 0) {
      this.currentIndex = 0
      this.activeBackend.goToMatch(0)
    }

    this.updateCount()
  }

  next() {
    if (this.matchCount === 0) return
    this.currentIndex = (this.currentIndex + 1) % this.matchCount
    this.activeBackend?.goToMatch(this.currentIndex)
    this.updateCount()
  }

  prev() {
    if (this.matchCount === 0) return
    this.currentIndex = (this.currentIndex - 1 + this.matchCount) % this.matchCount
    this.activeBackend?.goToMatch(this.currentIndex)
    this.updateCount()
  }

  private updateCount() {
    if (this.matchCount === 0 && this.input.value) {
      this.countLabel.textContent = 'No results'
      this.input.classList.add('no-results')
    } else if (this.matchCount > 0) {
      this.countLabel.textContent = `${this.currentIndex + 1} of ${this.matchCount}`
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
