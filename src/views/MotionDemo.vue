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
  <div class="motion-demo view">
    <div class="demo-card">
      <div class="demo-title">动效气质</div>
      <p class="demo-desc">弹簧参数来自 core/spring.js 的 TONE_SPRINGS，桥接层换算成 motion 的 duration/bounce。</p>
      <div class="demo-row">
        <UiButton variant="outline" size="sm" @click="switchTone">
          切换到 {{ tone === 'calm' ? MOTION_TONES.lively.label : MOTION_TONES.calm.label }}
        </UiButton>
        <code class="demo-code">view: {{ JSON.stringify(viewConfig) }}</code>
      </div>
    </div>

    <div class="demo-card">
      <div class="demo-title">声明式弹簧（可打断）</div>
      <p class="demo-desc">点盒子切换目标；动画途中再点直接反向，motion 自动从当前位置续接。</p>
      <div class="demo-stage">
        <motion.div
          class="demo-box"
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

    <div class="demo-card">
      <div class="demo-title">数值弹簧 useProjectSpring</div>
      <p class="demo-desc">0 ↔ 1 的弹簧跟随值绑进 :style，读数走 useMotionValueEvent。</p>
      <div class="demo-row">
        <UiButton variant="tonal" size="sm" @click="boost = boost ? 0 : 1">
          {{ boost ? '回落' : '放大' }}
        </UiButton>
        <code class="demo-code">scale: {{ boostReadout }}</code>
      </div>
      <div class="demo-stage">
        <motion.div class="demo-box demo-box--soft" :style="{ scale: boostScale }">
          {{ boostReadout }}
        </motion.div>
      </div>
    </div>

    <div class="demo-card">
      <div class="demo-title">命令式编排</div>
      <p class="demo-desc">await animate() 串行三段：view 位移 → feedback 缩放 → expand 旋转。</p>
      <div class="demo-row">
        <UiButton variant="tonal" size="sm" :disabled="seqRunning" @click="runSequence">
          {{ seqRunning ? '播放中…' : '播放编排' }}
        </UiButton>
      </div>
      <div class="demo-stage">
        <motion.div
          class="demo-box demo-box--seq"
          :style="{ x: seqX, scale: seqScale, rotate: seqRotate }"
        >SEQ</motion.div>
      </div>
    </div>

    <div class="demo-card">
      <div class="demo-title">退场动画 AnimatePresence</div>
      <p class="demo-desc">点击 chip 移除：退场走 exit 弹簧 + 模糊，兄弟项自动收拢。</p>
      <div class="demo-row">
        <UiButton variant="text" size="sm" @click="resetItems">重置</UiButton>
      </div>
      <div class="demo-chips">
        <AnimatePresence>
          <motion.button
            v-for="item in items"
            :key="item"
            type="button"
            class="demo-chip"
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

    <div style="height: 480px"></div>

    <div ref="inviewEl" class="demo-card">
      <div class="demo-title">视口入场 whileInView</div>
      <p class="demo-desc">滚动到本卡片时触发 expand 弹簧入场；useInView 状态：{{ cardInView ? '已进入' : '未进入' }}</p>
    </div>

    <div class="demo-card demo-card--sticky">
      <div class="demo-title">滚动联动 useScroll</div>
      <p class="demo-desc">进度来自 #scrollArea 容器：{{ progressText }}</p>
      <div class="demo-track">
        <motion.div class="demo-fill" :style="{ scaleX: scrollYProgress }" />
      </div>
    </div>

    <div class="demo-card">
      <div class="demo-title">手势 drag</div>
      <p class="demo-desc">拖拽 chip，松手在约束区内回弹（dragElastic）。</p>
      <div class="demo-stage demo-stage--tall">
        <motion.div
          class="demo-box demo-box--drag"
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

<style scoped>
.motion-demo {
  display: flex;
  flex-direction: column;
  gap: calc(14px * var(--density));
  padding-bottom: 40px;
}
.demo-card {
  background: var(--surface-container-low);
  border-radius: calc(var(--r-card) * var(--radius-scale));
  padding: calc(16px * var(--density));
}
.demo-card--sticky {
  position: sticky;
  top: 8px;
  z-index: 2;
  background: var(--surface-container-high);
}
.demo-title {
  font-size: var(--fs-big);
  font-weight: var(--w-heading);
  letter-spacing: -.01em;
  margin-bottom: 6px;
}
.demo-desc {
  margin: 0 0 12px;
  font-size: var(--fs-small);
  color: var(--on-surface-variant);
  line-height: 1.6;
}
.demo-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}
.demo-code {
  font-family: var(--font-mono);
  font-size: var(--fs-micro);
  color: var(--on-surface-variant);
  background: var(--surface-container);
  border-radius: 6px;
  padding: 3px 8px;
  overflow-wrap: anywhere;
}
.demo-stage {
  display: flex;
  align-items: center;
  min-height: 120px;
  border-radius: calc(var(--r-card) * var(--radius-scale));
  background: color-mix(in oklab, var(--surface-container) 55%, transparent);
  padding: 10px;
}
.demo-stage--tall { min-height: 160px; }
.demo-box {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: calc(var(--r-18) * var(--radius-scale));
  background: var(--primary);
  color: var(--on-primary);
  font-size: var(--fs-small);
  font-weight: var(--w-strong);
  cursor: pointer;
  user-select: none;
}
.demo-box--soft { cursor: default; background: var(--primary-container); color: var(--on-primary-container); }
.demo-box--seq { cursor: default; }
.demo-box--drag { cursor: grab; }
.demo-box--drag:active { cursor: grabbing; }
.demo-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 40px;
}
.demo-chip {
  border: none;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--surface-container-high);
  color: var(--on-surface);
  font-size: var(--fs-small);
  font-weight: 550;
  font-family: inherit;
}
.demo-track {
  height: 6px;
  border-radius: 3px;
  background: var(--surface-container);
  overflow: hidden;
}
.demo-fill {
  height: 100%;
  width: 100%;
  border-radius: 3px;
  background: var(--primary);
  transform-origin: 0 50%;
}
</style>
