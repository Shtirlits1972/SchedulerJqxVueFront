<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import JqxDropDownButton from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxdropdownbutton.vue'
import JqxColorPicker from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxcolorpicker.vue'

type DropDownButtonComponent = {
  open?: () => void
  close?: () => void
  setContent?: (content: string) => void
}

type ColorChangeEvent = {
  args?: {
    color?: unknown
  }
}

type RgbColor = { r: number; g: number; b: number }

const isRgbColor = (value: unknown): value is RgbColor => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Record<keyof RgbColor, unknown>>
  return (
    typeof candidate.r === 'number' &&
    Number.isFinite(candidate.r) &&
    typeof candidate.g === 'number' &&
    Number.isFinite(candidate.g) &&
    typeof candidate.b === 'number' &&
    Number.isFinite(candidate.b)
  )
}

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

const rgbToHex = ({ r, g, b }: RgbColor) =>
  `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g).toString(16).padStart(2, '0')}${clampByte(b)
    .toString(16)
    .padStart(2, '0')}`.toLowerCase()

const normalizeHexColor = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized
    if (/^[0-9a-f]{6}$/.test(normalized)) return `#${normalized}`
    return null
  }

  if (isRgbColor(value)) return rgbToHex(value)

  if (typeof value === 'object' && value !== null) {
    const candidate = value as { hex?: unknown; r?: unknown; g?: unknown; b?: unknown }

    if (typeof candidate.hex === 'string') {
      const normalized = candidate.hex.trim().toLowerCase()
      if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized
      if (/^[0-9a-f]{6}$/.test(normalized)) return `#${normalized}`
    }

    if (isRgbColor(candidate)) return rgbToHex(candidate)
  }

  return null
}

const getContrastingTextColor = (hexColor: string) => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hexColor)
  if (!match) return '#0f172a'

  const rHex = match[1]
  const gHex = match[2]
  const bHex = match[3]
  if (!rHex || !gHex || !bHex) return '#0f172a'

  const r = parseInt(rHex, 16)
  const g = parseInt(gHex, 16)
  const b = parseInt(bHex, 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 160 ? '#0f172a' : '#ffffff'
}

const dropDownButtonRef = ref<DropDownButtonComponent | null>(null)

const selectedColor = ref('#ff0000')

const renderDropDownButtonContent = (hexColor: string) => {
  const textColor = getContrastingTextColor(hexColor)
  const label = hexColor.toUpperCase()
  return `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: ${hexColor}; color: ${textColor}; font-weight: 800; letter-spacing: 0.04em;">${label}</div>`
}

const syncDropDownButtonColor = async () => {
  await nextTick()
  dropDownButtonRef.value?.setContent?.(renderDropDownButtonContent(selectedColor.value))
}

const handleColorChange = (event: ColorChangeEvent) => {
  const normalized = normalizeHexColor(event.args?.color)
  if (!normalized) return

  selectedColor.value = normalized
  void syncDropDownButtonColor()
}

const handleDropDownClose = () => {
  console.log('[test-color-picker] selected color:', selectedColor.value.toUpperCase())
}

onMounted(() => {
  void syncDropDownButtonColor()
})
</script>

<template>
  <section class="page">
    <h1 class="page__title">Test Color Picker</h1>

    <div class="page__content">
      <JqxDropDownButton
        ref="dropDownButtonRef"
        :width="240"
        :height="44"
        :dropDownWidth="280"
        :dropDownHeight="260"
        @close="handleDropDownClose"
      >
        <div class="picker">
          <JqxColorPicker :width="260" :height="230" @colorchange="handleColorChange" />
        </div>
      </JqxDropDownButton>

      <div class="hint">
        <span class="hint__label">Выбранный цвет:</span>
        <span class="hint__value">{{ selectedColor.toUpperCase() }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 520px;
}

.page__title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: #0f172a;
}

.page__content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.picker {
  padding: 0.5rem;
}

.hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  color: #0f172a;
}

.hint__label {
  color: #475569;
}

.hint__value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
</style>
