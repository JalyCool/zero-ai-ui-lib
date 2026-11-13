<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /* [{ key, label, width?, align?, sortable? }] */
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  /* 行主键字段名 */
  rowKey: { type: String, default: '' },
  /* 固定表头：>0 时表体内部滚动、表头粘住 */
  maxHeight: { type: Number, default: 0 },
  striped: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
  emptyText: { type: String, default: '暂无数据' }
})

const emit = defineEmits(['row-click'])

/* ============================================================
   数据表格：粘性表头、表头排序（升 / 降 / 取消三态）、
   列对齐（数值列默认右对齐）；单元格内容可用 #cell-<key>
   插槽自定义，作用域 { row, index }。
   ============================================================ */

const sort = ref({ key: '', dir: 0 })

function toggleSort(column) {
  if (!column.sortable) return
  if (sort.value.key !== column.key) sort.value = { key: column.key, dir: 1 }
  else if (sort.value.dir === 1) sort.value = { key: column.key, dir: -1 }
  else sort.value = { key: '', dir: 0 }
}

const sortedRows = computed(() => {
  const { key, dir } = sort.value
  if (!key || !dir) return props.rows
  const factor = dir === 1 ? 1 : -1
  return [...props.rows].sort((a, b) => {
    const va = a?.[key]
    const vb = b?.[key]
    if (va === vb) return 0
    if (va === null || va === undefined) return 1
    if (vb === null || vb === undefined) return -1
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
    return String(va).localeCompare(String(vb), undefined, { numeric: true }) * factor
  })
})

function alignOf(column) {
  if (column.align) return column.align
  const first = props.rows.find(row => row?.[column.key] !== null && row?.[column.key] !== undefined)
  return typeof first?.[column.key] === 'number' ? 'right' : 'left'
}

function keyOf(row, index) {
  return props.rowKey ? row[props.rowKey] : index
}
</script>

<template>
  <div class="ui-table" :class="{ 'is-striped': striped, 'is-scroll': maxHeight }" :style="maxHeight ? { maxHeight: maxHeight + 'px' } : undefined">
    <table>
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :style="{ width: column.width, textAlign: alignOf(column) }"
            :class="{ 'is-sortable': column.sortable, 'is-sorted': sort.key === column.key }"
            :aria-sort="sort.key === column.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined"
            @click="toggleSort(column)"
          >
            {{ column.label }}
            <span v-if="column.sortable" class="ui-table__caret" aria-hidden="true">
              <svg class="ui-table__caret-up" :class="{ 'is-on': sort.key === column.key && sort.dir === 1 }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14l6-6 6 6" /></svg>
              <svg class="ui-table__caret-down" :class="{ 'is-on': sort.key === column.key && sort.dir === -1 }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10l6 6 6-6" /></svg>
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in sortedRows"
          :key="keyOf(row, index)"
          :class="{ 'is-clickable': clickable }"
          @click="clickable && emit('row-click', row, index)"
        >
          <td v-for="column in columns" :key="column.key" :style="{ textAlign: alignOf(column) }">
            <slot :name="'cell-' + column.key" :row="row" :index="index">{{ row[column.key] }}</slot>
          </td>
        </tr>
        <tr v-if="!sortedRows.length">
          <td class="ui-table__empty" :colspan="columns.length">{{ emptyText }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.ui-table {
  min-width: 0;
  overflow: auto;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(14px * var(--radius-scale));
  background: var(--surface-container-low);
  scrollbar-width: thin;
}
table { width: 100%; border-collapse: collapse; font-size: var(--fs-small); }
thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 9px 12px;
  background: var(--surface-container);
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  text-align: left;
  white-space: nowrap;
  border-bottom: var(--border-w) solid var(--outline-variant);
}
thead th.is-sortable { cursor: pointer; user-select: none; }
thead th.is-sortable:hover { color: var(--on-surface); }
thead th.is-sorted { color: var(--primary); }
.ui-table__caret {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
  vertical-align: middle;
  margin-left: 5px;
  opacity: .38;
  transition: opacity var(--t-fade);
}
thead th.is-sortable:hover .ui-table__caret { opacity: .7; }
thead th.is-sorted .ui-table__caret { opacity: 1; }
.ui-table__caret svg { width: 10px; height: 10px; display: block; color: var(--on-surface-variant); transition: color var(--t-fade); }
.ui-table__caret svg.is-on { color: var(--primary); }
tbody td {
  padding: 8px 12px;
  color: var(--on-surface);
  border-bottom: var(--border-w) solid color-mix(in oklab, var(--outline-variant) 45%, transparent);
  font-variant-numeric: tabular-nums;
}
tbody tr:last-child td { border-bottom: 0; }
.is-striped tbody tr:nth-child(even) { background: color-mix(in oklab, var(--surface-container) 55%, transparent); }
tbody tr.is-clickable { cursor: pointer; transition: background var(--t-fade); }
tbody tr.is-clickable:hover { background: var(--surface-container); }
.ui-table__empty { padding: 22px 12px; text-align: center; color: var(--on-surface-variant); font-size: var(--fs-tiny); }
</style>
