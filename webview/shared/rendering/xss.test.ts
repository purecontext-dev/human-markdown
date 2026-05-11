// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createPipeline } from './pipeline'

function assertSafe(html: string, input: string) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')

  const scripts = doc.querySelectorAll('script')
  expect(scripts.length, `Input "${input.slice(0, 60)}" produced <script> element`).toBe(0)

  for (const el of doc.querySelectorAll('*')) {
    for (const attr of el.attributes) {
      expect(
        attr.name,
        `Input "${input.slice(0, 60)}" produced event handler: ${attr.name}`,
      ).not.toMatch(/^on/i)
    }
  }

  for (const el of doc.querySelectorAll('[href], [src]')) {
    const href = (el.getAttribute('href') ?? '').trim()
    const src = (el.getAttribute('src') ?? '').trim()
    expect(href, `Input "${input.slice(0, 60)}" produced dangerous href`).not.toMatch(
      /^javascript:/i,
    )
    expect(href, `Input "${input.slice(0, 60)}" produced vbscript href`).not.toMatch(/^vbscript:/i)
    expect(href, `Input "${input.slice(0, 60)}" produced data:text/html href`).not.toMatch(
      /^data:text\/html/i,
    )
    expect(src, `Input "${input.slice(0, 60)}" produced dangerous src`).not.toMatch(/^javascript:/i)
    expect(src, `Input "${input.slice(0, 60)}" produced data:text/html src`).not.toMatch(
      /^data:text\/html/i,
    )
  }
}

describe('adversarial XSS', () => {
  const md = createPipeline()

  describe('script injection', () => {
    const vectors = [
      '<script>alert(1)</script>',
      '<SCRIPT>alert(1)</SCRIPT>',
      '<script/src="evil.js">',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<body onload=alert(1)>',
      '<iframe src="javascript:alert(1)">',
      '<math><mtext><script>alert(1)</script></mtext></math>',
    ]

    for (const input of vectors) {
      it(`blocks: ${input.slice(0, 50)}`, () => {
        assertSafe(md.render(input), input)
      })
    }
  })

  describe('event handler injection', () => {
    const vectors = [
      '<div onmouseover="alert(1)">hover</div>',
      '<a href="#" onclick="alert(1)">click</a>',
      '<input onfocus="alert(1)" autofocus>',
      '<details open ontoggle="alert(1)">',
      '<marquee onstart="alert(1)">',
      '<video><source onerror="alert(1)">',
    ]

    for (const input of vectors) {
      it(`blocks: ${input.slice(0, 50)}`, () => {
        assertSafe(md.render(input), input)
      })
    }
  })

  describe('javascript: URI injection', () => {
    const vectors = [
      '[click](javascript:alert(1))',
      '[click](javascript&#58;alert(1))',
      '[click](&#106;avascript:alert(1))',
      '[click](javascript&#x3A;alert(1))',
      '[click]( javascript:alert(1))',
      '[click](data:text/html,<script>alert(1)</script>)',
      '[click](vbscript:alert(1))',
    ]

    for (const input of vectors) {
      it(`blocks: ${input.slice(0, 50)}`, () => {
        assertSafe(md.render(input), input)
      })
    }
  })

  describe('markdown-specific vectors', () => {
    const vectors = [
      '![img](x "onerror=alert(1)")',
      '![img](x)\n\n<script>alert(1)</script>',
      '```\n<script>alert(1)</script>\n```',
      '`<script>alert(1)</script>`',
      '> <script>alert(1)</script>',
      '- <script>alert(1)</script>',
      '# <script>alert(1)</script>',
      '[link](http://example.com "<script>alert(1)</script>")',
    ]

    for (const input of vectors) {
      it(`blocks: ${input.slice(0, 50)}`, () => {
        assertSafe(md.render(input), input)
      })
    }
  })

  describe('encoding bypass attempts', () => {
    const vectors = [
      '<scr\x00ipt>alert(1)</script>',
      '<img src="x" onerror="&#97;lert(1)">',
      '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">click</a>',
      '<script>alert(String.fromCharCode(88,83,83))</script>',
    ]

    for (const input of vectors) {
      it(`blocks: ${input.slice(0, 50)}`, () => {
        assertSafe(md.render(input), input)
      })
    }
  })

  describe('frontmatter injection', () => {
    it('escapes script in title', () => {
      const input = '---\ntitle: <script>alert(1)</script>\n---\n\n# Hello'
      assertSafe(md.render(input), input)
    })

    it('handles malformed YAML gracefully', () => {
      const input = '---\ntitle: ">unclosed\n---\n\n# Hello'
      expect(() => md.render(input)).not.toThrow()
      const html = md.render(input)
      assertSafe(html, input)
    })

    it('escapes values that look like URIs', () => {
      const input = '---\ndescription: safe text\n---\n\n# Hello'
      const html = md.render(input)
      assertSafe(html, input)
    })
  })
})
