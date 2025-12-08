<template>
  <!-- スニペットコンテキストメニュー -->
  <div 
    v-if="isOpen" 
    class="snippet-context-menu"
    :style="{ top: position.y + 'px', left: position.x + 'px' }"
    @click.stop
  >
    <slot name="top-items"></slot>
    
    <div v-if="hasTopItems" class="context-menu-divider"></div>
    
    <!-- コピー・切り取り・貼り付け -->
    <div class="context-menu-item" @click="handleCopy">
      <span class="context-menu-icon">📋</span>
      <span>コピー</span>
      <span class="context-menu-shortcut">Ctrl+C</span>
    </div>
    <div class="context-menu-item" @click="handleCut">
      <span class="context-menu-icon">✂️</span>
      <span>切り取り</span>
      <span class="context-menu-shortcut">Ctrl+X</span>
    </div>
    <div class="context-menu-item" @click="handlePaste">
      <span class="context-menu-icon">📝</span>
      <span>貼り付け</span>
      <span class="context-menu-shortcut">Ctrl+V</span>
    </div>
    <div class="context-menu-divider"></div>
    
    <!-- グループ（お気に入り以外）を先に表示 -->
    <div 
      v-for="group in nonFavoriteGroups" 
      :key="group.id"
      class="context-menu-item context-menu-group"
      @click.stop="handleGroupClick(group)"
    >
      <span class="context-menu-icon">☰</span>
      <span class="group-label">{{ group.label }}</span>
      <span class="submenu-arrow">▶</span>
      
      <!-- サブメニュー（クリックで固定表示） -->
      <div 
        v-if="pinnedGroupId === group.id" 
        class="context-submenu"
        @click.stop
      >
        <div 
          v-for="item in snippetItemsByGroup[group.id]" 
          :key="item.id"
          class="context-menu-item context-menu-snippet"
          @click.stop="handleInsertSnippet(item)"
          :title="item.label"
        >
          <span class="snippet-label">{{ truncateLabel(item.label) }}</span>
          <span v-if="!noNewline && item.newline_after" class="snippet-newline-badge">↵</span>
        </div>
        <div v-if="!snippetItemsByGroup[group.id] || snippetItemsByGroup[group.id].length === 0" class="context-menu-empty">
          アイテムがありません
        </div>
      </div>
    </div>
    
    <!-- お気に入りスニペットを後に表示 -->
    <div class="context-menu-divider"></div>
    <div 
      v-for="snippet in favoriteSnippets" 
      :key="snippet.id" 
      class="context-menu-item context-menu-snippet"
      @click="handleInsertSnippet(snippet)"
      :title="snippet.label"
    >
      <span class="snippet-label">{{ truncateLabel(snippet.label) }}</span>
      <span v-if="!noNewline && snippet.newline_after" class="snippet-newline-badge">↵</span>
    </div>
    
    <div class="context-menu-divider"></div>
    <div class="context-menu-item context-menu-add" @click="handleAddCustomSnippet">
      <span class="context-menu-icon">➕</span>
      <span>カスタム文字列を追加</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  snippetGroups: {
    type: Array,
    default: () => []
  },
  snippetItemsByGroup: {
    type: Object,
    default: () => ({})
  },
  customSnippets: {
    type: Array,
    default: () => []
  },
  hasTopItems: {
    type: Boolean,
    default: false
  },
  noNewline: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'insert-snippet', 'add-custom-snippet', 'copy', 'cut', 'paste'])

const pinnedGroupId = ref(null)

// お気に入りのカスタム文字列のみ
const favoriteSnippets = computed(() => {
  return props.customSnippets.filter(s => s.is_favorite === true)
})

// お気に入り以外のグループ
const nonFavoriteGroups = computed(() => {
  return props.snippetGroups.filter(g => g.label !== 'like_snippet')
})

// グループクリック処理
function handleGroupClick(group) {
  if (pinnedGroupId.value === group.id) {
    pinnedGroupId.value = null
  } else {
    pinnedGroupId.value = group.id
  }
}

// スニペット挿入
function handleInsertSnippet(snippet) {
  emit('insert-snippet', snippet)
}

// カスタム文字列追加
function handleAddCustomSnippet() {
  emit('add-custom-snippet')
}

// コピー
function handleCopy() {
  emit('copy')
}

// 切り取り
function handleCut() {
  emit('cut')
}

// 貼り付け
function handlePaste() {
  emit('paste')
}

// ラベルを20文字で省略
function truncateLabel(label) {
  if (!label) return ''
  if (label.length <= 20) return label
  return label.substring(0, 20) + '...'
}

// メニューを閉じる
function closeContextMenu() {
  emit('close')
  pinnedGroupId.value = null
}

// 画面のどこかをクリックしたらメニューを閉じる
function handleGlobalClick() {
  if (props.isOpen) {
    closeContextMenu()
  }
}

// ESCキーでメニューを閉じる
function handleKeyDown(event) {
  if (event.key === 'Escape' && props.isOpen) {
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
</script>

<style scoped>
.snippet-context-menu {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  max-width: 280px;
  padding: 0.25rem 0;
  font-size: 0.8rem;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
}

.context-menu-item:hover {
  background: #f3f4f6;
}

.context-menu-icon {
  font-size: 0.9rem;
  width: 1.25rem;
  text-align: center;
  flex-shrink: 0;
}

.context-menu-shortcut {
  margin-left: auto;
  color: #9ca3af;
  font-size: 0.7rem;
}

.context-menu-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 0.25rem 0;
}

.context-menu-snippet {
  padding-left: 0.75rem;
}

.snippet-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snippet-newline-badge {
  margin-left: auto;
  background: #dbeafe;
  color: #2563eb;
  font-size: 0.65rem;
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
  font-weight: 600;
}

.context-menu-empty {
  padding: 0.5rem 0.75rem;
  color: #9ca3af;
  font-size: 0.75rem;
  font-style: italic;
}

.context-menu-add {
  color: #2563eb;
  font-weight: 500;
}

.context-menu-add:hover {
  background: #eff6ff;
}

.context-menu-group {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.submenu-arrow {
  margin-left: auto;
  font-size: 0.65rem;
  color: #9ca3af;
}

.context-submenu {
  position: absolute;
  left: 100%;
  top: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  max-width: 300px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1001;
  margin-left: 4px;
}

.context-submenu .context-menu-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.context-submenu .context-menu-item:hover {
  background: #f3f4f6;
}

.context-submenu .context-menu-empty {
  padding: 1rem 0.75rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.75rem;
}
</style>

