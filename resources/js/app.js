import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import '../css/app.css'

const app = createApp(App)

app.use(router)
app.use(VueQueryPlugin)

app.mount('#app')
