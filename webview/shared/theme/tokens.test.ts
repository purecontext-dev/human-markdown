// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { type ThemeTokens, applyTheme, darkTheme, githubTheme, lightTheme, themes } from './tokens'

describe('theme tokens', () => {
  const requiredKeys: (keyof ThemeTokens)[] = [
    '--hm-font-body',
    '--hm-font-code',
    '--hm-font-size',
    '--hm-line-height',
    '--hm-max-width',
    '--hm-color-text',
    '--hm-color-text-muted',
    '--hm-color-heading',
    '--hm-color-bg',
    '--hm-color-bg-secondary',
    '--hm-color-border',
    '--hm-color-link',
    '--hm-color-code-bg',
    '--hm-color-code-text',
    '--hm-color-blockquote-border',
    '--hm-color-blockquote-text',
    '--hm-color-table-border',
    '--hm-color-table-header-bg',
    '--hm-color-frontmatter-bg',
    '--hm-color-frontmatter-border',
  ]

  it('light theme defines all required tokens', () => {
    for (const key of requiredKeys) {
      expect(lightTheme[key]).toBeTruthy()
    }
  })

  it('dark theme defines all required tokens', () => {
    for (const key of requiredKeys) {
      expect(darkTheme[key]).toBeTruthy()
    }
  })

  it('github theme defines all required tokens', () => {
    for (const key of requiredKeys) {
      expect(githubTheme[key]).toBeTruthy()
    }
  })

  it('github theme differs from light theme', () => {
    const diffs = requiredKeys.filter((k) => githubTheme[k] !== lightTheme[k])
    expect(diffs.length).toBeGreaterThan(0)
  })

  it('themes map contains all named themes', () => {
    expect(themes.light).toBe(lightTheme)
    expect(themes.dark).toBe(darkTheme)
    expect(themes.github).toBe(githubTheme)
  })

  it('applyTheme sets CSS custom properties on element', () => {
    const root = document.createElement('div')
    applyTheme(lightTheme, root)
    expect(root.style.getPropertyValue('--hm-color-bg')).toBe('#ffffff')
    expect(root.style.getPropertyValue('--hm-font-size')).toBe('15px')
  })
})
