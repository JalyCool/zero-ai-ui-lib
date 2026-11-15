<script setup>
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
  variant: { type: String, default: 'outline' },
  /* 仅表现：悬停抬色 + 按下收缩；点击事件由应用自己绑 */
  clickable: { type: Boolean, default: false }
})

</script>

<template>
  <section
    class="ui-card"
    :class="[`ui-card--${variant}`, `ui-card--${size}`, {
      'has-divider': divider,
      'is-clickable': clickable
    }]"
  >
    <header v-if="$slots.header || title || description || icon || $slots.actions" class="ui-card__header">
      <slot name="header">
        <span v-if="icon" class="ui-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="icon"></svg>
        </span>
        <span class="ui-card__titles">
          <b v-if="title" class="ui-card__title">{{ title }}</b>
          <span v-if="description" class="ui-card__description">{{ description }}</span>
        </span>
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
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(18px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  transition: border-color var(--t-fade), background var(--t-fade),
              transform var(--t-pop), box-shadow var(--t-fade);
}
.ui-card--filled { background: var(--surface-container); }
.ui-card--plain { border-color: transparent; background: transparent; }

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
  border-radius: calc(10px * var(--radius-scale));
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

/* ---------- 可点击 ---------- */
.ui-card.is-clickable { cursor: pointer; }
.ui-card.is-clickable:hover { border-color: color-mix(in oklab, var(--primary) 38%, var(--outline-variant)); background: var(--surface-container); }
.ui-card.is-clickable:active { transform: scale(var(--press-card-scale, var(--press-scale))); }
.ui-card.is-clickable:focus-visible {
  outline: var(--focus-w) solid var(--primary);
  outline-offset: 2px;
}
</style>
