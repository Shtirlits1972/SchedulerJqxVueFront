// Небольшие патчи/фиксы для jqxWidgets.
//
// Важно: это именно "страховка" от багов в библиотеке, чтобы приложение не падало в рантайме.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isDomElement = (value: unknown): value is Element =>
  typeof Element !== 'undefined' && value instanceof Element

const hasInlineLabel = (element: unknown): boolean => {
  if (!isDomElement(element)) return false
  return Boolean(element.querySelector('.jqx-input-inline'))
}

/**
 * jqxInput: защита от падения при inlineAutoComplete.
 *
 * В `jqxinput.js` есть проблемное место:
 * когда `inlineAutoComplete=true`, но элемент `.jqx-input-inline` НЕ создан,
 * то при отсутствии совпадений по `source` происходит ошибка:
 * `Cannot read properties of null (reading 'style')`.
 *
 * Это чаще всего проявляется, когда используется НЕ material-тема (inline-лейбл не создаётся),
 * но `inlineAutoComplete` по какой-то причине оказался включён (truthy).
 *
 * Решение: если `.jqx-input-inline` отсутствует — принудительно выключаем `inlineAutoComplete`
 * у текущего инстанса перед выполнением оригинального `load()`.
 */
export const patchJqxInputInlineAutoCompleteCrash = (): void => {
  const globalObj = globalThis as unknown as Record<string, unknown>
  const jqxBaseFramework = globalObj['jqxBaseFramework']
  if (!isRecord(jqxBaseFramework)) return

  const jqxNamespace = jqxBaseFramework['jqx']
  if (!isRecord(jqxNamespace)) return

  const jqxInputCtor = jqxNamespace['_jqxInput']
  if (!isRecord(jqxInputCtor)) return

  const prototypeObj = jqxInputCtor['prototype']
  if (!isRecord(prototypeObj)) return

  const originalLoad = prototypeObj['load']
  if (typeof originalLoad !== 'function') return

  const patchFlag = '__patchedInlineAutoCompleteGuard'
  if ((originalLoad as unknown as Record<string, unknown>)[patchFlag] === true) return

  const patchedLoad = function (this: unknown, data: unknown) {
    const self = isRecord(this) ? this : null

    // Повторяем ключевую предпосылку оригинального кода:
    // если включён inlineAutoComplete, то внутри load() будет попытка найти `.jqx-input-inline`.
    if (self && self['inlineAutoComplete'] && !hasInlineLabel(self['element'])) {
      self['inlineAutoComplete'] = false
    }

    return (originalLoad as (this: unknown, data: unknown) => unknown).call(this, data)
  }

  ;(patchedLoad as unknown as Record<string, unknown>)[patchFlag] = true
  prototypeObj['load'] = patchedLoad
}

