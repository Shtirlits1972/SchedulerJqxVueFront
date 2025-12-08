<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
// @ts-expect-error библиотека не публикует готовые типы для Vue-компонентов
import JqxGrid from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxgrid.vue'
// @ts-expect-error библиотека не публикует готовые типы для Vue-компонентов
import JqxWindow from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxwindow.vue'
import { useAuth } from '../stores/auth'
import { getApiBaseUrl } from '../config/api'
import { jqxLocale, jqxLocalization } from '../config/jqxLocalization'

type UserRow = {
  id: number
  email: string
  password: string
  role: string
  usersName: string
  isAppruved: boolean
}

type JqxDataAdapter = { dataBind?: () => void }
type GridComponent = {
  updatebounddata?: (mode?: string) => void
  clearfilters?: () => void
  getrowid?: (rowIndex: number) => unknown
  setcellvalue?: (rowIndex: number, datafield: string, value: unknown) => void
}
type JqxGlobal = Window & { jqx?: { dataAdapter?: new (...args: unknown[]) => JqxDataAdapter } }
type GridEvent = { args?: Record<string, unknown> }
type WindowComponent = { open?: () => void; close?: () => void }

const API_BASE_URL = getApiBaseUrl()
const API_URL = `${API_BASE_URL.replace(/\/$/, '')}/api/Users`

const auth = useAuth()
const gridRef = ref<GridComponent | null>(null)
const dataAdapter = shallowRef<JqxDataAdapter | null>(null)
const errorMessage = ref('')
const isLoading = ref(false)
const isRemoving = ref(false)
const isSaving = ref(false)
const editId = ref<number | null>(null)
const selectedRow = ref<UserRow | null>(null)
const windowRef = ref<WindowComponent | null>(null)
const form = reactive<{
  email: string
  password: string
  usersName: string
  role: 'user' | 'admin'
  isAppruved: boolean
}>({
  email: '',
  password: '',
  usersName: '',
  role: 'user',
  isAppruved: false,
})

const token = computed(() => auth.token.value ?? '')
const isBusy = computed(() => isLoading.value || isRemoving.value || isSaving.value)
const modalTitle = computed(() =>
  editId.value !== null ? 'Редактирование пользователя' : 'Новый пользователь',
)

const source = {
  datatype: 'array',
  datafields: [
    { name: 'id', type: 'number' },
    { name: 'email', type: 'string' },
    { name: 'password', type: 'string' },
    { name: 'role', type: 'string' },
    { name: 'usersName', type: 'string' },
    { name: 'isAppruved', type: 'bool' },
  ],
  id: 'id',
  localdata: [] as UserRow[],
}

const columns = [
  {
    text: 'ID',
    datafield: 'id',
    width: 80,
    cellsalign: 'center',
    align: 'center',
    filtertype: 'number',
    editable: false,
  },
  {
    text: 'Имя',
    datafield: 'usersName',
    filtertype: 'input',
    filtercondition: 'starts_with',
    editable: true,
  },
  {
    text: 'Email',
    datafield: 'email',
    width: 200,
    filtertype: 'input',
    filtercondition: 'contains',
    editable: true,
  },
  {
    text: 'Пароль',
    datafield: 'password',
    width: 160,
    filtertype: 'input',
    filtercondition: 'contains',
    editable: true,
  },
  {
    text: 'Роль',
    datafield: 'role',
    width: 120,
    align: 'center',
    cellsalign: 'center',
    filtertype: 'checkedlist',
    columntype: 'dropdownlist',
    editable: true,
    createeditor: (_row: number, value: string, editor: unknown) => {
      const roles = ['user', 'admin']
      const jqEditor = editor as { jqxDropDownList?: (options: Record<string, unknown>) => void }
      jqEditor?.jqxDropDownList?.({
        source: roles,
        autoDropDownHeight: true,
        selectedIndex: Math.max(roles.indexOf(value), 0),
      })
    },
  },
  {
    text: 'Подтвержден',
    datafield: 'isAppruved',
    width: 150,
    cellsalign: 'center',
    align: 'center',
    columntype: 'checkbox',
    filtertype: 'checkedlist',
    editable: true,
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

const toolbarButtons: {
  add?: HTMLButtonElement | null
  edit?: HTMLButtonElement | null
  remove?: HTMLButtonElement | null
  refresh?: HTMLButtonElement | null
  reset?: HTMLButtonElement | null
} = {}

const updateToolbarState = () => {
  const hasSelection = !!selectedRow.value
  const busy = isBusy.value
  if (toolbarButtons.add) toolbarButtons.add.disabled = busy
  if (toolbarButtons.refresh) toolbarButtons.refresh.disabled = busy
  if (toolbarButtons.reset) toolbarButtons.reset.disabled = busy
  if (toolbarButtons.edit) toolbarButtons.edit.disabled = busy || !hasSelection
  if (toolbarButtons.remove) toolbarButtons.remove.disabled = busy || !hasSelection
}

const fetchUsers = async () => {
  errorMessage.value = ''
  isLoading.value = true
  selectedRow.value = null
  updateToolbarState()
  auth.dropExpiredToken()

  if (!token.value) {
    errorMessage.value = 'Необходима авторизация для загрузки пользователей.'
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

    const payload = (await response.json()) as UserRow[] | unknown
    source.localdata = Array.isArray(payload)
      ? payload.map((item) => ({
          id: Number((item as UserRow).id ?? 0),
          email: String((item as UserRow).email ?? ''),
          password: String((item as UserRow).password ?? ''),
          role: String((item as UserRow).role ?? ''),
          usersName: String((item as UserRow).usersName ?? ''),
          isAppruved: Boolean((item as UserRow).isAppruved),
        }))
      : []

    const adapter = ensureDataAdapter()
    if (adapter) {
      adapter.dataBind?.()
      refreshGrid()
    }
  } catch (error) {
    console.error('[users] load failed', error)
    errorMessage.value =
      error instanceof Error
        ? `Не удалось загрузить пользователей: ${error.message}`
        : 'Не удалось загрузить пользователей'
  } finally {
    isLoading.value = false
    updateToolbarState()
  }
}

onMounted(() => {
  ensureDataAdapter()
  fetchUsers()
})

const handleRowSelect = (event: GridEvent) => {
  const row = event?.args && ((event.args as { row?: unknown }).row as UserRow | undefined)
  if (row && typeof row.id !== 'undefined') {
    selectedRow.value = {
      id: Number(row.id),
      email: String(row.email ?? ''),
      password: String(row.password ?? ''),
      role: String(row.role ?? ''),
      usersName: String(row.usersName ?? ''),
      isAppruved: Boolean(row.isAppruved),
    }
  } else {
    selectedRow.value = null
  }
  updateToolbarState()
}

const buildPayloadFromRow = (
  rowIndex: number,
  datafield: string,
  newValue: unknown,
  currentRow: Partial<UserRow> | null | undefined,
) => {
  const rawId =
    typeof gridRef.value?.getrowid === 'function'
      ? gridRef.value.getrowid(rowIndex)
      : selectedRow.value?.id
  const rowId = Number(rawId ?? 0)
  const foundRow =
    currentRow ||
    source.localdata.find((item) => Number(item.id) === rowId) ||
    (selectedRow.value && Number(selectedRow.value.id) === rowId ? selectedRow.value : null)

  const baseRow: UserRow = {
    id: rowId,
    email: '',
    password: '',
    role: 'user',
    usersName: '',
    isAppruved: false,
    ...(foundRow ?? {}),
  }

  switch (datafield) {
    case 'email':
      baseRow.email = String(newValue ?? '').trim()
      break
    case 'password':
      baseRow.password = String(newValue ?? '').trim()
      break
    case 'usersName':
      baseRow.usersName = String(newValue ?? '').trim()
      break
    case 'role': {
      const role = String(newValue ?? '').trim()
      baseRow.role = role === 'admin' ? 'admin' : 'user'
      break
    }
    case 'isAppruved':
      baseRow.isAppruved = Boolean(newValue)
      break
    default:
      break
  }

  return baseRow
}

const saveInlineEdit = async (event: GridEvent) => {
  const args = (event?.args ?? {}) as Record<string, unknown>
  const datafield = String(args.datafield ?? '')
  const editableFields = ['email', 'password', 'usersName', 'role', 'isAppruved']
  if (!editableFields.includes(datafield)) {
    return true
  }

  const rowIndex = args.rowindex as number | undefined
  if (typeof rowIndex !== 'number' || Number.isNaN(rowIndex)) {
    errorMessage.value = 'Не удалось определить строку для редактирования.'
    return false
  }

  const newValue = args.value
  const oldValue = args.oldvalue
  if (newValue === oldValue) {
    return true
  }

  auth.dropExpiredToken()
  if (!token.value) {
    errorMessage.value = 'Необходима авторизация для редактирования.'
    return false
  }

  const payload = buildPayloadFromRow(
    rowIndex,
    datafield,
    newValue,
    args.row as Partial<UserRow> | undefined,
  )
  if (
    !payload ||
    payload.id === undefined ||
    payload.id === null ||
    Number.isNaN(Number(payload.id))
  ) {
    errorMessage.value = 'Не удалось определить ID пользователя.'
    return false
  }

  isSaving.value = true
  updateToolbarState()
  try {
    const response = await fetch(`${API_URL}/${payload.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }
    await fetchUsers()
    return true
  } catch (error) {
    console.error('[users] inline edit failed', error)
    errorMessage.value =
      error instanceof Error
        ? `Не удалось сохранить пользователя: ${error.message}`
        : 'Не удалось сохранить пользователя'
    if (typeof gridRef.value?.setcellvalue === 'function') {
      gridRef.value.setcellvalue(rowIndex, datafield, oldValue)
    }
    return false
  } finally {
    isSaving.value = false
    updateToolbarState()
  }
}

const removeSelected = async () => {
  if (!selectedRow.value) return
  if (typeof window !== 'undefined') {
    const confirmed = window.confirm(`Удалить пользователя "${selectedRow.value.usersName}"?`)
    if (!confirmed) return
  }

  errorMessage.value = ''
  auth.dropExpiredToken()
  if (!token.value) {
    errorMessage.value = 'Необходима авторизация для удаления.'
    return
  }

  isRemoving.value = true
  updateToolbarState()
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
    await fetchUsers()
  } catch (error) {
    console.error('[users] remove failed', error)
    errorMessage.value =
      error instanceof Error
        ? `Не удалось удалить пользователя: ${error.message}`
        : 'Не удалось удалить пользователя'
  } finally {
    isRemoving.value = false
    updateToolbarState()
  }
}

const resetForm = () => {
  form.email = ''
  form.password = ''
  form.usersName = ''
  form.role = 'user'
  form.isAppruved = false
}

const openCreateWindow = () => {
  errorMessage.value = ''
  editId.value = null
  resetForm()
  if (typeof windowRef.value?.open === 'function') {
    windowRef.value.open()
  }
}

const openEditWindow = () => {
  if (!selectedRow.value) return
  errorMessage.value = ''
  editId.value = selectedRow.value.id
  form.email = selectedRow.value.email
  form.password = selectedRow.value.password
  form.usersName = selectedRow.value.usersName
  form.role = (selectedRow.value.role || 'user') as 'user' | 'admin'
  form.isAppruved = selectedRow.value.isAppruved
  if (typeof windowRef.value?.open === 'function') {
    windowRef.value.open()
  }
}

const closeWindow = () => {
  editId.value = null
  if (typeof windowRef.value?.close === 'function') {
    windowRef.value.close()
  }
}

const saveUser = async () => {
  errorMessage.value = ''
  auth.dropExpiredToken()
  if (!token.value) {
    errorMessage.value = 'Необходима авторизация для добавления.'
    return
  }

  const trimmedEmail = form.email.trim()
  const trimmedPassword = form.password.trim()
  const trimmedName = form.usersName.trim()

  if (!trimmedEmail || !trimmedPassword || !trimmedName) {
    errorMessage.value = 'Заполните Email, Пароль и Имя пользователя.'
    return
  }

  isSaving.value = true
  updateToolbarState()
  try {
    const isEdit = editId.value !== null
    const userId = editId.value ?? 0
    const response = await fetch(isEdit ? `${API_URL}/${userId}` : API_URL, {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({
        id: userId,
        email: trimmedEmail,
        password: trimmedPassword,
        usersName: trimmedName,
        role: form.role,
        isAppruved: form.isAppruved,
      }),
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }

    editId.value = null
    closeWindow()
    await fetchUsers()
  } catch (error) {
    console.error('[users] save failed', error)
    errorMessage.value =
      error instanceof Error
        ? `Не удалось добавить пользователя: ${error.message}`
        : 'Не удалось добавить пользователя'
  } finally {
    isSaving.value = false
    updateToolbarState()
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
    minWidth: '140px',
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
    void fetchUsers()
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
    <p class="page__title">Пользователи</p>

    <p v-if="errorMessage" class="page__error">{{ errorMessage }}</p>
    <p v-else-if="isLoading" class="page__note">Загружаем пользователей...</p>

    <JqxGrid
      v-else
      ref="gridRef"
      :width="'100%'"
      :source="ensureDataAdapter()"
      :columns="columns"
      :autoheight="true"
      :sortable="true"
      :filterable="true"
      :autoshowfiltericon="false"
      :localization="jqxLocalization"
      :locale="jqxLocale"
      :pageable="true"
      :pagesizeoptions="['5', '10', '20', '50', '100']"
      :pagesize="10"
      :showtoolbar="true"
      :toolbarheight="44"
      :rendertoolbar="renderToolbar"
      :altrows="true"
      :columnsresize="true"
      :enablebrowserselection="true"
      :selectionmode="'singlerow'"
      :editable="true"
      :editmode="'dblclick'"
      @rowselect="handleRowSelect"
      @cellendedit="saveInlineEdit"
    />

    <JqxWindow
      ref="windowRef"
      :width="420"
      :height="420"
      :isModal="true"
      :autoOpen="false"
      :resizable="false"
    >
      <div>{{ modalTitle }}</div>
      <div class="modal">
        <label class="modal__field">
          <span class="modal__label">Имя</span>
          <input
            v-model="form.usersName"
            class="modal__input"
            type="text"
            placeholder="Ф.И.О. пользователя"
            :disabled="isSaving"
            required
          />
        </label>
        <label class="modal__field">
          <span class="modal__label">Email</span>
          <input
            v-model="form.email"
            class="modal__input"
            type="email"
            placeholder="user@example.com"
            :disabled="isSaving"
            required
          />
        </label>
        <label class="modal__field">
          <span class="modal__label">Пароль</span>
          <input
            v-model="form.password"
            class="modal__input"
            type="text"
            placeholder="Введите пароль"
            :disabled="isSaving"
            required
          />
        </label>
        <fieldset class="modal__field">
          <span class="modal__label">Роль</span>
          <div class="modal__radios">
            <label class="modal__radio">
              <input
                v-model="form.role"
                type="radio"
                name="user-role"
                value="user"
                :disabled="isSaving"
              />
              <span>Пользователь</span>
            </label>
            <label class="modal__radio">
              <input
                v-model="form.role"
                type="radio"
                name="user-role"
                value="admin"
                :disabled="isSaving"
              />
              <span>Админ</span>
            </label>
          </div>
        </fieldset>
        <label class="modal__checkbox">
          <input v-model="form.isAppruved" type="checkbox" :disabled="isSaving" />
          <span>Подтвержден</span>
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
          <button class="modal__button" type="button" @click="saveUser" :disabled="isSaving">
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
  border: none;
  padding: 0;
  margin: 0;
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

.modal__radios {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.modal__radio {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  color: #0f172a;
}

.modal__checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
  color: #0f172a;
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
