import { describe, expect, it } from 'vitest'
import { longestCommonSubsequence } from './lcs'

describe('longestCommonSubsequence', () => {
  it('returns empty for empty inputs', () => {
    expect(longestCommonSubsequence([], [])).toEqual([])
    expect(longestCommonSubsequence(['a'], [])).toEqual([])
    expect(longestCommonSubsequence([], ['a'])).toEqual([])
  })

  it('finds the full sequence when arrays are identical', () => {
    const a = ['x', 'y', 'z']
    const result = longestCommonSubsequence(a, a)
    expect(result).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ])
  })

  it('finds common elements in different positions', () => {
    const a = ['a', 'b', 'c', 'd']
    const b = ['a', 'x', 'c', 'd']
    const result = longestCommonSubsequence(a, b)
    expect(result).toEqual([
      [0, 0],
      [2, 2],
      [3, 3],
    ])
  })

  it('handles insertions', () => {
    const a = ['a', 'b']
    const b = ['a', 'x', 'b']
    const result = longestCommonSubsequence(a, b)
    expect(result).toEqual([
      [0, 0],
      [1, 2],
    ])
  })

  it('handles deletions', () => {
    const a = ['a', 'x', 'b']
    const b = ['a', 'b']
    const result = longestCommonSubsequence(a, b)
    expect(result).toEqual([
      [0, 0],
      [2, 1],
    ])
  })

  it('returns empty when nothing matches', () => {
    expect(longestCommonSubsequence(['a', 'b'], ['x', 'y'])).toEqual([])
  })

  it('handles single-element match', () => {
    expect(longestCommonSubsequence(['a'], ['a'])).toEqual([[0, 0]])
  })
})
