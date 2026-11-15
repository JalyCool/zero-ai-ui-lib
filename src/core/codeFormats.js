/* ============================================================
   码制注册中心（CodeImage 的唯一知识源）
   每个码制在这里声明：族（qr / bar）、标签、内容校验、
   默认参数与参数归一、切换控件的呈现方式、降级候选顺序。
   组件内部不硬编码任何码制规则；加新码制只改这一处。
   ============================================================ */

/* 族差异大（一维 vs 二维）用图标区分；族内差异小（EAN/UPC/…）用文字标签。 */
export const FAMILY_META = {
  qr: { icon: true, label: '二维码' },
  bar: { icon: true, label: '一维码' },
}

/* 族图标：24x24 viewBox 内的 SVG 内部标记。切换控件（分段 / 下拉）共用，
   保证「同一码制在哪儿画出来都是同一个图标」。 */
export const FORMAT_ICONS = {
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
  bar: '<path d="M4 5v14M7 5v14M10 5v10M13 5v14M16 5v10M19 5v14"/>'
}

/* 取某码制的图标标记；未知码制返回空串（调用方据此不渲染图标）。 */
export function iconOf(format) {
  const meta = CODE_FORMATS[format]
  return meta ? (FORMAT_ICONS[meta.family] || '') : ''
}

/* 渲染器映射：组件只按这张表分派，不关心具体库。 */
export const RENDERER = { qrcode: 'qrcode' }
export const BARCODE_RENDERER = { ean13: 'EAN13', ean8: 'EAN8', upc: 'UPC', code128: 'CODE128', itf14: 'ITF14' }

export const CODE_FORMATS = {
  qrcode: {
    family: 'qr',
    label: '二维码',
    /* 二维码接受任意文本，只受容量约束（宽松上限，渲染端再精确处理）。 */
    validate: text => text.length > 0 && text.length <= 2953,
    defaults: { errorCorrectionLevel: 'M', margin: 2, version: 0 },
    normalize: options => ({
      errorCorrectionLevel: ['L', 'M', 'Q', 'H'].includes(options.errorCorrectionLevel)
        ? options.errorCorrectionLevel : 'M',
      margin: Number.isFinite(options.margin) ? Math.max(0, Math.min(100, Math.round(options.margin))) : 2,
      version: Number.isInteger(options.version) && options.version >= 1 && options.version <= 40 ? options.version : 0
    })
  },
  ean13: {
    family: 'bar',
    label: 'EAN-13',
    render: 'EAN13',
    /* 12 位数字 + 1 位校验；允许只给 12 位（自动补校验位）。 */
    validate: text => /^\d{12}(\d|\?)$/.test(text.replace(/\s+/g, '')),
    defaults: { flat: false, showText: true },
    normalize: options => ({
      flat: !!options.flat,
      showText: options.showText !== false
    })
  },
  ean8: {
    family: 'bar',
    label: 'EAN-8',
    render: 'EAN8',
    validate: text => /^\d{7}(\d|\?)$/.test(text.replace(/\s+/g, '')),
    defaults: { flat: false, showText: true },
    normalize: options => ({ flat: !!options.flat, showText: options.showText !== false })
  },
  upc: {
    family: 'bar',
    label: 'UPC-A',
    render: 'UPC',
    validate: text => /^\d{11}(\d|\?)$/.test(text.replace(/\s+/g, '')),
    defaults: { flat: false, showText: true },
    normalize: options => ({ flat: !!options.flat, showText: options.showText !== false })
  },
  code128: {
    family: 'bar',
    label: 'Code 128',
    render: 'CODE128',
    /* ASCII 可打印字符。 */
    validate: text => text.length > 0 && text.length <= 80 && /^[\x20-\x7e]+$/.test(text),
    defaults: { flat: false, showText: true },
    normalize: options => ({ flat: !!options.flat, showText: options.showText !== false })
  },
  itf14: {
    family: 'bar',
    label: 'ITF-14',
    render: 'ITF14',
    /* 13 位数字 + 1 位校验。 */
    validate: text => /^\d{13}(\d|\?)$/.test(text.replace(/\s+/g, '')),
    defaults: { flat: false, showText: true },
    normalize: options => ({ flat: !!options.flat, showText: options.showText !== false })
  }
}

/* 校验某个码制能否承载这段内容。 */
export function supports(format, text) {
  const meta = CODE_FORMATS[format]
  if (!meta) return false
  try { return meta.validate(String(text ?? '')) }
  catch { return false }
}

/* 取某码制在给定 options 下的生效参数：默认 <- 调用方；未知键忽略，开发环境警告。 */
let warnedKeys = null
export function resolveOptions(format, options, isDev) {
  const meta = CODE_FORMATS[format]
  if (!meta) return {}
  const given = (options && typeof options === 'object' && options[format]) || {}
  if (isDev) {
    if (!warnedKeys) warnedKeys = new Set()
    for (const key of Object.keys(given)) {
      if (!(key in meta.defaults) && !warnedKeys.has(format + '.' + key)) {
        warnedKeys.add(format + '.' + key)
        console.warn('[CodeImage] 未知参数 "' + key + '"（' + format + '）已忽略')
      }
    }
  }
  return meta.normalize({ ...meta.defaults, ...given })
}

/* 选项呈现：跨族 -> 图标（差异大）；同族多成员 -> 文字标签（差异小）。 */
export function renderMode(formats) {
  const families = new Set(formats.map(f => CODE_FORMATS[f]?.family).filter(Boolean))
  return families.size > 1 ? 'icon' : 'text'
}

/* 族代表：降级时给一个「这一族」的选项。 */
const FAMILY_REPRESENTATIVE = { qr: 'qrcode', bar: 'code128' }

/* 降级候选（§6）：原选项都不可用时，按族给出兜底顺序。
   一维族 -> 同族更宽松的格式，再二维码兜底；
   二维码 -> 更宽松的二维码表述（超长内容提示）。 */
export function fallbackCandidates(formats, text) {
  const families = new Set(formats.map(f => CODE_FORMATS[f]?.family).filter(Boolean))
  const out = []
  if (families.has('bar')) {
    /* 一维码族内找一个能装下内容的；找不到就靠二维码兜底。 */
    for (const bar of ['code128']) {
      if (!formats.includes(bar) && supports(bar, text)) out.push(bar)
    }
    if (!out.some(f => CODE_FORMATS[f]?.family === 'qr') && !formats.includes('qrcode')) out.push('qrcode')
  }
  if (families.has('qr') && !out.includes('qrcode')) {
    /* 二维码容量不足：族内没有更宽的就以「内容过长」提示（组件层处理空态）。 */
    out.push('qrcode')
  }
  return out.filter(f => supports(f, text))
}

export function familyOf(format) {
  return CODE_FORMATS[format]?.family || null
}

/* 一维码生效参数 -> JsBarcode 选项。 */
export function toBarcodeSettings(opts) {
  return {
    flat: !!opts.flat,
    displayValue: opts.showText !== false,
    margin: 10
  }
}
