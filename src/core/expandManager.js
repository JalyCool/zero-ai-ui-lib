/* 全局同一时间只允许一张卡片处于展开流程。 */
let active = null

export function getActive() {
  return active
}

export function setActive(state) {
  active = state
}

export function clearActive(state) {
  if (!state || active === state) active = null
}
