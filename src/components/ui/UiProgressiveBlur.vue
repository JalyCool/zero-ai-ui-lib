<script setup>
import { computed } from 'vue'

const props = defineProps({
  /* top = 页面顶端（越靠上越糊）；bottom = 页面底部（越靠下越糊） */
  placement: { type: String, default: 'top', validator: v => ['top', 'bottom'].includes(v) },
  /* 模糊带高度（px） */
  height: { type: Number, default: 100 },
  /* 贴边处的最大模糊半径（px）：向内线性衰减到 0 */
  maxBlur: { type: Number, default: 10 },
  /* 叠加层数：越多渐变越平滑；合成成本随层数线性增长，4~6 层通常够用 */
  layers: { type: Number, default: 5 },
  /* 染色（贴边处的背景色，向内渐隐）：默认 surface，对应设计稿的白 0.8 → 透明 */
  tint: { type: String, default: 'var(--surface)' },
  /* 染色强度 0~1；0 = 关闭染色层（只要模糊） */
  tintStrength: { type: Number, default: 0.8 },
  /* 定位：absolute 贴父容器边缘（页面顶/底覆盖在滚动内容上）；
     需要普通流内使用时改 relative */
  position: { type: String, default: 'absolute', validator: v => ['absolute', 'relative', 'fixed'].includes(v) }
})

/* ============================================================
   渐进式模糊（页面顶端 / 底部）
   ------------------------------------------------------------
   原理：N 层 backdrop-filter 叠加。每层模糊半径 = maxBlur / N，
   覆盖带从贴边向内逐层缩短（第 i 层盖到 i/N），mask 用两段线性
   渐变做软边 —— 离边越远叠到的层数越少，模糊强度线性衰减到 0，
   没有硬边界。最后叠一层染色渐变（surface → 透明），
   与设计稿「白 0.8 → 透明 + backdrop-blur」的顶/底栏同源。
   层全部 pointer-events: none：盖在可交互内容上不拦截。
   ============================================================ */

const rootStyle = computed(() => ({
  height: props.height + 'px',
  position: props.position,
  '--pb-tint': props.tint,
  '--pb-tint-strength': String(props.tintStrength)
}))

const toEdge = computed(() => (props.placement === 'top' ? 'to bottom' : 'to top'))

const layerStyles = computed(() => {
  const count = Math.max(1, Math.min(12, Math.round(props.layers)))
  const list = []
  for (let i = 0; i < count; i++) {
    const start = ((i / count) * 100).toFixed(2)
    const end = (((i + 1) / count) * 100).toFixed(2)
    const mask = `linear-gradient(${toEdge.value}, rgba(0,0,0,1) ${start}%, rgba(0,0,0,0) ${end}%)`
    const blur = (props.maxBlur / count).toFixed(2)
    list.push({
      backdropFilter: `blur(${blur}px)`,
      WebkitBackdropFilter: `blur(${blur}px)`,
      maskImage: mask,
      WebkitMaskImage: mask
    })
  }
  return list
})
</script>

<template>
  <div
    class="ui-progressive-blur"
    :class="'is-' + placement"
    :style="rootStyle"
    aria-hidden="true"
  >
    <div
      v-for="(layer, index) in layerStyles"
      :key="index"
      class="ui-progressive-blur__layer"
      :style="layer"
    ></div>
    <div v-if="tintStrength > 0" class="ui-progressive-blur__tint"></div>
  </div>
</template>

<style scoped>
.ui-progressive-blur {
  left: 0;
  right: 0;
  z-index: 50;
  pointer-events: none;
}
.ui-progressive-blur.is-top { top: 0; }
.ui-progressive-blur.is-bottom { bottom: 0; }
.ui-progressive-blur__layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
/* 染色层：贴边处 tint 最浓，向内渐隐；默认也带 pointer-events none */
.ui-progressive-blur__tint {
  position: absolute;
  inset: 0;
}
.ui-progressive-blur.is-top .ui-progressive-blur__tint {
  background: linear-gradient(to bottom, color-mix(in oklab, var(--pb-tint) calc(var(--pb-tint-strength) * 100%), transparent), transparent);
}
.ui-progressive-blur.is-bottom .ui-progressive-blur__tint {
  background: linear-gradient(to top, color-mix(in oklab, var(--pb-tint) calc(var(--pb-tint-strength) * 100%), transparent), transparent);
}
@media (prefers-reduced-motion: reduce) {
  /* 静态层无动效，无需降级 */
}
</style>