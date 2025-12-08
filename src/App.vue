<template>
  <div class="app-container">
    <!-- 左側タブバー -->
    <div class="left-tab-bar">
      <!-- 更新ボタン（一番上） -->
      <button 
        class="tab-button action-button"
        @click="handleReload"
        :disabled="isReloading"
        title="更新"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ 'spinning': isReloading }">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
        </svg>
      </button>

      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'works' }"
        @click="handleTabClick('works')"
        :disabled="!isAuthenticated"
        title="WORKS情報検索"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'edit' }"
        @click="handleTabClick('edit')"
        :disabled="!isAuthenticated"
        title="スロット編集"
      >
        <!-- 写真アイコン（写真フレーム + 風景） -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'estimate' }"
        @click="handleEstimateTabClick"
        :disabled="!isAuthenticated"
        title="あき家見積作成"
      >
        <!-- 家アイコン -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'templates' }"
        @click="handleTabClick('templates')"
        :disabled="!isAuthenticated"
        title="テンプレート編集"
      >
        <!-- 歯車アイコン -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      <!-- スペーサー -->
      <div class="tab-spacer"></div>

      <!-- ログイン/ログアウトボタン -->
      <button 
        v-if="!isAuthenticated"
        class="tab-button action-button login-tab-button"
        @click="showLoginModal = true"
        title="ログイン"
      >
        <!-- ログインアイコン（矢印が入るドア） -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
          <polyline points="10 17 15 12 10 7"></polyline>
          <line x1="15" y1="12" x2="3" y2="12"></line>
        </svg>
      </button>
      <button 
        v-else
        class="tab-button action-button logout-tab-button"
        @click="handleLogout"
        title="ログアウト"
      >
        <!-- ログアウトアイコン（矢印が出るドア） -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>
    </div>

    <div class="main-wrapper">
      <!-- 細いヘッダーバー -->
      <div class="thin-header-bar"></div>

      <!-- エラーメッセージ（フローティング表示） -->
      <div v-if="error" class="header-error-message">
        {{ error }}
      </div>

    <LoginModal
      :is-open="showLoginModal"
      @close="showLoginModal = false"
      @login-success="handleLoginSuccess"
    />

    <FileModal
      v-if="selectedFileForModal"
      :file="selectedFileForModal"
      :image-url="selectedFileForModal.fullImageUrl"
      :is-open="!!selectedFileForModal"
      :is-loading="selectedFileForModal.isLoading"
      @close="selectedFileForModal = null"
      @rotate="handleRotateFile"
    />

    <!-- カスタム文字列追加モーダル -->
    <CustomSnippetModal
      :is-open="showCustomSnippetModal"
      :initial-text="customSnippetInitialText"
      :snippet-groups="snippetGroups"
      @close="showCustomSnippetModal = false"
      @add="handleAddCustomSnippet"
    />

    <!-- WORKS情報検索タブ -->
    <HomePage 
      v-show="isAuthenticated && activeTab === 'works'" 
      :is-authenticated="isAuthenticated"
      @edit-work="handleEditWork" 
      @create-estimate="handleCreateEstimate"
      @loading-changed="setWorksLoading" 
      ref="homePageRef" 
    />

    <!-- スロット編集タブ -->
    <div v-show="activeTab === 'edit'" class="edit-tab-container">
      <div v-if="!isAuthenticated" class="welcome-message">
        <p>ログインしてからWork IDを入力してデータを読み込んでください</p>
      </div>
      <div v-else-if="!workId || !dataLoaded" class="welcome-message">
        <p>Work IDを入力してデータを読み込んでください</p>
      </div>
      <div v-else class="main-content">
      <!-- 左上のアップロード進行状況表示 -->
      <div v-if="uploadProgress.active" class="upload-progress-indicator">
        <div class="upload-spinner-small"></div>
        <span class="upload-progress-text">{{ uploadProgress.current }}/{{ uploadProgress.total }}</span>
      </div>

      <div class="left-panel">
        <h2>未割当ファイル</h2>
        <UnassignedFiles
          :files="unassignedFiles"
          :imageUrls="imageUrls"
          :work-id="workId"
          :work-categories="workCategories"
          :work-phases="workPhases"
          :category-label-templates="categoryLabelTemplates"
          @assign="handleAssignFile"
          @upload="handleFileUpload"
          @file-click="handleFileClick"
          @update-file-category="handleUpdateFileCategory"
          @remove-category="handleRemoveFileCategory"
          @delete-file="handleDeleteFile"
          @add-category="handleAddCategory"
          @update-category="handleUpdateCategory"
          @delete-category="handleDeleteCategory"
          @add-template="handleAddCategoryLabelTemplate"
        />
      </div>

      <div class="right-panel">
        <div class="right-panel-content">
          <div class="slot-grid-section">
            <div class="slot-header-with-controls">
              <h2>スロット一覧</h2>
              <div class="pdf-control-section">
                <label class="pdf-label">表紙：</label>
                <textarea
                  id="repair-item-input"
                  v-model="repairItemInput"
                  class="repair-item-input"
                  placeholder="補修内容を入力..."
                  :disabled="loading || pdfGenerating"
                  rows="2"
                  @blur="handleDisplayTextChange"
                ></textarea>
                <button 
                  @click="openPdfInNewTab" 
                  :disabled="!pdfFileUrl"
                  class="pdf-button pdf-view-button"
                  title="PDFを表示"
                >
                  表示
                </button>
                <button @click="handleGeneratePDF" :disabled="pdfGenerating || loading" class="pdf-button">
                  {{ pdfGenerating ? '生成中...' : '生成' }}
                </button>
              </div>
            </div>
            <div class="slot-grid-wrapper" :class="{ 'loading': loading || pdfGenerating }">
              <div v-if="loading || pdfGenerating" class="loading-overlay">
                <div class="spinner"></div>
                <p>{{ pdfGenerating ? 'PDF生成中...' : '処理中...' }}</p>
              </div>
              <SlotGrid
                :slots="displaySlots"
                :all-slots="displaySlots"
                :imageUrls="imageUrls"
                :files="files"
                :work-id="workId"
                :work-phases="workPhases"
                :disabled="loading || pdfGenerating"
                :custom-snippets="customSnippets"
                :snippet-groups="snippetGroups"
                :snippet-items-by-group="snippetItemsByGroup"
                @reorder="handleReorderSlots"
                @assign="handleAssignFile"
                @unassign="handleUnassignFile"
                @upload="handleFileUpload"
                @update="handleUpdateSlot"
                @insert="handleInsertSlot"
                @copy="handleCopySlot"
                @delete="handleDeleteSlot"
                @delete-page="handleDeletePage"
                @file-click="handleFileClick"
                @slot-move="handleSlotMove"
                @slot-swap="handleSlotSwap"
                @slot-copy="handleSlotCopy"
                @file-swap="handleFileSwap"
                @file-copy="handleFileCopy"
                @slot-drag-start="handleSlotDragStart"
                @slot-drag-end="handleSlotDragEnd"
                :is-slot-dragging="isSlotDragging"
                :slot-templates="slotTemplates"
                @add-template="handleAddTemplate"
                @create-template="handleCreateTemplate"
                @update-template="handleUpdateTemplate"
                @delete-template="handleDeleteTemplate"
                @add-custom-snippet="handleOpenCustomSnippetModal"
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- テンプレート編集タブ -->
    <div v-if="activeTab === 'templates' && isAuthenticated" class="templates-tab-container">
      <div class="templates-sidebar">
        <h2 class="templates-sidebar-title">テンプレート編集</h2>
        <nav class="templates-nav">
          <button 
            class="templates-nav-item"
            :class="{ active: selectedTemplateType === 'customSnippets' }"
            @click="selectedTemplateType = 'customSnippets'"
          >
            <span class="templates-nav-label">カスタム文字列</span>
          </button>
          <button 
            class="templates-nav-item"
            :class="{ active: selectedTemplateType === 'categoryLabels' }"
            @click="selectedTemplateType = 'categoryLabels'"
          >
            <span class="templates-nav-label">写真カテゴリー</span>
          </button>
          <button 
            class="templates-nav-item"
            :class="{ active: selectedTemplateType === 'billing' }"
            @click="selectedTemplateType = 'billing'"
          >
            <span class="templates-nav-label">小口請求</span>
          </button>
          <button 
            class="templates-nav-item"
            :class="{ active: selectedTemplateType === 'workSlots' }"
            @click="selectedTemplateType = 'workSlots'"
          >
            <span class="templates-nav-label">写真台帳</span>
          </button>
          <button 
            class="templates-nav-item"
            :class="{ active: selectedTemplateType === 'roomLabels' }"
            @click="selectedTemplateType = 'roomLabels'"
          >
            <span class="templates-nav-label">デフォルト部屋名</span>
          </button>
        </nav>
      </div>
      <div class="templates-content">
        <!-- カスタム文字列編集 -->
        <CustomSnippetEditor v-if="selectedTemplateType === 'customSnippets'" ref="customSnippetEditorRef" />
        
        <!-- 写真カテゴリー編集 -->
        <CategoryLabelTemplateEditor v-else-if="selectedTemplateType === 'categoryLabels'" ref="categoryLabelTemplateEditorRef" />
        
        <!-- 写真台帳テンプレート編集 -->
        <WorkSlotTemplateEditor v-else-if="selectedTemplateType === 'workSlots'" ref="workSlotTemplateEditorRef" />
        
        <!-- 小口請求テンプレート編集 -->
        <BillingTemplateEditor v-else-if="selectedTemplateType === 'billing'" ref="billingTemplateEditorRef" />
        
        <!-- デフォルト部屋名編集 -->
        <RoomLabelTemplateEditor v-else-if="selectedTemplateType === 'roomLabels'" ref="roomLabelTemplateEditorRef" />
        
        <!-- 未選択時 -->
        <div v-else class="templates-content-placeholder">
          <p>左のメニューから編集するテンプレートを選択してください</p>
        </div>
      </div>
    </div>

    <!-- あき家見積作成タブ -->
    <div v-if="activeTab === 'estimate' && isAuthenticated" class="estimate-tab-container">
      <EstimateEditor 
        ref="estimateEditorRef"
        :work-id="estimateWorkId"
        @back="activeTab = 'works'"
      />
    </div>

    <!-- 未認証時のメッセージ -->
    <div v-if="!isAuthenticated && activeTab !== 'edit'" class="welcome-message">
      <p>ログインしてください</p>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabaseService, supabaseClient } from './services/supabase'

const route = useRoute()
const router = useRouter()
import { prepareSlotsForDisplay, getUnassignedFiles, generateSortIndexUpdates, groupSlotsForGrid } from './utils/slotSorting'
import { uploadQueue } from './utils/uploadQueue'
import { generatePDFFromLayout } from './utils/pdfGeneratorCommon'
import LoginModal from './components/LoginModal.vue'
import UnassignedFiles from './components/UnassignedFiles.vue'
import SlotGrid from './components/SlotGrid.vue'
import FileModal from './components/FileModal.vue'
import HomePage from './components/HomePage.vue'
import CustomSnippetModal from './components/CustomSnippetModal.vue'
import CustomSnippetEditor from './components/CustomSnippetEditor.vue'
import CategoryLabelTemplateEditor from './components/CategoryLabelTemplateEditor.vue'
import WorkSlotTemplateEditor from './components/WorkSlotTemplateEditor.vue'
import BillingTemplateEditor from './components/BillingTemplateEditor.vue'
import RoomLabelTemplateEditor from './components/RoomLabelTemplateEditor.vue'
import EstimateEditor from './components/EstimateEditor.vue'

const isAuthenticated = ref(false)
const showLoginModal = ref(false)
const workId = ref('')
const loading = ref(false)
const error = ref(null)
const dataLoaded = ref(false)
const files = ref([])
const slots = ref([])
const imageUrls = ref({})
const workPhases = ref([])
const workCategories = ref([])
const workKind = ref(null)
const failedUploadFiles = ref([])
const failedUploadOptions = ref({})
const selectedFileForModal = ref(null)
const uploadProgress = ref({ active: false, current: 0, total: 0, fileName: '' })
const isSlotDragging = ref(false) // スロットをドラッグしているかどうか
const slotTemplates = ref([]) // ワークスロットテンプレート一覧
const pdfGenerating = ref(false) // PDF生成中かどうか
const workDataForPDF = ref(null) // PDF生成用のワークデータ
const repairItemInput = ref('') // 補修内容入力用
const homePageRef = ref(null) // HomePageコンポーネントへの参照
const worksLoading = ref(false) // WORKS一覧の読み込み中かどうか

// 統合された更新ボタンのローディング状態
const isReloading = computed(() => {
  if (activeTab.value === 'works') {
    return worksLoading.value
  } else if (activeTab.value === 'edit') {
    return loading.value
  } else if (activeTab.value === 'templates') {
    return templateEditorLoading.value
  } else if (activeTab.value === 'estimate') {
    return estimateEditorRef.value?.loading ?? false
  }
  return false
})
const customSnippetEditorRef = ref(null) // カスタム文字列エディターへの参照
const categoryLabelTemplateEditorRef = ref(null) // 写真カテゴリーエディターへの参照
const workSlotTemplateEditorRef = ref(null) // 写真台帳テンプレートエディターへの参照
const billingTemplateEditorRef = ref(null) // 小口請求テンプレートエディターへの参照
const roomLabelTemplateEditorRef = ref(null) // デフォルト部屋名エディターへの参照
const estimateEditorRef = ref(null) // 見積作成エディターへの参照
const estimateWorkId = ref('') // 見積作成対象のworkId

// テンプレートエディターのローディング状態（計算プロパティ）
const templateEditorLoading = computed(() => {
  if (selectedTemplateType.value === 'customSnippets') {
    return customSnippetEditorRef.value?.loading ?? false
  } else if (selectedTemplateType.value === 'billing') {
    return billingTemplateEditorRef.value?.loading ?? false
  } else if (selectedTemplateType.value === 'categoryLabels') {
    return categoryLabelTemplateEditorRef.value?.loading ?? false
  } else if (selectedTemplateType.value === 'workSlots') {
    return workSlotTemplateEditorRef.value?.loading ?? false
  } else if (selectedTemplateType.value === 'roomLabels') {
    return roomLabelTemplateEditorRef.value?.loading ?? false
  }
  return false
})

const pdfFileUrl = ref(null) // PDFファイルの署名付きURL

// カスタム文字列（備考コンテキストメニュー用）
const customSnippets = ref([])
const snippetGroups = ref([])
const snippetItemsByGroup = ref({})
const showCustomSnippetModal = ref(false)
const customSnippetInitialText = ref('')

// カテゴリーラベルテンプレート
const categoryLabelTemplates = ref([])
// スニペット挿入用のコンテキスト（リストモーダルから挿入する際に使用）
const snippetInsertContext = ref(null)

// URLパラメータからwork_idを取得して編集モードかどうかを判定
const isEditMode = ref(false)

// アクティブなタブ（'works', 'edit', 'templates', 'future'）
const activeTab = ref('works')

// テンプレート編集タブで選択中のテンプレートタイプ
const selectedTemplateType = ref(null)

// テンプレートタイプの表示名を取得
function getTemplateTypeName(type) {
  const names = {
    customSnippets: 'カスタム文字列',
    categoryLabels: '写真カテゴリー',
    billing: '小口請求',
    workSlots: '写真台帳'
  }
  return names[type] || type
}

// URLパラメータをチェック
function checkUrlParams() {
  const workIdParam = route.query.work_id
  const tabParam = route.query.tab
  
  // work_idがある場合は復元
  if (workIdParam) {
    workId.value = workIdParam
    
    // tabパラメータがあればそのタブに、なければデフォルトで編集タブに
    if (tabParam) {
      activeTab.value = tabParam
      // 編集タブの場合は編集モードをON
      if (tabParam === 'edit') {
        isEditMode.value = true
        if (isAuthenticated.value) {
          loadData()
        }
      }
      // 見積作成タブの場合
      else if (tabParam === 'estimate') {
        estimateWorkId.value = workIdParam
      }
    } else {
      // tabパラメータがない場合はデフォルトで編集タブ
      isEditMode.value = true
      activeTab.value = 'edit'
      if (isAuthenticated.value) {
        loadData()
      }
    }
  } else {
    isEditMode.value = false
    // work_idがない場合で、tabパラメータがあればそのタブに移動
    if (tabParam && ['works', 'templates', 'estimate'].includes(tabParam)) {
      activeTab.value = tabParam
    } else if (activeTab.value === 'edit') {
      // work_idがなく、現在編集タブにいる場合はworksタブに戻る
      activeTab.value = 'works'
    }
  }
}

// ワーク編集を開始
function handleEditWork(workIdParam) {
  if (workIdParam) {
    const previousWorkId = workId.value
    workId.value = workIdParam
    isEditMode.value = true
    activeTab.value = 'edit' // 編集タブに切り替え
    // URLパラメータも設定
    router.push({ path: '/', query: { work_id: workIdParam, tab: 'edit' } })
    // ワークIDが変更された場合、またはデータが未読み込みの場合は読み込む
    if (isAuthenticated.value && (previousWorkId !== workIdParam || !dataLoaded.value)) {
      loadData()
    }
  }
}

// 見積作成画面に遷移
function handleCreateEstimate(workIdParam) {
  if (workIdParam) {
    estimateWorkId.value = workIdParam
    activeTab.value = 'estimate'
    // URLパラメータも設定
    router.push({ path: '/', query: { work_id: workIdParam, tab: 'estimate' } })
  }
}

// タブをクリックした時
function handleTabClick(tab) {
  activeTab.value = tab
  
  // 編集タブの場合は編集モードをON
  if (tab === 'edit' && workId.value) {
    isEditMode.value = true
    if (isAuthenticated.value && !dataLoaded.value) {
      loadData()
    }
  }
  
  // worksタブの場合は編集モードをOFF
  if (tab === 'works') {
    isEditMode.value = false
  }
  
  // URLパラメータを更新
  const query = {}
  
  // work_idがあれば保持
  if (workId.value && (tab === 'edit' || tab === 'estimate')) {
    query.work_id = workId.value
  }
  
  // tabパラメータを設定（worksタブの場合は省略）
  if (tab !== 'works') {
    query.tab = tab
  }
  
  router.push({ path: '/', query })
}

// 見積作成タブをクリックした時
function handleEstimateTabClick() {
  // 現在のworkIdを見積作成用にコピー
  if (workId.value) {
    estimateWorkId.value = workId.value
    router.push({ path: '/', query: { work_id: workId.value, tab: 'estimate' } })
  } else {
    router.push({ path: '/', query: { tab: 'estimate' } })
  }
  activeTab.value = 'estimate'
}

// ルートの変更を監視
watch(() => route.query, (newQuery, oldQuery) => {
  const newWorkId = newQuery.work_id
  const oldWorkId = oldQuery?.work_id
  const newTab = newQuery.tab
  
  if (newWorkId) {
    const previousWorkId = workId.value
    workId.value = newWorkId
    
    // tabパラメータがある場合はそのタブに切り替え
    if (newTab) {
      activeTab.value = newTab
      if (newTab === 'estimate') {
        estimateWorkId.value = newWorkId
      } else if (newTab === 'edit') {
        isEditMode.value = true
        // ワークIDが変更された場合のみリロード
        if (isAuthenticated.value && (previousWorkId !== newWorkId || !dataLoaded.value)) {
          loadData()
        }
      }
    } else {
      // tabパラメータがない場合はデフォルトで編集タブ
      isEditMode.value = true
      activeTab.value = 'edit'
      if (isAuthenticated.value && (previousWorkId !== newWorkId || !dataLoaded.value)) {
        loadData()
      }
    }
  } else if (oldWorkId) {
    // URLパラメータがクリアされた場合（worksタブに戻った場合）
    // データは保持する（クリアしない）
    isEditMode.value = false
  }
}, { deep: true })

// タブ切り替え時の処理（データは保持する）
watch(activeTab, (newTab, oldTab) => {
  // worksタブから編集タブに切り替える時、work_idがあればURLパラメータを設定
  if (newTab === 'edit' && oldTab === 'works' && workId.value) {
    router.push({ path: '/', query: { work_id: workId.value } })
  }
  // 編集タブからworksタブに切り替える時、URLパラメータをクリア
  else if (newTab === 'works' && oldTab === 'edit') {
    router.push({ path: '/' })
  }
  
  // 見積作成タブに切り替わった時、見積スロットを読み込み
  if (newTab === 'estimate' && estimateWorkId.value && isAuthenticated.value) {
    // 少し遅延させてコンポーネントがマウントされてから読み込み
    setTimeout(() => {
      if (estimateEditorRef.value?.loadEstimateSlots) {
        estimateEditorRef.value.loadEstimateSlots()
      }
      if (estimateEditorRef.value?.loadPriceListItems) {
        estimateEditorRef.value.loadPriceListItems()
      }
    }, 100)
  }
})

// ログイン成功時の処理
function handleLoginSuccess() {
  isAuthenticated.value = true
  showLoginModal.value = false
  // セッションを確認
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      supabaseService.setAccessToken(session.access_token)
    }
  })
  
  // ログイン後、work_idパラメータがある場合のみ編集タブに移動
  if (route.query.work_id) {
    workId.value = route.query.work_id
    isEditMode.value = true
    activeTab.value = 'edit'
    loadData()
  } else {
    // work_idパラメータがない場合はworksタブに移動
    activeTab.value = 'works'
    // WORKS一覧を自動読み込み
    setTimeout(() => {
      if (homePageRef.value && homePageRef.value.loadWorks) {
        homePageRef.value.loadWorks()
      }
    }, 100) // DOMが更新されるまで少し待つ
  }
}

// ログアウト処理
async function handleLogout() {
  try {
    await supabaseClient.auth.signOut()
    isAuthenticated.value = false
    workId.value = ''
    dataLoaded.value = false
    files.value = []
    slots.value = []
    imageUrls.value = {}
    error.value = null
  } catch (err) {
    console.error('Logout error:', err)
    error.value = 'ログアウトに失敗しました'
  }
}

// セッション確認
supabaseClient.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    isAuthenticated.value = true
    supabaseService.setAccessToken(session.access_token)
    checkUrlParams()
  }
})

// 認証状態の監視
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    isAuthenticated.value = true
    supabaseService.setAccessToken(session.access_token)
    checkUrlParams()
  } else if (event === 'SIGNED_OUT') {
    isAuthenticated.value = false
    supabaseService.setAccessToken(null)
    isEditMode.value = false
    workId.value = ''
  }
})

// ウィンドウの可視性変更を監視（最小化/復帰時の不要なローディングを防ぐ）
let visibilityChangeHandler = null
let isWindowHidden = false

// ページ読み込み時にURLパラメータをチェック
onMounted(() => {
  checkUrlParams()
  
  // ウィンドウの可視性変更を監視（最小化/復帰時の不要なローディングを防ぐ）
  visibilityChangeHandler = () => {
    if (document.hidden) {
      // ウィンドウが非表示になったとき
      isWindowHidden = true
    } else if (isWindowHidden) {
      // ウィンドウが非表示から表示に戻ったとき
      isWindowHidden = false
      // ウィンドウ復帰時に誤ってローディングが表示されるのを防ぐ
      // ユーザーが明示的にリロードボタンを押した場合のみデータを再読み込み
      // 画像URLの有効期限切れなどで自動的にローディングが表示されるのを防ぐ
      console.log('Window visibility changed: preventing automatic reload')
      // 短時間の間、自動読み込みを防ぐ
      setTimeout(() => {
        // この時点でまだローディング中で、PDF生成中でもない場合はリセット
        // （誤ってローディングが表示されている可能性がある）
        if (loading.value && !pdfGenerating.value) {
          console.log('Resetting loading state after window visibility change')
          loading.value = false
        }
      }, 100)
    }
  }
  
  document.addEventListener('visibilitychange', visibilityChangeHandler)
})

// データクリア
function clearData() {
  dataLoaded.value = false
  files.value = []
  slots.value = []
  imageUrls.value = {}
  workDataForPDF.value = null
}

// データ読み込み
async function loadData(loadTemplates = true, skipVisibilityCheck = false) {
  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  // ウィンドウが非表示から復帰した直後の自動読み込みを防ぐ
  if (!skipVisibilityCheck && isWindowHidden) {
    console.log('Skipping loadData: window was hidden')
    return
  }

  loading.value = true
  error.value = null

  try {
    // まずスロットを取得してworkKindを取得
    const slotsResult = await supabaseService.getWorkSlots(workId.value)
    workKind.value = slotsResult.workKind
    // PDF生成用のデータも保存
    workDataForPDF.value = slotsResult.workData

    console.log('workKind:', workKind.value) // デバッグ用

    // ファイル、master_work_phaseとmaster_work_categoriesを並列で取得
    const promises = [
      supabaseService.getWorkFiles(workId.value),
      supabaseService.getMasterWorkPhases(workKind.value)
    ]
    
    // テンプレート取得はloadTemplatesがtrueの場合のみ
    if (loadTemplates) {
      promises.push(
        supabaseService.getWorkSlotTemplates(workKind.value).catch(err => {
          console.error('Error fetching slot templates:', err)
          return [] // エラー時は空配列を返す
        })
      )
    }
    
    const results = await Promise.all(promises)
    const filesData = results[0]
    const masterData = results[1]
    const templatesData = loadTemplates ? results[2] : slotTemplates.value // テンプレートを取得しない場合は既存の値を保持

    files.value = filesData
    slots.value = slotsResult.slots
    workPhases.value = masterData.workPhases
    // workCategoriesは新しいテーブルから取得
    if (loadTemplates) {
      slotTemplates.value = templatesData
    }

    // work_categoriesテーブルからカテゴリーを取得
    await loadWorkCategories()

    // 画像の署名URLを取得
    await loadImageUrls(filesData)

    // PDFファイル情報を取得
    await loadPdfFile()

    // worksテーブルからdisplay_textを取得してrepairItemInputに設定
    if (slotsResult.workData?.display_text) {
      // 改行を保持するため、そのまま設定（trimやreplaceは行わない）
      repairItemInput.value = slotsResult.workData.display_text || ''
      // デバッグ: 改行が含まれているか確認
      if (repairItemInput.value.includes('\n') || repairItemInput.value.includes('\r')) {
        console.log('display_textに改行が含まれています:', repairItemInput.value)
      }
    }

    // カスタム文字列を読み込み
    await loadCustomSnippets()

    // カテゴリーラベルテンプレートを読み込み
    await loadCategoryLabelTemplates()

    dataLoaded.value = true
  } catch (err) {
    const errorMessage = err.message || err.toString() || '不明なエラー'
    
    // BigQueryクォータ超過エラー
    if (errorMessage.includes('Quota exceeded') || errorMessage.includes('quotaExceeded')) {
      error.value = 'データの読み込みに失敗しました: Supabaseのクォータ制限に達しています。しばらく待ってから再度お試しください。'
    } else {
      error.value = `データの読み込みに失敗しました: ${errorMessage}`
    }
    console.error(err)
  } finally {
    loading.value = false
  }
}

// 画像の署名URLを取得（サムネイルを優先）
async function loadImageUrls(filesData) {
  const urlPromises = filesData.map(async (file) => {
    try {
      // サムネイルを優先的に取得（存在しない場合は元画像）
      const url = await supabaseService.getSignedUrlByFileId(file.id, true)
      return { fileId: file.id, url }
    } catch (err) {
      console.error(`Failed to get signed URL for ${file.id}:`, err)
      return { fileId: file.id, url: null }
    }
  })

  const results = await Promise.all(urlPromises)
  imageUrls.value = Object.fromEntries(
    results.map(r => [r.fileId, r.url])
  )
}

// PDFファイル情報を取得
async function loadPdfFile() {
  if (!workId.value) return
  
  try {
    const pdfFile = await supabaseService.getPdfFile(workId.value)
    if (pdfFile && pdfFile.signed_url) {
      pdfFileUrl.value = pdfFile.signed_url
    } else {
      pdfFileUrl.value = null
    }
  } catch (err) {
    console.error('Failed to load PDF file:', err)
    pdfFileUrl.value = null
  }
}

// PDFを新しいタブで開く
function openPdfInNewTab() {
  if (pdfFileUrl.value) {
    window.open(pdfFileUrl.value, '_blank')
  }
}

// === Work Categories関連 ===

// workに紐づくカテゴリーを読み込み
async function loadWorkCategories() {
  if (!workId.value) return
  
  try {
    const categories = await supabaseService.getWorkCategories(workId.value)
    workCategories.value = categories
  } catch (err) {
    console.error('Failed to load work categories:', err)
    workCategories.value = []
  }
}

// カテゴリーを追加
async function handleAddCategory({ label, is_phase }) {
  if (!workId.value) return
  
  try {
    const category = await supabaseService.createWorkCategory(workId.value, label, is_phase)
    // 追加されたカテゴリーをリストに追加
    workCategories.value = [...workCategories.value, category]
  } catch (err) {
    console.error('Failed to add category:', err)
    error.value = `カテゴリーの追加に失敗しました: ${err.message}`
  }
}

// カテゴリーを更新
async function handleUpdateCategory(categoryId, updates) {
  try {
    const updatedCategory = await supabaseService.updateWorkCategory(categoryId, updates)
    // ローカルのカテゴリーリストを更新
    workCategories.value = workCategories.value.map(c => 
      c.id === categoryId ? { ...c, ...updatedCategory } : c
    )
  } catch (err) {
    console.error('Failed to update category:', err)
    error.value = `カテゴリーの更新に失敗しました: ${err.message}`
  }
}

// カテゴリーを削除
async function handleDeleteCategory(categoryId) {
  try {
    await supabaseService.deleteWorkCategory(categoryId)
    // 削除されたカテゴリーをリストから除外
    workCategories.value = workCategories.value.filter(c => c.id !== categoryId)
    
    // このカテゴリーに紐づくファイルのwork_category_idをnullにする（ローカルで更新）
    files.value = files.value.map(file => {
      if (file.work_category_id === categoryId) {
        return { ...file, work_category_id: null, default_work_phase_id: null }
      }
      return file
    })
  } catch (err) {
    console.error('Failed to delete category:', err)
    error.value = `カテゴリーの削除に失敗しました: ${err.message}`
  }
}

// === カスタム文字列関連 ===

// カスタム文字列を読み込み
async function loadCustomSnippets() {
  try {
    // グループを取得（お気に入り含む）
    const groups = await supabaseService.getSnippetGroups(true)
    snippetGroups.value = groups
    
    // 各グループのアイテムを取得
    const itemsMap = {}
    for (const group of groups) {
      try {
        const items = await supabaseService.getSnippetItems(group.id, true)
        itemsMap[group.id] = items
      } catch (err) {
        console.error(`Failed to load items for group ${group.id}:`, err)
        itemsMap[group.id] = []
      }
    }
    snippetItemsByGroup.value = itemsMap
    
    // 後方互換性のため、お気に入りアイテムをcustomSnippetsに格納
    const likeSnippetGroup = groups.find(g => g.label === 'like_snippet')
    if (likeSnippetGroup && itemsMap[likeSnippetGroup.id]) {
      customSnippets.value = itemsMap[likeSnippetGroup.id].map(item => ({
        ...item,
        is_favorite: true
      }))
    } else {
      customSnippets.value = []
    }
  } catch (err) {
    console.error('Failed to load custom snippets:', err)
    customSnippets.value = []
    snippetGroups.value = []
    snippetItemsByGroup.value = {}
  }
}

// === カテゴリーラベルテンプレート関連 ===

// カテゴリーラベルテンプレートを読み込み
async function loadCategoryLabelTemplates() {
  try {
    const templates = await supabaseService.getCategoryLabelTemplates()
    categoryLabelTemplates.value = templates
  } catch (err) {
    // Edge Functionが未デプロイの場合は静かに失敗
    console.warn('Failed to load category label templates (Edge Function may not be deployed yet):', err.message)
    categoryLabelTemplates.value = []
  }
}

// カテゴリーラベルをテンプレートに追加
async function handleAddCategoryLabelTemplate(label) {
  if (!label) return
  
  try {
    const template = await supabaseService.addCategoryLabelTemplate(label)
    // 追加されたテンプレートをリストに追加
    categoryLabelTemplates.value = [...categoryLabelTemplates.value, template]
  } catch (err) {
    console.error('Failed to add category label template:', err)
    // 重複エラーの場合は静かに失敗
    if (!err.message.includes('既に存在')) {
      error.value = `テンプレートの追加に失敗しました: ${err.message}`
    }
  }
}

// カスタム文字列追加モーダルを開く
function handleOpenCustomSnippetModal(selectedText) {
  customSnippetInitialText.value = selectedText || ''
  showCustomSnippetModal.value = true
}

// カスタム文字列を追加
async function handleAddCustomSnippet({ label, newline_after, group_id }) {
  try {
    const item = await supabaseService.createSnippetItem(group_id, label, newline_after)
    
    // グループのアイテムリストに追加
    if (snippetItemsByGroup.value[group_id]) {
      snippetItemsByGroup.value[group_id] = [...snippetItemsByGroup.value[group_id], item]
    } else {
      snippetItemsByGroup.value[group_id] = [item]
    }
    
    // お気に入りグループの場合はcustomSnippetsにも追加
    const group = snippetGroups.value.find(g => g.id === group_id)
    if (group && group.label === 'like_snippet') {
      customSnippets.value = [...customSnippets.value, { ...item, is_favorite: true }]
    }
    
    showCustomSnippetModal.value = false
  } catch (err) {
    console.error('Failed to add custom snippet:', err)
    error.value = `カスタム文字列の追加に失敗しました: ${err.message}`
  }
}

// ファイルアップロード（バックグラウンド処理）
async function handleFileUpload(filesToUpload, targetSlotId = null, uploadOptions = {}) {
  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  error.value = null

  // アップロード結果を追跡
  const uploadResults = {
    success: [],
    errors: []
  }

  // 進行状況コールバック
  const onProgress = (progress) => {
    console.log('[App] onProgress called', progress)
    if (progress.active === false) {
      console.log('[App] onProgress: active=false, calling refreshDataAfterUpload')
      uploadProgress.value = { active: false, current: 0, total: 0, fileName: '' }
      // アップロード完了後、データを再読み込み
      refreshDataAfterUpload(targetSlotId, uploadResults)
    } else {
      console.log('[App] onProgress: active=true, updating progress', progress)
      uploadProgress.value = progress
    }
  }

  // キューに追加（バックグラウンドで処理）
  try {
    await uploadQueue.addFiles(
      filesToUpload,
      workId.value,
      uploadOptions,
      null, // uploadSingleFileFnは不要（バッチアップロードを使用）
      onProgress,
      uploadResults // アップロード結果を返すコールバック
    )
    
    // 有効なファイルがなく、エラーのみの場合、onProgressが呼ばれない可能性があるため
    // ここでもエラーチェックを行う
    if (uploadResults.errors.length > 0 && uploadResults.success.length === 0) {
      console.log('[App] handleFileUpload: Only errors, no success files, checking if onProgress was called')
      // onProgressが呼ばれていない場合（アップロード処理が開始されなかった場合）は
      // 直接refreshDataAfterUploadを呼ぶ
      const hasActiveProgress = uploadProgress.value && uploadProgress.value.active
      if (!hasActiveProgress) {
        console.log('[App] handleFileUpload: No active progress, calling refreshDataAfterUpload directly')
        uploadProgress.value = { active: false, current: 0, total: 0, fileName: '' }
        await refreshDataAfterUpload(targetSlotId, uploadResults)
      }
    }
  } catch (err) {
    console.error('アップロードキューエラー:', err)
    error.value = `ファイルのアップロードに失敗しました: ${err.message}`
  }
}

// アップロード完了後のデータ再読み込み
async function refreshDataAfterUpload(targetSlotId, uploadResults) {
  try {
    const isUnassignedUpload = !targetSlotId

    if (isUnassignedUpload) {
      // 未割当エリアへのアップロードの場合は、ファイルとスロットのみ再読み込み
      const [filesData, slotsResult] = await Promise.all([
        supabaseService.getWorkFiles(workId.value),
        supabaseService.getWorkSlots(workId.value)
      ])
      files.value = filesData
      slots.value = slotsResult.slots
      workKind.value = slotsResult.workKind
      
      // 画像の署名URLを取得
      await loadImageUrls(filesData)
    } else {
      // スロットへのアップロードの場合は、ローディングを表示せずに必要なデータのみ再読み込み
      const [filesData, slotsResult] = await Promise.all([
        supabaseService.getWorkFiles(workId.value),
        supabaseService.getWorkSlots(workId.value)
      ])
      files.value = filesData
      slots.value = slotsResult.slots
      workKind.value = slotsResult.workKind
      
      // 画像の署名URLを取得
      await loadImageUrls(filesData)
      
      // スロットが指定されている場合、最初のファイルを割り当て
      if (targetSlotId && uploadResults.success.length > 0) {
        const uploadedFile = uploadResults.success[0]
        await handleAssignFile(targetSlotId, uploadedFile.id)
      }
    }

    // エラーハンドリング
    console.log('[App] refreshDataAfterUpload: Checking errors', {
      errorsCount: uploadResults.errors.length,
      successCount: uploadResults.success.length,
      errors: uploadResults.errors
    })
    
    if (uploadResults.errors.length > 0) {
      const successCount = uploadResults.success.length
      const failedCount = uploadResults.errors.length
      
      // アップロード不許可のエラー（画像ファイル以外など）とその他のエラーを分ける
      const rejectedErrors = uploadResults.errors.filter(err => 
        err.error && (
          err.error.includes('画像ファイル以外') || 
          err.error.includes('リサイズできない') ||
          err.error.includes('処理できません') ||
          err.error.includes('アップロードできません')
        )
      )
      const otherErrors = uploadResults.errors.filter(err => !rejectedErrors.includes(err))
      
      console.log('[App] refreshDataAfterUpload: Error classification', {
        rejectedErrorsCount: rejectedErrors.length,
        otherErrorsCount: otherErrors.length,
        rejectedErrors: rejectedErrors
      })
      
      // アップロード不許可のファイルがある場合はアラートを表示
      if (rejectedErrors.length > 0) {
        const rejectedFileNames = rejectedErrors
          .map(err => err.file ? err.file.name : '不明なファイル')
          .filter((name, index, self) => self.indexOf(name) === index) // 重複を除去
        const rejectedMessage = rejectedErrors.length === 1
          ? `以下のファイルは画像ファイル以外、またはリサイズできない形式のためアップロードできませんでした:\n\n${rejectedFileNames.join('\n')}`
          : `以下の${rejectedFileNames.length}件のファイルは画像ファイル以外、またはリサイズできない形式のためアップロードできませんでした:\n\n${rejectedFileNames.join('\n')}`
        console.log('[App] refreshDataAfterUpload: Showing alert for rejected files', rejectedMessage)
        alert(rejectedMessage)
      }
      
      // その他のエラー（ネットワークエラーなど）がある場合は再送信のオプションを表示
      if (otherErrors.length > 0) {
        const failedFiles = otherErrors.map(err => err.file).filter(Boolean)
        failedUploadFiles.value = failedFiles
        failedUploadOptions.value = {}

        const errorMessage = `${successCount}件のアップロードに成功しましたが、${otherErrors.length}件のファイルでエラーが発生しました。\n再送信しますか？`
        
        if (confirm(errorMessage)) {
          // 再送信
          await handleFileUpload(failedFiles, targetSlotId, {})
        } else {
          if (successCount > 0) {
            error.value = `${successCount}件のアップロードに成功しましたが、${otherErrors.length}件のファイルでエラーが発生しました。`
          } else {
            error.value = `${otherErrors.length}件のファイルでエラーが発生しました。`
          }
        }
      } else {
        // アップロード不許可のエラーのみの場合
        if (successCount > 0) {
          error.value = null // 成功したファイルがある場合はエラーメッセージをクリア
        } else {
          error.value = 'アップロードできるファイルがありませんでした。'
        }
        failedUploadFiles.value = []
        failedUploadOptions.value = {}
      }
    } else {
      error.value = null
      failedUploadFiles.value = []
      failedUploadOptions.value = {}
    }
  } catch (err) {
    console.error('データ再読み込みエラー:', err)
    error.value = `データの再読み込みに失敗しました: ${err.message}`
  }
}

// ファイルのカテゴリー/フェーズを更新
async function handleUpdateFileCategory(fileId, categoryId, phaseId) {
  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  // ローディングは表示しない（未割当から未割当への移動のため）
  error.value = null

  // アップロード処理を一時停止して優先実行
  await uploadQueue.executePriorityOperation(async () => {
    try {
      await supabaseService.updateWorkFileCategory(fileId, categoryId, phaseId)
      
      // ファイルのみ再読み込み（スロット一覧のローディングは表示しない）
      const filesData = await supabaseService.getWorkFiles(workId.value)
      files.value = filesData
      
      // 画像の署名URLを取得
      await loadImageUrls(filesData)
    } catch (err) {
      error.value = `カテゴリー/フェーズの更新に失敗しました: ${err.message}`
      console.error(err)
    }
  })
}

// ファイルのカテゴリー/フェーズを削除
async function handleRemoveFileCategory(fileId) {
  await handleUpdateFileCategory(fileId, null, null)
}

// ファイルを削除
async function handleDeleteFile(fileId) {
  // 確認はUnassignedFiles.vueで既に行われているため、ここでは確認しない

  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  error.value = null

  // アップロード処理を一時停止して優先実行
  await uploadQueue.executePriorityOperation(async () => {
    try {
      await supabaseService.deleteWorkFile(fileId)
      
      // ファイルのみ再読み込み
      const filesData = await supabaseService.getWorkFiles(workId.value)
      files.value = filesData
      
      // 画像の署名URLを取得
      await loadImageUrls(filesData)
    } catch (err) {
      error.value = `ファイルの削除に失敗しました: ${err.message}`
      console.error(err)
    }
  })
}

// ファイルをスロットに割り当て
async function handleAssignFile(slotId, fileId) {
  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  error.value = null

  // アップロード処理を一時停止して優先実行
  await uploadQueue.executePriorityOperation(async () => {
    try {
      // スロットとファイルの情報を取得
      const [slotsResult, filesData] = await Promise.all([
        supabaseService.getWorkSlots(workId.value),
        supabaseService.getWorkFiles(workId.value)
      ])

      const slot = slotsResult.slots.find(s => s.id === slotId)
      const file = filesData.find(f => f.id === fileId)

      if (!slot || !file) {
        throw new Error('スロットまたはファイルが見つかりません')
      }

      // スロットのwork_phase_idがnullまたは空の場合、ファイルのdefault_work_phase_idを適用
      let workPhaseId = slot.work_phase_id
      if (!workPhaseId && file.default_work_phase_id) {
        workPhaseId = file.default_work_phase_id
      }

      // ファイルをスロットに割り当て（assign_file_to_slot Edge Functionを使用）
      await supabaseService.assignFileToSlot(slotId, fileId)

      // work_phase_idの更新が必要な場合、updateWorkSlotで更新
      if (workPhaseId !== null && workPhaseId !== undefined && workPhaseId !== slot.work_phase_id) {
        await supabaseService.updateWorkSlot(slotId, {
          work_phase_id: workPhaseId
        })
      }

      // データを再読み込み（ローディング表示なし）
      const [newFilesData, newSlotsResult] = await Promise.all([
        supabaseService.getWorkFiles(workId.value),
        supabaseService.getWorkSlots(workId.value)
      ])
      files.value = newFilesData
      slots.value = newSlotsResult.slots
      workKind.value = newSlotsResult.workKind
      
      // 画像の署名URLを取得
      await loadImageUrls(newFilesData)
    } catch (err) {
      error.value = `ファイルの割り当てに失敗しました: ${err.message}`
      console.error(err)
    }
  })
}

// スロットからファイルを外す
async function handleUnassignFile(slotId) {
  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  error.value = null

  // アップロード処理を一時停止して優先実行
  await uploadQueue.executePriorityOperation(async () => {
    try {
      await supabaseService.updateWorkSlot(slotId, {
        file_id: null
      })

      // データを再読み込み（ローディング表示なし）
      const [newFilesData, newSlotsResult] = await Promise.all([
        supabaseService.getWorkFiles(workId.value),
        supabaseService.getWorkSlots(workId.value)
      ])
      files.value = newFilesData
      slots.value = newSlotsResult.slots
      workKind.value = newSlotsResult.workKind
    
      // 画像の署名URLを取得
      await loadImageUrls(newFilesData)
    } catch (err) {
      error.value = `ファイルの割り当て解除に失敗しました: ${err.message}`
      console.error(err)
    }
  })
}

// スロットを更新
async function handleUpdateSlot(slotId, updates) {
  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  error.value = null

  // アップロード処理を一時停止して優先実行
  await uploadQueue.executePriorityOperation(async () => {
    try {
      await supabaseService.updateWorkSlot(slotId, updates)

      // データを再読み込み（ローディング表示なし）
      const [newFilesData, newSlotsResult] = await Promise.all([
        supabaseService.getWorkFiles(workId.value),
        supabaseService.getWorkSlots(workId.value)
      ])
      files.value = newFilesData
      slots.value = newSlotsResult.slots
      workKind.value = newSlotsResult.workKind
      
      // 画像の署名URLを取得
      await loadImageUrls(newFilesData)
    } catch (err) {
      error.value = `スロットの更新に失敗しました: ${err.message}`
      console.error(err)
    }
  })
}

// スロットを挿入
async function handleInsertSlot({ sourceSlotId, targetSlotId, position }) {
  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  loading.value = true
  error.value = null

  try {
    // 全スロットを取得してソート
    const slotsResult = await supabaseService.getWorkSlots(workId.value)
    const allSlots = slotsResult.slots.sort((a, b) => a.sort_index - b.sort_index)
    
    let insertCount = 1

    // positionに応じて挿入数を決定
    if (position === 'plus') {
      insertCount = 1
    } else if (position === 'plus3') {
      insertCount = 3
    } else if (position === 'plus6') {
      insertCount = 6
    }

    // スロットがない場合：固定のソートインデックスで作成（リバランス無し）
    if (allSlots.length === 0) {
      // ＋ボタン: 1000000
      // 3＋ボタン: 1000000, 2000000, 3000000
      // 6＋ボタン: 1000000, 2000000, 3000000, 4000000, 5000000, 6000000
      for (let i = 0; i < insertCount; i++) {
        const sortIndex = 1000000 * (i + 1)
        // position='above'を使うと、target_sort_indexの位置に直接挿入される
        await supabaseService.insertWorkSlot(workId.value, sourceSlotId, sortIndex, 'above')
      }
    } else {
      // スロットがある場合
      let currentSlot = null
      let nextSlot = null
      
      if (targetSlotId) {
        currentSlot = allSlots.find(s => s.id === targetSlotId)
        if (currentSlot) {
          const currentIndex = allSlots.findIndex(s => s.id === targetSlotId)
          nextSlot = allSlots[currentIndex + 1] || null
        }
      }

      if (!currentSlot) {
        // targetSlotIdが見つからない場合、最後のスロットを使用
        currentSlot = allSlots[allSlots.length - 1]
        nextSlot = null
      }

      // 押したスロットのソートインデックスをA
      const A = currentSlot.sort_index
      // 次のスロットのソートインデックスをB
      const B = nextSlot ? nextSlot.sort_index : null
      
      if (B === null) {
        // 次のスロットBが無い場合：A + 1000000刻みでソートインデックスにする
        for (let i = 1; i <= insertCount; i++) {
          const sortIndex = A + 1000000 * i
          // position='above'を使うと、target_sort_indexの位置に直接挿入される
          await supabaseService.insertWorkSlot(workId.value, sourceSlotId, sortIndex, 'above')
        }
      } else {
        // 次のスロットBがある場合
        // (A-B)の整数（切捨て）をX
        // ただし、通常B > Aなので、X = A - Bは負の値になる
        // ユーザーの意図を考慮して、X = B - A（間隔）として扱う
        const X = Math.floor(B - A)
        // 挿入するスロットの数をY
        const Y = insertCount
        
        // iを1からYまでfor回して
        // A + (X/(Y+1)の整数（切捨て）) × i をソートインデックスとする
        const interval = Math.floor(X / (Y + 1))
        for (let i = 1; i <= Y; i++) {
          const sortIndex = A + interval * i
          // position='above'を使うと、target_sort_indexの位置に直接挿入される
          await supabaseService.insertWorkSlot(workId.value, sourceSlotId, sortIndex, 'above')
        }
      }
    }

    // データを再読み込み（ローディングは継続、テンプレートは取得しない）
    await loadData(false)
  } catch (err) {
    error.value = `スロットの挿入に失敗しました: ${err.message}`
    console.error(err)
  } finally {
    loading.value = false
  }
}

// スロットをコピー（矢印ボタン用：スロットの挿入は行わず、既存のスロットに直接コピー）
async function handleCopySlot({ sourceSlotId, targetSlotId, work_phase_id, note, caption }) {
  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  if (!targetSlotId) {
    error.value = 'コピー先のスロットが指定されていません'
    return
  }

  error.value = null

  // オプティミスティックUI更新: まずローカルのslots配列を直接更新（即座にUI反映）
  const targetSlot = slots.value.find(s => s.id === targetSlotId)
  if (!targetSlot) {
    error.value = 'コピー先のスロットが見つかりません'
    return
  }

  // 元の値を保存（ロールバック用）
  const originalWorkPhaseId = targetSlot.work_phase_id
  const originalNote = targetSlot.note
  const originalCaption = targetSlot.caption

  // ローカル状態を即座に更新
  if (work_phase_id !== undefined) {
    targetSlot.work_phase_id = work_phase_id
  }
  if (note !== undefined) {
    targetSlot.note = note
  }
  if (caption !== undefined) {
    targetSlot.caption = caption
  }

  // バックグラウンドでAPI呼び出し（データ永続化）
  try {
    const updates = {}
    if (work_phase_id !== undefined) {
      updates.work_phase_id = work_phase_id
    }
    if (note !== undefined) {
      updates.note = note
    }
    if (caption !== undefined) {
      updates.caption = caption
    }

    // 更新内容がある場合のみ更新
    if (Object.keys(updates).length > 0) {
      await supabaseService.updateWorkSlot(targetSlotId, updates)
    }

    // API成功時は、サーバーから最新データを取得して同期（オプション）
    // ただし、オプティミスティック更新なので、成功時は再読み込みをスキップしても良い
    // 必要に応じて、サーバーからの最新データで上書きする
    const newSlotsResult = await supabaseService.getWorkSlots(workId.value)
    slots.value = newSlotsResult.slots
    workKind.value = newSlotsResult.workKind
  } catch (err) {
    // APIが失敗した場合は、元に戻す（ロールバック）
    targetSlot.work_phase_id = originalWorkPhaseId
    targetSlot.note = originalNote
    targetSlot.caption = originalCaption
    
    error.value = `スロットのコピーに失敗しました: ${err.message}`
    console.error(err)
  }
}

// スロットを削除
async function handleDeleteSlot(slotId) {
  // 確認はSlotItem.vueで既に行われているため、ここでは確認しない

  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  error.value = null

  try {
    await supabaseService.deleteWorkSlot(slotId)

    // ローディングを表示せずにスロット一覧のみ更新
    const slotsResult = await supabaseService.getWorkSlots(workId.value)
    slots.value = slotsResult.slots
  } catch (err) {
    error.value = `スロットの削除に失敗しました: ${err.message}`
    console.error(err)
  }
}

// ページを削除
async function handleDeletePage(groupIndex) {
  // displaySlotsはcomputedなので.valueは不要
  const groups = groupSlotsForGrid(displaySlots.value)
  if (!groups || !Array.isArray(groups) || groupIndex < 0 || groupIndex >= groups.length) {
    console.error('Invalid group index:', groupIndex, 'Groups:', groups)
    return
  }

  const firstGroup = groups[groupIndex]
  if (!firstGroup) {
    return
  }

  // ページ内のすべてのスロットを取得（break_beforeから次のbreak_beforeの直前まで）
  const allSlotsInPage = []
  let currentIndex = groupIndex
  
  // 次のページ開始（hasBreakBeforeがtrue）まで、または最後までスロットを収集
  while (currentIndex < groups.length) {
    const group = groups[currentIndex]
    if (!group) break
    
    // 次のページ開始に到達したら終了（最初のグループ以外でhasBreakBeforeがtrue）
    if (currentIndex > groupIndex && group.hasBreakBefore) {
      break
    }
    
    // グループ内のすべてのスロットを追加（leftとrightを結合）
    allSlotsInPage.push(...(group.left || []), ...(group.right || []))
    
    currentIndex++
  }
  
  if (allSlotsInPage.length === 0) {
    return
  }

  if (!confirm('ページ開始から次のページ開始までのスロットを削除しますか？')) {
    return
  }

  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  loading.value = true
  error.value = null

  try {
    // ページ内のすべてのスロットを削除
    const deletePromises = allSlotsInPage.map(slot => 
      supabaseService.deleteWorkSlot(slot.id)
    )
    await Promise.all(deletePromises)

    // データを再読み込み（ローディングは継続、テンプレートは取得しない）
    await loadData(false)
  } catch (err) {
    error.value = `ページの削除に失敗しました: ${err.message}`
    console.error(err)
  } finally {
    loading.value = false
  }
}

// スロットを並び替え
async function handleReorderSlots(newOrder) {
  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  loading.value = true
  error.value = null

  try {
    const updates = generateSortIndexUpdates(slots.value, newOrder)
    
    // すべての更新を並列で実行
    await Promise.all(
      updates.map(update => 
        supabaseService.updateWorkSlot(update.id, { sort_index: update.sort_index })
      )
    )

    // データを再読み込み（テンプレートは取得しない）
    await loadData(false)
  } catch (err) {
    error.value = `スロットの並び替えに失敗しました: ${err.message}`
    console.error(err)
  } finally {
    loading.value = false
  }
}

// スロットドラッグ開始
function handleSlotDragStart() {
  isSlotDragging.value = true
}

// スロットドラッグ終了
function handleSlotDragEnd() {
  isSlotDragging.value = false
}

// テンプレート追加時の処理
async function handleAddTemplate({ templateId, sortIndex, groupIndex }) {
  if (!workId.value || !templateId || sortIndex === null || sortIndex === undefined) {
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  loading.value = true
  error.value = null

  try {
    await supabaseService.insertTemplateSlots(templateId, sortIndex, workId.value)
    
    // データを再読み込み（テンプレートは取得しない）
    await loadData(false)
  } catch (err) {
    error.value = `テンプレートの追加に失敗しました: ${err.message}`
    console.error(err)
  } finally {
    loading.value = false
  }
}

// テンプレート作成時の処理
async function handleCreateTemplate({ label, slotIds, groupIndex }) {
  if (!workId.value || !label || !slotIds || slotIds.length === 0) {
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  loading.value = true
  error.value = null

  try {
    const result = await supabaseService.createTemplateSlot(workId.value, label, slotIds)
    
    // テンプレート一覧を再取得
    if (workKind.value) {
      slotTemplates.value = await supabaseService.getWorkSlotTemplates(workKind.value).catch(err => {
        console.error('Error fetching slot templates:', err)
        return []
      })
    }
  } catch (err) {
    error.value = `テンプレートの作成に失敗しました: ${err.message}`
    console.error(err)
  } finally {
    loading.value = false
  }
}

// テンプレート更新時の処理
async function handleUpdateTemplate({ templateId, label }) {
  if (!templateId || !label) {
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  loading.value = true
  error.value = null

  try {
    await supabaseService.updateWorkSlotTemplate(templateId, label)
    
    // テンプレート一覧を再取得
    if (workKind.value) {
      slotTemplates.value = await supabaseService.getWorkSlotTemplates(workKind.value).catch(err => {
        console.error('Error fetching slot templates:', err)
        return []
      })
    }
  } catch (err) {
    error.value = `テンプレートの更新に失敗しました: ${err.message}`
    console.error(err)
  } finally {
    loading.value = false
  }
}

// テンプレート削除時の処理
async function handleDeleteTemplate({ templateId }) {
  if (!templateId) {
    return
  }

  if (!isAuthenticated.value) {
    error.value = 'ログインが必要です'
    return
  }

  loading.value = true
  error.value = null

  try {
    await supabaseService.deleteWorkSlotTemplate(templateId)
    
    // テンプレート一覧を再取得
    if (workKind.value) {
      slotTemplates.value = await supabaseService.getWorkSlotTemplates(workKind.value).catch(err => {
        console.error('Error fetching slot templates:', err)
        return []
      })
    }
  } catch (err) {
    error.value = `テンプレートの削除に失敗しました: ${err.message}`
    console.error(err)
  } finally {
    loading.value = false
  }
}

// スロット移動（オプティミスティックUI更新）
async function handleSlotMove(fromSlotId, toSlotId, zone) {
  if (!workId.value || !isAuthenticated.value) return

  const fromSlot = slots.value.find(s => s.id === fromSlotId)
  const toSlot = slots.value.find(s => s.id === toSlotId)
  
  if (!fromSlot || !toSlot) return

  const fromIndex = slots.value.findIndex(s => s.id === fromSlotId)
  const toIndex = slots.value.findIndex(s => s.id === toSlotId)
  
  if (fromIndex === -1 || toIndex === -1) return

  const newSlots = [...slots.value]
  const [moved] = newSlots.splice(fromIndex, 1)
  
  // zoneに応じて挿入位置を調整
  let insertIndex = toIndex
  if (zone === 'left') {
    // 左側：移動 - ドラッグ先のスロットとその上のスロットのsort_indexの中間を計算（整数切り捨て）
    if (toIndex > 0) {
      const prevSlot = newSlots[toIndex - 1]
      const targetSortIndex = Math.floor((prevSlot.sort_index + toSlot.sort_index) / 2)
      moved.sort_index = targetSortIndex
    } else {
      // 最初のスロットの場合、toSlotのsort_indexより小さい値にする
      moved.sort_index = toSlot.sort_index - 10000
    }
    insertIndex = toIndex
  } else if (zone === 'right') {
    insertIndex = toIndex + 1
  } else { // center
    insertIndex = toIndex + 1
  }
  
  newSlots.splice(insertIndex, 0, moved)
  slots.value = newSlots

  // バックグラウンドでAPI呼び出し
  try {
    const updates = generateSortIndexUpdates(slots.value, newSlots.map(s => s.id))
    console.log('[SlotMove] Updates:', updates)
    await Promise.all(
      updates.map(update => 
        supabaseService.updateWorkSlot(update.id, { sort_index: update.sort_index })
      )
    )
    // 成功時は最新データで同期
    const slotsResult = await supabaseService.getWorkSlots(workId.value)
    slots.value = slotsResult.slots
    workKind.value = slotsResult.workKind
    console.log('[SlotMove] Success')
  } catch (err) {
    console.error('[SlotMove] Error:', err)
    // 失敗時は元に戻す
    await loadData(false)
    error.value = `スロットの移動に失敗しました: ${err.message}`
  }
}

// スロット入替（オプティミスティックUI更新）
async function handleSlotSwap(slotId1, slotId2) {
  if (!workId.value || !isAuthenticated.value) return

  const fromSlot = slots.value.find(s => s.id === slotId1)
  const toSlot = slots.value.find(s => s.id === slotId2)
  
  if (!fromSlot || !toSlot) return

  const fromIndex = slots.value.findIndex(s => s.id === slotId1)
  const toIndex = slots.value.findIndex(s => s.id === slotId2)
  
  if (fromIndex === -1 || toIndex === -1) return

  // オプティミスティックUI更新
  const originalSortIndex = fromSlot.sort_index
  
  // ↓移動：ドラッグ先のスロットとその下のスロットのsort_indexの中間を計算（整数切り捨て）
  let newSortIndex
  if (toIndex < slots.value.length - 1) {
    const nextSlot = slots.value[toIndex + 1]
    newSortIndex = Math.floor((toSlot.sort_index + nextSlot.sort_index) / 2)
  } else {
    // 最後のスロットの場合、toSlotのsort_indexより大きい値にする
    newSortIndex = toSlot.sort_index + 10000
  }
  
  // sort_indexを更新
  fromSlot.sort_index = newSortIndex

  // sort_indexでソート
  slots.value = [...slots.value].sort((a, b) => a.sort_index - b.sort_index)

  // バックグラウンドでAPI呼び出し
  try {
    console.log('[SlotSwap] Updating slot', slotId1, 'with sort_index:', newSortIndex)
    console.log('[SlotSwap] Before update - slot sort_indexes:', slots.value.map(s => ({ id: s.id, sort_index: s.sort_index })))
    
    await supabaseService.updateWorkSlot(slotId1, {
      sort_index: newSortIndex
    })
    
    // スロットを再読み込み
    const slotsResult = await supabaseService.getWorkSlots(workId.value)
    console.log('[SlotSwap] After reload - slot sort_indexes:', slotsResult.slots.map(s => ({ id: s.id, sort_index: s.sort_index })))
    slots.value = slotsResult.slots
    workKind.value = slotsResult.workKind
    console.log('[SlotSwap] Success')
  } catch (err) {
    console.error('[SlotSwap] Error:', err)
    // 失敗時は元に戻す
    fromSlot.sort_index = originalSortIndex
    slots.value = [...slots.value].sort((a, b) => a.sort_index - b.sort_index)
    
    await loadData(false)
    error.value = `スロットの移動に失敗しました: ${err.message}`
  }
}

// スロットコピー（オプティミスティックUI更新）
async function handleSlotCopy(sourceSlotId, targetSlotId) {
  if (!workId.value || !isAuthenticated.value) return

  const sourceSlot = slots.value.find(s => s.id === sourceSlotId)
  const targetSlot = slots.value.find(s => s.id === targetSlotId)
  
  if (!sourceSlot || !targetSlot) return

  // オプティミスティックUI更新：ファイルID、フェーズ、メモ、キャプションをコピー
  const originalFileId = targetSlot.file_id
  const originalWorkPhaseId = targetSlot.work_phase_id
  const originalNote = targetSlot.note
  const originalCaption = targetSlot.caption
  
  targetSlot.file_id = sourceSlot.file_id
  targetSlot.work_phase_id = sourceSlot.work_phase_id
  targetSlot.note = sourceSlot.note
  targetSlot.caption = sourceSlot.caption

  // バックグラウンドでAPI呼び出し
  try {
    await supabaseService.updateWorkSlot(targetSlotId, {
      file_id: sourceSlot.file_id,
      work_phase_id: sourceSlot.work_phase_id,
      note: sourceSlot.note,
      caption: sourceSlot.caption
    })
    const slotsResult = await supabaseService.getWorkSlots(workId.value)
    slots.value = slotsResult.slots
    workKind.value = slotsResult.workKind
  } catch (err) {
    // 失敗時は元に戻す
    targetSlot.file_id = originalFileId
    targetSlot.work_phase_id = originalWorkPhaseId
    targetSlot.note = originalNote
    targetSlot.caption = originalCaption
    error.value = `スロットのコピーに失敗しました: ${err.message}`
  }
}

// ファイルID入替（オプティミスティックUI更新）
async function handleFileSwap(slotId1, slotId2) {
  if (!workId.value || !isAuthenticated.value) return

  const slot1 = slots.value.find(s => s.id === slotId1)
  const slot2 = slots.value.find(s => s.id === slotId2)
  
  if (!slot1 || !slot2) return

  // オプティミスティックUI更新
  const tempFileId = slot1.file_id
  slot1.file_id = slot2.file_id
  slot2.file_id = tempFileId

  // バックグラウンドでAPI呼び出し
  try {
    await Promise.all([
      supabaseService.updateWorkSlot(slotId1, { file_id: slot2.file_id }),
      supabaseService.updateWorkSlot(slotId2, { file_id: slot1.file_id })
    ])
    const slotsResult = await supabaseService.getWorkSlots(workId.value)
    slots.value = slotsResult.slots
    workKind.value = slotsResult.workKind
  } catch (err) {
    // 失敗時は元に戻す
    slot1.file_id = slot2.file_id
    slot2.file_id = tempFileId
    await loadData(false)
    error.value = `ファイルIDの入替に失敗しました: ${err.message}`
  }
}

// ファイルIDコピー（オプティミスティックUI更新）
async function handleFileCopy(sourceSlotId, targetSlotId) {
  if (!workId.value || !isAuthenticated.value) return

  const sourceSlot = slots.value.find(s => s.id === sourceSlotId)
  const targetSlot = slots.value.find(s => s.id === targetSlotId)
  
  if (!sourceSlot || !targetSlot || !sourceSlot.file_id) return

  // オプティミスティックUI更新
  const originalFileId = targetSlot.file_id
  targetSlot.file_id = sourceSlot.file_id

  // バックグラウンドでAPI呼び出し
  try {
    await supabaseService.updateWorkSlot(targetSlotId, { file_id: sourceSlot.file_id })
    const slotsResult = await supabaseService.getWorkSlots(workId.value)
    slots.value = slotsResult.slots
    workKind.value = slotsResult.workKind
  } catch (err) {
    // 失敗時は元に戻す
    targetSlot.file_id = originalFileId
    error.value = `ファイルIDのコピーに失敗しました: ${err.message}`
  }
}

// ファイルをクリックして詳細表示
async function handleFileClick(file) {
  if (!file) return

  selectedFileForModal.value = {
    ...file,
    fullImageUrl: null,
    isLoading: true
  }

  try {
    // フルサイズ画像のURLを取得
    const fullImageUrl = await supabaseService.getSignedUrlByFileId(file.id, false)
    selectedFileForModal.value.fullImageUrl = fullImageUrl
    selectedFileForModal.value.isLoading = false
  } catch (err) {
    console.error('Failed to load full image:', err)
    selectedFileForModal.value.isLoading = false
    error.value = '画像の読み込みに失敗しました'
  }
}

// ファイルの画像を回転
async function handleRotateFile(fileId) {
  // fileIdが指定されていない場合はモーダルから取得
  const targetFileId = fileId || selectedFileForModal.value?.id
  if (!targetFileId) return

  const file = files.value.find(f => f.id === targetFileId)
  if (!file) return

  // rotationは0, 90, 180, 270の4つの値のみ
  const rotationValues = [0, 90, 180, 270]
  const currentRotation = file.rotation || 0
  
  // 現在の値を0, 90, 180, 270のいずれかに正規化
  let normalizedRotation = currentRotation
  if (!rotationValues.includes(currentRotation)) {
    // 0, 90, 180, 270以外の値の場合は、最も近い90度の倍数に丸める
    normalizedRotation = Math.round(currentRotation / 90) * 90
    // 360度を0度に変換
    if (normalizedRotation >= 360) {
      normalizedRotation = 0
    }
    // 負の値の場合は0に
    if (normalizedRotation < 0) {
      normalizedRotation = 0
    }
  }
  
  // 90度回転（0→90→180→270→0の循環）
  const currentIndex = rotationValues.indexOf(normalizedRotation)
  // indexOfが-1を返す場合（正規化後も値が一致しない場合）は0から開始
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  const nextIndex = (safeIndex + 1) % rotationValues.length
  const newRotation = rotationValues[nextIndex]

  // オプティミスティックUI更新
  file.rotation = newRotation
  
  // モーダルが開いている場合も更新
  if (selectedFileForModal.value && selectedFileForModal.value.id === targetFileId) {
    selectedFileForModal.value.rotation = newRotation
  }

  // バックグラウンドでAPI呼び出し
  try {
    // ファイルの回転情報を更新
    await supabaseService.updateWorkFileCategory(targetFileId, undefined, undefined, newRotation)
    
    // ファイルを再読み込みして最新の状態を取得
    const filesData = await supabaseService.getWorkFiles(workId.value)
    files.value = filesData
    await loadImageUrls(filesData)
    
    // モーダルのファイル情報も更新
    if (selectedFileForModal.value && selectedFileForModal.value.id === targetFileId) {
      const updatedFile = filesData.find(f => f.id === targetFileId)
      if (updatedFile) {
        selectedFileForModal.value.rotation = updatedFile.rotation || newRotation
      }
    }
  } catch (err) {
    // 失敗時は元に戻す
    file.rotation = currentRotation
    if (selectedFileForModal.value && selectedFileForModal.value.id === targetFileId) {
      selectedFileForModal.value.rotation = currentRotation
    }
    error.value = `画像の回転に失敗しました: ${err.message}`
    console.error(err)
  }
}

// ワーク表示名を生成
const workDisplayName = computed(() => {
  if (!workDataForPDF.value || !workKind.value) {
    return ''
  }
  
  const work = workDataForPDF.value
  const kind = workKind.value
  
  if (kind === 'large') {
    // あき家の場合も詳細情報を表示
    const parts = ['あき家']
    if (work.housing_details?.name) {
      parts.push(work.housing_details.name)
    }
    if (work.housing_details?.building) {
      parts.push(work.housing_details.building)
    }
    if (work.room) {
      parts.push(work.room)
    }
    return parts.join('-')
  } else if (kind === 'small') {
    const parts = ['小口']
    if (work.housing_details?.name) {
      parts.push(work.housing_details.name)
    }
    if (work.housing_details?.building) {
      parts.push(work.housing_details.building)
    }
    if (work.room) {
      parts.push(work.room)
    }
    return parts.join('-')
  }
  
  return ''
})

// 表示用のスロット（displayIndex、pageNumber、slotNumberInPageを付与）
const displaySlots = computed(() => {
  return prepareSlotsForDisplay(slots.value)
})

// 未割当ファイル
const unassignedFiles = computed(() => {
  return getUnassignedFiles(files.value, slots.value)
})

// ローディング中はスクロールを無効化
watch(loading, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

// PDF生成中もスクロールを無効化
watch(pdfGenerating, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

// ウィンドウの可視性変更を監視（最小化/復帰時の不要なローディングを防ぐ）
onMounted(() => {
  let isVisibilityChangeHandled = false
  
  const handleVisibilityChange = () => {
    // ウィンドウが非表示から表示に戻ったとき
    if (!document.hidden && !isVisibilityChangeHandled) {
      isVisibilityChangeHandled = true
      // 既にローディング中でない場合、自動的にデータを再読み込みしない
      // 画像URLの有効期限が切れている可能性があるが、ユーザーが明示的にリロードするまで待つ
      setTimeout(() => {
        isVisibilityChangeHandled = false
      }, 1000)
    }
  }
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
})

// display_textを保存する関数
async function saveDisplayText() {
  if (!workId.value || repairItemInput.value === null || repairItemInput.value === undefined) {
    return
  }
  
  try {
    await supabaseService.updateWorkDisplayText(workId.value, repairItemInput.value)
    console.log('display_textを保存しました')
  } catch (err) {
    console.warn('display_textの保存に失敗しました:', err)
  }
}

// PDF生成
async function handleGeneratePDF() {
  if (!workId.value) {
    error.value = 'Work IDを入力してください'
    return
  }
  
  pdfGenerating.value = true
  error.value = null
  
  try {
    // display_textを保存
    await saveDisplayText()
    
    // スロットデータをprepareSlotsForDisplayで整形（pageNumber, slotNumberInPageを付与）
    const preparedSlots = prepareSlotsForDisplay(slots.value || [])
    const sortedSlots = [...preparedSlots].sort((a, b) => {
      const pageA = a.pageNumber || 1
      const pageB = b.pageNumber || 1
      if (pageA !== pageB) {
        return pageA - pageB
      }
      return (a.slotNumberInPage || 0) - (b.slotNumberInPage || 0)
    })
    
    // フェーズ名のマップを作成
    const phaseLabelMap = new Map(
      (workPhases.value || []).map(phase => [phase.id, phase.label || phase.name || ''])
    )
    
    // ファイルIDごとの元画像URLを取得
    const imageUrlMap = {}
    const fileIds = [...new Set(sortedSlots.map(slot => slot.file_id).filter(Boolean))]
    if (fileIds.length > 0) {
      await Promise.all(
        fileIds.map(async fileId => {
          try {
            const url = await supabaseService.getSignedUrlByFileId(fileId, false)
            if (url) {
              imageUrlMap[fileId] = url
            }
          } catch (err) {
            console.error(`Failed to get image URL for file_id=${fileId}:`, err)
          }
        })
      )
    }
    
    const values = [{ page: 0 }] // 表紙
    
    // order_yearから2018を引いて左0埋め2桁に変換してslice_order_yearとして追加
    if (workDataForPDF.value?.order_year) {
      const orderYear = Number(workDataForPDF.value.order_year)
      const sliceOrderYear = String(orderYear - 2018).padStart(2, '0')
      values[0].slice_order_year = sliceOrderYear
      console.log('[PDF生成] slice_order_year:', sliceOrderYear, '(order_year:', orderYear, ')')
    }
    
    // ディスプレイテキストを3行に分割して表紙に追加（下から順番に割り当て）
    if (repairItemInput.value) {
      const lines = repairItemInput.value.split(/\r?\n/).filter(line => line.trim().length > 0)
      
      if (lines.length === 1) {
        // 1行の場合: 1行目 → displaytext1
        values[0].displaytext1 = lines[0].trim()
        values[0].displaytext2 = ''
        values[0].displaytext3 = ''
      } else if (lines.length === 2) {
        // 2行の場合: 1行目 → displaytext2, 2行目 → displaytext1
        values[0].displaytext1 = lines[1].trim()
        values[0].displaytext2 = lines[0].trim()
        values[0].displaytext3 = ''
      } else if (lines.length >= 3) {
        // 3行以上の場合: 1行目 → displaytext3, 2行目 → displaytext2, 3行目 → displaytext1
        values[0].displaytext1 = lines[2].trim()
        values[0].displaytext2 = lines[1].trim()
        values[0].displaytext3 = lines[0].trim()
      }
    }
    
    const pageValueMap = new Map()
    let maxPhysicalPageNumber = 0
    
    const getPageValues = (pageNumber) => {
      if (!pageValueMap.has(pageNumber)) {
        pageValueMap.set(pageNumber, { page: pageNumber })
      }
      return pageValueMap.get(pageNumber)
    }
    
    const splitNotes = (text) => {
      if (!text) return []
      const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
      console.log('[PDF生成] splitNotes:', { original: text, lines })
      return lines
    }
    
    // デバッグ: ソートされたスロットの情報をログ出力
    console.log('[PDF生成] sortedSlots:', sortedSlots.map(s => ({
      id: s.id,
      pageNumber: s.pageNumber,
      slotNumberInPage: s.slotNumberInPage,
      caption: s.caption,
      note: s.note,
      work_phase_id: s.work_phase_id,
      file_id: s.file_id
    })))
    
    for (const slot of sortedSlots) {
      const uiPageNumber = slot.pageNumber || 1
      const slotNumberInPage = slot.slotNumberInPage || 1
      
      // スロット番号からページ内の位置を計算（1-indexed → 0-indexed）
      const slotIndex = slotNumberInPage - 1 // 0-indexed
      
      // 6スロットごとに2ページ（A/B）に分かれる
      const pageGroupIndex = Math.floor(slotIndex / 6) // 0, 1, 2, ...
      const positionInGroup = slotIndex % 6 // 0-5
      
      // ページA/Bの判定（0-2はA、3-5はB）
      const isLayoutA = positionInGroup < 3
      const blockPosition = (positionInGroup % 3) + 1 // 1, 2, 3
      
      // 物理ページ番号を計算
      const physicalPageNumber = (uiPageNumber - 1) * 2 + pageGroupIndex * 2 + (isLayoutA ? 1 : 2)
      
      maxPhysicalPageNumber = Math.max(maxPhysicalPageNumber, physicalPageNumber)
      const pageValues = getPageValues(physicalPageNumber)
      
      // デバッグ: スロットごとのマッピング情報をログ出力
      console.log(`[PDF生成] スロット${slot.id}: uiPage=${uiPageNumber}, slotInPage=${slotNumberInPage}, physicalPage=${physicalPageNumber}, block=${blockPosition}, layoutA=${isLayoutA}`)
      
      pageValues[`caption${blockPosition}`] = slot.caption || ''
      const phaseLabel = phaseLabelMap.get(slot.work_phase_id)
      if (phaseLabel) {
        pageValues[`phase${blockPosition}`] = phaseLabel
      }
      
      const noteLines = splitNotes(slot.note)
      console.log(`[PDF生成] スロット${slot.id} note分割結果:`, { noteLines, count: noteLines.length })
      for (let i = 0; i < Math.min(noteLines.length, 10); i++) {
        const key = `note${blockPosition}-${i + 1}`
        pageValues[key] = noteLines[i]
        console.log(`[PDF生成] ${key} = "${noteLines[i]}"`)
      }
      
      const imageUrl = slot.file_id ? imageUrlMap[slot.file_id] : null
      if (imageUrl) {
        pageValues[`imgurl${blockPosition}`] = imageUrl
        // ファイルのrotation情報を追加
        const file = files.value.find(f => f.id === slot.file_id)
        const rotation = file?.rotation || 0
        pageValues[`rotation${blockPosition}`] = rotation
      }
    }
    
    const sortedPageNumbers = Array.from(pageValueMap.keys()).sort((a, b) => a - b)
    if (sortedPageNumbers.length === 0) {
      maxPhysicalPageNumber = 1
      values.push({ page: 1 })
    } else {
      for (const pageNum of sortedPageNumbers) {
        values.push(pageValueMap.get(pageNum))
      }
    }
    
    // デバッグ: values配列の内容をログ出力
    console.log('[PDF生成] values配列:', values)
    
    const pageCount = Math.max(maxPhysicalPageNumber, 1)
    
    // applications_codesを取得（デフォルトは"1"）
    const applicationsCodes = ['1'] // デフォルト値、必要に応じて変更
    
    // create_pdf_layoutエッジファンクションを呼び出し
    const layoutData = await supabaseService.getPdfLayout(applicationsCodes, workId.value, pageCount, values)
    
    // PDF生成
    const pdfBytes = await generatePDFFromLayout(layoutData, values)
    
    // 今日の日付をYYYYMMDD形式で取得
    const today = new Date()
    const dateStr = today.getFullYear() + 
                    String(today.getMonth() + 1).padStart(2, '0') + 
                    String(today.getDate()).padStart(2, '0')
    
    // ファイル名を生成（workDisplayName-YYYYMMDD.pdf）
    const fileName = `${workDisplayName.value}-${dateStr}.pdf`
    
    // Blobを作成
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    
    // ダウンロード
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    // サーバーにアップロード
    try {
      console.log('PDFをサーバーにアップロード中...')
      
      // 既存のPDFを削除（論理削除）
      await supabaseService.deleteExistingPdf(workId.value)
      
      const file = new File([blob], fileName, { type: 'application/pdf' })
      
      // work-pdfストレージにアップロード
      const uploadResult = await supabaseService.uploadPdfFile(workId.value, file)
      
      console.log('PDFアップロード成功:', uploadResult)
      
      // PDFファイル情報を再取得
      await loadPdfFile()
    } catch (uploadErr) {
      console.error('PDFアップロードエラー:', uploadErr)
      // アップロードに失敗してもPDF生成は成功として扱う
      error.value = `PDF生成は成功しましたが、サーバーへのアップロードに失敗しました: ${uploadErr.message}`
    }
    
    console.log('PDF生成成功')
  } catch (err) {
    console.error('PDF生成エラー:', err)
    error.value = `PDF生成に失敗しました: ${err.message}`
  } finally {
    pdfGenerating.value = false
  }
}

// display_text変更時の処理（blur時）
async function handleDisplayTextChange() {
  if (!workId.value) {
    return
  }
  
  await saveDisplayText()
}

// WORKS一覧をリロード（HomePageコンポーネントのloadWorksを呼び出す）
function reloadWorks() {
  if (homePageRef.value && homePageRef.value.loadWorks) {
    homePageRef.value.loadWorks()
  }
}

// テンプレートエディターをリロード
function reloadTemplateEditor() {
  if (selectedTemplateType.value === 'customSnippets' && customSnippetEditorRef.value?.loadSnippets) {
    customSnippetEditorRef.value.loadSnippets()
  } else if (selectedTemplateType.value === 'categoryLabels' && categoryLabelTemplateEditorRef.value?.loadTemplates) {
    categoryLabelTemplateEditorRef.value.loadTemplates()
  } else if (selectedTemplateType.value === 'workSlots' && workSlotTemplateEditorRef.value?.loadTemplates) {
    workSlotTemplateEditorRef.value.loadTemplates()
  } else if (selectedTemplateType.value === 'billing' && billingTemplateEditorRef.value?.loadTemplates) {
    billingTemplateEditorRef.value.loadTemplates()
  }
}

// 統合更新ボタンのハンドラー
function handleReload() {
  if (activeTab.value === 'works') {
    reloadWorks()
  } else if (activeTab.value === 'edit') {
    loadData()
  } else if (activeTab.value === 'templates') {
    reloadTemplateEditor()
  } else if (activeTab.value === 'estimate') {
    // 見積スロットとプライスリストを両方読み込み
    if (estimateEditorRef.value?.loadEstimateSlots) {
      estimateEditorRef.value.loadEstimateSlots()
    }
    if (estimateEditorRef.value?.loadPriceListItems) {
      estimateEditorRef.value.loadPriceListItems()
    }
  }
}

// HomePageコンポーネントのloadingステータスを監視
function setWorksLoading(isLoading) {
  worksLoading.value = isLoading
}

// コンポーネント破棄時にスクロールを復元とイベントリスナーのクリーンアップ
onUnmounted(() => {
  document.body.style.overflow = ''
  if (visibilityChangeHandler) {
    document.removeEventListener('visibilitychange', visibilityChangeHandler)
  }
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  max-height: 100vh;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

.left-tab-bar {
  width: 50px;
  background: #f3f4f6;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
  gap: 0.5rem;
  flex-shrink: 0;
}

.tab-spacer {
  flex: 1;
}

.tab-button {
  padding: 0.75rem 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  border-radius: 0;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-button.action-button {
  min-height: 44px;
  border-left: none;
}

.tab-button svg {
  width: 24px;
  height: 24px;
}

.tab-button:hover:not(:disabled) {
  background: #e5e7eb;
  color: #374151;
}

.tab-button.active {
  background: #dbeafe;
  color: #1e40af;
  border-left-color: #3b82f6;
  font-weight: 600;
}

.tab-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-button.login-tab-button {
  color: #16a34a;
}

.tab-button.login-tab-button:hover:not(:disabled) {
  background: #dcfce7;
  color: #15803d;
}

.tab-button.logout-tab-button {
  color: #dc2626;
}

.tab-button.logout-tab-button:hover:not(:disabled) {
  background: #fee2e2;
  color: #b91c1c;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.tab-button svg.spinning {
  animation: spin 1s linear infinite;
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.thin-header-bar {
  height: 10px;
  background: #e5e7eb;
  flex-shrink: 0;
}

.header-error-message {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: #fee2e2;
  color: #991b1b;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  text-align: center;
  word-wrap: break-word;
  max-width: 80%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.work-display-name {
  font-size: 1rem;
  font-weight: 500;
  color: #374151;
  padding: 0.5rem 1rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  min-width: 200px;
}

.reload-button svg.spinning {
  animation: spin 1s linear infinite;
}

.work-selector button {
  padding: 0.5rem 1rem;
  border: 1px solid #3b82f6;
  border-radius: 0.375rem;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
}

.work-selector button:hover:not(:disabled) {
  background: #2563eb;
}

.work-selector button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pdf-button {
  padding: 0.5rem 1rem;
  border: 1px solid #10b981;
  border-radius: 0.375rem;
  background: #10b981;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
}

.pdf-button:hover:not(:disabled) {
  background: #059669;
}

.pdf-button:disabled {
  background: #d1d5db;
  border-color: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}

.error-message {
  padding: 1rem 2rem;
  background: #fee2e2;
  color: #dc2626;
  border-bottom: 1px solid #fecaca;
}

.welcome-message {
  padding: 3rem 2rem;
  text-align: center;
  color: #6b7280;
}

/* テンプレート編集タブ */
.templates-tab-container {
  display: flex;
  height: 100%;
  background: #f9fafb;
}

/* 見積作成タブ */
.estimate-tab-container {
  display: flex;
  height: 100%;
  background: #f9fafb;
}

.templates-sidebar {
  width: 200px;
  min-width: 200px;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.templates-sidebar-title {
  padding: 1.25rem 1.5rem;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
}

.templates-nav {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  gap: 0.25rem;
}

.templates-nav-item {
  display: flex;
  align-items: center;
  padding: 0.875rem 1rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  color: #374151;
}

.templates-nav-item:hover {
  background: #f3f4f6;
}

.templates-nav-item.active {
  background: #eff6ff;
  color: #2563eb;
}

.templates-nav-label {
  font-size: 0.9375rem;
  font-weight: 500;
}

.templates-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.templates-content-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 0.9375rem;
}

.edit-tab-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.left-panel {
  width: 500px;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  min-height: 0;
  height: 100%;
  background: white;
}

.left-panel h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.right-panel {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  min-height: 0;
  height: 100%;
  background: white;
}

.right-panel h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.slot-grid-section {
  width: 100%;
}

.slot-header-with-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  width: 100%;
}

.slot-header-with-controls h2 {
  margin: 0;
}

.slot-grid-wrapper {
  position: relative;
}

.pdf-control-section {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
}

.pdf-label {
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  white-space: nowrap;
}

.repair-item-input {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  min-width: 600px; /* 200px * 3 = 600px */
  width: 100%;
  resize: vertical; /* 縦方向のみリサイズ可能 */
  font-family: inherit; /* フォントを継承 */
  line-height: 1.5; /* 行間を設定 */
}

.repair-item-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.repair-item-input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.6;
}

.pdf-button {
  padding: 0.5rem 1rem;
  border: 1px solid #3b82f6;
  border-radius: 0.375rem;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.pdf-button:hover:not(:disabled) {
  background: #2563eb;
}

.pdf-button:disabled {
  background: #d1d5db;
  border-color: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}

.pdf-view-button {
  background: #10b981;
  border-color: #10b981;
}

.pdf-view-button:hover:not(:disabled) {
  background: #059669;
  border-color: #059669;
}

.slot-grid-wrapper.loading {
  pointer-events: none;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  pointer-events: all;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

/* 左上のアップロード進行状況表示 */
.upload-progress-indicator {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 10001;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  font-size: 0.875rem;
  color: #3b82f6;
  font-weight: 500;
}

.upload-progress-text {
  color: #ef4444; /* 赤文字 */
  font-weight: 600;
}

.upload-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-overlay p {
  color: #3b82f6;
  font-weight: 500;
  font-size: 1rem;
}
</style>

