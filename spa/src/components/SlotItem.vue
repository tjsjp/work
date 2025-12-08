<template>
  <div
    class="slot-item"
    :class="{ 
      'has-file': slot.file_id, 
      'empty': !slot.file_id, 
      'drag-over': isDragOver, 
      'disabled': disabled,
      'highlight-background': shouldHighlightBackground,
      'drag-over-left': dragOverZone === 'left',
      'drag-over-center': dragOverZone === 'center',
      'drag-over-right': dragOverZone === 'right'
    }"
    :draggable="!disabled && !isInputFocused"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover.prevent="handleDragOver"
    @drop.prevent="handleDrop"
    @dragleave="handleDragLeave"
  >
    <div class="slot-header">
      <div class="slot-controls">
        <label class="break-before-label">
          <input 
            type="checkbox" 
            v-model="localBreakBefore" 
            @change="handleBreakBeforeChange"
            :disabled="disabled"
          />
          ページ開始
        </label>
        <!-- ボタン: ページ開始←↑＋↓→の順で全て表示 -->
        <button 
          class="insert-btn" 
          :disabled="disabled || !canUseLeftButton"
          :class="{ 'disabled-btn': !canUseLeftButton }"
          title="現在のスロットの内容（画像以外）をページ番号（同じ）-スロット番号-3にコピー"
          @click="handleCopyLeft"
        >
          ←
        </button>
        <button 
          class="insert-btn" 
          :disabled="disabled || !canUseUpButton"
          :class="{ 'disabled-btn': !canUseUpButton }"
          title="現在のスロットの内容（画像以外）をページ番号（同じ）-スロット番号-1にコピー"
          @click="handleCopyUp"
        >
          ↑
        </button>
        <button 
          class="insert-btn insert-btn-plus" 
          :disabled="disabled"
          title="空のスロットを1つ挿入"
          @click="handleInsertPlus"
        >
          ＋
        </button>
        <button 
          class="insert-btn insert-btn-plus" 
          :disabled="disabled"
          title="空のスロットを3つ挿入"
          @click="handleInsertPlus3"
        >
          3＋
        </button>
        <button 
          class="insert-btn insert-btn-plus" 
          :disabled="disabled"
          title="空のスロットを6つ挿入"
          @click="handleInsertPlus6"
        >
          6＋
        </button>
        <button 
          class="insert-btn" 
          :disabled="disabled || !canUseDownButton"
          :class="{ 'disabled-btn': !canUseDownButton }"
          title="現在のスロットの内容（画像以外）をページ番号（同じ）-スロット番号+1にコピー"
          @click="handleCopyDown"
        >
          ↓
        </button>
        <button 
          class="insert-btn" 
          :disabled="disabled || !canUseRightButton"
          :class="{ 'disabled-btn': !canUseRightButton }"
          title="現在のスロットの内容（画像以外）をページ番号（同じ）-スロット番号+3にコピー"
          @click="handleCopyRight"
        >
          →
        </button>
      </div>
      <div class="slot-header-right">
        <div class="slot-number">
          <span 
            class="page-number" 
            :class="{ 'page-number-red': shouldHighlightPageNumber }"
          >
            {{ getCircledNumber(slot.pageNumber || 1) }}
          </span>-<span 
            class="slot-number-value"
            :class="{ 
              'slot-number-red': shouldHighlightPageNumber || shouldHighlightSlotNumber 
            }"
          >
            {{ getCircledNumber(slot.slotNumberInPage || (slot.displayIndex + 1)) }}
          </span>
        </div>
        <button
          class="delete-slot-btn"
          @click.stop="handleDeleteSlot"
          :disabled="disabled"
          title="スロットを削除"
        >
          ✕
        </button>
      </div>
    </div>
    
    <!-- 3分割の表示（スロットをドラッグしている時だけ表示） -->
    <div v-if="isDragOver && dragOverZone" class="drag-zone-indicators">
      <div class="drag-zone-indicator drag-zone-left" :class="{ 'active': dragOverZone === 'left' }">
        <span class="drag-zone-icon">↑</span>
        <span class="drag-zone-label">移動</span>
      </div>
      <div class="drag-zone-indicator drag-zone-center" :class="{ 'active': dragOverZone === 'center' }">
        <span class="drag-zone-icon">⧉</span>
        <span class="drag-zone-label">コピー</span>
      </div>
      <div class="drag-zone-indicator drag-zone-right" :class="{ 'active': dragOverZone === 'right' }">
        <span class="drag-zone-icon">↓</span>
        <span class="drag-zone-label">移動</span>
      </div>
    </div>
    
    <div class="slot-content">
      <!-- 左側: 画像 -->
      <div class="slot-left">
        <div v-if="slot.file_id && imageUrls[slot.file_id]" class="slot-image" :class="{ 'non-standard-aspect': !isStandardAspectRatio(slot.file_id) }">
          <img
            :src="imageUrls[slot.file_id]"
            :alt="getFileName(slot.file_id)"
            :style="{ 
              cursor: 'pointer', 
              transform: `rotate(${getFileRotation(slot.file_id)}deg)`, 
              opacity: isStandardAspectRatio(slot.file_id) ? 1 : 0.3,
              ...getImageStyle(slot.file_id)
            }"
            draggable="false"
            @error="handleImageError"
            @click.stop="handleImageClick"
          />
          <div
            v-if="!isStandardAspectRatio(slot.file_id)"
            class="non-standard-mark"
            title="標準アスペクト比ではありません"
          >
            ✕
          </div>
          <button
            class="remove-button"
            @click.stop="handleRemove"
            title="割り当てを解除"
          >
            ✕
          </button>
        </div>
        
        <div v-else class="slot-empty">
          <span class="empty-text">余白</span>
        </div>
      </div>
      
      <!-- 右側: caption, work_phase, note -->
      <div class="slot-right">
        <div class="slot-field">
          <input
            v-model="localCaption"
            @focus="isInputFocused = true"
            @blur="isInputFocused = false; handleCaptionChange()"
            type="text"
            class="caption-input"
            placeholder="カテゴリーを入力..."
            :disabled="disabled"
          />
        </div>
        
        <div class="slot-field">
          <select 
            v-model="localWorkPhaseId" 
            @focus="isInputFocused = true"
            @blur="isInputFocused = false"
            @change="handleWorkPhaseChange"
            class="work-phase-select"
            :disabled="disabled"
          >
            <option 
              v-for="phase in workPhases" 
              :key="phase.id" 
              :value="phase.id"
            >
              {{ phase.label || phase.name || `Phase ${phase.id}` }}
            </option>
          </select>
        </div>
        
        <div class="slot-field note-field">
          <textarea 
            ref="noteTextareaRef"
            v-model="localNote" 
            @focus="isInputFocused = true"
            @blur="isInputFocused = false; handleNoteChange()"
            @contextmenu.prevent="handleNoteContextMenu"
            class="note-textarea"
            placeholder="備考を入力..."
            :disabled="disabled"
          ></textarea>
        </div>
      </div>
    </div>
    
    <!-- 備考コンテキストメニュー -->
    <SnippetContextMenu
      :is-open="showNoteContextMenu"
      :position="contextMenuPosition"
      :snippet-groups="snippetGroups"
      :snippet-items-by-group="snippetItemsByGroup"
      :custom-snippets="customSnippets"
      :has-top-items="true"
      @close="closeContextMenu"
      @insert-snippet="handleInsertSnippet"
      @add-custom-snippet="handleAddCustomSnippet"
      @copy="handleContextCopy"
      @cut="handleContextCut"
      @paste="handleContextPaste"
    >
      <template #top-items>
        <div class="context-menu-item" @click="handleContextClearNote">
          <span class="context-menu-icon">🗑️</span>
          <span>備考全消去</span>
        </div>
      </template>
    </SnippetContextMenu>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import SnippetContextMenu from './SnippetContextMenu.vue'

const props = defineProps({
  slot: {
    type: Object,
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
  isLeftColumn: {
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

const emit = defineEmits(['assign', 'unassign', 'reorder', 'upload', 'update', 'insert', 'copy', 'delete', 'file-click', 'slot-move', 'slot-swap', 'slot-copy', 'file-swap', 'file-copy', 'slot-drag-start', 'slot-drag-end', 'add-custom-snippet'])

const isDragOver = ref(false)
const dragOverZone = ref(null) // 'left', 'center', 'right'
const isInputFocused = ref(false) // 入力欄にフォーカス中かどうか

// ローカル状態
const localCaption = ref(props.slot.caption || '')
const localWorkPhaseId = ref(props.slot.work_phase_id)
const localNote = ref(props.slot.note || '')
const localBreakBefore = ref(props.slot.break_before || false)

// 備考コンテキストメニュー用
const noteTextareaRef = ref(null)
const showNoteContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const savedSelection = ref({ start: 0, end: 0 })

// プロップの変更を監視
watch(() => props.slot.caption, (newVal) => {
  localCaption.value = newVal || ''
})
watch(() => props.slot.work_phase_id, (newVal) => {
  localWorkPhaseId.value = newVal
})
watch(() => props.slot.note, (newVal) => {
  localNote.value = newVal || ''
})
watch(() => props.slot.break_before, (newVal) => {
  localBreakBefore.value = newVal || false
})

function handleDragStart(event) {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'slot',
    slotId: props.slot.id
  }))
  // スロットドラッグを識別するためのカスタムタイプを追加
  event.dataTransfer.setData('application/x-slot', '')
  // スロットドラッグ開始を親コンポーネントに通知
  emit('slot-drag-start')
}

function handleDragEnd(event) {
  // スロットドラッグ終了を親コンポーネントに通知
  emit('slot-drag-end')
  isDragOver.value = false
  dragOverZone.value = null
}

function handleDragOver(event) {
  event.preventDefault()
  
  // ファイルがドラッグされている場合
  if (event.dataTransfer.types.includes('Files')) {
    isDragOver.value = true
    dragOverZone.value = null
    event.dataTransfer.dropEffect = 'copy'
    return
  }
  
  // スロットをドラッグしている時だけ3分割の表示を表示
  // application/x-slotが含まれている場合のみ、スロットのドラッグと判断
  if (event.dataTransfer.types.includes('application/x-slot')) {
    // ドラッグ中のスロットIDを取得
    try {
      const data = JSON.parse(event.dataTransfer.getData('text/plain'))
      
      // 自分自身へのドラッグの場合は無効化
      if (data.type === 'slot' && data.slotId === props.slot.id) {
        isDragOver.value = false
        dragOverZone.value = null
        event.dataTransfer.dropEffect = 'none'
        return
      }
    } catch (e) {
      // JSONパースエラーの場合は続行
    }
    
    isDragOver.value = true
    
    // 3分割の位置判定
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const width = rect.width
    const third = width / 3
    
    if (x < third) {
      dragOverZone.value = 'left'
    } else if (x < third * 2) {
      dragOverZone.value = 'center'
    } else {
      dragOverZone.value = 'right'
    }
    
    event.dataTransfer.dropEffect = 'move'
  } else if (event.dataTransfer.types.includes('text/plain')) {
    // 未割当ファイルのドラッグの場合（text/plainのみ、application/x-slotなし）
    isDragOver.value = true
    dragOverZone.value = null
    event.dataTransfer.dropEffect = 'move'
  } else {
    isDragOver.value = false
    dragOverZone.value = null
  }
}

function handleDragLeave(event) {
  // 子要素への移動を除外
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragOver.value = false
    dragOverZone.value = null
  }
}

function handleDrop(event) {
  event.preventDefault()
  
  // ファイルがドロップされた場合
  const files = Array.from(event.dataTransfer.files)
  if (files.length > 0) {
    // 2つ以上のファイルがドロップされた場合はアラートを出して処理を中断
    if (files.length > 1) {
      alert('スロットには1つのファイルのみドロップできます。複数のファイルをドロップすることはできません。')
      isDragOver.value = false
      dragOverZone.value = null
      return
    }
    emit('upload', files, props.slot.id)
    isDragOver.value = false
    dragOverZone.value = null
    return
  }

  // 既存のデータがドロップされた場合
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    
    if (data.type === 'file') {
      // ファイルをスロットに割り当て
      emit('assign', props.slot.id, data.fileId)
    } else if (data.type === 'slot' && data.slotId !== props.slot.id) {
      // 3分割の処理 - dragOverZoneが設定されている場合はそれを使用、なければマウス位置から判定
      let zone = dragOverZone.value
      
      // dragOverZoneが設定されていない場合、マウス位置から判定
      if (!zone) {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = event.clientX - rect.left
        const width = rect.width
        const third = width / 3
        
        if (x < third) {
          zone = 'left'
        } else if (x < third * 2) {
          zone = 'center'
        } else {
          zone = 'right'
        }
      }
      
      if (zone === 'left') {
        // 左側：移動 - ドラッグ先のスロットとその上のスロットのスロットインデックスの中間を計算
        emit('slot-move', data.slotId, props.slot.id, zone)
      } else if (zone === 'center') {
        // 真ん中：コピー - ファイルID、フェーズ、メモをコピー
        emit('slot-copy', data.slotId, props.slot.id)
      } else if (zone === 'right') {
        // 右：↓移動 - ドラッグ先とその下のスロットの中間に移動
        emit('slot-swap', data.slotId, props.slot.id)
      }
    } else if (data.type === 'file-id' && data.fileId) {
      // ファイルIDのドラッグ&ドロップ
      const zone = dragOverZone.value || 'center'
      if (data.action === 'swap') {
        emit('file-swap', data.slotId, props.slot.id)
      } else if (data.action === 'copy') {
        emit('file-copy', data.slotId, props.slot.id)
      }
    }
    
    isDragOver.value = false
    dragOverZone.value = null
  } catch (err) {
    console.error('Drop error:', err)
    isDragOver.value = false
    dragOverZone.value = null
  }
}


function handleRemove() {
  emit('unassign', props.slot.id)
}

function handleImageClick() {
  const file = props.files.find(f => f.id === props.slot.file_id)
  if (file) {
    emit('file-click', file)
  }
}

function handleImageError(event) {
  event.target.style.display = 'none'
}

function getFileName(fileId) {
  const file = props.files.find(f => f.id === fileId)
  return file?.original_name || '画像'
}

function getFileRotation(fileId) {
  const file = props.files.find(f => f.id === fileId)
  return file ? (file.rotation || 0) : 0
}

function isStandardAspectRatio(fileId) {
  const file = props.files.find(f => f.id === fileId)
  return file ? (file.is_standard_aspect_ratio !== false) : true
}

function getImageStyle(fileId) {
  const file = props.files.find(f => f.id === fileId)
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
    // オリジナル縦長画像: width: 70%固定
    return {
      width: '70%',
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

// 数字を丸数字に変換（① ② ③ など）
function getCircledNumber(num) {
  const numValue = Number(num)
  if (numValue >= 1 && numValue <= 20) {
    // Unicode丸数字（①-⑳）
    return String.fromCharCode(0x245F + numValue)
  } else {
    // 20を超える場合は数字をそのまま返す（必要に応じて拡張可能）
    return numValue.toString()
  }
}

function handleCaptionChange() {
  emit('update', props.slot.id, { caption: localCaption.value })
}

function handleWorkPhaseChange() {
  emit('update', props.slot.id, { work_phase_id: localWorkPhaseId.value })
}

function handleNoteChange() {
  emit('update', props.slot.id, { note: localNote.value })
}

function handleBreakBeforeChange() {
  emit('update', props.slot.id, { break_before: localBreakBefore.value })
}

// ボタンの使用可否を判定
const canUseLeftButton = computed(() => {
  // ←は右側のスロットのみ使用可能
  if (props.isLeftColumn) return false
  
  // ページ番号（同じ）-スロット番号-3が存在するかチェック
  const targetSlotNumber = props.slot.slotNumberInPage - 3
  if (targetSlotNumber < 1) return false
  
  // 同じページ内でスロット番号-3のスロットが存在するか確認
  const targetSlot = props.allSlots?.find(s => 
    s.pageNumber === props.slot.pageNumber && 
    s.slotNumberInPage === targetSlotNumber
  )
  return !!targetSlot
})

const canUseRightButton = computed(() => {
  // →は左側のスロットのみ使用可能
  if (!props.isLeftColumn) return false
  
  // ページ番号（同じ）-スロット番号+3が存在するかチェック
  const targetSlotNumber = props.slot.slotNumberInPage + 3
  
  // 同じページ内でスロット番号+3のスロットが存在するか確認
  const targetSlot = props.allSlots?.find(s => 
    s.pageNumber === props.slot.pageNumber && 
    s.slotNumberInPage === targetSlotNumber
  )
  return !!targetSlot
})

const canUseUpButton = computed(() => {
  // ↑はページ番号（同じ）-スロット番号-1が存在するかチェック
  const targetSlotNumber = props.slot.slotNumberInPage - 1
  if (targetSlotNumber < 1) return false
  
  // 同じページ内でスロット番号-1のスロットが存在するか確認
  const targetSlot = props.allSlots?.find(s => 
    s.pageNumber === props.slot.pageNumber && 
    s.slotNumberInPage === targetSlotNumber
  )
  return !!targetSlot
})

// ページ番号を赤色にするかどうか（ページ切り替え時のみ）
const shouldHighlightPageNumber = computed(() => {
  // ページの切り替わり時（break_beforeがtrue）
  return props.slot.break_before || false
})

// スロット番号を赤色にするかどうか（6の倍数+1の時）
const shouldHighlightSlotNumber = computed(() => {
  // スロット番号が6の倍数+1（1, 7, 13, 19...）
  const slotNumber = props.slot.slotNumberInPage || (props.slot.displayIndex + 1)
  return slotNumber % 6 === 1
})

// スロットの背景色を目立つグレー系にするかどうか
const shouldHighlightBackground = computed(() => {
  // 1. ページの切り替わり時（break_beforeがtrue）
  if (props.slot.break_before) {
    return true
  }
  
  // 2. スロット番号が6の倍数+1（1, 7, 13, 19...）
  const slotNumber = props.slot.slotNumberInPage || (props.slot.displayIndex + 1)
  if (slotNumber % 6 === 1) {
    return true
  }
  
  return false
})

const canUseDownButton = computed(() => {
  // ↓はページ番号（同じ）-スロット番号+1が存在するかチェック
  const targetSlotNumber = props.slot.slotNumberInPage + 1
  
  // 同じページ内でスロット番号+1のスロットが存在するか確認
  const targetSlot = props.allSlots?.find(s => 
    s.pageNumber === props.slot.pageNumber && 
    s.slotNumberInPage === targetSlotNumber
  )
  return !!targetSlot
})

// ボタンのイベントハンドラー
// ←：右側のスロットのみ。現在のスロットの内容（画像以外）をページ番号（同じ）-スロット番号-3にコピー
function handleCopyLeft() {
  const targetSlotNumber = props.slot.slotNumberInPage - 3
  const targetSlot = props.allSlots?.find(s => 
    s.pageNumber === props.slot.pageNumber && 
    s.slotNumberInPage === targetSlotNumber
  )
  if (targetSlot) {
    emit('copy', {
      sourceSlotId: props.slot.id,
      targetSlotId: targetSlot.id,
      // ローカル状態（編集直後の最新値）を送信
      work_phase_id: localWorkPhaseId.value,
      note: localNote.value,
      caption: localCaption.value
    })
  }
}

// ↑：全てで表示。現在のスロットの内容（画像以外）をページ番号（同じ）-スロット番号-1にコピー
function handleCopyUp() {
  const targetSlotNumber = props.slot.slotNumberInPage - 1
  const targetSlot = props.allSlots?.find(s => 
    s.pageNumber === props.slot.pageNumber && 
    s.slotNumberInPage === targetSlotNumber
  )
  if (targetSlot) {
    emit('copy', {
      sourceSlotId: props.slot.id,
      targetSlotId: targetSlot.id,
      // ローカル状態（編集直後の最新値）を送信
      work_phase_id: localWorkPhaseId.value,
      note: localNote.value,
      caption: localCaption.value
    })
  }
}

// ＋：全てで表示。空のスロットを1つ挿入
function handleInsertPlus() {
  emit('insert', {
    sourceSlotId: null, // 空のスロットなのでsourceSlotIdはnull
    targetSlotId: props.slot.id,
    position: 'plus'
  })
}

// 3＋：全てで表示。空のスロットを3つ挿入
function handleInsertPlus3() {
  emit('insert', {
    sourceSlotId: null,
    targetSlotId: props.slot.id,
    position: 'plus3'
  })
}

// 6＋：全てで表示。空のスロットを6つ挿入
function handleInsertPlus6() {
  emit('insert', {
    sourceSlotId: null,
    targetSlotId: props.slot.id,
    position: 'plus6'
  })
}

// ↓：全てで表示。現在のスロットの内容（画像以外）をページ番号（同じ）-スロット番号+1にコピー
function handleCopyDown() {
  const targetSlotNumber = props.slot.slotNumberInPage + 1
  const targetSlot = props.allSlots?.find(s => 
    s.pageNumber === props.slot.pageNumber && 
    s.slotNumberInPage === targetSlotNumber
  )
  if (targetSlot) {
    emit('copy', {
      sourceSlotId: props.slot.id,
      targetSlotId: targetSlot.id,
      // ローカル状態（編集直後の最新値）を送信
      work_phase_id: localWorkPhaseId.value,
      note: localNote.value,
      caption: localCaption.value
    })
  }
}

// →：左側のスロットのみ。現在のスロットの内容（画像以外）をページ番号（同じ）-スロット番号+3にコピー
function handleCopyRight() {
  const targetSlotNumber = props.slot.slotNumberInPage + 3
  const targetSlot = props.allSlots?.find(s => 
    s.pageNumber === props.slot.pageNumber && 
    s.slotNumberInPage === targetSlotNumber
  )
  if (targetSlot) {
    emit('copy', {
      sourceSlotId: props.slot.id,
      targetSlotId: targetSlot.id,
      // ローカル状態（編集直後の最新値）を送信
      work_phase_id: localWorkPhaseId.value,
      note: localNote.value,
      caption: localCaption.value
    })
  }
}

// スロット削除
function handleDeleteSlot() {
  if (confirm('このスロットを削除しますか？')) {
    emit('delete', props.slot.id)
  }
}

// === 備考コンテキストメニュー関連 ===

// 右クリックメニューを表示
function handleNoteContextMenu(event) {
  if (props.disabled) return
  
  // 選択範囲を保存
  const textarea = noteTextareaRef.value
  if (textarea) {
    savedSelection.value = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    }
  }
  
  // メニュー位置を計算（画面外に出ないように調整）
  const menuWidth = 220
  const menuHeight = 350
  let x = event.clientX
  let y = event.clientY
  
  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 10
  }
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 10
  }
  
  contextMenuPosition.value = { x, y }
  showNoteContextMenu.value = true
}

// メニューを閉じる
function closeContextMenu() {
  showNoteContextMenu.value = false
}

// 画面のどこかをクリックしたらメニューを閉じる
function handleGlobalClick(event) {
  if (showNoteContextMenu.value) {
    closeContextMenu()
  }
}

// ESCキーでメニューを閉じる
function handleKeyDown(event) {
  if (event.key === 'Escape' && showNoteContextMenu.value) {
    closeContextMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
  document.removeEventListener('keydown', handleKeyDown)
})

// 備考全消去
function handleContextClearNote() {
  localNote.value = ''
  emit('update', props.slot.id, { note: '' })
  closeContextMenu()
}

// コピー
async function handleContextCopy() {
  const textarea = noteTextareaRef.value
  if (!textarea) {
    closeContextMenu()
    return
  }
  
  const { start, end } = savedSelection.value
  const selectedText = localNote.value.substring(start, end)
  
  try {
    // 選択範囲が空でもクリップボードに書き込む（空の場合はクリップボードをクリア）
    await navigator.clipboard.writeText(selectedText)
  } catch (err) {
    console.error('コピーに失敗しました:', err)
  }
  closeContextMenu()
}

// 切り取り
async function handleContextCut() {
  const textarea = noteTextareaRef.value
  if (!textarea) {
    closeContextMenu()
    return
  }
  
  const { start, end } = savedSelection.value
  const selectedText = localNote.value.substring(start, end)
  
  try {
    // 選択範囲が空でもクリップボードに書き込む（空の場合はクリップボードをクリア）
    await navigator.clipboard.writeText(selectedText)
    // 選択範囲がある場合のみ削除
    if (selectedText) {
      const newValue = localNote.value.substring(0, start) + localNote.value.substring(end)
      localNote.value = newValue
      emit('update', props.slot.id, { note: newValue })
    }
  } catch (err) {
    console.error('切り取りに失敗しました:', err)
  }
  closeContextMenu()
}

// 貼り付け
async function handleContextPaste() {
  const textarea = noteTextareaRef.value
  if (!textarea) {
    closeContextMenu()
    return
  }
  
  try {
    const clipboardText = await navigator.clipboard.readText()
    const { start, end } = savedSelection.value
    const newValue = localNote.value.substring(0, start) + clipboardText + localNote.value.substring(end)
    localNote.value = newValue
    emit('update', props.slot.id, { note: newValue })
  } catch (err) {
    console.error('貼り付けに失敗しました:', err)
  }
  closeContextMenu()
}

// カスタム文字列を挿入
function handleInsertSnippet(snippet) {
  const textarea = noteTextareaRef.value
  if (!textarea) {
    closeContextMenu()
    return
  }
  
  const { start, end } = savedSelection.value
  let insertText = snippet.label
  
  // 改行フラグがtrueの場合は末尾に改行を追加
  if (snippet.newline_after) {
    insertText += '\n'
  }
  
  const newValue = localNote.value.substring(0, start) + insertText + localNote.value.substring(end)
  localNote.value = newValue
  emit('update', props.slot.id, { note: newValue })
  closeContextMenu()
}

// カスタム文字列を追加
function handleAddCustomSnippet() {
  const textarea = noteTextareaRef.value
  let selectedText = ''
  
  if (textarea) {
    const { start, end } = savedSelection.value
    selectedText = localNote.value.substring(start, end)
    // 改行を除去
    selectedText = selectedText.replace(/[\r\n]/g, '')
  }
  
  emit('add-custom-snippet', selectedText)
  closeContextMenu()
}
</script>

<style scoped>
.slot-item {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem;
  cursor: move;
  transition: all 0.2s;
  position: relative;
  height: calc((100vh - 250px) / 3); /* 画面サイズに合わせて高さを固定 */
  min-height: 150px;
  max-height: 200px;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.slot-item.highlight-background {
  background: #f3f4f6;
}

.slot-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.slot-item.has-file {
  border-color: #10b981;
}

.slot-item.empty {
  border-style: dashed;
  background: #f9fafb;
}

.slot-item.empty.highlight-background {
  background: #e5e7eb;
}

.slot-item.drag-over {
  border-color: #3b82f6;
  background: #eff6ff;
  border-style: solid;
}

.slot-item.drag-over-left {
  border-left-width: 4px;
  border-left-color: #3b82f6;
}

.slot-item.drag-over-center {
  border-top-width: 4px;
  border-top-color: #3b82f6;
  border-bottom-width: 4px;
  border-bottom-color: #3b82f6;
}

.slot-item.drag-over-right {
  border-right-width: 4px;
  border-right-color: #3b82f6;
}

.slot-item.disabled {
  opacity: 0.6;
  pointer-events: none;
  cursor: not-allowed;
}

.slot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  position: relative;
}

.slot-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.break-before-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: #6b7280;
  cursor: pointer;
  margin: 0;
}

.break-before-label input[type="checkbox"] {
  cursor: pointer;
}

.slot-header-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.slot-number {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  font-size: 1.125rem; /* 0.75rem * 1.5 = 1.125rem */
  font-weight: bold;
}

.slot-number .page-number {
  color: #000;
}

.slot-number .page-number.page-number-red {
  color: #dc2626;
  font-weight: bold;
}

.slot-number .slot-number-value {
  color: #000;
  font-size: 1.125rem; /* スロット番号も1.5倍に */
  font-weight: bold;
  flex-shrink: 0;
}

.slot-number .slot-number-value.slot-number-red {
  color: #dc2626;
  font-weight: bold;
}

.delete-slot-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  width: 20px;
  height: 20px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;
}

.delete-slot-btn:hover:not(:disabled) {
  background: #dc2626;
  transform: scale(1.1);
}

.delete-slot-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.delete-slot-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.slot-content {
  display: flex;
  gap: 0.5rem;
  height: calc(100% - 1.5rem);
  min-height: 0;
}

.slot-left {
  width: calc(100% * 1 / 3); /* 画像1:入力欄2の比率 */
  flex-shrink: 0;
  position: relative;
  height: 100%;
  min-height: 0;
}

.slot-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.slot-field {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-height: 0;
}

.caption-input {
  font-size: 0.7rem;
  padding: 0.25rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  height: auto;
  min-height: 0;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.work-phase-select {
  font-size: 0.7rem;
  padding: 0.25rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  height: auto;
  min-height: 0;
  flex-shrink: 0;
}

.note-field {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.note-textarea {
  font-size: 0.7rem;
  padding: 0.25rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  resize: none;
  font-family: inherit;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  width: 100%;
}

.slot-image {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slot-image.non-standard-aspect {
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

.slot-image img {
  object-fit: contain;
  object-position: center;
}

.remove-button {
  position: absolute;
  top: 0.125rem;
  right: 0.125rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  width: 20px;
  height: 20px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s;
  opacity: 0;
  visibility: hidden;
}

.slot-image:hover .remove-button {
  opacity: 1;
  visibility: visible;
}

.remove-button:hover {
  background: #dc2626;
  transform: scale(1.1);
}

.remove-button:active:not(:disabled) {
  transform: scale(0.95);
}

.remove-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.slot-empty {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  background: #f9fafb;
}

.empty-icon,
.upload-icon {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.upload-icon {
  color: #3b82f6;
}

.empty-text {
  font-size: 0.65rem;
}

.insert-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.insert-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: scale(1.1);
}

.insert-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.insert-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.insert-btn:disabled:hover {
  transform: none;
  background: #9ca3af;
}

.insert-btn.disabled-btn {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.insert-btn.disabled-btn:hover {
  transform: none;
  background: #9ca3af;
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

/* 3分割の表示 */
.drag-zone-indicators {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  z-index: 20;
  pointer-events: none;
}

.drag-zone-indicator {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.drag-zone-indicator.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
}

.drag-zone-icon {
  font-size: 3rem;
  font-weight: bold;
  color: #3b82f6;
  margin-bottom: 0.5rem;
}

.drag-zone-indicator.active .drag-zone-icon {
  color: #2563eb;
  transform: scale(1.2);
}

.drag-zone-label {
  font-size: 1rem;
  font-weight: 600;
  color: #3b82f6;
}

.drag-zone-indicator.active .drag-zone-label {
  color: #2563eb;
}
</style>

