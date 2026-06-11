import { describe, expect, it } from 'vitest'
import { buildSourceMap, spliceContent } from './source-splice'

describe('buildSourceMap', () => {
  it('splits disk and baseline into blocks on blank lines', () => {
    const disk = '# Title\n\nParagraph one.\n\nParagraph two.\n'
    const baseline = '# Title\n\nParagraph one.\n\nParagraph two.\n'
    const map = buildSourceMap(disk, baseline)
    expect(map.diskBlocks).toEqual(['# Title', 'Paragraph one.', 'Paragraph two.'])
    expect(map.baselineBlocks).toEqual(['# Title', 'Paragraph one.', 'Paragraph two.'])
  })

  it('handles single-block documents', () => {
    const disk = '# Just a heading\n'
    const baseline = '# Just a heading\n'
    const map = buildSourceMap(disk, baseline)
    expect(map.diskBlocks).toEqual(['# Just a heading'])
    expect(map.baselineBlocks).toEqual(['# Just a heading'])
  })

  it('preserves block count even when content differs between disk and baseline', () => {
    const disk = '_italic_ text\n\n**bold** text\n'
    const baseline = '*italic* text\n\n**bold** text\n'
    const map = buildSourceMap(disk, baseline)
    expect(map.diskBlocks).toHaveLength(2)
    expect(map.baselineBlocks).toHaveLength(2)
  })
})

describe('spliceContent', () => {
  it('returns disk bytes for unchanged blocks and live bytes for edited blocks', () => {
    const disk = '_italic_ text\n\n**bold** text\n\nUnchanged paragraph.\n'
    const baseline = '*italic* text\n\n**bold** text\n\nUnchanged paragraph.\n'
    const map = buildSourceMap(disk, baseline)

    // User edited the second block
    const live = '*italic* text\n\nEdited block.\n\nUnchanged paragraph.\n'
    const result = spliceContent(map, live)

    // First block: unchanged in live vs baseline → disk bytes preserved
    expect(result).toContain('_italic_ text')
    // Second block: edited → live serialization used
    expect(result).toContain('Edited block.')
    // Third block: unchanged → disk bytes preserved
    expect(result).toContain('Unchanged paragraph.')
    // The drift from _italic_ → *italic* should NOT happen
    expect(result).not.toContain('*italic* text')
  })

  it('preserves disk blank-line separators', () => {
    const disk = '# Title\n\n\nBody text.\n'
    const baseline = '# Title\n\nBody text.\n'
    const map = buildSourceMap(disk, baseline)

    // disk has triple newline separator but same block count
    // baseline normalized it to double. Block count matches, splice is valid.
    // Wait — disk has 2 blocks, baseline has 2 blocks. The separator
    // in disk is \n\n\n (3 newlines). The splice should preserve that.
    const live = '# Title\n\nEdited body.\n'
    const result = spliceContent(map, live)
    // Title unchanged → disk bytes. Separator from disk (\n\n\n). Body edited → live.
    expect(result).toBe('# Title\n\n\nEdited body.\n')
  })

  it('falls back to full live when disk and baseline block counts differ', () => {
    // Setext heading: disk has "Title\n===" (1 block in text), but after parse
    // the baseline has "# Title" (still 1 block). Actually these would be the
    // same block count. Let me construct a real mismatch.
    const disk = 'Block A\n\nBlock B\n\nBlock C\n'
    const baseline = 'Block A\n\nMerged B and C\n'
    const map = buildSourceMap(disk, baseline)
    expect(map.diskBlocks).toHaveLength(3)
    expect(map.baselineBlocks).toHaveLength(2)

    const live = 'Block A\n\nMerged B and C edited\n'
    const result = spliceContent(map, live)
    // Should fall back to full live serialization
    expect(result).toBe(live)
  })

  it('falls back to full live when no blocks match', () => {
    const disk = 'Old A\n\nOld B\n'
    const baseline = 'Baseline A\n\nBaseline B\n'
    const map = buildSourceMap(disk, baseline)

    const live = 'Completely new X\n\nCompletely new Y\n'
    const result = spliceContent(map, live)
    expect(result).toBe(live)
  })

  it('handles a user adding new blocks (insertion)', () => {
    const disk = '_italic_\n\nEnd.\n'
    const baseline = '*italic*\n\nEnd.\n'
    const map = buildSourceMap(disk, baseline)

    // User added a block between them
    const live = '*italic*\n\nNew paragraph.\n\nEnd.\n'
    const result = spliceContent(map, live)

    // Unchanged blocks use disk bytes, new block uses live
    expect(result).toContain('_italic_')
    expect(result).toContain('New paragraph.')
    expect(result).toContain('End.')
    expect(result).not.toContain('*italic*')
  })

  it('handles a user deleting a block', () => {
    const disk = '_italic_\n\nMiddle.\n\nEnd.\n'
    const baseline = '*italic*\n\nMiddle.\n\nEnd.\n'
    const map = buildSourceMap(disk, baseline)

    // User deleted the middle block
    const live = '*italic*\n\nEnd.\n'
    const result = spliceContent(map, live)

    expect(result).toContain('_italic_')
    expect(result).toContain('End.')
    expect(result).not.toContain('Middle.')
    expect(result).not.toContain('*italic*')
  })

  it('falls back when duplicate normalized blocks have different disk bytes', () => {
    const disk = '_same_\n\n*same*\n\nEnd.\n'
    const baseline = '*same*\n\n*same*\n\nEnd.\n'
    const map = buildSourceMap(disk, baseline)

    // Deleting one duplicate leaves a normalized block that LCS could map to
    // either original disk block. Full live serialization is safer than
    // preserving the wrong byte-for-byte source.
    const live = '*same*\n\nEnd.\n'
    const result = spliceContent(map, live)

    expect(result).toBe(live)
  })

  it('falls back when byte-specific duplicate positions shift after insertion', () => {
    const disk = '_same_\n\n*same*\n\nEnd.\n'
    const baseline = '*same*\n\n*same*\n\nEnd.\n'
    const map = buildSourceMap(disk, baseline)

    const live = '*same*\n\nChanged first original.\n\n*same*\n\nEnd.\n'
    const result = spliceContent(map, live)

    expect(result).toBe(live)
  })

  it('preserves positional disk bytes when byte-specific duplicates all survive', () => {
    const disk = '_same_\n\n*same*\n\nEnd.\n'
    const baseline = '*same*\n\n*same*\n\nEnd.\n'
    const map = buildSourceMap(disk, baseline)

    const live = '*same*\n\n*same*\n\nEdited.\n'
    const result = spliceContent(map, live)

    expect(result).toBe('_same_\n\n*same*\n\nEdited.\n')
  })

  it('keeps splicing duplicate normalized blocks when disk bytes are identical', () => {
    const disk = '*same*\n\n*same*\n\n_italic_\n'
    const baseline = '*same*\n\n*same*\n\n*italic*\n'
    const map = buildSourceMap(disk, baseline)

    const live = '*same*\n\n*same*\n\nEdited.\n'
    const result = spliceContent(map, live)

    expect(result).toContain('*same*\n\n*same*')
    expect(result).toContain('Edited.')
    expect(result).not.toContain('*italic*')
  })

  it('handles empty documents gracefully', () => {
    const disk = '\n'
    const baseline = '\n'
    const map = buildSourceMap(disk, baseline)

    const live = '\n'
    const result = spliceContent(map, live)
    expect(result).toBe(live)
  })

  it('preserves trailing newline style from disk', () => {
    const disk = '# Title\n\nBody.\n'
    const baseline = '# Title\n\nBody.\n'
    const map = buildSourceMap(disk, baseline)

    const live = '# Title\n\nBody.\n'
    const result = spliceContent(map, live)
    expect(result).toBe(disk)
    expect(result.endsWith('\n')).toBe(true)
  })

  it('handles multiple consecutive edits correctly', () => {
    const disk = 'A _em_\n\nB\n\nC _em_\n\nD\n'
    const baseline = 'A *em*\n\nB\n\nC *em*\n\nD\n'
    const map = buildSourceMap(disk, baseline)

    // Edited B and D, left A and C unchanged
    const live = 'A *em*\n\nB edited\n\nC *em*\n\nD edited\n'
    const result = spliceContent(map, live)

    expect(result).toContain('A _em_')
    expect(result).toContain('B edited')
    expect(result).toContain('C _em_')
    expect(result).toContain('D edited')
    expect(result).not.toContain('A *em*')
    expect(result).not.toContain('C *em*')
  })
})

describe('spliceContent with list marker drift', () => {
  it('preserves * list markers on untouched list blocks', () => {
    const disk = '# Title\n\n* Item one\n* Item two\n\nParagraph.\n'
    const baseline = '# Title\n\n- Item one\n- Item two\n\nParagraph.\n'
    const map = buildSourceMap(disk, baseline)

    // User edited the paragraph only
    const live = '# Title\n\n- Item one\n- Item two\n\nEdited paragraph.\n'
    const result = spliceContent(map, live)

    expect(result).toContain('* Item one')
    expect(result).toContain('* Item two')
    expect(result).toContain('Edited paragraph.')
    expect(result).not.toContain('- Item one')
  })

  it('preserves + list markers on untouched list blocks', () => {
    const disk = '+ First\n+ Second\n'
    const baseline = '- First\n- Second\n'
    const map = buildSourceMap(disk, baseline)

    const live = '- First\n- Second\n'
    const result = spliceContent(map, live)
    expect(result).toContain('+ First')
  })
})

describe('spliceContent with emphasis drift', () => {
  it('preserves _italic_ on untouched blocks while editing another', () => {
    const disk = 'Some _italic_ words.\n\nAnother paragraph.\n'
    const baseline = 'Some *italic* words.\n\nAnother paragraph.\n'
    const map = buildSourceMap(disk, baseline)

    const live = 'Some *italic* words.\n\nEdited paragraph.\n'
    const result = spliceContent(map, live)

    expect(result).toContain('_italic_')
    expect(result).not.toContain('*italic*')
    expect(result).toContain('Edited paragraph.')
  })

  it('preserves __bold__ on untouched blocks', () => {
    const disk = 'Some __bold__ words.\n\nEnd.\n'
    const baseline = 'Some **bold** words.\n\nEnd.\n'
    const map = buildSourceMap(disk, baseline)

    const live = 'Some **bold** words.\n\nEdited.\n'
    const result = spliceContent(map, live)

    expect(result).toContain('__bold__')
    expect(result).not.toContain('**bold**')
  })
})
