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

function computeEdits(base: string[], modified: string[]): Edit[] {
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

function longestCommonSubsequence(a: string[], b: string[]): [number, number][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const result: [number, number][] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.push([i - 1, j - 1])
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return result.reverse()
}
