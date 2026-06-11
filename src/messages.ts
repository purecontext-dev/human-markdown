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
  | { type: 'save-failed'; requestId?: number; reason?: 'apply' | 'save' | 'stale-content' }
  | { type: 'auto-save'; enabled: boolean }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'test-set-raw-content'; content: string; requestId?: number }
  | { type: 'test-insert-preview-paragraph'; text: string; requestId?: number }
  | { type: 'test-click-mode-toggle'; requestId?: number }
  | { type: 'test-click-autosave-toggle'; requestId?: number }
  | { type: 'test-click-conflict-action'; action: 'accept' | 'keep'; requestId?: number }
  | { type: 'test-set-find-query'; query: string; requestId?: number }
  | { type: 'test-find-next'; requestId?: number }
  | { type: 'test-find-prev'; requestId?: number }
  | { type: 'test-click-link'; href: string; requestId?: number }
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
      buttonMode?: string
      buttonLabel?: string
      autosaveChecked?: boolean
      autoSaveEnabled?: boolean
      dirty?: boolean
      conflictVisible?: boolean
      findVisible?: boolean
      findValue?: string
      findCount?: string
      imageSrc?: string | null
      imageAlt?: string | null
      imageLoading?: boolean
      imageBroken?: boolean
      linkHrefs?: string[]
    }

export interface WebviewState {
  scrollTop: number
  mode: 'preview' | 'raw'
}
