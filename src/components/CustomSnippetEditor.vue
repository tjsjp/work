<template>
  <div class="custom-snippet-editor">
    <div class="editor-header">
      <h3>カスタム文字列</h3>
      <p class="editor-description">備考欄で使用するカスタム文字列を管理できます</p>
    </div>

    <div v-if="loading" class="loading-state">
      <span>読み込み中...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <span>{{ error }}</span>
      <button @click="loadGroups" class="retry-btn">再読み込み</button>
    </div>

    <div v-else class="editor-content">
      <!-- 2分割レイアウト -->
      <div class="split-layout">
        <!-- 左側: グループリスト -->
        <div class="groups-panel">
          <div class="panel-header">
            <span class="panel-title">グループ</span>
          </div>
          
          <div class="groups-list">
            <div 
              v-for="(group, index) in groups" 
              :key="group.id"
              class="group-item"
              :class="{ 
                'is-selected': selectedGroupId === group.id,
                'is-system': group.label === SYSTEM_RESERVED_LABEL,
                'is-dragging': draggingGroupId === group.id,
                'drag-over': dragOverGroupId === group.id
              }"
              :draggable="group.label !== SYSTEM_RESERVED_LABEL"
              @dragstart="handleGroupDragStart($event, group)"
              @dragend="handleGroupDragEnd"
              @dragover.prevent="handleGroupDragOver($event, group)"
              @dragleave="handleGroupDragLeave"
              @drop.prevent="handleGroupDrop($event, group)"
              @click="selectGroup(group)"
            >
              <div 
                class="group-drag-handle" 
                :class="{ 'disabled': group.label === SYSTEM_RESERVED_LABEL }"
                title="ドラッグして並べ替え"
              >
                <span class="drag-icon">≡</span>
              </div>

              <span class="group-label" :class="{ 'system-label': group.label === SYSTEM_RESERVED_LABEL }">
                {{ group.label === SYSTEM_RESERVED_LABEL ? 'お気に入り' : group.label }}
              </span>

              <!-- 削除ボタン -->
              <button 
                v-if="group.label !== SYSTEM_RESERVED_LABEL"
                class="group-delete-btn"
                @click.stop="confirmDeleteGroup(group)"
                title="削除"
              >
                ✕
              </button>
            </div>

            <!-- 新規グループ追加 -->
            <div class="group-item add-new" @click="showAddGroupInput = true" v-if="!showAddGroupInput">
              <span class="add-icon">＋</span>
              <span>新規グループ</span>
            </div>
            
            <div class="group-item add-new-input" v-if="showAddGroupInput" @click.stop>
              <input 
                type="text"
                v-model="newGroupLabel"
                @keydown.enter="addNewGroup"
                @keydown.escape="cancelAddGroup"
                placeholder="グループ名..."
                ref="newGroupInput"
                autofocus
              />
              <button class="add-btn" @click.stop="addNewGroup" @mousedown.prevent :disabled="!newGroupLabel.trim()">＋</button>
              <button class="cancel-btn-small" @click.stop="cancelAddGroup" @mousedown.prevent>✕</button>
            </div>
          </div>
        </div>

        <!-- 右側: アイテムリスト -->
        <div class="items-panel">
          <div class="panel-header">
            <span class="panel-title">
              {{ selectedGroup ? (selectedGroup.label === SYSTEM_RESERVED_LABEL ? 'お気に入り' : selectedGroup.label) : 'アイテム' }}
            </span>
          </div>

          <div v-if="!selectedGroupId" class="empty-selection">
            <p>左のグループを選択してください</p>
          </div>

          <div v-else-if="itemsLoading" class="loading-state">
            <span>読み込み中...</span>
          </div>

          <div v-else class="items-list">
            <div 
              v-for="(item, index) in items" 
              :key="item.id"
              class="item-row"
              :class="{ 
                'is-dragging': draggingItemId === item.id, 
                'drag-over': dragOverItemId === item.id 
              }"
              draggable="true"
              @dragstart="handleItemDragStart($event, item)"
              @dragend="handleItemDragEnd"
              @dragover.prevent="handleItemDragOver($event, item)"
              @dragleave="handleItemDragLeave"
              @drop.prevent="handleItemDrop($event, item)"
            >
              <div class="item-drag-handle" title="ドラッグして並べ替え">
                <span class="drag-icon">≡</span>
              </div>

              <input 
                type="text"
                class="item-label-input"
                :value="item.label"
                @blur="handleItemLabelChange(item, $event)"
                @keydown.enter="$event.target.blur()"
                placeholder="文字列を入力..."
              />

              <button
                class="newline-toggle-btn"
                :class="{ active: item.newline_after !== false }"
                @click="handleNewlineToggle(item)"
                title="改行オン/オフ"
              >
                ↲
              </button>

              <button 
                class="delete-btn"
                @click="deleteItem(item)"
                title="削除"
              >
                ✕
              </button>
            </div>

            <div v-if="items.length === 0" class="empty-state">
              <p>アイテムがありません</p>
            </div>

            <!-- 新規追加用の行 -->
            <div class="item-row add-new">
              <div class="item-drag-handle placeholder">
                <span class="drag-icon">≡</span>
              </div>
              <input 
                type="text"
                class="item-label-input"
                v-model="newItemLabel"
                @keydown.enter="addNewItem"
                placeholder="新しいアイテムを追加..."
              />
              <button
                class="newline-toggle-btn"
                :class="{ active: newItemNewlineAfter }"
                @click="newItemNewlineAfter = !newItemNewlineAfter"
                title="改行オン/オフ"
              >
                ↲
              </button>
              <button 
                class="add-btn"
                @click="addNewItem"
                :disabled="!newItemLabel.trim()"
                title="追加"
              >
                ＋
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabaseService } from '../services/supabase'

const SYSTEM_RESERVED_LABEL = 'like_snippet'

// グループ関連
const groups = ref([])
const selectedGroupId = ref(null)
const loading = ref(true)
const error = ref(null)
const newGroupLabel = ref('')
const showAddGroupInput = ref(false)
const newGroupInput = ref(null)
const draggingGroupId = ref(null)
const dragOverGroupId = ref(null)

// アイテム関連
const items = ref([])
const itemsLoading = ref(false)
const newItemLabel = ref('')
const newItemNewlineAfter = ref(true)
const draggingItemId = ref(null)
const dragOverItemId = ref(null)

const selectedGroup = computed(() => {
  return groups.value.find(g => g.id === selectedGroupId.value) || null
})

onMounted(() => {
  loadGroups()
})

// グループ選択時にアイテムを読み込む
watch(selectedGroupId, (newId) => {
  if (newId) {
    loadItems(newId)
  } else {
    items.value = []
  }
})

async function loadGroups() {
  loading.value = true
  error.value = null
  try {
    const data = await supabaseService.getSnippetGroups(true)
    groups.value = data
    
    // like_snippetグループを自動選択
    const likeSnippet = data.find(g => g.label === SYSTEM_RESERVED_LABEL)
    if (likeSnippet && !selectedGroupId.value) {
      selectedGroupId.value = likeSnippet.id
    }
  } catch (err) {
    console.error('Failed to load groups:', err)
    error.value = 'グループの読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

async function loadItems(groupId) {
  itemsLoading.value = true
  try {
    const data = await supabaseService.getSnippetItems(groupId, true)
    items.value = data
  } catch (err) {
    console.error('Failed to load items:', err)
  } finally {
    itemsLoading.value = false
  }
}

function selectGroup(group) {
  selectedGroupId.value = group.id
}

// グループ追加
async function addNewGroup() {
  const label = newGroupLabel.value.trim()
  if (!label) return
  
  if (label === SYSTEM_RESERVED_LABEL) {
    alert('このグループ名は予約されています')
    return
  }
  
  const isDuplicate = groups.value.some(g => g.label === label)
  if (isDuplicate) {
    alert('同じ名前のグループが既に存在します')
    return
  }
  
  try {
    const newGroup = await supabaseService.createSnippetGroup(label)
    groups.value.push(newGroup)
    newGroupLabel.value = ''
    showAddGroupInput.value = false
    selectedGroupId.value = newGroup.id
  } catch (err) {
    console.error('Failed to add group:', err)
    alert(err.message || 'グループの追加に失敗しました')
  }
}

function cancelAddGroup() {
  newGroupLabel.value = ''
  showAddGroupInput.value = false
}

// グループ削除
async function confirmDeleteGroup(group) {
  if (!confirm(`「${group.label}」グループとその中のアイテムをすべて削除しますか？`)) return
  
  try {
    await supabaseService.deleteSnippetGroup(group.id)
    const index = groups.value.findIndex(g => g.id === group.id)
    if (index !== -1) groups.value.splice(index, 1)
    
    if (selectedGroupId.value === group.id) {
      const likeSnippet = groups.value.find(g => g.label === SYSTEM_RESERVED_LABEL)
      selectedGroupId.value = likeSnippet?.id || null
    }
  } catch (err) {
    console.error('Failed to delete group:', err)
    alert(err.message || 'グループの削除に失敗しました')
  }
}

// グループ並べ替え
function handleGroupDragStart(event, group) {
  if (group.label === SYSTEM_RESERVED_LABEL) {
    event.preventDefault()
    return
  }
  draggingGroupId.value = group.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', group.id)
}

function handleGroupDragEnd() {
  draggingGroupId.value = null
  dragOverGroupId.value = null
}

function handleGroupDragOver(event, group) {
  if (group.label === SYSTEM_RESERVED_LABEL) return
  if (draggingGroupId.value && draggingGroupId.value !== group.id) {
    dragOverGroupId.value = group.id
  }
}

function handleGroupDragLeave() {
  dragOverGroupId.value = null
}

async function handleGroupDrop(event, targetGroup) {
  if (targetGroup.label === SYSTEM_RESERVED_LABEL) {
    dragOverGroupId.value = null
    return
  }
  
  const draggedId = draggingGroupId.value
  if (!draggedId || draggedId === targetGroup.id) {
    dragOverGroupId.value = null
    return
  }
  
  const draggedIndex = groups.value.findIndex(g => g.id === draggedId)
  const targetIndex = groups.value.findIndex(g => g.id === targetGroup.id)
  
  if (draggedIndex === -1 || targetIndex === -1) {
    dragOverGroupId.value = null
    return
  }
  
  const [removed] = groups.value.splice(draggedIndex, 1)
  groups.value.splice(targetIndex, 0, removed)
  
  dragOverGroupId.value = null
  
  await updateGroupSortOrders()
}

async function updateGroupSortOrders() {
  const updates = groups.value
    .filter(g => g.label !== SYSTEM_RESERVED_LABEL)
    .map((g, i) => ({
      id: g.id,
      sort_order: (i + 1) * 1000
    }))
  
  groups.value.forEach((g, i) => {
    if (g.label !== SYSTEM_RESERVED_LABEL) {
      g.sort_order = (i + 1) * 1000
    }
  })
  
  try {
    await supabaseService.reorderSnippetGroups(updates)
  } catch (err) {
    console.error('Failed to reorder groups:', err)
    await loadGroups()
  }
}

// アイテム操作
async function addNewItem() {
  const label = newItemLabel.value.trim()
  if (!label || !selectedGroupId.value) return
  
  const isDuplicate = items.value.some(i => i.label === label)
  if (isDuplicate) {
    alert('同じ名前のアイテムが既に存在します')
    return
  }
  
  try {
    const newItem = await supabaseService.createSnippetItem(selectedGroupId.value, label, newItemNewlineAfter.value)
    items.value.push(newItem)
    newItemLabel.value = ''
    newItemNewlineAfter.value = true
  } catch (err) {
    console.error('Failed to add item:', err)
    alert(err.message || 'アイテムの追加に失敗しました')
  }
}

async function handleItemLabelChange(item, event) {
  const newLabel = event.target.value.trim()
  if (newLabel === item.label) return
  if (!newLabel) {
    event.target.value = item.label
    return
  }
  
  const isDuplicate = items.value.some(i => i.id !== item.id && i.label === newLabel)
  if (isDuplicate) {
    alert('同じ名前のアイテムが既に存在します')
    event.target.value = item.label
    return
  }
  
  const oldLabel = item.label
  item.label = newLabel
  try {
    await supabaseService.updateSnippetItem(item.id, { label: newLabel })
  } catch (err) {
    console.error('Failed to update item:', err)
    item.label = oldLabel
    event.target.value = oldLabel
    alert(err.message || 'アイテムの更新に失敗しました')
  }
}

async function deleteItem(item) {
  if (!confirm(`「${item.label}」を削除しますか？`)) return
  
  const index = items.value.findIndex(i => i.id === item.id)
  const removed = items.value.splice(index, 1)[0]
  
  try {
    await supabaseService.deleteSnippetItem(item.id)
  } catch (err) {
    console.error('Failed to delete item:', err)
    items.value.splice(index, 0, removed)
    alert(err.message || 'アイテムの削除に失敗しました')
  }
}

async function handleNewlineToggle(item) {
  const newlineAfter = !item.newline_after
  const oldValue = item.newline_after
  item.newline_after = newlineAfter
  
  try {
    await supabaseService.updateSnippetItem(item.id, { newline_after: newlineAfter })
  } catch (err) {
    console.error('Failed to update newline setting:', err)
    item.newline_after = oldValue
    alert(err.message || '改行設定の更新に失敗しました')
  }
}

// アイテム並べ替え
function handleItemDragStart(event, item) {
  draggingItemId.value = item.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', item.id)
}

function handleItemDragEnd() {
  draggingItemId.value = null
  dragOverItemId.value = null
}

function handleItemDragOver(event, item) {
  if (draggingItemId.value && draggingItemId.value !== item.id) {
    dragOverItemId.value = item.id
  }
}

function handleItemDragLeave() {
  dragOverItemId.value = null
}

async function handleItemDrop(event, targetItem) {
  const draggedId = draggingItemId.value
  if (!draggedId || draggedId === targetItem.id) {
    dragOverItemId.value = null
    return
  }
  
  const draggedIndex = items.value.findIndex(i => i.id === draggedId)
  const targetIndex = items.value.findIndex(i => i.id === targetItem.id)
  
  if (draggedIndex === -1 || targetIndex === -1) {
    dragOverItemId.value = null
    return
  }
  
  const [removed] = items.value.splice(draggedIndex, 1)
  items.value.splice(targetIndex, 0, removed)
  
  dragOverItemId.value = null
  
  await updateItemSortOrders()
}

async function updateItemSortOrders() {
  const updates = items.value.map((i, idx) => ({
    id: i.id,
    sort_order: (idx + 1) * 1000
  }))
  
  items.value.forEach((i, idx) => {
    i.sort_order = (idx + 1) * 1000
  })
  
  try {
    await supabaseService.reorderSnippetItems(updates)
  } catch (err) {
    console.error('Failed to reorder items:', err)
    if (selectedGroupId.value) {
      await loadItems(selectedGroupId.value)
    }
  }
}

// 外部から呼び出せるように公開
defineExpose({
  loadGroups,
  loading
})
</script>

<style scoped>
.custom-snippet-editor {
  padding: 1rem;
  padding-bottom: 150px;
  height: 100%;
}

.editor-header {
  margin-bottom: 1rem;
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

/* 2分割レイアウト */
.editor-content {
  height: calc(100% - 80px);
}

.split-layout {
  display: flex;
  gap: 1rem;
  height: 100%;
}

.groups-panel {
  width: 280px;
  min-width: 200px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
}

.items-panel {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px 8px 0 0;
}

.panel-title {
  font-weight: 600;
  color: #374151;
}

/* グループリスト */
.groups-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.group-item:hover {
  background: #e5e7eb;
}

.group-item.is-selected {
  background: #dbeafe;
  border: 1px solid #3b82f6;
}

.group-item.is-system {
  background: #f3f4f6;
}

.group-item.is-system.is-selected {
  background: #dbeafe;
}

.group-item.is-dragging {
  opacity: 0.5;
}

.group-item.drag-over {
  background: #eff6ff;
  border: 1px dashed #3b82f6;
}

.group-item.add-new {
  border: 1px dashed #d1d5db;
  color: #6b7280;
  justify-content: center;
  margin-top: 0.5rem;
}

.group-item.add-new:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.group-item.add-new-input {
  padding: 0.25rem;
  margin-top: 0.5rem;
}

.group-item.add-new-input input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.79rem;
}

.group-item.add-new-input input:focus {
  outline: none;
  border-color: #3b82f6;
}

.add-icon {
  font-size: 1rem;
}

.group-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.25rem;
  cursor: grab;
  color: #9ca3af;
}

.group-drag-handle:active {
  cursor: grabbing;
}

.group-drag-handle.disabled {
  cursor: default;
  opacity: 0.3;
}

.group-label {
  flex: 1;
  font-size: 0.9375rem;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-label.system-label {
  color: #6b7280;
  font-style: italic;
}

.group-delete-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  color: #9ca3af;
  border-radius: 4px;
  transition: all 0.15s;
  line-height: 1;
}

.group-delete-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* アイテムリスト */
.items-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.empty-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  transition: all 0.15s;
}

.item-row:hover {
  border-color: #d1d5db;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.item-row.is-dragging {
  opacity: 0.5;
  border-color: #3b82f6;
}

.item-row.drag-over {
  border-color: #3b82f6;
  background: #eff6ff;
}

.item-row.add-new {
  background: #f9fafb;
  border-style: dashed;
}

.item-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.5rem;
  cursor: grab;
}

.item-drag-handle:active {
  cursor: grabbing;
}

.item-drag-handle.placeholder {
  visibility: hidden;
}

.drag-icon {
  font-size: 1.125rem;
  color: #9ca3af;
  line-height: 1;
}

.item-label-input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  font-size: 0.9375rem;
  color: #1f2937;
  transition: all 0.15s;
}

.item-label-input:hover {
  background: #f9fafb;
}

.item-label-input:focus {
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

/* 改行トグルボタン */
.newline-toggle-btn {
  padding: 0.375rem 0.625rem;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  color: #9ca3af;
  transition: all 0.15s;
  font-weight: bold;
  min-width: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.newline-toggle-btn:hover {
  border-color: #fb923c;
  background: #fff7ed;
}

.newline-toggle-btn.active {
  border-color: #fb923c;
  background: #fb923c;
  color: white;
}

.newline-toggle-btn.active:hover {
  background: #f97316;
  border-color: #f97316;
}

/* 小さいキャンセルボタン */
.cancel-btn-small {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
  color: #6b7280;
  transition: all 0.15s;
}

.cancel-btn-small:hover {
  background: #fee2e2;
  border-color: #dc2626;
  color: #dc2626;
}
</style>
