<script setup>
import { computed } from 'vue'

/* ============================================================
   卡片（参考 Nuxt UI 的 Card）
   ------------------------------------------------------------
   · 三段结构：#header（页眉） / 默认插槽（主体） / #footer（页脚）
   · 页眉也可以只用 title / description / icon 三个 prop 快速生成，
     #actions 放在页眉右侧；#header 插槽整体接管页眉时不再渲染默认标题。
   · divider 控制段与段之间是否画分隔线（默认画）。
   · clickable 只负责表现（hover / 按下），点击事件由使用方绑定。
   ============================================================ */

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  /* 24x24 viewBox 内的 SVG 内部标记 */
  icon: { type: String, default: '' },
  /* 段之间是否画分隔线 */
  divider: { type: Boolean, default: true },
  /* 尺寸只影响内边距 */
  size: { type: String, default: 'md' },
  variant: { type: String, default: 'filled' },
  /* 仅表现：悬停抬色 + 按下收缩；点击事件由应用自己绑 */
  clickable: { type: Boolean, default: false },
  /* ---------- variant="product"（产品授权卡） ---------- */
  productName: { type: String, default: '' },
  /* SVG 内部标记；viewBox 可自定义（品牌图标多半不是 24×24） */
  productIcon: { type: String, default: '' },
  productIconViewBox: { type: String, default: '0 0 24 24' },
  /* 品牌强调色：只用于图标底色、底部光晕与渐变文字 */
  accent: { type: String, default: '#3ecf8e' }
})

const isProduct = computed(() => props.variant === 'product')

</script>

<template>
  <section
    class="ui-card"
    :class="[`ui-card--${variant}`, `ui-card--${size}`, {
      /* 产品卡不分段画线：品牌卡是一整块，不要被分隔线切碎。 */
      'has-divider': divider && !isProduct,
      'is-clickable': clickable
    }]"
    :style="isProduct ? { '--card-accent': accent } : undefined"
  >
    <!-- 产品卡底部的一圈品牌色光晕：随主题 / accent 变化，不用固定位图 -->
    <span v-if="isProduct" class="ui-card__glow" aria-hidden="true"></span>

    <header
      v-if="$slots.header || title || description || icon || productName || productIcon || $slots.actions"
      class="ui-card__header"
    >
      <slot name="header">
        <template v-if="isProduct">
          <span class="ui-card__product-icon" aria-hidden="true">
            <svg
              v-if="productIcon"
              :viewBox="productIconViewBox"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              v-html="productIcon"
            ></svg>
          </span>
          <span class="ui-card__titles">
            <b class="ui-card__title">{{ productName || title }}</b>
          </span>
        </template>
        <template v-else>
          <span v-if="icon" class="ui-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="icon"></svg>
          </span>
          <span class="ui-card__titles">
            <b v-if="title" class="ui-card__title">{{ title }}</b>
            <span v-if="description" class="ui-card__description">{{ description }}</span>
          </span>
        </template>
      </slot>
      <div v-if="$slots.actions" class="ui-card__actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="ui-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="ui-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.ui-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border-radius: calc(var(--r-18) * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  transition: border-color var(--t-fade), background var(--t-fade),
              transform var(--t-pop), box-shadow var(--t-fade);
}
.ui-card--filled { background: var(--surface-container); }
.ui-card--outline { background: transparent; border: var(--border-w) solid var(--outline-variant); }
.ui-card--plain { background: transparent; }

/* ---------- 段 ---------- */
.ui-card__header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}
.ui-card__titles { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.ui-card__title {
  font-size: var(--fs-body);
  font-weight: var(--w-heading);
  letter-spacing: -.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ui-card__description { font-size: var(--fs-tiny); color: var(--on-surface-variant); }
.ui-card__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: calc(var(--r-10) * var(--radius-scale));
  background: var(--surface-container-high);
  color: var(--primary);
}
.ui-card__icon svg { width: 18px; height: 18px; }
.ui-card__actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.ui-card__body { min-width: 0; font-size: var(--fs-small); line-height: 1.6; }
.ui-card__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

/* ---------- 内边距 ---------- */
.ui-card--sm .ui-card__header { padding: 10px 12px; }
.ui-card--sm .ui-card__body { padding: 10px 12px; }
.ui-card--sm .ui-card__footer { padding: 8px 12px; }
.ui-card--md .ui-card__header { padding: 14px 16px; }
.ui-card--md .ui-card__body { padding: 14px 16px; }
.ui-card--md .ui-card__footer { padding: 10px 16px; }
.ui-card--lg .ui-card__header { padding: 18px 20px; }
.ui-card--lg .ui-card__body { padding: 18px 20px; }
.ui-card--lg .ui-card__footer { padding: 14px 20px; }

/* ---------- 分隔线 ---------- */
.ui-card.has-divider .ui-card__header { border-bottom: var(--border-w) solid color-mix(in oklab, var(--outline-variant) 70%, transparent); }
.ui-card.has-divider .ui-card__footer { border-top: var(--border-w) solid color-mix(in oklab, var(--outline-variant) 70%, transparent); }
/* 没有页眉时，主体顶部不需要再留一份视觉重量；页脚同理由 border-top 表达。 */

/* ---------- variant="product" ---------- */
.ui-card--product {
  position: relative;
  gap: 10px;
  padding: 14px;
  overflow: clip;
  border-color: transparent;
  border-radius: calc(var(--r-20) * var(--radius-scale));
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--card-accent) 5%, var(--surface)) 0%, var(--surface) 100%);
}
.ui-card--product .ui-card__glow {
  position: absolute;
  left: 50%;
  bottom: -66px;
  width: 100%;
  height: 97px;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at center,
    color-mix(in oklab, var(--card-accent) 26%, transparent), transparent 68%);
  filter: blur(26px);
  opacity: .9;
  pointer-events: none;
}
.ui-card--product .ui-card__header {
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  position: relative;
  z-index: 1;
}
.ui-card--product .ui-card__product-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: calc(var(--r-12) * var(--radius-scale));
  background: var(--surface);
}
.ui-card--product .ui-card__product-icon svg { width: 20px; height: 20px; overflow: visible; }
.ui-card--product .ui-card__title {
  font-size: calc(16px * var(--font-scale, 1));
  font-weight: var(--w-heading);
  color: var(--on-surface);
}
.ui-card--product .ui-card__actions { margin-left: auto; }
.ui-card--product .ui-card__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  font-size: calc(15px * var(--font-scale, 1));
  line-height: 1.35;
  color: var(--on-surface);
}
.ui-card--product .ui-card__body :deep(.ui-avatar-tag) { margin-right: 4px; }
.ui-card__accent {
  font-weight: var(--w-strong);
  background: linear-gradient(90deg, var(--card-accent), color-mix(in oklab, var(--card-accent) 55%, var(--on-surface)));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.ui-card--product .ui-card__footer {
  position: relative;
  z-index: 1;
  gap: 12px;
  padding: 0;
  border: 0;
}
.ui-card--product .ui-card__footer {
  justify-content: flex-end;
}
.ui-card--product .ui-card__footer :deep(.ui-btn) {
  min-height: 40px;
  padding: 0 20px;
  border-radius: calc(var(--r-12) * var(--radius-scale));
  font-size: calc(15px * var(--font-scale, 1));
}
/* 产品卡里的动作按钮跟随品牌色，而不是全局主色：
   授权 = 实心 accent，拒绝 = accent 淡底。 */
.ui-card--product .ui-card__footer :deep(.ui-btn--primary) {
  background: var(--card-accent);
  border-color: var(--card-accent);
  color: #fff;
}
.ui-card--product .ui-card__footer :deep(.ui-btn--tonal) {
  background: color-mix(in oklab, var(--card-accent) 16%, var(--surface));
  border-color: transparent;
  color: color-mix(in oklab, var(--card-accent) 30%, var(--on-surface));
}

/* ---------- 可点击 ---------- */
.ui-card.is-clickable { cursor: pointer; }
.ui-card.is-clickable:hover { border-color: color-mix(in oklab, var(--primary) 38%, var(--outline-variant)); background: var(--surface-container); }
.ui-card.is-clickable:active { transform: scale(var(--press-card-scale, var(--press-scale))); }
.ui-card.is-clickable:focus-visible {
  outline: var(--focus-w) solid var(--primary);
  outline-offset: 2px;
}
</style>
