<template>
  <div class="category-template-editor">
    <div class="editor-header">
      <h3>写真カテゴリー</h3>
      <p class="editor-description">未割当ファイルのカテゴリー追加時に使用するテンプレートを管理できます</p>
    </div>

    <div v-if="loading" class="loading-state">
      <span>読み込み中...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <span>{{ error }}</span>
      <button @click="loadTemplates" class="retry-btn">再読み込み</button>
    </div>

    <div v-else class="templates-list">
      <div 
        v-for="template in templates" 
        :key="template.id"
        class="template-item"
        :class="{ 'is-dragging': draggingId === template.id, 'drag-over': dragOverId === template.id }"
        draggable="true"
        @dragstart="handleDragStart($event, template)"
        @dragend="handleDragEnd"
        @dragover.prevent="handleDragOver($event, template)"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop($event, template)"
      >
        <div class="template-drag-handle" title="ドラッグして並べ替え">
          <span class="drag-icon">≡</span>
        </div>

        <input 
          type="text"
          class="template-label-input"
          :value="template.label"
          @blur="handleLabelChange(template, $event)"
          @keydown.enter="$event.target.blur()"
          placeholder="カテゴリー名を入力..."
        />

        <button 
          class="delete-btn"
          @click="deleteTemplate(template)"
          title="削除"
        >
          ✕
        </button>
      </div>

      <div v-if="templates.length === 0" class="empty-state">
        <p>カテゴリーテンプレートがありません</p>
      </div>

      <!-- 新規追加用の行 -->
      <div class="template-item add-new">
        <div class="template-drag-handle placeholder">
          <span class="drag-icon">≡</span>
        </div>
        <input 
          type="text"
          class="template-label-input"
          v-model="newTemplateLabel"
          @keydown.enter="addNewTemplate"
          placeholder="新しいカテゴリーテンプレートを追加..."
        />
        <button 
          class="add-btn"
          @click="addNewTemplate"
          :disabled="!newTemplateLabel.trim()"
          title="追加"
        >
          ＋
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabaseService } from '../services/supabase'

const templates = ref([])
const loading = ref(true)
const error = ref(null)
const newTemplateLabel = ref('')
const draggingId = ref(null)
const dragOverId = ref(null)

onMounted(() => {
  loadTemplates()
})

async function loadTemplates() {
  loading.value = true
  error.value = null
  try {
    // リバランスフラグをtrueにして取得
    const data = await supabaseService.getCategoryLabelTemplates(true)
    templates.value = data
  } catch (err) {
    console.error('Failed to load templates:', err)
    error.value = 'カテゴリーテンプレートの読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

async function handleLabelChange(template, event) {
  const newLabel = event.target.value.trim()
  if (newLabel === template.label) return
  if (!newLabel) {
    event.target.value = template.label // 空の場合は元に戻す
    return
  }
  
  // ローカルで重複チェック
  const isDuplicate = templates.value.some(t => t.id !== template.id && t.label === newLabel)
  if (isDuplicate) {
    alert('同じ名前のテンプレートが既に存在します')
    event.target.value = template.label
    return
  }
  
  const oldLabel = template.label
  template.label = newLabel // 楽観的更新
  try {
    await supabaseService.updateCategoryLabelTemplate(template.id, { label: newLabel })
  } catch (err) {
    console.error('Failed to update label:', err)
    template.label = oldLabel // 失敗したら戻す
    event.target.value = oldLabel
    if (err.message.includes('既に存在')) {
      alert('同じ名前のテンプレートが既に存在します')
    }
  }
}

async function deleteTemplate(template) {
  if (!confirm(`「${template.label}」を削除しますか？`)) return
  
  const index = templates.value.findIndex(t => t.id === template.id)
  const removed = templates.value.splice(index, 1)[0] // 楽観的更新
  
  try {
    await supabaseService.deleteCategoryLabelTemplate(template.id)
  } catch (err) {
    console.error('Failed to delete template:', err)
    templates.value.splice(index, 0, removed) // 失敗したら戻す
  }
}

async function addNewTemplate() {
  const label = newTemplateLabel.value.trim()
  if (!label) return
  
  // ローカルで重複チェック
  const isDuplicate = templates.value.some(t => t.label === label)
  if (isDuplicate) {
    alert('同じ名前のテンプレートが既に存在します')
    return
  }
  
  try {
    const newTemplate = await supabaseService.addCategoryLabelTemplate(label)
    templates.value.push(newTemplate)
    newTemplateLabel.value = ''
  } catch (err) {
    console.error('Failed to add template:', err)
    if (err.message.includes('既に存在')) {
      alert('同じ名前のテンプレートが既に存在します')
    } else {
      alert('カテゴリーテンプレートの追加に失敗しました')
    }
  }
}

function handleDragStart(event, template) {
  draggingId.value = template.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', template.id)
}

function handleDragEnd() {
  draggingId.value = null
  dragOverId.value = null
}

function handleDragOver(event, template) {
  if (draggingId.value && draggingId.value !== template.id) {
    dragOverId.value = template.id
  }
}

function handleDragLeave() {
  dragOverId.value = null
}

async function handleDrop(event, targetTemplate) {
  const draggedId = draggingId.value
  if (!draggedId || draggedId === targetTemplate.id) {
    dragOverId.value = null
    return
  }
  
  const draggedIndex = templates.value.findIndex(t => t.id === draggedId)
  const targetIndex = templates.value.findIndex(t => t.id === targetTemplate.id)
  
  if (draggedIndex === -1 || targetIndex === -1) {
    dragOverId.value = null
    return
  }
  
  // 配列から削除して挿入
  const [removed] = templates.value.splice(draggedIndex, 1)
  templates.value.splice(targetIndex, 0, removed)
  
  dragOverId.value = null
  
  // sort_orderを更新
  await updateSortOrders()
}

async function updateSortOrders() {
  // 1000刻みでsort_orderを設定
  const updates = templates.value.map((t, i) => ({
    id: t.id,
    sort_order: (i + 1) * 1000
  }))
  
  // ローカルのsort_orderも更新
  templates.value.forEach((t, i) => {
    t.sort_order = (i + 1) * 1000
  })
  
  try {
    await supabaseService.reorderCategoryLabelTemplates(updates)
  } catch (err) {
    console.error('Failed to reorder templates:', err)
    // 失敗したら再読み込み
    await loadTemplates()
  }
}

// 外部から呼び出せるように公開
defineExpose({
  loadTemplates,
  loading
})
</script>

<style scoped>
.category-template-editor {
  padding: 1rem;
  padding-bottom: 150px;
}

.editor-header {
  margin-bottom: 1.5rem;
}

.editor-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.editor-description {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.loading-state,
.error-state {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.error-state {
  color: #dc2626;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.retry-btn:hover {
  background: #f3f4f6;
}

.templates-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.15s;
}

.template-item:hover {
  border-color: #d1d5db;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.template-item.is-dragging {
  opacity: 0.5;
  border-color: #3b82f6;
}

.template-item.drag-over {
  border-color: #3b82f6;
  background: #eff6ff;
}

.template-item.add-new {
  background: #f9fafb;
  border-style: dashed;
}

.template-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.5rem;
  cursor: grab;
}

.template-drag-handle:active {
  cursor: grabbing;
}

.template-drag-handle.placeholder {
  visibility: hidden;
}

.drag-icon {
  font-size: 1.125rem;
  color: #9ca3af;
  line-height: 1;
}

.template-label-input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  font-size: 0.9375rem;
  color: #1f2937;
  transition: all 0.15s;
}

.template-label-input:hover {
  background: #f9fafb;
}

.template-label-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
}

.delete-btn {
  padding: 0.375rem 0.5rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: #9ca3af;
  transition: all 0.15s;
}

.delete-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

.add-btn {
  padding: 0.375rem 0.625rem;
  border: none;
  border-radius: 4px;
  background: #10b981;
  cursor: pointer;
  font-size: 1rem;
  color: white;
  transition: all 0.15s;
}

.add-btn:hover:not(:disabled) {
  background: #059669;
}

.add-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}
</style>

