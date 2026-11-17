<script setup>
import { ref, onMounted } from 'vue'
import { 
  motion, 
  AnimatePresence, 
  useSpring, 
  useMotionValue, 
  useAnimate,
  useInView,
  useScroll,
  useTransform
} from 'motion-v'
import { useProjectSpring, useProjectAnimate, getSpringConfig, getSpringTokens } from '../composables/useMotion'
import { springDuration, isLively, setMotionTone, getMotionTone } from '../core/motionTone'

const tone = ref(getMotionTone())
const isAnimating = ref(false)
const boxRef = ref(null)
const items = ref([1, 2, 3, 4, 5])
const showItems = ref(true)

function toggleTone() {
  const newTone = tone.value === 'calm' ? 'lively' : 'calm'
  setMotionTone(newTone)
  tone.value = newTone
}

// Spring animation demo
const springValue = useMotionValue(0)
const springConfig = getSpringConfig('view')

function animateSpring() {
  isAnimating.value = true
  springValue.set(springValue.get() === 0 ? 1 : 0)
  setTimeout(() => { isAnimating.value = false }, springDuration('view') * 1500)
}

// useAnimate demo
const [scope, animate] = useProjectAnimate()

async function runSequence() {
  await animate(scope.current, { x: [0, 100, 0] }, { scene: 'view' })
  await animate(scope.current, { scale: [1, 1.2, 1] }, { scene: 'feedback' })
  await animate(scope.current, { rotate: [0, 180, 360] }, { scene: 'expand' })
}

// Staggered list animation
async function toggleItems() {
  if (showItems.value) {
    await animate(
      items.value.map((_, i) => scope.current?.children?.[i]),
      { opacity: 0, y: 20 },
      { scene: 'exit' }
    )
    showItems.value = false
  } else {
    showItems.value = true
    await Promise.all(
      items.value.map((_, i) => 
        animate(
          scope.current?.children?.[i],
          { opacity: [0, 1], y: [20, 0] },
          { scene: 'view', delay: i * 0.1 }
        )
      )
    )
  }
}

// InView demo
const cardRef = ref(null)
const isInView = useInView(cardRef, { once: true, margin: '-50px' })

// Scroll animation demo
const scrollProgress = ref(0)
onMounted(() => {
  const { scrollY } = useScroll({
    target: document.getElementById('scrollArea'),
    offset: ['start start', 'end end']
  })
  
  const progress = useTransform(scrollY, [0, 1], [0, 1])
  progress.on('change', (v) => { scrollProgress.value = v })
})
</script>

<template>
  <div class="demo-page">
    <div class="demo-section">
      <h2>Motion Tone: {{ tone }}</h2>
      <UiButton variant="outline" @click="toggleTone">
        Switch to {{ tone === 'calm' ? 'lively' : 'calm' }}
      </UiButton>
      
      <div class="token-display">
        <h3>Current Spring Tokens (view):</h3>
        <pre>{{ JSON.stringify(getSpringConfig('view'), null, 2) }}</pre>
      </div>
    </div>

    <div class="demo-section">
      <h2>Spring Animation</h2>
      <motion.div
        ref="boxRef"
        :style="{ 
          x: springValue,
          background: 'var(--primary)',
          width: '100px',
          height: '100px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          cursor: 'pointer'
        }"
        :animate="{ 
          x: springValue.get() * 200,
          scale: springValue.get() === 1 ? 1.1 : 1 
        }"
        :transition="springConfig"
        @click="animateSpring"
      >
        {{ springValue.get() === 1 ? '→' : '←' }}
      </motion.div>
      <p class="hint">Click to animate with project spring tokens</p>
    </div>

    <div class="demo-section">
      <h2>useAnimate Sequence</h2>
      <div ref="scope" class="animate-box" @click="runSequence">
        Click me for sequence
      </div>
    </div>

    <div class="demo-section">
      <h2>AnimatePresence (Staggered List)</h2>
      <div class="button-row">
        <UiButton @click="toggleItems">
          {{ showItems ? 'Hide' : 'Show' }} Items
        </UiButton>
      </div>
      <AnimatePresence mode="wait">
        <div v-if="showItems" class="items-container" ref="scope">
          <motion.div
            v-for="item in items"
            :key="item"
            class="item"
            :initial="{ opacity: 0, y: 20 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -20 }"
            :transition="getSpringConfig('view')"
          >
            Item {{ item }}
          </motion.div>
        </div>
      </AnimatePresence>
    </div>

    <div class="demo-section" ref="cardRef">
      <h2>InView Entrance</h2>
      <motion.div
        class="inview-card"
        :initial="{ opacity: 0, y: 30 }"
        :whileInView="{ opacity: 1, y: 0 }"
        :viewport="{ once: true, margin: '-50px' }"
        :transition="getSpringConfig('expand')"
      >
        <h3>Scroll down to see me animate!</h3>
        <p>This card animates when it enters the viewport</p>
        <p>Current tone: {{ tone }}</p>
      </motion.div>
    </div>

    <div class="demo-section">
      <h2>Scroll Progress: {{ (scrollProgress * 100).toFixed(1) }}%</h2>
      <motion.div
        class="scroll-indicator"
        :style="{ 
          width: scrollProgress * 100 + '%',
          height: '4px',
          background: 'var(--primary)',
          borderRadius: '2px',
          transition: 'width 0.1s linear'
        }"
      />
    </div>

    <div class="demo-section" style="height: 500px;">
      <h2>Long content for scroll demo</h2>
      <p v-for="i in 20" :key="i">Scroll line {{ i }}</p>
    </div>
  </div>
</template>

<style scoped>
.demo-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 20px;
}
.demo-section {
  background: var(--surface-container-low);
  border-radius: calc(var(--r-card) * var(--radius-scale));
  padding: 20px;
}
.demo-section h2 {
  margin: 0 0 16px;
  font-size: var(--fs-big);
  font-weight: var(--w-heading);
}
.token-display pre {
  background: var(--surface-container-high);
  padding: 12px;
  border-radius: 8px;
  font-size: var(--fs-micro);
  overflow-x: auto;
}
.animate-box {
  width: 120px;
  height: 120px;
  background: var(--primary);
  color: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.items-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.item {
  padding: 12px 16px;
  background: var(--surface-container-high);
  border-radius: 8px;
}
.inview-card {
  padding: 24px;
  background: var(--surface-container-high);
  border-radius: 12px;
  border: 2px solid var(--primary);
}
.button-row {
  margin-top: 12px;
}
.scroll-indicator {
  margin-top: 12px;
  background: var(--surface-container-high);
  border-radius: 2px;
  overflow: hidden;
}
.hint {
  margin-top: 8px;
  font-size: var(--fs-small);
  color: var(--on-surface-variant);
}
</style>
</template>