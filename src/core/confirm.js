/* ============================================================
   库级确认对话框单例：替代散落的 window.confirm。
   对话框用 createApp 挂在 body 下的独立宿主里，
   多次调用复用同一个宿主，前一次未决时排队等待。
   ============================================================ */
import { createApp, h, onBeforeUnmount, onMounted, ref } from 'vue'
import UiModal from '../components/ui/UiModal.vue'
import UiButton from '../components/ui/UiButton.vue'

let singleton = null

function ensureHost() {
  if (singleton) return singleton
  const host = document.createElement('div')
  host.className = 'ui-confirm-root'
  document.body.appendChild(host)
  const state = { open: ref(false), options: ref({}), resolve: null }
  const app = createApp({
    setup() {
      function settle(value) {
        state.open.value = false
        if (state.resolve) { state.resolve(value); state.resolve = null }
      }
      /* 确认对话框有意不接 Esc / Enter：确认动作必须显式点击按钮，
         防止键盘事件误触发危险操作。普通对话框不受此限制。
         · Esc：UiModal 传 closeOnEsc=false；
         · Enter：捕获阶段拦截，连「焦点落在按钮上被 Enter 激活」也挡掉。 */
      function onKeyCapture(event) {
        if (!state.open.value) return
        if (event.key === 'Enter' || event.code === 'NumpadEnter') {
          event.preventDefault()
          event.stopPropagation()
        }
      }
      onMounted(() => document.addEventListener('keydown', onKeyCapture, true))
      onBeforeUnmount(() => document.removeEventListener('keydown', onKeyCapture, true))

      const variant = state.options.value.variant || 'default'
      return () => h(UiModal, {
        modelValue: state.open.value,
        'onUpdate:modelValue': value => { if (!value) settle(false) },
        title: state.options.value.title || '确认操作',
        closeOnEsc: false,
        /* morph：由触发按钮形变、不压暗背景；fullscreen：铺满视口 */
        scrim: variant !== 'morph',
        fullscreen: variant === 'fullscreen',
        anchor: state.options.value.anchor || null
      }, {
        default: () => [
          h('p', { class: 'ui-confirm__message' }, state.options.value.message || ''),
          state.options.value.detail
            ? h('p', { class: 'ui-confirm__detail' }, state.options.value.detail)
            : null
        ],
        footer: () => [
          h(UiButton, { variant: 'text', onClick: () => settle(false) },
            () => state.options.value.cancelText || '取消'),
          h(UiButton, {
            variant: state.options.value.danger ? 'danger' : 'primary',
            onClick: () => settle(true)
          }, () => state.options.value.confirmText || '确认')
        ]
      })
    }
  })
  app.mount(host)
  singleton = {
    state,
    host,
    app,
    ask(options) {
      state.options.value = options || {}
      state.open.value = true
      return new Promise(resolve => { state.resolve = resolve })
    }
  }
  return singleton
}

export function confirmDialog(options) {
  return ensureHost().ask(options)
}

export function disposeConfirmDialog() {
  if (!singleton) return
  singleton.app.unmount()
  singleton.host.remove()
  singleton = null
}
