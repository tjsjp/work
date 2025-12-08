<template>
  <div 
    class="unassigned-files"
    @dragover.prevent="handleDragOver"
    @drop.prevent="handleDrop"
    @dragleave="handleDragLeave"
    @dragend="handleDragEnd"
    ref="unassignedFilesContainer"
  >
    <!-- カテゴリー追加セクション -->
    <div class="category-add-section">
      <div class="category-add-input-wrapper">
        <input 
          type="text"
          v-model="newCategoryLabel"
          class="category-add-input"
          placeholder="カテゴリー名を入力..."
          list="existing-categories-list"
          @keydown.enter="handleAddCategoryInline"
        />
        <datalist id="existing-categories-list">
          <option v-for="template in (categoryLabelTemplates || [])" :key="template.id" :value="template.label" />
        </datalist>
      </div>
      <label class="category-add-phase-checkbox">
        <input type="checkbox" v-model="newCategoryIsPhase" />
        <span>フェーズ</span>
      </label>
      <button class="category-add-btn" @click="handleAddCategoryInline" :disabled="!newCategoryLabel.trim()">
        <span>＋追加</span>
      </button>
    </div>

    <!-- カテゴリー/フェーズごとのドロップ領域とファイル表示 -->
    <div v-if="validWorkCategories && validWorkCategories.length > 0" class="category-drop-zones">
      <div
        v-for="category in validWorkCategories"
        :key="category.id"
        class="category-zone"
      >
        <div class="category-label-container">
          <button
            class="category-toggle-btn"
            @click="toggleCategory(category.id)"
            :title="collapsedCategories.has(category.id) ? '展開' : '折りたたみ'"
          >
            {{ collapsedCategories.has(category.id) ? '+' : '−' }}
          </button>
          <div class="category-file-count-badge">{{ getCategoryFileCount(category.id) }}</div>
          <input 
            type="text"
            :value="category.label"
            @blur="handleCategoryLabelChange(category.id, $event)"
            @keydown.enter="$event.target.blur()"
            class="category-label-input"
            placeholder="カテゴリー名"
          />
          <div class="category-actions-right">
            <button
              class="category-star-btn"
              :class="{ 'is-template': isLabelInTemplate(category.label) }"
              @click.stop="handleAddToTemplate(category.label)"
              :title="isLabelInTemplate(category.label) ? 'テンプレート登録済み' : 'テンプレートに追加'"
              :disabled="isLabelInTemplate(category.label)"
            >
              {{ isLabelInTemplate(category.label) ? '★' : '☆' }}
            </button>
            <span v-if="category.is_phase" class="category-phase-badge" title="フェーズあり">📁</span>
            <button
              v-if="getCategoryFileCount(category.id) > 0"
              class="category-delete-all-btn"
              @click.stop="handleDeleteAllInCategory(category.id)"
              title="このカテゴリー内のすべてのファイルを削除"
            >
              一括削除
            </button>
            <button
              class="category-remove-btn"
              @click.stop="handleDeleteCategory(category.id)"
              title="このカテゴリーを削除"
            >
              カテゴリ削除
            </button>
          </div>
        </div>
        <div v-if="!collapsedCategories.has(category.id)" class="phases-container-with-files">
          <!-- is_phaseがtrueの場合：全フェーズを表示 -->
          <template v-if="category.is_phase">
            <div
              v-for="phase in workPhases"
              :key="phase.id"
              class="phase-drop-zone-with-files"
              :class="{ 'drag-over-phase': dragOverPhaseId === `${category.id}-${phase.id}` }"
              @dragover.prevent="handlePhaseDragOver($event, category.id, phase.id)"
              @dragleave="handlePhaseDragLeave"
              @drop.prevent="handlePhaseDrop($event, category.id, phase.id)"
            >
              <div class="phase-label-container">
                <div class="phase-label-small">{{ phase.label || `Phase ${phase.id}` }}</div>
                <button
                  v-if="hasFilesInPhase(category.id, phase.id)"
                  class="phase-delete-all-btn"
                  @click.stop="handleDeleteAllInPhase(category.id, phase.id)"
                  title="このフェーズ内のすべてのファイルを削除"
                >
                  一括削除
                </button>
              </div>
              <div v-if="!hasFilesInPhase(category.id, phase.id)" class="phase-hint-small">ここにドロップ</div>
              
              <!-- このフェーズに属するファイルを表示 -->
              <div v-if="hasFilesInPhase(category.id, phase.id)" class="phase-files-grid">
                <div
                  v-for="file in filesByCategoryAndPhase[category.id]?.[phase.id] || []"
                  :key="file.id"
                  class="file-item-small"
                  :draggable="true"
                  @dragstart="handleDragStart($event, file)"
                  @click="handleFileClick(file)"
                >
                  <div class="file-thumbnail-small" :class="{ 'non-standard-aspect': !file.is_standard_aspect_ratio }">
                    <img
                      v-if="imageUrls[file.id]"
                      :src="imageUrls[file.id]"
                      :alt="file.original_name || '画像'"
                      :style="{ transform: `rotate(${file.rotation || 0}deg)`, opacity: file.is_standard_aspect_ratio !== false ? 1 : 0.3, ...getImageStyle(file) }"
                      @error="handleImageError"
                    />
                    <div v-else class="file-placeholder-small">
                      <span>📄</span>
                    </div>
                    <div
                      v-if="!file.is_standard_aspect_ratio"
                      class="non-standard-mark-small"
                      title="標準アスペクト比ではありません"
                    >
                      ✕
                    </div>
                    <button
                      class="file-remove-btn-small"
                      @click.stop="handleDeleteFile(file.id)"
                      title="ファイルを削除"
                    >
                      ✕
                    </button>
                    <button
                      class="file-remove-category-btn-small"
                      @click.stop="handleRemoveCategory(file.id)"
                      title="カテゴリーとフェーズを削除"
                    >
                      ↓
                    </button>
                  </div>
                  <div class="file-info-small">
                    <div class="file-name-small" :title="file.original_name">
                      {{ file.original_name || '無名ファイル' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          
          <!-- is_phaseがfalseの場合：カテゴリー直下にドロップ -->
          <template v-else>
            <div
              class="category-drop-zone-without-phase"
              :class="{ 
                'drag-over-phase': dragOverPhaseId === `${category.id}-null`,
                'has-files': hasFilesInCategoryWithoutPhase(category.id)
              }"
              @dragover.prevent="handleCategoryDragOver($event, category.id)"
              @dragleave="handleCategoryDragLeave"
              @drop.prevent="handleCategoryDrop($event, category.id)"
            >
              <div v-if="!hasFilesInCategoryWithoutPhase(category.id)" class="category-hint-small">ここにドロップ</div>
              
              <!-- このカテゴリーに属するファイル（フェーズなし）を表示 -->
              <div v-if="hasFilesInCategoryWithoutPhase(category.id)" class="phase-files-grid">
                <div
                  v-for="file in filesByCategoryWithoutPhase[category.id] || []"
                  :key="file.id"
                  class="file-item-small"
                  :draggable="true"
                  @dragstart="handleDragStart($event, file)"
                  @click="handleFileClick(file)"
                >
                  <div class="file-thumbnail-small" :class="{ 'non-standard-aspect': !file.is_standard_aspect_ratio }">
                    <img
                      v-if="imageUrls[file.id]"
                      :src="imageUrls[file.id]"
                      :alt="file.original_name || '画像'"
                      :style="{ transform: `rotate(${file.rotation || 0}deg)`, opacity: file.is_standard_aspect_ratio !== false ? 1 : 0.3, ...getImageStyle(file) }"
                      @error="handleImageError"
                    />
                    <div v-else class="file-placeholder-small">
                      <span>📄</span>
                    </div>
                    <div
                      v-if="!file.is_standard_aspect_ratio"
                      class="non-standard-mark-small"
                      title="標準アスペクト比ではありません"
                    >
                      ✕
                    </div>
                    <button
                      class="file-remove-btn-small"
                      @click.stop="handleDeleteFile(file.id)"
                      title="ファイルを削除"
                    >
                      ✕
                    </button>
                    <button
                      class="file-remove-category-btn-small"
                      @click.stop="handleRemoveCategory(file.id)"
                      title="カテゴリーとフェーズを削除"
                    >
                      ↓
                    </button>
                  </div>
                  <div class="file-info-small">
                    <div class="file-name-small" :title="file.original_name">
                      {{ file.original_name || '無名ファイル' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    <div v-else-if="workCategories && workCategories.length === 0" class="no-categories-message">
      カテゴリーがありません。上のボタンからカテゴリーを追加してください。
    </div>

    <!-- カテゴリーが一致しないファイル（未分類ファイル）を表示 -->
    <div class="unassigned-files-section">
      <div class="unassigned-files-header">
        <div class="category-label-container">
          <button
            class="category-toggle-btn"
            @click="toggleUnassigned"
            :title="collapsedUnassigned ? '展開' : '折りたたみ'"
          >
            {{ collapsedUnassigned ? '+' : '−' }}
          </button>
          <div class="category-file-count-badge">{{ unassignedFilesWithoutCategory.length }}</div>
          <div class="category-label-small">未分類ファイル</div>
          <button
            v-if="unassignedFilesWithoutCategory.length > 0"
            class="category-delete-all-btn"
            @click.stop="handleDeleteAllUnassigned"
            title="未分類ファイルをすべて削除"
          >
            一括削除
          </button>
        </div>
      </div>
      <div v-if="!collapsedUnassigned && unassignedFilesWithoutCategory.length > 0" class="files-grid">
        <div
          v-for="file in unassignedFilesWithoutCategory"
          :key="file.id"
          class="file-item"
          :draggable="true"
          @dragstart="handleDragStart($event, file)"
          @click="handleFileClick(file)"
        >
          <div class="file-thumbnail" :class="{ 'non-standard-aspect': !file.is_standard_aspect_ratio }">
            <img
              v-if="imageUrls[file.id]"
              :src="imageUrls[file.id]"
              :alt="file.original_name || '画像'"
              :style="{ transform: `rotate(${file.rotation || 0}deg)`, opacity: file.is_standard_aspect_ratio !== false ? 1 : 0.3, ...getImageStyle(file) }"
              @error="handleImageError"
            />
            <div v-else class="file-placeholder">
              <span>📄</span>
            </div>
            <div
              v-if="!file.is_standard_aspect_ratio"
              class="non-standard-mark"
              title="標準アスペクト比ではありません"
            >
              ✕
            </div>
            <button
              class="file-delete-btn"
              @click.stop="handleDeleteFile(file.id)"
              title="ファイルを削除"
            >
              ✕
            </button>
          </div>
          <div class="file-info">
            <div class="file-name" :title="file.original_name">
              {{ file.original_name || '無名ファイル' }}
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="!collapsedUnassigned" class="empty-category-message">
        未分類ファイルはありません
      </div>
    </div>

    <div v-if="files.length === 0 && !isDragOver && (!workCategories || workCategories.length === 0)" class="empty-message">
      未割当ファイルはありません<br>
      <span class="upload-hint">ファイルをドラッグ&ドロップでアップロード</span>
    </div>
    
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits, watch, onUnmounted } from 'vue'

const props = defineProps({
  files: {
    type: Array,
    required: true
  },
  imageUrls: {
    type: Object,
    default: () => ({})
  },
  workId: {
    type: String,
    required: true
  },
  workCategories: {
    type: Array,
    default: () => []
  },
  workPhases: {
    type: Array,
    default: () => []
  },
  categoryLabelTemplates: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'assign', 
  'upload', 
  'file-click', 
  'update-file-category', 
  'remove-category', 
  'delete-file',
  'add-category',
  'update-category',
  'delete-category',
  'add-template'
])

const isDragOver = ref(false)
const isDraggingFromUnassigned = ref(false)
const dragOverPhaseId = ref(null)
const collapsedCategories = ref(new Set()) // 折りたたまれたカテゴリーのIDを保持
const collapsedUnassigned = ref(false) // 未分類ファイルの折りたたみ状態
const unassignedFilesContainer = ref(null)
const scrollInterval = ref(null)

// カテゴリー追加用
const newCategoryLabel = ref('')
const newCategoryIsPhase = ref(false)

// インラインでカテゴリーを追加
function handleAddCategoryInline() {
  const label = newCategoryLabel.value.trim()
  if (!label) return
  
  emit('add-category', { label, is_phase: newCategoryIsPhase.value })
  newCategoryLabel.value = ''
  newCategoryIsPhase.value = false
}

// カテゴリー名の変更
function handleCategoryLabelChange(categoryId, event) {
  const newLabel = event.target.value.trim()
  const category = validWorkCategories.value.find(c => c.id === categoryId)
  
  if (!newLabel) {
    // 空の場合は元の値に戻す
    event.target.value = category?.label || ''
    return
  }
  
  if (newLabel !== category?.label) {
    emit('update-category', categoryId, { label: newLabel })
  }
}

// ラベルがテンプレートに登録済みかチェック
function isLabelInTemplate(label) {
  if (!label || !props.categoryLabelTemplates) return false
  return props.categoryLabelTemplates.some(t => t.label === label)
}

// テンプレートに追加
function handleAddToTemplate(label) {
  if (!label || isLabelInTemplate(label)) return
  emit('add-template', label)
}

function handleDeleteCategory(categoryId) {
  const category = validWorkCategories.value.find(c => c.id === categoryId)
  const fileCount = getCategoryFileCount(categoryId)
  
  let confirmMessage = `カテゴリー「${category?.label || categoryId}」を削除しますか？`
  if (fileCount > 0) {
    confirmMessage += `\n\n注意: このカテゴリーには${fileCount}件のファイルがあります。\nファイルは未分類になります。`
  }
  
  if (confirm(confirmMessage)) {
    emit('delete-category', categoryId)
  }
}

function handleDragStart(event, file) {
  isDraggingFromUnassigned.value = true
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'file',
    fileId: file.id
  }))
  
  // 未割当ファイル内でのドラッグ時にスクロールを開始
  startAutoScroll(event)
}

function handleDragOver(event) {
  
  // 未割当ファイルからのドラッグの場合は反応しない
  if (isDraggingFromUnassigned.value) {
    return
  }
  
  // 外部からのファイルドロップ（アップロード）の場合のみ反応
  if (event.dataTransfer.types.includes('Files')) {
    event.preventDefault()
    isDragOver.value = true
    event.dataTransfer.dropEffect = 'copy'
  }
}

function handleDragLeave(event) {
  // 未割当エリアから離れたときに、isDragOverをfalseに戻す
  // relatedTargetが未割当エリアの子要素でない場合のみfalseにする
  const relatedTarget = event.relatedTarget
  if (!relatedTarget || !event.currentTarget.contains(relatedTarget)) {
    isDragOver.value = false
  }
}

function handleDragEnd(event) {
  // ドラッグが終了したときに、すべてのドラッグ状態をリセット
  isDragOver.value = false
  isDraggingFromUnassigned.value = false
  dragOverPhaseId.value = null
  stopAutoScroll()
  document.removeEventListener('dragover', handleGlobalDragOver)
}

function handleGlobalDragOver(event) {
  if (!isDraggingFromUnassigned.value || !unassignedFilesContainer.value) return
  
  const container = unassignedFilesContainer.value
  const containerRect = container.getBoundingClientRect()
  const mouseY = event.clientY
  
  // コンテナの範囲内かチェック
  if (mouseY < containerRect.top || mouseY > containerRect.bottom) {
    stopAutoScroll()
    return
  }
  
  // スクロール処理
  const scrollSpeed = 10
  const scrollThreshold = 200 // 200pxに設定
  
  const relativeY = mouseY - containerRect.top
  
  if (relativeY < scrollThreshold) {
    container.scrollTop -= scrollSpeed
  } else if (relativeY > containerRect.height - scrollThreshold) {
    container.scrollTop += scrollSpeed
  }
}

function handleScroll(event) {
  // スクロールイベント（必要に応じて処理を追加）
}

function startAutoScroll(event) {
  // グローバルイベントリスナーで処理するため、ここでは何もしない
}

function stopAutoScroll() {
  // グローバルイベントリスナーで処理するため、ここでは何もしない
}

function handleDrop(event) {
  event.preventDefault()
  isDragOver.value = false


  // ファイルがドロップされた場合（外部からのアップロード）
  const files = Array.from(event.dataTransfer.files)
  if (files.length > 0) {
    emit('upload', files)
    return
  }

  // 未割当ファイル内でのドラッグの場合は、assignイベントを発行しない
  // （カテゴリー/フェーズの更新はhandlePhaseDropで処理される）
  // ここでは何もしない
}

function handlePhaseDragOver(event, categoryId, phaseId) {
  
  // 未割当ファイルからのドラッグの場合は反応しない
  if (isDraggingFromUnassigned.value) {
    return
  }
  
  // 外部からのファイルドロップ（アップロード）の場合
  if (event.dataTransfer.types.includes('Files')) {
    event.preventDefault()
    dragOverPhaseId.value = `${categoryId}-${phaseId}` // カテゴリーIDとフェーズIDの組み合わせで識別
    event.dataTransfer.dropEffect = 'copy'
    return
  }
  
  // 既存のファイルがドラッグされている場合
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    if (data.type === 'file') {
      event.preventDefault()
      dragOverPhaseId.value = `${categoryId}-${phaseId}`
      event.dataTransfer.dropEffect = 'move'
    }
  } catch {
    // データが取得できない場合は無視
  }
}

function handlePhaseDragLeave(event) {
  const relatedTarget = event.relatedTarget
  if (!relatedTarget || !event.currentTarget.contains(relatedTarget)) {
    // カテゴリーIDとフェーズIDの組み合わせをリセット
    dragOverPhaseId.value = null
  }
}

function handleCategoryDragOver(event, categoryId) {
  
  // 未割当ファイルからのドラッグの場合は反応しない
  if (isDraggingFromUnassigned.value) {
    return
  }
  
  // 外部からのファイルドロップ（アップロード）の場合
  if (event.dataTransfer.types.includes('Files')) {
    event.preventDefault()
    dragOverPhaseId.value = `${categoryId}-null`
    event.dataTransfer.dropEffect = 'copy'
    return
  }
  
  // 既存のファイルがドラッグされている場合
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    if (data.type === 'file') {
      event.preventDefault()
      dragOverPhaseId.value = `${categoryId}-null`
      event.dataTransfer.dropEffect = 'move'
    }
  } catch {
    // データが取得できない場合は無視
  }
}

function handleCategoryDragLeave(event) {
  const relatedTarget = event.relatedTarget
  if (!relatedTarget || !event.currentTarget.contains(relatedTarget)) {
    // カテゴリーIDとnullの組み合わせをリセット
    dragOverPhaseId.value = null
  }
}

function handleCategoryDrop(event, categoryId) {
  event.preventDefault()
  event.stopPropagation() // 親要素のhandleDropへのバブリングを防ぐ
  dragOverPhaseId.value = null


  // ファイルがドロップされた場合（外部からのアップロード）
  const files = Array.from(event.dataTransfer.files)
  if (files.length > 0) {
    emit('upload', files, null, {
      work_category_id: categoryId,
      default_work_phase_id: null
    })
    return
  }

  // 既存のファイルがドロップされた場合（カテゴリーのみ設定、フェーズはnull）
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    if (data.type === 'file' && data.fileId) {
      emit('update-file-category', data.fileId, categoryId, null)
    }
  } catch (err) {
    console.error('Drop error:', err)
  }
}

function handlePhaseDrop(event, categoryId, phaseId) {
  event.preventDefault()
  event.stopPropagation() // 親要素のhandleDropへのバブリングを防ぐ
  dragOverPhaseId.value = null


  // ファイルがドロップされた場合（外部からのアップロード）
  const files = Array.from(event.dataTransfer.files)
  if (files.length > 0) {
    emit('upload', files, null, {
      work_category_id: categoryId,
      default_work_phase_id: phaseId
    })
    return
  }

  // 既存のファイルがドロップされた場合（カテゴリー/フェーズの更新）
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    if (data.type === 'file' && data.fileId) {
      emit('update-file-category', data.fileId, categoryId, phaseId)
    }
  } catch (err) {
    console.error('Drop error:', err)
  }
}

function toggleCategory(categoryId) {
  if (collapsedCategories.value.has(categoryId)) {
    collapsedCategories.value.delete(categoryId)
  } else {
    collapsedCategories.value.add(categoryId)
  }
}

function toggleUnassigned() {
  collapsedUnassigned.value = !collapsedUnassigned.value
}

// 有効なカテゴリーのみをフィルタリング（undefinedやnullを除外）
const validWorkCategories = computed(() => {
  return (props.workCategories || []).filter(cat => cat && cat.id)
})

// カテゴリー/フェーズごとにファイルをグループ化
const filesByCategoryAndPhase = computed(() => {
  const grouped = {}
  
  validWorkCategories.value.forEach(category => {
    if (!grouped[category.id]) {
      grouped[category.id] = {}
    }
    
    // is_phaseがtrueの場合、全workPhasesを初期化
    if (category.is_phase) {
      props.workPhases.forEach(phase => {
        if (!grouped[category.id][phase.id]) {
          grouped[category.id][phase.id] = []
        }
      })
    }
  })
  
  // ファイルをカテゴリー/フェーズごとに分類
  props.files.forEach(file => {
    const categoryId = file.work_category_id  // UUID型（work_categoriesテーブル参照）
    const phaseId = file.default_work_phase_id
    
    if (categoryId && phaseId) {
      if (!grouped[categoryId]) {
        grouped[categoryId] = {}
      }
      if (!grouped[categoryId][phaseId]) {
        grouped[categoryId][phaseId] = []
      }
      grouped[categoryId][phaseId].push(file)
    }
  })
  
  return grouped
})

// カテゴリーにフェーズなしでファイルをグループ化
const filesByCategoryWithoutPhase = computed(() => {
  const grouped = {}
  
  validWorkCategories.value.forEach(category => {
    grouped[category.id] = []
  })
  
  // ファイルをカテゴリーのみ（フェーズなし）で分類
  props.files.forEach(file => {
    const categoryId = file.work_category_id  // UUID型（work_categoriesテーブル参照）
    const phaseId = file.default_work_phase_id
    
    if (categoryId && !phaseId) {
      if (!grouped[categoryId]) {
        grouped[categoryId] = []
      }
      grouped[categoryId].push(file)
    }
  })
  
  return grouped
})

// カテゴリーが一致しないファイル（未分類ファイル）
const unassignedFilesWithoutCategory = computed(() => {
  const categoryIds = new Set(validWorkCategories.value.map(cat => cat.id))
  return props.files.filter(file => {
    // work_category_idがnull、またはworkCategoriesに存在しない
    return !file.work_category_id || !categoryIds.has(file.work_category_id)
  })
})

// カテゴリーにフェーズなしでファイルがあるかどうか
function hasFilesInCategoryWithoutPhase(categoryId) {
  return filesByCategoryWithoutPhase.value[categoryId] && 
         filesByCategoryWithoutPhase.value[categoryId].length > 0
}

// フェーズにファイルがあるかどうか
function hasFilesInPhase(categoryId, phaseId) {
  return filesByCategoryAndPhase.value[categoryId] && 
         filesByCategoryAndPhase.value[categoryId][phaseId] && 
         filesByCategoryAndPhase.value[categoryId][phaseId].length > 0
}

// カテゴリー内のファイル数を取得
function getCategoryFileCount(categoryId) {
  let count = 0
  const category = validWorkCategories.value.find(c => c.id === categoryId)
  
  if (category?.is_phase) {
    // is_phaseがtrueの場合：フェーズ内のファイル数をカウント
    if (filesByCategoryAndPhase.value[categoryId]) {
      Object.values(filesByCategoryAndPhase.value[categoryId]).forEach(phaseFiles => {
        count += phaseFiles.length
      })
    }
  } else {
    // is_phaseがfalseの場合：カテゴリー直下のファイル数をカウント
    if (filesByCategoryWithoutPhase.value[categoryId]) {
      count += filesByCategoryWithoutPhase.value[categoryId].length
    }
  }
  
  return count
}

function handleFileClick(file) {
  emit('file-click', file)
}

function handleImageError(event) {
  event.target.style.display = 'none'
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getImageStyle(file) {
  if (!file || !file.width || !file.height) {
    return {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      objectPosition: 'center'
    }
  }
  
  // オリジナルの画像サイズで判断（回転は考慮しない）
  // 縦長（height > width）: width: 100%
  // 横長（width > height）: height: 100%
  if (file.height > file.width) {
    // オリジナル縦長画像: width: 100%
    return {
      width: '100%',
      objectFit: 'contain',
      objectPosition: 'center'
    }
  } else {
    // オリジナル横長画像: height: 100%
    return {
      height: '100%',
      objectFit: 'contain',
      objectPosition: 'center'
    }
  }
}

function handleRemoveCategory(fileId) {
  emit('remove-category', fileId)
}

function handleDeleteFile(fileId) {
  if (confirm('このファイルを削除しますか？')) {
    emit('delete-file', fileId)
  }
}

function handleDeleteAllInPhase(categoryId, phaseId) {
  const filesInPhase = filesByCategoryAndPhase.value[categoryId]?.[phaseId] || []
  if (filesInPhase.length === 0) return
  
  if (confirm(`このフェーズ内の${filesInPhase.length}件のファイルをすべて削除しますか？`)) {
    filesInPhase.forEach(file => {
      emit('delete-file', file.id)
    })
  }
}

function handleDeleteAllInCategory(categoryId) {
  const allFilesInCategory = []
  const category = validWorkCategories.value.find(c => c.id === categoryId)
  
  if (category?.is_phase) {
    // フェーズ内のファイル
    props.workPhases.forEach(phase => {
      const filesInPhase = filesByCategoryAndPhase.value[categoryId]?.[phase.id] || []
      allFilesInCategory.push(...filesInPhase)
    })
  } else {
    // フェーズなしのファイル
    const filesWithoutPhase = filesByCategoryWithoutPhase.value[categoryId] || []
    allFilesInCategory.push(...filesWithoutPhase)
  }
  
  if (allFilesInCategory.length === 0) return
  
  if (confirm(`このカテゴリー内の${allFilesInCategory.length}件のファイルをすべて削除しますか？`)) {
    allFilesInCategory.forEach(file => {
      emit('delete-file', file.id)
    })
  }
}

function handleDeleteAllUnassigned() {
  if (unassignedFilesWithoutCategory.value.length === 0) return
  
  if (confirm(`未分類ファイル${unassignedFilesWithoutCategory.value.length}件をすべて削除しますか？`)) {
    unassignedFilesWithoutCategory.value.forEach(file => {
      emit('delete-file', file.id)
    })
  }
}


// アップロード中はスクロールを無効化

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.unassigned-files {
  height: 100%;
  min-height: 0;
  position: relative;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.category-add-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.category-add-input-wrapper {
  flex: 1;
  max-width: 200px;
}

.category-add-input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  transition: border-color 0.2s;
}

.category-add-input:focus {
  outline: none;
  border-color: #10b981;
}

.category-add-phase-checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #374151;
  white-space: nowrap;
  cursor: pointer;
}

.category-add-phase-checkbox input {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.category-add-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.category-add-btn:hover:not(:disabled) {
  background: #059669;
}

.category-add-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.empty-message {
  text-align: center;
  padding: 2rem;
  color: #9ca3af;
}

.upload-hint {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
  display: block;
}


.category-drop-zones {
  margin-bottom: 1rem;
}

.category-zone {
  margin-bottom: 1rem;
}

.category-label-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.125rem;
  line-height: 1.2;
}

.category-toggle-btn {
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

.category-toggle-btn:hover {
  background: #f3f4f6;
  border-color: #6b7280;
}

.category-label-input {
  font-weight: 600;
  font-size: 0.75rem;
  padding: 0.125rem 0.25rem;
  color: #374151;
  min-width: 80px;
  max-width: 150px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  transition: all 0.2s;
}

.category-actions-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.category-label-input:hover {
  border-color: #d1d5db;
  background: white;
}

.category-label-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
}

.category-star-btn {
  background: transparent;
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.125rem 0.25rem;
  color: #9ca3af;
  transition: all 0.2s;
  flex-shrink: 0;
}

.category-star-btn:hover:not(:disabled) {
  color: #f59e0b;
  transform: scale(1.2);
}

.category-star-btn.is-template {
  color: #f59e0b;
  cursor: default;
}

.category-star-btn:disabled {
  cursor: default;
}

.category-phase-badge {
  font-size: 0.75rem;
  flex-shrink: 0;
}

.category-file-count-badge {
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

.phases-container-with-files {
  border: 2px dashed #9ca3af;
  border-radius: 4px;
  padding: 0.75rem;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.phase-drop-zone-with-files {
  border: 2px dashed #9ca3af;
  border-radius: 4px;
  padding: 0.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.phase-drop-zone-with-files:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.phase-drop-zone-with-files.drag-over-phase {
  border-color: #3b82f6;
  background: #dbeafe;
  border-style: solid;
}

.phase-label-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.phase-label-small {
  font-weight: 500;
  font-size: 0.75rem;
  color: #374151;
  flex: 1;
}

.phase-delete-all-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.phase-delete-all-btn:hover {
  background: #dc2626;
}

.category-delete-all-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.category-delete-all-btn:hover {
  background: #dc2626;
}

.category-remove-btn {
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.category-remove-btn:hover {
  background: #4b5563;
}

.phase-hint-small {
  font-size: 0.625rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.phase-files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.file-item-small {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 0.25rem;
  cursor: grab;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.file-item-small:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.file-item-small:active {
  cursor: grabbing;
}

.file-thumbnail-small {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: white;
  border-radius: 2px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.25rem;
  position: relative;
}

.file-thumbnail-small:hover .file-remove-btn-small,
.file-thumbnail-small:hover .file-remove-category-btn-small {
  opacity: 1;
  visibility: visible;
}

.file-remove-btn-small {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: #ef4444;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: bold;
  padding: 0;
  z-index: 10;
  transition: all 0.2s;
  opacity: 0;
  visibility: hidden;
}

.file-remove-category-btn-small {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: #6b7280;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: bold;
  padding: 0;
  z-index: 10;
  transition: all 0.2s;
  opacity: 0;
  visibility: hidden;
}

.file-remove-category-btn-small:hover {
  background: #4b5563;
  transform: scale(1.1);
}

.file-remove-btn-small:hover {
  background: #dc2626;
  transform: scale(1.1);
}

.file-remove-btn-small:active:not(:disabled) {
  transform: scale(0.95);
}

.file-remove-btn-small:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.file-thumbnail-small img {
  object-fit: contain;
  object-position: center;
}

.file-thumbnail-small.non-standard-aspect {
  position: relative;
}

.non-standard-mark-small {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ef4444;
  font-size: 2rem;
  font-weight: bold;
  z-index: 5;
  pointer-events: none;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
}

.file-placeholder-small {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #9ca3af;
}

.file-info-small {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name-small {
  font-size: 0.625rem;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.category-drop-zone-without-phase {
  border: 2px dashed #9ca3af;
  border-radius: 4px;
  padding: 0.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.category-drop-zone-without-phase.has-files {
  padding: 0;
  border: none;
  background: transparent;
}

.category-drop-zone-without-phase:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.category-drop-zone-without-phase.has-files:hover {
  border-color: transparent;
  background: transparent;
}

.category-drop-zone-without-phase.drag-over-phase {
  border-color: #3b82f6;
  background: #dbeafe;
  border-style: solid;
}

.category-drop-zone-without-phase.has-files.drag-over-phase {
  border-color: #3b82f6;
  background: #dbeafe;
  border-style: solid;
  padding: 0.5rem;
}

.category-hint-small {
  font-size: 0.625rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
  text-align: center;
  padding: 0.5rem;
}

.no-categories-message {
  text-align: center;
  padding: 1rem;
  color: #9ca3af;
  font-style: italic;
}

.unassigned-files-section {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 2px solid #e5e7eb;
}

.empty-category-message {
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

.unassigned-files-header {
  margin-bottom: 1rem;
}

.unassigned-delete-all-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.unassigned-delete-all-btn:hover {
  background: #dc2626;
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  padding: 0.5rem;
}

.file-item {
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem;
  cursor: grab;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.file-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.file-item:active {
  cursor: grabbing;
}

.file-thumbnail {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  position: relative;
}

.file-thumbnail.non-standard-aspect {
  position: relative;
}

.non-standard-mark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ef4444;
  font-size: 3rem;
  font-weight: bold;
  z-index: 5;
  pointer-events: none;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
}

.file-thumbnail:hover .file-delete-btn,
.file-thumbnail:hover .file-rotate-btn {
  opacity: 1;
  visibility: visible;
}

.file-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: #ef4444;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: bold;
  padding: 0;
  z-index: 10;
  transition: all 0.2s;
  opacity: 0;
  visibility: hidden;
}

.file-delete-btn:hover {
  background: #dc2626;
  transform: scale(1.1);
}


.file-delete-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.file-delete-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.file-thumbnail img {
  object-fit: contain;
  object-position: center;
}

.file-placeholder {
  font-size: 2rem;
  color: #d1d5db;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.25rem;
}

.file-meta {
  font-size: 0.7rem;
  color: #6b7280;
}

/* アップロード中のスタイル */
.unassigned-files.uploading {
  position: relative;
}

</style>
