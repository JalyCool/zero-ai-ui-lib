<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { ICONS, iconMarkup } from '../../core/icons'
import { normalizeIconName } from '../../core/iconify'

const props = defineProps({
  /* 三种来源：
     · name    —— 本地注册表 key 或 Iconify 名（pack:icon）
     · svg     —— 24x24（或配 icon-view-box）内的 SVG 内部标记，直接渲染
     · src     —— 位图地址（png/jpg/webp/gif/base64 data URL） */
  name: { type: String, default: '' },
  svg: { type: String, default: '' },
  src: { type: String, default: '' },
  svgViewBox: { type: String, default: '' },
  /* 像素尺寸；也可传 CSS 长度（如 1em，内联在文字里用） */
  size: { type: [Number, String], default: 18 },
  /* 是否填充（默认描边；只对本地注册表标记生效，Iconify 图标跟随 currentColor） */
  filled: { type: Boolean, default: false },
  strokeWidth: { type: [Number, String], default: 1.9 },
  label: { type: String, default: '' },
  /* ============================================================
     底板（backdrop）：图标坐在一块带形状的底色上
     ------------------------------------------------------------
     backdrop = 'none'（默认，无底板）| 'circle' | 'squircle' |
                'square' | 'rounded' 或任意 CSS border-radius 值
     backdropColor：底板色（默认 accent-container 语义的淡主色）
     ============================================================ */
  backdrop: { type: String, default: 'none' },
  backdropColor: { type: String, default: '' },
  /* ============================================================
     遮罩（clip）：把位图 / SVG 裁成指定形状（与 UiAvatar.src 同语义）
     circle | squircle | square | rounded | hexagon | diamond | blob
     —— 位图模式默认 circle；SVG 模式默认 none（SVG 有自己的形状，
     裁圆会把三角头像切成圆饼）。值同时影响 border-radius / clip-path。
     ============================================================ */
  clip: { type: String, default: '' }
})

/* 来源优先级：显式 src > 显式 svg > 注册表/Iconify */
const mode = computed(() => {
  if (props.src) return 'image'
  if (props.svg) return 'svg'
  return 'name'
})

/* 本地注册表优先（registerIcons / 内置 ICONS）；否则按 Iconify 名字渲染。
   名字先归一化：pack/icon、pack--icon、i-pack:icon 都折算成 pack:icon。 */
const local = computed(() => (mode.value === 'name' ? (iconMarkup(props.name) || ICONS[props.name] || '') : ''))
const iconifyName = computed(() => {
  if (mode.value !== 'name' || local.value) return ''
  const n = normalizeIconName(props.name)
  /* 没有 pack:icon 分隔符的裸名字不是 Iconify 名（注册表未命中就渲染空） */
  return n.includes(':') ? n : ''
})

/* 位图默认裁圆（头像/图标语义）；SVG 默认不裁 */
const clipShape = computed(() => props.clip || (mode.value === 'image' ? 'circle' : 'none'))

/* 底板与遮罩都落到 border-radius / clip-path */
const CLIP_PATHS = {
  hexagon: 'polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
  diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
  blob: 'polygon(50% 2%, 72% 7%, 88% 22%, 98% 45%, 92% 70%, 74% 88%, 50% 98%, 26% 88%, 8% 70%, 2% 45%, 12% 22%, 28% 7%)'
}

function radiusOf(shape, fallback) {
  switch (shape) {
    case 'circle': return '50%'
    case 'squircle': return '36%'
    case 'rounded': return fallback
    case 'square': return '0'
    default: return shape /* 直接传 CSS 值 */
  }
}

const rootStyle = computed(() => {
  const px = typeof props.size === 'number' ? props.size + 'px' : props.size
  const style = {
    width: px,
    height: px,
    '--ui-icon-radius': radiusOf(props.backdrop === 'none' ? clipShape.value : props.backdrop, '18%')
  }
  const shape = props.backdrop === 'none' ? clipShape.value : props.backdrop
  if (CLIP_PATHS[shape]) style.clipPath = CLIP_PATHS[shape]
  if (props.backdrop !== 'none') style.background = props.backdropColor || 'var(--primary-container)'
  return style
})

const svgViewBox = computed(() => props.svgViewBox || (mode.value === 'svg' ? '0 0 24 24' : '0 0 24 24'))
</script>
<template>
  <span class="ui-icon" :class="'is-' + mode" :style="rootStyle" :role="label ? 'img' : undefined" :aria-label="label || undefined" :aria-hidden="label ? undefined : 'true'">
    <!-- 位图：object-fit 铺满 + 遮罩裁形 -->
    <img v-if="mode === 'image'" class="ui-icon__img" :src="src" :alt="label || ''" loading="lazy" />
    <!-- 显式 SVG：保留调用方的形状，不裁切（clip 默认 none） -->
    <svg v-else-if="mode === 'svg'" :viewBox="svgViewBox" :fill="filled ? 'currentColor' : 'none'" :stroke="filled ? 'none' : 'currentColor'" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" v-html="svg"></svg>
    <Icon v-else-if="iconifyName" :icon="iconifyName" :width="size" :height="size" aria-hidden="true" />
    <svg v-else viewBox="0 0 24 24" :fill="filled ? 'currentColor' : 'none'" :stroke="filled ? 'none' : 'currentColor'" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" v-html="local"></svg>
  </span>
</template>
<style scoped>
.ui-icon {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  color: currentColor;
  border-radius: var(--ui-icon-radius, 18%);
  transition: background var(--t-fade), border-radius var(--t-fade);
}
.ui-icon svg,
.ui-icon :deep(svg) { width: 100%; height: 100%; display: block; }
.ui-icon__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>