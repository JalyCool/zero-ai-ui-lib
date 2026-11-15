<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  /* [{ key, label, width?, align?, sortable?, hidden? }] */
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  /* 行主键字段名 */
  rowKey: { type: String, default: '' },
  /* 固定表头：>0 时表体内部滚动、表头粘住 */
  maxHeight: { type: Number, default: 0 },
  striped: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
  emptyText: { type: String, default: '暂无数据' },
  /* ---------- 分组 ---------- */
  /* 按这个字段分组；组标题可用 #group 插槽自定义，默认显示字段值 */
  groupBy: { type: String, default: '' },
  /* ---------- 服务端分页 ---------- */
  /* server=true 时不在本地排序，只发 sort-change；分页也只发 page-change */
  server: { type: Boolean, default: false },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  total: { type: Number, default: 0 },
  /* ---------- 列显隐 ---------- */
  /* v-model:visible；为 null 时全部显示，传数组时只显示这些 key，并出现「列」面板 */
  visible: { type: Array, default: null },
  /* ---------- 多选 ---------- */
  /* none | single | multiple */
  selection: { type: String, default: 'none' },
  /* v-model:selected，值为 keyOf(row) 的数组 */
  selected: { type: Array, default: () => [] }
})

const emit = defineEmits([
  'row-click', 'sort-change', 'page-change',
  'update:page', 'update:visible', 'update:selected', 'select-change'
])

/* ============================================================
   数据表格
   · 粘性表头、三态排序（升 / 降 / 取消）
   · 分组：groupBy 指定字段，组标题行整行合并，可用 #group 插槽自定义
   · 服务端模式：排序与分页只发事件，不在本地改数据
   · 列显隐：visible 数组 + 「列」面板，勾选即 emit update:visible
   · 多选：selection=multiple 时表头全选、行首勾选，selected 为 key 数组
   · 单元格内容可用 #cell-<key> 插槽自定义，作用域 { row, index }
   ============================================================ */

const sort = ref({ key: '', dir: 0 })
const columnPanel = ref(false)
const localSelected = ref([...props.selected])

watch(() => props.selected, value => { localSelected.value = [...(value || [])] }, { deep: true })

const shownColumns = computed(() => {
  const hidden = props.columns.filter(column => column.hidden).map(column => column.key)
  const allow = props.visible === null ? null : props.visible
  return props.columns.filter(column => {
    if (hidden.includes(column.key)) return false
    if (allow && !allow.includes(column.key)) return false
    return true
  })
})

const hasSelection = computed(() => props.selection === 'single' || props.selection === 'multiple')
const showColumnPanel = computed(() => props.visible !== null)

function toggleSort(column) {
  if (!column.sortable) return
  if (sort.value.key !== column.key) sort.value = { key: column.key, dir: 1 }
  else if (sort.value.dir === 1) sort.value = { key: column.key, dir: -1 }
  else sort.value = { key: '', dir: 0 }
  emit('sort-change', { key: sort.value.key, dir: sort.value.dir })
}

const sortedRows = computed(() => {
  const { key, dir } = sort.value
  /* 服务端排序：数据顺序由外部给，这里只负责排序态与事件。 */
  if (!key || !dir || props.server) return props.rows
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

/* 分组：保持首次出现顺序，空组不生成。 */
const groups = computed(() => {
  if (!props.groupBy) return null
  const map = new Map()
  sortedRows.value.forEach((row, index) => {
    const key = row?.[props.groupBy]
    if (!map.has(key)) map.set(key, [])
    map.get(key).push({ row, index })
  })
  return [...map.entries()].map(([key, entries]) => ({ key, entries }))
})

function alignOf(column) {
  if (column.align) return column.align
  const first = props.rows.find(row => row?.[column.key] !== null && row?.[column.key] !== undefined)
  return typeof first?.[column.key] === 'number' ? 'right' : 'left'
}

function keyOf(row) {
  if (props.rowKey) return row?.[props.rowKey]
  const at = props.rows.indexOf(row)
  return at >= 0 ? at : undefined
}

const selectedSet = computed(() => new Set(localSelected.value))
const allSelected = computed(() => props.rows.length > 0 && props.rows.every(row => selectedSet.value.has(keyOf(row))))
const someSelected = computed(() => !allSelected.value && props.rows.some(row => selectedSet.value.has(keyOf(row))))

function commitSelection(next) {
  localSelected.value = next
  emit('update:selected', next)
  emit('select-change', next)
}

function toggleRow(row, event) {
  if (props.selection === 'none') return
  const key = keyOf(row)
  if (props.selection === 'single') {
    commitSelection(selectedSet.value.has(key) ? [] : [key])
    return
  }
  const next = new Set(localSelected.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  commitSelection([...next])
  if (event) event.stopPropagation()
}

function toggleAll() {
  if (props.selection !== 'multiple') return
  commitSelection(allSelected.value ? [] : props.rows.map(row => keyOf(row)))
}

function toggleColumn(column) {
  const allow = props.visible === null ? props.columns.map(item => item.key) : [...props.visible]
  const next = allow.includes(column.key)
    ? allow.filter(key => key !== column.key)
    : [...allow, column.key]
  emit('update:visible', next)
}

/* ---------- 分页 ---------- */
const pageCount = computed(() => Math.max(1, Math.ceil((props.total || props.rows.length) / Math.max(1, props.pageSize))))
function goPage(next) {
  const page = Math.min(pageCount.value, Math.max(1, next))
  if (page === props.page) return
  emit('update:page', page)
  emit('page-change', { page, pageSize: props.pageSize })
}
const showPager = computed(() => props.server || props.total > props.pageSize)
</script>

<template>
  <div class="ui-table-wrap">
    <div v-if="showColumnPanel" class="ui-table__tools">
      <button type="button" class="ui-table__col-btn" :aria-expanded="columnPanel" @click="columnPanel = !columnPanel">
        列
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <Transition name="ui-table-cols">
        <div v-if="columnPanel" class="ui-table__cols" role="group" aria-label="显示哪些列">
          <label v-for="column in columns" :key="column.key" class="ui-table__col-item">
            <input type="checkbox" :checked="shownColumns.some(item => item.key === column.key)" @change="toggleColumn(column)" />
            <span>{{ column.label }}</span>
          </label>
        </div>
      </Transition>
    </div>

    <div class="ui-table" :class="{ 'is-striped': striped, 'is-scroll': maxHeight }" :style="maxHeight ? { maxHeight: maxHeight + 'px' } : undefined">
      <table>
        <thead>
          <tr>
            <th v-if="hasSelection" class="ui-table__check">
              <input
                v-if="selection === 'multiple'"
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected"
                aria-label="全选"
                @change="toggleAll"
              />
            </th>
            <th
              v-for="column in shownColumns"
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

        <!-- 分组模式：每组一个 tbody，组标题整行合并 -->
        <template v-if="groups">
        <tbody v-for="group in groups" :key="String(group.key)">
          <tr class="ui-table__group">
            <td :colspan="shownColumns.length + (hasSelection ? 1 : 0)">
              <slot name="group" :group="group.key" :count="group.entries.length">
                <b>{{ group.key }}</b>
                <span>（{{ group.entries.length }}）</span>
              </slot>
            </td>
          </tr>
          <tr
            v-for="entry in group.entries"
            :key="keyOf(entry.row)"
            :class="{ 'is-clickable': clickable, 'is-selected': selectedSet.has(keyOf(entry.row)) }"
            @click="clickable && emit('row-click', entry.row, entry.index)"
          >
            <td v-if="hasSelection" class="ui-table__check" @click.stop>
              <input
                :type="selection === 'single' ? 'radio' : 'checkbox'"
                :checked="selectedSet.has(keyOf(entry.row))"
                :name="selection === 'single' ? 'ui-table-radio' : undefined"
                :aria-label="'选择这一行'"
                @change="toggleRow(entry.row, $event)"
              />
            </td>
            <td v-for="column in shownColumns" :key="column.key" :style="{ textAlign: alignOf(column) }">
              <slot :name="'cell-' + column.key" :row="entry.row" :index="entry.index">{{ entry.row[column.key] }}</slot>
            </td>
          </tr>
        </tbody>
        </template>

        <!-- 普通模式 -->
        <tbody v-else>
          <tr
            v-for="(row, index) in sortedRows"
            :key="keyOf(row)"
            :class="{ 'is-clickable': clickable, 'is-selected': selectedSet.has(keyOf(row)) }"
            @click="clickable && emit('row-click', row, index)"
          >
            <td v-if="hasSelection" class="ui-table__check" @click.stop>
              <input
                :type="selection === 'single' ? 'radio' : 'checkbox'"
                :checked="selectedSet.has(keyOf(row))"
                :name="selection === 'single' ? 'ui-table-radio' : undefined"
                :aria-label="'选择这一行'"
                @change="toggleRow(row, $event)"
              />
            </td>
            <td v-for="column in shownColumns" :key="column.key" :style="{ textAlign: alignOf(column) }">
              <slot :name="'cell-' + column.key" :row="row" :index="index">{{ row[column.key] }}</slot>
            </td>
          </tr>
          <tr v-if="!sortedRows.length">
            <td class="ui-table__empty" :colspan="shownColumns.length + (hasSelection ? 1 : 0)">{{ emptyText }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showPager" class="ui-table__pager">
      <span class="ui-table__count">{{ total || rows.length }} 条 · 第 {{ page }} / {{ pageCount }} 页</span>
      <span class="ui-table__pager-spacer"></span>
      <button type="button" :disabled="page <= 1" aria-label="上一页" @click="goPage(page - 1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <button type="button" :disabled="page >= pageCount" aria-label="下一页" @click="goPage(page + 1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ui-table-wrap { position: relative; display: flex; flex-direction: column; gap: 8px; min-width: 0; }

/* ---------- 列显隐 ---------- */
.ui-table__tools { position: relative; display: flex; justify-content: flex-end; }
.ui-table__col-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 999px;
  background: var(--surface-container-low);
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: border-color var(--t-fade), color var(--t-fade), transform var(--t-pop);
}
.ui-table__col-btn:active { transform: scale(var(--press-scale)); }
.ui-table__col-btn svg { width: 11px; height: 11px; }
.ui-table__cols {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
  padding: 6px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(12px * var(--radius-scale));
  background: var(--surface);
  box-shadow: var(--elev-tip);
  min-width: 140px;
}
.ui-table__col-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border-radius: calc(8px * var(--radius-scale));
  color: var(--on-surface);
  font-size: var(--fs-tiny);
  cursor: pointer;
}
.ui-table__col-item:hover { background: var(--surface-container); }
.ui-table__col-item input { accent-color: var(--primary); }
.ui-table-cols-enter-active, .ui-table-cols-leave-active { transition: opacity var(--t-fade), transform var(--t-panel); }
.ui-table-cols-enter-from, .ui-table-cols-leave-to { opacity: 0; transform: translateY(-4px) scale(.97); }

/* ---------- 表格 ---------- */
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
tbody tr.is-selected { background: color-mix(in oklab, var(--primary) 10%, transparent); }
.is-striped tbody tr:nth-child(even) { background: color-mix(in oklab, var(--surface-container) 55%, transparent); }
.is-striped tbody tr.is-selected { background: color-mix(in oklab, var(--primary) 12%, transparent); }
tbody tr.is-clickable { cursor: pointer; transition: background var(--t-fade); }
tbody tr.is-clickable:hover { background: var(--surface-container); }
.ui-table__empty { padding: 22px 12px; text-align: center; color: var(--on-surface-variant); font-size: var(--fs-tiny); }

/* 组标题行：吸在表头下面，滚动时知道现在在哪个组 */
.ui-table__group td {
  padding: 7px 12px;
  background: color-mix(in oklab, var(--surface-container) 82%, transparent);
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-weight: var(--w-label);
}
.ui-table__group td b { color: var(--on-surface); font-weight: var(--w-strong); }
.ui-table__group td span { margin-left: 4px; opacity: .7; }

.ui-table__check { width: 36px; text-align: center; padding-left: 6px; padding-right: 0; }
.ui-table__check input { width: 15px; height: 15px; accent-color: var(--primary); cursor: pointer; }

/* ---------- 分页 ---------- */
.ui-table__pager {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
  font-variant-numeric: tabular-nums;
}
.ui-table__pager-spacer { flex: 1; }
.ui-table__pager button {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(8px * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  cursor: pointer;
  transition: transform var(--t-pop), border-color var(--t-fade), opacity var(--t-fade);
}
.ui-table__pager button:active { transform: scale(var(--press-scale)); }
.ui-table__pager button:disabled { opacity: .38; cursor: default; }
.ui-table__pager button svg { width: 13px; height: 13px; }
</style>
