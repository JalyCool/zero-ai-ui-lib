import { reactive } from 'vue'

const STORAGE_KEY = 'vital.activity.records.v1'
const LOAD_DELAY = 320

export const ACTIVITY_TYPES = [
  {
    value: 'walk',
    label: '步行',
    icon: '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>'
  },
  {
    value: 'run',
    label: '跑步',
    icon: '<path d="M13 4a2 2 0 100-4 2 2 0 000 4z"/><path d="M8 21l3-6 3 2 2 4"/><path d="M11 15l-2-4 4-3 3 3 3 1"/>'
  },
  {
    value: 'cycle',
    label: '骑行',
    icon: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M5.5 17.5L12 6l4 11.5M12 6h4l3 5"/>'
  },
  {
    value: 'strength',
    label: '力量',
    icon: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/>'
  },
  {
    value: 'yoga',
    label: '瑜伽',
    icon: '<circle cx="12" cy="5" r="2"/><path d="M12 8v5M6 10l6 3 6-3M7 20l5-7 5 7"/>'
  },
  {
    value: 'stairs',
    label: '爬楼',
    icon: '<path d="M2 20h20M6 20V9M12 20V4M18 20v-7"/>'
  },
  {
    value: 'stroll',
    label: '散步',
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  },
  {
    value: 'other',
    label: '其他',
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'
  }
]

const TYPE_MAP = new Map(ACTIVITY_TYPES.map(type => [type.value, type]))

export const activityState = reactive({
  records: [],
  loaded: false,
  loading: false,
  error: ''
})

export function getActivityType(value) {
  return TYPE_MAP.get(value) || TYPE_MAP.get('other')
}

export function toDateInputValue(date = new Date()) {
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function currentTimeValue(date = new Date()) {
  const pad = value => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const RELATIVE_DAY_LABELS = {
  '-3': '大前天',
  '-2': '前天',
  '-1': '昨天',
  0: '今天',
  1: '明天',
  2: '后天',
  3: '大后天'
}

/* 与日期选择器同一套规则：±3 天显示称呼；与今年同年不显示年份。 */
export function formatDateLabel(value) {
  if (!value) return ''
  const parts = value.split('-')
  if (parts.length !== 3) return value

  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  if (Number.isNaN(date.getTime())) return value

  const base = new Date()
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const offset = Math.round((date.getTime() - today.getTime()) / 86400000)
  const label = RELATIVE_DAY_LABELS[offset]
  if (label) return label

  const monthDay = `${Number(parts[1])}月${Number(parts[2])}日`
  return Number(parts[0]) === today.getFullYear() ? monthDay : `${parts[0]}年${monthDay}`
}

export function formatRecordDate(value) {
  if (!value) return ''
  if (value === toDateInputValue()) return '今天'
  const parts = value.split('-')
  if (parts.length !== 3) return value
  return `${Number(parts[1])}/${Number(parts[2])}`
}

function createSeedRecords() {
  const date = toDateInputValue()
  return [
    {
      id: 'walk',
      type: 'walk',
      title: '晨间快走',
      date,
      time: '07:20',
      duration: 28,
      distance: 2.4,
      calories: 214,
      intensity: '中等',
      note: '从家出发的固定路线，平均配速 8\'20"/公里。今天天气凉爽，心率峰值 132 bpm。',
      createdAt: new Date().toISOString()
    },
    {
      id: 'strength',
      type: 'strength',
      title: '力量训练',
      date,
      time: '12:05',
      duration: 42,
      distance: null,
      calories: 186,
      intensity: '高',
      note: '自重为主，包含 3 组俯卧撑、3 组平板支撑、4 组划船。',
      createdAt: new Date().toISOString()
    },
    {
      id: 'stroll',
      type: 'stroll',
      title: '午后散步',
      date,
      time: '15:40',
      duration: 16,
      distance: 1.2,
      calories: 92,
      intensity: '低',
      note: '午后散步有助于稳定下午的专注度。',
      createdAt: new Date().toISOString()
    },
    {
      id: 'stairs',
      type: 'stairs',
      title: '爬楼梯',
      date,
      time: '18:10',
      duration: 8,
      distance: null,
      calories: 64,
      intensity: '低',
      note: '傍晚的碎片活动，共 8 层楼梯，对一天内的站立小时数有明显贡献。',
      createdAt: new Date().toISOString()
    }
  ]
}

function normalizeNumber(value, min, max, fallback = 0) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function normalizeRecord(record, index) {
  if (!record || typeof record !== 'object') return null

  const type = getActivityType(record.type || 'other').value
  const title = typeof record.title === 'string' && record.title.trim()
    ? record.title.trim()
    : getActivityType(type).label
  const date = typeof record.date === 'string' && record.date ? record.date : toDateInputValue()
  const time = typeof record.time === 'string' && record.time ? record.time : '00:00'
  const intensity = ['低', '中等', '高'].includes(record.intensity) ? record.intensity : '中等'

  return {
    id: typeof record.id === 'string' && record.id
      ? record.id
      : `rec_${Date.now().toString(36)}_${index}`,
    type,
    title,
    date,
    time,
    duration: normalizeNumber(record.duration, 0, 600, 0),
    distance: record.distance === '' || record.distance === null || record.distance === undefined
      ? null
      : normalizeNumber(record.distance, 0, 1000, 0),
    calories: normalizeNumber(record.calories, 0, 10000, 0),
    intensity,
    note: typeof record.note === 'string' ? record.note.trim() : '',
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString()
  }
}

function readRecords() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const parsed = JSON.parse(raw)
  const list = Array.isArray(parsed) ? parsed : parsed?.records
  return Array.isArray(list) ? list : null
}

function writeRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    return true
  } catch (error) {
    return false
  }
}

export async function loadActivityRecords({ force = false } = {}) {
  if (activityState.loading) return activityState.records
  if (activityState.loaded && !force) return activityState.records

  activityState.loading = true
  activityState.error = ''

  try {
    await new Promise(resolve => setTimeout(resolve, LOAD_DELAY))
    const stored = readRecords()

    if (stored) {
      activityState.records = stored
        .map((record, index) => normalizeRecord(record, index))
        .filter(Boolean)
    } else {
      const seeds = createSeedRecords()
      activityState.records = seeds
      if (!writeRecords(seeds)) {
        activityState.error = '本地存储不可用，记录只会在本次会话中保留。'
      }
    }

    activityState.loaded = true
  } catch (error) {
    activityState.records = createSeedRecords()
    activityState.loaded = true
    activityState.error = '读取本地记录失败，已载入示例数据。'
  } finally {
    activityState.loading = false
  }

  return activityState.records
}

export async function addActivityRecord(input) {
  await loadActivityRecords()

  const record = normalizeRecord({
    ...input,
    id: `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString()
  }, 0)

  if (!record) throw new Error('无法创建运动记录')

  activityState.records = [record, ...activityState.records]

  if (!writeRecords(activityState.records)) {
    activityState.error = '本地存储不可用，记录只会在本次会话中保留。'
  } else {
    activityState.error = ''
  }

  return record
}

export function getActivityRecord(id) {
  return activityState.records.find(record => record.id === id) || null
}
