<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>ログイン</h2>
        <button class="close-button" @click="closeModal">×</button>
      </div>
      <div class="modal-body">
        <div v-if="loginError" class="error-message">
          {{ loginError }}
        </div>
        <form @submit.prevent="handleLogin">
          <label>
            メールアドレス:
            <input
              v-model="email"
              type="email"
              placeholder="your-email@example.com"
              required
              autocomplete="email"
            />
          </label>
          <label>
            パスワード:
            <input
              v-model="password"
              type="password"
              placeholder="パスワード"
              required
              autocomplete="current-password"
            />
          </label>
          <button type="submit" :disabled="loginLoading" class="login-button">
            {{ loginLoading ? 'ログイン中...' : 'ログイン' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabaseService, supabaseClient } from '../services/supabase'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'login-success'])

const email = ref('')
const password = ref('')
const loginLoading = ref(false)
const loginError = ref('')

function closeModal() {
  emit('close')
  email.value = ''
  password.value = ''
  loginError.value = ''
}

async function handleLogin() {
  loginLoading.value = true
  loginError.value = ''

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) {
      console.error('Supabase auth error:', error)
      throw error
    }

    if (data.session) {
      supabaseService.setAccessToken(data.session.access_token)
      emit('login-success', data.session)
      closeModal()
    } else {
      throw new Error('セッションが取得できませんでした')
    }
  } catch (err) {
    console.error('Login error:', err)
    
    // エラーメッセージを取得
    const errorMessage = err.message || err.toString() || '不明なエラー'
    
    // BigQueryクォータ超過エラー
    if (errorMessage.includes('Quota exceeded') || errorMessage.includes('quotaExceeded')) {
      loginError.value = 'ログイン失敗: Supabaseのクォータ制限に達しています。しばらく待ってから再度お試しください。'
    }
    // ネットワークエラー
    else if (errorMessage.includes('Failed to fetch')) {
      loginError.value = 'ログイン失敗: ネットワークエラーが発生しました。Supabaseのメンテナンス中、またはネットワークの問題の可能性があります。しばらく待ってから再度お試しください。'
    }
    // CORSエラー
    else if (errorMessage.includes('CORS')) {
      loginError.value = 'ログイン失敗: CORSエラーが発生しました。Supabaseの設定またはメンテナンス中の可能性があります。'
    }
    // その他のエラー
    else {
      loginError.value = `ログイン失敗: ${errorMessage}`
    }
  } finally {
    loginLoading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-button:hover {
  background: #f3f4f6;
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.login-button {
  padding: 0.75rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: 0.5rem;
}

.login-button:hover:not(:disabled) {
  background: #2563eb;
}

.login-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>




