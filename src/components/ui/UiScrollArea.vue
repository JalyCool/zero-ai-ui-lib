<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  /* 最大高度；不传就是自适应父级 */
  maxHeight: { type: String, default: '' },
  height: { type: String, default: '' },
  /* 边缘阴影：内容滚动时上下出现提示 */
  shadows: { type: Boolean, default: true },
  axis: { type: String, default: 'y' }
})
const el = ref(null)
const atTop = ref(true)
const atEnd = ref(true)

/* 滚动容器：自绘滚动条 + 边缘阴影（滚动时提示「上面/下面还有」）。
   浮层类组件锁滚动找的是 #scrollArea，这个组件只是「容器内的滚动区」。 */
function update() {
  const node = el.value
  if (!node) return
  atTop.value = node.scrollTop <= 1
  atEnd.value = node.scrollTop + node.clientHeight >= node.scrollHeight - 1
}
let observer = null
onMounted(() => {
  update()
  el.value && el.value.addEventListener('scroll', update, { passive: true })
  if (typeof ResizeObserver !== 'undefined' && el.value) { observer = new ResizeObserver(update); observer.observe(el.value) }
})
onBeforeUnmount(() => {
  el.value && el.value.removeEventListener('scroll', update)
  if (observer) observer.disconnect()
})
</script>

<template>
  <div
    ref="el"
    class="ui-scroll-area"
    :class="{ 'is-shadow-top': shadows && !atTop, 'is-shadow-bottom': shadows && !atEnd, 'is-x': axis === 'x' }"
    :style="{ maxHeight, height }"
  ><slot /></div>
</template>

<style scoped>
.ui-scroll-area {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, var(--on-surface) 24%, transparent) transparent;
  overscroll-behavior: contain;
}
.ui-scroll-area.is-x { overflow-x: auto; overflow-y: hidden; }
.ui-scroll-area::-webkit-scrollbar { width: 6px; height: 6px; }
.ui-scroll-area::-webkit-scrollbar-thumb { border-radius: 99px; background: color-mix(in oklab, var(--on-surface) 22%, transparent); }
.ui-scroll-area::-webkit-scrollbar-track { background: transparent; }
/* 边缘阴影：用渐变蒙版叠在容器上下沿 */
.ui-scroll-area::before,
.ui-scroll-area::after {
  content: '';
  position: sticky;
  left: 0;
  right: 0;
  display: block;
  height: 14px;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--t-fade);
  z-index: 1;
}
.ui-scroll-area::before { top: 0; background: linear-gradient(var(--surface-container-low), transparent); margin-bottom: -14px; }
.ui-scroll-area::after { bottom: 0; background: linear-gradient(transparent, var(--surface-container-low)); margin-top: -14px; }
.ui-scroll-area.is-shadow-top::before,
.ui-scroll-area.is-shadow-bottom::after { opacity: 1; }
</style>
