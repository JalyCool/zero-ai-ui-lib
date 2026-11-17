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

⚠️ **Unit trap (found by headless-Chrome testing):** the seconds contract is only honored on paths that go through `animateMotionValue` (motion components' `:animate`, standalone `animate()` on elements/motion values — it converts seconds→ms before creating the animation). The **follow path** (`useSpring`/`attachFollow` → `FollowAnimation` → spring generator) passes options through **verbatim, in milliseconds** — a 0.3s config becomes a ~10ms snap. Consequence:

- `getSpringConfig()` → **seconds** (for `:transition` and `animate()`)
- `useProjectSpring()` → internally converts to **ms** for the follow path (handled inside the bridge — never pass `getSpringConfig()` output straight into `useSpring`)
- Duration-based springs ignore inherited `velocity` (generator comment: "Time-defined springs ignore inherited velocity"). For velocity-carrying snaps (sheet drag release, fling), use `getSpringPhysicsConfig(scene)` — physical `{ stiffness, damping }` derived from the same response/ζ (ω = 2π/response, c = 2ζω) — plus `velocity` in value-units/second.

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

### Verified paths (headless-Chrome tested, motion-dom 14.11)

| Path | Status | Notes |
|---|---|---|
| motion component `:initial/:animate/:exit/:transition` (seconds cfg) | ✅ | primary declarative path; interruption native |
| `animate(motionValue, target \| keyframes, secondsCfg)` | ✅ | imperative path; starts from current value; await-able; **use this for orchestration** |
| `animate(element, {key: [from, to]}, cfg)` | ✅ | works (single-keyframe origin resolution also OK) |
| `useSpring`/`attachFollow` | ✅ with **ms duration** | seconds → ~10ms snap (the unit trap) |
| `useSpring`/`attachFollow` with seconds | ❌ instant snap | fixed inside `useProjectSpring` |
| `:style` binding of MotionValues on motion components | ✅ | `{ width: mv }`, `{ x: mv }`, `{ scale: mv }` all render |
| `AnimatePresence` + `layout` | ✅ | TransitionGroup-based; `layout` enables sibling FLIP reflow |
| `useScroll({ container })` getter form | ✅ | container may resolve after mount |
| `useMotionValueEvent` | ✅ | returns unlisten; self-cleans on unmount |

Imperative-on-plain-element `animate()` exists but is version-sensitive; the project convention is: **animated surfaces are motion components, imperative control drives MotionValues bound via `:style`** (see UiSearchField / UiBottomSheet).

### Vue specifics

- `<motion.div>` / `<motion.button>` dotted tags compile to `$setup["motion"].div` against the script-setup import — no resolver plugin needed.
- A `ref` on a motion component returns the component instance; get the DOM node via `node.$el || node`.
- `useMotionValueEvent(mv, 'change', cb)` returns an unlisten function and cleans itself up on unmount.
- `useScroll(() => ({ container: el }))` accepts a getter; the container element may be resolved after mount (watchEffect re-registers).

## Migration Patterns

### Pattern A — declarative enter/exit (UiModal — swapped in place)

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

**Required when migrating in place:** delete the old CSS initial-state/transition rules on the same node (done for `.ui-modal__panel` in `ui.css`), otherwise CSS transitions double-drive the same properties.

### Pattern B — MotionValues driving reactive style (morphWindow.motion.js; sheet height)

State machine unchanged from the CSS version; the engine is per-property MotionValues:

- `animate(mv, target, config)` — starts from the motion value's current position, interruptible, await-able.
- `mv.on('change', …)` writes into the reactive `style.value` object the consumer binds to its own (plain) element.
- Keep animation handles and `stop()` them in `finishClose()`/interrupt paths.
- Consumers must not keep CSS transitions on the driven properties (per-frame style writes + CSS transition = drift).
- reduced-motion: `.jump()` the values instead of animating.

### Pattern C — hybrid (UiSearchField — swapped in place)

Single-property fades that are pure token territory (content blur/opacity swap) stay CSS; geometry (shell width, icon travel `x`) moves to MotionValues rendered by motion components. Same source value (`fieldWidth()`) drives both, so the icon keeps hugging the right border.

### Pattern D — exit presence (AnimatePresence)

`AnimatePresence` is TransitionGroup-based: put keyed motion children directly inside it (no wrapper element between), embed the exit transition inside the `:exit` target. Add the `layout` prop so remaining siblings FLIP-slide into the freed space instead of teleporting:

```vue
<AnimatePresence>
  <motion.button v-for="item in items" :key="item" layout
    :exit="{ opacity: 0, scale: 0.85, filter: 'blur(8px)', transition: getSpringConfig('exit') }"
    :transition="getSpringConfig('feedback')" />
</AnimatePresence>
```

### Pattern E — velocity-carrying snap (UiBottomSheet — swapped in place)

Pointer tracking stays manual (`.set()` per move event — instant, no animation); release snapping uses `getSpringPhysicsConfig(scene)` + `velocity` in value-units/second, because duration-based springs ignore inherited velocity. Fling direction continues the hand's momentum; distance/velocity dismissal thresholds unchanged from the original.

### What NOT to migrate (yet)

- Drag-release physics (`core/springPhysics.js`, UiSlider, swipe rows): motion's inertia differs from the tuned rubber-band behavior; keep until a dedicated evaluation.
- Backdrop-filter scrims: blur radius must transition continuously and cannot sit inside an opacity-transitioning parent — the CSS `.ui-scrim` pattern stays.
- Content-replacement language (`opacity→0 + blur`, tokens `--t-fade`/`--t-panel`): already tokenized, zero benefit.
- `core/morphWindow.js` engine swap: consumers (UiSelect / UiAutocomplete / pickers / UiMorphPanel) still carry geometry transitions in their CSS; swapping requires stripping those too. `core/morphWindow.motion.js` is the validated engine awaiting that coordinated swap.

## Status

### Swapped in place (old animation code removed)
- [x] `UiModal.vue` — motion panel enter/exit; panel CSS transitions deleted from `ui.css` (Pattern A)
- [x] `UiSearchField.vue` — shell width + icon travel on MotionValues (Pattern C)
- [x] `UiBottomSheet.vue` — frame translateY declarative, height MotionValue + physics-velocity snap (Pattern E)

### Infrastructure
- [x] motion-v installed (`dependencies`, pnpm)
- [x] Bridge `useMotion.js`: verified mapping (`bounce = 1 − ζ`), seconds/ms unit handling per path, `getSpringPhysicsConfig` for velocity, reduced-motion instant path
- [x] Library re-exports via `src/lib/index.js`
- [x] `MotionDemo.vue` at `/motion` (tone switch, interruptible spring, numeric spring, MotionValue orchestration, AnimatePresence list with layout reflow, whileInView, container-scoped useScroll progress, drag)
- [x] `core/morphWindow.motion.js` — validated engine (Pattern B), swap pending consumer CSS cleanup

### Next
- [ ] Human pass in the browser: `/motion` (all tone levels), modal open/close/reopen-interrupt, search field, sheet drag/snap feel — headless testing covered mount + mechanics, not hand-feel
- [ ] `core/morphWindow.js` swap + strip geometry transitions from UiSelect / UiAutocomplete / pickers / UiMorphPanel
- [ ] `ExpandableCard` evaluation — highest-value target, largest surface (fixed-position morph currently inline styles + CSS transitions; Pattern B applies)
- [ ] Tab-bar / route-view transitions evaluation

## Verification performed

- `vite build` — passes, no errors.
- Headless Chrome (`--dump-dom --virtual-time-budget`): layered probes isolated the follow-path ms unit bug (seconds → ~10ms snap, reproduced and fixed); motion-value imperative path verified (progression + completion); `/motion`, `/components`, `/home`, `/activity`, `/trends` all mount without JS errors after the swaps; MotionValue initial render confirmed (`transform: scale(0)` / `transform: none`).
- `vue/compiler-sfc` compile check — `<motion.div>` resolves to `$setup["motion"].div`.
- motion-dom sources confirm: `bounceToDampingRatio` semantics, seconds contract honored only in `animateMotionValue`, follow path verbatim options, time-defined springs ignore velocity.
- framer-motion/dom exports confirm `animate`, `scroll`, `inView`, `createScopedAnimate`.

## References

- [Motion for Vue docs](https://motion.dev/docs/vue)
- [Spring transition options](https://motion.dev/docs/vue-transitions)
- [useSpring](https://motion.dev/docs/vue-use-spring)
- [AnimatePresence](https://motion.dev/docs/vue-animate-presence)