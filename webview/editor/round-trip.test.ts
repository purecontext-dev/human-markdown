// @vitest-environment jsdom
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  remarkCtx,
  remarkStringifyOptionsCtx,
  rootCtx,
  serializerCtx,
} from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { describe, expect, it } from 'vitest'
import { patchRemarkForTightLists } from '../shared/remark-tight-lists'
import { mathDisplaySchema, mathInlineSchema, remarkMathPlugin } from './math-plugin'

const fixturesDir = join(__dirname, '__fixtures__')

const STRINGIFY_OPTIONS = {
  bullet: '-' as const,
  rule: '-' as const,
}

function getFixtures(): { name: string; content: string }[] {
  return readdirSync(fixturesDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({
      name: f.replace('.md', ''),
      content: readFileSync(join(fixturesDir, f), 'utf-8'),
    }))
}

async function roundTrip(markdown: string): Promise<string> {
  const root = document.createElement('div')
  document.body.appendChild(root)

  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, markdown)
      ctx.set(remarkStringifyOptionsCtx, STRINGIFY_OPTIONS)
    })
    .use(commonmark)
    .use(gfm)
    .use(remarkMathPlugin)
    .use(mathDisplaySchema)
    .use(mathInlineSchema)
    .create()

  editor.action((ctx) => {
    patchRemarkForTightLists(ctx.get(remarkCtx))
  })

  const serialized = editor.action((ctx) => {
    const serializer = ctx.get(serializerCtx)
    const view = ctx.get(editorViewCtx)
    return serializer(view.state.doc)
  })

  await editor.destroy()
  root.remove()

  return serialized
}

describe('round-trip fidelity', () => {
  const fixtures = getFixtures()

  it('has at least 5 fixture files', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(5)
  })

  const exactFixtures = ['basic-formatting', 'code-blocks', 'lists', 'mixed-content', 'math']
  const driftFixtures = ['gfm-features', 'tables']

  describe('exact preservation', () => {
    for (const name of exactFixtures) {
      const fixture = fixtures.find((f) => f.name === name) as (typeof fixtures)[number]
      it(`preserves ${name}`, async () => {
        const output = await roundTrip(fixture.content)
        expect(output.trim()).toBe(fixture.content.trim())
      })
    }
  })

  describe('known formatting drift (expected failures)', () => {
    for (const name of driftFixtures) {
      const fixture = fixtures.find((f) => f.name === name) as (typeof fixtures)[number]
      it.fails(`preserves ${name}`, async () => {
        const output = await roundTrip(fixture.content)
        expect(output.trim()).toBe(fixture.content.trim())
      })
    }
  })

  describe('idempotency (second round-trip matches first)', () => {
    for (const fixture of fixtures) {
      it(`is idempotent for ${fixture.name}`, async () => {
        const first = await roundTrip(fixture.content)
        const second = await roundTrip(first)
        expect(second.trim()).toBe(first.trim())
      })
    }
  })

  describe('known formatting changes', () => {
    it('wraps bare URLs in angle brackets', async () => {
      const input = 'Visit https://example.com for details.\n'
      const output = await roundTrip(input)
      expect(output).toContain('<https://example.com>')
    })

    it('pads table columns for alignment', async () => {
      const input = '| a | b |\n| --- | --- |\n| 1 | 2 |\n'
      const output = await roundTrip(input)
      expect(output).toMatch(/\|\s+a\s+\|\s+b\s+\|/)
    })
  })
})
