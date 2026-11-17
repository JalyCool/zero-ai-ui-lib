# Animation Migration Guide

## Overview

Migrate the project's hand-rolled animation system to **motion-v** (Motion for Vue), a production-ready animation library with a hybrid engine combining JavaScript animations with native browser APIs (WAAPI).

Repository branch: `animation-migration`. The migration is **additive**: existing CSS-token-driven components keep working untouched; migrated variants live beside the originals (`.motion.vue` / `.motion.js`) until validated, then swap in per component.

## Current Animation System (source of truth: `core/spring.js`)

Six spring scenes × two motion tones (calm / lively), driven by two parameters per scene:

| Scene | Calm (response / ζ) | Lively (response / ζ) |
|-------|---------------|--------|
| `feedback` | 0.26s / 1.00 | 0.20s / 0.52 |
| `view` | 0.34s / 1.00 | 0.26s / 0.55 |
| `sheet` | 0.44s / 1.00 | 0.34s / 0.62 |
| `expand` | 0.34s / 1.00 | 0.28s / 0.62 |
| `exit` | 0.34s / 1.00 | 0.24s / 0.66 |
| `fade` | 0.24s / 1.00 | 0.20s / 0.78 |

- ζ = damping ratio (1 = never overshoots). `core/spring.js` compiles these into CSS `linear()` curves on `--spring-<scene>` / `--spring-<scene>-dur`.
- `core/motionTone.js` switches tone via `data-motion` attr + `setMotionTone()`.
- `core/springPhysics.js` solves real springs with entry velocity for drag-release (UI Slider / swipe rows).
- Lively tone scales durations by `LIVELY_DURATION_SCALE` (1.25).

## The Bridge (`src/composables/useMotion.js`)

Single conversion point between project tokens and motion-v. Business code only ever names a scene.

### Parameter mapping (verified against motion-dom 14.11)

motion's duration-based spring is `{ duration, bounce }` — **seconds**, and mutually exclusive with `{ stiffness, damping, mass }` (mixing them silently overrides `bounce`/`duration`). `bounce` is the *inverse* of ζ: `0` = no bounce, `1` = extremely bouncy.

```js
export function getSpringConfig(scene = 'view', tone = null) {
  // reduced-motion → instant (0.01s)
  // duration = response × (ζ ≥ 0.999 ? 1.35 : 1.35 + (1−ζ)×1.5)  [same settle formula as springLinear]
  //            × LIVELY_DURATION_SCALE when lively
  // bounce   = 1 − ζ
  return { type: 'spring', duration, bounce: 1 - zeta }
}
```

Because `duration` comes from the same settle formula as `springLinear()`, a CSS-token transition and a motion spring on the same scene land with the same rhythm.

### Exports

| Export | Purpose |
|---|---|
| `getSpringConfig(scene, tone?)` | `{ type:'spring', duration, bounce }` — use as `:transition` or `animate()` options |
| `useProjectSpring(source, scene)` | numeric spring follower MotionValue (source: `Ref<number>` / getter / number / MotionValue) |
| `getSpringTokens(scene)` | CSS var form (`--spring-<scene>`), for hybrid CSS elements |
| `prefersReducedMotion()` | reduced-motion check (already applied inside `getSpringConfig`) |
| re-exports | `motion`, `AnimatePresence`, `animate`, `useAnimate`, `useMotionValue`, `useSpring`, `useMotionValueEvent`, `useScroll`, `useTransform`, `useInView`, `useVelocity`, `isMotionValue` — import motion-v only through this module |

`animate` (standalone, from framer-motion/dom) accepts a raw Element, starts from the element's current rendered value, and is await-able — this is how non-template DOM nodes (morphWindow) are animated. Do **not** use `useAnimate()` without binding its scope: an unbound `scope.current` makes `animate(scope.current, …)` a no-op.

### Vue specifics

- `<motion.div>` / `<motion.button>` dotted tags compile to `$setup["motion"].div` against the script-setup import — no resolver plugin needed.
- A `ref` on a motion component returns the component instance; get the DOM node via `node.$el || node`.
- `useMotionValueEvent(mv, 'change', cb)` returns an unlisten function and cleans itself up on unmount.
- `useScroll(() => ({ container: el }))` accepts a getter; the container element may be resolved after mount (watchEffect re-registers).

## Migration Patterns

### Pattern A — declarative enter/exit (UiModal.motion.vue)

Replace hand-driven double-rAF + `.is-open`/`.is-closing` CSS with motion targets. Interruption (re-open mid-close) is native: flip the `:animate` target and motion continues from the current position.

```vue
<motion.div
  class="ui-modal__panel"
  :initial="{ opacity: 0, y: 14, scale: 0.97 }"
  :animate="open ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.98 }"
  :transition="getSpringConfig(open ? 'view' : 'exit')"
>
```

Unmount timing uses `getSpringConfig('exit').duration * 1000 + CLOSE_BUFFER` instead of duration-estimate timers.

**Required when migrating an existing component:** neutralize the global CSS initial-state/transition on the same node (scoped override), otherwise CSS transitions double-drive the same properties:

```css
.ui-modal .ui-modal__panel { opacity: 1; transform: none; transition: none; }
```

### Pattern B — imperative geometry on real DOM nodes (morphWindow.motion.js)

State machine (placeholder, interrupt, finish-on-scroll) unchanged from the CSS version; only the engine changes:

- `animate(node, { left, top, width, height }, getSpringConfig('expand'))` while the reactive `style.value` is set to the *final* box — WAAPI outranks inline styles during flight; sync `style.value` when the animation completes.
- Keep animation handles and `stop()` them in `finishClose()`/interrupt paths — an un-stopped `fill` effect pins the element at its last position.
- Compression phase uses the `feedback` scene; release uses `exit`; expand uses `expand`.

### Pattern C — hybrid (UiSearchField.motion.vue)

Single-property fades that are pure token territory (content blur/opacity swap) stay CSS; geometry (shell width, icon travel `x`) moves to motion springs. Same source value (`fieldWidth()`) drives both, so the icon keeps hugging the right border.

### Pattern D — exit presence (AnimatePresence)

`AnimatePresence` is TransitionGroup-based: put keyed motion children directly inside it (no wrapper element between), embed the exit transition inside the `:exit` target:

```vue
<AnimatePresence>
  <motion.button v-for="item in items" :key="item"
    :exit="{ opacity: 0, scale: 0.85, filter: 'blur(8px)', transition: getSpringConfig('exit') }"
    :transition="getSpringConfig('feedback')" />
</AnimatePresence>
```

### What NOT to migrate

- Drag-release physics (`core/springPhysics.js`, UiSlider, swipe rows): motion's inertia differs from the tuned rubber-band behavior; keep until a dedicated evaluation.
- Backdrop-filter scrims: blur radius must transition continuously and cannot sit inside an opacity-transitioning parent — the CSS `.ui-scrim` pattern stays.
- Content-replacement language (`opacity→0 + blur`, tokens `--t-fade`/`--t-panel`): already tokenized, zero benefit.

## Status

### Done
- [x] motion-v installed (`dependencies`, pnpm)
- [x] Bridge `useMotion.js` with verified parameter mapping (`bounce = 1 − ζ`, seconds, no stiffness mixing)
- [x] Library re-exports via `src/lib/index.js`
- [x] `MotionDemo.vue` at `/motion` (tone switch, interruptible spring, numeric spring, await-animate sequence, AnimatePresence list, whileInView, container-scoped useScroll progress, drag)
- [x] `UiModal.motion.vue` (Pattern A + CSS neutralization)
- [x] `UiSearchField.motion.vue` (Pattern C)
- [x] `morphWindow.motion.js` (Pattern B)
- [x] Production build passes (879 modules)

### Next
- [ ] Runtime pass of `/motion` in the browser (spring feel per tone, reduced-motion instant path)
- [ ] `UiBottomSheet.motion.vue` (drag-handle tracking stays pointer-driven; release snapping → motion spring)
- [ ] `ExpandableCard.motion.vue` evaluation — highest-value target, largest surface: fixed-position morph is driven by inline styles + CSS transitions today; Pattern B applies
- [ ] Decide per component: swap `.motion` variant in, or keep CSS (write the decision into the status table)

## Verification performed

- `vite build` — 879 modules transformed, no errors.
- `vue/compiler-sfc` compile check of MotionDemo template — `<motion.div>` resolves to `$setup["motion"].div`.
- motion-dom type definitions confirm `bounce` semantics and duration/bounce ↔ stiffness/damping exclusivity.
- framer-motion/dom exports confirm `animate`, `scroll`, `inView`, `createScopedAnimate`.

## References

- [Motion for Vue docs](https://motion.dev/docs/vue)
- [Spring transition options](https://motion.dev/docs/vue-transitions)
- [useSpring](https://motion.dev/docs/vue-use-spring)
- [AnimatePresence](https://motion.dev/docs/vue-animate-presence)