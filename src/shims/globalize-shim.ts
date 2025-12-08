// Подключаем глобализацию jqwidgets и экспортируем объект Globalize.
import '../../node_modules/jqwidgets-scripts/jqwidgets/globalization/globalize.js'

type GlobalizeType = {
  cultures?: Record<string, unknown>
  culture: (name?: string) => string | undefined
  addCultureInfo: (name: string, baseName: string, info: Record<string, unknown>) => void
}

const root = globalThis as Record<string, unknown>
let Globalize = root.Globalize as GlobalizeType | undefined

if (!Globalize) {
  Globalize = {
    cultures: {},
    culture(name?: string) {
      if (name) {
        ;(this.cultures as Record<string, unknown>).current = name
      }
      return (this.cultures as Record<string, unknown>).current as string | undefined
    },
    addCultureInfo(name: string, _baseName: string, info: Record<string, unknown>) {
      if (!this.cultures) this.cultures = {}
      this.cultures[name] = info
      this.culture(name)
    },
  }
  root.Globalize = Globalize
} else {
  if (typeof Globalize.culture !== 'function') {
    Globalize.culture = (name?: string) => {
      if (name) {
        ;(Globalize!.cultures as Record<string, unknown>).current = name
      }
      return (Globalize!.cultures as Record<string, unknown>).current as string | undefined
    }
  }
  if (typeof Globalize.addCultureInfo !== 'function') {
    Globalize.addCultureInfo = (name: string, _baseName: string, info: Record<string, unknown>) => {
      if (!Globalize!.cultures) {
        Globalize!.cultures = {}
      }
      Globalize!.cultures[name] = info
      Globalize!.culture(name)
    }
  }
}

// Экспортируем и по умолчанию, и именованно — чтобы require('globalize') получал объект с методами.
const culture = (...args: Parameters<NonNullable<GlobalizeType['culture']>>) =>
  (Globalize as GlobalizeType).culture(...args)
const addCultureInfo = (...args: Parameters<NonNullable<GlobalizeType['addCultureInfo']>>) =>
  (Globalize as GlobalizeType).addCultureInfo(...args)

export { Globalize, culture, addCultureInfo }
export default Globalize
