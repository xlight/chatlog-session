/**
 * 代码高亮工具：按语言子集注册 highlight.js
 * 仅注册 AI 回复常见 12 种语言，避免加载全语言包（940KB → ~50KB）
 */
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import markdown from 'highlight.js/lib/languages/markdown'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import cpp from 'highlight.js/lib/languages/cpp'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import plaintext from 'highlight.js/lib/languages/plaintext'

/** 已注册语言清单 */
export const registeredLanguages = [
  'javascript',
  'typescript',
  'python',
  'json',
  'xml',
  'markdown',
  'bash',
  'sql',
  'cpp',
  'java',
  'go',
  'plaintext',
] as const

// 注册语言子集
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('java', java)
hljs.registerLanguage('go', go)
hljs.registerLanguage('plaintext', plaintext)

export default hljs
