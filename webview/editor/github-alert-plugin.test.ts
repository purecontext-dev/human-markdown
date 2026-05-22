import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'
import { describe, expect, it } from 'vitest'
import { convertAlertsToBlockquotes, remarkGithubAlerts } from './github-alert-plugin'

interface MdastNode {
  type: string
  value?: string
  alertType?: string
  children?: MdastNode[]
}

function parseWithAlerts(md: string): MdastNode {
  const processor = unified().use(remarkParse).use(remarkGithubAlerts)
  const tree = processor.parse(md)
  return processor.runSync(tree) as unknown as MdastNode
}

function roundTrip(md: string): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGithubAlerts)
    .use(remarkStringify, { bullet: '-', rule: '-' })

  const origStringify = processor.stringify.bind(processor)
  // biome-ignore lint/suspicious/noExplicitAny: patching unified processor internals
  processor.stringify = (tree: any, ...args: any[]) => {
    convertAlertsToBlockquotes(tree)
    const result = origStringify(tree, ...args) as string
    return result.replace(/\\\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gi, '[!$1]')
  }

  return String(processor.processSync(md))
}

describe('spike: raw MDAST structure', () => {
  it('shows how remark parses alert blockquote', () => {
    const tree = unified()
      .use(remarkParse)
      .parse('> [!NOTE]\n> This is a note.') as unknown as MdastNode
    const bq = tree.children?.[0]
    expect(bq.type).toBe('blockquote')
    const para = bq.children?.[0]
    expect(para.type).toBe('paragraph')
    const text = para.children?.[0]
    expect(text.type).toBe('text')
    expect(text.value).toContain('[!NOTE]')
  })
})

describe('spike: custom remark transform', () => {
  it('transforms alert blockquote to github_alert node', () => {
    const tree = parseWithAlerts('> [!NOTE]\n> This is a note.')
    const alert = tree.children?.[0]
    expect(alert.type).toBe('github_alert')
    expect(alert.alertType).toBe('note')
    expect(alert.children?.length).toBeGreaterThan(0)
    const bodyPara = alert.children?.[0]
    expect(bodyPara.type).toBe('paragraph')
    const text = bodyPara.children?.map((c) => c.value || '').join('')
    expect(text).not.toContain('[!NOTE]')
    expect(text).toContain('This is a note.')
  })

  it('leaves regular blockquotes alone', () => {
    const tree = parseWithAlerts('> Just a regular blockquote.')
    const bq = tree.children?.[0]
    expect(bq.type).toBe('blockquote')
  })

  it('handles all five alert types', () => {
    for (const type of ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']) {
      const tree = parseWithAlerts(`> [!${type}]\n> Content.`)
      const alert = tree.children?.[0]
      expect(alert.type).toBe('github_alert')
      expect(alert.alertType).toBe(type.toLowerCase())
    }
  })

  it('handles multi-paragraph alerts', () => {
    const md = '> [!WARNING]\n> First paragraph.\n>\n> Second paragraph.'
    const tree = parseWithAlerts(md)
    const alert = tree.children?.[0]
    expect(alert.type).toBe('github_alert')
    expect(alert.alertType).toBe('warning')
    expect(alert.children?.length).toBe(2)
  })

  it('handles alert followed by regular blockquote', () => {
    const md = '> [!NOTE]\n> This is a note.\n\n> Regular blockquote.'
    const tree = parseWithAlerts(md)
    expect(tree.children?.[0].type).toBe('github_alert')
    expect(tree.children?.[1].type).toBe('blockquote')
  })

  it('handles alert with only type, no body text on same line', () => {
    const md = '> [!TIP]\n>\n> Body here.'
    const tree = parseWithAlerts(md)
    const alert = tree.children?.[0]
    expect(alert.type).toBe('github_alert')
    expect(alert.alertType).toBe('tip')
    const bodyPara = alert.children?.[0]
    const text = bodyPara.children?.map((c) => c.value || '').join('')
    expect(text).toContain('Body here.')
  })

  it('handles empty-body alert without crashing', () => {
    const tree = parseWithAlerts('> [!NOTE]')
    const alert = tree.children?.[0]
    expect(alert.type).toBe('github_alert')
    expect(alert.alertType).toBe('note')
    expect(alert.children?.length).toBeGreaterThan(0)
  })
})

describe('spike: round-trip fidelity', () => {
  it('round-trips a simple alert', () => {
    const input = '> [!NOTE]\n> This is a note.\n'
    const output = roundTrip(input)
    expect(output).toBe(input)
  })

  it('round-trips a multi-paragraph alert', () => {
    const input = '> [!WARNING]\n> First paragraph.\n>\n> Second paragraph.\n'
    const output = roundTrip(input)
    expect(output).toBe(input)
  })

  it('round-trips alert with inline formatting', () => {
    const input = '> [!TIP]\n> Use `code` and **bold** in alerts.\n'
    const output = roundTrip(input)
    expect(output).toBe(input)
  })

  it('normalizes blank-line-after-type to inline format', () => {
    const input = '> [!IMPORTANT]\n>\n> Content after blank line.\n'
    const output = roundTrip(input)
    expect(output).toBe('> [!IMPORTANT]\n> Content after blank line.\n')
  })

  it('round-trips mixed alerts and regular blockquotes', () => {
    const input = '> [!NOTE]\n> A note.\n\n> Regular quote.\n\n> [!CAUTION]\n> Be careful.\n'
    const output = roundTrip(input)
    expect(output).toBe(input)
  })

  it('is idempotent', () => {
    const input = '> [!NOTE]\n> This is a note.\n'
    const first = roundTrip(input)
    const second = roundTrip(first)
    expect(second).toBe(first)
  })
})
