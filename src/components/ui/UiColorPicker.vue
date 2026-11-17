<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '#3f5f90' },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /* 预设色板 */
  swatches: { type: Array, default: () => ['#3f5f90', '#0f766e', '#b45309', '#ba1a1a', '#7b5294', '#1b1b1f', '#46464f', '#c7c5d0'] }
})
const emit = defineEmits(['update:modelValue'])

/* ============================================================
   取色盘（结构照 Nuxt UI 的 ColorPicker）
   ------------------------------------------------------------
   · 左侧：饱和度 × 明度的选择面（横轴饱和度、纵轴明度倒置），
     底色跟当前色相，上面叠白 / 黑两层渐变。
   · 右侧：竖直色相轨道，把手按角度定位。
   · 自己实现 HSV / RGB / HEX 换算，不调用系统取色器。
   ============================================================ */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const pad = value => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')

function normalizeHex(value) {
  const raw = String(value || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) return ('#' + raw[1] + raw[1] + raw[2] + raw[2] + raw[3] + raw[3]).toLowerCase()
  return '#000000'
}
function hexToRgb(hex) {
  const value = normalizeHex(hex)
  return {
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16)
  }
}
function rgbToHex({ r, g, b }) {
  return '#' + pad(r) + pad(g) + pad(b)
}
function hexToHsv(hex) {
  return rgbToHsv(hexToRgb(hex))
}
function rgbToHsv({ r, g, b }) {
  const rr = r / 255
  const gg = g / 255
  const bb = b / 255
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === rr) h = 60 * (((gg - bb) / delta) % 6)
    else if (max === gg) h = 60 * ((bb - rr) / delta + 2)
    else h = 60 * ((rr - gg) / delta + 4)
  }
  if (h < 0) h += 360
  return { h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 }
}
function hsvToRgb({ h, s, v }) {
  const ss = clamp(s, 0, 100) / 100
  const vv = clamp(v, 0, 100) / 100
  const hue = ((h % 360) + 360) % 360
  const c = vv * ss
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = vv - c
  let rgb = [0, 0, 0]
  if (hue < 60) rgb = [c, x, 0]
  else if (hue < 120) rgb = [x, c, 0]
  else if (hue < 180) rgb = [0, c, x]
  else if (hue < 240) rgb = [0, x, c]
  else if (hue < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  return { r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 }
}
function hsvToHex(hsv) {
  return rgbToHex(hsvToRgb(hsv))
}

const hex = computed(() => normalizeHex(props.modelValue).toUpperCase())
/* 先算一次初值，再分给三个 ref；也保证 hexToHsv 的调用位置在其定义之后。 */
const startHsv = hexToHsv(props.modelValue)
const hue = ref(startHsv.h)
const sat = ref(startHsv.s)
const bright = ref(startHsv.v)

function syncFromProp() {
  const next = hexToHsv(props.modelValue)
  /* 纯黑 / 纯白时色相已经丢失，保留当前轨道位置，拖动才不会突然跳回红色。 */
  if (next.s > 0 && next.v > 0) hue.value = next.h
  sat.value = next.s
  bright.value = next.v
}
watch(() => props.modelValue, value => {
  if (hsvToHex({ h: hue.value, s: sat.value, v: bright.value }) !== normalizeHex(value)) syncFromProp()
})
syncFromProp()

function emitColor() {
  emit('update:modelValue', hsvToHex({ h: hue.value, s: sat.value, v: bright.value }))
}
function setSaturationBrightness(event, canvas) {
  const rect = canvas.getBoundingClientRect()
  sat.value = clamp(((event.clientX - rect.left) / Math.max(1, rect.width)) * 100, 0, 100)
  bright.value = clamp((1 - (event.clientY - rect.top) / Math.max(1, rect.height)) * 100, 0, 100)
  emitColor()
}
function setHue(event, track) {
  const rect = track.getBoundingClientRect()
  hue.value = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1) * 360
  emitColor()
}

const canvasEl = ref(null)
const trackEl = ref(null)
let dragMode = ''
let dragTarget = null

function onWindowMove(event) {
  if (!dragMode || !dragTarget) return
  if (dragMode === 'canvas') setSaturationBrightness(event, dragTarget)
  else setHue(event, dragTarget)
}
function stopDrag() {
  dragMode = ''
  dragTarget = null
  window.removeEventListener('pointermove', onWindowMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
}
function startDrag(mode, event) {
  if (props.disabled) return
  const target = mode === 'canvas' ? canvasEl.value : trackEl.value
  if (!target) return
  event.preventDefault()
  dragMode = mode
  dragTarget = target
  if (mode === 'canvas') setSaturationBrightness(event, target)
  else setHue(event, target)
  window.addEventListener('pointermove', onWindowMove)
  window.addEventListener('pointerup', stopDrag)
  window.addEventListener('pointercancel', stopDrag)
}
function onCanvasKey(event) {
  if (props.disabled) return
  const step = event.shiftKey ? 10 : 1
  if (event.key === 'ArrowLeft') { sat.value = clamp(sat.value - step, 0, 100); emitColor() }
  else if (event.key === 'ArrowRight') { sat.value = clamp(sat.value + step, 0, 100); emitColor() }
  else if (event.key === 'ArrowUp') { bright.value = clamp(bright.value + step, 0, 100); emitColor() }
  else if (event.key === 'ArrowDown') { bright.value = clamp(bright.value - step, 0, 100); emitColor() }
  else return
  event.preventDefault()
}
function onTrackKey(event) {
  if (props.disabled) return
  const step = event.shiftKey ? 10 : 4
  if (event.key === 'ArrowUp') { hue.value = (hue.value - step + 360) % 360; emitColor() }
  else if (event.key === 'ArrowDown') { hue.value = (hue.value + step) % 360; emitColor() }
  else return
  event.preventDefault()
}

function pick(color) {
  emit('update:modelValue', normalizeHex(color))
}
function onHexInput(event) {
  const raw = String(event.target.value || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) pick(raw)
}
function onHexBlur(event) {
  event.target.value = hex.value
}

const canvasStyle = computed(() => ({ '--hue': hue.value + 'deg' }))
const thumbStyle = computed(() => ({ left: sat.value + '%', top: (100 - bright.value) + '%' }))
const hueThumbStyle = computed(() => ({ top: (hue.value / 360) * 100 + '%' }))
const trackThumbColor = computed(() => hsvToHex({ h: hue.value, s: 100, v: 100 }))

onBeforeUnmount(stopDrag)
</script>

<template>
  <div class="ui-color" :class="{ 'is-disabled': disabled }">
    <span v-if="label" class="ui-color__label">{{ label }}</span>

    <div class="ui-color__picker">
      <div
        ref="canvasEl"
        class="ui-color__canvas"
        :style="canvasStyle"
        role="slider"
        aria-label="饱和度和明度"
        :aria-valuenow="Math.round(sat)"
        :aria-valuetext="'饱和度 ' + Math.round(sat) + '%，明度 ' + Math.round(bright) + '%'"
        :tabindex="disabled ? -1 : 0"
        @pointerdown="startDrag('canvas', $event)"
        @keydown="onCanvasKey"
      >
        <span class="ui-color__shade ui-color__shade--white" aria-hidden="true"></span>
        <span class="ui-color__shade ui-color__shade--black" aria-hidden="true"></span>
        <span class="ui-color__thumb" :style="thumbStyle" aria-hidden="true"></span>
      </div>

      <div
        ref="trackEl"
        class="ui-color__track"
        role="slider"
        aria-label="色相"
        :aria-valuenow="Math.round(hue)"
        :aria-valuetext="Math.round(hue) + ' 度'"
        :tabindex="disabled ? -1 : 0"
        @pointerdown="startDrag('track', $event)"
        @keydown="onTrackKey"
      >
        <span class="ui-color__track-thumb" :style="hueThumbStyle" aria-hidden="true"></span>
      </div>
    </div>

    <div class="ui-color__row">
      <span class="ui-color__current" :style="{ background: hex }" aria-hidden="true"></span>
      <input
        class="ui-color__hex"
        :value="hex"
        inputmode="text"
        maxlength="7"
        aria-label="十六进制颜色"
        :disabled="disabled"
        @change="onHexInput"
        @blur="onHexBlur"
      />
    </div>

    <div v-if="swatches.length" class="ui-color__swatches">
      <button
        v-for="color in swatches"
        :key="color"
        type="button"
        class="ui-color__dot"
        :class="{ 'is-on': normalizeHex(color) === normalizeHex(hex) }"
        :style="{ background: color }"
        :aria-label="color"
        :disabled="disabled"
        @click="pick(color)"
      ></button>
    </div>
  </div>
</template>

<style scoped>
.ui-color { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.ui-color__label { font-size: var(--fs-tiny); font-weight: var(--w-label); color: var(--on-surface-variant); }
.ui-color.is-disabled { opacity: .5; }

.ui-color__picker { display: flex; gap: 10px; min-width: 0; }
.ui-color__canvas {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 148px;
  border-radius: calc(14px * var(--radius-scale));
  background: hsl(var(--hue, 210) 100% 50%);
  box-shadow: inset 0 0 0 var(--border-w) color-mix(in oklab, var(--outline-variant) 55%, transparent);
  cursor: crosshair;
  touch-action: none;
  outline: none;
}
.ui-color__canvas:focus-visible { box-shadow: 0 0 0 var(--focus-w) var(--primary); }
.ui-color__shade { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
.ui-color__shade--white { background: linear-gradient(to right, #fff 0%, rgba(255, 255, 255, 0) 100%); }
.ui-color__shade--black { background: linear-gradient(to top, #000 0%, rgba(0, 0, 0, 0) 100%); }
.ui-color__thumb {
  position: absolute;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .25), 0 1px 3px rgba(0, 0, 0, .3);
  pointer-events: none;
  transition: transform var(--t-feedback);
}
.ui-color__canvas:active .ui-color__thumb { transform: scale(1.15); }

.ui-color__track {
  position: relative;
  flex: 0 0 14px;
  height: 148px;
  border-radius: 999px;
  background: linear-gradient(to bottom, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
  cursor: pointer;
  touch-action: none;
  outline: none;
}
.ui-color__track:focus-visible { box-shadow: 0 0 0 var(--focus-w) var(--primary); }
.ui-color__track-thumb {
  position: absolute;
  left: 50%;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: v-bind('trackThumbColor');
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .28), 0 1px 3px rgba(0, 0, 0, .3);
  pointer-events: none;
}

.ui-color__row { display: flex; align-items: center; gap: 9px; }
.ui-color__current {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: calc(10px * var(--radius-scale));
  border: var(--border-w) solid var(--outline-variant);
}
.ui-color__hex {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 11px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(10px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  font: inherit;
  font-size: var(--fs-small);
  font-family: var(--font-mono);
  text-transform: uppercase;
  outline: none;
  transition: border-color var(--t-fade);
}
.ui-color__hex:focus { border-color: var(--primary); }
.ui-color__swatches { display: flex; flex-wrap: wrap; gap: 7px; }
.ui-color__dot {
  width: 24px;
  height: 24px;
  padding: 0;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 50%;
  cursor: pointer;
  transition: transform var(--t-feedback), box-shadow var(--t-fade);
}
.ui-color__dot:active { transform: scale(var(--press-scale)); }
.ui-color__dot.is-on { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--primary); }
</style>
