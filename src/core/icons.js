/* ============================================================
   图标注册表（参考 Vuetify 的 icon set / Nuxt UI 的 Icon）
   图标是 24x24 viewBox 内的描边路径；用名字引用，不再到处内联 SVG。
   registerIcons() 可扩展或覆盖；组件 UiIcon 按名字取用。
   ============================================================ */

export const ICONS = {
  check: '<path d="M5 12.5l4.4 4.4L19 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>',
  'chevron-down': '<path d="M6 9l6 6 6-6"/>',
  'chevron-up': '<path d="M6 15l6-6 6 6"/>',
  'chevron-left': '<path d="M15 6l-6 6 6 6"/>',
  'chevron-right': '<path d="M9 6l6 6-6 6"/>',
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-3.6 3.4-5.6 7.5-5.6s7.5 2 7.5 5.6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3l1.4 2.5 2.8-.7 1.1 2.7 2.7 1.1-.7 2.8L21 12l-1.7 2.6.7 2.8-2.7 1.1-1.1 2.7-2.8-.7L12 21l-1.4-2.5-2.8.7-1.1-2.7-2.7-1.1.7-2.8L3 12l1.7-2.6-.7-2.8 2.7-1.1 1.1-2.7 2.8.7z"/>',
  delete: '<path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14.5 5.5l4 4"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 19h14"/>',
  upload: '<path d="M12 20V8M7 13l5-5 5 5"/><path d="M5 5h14"/>',
  play: '<path d="M8 5.5l11 6.5-11 6.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.2"/>',
  warning: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.2"/>',
  success: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  more: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
  star: '<path d="M12 4l2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.6-5 2.6 1-5.6-4-3.9 5.5-.8z"/>',
  heart: '<path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z"/>',
  home: '<path d="M4 11L12 4l8 7"/><path d="M6 10v10h12V10"/>',
  chart: '<path d="M4 19V5M4 19h16"/><path d="M8 15l3.5-4 3 2.5L19 8"/>',
  filter: '<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',
  refresh: '<path d="M19 12a7 7 0 11-2-5"/><path d="M19 4.5V9h-4.5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>'
}

/** 扩展 / 覆盖图标：name -> 24x24 内的 SVG 内部标记。 */
export function registerIcons(map) {
  Object.assign(ICONS, map || {})
  return ICONS
}

/* 与 codeFormats 的 iconOf 区分：这里按图标名取标记。 */
export function iconMarkup(name) {
  return ICONS[name] || ''
}
