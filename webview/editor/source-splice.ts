import { longestCommonSubsequence } from '../../shared/lcs'

export interface SourceMap {
  diskBytes: string
  diskBlocks: string[]
  baselineBlocks: string[]
}

const BLOCK_SEPARATOR = /\n\n+/

export function buildSourceMap(diskBytes: string, baselineSerialized: string): SourceMap {
  return {
    diskBytes,
    diskBlocks: splitBlocks(diskBytes),
    baselineBlocks: splitBlocks(baselineSerialized),
  }
}

export function spliceContent(sourceMap: SourceMap, liveSerialized: string): string {
  const liveBlocks = splitBlocks(liveSerialized)

  // Structural change: block count shifted between baseline and live.
  // Fall back to full live serialization (today's behavior).
  if (!canSplice(sourceMap)) {
    return liveSerialized
  }

  const matches = longestCommonSubsequence(sourceMap.baselineBlocks, liveBlocks)

  // No blocks survived unchanged — full reserialization
  if (matches.length === 0) {
    return liveSerialized
  }

  const result: string[] = []
  let liveIdx = 0

  for (const [bIdx, lIdx] of matches) {
    // Emit live (reserialized) blocks for any edited blocks before this match
    for (let i = liveIdx; i < lIdx; i++) {
      result.push(liveBlocks[i])
    }

    // Emit the disk bytes for this unchanged block
    const diskBlock = sourceMap.diskBlocks[bIdx]
    if (diskBlock === undefined) {
      // Self-check failed: disk blocks don't align. Fall back.
      return liveSerialized
    }
    result.push(diskBlock)

    liveIdx = lIdx + 1
  }

  // Emit any remaining live blocks after the last match
  for (let i = liveIdx; i < liveBlocks.length; i++) {
    result.push(liveBlocks[i])
  }

  const spliced = joinBlocks(result, sourceMap.diskBytes)

  // Self-check: every disk block we emitted must appear byte-identical in the
  // output. If not, something went wrong with separator reconstruction — fall
  // back to the safe full serialization.
  if (!selfCheck(spliced, sourceMap, matches)) {
    return liveSerialized
  }

  return spliced
}

function splitBlocks(text: string): string[] {
  // Split on runs of 2+ newlines (blank-line boundaries).
  // Trim trailing newline first so we don't get an empty trailing block.
  const trimmed = text.replace(/\n+$/, '')
  if (trimmed === '') return []
  return trimmed.split(BLOCK_SEPARATOR)
}

function joinBlocks(blocks: string[], diskBytes: string): string {
  if (blocks.length === 0) return ''

  // Extract the inter-block separators from the original disk bytes so we
  // preserve the author's blank-line style (single vs double vs triple).
  const diskSeparators = extractSeparators(diskBytes)

  const parts: string[] = [blocks[0]]
  for (let i = 1; i < blocks.length; i++) {
    // Use the disk separator at position i-1 if available, else default to \n\n
    const sep = i - 1 < diskSeparators.length ? diskSeparators[i - 1] : '\n\n'
    parts.push(sep)
    parts.push(blocks[i])
  }

  // Preserve the disk trailing newline pattern
  const trailingMatch = diskBytes.match(/(\n+)$/)
  const trailing = trailingMatch ? trailingMatch[1] : '\n'
  parts.push(trailing)

  return parts.join('')
}

function extractSeparators(text: string): string[] {
  const trimmed = text.replace(/\n+$/, '')
  return [...trimmed.matchAll(/\n\n+/g)].map((m) => m[0])
}

function canSplice(sourceMap: SourceMap): boolean {
  // We need a 1:1 mapping between baseline and disk blocks for the splice to
  // be valid. If the parse normalized the block count (e.g. setext headings
  // collapse two source lines into one block), the correspondence is broken.
  return sourceMap.diskBlocks.length === sourceMap.baselineBlocks.length
}

function selfCheck(spliced: string, sourceMap: SourceMap, matches: [number, number][]): boolean {
  for (const [bIdx] of matches) {
    const diskBlock = sourceMap.diskBlocks[bIdx]
    if (!spliced.includes(diskBlock)) {
      return false
    }
  }
  return true
}
