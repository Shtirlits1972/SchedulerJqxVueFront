import './assets/main.css'
//
import 'jqwidgets-scripts/jqwidgets/styles/jqx.base.css'
// import 'jqwidgets-scripts/jqwidgets/styles/jqx.material.css'
import 'jqwidgets-scripts/jqwidgets/styles/jqx.arctic.css'

// jqx scripts are loaded globally via public/jqx-all.js (see index.html)

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
