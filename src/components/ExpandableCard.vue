<script setup>
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearActive, getActive, setActive } from '../core/expandManager'

/* ============================================================
   卡片展开 / 收起
   直接复用被点击的卡片元素：卡片表面从原位置生长为全屏。
   原有内容与展开内容都保留在 DOM 中，只用透明度和模糊切换。
   ============================================================ */

const props = defineProps({
  tag: { type: String, default: 'section' },
  expandKey: { type: String, required: true },
  routeName: { type: String, required: true },
  parentRouteName: { type: String, required: true },
  routeParams: { type: Object, default: () => ({}) },
  variant: { type: String, default: 'card' },
  feature: { type: Boolean, default: false },
  content: { type: [Object, Function], required: true },
  contentProps: { type: Object, default: () => ({}) }
})

const route = useRoute()
const router = useRouter()
const routeActive = computed(() => {
  if (route.name !== props.routeName) return false
  return Object.entries(props.routeParams).every(([key, value]) =>
    String(route.params[key] ?? '') === String(value)
  )
})

const CLOSE_BUFFER = 80
const SETTLE_DELAY = 180
const IGNORE = '.chart, .bar, .bar-col, button, a, input, select, textarea, [data-no-expand]'
const DESKTOP_QUERY = '(min-width: 900px)'

/* 桌面端不铺满整页：展开成居中的模态尺寸，并压暗模糊背景。 */
function isDesktop() {
  return window.matchMedia && window.matchMedia(DESKTOP_QUERY).matches
}

function expandedTarget() {
  if (!isDesktop()) {
    return {
      top: '0px', left: '0px', width: '100vw', height: '100dvh',
      radius: '0px', background: 'var(--background)',
      border: 'transparent', shadow: 'none'
    }
  }

  const width = Math.round(Math.min(680, Math.max(360, window.innerWidth - 140)))
  const height = Math.round(Math.min(760, Math.max(320, window.innerHeight - 140)))
  return {
    top: Math.round((window.innerHeight - height) / 2) + 'px',
    left: Math.round((window.innerWidth - width) / 2) + 'px',
    width: width + 'px',
    height: height + 'px',
    radius: 'calc(var(--r-card) * var(--radius-scale))',
    background: 'var(--surface)',
    border: 'var(--outline-variant)',
    shadow: 'none'
  }
}

/* 历史栈规则：
   · 卡片展开用 push 产生历史记录（见 onClick / onKeydown）。
   · 卡片内返回与系统返回统一走 back()，不用 push / replace 到父路由。
   · 收起要先播完弹簧动画，再 back()。
   expandDepth 记录「本组件实例压入过几次展开历史」：
   深链直达时我们没有压入历史，back() 会退出应用，只能 replace 回父路由。 */
let expandDepth = 0

let closeTimer = null
let settleTimer = null
let mounted = false
let scrollAreaEl = null
let scrollPrevOverflow = ''
let backdropTimer = null
let pendingMethod = 'pointer'
let reopenAfterClose = false
let closingPromise = null

const rootEl = ref(null)
const innerEl = ref(null)
const scrollerEl = ref(null)

const expanded = ref(false)
const backdropVisible = ref(false)
const backdropOpen = ref(false)
const closing = ref(false)
const settling = ref(false)
const loaded = ref(false)

const rootClasses = computed(() => {
  const variantClass = props.variant === 'card' ? 'card' : props.variant
  return [
    variantClass,
    props.feature ? 'card--feature' : '',
    {
      'is-expanded': expanded.value,
      'is-closing': closing.value,
      'is-settling': settling.value
    }
  ]
})

const reduceMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function readDuration(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!value) return fallback
  const amount = parseFloat(value)
  if (!Number.isFinite(amount)) return fallback
  return value.endsWith('ms') ? amount : amount * 1000
}

function lockPageScroll() {
  scrollAreaEl = document.getElementById('scrollArea')
  if (!scrollAreaEl) return
  scrollPrevOverflow = scrollAreaEl.style.overflow
  scrollAreaEl.style.overflow = 'hidden'
}

function unlockPageScroll() {
  if (!scrollAreaEl) return
  scrollAreaEl.style.overflow = scrollPrevOverflow
  scrollAreaEl = null
}

function showBackdrop() {
  if (!isDesktop()) return
  backdropVisible.value = true
  requestAnimationFrame(() => {
    if (backdropVisible.value) backdropOpen.value = true
  })
}

function directChild(card, className) {
  return Array.from(card.children).find(child => child.classList.contains(className)) || null
}

function setExpandedOrigin(card, rect, computed) {
  card.style.position = 'fixed'
  card.style.zIndex = '300'
  card.style.margin = '0'
  card.style.maxWidth = 'none'
  card.style.top = rect.top + 'px'
  card.style.left = rect.left + 'px'
  card.style.width = rect.width + 'px'
  card.style.height = rect.height + 'px'
  card.style.overflow = 'hidden'
  card.style.cursor = 'default'
  card.style.borderRadius = computed.borderRadius
  card.style.backgroundColor = computed.backgroundColor
  card.style.borderColor = computed.borderColor
  card.style.boxShadow = computed.boxShadow
  card.style.transform = 'none'
  card.style.willChange = 'top, left, width, height, border-radius, background-color, border-color, box-shadow'
  card.style.transition = [
    'top var(--spring-expand-dur) var(--spring-expand)',
    'left var(--spring-expand-dur) var(--spring-expand)',
    'width var(--spring-expand-dur) var(--spring-expand)',
    'height var(--spring-expand-dur) var(--spring-expand)',
    'border-radius var(--spring-expand-dur) var(--spring-expand)',
    'background-color var(--spring-fade-dur) var(--spring-fade)',
    'border-color var(--spring-fade-dur) var(--spring-fade)',
    'box-shadow var(--spring-fade-dur) var(--spring-fade)',
    'transform var(--t-feedback)'
  ].join(', ')
}

function restoreAria(card, state) {
  if (state.originalRole === null) card.removeAttribute('role')
  else card.setAttribute('role', state.originalRole)

  if (state.originalAriaLabel === null) card.removeAttribute('aria-label')
  else card.setAttribute('aria-label', state.originalAriaLabel)

  if (state.originalAriaExpanded === null) card.removeAttribute('aria-expanded')
  else card.setAttribute('aria-expanded', state.originalAriaExpanded)

  if (state.originalAriaModal === null) card.removeAttribute('aria-modal')
  else card.setAttribute('aria-modal', state.originalAriaModal)
}

/* 等待弹簧收起动画播完（--spring-exit-dur + 缓冲）。 */
function awaitCollapse() {
  if (!expanded.value && !closing.value) return Promise.resolve()
  const exitMs = reduceMotion() ? 0 : readDuration('--spring-exit-dur', 400)
  return new Promise(resolve => setTimeout(resolve, exitMs + CLOSE_BUFFER))
}

async function requestClose() {
  if (closingPromise) return closingPromise
  closingPromise = (async () => {
    try {
      /* 先播收起动画，动画完成后再改历史，避免路由切换打断弹簧。 */
      if (routeActive.value || getActive()) closeCard()
      await awaitCollapse()
      if (expandDepth > 0) {
        expandDepth -= 1
        /* 统一用 back()：卡片内返回按钮和系统返回走同一条路。 */
        router.back()
      } else if (routeActive.value) {
        /* 深链直达：没有我们压入的历史条目，只能替换回父路由。 */
        await router.replace({ name: props.parentRouteName })
      }
    } finally {
      closingPromise = null
    }
  })()
  return closingPromise
}

async function openCard(method = 'pointer') {
  if (getActive()) return

  const card = rootEl.value
  if (!card) return

  clearTimeout(settleTimer)
  settling.value = false
  card.classList.remove('is-pressing')

  // 视图切换动画中的 transform 会改变 fixed 的参照系，也会让部分卡片
  // 在过渡途中被裁剪。展开前先把当前视图的入场动画收束到终态。
  const view = card.closest('.view')
  if (view && typeof view.getAnimations === 'function') {
    try {
      view.getAnimations().forEach(animation => animation.finish())
    } catch (error) {
      // 某些环境可能无法立即收束视图动画；继续展开即可。
    }
  }

  const rect = card.getBoundingClientRect()
  const computed = getComputedStyle(card)
  // getComputedStyle 返回活对象，展开后 borderRadius 会变成 0；
  // 收起时必须使用展开前的快照，否则圆角不会反向过渡。
  const originRadius = computed.borderRadius
  const parent = card.parentNode

  const originalStyle = card.style.cssText
  const originalRole = card.getAttribute('role')
  const originalAriaLabel = card.getAttribute('aria-label')
  const originalAriaExpanded = card.getAttribute('aria-expanded')
  const originalAriaModal = card.getAttribute('aria-modal')

  const slot = document.createElement('div')
  slot.className = 'expand-placeholder'
  slot.style.height = rect.height + 'px'
  // 占位块必须继承卡片原本的布局槽位（grid 列跨度 / flex 次序 / 外边距）。
  // 否则卡片一改成 fixed，父容器就把它当成「少了一个 item」重新排布，
  // 典型现象是首页 feature 卡展开时整行卡片跳位。
  slot.style.gridColumn = computed.gridColumn
  slot.style.gridRow = computed.gridRow
  slot.style.flex = computed.flex
  slot.style.alignSelf = computed.alignSelf
  slot.style.order = computed.order
  slot.style.margin = computed.margin
  slot.style.minWidth = computed.minWidth
  slot.setAttribute('aria-hidden', 'true')
  parent.insertBefore(slot, card)

  const inner = directChild(card, 'card-inner')
  if (inner) {
    inner.setAttribute('aria-hidden', 'true')
    inner.inert = true
  }

  if (!loaded.value) loaded.value = true

  setExpandedOrigin(card, rect, computed)
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-modal', 'true')
  card.setAttribute('aria-expanded', 'true')

  // 卡片始终留在原父节点中，只改为 fixed；不移动 DOM，
  // 这样卡片和内部元素的 CSS 入场动画不会因为重新插入而重播。
  document.body.classList.add('locked')
  lockPageScroll()
  const target = expandedTarget()
  showBackdrop()
  if (method === 'pointer' && document.activeElement === card) card.blur()

  const escHandler = event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      requestClose()
    }
  }
  document.addEventListener('keydown', escHandler)

  const state = {
    card,
    slot,
    rect,
    originRadius,
    method,
    originalStyle,
    originalRole,
    originalAriaLabel,
    originalAriaExpanded,
    originalAriaModal,
    escHandler
  }
  setActive(state)

  // 展开内容首次展开时才挂载，之后保留；先等组件渲染到 DOM，
  // 再启动位置与内容过渡。
  await nextTick()
  if (getActive() !== state) return

  const content = scrollerEl.value && scrollerEl.value.firstElementChild
  const title = content && content.querySelector('.expand-title')
  if (title) card.setAttribute('aria-label', title.textContent)

  // 先强制一帧，确保卡片的起始几何状态、原有内容和展开内容都已经就位。
  void card.offsetWidth

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (getActive() !== state || closing.value) return

      expanded.value = true
      card.style.top = target.top
      card.style.left = target.left
      card.style.width = target.width
      card.style.height = target.height
      card.style.borderRadius = target.radius
      card.style.backgroundColor = target.background
      card.style.borderColor = target.border
      card.style.boxShadow = target.shadow

      if (method === 'keyboard') card.focus({ preventScroll: true })
    })
  })
}

function closeCard() {
  if (!getActive() || closing.value) return

  const state = getActive()
  const {
    card, slot, rect, originRadius, method,
    originalStyle, originalRole, originalAriaLabel,
    originalAriaExpanded, originalAriaModal, escHandler
  } = state

  document.removeEventListener('keydown', escHandler)
  expanded.value = false
  closing.value = true
  backdropOpen.value = false

  card.style.transition = [
    'top var(--spring-exit-dur) var(--spring-exit)',
    'left var(--spring-exit-dur) var(--spring-exit)',
    'width var(--spring-exit-dur) var(--spring-exit)',
    'height var(--spring-exit-dur) var(--spring-exit)',
    'border-radius var(--spring-exit-dur) var(--spring-exit)',
    'background-color var(--spring-fade-dur) var(--spring-fade)',
    'border-color var(--spring-fade-dur) var(--spring-fade)',
    'box-shadow var(--spring-fade-dur) var(--spring-fade)'
  ].join(', ')

  // 先把新的 transition 提交一帧，再写入目标值，确保圆角也会反向过渡。
  void card.offsetWidth

  // 回到基础表面色与基础描边，而不是回到展开瞬间可能携带的 hover 状态。
  card.style.top = rect.top + 'px'
  card.style.left = rect.left + 'px'
  card.style.width = rect.width + 'px'
  card.style.height = rect.height + 'px'
  card.style.borderRadius = originRadius
  card.style.backgroundColor = 'var(--surface-container-low)'
  card.style.borderColor = 'var(--outline-variant)'
  card.style.boxShadow = 'var(--elev-card)'

  const exitMs = reduceMotion() ? 0 : readDuration('--spring-exit-dur', 400)
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    // 收起时只隐藏展开内容，不销毁；原有内容一直保留。
    closing.value = false
    const inner = directChild(card, 'card-inner')
    if (inner) {
      inner.removeAttribute('aria-hidden')
      inner.inert = false
    }
    slot.remove()
    card.style.cssText = originalStyle
    restoreAria(card, state)

    document.body.classList.remove('locked')
    unlockPageScroll()
    backdropVisible.value = false

    if (method === 'keyboard') card.focus({ preventScroll: true })
    else if (document.activeElement === card) card.blur()

    clearActive(state)
    settling.value = true

    if (reopenAfterClose && routeActive.value) {
      reopenAfterClose = false
      requestAnimationFrame(() => {
        if (routeActive.value && !getActive()) openCard('pointer')
      })
    }

    clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      settling.value = false
    }, reduceMotion() ? 0 : SETTLE_DELAY)
  }, exitMs + CLOSE_BUFFER)
}

async function onClick(event) {
  if (closing.value) return

  if (expanded.value) {
    if (event.target.closest('[data-close]')) {
      event.stopPropagation()
      requestClose()
    }
    return
  }

  if (getActive() || event.target.closest(IGNORE)) return

  const method = event.detail === 0 ? 'keyboard' : 'pointer'
  pendingMethod = method
  const failure = await router.push({ name: props.routeName, params: props.routeParams })
  /* push 成功即产生一条展开历史。 */
  if (!failure) expandDepth += 1
  else if (failure && routeActive.value && !getActive() && !closing.value) openCard(method)
}

async function onKeydown(event) {
  if (getActive()) return
  if (event.key !== 'Enter' && event.key !== ' ') return
  if (event.target.closest(IGNORE)) return

  event.preventDefault()
  pendingMethod = 'keyboard'
  const failure = await router.push({ name: props.routeName, params: props.routeParams })
  if (!failure) expandDepth += 1
  else if (failure && routeActive.value && !getActive() && !closing.value) openCard('keyboard')
}

function scrollCardIntoView() {
  const card = rootEl.value
  const scroller = document.getElementById('scrollArea')
  if (!card || !scroller) return
  const cardRect = card.getBoundingClientRect()
  const scrollerRect = scroller.getBoundingClientRect()
  const offset = cardRect.top - scrollerRect.top
  const top = scroller.scrollTop + offset
    - Math.max(0, (scroller.clientHeight - cardRect.height) / 2)
  scroller.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
}

function maybeOpenFromRoute(method = 'pointer', scroll = false) {
  if (!routeActive.value || getActive() || closing.value) return
  const card = rootEl.value
  if (!card || !card.isConnected) return
  if (scroll) scrollCardIntoView()
  requestAnimationFrame(() => {
    if (routeActive.value && !getActive() && !closing.value) openCard(method)
  })
}

watch(routeActive, value => {
  if (!mounted) return

  if (value) {
    const current = getActive()
    if (current && current.card === rootEl.value) {
      if (closing.value) reopenAfterClose = true
      return
    }
    if (!current) maybeOpenFromRoute(pendingMethod)
    pendingMethod = 'pointer'
  } else {
    reopenAfterClose = false
    /* 路由已离开展开子页：这条展开历史已经被消费（系统返回 / back()）。 */
    expandDepth = 0
    const current = getActive()
    if (current && current.card === rootEl.value) closeCard()
    pendingMethod = 'pointer'
  }
}, { flush: 'post' })

onMounted(() => {
  mounted = true
  const card = rootEl.value
  if (!card) return
  if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0')
  if (!card.hasAttribute('role')) card.setAttribute('role', 'button')
  if (!card.hasAttribute('aria-haspopup')) card.setAttribute('aria-haspopup', 'dialog')
  card.setAttribute('aria-expanded', 'false')

  if (routeActive.value) maybeOpenFromRoute('pointer', true)
})

onActivated(() => {
  if (mounted && routeActive.value) maybeOpenFromRoute('pointer')
})

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  clearTimeout(settleTimer)
  clearTimeout(backdropTimer)
  unlockPageScroll()
  backdropVisible.value = false
  const current = getActive()
  if (current && current.card === rootEl.value) {
    document.removeEventListener('keydown', current.escHandler)
    document.body.classList.remove('locked')
    clearActive(current)
  }
})

defineExpose({ close: closeCard, open: openCard })
</script>

<template>
  <component
    :is="tag"
    ref="rootEl"
    :class="rootClasses"
    :data-expand="expandKey"
    @click="onClick"
    @keydown="onKeydown"
  >
    <Teleport to="body">
      <div
        v-if="backdropVisible"
        class="expand-backdrop"
        :class="{ 'is-open': backdropOpen }"
        aria-hidden="true"
        @click="requestClose"
      ></div>
    </Teleport>

    <div class="card-inner" ref="innerEl">
      <slot />
    </div>

    <div class="expand-scroller" ref="scrollerEl">
      <div class="expand-content" v-if="loaded">
        <component :is="content" v-bind="contentProps" />
      </div>
    </div>
  </component>
</template>
