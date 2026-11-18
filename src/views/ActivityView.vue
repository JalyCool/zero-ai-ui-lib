<script setup>
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RouteExpandCard from '../components/expand/RouteExpandCard.vue'
import ExpandActivity from '../expand/ExpandActivity.vue'
import {
  AppHead, UiAlert, UiBadge, UiButton, UiCheckbox, UiChip, UiEmptyState,
  UiFloatingMenu, UiModal, UiSkeleton, UiSwipeRow, UiToolMenu
} from '../lib'
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
    <!-- 页面头部：AppHead（插槽化）—— 大标题在流内，上滑后自动融合成
         迷你条（与顶部渐变模糊带融为一体）。动作按钮走 #actions 插槽，
         不用再为每个页面自造 view-head。 -->
    <AppHead title="运动记录" :sub="initialLoading ? '正在加载…' : `${records.length} 条记录 · 今天 ${todayCount} 项`">
      <template #actions>
        <UiFloatingMenu v-model="sortMode" label="排序" :items="sortItems" title="排序方式" />
        <UiButton size="sm" variant="tonal" @click="goAdd">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          新增
        </UiButton>
      </template>
    </AppHead>

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

    <div v-else class="list">
      <!-- 划开式行：左滑出删除 / 编辑，右滑出分享 -->
      <UiSwipeRow
        v-for="record in records"
        :key="record.id"
        :actions="swipeActions"
        :left-actions="swipeLeftActions"
        @action="a => onSwipeAction(a, record)"
        @commit="a => onSwipeAction(a, record)"
      >
        <RouteExpandCard
          section="activity"
          :card-key="record.id"
          tag="div"
          variant="list-item"
          route-name="activity-record"
          :params="{ recordId: record.id }"
          :content="ExpandActivity"
          :content-props="expansionProps(record)"
        >
          <div class="list-item__row">
            <UiCheckbox
              v-if="selectionMode"
              :model-value="selected.includes(record.id)"
              @update:model-value="toggleOne(record.id)"
            />
            <div class="list-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="iconFor(record)"></svg>
            </div>
            <div class="list-body">
              <b>{{ record.title }}</b>
              <span>{{ listMeta(record) }}</span>
            </div>
            <UiBadge tone="primary">+{{ record.calories }}</UiBadge>
            <!-- 行内更多操作：UiFloatingMenu（自绘按钮 + items），
                 不用 UiToolMenu —— 它是「图标 + 文字 + 箭头」的下拉，
                 塞进列表行会挤掉正文。 -->
            <UiFloatingMenu
              :model-value="''"
              label="⋯"
              size="sm"
              :items="rowMenuItems"
              @select="item => item.value === 'delete' && (selected = [record.id])"
            />
          </div>
        </RouteExpandCard>
      </UiSwipeRow>
    </div>

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