import * as vscode from 'vscode'
import {
  darkTheme,
  githubTheme,
  lightTheme,
  type ThemeName,
  type ThemeTokens,
} from '../webview/shared/theme/tokens'

export function resolveThemeTokens(themeName: ThemeName): ThemeTokens {
  if (themeName === 'auto') {
    const kind = vscode.window.activeColorTheme.kind
    const isDark =
      kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast
    return isDark ? darkTheme : lightTheme
  }
  const map: Record<Exclude<ThemeName, 'auto'>, ThemeTokens> = {
    light: lightTheme,
    dark: darkTheme,
    github: githubTheme,
  }
  return map[themeName]
}

export function getConfiguredThemeName(): ThemeName {
  const config = vscode.workspace.getConfiguration('humanMarkdown')
  return (config.get<string>('theme') ?? 'auto') as ThemeName
}
