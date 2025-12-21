<script setup lang="ts">
import { nextTick, onMounted, reactive, ref, shallowRef } from 'vue'
import JqxDropDownButton from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxdropdownbutton.vue'
import JqxColorPicker from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxcolorpicker.vue'
import JqxGrid from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxgrid.vue'
import JqxWindow from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxwindow.vue'
import { useAuth } from '../stores/auth'
import { getApiBaseUrl } from '../config/api'
import { jqxLocale, jqxLocalization } from '../config/jqxLocalization'

type LocationRow = {
  id: number
  nameLocation: string
  color?: string | null
}

type JqxDataAdapter = { dataBind?: () => void }
type GridComponent = {
  updatebounddata?: (mode?: string) => void
  clearfilters?: () => void
  getrowdata?: (rowIndex: number) => unknown
  setcellvalue?: (rowIndex: number, datafield: string, value: unknown) => void
  getrowid?: (rowIndex: number) => unknown
}
type JqxGlobal = Window & { jqx?: { dataAdapter?: new (...args: unknown[]) => JqxDataAdapter } }

type DropDownButtonComponent = {
  open?: () => void
  close?: () => void
  setContent?: (content: string) => void
}

type ColorPickerComponent = {
  setColor?: (color: unknown) => void
}

type JQXLiteDropDownButtonOptions = {
  width?: string | number
  height?: string | number
  dropDownWidth?: number
  dropDownHeight?: number
  popupZIndex?: number
  enableBrowserBoundsDetection?: boolean
}

type JQXLiteColorPickerOptions = {
  width?: number
  height?: number
  color?: unknown
}

type JQXLiteWrapped = {
  jqxDropDownButton?: (methodOrOptions: string | JQXLiteDropDownButtonOptions, param?: unknown) => unknown
  jqxColorPicker?: (methodOrOptions: string | JQXLiteColorPickerOptions, param?: unknown) => unknown
  on?: (eventName: string, handler: (event: unknown) => void) => unknown
}

type JQXLiteStatic = (selector: unknown) => JQXLiteWrapped
type GridColorCellState = {
  rowIndex: number
  locationId: number | null
  nameLocation: string
  currentColor: string | null
  pendingColor: string | null
  ignoreNextColorChange: boolean
  escCancelled: boolean
  keydownHandler: ((event: KeyboardEvent) => void) | null
  pickerHost: HTMLElement
}

const API_BASE_URL = getApiBaseUrl()
const API_URL = `${API_BASE_URL.replace(/\/$/, '')}/api/Location`

const auth = useAuth()
const gridRef = ref<GridComponent | null>(null)
const dataAdapter = shallowRef<JqxDataAdapter | null>(null)
const errorMessage = ref('')
const isLoading = ref(false)
const selectedRow = ref<LocationRow | null>(null)
const isSaving = ref(false)
type WindowComponent = {
  open?: () => void
  close?: () => void
}

type GridEvent = {
  args?: Record<string, unknown>
}

type ColorChangeEvent = {
  args?: {
    color?: unknown
  }
}

const windowRef = ref<WindowComponent | null>(null)
const dropDownButtonRef = ref<DropDownButtonComponent | null>(null)
const colorPickerRef = ref<ColorPickerComponent | null>(null)
const DEFAULT_LOCATION_COLOR = '#0078D4'
const selectedColor = ref(DEFAULT_LOCATION_COLOR)
const form = reactive<{ id: number | null; nameLocation: string; color: string | null }>({
  id: null,
  nameLocation: '',
  color: DEFAULT_LOCATION_COLOR,
})

const token = auth.token

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

const rgbToHex = (r: number, g: number, b: number) =>
  `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g).toString(16).padStart(2, '0')}${clampByte(
    b,
  )
    .toString(16)
    .padStart(2, '0')}`.toLowerCase()

const normalizeLocationHexColor = (value: unknown): string | null => {
  if (value === null || value === undefined) return null

  if (typeof value === 'number' && Number.isFinite(value)) {
    const rgb = (value >>> 0) & 0xffffff
    return `#${rgb.toString(16).padStart(6, '0')}`.toLowerCase()
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (/^-?\d+$/.test(trimmed)) {
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed)) return null
      const rgb = (parsed >>> 0) & 0xffffff
      return `#${rgb.toString(16).padStart(6, '0')}`.toLowerCase()
    }

    const normalized = trimmed.toLowerCase()
    const normalizedHex = normalized.startsWith('#') ? normalized.slice(1) : normalized
    const hex = normalizedHex.startsWith('0x') ? normalizedHex.slice(2) : normalizedHex

    if (/^[0-9a-f]{3}$/.test(hex)) {
      const r = hex[0]
      const g = hex[1]
      const b = hex[2]
      if (!r || !g || !b) return null
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
    }

    if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`.toLowerCase()

    if (/^[0-9a-f]{8}$/.test(hex)) {
      return `#${hex.slice(-6)}`.toLowerCase()
    }

    const rgbMatch =
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.exec(
        normalized,
      )
    if (rgbMatch) {
      const r = Number(rgbMatch[1])
      const g = Number(rgbMatch[2])
      const b = Number(rgbMatch[3])
      if (![r, g, b].every((channel) => Number.isFinite(channel))) return null
      return rgbToHex(r, g, b)
    }

    const dotNetMatch = /r\s*=\s*(\d{1,3})\s*,\s*g\s*=\s*(\d{1,3})\s*,\s*b\s*=\s*(\d{1,3})/i.exec(
      trimmed,
    )
    if (dotNetMatch) {
      const r = Number(dotNetMatch[1])
      const g = Number(dotNetMatch[2])
      const b = Number(dotNetMatch[3])
      if (![r, g, b].every((channel) => Number.isFinite(channel))) return null
      return rgbToHex(r, g, b)
    }

    return null
  }

  if (isRgbColor(value)) return rgbToHex(value.r, value.g, value.b)

  if (typeof value === 'object' && value !== null) {
    const candidate = value as { hex?: unknown; r?: unknown; g?: unknown; b?: unknown }

    if (typeof candidate.hex === 'string') {
      const normalized = candidate.hex.trim().toLowerCase()
      if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized
      if (/^[0-9a-f]{6}$/.test(normalized)) return `#${normalized}`.toLowerCase()
    }

    if (isRgbColor(candidate)) return rgbToHex(candidate.r, candidate.g, candidate.b)
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const renderDropDownButtonContent = (colorValue: string | null) => {
  const normalized = normalizeLocationHexColor(colorValue)
  if (!normalized) {
    return `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: #e2e8f0; color: #0f172a; font-weight: 800; letter-spacing: 0.04em;">НЕ ЗАДАН</div>`
  }

  const textColor = getContrastingTextColor(normalized)
  const label = normalized.toUpperCase()
  return `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: ${normalized}; color: ${textColor}; font-weight: 800; letter-spacing: 0.04em;">${escapeHtml(
    label,
  )}</div>`
}

const syncDropDownButtonColor = async () => {
  await nextTick()
  dropDownButtonRef.value?.setContent?.(renderDropDownButtonContent(form.color))
}

const handleColorChange = (event: ColorChangeEvent) => {
  const normalized = normalizeLocationHexColor(event.args?.color)
  if (!normalized) return

  const normalizedValue = normalized.toUpperCase()
  selectedColor.value = normalizedValue
  form.color = normalizedValue
  dropDownButtonRef.value?.setContent?.(renderDropDownButtonContent(normalizedValue))
}

let gridColorWidgetId = 0
const gridColorCellStates = new WeakMap<HTMLElement, GridColorCellState>()

const getJQXLite = (): JQXLiteStatic | null => {
  const candidate = (globalThis as unknown as { JQXLite?: unknown }).JQXLite
  if (typeof candidate === 'function') return candidate as JQXLiteStatic

  const fallback = (globalThis as unknown as { jqxBaseFramework?: unknown }).jqxBaseFramework
  if (typeof fallback === 'function') return fallback as JQXLiteStatic

  return null
}

const getGridRowLocation = (rowIndex: number) => {
  const raw =
    typeof gridRef.value?.getrowdata === 'function' ? (gridRef.value.getrowdata(rowIndex) as unknown) : null
  if (typeof raw !== 'object' || raw === null) return null

  const record = raw as { id?: unknown; nameLocation?: unknown; color?: unknown }
  const locationId = Number(record.id)
  if (!Number.isFinite(locationId)) return null

  const nameLocation = String(record.nameLocation ?? '')
  const colorNormalized = normalizeLocationHexColor(record.color)
  const color = colorNormalized ? colorNormalized.toUpperCase() : null

  return { locationId, nameLocation, color }
}

const applyGridRowColor = (locationId: number, color: string | null) => {
  const record = source.localdata.find((item) => item.id === locationId)
  if (record) {
    record.color = color
  }

  if (selectedRow.value?.id === locationId) {
    selectedRow.value = { ...selectedRow.value, color }
  }
}

const saveGridColorChange = async (state: GridColorCellState, dropDownElement: HTMLElement, newColor: string) => {
  errorMessage.value = ''

  auth.dropExpiredToken()
  if (!token.value) {
    errorMessage.value = 'Необходима авторизация для редактирования.'
    return
  }

  const rowInfo = getGridRowLocation(state.rowIndex)
  if (!rowInfo) {
    errorMessage.value = 'Не удалось определить строку для изменения цвета.'
    return
  }

  const oldColor = state.currentColor
  const jqxLite = getJQXLite()
  const normalizedValue = newColor.toUpperCase()

  state.locationId = rowInfo.locationId
  state.nameLocation = rowInfo.nameLocation
  state.currentColor = normalizedValue
  state.pendingColor = normalizedValue

  jqxLite?.(dropDownElement).jqxDropDownButton?.('setContent', renderDropDownButtonContent(normalizedValue))

  if (typeof gridRef.value?.setcellvalue === 'function') {
    gridRef.value.setcellvalue(state.rowIndex, 'color', normalizedValue)
  }
  applyGridRowColor(rowInfo.locationId, normalizedValue)

  isSaving.value = true
  try {
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ id: rowInfo.locationId, nameLocation: rowInfo.nameLocation, color: normalizedValue }),
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }
  } catch (error) {
    console.error('[locations] color update failed', error)
    errorMessage.value =
      error instanceof Error ? `Не удалось сохранить цвет: ${error.message}` : 'Не удалось сохранить цвет'

    state.currentColor = oldColor
    state.pendingColor = oldColor
    jqxLite?.(dropDownElement).jqxDropDownButton?.('setContent', renderDropDownButtonContent(oldColor))
    if (typeof gridRef.value?.setcellvalue === 'function') {
      gridRef.value.setcellvalue(state.rowIndex, 'color', oldColor)
    }
    applyGridRowColor(rowInfo.locationId, oldColor)
  } finally {
    isSaving.value = false
  }
}

const handleGridColorOpen = (dropDownElement: HTMLElement) => {
  const state = gridColorCellStates.get(dropDownElement)
  if (!state) return

  const jqxLite = getJQXLite()
  if (!jqxLite) return

  state.escCancelled = false
  state.pendingColor = state.currentColor

  if (state.keydownHandler) {
    window.removeEventListener('keydown', state.keydownHandler, true)
  }

  state.keydownHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape' || event.keyCode === 27) {
      state.escCancelled = true
    }
  }
  window.addEventListener('keydown', state.keydownHandler, true)

  const pickerColor = state.currentColor ?? DEFAULT_LOCATION_COLOR
  state.ignoreNextColorChange = true
  jqxLite(state.pickerHost).jqxColorPicker?.('setColor', pickerColor)
}

const handleGridColorClose = (dropDownElement: HTMLElement) => {
  const state = gridColorCellStates.get(dropDownElement)
  if (!state) return

  if (state.keydownHandler) {
    window.removeEventListener('keydown', state.keydownHandler, true)
    state.keydownHandler = null
  }

  const jqxLite = getJQXLite()
  if (state.escCancelled) {
    state.pendingColor = state.currentColor
    const pickerColor = state.currentColor ?? DEFAULT_LOCATION_COLOR
    if (jqxLite) {
      state.ignoreNextColorChange = true
      jqxLite(state.pickerHost).jqxColorPicker?.('setColor', pickerColor)
    }
    return
  }

  const pending = state.pendingColor
  if (!pending || pending === state.currentColor) {
    return
  }

  void saveGridColorChange(state, dropDownElement, pending)
}

const createGridColorWidget = (row: number, _column: string, value: unknown, htmlElement: HTMLElement) => {
  const jqxLite = getJQXLite()
  if (!jqxLite) return

  const dropDownElement = document.createElement('div')
  dropDownElement.id = `locations-color-${++gridColorWidgetId}`
  dropDownElement.style.width = '100%'
  dropDownElement.style.height = '100%'
  dropDownElement.style.boxSizing = 'border-box'

  const pickerWrapper = document.createElement('div')
  pickerWrapper.style.padding = '8px'
  const pickerHost = document.createElement('div')
  pickerWrapper.appendChild(pickerHost)
  dropDownElement.appendChild(pickerWrapper)

  htmlElement.innerHTML = ''
  htmlElement.style.padding = '0'
  htmlElement.appendChild(dropDownElement)

  const initialNormalized = normalizeLocationHexColor(value)
  const initialValue = initialNormalized ? initialNormalized.toUpperCase() : null
  const pickerColor = initialValue ?? DEFAULT_LOCATION_COLOR

  const dropDownWidget = jqxLite(dropDownElement)
  const pickerWidget = jqxLite(pickerHost)

  dropDownWidget.jqxDropDownButton?.({
    width: '100%',
    height: '100%',
    dropDownWidth: 280,
    dropDownHeight: 260,
    popupZIndex: 2147483647,
    enableBrowserBoundsDetection: true,
  })
  dropDownWidget.jqxDropDownButton?.('setContent', renderDropDownButtonContent(initialValue))

  pickerWidget.jqxColorPicker?.({
    width: 260,
    height: 230,
    color: pickerColor,
  })

  const state: GridColorCellState = {
    rowIndex: row,
    locationId: null,
    nameLocation: '',
    currentColor: initialValue,
    pendingColor: initialValue,
    ignoreNextColorChange: false,
    escCancelled: false,
    keydownHandler: null,
    pickerHost,
  }
  gridColorCellStates.set(dropDownElement, state)

  pickerWidget.on?.('colorchange', (event: unknown) => {
    if (state.ignoreNextColorChange) {
      state.ignoreNextColorChange = false
      return
    }

    const args = (event as { args?: { color?: unknown } }).args
    const normalized = normalizeLocationHexColor(args?.color)
    if (!normalized) return
    state.pendingColor = normalized.toUpperCase()
  })

  dropDownWidget.on?.('open', () => handleGridColorOpen(dropDownElement))
  dropDownWidget.on?.('close', () => handleGridColorClose(dropDownElement))
}

const initGridColorWidget = (row: number, _column: string, value: unknown, htmlElement: HTMLElement) => {
  const dropDownElement = htmlElement.firstElementChild as HTMLElement | null
  if (!dropDownElement) return

  const state = gridColorCellStates.get(dropDownElement)
  if (!state) return

  if (state.keydownHandler) {
    window.removeEventListener('keydown', state.keydownHandler, true)
    state.keydownHandler = null
  }

  state.rowIndex = row
  state.escCancelled = false

  const rowInfo = getGridRowLocation(row)
  state.locationId = rowInfo?.locationId ?? null
  state.nameLocation = rowInfo?.nameLocation ?? ''

  const normalized = normalizeLocationHexColor(value)
  const normalizedValue = normalized ? normalized.toUpperCase() : null
  state.currentColor = normalizedValue
  state.pendingColor = normalizedValue

  const jqxLite = getJQXLite()
  if (!jqxLite) return

  jqxLite(dropDownElement).jqxDropDownButton?.('setContent', renderDropDownButtonContent(normalizedValue))
  const pickerColor = normalizedValue ?? DEFAULT_LOCATION_COLOR
  state.ignoreNextColorChange = true
  jqxLite(state.pickerHost).jqxColorPicker?.('setColor', pickerColor)
}

const source = {
  datatype: 'array',
  datafields: [
    { name: 'id', type: 'number' },
    { name: 'nameLocation', type: 'string' },
    { name: 'color', type: 'string' },
  ],
  id: 'id',
  localdata: [] as LocationRow[],
}

const columns = [
  {
    text: 'ID',
    datafield: 'id',
    width: 90,
    cellsalign: 'center',
    align: 'center',
    editable: false,
    filtertype: 'number',
  },
  {
    text: 'Название',
    datafield: 'nameLocation',
    editable: true,
    filtertype: 'input',
    filtercondition: 'starts_with',
  },
  {
    text: 'Цвет',
    datafield: 'color',
    width: 120,
    align: 'center',
    cellsalign: 'center',
    editable: false,
    sortable: false,
    filterable: false,
    createwidget: createGridColorWidget,
    initwidget: initGridColorWidget,
  },
]

const ensureDataAdapter = () => {
  if (dataAdapter.value) {
    return dataAdapter.value
  }

  const jqx = typeof window !== 'undefined' ? (window as JqxGlobal).jqx : undefined
  if (!jqx?.dataAdapter) {
    errorMessage.value =
      'Не удалось инициализировать jqxGrid. Проверьте, что скрипты jqxcore и jqxgrid подключены в main.ts.'
    return null
  }

  dataAdapter.value = new jqx.dataAdapter(source, { autoBind: true })
  return dataAdapter.value
}

const refreshGrid = () => {
  if (gridRef.value && typeof gridRef.value.updatebounddata === 'function') {
    gridRef.value.updatebounddata('cells')
  }
}

const fetchLocations = async () => {
  errorMessage.value = ''
  isLoading.value = true
  selectedRow.value = null
  updateToolbarState()

  auth.dropExpiredToken()
  if (!token.value) {
    errorMessage.value = 'Необходима авторизация для загрузки локаций.'
    isLoading.value = false
    return
  }

  try {
    const response = await fetch(API_URL, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }

    const payload = (await response.json()) as LocationRow[]
    source.localdata = Array.isArray(payload) ? payload : []

    const adapter = ensureDataAdapter()
    if (adapter) {
      if (typeof adapter.dataBind === 'function') {
        adapter.dataBind()
      }
      refreshGrid()
    }
  } catch (error) {
    console.error('[locations] load failed', error)
    errorMessage.value =
      error instanceof Error
        ? `Не удалось загрузить локации: ${error.message}`
        : 'Не удалось загрузить локации'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  ensureDataAdapter()
  fetchLocations()
  void syncDropDownButtonColor()
})

const toolbarButtons: {
  add?: HTMLButtonElement | null
  edit?: HTMLButtonElement | null
  remove?: HTMLButtonElement | null
  refresh?: HTMLButtonElement | null
  reset?: HTMLButtonElement | null
} = {}

const updateToolbarState = () => {
  const hasSelection = !!selectedRow.value
  if (toolbarButtons.edit) toolbarButtons.edit.disabled = !hasSelection
  if (toolbarButtons.remove) toolbarButtons.remove.disabled = !hasSelection
}

const handleRowSelect = (event: GridEvent) => {
  const row = event?.args && ((event.args as { row?: unknown }).row as LocationRow | undefined)
  if (row && typeof row.id !== 'undefined') {
    selectedRow.value = {
      id: Number(row.id),
      nameLocation: String(row.nameLocation ?? ''),
      color: row.color === null || typeof row.color === 'undefined' ? null : String(row.color),
    }
  } else {
    selectedRow.value = null
  }
  updateToolbarState()
}

const removeSelected = async () => {
  if (!selectedRow.value) return
  const confirmed =
    typeof window !== 'undefined'
      ? window.confirm(`Удалить локацию "${selectedRow.value.nameLocation}"?`)
      : true
  if (!confirmed) return

  errorMessage.value = ''
  isLoading.value = true
  try {
    const response = await fetch(`${API_URL}/${selectedRow.value.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }
    selectedRow.value = null
    updateToolbarState()
    await fetchLocations()
  } catch (error) {
    console.error('[locations] remove failed', error)
    errorMessage.value =
      error instanceof Error
        ? `Не удалось удалить локацию: ${error.message}`
        : 'Не удалось удалить локацию'
  } finally {
    isLoading.value = false
  }
}

const saveInlineEdit = async (event: GridEvent) => {
  if (!token.value) {
    errorMessage.value = 'Необходима авторизация для редактирования.'
    return false
  }
  const args = (event?.args ?? {}) as Record<string, unknown>
  if (args.datafield !== 'nameLocation') {
    return true
  }
  const rowIndex = args.rowindex as number | undefined
  if (typeof rowIndex !== 'number' || Number.isNaN(rowIndex)) {
    errorMessage.value = 'Не удалось определить строку для редактирования.'
    return false
  }
  const newValue = String(args.value ?? '').trim()
  const oldValue = String(args.oldvalue ?? '').trim()
  if (newValue === oldValue) {
    return true
  }
  const rowId =
    typeof gridRef.value?.getrowid === 'function' ? gridRef.value.getrowid(rowIndex) : undefined
  const id = rowId ?? selectedRow.value?.id ?? null
  if (id === null || id === undefined) {
    errorMessage.value = 'Не удалось определить ID строки.'
    return false
  }

  const rowData =
    typeof gridRef.value?.getrowdata === 'function' ? gridRef.value.getrowdata(rowIndex) : null
  const rawColor = (rowData as { color?: unknown } | null)?.color ?? selectedRow.value?.color ?? null
  const color =
    rawColor === null || typeof rawColor === 'undefined'
      ? null
      : normalizeLocationHexColor(rawColor) ?? (typeof rawColor === 'string' ? rawColor.trim() : null)

  isSaving.value = true
  try {
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ id, nameLocation: newValue, color }),
    })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }
    await fetchLocations()
    return true
  } catch (error) {
    console.error('[locations] inline edit failed', error)
    errorMessage.value =
      error instanceof Error
        ? `Не удалось сохранить локацию: ${error.message}`
        : 'Не удалось сохранить локацию'
    // откат значения
    if (typeof gridRef.value?.setcellvalue === 'function') {
      gridRef.value.setcellvalue(rowIndex, 'nameLocation', oldValue)
    }
    return false
  } finally {
    isSaving.value = false
  }
}

const openCreateWindow = () => {
  errorMessage.value = ''
  form.id = null
  form.nameLocation = ''
  selectedColor.value = DEFAULT_LOCATION_COLOR
  form.color = selectedColor.value
  void syncDropDownButtonColor()
  if (typeof windowRef.value?.open === 'function') {
    windowRef.value.open()
  }
}

const openEditWindow = () => {
  if (!selectedRow.value) return
  errorMessage.value = ''
  form.id = selectedRow.value.id
  form.nameLocation = selectedRow.value.nameLocation
  const normalized = normalizeLocationHexColor(selectedRow.value.color) ?? DEFAULT_LOCATION_COLOR
  const normalizedValue = normalized.toUpperCase()
  selectedColor.value = normalizedValue
  form.color = normalizedValue
  dropDownButtonRef.value?.setContent?.(renderDropDownButtonContent(normalizedValue))
  if (typeof windowRef.value?.open === 'function') {
    windowRef.value.open()
  }
}

const closeWindow = () => {
  dropDownButtonRef.value?.close?.()
  if (typeof windowRef.value?.close === 'function') {
    windowRef.value.close()
  }
}

const handleWindowOpen = () => {
  void nextTick().then(() => {
    dropDownButtonRef.value?.setContent?.(renderDropDownButtonContent(form.color))
    colorPickerRef.value?.setColor?.(selectedColor.value)
  })
}

const handleWindowClose = () => {
  dropDownButtonRef.value?.close?.()
}

const saveLocation = async () => {
  errorMessage.value = ''
  if (!token.value) {
    errorMessage.value = 'Необходима авторизация для добавления локации.'
    return
  }
  const name = form.nameLocation.trim()
  if (!name) {
    errorMessage.value = 'Название локации обязательно.'
    return
  }
  isSaving.value = true
  try {
    const isEdit = form.id !== null && form.id !== undefined
    const colorTrimmed = typeof form.color === 'string' ? form.color.trim() : ''
    const color = colorTrimmed ? normalizeLocationHexColor(colorTrimmed) ?? colorTrimmed : null
    const response = await fetch(API_URL, {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ id: isEdit ? form.id : 0, nameLocation: name, color }),
    })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }
    closeWindow()
    await fetchLocations()
  } catch (error) {
    console.error('[locations] save failed', error)
    errorMessage.value =
      error instanceof Error
        ? `Не удалось сохранить локацию: ${error.message}`
        : 'Не удалось сохранить локацию'
  } finally {
    isSaving.value = false
  }
}

type ToolbarLike = {
  0?: HTMLElement
  element?: HTMLElement
  empty?: () => void
  append?: (node: HTMLElement) => void
}

const renderToolbar = (toolbar: ToolbarLike) => {
  const host = toolbar?.[0] ?? toolbar?.element ?? (toolbar as unknown as HTMLElement)
  if (!host) return

  if (typeof toolbar?.empty === 'function') {
    toolbar.empty()
  } else if (typeof host === 'object' && 'innerHTML' in host) {
    host.innerHTML = ''
  }

  const container = document.createElement('div')
  container.style.display = 'flex'
  container.style.alignItems = 'center'
  container.style.gap = '8px'
  container.style.padding = '6px 8px'
  container.style.boxSizing = 'border-box'

  const buttonStyle: Partial<CSSStyleDeclaration> = {
    height: '32px',
    width: '140px',
    padding: '0 10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#0f172a',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '13px',
  }

  const createButton = (label: string, onClick: () => void) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = label
    Object.assign(btn.style, buttonStyle)
    btn.addEventListener('click', onClick)
    return btn
  }

  const addBtn = createButton('Добавить', () => {
    openCreateWindow()
  })
  const editBtn = createButton('Редактировать', () => {
    openEditWindow()
  })
  const removeBtn = createButton('Удалить', () => {
    void removeSelected()
  })
  const refreshBtn = createButton('Обновить', () => {
    void fetchLocations()
  })
  const resetFiltersBtn = createButton('Сбросить фильтры', () => {
    gridRef.value?.clearfilters?.()
  })

  toolbarButtons.add = addBtn
  toolbarButtons.edit = editBtn
  toolbarButtons.remove = removeBtn
  toolbarButtons.refresh = refreshBtn
  toolbarButtons.reset = resetFiltersBtn
  updateToolbarState()

  container.append(addBtn, editBtn, removeBtn, refreshBtn, resetFiltersBtn)

  if (typeof toolbar?.append === 'function') {
    toolbar.append(container)
  } else if (typeof host?.appendChild === 'function') {
    host.appendChild(container)
  }
}
</script>

<template>
  <section class="page">
    <p class="page__title">Локации</p>

    <p v-if="errorMessage" class="page__error">{{ errorMessage }}</p>
    <p v-else-if="isLoading" class="page__note">Загружаем локации…</p>

    <JqxGrid
      v-else
      ref="gridRef"
      :width="'100%'"
      :source="ensureDataAdapter()"
      :columns="columns"
      :autoheight="true"
      :sortable="true"
      :filterable="true"
      :pageable="true"
      :pagesizeoptions="['5', '10', '20', '50', '100']"
      :pagesize="10"
      :localization="jqxLocalization"
      :locale="jqxLocale"
      :autoshowfiltericon="false"
      :showtoolbar="true"
      :toolbarheight="44"
      :rendertoolbar="renderToolbar"
      :altrows="true"
      :selectionmode="'singlerow'"
      :columnsresize="true"
      :enablebrowserselection="true"
      :editable="true"
      :editmode="'dblclick'"
      @rowselect="handleRowSelect"
      @cellendedit="saveInlineEdit"
    />

    <JqxWindow
      ref="windowRef"
      :width="360"
      :height="260"
      :isModal="true"
      :autoOpen="false"
      :resizable="false"
      @open="handleWindowOpen"
      @close="handleWindowClose"
    >
      <div>локация</div>
      <div class="modal">
        <label class="modal__field">
          <span class="modal__label">Название</span>
          <input
            v-model="form.nameLocation"
            class="modal__input"
            type="text"
            placeholder="Введите название"
            :disabled="isSaving"
            required
          />
        </label>
        <div class="modal__row">
          <span class="modal__label">цвет</span>
          <JqxDropDownButton
            ref="dropDownButtonRef"
            :width="240"
            :height="44"
            :dropDownWidth="280"
            :dropDownHeight="260"
            :popupZIndex="2147483647"
            :disabled="isSaving"
          >
            <div class="picker">
              <JqxColorPicker
                ref="colorPickerRef"
                :width="260"
                :height="230"
                :disabled="isSaving"
                @colorchange="handleColorChange"
              />
            </div>
          </JqxDropDownButton>
        </div>
        <div class="modal__actions">
          <button
            class="modal__button modal__button--ghost"
            type="button"
            @click="closeWindow"
            :disabled="isSaving"
          >
            Отмена
          </button>
          <button class="modal__button" type="button" @click="saveLocation" :disabled="isSaving">
            {{ isSaving ? 'Сохраняем...' : 'Сохранить' }}
          </button>
        </div>
      </div>
    </JqxWindow>
  </section>
</template>

<style scoped>
.page {
  padding: 1rem;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
}

.page__error {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecdd3;
}

.page__note {
  margin: 0;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.modal {
  padding: 1rem 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.modal__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.picker {
  padding: 0.5rem;
}

.modal__label {
  font-weight: 700;
  color: #0f172a;
}

.modal__input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  font-size: 1rem;
  font-family: inherit;
}

.modal__input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.modal__button {
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1rem;
  background: #0f172a;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.modal__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal__button--ghost {
  background: #e2e8f0;
  color: #0f172a;
}

.modal__button--ghost:not(:disabled):hover {
  background: #cbd5e1;
}
</style>
