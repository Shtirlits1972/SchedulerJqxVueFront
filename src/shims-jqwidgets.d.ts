/* Type declarations for jqwidgets Vue3 components and global jqx
   This file tells TypeScript how to handle imports like
   `import X from 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxscheduler.vue'`.

   Place this file under `src/` so it's included by the project's `tsconfig.json`.
*/

declare module 'jqwidgets-scripts/jqwidgets-vue3/*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module 'jqwidgets-scripts/jqwidgets-vue3/*' {
  const whatever: unknown
  export default whatever
}

type JqxConstructor<T = unknown> = new (...args: unknown[]) => T

declare global {
  const jqx: {
    dataAdapter: JqxConstructor
    date: JqxConstructor<Date>
    [key: string]: unknown
  }
  const JQXLite: {
    generateID?: () => string
    [key: string]: unknown
  }
}

export {}
