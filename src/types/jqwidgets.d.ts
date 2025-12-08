import type { DefineComponent } from 'vue'

declare module 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxgrid.vue' {
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module 'jqwidgets-scripts/jqwidgets-vue3/vue_jqxwindow.vue' {
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module 'jqwidgets-scripts/jqwidgets-vue3/*' {
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare global {
  interface Window {
    jqx?: unknown
    JQXLite?: unknown
  }
}
