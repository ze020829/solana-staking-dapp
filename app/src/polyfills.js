// Polyfills for browser compatibility
import { Buffer } from 'buffer'

// 设置 Buffer 全局变量
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
  window.global = window
  window.process = window.process || { env: {} }
}

if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = Buffer
  globalThis.global = globalThis
  globalThis.process = globalThis.process || { env: {} }
}

