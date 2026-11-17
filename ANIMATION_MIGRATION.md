# Animation Migration Guide

## Overview

This document describes the migration from the custom CSS-based animation system to **motion-v** (Motion for Vue), a production-ready animation library with a hybrid engine combining JavaScript animations with native browser APIs.

## Current Animation System

### Spring Tokens (CSS Variables)

The project defines 6 spring scenes with two motion tones:

| Scene | Calm (default) | Lively |
|-------|---------------|--------|
| `feedback` | response: 0.26s, damping: 1.0 | response: 0.20s, damping: 0.52 |
| `view` | response: 0.34s, damping: 1.0 | response: 0.26s, damping: 0.55 |
| `sheet` | response: 0.44s, damping: 1.0 | response: 0.34s, damping: 0.62 |
| `expand` | response: 0.34s, damping: 1.0 | response: 0.28s, damping: 0.62 |
| `exit` | response: 0.34s, damping: 1.0 | response: 0.24s, damping: 0.66 |
| `fade` | response: 0.24s, damping: 1.0 | response: 0.20s, damping: 0.78 |

CSS Variables generated:
- `--spring-{scene}` - linear() easing curve
- `--spring-{scene}-dur` - duration in seconds
- `--motion-scale/bounce/distance/blur` - amplitude multipliers
- `--pop-scale` - pop animation scale
- `--press-scale` - press feedback scale

### Key Components Using Animations

1. **ExpandableCard** - Card expand/collapse with fixed positioning morph
2. **UiModal** - Dialog with scale + fade + translate
3. **UiBottomSheet** - Draggable sheet with spring anchors
4. **UiSearchField** - Morphing search input with icon travel
5. **morphWindow** - Generic button-to-panel morph
6. **UiButton** - Fuse/hold/slide action variants
7. **UiSlider** - Spring-based drag with rubber-band
8. **edgeSwipeBack** - iOS edge swipe back gesture
9. **Expandable content** - Staggered enter/exit animations

## Motion-v Integration

### Installation

```bash
pnpm add motion-v
```

### Core Composables

Created `src/composables/useMotion.js` with:

```javascript
// Spring configuration matching project tokens
getSpringConfig(scene, tone) // Returns motion-v spring config

// Project-aware spring motion value
useProjectSpring(source, scene, options)

// Motion-v animate with project defaults
useProjectAnimate() // Returns [scope, animate]

// Specialized composables
useExpandAnimation(isExpanded, elementRef)
useModalAnimation(isOpen, elementRef)
useSheetAnimation(isOpen, height)
useStaggeredAnimation(items, scene)
useScrollAnimation(elementRef, scene)
useEntranceAnimation(elementRef, scene)
useDragAnimation(elementRef, scene)
```

### Migration Pattern

#### Before (CSS Transitions)
```vue
<template>
  <div class="panel" :class="{ 'is-open': open }">
    Content
  </div>
</template>

<style>
.panel {
  opacity: 0;
  transform: translateY(20px) scale(0.97);
  transition: opacity var(--t-fade), transform var(--t-view);
}
.panel.is-open {
  opacity: 1;
  transform: none;
}
</style>
```

#### After (motion-v)
```vue
<script setup>
import { motion } from 'motion-v'
import { getSpringConfig } from '@/composables/useMotion'
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 20, scale: 0.97 }"
    :animate="{ opacity: 1, y: 0, scale: 1 }"
    :transition="getSpringConfig('view')"
  >
    Content
  </motion.div>
</template>
```

### Complex Animations with useAnimate

```vue
<script setup>
import { useProjectAnimate, getSpringConfig } from '@/composables/useMotion'

const [scope, animate] = useProjectAnimate()

async function openPanel() {
  await animate(scope.current, { 
    opacity: [0, 1], 
    y: [20, 0], 
    scale: [0.97, 1] 
  }, getSpringConfig('view'))
  
  // Stagger children
  await animate(
    children.value,
    { opacity: [0, 1], y: [10, 0] },
    { ...getSpringConfig('view'), delay: 0.1 }
  )
}
</script>

<template>
  <div ref="scope">
    <motion.div v-for="child in children" :key="child.id">
      {{ child.content }}
    </motion.div>
  </div>
</template>
```

### AnimatePresence for Exit Animations

```vue
<template>
  <AnimatePresence mode="wait">
    <motion.div
      v-if="show"
      :key="item.id"
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :exit="{ opacity: 0, y: -20 }"
      :transition="getSpringConfig('exit')"
    >
      Content
    </motion.div>
  </AnimatePresence>
</template>
```

## Migration Status

### Completed
- [x] Install motion-v
- [x] Create useMotion composable bridging project tokens
- [x] Add MotionDemo view for testing
- [x] Create morphWindow.motion.js
- [x] Create UiSearchField.motion.vue
- [x] Create UiModal.motion.vue

### In Progress
- [ ] UiBottomSheet.motion.vue
- [ ] ExpandableCard.motion.vue
- [ ] UiButton.motion.vue (action variants)
- [ ] UiSlider.motion.vue
- [ ] edgeSwipeBack.motion.js

### Planned
- [ ] Create migration utilities for gradual adoption
- [ ] Update documentation
- [ ] Performance benchmarks
- [ ] Accessibility testing (prefers-reduced-motion)

## Usage Examples

### Basic Spring Animation
```javascript
import { useProjectSpring, useMotionValue } from '@/composables/useMotion'
import { motion } from 'motion-v'

const scale = useProjectSpring(isHovered, 'feedback')

// In template
<motion.div :style="{ scale }">Hover me</motion.div>
```

### Sequence Animation
```javascript
const [scope, animate] = useProjectAnimate()

async function runSequence() {
  await animate(el, { x: [0, 100, 0] }, { scene: 'view' })
  await animate(el, { scale: [1, 1.2, 1] }, { scene: 'feedback' })
  await animate(el, { rotate: [0, 180, 360] }, { scene: 'expand' })
}
```

### Scroll-Linked Animation
```javascript
import { useScrollAnimation } from '@/composables/useMotion'

const { progress } = useScrollAnimation(containerRef, 'view')

// progress is a motion value from 0 to 1
<motion.div :style="{ x: progress }">Scroll me</motion.div>
```

### Viewport Entrance
```javascript
import { useInView } from 'motion-v'

const isInView = useInView(elementRef, { once: true, margin: '-100px' })

<motion.div
  :initial="{ opacity: 0, y: 30 }"
  :whileInView="{ opacity: 1, y: 0 }"
  :viewport="{ once: true }"
  :transition="getSpringConfig('expand')"
>
  Animates on scroll
</motion.div>
```

## Spring Token Reference

### CSS Variables (Legacy - still supported)
```css
/* These are still generated by spring.apply() */
--spring-feedback: linear(...);
--spring-feedback-dur: 0.33s;
--spring-view: linear(...);
--spring-view-dur: 0.43s;
--spring-sheet: linear(...);
--spring-sheet-dur: 0.55s;
--spring-expand: linear(...);
--spring-expand-dur: 0.43s;
--spring-exit: linear(...);
--spring-exit-dur: 0.43s;
--spring-fade: linear(...);
--spring-fade-dur: 0.30s;
```

### motion-v Config (New)
```javascript
// Calm tone (default)
{
  feedback: { type: 'spring', duration: 330, damping: 1.0, stiffness: 300 },
  view: { type: 'spring', duration: 430, damping: 1.0, stiffness: 250 },
  sheet: { type: 'spring', duration: 550, damping: 1.0, stiffness: 220 },
  expand: { type: 'spring', duration: 430, damping: 1.0, stiffness: 250 },
  exit: { type: 'spring', duration: 430, damping: 1.0, stiffness: 300 },
  fade: { type: 'spring', duration: 300, damping: 1.0, stiffness: 350 }
}

// Lively tone
{
  feedback: { type: 'spring', duration: 250, damping: 0.52, stiffness: 400 },
  view: { type: 'spring', duration: 330, damping: 0.55, stiffness: 350 },
  sheet: { type: 'spring', duration: 430, damping: 0.62, stiffness: 300 },
  expand: { type: 'spring', duration: 350, damping: 0.62, stiffness: 350 },
  exit: { type: 'spring', duration: 300, damping: 0.66, stiffness: 400 },
  fade: { type: 'spring', duration: 250, damping: 0.78, stiffness: 450 }
}
```

Note: motion-v uses `duration` in ms and `damping`/`stiffness` for spring configuration, which differs from the project's `response`/`damping` model. The `getSpringConfig()` function handles this conversion.

## Testing

Visit `/motion` route to see the MotionDemo view with interactive examples of:
- Spring animations with tone switching
- useAnimate sequences
- AnimatePresence staggered lists
- InView entrance animations
- Scroll progress animations

## Breaking Changes

None - the migration is additive. Existing CSS-based animations continue to work. New components can use motion-v while legacy components remain unchanged.

## Performance Notes

- motion-v uses transform/opacity for GPU-accelerated animations
- Layout animations (FLIP) available via `LayoutGroup` and `motion` components with `layout` prop
- For complex choreography, `useAnimate` batches animations efficiently
- Reduced motion preference automatically respected via `prefers-reduced-motion` media query

## Resources

- [Motion for Vue Docs](https://motion.dev/docs/vue)
- [useSpring Hook](https://motion.dev/docs/vue-use-spring)
- [useAnimate Hook](https://motion.dev/docs/vue-use-animate)
- [AnimatePresence](https://motion.dev/docs/vue-animate-presence)
- [Layout Animations](https://motion.dev/docs/vue-layout-animations)