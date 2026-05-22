import { describe, expect, it } from 'vitest'
import { minimalChange } from './minimal-change'

describe('minimalChange', () => {
  it('returns null for identical strings', () => {
    expect(minimalChange('hello', 'hello')).toBeNull()
  })

  it('returns null for two empty strings', () => {
    expect(minimalChange('', '')).toBeNull()
  })

  it('detects single character change', () => {
    expect(minimalChange('abc', 'axc')).toEqual({ from: 1, to: 2, insert: 'x' })
  })

  it('detects insertion in middle', () => {
    expect(minimalChange('ac', 'abc')).toEqual({ from: 1, to: 1, insert: 'b' })
  })

  it('detects deletion in middle', () => {
    expect(minimalChange('abc', 'ac')).toEqual({ from: 1, to: 2, insert: '' })
  })

  it('detects insertion at end', () => {
    expect(minimalChange('abc', 'abc\n')).toEqual({ from: 3, to: 3, insert: '\n' })
  })

  it('detects deletion at end', () => {
    expect(minimalChange('abc\n', 'abc')).toEqual({ from: 3, to: 4, insert: '' })
  })

  it('detects insertion at start', () => {
    expect(minimalChange('bc', 'abc')).toEqual({ from: 0, to: 0, insert: 'a' })
  })

  it('handles full replacement with no common prefix or suffix', () => {
    expect(minimalChange('abc', 'xyz')).toEqual({ from: 0, to: 3, insert: 'xyz' })
  })

  it('handles empty oldStr (full insertion)', () => {
    expect(minimalChange('', 'hello')).toEqual({ from: 0, to: 0, insert: 'hello' })
  })

  it('handles empty newStr (full deletion)', () => {
    expect(minimalChange('hello', '')).toEqual({ from: 0, to: 5, insert: '' })
  })

  it('handles trailing whitespace trim', () => {
    expect(minimalChange('line  \n', 'line\n')).toEqual({ from: 4, to: 6, insert: '' })
  })
})
