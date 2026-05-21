// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DomSearchBackend, FindBar, type SearchBackend } from './find-bar'

function createMockBackend(): SearchBackend & {
  searchFn: ReturnType<typeof vi.fn>
  goToMatchFn: ReturnType<typeof vi.fn>
  clearFn: ReturnType<typeof vi.fn>
} {
  const searchFn = vi.fn(() => 0)
  const goToMatchFn = vi.fn()
  const clearFn = vi.fn()
  return {
    search: searchFn,
    goToMatch: goToMatchFn,
    clear: clearFn,
    searchFn,
    goToMatchFn,
    clearFn,
  }
}

describe('FindBar', () => {
  let parent: HTMLElement
  let backend: ReturnType<typeof createMockBackend>
  let findBar: FindBar

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.appendChild(parent)
    backend = createMockBackend()
    findBar = new FindBar(parent, () => backend)
  })

  it('starts hidden', () => {
    expect(findBar.isVisible).toBe(false)
  })

  it('show() makes it visible and focuses input', () => {
    findBar.show()
    expect(findBar.isVisible).toBe(true)
    const input = parent.querySelector('.find-input') as HTMLInputElement
    expect(document.activeElement).toBe(input)
  })

  it('hide() resets state', () => {
    backend.searchFn.mockReturnValue(3)
    findBar.show()
    const input = parent.querySelector('.find-input') as HTMLInputElement
    input.value = 'test'
    input.dispatchEvent(new Event('input'))

    findBar.hide()

    expect(findBar.isVisible).toBe(false)
    expect(backend.clearFn).toHaveBeenCalled()
    const count = parent.querySelector('.find-count') as HTMLSpanElement
    expect(count.textContent).toBe('')
  })

  it('displays match count on search', () => {
    backend.searchFn.mockReturnValue(5)
    findBar.show()
    const input = parent.querySelector('.find-input') as HTMLInputElement
    input.value = 'hello'
    input.dispatchEvent(new Event('input'))

    expect(backend.searchFn).toHaveBeenCalledWith('hello')
    const count = parent.querySelector('.find-count') as HTMLSpanElement
    expect(count.textContent).toBe('1 of 5')
    expect(backend.goToMatchFn).toHaveBeenCalledWith(0)
  })

  it('shows "No results" when nothing matches', () => {
    backend.searchFn.mockReturnValue(0)
    findBar.show()
    const input = parent.querySelector('.find-input') as HTMLInputElement
    input.value = 'nonexistent'
    input.dispatchEvent(new Event('input'))

    const count = parent.querySelector('.find-count') as HTMLSpanElement
    expect(count.textContent).toBe('No results')
    expect(input.classList.contains('no-results')).toBe(true)
  })

  it('next() wraps around', () => {
    backend.searchFn.mockReturnValue(3)
    findBar.show()
    const input = parent.querySelector('.find-input') as HTMLInputElement
    input.value = 'test'
    input.dispatchEvent(new Event('input'))

    const count = parent.querySelector('.find-count') as HTMLSpanElement
    expect(count.textContent).toBe('1 of 3')

    findBar.next()
    expect(count.textContent).toBe('2 of 3')
    expect(backend.goToMatchFn).toHaveBeenCalledWith(1)

    findBar.next()
    expect(count.textContent).toBe('3 of 3')

    findBar.next()
    expect(count.textContent).toBe('1 of 3')
    expect(backend.goToMatchFn).toHaveBeenCalledWith(0)
  })

  it('prev() wraps around', () => {
    backend.searchFn.mockReturnValue(3)
    findBar.show()
    const input = parent.querySelector('.find-input') as HTMLInputElement
    input.value = 'test'
    input.dispatchEvent(new Event('input'))

    findBar.prev()
    const count = parent.querySelector('.find-count') as HTMLSpanElement
    expect(count.textContent).toBe('3 of 3')
    expect(backend.goToMatchFn).toHaveBeenCalledWith(2)
  })

  it('refresh() re-runs search when visible', () => {
    backend.searchFn.mockReturnValue(2)
    findBar.show()
    const input = parent.querySelector('.find-input') as HTMLInputElement
    input.value = 'test'
    input.dispatchEvent(new Event('input'))

    backend.searchFn.mockClear()
    findBar.refresh()
    expect(backend.searchFn).toHaveBeenCalledWith('test')
  })

  it('refresh() is a no-op when hidden', () => {
    backend.searchFn.mockClear()
    findBar.refresh()
    expect(backend.searchFn).not.toHaveBeenCalled()
  })

  it('clears old backend when switching', () => {
    const backend2 = createMockBackend()
    backend2.searchFn.mockReturnValue(1)
    let currentBackend: SearchBackend = backend
    findBar = new FindBar(parent, () => currentBackend)

    backend.searchFn.mockReturnValue(2)
    findBar.show()
    const input = parent.querySelector('.find-input') as HTMLInputElement
    input.value = 'test'
    input.dispatchEvent(new Event('input'))

    currentBackend = backend2
    findBar.refresh()
    expect(backend.clearFn).toHaveBeenCalled()
    expect(backend2.searchFn).toHaveBeenCalledWith('test')
  })
})

describe('DomSearchBackend', () => {
  it('finds matches in text content', () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>hello world hello</p><p>hello again</p>'
    document.body.appendChild(root)

    const backend = new DomSearchBackend(() => root)
    const count = backend.search('hello')

    expect(count).toBe(3)
  })

  it('returns 0 for no matches', () => {
    const root = document.createElement('div')
    root.textContent = 'some text'
    const backend = new DomSearchBackend(() => root)

    expect(backend.search('xyz')).toBe(0)
  })

  it('case-insensitive search', () => {
    const root = document.createElement('div')
    root.textContent = 'Hello HELLO hello'
    const backend = new DomSearchBackend(() => root)

    expect(backend.search('hello')).toBe(3)
  })

  it('clear() resets matches', () => {
    const root = document.createElement('div')
    root.textContent = 'test test'
    const backend = new DomSearchBackend(() => root)
    backend.search('test')
    backend.clear()

    expect(backend.search('test')).toBe(2)
  })
})
