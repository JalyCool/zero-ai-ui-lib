/* ============================================================
   主题与配色（MD3 / OKLCH 回退）
   ============================================================ */
import { persistThemeState, state } from './state'

let m3 = null
let transitionTimer = null
const TOKEN_CACHE_KEY = 'vital.theme.tokens.v1'
// 首帧预置底色：index.html 的启动脚本会读取它，避免先白后深。
const BACKGROUND_CACHE_KEY = 'vital.theme.background.v1'

function cacheKey() {
  return `${state.scheme}|${state.seed.toLowerCase()}|${state.appearance}`
}

function readTokenCache() {
  try {
    const raw = localStorage.getItem(TOKEN_CACHE_KEY)
    if (!raw) return {}
    const cache = JSON.parse(raw)
    return cache && typeof cache === 'object' ? cache : {}
  } catch (error) {
    return {}
  }
}

function writeTokenCache(vars) {
  try {
    const cache = readTokenCache()
    cache[cacheKey()] = vars
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    // 缓存失败时继续使用实时计算或回退色板。
  }
}

export const PRESET_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#64748b'
]

/* MD3 异步加载：不阻塞首屏，加载成功后自动升级配色 */
export async function loadMD3() {
  try {
    m3 = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@material/material-color-utilities@0.3.0/+esm')
    return true
  } catch (error) {
    console.warn('MD3 加载失败，将使用 OKLCH 近似', error)
    return false
  }
}

function hexToRgb255(hex) {
  const value = hex.replace('#', '')
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  }
}

function getHue(hex) {
  // 返回 OKLCH 色相，而不是 HSL 色相，保证回退色板与 MD3 的色相方向一致。
  const rgb = hexToRgb255(hex)
  const linear = value => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }
  const r = linear(rgb.r)
  const g = linear(rgb.g)
  const b = linear(rgb.b)

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
  const lRoot = Math.cbrt(l)
  const mRoot = Math.cbrt(m)
  const sRoot = Math.cbrt(s)

  const aAxis = 1.9779984951 * lRoot - 2.4285922050 * mRoot + 0.4505937099 * sRoot
  const bAxis = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.8086757660 * sRoot

  return (Math.atan2(bAxis, aAxis) * 180 / Math.PI + 360) % 360
}

function safeHex(lightness, chroma, hue) {
  try {
    hue = ((hue % 360) + 360) % 360
    lightness = Math.max(0.01, Math.min(1, lightness))
    chroma = Math.max(0, Math.min(0.4, chroma))

    const a = chroma * Math.cos(hue * Math.PI / 180)
    const b = chroma * Math.sin(hue * Math.PI / 180)

    const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b
    const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b
    const s_ = lightness - 0.0894841775 * a - 1.2914855480 * b

    const l3 = l_ ** 3
    const m3_ = m_ ** 3
    const s3 = s_ ** 3

    const r = 4.0767416621 * l3 - 3.3077115913 * m3_ + 0.2309699292 * s3
    const g = -1.2684380046 * l3 + 2.6097574011 * m3_ - 0.3413193965 * s3
    const bb = -0.0041960863 * l3 - 0.7034186147 * m3_ + 1.7076147010 * s3

    const gamma = value => {
      value = Math.max(0, Math.min(1, value))
      return value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055
    }
    const to255 = value => Math.round(gamma(value) * 255).toString(16).padStart(2, '0')

    return '#' + to255(r) + to255(g) + to255(bb)
  } catch (error) {
    return '#000000'
  }
}

function md3Vibrant(seed, isDark) {
  if (!m3) return null

  const hct = m3.Hct.fromInt(m3.argbFromHex(seed))
  const scheme = new m3.SchemeVibrant(hct, isDark, 0)
  const primary = scheme.primaryPalette
  const secondary = scheme.secondaryPalette
  const neutral = scheme.neutralPalette
  const neutralVariant = scheme.neutralVariantPalette
  const error = scheme.errorPalette
  const tone = (palette, value) => m3.hexFromArgb(palette.tone(value))

  if (isDark) {
    return {
      '--background': tone(neutral, 6), '--surface': tone(neutral, 6),
      '--surface-container-low': tone(neutral, 10), '--surface-container': tone(neutral, 12),
      '--surface-container-high': tone(neutral, 17), '--surface-container-highest': tone(neutral, 22),
      '--on-surface': tone(neutral, 90), '--on-surface-variant': tone(neutralVariant, 80),
      '--outline': tone(neutralVariant, 60), '--outline-variant': tone(neutralVariant, 30),
      '--primary': tone(primary, 80), '--on-primary': tone(primary, 20),
      '--primary-container': tone(primary, 30), '--on-primary-container': tone(primary, 90),
      '--secondary': tone(secondary, 80), '--secondary-container': tone(secondary, 30),
      '--on-secondary-container': tone(secondary, 90),
      '--error': tone(error, 80), '--on-error': tone(error, 20)
    }
  }

  return {
    '--background': tone(neutral, 98), '--surface': tone(neutral, 98),
    '--surface-container-low': tone(neutral, 96), '--surface-container': tone(neutral, 94),
    '--surface-container-high': tone(neutral, 92), '--surface-container-highest': tone(neutral, 90),
    '--on-surface': tone(neutral, 10), '--on-surface-variant': tone(neutralVariant, 30),
    '--outline': tone(neutralVariant, 50), '--outline-variant': tone(neutralVariant, 85),
    '--primary': tone(primary, 40), '--on-primary': tone(primary, 100),
    '--primary-container': tone(primary, 90), '--on-primary-container': tone(primary, 10),
    '--secondary': tone(secondary, 40), '--secondary-container': tone(secondary, 90),
    '--on-secondary-container': tone(secondary, 10),
    '--error': tone(error, 40), '--on-error': tone(error, 100)
  }
}

function monochromeTokens(isDark) {
  if (isDark) {
    return {
      '--background': '#0a0a0a', '--surface': '#0a0a0a',
      '--surface-container-low': '#141414', '--surface-container': '#1c1c1c',
      '--surface-container-high': '#242424', '--surface-container-highest': '#2c2c2c',
      '--on-surface': '#ededed', '--on-surface-variant': '#a3a3a3',
      '--outline': '#5a5a5a', '--outline-variant': '#2e2e2e',
      '--primary': '#ededed', '--on-primary': '#0a0a0a',
      '--primary-container': '#2c2c2c', '--on-primary-container': '#ededed',
      '--secondary': '#a3a3a3', '--secondary-container': '#242424',
      '--on-secondary-container': '#ededed',
      '--error': '#ff8a7a', '--on-error': '#2a0a06'
    }
  }

  return {
    '--background': '#ffffff', '--surface': '#ffffff',
    '--surface-container-low': '#f7f7f7', '--surface-container': '#f0f0f0',
    '--surface-container-high': '#e8e8e8', '--surface-container-highest': '#e0e0e0',
    '--on-surface': '#111111', '--on-surface-variant': '#666666',
    '--outline': '#a3a3a3', '--outline-variant': '#d4d4d4',
    '--primary': '#111111', '--on-primary': '#ffffff',
    '--primary-container': '#e0e0e0', '--on-primary-container': '#111111',
    '--secondary': '#666666', '--secondary-container': '#e8e8e8',
    '--on-secondary-container': '#111111',
    '--error': '#b42318', '--on-error': '#ffffff'
  }
}

function fallbackOklch(seed, isDark) {
  const hue = getHue(seed)
  const lightness = isDark
    ? [0.90, 0.82, 0.72, 0.62, 0.52, 0.44, 0.36, 0.30, 0.24, 0.19, 0.14, 0.09]
    : [0.99, 0.97, 0.94, 0.90, 0.84, 0.74, 0.62, 0.50, 0.40, 0.30, 0.20, 0.12]
  const chromaMultiplier = [0.15, 0.25, 0.40, 0.60, 0.80, 0.95, 1.0, 0.95, 0.85, 0.70, 0.50, 0.30]
  const scale = (h, baseChroma) => lightness.map((l, i) => safeHex(l, baseChroma * chromaMultiplier[i], h))

  const primary = scale(hue, 0.20)
  const secondary = scale(hue + 30, 0.08)
  const neutral = scale(hue, 0.010)
  const neutralVariant = scale(hue, 0.030)
  const error = scale(hue - 180, 0.16)

  if (isDark) {
    return {
      '--background': neutral[11], '--surface': neutral[11],
      '--surface-container-low': neutral[10], '--surface-container': neutral[9],
      '--surface-container-high': neutral[8], '--surface-container-highest': neutral[7],
      '--on-surface': neutral[0], '--on-surface-variant': neutralVariant[3],
      '--outline': neutralVariant[5], '--outline-variant': neutralVariant[7],
      '--primary': primary[2], '--on-primary': primary[10],
      '--primary-container': primary[9], '--on-primary-container': primary[1],
      '--secondary': secondary[2], '--secondary-container': secondary[9], '--on-secondary-container': secondary[1],
      '--error': error[2], '--on-error': error[10]
    }
  }

  return {
    '--background': neutral[0], '--surface': neutral[0],
    '--surface-container-low': neutral[1], '--surface-container': neutral[2],
    '--surface-container-high': neutral[3], '--surface-container-highest': neutral[4],
    '--on-surface': neutral[11], '--on-surface-variant': neutralVariant[9],
    '--outline': neutralVariant[7], '--outline-variant': neutralVariant[5],
    '--primary': primary[7], '--on-primary': primary[0],
    '--primary-container': primary[2], '--on-primary-container': primary[10],
    '--secondary': secondary[7], '--secondary-container': secondary[2], '--on-secondary-container': secondary[10],
    '--error': error[7], '--on-error': error[0]
  }
}

const WHITE_OVERRIDE = {
  '--background': '#ffffff', '--surface': '#ffffff',
  '--surface-container-low': '#f8f8fa', '--surface-container': '#f1f2f5',
  '--surface-container-high': '#eceef1', '--surface-container-highest': '#e6e8ec'
}

const BLACK_OVERRIDE = {
  '--background': '#000000', '--surface': '#000000',
  '--surface-container-low': '#0f0f11', '--surface-container': '#17171a',
  '--surface-container-high': '#1f1f23', '--surface-container-highest': '#27272c'
}

export function apply({ animate = false } = {}) {
  const root = document.documentElement
  const isDark = state.appearance === 'dark' || state.appearance === 'black'
  let vars

  if (state.scheme === 'mono') {
    vars = monochromeTokens(isDark)
  } else {
    const cached = m3 ? null : readTokenCache()[cacheKey()]
    vars = md3Vibrant(state.seed, isDark) || cached || fallbackOklch(state.seed, isDark)
    if (m3) writeTokenCache(vars)
  }

  if (state.appearance === 'white') Object.assign(vars, WHITE_OVERRIDE)
  else if (state.appearance === 'black') Object.assign(vars, BLACK_OVERRIDE)

  if (animate) {
    root.classList.add('theme-upgrading')
    clearTimeout(transitionTimer)
    transitionTimer = setTimeout(() => root.classList.remove('theme-upgrading'), 420)
  }

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }

  root.dataset.appearance = state.appearance
  root.style.colorScheme = isDark ? 'dark' : 'light'

  // 记住最终底色并同步浏览器顶栏：下次启动时 index.html 的启动脚本可以
  // 在首帧就铺上正确颜色，而不是先白底再过渡到深色。
  const background = vars['--background'] || '#faf9fd'
  // html 上的底色也一起同步：启动脚本写过一次，之后切主题要跟着更新，
  // 否则 iOS 橡皮筋回弹或滚动到页面外时会露出旧的底色。
  root.style.backgroundColor = background
  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) themeColor.setAttribute('content', background)
  try {
    localStorage.setItem(BACKGROUND_CACHE_KEY, background)
  } catch (error) {
    // 存不下时启动脚本会按外观值兜底。
  }

  persistThemeState()
}
