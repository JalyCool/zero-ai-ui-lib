<script setup>
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RouteExpandCard from '../components/expand/RouteExpandCard.vue'
import ExpandActivity from '../expand/ExpandActivity.vue'
import { UiAlert, UiBadge, UiButton, UiEmptyState, UiFloatingMenu, UiSkeleton } from '../components/ui'
import {
  activityState,
  formatDateLabel,
  formatRecordDate,
  getActivityType,
  loadActivityRecords,
  toDateInputValue
} from '../core/activityStore'

const route = useRoute()
const router = useRouter()

const sortMode = ref('recent')
const sortItems = [
  { value: 'recent', label: '最近优先', description: '按日期与时间从新到旧' },
  { value: 'calories', label: '消耗最高', description: '优先显示高消耗记录' },
  { value: 'duration', label: '时长最长', description: '优先显示长时间训练' }
]

const records = computed(() => {
  const list = [...activityState.records]
  if (sortMode.value === 'calories') return list.sort((a, b) => b.calories - a.calories)
  if (sortMode.value === 'duration') return list.sort((a, b) => b.duration - a.duration)
  return list.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
})
const initialLoading = computed(() => activityState.loading && !activityState.loaded)
const todayCount = computed(() => records.value.filter(record => record.date === toDateInputValue()).length)

onMounted(() => loadActivityRecords())
onActivated(() => {
  if (!activityState.loaded) loadActivityRecords()
})

watch(
  () => [route.name, route.params.recordId, activityState.loaded, activityState.records.length],
  ([name, recordId, loaded]) => {
    if (name !== 'activity-record' || !loaded) return
    const exists = activityState.records.some(record => record.id === String(recordId))
    /* 历史栈规则：清理无效的展开子路由统一用 back()，
       不用 replace('/父')——replace 会把「展开记录」这条历史抹掉，
       后退语义就断了。 */
    if (!exists) router.back()
  },
  { immediate: true }
)

function goAdd() {
  router.push({ name: 'activity-new' })
}

function listMeta(record) {
  const datePrefix = record.date === toDateInputValue() ? '' : `${formatRecordDate(record.date)} `
  const distance = record.distance ? ` · ${record.distance} 公里` : ''
  return `${datePrefix}${record.time} · ${record.duration} 分钟${distance}`
}

function expansionProps(record) {
  const distance = record.distance ? ` · 距离 ${record.distance} 公里` : ''
  return {
    title: record.title,
    meta: `${formatDateLabel(record.date)} ${record.time} · ${record.duration} 分钟${distance}`,
    kcal: `+${record.calories} kcal`,
    desc: record.note || `这是一次${record.intensity}强度的${getActivityType(record.type).label}训练。`
  }
}

function iconFor(record) {
  return getActivityType(record.type).icon
}
</script>

<template>
  <section class="view active" data-view="activity">
    <div class="view-head">
      <div>
        <div class="view-title">运动记录</div>
        <div class="view-sub">
          {{ initialLoading ? '正在加载…' : `${records.length} 条记录 · 今天 ${todayCount} 项` }}
        </div>
      </div>
      <div class="view-actions">
        <UiFloatingMenu v-model="sortMode" label="排序" :items="sortItems" title="排序方式" />
        <UiButton size="sm" variant="tonal" @click="goAdd">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          新增
        </UiButton>
      </div>
    </div>

    <UiAlert v-if="activityState.error" tone="warning" title="本地存储提示">
      {{ activityState.error }}
    </UiAlert>

    <div v-if="initialLoading" class="list activity-skeleton" aria-label="正在加载运动记录">
      <div v-for="index in 3" :key="index" class="list-item skeleton-item">
        <UiSkeleton width="40px" height="40px" radius="12px" />
        <div class="skeleton-copy">
          <UiSkeleton width="42%" height="11px" />
          <UiSkeleton width="68%" height="9px" />
        </div>
        <UiSkeleton width="42px" height="10px" />
      </div>
    </div>

    <UiEmptyState
      v-else-if="records.length === 0"
      title="还没有运动记录"
      description="新增一条记录后，它会立即出现在这里，并保存在本机。"
    >
      <template #action>
        <UiButton size="sm" variant="tonal" @click="goAdd">新增记录</UiButton>
      </template>
    </UiEmptyState>

    <div v-else class="list">
      <RouteExpandCard
        v-for="record in records"
        :key="record.id"
        tag="div"
        variant="list-item"
        section="activity"
        :card-key="record.id"
        route-name="activity-record"
        :params="{ recordId: record.id }"
        :content="ExpandActivity"
        :content-props="expansionProps(record)"
      >
        <div class="list-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="iconFor(record)"></svg>
        </div>
        <div class="list-body">
          <b>{{ record.title }}</b>
          <span>{{ listMeta(record) }}</span>
        </div>
        <UiBadge tone="primary">+{{ record.calories }}</UiBadge>
      </RouteExpandCard>
    </div>

    <router-view v-slot="{ Component }">
      <component :is="Component" :key="route.name" />
    </router-view>
  </section>
</template>
