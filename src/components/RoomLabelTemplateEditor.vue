<template>
  <div class="room-label-template-editor">
    <div class="editor-header">
      <h3>デフォルト部屋名</h3>
      <p class="editor-description">見積作成時に使用するデフォルトの部屋名を設定します</p>
    </div>
    
    <div v-if="loading" class="loading-state">読み込み中...</div>
    
    <div v-else class="labels-form">
      <div 
        v-for="(label, index) in labels" 
        :key="index" 
        class="label-row"
      >
        <span class="label-number">{{ index + 1 }}.</span>
        <input 
          type="text" 
          v-model="labels[index]"
          @input="markDirty"
          class="label-input"
          :placeholder="`部屋名 ${index + 1}`"
        />
      </div>
      
      <div class="form-actions">
        <button 
          class="save-btn" 
          @click="saveLabels"
          :disabled="saving || !isDirty"
        >
          {{ saving ? '保存中...' : '保存' }}
        </button>
        <span v-if="isDirty" class="dirty-indicator">※ 未保存の変更があります</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabaseService } from '../services/supabase'

const loading = ref(false)
const saving = ref(false)
const isDirty = ref(false)
const labels = ref(['', '', '', '', '', '', '', '', '', ''])

// 読み込み
async function loadLabels() {
  loading.value = true
  try {
    const result = await supabaseService.getRoomLabelTemplates()
    if (result.room_label_templates) {
      // sort_orderでソートして配列にマッピング
      const sorted = result.room_label_templates.sort((a, b) => a.sort_order - b.sort_order)
      labels.value = sorted.map(t => t.label || '')
    }
    isDirty.value = false
  } catch (err) {
    console.error('Failed to load room label templates:', err)
    alert('部屋名テンプレートの読み込みに失敗しました: ' + err.message)
  } finally {
    loading.value = false
  }
}

// 変更マーク
function markDirty() {
  isDirty.value = true
}

// 保存
async function saveLabels() {
  saving.value = true
  try {
    const labelsToSave = labels.value.map((label, index) => ({
      sort_order: index,
      label: label || ''
    }))
    
    await supabaseService.saveRoomLabelTemplates(labelsToSave)
    isDirty.value = false
    alert('保存しました')
  } catch (err) {
    console.error('Failed to save room label templates:', err)
    alert('保存に失敗しました: ' + err.message)
  } finally {
    saving.value = false
  }
}

// 外部から呼び出し可能なリロード関数
function reload() {
  loadLabels()
}

onMounted(() => {
  loadLabels()
})

defineExpose({
  loading,
  reload
})
</script>

<style scoped>
.room-label-template-editor {
  padding: 20px;
  max-width: 500px;
}

.editor-header {
  margin-bottom: 20px;
}

.editor-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #1f2937;
}

.editor-description {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.loading-state {
  padding: 20px;
  text-align: center;
  color: #6b7280;
}

.labels-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-number {
  width: 24px;
  font-size: 14px;
  color: #6b7280;
  text-align: right;
}

.label-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

.label-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.save-btn {
  padding: 8px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #2563eb;
}

.save-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.dirty-indicator {
  font-size: 12px;
  color: #f59e0b;
}
</style>

