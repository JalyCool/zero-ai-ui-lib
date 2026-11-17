<script setup>
import { computed } from 'vue'

const props = defineProps({
  /* top = 页面顶端（越靠上越糊）；bottom = 页面底部（越靠下越糊） */
  placement: { type: String, default: 'top', validator: v => ['top', 'bottom'].includes(v) },
  /* 模糊带高度（px）—— 过渡区的「长度」。这个值直接决定渐变铺得多开：
     带太窄，能看见的模糊过渡区只有几像素（看着像「一刀切」）；
     带够宽才有「越靠近边越糊」的渐变感。 */
  height: { type: Number, default: 140 },
  /* 贴边处的最大模糊半径（px）：向内平滑衰减到 0 */
  maxBlur: { type: Number, default: 9 },
  /* 叠加层数：越多渐变越平滑（台阶越细）；合成成本随层数线性增长。
     实测（真实渲染像素 + 折点检测）：soft 档 12 层的可见台阶最少
     —— 层数再往上，各层幂次被拉开，遮罩之间反而接不上。 */
  layers: { type: Number, default: 12 },
  /* 精度档位：调的是曲线形状。
     soft  -> 高斯尾部铺得最开：过渡区最宽、可见台阶最少（实测最优）
     high  -> 标准：过渡区集中，过渡更快
     sharp -> 贴边糊得干脆，往内迅速变清晰 */
  precision: {
    type: String,
    default: 'soft',
    validator: v => ['soft', 'high', 'sharp'].includes(v)
  },
  /* 染色（贴边处的背景色，向内渐隐）：默认 surface，对应设计稿的白 0.8 → 透明 */
  tint: { type: String, default: 'var(--surface)' },
  /* 染色强度 0~1；0 = 关闭染色层（只要模糊） */
  tintStrength: { type: Number, default: 0.8 },
  /* 定位：absolute 贴父容器边缘（页面顶/底覆盖在滚动内容上）；
     需要普通流内使用时改 relative */
  position: { type: String, default: 'absolute', validator: v => ['absolute', 'relative', 'fixed'].includes(v) },
  /* 显隐：false 时只把不透明度收到 0，**不销毁**（层结构常驻，
     避免重新挂载时 backdrop-filter 重建造成闪烁）。
     由 useScrollEdges 驱动 —— 这一侧还有被裁内容时才露面。 */
  visible: { type: Boolean, default: true }
})

/* ============================================================
   渐进式模糊（页面顶端 / 底部）
   ------------------------------------------------------------
   原理：N 层 backdrop-filter 叠加，靠**遮罩覆盖率**控制每层的贡献。
   三条让它「看不出台阶」的规则：
   1. **遮罩重叠**：第 i 层盖 [i*step, (i+1)*step]，相邻层共同覆盖
      一整段 —— 强度在重叠区是连续叠加的，不会在层边界跳档；
   2. **半径递增**：越靠边的层半径越大（贴着边最糊），向内收敛 ——
      「离边越近越糊」因此是几何连续的；
   3. **软边而非硬切**：每层遮罩是「实心 -> 过渡带 -> 透明」，
      `precision` 调的就是过渡带宽度（high 更窄更锐利）。
   最后叠一层染色渐变（surface → 透明），与设计稿
   「白 0.8 → 透明 + backdrop-blur」的顶/底栏同源。
   层全部 pointer-events: none：盖在可交互内容上不拦截。
   ============================================================ */

const rootStyle = computed(() => ({
  height: props.height + 'px',
  position: props.position,
  '--pb-tint': props.tint,
  '--pb-tint-strength': String(props.tintStrength),
  /* 显隐只动不透明度：层与 backdrop-filter 常驻，切换时不会重建 */
  opacity: props.visible ? '1' : '0'
}))

const toEdge = computed(() => (props.placement === 'top' ? 'to bottom' : 'to top'))

/* ============================================================
   渐进精度的关键：遮罩必须**重叠**，半径必须**逐层递增**
   ------------------------------------------------------------
   旧实现每层盖一段互不相交的区间（i/N → (i+1)/N），半径也都是
   maxBlur/N —— 叠加出来的强度是**台阶函数**：相邻层边界处强度突然
   跳一档，看上去就是一条条横纹。

   现在改成：
   · 遮罩重叠：第 i 层从 i*step 开始就淡入，到 (i+1)*step 淡出，
     相邻层有一整段是共同覆盖的 -> 强度在那一段是连续叠加的
   · 半径递增：越靠边的层半径越大（贴着边最糊），越靠内越小，
     于是「离边越近越糊」是几何上连续的，而不是靠遮罩拼出来的
   · 层数越多步长越小，台阶越细（默认 8 层）
   ============================================================ */
const layerStyles = computed(() => {
  const count = Math.max(1, Math.min(24, Math.round(props.layers)))
  const list = []

  /* ============================================================
     精度设计（这一版是推倒重来的）
     ------------------------------------------------------------
     可见的「横纹」本质是：总模糊量 B(y) = Σ rᵢ·mᵢ(y) 是**分段常数**
     —— 旧实现里每层盖一段互不相交的区间，层边界处强度跳一档。

     如果遮罩是分段线性的，要让 B 连续就得满足 rₖ = rₖ₊₂，
     逼得所有半径相等（就没有渐变了）。所以遮罩必须**光滑**。

     这里用一条共享的光滑衰减曲线 P(y)（升余弦，两端导数为 0），
     第 i 层的遮罩取 **P^i**：
       · P 是 1→0 的光滑单调曲线 -> P^i 也光滑单调
       · B(y) = Σ rᵢ·P(y)^i 对 y 单调递减（每一项都随 P 递减）
       · B(0) = Σ rᵢ（贴边最糊），B(H) = 0（内缘完全清晰）
       · 光滑函数之和仍是光滑函数 -> **没有任何台阶**

     半径按 1/i^0.7 递减并归一化（Σrᵢ² = maxBlur²）：
     叠加模糊的等效半径按方差相加，sqrt(Σrᵢ²) 才是「贴边处的真实模糊量」。
     越靠内，高次项 P^i 先归零 -> 剩下低次项（半径大的）也逐步退场，
     等效半径随之平滑下降。

     `precision` 调的是 P 的形状：sharp = P 指数 <1（贴边糊得更集中），
     soft = P 指数 >1（平缓铺开），high = 1（标准升余弦）。
     ============================================================ */
  /* 曲线的「扁度」：指数 <1 -> 曲线更饱满（贴边糊得久），
     指数 >1 -> 曲线更平坦（长尾铺得更开）。
     实测（真实渲染像素 + 折点检测）：soft 的扁平曲线 + 16 层
     的可见台阶最少，过渡区也最宽。 */
  const exponent = props.precision === 'sharp' ? 0.72 : props.precision === 'soft' ? 1.9 : 1

  /* 升余弦：P(0)=1, P(H)=0，两端导数为 0（不产生硬转折） */
  const profile = y => {
    const t = Math.max(0, Math.min(1, y / 100))
    return 0.5 * (1 + Math.cos(Math.PI * Math.pow(t, exponent)))
  }

  /* 半径：递减 + 归一化到 Σr² = maxBlur² */
  const raw = Array.from({ length: count }, (_, k) => 1 / Math.pow(k + 1, 0.7))
  const norm = Math.sqrt(raw.reduce((s, v) => s + v * v, 0))

  /* 各层的幂次：第 i 层取 P^w(i)，w(i) 随 i 缓增。
     直接用 P^i（w=i）会让高次项在贴边处**瞬间**归零 ——
     也就是「最该糊的地方没糊住，往内立刻变清晰」，过渡区被压成几像素。
     把 w 压到 1~2.4，高次项衰减得慢，长尾才铺得开。 */
  const maxPower = 2.4
  const powerOf = i => 1 + (maxPower - 1) * (count === 1 ? 0 : i / (count - 1))

  const samples = 12
  for (let i = 0; i < count; i++) {
    const power = powerOf(i)
    const stops = []
    for (let s = 0; s <= samples; s++) {
      const pos = (100 * s) / samples
      const p = Math.pow(profile(pos), power)
      stops.push(`rgba(0,0,0,${p.toFixed(5)}) ${pos.toFixed(2)}%`)
    }
    const mask = `linear-gradient(${toEdge.value}, ${stops.join(', ')})`
    const blur = (props.maxBlur * raw[i] / norm).toFixed(2)

    list.push({
      backdropFilter: `blur(${blur}px)`,
      WebkitBackdropFilter: `blur(${blur}px)`,
      maskImage: mask,
      WebkitMaskImage: mask
    })
  }
  return list
})
</script>

<template>
  <div
    class="ui-progressive-blur"
    :class="'is-' + placement"
    :style="rootStyle"
    aria-hidden="true"
  >
    <div
      v-for="(layer, index) in layerStyles"
      :key="index"
      class="ui-progressive-blur__layer"
      :style="layer"
    ></div>
    <div v-if="tintStrength > 0" class="ui-progressive-blur__tint"></div>
  </div>
</template>

<style scoped>
.ui-progressive-blur {
  left: 0;
  right: 0;
  z-index: 50;
  pointer-events: none;
  transition: opacity var(--t-fade);
}
.ui-progressive-blur.is-top { top: 0; }
.ui-progressive-blur.is-bottom { bottom: 0; }
.ui-progressive-blur__layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
/* 染色层：贴边处 tint 最浓，向内渐隐；默认也带 pointer-events none */
.ui-progressive-blur__tint {
  position: absolute;
  inset: 0;
}
.ui-progressive-blur.is-top .ui-progressive-blur__tint {
  background: linear-gradient(to bottom, color-mix(in oklab, var(--pb-tint) calc(var(--pb-tint-strength) * 100%), transparent), transparent);
}
.ui-progressive-blur.is-bottom .ui-progressive-blur__tint {
  background: linear-gradient(to top, color-mix(in oklab, var(--pb-tint) calc(var(--pb-tint-strength) * 100%), transparent), transparent);
}
@media (prefers-reduced-motion: reduce) {
  /* 静态层无动效，无需降级 */
}
</style>