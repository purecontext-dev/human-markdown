import { longestCommonSubsequence } from '../shared/lcs'

export interface MergeResult {
  conflict: boolean
  merged: string
}

interface Edit {
  baseStart: number
  baseEnd: number
  lines: string[]
}

export function threeWayMerge(base: string, mine: string, theirs: string): MergeResult {
  if (mine === theirs) return { conflict: false, merged: mine }
  if (mine === base) return { conflict: false, merged: theirs }
  if (theirs === base) return { conflict: false, merged: mine }

  const baseLines = base.split('\n')
  const mineLines = mine.split('\n')
  const theirLines = theirs.split('\n')

  const myEdits = computeEdits(baseLines, mineLines)
  const theirEdits = computeEdits(baseLines, theirLines)

  if (editsOverlap(myEdits, theirEdits)) {
    return { conflict: true, merged: '' }
  }

  const allEdits = [...myEdits, ...theirEdits].sort((a, b) => a.baseStart - b.baseStart)
  const result: string[] = []
  let baseIdx = 0

  for (const edit of allEdits) {
    while (baseIdx < edit.baseStart) {
      result.push(baseLines[baseIdx])
      baseIdx++
    }
    result.push(...edit.lines)
    baseIdx = edit.baseEnd
  }

  while (baseIdx < baseLines.length) {
    result.push(baseLines[baseIdx])
    baseIdx++
  }

  return { conflict: false, merged: result.join('\n') }
}

export function computeEdits(base: string[], modified: string[]): Edit[] {
  const lcs = longestCommonSubsequence(base, modified)
  const edits: Edit[] = []
  let bi = 0
  let mi = 0

  for (const [bIdx, mIdx] of lcs) {
    if (bi < bIdx || mi < mIdx) {
      edits.push({
        baseStart: bi,
        baseEnd: bIdx,
        lines: modified.slice(mi, mIdx),
      })
    }
    bi = bIdx + 1
    mi = mIdx + 1
  }

  if (bi < base.length || mi < modified.length) {
    edits.push({
      baseStart: bi,
      baseEnd: base.length,
      lines: modified.slice(mi),
    })
  }

  return edits
}

function editsOverlap(a: Edit[], b: Edit[]): boolean {
  for (const ea of a) {
    for (const eb of b) {
      if (ea.baseStart < eb.baseEnd && eb.baseStart < ea.baseEnd) return true
      if (ea.baseStart === eb.baseStart) return true
      if (ea.baseStart === eb.baseEnd && ea.baseStart === ea.baseEnd) return true
      if (eb.baseStart === ea.baseEnd && eb.baseStart === eb.baseEnd) return true
    }
  }
  return false
}
