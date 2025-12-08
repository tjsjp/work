<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <button class="modal-close" @click="handleClose">×</button>
      <div v-if="file.fullImageUrl && !isLoading" class="modal-image-container">
        <img 
          :src="file.fullImageUrl" 
          :alt="file.original_name || '画像'" 
          class="modal-image"
          :style="{ transform: `rotate(${file.rotation || 0}deg)` }"
        />
        <button
          class="modal-rotate-btn"
          @click="handleRotate"
          title="画像を回転（90度）"
        >
          ⤵
        </button>
      </div>
      <div v-else class="modal-loading">
        <div class="modal-loading-spinner"></div>
        <div class="modal-loading-text">読み込み中...</div>
      </div>
      <div class="modal-info">
        <div class="modal-file-name">{{ file.original_name || '無名ファイル' }}</div>
        <div v-if="file.size_bytes" class="modal-file-size">
          {{ formatFileSize(file.size_bytes) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps, defineEmits } from 'vue'

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'rotate'])

const isOpen = computed(() => !!props.file)

function handleClose() {
  emit('close')
}

function handleRotate() {
  emit('rotate')
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: auto;
  height: auto;
}

.modal-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background 0.2s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.9);
}

.modal-image-container {
  width: 800px;
  height: 800px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  background: #000;
  flex-shrink: 0;
}

.modal-image {
  width: 800px;
  height: 800px;
  object-fit: contain;
  object-position: center;
}

.modal-rotate-btn {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background 0.2s;
}

.modal-rotate-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.modal-loading {
  width: 800px;
  height: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  background: #000;
  flex-shrink: 0;
}

.modal-loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.modal-loading-text {
  font-size: 1rem;
  color: #6b7280;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.modal-info {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.modal-file-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.modal-file-size {
  font-size: 0.875rem;
  color: #6b7280;
}
</style>



