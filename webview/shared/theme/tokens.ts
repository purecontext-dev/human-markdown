export interface ThemeTokens {
  '--hm-font-body': string
  '--hm-font-code': string
  '--hm-font-size': string
  '--hm-line-height': string
  '--hm-max-width': string
  '--hm-color-text': string
  '--hm-color-text-muted': string
  '--hm-color-heading': string
  '--hm-color-bg': string
  '--hm-color-bg-secondary': string
  '--hm-color-border': string
  '--hm-color-link': string
  '--hm-color-code-bg': string
  '--hm-color-code-text': string
  '--hm-color-blockquote-border': string
  '--hm-color-blockquote-text': string
  '--hm-color-table-border': string
  '--hm-color-table-header-bg': string
  '--hm-color-frontmatter-bg': string
  '--hm-color-frontmatter-border': string
  '--hm-color-alert-note-border': string
  '--hm-color-alert-note-bg': string
  '--hm-color-alert-note-icon': string
  '--hm-color-alert-tip-border': string
  '--hm-color-alert-tip-bg': string
  '--hm-color-alert-tip-icon': string
  '--hm-color-alert-important-border': string
  '--hm-color-alert-important-bg': string
  '--hm-color-alert-important-icon': string
  '--hm-color-alert-warning-border': string
  '--hm-color-alert-warning-bg': string
  '--hm-color-alert-warning-icon': string
  '--hm-color-alert-caution-border': string
  '--hm-color-alert-caution-bg': string
  '--hm-color-alert-caution-icon': string
}

export type ThemeName = 'auto' | 'light' | 'dark' | 'github'

export const lightTheme: ThemeTokens = {
  '--hm-font-body':
    '-apple-system, BlinkMacSystemFont, "Segoe UI Adjusted", "Segoe UI", "Liberation Sans", sans-serif',
  '--hm-font-code':
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  '--hm-font-size': '15px',
  '--hm-line-height': '1.4',
  '--hm-max-width': '800px',
  '--hm-color-text': '#1f2328',
  '--hm-color-text-muted': '#656d76',
  '--hm-color-heading': '#1f2328',
  '--hm-color-bg': '#ffffff',
  '--hm-color-bg-secondary': '#f6f8fa',
  '--hm-color-border': '#d1d9e0',
  '--hm-color-link': '#0969da',
  '--hm-color-code-bg': '#eff1f3',
  '--hm-color-code-text': '#1f2328',
  '--hm-color-blockquote-border': '#d1d9e0',
  '--hm-color-blockquote-text': '#656d76',
  '--hm-color-table-border': '#d1d9e0',
  '--hm-color-table-header-bg': '#f6f8fa',
  '--hm-color-frontmatter-bg': '#f6f8fa',
  '--hm-color-frontmatter-border': '#d1d9e0',
  '--hm-color-alert-note-border': '#0969da',
  '--hm-color-alert-note-bg': 'rgba(9, 105, 218, 0.08)',
  '--hm-color-alert-note-icon': '#0969da',
  '--hm-color-alert-tip-border': '#1a7f37',
  '--hm-color-alert-tip-bg': 'rgba(26, 127, 55, 0.08)',
  '--hm-color-alert-tip-icon': '#1a7f37',
  '--hm-color-alert-important-border': '#8250df',
  '--hm-color-alert-important-bg': 'rgba(130, 80, 223, 0.08)',
  '--hm-color-alert-important-icon': '#8250df',
  '--hm-color-alert-warning-border': '#9a6700',
  '--hm-color-alert-warning-bg': 'rgba(154, 103, 0, 0.08)',
  '--hm-color-alert-warning-icon': '#9a6700',
  '--hm-color-alert-caution-border': '#cf222e',
  '--hm-color-alert-caution-bg': 'rgba(207, 34, 46, 0.08)',
  '--hm-color-alert-caution-icon': '#cf222e',
}

export const darkTheme: ThemeTokens = {
  '--hm-font-body':
    '-apple-system, BlinkMacSystemFont, "Segoe UI Adjusted", "Segoe UI", "Liberation Sans", sans-serif',
  '--hm-font-code':
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  '--hm-font-size': '15px',
  '--hm-line-height': '1.4',
  '--hm-max-width': '800px',
  '--hm-color-text': '#e6edf3',
  '--hm-color-text-muted': '#8b949e',
  '--hm-color-heading': '#f0f6fc',
  '--hm-color-bg': '#0d1117',
  '--hm-color-bg-secondary': '#161b22',
  '--hm-color-border': '#30363d',
  '--hm-color-link': '#58a6ff',
  '--hm-color-code-bg': '#161b22',
  '--hm-color-code-text': '#e6edf3',
  '--hm-color-blockquote-border': '#30363d',
  '--hm-color-blockquote-text': '#8b949e',
  '--hm-color-table-border': '#30363d',
  '--hm-color-table-header-bg': '#161b22',
  '--hm-color-frontmatter-bg': '#161b22',
  '--hm-color-frontmatter-border': '#30363d',
  '--hm-color-alert-note-border': '#58a6ff',
  '--hm-color-alert-note-bg': 'rgba(88, 166, 255, 0.1)',
  '--hm-color-alert-note-icon': '#58a6ff',
  '--hm-color-alert-tip-border': '#3fb950',
  '--hm-color-alert-tip-bg': 'rgba(63, 185, 80, 0.1)',
  '--hm-color-alert-tip-icon': '#3fb950',
  '--hm-color-alert-important-border': '#a371f7',
  '--hm-color-alert-important-bg': 'rgba(163, 113, 247, 0.1)',
  '--hm-color-alert-important-icon': '#a371f7',
  '--hm-color-alert-warning-border': '#d29922',
  '--hm-color-alert-warning-bg': 'rgba(210, 153, 34, 0.1)',
  '--hm-color-alert-warning-icon': '#d29922',
  '--hm-color-alert-caution-border': '#f85149',
  '--hm-color-alert-caution-bg': 'rgba(248, 81, 73, 0.1)',
  '--hm-color-alert-caution-icon': '#f85149',
}

export const githubTheme: ThemeTokens = {
  '--hm-font-body':
    '-apple-system, BlinkMacSystemFont, "Segoe UI Adjusted", "Segoe UI", "Liberation Sans", sans-serif',
  '--hm-font-code':
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  '--hm-font-size': '15px',
  '--hm-line-height': '1.4',
  '--hm-max-width': '1012px',
  '--hm-color-text': '#1f2328',
  '--hm-color-text-muted': '#656d76',
  '--hm-color-heading': '#1f2328',
  '--hm-color-bg': '#ffffff',
  '--hm-color-bg-secondary': '#f6f8fa',
  '--hm-color-border': '#d0d7de',
  '--hm-color-link': '#0969da',
  '--hm-color-code-bg': 'rgba(175, 184, 193, 0.2)',
  '--hm-color-code-text': '#1f2328',
  '--hm-color-blockquote-border': '#d0d7de',
  '--hm-color-blockquote-text': '#656d76',
  '--hm-color-table-border': '#d0d7de',
  '--hm-color-table-header-bg': '#f6f8fa',
  '--hm-color-frontmatter-bg': '#f6f8fa',
  '--hm-color-frontmatter-border': '#d0d7de',
  '--hm-color-alert-note-border': '#0969da',
  '--hm-color-alert-note-bg': 'rgba(9, 105, 218, 0.08)',
  '--hm-color-alert-note-icon': '#0969da',
  '--hm-color-alert-tip-border': '#1a7f37',
  '--hm-color-alert-tip-bg': 'rgba(26, 127, 55, 0.08)',
  '--hm-color-alert-tip-icon': '#1a7f37',
  '--hm-color-alert-important-border': '#8250df',
  '--hm-color-alert-important-bg': 'rgba(130, 80, 223, 0.08)',
  '--hm-color-alert-important-icon': '#8250df',
  '--hm-color-alert-warning-border': '#9a6700',
  '--hm-color-alert-warning-bg': 'rgba(154, 103, 0, 0.08)',
  '--hm-color-alert-warning-icon': '#9a6700',
  '--hm-color-alert-caution-border': '#cf222e',
  '--hm-color-alert-caution-bg': 'rgba(207, 34, 46, 0.08)',
  '--hm-color-alert-caution-icon': '#cf222e',
}

export const themes: Record<Exclude<ThemeName, 'auto'>, ThemeTokens> = {
  light: lightTheme,
  dark: darkTheme,
  github: githubTheme,
}

export function applyTheme(tokens: ThemeTokens, root: HTMLElement) {
  for (const [property, value] of Object.entries(tokens)) {
    root.style.setProperty(property, value)
  }
}
