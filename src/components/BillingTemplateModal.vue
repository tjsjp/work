<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>テンプレート登録</h3>
        <button class="close-button" @click="handleClose">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="template-label">テンプレート名</label>
          <input
            id="template-label"
            type="text"
            v-model="templateLabel"
            placeholder="テンプレート名を入力..."
            :disabled="saving"
            @keydown.enter="handleSave"
            ref="labelInput"
          />
        </div>
        <div v-if="billingItems.length > 0" class="billing-preview">
          <h4>保存される請求項目 ({{ billingItems.length }}件)</h4>
          <div class="billing-items-list">
            <div v-for="(item, index) in billingItems" :key="index" class="billing-item">
              <span class="item-code">{{ item.external_code }}</span>
              <span class="item-description">{{ item.description }}</span>
              <span class="item-quantity">{{ item.quantity || '-' }}</span>
            </div>
          </div>
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
      </div>
      <div class="modal-footer">
        <button class="cancel-button" @click="handleClose" :disabled="saving">キャンセル</button>
        <button class="save-button" @click="handleSave" :disabled="!templateLabel.trim() || saving">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  billingItems: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'save'])

const templateLabel = ref('')
const saving = ref(false)
const error = ref(null)
const labelInput = ref(null)

// モーダルが開いたときにフォーカス
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    templateLabel.value = ''
    error.value = null
    nextTick(() => {
      labelInput.value?.focus()
    })
  }
})

function handleClose() {
  if (!saving.value) {
    emit('close')
  }
}

async function handleSave() {
  if (!templateLabel.value.trim()) {
    error.value = 'テンプレート名を入力してください'
    return
  }
  
  saving.value = true
  error.value = null
  
  try {
    emit('save', templateLabel.value.trim())
  } catch (err) {
    error.value = err.message || 'テンプレートの保存に失敗しました'
    saving.value = false
  }
}

// 親から保存完了/エラーを受け取った時にリセット
function resetState() {
  saving.value = false
}

function setError(message) {
  error.value = message
  saving.value = false
}

defineExpose({
  resetState,
  setError
})
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
  z-index: 10000;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-button:hover {
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.form-group input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.billing-preview {
  margin-top: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.375rem;
}

.billing-preview h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
}

.billing-items-list {
  max-height: 200px;
  overflow-y: auto;
}

.billing-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
}

.billing-item:last-child {
  border-bottom: none;
}

.item-code {
  font-weight: 500;
  color: #6b7280;
  min-width: 80px;
}

.item-description {
  flex: 1;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-quantity {
  color: #6b7280;
  min-width: 40px;
  text-align: right;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.cancel-button,
.save-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.cancel-button:hover:not(:disabled) {
  background: #f3f4f6;
}

.save-button {
  background: #f59e0b;
  border: 1px solid #f59e0b;
  color: white;
}

.save-button:hover:not(:disabled) {
  background: #d97706;
  border-color: #d97706;
}

.cancel-button:disabled,
.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

