// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeSvg } from './sanitize-svg'

describe('sanitizeSvg', () => {
  it('strips script elements', () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect/></svg>'
    const result = sanitizeSvg(input)
    expect(result).not.toContain('<script')
    expect(result).toContain('<rect')
  })

  it('preserves foreignObject with allowed HTML tags', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><div><span>label</span></div></body></foreignObject></svg>'
    const result = sanitizeSvg(input)
    expect(result).toContain('foreignObject')
    expect(result).toContain('label')
  })

  it('strips dangerous elements inside foreignObject', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script><p>safe</p></body></foreignObject></svg>'
    const result = sanitizeSvg(input)
    expect(result).not.toContain('script')
    expect(result).toContain('safe')
  })

  it('strips disallowed HTML tags inside foreignObject', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(1)"/><p>text</p></body></foreignObject></svg>'
    const result = sanitizeSvg(input)
    expect(result).not.toContain('img')
    expect(result).toContain('text')
  })

  it('strips iframe, object, and embed elements', () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg"><iframe/><object/><embed/><rect/></svg>'
    const result = sanitizeSvg(input)
    expect(result).not.toContain('iframe')
    expect(result).not.toContain('object')
    expect(result).not.toContain('embed')
    expect(result).toContain('rect')
  })

  it('strips on* event handler attributes', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" onload="alert(2)"/></svg>'
    const result = sanitizeSvg(input)
    expect(result).not.toContain('onclick')
    expect(result).not.toContain('onload')
  })

  it('strips href with javascript: protocol', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>click</text></a></svg>'
    const result = sanitizeSvg(input)
    expect(result).not.toContain('javascript:')
  })

  it('strips href with data: protocol', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;"><text>click</text></a></svg>'
    const result = sanitizeSvg(input)
    expect(result).not.toContain('href')
  })

  it('preserves href with fragment references', () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg"><use href="#icon-check"/></svg>'
    const result = sanitizeSvg(input)
    expect(result).toContain('href="#icon-check"')
  })

  it('throws on malformed SVG', () => {
    const input = '<svg><not-closed'
    expect(() => sanitizeSvg(input)).toThrow()
  })

  it('passes benign SVG through intact', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="blue"/></svg>'
    const result = sanitizeSvg(input)
    expect(result).toContain('rect')
    expect(result).toContain('viewBox')
    expect(result).toContain('fill="blue"')
  })
})
