import { onBeforeUnmount, onMounted } from 'vue'

/* ============================================================
   声明式快捷键（参考 Nuxt UI defineShortcuts）
   defineShortcuts({
     'meta+k': () => open(),
     'escape': () => close(),
     'meta+enter': () => submit()
   })
   组合键用 + 连接，修饰键支持 meta / ctrl / alt / shift。
   ============================================================ */

const MODS = ['meta', 'ctrl', 'alt', 'shift']

function parse(combo) {
  const parts = String(combo).toLowerCase().split('+').map(part => part.trim()).filter(Boolean)
  const mods = { meta: false, ctrl: false, alt: false, shift: false }
  let key = ''
  parts.forEach(part => { if (MODS.includes(part)) mods[part] = true; else key = part })
  return { mods, key }
}

function matches(event, pattern) {
  const { mods, key } = pattern
  if (mods.meta !== event.metaKey) return false
  if (mods.ctrl !== event.ctrlKey) return false
  if (mods.alt !== event.altKey) return false
  if (mods.shift !== event.shiftKey && key.length > 1) return false
  const pressed = String(event.key).toLowerCase()
  if (key === 'escape') return pressed === 'escape'
  if (key === 'enter') return pressed === 'enter'
  if (key === 'space') return pressed === ' ' || pressed === 'spacebar'
  return pressed === key
}

export function createShortcuts(map, options = {}) {
  const patterns = Object.entries(map).map(([combo, handler]) => ({ ...parse(combo), handler }))
  const target = options.target || (typeof document !== 'undefined' ? document : null)
  function onKeydown(event) {
    /* 输入框里不劫持单字母快捷键，避免打断打字。 */
    const tag = event.target && event.target.tagName
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (event.target && event.target.isContentEditable)
    for (const pattern of patterns) {
      if (!matches(event, pattern)) continue
      if (typing && pattern.key.length === 1 && !pattern.mods.meta && !pattern.mods.ctrl) continue
      if (options.preventDefault !== false) event.preventDefault()
      pattern.handler(event)
      return
    }
  }
  if (target) target.addEventListener('keydown', onKeydown)
  return () => { if (target) target.removeEventListener('keydown', onKeydown) }
}

/** 组件内使用：挂载时绑定、卸载时解绑。 */
export function defineShortcuts(map, options = {}) {
  let stop = null
  onMounted(() => { stop = createShortcuts(map, options) })
  onBeforeUnmount(() => { if (stop) stop() })
  return { stop: () => { if (stop) { stop(); stop = null } } }
}
