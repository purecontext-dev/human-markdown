export type ExtensionToWebviewMessage =
  | { type: 'update'; content: string }
  | { type: 'restore-state'; state: WebviewState }

export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'edit'; content: string }
  | { type: 'save-state'; state: WebviewState }

export interface WebviewState {
  scrollTop: number
}
