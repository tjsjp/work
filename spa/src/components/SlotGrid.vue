<template>
  <div class="slot-grid">
    <div
      v-for="(group, groupIndex) in gridGroups"
      :key="groupIndex"
      class="slot-group"
    >
      <!-- ページ先頭（hasBreakBeforeがtrueのグループ）にのみ区切り線と削除ボタンを表示 -->
      <div v-if="group.hasBreakBefore" class="break-line-container">
        <button
          class="page-toggle-btn"
          @click="togglePage(groupIndex)"
          :title="isPageCollapsed(groupIndex) ? '展開' : '折りたたみ'"
        >
          {{ isPageCollapsed(groupIndex) ? '+' : '−' }}
        </button>
        <div class="page-number-badge">{{ getPageNumber(groupIndex) }}</div>
        <div class="slot-count-badge">{{ getPageSlotCount(groupIndex) }}</div>
        <div class="break-line"></div>
        <div class="template-select-container-inline">
          <select 
            v-model="selectedTemplateIdForPage[groupIndex]"
            class="template-select"
            :disabled="disabled"
          >
            <option 
              v-for="template in slotTemplates" 
              :key="template.id" 
              :value="template.id"
            >
              {{ template.label }}
            </option>
          </select>
          <button 
            class="add-template-btn" 
            :disabled="disabled || !selectedTemplateIdForPage[groupIndex]"
            title="選択したテンプレートをページ先頭に挿入"
            @click="handleAddTemplate(groupIndex)"
          >
            挿入
          </button>
          <button 
            class="create-template-btn" 
            :disabled="disabled"
            title="このページをテンプレートとして保存"
            @click="handleCreateTemplateClick(groupIndex)"
          >
            ☆
          </button>
          <button 
            class="edit-template-btn" 
            :disabled="disabled || !selectedTemplateIdForPage[groupIndex]"
            title="テンプレートを編集"
            @click="handleEditTemplateClick(groupIndex)"
          >
            ✎
          </button>
        </div>
        <button 
          class="delete-page-btn" 
          :disabled="disabled"
          title="ページ開始から次のページ開始までのスロットを削除"
          @click="handleDeletePage(groupIndex)"
        >
          削除
        </button>
      </div>
      
      <div v-if="shouldShowSlotRow(groupIndex)" class="slot-row">
        <div class="slot-column">
          <template v-for="(slot, slotIndex) in group.left" :key="slot.id">
            <SlotItem
              :slot="slot"
              :imageUrls="imageUrls"
              :files="files"
              :work-id="workId"
              :work-phases="workPhases"
              :disabled="disabled"
              :is-left-column="true"
              :all-slots="allSlots"
              :is-slot-dragging="isSlotDragging"
              :custom-snippets="customSnippets"
              :snippet-groups="snippetGroups"
              :snippet-items-by-group="snippetItemsByGroup"
              @assign="handleAssign"
              @unassign="handleUnassign"
              @reorder="handleSlotReorder"
              @upload="handleUpload"
              @update="handleUpdate"
              @insert="handleInsert"
              @copy="handleCopy"
              @delete="handleDelete"
              @file-click="handleFileClick"
              @slot-move="handleSlotMove"
              @slot-swap="handleSlotSwap"
              @add-custom-snippet="handleAddCustomSnippet"
              @show-snippet-list="handleShowSnippetList"
              @slot-copy="handleSlotCopy"
              @file-swap="handleFileSwap"
              @file-copy="handleFileCopy"
              @slot-drag-start="handleSlotDragStart"
              @slot-drag-end="handleSlotDragEnd"
            />
          </template>
        </div>
        
        <div class="slot-column">
          <template v-for="(slot, slotIndex) in group.right" :key="slot.id">
            <SlotItem
              :slot="slot"
              :imageUrls="imageUrls"
              :files="files"
              :work-id="workId"
              :work-phases="workPhases"
              :disabled="disabled"
              :is-left-column="false"
              :all-slots="allSlots"
              :is-slot-dragging="isSlotDragging"
              :custom-snippets="customSnippets"
              :snippet-groups="snippetGroups"
              :snippet-items-by-group="snippetItemsByGroup"
              @assign="handleAssign"
              @unassign="handleUnassign"
              @reorder="handleSlotReorder"
              @upload="handleUpload"
              @update="handleUpdate"
              @insert="handleInsert"
              @copy="handleCopy"
              @delete="handleDelete"
              @file-click="handleFileClick"
              @slot-move="handleSlotMove"
              @slot-swap="handleSlotSwap"
              @add-custom-snippet="handleAddCustomSnippet"
              @show-snippet-list="handleShowSnippetList"
              @slot-copy="handleSlotCopy"
              @file-swap="handleFileSwap"
              @file-copy="handleFileCopy"
              @slot-drag-start="handleSlotDragStart"
              @slot-drag-end="handleSlotDragEnd"
            />
          </template>
        </div>
      </div>
    </div>
    
    <!-- 最後のスロット枠（+ 3+ 6+ボタンのみ表示）- スロットが無いときのみ表示 -->
    <div v-if="slots.length === 0" class="slot-group">
      <div class="slot-row">
        <div class="slot-column slot-column-full">
          <div class="slot-item slot-item-insert-only">
            <div class="slot-header">
              <div class="slot-controls slot-controls-center">
                <button 
                  class="insert-btn insert-btn-plus" 
                  :disabled="disabled"
                  title="空のスロットを1つ挿入"
                  @click="handleInsertPlusAtEnd"
                >
                  ＋
                </button>
                <button 
                  class="insert-btn insert-btn-plus" 
                  :disabled="disabled"
                  title="空のスロットを3つ挿入"
                  @click="handleInsertPlus3AtEnd"
                >
                  3＋
                </button>
                <button 
                  class="insert-btn insert-btn-plus" 
                  :disabled="disabled"
                  title="空のスロットを6つ挿入"
                  @click="handleInsertPlus6AtEnd"
                >
                  6＋
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- スロットの一番最後にもページ区切りとボタン群を表示 -->
    <div v-if="gridGroups.length > 0 || slots.length === 0" class="break-line-container">
      <div class="break-line"></div>
      <div class="template-select-container-inline">
        <select 
          v-model="selectedTemplateIdForPage['last']"
          class="template-select"
          :disabled="disabled"
        >
          <option 
            v-for="template in slotTemplates" 
            :key="template.id" 
            :value="template.id"
          >
            {{ template.label }}
          </option>
        </select>
        <button 
          class="add-template-btn" 
          :disabled="disabled || !selectedTemplateIdForPage['last']"
          title="選択したテンプレートを最後に挿入"
          @click="handleAddTemplateAtEnd"
        >
          挿入
        </button>
      </div>
    </div>
    
    <div v-if="gridGroups.length === 0" class="empty-message">
      スロットがありません
    </div>
    
    <!-- テンプレート作成モーダル -->
    <div v-if="showCreateTemplateModal" class="modal-overlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>テンプレートを作成</h2>
          <button class="close-button" @click="closeCreateTemplateModal">×</button>
        </div>
        <div class="modal-body">
          <label>
            テンプレート名:
            <input
              v-model="templateLabel"
              type="text"
              placeholder="テンプレート名を入力"
              @keyup.enter="handleCreateTemplate"
              autofocus
            />
          </label>
          <div class="modal-actions">
            <button 
              class="create-btn" 
              :disabled="!templateLabel || templateLabel.trim() === ''"
              @click="handleCreateTemplate"
            >
              作成
            </button>
            <button class="cancel-btn" @click="closeCreateTemplateModal">
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- テンプレート編集モーダル -->
    <div v-if="showEditTemplateModal" class="modal-overlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>テンプレートを編集</h2>
          <button class="close-button" @click="closeEditTemplateModal">×</button>
        </div>
        <div class="modal-body">
          <label>
            テンプレート名:
            <input
              v-model="editTemplateLabel"
              type="text"
              placeholder="テンプレート名を入力"
              @keyup.enter="handleUpdateTemplate"
              autofocus
            />
          </label>
          <div class="modal-actions">
            <button 
              class="update-btn" 
              :disabled="!editTemplateLabel || editTemplateLabel.trim() === ''"
              @click="handleUpdateTemplate"
            >
              更新
            </button>
            <button 
              class="delete-btn" 
              @click="handleDeleteTemplate"
            >
              削除
            </button>
            <button class="cancel-btn" @click="closeEditTemplateModal">
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { groupSlotsForGrid } from '../utils/slotSorting'
import SlotItem from './SlotItem.vue'

const props = defineProps({
  slots: {
    type: Array,
    required: true
  },
  imageUrls: {
    type: Object,
    default: () => ({})
  },
  files: {
    type: Array,
    default: () => []
  },
  workId: {
    type: String,
    required: true
  },
  workPhases: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  },
  allSlots: {
    type: Array,
    default: () => []
  },
  isSlotDragging: {
    type: Boolean,
    default: false
  },
  slotTemplates: {
    type: Array,
    default: () => []
  },
  customSnippets: {
    type: Array,
    default: () => []
  },
  snippetGroups: {
    type: Array,
    default: () => []
  },
  snippetItemsByGroup: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['reorder', 'assign', 'unassign', 'upload', 'update', 'insert', 'copy', 'delete', 'delete-page', 'file-click', 'slot-move', 'slot-swap', 'slot-copy', 'file-swap', 'file-copy', 'slot-drag-start', 'slot-drag-end', 'add-template', 'create-template', 'update-template', 'delete-template', 'add-custom-snippet'])

const selectedTemplateIdForPage = ref({})
const showCreateTemplateModal = ref(false)
const templateLabel = ref('')
const currentGroupIndexForTemplate = ref(null)
const showEditTemplateModal = ref(false)
const editTemplateLabel = ref('')
const currentEditTemplateId = ref(null)
const currentEditGroupIndex = ref(null)
const collapsedPages = ref(new Set()) // 折りたたまれたページのページ開始スロットIDを保持

const gridGroups = computed(() => {
  return groupSlotsForGrid(props.slots)
})

// 区切り線を表示するかどうかを判定（すべてのページ先頭で表示）
function shouldShowBreakLine(group, groupIndex) {
  // すべてのグループで区切り線を表示
  return true
}

function handleAssign(slotId, fileId) {
  emit('assign', slotId, fileId)
}

function handleUnassign(slotId) {
  emit('unassign', slotId)
}

function handleUpload(files, slotId) {
  emit('upload', files, slotId)
}

function handleSlotReorder(fromSlotId, toSlotId) {
  // スロットの並び替え
  const fromIndex = props.slots.findIndex(s => s.id === fromSlotId)
  const toIndex = props.slots.findIndex(s => s.id === toSlotId)
  
  if (fromIndex === -1 || toIndex === -1) return
  
  // 新しい順序を計算
  const newOrder = [...props.slots]
  const [moved] = newOrder.splice(fromIndex, 1)
  newOrder.splice(toIndex, 0, moved)
  
  // 親コンポーネントに通知
  emit('reorder', newOrder.map(s => s.id))
}

function handleUpdate(slotId, updates) {
  emit('update', slotId, updates)
}

// スロット挿入のハンドラー（SlotItemからemitされたイベントを受け取る）
function handleInsert({ sourceSlotId, targetSlotId, position }) {
  // そのまま親コンポーネントに渡す（App.vueで処理）
  emit('insert', {
    sourceSlotId: sourceSlotId,
    targetSlotId: targetSlotId,
    position: position
  })
}

function handleDelete(slotId) {
  emit('delete', slotId)
}

function handleCopy({ sourceSlotId, targetSlotId, work_phase_id, note, caption }) {
  emit('copy', { sourceSlotId, targetSlotId, work_phase_id, note, caption })
}

function handleFileClick(file) {
  emit('file-click', file)
}

function handleAddCustomSnippet(selectedText) {
  emit('add-custom-snippet', selectedText)
}

// 最後のスロット枠での挿入処理
function handleInsertPlusAtEnd() {
  // 最後のページの最後のスロットを取得
  if (props.slots.length === 0) {
    emit('insert', {
      sourceSlotId: null,
      targetSlotId: null,
      position: 'plus'
    })
    return
  }
  
  // ページ番号でソートして、最後のページの最後のスロットを取得
  const sortedByPage = [...props.slots].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber
    }
    return a.slotNumberInPage - b.slotNumberInPage
  })
  
  const lastPageNumber = sortedByPage[sortedByPage.length - 1]?.pageNumber
  const lastPageSlots = sortedByPage.filter(s => s.pageNumber === lastPageNumber)
  const lastSlot = lastPageSlots[lastPageSlots.length - 1]
  
  if (lastSlot) {
    emit('insert', {
      sourceSlotId: null,
      targetSlotId: lastSlot.id,
      position: 'plus'
    })
  } else {
    emit('insert', {
      sourceSlotId: null,
      targetSlotId: null,
      position: 'plus'
    })
  }
}

function handleInsertPlus3AtEnd() {
  if (props.slots.length === 0) {
    emit('insert', {
      sourceSlotId: null,
      targetSlotId: null,
      position: 'plus3'
    })
    return
  }
  
  const sortedByPage = [...props.slots].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber
    }
    return a.slotNumberInPage - b.slotNumberInPage
  })
  
  const lastPageNumber = sortedByPage[sortedByPage.length - 1]?.pageNumber
  const lastPageSlots = sortedByPage.filter(s => s.pageNumber === lastPageNumber)
  const lastSlot = lastPageSlots[lastPageSlots.length - 1]
  
  if (lastSlot) {
    emit('insert', {
      sourceSlotId: null,
      targetSlotId: lastSlot.id,
      position: 'plus3'
    })
  } else {
    emit('insert', {
      sourceSlotId: null,
      targetSlotId: null,
      position: 'plus3'
    })
  }
}

function handleInsertPlus6AtEnd() {
  if (props.slots.length === 0) {
    emit('insert', {
      sourceSlotId: null,
      targetSlotId: null,
      position: 'plus6'
    })
    return
  }
  
  const sortedByPage = [...props.slots].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber
    }
    return a.slotNumberInPage - b.slotNumberInPage
  })
  
  const lastPageNumber = sortedByPage[sortedByPage.length - 1]?.pageNumber
  const lastPageSlots = sortedByPage.filter(s => s.pageNumber === lastPageNumber)
  const lastSlot = lastPageSlots[lastPageSlots.length - 1]
  
  if (lastSlot) {
    emit('insert', {
      sourceSlotId: null,
      targetSlotId: lastSlot.id,
      position: 'plus6'
    })
  } else {
    emit('insert', {
      sourceSlotId: null,
      targetSlotId: null,
      position: 'plus6'
    })
  }
}

function handleDeletePage(groupIndex) {
  // ページの最初のグループを取得（hasBreakBeforeがtrueのグループ）
  const firstGroupIndex = findFirstGroupIndexInPage(groupIndex)
  if (firstGroupIndex === -1) return
  
  emit('delete-page', firstGroupIndex)
}

// ページ内の最初のグループインデックスを取得
function findFirstGroupIndexInPage(groupIndex) {
  // 現在のグループから遡って、hasBreakBeforeがtrueのグループを探す
  for (let i = groupIndex; i >= 0; i--) {
    if (gridGroups.value[i]?.hasBreakBefore) {
      return i
    }
  }
  // 見つからない場合は最初のグループを返す
  return 0
}

// ページ番号を取得
function getPageNumber(groupIndex) {
  const firstGroupIndex = findFirstGroupIndexInPage(groupIndex)
  // 最初のグループの左側または右側の最初のスロットからページ番号を取得
  const firstGroup = gridGroups.value[firstGroupIndex]
  if (firstGroup && firstGroup.left.length > 0) {
    // group.left[0]はスロットオブジェクトそのもの
    return firstGroup.left[0]?.pageNumber || 1
  }
  if (firstGroup && firstGroup.right.length > 0) {
    // group.right[0]はスロットオブジェクトそのもの
    return firstGroup.right[0]?.pageNumber || 1
  }
  return 1
}

// ページ内のスロット数を取得
function getPageSlotCount(groupIndex) {
  const firstGroupIndex = findFirstGroupIndexInPage(groupIndex)
  
  // ページ内のすべてのスロットをカウント
  let count = 0
  let currentIndex = firstGroupIndex
  
  // 次のページ開始（hasBreakBeforeがtrue）まで、または最後までスロットをカウント
  while (currentIndex < gridGroups.value.length) {
    const group = gridGroups.value[currentIndex]
    if (!group) break
    
    // 次のページ開始に到達したら終了（最初のグループ以外でhasBreakBeforeがtrue）
    if (currentIndex > firstGroupIndex && group.hasBreakBefore) {
      break
    }
    
    // 左側のスロット
    count += group.left.length
    // 右側のスロット
    count += group.right.length
    
    currentIndex++
  }
  
  return count
}

// ページ開始スロットのIDを取得（break_beforeがtrueのスロット、または最初のページの最初のスロット）
function getPageStartSlotId(groupIndex) {
  const firstGroupIndex = findFirstGroupIndexInPage(groupIndex)
  const firstGroup = gridGroups.value[firstGroupIndex]
  
  if (!firstGroup) return null
  
  // 最初のグループの最初のスロット（左側または右側）を取得
  let firstSlot = null
  if (firstGroup.left.length > 0) {
    firstSlot = firstGroup.left[0]
  } else if (firstGroup.right.length > 0) {
    firstSlot = firstGroup.right[0]
  }
  
  if (!firstSlot) return null
  
  // 最初のページの場合、最初のスロットをページ開始スロットとして扱う
  if (firstGroupIndex === 0) {
    return firstSlot.id
  }
  
  // 最初のページ以外の場合、最初のグループ内でbreak_beforeがtrueのスロットを探す
  // groupSlotsForGridのロジック上、break_beforeがtrueのスロットでページが区切られるため、
  // 最初のグループの最初のスロットがページ開始スロットのはず
  // 念のため、最初のグループ内のすべてのスロットを確認
  const allSlotsInFirstGroup = [...firstGroup.left, ...firstGroup.right]
  for (const slot of allSlotsInFirstGroup) {
    const slotObj = props.slots.find(s => s.id === slot.id)
    if (slotObj && slotObj.break_before) {
      return slot.id
    }
  }
  
  // break_beforeがtrueのスロットが見つからない場合、最初のスロットをページ開始として扱う
  // （これは通常発生しないはずだが、念のため）
  return firstSlot.id
}

// ページが折りたたまれているかどうかを判定
function isPageCollapsed(groupIndex) {
  const pageStartSlotId = getPageStartSlotId(groupIndex)
  if (!pageStartSlotId) return false
  
  // ページ開始スロットIDで折りたたみ状態を確認
  // デフォルトでは展開状態（false）なので、Setに含まれていれば折りたたまれている
  return collapsedPages.value.has(pageStartSlotId)
}

// ページの折りたたみをトグル
function togglePage(groupIndex) {
  const pageStartSlotId = getPageStartSlotId(groupIndex)
  if (!pageStartSlotId) return
  
  if (collapsedPages.value.has(pageStartSlotId)) {
    collapsedPages.value.delete(pageStartSlotId)
  } else {
    collapsedPages.value.add(pageStartSlotId)
  }
}

// スロット行を表示するかどうかを判定
function shouldShowSlotRow(groupIndex) {
  // このグループが属するページのページ開始スロットIDを取得
  const pageStartSlotId = getPageStartSlotId(groupIndex)
  if (!pageStartSlotId) return true
  
  // ページが折りたたまれている場合は非表示
  return !collapsedPages.value.has(pageStartSlotId)
}

function handleAddTemplate(groupIndex) {
  const templateId = selectedTemplateIdForPage.value[groupIndex]
  if (!templateId) return
  
  // グループの最初のスロットを取得
  const group = gridGroups.value[groupIndex]
  if (!group) return
  
  const firstSlot = group.left[0] || group.right[0]
  if (!firstSlot) return
  
  // 最初のスロットの一つ前のスロットを探す
  let targetSortIndex = 0
  if (groupIndex > 0) {
    // 前のグループの最後のスロットを取得
    const prevGroup = gridGroups.value[groupIndex - 1]
    const prevLastSlot = prevGroup?.right[prevGroup.right.length - 1] || prevGroup?.left[prevGroup.left.length - 1]
    if (prevLastSlot && prevLastSlot.originalSortIndex !== undefined) {
      targetSortIndex = prevLastSlot.originalSortIndex + 1
    }
  }
  
  emit('add-template', {
    templateId,
    sortIndex: targetSortIndex,
    groupIndex
  })
  
  // 選択後にリセット
  selectedTemplateIdForPage.value[groupIndex] = null
}

function handleSlotDragStart() {
  emit('slot-drag-start')
}

function handleSlotDragEnd() {
  emit('slot-drag-end')
}

function handleSlotMove(fromSlotId, toSlotId, zone) {
  emit('slot-move', fromSlotId, toSlotId, zone)
}

function handleSlotSwap(slotId1, slotId2) {
  emit('slot-swap', slotId1, slotId2)
}

function handleSlotCopy(sourceSlotId, targetSlotId) {
  emit('slot-copy', sourceSlotId, targetSlotId)
}

function handleFileSwap(slotId1, slotId2) {
  emit('file-swap', slotId1, slotId2)
}

function handleFileCopy(sourceSlotId, targetSlotId) {
  emit('file-copy', sourceSlotId, targetSlotId)
}

function handleCreateTemplateClick(groupIndex) {
  currentGroupIndexForTemplate.value = groupIndex
  templateLabel.value = ''
  showCreateTemplateModal.value = true
}

function closeCreateTemplateModal() {
  showCreateTemplateModal.value = false
  templateLabel.value = ''
  currentGroupIndexForTemplate.value = null
}

function handleCreateTemplate() {
  if (!templateLabel.value || templateLabel.value.trim() === '') {
    return
  }
  
  // ラベルの重複チェック
  const trimmedLabel = templateLabel.value.trim()
  const duplicateTemplate = props.slotTemplates.find(t => t.label === trimmedLabel)
  if (duplicateTemplate) {
    alert(`テンプレート名「${trimmedLabel}」は既に存在します。別の名前を入力してください。`)
    return
  }
  
  const groupIndex = currentGroupIndexForTemplate.value
  if (groupIndex === null || groupIndex === undefined) {
    return
  }
  
  // ページの最初のグループインデックスを取得
  const firstGroupIndex = findFirstGroupIndexInPage(groupIndex)
  
  // ページ内のすべてのグループからスロットIDを取得
  const slotIds = []
  let currentIndex = firstGroupIndex
  
  // 次のページ開始（hasBreakBeforeがtrue）まで、または最後までスロットを収集
  while (currentIndex < gridGroups.value.length) {
    const group = gridGroups.value[currentIndex]
    if (!group) break
    
    // 次のページ開始に到達したら終了（最初のグループ以外でhasBreakBeforeがtrue）
    if (currentIndex > firstGroupIndex && group.hasBreakBefore) {
      break
    }
    
    // 左側のスロット
    group.left.forEach(slot => {
      if (slot && slot.id) {
        slotIds.push(slot.id)
      }
    })
    // 右側のスロット
    group.right.forEach(slot => {
      if (slot && slot.id) {
        slotIds.push(slot.id)
      }
    })
    
    currentIndex++
  }
  
  if (slotIds.length === 0) {
    closeCreateTemplateModal()
    return
  }
  
  emit('create-template', {
    label: templateLabel.value.trim(),
    slotIds: slotIds,
    groupIndex: firstGroupIndex
  })
  
  closeCreateTemplateModal()
}

function handleEditTemplateClick(groupIndex) {
  const templateId = selectedTemplateIdForPage.value[groupIndex]
  if (!templateId) return
  
  const template = props.slotTemplates.find(t => t.id === templateId)
  if (!template) return
  
  currentEditTemplateId.value = templateId
  currentEditGroupIndex.value = groupIndex
  editTemplateLabel.value = template.label
  showEditTemplateModal.value = true
}

function closeEditTemplateModal() {
  showEditTemplateModal.value = false
  editTemplateLabel.value = ''
  currentEditTemplateId.value = null
  currentEditGroupIndex.value = null
}

function handleUpdateTemplate() {
  if (!editTemplateLabel.value || editTemplateLabel.value.trim() === '') {
    return
  }
  
  if (!currentEditTemplateId.value) {
    return
  }
  
  // ラベルの重複チェック（自分自身は除外）
  const trimmedLabel = editTemplateLabel.value.trim()
  const duplicateTemplate = props.slotTemplates.find(t => t.label === trimmedLabel && t.id !== currentEditTemplateId.value)
  if (duplicateTemplate) {
    alert(`テンプレート名「${trimmedLabel}」は既に存在します。別の名前を入力してください。`)
    return
  }
  
  emit('update-template', {
    templateId: currentEditTemplateId.value,
    label: trimmedLabel
  })
  
  closeEditTemplateModal()
}

function handleDeleteTemplate() {
  if (!currentEditTemplateId.value) {
    return
  }
  
  if (!confirm('このテンプレートを削除しますか？')) {
    return
  }
  
  emit('delete-template', {
    templateId: currentEditTemplateId.value
  })
  
  closeEditTemplateModal()
}

// 最後にテンプレートを追加
function handleAddTemplateAtEnd() {
  const templateId = selectedTemplateIdForPage.value['last']
  if (!templateId) return
  
  let targetSortIndex = 0
  
  // スロットが存在する場合、最後のスロットのsort_index + 1を計算
  if (props.slots.length > 0) {
    const sortedSlots = [...props.slots].sort((a, b) => {
      if (a.sort_index !== b.sort_index) {
        return a.sort_index - b.sort_index
      }
      return 0
    })
    const lastSlotFromProps = sortedSlots[sortedSlots.length - 1]
    if (lastSlotFromProps && lastSlotFromProps.sort_index !== undefined) {
      targetSortIndex = lastSlotFromProps.sort_index + 1
    }
  } else if (gridGroups.value.length > 0) {
    // gridGroupsから最後のスロットを取得
    const lastGroup = gridGroups.value[gridGroups.value.length - 1]
    const lastSlot = lastGroup?.right[lastGroup.right.length - 1] || lastGroup?.left[lastGroup.left.length - 1]
    if (lastSlot && lastSlot.originalSortIndex !== undefined) {
      targetSortIndex = lastSlot.originalSortIndex + 1
    }
  }
  // スロットが空の場合はtargetSortIndex = 0のまま
  
  emit('add-template', {
    templateId,
    sortIndex: targetSortIndex,
    groupIndex: gridGroups.value.length > 0 ? gridGroups.value.length - 1 : null
  })
  
  // 選択後にリセット
  selectedTemplateIdForPage.value['last'] = null
}

// 最後のページをテンプレートとして作成
function handleCreateTemplateClickAtEnd() {
  if (gridGroups.value.length === 0) return
  
  // 最後のページの最初のグループインデックスを取得
  let lastPageFirstGroupIndex = gridGroups.value.length - 1
  for (let i = gridGroups.value.length - 1; i >= 0; i--) {
    if (gridGroups.value[i]?.hasBreakBefore) {
      lastPageFirstGroupIndex = i
      break
    }
  }
  
  currentGroupIndexForTemplate.value = lastPageFirstGroupIndex
  templateLabel.value = ''
  showCreateTemplateModal.value = true
}

// スロットが無い時のテンプレート作成（実際にはスロットが無いのでエラーになるが、モーダルは表示）
function handleCreateTemplateClickAtEndForEmpty() {
  // スロットが無い場合はテンプレート作成できない
  alert('スロットが無いため、テンプレートを作成できません。')
  return
}

// 最後のページを削除
function handleDeleteLastPage() {
  if (gridGroups.value.length === 0) return
  
  // 最後のページの最初のグループインデックスを取得
  let lastPageFirstGroupIndex = gridGroups.value.length - 1
  for (let i = gridGroups.value.length - 1; i >= 0; i--) {
    if (gridGroups.value[i]?.hasBreakBefore) {
      lastPageFirstGroupIndex = i
      break
    }
  }
  
  emit('delete-page', lastPageFirstGroupIndex)
}

// ドラッグ時の自動スクロール処理（画像、ファイル、スロットすべてに対応）
let scrollInterval = null
const SCROLL_SPEED = 10 // スクロール速度
const SCROLL_THRESHOLD = 200 // スクロール反応領域（200px）
let cachedLeftPanel = null // レフトパネルのスクロール要素
let cachedRightPanel = null // ライトパネルのスクロール要素
let searchAttempted = false // 検索を試みたか
let isDragging = false // ドラッグ中フラグ

function findScrollableParent(startElement, includeSelf = true) {
  let element = includeSelf ? startElement : startElement.parentElement
  let depth = 0
  let fallbackElement = null // scrollTop=0でもスクロール可能な要素
  
  while (element && depth < 10) {
    const scrollTop = element.scrollTop
    const scrollHeight = element.scrollHeight
    const clientHeight = element.clientHeight
    const styles = window.getComputedStyle(element)
    const overflowY = styles.overflowY
    
    // 表示されていない要素はスキップ
    if (clientHeight === 0 || scrollHeight === 0) {
      element = element.parentElement
      depth++
      continue
    }
    
    // scrollTopが0より大きい = 実際にスクロールされている要素（最優先）
    if (scrollTop > 0) {
      return element
    }
    
    // scrollTop=0でも、スクロール可能な要素を候補として保存
    if (!fallbackElement && 
        (overflowY === 'auto' || overflowY === 'scroll') && 
        scrollHeight > clientHeight) {
      fallbackElement = element
    }
    
    element = element.parentElement
    depth++
  }
  
  // scrollTop>0の要素が見つからなければ、候補を返す
  return fallbackElement
}

function handleDragScroll(event) {
  if (!isDragging) {
    return
  }
  
  // 初回のみ要素を探す
  if ((!cachedLeftPanel || !cachedRightPanel) && !searchAttempted) {
    searchAttempted = true
    
    // レフトパネルの検索（edit タブ内の .main-content > .left-panel を探す）
    const mainContent = document.querySelector('.edit-tab-container .main-content')
    const leftPanelStart = mainContent ? mainContent.querySelector('.left-panel') : null
    
    if (leftPanelStart && leftPanelStart.clientHeight > 0) {
      cachedLeftPanel = findScrollableParent(leftPanelStart)
    }
    
    // ライトパネルの検索
    const rightPanelStart = document.querySelector('.slot-grid-section')
    if (rightPanelStart) {
      cachedRightPanel = findScrollableParent(rightPanelStart)
    }
  }
  
  // マウス位置に応じてどちらのパネルをスクロールするか決定
  const mouseX = event.clientX
  const mouseY = event.clientY
  
  let viewport = null
  
  // レフトパネル内かチェック
  if (cachedLeftPanel) {
    const leftRect = cachedLeftPanel.getBoundingClientRect()
    if (mouseX >= leftRect.left && mouseX <= leftRect.right &&
        mouseY >= leftRect.top && mouseY <= leftRect.bottom) {
      viewport = cachedLeftPanel
    }
  }
  
  // ライトパネル内かチェック
  if (!viewport && cachedRightPanel) {
    const rightRect = cachedRightPanel.getBoundingClientRect()
    if (mouseX >= rightRect.left && mouseX <= rightRect.right &&
        mouseY >= rightRect.top && mouseY <= rightRect.bottom) {
      viewport = cachedRightPanel
    }
  }
  
  if (!viewport) return
  
  const viewportRect = viewport.getBoundingClientRect()
  const topBoundary = viewportRect.top
  const topThreshold = topBoundary + SCROLL_THRESHOLD
  const bottomThreshold = viewportRect.bottom - SCROLL_THRESHOLD
  
  // 既存のスクロールをクリア
  if (scrollInterval) {
    clearInterval(scrollInterval)
    scrollInterval = null
  }
  
  // 上方向へのスクロール
  if (mouseY < topThreshold) {
    const distance = topThreshold - mouseY
    const speed = Math.min(SCROLL_SPEED * (distance / SCROLL_THRESHOLD), SCROLL_SPEED * 2)
    scrollInterval = setInterval(() => {
      viewport.scrollTop -= speed
    }, 16)
  }
  // 下方向へのスクロール
  else if (mouseY > bottomThreshold) {
    const distance = mouseY - bottomThreshold
    const speed = Math.min(SCROLL_SPEED * (distance / SCROLL_THRESHOLD), SCROLL_SPEED * 2)
    scrollInterval = setInterval(() => {
      viewport.scrollTop += speed
    }, 16)
  }
}

function stopDragScroll() {
  if (scrollInterval) {
    clearInterval(scrollInterval)
    scrollInterval = null
  }
}

function startGlobalDragListener() {
  isDragging = true
  cachedLeftPanel = null
  cachedRightPanel = null
  searchAttempted = false
  document.addEventListener('dragover', handleDragScroll)
}

function stopGlobalDragListener() {
  isDragging = false
  document.removeEventListener('dragover', handleDragScroll)
  stopDragScroll()
  cachedLeftPanel = null
  cachedRightPanel = null
  searchAttempted = false
}

// スロットドラッグを監視
watch(() => props.isSlotDragging, (isDragging) => {
  if (isDragging) {
    startGlobalDragListener()
  } else {
    stopGlobalDragListener()
  }
})

// グローバルイベントハンドラー
const globalDragStartHandler = (e) => {
  // スロットドラッグ以外の場合（ファイル、画像など）
  if (!props.isSlotDragging) {
    startGlobalDragListener()
  }
}

const globalDragEndHandler = (e) => {
  if (!props.isSlotDragging) {
    stopGlobalDragListener()
  } else {
    stopDragScroll()
  }
}

const globalDropHandler = (e) => {
  if (!props.isSlotDragging) {
    stopGlobalDragListener()
  } else {
    stopDragScroll()
  }
}

// ドキュメントレベルのドラッグイベントを監視（ファイルドラッグなど）
onMounted(() => {
  document.addEventListener('dragstart', globalDragStartHandler)
  document.addEventListener('dragend', globalDragEndHandler)
  document.addEventListener('drop', globalDropHandler)
})

// コンポーネント破棄時にクリーンアップ
onUnmounted(() => {
  document.removeEventListener('dragstart', globalDragStartHandler)
  document.removeEventListener('dragend', globalDragEndHandler)
  document.removeEventListener('drop', globalDropHandler)
  stopGlobalDragListener()
})

// コンポーネント破棄時にクリーンアップ
onUnmounted(() => {
  document.removeEventListener('dragover', handleDragScroll)
  document.removeEventListener('dragend', stopDragScroll)
  document.removeEventListener('drop', stopDragScroll)
  stopDragScroll()
})
</script>

<style scoped>
.slot-grid {
  padding: 0.5rem;
}

.slot-group {
  margin-bottom: 2rem;
}

.break-line-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  width: 100%;
}

.page-toggle-btn {
  width: 28px;
  height: 20px;
  border: 1px solid #9ca3af;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  padding: 0;
  flex-shrink: 0;
  transition: all 0.2s;
}

.page-toggle-btn:hover {
  background: #f3f4f6;
  border-color: #6b7280;
}

.page-number-badge {
  background: #ef4444;
  color: white;
  border-radius: 12px;
  padding: 0.125rem 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.slot-count-badge {
  background: #3b82f6;
  color: white;
  border-radius: 12px;
  padding: 0.125rem 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.template-select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 200px;
}

.template-select:hover:not(:disabled) {
  border-color: #3b82f6;
}

.template-select:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.6;
}

.break-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, transparent, #d1d5db, transparent);
}

.delete-page-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  transition: all 0.2s;
  flex-shrink: 0;
}

.delete-page-btn:hover:not(:disabled) {
  background: #dc2626;
  transform: scale(1.05);
}

.delete-page-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.delete-page-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.template-select-container-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.add-template-btn {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  transition: all 0.2s;
  flex-shrink: 0;
}

.add-template-btn:hover:not(:disabled) {
  background: #059669;
  transform: scale(1.05);
}

.add-template-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.add-template-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.create-template-btn {
  background: #fb923c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  transition: all 0.2s;
  flex-shrink: 0;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-template-btn:hover:not(:disabled) {
  background: #f97316;
  transform: scale(1.05);
}

.create-template-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.create-template-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.edit-template-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  transition: all 0.2s;
  flex-shrink: 0;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-template-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: scale(1.05);
}

.edit-template-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.edit-template-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

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

.modal-body label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.modal-body input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.modal-body input:focus {
  outline: none;
  border-color: #3b82f6;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.create-btn {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  transition: all 0.2s;
}

.create-btn:hover:not(:disabled) {
  background: #059669;
}

.create-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.cancel-btn {
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #4b5563;
}

.update-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  transition: all 0.2s;
}

.update-btn:hover:not(:disabled) {
  background: #2563eb;
}

.update-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.delete-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #dc2626;
}

.slot-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  align-items: start;
}

.slot-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  width: 100%;
}


.empty-message {
  text-align: center;
  padding: 4rem 2rem;
  color: #9ca3af;
}

.slot-column-full {
  grid-column: 1 / -1;
}

.slot-item-insert-only {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #e5e7eb;
  background: #f9fafb;
  border-radius: 8px;
  padding: 0.5rem;
}

.slot-item-insert-only .slot-header {
  width: 100%;
  justify-content: center !important;
  display: flex;
}

.slot-controls-center {
  justify-content: center !important;
  width: 100%;
  display: flex;
}

.slot-item-insert-only .insert-btn-plus {
  width: 48px !important; /* 24px * 2 = 48px */
  height: 48px !important; /* 24px * 2 = 48px */
  font-size: 1.5rem !important; /* 0.75rem * 2 = 1.5rem */
}

.insert-btn-plus {
  background: #86efac !important;
  color: #065f46 !important;
}

.insert-btn-plus:hover:not(:disabled) {
  background: #6ee7b7 !important;
}

.insert-btn-plus:active:not(:disabled) {
  background: #34d399 !important;
}
</style>

