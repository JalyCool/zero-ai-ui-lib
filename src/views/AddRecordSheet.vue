<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import {
  UiAlert,
  UiBadge,
  UiBottomSheet,
  UiButton,
  UiDatePicker,
  UiInput,
  UiSegmented,
  UiSelect,
  UiStepper,
  UiTextarea,
  UiTimePicker
} from '../components/ui'
import {
  ACTIVITY_TYPES,
  addActivityRecord,
  currentTimeValue,
  formatDateLabel,
  getActivityType,
  toDateInputValue
} from '../core/activityStore'

const router = useRouter()

const open = ref(true)
const type = ref('walk')
const title = ref('')
const date = ref(toDateInputValue())
const time = ref(currentTimeValue())
const duration = ref(30)
const distance = ref('')
const calories = ref('180')
const intensity = ref('中等')
const note = ref('')
const saving = ref(false)
const formError = ref('')
const errors = reactive({ title: '', calories: '', distance: '' })
let closeTimer = null

const typeOptions = ACTIVITY_TYPES.map(item => ({ label: item.label, value: item.value }))
const intensityOptions = [
  { label: '低', value: '低' },
  { label: '中等', value: '中等' },
  { label: '高', value: '高' }
]

const selectedType = computed(() => getActivityType(type.value))
const previewTitle = computed(() => title.value.trim() || '新的运动记录')
const previewMeta = computed(() => {
  const distanceText = distance.value ? ` · ${distance.value} 公里` : ''
  return `${formatDateLabel(date.value)} ${time.value} · ${duration.value} 分钟${distanceText}`
})
const previewCalories = computed(() => {
  const value = Number(calories.value)
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0
})

watch(title, () => { errors.title = '' })
watch(calories, () => { errors.calories = '' })
watch(distance, () => { errors.distance = '' })

onBeforeUnmount(() => clearTimeout(closeTimer))

function closeSheet() {
  if (!open.value) return
  open.value = false
  /* 历史栈规则：先播完面板的弹簧收起动画，再 back()。
     不用 replace('/activity')——那会让「打开新增面板」这条历史残留，
     返回键行为与视觉方向相反。 */
  closeTimer = setTimeout(() => {
    router.back()
  }, 620)
}

function onSheetUpdate(value) {
  if (!value) closeSheet()
}

function cancel() {
  closeSheet()
}

function validate() {
  errors.title = title.value.trim() ? '' : '请输入运动名称'

  const calorieValue = Number(calories.value)
  errors.calories = Number.isFinite(calorieValue) && calorieValue >= 0 ? '' : '请输入有效的消耗数值'

  if (distance.value === '') {
    errors.distance = ''
  } else {
    const distanceValue = Number(distance.value)
    errors.distance = Number.isFinite(distanceValue) && distanceValue >= 0 ? '' : '距离需为 0 或更大'
  }

  return !errors.title && !errors.calories && !errors.distance
}

async function submit() {
  if (saving.value) return
  formError.value = ''
  if (!validate()) return

  saving.value = true
  try {
    await addActivityRecord({
      type: type.value,
      title: title.value,
      date: date.value,
      time: time.value,
      duration: duration.value,
      distance: distance.value === '' ? null : Number(distance.value),
      calories: Number(calories.value),
      intensity: intensity.value,
      note: note.value
    })
    closeSheet()
  } catch (error) {
    formError.value = error?.message || '保存失败，请稍后重试。'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiBottomSheet
    :model-value="open"
    title="新增运动记录"
    @update:model-value="onSheetUpdate"
  >
    <p class="add-sheet-intro">保存后会立即出现在运动记录列表，并持久保存在本机。</p>

    <form id="add-record-form" class="add-form" @submit.prevent="submit">
      <div class="add-preview list-item">
        <div class="list-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="selectedType.icon"></svg>
        </div>
        <div class="list-body">
          <b>{{ previewTitle }}</b>
          <span>{{ previewMeta }}</span>
        </div>
        <UiBadge tone="primary">+{{ previewCalories }}</UiBadge>
      </div>

      <section class="add-panel">
        <div class="add-panel__title">基础信息</div>
        <UiInput
          v-model="title"
          label="运动名称"
          placeholder="例如：晚间慢跑"
          :error="errors.title"
          autocomplete="off"
        />
        <UiSelect v-model="type" label="运动类型" :options="typeOptions" />
        <div class="add-row">
          <UiDatePicker v-model="date" />
          <UiTimePicker v-model="time" />
        </div>
      </section>

      <section class="add-panel">
        <div class="add-panel__title">运动数据</div>
        <div class="add-row">
          <UiStepper v-model="duration" label="时长" unit=" 分钟" :min="1" :max="600" :step="5" />
          <UiInput
            v-model="calories"
            label="消耗"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            placeholder="180"
            :error="errors.calories"
          >
            <template #suffix><span class="add-unit">kcal</span></template>
          </UiInput>
        </div>
        <div class="add-row">
          <UiInput
            v-model="distance"
            label="距离（可选）"
            type="number"
            min="0"
            step="0.1"
            inputmode="decimal"
            placeholder="0.0"
            :error="errors.distance"
          >
            <template #suffix><span class="add-unit">km</span></template>
          </UiInput>
          <div class="add-field">
            <span class="add-field__label">强度</span>
            <UiSegmented v-model="intensity" :options="intensityOptions" />
          </div>
        </div>
      </section>

      <section class="add-panel">
        <div class="add-panel__title">备注</div>
        <UiTextarea v-model="note" placeholder="记下今天的身体感受、路线或训练内容…" hint="仅自己可见" />
        <p class="add-hint">记录保存在浏览器 localStorage，刷新或重新打开后仍然存在。</p>
      </section>

      <UiAlert v-if="formError" tone="danger" title="保存失败">{{ formError }}</UiAlert>
    </form>

    <template #footer>
      <div class="add-actions">
        <UiButton variant="text" :disabled="saving" @click="cancel">取消</UiButton>
        <UiButton type="submit" form="add-record-form" :loading="saving" block>保存记录</UiButton>
      </div>
    </template>
  </UiBottomSheet>
</template>
