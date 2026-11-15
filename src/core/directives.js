/* ============================================================
   指令集（Vuetify 的做法）：v-ripple / v-intersect / v-resize / v-click-outside
   以插件形式注册：app.use(zeroDirectives)
   ============================================================ */

function createRipple(el) {
  el.style.position = el.style.position || 'relative'
  el.style.overflow = 'hidden'
  el.addEventListener('pointerdown', event => {
    const rect = el.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const span = document.createElement('span')
    span.className = 'ui-ripple-wave'
    span.style.cssText = [
      'position:absolute', 'pointer-events:none', 'border-radius:50%',
      'background:currentColor', 'opacity:.24',
      'width:' + size + 'px', 'height:' + size + 'px',
      'left:' + (event.clientX - rect.left - size / 2) + 'px',
      'top:' + (event.clientY - rect.top - size / 2) + 'px',
      'transform:scale(0)', 'transition:transform 420ms cubic-bezier(.2,.8,.3,1), opacity 420ms ease'
    ].join(';')
    el.appendChild(span)
    requestAnimationFrame(() => { span.style.transform = 'scale(1)'; span.style.opacity = '0' })
    setTimeout(() => span.remove(), 460)
  })
}

const observers = new WeakMap()

export const vRipple = {
  mounted(el) { createRipple(el) }
}

export const vIntersect = {
  mounted(el, binding) {
    const handler = typeof binding.value === 'function' ? binding.value : binding.value && binding.value.handler
    if (!handler || typeof IntersectionObserver === 'undefined') return
    const options = (binding.value && binding.value.options) || { threshold: 0.2 }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => handler(entry.isIntersecting, entry))
    }, options)
    observer.observe(el)
    observers.set(el, observer)
  },
  unmounted(el) { const observer = observers.get(el); if (observer) observer.disconnect() }
}

export const vResize = {
  mounted(el, binding) {
    const handler = typeof binding.value === 'function' ? binding.value : binding.value && binding.value.handler
    if (!handler || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(entries => handler(entries[0].contentRect, entries[0]))
    observer.observe(el)
    observers.set(el, observer)
  },
  unmounted(el) { const observer = observers.get(el); if (observer) observer.disconnect() }
}

const outsideHandlers = new WeakMap()

export const vClickOutside = {
  mounted(el, binding) {
    const handler = typeof binding.value === 'function' ? binding.value : binding.value && binding.value.handler
    if (!handler) return
    const listener = event => { if (!el.contains(event.target)) handler(event) }
    document.addEventListener('pointerdown', listener, true)
    outsideHandlers.set(el, listener)
  },
  unmounted(el) {
    const listener = outsideHandlers.get(el)
    if (listener) document.removeEventListener('pointerdown', listener, true)
  }
}

/** 插件形式一次性注册四个指令。 */
export const zeroDirectives = {
  install(app) {
    app.directive('ripple', vRipple)
    app.directive('intersect', vIntersect)
    app.directive('resize', vResize)
    app.directive('click-outside', vClickOutside)
  }
}
