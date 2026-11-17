<script setup>
import { computed, ref } from 'vue'
import UiProgressiveBlur from '../ui/UiProgressiveBlur.vue'
import { useScrollEdges } from '../../composables/useScrollEdges'

const props = defineProps({
  /* 滚动元素的 id（默认 scrollArea）：UiModal / UiBottomSheet /
     ExpandableCard 打开时锁的就是它。改名字这些组件就锁不住页面。 */
  id: { type: String, default: 'scrollArea' },
  /* 滚动元素用什么标签：外层外壳用 main / div，卡片内用 div */
  tag: { type: String, default: 'div' },
  /* 淡出带高度（px）；0 = 关闭（不渲染模糊层，省一层合成） */
  fade: { type: Number, default: 84 },
  /* 贴边处最大模糊（px） */
  fadeBlur: { type: Number, default: 7 },
  /* 层数：4~6 足够平滑，越多合成成本越高 */
  fadeLayers: { type: Number, default: 12 },
  /* 染色：默认 surface，向内渐隐到透明 */
  fadeTint: { type: String, default: 'var(--surface)' },
  fadeTintStrength: { type: Number, default: 0.8 },
  /* 内容内边距：直接传给滚动元素 */
  padding: { type: String, default: '' }
})

/* ============================================================
   ZeroScroll —— 自带「溢出即模糊」的滚动容器
   ------------------------------------------------------------
   把顶 / 底渐进模糊变成**约定**而不是每个页面要记的配置：
   写一个滚动区就自动获得符合物理直觉的边缘处理 ——
   · 顶部还有被裁内容 -> 顶部模糊淡入；到顶 -> 淡出
   · 底部还有被裁内容 -> 底部模糊淡入；到底 -> 淡出
   · 内容不足一屏 -> 两侧都不出现（没有溢出就没有模糊）

   模糊层**常驻不销毁**，只切不透明度：backdrop-filter 反复重建会闪，
   而且层数多时重建代价明显。

   典型用法（应用外壳直接用它，见 ZeroApp）：
     <ZeroScroll id="scrollArea" tag="main" padding="20px 16px 110px">
       …页面内容…
     </ZeroScroll>
   ============================================================ */

const viewEl = ref(null)
const { canScrollUp, canScrollDown } = useScrollEdges(viewEl)

const viewStyle = computed(() => (props.padding ? { padding: props.padding } : undefined))

defineExpose({
  /* 交给外部做「切 Tab 回顶」这类操作 */
  scrollTo: (...args) => viewEl.value?.scrollTo?.(...args),
  scrollTop: (top = 0) => viewEl.value?.scrollTo?.({ top }),
  el: viewEl
})
</script>

<template>
  <div class="zero-scroll">
    <component
      :is="tag"
      :id="id"
      ref="viewEl"
      class="zero-scroll__view"
      :style="viewStyle"
    >
      <slot />
    </component>

    <template v-if="fade > 0">
      <UiProgressiveBlur
        placement="top"
        :height="fade"
        :max-blur="fadeBlur"
        :layers="fadeLayers"
        :tint="fadeTint"
        :tint-strength="fadeTintStrength"
        :visible="canScrollUp"
      />
      <UiProgressiveBlur
        placement="bottom"
        :height="fade"
        :max-blur="fadeBlur"
        :layers="fadeLayers"
        :tint="fadeTint"
        :tint-strength="fadeTintStrength"
        :visible="canScrollDown"
      />
    </template>
  </div>
</template>

<style scoped>
/* 两种父级都要能撑满：
   · flex 父级 -> flex: 1 分配剩余空间
   · 固定高度的普通块级父级 -> height: 100% 生效
   ⚠️ flex-basis 必须是 0（flex: 1 = 1 1 0%），不能用 1 1 auto：
   auto 会让 basis 取 height（100% 父高）→ ZeroApp 这种 flex column
   外壳里它把兄弟（TabBar）挤出布局流，滚动区延伸到 TabBar 底下。
   非 flex 父级里 height: 100% 仍然兜底生效。 */
.zero-scroll {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.zero-scroll__view {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.zero-scroll__view::-webkit-scrollbar { display: none; }
</style>