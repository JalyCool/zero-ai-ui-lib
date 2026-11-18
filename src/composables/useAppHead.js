import { reactive } from 'vue'

/* ============================================================
   useAppHead —— 页面动作注入（外壳常驻按钮 + 页面按钮同排）
   ------------------------------------------------------------
   外壳（App.vue）只有一个 AppHead：右侧 #actions 常驻全局功能
   （命令面板 / 设置 / 返回）。页面想加自己的按钮时不再自造头部，
   而是把一段 render 函数登记到这里 —— 它会渲染在全局按钮**旁边**，
   默认态与上滑融合态共用同一份（AppHead 对两态渲染同一插槽）。

   用法（页面 setup 内）：
     import { h, onBeforeUnmount } from 'vue'
     import { setPageHeadActions } from '../composables/useAppHead'
     onMounted(() => setPageHeadActions(() => h(UiMenu, { ... })))
     onBeforeUnmount(() => setPageHeadActions(null))

   也支持整块中间内容（#center）：setPageHeadCenter(fn)
   ============================================================ */

export const appHeadState = reactive({
  /** 右侧动作区补充内容（render 函数，渲染在全局按钮左侧） */
  actions: null,
  /** 中间标题区的额外内容（render 函数，插在 logo 与标题之间） */
  center: null
})

export function setPageHeadActions(renderFn) {
  appHeadState.actions = typeof renderFn === 'function' ? renderFn : null
}

export function setPageHeadCenter(renderFn) {
  appHeadState.center = typeof renderFn === 'function' ? renderFn : null
}

export function useAppHead() {
  return { appHeadState, setPageHeadActions, setPageHeadCenter }
}