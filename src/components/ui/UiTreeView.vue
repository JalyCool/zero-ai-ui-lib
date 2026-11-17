<script>
/* 模块级共享 key：所有递归实例共用同一个 Symbol。 */
const ROOT_KEY = Symbol('ui-tree-root')
</script>

<script setup>
import { computed, inject, onBeforeUnmount, provide, reactive, ref } from 'vue'
import { getSpringConfig, motion } from '../../composables/useMotion'

const props = defineProps({
  /* [{ label, value?, children?, kind? }]；kind 决定图标 */
  nodes: { type: Array, default: () => [] },
  modelValue: { type: [String, Number, Array], default: '' },
  /* 初始展开的节点 value 列表 */
  defaultOpen: { type: Array, default: null },
  indent: { type: Number, default: 16 },
  /* 多选模式：modelValue 为数组，点击切换包含关系 */
  multi: { type: Boolean, default: false },
  /* 级联多选：勾目录 = 勾中它的整棵子树；父级显示半选 */
  cascade: { type: Boolean, default: false },
  /* 关键字过滤：命中节点及其祖先保留，过滤时自动展开命中分支 */
  filter: { type: String, default: '' },
  /* 拖拽换父：把行拖到目录行上，emit move { from, to } */
  draggable: { type: Boolean, default: false },
  /* 以下两项由递归内部传入，外部不要设置 */
  depth: { type: Number, default: 0 },
  pathPrefix: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'select', 'expand', 'move'])

/* ============================================================
   文件树：可展开 / 折叠，图标按类型区分。
   展开折叠是「0 <-> 自然高度」的连续过渡（与折叠面板同一手法）：
   子级分组常驻 DOM，block-size 插值 + 行从模糊里浮现；
   箭头旋转；不支持关键字插值的浏览器由 JS 测像素高度兜底。
   选中与展开状态由根实例持有并 provide，递归子实例 inject 共用。
   ============================================================ */

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
  /* 拖拽中的源节点 value（全树共享，避免每个递归实例各存一份） */
  dragging: ref(''),
  dropKey: ref(''),
} : null

if (isRoot) provide(ROOT_KEY, state)
const shared = isRoot ? state : (inject(ROOT_KEY) || state)

/* 过滤：节点自身命中，或任一后代命中，就保留；祖先因此不会被隐藏。 */
function subtreeMatches(node) {
  const query = props.filter.trim().toLowerCase()
  if (!query) return true
  if (String(node.label || '').toLowerCase().includes(query)) return true
  return childrenOf(node).some(subtreeMatches)
}

const rows = computed(() => props.nodes.filter(subtreeMatches).map((node, index) => {
  const path = props.pathPrefix ? props.pathPrefix + '/' + index : String(index)
  const kids = childrenOf(node)
  return { node, path, key: nodeKey(node, path), hasChildren: kids.length > 0, children: kids }
}))

function isOpen(key) {
  /* 过滤时命中分支一律展开，否则用户还得挨个点开才能看到结果。 */
  if (props.filter.trim()) return true
  return !!shared.openMap.value.get(key)
}
function isPicked(row) { return shared.picked.value.has(String(row.node.value ?? row.key)) }

/* 一个节点及其全部后代的 value（级联勾选用）。 */
function subtreeValues(node) {
  const out = []
  const walk = current => {
    if (current.value !== undefined && current.value !== null) out.push(String(current.value))
    childrenOf(current).forEach(walk)
  }
  walk(node)
  return out
}

function checkState(row) {
  if (!props.multi) return isPicked(row) ? 'on' : 'off'
  if (!props.cascade) return isPicked(row) ? 'on' : 'off'
  /* 级联模式：父级状态只看**后代**的勾选情况。
     不能把父级自己的 value 算进去 —— 子项全取消后父级仍留在 picked 里，
     一算就变成「部分选中」了（这就是父级一直半选的根因）。 */
  const own = String(row.node.value ?? row.key)
  const values = subtreeValues(row.node).filter(value => value !== own)
  if (!values.length) return isPicked(row) ? 'on' : 'off'
  const hit = values.filter(value => shared.picked.value.has(value)).length
  if (!hit) return 'off'
  return hit === values.length ? 'on' : 'mixed'
}

function toggleCheck(row) {
  const values = props.cascade ? subtreeValues(row.node) : [String(row.node.value ?? row.key)]
  if (!values.length) return
  const next = new Set(shared.picked.value)
  const allOn = values.every(value => next.has(value))
  values.forEach(value => { if (allOn) next.delete(value); else next.add(value) })
  emit('update:modelValue', [...next])
}

function pick(row) {
  if (row.hasChildren) { shared.toggle(row.key); return }
  shared.choose(row.node.value ?? row.key)
  emit('select', row.node)
}

/* ---------------- 分组展开：motion 弹簧驱动高度 ----------------
   分组 DOM 常驻不销毁，高度由 motion 的**声明式** :animate 驱动
   （view 场景弹簧），行内容随 opacity/blur 的 CSS 过渡浮现 ——
   替换掉原来生硬的 grid 0fr↔1fr 直线过渡。

   为什么用声明式而非 animate(motionValue)：
   · 声明式是 motion 组件自己的渲染通道（与流式词壳同一套），
     低帧率环境下也能到终值；
   · 命令式 animate(mv) 是纯 JS 逐帧，帧数不足时几乎不动
     （实测 1.2s 只跑 3 帧时 MV 停在 0、DOM 高度恒为 0）。

   自然高度由 clip 的 ResizeObserver 量出来（嵌套子树高度变化也覆盖），
   作为 :animate 的目标值。clip 挂普通 div 的 ref —— motion 组件的 ref
   给的是实例，取 $el 会踩雷（Vue 报 ref function 执行错误）。 */
const naturalHeights = reactive({})  /* key -> 内容自然高度（px） */
const groupClips = new Map()         /* key -> clip 元素 */
const groupRoKeys = new WeakMap()    /* clip -> key */
let groupRo = null

function ensureGroupRo() {
  if (groupRo || typeof ResizeObserver === 'undefined') return groupRo
  groupRo = new ResizeObserver(entries => {
    entries.forEach(entry => {
      const k = groupRoKeys.get(entry.target)
      if (k === undefined) return
      const h = entry.target.scrollHeight
      if (h > 0 && naturalHeights[k] !== h) naturalHeights[k] = h
    })
  })
  return groupRo
}

function unbindClip(key) {
  const clip = groupClips.get(key)
  if (!clip) return
  if (groupRo) groupRo.unobserve(clip)
  groupRoKeys.delete(clip)
  groupClips.delete(key)
}

/* clip 的 ref 回调会调用两次：首次子组件尚未渲染完，scrollHeight 是 0；
   下一帧才有真实高度。所以「元素相同就整个跳过」是错的 —— 那样高度会
   永远停在 0（树明明展开了、分组却零高）。这里只跳过重绑，高度每次都重读，
   且只在值真的变化时写，避免「读 scrollHeight -> 写响应式 -> 重渲染」的循环。 */
function setClipEl(key, el) {
  if (!el) { unbindClip(key); return }
  if (groupClips.get(key) !== el) {
    unbindClip(key)
    groupClips.set(key, el)
    const ro = ensureGroupRo()
    if (ro) {
      groupRoKeys.set(el, key)
      ro.observe(el)
    }
  }
  const h = el.scrollHeight
  if (h > 0 && naturalHeights[key] !== h) naturalHeights[key] = h
}

/* 分组当前应占的高度：收起 = 0，展开 = 内容自然高度。
   返回**稳定的对象引用**（下面 animateTargets 缓存），只在数值变化时改属性 ——
   每帧新建对象字面量会让 motion 反复收到新引用，diff 不稳定。 */
const animateTargets = reactive({})
function groupAnimate(key) {
  let box = animateTargets[key]
  if (!box) {
    box = animateTargets[key] = { height: 0 }
  }
  const target = isOpen(key) ? (naturalHeights[key] || 0) : 0
  if (box.height !== target) box.height = target
  return box
}

onBeforeUnmount(() => {
  if (groupRo) groupRo.disconnect()
  groupRo = null
  groupClips.clear()
})

/* ---------- 拖拽换父 ---------- */
function onDragStart(row, event) {
  if (!props.draggable) return
  const value = row.node.value !== undefined ? String(row.node.value) : row.key
  shared.dragging.value = value
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    try { event.dataTransfer.setData('text/plain', value) } catch (error) { /* 某些环境禁止写 */ }
  }
}
function onDragOver(row, event) {
  if (!props.draggable || !shared.dragging.value) return
  if (!row.hasChildren) return
  const value = row.node.value !== undefined ? String(row.node.value) : row.key
  if (value === shared.dragging.value) return
  event.preventDefault()
  shared.dropKey.value = row.key
}
function onDragLeave(row) {
  if (shared.dropKey.value === row.key) shared.dropKey.value = ''
}
function onDrop(row, event) {
  if (!props.draggable || !row.hasChildren) return
  event.preventDefault()
  const to = row.node.value !== undefined ? String(row.node.value) : row.key
  const from = shared.dragging.value
  shared.dragging.value = ''
  shared.dropKey.value = ''
  if (from && from !== to) emit('move', { from, to })
}

function iconOf(node) {
  if (childrenOf(node).length) return 'folder'
  return node.kind || 'file'
}


/* defineExpose 是编译宏，必须无条件出现在 setup 顶层；
   递归子实例只暴露一个空对象，openAll 只在根实例上有效。 */
defineExpose(isRoot ? {
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
} : {})
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
          'is-open': row.hasChildren && isOpen(row.key),
          'is-drop': shared.dropKey.value === row.key
        }"
        :style="{ paddingLeft: 'calc(8px + var(--tree-indent, 16px) * ' + depth + ')' }"
        :draggable="draggable ? 'true' : undefined"
        :aria-expanded="row.hasChildren ? isOpen(row.key) : undefined"
        :aria-selected="isPicked(row)"
        @click="pick(row)"
        @dragstart="onDragStart(row, $event)"
        @dragover="onDragOver(row, $event)"
        @dragleave="onDragLeave(row)"
        @drop="onDrop(row, $event)"
      >
        <span v-if="row.hasChildren" class="ui-tree__caret" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </span>
        <span v-else class="ui-tree__caret ui-tree__caret--gap" aria-hidden="true"></span>
        <span
          v-if="multi"
          class="ui-tree__check"
          :class="{ 'is-on': checkState(row) === 'on', 'is-mixed': checkState(row) === 'mixed' }"
          aria-hidden="true"
          @click.stop="toggleCheck(row)"
        >
          <svg v-if="checkState(row) === 'mixed'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 12h12" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </span>
        <span class="ui-tree__icon" :data-kind="iconOf(row.node)" aria-hidden="true">
          <svg v-if="iconOf(row.node) === 'folder'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>
        </span>
        <span class="ui-tree__label">{{ row.node.label }}</span>
      </button>

      <!-- 子级分组：DOM 常驻不销毁，高度由 motion 弹簧驱动（view 场景），
           行内容随 opacity/blur 浮现；is-open 只管箭头旋转与淡入。
           高度走响应式像素值（MV 的 change 写入），由 Vue 渲染 —— 不把
           MotionValue 直接给 motion 的 :style（非 transform 属性会被跳过）。
           clip 挂普通 div 的 ref（量高度用它，避免解析 motion 实例）。 -->
      <motion.div
        v-if="row.hasChildren"
        class="ui-tree__group"
        :class="{ 'is-open': isOpen(row.key) }"
        :animate="groupAnimate(row.key)"
        :transition="getSpringConfig('view')"
      >
        <div :ref="el => setClipEl(row.key, el)" class="ui-tree__group-clip">
        <UiTreeView
          :nodes="row.children"
          :depth="depth + 1"
          :path-prefix="row.path"
          :model-value="modelValue"
          :multi="multi"
          :cascade="cascade"
          :filter="filter"
          :draggable="draggable"
          @select="node => emit('select', node)"
          @expand="payload => emit('expand', payload)"
          @move="payload => emit('move', payload)"
          @update:model-value="value => emit('update:modelValue', value)"
        />
        </div>
      </motion.div>
    </template>
  </div>
</template>

<style scoped>
.ui-tree {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.ui-tree__inner { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ui-tree__row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border: 0;
  border-radius: calc(var(--r-10) * var(--radius-scale));
  background: transparent;
  color: var(--on-surface);
  font-size: var(--fs-small);
  text-align: left;
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-tree__row:hover { background: var(--surface-container); }
.ui-tree__row.is-drop {
  background: color-mix(in oklab, var(--primary) 14%, transparent);
  outline: var(--focus-w) dashed color-mix(in oklab, var(--primary) 55%, transparent);
  outline-offset: -2px;
}
.ui-tree__check.is-mixed { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
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

/* 分组：高度由 motion 弹簧驱动（内联 style），这里只管淡入与裁剪。
   行 DOM 常驻不销毁；嵌套子树高度变化由 ResizeObserver 校正。 */
.ui-tree__group {
  overflow: hidden;
  opacity: 0;
  filter: blur(5px);
  transition: opacity var(--t-fade), filter var(--t-fade);
}
.ui-tree__group.is-open { opacity: 1; filter: blur(0); }
.ui-tree__group-clip { overflow: hidden; }

@media (prefers-reduced-motion: reduce) {
  .ui-tree__group { transition-duration: .01ms !important; filter: none; }
}
</style>
