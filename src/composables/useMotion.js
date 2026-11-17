/* ============================================================
   Motion composable — bridges motion-v with project's spring system
   ============================================================ */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { 
  useSpring, 
  useMotionValue, 
  useAnimate, 
  motion, 
  AnimatePresence,
  useInView,
  useScroll,
  useTransform
} from 'motion-v'
import { springDuration, motionFactor, isLively, getMotionTone } from '../core/motionTone'

/**
 * Spring configuration for each scene based on motion tone
 */
const SPRING_CONFIGS = {
  calm: {
    feedback: { damping: 1.0, stiffness: 300 },
    view: { damping: 1.0, stiffness: 250 },
    sheet: { damping: 1.0, stiffness: 220 },
    expand: { damping: 1.0, stiffness: 250 },
    exit: { damping: 1.0, stiffness: 300 },
    fade: { damping: 1.0, stiffness: 350 }
  },
  lively: {
    feedback: { damping: 0.52, stiffness: 400 },
    view: { damping: 0.55, stiffness: 350 },
    sheet: { damping: 0.62, stiffness: 300 },
    expand: { damping: 0.62, stiffness: 350 },
    exit: { damping: 0.66, stiffness: 400 },
    fade: { damping: 0.78, stiffness: 450 }
  }
}

/**
 * Get spring config for a scene
 */
export function getSpringConfig(scene = 'view', tone = null) {
  const activeTone = tone || getMotionTone()
  const config = SPRING_CONFIGS[activeTone][scene] || SPRING_CONFIGS[activeTone].view
  const duration = springDuration(scene)
  
  return {
    type: 'spring',
    duration: duration * 1000, // motion-v expects ms
    ...config
  }
}

/**
 * Create a spring motion value that respects the project's motion tokens
 * @param {number|Ref<number>} source - Source value to spring towards
 * @param {string} scene - Spring scene name (feedback, view, sheet, expand, exit, fade)
 * @param {object} options - Additional spring options
 */
export function useProjectSpring(source, scene = 'view', options = {}) {
  const config = computed(() => ({
    ...getSpringConfig(scene),
    ...options
  }))
  
  return useSpring(source, config)
}

/**
 * Create a motion value that springs to target values
 */
export function useSpringValue(initial, scene = 'view', options = {}) {
  const value = useMotionValue(initial)
  const config = getSpringConfig(scene, options.tone)
  
  const springTo = (target, customConfig = {}) => {
    // This would need motion-dom's animate function for imperative animations
    // For now, return the value and config for use with motion components
    return { value, config: { ...config, ...customConfig } }
  }
  
  return { value, springTo, config }
}

/**
 * Use animate with project spring tokens
 */
export function useProjectAnimate() {
  const [scope, animate] = useAnimate()
  
  // Wrap animate to apply project spring defaults
  const animateWithTokens = (elements, keyframes, options = {}) => {
    const scene = options.scene || 'view'
    const defaults = getSpringConfig(scene)
    
    const mergedOptions = {
      ...defaults,
      ...options,
      transition: {
        ...defaults,
        ...options.transition
      }
    }
    
    return animate(elements, keyframes, mergedOptions)
  }
  
  return [scope, animateWithTokens]
}

/**
 * Spring config for a specific scene - returns CSS-compatible values
 * Useful for CSS transitions that need to match JS springs
 */
export function getSpringTokens(scene = 'view') {
  return {
    easing: `var(--spring-${scene})`,
    duration: `var(--spring-${scene}-dur)`
  }
}

/**
 * Motion component with project spring defaults
 * Usage: <ProjectMotion.div :animate="{ x: 100 }" scene="view" />
 */
export const ProjectMotion = {
  ...motion,
  // Could extend with project defaults
}

/**
 * AnimatePresence with project defaults
 */
export { AnimatePresence }

/**
 * Composable for expand card animations - uses project expand spring
 */
export function useExpandAnimation(isExpanded, elementRef) {
  const scale = useProjectSpring(isExpanded, 'expand')
  const opacity = useProjectSpring(isExpanded, 'fade')
  
  return { scale, opacity }
}

/**
 * Composable for modal/dialog animations - uses project view spring
 */
export function useModalAnimation(isOpen, elementRef) {
  const scale = useProjectSpring(isOpen, 'view')
  const opacity = useProjectSpring(isOpen, 'fade')
  const y = useProjectSpring(() => isOpen.value ? 0 : 20, 'view')
  
  return { scale, opacity, y }
}

/**
 * Composable for bottom sheet animations - uses project sheet spring
 */
export function useSheetAnimation(isOpen, height) {
  const y = useProjectSpring(() => isOpen.value ? 0 : 100, 'sheet')
  const opacity = useProjectSpring(isOpen, 'fade')
  
  return { y, opacity }
}

/**
 * Composable for list item animations (staggered)
 */
export function useStaggeredAnimation(items, scene = 'view') {
  const duration = springDuration(scene)
  const delay = isLively() ? duration * 0.1 : duration * 0.05
  
  return {
    duration: duration * 1000,
    delay,
    stagger: delay
  }
}

/**
 * Get motion config for motion-v components
 */
export function useMotionConfig() {
  return computed(() => ({
    skipAnimations: !isLively() && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }))
}

/**
 * Scroll-linked animations using project tokens
 */
export function useScrollAnimation(elementRef, scene = 'view') {
  const { scrollY } = useScroll({
    target: elementRef,
    offset: ['start start', 'end end']
  })
  
  const progress = useTransform(scrollY, [0, 1], [0, 1])
  
  return { progress, scrollY }
}

/**
 * Viewport entrance animations
 */
export function useEntranceAnimation(elementRef, scene = 'view') {
  const isInView = useInView(elementRef, { once: true, margin: '-100px' })
  
  return { isInView }
}

/**
 * Drag animations with project springs
 */
export function useDragAnimation(elementRef, scene = 'view') {
  const config = getSpringConfig(scene)
  
  return {
    dragTransition: config,
    dragElastic: 0.2
  }
}

export default {
  useProjectSpring,
  useSpringValue,
  useProjectAnimate,
  getSpringTokens,
  getSpringConfig,
  ProjectMotion,
  AnimatePresence,
  useExpandAnimation,
  useModalAnimation,
  useSheetAnimation,
  useStaggeredAnimation,
  useMotionConfig,
  useScrollAnimation,
  useEntranceAnimation,
  useDragAnimation
}