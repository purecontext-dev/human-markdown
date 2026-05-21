import type { ThemeTokens } from '../webview/shared/theme/tokens'

export type ExtensionToWebviewMessage =
  | { type: 'update'; content: string }
  | { type: 'merge-update'; content: string }
  | { type: 'external-change' }
  | { type: 'restore-state'; state: WebviewState }
  | { type: 'theme'; tokens: ThemeTokens }
  | { type: 'toggle-mode' }
  | { type: 'set-mode'; mode: 'preview' | 'raw' }
  | { type: 'show-find' }

export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'edit'; content: string }
  | { type: 'dirty-state'; isDirty: boolean }
  | { type: 'accept-external' }
  | { type: 'keep-mine'; content: string }
  | { type: 'save-state'; state: WebviewState }
  | { type: 'open-link'; href: string }
  | { type: 'save' }

export interface WebviewState {
  scrollTop: number
  mode: 'preview' | 'raw'
}
