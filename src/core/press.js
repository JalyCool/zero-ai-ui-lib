/* ============================================================
   按压反馈
   只为真正可展开的卡片添加 .is-pressing，
   图表、睡眠条、按钮等交互区域不会误触发卡片按压效果。
   ============================================================ */

const IGNORE = '.chart, .bar, .bar-col, button, a, input, select, textarea, [data-no-expand]'

export function initPress() {
  let pressed = null
  let startX = 0
  let startY = 0

  function clear() {
    if (pressed) pressed.classList.remove('is-pressing')
    pressed = null
  }

  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const card = event.target.closest('[data-expand]')
    if (!card || event.target.closest(IGNORE)) return
    if (card.classList.contains('is-expanded') || card.classList.contains('is-closing')) return

    pressed = card
    startX = event.clientX
    startY = event.clientY
    card.classList.add('is-pressing')
  }, { passive: true })

  document.addEventListener('pointermove', event => {
    if (!pressed) return
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > 10) clear()
  }, { passive: true })

  document.addEventListener('pointerup', clear, { passive: true })
  document.addEventListener('pointercancel', clear, { passive: true })
  window.addEventListener('blur', clear)
}
