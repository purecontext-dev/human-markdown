import { describe, expect, it } from 'vitest'
import { threeWayMerge } from './three-way-merge'

describe('threeWayMerge', () => {
  it('returns mine when theirs equals base', () => {
    const base = 'line 1\nline 2\nline 3'
    const mine = 'line 1\nmodified\nline 3'
    const result = threeWayMerge(base, mine, base)
    expect(result.conflict).toBe(false)
    expect(result.merged).toBe(mine)
  })

  it('returns theirs when mine equals base', () => {
    const base = 'line 1\nline 2\nline 3'
    const theirs = 'line 1\nline 2\nchanged'
    const result = threeWayMerge(base, base, theirs)
    expect(result.conflict).toBe(false)
    expect(result.merged).toBe(theirs)
  })

  it('returns mine when both sides are identical', () => {
    const base = 'line 1\nline 2'
    const both = 'line 1\nline 2\nline 3'
    const result = threeWayMerge(base, both, both)
    expect(result.conflict).toBe(false)
    expect(result.merged).toBe(both)
  })

  it('merges non-overlapping edits from different regions', () => {
    const base = 'line 1\nline 2\nline 3\nline 4\nline 5'
    const mine = 'line 1\nmy edit\nline 3\nline 4\nline 5'
    const theirs = 'line 1\nline 2\nline 3\nline 4\ntheir edit'
    const result = threeWayMerge(base, mine, theirs)
    expect(result.conflict).toBe(false)
    expect(result.merged).toBe('line 1\nmy edit\nline 3\nline 4\ntheir edit')
  })

  it('merges additions at different positions', () => {
    const base = 'line 1\nline 2\nline 3'
    const mine = 'line 0\nline 1\nline 2\nline 3'
    const theirs = 'line 1\nline 2\nline 3\nline 4'
    const result = threeWayMerge(base, mine, theirs)
    expect(result.conflict).toBe(false)
    expect(result.merged).toBe('line 0\nline 1\nline 2\nline 3\nline 4')
  })

  it('detects conflict when both sides edit the same line', () => {
    const base = 'line 1\nline 2\nline 3'
    const mine = 'line 1\nmy version\nline 3'
    const theirs = 'line 1\ntheir version\nline 3'
    const result = threeWayMerge(base, mine, theirs)
    expect(result.conflict).toBe(true)
  })

  it('detects conflict when edits overlap', () => {
    const base = 'a\nb\nc\nd\ne'
    const mine = 'a\nb\nX\nY\ne'
    const theirs = 'a\nb\nP\nQ\ne'
    const result = threeWayMerge(base, mine, theirs)
    expect(result.conflict).toBe(true)
  })

  it('handles deletion on one side and edit on the other as conflict', () => {
    const base = 'line 1\nline 2\nline 3'
    const mine = 'line 1\nline 3'
    const theirs = 'line 1\nchanged\nline 3'
    const result = threeWayMerge(base, mine, theirs)
    expect(result.conflict).toBe(true)
  })

  it('handles appending by both sides to different ends', () => {
    const base = 'middle'
    const mine = 'top\nmiddle'
    const theirs = 'middle\nbottom'
    const result = threeWayMerge(base, mine, theirs)
    expect(result.conflict).toBe(false)
    expect(result.merged).toBe('top\nmiddle\nbottom')
  })

  it('handles empty base with additions from one side', () => {
    const base = ''
    const mine = 'new content'
    const result = threeWayMerge(base, mine, base)
    expect(result.conflict).toBe(false)
    expect(result.merged).toBe(mine)
  })
})
