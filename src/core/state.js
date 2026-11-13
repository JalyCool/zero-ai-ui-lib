import { reactive } from 'vue'

const STORAGE_KEY = 'vital.theme.settings.v1'
const APPEARANCES = ['light', 'dark', 'white', 'black']

function readSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    return saved && typeof saved === 'object' ? saved : null
  } catch (error) {
    return null
  }
}

const saved = readSaved()

function validSeed(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#3b82f6'
}

/* 排版、视觉与动效已固定，仅保留颜色相关状态。 */
export const state = reactive({
  scheme: saved?.scheme === 'mono' ? 'mono' : 'material',
  seed: validSeed(saved?.seed),
  appearance: APPEARANCES.includes(saved?.appearance) ? saved.appearance : 'light'
})

export function persistThemeState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      scheme: state.scheme,
      seed: state.seed,
      appearance: state.appearance
    }))
  } catch (error) {
    // localStorage 不可用时只保留当前会话状态。
  }
}
