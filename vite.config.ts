import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const outDir = resolve(projectRoot, '..', 'SchedulerJqxWebApi', 'wwwroot')

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  build: {
    outDir,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'jqwidgets-scripts/jqwidgets/globalization/globalize.js': fileURLToPath(
        new URL('./src/shims/globalize-shim.ts', import.meta.url),
      ),
      globalize: fileURLToPath(new URL('./src/shims/globalize-shim.ts', import.meta.url)),
    },
  },
})
