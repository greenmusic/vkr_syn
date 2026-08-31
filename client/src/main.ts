import './assets/main.css'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import App from './App.vue'
import router from './router'
import api from './api/index.js'

const app = createApp(App)
const vuetify = createVuetify({
  defaults: {
    VBtn: { size: 'small' },
    VTextField: { variant: 'outlined', density: 'compact' },
    VTextarea: { variant: 'outlined', density: 'compact' },
    VSelect: { variant: 'outlined', density: 'compact' },
    VAutocomplete: { variant: 'outlined', density: 'compact' },
    VFileInput: { variant: 'outlined', density: 'compact' },
    VAlert: { density: 'compact', variant: 'tonal' },
  },
  theme: {
    defaultTheme: 'projectBoard',
    themes: {
      projectBoard: {
        dark: false,
        colors: {
          primary: '#0085ff',
          secondary: '#7e92ae',
          accent: '#2d9bff',
          success: '#13af23',
          warning: '#ffa735',
          error: '#d11f00',
          info: '#32c5ff',
          background: '#f4f7fa',
          surface: '#ffffff',
          'surface-variant': '#eaf2fa',
          'on-surface': '#1f2e43',
          'on-background': '#1f2e43',
          banner: '#4467b7',
        },
      },
    },
  },
})

app.config.globalProperties.$api = api

app.use(vuetify)
app.use(router)

app.mount('#app')
