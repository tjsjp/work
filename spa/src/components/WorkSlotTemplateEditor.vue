<template>
  <div class="work-slot-template-editor-container">
    <!-- 左側: テンプレートリスト -->
    <div class="work-slot-template-editor">
      <div class="editor-header">
        <h3>写真台帳</h3>
        <p class="editor-description">写真台帳で使用するテンプレートの管理</p>
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
          :class="{ 
            'is-dragging': draggingId === template.id, 
            'drag-over': dragOverId === template.id,
            'is-selected': selectedTemplate?.id === template.id
          }"
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

          <button 
            class="edit-btn"
            @click="selectTemplate(template)"
            title="詳細編集"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>

          <input
            type="text"
            class="template-label-input"
            :value="template.label"
            @blur="saveTemplateLabelDirect(template, $event.target.value)"
            @keydown.enter="$event.target.blur()"
            placeholder="テンプレート名..."
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
          <p>テンプレートがありません</p>
          <p class="empty-hint">写真台帳画面でスロットを選択して「テンプレートに保存」を使用してください</p>
        </div>
      </div>
    </div>

    <!-- 右側: 詳細パネル -->
    <div class="slot-detail-panel">
      <!-- 未選択時 -->
      <div v-if="!selectedTemplate" class="panel-placeholder-container">
        <p class="panel-placeholder">← テンプレートの編集ボタンをクリックして編集</p>
      </div>

      <!-- 選択時: 詳細編集 -->
      <div v-else class="panel-edit-view">
        <!-- 種別と合計 -->
        <div class="info-row">
          <div class="info-group">
            <label class="info-label">種別</label>
            <span class="info-value">{{ kindLabel }}</span>
          </div>
          <div class="info-group">
            <label class="info-label">合計</label>
            <span class="info-value">{{ templateDetails.length }}件</span>
          </div>
        </div>

        <!-- スロット一覧 -->
        <div class="details-section">
          <div v-if="detailLoading" class="loading-state small">読み込み中...</div>
          <div v-else-if="detailError" class="error-state small">
            {{ detailError }}
            <button @click="loadTemplateDetails" class="retry-btn small">再読み込み</button>
          </div>
          <div v-else class="details-list">
            <div 
              v-for="(detail, index) in templateDetails" 
              :key="detail.id"
              class="detail-item"
              :class="{ 
                'detail-dragging': draggingDetailId === detail.id,
                'detail-drag-over': dragOverDetailId === detail.id
              }"
              draggable="true"
              @dragstart="handleDetailDragStart($event, detail)"
              @dragend="handleDetailDragEnd"
              @dragover.prevent="handleDetailDragOver($event, detail)"
              @dragleave="handleDetailDragLeave"
              @drop.prevent="handleDetailDrop($event, detail)"
            >
              <div class="detail-drag-handle" title="ドラッグで並び替え">≡</div>
              <div class="detail-index">{{ index + 1 }}</div>
              <input 
                type="text"
                class="detail-caption-input"
                :value="detail.caption"
                @blur="updateDetail(detail, 'caption', $event.target.value)"
                @keydown.enter="$event.target.blur()"
                placeholder="カテゴリー..."
              />
              <select 
                class="detail-phase-select"
                :value="detail.work_phase_id"
                @change="updateDetail(detail, 'work_phase_id', $event.target.value || null)"
              >
                <option 
                  v-for="phase in workPhases" 
                  :key="phase.id" 
                  :value="phase.id"
                >
                  {{ phase.label }}
                </option>
              </select>
              <textarea 
                class="detail-note-input"
                :value="detail.note"
                @blur="updateDetail(detail, 'note', $event.target.value)"
                @focus="expandTextarea($event)"
                @blur.capture="shrinkTextarea($event)"
                placeholder="備考..."
                rows="1"
              ></textarea>
              <button 
                class="detail-delete-btn"
                @click="deleteDetail(detail)"
                title="削除"
              >
                ✕
              </button>
            </div>
            <div v-if="templateDetails.length === 0" class="empty-details">
              スロットがありません
            </div>
          </div>

          <!-- 新規スロット追加 -->
          <div class="add-detail-section">
            <button class="add-detail-btn" @click="addNewDetail">
              ＋ スロットを追加
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabaseService } from '../services/supabase'

const templates = ref([])
const loading = ref(true)
const error = ref(null)
const selectedTemplate = ref(null)
const draggingId = ref(null)
const dragOverId = ref(null)

// 詳細編集用
const detailLoading = ref(false)
const detailError = ref(null)
const templateDetails = ref([])
const editingKind = ref('')
const workPhases = ref([])

// スロット並び替え用
const draggingDetailId = ref(null)
const dragOverDetailId = ref(null)

// 種別の表示ラベル
const kindLabel = computed(() => {
  const labels = { small: '小口', large: 'あき家' }
  return labels[editingKind.value] || editingKind.value
})

onMounted(() => {
  loadTemplates()
})

async function loadWorkPhases(kind) {
  try {
    const result = await supabaseService.getMasterWorkPhases(kind)
    workPhases.value = result.workPhases || []
  } catch (err) {
    console.error('Failed to load work phases:', err)
  }
}

// selectedTemplateが変わったら詳細を読み込む
watch(selectedTemplate, (newVal) => {
  if (newVal) {
    loadTemplateDetails()
  }
})

async function loadTemplates() {
  loading.value = true
  error.value = null
  try {
    const data = await supabaseService.getWorkSlotTemplates(null, true)
    templates.value = data || []
  } catch (err) {
    console.error('Failed to load templates:', err)
    error.value = '写真台帳テンプレートの読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

async function loadTemplateDetails() {
  if (!selectedTemplate.value) return
  
  detailLoading.value = true
  detailError.value = null
  try {
    const data = await supabaseService.getWorkSlotTemplateDetails(selectedTemplate.value.id)
    editingKind.value = data.template.kind
    templateDetails.value = data.details || []
    
    // kindに基づいてフェーズを読み込み
    await loadWorkPhases(data.template.kind)
  } catch (err) {
    console.error('Failed to load template details:', err)
    detailError.value = 'テンプレート詳細の読み込みに失敗しました'
  } finally {
    detailLoading.value = false
  }
}

function selectTemplate(template) {
  selectedTemplate.value = template
}

async function saveTemplateLabelDirect(template, newLabel) {
  newLabel = newLabel.trim()
  if (!newLabel || newLabel === template.label) return
  
  const oldLabel = template.label
  template.label = newLabel
  
  try {
    await supabaseService.updateWorkSlotTemplate(template.id, { label: newLabel })
  } catch (err) {
    console.error('Failed to save label:', err)
    template.label = oldLabel
    alert('ラベルの保存に失敗しました')
  }
}

async function updateDetail(detail, field, value) {
  const oldValue = detail[field]
  if (oldValue === value) return
  
  // 楽観的更新
  detail[field] = value
  
  try {
    await supabaseService.updateWorkSlotTemplateDetail(detail.id, { [field]: value })
  } catch (err) {
    console.error('Failed to update detail:', err)
    // 元に戻す
    detail[field] = oldValue
  }
}

async function deleteDetail(detail) {
  if (!confirm('このスロットを削除しますか？')) return
  
  const index = templateDetails.value.findIndex(d => d.id === detail.id)
  const removed = templateDetails.value.splice(index, 1)[0]
  
  try {
    await supabaseService.deleteWorkSlotTemplateDetail(detail.id)
  } catch (err) {
    console.error('Failed to delete detail:', err)
    // 元に戻す
    templateDetails.value.splice(index, 0, removed)
    alert('スロットの削除に失敗しました')
  }
}

async function addNewDetail() {
  if (!selectedTemplate.value) return
  
  try {
    const newDetail = await supabaseService.addWorkSlotTemplateDetail(selectedTemplate.value.id, {})
    templateDetails.value.push(newDetail)
  } catch (err) {
    console.error('Failed to add detail:', err)
    alert('スロットの追加に失敗しました')
  }
}

function expandTextarea(event) {
  event.target.rows = 10
}

function shrinkTextarea(event) {
  // blur後に縮める（updateDetailの後）
  setTimeout(() => {
    event.target.rows = 1
  }, 100)
}

// スロット並び替えのドラッグ&ドロップ
function handleDetailDragStart(event, detail) {
  draggingDetailId.value = detail.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', detail.id)
}

function handleDetailDragEnd() {
  draggingDetailId.value = null
  dragOverDetailId.value = null
}

function handleDetailDragOver(event, detail) {
  if (draggingDetailId.value && draggingDetailId.value !== detail.id) {
    dragOverDetailId.value = detail.id
  }
}

function handleDetailDragLeave() {
  dragOverDetailId.value = null
}

async function handleDetailDrop(event, targetDetail) {
  const draggedId = draggingDetailId.value
  if (!draggedId || draggedId === targetDetail.id) {
    dragOverDetailId.value = null
    return
  }
  
  const draggedIndex = templateDetails.value.findIndex(d => d.id === draggedId)
  const targetIndex = templateDetails.value.findIndex(d => d.id === targetDetail.id)
  
  if (draggedIndex === -1 || targetIndex === -1) {
    dragOverDetailId.value = null
    return
  }
  
  // 配列を並び替え
  const [removed] = templateDetails.value.splice(draggedIndex, 1)
  templateDetails.value.splice(targetIndex, 0, removed)
  
  dragOverDetailId.value = null
  
  // サーバーに並び順を送信
  await updateDetailSortOrders()
}

async function updateDetailSortOrders() {
  if (!selectedTemplate.value) return
  
  const itemIds = templateDetails.value.map(d => d.id)
  
  try {
    await supabaseService.reorderWorkSlotTemplateItems(selectedTemplate.value.id, itemIds)
  } catch (err) {
    console.error('Failed to reorder details:', err)
    // 失敗したら再読み込み
    await loadTemplateDetails()
  }
}

async function deleteTemplate(template) {
  if (!confirm(`「${template.label}」を削除しますか？`)) return
  
  const index = templates.value.findIndex(t => t.id === template.id)
  const removed = templates.value.splice(index, 1)[0]
  
  if (selectedTemplate.value?.id === template.id) {
    selectedTemplate.value = null
    templateDetails.value = []
  }
  
  try {
    await supabaseService.deleteWorkSlotTemplate(template.id)
  } catch (err) {
    console.error('Failed to delete template:', err)
    templates.value.splice(index, 0, removed)
    alert('テンプレートの削除に失敗しました')
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
  
  const [removed] = templates.value.splice(draggedIndex, 1)
  templates.value.splice(targetIndex, 0, removed)
  
  dragOverId.value = null
  await updateSortOrders()
}

async function updateSortOrders() {
  const updates = templates.value.map((t, i) => ({
    id: t.id,
    sort_order: (i + 1) * 1000
  }))
  
  templates.value.forEach((t, i) => {
    t.sort_order = (i + 1) * 1000
  })
  
  try {
    await supabaseService.reorderWorkSlotTemplates(updates)
  } catch (err) {
    console.error('Failed to reorder templates:', err)
    await loadTemplates()
  }
}

defineExpose({
  loadTemplates,
  loading
})
</script>

<style scoped>
.work-slot-template-editor-container {
  display: flex;
  height: 100%;
  gap: 0;
}

.work-slot-template-editor {
  width: 300px;
  min-width: 300px;
  padding: 1rem 0.75rem;
  padding-bottom: 150px;
  overflow-y: auto;
  border-right: 1px solid #e2e8f0;
}

.slot-detail-panel {
  flex: 1;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-placeholder-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.panel-placeholder {
  color: #94a3b8;
  font-size: 0.875rem;
  text-align: center;
  padding: 2rem 1rem;
}

.panel-edit-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 種別と合計 */
.info-row {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.info-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

/* スロット一覧 */
.details-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.details-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.15s;
}

.detail-item.detail-dragging {
  opacity: 0.5;
  border-color: #3b82f6;
}

.detail-item.detail-drag-over {
  border-color: #10b981;
  background: #d1fae5;
}

.detail-drag-handle {
  cursor: grab;
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 0 0.25rem;
}

.detail-drag-handle:active {
  cursor: grabbing;
}

.detail-index {
  min-width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

.detail-caption-input {
  width: 120px;
  min-width: 120px;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8125rem;
  color: #1f2937;
  background: white;
}

.detail-caption-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.detail-phase-select {
  min-width: 100px;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8125rem;
  color: #1f2937;
  background: white;
  cursor: pointer;
}

.detail-phase-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.detail-note-input {
  flex: 1;
  min-width: 150px;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8125rem;
  color: #1f2937;
  background: white;
  resize: none;
  font-family: inherit;
  line-height: 1.4;
  transition: height 0.15s;
}

.detail-note-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.detail-delete-btn {
  padding: 0.375rem 0.5rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: #9ca3af;
  transition: all 0.15s;
}

.detail-delete-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

.empty-details {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

/* 新規スロット追加 */
.add-detail-section {
  padding: 0.75rem 1rem;
  padding-bottom: 150px;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.add-detail-btn {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: #6b7280;
  transition: all 0.15s;
}

.add-detail-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

/* 左側テンプレートリスト */
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

.loading-state.small,
.error-state.small {
  padding: 1rem;
  font-size: 0.8125rem;
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

.retry-btn.small {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
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

.template-item.is-selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.template-item.is-dragging {
  opacity: 0.5;
  border-color: #3b82f6;
}

.template-item.drag-over {
  border-color: #3b82f6;
  background: #eff6ff;
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

.drag-icon {
  font-size: 1.125rem;
  color: #9ca3af;
  line-height: 1;
}

.edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: #9ca3af;
  transition: all 0.15s;
}

.edit-btn:hover {
  background: #f3f4f6;
  color: #3b82f6;
}

.template-label-input {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.9375rem;
  color: #1f2937;
  background: transparent;
  transition: all 0.15s;
}

.template-label-input:hover {
  border-color: #e5e7eb;
  background: #f9fafb;
}

.template-label-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
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

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

.empty-hint {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  color: #d1d5db;
}
</style>
