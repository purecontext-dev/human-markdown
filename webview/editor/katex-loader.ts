import katex from 'katex'
;(window as unknown as Record<string, unknown>).__katex = katex
window.dispatchEvent(new Event('katex-ready'))
