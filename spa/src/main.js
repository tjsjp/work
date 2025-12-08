import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import { supabaseService } from './services/supabase'

// 開発用：グローバルに公開（ブラウザのコンソールからアクセス可能）
if (typeof window !== 'undefined') {
  window.supabaseService = supabaseService
}

createApp(App).use(router).mount('#app')


