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
  | { type: 'image-uri-resolved'; src: string; webviewUri: string }
  | { type: 'save-success'; requestId?: number }
  | { type: 'save-failed'; requestId?: number; reason?: 'apply' | 'save' }
  | { type: 'auto-save'; enabled: boolean }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'test-set-raw-content'; content: string; requestId?: number }
  | { type: 'test-insert-preview-paragraph'; text: string; requestId?: number }
  | { type: 'test-report-state'; requestId?: number }

export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'edit'; content: string; revision: number; origin?: 'history' | 'edit' }
  | { type: 'dirty-state'; isDirty: boolean }
  | { type: 'accept-external' }
  | { type: 'keep-mine'; content: string }
  | { type: 'save-state'; state: WebviewState }
  | { type: 'open-link'; href: string }
  | { type: 'resolve-image-uri'; src: string }
  | { type: 'save'; content: string; requestId?: number }
  | { type: 'auto-save-changed'; enabled: boolean }
  | {
      type: 'test-event'
      name: string
      requestId?: number
      content?: string
      mode?: 'preview' | 'raw'
      scrollTop?: number
    }

export interface WebviewState {
  scrollTop: number
  mode: 'preview' | 'raw'
}
