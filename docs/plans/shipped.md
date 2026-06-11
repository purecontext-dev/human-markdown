---
title: "Shipped Plans"
project: "human-markdown"
date: 2026-05-10
---

# Shipped Plans

## Editor Integration Test Roadmap (shipped 2026-06-11)

Real VS Code Extension Host integration suite covering document sync, editor
state, multiple panels, round-trip fidelity, and UI smoke paths. Batches 1-6 are
complete: sync risk spine, core extension host behavior, mode/editor state,
multiple panels, round-trip fidelity in real VS Code, and toolbar/autosave/
conflict/find/image/link UI smoke tests.

## In-Place Mode Toggle (shipped 2026-05-11)

CodeMirror raw editor embedded in the same webview as Milkdown WYSIWYG. Preview/Markdown toggle buttons in toolbar, Cmd+Shift+V keybinding. Extension owns .md files by default. Zoom compensation, font-family matching with generic fallback, syntax highlighting with VSCode-matching colors.

## MVP (shipped 2026-05-10)

WYSIWYG editing, rendering, toggle, themes, stability. 7 epics, 37 tasks.

- Epic 1: Project Scaffolding
- Epic 2: Prototype Spike (GATE)
- Epic 3: Extension Shell
- Epic 4: Rendering Pipeline
- Epic 5: WYSIWYG Editor
- Epic 6: Theming
- Epic 7: Stability & Security
