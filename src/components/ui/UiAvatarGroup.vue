<script setup>
import { computed, provide, useSlots } from 'vue'
import { Comment } from 'vue'

const props = defineProps({
  /* 统一给组内头像设置尺寸；单项自己写了 size 就以单项为准 */
  size: { type: String, default: '' },
  /* 超出 max 折叠成 +N；0 = 全部显示 */
  max: { type: Number, default: 0 }
})

const slots = useSlots()
const children = computed(() => (slots.default ? slots.default() : []).filter(node => node.type !== Comment))
const overflow = computed(() => {
  if (!props.max || children.value.length <= props.max) return 0
  return children.value.length - (props.max - 1)
})
const shown = computed(() => {
  if (!overflow.value) return children.value
  return children.value.slice(0, props.max - 1)
})

/* 组内头像通过 inject 拿到统一尺寸 */
provide('uiAvatarGroup', computed(() => ({ size: props.size })))

const moreClass = computed(() => ['ui-avatar', 'ui-avatar-group__more', props.size && props.size !== 'md' ? 'ui-avatar--' + props.size : ''])

/* 渲染子 vnode 列表（头像本身还是用户写的 <UiAvatar>） */
const Vnodes = props => props.nodes
Vnodes.props = { nodes: { type: Array, default: () => [] } }
</script>

<template>
  <span class="ui-avatar-group" role="group" aria-label="头像组">
    <Vnodes :nodes="shown" />
    <span v-if="overflow" :class="moreClass" aria-label="还有更多">+{{ overflow }}</span>
  </span>
</template>
