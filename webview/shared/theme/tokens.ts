export interface ThemeTokens {
  '--hm-font-body': string
  '--hm-font-code': string
  '--hm-font-size': string
  '--hm-line-height': string
  '--hm-max-width': string
  '--hm-color-text': string
  '--hm-color-text-muted': string
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
}

export const lightTheme: ThemeTokens = {
  '--hm-font-body': '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  '--hm-font-code': '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  '--hm-font-size': '16px',
  '--hm-line-height': '1.6',
  '--hm-max-width': '800px',
  '--hm-color-text': '#24292f',
  '--hm-color-text-muted': '#656d76',
  '--hm-color-bg': '#ffffff',
  '--hm-color-bg-secondary': '#f6f8fa',
  '--hm-color-border': '#d0d7de',
  '--hm-color-link': '#0969da',
  '--hm-color-code-bg': '#f6f8fa',
  '--hm-color-code-text': '#24292f',
  '--hm-color-blockquote-border': '#d0d7de',
  '--hm-color-blockquote-text': '#656d76',
  '--hm-color-table-border': '#d0d7de',
  '--hm-color-table-header-bg': '#f6f8fa',
  '--hm-color-frontmatter-bg': '#f6f8fa',
  '--hm-color-frontmatter-border': '#d0d7de',
}

export const darkTheme: ThemeTokens = {
  '--hm-font-body': '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  '--hm-font-code': '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  '--hm-font-size': '16px',
  '--hm-line-height': '1.6',
  '--hm-max-width': '800px',
  '--hm-color-text': '#e6edf3',
  '--hm-color-text-muted': '#8b949e',
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
}

export const githubTheme: ThemeTokens = { ...lightTheme }

export function applyTheme(tokens: ThemeTokens, root: HTMLElement = document.documentElement) {
  for (const [property, value] of Object.entries(tokens)) {
    root.style.setProperty(property, value)
  }
}
