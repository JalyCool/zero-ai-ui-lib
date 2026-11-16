<script setup>
import { computed } from 'vue'

const props = defineProps({
  /* [{ value, label, icon }]；icon 是 24x24 viewBox 内的 SVG 内部标记
     （可以是多个 path / rect / circle 组合）。 */
  items: { type: Array, default: () => [] },
  modelValue: { type: [String, Number], default: '' },
  /* 无障碍标签 */
  label: { type: String, default: '主导航' },
  /* 桌面端竖排断点（px） */
  desktopAt: { type: Number, default: 900 }
})

const emit = defineEmits(['update:modelValue', 'change'])

/* ============================================================
   底部 / 侧边导航条
   移动端：贴底横排，等分整条宽度。
   桌面端（>= desktopAt）：贴左竖排，背景铺满整个高度，
   tab 从顶部按固定间距往下排（不平分高度）。
   两套定位写在互斥的 media 查询里，永不共存，
   打包顺序再怎么变也不会互相污染。
   ============================================================ */

const active = computed(() => props.modelValue)

function pick(value) {
  if (value === active.value) return
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <nav class="ui-tabbar" :aria-label="label">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      class="ui-tabbar__tab"
      :class="{ 'is-active': active === item.value }"
      :data-tab="item.value"
      :aria-current="active === item.value ? 'page' : undefined"
      @click="pick(item.value)"
    >
      <span class="ui-tabbar__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="item.icon"></svg>
      </span>
      <span class="ui-tabbar__text">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.ui-tabbar {
  position: fixed;
  display: flex;
  z-index: 20;
  background: var(--surface-container-low);
  transition: background var(--t-fade), border-color var(--t-fade);
}
.ui-tabbar__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-weight: 550;
  cursor: pointer;
  border-radius: calc(14px * var(--radius-scale));
  transition: color var(--t-fade), transform var(--t-feedback);
}
.ui-tabbar__tab:active { transform: scale(var(--press-scale)); }
.ui-tabbar__icon {
  width: 48px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  transition: background var(--t-fade);
}
.ui-tabbar__icon svg { width: 20px; height: 20px; }
.ui-tabbar__tab.is-active { color: var(--accent); }
.ui-tabbar__tab.is-active .ui-tabbar__icon { background: var(--accent-container); }
.ui-tabbar__text { white-space: nowrap; }

/* ---- 移动端：贴底横排。
   背景始终铺满整屏宽度（不设 max-width），
   里面的 tab 总宽另有上限，宽屏手机上不会被拉得过散。 ---- */
@media (max-width: 899.98px) {
  .ui-tabbar {
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    width: 100%;
    max-width: none;
    padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
    display: flex;
    justify-content: center;
    /* 全库唯一的阴影：TabBar 悬浮在内容上，向上投一层淡淡的分离影 */
    box-shadow: 0 -6px 24px color-mix(in oklab, var(--on-surface) 14%, transparent);
  }
  /* tab 总宽上限：超出后每个 tab 按内容收拢，不再等分铺满。 */
  .ui-tabbar__tab { flex: 1 1 0; min-width: 0; max-width: 96px; }
}

/* ---- 桌面端：贴左竖排，背景铺满整个高度，tab 从顶部固定间距往下排 ---- */
@media (min-width: 900px) {
  .ui-tabbar {
    top: 0;
    bottom: 0;
    left: 0;
    right: auto;
    transform: none;
    width: 74px;
    max-width: none;
    height: 100dvh;
    flex-direction: column;
    justify-content: flex-start;
    gap: 6px;
    padding: 16px 8px;
    box-shadow: 8px 0 24px color-mix(in oklab, var(--on-surface) 14%, transparent);
  }
  .ui-tabbar__tab { flex: 0 0 auto; width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-tabbar__tab:active { transform: none; }
}
</style>
