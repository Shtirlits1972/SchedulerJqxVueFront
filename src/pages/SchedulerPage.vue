<template>
  <JqxScheduler
    v-if="dataAdapter && schedulerDate"
    ref="schedulerRef"
    :width="'100%'"
    :height="600"
    :source="dataAdapter"
    :date="schedulerDate"
    :showLegend="true"
    :view="schedulerView"
    :appointmentDataFields="appointmentDataFields"
    :views="views"
    :localization="schedulerLocalization"
    :editDialogDateTimeFormatString="'dd.MM.yyyy HH:mm'"
    :editDialogDateFormatString="'dd.MM.yyyy'"
    :contextMenuCreate="contextMenuCreate"
    :contextMenuItemClick="contextMenuItemClick"
    :contextMenuOpen="contextMenuOpen"
    :contextMenuClose="contextMenuClose"
    :renderAppointment="renderAppointment"
    @appointmentChange="handleAppointmentChange"
    @dateChange="handleSchedulerDateChange"
    @viewChange="handleSchedulerViewChange"
  />

  <!-- Окно-подтверждение удаления (с кнопками "Да" / "Нет"). -->
  <JqxWindow
    ref="deleteConfirmWindowRef"
    :width="360"
    :height="170"
    :isModal="true"
    :autoOpen="false"
    :resizable="false"
    :showCloseButton="false"
  >
    <div>Подтверждение</div>
    <div class="confirm">
      <p class="confirm__text">{{ isDeletingAppointment ? 'Удаление...' : 'Хотите удалить?' }}</p>
      <div class="confirm__actions">
        <button
          class="confirm__button confirm__button--ghost"
          type="button"
          :disabled="isDeletingAppointment"
          @click="confirmDelete(false)"
        >
          Нет
        </button>
        <button
          class="confirm__button"
          type="button"
          :disabled="isDeletingAppointment"
          @click="confirmDelete(true)"
        >
          Да
        </button>
      </div>
    </div>
  </JqxWindow>

  <!-- Окно для "Добавить" / "Редактировать" (пока без формы, только каркас). -->
  <JqxWindow
    ref="editWindowRef"
    :width="520"
    :height="420"
    :isModal="true"
    :autoOpen="false"
    :resizable="false"
    @open="handleEditWindowOpen"
  >
    <div>{{ editWindowTitle }}</div>
    <div class="editor">
      <table class="editor__table">
        <tbody>
          <tr>
            <td class="editor__label">Мастер</td>
            <td class="editor__control">
              <JqxDropDownList
                :source="usersDataAdapter ?? []"
                :displayMember="'usersName'"
                :valueMember="'id'"
                :width="'100%'"
                :height="32"
                :autoDropDownHeight="true"
                :selectedIndex="masterSelectedIndex"
                :placeHolder="'Выберите мастера'"
                @select="handleMasterSelect"
              />
            </td>
          </tr>
          <tr>
            <td class="editor__label">Локация</td>
            <td class="editor__control">
              <JqxDropDownList
                :source="locationsDataAdapter ?? []"
                :displayMember="'nameLocation'"
                :valueMember="'id'"
                :width="'100%'"
                :height="32"
                :autoDropDownHeight="true"
                :selectedIndex="locationSelectedIndex"
                :placeHolder="'Выберите локацию'"
                @select="handleLocationSelect"
              />
            </td>
          </tr>
          <tr>
            <td class="editor__label">Начало</td>
            <td class="editor__control">
              <JqxDateTimeInput
                ref="startDateTimeRef"
                :value="editForm.start"
                :width="'100%'"
                :height="32"
                :culture="jqxLocale"
                :formatString="'dd.MM.yyyy HH:mm'"
                :showTimeButton="true"
                :firstDayOfWeek="jqxLocalization.firstDay"
                :todayString="jqxLocalization.todayString"
                :clearString="jqxLocalization.clearString"
                :autoCreate="false"
                @open="handleDateTimeInputOpen"
                @valueChanged="handleStartChanged"
              />
            </td>
          </tr>
          <tr>
            <td class="editor__label">Окончание</td>
            <td class="editor__control">
              <JqxDateTimeInput
                ref="endDateTimeRef"
                :value="editForm.end"
                :width="'100%'"
                :height="32"
                :culture="jqxLocale"
                :formatString="'dd.MM.yyyy HH:mm'"
                :showTimeButton="true"
                :firstDayOfWeek="jqxLocalization.firstDay"
                :todayString="jqxLocalization.todayString"
                :clearString="jqxLocalization.clearString"
                :autoCreate="false"
                @open="handleDateTimeInputOpen"
                @valueChanged="handleEndChanged"
              />
            </td>
          </tr>
          <tr>
            <td class="editor__label">Тема</td>
            <td class="editor__control">
              <!--
                Важно: у `vue_jqxinput.vue` дефолт `inlineAutoComplete` задан некорректно (""),
                из-за чего jqxInput иногда включает inline-auto-complete и падает на `.jqx-input-inline`.
                Поэтому явно отключаем.
              -->
              <JqxInput v-model="editForm.subject" :width="'100%'" :height="32" :inlineAutoComplete="false" />
            </td>
          </tr>
          <tr>
            <td class="editor__label">Описание</td>
            <td class="editor__control">
              <JqxInput
                v-model="editForm.description"
                :width="'100%'"
                :height="32"
                :inlineAutoComplete="false"
              />
            </td>
          </tr>
          <tr>
            <td class="editor__label">Статус</td>
            <td class="editor__control">
              <JqxDropDownList
                :source="STATUS_OPTIONS"
                :width="'100%'"
                :height="32"
                :autoDropDownHeight="true"
                :selectedIndex="statusSelectedIndex"
                :placeHolder="'Выберите статус'"
                @select="handleStatusSelect"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="editWindowMode === 'edit' && editWindowAppointmentId !== null" class="editor__hint">
        ID события: {{ editWindowAppointmentId }}
      </p>

      <div class="editor__actions">
        <button
          class="editor__button editor__button--ghost"
          type="button"
          @click="cancelEditWindow"
        >
          Отмена
        </button>
        <button class="editor__button" type="button" :disabled="isSavingEditWindow" @click="saveEditWindow">
          {{ isSavingEditWindow ? 'Сохранение...' : 'Сохранить' }}
        </button>
      </div>
    </div>
  </JqxWindow>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import JqxScheduler from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxscheduler.vue'
import JqxWindow from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxwindow.vue'
import JqxDropDownList from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxdropdownlist.vue'
import JqxDateTimeInput from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxdatetimeinput.vue'
import JqxInput from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxinput.vue'
import { getApiBaseUrl } from '../config/api'
import { useAuth } from '../stores/auth'
import { jqxLocale, jqxLocalization } from '../config/jqxLocalization'

type ScheduleEvent = {
  id: number
  masterId: number
  masterName: string
  locationId: number
  nameLocation: string
  start_event: string
  finish_event: string
  subject: string
  description: string
  status: string
  color: string
}

type ScheduleEventCreateRequest = {
  id: number
  masterId: number
  masterName: string
  locationId: number
  nameLocation: string
  start_event: string
  finish_event: string
  subject: string
  description: string
  status: string
  color: string
}

type LocationRow = {
  id: number
  nameLocation: string
  color: string
}

type UserRow = {
  id: number
  email: string
  password: string
  role: string
  usersName: string
  isAppruved: boolean
}

type JqxDataAdapter = { dataBind?: () => void }
type JqxDateInstance = { toDate?: () => Date; clearTime?: () => unknown }
type JqxGlobal = Window & {
  jqx?: {
    dataAdapter?: new (...args: unknown[]) => JqxDataAdapter
    date?: new (...args: unknown[]) => JqxDateInstance
  }
}

type GlobalizeInstance = {
  culture?: (cultureName?: string) => unknown
}

const getGlobalize = (): GlobalizeInstance | null => {
  const candidate = (globalThis as unknown as { Globalize?: unknown }).Globalize
  if (typeof candidate !== 'function' && (typeof candidate !== 'object' || candidate === null)) return null

  const culture = (candidate as { culture?: unknown }).culture
  if (typeof culture !== 'function') return null

  return candidate as GlobalizeInstance
}

const applyGlobalizeCulture = () => {
  const globalize = getGlobalize()
  if (!globalize) return
  try {
    // Важно: Scheduler берёт формат времени из текущей культуры Globalize.
    // Для `ru-RU` это 24-часовой формат, без AM/PM.
    globalize.culture?.(jqxLocale)
  } catch (error) {
    console.warn('[scheduler] Не удалось применить культуру Globalize', error)
  }
}

const API_BASE_URL = getApiBaseUrl()
const API_URL = `${API_BASE_URL.replace(/\/$/, '')}/api/ScheduleEvents`
const LOCATIONS_API_URL = `${API_BASE_URL.replace(/\/$/, '')}/api/Location`
const USERS_API_URL = `${API_BASE_URL.replace(/\/$/, '')}/api/Users`

const auth = useAuth()
const token = auth.token

// Дата для Scheduler должна быть именно jqx.date (иначе внутри Scheduler будет ошибка `clearTime is not a function`).
const schedulerDate = ref<JqxDateInstance | null>(null)
type SchedulerViewType = 'dayView' | 'weekView' | 'monthView'
const schedulerView = ref<SchedulerViewType>('monthView')

const isJqxDateInstance = (value: unknown): value is JqxDateInstance => {
  if (typeof value !== 'object' || value === null) return false
  return typeof (value as { toDate?: unknown }).toDate === 'function'
}

type SchedulerDateChangeEvent = {
  args?: {
    date?: unknown
  }
}

const handleSchedulerDateChange = (event: unknown) => {
  const date = (event as SchedulerDateChangeEvent | null)?.args?.date
  if (isJqxDateInstance(date)) {
    schedulerDate.value = date
  }
}

type SchedulerViewChangeEvent = {
  args?: {
    date?: unknown
    newViewType?: unknown
  }
}

const isSchedulerViewType = (value: unknown): value is SchedulerViewType =>
  value === 'dayView' || value === 'weekView' || value === 'monthView'

const handleSchedulerViewChange = (event: unknown) => {
  const args = (event as SchedulerViewChangeEvent | null)?.args
  if (!args) return

  if (isSchedulerViewType(args.newViewType)) {
    schedulerView.value = args.newViewType
  }

  if (isJqxDateInstance(args.date)) {
    schedulerDate.value = args.date
  }
}

// Локализация для jqxDateTimeInput.
// У этого виджета структура отличается от Scheduler-а: нужные нам названия лежат в localization.calendar.*.
const dateTimeInputLocalization: Record<string, unknown> = {
  backString: jqxLocalization.backString,
  forwardString: jqxLocalization.forwardString,
  todayString: jqxLocalization.todayString,
  clearString: jqxLocalization.clearString,
  calendar: {
    name: jqxLocale,
    '/': '.',
    ':': ':',
    firstDay: jqxLocalization.firstDay,
    days: jqxLocalization.days,
    months: jqxLocalization.months,
    // В русской культуре используется 24-часовой формат, поэтому AM/PM не нужны.
    AM: null,
    PM: null,
    eras: [{ name: 'н.э.', start: null, offset: 0 }],
    twoDigitYearMax: 2029,
    patterns: {
      ...jqxLocalization.patterns,
      S: "yyyy'-'MM'-'dd'T'HH':'mm':'ss",
      ISO: 'yyyy-MM-dd HH:mm:ss',
    },
  },
}

// Локализация для Scheduler (сама русификация берётся из `src/config/jqxLocalization.ts`).
const schedulerLocalization = jqxLocalization

type EditEventForm = {
  masterId: string
  locationId: string
  start: Date | null
  end: Date | null
  subject: string
  description: string
  status: string
  color: string
}

const STATUS_OPTIONS = ['Free', 'Tentative', 'Busy', 'Out of office'] as const
const DEFAULT_EVENT_COLOR = '#0078D4'

const editForm = reactive<EditEventForm>({
  masterId: '',
  locationId: '',
  start: null,
  end: null,
  subject: '',
  description: '',
  status: STATUS_OPTIONS[0],
  color: DEFAULT_EVENT_COLOR,
})

const toNativeDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (typeof value === 'object' && value !== null) {
    const maybeToDate = (value as { toDate?: unknown }).toDate
    if (typeof maybeToDate === 'function') {
      const parsed = (value as { toDate: () => unknown }).toDate()
      return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null
    }
  }

  return null
}

const normalizeHexColor = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = trimmed.toLowerCase()
  const withoutHash = normalized.startsWith('#') ? normalized.slice(1) : normalized
  const withoutPrefix = withoutHash.startsWith('0x') ? withoutHash.slice(2) : withoutHash

  if (/^[0-9a-f]{6}$/.test(withoutPrefix)) return `#${withoutPrefix}`.toUpperCase()

  if (/^[0-9a-f]{8}$/.test(withoutPrefix)) {
    return `#${withoutPrefix.slice(-6)}`.toUpperCase()
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

type AppointmentRenderData = {
  appointment: unknown
  textColor: string
  background: string
  borderColor: string
  html: string
  cssClass: string
  style: string
  width: number
  height: number
  view: string
}

const renderAppointment = (data: AppointmentRenderData) => {
  const record =
    typeof data.appointment === 'object' && data.appointment !== null ? (data.appointment as Record<string, unknown>) : {}
  const color = normalizeHexColor(record.color)
  if (!color) return data

  return {
    ...data,
    background: color,
    borderColor: color,
    textColor: getContrastingTextColor(color),
  }
}

// Идентификаторы пунктов контекстного меню (используются в обработчиках).
const CONTEXT_MENU_IDS = {
  add: 'add',
  edit: 'edit',
  delete: 'delete',
} as const

// Тип пункта контекстного меню jqxMenu (минимально необходимый нам набор полей).
type ContextMenuItem = { id: string; label: string; items?: ContextMenuItem[] }

// Минимальный контракт jqxMenu, который нужен нам для show/hide пунктов меню.
// Используем его вместо `any`, чтобы TypeScript мог проверять вызовы.
type JqxMenuInstance = {
  jqxMenu: (method: 'showItem' | 'hideItem', itemId: string) => unknown
}

const isJqxMenuInstance = (value: unknown): value is JqxMenuInstance => {
  if (typeof value !== 'object' || value === null) return false
  return typeof (value as { jqxMenu?: unknown }).jqxMenu === 'function'
}

type JqxMenuItemClickEvent = {
  args?: {
    id?: unknown
  }
}

type WindowComponent = { open?: () => void; close?: () => void }

// Запоминаем id события, которое пользователь собирается удалить (нужно для вывода в консоль).
const pendingDeleteAppointmentId = ref<string | number | null>(null)
const deleteConfirmWindowRef = ref<WindowComponent | null>(null)
const isDeletingAppointment = ref(false)

// Режим окна добавления/редактирования.
type EditWindowMode = 'add' | 'edit'

const editWindowRef = ref<WindowComponent | null>(null)
const editWindowMode = ref<EditWindowMode>('add')
const editWindowAppointmentId = ref<string | number | null>(null)
const editWindowTitle = ref('Добавление')
const isSavingEditWindow = ref(false)

type DateTimeInputComponent = {
  createComponent?: (options: Record<string, unknown>) => void
  setOptions?: (options: Record<string, unknown>) => void
}

const startDateTimeRef = ref<DateTimeInputComponent | null>(null)
const endDateTimeRef = ref<DateTimeInputComponent | null>(null)
const areDateTimeInputsCreated = ref(false)

const createDateTimeInputOptions = (value: Date | null) => ({
  // Важно: задаём локализацию на момент создания компонента, иначе календарь может остаться на английском
  // до переключения view в Scheduler.
  value,
  width: '100%',
  height: 32,
  culture: jqxLocale,
  formatString: 'dd.MM.yyyy HH:mm',
  showTimeButton: true,
  firstDayOfWeek: jqxLocalization.firstDay,
  todayString: jqxLocalization.todayString,
  clearString: jqxLocalization.clearString,
  localization: dateTimeInputLocalization,
})

const createDateTimeInputs = () => {
  if (areDateTimeInputsCreated.value) return

  const startOptions = createDateTimeInputOptions(editForm.start)
  const endOptions = createDateTimeInputOptions(editForm.end)

  startDateTimeRef.value?.createComponent?.(startOptions)
  endDateTimeRef.value?.createComponent?.(endOptions)

  areDateTimeInputsCreated.value = true
}

const applyDateTimeLocalization = () => {
  const options = {
    culture: jqxLocale,
    localization: dateTimeInputLocalization,
    firstDayOfWeek: jqxLocalization.firstDay,
    todayString: jqxLocalization.todayString,
    clearString: jqxLocalization.clearString,
  }
  startDateTimeRef.value?.setOptions?.(options)
  endDateTimeRef.value?.setOptions?.(options)
}

// Срабатывает, когда jqxWindow открылся. Здесь гарантированно можно "дожать" локализацию
// для DateTimePicker (часть jqx-виджетов корректно дорисовывается только в видимом DOM).
const handleEditWindowOpen = () => {
  applyGlobalizeCulture()

  void nextTick().then(() => {
    // Создаём DateTimeInput-ы только когда окно уже открылось (видимый DOM),
    // и сразу задаём русскую локализацию.
    createDateTimeInputs()
    applyDateTimeLocalization()

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        applyDateTimeLocalization()
      })
    } else {
      setTimeout(() => {
        applyDateTimeLocalization()
      }, 0)
    }
  })
}

const openEditWindow = (mode: EditWindowMode, appointmentId?: string | number, appointment?: unknown) => {
  applyGlobalizeCulture()

  editWindowMode.value = mode
  editWindowAppointmentId.value = appointmentId ?? null
  editWindowTitle.value = mode === 'add' ? 'Добавление' : 'Редактирование'

  // Заполняем форму значениями по умолчанию.
  if (mode === 'add') {
    const now = new Date()
    editForm.masterId = ''
    editForm.locationId = ''
    editForm.start = now
    editForm.end = new Date(now.getTime() + 60 * 60 * 1000)
    editForm.subject = ''
    editForm.description = ''
    // Статус тоже обязателен, поэтому по умолчанию оставляем пустым и просим пользователя выбрать.
    editForm.status = ''
    editForm.color = DEFAULT_EVENT_COLOR
  } else {
    const record = typeof appointment === 'object' && appointment !== null ? (appointment as Record<string, unknown>) : {}

    editForm.masterId =
      typeof record.masterId === 'string' || typeof record.masterId === 'number'
        ? String(record.masterId)
        : ''
    editForm.locationId =
      typeof record.locationId === 'string' || typeof record.locationId === 'number'
        ? String(record.locationId)
        : ''
    editForm.subject = String(record.subject ?? '')
    editForm.description = String(record.description ?? '')
    editForm.status = String(record.status ?? STATUS_OPTIONS[0])
    const locationId = Number(editForm.locationId)
    const locationColor = Number.isFinite(locationId)
      ? normalizeHexColor(locationsSource.localdata.find((row) => row.id === locationId)?.color)
      : null
    editForm.color = locationColor ?? normalizeHexColor(record.color) ?? DEFAULT_EVENT_COLOR

    const startCandidate =
      record.start_event ?? record.from ?? record.start ?? record.startDate ?? record.dateFrom
    const endCandidate = record.finish_event ?? record.to ?? record.end ?? record.endDate ?? record.dateTo

    const start = toNativeDate(startCandidate) ?? new Date()
    const end = toNativeDate(endCandidate) ?? new Date(start.getTime() + 60 * 60 * 1000)

    editForm.start = start
    editForm.end = end
  }

  // Открываем окно после обновления DOM.
  void nextTick().then(() => {
    editWindowRef.value?.open?.()
  })
}

const closeEditWindow = () => {
  editWindowRef.value?.close?.()
}

const statusSelectedIndex = computed(() => {
  if (!editForm.status) return -1
  const index = STATUS_OPTIONS.findIndex((item) => item === editForm.status)
  return index >= 0 ? index : -1
})

const masterSelectedIndex = computed(() => {
  const id = Number(editForm.masterId)
  if (!Number.isFinite(id)) return -1
  const index = usersSource.localdata.findIndex((item) => item.id === id)
  return index >= 0 ? index : -1
})

const locationSelectedIndex = computed(() => {
  const id = Number(editForm.locationId)
  if (!Number.isFinite(id)) return -1
  const index = locationsSource.localdata.findIndex((item) => item.id === id)
  return index >= 0 ? index : -1
})

const validateCreateForm = ():
  | { ok: true; payload: ScheduleEventCreateRequest }
  | { ok: false; message: string } => {
  const masterIdRaw = editForm.masterId.trim()
  const locationIdRaw = editForm.locationId.trim()
  const statusRaw = editForm.status.trim()

  if (!masterIdRaw) return { ok: false, message: 'Пожалуйста, выберите мастера.' }
  if (!locationIdRaw) return { ok: false, message: 'Пожалуйста, выберите локацию.' }
  if (!statusRaw) return { ok: false, message: 'Пожалуйста, выберите статус.' }

  const masterId = Number(masterIdRaw)
  if (!Number.isFinite(masterId)) return { ok: false, message: 'Некорректный мастер (id).' }

  const locationId = Number(locationIdRaw)
  if (!Number.isFinite(locationId)) return { ok: false, message: 'Некорректная локация (id).' }

  const master = usersSource.localdata.find((item) => item.id === masterId)
  if (!master) return { ok: false, message: 'Выбранный мастер не найден в списке.' }

  const location = locationsSource.localdata.find((item) => item.id === locationId)
  if (!location) return { ok: false, message: 'Выбранная локация не найдена в списке.' }

  const start = editForm.start
  const end = editForm.end
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
    return { ok: false, message: 'Пожалуйста, укажите корректную дату/время начала.' }
  }
  if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
    return { ok: false, message: 'Пожалуйста, укажите корректную дату/время окончания.' }
  }
  if (end.getTime() <= start.getTime()) {
    return { ok: false, message: 'Дата/время окончания должно быть больше даты/времени начала.' }
  }

  const color = normalizeHexColor(location.color) ?? DEFAULT_EVENT_COLOR
  editForm.color = color

  return {
    ok: true,
    payload: {
      id: 0,
      masterId,
      masterName: master.usersName,
      locationId,
      nameLocation: location.nameLocation,
      start_event: start.toISOString(),
      finish_event: end.toISOString(),
      subject: editForm.subject.trim(),
      description: editForm.description.trim(),
      status: statusRaw,
      color,
    },
  }
}

const parseScheduleEvent = (raw: unknown): ScheduleEvent | null => {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>

  const id = Number(record.id)
  if (!Number.isFinite(id)) return null

  return {
    id,
    masterId: Number(record.masterId ?? 0),
    masterName: String(record.masterName ?? ''),
    locationId: Number(record.locationId ?? 0),
    nameLocation: String(record.nameLocation ?? ''),
    start_event: String(record.start_event ?? ''),
    finish_event: String(record.finish_event ?? ''),
    subject: String(record.subject ?? ''),
    description: String(record.description ?? ''),
    status: String(record.status ?? ''),
    color: String(record.color ?? ''),
  }
}

type JqxDataAdapterConstructor = new (...args: unknown[]) => JqxDataAdapter
let jqxDataAdapterCtor: JqxDataAdapterConstructor | null = null

const rebuildSchedulerAdapter = () => {
  if (!jqxDataAdapterCtor) return
  dataAdapter.value = new jqxDataAdapterCtor(source, { autoBind: true })
}

const createScheduleEvent = async (payload: ScheduleEventCreateRequest): Promise<ScheduleEvent | null> => {
  auth.dropExpiredToken()
  if (!token.value) {
    console.warn('[scheduler] Не найден токен авторизации. Событие не будет создано.')
    return null
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Accept: 'text/plain, application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }

    const text = await response.text()
    let parsed: unknown = null
    try {
      parsed = text ? (JSON.parse(text) as unknown) : null
    } catch {
      parsed = null
    }

    const created = parseScheduleEvent(parsed)
    if (!created) {
      console.warn('[scheduler] Созданное событие не удалось распарсить', parsed)
      return null
    }

    created.color = payload.color
    return created
  } catch (error) {
    console.error('[scheduler] Не удалось создать событие', error)
    return null
  }
}

const updateScheduleEvent = async (payload: ScheduleEventCreateRequest): Promise<ScheduleEvent | null> => {
  auth.dropExpiredToken()
  if (!token.value) {
    console.warn('[scheduler] Не найден токен авторизации. Событие не будет обновлено.')
    return null
  }

  try {
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }

    const text = await response.text()
    let parsed: unknown = null
    try {
      parsed = text ? (JSON.parse(text) as unknown) : null
    } catch {
      parsed = null
    }

    const updated = parseScheduleEvent(parsed)
    if (updated) {
      updated.color = payload.color
      return updated
    }

    // Некоторые реализации API возвращают пустое тело/не-JSON при 200.
    // В этом случае считаем, что обновление прошло успешно, и обновляем Scheduler локальными данными.
    return payload as unknown as ScheduleEvent
  } catch (error) {
    console.error('[scheduler] Не удалось обновить событие', error)
    return null
  }
}

const appendEventToScheduler = (event: ScheduleEvent) => {
  const index = source.localdata.findIndex((item) => item.id === event.id)
  if (index >= 0) {
    source.localdata.splice(index, 1, event)
  } else {
    source.localdata.push(event)
  }

  rebuildSchedulerAdapter()
}

const deleteScheduleEvent = async (eventId: number): Promise<boolean> => {
  auth.dropExpiredToken()
  if (!token.value) {
    console.warn('[scheduler] Не найден токен авторизации. Событие не будет удалено.')
    return false
  }

  const requestUrl = `${API_URL}/${encodeURIComponent(String(eventId))}`

  try {
    const response = await fetch(requestUrl, {
      method: 'DELETE',
      headers: {
        Accept: '*/*',
        Authorization: `Bearer ${token.value}`,
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error('[scheduler] Не удалось удалить событие', {
        id: eventId,
        status: response.status,
        statusText: response.statusText,
        body,
      })
      return false
    }

    return true
  } catch (error) {
    console.error('[scheduler] Не удалось удалить событие', error)
    return false
  }
}

const removeEventFromScheduler = (eventId: number) => {
  const index = source.localdata.findIndex((item) => item.id === eventId)
  if (index >= 0) {
    source.localdata.splice(index, 1)
  }

  rebuildSchedulerAdapter()
}

// Нажали "Сохранить".
// В режиме "Добавить" отправляем POST в API и при успехе добавляем событие в Scheduler.
const saveEditWindow = async () => {
  const validation = validateCreateForm()
  if (!validation.ok) {
    alert(validation.message)
    return
  }

  if (isSavingEditWindow.value) return
  isSavingEditWindow.value = true
  try {
    if (editWindowMode.value === 'add') {
      const created = await createScheduleEvent(validation.payload)
      if (!created) {
        alert('Не удалось добавить событие. Подробности смотрите в консоли браузера.')
        return
      }

      // В случае успеха добавляем событие в Scheduler без перезагрузки страницы.
      appendEventToScheduler(created)
      closeEditWindow()
      return
    }

    const rawId = editWindowAppointmentId.value
    const eventId = typeof rawId === 'string' || typeof rawId === 'number' ? Number(rawId) : NaN
    if (!Number.isFinite(eventId)) {
      alert('Не удалось определить id редактируемого события.')
      return
    }

    const payload: ScheduleEventCreateRequest = { ...validation.payload, id: eventId }
    const updated = await updateScheduleEvent(payload)
    if (!updated) {
      alert('Не удалось обновить событие. Подробности смотрите в консоли браузера.')
      return
    }

    appendEventToScheduler(updated)
    closeEditWindow()
  } finally {
    isSavingEditWindow.value = false
  }
}

// Нажали "Отмена" (пока заглушка, просто закрываем окно).
const cancelEditWindow = () => {
  closeEditWindow()
}

type JqxDropDownSelectEvent = {
  args?: {
    item?: {
      value?: unknown
    }
  }
}

const handleMasterSelect = (event: unknown) => {
  const item = (event as JqxDropDownSelectEvent | null)?.args?.item
  const value = item?.value
  if (typeof value === 'string' || typeof value === 'number') {
    editForm.masterId = String(value)
  }
}

const handleLocationSelect = (event: unknown) => {
  const item = (event as JqxDropDownSelectEvent | null)?.args?.item
  const value = item?.value
  if (typeof value === 'string' || typeof value === 'number') {
    editForm.locationId = String(value)

    const locationId = Number(value)
    if (Number.isFinite(locationId)) {
      const location = locationsSource.localdata.find((row) => row.id === locationId)
      editForm.color = normalizeHexColor(location?.color) ?? DEFAULT_EVENT_COLOR
    }
  }
}

const handleStatusSelect = (event: unknown) => {
  const item = (event as JqxDropDownSelectEvent | null)?.args?.item
  const value = item?.value
  if (typeof value === 'string') {
    editForm.status = value
  }
}

type JqxDateTimeInputValueChangedEvent = {
  args?: {
    date?: unknown
    value?: unknown
  }
}

const handleStartChanged = (event: unknown) => {
  const args = (event as JqxDateTimeInputValueChangedEvent | null)?.args
  const value = args?.date ?? args?.value
  const parsed = toNativeDate(value)
  if (parsed) {
    editForm.start = parsed
  }
}

const handleEndChanged = (event: unknown) => {
  const args = (event as JqxDateTimeInputValueChangedEvent | null)?.args
  const value = args?.date ?? args?.value
  const parsed = toNativeDate(value)
  if (parsed) {
    editForm.end = parsed
  }
}

// Срабатывает при открытии выпадающего календаря у DateTimeInput.
// Здесь повторно применяем культуру/локализацию, чтобы календарь гарантированно был на русском.
const handleDateTimeInputOpen = () => {
  applyGlobalizeCulture()

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      applyDateTimeLocalization()
    })
  } else {
    setTimeout(() => {
      applyDateTimeLocalization()
    }, 0)
  }
}

type SchedulerAppointmentChangeEvent = {
  args?: {
    appointment?: unknown
  }
}

const appointmentChangeInFlightIds = new Set<number>()

const handleAppointmentChange = async (event: unknown) => {
  if (isSavingEditWindow.value) return

  const appointment = (event as SchedulerAppointmentChangeEvent | null)?.args?.appointment
  if (typeof appointment !== 'object' || appointment === null) return

  const boundAppointment = appointment as Record<string, unknown>
  const rawId = boundAppointment.id
  const appointmentId = typeof rawId === 'string' || typeof rawId === 'number' ? Number(rawId) : NaN
  if (!Number.isFinite(appointmentId)) {
    console.warn('[scheduler] appointmentChange: не удалось определить id события', boundAppointment)
    return
  }

  if (appointmentChangeInFlightIds.has(appointmentId)) return
  appointmentChangeInFlightIds.add(appointmentId)
  try {
    const originalData =
      typeof boundAppointment.originalData === 'object' && boundAppointment.originalData !== null
        ? (boundAppointment.originalData as Record<string, unknown>)
        : null

    const startCandidate = boundAppointment.from ?? originalData?.start_event ?? originalData?.from
    const endCandidate = boundAppointment.to ?? originalData?.finish_event ?? originalData?.to

    const start = toNativeDate(startCandidate)
    const end = toNativeDate(endCandidate)
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      console.warn('[scheduler] appointmentChange: некорректная дата начала', { appointmentId, startCandidate })
      return
    }
    if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
      console.warn('[scheduler] appointmentChange: некорректная дата окончания', { appointmentId, endCandidate })
      return
    }
    if (end.getTime() <= start.getTime()) {
      console.warn('[scheduler] appointmentChange: окончание <= начало', {
        appointmentId,
        start: start.toISOString(),
        end: end.toISOString(),
      })
      return
    }

    const existing = source.localdata.find((item) => item.id === appointmentId) ?? null
    const previousStart = toNativeDate(existing?.start_event)
    const previousEnd = toNativeDate(existing?.finish_event)
    if (
      previousStart &&
      previousEnd &&
      previousStart.getTime() === start.getTime() &&
      previousEnd.getTime() === end.getTime()
    ) {
      return
    }

    const masterId = existing?.masterId ?? Number(originalData?.masterId)
    const locationId = existing?.locationId ?? Number(originalData?.locationId)
    if (!Number.isFinite(masterId) || !Number.isFinite(locationId)) {
      console.warn('[scheduler] appointmentChange: не удалось определить masterId/locationId', {
        appointmentId,
        masterId,
        locationId,
        originalData,
      })
      return
    }

    const master = usersSource.localdata.find((item) => item.id === masterId)
    const location = locationsSource.localdata.find((item) => item.id === locationId)

    const color = normalizeHexColor(location?.color) ?? normalizeHexColor(existing?.color) ?? DEFAULT_EVENT_COLOR

    const payload: ScheduleEventCreateRequest = {
      id: appointmentId,
      masterId,
      masterName: master?.usersName ?? (existing?.masterName ?? String(originalData?.masterName ?? '')),
      locationId,
      nameLocation: location?.nameLocation ?? (existing?.nameLocation ?? String(originalData?.nameLocation ?? '')),
      start_event: start.toISOString(),
      finish_event: end.toISOString(),
      subject: String(existing?.subject ?? originalData?.subject ?? '').trim(),
      description: String(existing?.description ?? originalData?.description ?? '').trim(),
      status: String(existing?.status ?? originalData?.status ?? '').trim(),
      color,
    }

    const updated = await updateScheduleEvent(payload)
    if (!updated) {
      alert('Не удалось обновить событие после перемещения/изменения длительности. Подробности смотрите в консоли.')
      // Если изменения уже успели попасть в Scheduler, синхронизируемся с сервером.
      await fetchScheduleEvents()
      rebuildSchedulerAdapter()
      return
    }

    appendEventToScheduler(updated)
  } finally {
    appointmentChangeInFlightIds.delete(appointmentId)
  }
}

const openDeleteConfirm = (appointmentId: string | number | undefined) => {
  const normalizedId =
    typeof appointmentId === 'string' || typeof appointmentId === 'number' ? appointmentId : null
  if (normalizedId === null) {
    console.warn('[scheduler] Не удалось определить id события для удаления.', appointmentId)
    return
  }

  pendingDeleteAppointmentId.value = normalizedId
  deleteConfirmWindowRef.value?.open?.()
}

const closeDeleteConfirm = () => {
  deleteConfirmWindowRef.value?.close?.()
}

// Обработчик кнопок "Да" / "Нет" в окне подтверждения.
const confirmDelete = async (isConfirmed: boolean) => {
  if (!isConfirmed) {
    if (isDeletingAppointment.value) return
    pendingDeleteAppointmentId.value = null
    closeDeleteConfirm()
    return
  }

  const rawId = pendingDeleteAppointmentId.value
  const eventId = typeof rawId === 'string' || typeof rawId === 'number' ? Number(rawId) : NaN
  if (!Number.isFinite(eventId)) {
    console.warn('[scheduler] Некорректный id события для удаления', rawId)
    pendingDeleteAppointmentId.value = null
    closeDeleteConfirm()
    return
  }

  if (isDeletingAppointment.value) return
  isDeletingAppointment.value = true
  try {
    const ok = await deleteScheduleEvent(eventId)
    if (!ok) {
      alert('Не удалось удалить событие. Подробности смотрите в консоли браузера.')
      return
    }

    removeEventFromScheduler(eventId)
    pendingDeleteAppointmentId.value = null
    closeDeleteConfirm()
  } finally {
    isDeletingAppointment.value = false
  }
}

// Вызывается один раз при создании контекстного меню.
// Здесь мы полностью переопределяем пункты меню под наш сценарий.
const contextMenuCreate = (_menu: unknown, settings: { source: ContextMenuItem[] }) => {
  // Важно: settings.source уже содержит дефолтные пункты Scheduler-а.
  // Нам они не нужны, поэтому очищаем массив и добавляем только свои пункты.
  settings.source.length = 0
  settings.source.push({ id: CONTEXT_MENU_IDS.add, label: 'Добавить' })
  settings.source.push({ id: CONTEXT_MENU_IDS.edit, label: 'Редактировать' })
  settings.source.push({ id: CONTEXT_MENU_IDS.delete, label: 'Удалить' })
}

// Вызывается при открытии контекстного меню.
// appointment === null/undefined означает, что меню открыто НЕ по событию (по пустой ячейке/области).
const contextMenuOpen = (menu: unknown, appointment: unknown) => {
  if (!isJqxMenuInstance(menu)) return

  const openedOnAppointment = Boolean(appointment)

  if (openedOnAppointment) {
    // В зоне события: показываем "редактировать" и "удалить".
    menu.jqxMenu('hideItem', CONTEXT_MENU_IDS.add)
    menu.jqxMenu('showItem', CONTEXT_MENU_IDS.edit)
    menu.jqxMenu('showItem', CONTEXT_MENU_IDS.delete)
    return
  }

  // Вне события: показываем только "добавить".
  menu.jqxMenu('showItem', CONTEXT_MENU_IDS.add)
  menu.jqxMenu('hideItem', CONTEXT_MENU_IDS.edit)
  menu.jqxMenu('hideItem', CONTEXT_MENU_IDS.delete)
}

// Вызывается при клике по пункту контекстного меню.
// Возвращаем true, чтобы отключить встроенную обработку Scheduler-а.
const contextMenuItemClick = (_menu: unknown, appointment: unknown, event: unknown) => {
  const args = (event as JqxMenuItemClickEvent | null)?.args
  const clickedId = typeof args?.id === 'string' ? args.id : undefined

  const appointmentId = (() => {
    const id = (appointment as { id?: unknown } | null)?.id
    return typeof id === 'string' || typeof id === 'number' ? id : undefined
  })()

  switch (clickedId) {
    case CONTEXT_MENU_IDS.add:
      // При выборе "Добавить" открываем окно-заглушку.
      openEditWindow('add')
      return true
    case CONTEXT_MENU_IDS.edit:
      // При выборе "Редактировать" открываем окно-заглушку и передаем id события.
      openEditWindow('edit', appointmentId, appointment)
      return true
    case CONTEXT_MENU_IDS.delete:
      openDeleteConfirm(appointmentId)
      return true
    default:
      return false
  }
}

// Вызывается при закрытии контекстного меню (пока не используем, оставляем как заглушку).
const contextMenuClose = () => {}

const appointmentDataFields = {
  from: 'start_event',
  to: 'finish_event',
  id: 'id',
  description: 'description',
  location: 'nameLocation',
  subject: 'subject',
  status: 'status',
  // Дополнительные поля, которые нам удобно иметь в объекте события.
  masterId: 'masterId',
  masterName: 'masterName',
  locationId: 'locationId',
  nameLocation: 'nameLocation',
  color: 'color',
}

// Важно: по умолчанию в day/week view таймлайн рисуется в 12-часовом формате ("hh tt"),
// поэтому явно задаём 24-часовой формат через timeRuler.formatString.
const views = [
  { type: 'dayView', timeRuler: { formatString: 'HH:mm' } },
  { type: 'weekView', timeRuler: { formatString: 'HH:mm' } },
  // В month view время в tooltip по умолчанию форматируется как "hh:mm" (12-часовой формат).
  // Передаём formatString, чтобы и там было 24 часа.
  { type: 'monthView', timeRuler: { formatString: 'HH:mm' } },
]

const source = {
  datatype: 'array',
  datafields: [
    { name: 'id', type: 'int' },
    { name: 'masterId', type: 'int' },
    { name: 'masterName', type: 'string' },
    { name: 'locationId', type: 'int' },
    { name: 'nameLocation', type: 'string' },
    { name: 'start_event', type: 'date' },
    { name: 'finish_event', type: 'date' },
    { name: 'description', type: 'string' },
    { name: 'subject', type: 'string' },
    { name: 'status', type: 'string' },
    { name: 'color', type: 'string' },
  ],
  id: 'id',
  localdata: [] as ScheduleEvent[],
}

const locationsSource = {
  datatype: 'array',
  datafields: [
    { name: 'id', type: 'number' },
    { name: 'nameLocation', type: 'string' },
    { name: 'color', type: 'string' },
  ],
  id: 'id',
  localdata: [] as LocationRow[],
}

const usersSource = {
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

const getJqx = () => (typeof window !== 'undefined' ? (window as JqxGlobal).jqx : undefined)

const formatDateForApi = (value: Date) => {
  // API ожидает формат YYYY-MM-DD (как в примере из curl).
  const yyyy = value.getFullYear()
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  const dd = String(value.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const parseScheduleEvents = (raw: unknown): ScheduleEvent[] => {
  if (!Array.isArray(raw)) return []

  const result: ScheduleEvent[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue

    const record = item as Record<string, unknown>
    const id = Number(record.id)
    if (!Number.isFinite(id)) continue

    result.push({
      id,
      masterId: Number(record.masterId ?? 0),
      masterName: String(record.masterName ?? ''),
      locationId: Number(record.locationId ?? 0),
      nameLocation: String(record.nameLocation ?? ''),
      start_event: String(record.start_event ?? ''),
      finish_event: String(record.finish_event ?? ''),
      subject: String(record.subject ?? ''),
      description: String(record.description ?? ''),
      status: String(record.status ?? ''),
      color: String(record.color ?? ''),
    })
  }

  return result
}

const fetchScheduleEvents = async () => {
  auth.dropExpiredToken()
  if (!token.value) {
    console.warn('[scheduler] Не найден токен авторизации. События не будут загружены.')
    source.localdata = []
    return
  }

  const currentDate = schedulerDate.value?.toDate?.() ?? new Date()
  const queryDate = formatDateForApi(currentDate)
  const requestUrl = `${API_URL}?dateTime=${encodeURIComponent(queryDate)}`

  try {
    const response = await fetch(requestUrl, {
      headers: {
        // В swagger этот endpoint может быть помечен как "text/plain", поэтому принимаем оба варианта.
        Accept: 'text/plain, application/json',
        Authorization: `Bearer ${token.value}`,
      },
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }

    // Читаем как текст и пытаемся распарсить JSON (на случай Content-Type: text/plain).
    const text = await response.text()
    let parsed: unknown = []
    try {
      parsed = text ? (JSON.parse(text) as unknown) : []
    } catch {
      parsed = []
    }

    source.localdata = parseScheduleEvents(parsed)
  } catch (error) {
    console.error('[scheduler] Не удалось загрузить события', error)
    source.localdata = []
  }
}

const parseLocations = (raw: unknown): LocationRow[] => {
  if (!Array.isArray(raw)) return []

  const result: LocationRow[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const record = item as Record<string, unknown>

    const id = Number(record.id)
    if (!Number.isFinite(id)) continue

    result.push({
      id,
      nameLocation: String(record.nameLocation ?? ''),
      color: String(record.color ?? record.Color ?? ''),
    })
  }

  return result
}

const fetchLocations = async () => {
  auth.dropExpiredToken()
  if (!token.value) {
    console.warn('[scheduler] Не найден токен авторизации. Локации не будут загружены.')
    locationsSource.localdata = []
    console.log('[scheduler] locations:', [])
    return
  }

  try {
    const response = await fetch(LOCATIONS_API_URL, {
      headers: {
        Accept: 'text/plain, application/json',
        Authorization: `Bearer ${token.value}`,
      },
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }

    const text = await response.text()
    let parsed: unknown = []
    try {
      parsed = text ? (JSON.parse(text) as unknown) : []
    } catch {
      parsed = []
    }

    const payload = parseLocations(parsed)
    locationsSource.localdata = payload

    // По требованию: после загрузки страницы выводим список локаций в консоль.
    console.log('[scheduler] locations:', payload)
  } catch (error) {
    console.error('[scheduler] Не удалось загрузить локации', error)
    locationsSource.localdata = []
  }
}

const parseUsers = (raw: unknown): UserRow[] => {
  if (!Array.isArray(raw)) return []

  const result: UserRow[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const record = item as Record<string, unknown>

    const id = Number(record.id)
    if (!Number.isFinite(id)) continue

    const isAppruved = (() => {
      const value = record.isAppruved
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'true') return true
        if (normalized === 'false') return false
      }
      return Boolean(value)
    })()

    result.push({
      id,
      email: String(record.email ?? ''),
      password: String(record.password ?? ''),
      role: String(record.role ?? ''),
      usersName: String(record.usersName ?? ''),
      isAppruved,
    })
  }

  return result
}

const fetchUsers = async () => {
  auth.dropExpiredToken()
  if (!token.value) {
    console.warn('[scheduler] Не найден токен авторизации. Пользователи не будут загружены.')
    usersSource.localdata = []
    console.log('[scheduler] users:', [])
    return
  }

  try {
    const response = await fetch(USERS_API_URL, {
      headers: {
        Accept: 'text/plain, application/json',
        Authorization: `Bearer ${token.value}`,
      },
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }

    const text = await response.text()
    let parsed: unknown = []
    try {
      parsed = text ? (JSON.parse(text) as unknown) : []
    } catch {
      parsed = []
    }

    const payload = parseUsers(parsed)
    usersSource.localdata = payload

    // По требованию: после загрузки страницы выводим список пользователей в консоль.
    console.log('[scheduler] users:', payload)
  } catch (error) {
    console.error('[scheduler] Не удалось загрузить пользователей', error)
    usersSource.localdata = []
  }
}

const dataAdapter = ref<JqxDataAdapter | null>(null)
const locationsDataAdapter = ref<JqxDataAdapter | null>(null)
const usersDataAdapter = ref<JqxDataAdapter | null>(null)

onMounted(() => {
  // Ставим культуру до инициализации Scheduler, чтобы day/week view сразу рендерились в 24-часовом формате.
  applyGlobalizeCulture()

  const jqx = getJqx()
  if (!jqx?.dataAdapter || !jqx?.date) {
    console.error(
      'jqx не доступен. Проверьте, что jqx-скрипты подключены до загрузки SchedulerPage.',
    )
    return
  }

  // Важно: сохраняем конструктор в переменную, чтобы TypeScript не ругался в async-callback.
  const DataAdapterCtor = jqx.dataAdapter
  const JqxDateCtor = jqx.date
  jqxDataAdapterCtor = DataAdapterCtor as unknown as JqxDataAdapterConstructor

  // Дата для Scheduler: jqx.date со сброшенным временем.
  schedulerDate.value = new JqxDateCtor('todayDate')

  // Сначала показываем Scheduler с пустыми данными, затем подгружаем события с API.
  dataAdapter.value = new DataAdapterCtor(source, { autoBind: true })
  locationsDataAdapter.value = new DataAdapterCtor(locationsSource, { autoBind: true })
  usersDataAdapter.value = new DataAdapterCtor(usersSource, { autoBind: true })

  void Promise.all([fetchScheduleEvents(), fetchLocations(), fetchUsers()]).then(() => {
    dataAdapter.value = new DataAdapterCtor(source, { autoBind: true })
    locationsDataAdapter.value = new DataAdapterCtor(locationsSource, { autoBind: true })
    usersDataAdapter.value = new DataAdapterCtor(usersSource, { autoBind: true })
  })
})
</script>

<style>
/* Стили при необходимости */
.confirm {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.confirm__text {
  margin: 0;
  font-size: 1rem;
}

.confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.confirm__button {
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  background: #0f172a;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.confirm__button--ghost {
  background: #e2e8f0;
  color: #0f172a;
}

.editor {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 160px;
}

.editor__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.6rem;
}

.editor__label {
  padding: 0;
  padding-right: 0.75rem;
  width: 120px;
  vertical-align: middle;
  white-space: nowrap;
  font-weight: 700;
  color: #0f172a;
}

.editor__control {
  padding: 0;
  vertical-align: middle;
}

.editor__text {
  margin: 0;
  font-size: 1rem;
}

.editor__hint {
  margin: 0;
  color: #475569;
}

.editor__actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.editor__button {
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  background: #0f172a;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.editor__button--ghost {
  background: #e2e8f0;
  color: #0f172a;
}
</style>
