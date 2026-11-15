<script setup>
import { computed, inject, onBeforeUnmount, provide, ref, watch } from 'vue'

const props = defineProps({
  /* [{ label, value?, children?, kind? }]；kind 决定图标 */
  nodes: { type: Array, default: () => [] },
  modelValue: { type: [String, Number, Array], default: '' },
  /* 初始展开的节点 value 列表 */
  defaultOpen: { type: Array, default: null },
  indent: { type: Number, default: 16 },
  /* 多选模式：modelValue 为数组，点击切换包含关系 */
  multi: { type: Boolean, default: false },
  /* 以下两项由递归内部传入，外部不要设置 */
  depth: { type: Number, default: 0 },
  pathPrefix: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'select', 'expand'])

/* ============================================================
   文件树：可展开 / 折叠，图标按类型区分。
   展开折叠是「0 <-> 自然高度」的连续过渡（与折叠面板同一手法）：
   子级分组常驻 DOM，block-size 插值 + 行从模糊里浮现；
   箭头旋转；不支持关键字插值的浏览器由 JS 测像素高度兜底。
   选中与展开状态由根实例持有并 provide，递归子实例 inject 共用。
   ============================================================ */

const ROOT_KEY = Symbol('ui-tree-root')
const isRoot = props.depth === 0

function childrenOf(node) {
  return Array.isArray(node.children) ? node.children : []
}
function nodeKey(node, path) {
  return node.value !== undefined && node.value !== null ? String(node.value) : path
}

const state = isRoot ? {
  openMap: ref(new Map(Array.isArray(props.defaultOpen) ? props.defaultOpen.map(key => [String(key), true]) : [])),
  picked: computed(() => new Set(
    (props.multi && Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]).map(String)
  )),
  toggle(key) {
    const next = new Map(state.openMap.value)
    const value = !next.get(key)
    next.set(key, value)
    state.openMap.value = next
    emit('expand', { key, open: value })
  },
  choose(value) {
    if (props.multi) {
      const next = [...state.picked.value]
      const at = next.indexOf(String(value))
      if (at >= 0) next.splice(at, 1)
      else next.push(String(value))
      emit('update:modelValue', next)
    } else {
      emit('update:modelValue', value)
    }
  },
  groups: new Map(),
  supportsInterpolation:
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function' &&
    CSS.supports('interpolate-size', 'allow-keywords')
} : null

if (isRoot) provide(ROOT_KEY, state)
const shared = isRoot ? state : inject(ROOT_KEY, state)

const rows = computed(() => props.nodes.map((node, index) => {
  const path = props.pathPrefix ? props.pathPrefix + '/' + index : String(index)
  const kids = childrenOf(node)
  return { node, path, key: nodeKey(node, path), hasChildren: kids.length > 0, children: kids }
}))

function isOpen(key) { return !!shared.openMap.value.get(key) }
function isPicked(row) { return shared.picked.value.has(String(row.node.value ?? row.key)) }

function pick(row) {
  if (row.hasChildren) { shared.toggle(row.key); return }
  shared.choose(row.node.value ?? row.key)
  emit('select', row.node)
}

function iconOf(node) {
  if (childrenOf(node).length) return 'folder'
  return node.kind || 'file'
}

/* ---------- 分组高度动画（无 interpolate-size 时兜底） ---------- */
function registerGroup(key, el) {
  if (el) shared.groups.set(key, el)
  else shared.groups.delete(key)
}

function animateGroup(key, open) {
  if (shared.supportsInterpolation) return
  const el = shared.groups.get(key)
  if (!el) return
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) { el.style.height = open ? 'auto' : '0px'; return }
  const from = open ? 0 : el.scrollHeight
  const to = open ? el.scrollHeight : 0
  el.style.transition = 'none'
  el.style.height = from + 'px'
  void el.offsetHeight
  el.style.transition = ''
  requestAnimationFrame(() => { el.style.height = to + 'px' })
  if (open) setTimeout(() => { if (isOpen(key)) el.style.height = 'auto' }, 700)
}

watch(() => shared.openMap.value, map => {
  for (const [key, value] of map.entries()) animateGroup(key, !!value)
})

onBeforeUnmount(() => { if (isRoot) shared.groups.clear() })

if (isRoot) {
  defineExpose({
    openAll: deep => {
      const next = new Map()
      const walk = (list, prefix) => list.forEach((node, index) => {
        const path = prefix ? prefix + '/' + index : String(index)
        const kids = childrenOf(node)
        if (kids.length) { next.set(nodeKey(node, path), !!deep); walk(kids, path) }
      })
      walk(props.nodes, props.pathPrefix)
      shared.openMap.value = next
    }
  })
}
</script>

<template>
  <div
    :class="isRoot ? 'ui-tree' : 'ui-tree__inner'"
    :role="isRoot ? 'tree' : 'group'"
    :style="isRoot ? { '--tree-indent': indent + 'px' } : undefined"
  >
    <template v-for="row in rows" :key="row.key">
      <button
        type="button"
        role="treeitem"
        class="ui-tree__row"
        :class="{
          'is-selected': !multi && isPicked(row),
          'is-checked': multi && isPicked(row),
          'is-folder': row.hasChildren,
          'is-open': row.hasChildren && isOpen(row.key)
        }"
        :style="{ paddingLeft: 'calc(8px + var(--tree-indent, 16px) * ' + depth + ')' }"
        :aria-expanded="row.hasChildren ? isOpen(row.key) : undefined"
        :aria-selected="isPicked(row)"
        @click="pick(row)"
      >
        <span v-if="row.hasChildren" class="ui-tree__caret" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </span>
        <span v-else class="ui-tree__caret ui-tree__caret--gap" aria-hidden="true"></span>
        <span v-if="multi" class="ui-tree__check" :class="{ 'is-on': isPicked(row) }" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </span>
        <span class="ui-tree__icon" :data-kind="iconOf(row.node)" aria-hidden="true">
          <svg v-if="iconOf(row.node) === 'folder'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>
        </span>
        <span class="ui-tree__label">{{ row.node.label }}</span>
      </button>

      <!-- 子级分组：常驻 DOM，高度 0 <-> auto 连续过渡，行内容从模糊中浮现。 -->
      <div
        v-if="row.hasChildren"
        :ref="el => registerGroup(row.key, el)"
        class="ui-tree__group"
        :class="{ 'is-open': isOpen(row.key) }"
      >
        <UiTreeView
          :nodes="row.children"
          :depth="depth + 1"
          :path-prefix="row.path"
          :model-value="modelValue"
          :multi="multi"
          @select="node => emit('select', node)"
          @expand="payload => emit('expand', payload)"
          @update:model-value="value => emit('update:modelValue', value)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.ui-tree {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  /* 关键字插值：block-size 0 <-> auto 可原生过渡（Chrome/Edge）。 */
  interpolate-size: allow-keywords;
}
.ui-tree__inner { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
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
  transition: transform var(--t-view);
}
.ui-tree__row.is-open .ui-tree__caret { transform: rotate(90deg); }
.ui-tree__caret svg { width: 11px; height: 11px; }
.ui-tree__caret--gap { visibility: hidden; }
/* 多选勾选框在标签左侧。 */
.ui-tree__check {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: 4px;
  color: transparent;
  transition: background var(--t-fade), border-color var(--t-fade), color var(--t-fade);
}
.ui-tree__check svg { width: 10px; height: 10px; }
.ui-tree__check.is-on { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.ui-tree__icon { display: grid; place-items: center; width: 16px; height: 16px; flex-shrink: 0; }
.ui-tree__icon svg { width: 14px; height: 14px; }
.ui-tree__icon[data-kind="folder"] { color: var(--primary); }
.ui-tree__icon[data-kind="md"] { color: var(--ui-success); }
.ui-tree__icon[data-kind="json"] { color: var(--ui-warning); }
.ui-tree__icon[data-kind="image"] { color: var(--secondary); }
.ui-tree__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 分组：0 <-> 自然高度连续过渡；内容从模糊中浮现。 */
.ui-tree__group {
  block-size: 0;
  overflow: hidden;
  opacity: 0;
  filter: blur(6px);
  transition: block-size var(--t-view), opacity var(--t-fade), filter var(--t-fade);
}
.ui-tree__group.is-open {
  block-size: auto;
  opacity: 1;
  filter: blur(0);
}

@media (prefers-reduced-motion: reduce) {
  .ui-tree__group { transition-duration: .01ms !important; filter: none; }
}
</style>
