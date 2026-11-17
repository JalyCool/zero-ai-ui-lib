<script setup>
const props = defineProps({
  /* [{ title, time?, text?, tone?: 'primary'|'success'|'warning'|'danger'|'muted' }] */
  items: { type: Array, default: () => [] },
  /* 时间位置：right（默认，标题右侧）/ left（标题左侧，与时间列对齐）/ none（不显示） */
  timePosition: { type: String, default: 'right', validator: v => ['left', 'right', 'none'].includes(v) }
})
</script>
<template>
  <ol class="ui-timeline" :class="'is-time-' + timePosition">
    <li v-for="(item, index) in items" :key="item.title + index" class="ui-timeline__item" :class="`is-${item.tone || 'primary'}`">
      <!-- 时间在左：排在竖线**左侧**（时间 → 竖线 → 内容），右对齐贴线 -->
      <time v-if="timePosition === 'left' && item.time" class="ui-timeline__time">{{ item.time }}</time>
      <span class="ui-timeline__rail" aria-hidden="true">
        <span class="ui-timeline__dot"></span>
        <span v-if="index < items.length - 1" class="ui-timeline__line"></span>
      </span>
      <div class="ui-timeline__body">
        <div class="ui-timeline__head">
          <b>{{ item.title }}</b>
          <time v-if="timePosition === 'right' && item.time" class="ui-timeline__time">{{ item.time }}</time>
        </div>
        <p v-if="item.text">{{ item.text }}</p>
        <slot :item="item" :index="index" />
      </div>
    </li>
  </ol>
</template>
<style scoped>
.ui-timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.ui-timeline__item { display: flex; gap: 11px; min-width: 0; }
.ui-timeline__rail { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; padding-top: 4px; }
.ui-timeline__dot { width: 10px; height: 10px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 16%, transparent); }
.ui-timeline__line { flex: 1; width: 2px; margin: 4px 0 0; background: var(--outline-variant); }
.ui-timeline__body { flex: 1; min-width: 0; padding-bottom: 16px; }
.ui-timeline__head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.ui-timeline__head b { font-size: var(--fs-small); font-weight: var(--w-label); }
.ui-timeline__time {
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-family: var(--font-numeric);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
}
/* 时间在左：独立一列，右对齐贴轨道；列宽固定，多条时间不会参差 */
.ui-timeline.is-time-left .ui-timeline__time {
  flex: 0 0 auto;
  min-width: 52px;
  margin-top: 2px;
  text-align: right;
}
.ui-timeline__body p { margin: 3px 0 0; color: var(--on-surface-variant); font-size: var(--fs-tiny); line-height: 1.55; }
.ui-timeline__item.is-success .ui-timeline__dot { background: var(--ui-success, #15803d); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ui-success, #15803d) 18%, transparent); }
.ui-timeline__item.is-warning .ui-timeline__dot { background: var(--ui-warning, #b45309); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ui-warning, #b45309) 18%, transparent); }
.ui-timeline__item.is-danger .ui-timeline__dot { background: var(--error); box-shadow: 0 0 0 3px color-mix(in oklab, var(--error) 18%, transparent); }
.ui-timeline__item.is-muted .ui-timeline__dot { background: var(--outline-variant); box-shadow: none; }
</style>
