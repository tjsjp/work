<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>部屋テンプレート入力</h3>
        <button class="close-btn" @click="handleClose">✕</button>
      </div>
      
      <div class="modal-body">
        <div v-for="i in 10" :key="i" class="label-row">
          <span class="label-number">{{ i - 1 }}:</span>
          <input 
            type="text" 
            class="label-input"
            v-model="localLabels[i - 1]"
            :placeholder="`ラベル ${i - 1}`"
          />
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="cancel-btn" @click="handleClose">キャンセル</button>
        <button class="save-btn" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  labels: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'save'])

const localLabels = ref([])

// propsのlabelsが変更されたらlocalLabelsを更新
watch(() => props.labels, (newLabels) => {
  if (newLabels && newLabels.length > 0) {
    localLabels.value = newLabels.map(l => l.label || '')
  } else {
    localLabels.value = Array(10).fill('')
  }
}, { immediate: true })

function handleClose() {
  emit('close')
}

function handleSave() {
  // 0-9のラベルを配列として返す
  const labels = localLabels.value.map((label, index) => ({
    sort_order: index,
    label: label || ''
  }))
  emit('save', labels)
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
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.label-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.label-number {
  font-weight: 600;
  color: #6b7280;
  min-width: 1.5rem;
  text-align: right;
}

.label-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.label-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn,
.save-btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.cancel-btn {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.cancel-btn:hover {
  background: #f9fafb;
}

.save-btn {
  background: #3b82f6;
  border: 1px solid #3b82f6;
  color: white;
}

.save-btn:hover {
  background: #2563eb;
}
</style>

