<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '#3f5f90' },
  label: { type: String, default: '' },
  /* 预设色板 */
  swatches: { type: Array, default: () => ['#3f5f90', '#0f766e', '#b45309', '#ba1a1a', '#7b5294', '#1b1b1f', '#46464f', '#c7c5d0'] }
})
const emit = defineEmits(['update:modelValue'])
/* 颜色选择器：预设色板 + 原生取色 + HEX 输入，三者同步。 */
const hex = computed(() => String(props.modelValue || '#000000').toUpperCase())
function pick(value) { emit('update:modelValue', String(value).toLowerCase()) }
function onText(event) {
  const raw = String(event.target.value || '').replace(/[^#0-9a-fA-F]/g, '')
  if (/^#?[0-9a-fA-F]{6}$/.test(raw)) pick(raw.startsWith('#') ? raw : '#' + raw)
}
</script>
<template>
  <div class="ui-color-field">
    <span v-if="label" class="ui-color-field__label">{{ label }}</span>
    <div class="ui-color-field__row">
      <label class="ui-color-field__current" :style="{ background: hex }">
        <input type="color" :value="hex" aria-label="取色" @input="pick($event.target.value)" />
      </label>
      <input class="ui-color-field__hex" :value="hex" inputmode="text" maxlength="7" @change="onText" />
    </div>
    <div class="ui-color-field__swatches">
      <button v-for="color in swatches" :key="color" type="button" class="ui-color-field__dot"
        :class="{ 'is-on': color.toLowerCase() === hex.toLowerCase() }" :style="{ background: color }"
        :aria-label="color" @click="pick(color)"></button>
    </div>
  </div>
</template>
<style scoped>
.ui-color-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ui-color-field__label { font-size: var(--fs-tiny); font-weight: var(--w-label); color: var(--on-surface-variant); }
.ui-color-field__row { display: flex; align-items: center; gap: 10px; }
.ui-color-field__current { position: relative; width: 42px; height: 42px; border-radius: calc(12px * var(--radius-scale)); border: var(--border-w) solid var(--outline-variant); cursor: pointer; overflow: hidden; }
.ui-color-field__current input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.ui-color-field__hex { flex: 1; min-width: 0; padding: 9px 11px; border: var(--border-w) solid var(--outline-variant); border-radius: 10px; background: var(--surface-container-low); color: var(--on-surface); font: inherit; font-size: var(--fs-small); font-family: ui-monospace, monospace; text-transform: uppercase; }
.ui-color-field__swatches { display: flex; flex-wrap: wrap; gap: 7px; }
.ui-color-field__dot { width: 26px; height: 26px; padding: 0; border: var(--border-w) solid var(--outline-variant); border-radius: 50%; cursor: pointer; transition: transform var(--t-feedback); }
.ui-color-field__dot:active { transform: scale(var(--press-scale)); }
.ui-color-field__dot.is-on { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--primary); }
</style>
