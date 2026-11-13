<script setup>
import { state } from '../core/state'
import { PRESET_COLORS } from '../core/theme'

function setSeed(color) {
  state.seed = color
}

function onCustom(event) {
  state.seed = event.target.value
}
</script>

<template>
  <div class="sheet-panel active" data-panel="color">
    <span class="dlg-label">配色方案</span>
    <div class="segmented" id="schemeSeg">
      <button data-scheme="material" :class="{ active: state.scheme === 'material' }" @click="state.scheme = 'material'">Material 鲜艳</button>
      <button data-scheme="mono" :class="{ active: state.scheme === 'mono' }" @click="state.scheme = 'mono'">黑白灰</button>
    </div>

    <div v-show="state.scheme !== 'mono'" id="seedSection">
      <span class="dlg-label">主题色</span>
      <div class="swatches" id="swatches">
        <button
          v-for="color in PRESET_COLORS"
          :key="color"
          class="swatch"
          :class="{ active: state.seed.toLowerCase() === color.toLowerCase() }"
          :data-color="color"
          :style="{ background: color }"
          :title="color"
          :aria-label="color"
          @click="setSeed(color)"
        ></button>
      </div>

      <span class="dlg-label">自定义</span>
      <div class="custom-row">
        <input type="color" id="customColor" :value="state.seed" @input="onCustom">
        <div>
          <div class="hex" id="hexLabel">{{ state.seed.toUpperCase() }}</div>
          <div class="hint">选一个颜色，自动生成整套系统</div>
        </div>
      </div>
    </div>

    <span class="dlg-label">外观</span>
    <div class="segmented four" id="appearanceSeg">
      <button data-appearance="light" :class="{ active: state.appearance === 'light' }" @click="state.appearance = 'light'">浅色</button>
      <button data-appearance="dark" :class="{ active: state.appearance === 'dark' }" @click="state.appearance = 'dark'">深色</button>
      <button data-appearance="white" :class="{ active: state.appearance === 'white' }" @click="state.appearance = 'white'">纯白</button>
      <button data-appearance="black" :class="{ active: state.appearance === 'black' }" @click="state.appearance = 'black'">纯黑</button>
    </div>

    <div class="dlg-preview">
      <button class="sample-btn">主要按钮</button>
      <span class="sample-chip">标签</span>
    </div>
  </div>
</template>
