/* ============================================================
   排版
   固定：字阶标准、行高 1.4、字间距标准、字重标准。
   ============================================================ */

const FONT_SIZES = {
  h1: '1.35rem',
  value: '1.20rem',
  big: '1.1rem',
  body: '.86rem',
  small: '.78rem',
  tiny: '.68rem',
  micro: '.62rem'
}

const WEIGHTS = {
  heading: 650,
  label: 600,
  body: 400,
  strong: 600
}

const LINE_HEIGHT = '1.4'
const LETTER_SPACING = '0'

export function apply() {
  const root = document.documentElement

  root.style.setProperty('--fs-h1', FONT_SIZES.h1)
  root.style.setProperty('--fs-value', FONT_SIZES.value)
  root.style.setProperty('--fs-big', FONT_SIZES.big)
  root.style.setProperty('--fs-body', FONT_SIZES.body)
  root.style.setProperty('--fs-small', FONT_SIZES.small)
  root.style.setProperty('--fs-tiny', FONT_SIZES.tiny)
  root.style.setProperty('--fs-micro', FONT_SIZES.micro)
  root.style.setProperty('--w-heading', WEIGHTS.heading)
  root.style.setProperty('--w-label', WEIGHTS.label)
  root.style.setProperty('--w-body', WEIGHTS.body)
  root.style.setProperty('--w-strong', WEIGHTS.strong)
  root.style.setProperty('--line-height', LINE_HEIGHT)
  root.style.setProperty('--letter-spacing', LETTER_SPACING)
}
