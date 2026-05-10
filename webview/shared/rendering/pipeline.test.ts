import { describe, expect, it } from 'vitest'
import { createPipeline } from './pipeline'

describe('rendering pipeline', () => {
  describe('GFM baseline', () => {
    it('renders tables', () => {
      const md = createPipeline()
      const html = md.render('| a | b |\n|---|---|\n| 1 | 2 |')
      expect(html).toContain('<table>')
      expect(html).toContain('<td>1</td>')
      expect(html).toContain('<td>2</td>')
    })

    it('renders strikethrough', () => {
      const md = createPipeline()
      const html = md.render('~~deleted~~')
      expect(html).toContain('<s>deleted</s>')
    })

    it('renders task lists', () => {
      const md = createPipeline()
      const html = md.render('- [x] done\n- [ ] todo')
      expect(html).toContain('checked')
      expect(html).toContain('task-list-item')
    })

    it('renders autolinks', () => {
      const md = createPipeline()
      const html = md.render('Visit https://example.com for details')
      expect(html).toContain('<a href="https://example.com"')
    })
  })

  describe('footnotes', () => {
    it('renders footnote references and definitions', () => {
      const md = createPipeline()
      const html = md.render('Text with a footnote[^1]\n\n[^1]: Footnote content')
      expect(html).toContain('footnote')
    })
  })

  describe('heading anchors', () => {
    it('adds id attributes to headings', () => {
      const md = createPipeline()
      const html = md.render('# Hello World')
      expect(html).toContain('id="hello-world"')
    })
  })

  describe('custom containers', () => {
    it('renders warning container', () => {
      const md = createPipeline()
      const html = md.render('::: warning\nBe careful!\n:::')
      expect(html).toContain('warning')
    })

    it('renders info container', () => {
      const md = createPipeline()
      const html = md.render('::: info\nNote this.\n:::')
      expect(html).toContain('info')
    })
  })

  describe('math', () => {
    it('renders inline math as placeholder', () => {
      const md = createPipeline()
      const html = md.render('The formula $E=mc^2$ is famous')
      expect(html).toContain('class="math-inline"')
      expect(html).toContain('E=mc^2')
    })

    it('renders display math as placeholder', () => {
      const md = createPipeline()
      const html = md.render('$$\nx^2 + y^2 = z^2\n$$')
      expect(html).toContain('class="math-display"')
      expect(html).toContain('x^2 + y^2 = z^2')
    })
  })

  describe('mermaid', () => {
    it('renders mermaid fence as placeholder div', () => {
      const md = createPipeline()
      const html = md.render('```mermaid\ngraph TD\n  A --> B\n```')
      expect(html).toContain('class="mermaid"')
      expect(html).toContain('data-mermaid')
      expect(html).not.toContain('<pre>')
    })

    it('renders non-mermaid fences normally', () => {
      const md = createPipeline()
      const html = md.render('```javascript\nconst x = 1\n```')
      expect(html).toContain('<pre>')
      expect(html).toContain('<code')
      expect(html).not.toContain('data-mermaid')
    })
  })

  describe('code block copy button', () => {
    it('wraps code blocks with copy button', () => {
      const md = createPipeline()
      const html = md.render('```js\nconst x = 1\n```')
      expect(html).toContain('code-block-wrapper')
      expect(html).toContain('copy-button')
      expect(html).toContain('aria-label="Copy code"')
    })
  })

  describe('frontmatter', () => {
    it('renders frontmatter as metadata card', () => {
      const md = createPipeline()
      const html = md.render('---\ntitle: Hello\nauthor: Test\n---\n\n# Content')
      expect(html).toContain('frontmatter-card')
      expect(html).toContain('Hello')
      expect(html).toContain('Test')
      expect(html).toContain('<h1')
    })

    it('renders markdown without frontmatter normally', () => {
      const md = createPipeline()
      const html = md.render('# No frontmatter here')
      expect(html).not.toContain('frontmatter-card')
      expect(html).toContain('<h1')
    })
  })

  describe('security', () => {
    it('escapes HTML in frontmatter values', () => {
      const md = createPipeline()
      const html = md.render('---\ntitle: <script>alert("xss")</script>\n---\n\nContent')
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('escapes HTML in math content', () => {
      const md = createPipeline()
      const html = md.render('$<img onerror=alert(1)>$')
      expect(html).not.toContain('<img')
      expect(html).toContain('&lt;img')
    })

    it('escapes HTML in mermaid content', () => {
      const md = createPipeline()
      const html = md.render('```mermaid\n<script>alert(1)</script>\n```')
      expect(html).not.toContain('<script>')
    })

    it('does not render raw HTML in markdown', () => {
      const md = createPipeline()
      const html = md.render('<script>alert("xss")</script>')
      expect(html).not.toContain('<script>')
    })
  })
})
