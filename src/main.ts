import './assets/main.css'

import 'jqwidgets-scripts/jqwidgets/styles/jqx.base.css'
import 'jqwidgets-scripts/jqwidgets/styles/jqx.material.css'

import 'jqwidgets-scripts/jqwidgets/jqxcore.js'
import 'jqwidgets-scripts/jqwidgets/jqxdata.js'
import 'jqwidgets-scripts/jqwidgets/jqxbuttons.js'
import 'jqwidgets-scripts/jqwidgets/jqxscrollbar.js'
import 'jqwidgets-scripts/jqwidgets/jqxmenu.js'
import 'jqwidgets-scripts/jqwidgets/jqxgrid.js'
import 'jqwidgets-scripts/jqwidgets/jqxgrid.pager.js'
import 'jqwidgets-scripts/jqwidgets/jqxgrid.filter.js'
import 'jqwidgets-scripts/jqwidgets/jqxgrid.sort.js'
import 'jqwidgets-scripts/jqwidgets/jqxgrid.selection.js'
import 'jqwidgets-scripts/jqwidgets/jqxgrid.columnsresize.js'
import 'jqwidgets-scripts/jqwidgets/jqxdropdownlist.js'
import 'jqwidgets-scripts/jqwidgets/jqxlistbox.js'
import 'jqwidgets-scripts/jqwidgets/jqxcheckbox.js'
import 'jqwidgets-scripts/jqwidgets/jqxdragdrop.js'
import 'jqwidgets-scripts/jqwidgets/jqxwindow.js'
import 'jqwidgets-scripts/jqwidgets/globalization/globalize.js'
import 'jqwidgets-scripts/jqwidgets/globalization/globalize.culture.ru-RU.js'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
