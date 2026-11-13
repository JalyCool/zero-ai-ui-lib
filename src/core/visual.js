/* ============================================================
   视觉
   固定：密度、呼吸间距、描边、层次、圆角、图标容器、强调色。
   ============================================================ */

const DENSITY = 0.93
const BORDER = '0.75px'
const RADIUS = 1.0
const ICON = 'subtle'
const HOVER = 'mix'
const SPACING = { gap: 20, card: 16, item: 12 }
const ACCENT = 'vivid'

const ELEVATION = {
  card: 'none',
  sheet: 'none',
  tip: 'none'
}

export function apply() {
  const root = document.documentElement

  root.style.setProperty('--density', DENSITY)
  root.style.setProperty('--space-gap', (SPACING.gap * DENSITY).toFixed(2) + 'px')
  root.style.setProperty('--space-card', (SPACING.card * DENSITY).toFixed(2) + 'px')
  root.style.setProperty('--space-item', (SPACING.item * DENSITY).toFixed(2) + 'px')
  root.style.setProperty('--space-metric', (14 * DENSITY).toFixed(2) + 'px')
  root.style.setProperty('--border-w', BORDER)
  root.style.setProperty('--elev-card', ELEVATION.card)
  root.style.setProperty('--elev-sheet', ELEVATION.sheet)
  root.style.setProperty('--elev-tip', ELEVATION.tip)
  root.style.setProperty('--radius-scale', RADIUS)

  root.dataset.icon = ICON
  root.dataset.hover = HOVER
  root.dataset.spacing = 'breathing'
  root.dataset.accent = ACCENT
}
