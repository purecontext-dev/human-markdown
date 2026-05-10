import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false })
;(window as unknown as Record<string, unknown>).__mermaid = mermaid
