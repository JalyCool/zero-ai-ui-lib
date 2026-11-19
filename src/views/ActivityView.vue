<script setup>
import { computed, h, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RouteExpandCard from '../components/expand/RouteExpandCard.vue'
import ExpandActivity from '../expand/ExpandActivity.vue'
import {
  UiAlert, UiBadge, UiButton, UiCheckbox, UiChip, UiEmptyState,
  UiIcon, UiMenu, UiModal, UiSkeleton
} from '../lib'
import { setPageHeadActions } from '../composables/useAppHead'
import { useHeadFused } from '../composables/useHeadFuse'
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

/* 页面头部动作：不再自造头部，登记到外壳的 AppHead ——
   它会和全局按钮（命令面板 / 设置）并排显示，上滑融合后依然在一起。 */
onMounted(() => registerHeadActions())
onActivated(() => registerHeadActions())
/* keep-alive 下切走只触发 deactivated，必须在这里清理，否则动作会残留到别的页面 */
onDeactivated(() => setPageHeadActions(null))
onBeforeUnmount(() => setPageHeadActions(null))

/* 顶栏动作：进入融合态后一律收成图标按钮 —— 融合条高度有限，
   带文字的按钮会挤占标题，甚至和标题叠在一起。 */
const fused = useHeadFused()

function registerHeadActions() {
  setPageHeadActions(() => [
    h(UiMenu, {
      variant: 'floating',
      modelValue: sortMode.value,
      'onUpdate:modelValue': v => (sortMode.value = v),
      label: '排序',
      items: sortItems,
      title: '排序方式',
      showLabel: !fused.value,
      showChevron: !fused.value
    }),
    fused.value
      ? h(UiButton, { variant: 'icon', size: 'sm', onClick: () => goAdd() },
          () => h(UiIcon, { name: 'mdi:plus', size: 18 }))
      : h(UiButton, { size: 'sm', variant: 'tonal', onClick: () => goAdd() }, () => '新增')
  ])
}

const sortMode = ref('recent')
const sortItems = [
  { value: 'recent', label: '最近优先', description: '按日期与时间从新到旧' },
  { value: 'calories', label: '消耗最高', description: '优先显示高消耗记录' },
  { value: 'duration', label: '时长最长', description: '优先显示长时间训练' }
]

/* ---------- 筛选 ---------- */
const typeFilter = ref('all')
const onlyFavorites = ref(false)

const typeChips = computed(() => [
  { value: 'all', label: '全部' },
  ...activityState.records
    .map(r => r.type)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(v => ({ value: v, label: getActivityType(v).label }))
])

const records = computed(() => {
  let list = [...activityState.records]
  if (typeFilter.value !== 'all') list = list.filter(r => r.type === typeFilter.value)
  if (onlyFavorites.value) list = list.filter(r => r.calories >= 300)
  if (sortMode.value === 'calories') list = list.sort((a, b) => b.calories - a.calories)
  else if (sortMode.value === 'duration') list = list.sort((a, b) => b.duration - a.duration)
  else list = list.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
  return list
})

/* 横向滑动列表：一列 = 一天。容器整体是展开的原始对象（见模板）。 */
const days = computed(() => {
  const groups = new Map()
  for (const record of records.value) {
    if (!groups.has(record.date)) groups.set(record.date, [])
    groups.get(record.date).push(record)
  }
  return [...groups.entries()].map(([date, items]) => ({
    date,
    items,
    label: formatDateLabel(date),
    minutes: items.reduce((sum, r) => sum + r.duration, 0),
    kcal: items.reduce((sum, r) => sum + r.calories, 0)
  }))
})

/* 展开内容取最近一天（容器级汇总），而不是某一张卡片 */
const boardProps = computed(() => {
  const day = days.value[0]
  if (!day) {
    return { title: '活动记录', meta: '还没有记录', kcal: '+0 kcal', desc: '新增一条记录后，这里会按天汇总。' }
  }
  return {
    title: day.label,
    meta: `${day.items.length} 条 · ${day.minutes} 分钟 · 累计 ${day.kcal} kcal`,
    kcal: `+${day.kcal} kcal`,
    desc: `${day.label}共 ${day.items.length} 次训练，累计 ${day.minutes} 分钟。`
  }
})

const initialLoading = computed(() => activityState.loading && !activityState.loaded)
const todayCount = computed(() => records.value.filter(record => record.date === toDateInputValue()).length)
const totalMinutes = computed(() => records.value.reduce((sum, r) => sum + r.duration, 0))
const totalKcal = computed(() => records.value.reduce((sum, r) => sum + r.calories, 0))

/* ---------- 批量操作 ---------- */
const selectionMode = ref(false)
const selected = ref([])
const allChecked = computed(() => records.value.length > 0 && selected.value.length === records.value.length)

function toggleAll() {
  selected.value = allChecked.value ? [] : records.value.map(r => r.id)
}
function toggleOne(id) {
  const i = selected.value.indexOf(id)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(id)
}
function exitSelection() {
  selectionMode.value = false
  selected.value = []
}

const confirmOpen = ref(false)
function batchDelete() {
  /* 这里只演示确认流程：真删除要走 store */
  confirmOpen.value = false
  exitSelection()
}

const rowMenuItems = [
  { value: 'edit', label: '编辑' },
  { value: 'duplicate', label: '复制一条' },
  { value: 'share', label: '分享' },
  { type: 'divider' },
  { value: 'delete', label: '删除', tone: 'danger' }
]

const swipeActions = [
  { label: '编辑', tone: 'primary' },
  { label: '分享', tone: 'neutral' }
]
const swipeLeftActions = [
  { label: '删除', tone: 'danger' }
]

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

function goAdd() { router.push({ name: 'activity-new' }) }

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

function iconFor(record) { return getActivityType(record.type).icon }
function onSwipeAction(action, record) {
  if (action.label === '删除') selected.value = [record.id]
}
</script>

<template>
  <section class="view active" data-view="activity">
    <!-- 批量操作条：只在多选模式出现 -->
    <div v-if="selectionMode" class="activity-batch">
      <UiCheckbox :model-value="allChecked" @update:model-value="toggleAll" />
      <span>已选 {{ selected.length }} 项</span>
      <div class="activity-batch__actions">
        <UiButton size="sm" variant="text" @click="exitSelection">取消</UiButton>
        <UiButton size="sm" variant="danger" :disabled="!selected.length" @click="confirmOpen = true">删除</UiButton>
      </div>
    </div>

    <!-- 筛选：类型 chips + 仅高消耗 -->
    <div class="activity-filters">
      <UiChip
        v-for="chip in typeChips"
        :key="chip.value"
        :selected="typeFilter === chip.value"
        variant="tonal"
        @select="typeFilter = chip.value"
      >{{ chip.label }}</UiChip>

      <UiChip :selected="onlyFavorites" variant="tonal" dot @select="onlyFavorites = !onlyFavorites">
        仅高消耗
      </UiChip>

      <UiButton size="sm" variant="text" @click="selectionMode ? exitSelection() : (selectionMode = true)">
        {{ selectionMode ? '退出多选' : '多选' }}
      </UiButton>
    </div>

    <!-- 统计条 -->
    <div class="activity-stats">
      <div><b>{{ totalMinutes }}</b><span>总时长（分钟）</span></div>
      <div><b>{{ totalKcal }}</b><span>总消耗（kcal）</span></div>
      <div><b>{{ todayCount }}</b><span>今天</span></div>
    </div>

    <UiAlert v-if="activityState.error" tone="warning" title="本地存储提示">
      {{ activityState.error }}
    </UiAlert>

    <div v-if="initialLoading" class="list activity-skeleton" aria-label="正在加载运动记录">
      <div v-for="index in 6" :key="index" class="list-item skeleton-item">
        <UiSkeleton width="40px" height="40px" radius="12px" />
        <div class="skeleton-copy">
          <UiSkeleton width="42%" />
          <UiSkeleton width="68%" />
        </div>
        <UiSkeleton class="skeleton-badge" width="52px" />
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

    <!-- 横向滑动列表：整块容器是展开的原始对象。
         点任意一天/任意卡片，形变都从**容器**发生（不再是内部某张卡片），
         展开后看到的是这一天的汇总。 -->
    <RouteExpandCard
      v-else
      class="activity-board-wrap"
      section="activity"
      card-key="board"
      tag="div"
      variant="card"
      route-name="activity-board"
      :content="ExpandActivity"
      :content-props="boardProps"
    >
      <div class="activity-board">
        <div v-for="day in days" :key="day.date" class="activity-day">
          <div class="activity-day__head">
            <b>{{ day.label }}</b>
            <span>{{ day.items.length }} 条 · {{ day.minutes }} 分钟</span>
          </div>
          <div v-for="record in day.items" :key="record.id" class="activity-card">
            <span class="activity-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="iconFor(record)"></svg>
            </span>
            <div class="activity-card__body">
              <b>{{ record.title }}</b>
              <span>{{ listMeta(record) }}</span>
            </div>
            <em>+{{ record.calories }}</em>
            <UiCheckbox
              v-if="selectionMode"
              :model-value="selected.includes(record.id)"
              @update:model-value="toggleOne(record.id)"
            />
          </div>
        </div>
      </div>
    </RouteExpandCard>

    <!-- 批量删除确认：统一走 confirmDialog，不用 window.confirm -->
    <UiModal v-model="confirmOpen" title="删除所选记录">
      <p style="margin: 0 0 16px; color: var(--on-surface-variant)">
        将删除 {{ selected.length }} 条记录。删除后无法恢复。
      </p>
      <template #footer>
        <UiButton variant="text" @click="confirmOpen = false">取消</UiButton>
        <UiButton variant="danger" @click="batchDelete">删除</UiButton>
      </template>
    </UiModal>

    <router-view v-slot="{ Component }">
      <component :is="Component" :key="route.name" />
    </router-view>
  </section>
</template>

<style scoped>
/* 横向滑动列表：scroll-snap 让每次停在一「天」上；隐藏滚动条保持安静。 */
.activity-board-wrap { display: block; }
.activity-board {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 2px 2px 12px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.activity-board::-webkit-scrollbar { display: none; }
.activity-day {
  flex: 0 0 86%;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: calc(var(--r-14) * var(--radius-scale));
  background: var(--surface-container-low);
}
.activity-day__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.activity-day__head b { font-size: 1.05rem; font-weight: var(--w-heading); }
.activity-day__head span { font-size: var(--fs-micro); color: var(--on-surface-variant); }
.activity-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 0;
  border-radius: calc(var(--r-12) * var(--radius-scale));
  background: var(--surface-container);
  color: var(--on-surface);
  text-align: left;
  cursor: pointer;
  transition: transform var(--t-feedback), background var(--t-fade);
}
.activity-card:active { transform: scale(var(--press-scale)); }
.activity-card__icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--surface-container-high); color: var(--primary); }
.activity-card__icon svg { width: 20px; height: 20px; }
.activity-card__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.activity-card__body b { font-size: var(--fs-small); }
.activity-card__body span { font-size: var(--fs-micro); color: var(--on-surface-variant); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity-card em { font-style: normal; font-weight: 600; font-size: var(--fs-micro); color: var(--primary); }

.activity-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.activity-batch {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: calc(var(--r-14) * var(--radius-scale));
  background: var(--primary-container);
  color: var(--on-primary-container);
}
.activity-batch__actions { margin-left: auto; display: flex; gap: 6px; }

.activity-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.activity-stats div { display: flex; flex-direction: column; gap: 2px; }
.activity-stats b {
  font-size: var(--fs-big);
  font-weight: var(--w-heading);
  font-variant-numeric: tabular-nums;
  font-feature-settings: var(--font-feat-tnum);
}
.activity-stats span { font-size: var(--fs-micro); color: var(--on-surface-variant); }

.list-item__row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.list-item__row .list-body { flex: 1; min-width: 0; }
</style>