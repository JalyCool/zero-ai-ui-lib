<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  animate,
  AnimatePresence,
  getSpringConfig,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useProjectSpring,
  useScroll
} from '../composables/useMotion'
import { MOTION_TONES, getMotionTone, setMotionTone } from '../core/motionTone'
import { UiButton } from '../components/ui'

/* ============================================================
   motion-v 迁移演示页
   每个区块对应一种迁移模式，全部走 getSpringConfig 的场景令牌：
   · 声明式弹簧（可打断）：:animate 目标切换
   · 数值弹簧：useProjectSpring（跟随 MotionValue）
   · 命令式编排：await animate(el, keyframes, config)
   · 退场动画：AnimatePresence + :exit
   · 入场动画：:whileInView（进入视口触发）
   · 滚动联动：useScroll + scaleX 进度条
   · 手势：drag / whileTap / whileHover
   ============================================================ */

/* 1. 动效气质切换 —— 换气质后 getSpringConfig 的 duration/bounce 随之变化 */
const tone = ref(getMotionTone())
function switchTone() {
  tone.value = setMotionTone(tone.value === 'calm' ? 'lively' : 'calm')
}
const viewConfig = computed(() => getSpringConfig('view', tone.value))

/* 2. 声明式弹簧：目标切换即动画，动画途中再点直接反向（可打断） */
const advanced = ref(false)

/* 3. 数值弹簧：0 ↔ 1 的跟随值，直接绑进 :style 的 scale */
const boost = ref(0)
const boostScale = useProjectSpring(boost, 'feedback')
const boostReadout = ref('1.000')
useMotionValueEvent(boostScale, 'change', v => {
  boostReadout.value = (0.96 + v * 0.3).toFixed(3)
})

/* 4. 命令式编排：await animate() 串行三段不同场景的弹簧。
   动画作用在 MotionValue 上（经 :style 绑定渲染）——这是实测
   可靠的命令式路径；对普通元素 animate() 的表现依赖版本细节。 */
const seqX = useMotionValue(0)
const seqScale = useMotionValue(1)
const seqRotate = useMotionValue(0)
const seqRunning = ref(false)
async function runSequence() {
  if (seqRunning.value) return
  seqRunning.value = true
  try {
    await animate(seqX, [0, 130, 0], getSpringConfig('view'))
    await animate(seqScale, [1, 1.16, 1], getSpringConfig('feedback'))
    await animate(seqRotate, [0, 180, 0], getSpringConfig('expand'))
  } finally {
    seqRunning.value = false
  }
}

/* 5. AnimatePresence：点击移除走 exit 弹簧，补位自动收拢 */
const items = ref(['步数', '心率', '睡眠', '血氧', '能量'])
function removeItem(item) {
  items.value = items.value.filter(i => i !== item)
}
function resetItems() {
  items.value = ['步数', '心率', '睡眠', '血氧', '能量']
}

/* 6. 视口入场：whileInView + useInView 状态 */
const inviewEl = ref(null)
const cardInView = useInView(inviewEl, { once: true, margin: '-40px' })

/* 7. 滚动联动：本应用的滚动容器是 #scrollArea（body 不滚） */
const scrollAreaEl = ref(null)
onMounted(() => {
  scrollAreaEl.value = document.getElementById('scrollArea')
})
const { scrollYProgress } = useScroll(() => ({ container: scrollAreaEl.value }))
const progressText = ref('0%')
useMotionValueEvent(scrollYProgress, 'change', v => {
  progressText.value = Math.round(v * 100) + '%'
})
</script>

<template>
  <!-- 参考实现：布局 / 外观全部用 Tailwind 工具类（@theme 已映射库令牌，
       bg-surface-low / rounded-card / text-big 等随主题自动切换）；
       密度联动的间距仍用令牌（gap 走 .view 的 --space-gap）。 -->
  <div class="view flex flex-col gap-3.5 pb-10">
    <div class="bg-surface-low rounded-card p-4">
      <div class="text-big font-heading tracking-[-0.01em] mb-1.5">动效气质</div>
      <p class="m-0 mb-3 text-small text-on-surface-variant leading-[1.6]">弹簧参数来自 core/spring.js 的 TONE_SPRINGS，桥接层换算成 motion 的 duration/bounce。</p>
      <div class="flex items-center flex-wrap gap-2.5 mb-3">
        <UiButton variant="outline" size="sm" @click="switchTone">
          切换到 {{ tone === 'calm' ? MOTION_TONES.lively.label : MOTION_TONES.calm.label }}
        </UiButton>
        <code class="font-mono text-micro text-on-surface-variant bg-surface-container rounded-8 px-2 py-[3px] break-all">view: {{ JSON.stringify(viewConfig) }}</code>
      </div>
    </div>

    <div class="bg-surface-low rounded-card p-4">
      <div class="text-big font-heading tracking-[-0.01em] mb-1.5">声明式弹簧（可打断）</div>
      <p class="m-0 mb-3 text-small text-on-surface-variant leading-[1.6]">点盒子切换目标；动画途中再点直接反向，motion 自动从当前位置续接。</p>
      <div class="flex items-center min-h-[120px] rounded-card bg-[color-mix(in_oklab,var(--surface-container)_55%,transparent)] p-2.5">
        <motion.div
          class="w-[84px] h-[84px] shrink-0 grid place-items-center rounded-18 bg-primary text-on-primary text-small font-strong cursor-pointer select-none"
          :animate="advanced ? { x: 150, rotate: 6 } : { x: 0, rotate: 0 }"
          :transition="getSpringConfig('view')"
          :whileHover="{ scale: 1.04, transition: getSpringConfig('feedback') }"
          :whileTap="{ scale: 0.94, transition: getSpringConfig('feedback') }"
          @click="advanced = !advanced"
        >
          点我
        </motion.div>
      </div>
    </div>

    <div class="bg-surface-low rounded-card p-4">
      <div class="text-big font-heading tracking-[-0.01em] mb-1.5">数值弹簧 useProjectSpring</div>
      <p class="m-0 mb-3 text-small text-on-surface-variant leading-[1.6]">0 ↔ 1 的弹簧跟随值绑进 :style，读数走 useMotionValueEvent。</p>
      <div class="flex items-center flex-wrap gap-2.5 mb-3">
        <UiButton variant="tonal" size="sm" @click="boost = boost ? 0 : 1">
          {{ boost ? '回落' : '放大' }}
        </UiButton>
        <code class="font-mono text-micro text-on-surface-variant bg-surface-container rounded-8 px-2 py-[3px] break-all">scale: {{ boostReadout }}</code>
      </div>
      <div class="flex items-center min-h-[120px] rounded-card bg-[color-mix(in_oklab,var(--surface-container)_55%,transparent)] p-2.5">
        <motion.div class="w-[84px] h-[84px] shrink-0 grid place-items-center rounded-18 bg-primary-container text-on-primary-container text-small font-strong cursor-default" :style="{ scale: boostScale }">
          {{ boostReadout }}
        </motion.div>
      </div>
    </div>

    <div class="bg-surface-low rounded-card p-4">
      <div class="text-big font-heading tracking-[-0.01em] mb-1.5">命令式编排</div>
      <p class="m-0 mb-3 text-small text-on-surface-variant leading-[1.6]">await animate() 串行三段：view 位移 → feedback 缩放 → expand 旋转。</p>
      <div class="flex items-center flex-wrap gap-2.5 mb-3">
        <UiButton variant="tonal" size="sm" :disabled="seqRunning" @click="runSequence">
          {{ seqRunning ? '播放中…' : '播放编排' }}
        </UiButton>
      </div>
      <div class="flex items-center min-h-[120px] rounded-card bg-[color-mix(in_oklab,var(--surface-container)_55%,transparent)] p-2.5">
        <motion.div
          class="w-[84px] h-[84px] shrink-0 grid place-items-center rounded-18 bg-primary text-on-primary text-small font-strong cursor-default"
          :style="{ x: seqX, scale: seqScale, rotate: seqRotate }"
        >SEQ</motion.div>
      </div>
    </div>

    <div class="bg-surface-low rounded-card p-4">
      <div class="text-big font-heading tracking-[-0.01em] mb-1.5">退场动画 AnimatePresence</div>
      <p class="m-0 mb-3 text-small text-on-surface-variant leading-[1.6]">点击 chip 移除：退场走 exit 弹簧 + 模糊，兄弟项自动收拢。</p>
      <div class="flex items-center flex-wrap gap-2.5 mb-3">
        <UiButton variant="text" size="sm" @click="resetItems">重置</UiButton>
      </div>
      <div class="flex flex-wrap gap-2 min-h-10">
        <AnimatePresence>
          <motion.button
            v-for="item in items"
            :key="item"
            type="button"
            class="border-0 cursor-pointer px-3.5 py-2 rounded-full bg-surface-high text-on-surface text-small font-label font-sans"
            layout
            :initial="{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }"
            :animate="{ opacity: 1, scale: 1, filter: 'blur(0px)' }"
            :exit="{ opacity: 0, scale: 0.85, filter: 'blur(8px)', transition: getSpringConfig('exit') }"
            :transition="getSpringConfig('feedback')"
            @click="removeItem(item)"
          >
            {{ item }} ✕
          </motion.button>
        </AnimatePresence>
      </div>
    </div>

    <div class="h-[480px]"></div>

    <div ref="inviewEl" class="bg-surface-low rounded-card p-4">
      <div class="text-big font-heading tracking-[-0.01em] mb-1.5">视口入场 whileInView</div>
      <p class="m-0 mb-3 text-small text-on-surface-variant leading-[1.6]">滚动到本卡片时触发 expand 弹簧入场；useInView 状态：{{ cardInView ? '已进入' : '未进入' }}</p>
    </div>

    <div class="sticky top-2 z-[2] bg-surface-high rounded-card p-4">
      <div class="text-big font-heading tracking-[-0.01em] mb-1.5">滚动联动 useScroll</div>
      <p class="m-0 mb-3 text-small text-on-surface-variant leading-[1.6]">进度来自 #scrollArea 容器：{{ progressText }}</p>
      <div class="h-1.5 rounded-full bg-surface-container overflow-hidden">
        <motion.div class="h-full w-full rounded-full bg-primary origin-left" :style="{ scaleX: scrollYProgress }" />
      </div>
    </div>

    <div class="bg-surface-low rounded-card p-4">
      <div class="text-big font-heading tracking-[-0.01em] mb-1.5">手势 drag</div>
      <p class="m-0 mb-3 text-small text-on-surface-variant leading-[1.6]">拖拽 chip，松手在约束区内回弹（dragElastic）。</p>
      <div class="flex items-center min-h-40 rounded-card bg-[color-mix(in_oklab,var(--surface-container)_55%,transparent)] p-2.5">
        <motion.div
          class="w-[84px] h-[84px] shrink-0 grid place-items-center rounded-18 bg-primary text-on-primary text-small font-strong cursor-grab active:cursor-grabbing select-none"
          :drag="true"
          :drag-constraints="{ left: -70, right: 70, top: -30, bottom: 30 }"
          :drag-elastic="0.18"
          :whileTap="{ scale: 0.94, transition: getSpringConfig('feedback') }"
        >
          拖我
        </motion.div>
      </div>
    </div>
  </div>
</template>