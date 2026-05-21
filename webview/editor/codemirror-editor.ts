import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { highlightSelectionMatches } from '@codemirror/search'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import type { SearchBackend } from './find-bar'

const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: '#569cd6', fontWeight: 'bold' },
  { tag: tags.heading2, color: '#569cd6', fontWeight: 'bold' },
  { tag: tags.heading3, color: '#569cd6', fontWeight: 'bold' },
  { tag: tags.heading4, color: '#569cd6', fontWeight: 'bold' },
  { tag: tags.heading5, color: '#569cd6', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#569cd6', fontWeight: 'bold' },
  { tag: tags.strong, color: '#569cd6', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#c586c0', fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#808080' },
  { tag: tags.link, color: '#3794ff', textDecoration: 'underline' },
  { tag: tags.url, color: '#3794ff' },
  { tag: tags.monospace, color: '#ce9178' },
  { tag: tags.meta, color: '#6796e6' },
  { tag: tags.comment, color: '#6a9955' },
  { tag: tags.quote, color: '#6a9955' },
  { tag: tags.processingInstruction, color: '#569cd6' },
  { tag: tags.contentSeparator, color: '#808080' },
  { tag: tags.labelName, color: '#3794ff' },
])

const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: '#0451a5', fontWeight: 'bold' },
  { tag: tags.heading2, color: '#0451a5', fontWeight: 'bold' },
  { tag: tags.heading3, color: '#0451a5', fontWeight: 'bold' },
  { tag: tags.heading4, color: '#0451a5', fontWeight: 'bold' },
  { tag: tags.heading5, color: '#0451a5', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#0451a5', fontWeight: 'bold' },
  { tag: tags.strong, color: '#0451a5', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#af00db', fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#808080' },
  { tag: tags.link, color: '#0070c1', textDecoration: 'underline' },
  { tag: tags.url, color: '#0070c1' },
  { tag: tags.monospace, color: '#a31515' },
  { tag: tags.meta, color: '#811f3f' },
  { tag: tags.comment, color: '#008000' },
  { tag: tags.quote, color: '#008000' },
  { tag: tags.processingInstruction, color: '#0451a5' },
  { tag: tags.contentSeparator, color: '#808080' },
  { tag: tags.labelName, color: '#0070c1' },
])

const vscodeTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--vscode-editor-background)',
    color: 'var(--vscode-editor-foreground)',
  },
  '.cm-content': {
    caretColor: 'var(--vscode-editorCursor-foreground)',
    padding: '8px 0 8px 8px',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--vscode-editorCursor-foreground)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--vscode-editor-selectionBackground)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--vscode-editor-lineHighlightBackground, transparent)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--vscode-editorGutter-background, var(--vscode-editor-background))',
    color: 'var(--vscode-editorLineNumber-foreground)',
    borderRight: '1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.2))',
    paddingRight: '8px',
  },
  '.cm-activeLineGutter': {
    color: 'var(--vscode-editorLineNumber-activeForeground)',
    backgroundColor: 'var(--vscode-editor-lineHighlightBackground, transparent)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'var(--vscode-editor-selectionHighlightBackground, rgba(173,214,255,0.15))',
  },
  '.cm-hm-search-match': {
    backgroundColor: 'var(--vscode-editor-findMatchHighlightBackground, rgba(234,92,0,0.33))',
  },
  '.cm-hm-search-current': {
    backgroundColor: 'var(--vscode-editor-findMatchBackground, rgba(168,133,0,0.58))',
  },
})

const setSearchDecos = StateEffect.define<DecorationSet>()

const searchDecoField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decos, tr) {
    for (const e of tr.effects) {
      if (e.is(setSearchDecos)) return e.value
    }
    return decos.map(tr.changes)
  },
  provide: (f) => EditorView.decorations.from(f),
})

const matchDeco = Decoration.mark({ class: 'cm-hm-search-match' })
const currentMatchDeco = Decoration.mark({ class: 'cm-hm-search-current' })

function isDarkTheme(): boolean {
  return document.body.getAttribute('data-vscode-theme-kind') !== 'vscode-light'
}

export function createCodeMirrorEditor(
  container: HTMLElement,
  content: string,
  onEdit: (content: string) => void,
): EditorView {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onEdit(update.state.doc.toString())
    }
  })

  const highlightStyle = isDarkTheme() ? darkHighlightStyle : lightHighlightStyle

  const state = EditorState.create({
    doc: content,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      syntaxHighlighting(highlightStyle),
      highlightSelectionMatches(),
      markdown(),
      keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
      searchDecoField,
      vscodeTheme,
      updateListener,
      EditorView.lineWrapping,
    ],
  })

  return new EditorView({ state, parent: container })
}

export class CmSearchBackend implements SearchBackend {
  private matchPositions: { from: number; to: number }[] = []

  constructor(private getEditor: () => EditorView | null) {}

  search(query: string): number {
    this.clear()
    const editor = this.getEditor()
    if (!editor) return 0

    const text = editor.state.doc.toString().toLowerCase()
    const lowerQuery = query.toLowerCase()
    let offset = 0
    while (true) {
      const idx = text.indexOf(lowerQuery, offset)
      if (idx === -1) break
      this.matchPositions.push({ from: idx, to: idx + query.length })
      offset = idx + 1
    }

    this.applyDecorations(editor, -1)
    return this.matchPositions.length
  }

  goToMatch(index: number): void {
    const editor = this.getEditor()
    const match = this.matchPositions[index]
    if (!editor || !match) return

    this.applyDecorations(editor, index)
    editor.dispatch({
      selection: { anchor: match.from, head: match.to },
      scrollIntoView: true,
    })
  }

  clear(): void {
    this.matchPositions = []
    const editor = this.getEditor()
    if (editor) {
      editor.dispatch({ effects: setSearchDecos.of(Decoration.none) })
    }
  }

  private applyDecorations(editor: EditorView, currentIndex: number): void {
    const decos =
      this.matchPositions.length > 0
        ? Decoration.set(
            this.matchPositions.map((m, i) =>
              (i === currentIndex ? currentMatchDeco : matchDeco).range(m.from, m.to),
            ),
          )
        : Decoration.none
    editor.dispatch({ effects: setSearchDecos.of(decos) })
  }
}
