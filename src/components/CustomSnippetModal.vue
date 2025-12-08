<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>カスタム文字列を追加</h3>
        <button class="modal-close-btn" @click="handleClose">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">グループ</label>
          <select 
            v-model="selectedGroupId"
            class="form-select"
          >
            <option 
              v-for="group in availableGroups" 
              :key="group.id" 
              :value="group.id"
            >
              {{ group.label === 'like_snippet' ? 'お気に入り' : group.label }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">文字列</label>
          <input 
            type="text" 
            class="form-input readonly-input" 
            :value="snippetLabel" 
            readonly 
            disabled
          />
          <p class="form-hint">選択した文字列がカスタム文字列として登録されます</p>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="newlineAfter"
            />
            <span>挿入時に改行を追加</span>
          </label>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose">キャンセル</button>
        <button 
          class="btn btn-primary" 
          @click="handleAdd"
          :disabled="!snippetLabel || isSubmitting"
        >
          {{ isSubmitting ? '追加中...' : '追加' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  initialText: {
    type: String,
    default: ''
  },
  snippetGroups: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'add'])

const snippetLabel = ref('')
const newlineAfter = ref(true)
const selectedGroupId = ref(null)
const isSubmitting = ref(false)

// 利用可能なグループ（お気に入りを含む）
const availableGroups = computed(() => {
  return props.snippetGroups || []
})

// モーダルが開いた時に初期値をセット
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    snippetLabel.value = props.initialText
    newlineAfter.value = true
    // デフォルトでお気に入りを選択
    const likeGroup = props.snippetGroups.find(g => g.label === 'like_snippet')
    selectedGroupId.value = likeGroup ? likeGroup.id : (props.snippetGroups[0]?.id || null)
    isSubmitting.value = false
  }
})

watch(() => props.initialText, (text) => {
  if (props.isOpen) {
    snippetLabel.value = text
  }
})

function handleClose() {
  emit('close')
}

async function handleAdd() {
  if (!snippetLabel.value || isSubmitting.value || !selectedGroupId.value) return
  
  isSubmitting.value = true
  
  try {
    await emit('add', {
      label: snippetLabel.value,
      newline_after: newlineAfter.value,
      group_id: selectedGroupId.value
    })
  } finally {
    isSubmitting.value = false
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
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  border-radius: 4px;
  transition: all 0.15s;
}

.modal-close-btn:hover {
  background: #e5e7eb;
  color: #111827;
}

.modal-body {
  padding: 1.25rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.375rem;
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-select {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.readonly-input {
  background: #f9fafb;
  color: #374151;
  cursor: not-allowed;
}

.form-hint {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
}

.checkbox-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.btn-primary {
  background: #3b82f6;
  border: 1px solid #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
}
</style>

