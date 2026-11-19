<script setup>
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearActive, getActive, setActive } from '../core/expandManager'
import ZeroScroll from './layout/ZeroScroll.vue'

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

let closeTimer = null
let settleTimer = null
let mounted = false
let scrollAreaEl = null
let scrollPrevOverflow = ''
/* 展开前主容器的滚动位置：卡片收起后要回到用户原来读的地方，
   而不是被浏览器重置成 0（展开时列表高度变化会让 scrollTop 被钳掉）。 */
let savedScrollTop = 0
let backdropTimer = null
let pendingMethod = 'pointer'
let reopenAfterClose = false

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
  savedScrollTop = scrollAreaEl.scrollTop
  scrollPrevOverflow = scrollAreaEl.style.overflow
  scrollAreaEl.style.overflow = 'hidden'
}

function unlockPageScroll() {
  if (!scrollAreaEl) return
  scrollAreaEl.style.overflow = scrollPrevOverflow
  const restore = savedScrollTop
  scrollAreaEl = null
  /* 等这一帧布局恢复后再写回位置（立即写会被旧高度钳制） */
  requestAnimationFrame(() => {
    const el = document.getElementById('scrollArea')
    if (el && el.scrollTop !== restore) el.scrollTo({ top: restore, behavior: 'auto' })
  })
  /* 路由回父页时列表高度会先按展开态算、再收回来 —— 位置会被钳掉。
     延迟到收起动画之后再补一次，保证用户回到原来的阅读位置。 */
  setTimeout(() => {
    const el = document.getElementById('scrollArea')
    if (el && el.scrollTop !== restore) el.scrollTo({ top: restore, behavior: 'auto' })
  }, 360)
}

function showBackdrop() {
  /* 移动端也铺这层遮罩：卡片铺满时看不见它，但收起 / 侧滑过程中
     卡片缩回列表，遮罩要跟着一起「由黑转不黑、由模糊转清晰」。 */
  backdropVisible.value = true
  requestAnimationFrame(() => {
    if (backdropVisible.value) backdropOpen.value = true
  })
}

function directChild(card, className) {
  return Array.from(card.children).find(child => child.classList.contains(className)) || null
}

/* 展开期祖先「包含块劫持」处理。
   position:fixed 的包含块会被祖先的 transform / filter / backdrop-filter /
   will-change:transform 改写成那个祖先 —— 列表容器（SwipeRow 的 surface
   就带 will-change:transform）里展开时，卡片的 left:0 / width:100vw 会按
   祖先的盒子算：整体偏出十几像素、右侧被裁，看起来就是「打不开」。
   展开动画期间把这些提示压成 auto（此刻不在跟手滑动，无性能损失），
   收起落定后逐一还原。 */
let releasedAncestors = []

function releaseContainingBlock(card) {
  releasedAncestors = []
  let node = card?.parentElement
  while (node && node !== document.body) {
    const cs = getComputedStyle(node)
    const hit = {}
    if (cs.transform && cs.transform !== 'none') hit.transform = cs.transform
    if (cs.filter && cs.filter !== 'none') hit.filter = cs.filter
    if (cs.backdropFilter && cs.backdropFilter !== 'none' && cs.backdropFilter !== '') hit.backdropFilter = cs.backdropFilter
    if (cs.willChange === 'transform' || cs.willChange.includes('transform')) hit.willChange = cs.willChange
    if (Object.keys(hit).length) {
      const restore = {}
      for (const prop of Object.keys(hit)) {
        /* will-change 必须回落到 auto —— 实测 none 依然会为 fixed 后代
           建立包含块（卡片继续偏在列表容器里），auto 才真正解除。 */
        node.style[prop] = prop === 'willChange' ? 'auto' : 'none'
        restore[prop] = hit[prop]
      }
      releasedAncestors.push({ node, restore })
    }
    node = node.parentElement
  }
}

function restoreContainingBlock() {
  for (const { node, restore } of releasedAncestors) {
    for (const [prop, value] of Object.entries(restore)) node.style[prop] = value
  }
  releasedAncestors = []
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

/* 关闭动作先回到父路由，由路由变化统一收起卡片。 */
async function requestClose() {
  if (routeActive.value) {
    const failure = await router.push({ name: props.parentRouteName })
    if (failure && routeActive.value) closeCard()
  } else {
    closeCard()
  }
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
  releaseContainingBlock(card)
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

/* 收起落定：只隐藏展开内容，不销毁；原有内容一直保留。 */
function settleClosed(card, state, method) {
  const { slot, originalStyle } = state
  closing.value = false
  /* 遮罩淡出需要它在 DOM 里活着：先摘掉 is-open（closeCard 已做），
     等淡出播完再卸节点，避免「啪」一下消失。 */
  clearTimeout(backdropTimer)
  const inner = directChild(card, 'card-inner')
  if (inner) {
    inner.removeAttribute('aria-hidden')
    inner.inert = false
  }
  if (slot.parentNode) slot.remove()
  card.style.cssText = originalStyle
  restoreContainingBlock()
  restoreAria(card, state)

  document.body.classList.remove('locked')
  unlockPageScroll()
  backdropTimer = setTimeout(() => {
    backdropVisible.value = false
  }, reduceMotion() ? 0 : 200)

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

  /* 侧滑松手后交回这里：跟手写下的 translate / scale / 圆角 都保留着，
     正是收起动画的起点 —— 和点返回按钮走同一条弹簧路径，
     只是多过渡一个 transform，所以不会「先消失再在目标位置淡入」。 */
  const swipeClosed = card.dataset.uiSwipeClose === '1'
  delete card.dataset.uiSwipeClose
  const swipeClear = swipeClosed ? ['transform var(--spring-exit-dur) var(--spring-exit)'] : []

  card.style.transition = [
    ...swipeClear,
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

  /* 收起的落点必须**重新测量**：展开期间可能滚动了页面、内容变高变矮、
     视口旋转或响应式断点切换，用展开瞬间的快照当目标，弹簧越猛、
     结束时离真实位置就越远，最后还要「啪」地跳一下。
     占位块还在原位、随文档流一起布局，它就是此刻真实的落点。 */
  const live = slot && slot.isConnected ? slot.getBoundingClientRect() : null
  const target = live && live.width > 0 && live.height > 0
    ? { top: live.top, left: live.left, width: live.width, height: live.height }
    : { top: rect.top, left: rect.left, width: rect.width, height: rect.height }

  // 回到基础表面色与基础描边，而不是回到展开瞬间可能携带的 hover 状态。
  card.style.top = target.top + 'px'
  card.style.left = target.left + 'px'
  card.style.width = target.width + 'px'
  card.style.height = target.height + 'px'
  card.style.borderRadius = originRadius
  card.style.backgroundColor = 'var(--surface-container-low)'
  card.style.borderColor = 'var(--outline-variant)'
  card.style.boxShadow = 'var(--elev-card)'
  if (swipeClosed) {
    /* 松手位置 -> 列表原位：位移与缩放连续收回，不留跳变。 */
    card.style.transform = 'translate3d(0,0,0) scale(1)'
    card.style.opacity = ''
    card.style.zIndex = ''
  }

  const exitMs = reduceMotion() ? 0 : readDuration('--spring-exit-dur', 400)
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    settleClosed(card, state, method)
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
  if (failure && routeActive.value && !getActive() && !closing.value) openCard(method)
}

async function onKeydown(event) {
  if (getActive()) return
  if (event.key !== 'Enter' && event.key !== ' ') return
  if (event.target.closest(IGNORE)) return

  event.preventDefault()
  pendingMethod = 'keyboard'
  const failure = await router.push({ name: props.routeName, params: props.routeParams })
  if (failure && routeActive.value && !getActive() && !closing.value) openCard('keyboard')
}

function scrollCardIntoView() {
  const card = rootEl.value
  const scroller = document.getElementById('scrollArea')
  if (!card || !scroller) return
  const cardRect = card.getBoundingClientRect()
  const scrollerRect = scroller.getBoundingClientRect()
  /* 只在卡片真的不在视口内时才滚（深链直达的场景）。
     从列表里点开展开时卡片本来就在视野中 —— 这时候滚一下，
     返回后用户的阅读位置就丢了。 */
  if (cardRect.top >= scrollerRect.top && cardRect.bottom <= scrollerRect.bottom) return
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
  restoreContainingBlock()
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

    <!-- 展开页就是「另一个页面」：沿用 ZeroScroll，溢出时自动获得
         与主页一致的顶 / 底渐变模糊；id 必须唯一（多个展开卡不能都叫
         scrollArea，否则弹层锁滚动会锁错容器）。 -->
    <ZeroScroll
      ref="scrollerEl"
      class="expand-scroller"
      :id="`expand-${expandKey}`"
      :fade="56"
      :fade-blur="6"
      :fade-layers="8"
      padding="0"
    >
      <div class="expand-content" v-if="loaded">
        <component :is="content" v-bind="contentProps" />
      </div>
    </ZeroScroll>
  </component>
</template>
