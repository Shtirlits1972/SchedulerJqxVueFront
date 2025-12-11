<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import JqxGrid from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxgrid.vue'
import JqxWindow from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxwindow.vue'
import { useAuth } from '../stores/auth'
import { getApiBaseUrl } from '../config/api'
import { jqxLocale, jqxLocalization } from '../config/jqxLocalization'

type LocationRow = {
  id: number
  nameLocation: string
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

const windowRef = ref<WindowComponent | null>(null)
const form = reactive<{ id: number | null; nameLocation: string }>({
  id: null,
  nameLocation: '',
})

const token = computed(() => auth.token.value ?? '')

const source = {
  datatype: 'array',
  datafields: [
    { name: 'id', type: 'number' },
    { name: 'nameLocation', type: 'string' },
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
    selectedRow.value = { id: Number(row.id), nameLocation: String(row.nameLocation ?? '') }
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

  isSaving.value = true
  try {
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ id, nameLocation: newValue }),
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
  if (typeof windowRef.value?.open === 'function') {
    windowRef.value.open()
  }
}

const openEditWindow = () => {
  if (!selectedRow.value) return
  errorMessage.value = ''
  form.id = selectedRow.value.id
  form.nameLocation = selectedRow.value.nameLocation
  if (typeof windowRef.value?.open === 'function') {
    windowRef.value.open()
  }
}

const closeWindow = () => {
  if (typeof windowRef.value?.close === 'function') {
    windowRef.value.close()
  }
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
    const response = await fetch(API_URL, {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ id: isEdit ? form.id : 0, nameLocation: name }),
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
      :height="200"
      :isModal="true"
      :autoOpen="false"
      :resizable="false"
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
