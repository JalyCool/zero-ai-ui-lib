<script setup>
const props = defineProps({
  /* [{ key, value }] */
  modelValue: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  keyPlaceholder: { type: String, default: '键' },
  valuePlaceholder: { type: String, default: '值' },
  addLabel: { type: String, default: '添加一项' },
  /* 值用密码点显示（密钥类 header） */
  secret: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

/* ============================================================
   键值对编辑器：MCP headers / 环境变量录入用，
   空键行只做占位不参与提交，顺序保持录入顺序。
   ============================================================ */

function patch(index, field, value) {
  const next = props.modelValue.map((row, i) => i === index ? { ...row, [field]: value } : row)
  emit('update:modelValue', next)
}

function addRow() {
  emit('update:modelValue', [...props.modelValue, { key: '', value: '' }])
}

function removeRow(index) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}
</script>

<template>
  <div class="ui-kv">
    <span v-if="label" class="ui-kv__label">{{ label }}</span>
    <div class="ui-kv__rows">
      <div v-for="(row, index) in modelValue" :key="index" class="ui-kv__row">
        <input class="ui-kv__key" type="text" :value="row.key" :placeholder="keyPlaceholder" :aria-label="keyPlaceholder" @input="patch(index, 'key', $event.target.value)">
        <span class="ui-kv__eq" aria-hidden="true">=</span>
        <input class="ui-kv__value" :type="secret ? 'password' : 'text'" :value="row.value" :placeholder="valuePlaceholder" :aria-label="valuePlaceholder" @input="patch(index, 'value', $event.target.value)">
        <button type="button" class="ui-kv__remove" aria-label="删除该项" @click="removeRow(index)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" /></svg>
        </button>
      </div>
      <p v-if="!modelValue.length" class="ui-kv__empty">还没有条目</p>
    </div>
    <button type="button" class="ui-kv__add" @click="addRow">+ {{ addLabel }}</button>
  </div>
</template>

<style scoped>
.ui-kv { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ui-kv__label { color: var(--on-surface-variant); font-size: var(--fs-micro); font-weight: var(--w-label); }
.ui-kv__rows { display: flex; flex-direction: column; gap: 6px; }
.ui-kv__row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; min-width: 0; }
.ui-kv__key,
.ui-kv__value {
  flex: 1;
  min-width: 0;
  padding: 7px 9px;
  border: var(--border-w) solid var(--outline-variant);
  border-radius: calc(var(--r-11) * var(--radius-scale));
  background: var(--surface-container-low);
  color: var(--on-surface);
  font-size: var(--fs-small);
  outline: 0;
  transition: border-color var(--t-fade);
}
.ui-kv__key { flex: 1 1 100px; min-width: 0; font-family: var(--font-mono); }
.ui-kv__key:focus, .ui-kv__value:focus { border-color: var(--primary); background: var(--surface); }
.ui-kv__eq { color: var(--on-surface-variant); font-size: var(--fs-tiny); flex-shrink: 0; }
.ui-kv__remove {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: background var(--t-fade), color var(--t-fade), transform var(--t-feedback);
}
.ui-kv__remove:hover { background: var(--surface-container); color: var(--error); }
.ui-kv__remove:active { transform: scale(var(--press-scale)); }
.ui-kv__remove svg { width: 13px; height: 13px; }
.ui-kv__empty {
  margin: 2px 0;
  color: var(--on-surface-variant);
  font-size: var(--fs-micro);
}
.ui-kv__add {
  align-self: flex-start;
  padding: 5px 10px;
  border: var(--border-w) dashed var(--outline-variant);
  border-radius: 999px;
  background: transparent;
  color: var(--primary);
  font-size: var(--fs-tiny);
  font-weight: var(--w-label);
  cursor: pointer;
  transition: background var(--t-fade), border-color var(--t-fade), transform var(--t-feedback);
}
.ui-kv__add:hover { background: var(--surface-container-low); }
.ui-kv__add:active { transform: scale(var(--press-scale)); }
</style>