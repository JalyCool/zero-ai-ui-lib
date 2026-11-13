<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /* [{ label, value?, children?, kind? }]；kind 决定图标 */
  nodes: { type: Array, default: () => [] },
  modelValue: { type: [String, Number], default: '' },
  /* 折叠状态受控可省：内部自管理 */
  defaultOpen: { type: Array, default: null },
  indent: { type: Number, default: 16 },
  /* 允许按住拖动连续多选（swipe-select 思路：滚动/拖动路径上的行都选中） */
  multi: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'select', 'expand'])

/* ============================================================
   文件树：可展开 / 折叠，图标按类型区分（folder / file /
   md / json / image / code），箭头旋转过渡，缩进连续动画。
   ============================================================ */

const openMap = ref(new Map())
if (Array.isArray(props.defaultOpen)) {
  for (const key of props.defaultOpen) openMap.value.set(key, true)
}

function nodeKey(node, path) {
  return node.value !== undefined && node.value !== null ? String(node.value) : path
}

const flat = computed(() => {
  const out = []
  const walk = (list, depth, parentPath) => {
    list.forEach((node, index) => {
      const path = parentPath + '/' + index
      const key = nodeKey(node, path)
      const hasChildren = Array.isArray(node.children) && node.children.length
      out.push({ node, depth, key, path, hasChildren })
      if (hasChildren && openMap.value.get(key)) walk(node.children, depth + 1, path)
    })
  }
  walk(props.nodes, 0, '')
  return out
})

function isOpen(key) { return !!openMap.value.get(key) }

function toggle(key) {
  const next = new Map(openMap.value)
  next.set(key, !next.get(key))
  openMap.value = next
  emit('expand', { key, open: next.get(key) })
}

function pick(item) {
  if (item.hasChildren) { toggle(item.key); return }
  if (props.multi) {
    /* 多选：value 为数组时切换包含关系 */
    emit('select', item.node)
    return
  }
  emit('update:modelValue', item.node.value ?? item.key)
  emit('select', item.node)
}

function iconOf(node) {
  if (Array.isArray(node.children) && node.children.length) return 'folder'
  const kind = node.kind || 'file'
  return kind
}

defineExpose({ openAll: deep => {
  const next = new Map()
  const walk = list => list.forEach((node, index) => {
    const key = nodeKey(node, String(index))
    if (Array.isArray(node.children) && node.children.length) { next.set(key, !!deep); walk(node.children) }
  })
  walk(props.nodes)
  openMap.value = next
} })
</script>

<template>
  <div class="ui-tree" role="tree">
    <button
      v-for="item in flat"
      :key="item.key"
      type="button"
      role="treeitem"
      class="ui-tree__row"
      :class="{ 'is-selected': !multi && modelValue === (item.node.value ?? item.key), 'is-folder': item.hasChildren }"
      :style="{ paddingLeft: 8 + item.depth * indent + 'px' }"
      :aria-expanded="item.hasChildren ? isOpen(item.key) : undefined"
      :aria-selected="!multi && modelValue === (item.node.value ?? item.key)"
      @click="pick(item)"
    >
      <span v-if="item.hasChildren" class="ui-tree__caret" :class="{ 'is-open': isOpen(item.key) }" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
      </span>
      <span v-else class="ui-tree__caret ui-tree__caret--gap" aria-hidden="true"></span>
      <span class="ui-tree__icon" :data-kind="iconOf(item.node)" aria-hidden="true">
        <svg v-if="iconOf(item.node) === 'folder'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>
      </span>
      <span class="ui-tree__label">{{ item.node.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.ui-tree { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ui-tree__row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border: 0;
  border-radius: calc(10px * var(--radius-scale));
  background: transparent;
  color: var(--on-surface);
  font-size: var(--fs-small);
  text-align: left;
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-tree__row:hover { background: var(--surface-container); }
.ui-tree__row:active { transform: scale(var(--press-scale)); }
.ui-tree__row.is-selected { background: var(--primary-container); color: var(--on-primary-container); font-weight: var(--w-label); }
.ui-tree__caret {
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--on-surface-variant);
  transition: transform var(--t-panel);
}
.ui-tree__caret.is-open { transform: rotate(90deg); }
.ui-tree__caret svg { width: 11px; height: 11px; }
.ui-tree__caret--gap { visibility: hidden; }
.ui-tree__icon {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.ui-tree__icon svg { width: 14px; height: 14px; }
/* 类型着色：文件夹主色，markdown/JSON/图片各取语义色 */
.ui-tree__icon[data-kind="folder"] { color: var(--primary); }
.ui-tree__icon[data-kind="md"] { color: var(--ui-success); }
.ui-tree__icon[data-kind="json"] { color: var(--ui-warning); }
.ui-tree__icon[data-kind="image"] { color: var(--secondary); }
.ui-tree__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
