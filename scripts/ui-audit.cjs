/* ============================================================================
 * 批量 UI 检查（Playwright + 系统 Chrome）
 *
 * 用法：node scripts/ui-audit.cjs   （需要 dev server 已在 5173）
 * 依赖：npm i -D playwright-core（脚本也会回退到 tmp/pw/node_modules）
 *
 * 覆盖：页面加载（桌面/移动）、控制台、TabBar 双端、AppHead 融合与右对齐、
 *       #after 第二行（UiChip）、巡览聚焦动画、展开页 ZeroScroll + 溢出模糊、
 *       底部模糊带高度、路由切换过渡、交互冒烟（菜单 / 半星）。
 * ========================================================================== */
const fs = require('node:fs')
const path = require('node:path')

function loadPlaywright() {
  for (const id of ['playwright-core', path.join(__dirname, '..', 'tmp', 'pw', 'node_modules', 'playwright-core')]) {
    try { return require(id) } catch {}
  }
  throw new Error('未找到 playwright-core：npm i -D playwright-core，或先准备 tmp/pw')
}

const { chromium } = loadPlaywright()
const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
].find(p => fs.existsSync(p))

const results = []
const rec = (group, name, pass, detail = '') => {
  results.push({ group, name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  [${group}] ${name}${detail ? '  - ' + detail : ''}`)
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function open(page, p) {
  await page.goto(BASE + p, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#app', { timeout: 15000 })
  await sleep(1400)
}
/* 页面内求值：传「表达式字符串」，返回对象 */
const ev = (page, expr) => page.evaluate(expr)

async function run() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] })

  /* ================= 桌面 ================= */
  const dctx = await browser.newContext({ viewport: { width: 1386, height: 900 } })
  const d = await dctx.newPage()
  const dLogs = []
  d.on('pageerror', e => dLogs.push('pageerror: ' + String(e).slice(0, 160)))
  d.on('console', m => { if (['error', 'warning'].includes(m.type())) dLogs.push(m.type() + ': ' + m.text().slice(0, 160)) })

  for (const p of ['/home', '/chat', '/activity', '/trends', '/profile', '/lab', '/components']) {
    await open(d, p)
    const s = await ev(d, `(() => ({
      text: document.body.innerText.length,
      head: !!document.querySelector('.app-head__default'),
      scroll: !!document.getElementById('scrollArea')
    }))()`)
    rec('页面加载(桌面)', p, s.text > 200 && s.head && s.scroll, `text=${s.text}`)
  }
  const dErr = [...new Set(dLogs)].filter(l => l.startsWith('error') || l.startsWith('pageerror'))
  rec('控制台(桌面)', '无 error', dErr.length === 0, dErr.slice(0, 3).join(' | '))

  await open(d, '/home')
  const td = await ev(d, `(() => { const t = document.getElementById('tabbar'); const cs = getComputedStyle(t);
    return { bg: cs.backgroundColor, shadow: cs.boxShadow } })()`)
  rec('TabBar(桌面)', '有栏体底色且无阴影', td.bg !== 'rgba(0, 0, 0, 0)' && td.shadow === 'none', `bg=${td.bg}`)

  await open(d, '/components')
  await ev(d, `(() => { const v = document.getElementById('scrollArea'); v.scrollTop = 600; return v.scrollTop })()`)
  await sleep(2200)
  const fd = await ev(d, `(() => {
    const fuse = document.querySelector('.app-head__fuse.is-visible')
    const edge = document.querySelector('.zero-scroll__edge--top')
    const view = document.getElementById('scrollArea')
    const btns = [...document.querySelectorAll('.app-head__fuse.is-visible .ui-btn')]
    const sideR = fuse?.querySelector('.app-head__side--r')
    const contentW = view.clientWidth - parseFloat(getComputedStyle(view).paddingLeft) - parseFloat(getComputedStyle(view).paddingRight)
    return { visible: !!fuse, edgeW: Math.round(edge?.getBoundingClientRect().width ?? -1),
      contentW: Math.round(contentW),
      btnRight: btns.length ? Math.round(btns[btns.length - 1].getBoundingClientRect().right) : null,
      sideRRight: sideR ? Math.round(sideR.getBoundingClientRect().right) : null,
      title: document.querySelector('.app-head__mini-title')?.textContent.trim() }
  })()`)
  rec('头部融合(桌面)', '融合条可见、贴内容盒右缘',
    fd.visible && fd.sideRRight >= fd.btnRight - 1 && Math.abs(fd.edgeW - fd.contentW) <= 2, JSON.stringify(fd))

  const ad = await ev(d, `(() => ({
    chips: document.querySelectorAll('.app-head__after .ui-chip').length,
    rawBtns: document.querySelectorAll('.app-head__after button:not(.ui-chip)').length
  }))()`)
  rec('头部第二行', '使用 UiChip（非裸 button）', ad.chips >= 8 && ad.rawBtns === 0, JSON.stringify(ad))

  await open(d, '/components')
  await ev(d, `(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('开始巡览')); if (b) b.click() })()`)
  await sleep(260)
  const spotA = await ev(d, `(() => { const s = document.querySelector('.ui-tour__spot'); const r = s?.getBoundingClientRect();
    return { w: Math.round(r?.width ?? -1), h: Math.round(r?.height ?? -1) } })()`)
  await sleep(900)
  const spotB = await ev(d, `(() => { const s = document.querySelector('.ui-tour__spot'); const r = s?.getBoundingClientRect();
    return { w: Math.round(r?.width ?? -1), h: Math.round(r?.height ?? -1) } })()`)
  rec('巡览聚焦', '孔由整屏收拢到目标', spotB.w > 0 && spotB.w < spotA.w * 0.75, `${spotA.w} -> ${spotB.w}`)
  await d.keyboard.press('Escape')

  await open(d, '/activity/stairs')
  await sleep(1500)
  const ed = await ev(d, `(() => {
    const card = document.querySelector('[data-expand].is-expanded')
    const zs = card?.querySelector('.zero-scroll')
    const topbar = card?.querySelector('.expand-topbar')
    const blur = zs?.querySelector('[class*=progressive]')
    return { card: !!card, scroller: !!zs, uniqueId: zs?.querySelector('[id^=expand-]')?.id || null,
      topbarPos: topbar ? getComputedStyle(topbar).position : null,
      topbarZ: topbar ? Number(getComputedStyle(topbar).zIndex) : null,
      blurZ: blur ? Number(getComputedStyle(blur).zIndex) : null }
  })()`)
  rec('展开页(结构)', 'ZeroScroll + sticky 顶栏压过模糊层',
    ed.card && ed.scroller && ed.topbarPos === 'sticky' && ed.topbarZ > (ed.blurZ || 0), JSON.stringify(ed))
  await dctx.close()

  /* ================= 移动 ================= */
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const m = await mctx.newPage()
  const mLogs = []
  m.on('pageerror', e => mLogs.push('pageerror: ' + String(e).slice(0, 160)))
  m.on('console', msg => { if (['error', 'warning'].includes(msg.type())) mLogs.push(msg.type() + ': ' + msg.text().slice(0, 160)) })

  for (const p of ['/home', '/chat', '/activity', '/trends', '/profile', '/lab', '/components']) {
    await open(m, p)
    const s = await ev(m, `(() => ({
      text: document.body.innerText.length, head: !!document.querySelector('.app-head__default'),
      scroll: !!document.getElementById('scrollArea'),
      hScroll: document.documentElement.scrollWidth > window.innerWidth + 1
    }))()`)
    rec('页面加载(移动)', p, s.text > 200 && s.head && s.scroll && !s.hScroll, `text=${s.text} hScroll=${s.hScroll}`)
  }
  const mErr = [...new Set(mLogs)].filter(l => l.startsWith('error') || l.startsWith('pageerror'))
  rec('控制台(移动)', '无 error', mErr.length === 0, mErr.slice(0, 3).join(' | '))

  await open(m, '/activity')
  const pre = await ev(m, `(() => {
    const tb = document.getElementById('tabbar')
    const band = [...document.querySelectorAll('.zero-scroll > [class*=progressive]')].pop()
    const br = band?.getBoundingClientRect(), tr = tb?.getBoundingClientRect()
    return { tabbarH: Math.round(tr?.height ?? -1), bandH: Math.round(br?.height ?? -1),
      bandBottom: Math.round(br?.bottom ?? -1) }
  })()`)
  rec('底部模糊(移动)', '高度≈TabBar 且贴底', Math.abs(pre.bandH - pre.tabbarH) <= 2 && Math.abs(pre.bandBottom - 844) <= 1, JSON.stringify(pre))

  await open(m, '/components')
  await sleep(800)
  const sc = await ev(m, `(() => { const v = document.getElementById('scrollArea');
    v.scrollTop = 320; return { st: v.scrollTop, sh: v.scrollHeight, ch: v.clientHeight } })()`)
  await sleep(2000)
  const post = await ev(m, `(() => {
    const def = document.querySelector('.app-head__default')
    const fuse = document.querySelector('.app-head__fuse.is-visible')
    const btns = [...document.querySelectorAll('.app-head__fuse.is-visible .ui-btn')]
    const last = btns[btns.length - 1]
    return { defVis: getComputedStyle(def).visibility, defH: Math.round(def.getBoundingClientRect().height),
      fused: !!fuse, title: document.querySelector('.app-head__mini-title')?.textContent.trim(),
      rightGap: last ? Math.round(window.innerWidth - last.getBoundingClientRect().right) : null }
  })()`)
  const scrollable = sc.sh > sc.ch + 2 && sc.st > 0
  rec('滚动重合修复(移动)', scrollable ? '默认头隐藏但占位保留 + 融合条贴右' : '（内容不足一屏，跳过）',
    !scrollable || (post.defVis === 'hidden' && post.defH > 60 && post.fused && post.rightGap !== null && post.rightGap < 30),
    `scroll=${JSON.stringify(sc)} ${JSON.stringify(post)}`)

  const tm = await ev(m, `(() => { const t = document.getElementById('tabbar'); const cs = getComputedStyle(t);
    return { bg: cs.backgroundColor, shadow: cs.boxShadow } })()`)
  rec('TabBar(移动)', '透明且无阴影', tm.bg === 'rgba(0, 0, 0, 0)' && tm.shadow === 'none', `bg=${tm.bg}`)

  await open(m, '/home')
  await ev(m, `(() => { const b = [...document.querySelectorAll('#tabbar button, #tabbar .ui-tabbar__tab')].find(b => b.textContent.includes('对话')); if (b) b.click() })()`)
  await sleep(150)
  const trans = await ev(m, `(() => { const el = document.querySelector('#viewRoot > *'); return el ? el.className : '' })()`)
  rec('页面切换过渡', '存在过渡类名', /x-(next|prev)-(enter|leave)/.test(trans), String(trans).slice(0, 60))
  await sleep(1000)

  /* 切换不空白：点击后 120ms，旧页（leave）与新页（enter）应同时存在 */
  await open(m, '/home')
  await ev(m, `(() => { const b = [...document.querySelectorAll('#tabbar button, #tabbar .ui-tabbar__tab')].find(b => b.textContent.includes('对话')); if (b) b.click() })()`)
  await sleep(120)
  const mid = await ev(m, `(() => {
    const kids = [...document.querySelectorAll('#viewRoot > *')]
    const cls = kids.map(k => k.className)
    return { count: kids.length, hasLeave: cls.some(c => /leave-active/.test(c)), hasEnter: cls.some(c => /enter-active/.test(c)) }
  })()`)
  rec('切换无空白', '离场与进场页同时存在（非 out-in）', mid.count >= 2 && mid.hasLeave && mid.hasEnter, JSON.stringify(mid))
  await sleep(1000)

  /* 切页回顶（设计如此）：换 tab 后回到顶部，且是瞬时的（不与过渡叠加） */
  await open(m, '/components')
  await ev(m, `(() => { const v = document.getElementById('scrollArea'); v.scrollTop = 500 })()`)
  await sleep(700)
  await ev(m, `(() => { const b = [...document.querySelectorAll('#tabbar button, #tabbar .ui-tabbar__tab')].find(b => b.textContent.includes('我的')); if (b) b.click() })()`)
  await sleep(1100)
  const backTop = await ev(m, `document.getElementById('scrollArea').scrollTop`)
  rec('切页回顶', '换 tab 后瞬时回到顶部', backTop === 0, `scrollTop=${backTop}`)

  /* 同页内跳转再返回：滚动位置保留（keep-alive + 未回顶） */
  await open(m, '/home')
  await ev(m, `(() => { const v = document.getElementById('scrollArea'); v.scrollTop = 420 })()`)
  await sleep(700)
  const posBefore = await ev(m, `document.getElementById('scrollArea').scrollTop`)
  /* SPA 内打开展开页（真实路径是点击卡片 push，不是整页刷新） */
  await ev(m, `(() => { const card = document.querySelector('[data-expand="steps"]') || document.querySelector('[data-expand]');
    if (card) card.click() })()`)
  await sleep(1500)
  await ev(m, `(() => { const b = document.querySelector('.expand-close'); if (b) b.click() })()`)
  await sleep(1500)
  const posAfter = await ev(m, `document.getElementById('scrollArea').scrollTop`)
  rec('同页返回保活', '展开返回后保留滚动位置', Math.abs(posAfter - posBefore) <= 8, `${posBefore} -> ${posAfter}`)

  await open(m, '/activity')
  await ev(m, `(() => { const b = document.querySelector('.ui-floating-menu__trigger, .app-head__default .ui-btn'); if (b) b.click() })()`)
  await sleep(700)
  rec('交互', '浮层菜单可展开', !!(await ev(m, `!!document.querySelector('.ui-floating-menu.is-floating, .ui-floating-menu__panel')`)))

  await open(m, '/profile')
  await ev(m, `(() => { const s = document.querySelectorAll('.ui-rating__star'); if (s[3]) s[3].click() })()`)
  await sleep(700)
  rec('交互', '半星浮层可选', !!(await ev(m, `!!document.querySelector('.ui-rating__pick')`)))

  await open(m, '/activity/stairs')
  await sleep(1600)
  const ei = await ev(m, `(() => {
    const card = document.querySelector('[data-expand].is-expanded')
    const zs = card?.querySelector('.zero-scroll')
    const view = zs?.querySelector('.zero-scroll__view')
    const topbar = card?.querySelector('.expand-topbar')
    return { card: !!card, scroller: !!zs, viewY: Math.round(view?.getBoundingClientRect().y ?? -1),
      topbarY: Math.round(topbar?.getBoundingClientRect().y ?? -1),
      pos: topbar ? getComputedStyle(topbar).position : null }
  })()`)
  rec('展开页(移动结构)', 'ZeroScroll 铺满卡片且顶栏在顶',
    ei.card && ei.scroller && ei.viewY <= 2 && ei.topbarY <= 2 && ei.pos === 'sticky', JSON.stringify(ei))

  await ev(m, `(() => { const c = document.querySelector('[data-expand].is-expanded .expand-content'); if (c) c.style.minHeight = '220vh' })()`)
  await sleep(500)
  const b0 = await ev(m, `(() => { const b = document.querySelector('[data-expand].is-expanded .expand-scroller [class*=progressive]'); return b ? getComputedStyle(b).opacity : null })()`)
  await ev(m, `(() => { const v = document.querySelector('[data-expand].is-expanded .expand-scroller .zero-scroll__view'); if (v) v.scrollTop = 300 })()`)
  await sleep(1500)
  const b1 = await ev(m, `(() => {
    const card = document.querySelector('[data-expand].is-expanded')
    const view = card?.querySelector('.zero-scroll__view')
    const blur = card?.querySelector('.zero-scroll [class*=progressive]')
    const topbar = card?.querySelector('.expand-topbar')
    return { st: view?.scrollTop, blur: blur ? getComputedStyle(blur).opacity : null,
      topbarY: Math.round(topbar?.getBoundingClientRect().y ?? -1) }
  })()`)
  rec('展开页(溢出模糊)', '滚动后顶部模糊淡入且顶栏钉顶',
    Number(b1.blur) > 0.5 && b1.st > 0 && b1.topbarY <= 2, `opacity ${b0} -> ${b1.blur}, st=${b1.st}, topbarY=${b1.topbarY}`)

  await mctx.close()
  await browser.close()

  const fails = results.filter(r => !r.pass)
  console.log(`\n==== ${results.length - fails.length}/${results.length} 通过 ====`)
  if (fails.length) {
    console.log('失败项：')
    fails.forEach(f => console.log(' -', f.group, '|', f.name, '|', f.detail))
    process.exitCode = 1
  }
}

run().catch(e => { console.error('AUDIT ERROR:', e); process.exit(1) })
