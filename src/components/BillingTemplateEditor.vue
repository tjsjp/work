<template>
  <div class="billing-template-editor-container">
    <!-- 左側: テンプレートリスト -->
    <div class="billing-template-editor">
      <div class="editor-header">
        <h3>小口請求</h3>
        <p class="editor-description">小口請求で使用するテンプレートの管理</p>
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
            'is-temp': template.label === 'temp',
            'is-selected': selectedTemplate?.id === template.id
          }"
          :draggable="template.label !== 'temp'"
          @dragstart="handleDragStart($event, template)"
          @dragend="handleDragEnd"
          @dragover.prevent="handleDragOver($event, template)"
          @dragleave="handleDragLeave"
          @drop.prevent="handleDrop($event, template)"
        >
          <div 
            class="template-drag-handle" 
            :class="{ disabled: template.label === 'temp' }"
            :title="template.label === 'temp' ? '' : 'ドラッグして並べ替え'"
          >
            <span class="drag-icon">≡</span>
          </div>

          <button 
            v-if="template.label !== 'temp'"
            class="edit-btn"
            @click="selectTemplate(template)"
            title="詳細編集"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <div v-else class="edit-placeholder"></div>

          <input
            v-if="template.label !== 'temp'"
            type="text"
            class="template-label-input"
            :value="template.label"
            @blur="saveTemplateLabelDirect(template, $event.target.value)"
            @keydown.enter="$event.target.blur()"
            placeholder="テンプレート名..."
          />
          <span v-else class="template-label temp-label">{{ template.label }}</span>

          <button 
            v-if="template.label !== 'temp'"
            class="delete-btn"
            @click="deleteTemplate(template)"
            title="削除"
          >
            ✕
          </button>
          <div v-else class="delete-placeholder"></div>
        </div>

        <!-- 新規テンプレート追加 -->
        <div class="template-item new-template-item">
          <div class="template-drag-handle disabled">
            <span class="drag-icon">≡</span>
          </div>
          <div class="edit-placeholder"></div>
          <input
            type="text"
            class="template-label-input new-template-input"
            v-model="newTemplateLabel"
            @keydown.enter="addNewTemplate"
            placeholder="新規"
          />
          <button 
            class="add-template-btn"
            @click="addNewTemplate"
            :disabled="!newTemplateLabel.trim()"
            title="追加"
          >
            ＋
          </button>
        </div>

        <div v-if="templates.length === 0" class="empty-state">
          <p>請求テンプレートがありません</p>
        </div>
      </div>
    </div>

    <!-- 右側: 詳細パネル -->
    <div class="billing-detail-panel">
      <!-- 未選択時 -->
      <div v-if="!selectedTemplate" class="panel-placeholder-container">
        <p class="panel-placeholder">← テンプレートの編集ボタンをクリックして編集</p>
      </div>

      <!-- 選択時: 詳細編集 -->
      <div v-else class="panel-edit-view">

        <!-- 設定エリア -->
        <div class="settings-row">
          <div 
            class="expandable-textarea-container"
            :class="{ expanded: isImplementationExpanded }"
          >
            <textarea
              class="expandable-textarea"
              v-model="implementationNote"
              @focus="isImplementationExpanded = true"
              @blur="handleImplementationBlur"
              placeholder="実施事項..."
              rows="1"
            ></textarea>
          </div>
          <select v-model="wasteDisposal" class="waste-select" :class="{ 'placeholder': !wasteDisposal }" @change="handleWasteChange">
            <option value="">産廃</option>
            <option value="一次保管">一次保管</option>
            <option value="処分済">処分済</option>
            <option value="なし">なし</option>
          </select>
          <label class="check-label">
            <input type="checkbox" v-model="hasPhoto" @change="handleCheckChange('has_photo', hasPhoto)" />
            <span>写真</span>
          </label>
          <label class="check-label">
            <input type="checkbox" v-model="hasDrawing" @change="handleCheckChange('has_zumen', hasDrawing)" />
            <span>図面</span>
          </label>
          <label class="check-label">
            <input type="checkbox" v-model="hasPriceEvidence" @change="handleCheckChange('has_evidence', hasPriceEvidence)" />
            <span>単価根拠</span>
          </label>
          <label class="check-label">
            <input type="checkbox" v-model="hasOther" @change="handleCheckChange('has_etc', hasOther)" />
            <span>その他</span>
          </label>
        </div>

        <!-- 検索 + 年度 + プライスリスト -->
        <div class="search-filter-row">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="コード・説明で検索..."
            class="search-input"
          />
          <select v-model="selectedBigCategory" @change="handleBigCategoryChange" class="category-select" :class="{ 'placeholder': !selectedBigCategory }">
            <option value="">区分</option>
            <option v-for="cat in bigCategoryOptions" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
          </select>
          <select v-model="selectedSmallCategory" class="category-select" :class="{ 'placeholder': !selectedSmallCategory }">
            <option value="">大分類</option>
            <option v-for="cat in smallCategoryOptions" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
          </select>
          <select v-model="selectedYear" @change="loadPriceLists" class="year-select">
            <option v-for="year in fiscalYears" :key="year" :value="year">{{ year }}</option>
          </select>
          <select v-model="selectedPriceListId" @change="loadPriceListItems" :disabled="priceLists.length === 0" class="pricelist-select" :class="{ 'placeholder': !selectedPriceListId }">
            <option value="">プライスリスト</option>
            <option v-for="pl in priceLists" :key="pl.id" :value="pl.id">{{ pl.label }}</option>
          </select>
        </div>

        <!-- プライスリストアイテム -->
        <div class="price-items-section">
          <div v-if="priceLoading" class="loading-state small">読み込み中...</div>
          <div v-else-if="priceError" class="error-state small">
            {{ priceError }}
            <button @click="loadPriceListItems" class="retry-btn small">再読み込み</button>
          </div>
          <div v-else class="price-items-list">
            <div 
              v-for="item in filteredItems" 
              :key="item.id"
              class="price-item"
              draggable="true"
              @dragstart="handlePriceItemDragStart($event, item)"
              @dragend="handlePriceItemDragEnd"
              title="ドラッグして追加"
            >
              <div class="price-item-code">{{ item.external_code }}</div>
              <div class="price-item-type">{{ item.price_type || '-' }}</div>
              <div class="price-item-desc">{{ item.description }}</div>
              <div class="price-item-add-desc" v-if="item.additional_description">{{ item.additional_description }}</div>
              <div class="price-item-note" v-if="item.note">{{ item.note }}</div>
              <div class="price-item-unit">{{ item.unit || '-' }}</div>
              <div class="price-item-price">¥{{ formatPrice(item.unit_price) }}</div>
            </div>
            <div v-if="filteredItems.length === 0 && priceListItems.length > 0" class="empty-state small">
              検索結果がありません
            </div>
            <div v-if="priceListItems.length === 0 && selectedPriceListId" class="empty-state small">
              アイテムがありません
            </div>
            <div v-if="!selectedPriceListId" class="empty-state small">
              プライスリストを選択してください
            </div>
          </div>
        </div>

        <!-- テンプレート内アイテム一覧 -->
        <div 
          class="template-items-section"
          @dragover.prevent="handleListDragOver"
          @dragleave="handleListDragLeave"
          @drop.prevent="handleListDrop"
          :class="{ 'list-drop-target': isListDropTarget }"
        >
          <div class="section-header">
            <span class="section-title">登録済みアイテム</span>
            <span class="section-count">{{ templateItems.length }}件</span>
            <span class="section-total">合計: ¥{{ formatPrice(totalAmount) }}</span>
          </div>
          
          <div v-if="itemsLoading" class="loading-state small">読み込み中...</div>
          <div v-else class="template-items-list">
            <div 
              v-for="(item, index) in templateItems" 
              :key="item.id"
              class="template-item-row"
              :class="{ 
                'drop-target': dropTargetItemId === item.id,
                'item-dragging': draggingItemId === item.id,
                'item-drag-over': itemDragOverId === item.id
              }"
              draggable="true"
              @dragstart="handleItemDragStart($event, item)"
              @dragend="handleItemDragEnd"
              @dragover.prevent.stop="handleItemDragOver($event, item)"
              @dragleave="handleItemDragLeave"
              @drop.prevent.stop="handleItemDrop($event, item)"
            >
              <div class="item-drag-handle" title="ドラッグで並び替え">≡</div>
              <span class="item-index">{{ index + 1 }}</span>
              <input 
                type="text" 
                class="item-code-input"
                :value="item.external_code"
                @input="handleCodeInput(item, $event)"
                @blur="handleCodeBlur(item, $event.target.value)"
                @keydown.enter="$event.target.blur()"
                placeholder="コード"
              />
              <span class="item-price-type">{{ getPriceInfo(item.external_code, 'price_type') }}</span>
              <span class="item-description">{{ getPriceInfo(item.external_code, 'description') }}</span>
              <div class="quantity-control">
                <button class="qty-btn" @click="decrementQuantity(item)">−</button>
                <input 
                  type="text" 
                  class="item-quantity-input"
                  :value="item.quantity"
                  @input="handleQuantityInput(item, $event)"
                  @blur="updateTemplateItem(item, 'quantity', $event.target.value)"
                  @keydown="preventInvalidQuantityInput"
                  placeholder="数量"
                />
                <button class="qty-btn" @click="incrementQuantity(item)">＋</button>
              </div>
              <span class="item-unit">{{ getPriceInfo(item.external_code, 'unit') }}</span>
              <input 
                type="text" 
                class="item-note-input"
                :value="item.note"
                @blur="updateTemplateItem(item, 'note', $event.target.value)"
                placeholder="備考..."
              />
              <span class="item-unit-price">{{ formatPriceDisplay(getPriceInfo(item.external_code, 'unit_price')) }}</span>
              <button class="item-delete-btn" @click="deleteTemplateItem(item)">✕</button>
            </div>
            <div v-if="templateItems.length === 0" class="empty-state small drop-hint">
              アイテムがありません<br>
              <small>プライスリストからドラッグして追加</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabaseService } from '../services/supabase'

const templates = ref([])
const loading = ref(true)
const error = ref(null)
const draggingId = ref(null)
const dragOverId = ref(null)

// 選択中のテンプレート
const selectedTemplate = ref(null)

// 新規テンプレート追加
const newTemplateLabel = ref('')

// 設定項目
const implementationNote = ref('')
const isImplementationExpanded = ref(false)
const wasteDisposal = ref('')
const hasPhoto = ref(false)
const hasDrawing = ref(false)
const hasPriceEvidence = ref(false)
const hasOther = ref(false)

// プライスリスト関連
const selectedYear = ref(new Date().getFullYear())
const priceLists = ref([])
const selectedPriceListId = ref('')
const priceListItems = ref([])
const priceLoading = ref(false)
const priceError = ref(null)
const searchQuery = ref('')

// カテゴリーフィルター
const selectedBigCategory = ref('')
const selectedSmallCategory = ref('')

// テンプレートアイテム関連
const templateItems = ref([])
const itemsLoading = ref(false)

// プライスリストからのドラッグ&ドロップ
const draggingPriceItem = ref(null)
const dropTargetItemId = ref(null)
const isListDropTarget = ref(false)

// アイテム並び替え用
const draggingItemId = ref(null)
const itemDragOverId = ref(null)

// プライスリストアイテムをexternal_codeでマップ（高速参照用）
const priceItemsMap = computed(() => {
  const map = {}
  priceListItems.value.forEach(item => {
    map[item.external_code] = item
  })
  return map
})

// 合計金額
const totalAmount = computed(() => {
  return templateItems.value.reduce((sum, item) => {
    const priceInfo = priceItemsMap.value[item.external_code]
    const unitPrice = priceInfo?.unit_price || 0
    const quantity = item.quantity || 0
    return sum + (unitPrice * quantity)
  }, 0)
})

// 年度リスト（現在年から過去5年）
const fiscalYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => currentYear - i)
})

// 区分（big category）のオプション - price_list_itemsから抽出
const bigCategoryOptions = computed(() => {
  const categoryMap = new Map()
  priceListItems.value.forEach(item => {
    if (item.price_big_category_id && item.price_big_category_label) {
      categoryMap.set(item.price_big_category_id, item.price_big_category_label)
    }
  })
  return Array.from(categoryMap, ([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ja'))
})

// 大分類（small category）のオプション - 選択された区分に連動
const smallCategoryOptions = computed(() => {
  const categoryMap = new Map()
  let items = priceListItems.value
  
  // 区分が選択されていればフィルタリング
  if (selectedBigCategory.value) {
    items = items.filter(item => item.price_big_category_id === selectedBigCategory.value)
  }
  
  items.forEach(item => {
    if (item.price_small_category_id && item.price_small_category_label) {
      categoryMap.set(item.price_small_category_id, item.price_small_category_label)
    }
  })
  return Array.from(categoryMap, ([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ja'))
})

// フィルタリングされたアイテム
const filteredItems = computed(() => {
  let items = priceListItems.value
  
  // 区分フィルター
  if (selectedBigCategory.value) {
    items = items.filter(item => item.price_big_category_id === selectedBigCategory.value)
  }
  
  // 大分類フィルター
  if (selectedSmallCategory.value) {
    items = items.filter(item => item.price_small_category_id === selectedSmallCategory.value)
  }
  
  // テキスト検索
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(item => 
      item.external_code?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.additional_description?.toLowerCase().includes(query) ||
      item.note?.toLowerCase().includes(query)
    )
  }
  
  return items
})

onMounted(() => {
  loadTemplates()
})

function handleImplementationBlur() {
  // blur時に高さを戻す
  isImplementationExpanded.value = false
  // 実施事項を保存
  saveTemplateSetting('execution_detail', implementationNote.value.trim() || null)
}

// 区分変更時に大分類をリセット
function handleBigCategoryChange() {
  selectedSmallCategory.value = ''
}

// 設定項目の保存
async function saveTemplateSetting(field, value) {
  if (!selectedTemplate.value) return
  
  const fieldMapping = {
    'execution_detail': 'execution_detail',
    'industrial_waste': 'industrial_waste',
    'has_photo': 'has_photo',
    'has_zumen': 'has_zumen',
    'has_evidence': 'has_evidence',
    'has_etc': 'has_etc'
  }
  
  const dbField = fieldMapping[field]
  if (!dbField) return
  
  try {
    await supabaseService.updateBillingTemplate(selectedTemplate.value.id, { [dbField]: value })
    // ローカルのテンプレートも更新
    selectedTemplate.value[dbField] = value
  } catch (err) {
    console.error('Failed to save setting:', err)
  }
}

// 産廃選択変更時
function handleWasteChange() {
  saveTemplateSetting('industrial_waste', wasteDisposal.value || null)
}

// チェックボックス変更時
function handleCheckChange(field, value) {
  saveTemplateSetting(field, value)
}

// 新規テンプレート追加
async function addNewTemplate() {
  const label = newTemplateLabel.value.trim()
  if (!label) return
  
  // "temp"は予約名
  if (label.toLowerCase() === 'temp') {
    alert('「temp」はシステム予約名のため使用できません')
    return
  }
  
  // 同名チェック
  const exists = templates.value.some(t => t.label === label)
  if (exists) {
    alert('同じ名前のテンプレートが既に存在します')
    return
  }
  
  try {
    const newTemplate = await supabaseService.createEmptyBillingTemplate(label)
    templates.value.push(newTemplate)
    newTemplateLabel.value = ''
  } catch (err) {
    console.error('Failed to create template:', err)
    alert('テンプレートの作成に失敗しました')
  }
}

// プライスリストからコードに対応する情報を取得
function getPriceInfo(code, field) {
  if (!code) return '-'
  const item = priceItemsMap.value[code]
  if (!item) return '-'
  return item[field] || '-'
}

function formatPriceDisplay(price) {
  if (!price || price === '-') return '-'
  return '¥' + formatPrice(price)
}

// 全角→半角、小文字→大文字変換、半角英大文字と半角数字以外を除去
function normalizeCode(value) {
  if (!value) return ''
  // 全角英字を半角に変換
  let normalized = value.replace(/[Ａ-Ｚａ-ｚ]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  })
  // 全角数字を半角に変換
  normalized = normalized.replace(/[０-９]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  })
  // 小文字を大文字に変換
  normalized = normalized.toUpperCase()
  // 半角英大文字と半角数字以外を除去
  normalized = normalized.replace(/[^A-Z0-9]/g, '')
  return normalized
}

async function loadTemplates() {
  loading.value = true
  error.value = null
  try {
    const data = await supabaseService.getBillingTemplates(true)
    templates.value = data
  } catch (err) {
    console.error('Failed to load templates:', err)
    error.value = '請求テンプレートの読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

function selectTemplate(template) {
  selectedTemplate.value = template
  // 設定項目をテンプレートから読み込み
  implementationNote.value = template.execution_detail || ''
  wasteDisposal.value = template.industrial_waste || ''
  hasPhoto.value = template.has_photo || false
  hasDrawing.value = template.has_zumen || false
  hasPriceEvidence.value = template.has_evidence || false
  hasOther.value = template.has_etc || false
  isImplementationExpanded.value = false
  
  loadTemplateItems()
  loadPriceLists()
}

function closePanel() {
  selectedTemplate.value = null
  templateItems.value = []
}

async function saveTemplateLabelDirect(template, newLabel) {
  newLabel = newLabel.trim()
  if (!newLabel || newLabel === template.label) return
  
  // "temp"は予約名
  if (newLabel.toLowerCase() === 'temp') {
    alert('「temp」はシステム予約名のため使用できません')
    return
  }
  
  // 同名チェック（自分自身は除く）
  const exists = templates.value.some(t => t.id !== template.id && t.label === newLabel)
  if (exists) {
    alert('同じ名前のテンプレートが既に存在します')
    return
  }
  
  const oldLabel = template.label
  template.label = newLabel
  
  try {
    await supabaseService.updateBillingTemplate(template.id, { label: newLabel })
  } catch (err) {
    console.error('Failed to save label:', err)
    template.label = oldLabel
    alert('ラベルの保存に失敗しました')
  }
}

async function loadTemplateItems() {
  if (!selectedTemplate.value) return
  
  itemsLoading.value = true
  try {
    const data = await supabaseService.getBillingTemplateItems(selectedTemplate.value.id)
    templateItems.value = data || []
  } catch (err) {
    console.error('Failed to load template items:', err)
  } finally {
    itemsLoading.value = false
  }
}

async function loadPriceLists() {
  try {
    const result = await supabaseService.getPriceLists(selectedYear.value, 'small')
    priceLists.value = result.price_lists || []
    
    if (priceLists.value.length > 0 && !selectedPriceListId.value) {
      selectedPriceListId.value = priceLists.value[0].id
      loadPriceListItems()
    }
  } catch (err) {
    console.error('Failed to load price lists:', err)
    priceError.value = 'プライスリストの読み込みに失敗しました'
  }
}

async function loadPriceListItems() {
  if (!selectedPriceListId.value) {
    priceListItems.value = []
    return
  }
  
  // カテゴリーフィルターをリセット
  selectedBigCategory.value = ''
  selectedSmallCategory.value = ''
  
  priceLoading.value = true
  priceError.value = null
  try {
    const result = await supabaseService.getPriceListItems(selectedPriceListId.value)
    priceListItems.value = result.items || []
  } catch (err) {
    console.error('Failed to load price list items:', err)
    priceError.value = 'アイテムの読み込みに失敗しました'
  } finally {
    priceLoading.value = false
  }
}

// プライスリストからアイテム追加
async function addItemFromPriceList(priceItem) {
  if (!selectedTemplate.value) return
  
  try {
    const newItem = await supabaseService.addBillingTemplateItem(selectedTemplate.value.id, {
      external_code: priceItem.external_code,
      note: priceItem.note || '',
      quantity: 1
    })
    templateItems.value.push(newItem)
  } catch (err) {
    console.error('Failed to add item:', err)
    alert('アイテムの追加に失敗しました')
  }
}

// コード入力時のリアルタイム変換
function handleCodeInput(item, event) {
  const normalized = normalizeCode(event.target.value)
  event.target.value = normalized
  item.external_code = normalized
}

// コード入力欄からフォーカスが外れた時の保存処理
async function handleCodeBlur(item, value) {
  const normalized = normalizeCode(value) || null
  if (normalized === item.external_code) return
  
  item.external_code = normalized
  
  try {
    await supabaseService.updateBillingTemplateItem(item.id, { external_code: normalized })
  } catch (err) {
    console.error('Failed to update code:', err)
  }
}

async function updateTemplateItem(item, field, value) {
  const oldValue = item[field]
  if (oldValue === value) return
  
  if (field === 'quantity') {
    value = value ? parseFloat(value) : null
  }
  
  item[field] = value
  
  try {
    await supabaseService.updateBillingTemplateItem(item.id, { [field]: value })
  } catch (err) {
    console.error('Failed to update item:', err)
    item[field] = oldValue
  }
}

// 数量入力時のキー入力制限（半角数字と小数点のみ許可）
function preventInvalidQuantityInput(event) {
  const key = event.key
  const currentValue = event.target.value
  
  // 許可するキー: 数字、小数点、バックスペース、Delete、Tab、矢印キー、Enter
  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Home', 'End']
  
  if (allowedKeys.includes(key)) {
    return // 許可
  }
  
  // 数字キー（0-9）は許可
  if (/^[0-9]$/.test(key)) {
    return // 許可
  }
  
  // 小数点は1つまで許可
  if (key === '.' && !currentValue.includes('.')) {
    return // 許可
  }
  
  // それ以外は拒否
  event.preventDefault()
}

// 数量入力（半角数字と小数点のみ許可）
function handleQuantityInput(item, event) {
  let value = event.target.value
  // 全角数字を半角に変換
  value = value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
  // 半角数字と小数点以外を除去
  value = value.replace(/[^0-9.]/g, '')
  // 小数点が複数ある場合は最初の1つだけ残す
  const parts = value.split('.')
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }
  event.target.value = value
  item.quantity = value ? parseFloat(value) : null
}

// 数量のインクリメント/デクリメント
async function incrementQuantity(item) {
  const newQty = (item.quantity || 0) + 1
  item.quantity = newQty
  try {
    await supabaseService.updateBillingTemplateItem(item.id, { quantity: newQty })
  } catch (err) {
    console.error('Failed to update quantity:', err)
    item.quantity = newQty - 1
  }
}

async function decrementQuantity(item) {
  const newQty = Math.max(0, (item.quantity || 0) - 1)
  item.quantity = newQty
  try {
    await supabaseService.updateBillingTemplateItem(item.id, { quantity: newQty })
  } catch (err) {
    console.error('Failed to update quantity:', err)
    item.quantity = newQty + 1
  }
}

async function deleteTemplateItem(item) {
  const index = templateItems.value.findIndex(i => i.id === item.id)
  const removed = templateItems.value.splice(index, 1)[0]
  
  try {
    await supabaseService.deleteBillingTemplateItem(item.id)
  } catch (err) {
    console.error('Failed to delete item:', err)
    templateItems.value.splice(index, 0, removed)
    alert('アイテムの削除に失敗しました')
  }
}

// プライスリストアイテムのドラッグ
function handlePriceItemDragStart(event, item) {
  draggingPriceItem.value = item
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'price-item',
    external_code: item.external_code,
    note: item.note
  }))
}

function handlePriceItemDragEnd() {
  draggingPriceItem.value = null
  dropTargetItemId.value = null
  isListDropTarget.value = false
}

// 既存アイテムへのドロップ（上書き）
function handleItemDragOver(event, item) {
  // プライスリストからのドラッグの場合は上書きターゲット
  if (draggingPriceItem.value) {
    dropTargetItemId.value = item.id
    return
  }
  // アイテム並び替えの場合
  if (draggingItemId.value && draggingItemId.value !== item.id) {
    itemDragOverId.value = item.id
  }
}

function handleItemDragLeave() {
  dropTargetItemId.value = null
  itemDragOverId.value = null
}

async function handleItemDrop(event, targetItem) {
  // プライスリストからのドロップ（上書き）
  if (draggingPriceItem.value) {
    const priceItem = draggingPriceItem.value
    targetItem.external_code = priceItem.external_code
    targetItem.note = priceItem.note || ''
    dropTargetItemId.value = null
    
    try {
      await supabaseService.updateBillingTemplateItem(targetItem.id, {
        external_code: priceItem.external_code,
        note: priceItem.note || ''
      })
    } catch (err) {
      console.error('Failed to update item from drop:', err)
      await loadTemplateItems()
    }
    return
  }
  
  // アイテム並び替え
  if (draggingItemId.value && draggingItemId.value !== targetItem.id) {
    const draggedIndex = templateItems.value.findIndex(i => i.id === draggingItemId.value)
    const targetIndex = templateItems.value.findIndex(i => i.id === targetItem.id)
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [removed] = templateItems.value.splice(draggedIndex, 1)
      // 削除後のインデックス調整
      // 下から上への移動（draggedIndex > targetIndex）: ターゲットの上に配置 → targetIndexそのまま
      // 上から下への移動（draggedIndex < targetIndex）: ターゲットの下に配置 → targetIndex - 1（削除分） + 1 = targetIndex
      // 結果的にどちらもtargetIndexを使用（削除後の配列に対して）
      // ただし、上から下への移動時は削除によりインデックスが1つずれるので、
      // 実質的にターゲットの位置に挿入される（ターゲットの下に配置される）
      templateItems.value.splice(targetIndex, 0, removed)
      await updateItemSortOrders()
    }
  }
  
  itemDragOverId.value = null
}

// リスト全体へのドロップ（空きスペース）
function handleListDragOver(event) {
  if (draggingPriceItem.value) {
    isListDropTarget.value = true
  }
}

function handleListDragLeave() {
  isListDropTarget.value = false
}

async function handleListDrop(event) {
  // 既存アイテムへのドロップは別処理で行われるので、
  // ここでは空きスペースへのドロップのみ処理
  if (draggingPriceItem.value && !dropTargetItemId.value) {
    await addItemFromPriceList(draggingPriceItem.value)
  }
  isListDropTarget.value = false
}

// アイテム並び替えのドラッグ
function handleItemDragStart(event, item) {
  // プライスリストからのドラッグ中は無視
  if (draggingPriceItem.value) {
    event.preventDefault()
    return
  }
  draggingItemId.value = item.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'template-item',
    id: item.id
  }))
}

function handleItemDragEnd() {
  draggingItemId.value = null
  itemDragOverId.value = null
}

async function updateItemSortOrders() {
  if (!selectedTemplate.value) return
  
  const itemIds = templateItems.value.map(item => item.id)
  
  try {
    await supabaseService.rebalanceBillingTemplateItems(selectedTemplate.value.id, itemIds)
  } catch (err) {
    console.error('Failed to update sort orders:', err)
    await loadTemplateItems()
  }
}

async function deleteTemplate(template) {
  if (template.label === 'temp') return
  if (!confirm(`「${template.label}」を削除しますか？`)) return
  
  const index = templates.value.findIndex(t => t.id === template.id)
  const removed = templates.value.splice(index, 1)[0]
  
  if (selectedTemplate.value?.id === template.id) {
    selectedTemplate.value = null
    templateItems.value = []
  }
  
  try {
    await supabaseService.deleteBillingTemplate(template.id)
  } catch (err) {
    console.error('Failed to delete template:', err)
    templates.value.splice(index, 0, removed)
  }
}

// テンプレートリストのドラッグ&ドロップ
function handleDragStart(event, template) {
  if (template.label === 'temp') {
    event.preventDefault()
    return
  }
  draggingId.value = template.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', template.id)
}

function handleDragEnd() {
  draggingId.value = null
  dragOverId.value = null
}

function handleDragOver(event, template) {
  if (template.label === 'temp') return
  if (draggingId.value && draggingId.value !== template.id) {
    dragOverId.value = template.id
  }
}

function handleDragLeave() {
  dragOverId.value = null
}

async function handleDrop(event, targetTemplate) {
  if (targetTemplate.label === 'temp') {
    dragOverId.value = null
    return
  }
  
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
  const updates = templates.value
    .filter(t => t.label !== 'temp')
    .map((t, i) => ({
      id: t.id,
      sort_order: i + 1
    }))
  
  let order = 0
  templates.value.forEach(t => {
    if (t.label === 'temp') {
      t.sort_order = 0
    } else {
      order++
      t.sort_order = order
    }
  })
  
  try {
    await supabaseService.reorderBillingTemplates(updates)
  } catch (err) {
    console.error('Failed to reorder templates:', err)
    await loadTemplates()
  }
}

function formatPrice(price) {
  if (!price) return '0'
  return Number(price).toLocaleString()
}

defineExpose({
  loadTemplates,
  loading
})
</script>

<style scoped>
.billing-template-editor-container {
  display: flex;
  height: 100%;
  gap: 0;
}

.billing-template-editor {
  width: 300px;
  min-width: 300px;
  padding: 1rem 0.75rem;
  padding-bottom: 150px;
  overflow-y: auto;
  border-right: 1px solid #e2e8f0;
}

.billing-detail-panel {
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

/* 設定エリア */
.settings-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
}

.expandable-textarea-container {
  flex: 1;
  min-width: 150px;
}

.expandable-textarea {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8125rem;
  resize: none;
  transition: all 0.2s;
  min-height: 28px;
  max-height: 28px;
}

.expandable-textarea-container.expanded .expandable-textarea {
  min-height: 80px;
  max-height: 120px;
}

.expandable-textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.waste-select {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  background: white;
  min-width: 60px;
}

.waste-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.waste-select.placeholder {
  color: #9ca3af;
}

.check-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #4b5563;
  cursor: pointer;
  white-space: nowrap;
}

.check-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.check-label span {
  user-select: none;
}

/* 検索 + フィルター行 */
.search-filter-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.search-input {
  flex: 1;
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8125rem;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.year-select,
.pricelist-select,
.category-select {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8125rem;
  background: white;
}

.year-select {
  width: 80px;
}

.pricelist-select {
  min-width: 120px;
}

.category-select {
  min-width: 90px;
}

.year-select:focus,
.pricelist-select:focus,
.category-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.pricelist-select.placeholder,
.category-select.placeholder {
  color: #9ca3af;
}

/* プライスリストアイテム */
.price-items-section {
  flex: 1;
  min-height: 150px;
  max-height: 300px;
  overflow-y: auto;
  border-bottom: 1px solid #e2e8f0;
}

.price-items-list {
  padding: 0.5rem;
}

.price-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.375rem;
  cursor: grab;
  transition: all 0.15s;
  flex-wrap: wrap;
}

.price-item:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.price-item:active {
  cursor: grabbing;
}

.price-item-code {
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
  min-width: 70px;
}

.price-item-type {
  font-size: 0.6875rem;
  color: #8b5cf6;
  background: #f3e8ff;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
}

.price-item-desc {
  flex: 1;
  font-size: 0.8125rem;
  color: #374151;
  min-width: 100px;
}

.price-item-add-desc {
  font-size: 0.75rem;
  color: #6b7280;
  font-style: italic;
}

.price-item-note {
  font-size: 0.75rem;
  color: #059669;
  background: #d1fae5;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
}

.price-item-unit {
  font-size: 0.75rem;
  color: #6b7280;
  min-width: 30px;
  text-align: center;
}

.price-item-price {
  font-size: 0.75rem;
  font-weight: 500;
  color: #dc2626;
  white-space: nowrap;
}

/* テンプレートアイテム */
.template-items-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.15s;
}

.template-items-section.list-drop-target {
  background: #eff6ff;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}

.section-count {
  font-size: 0.75rem;
  color: #64748b;
}

.section-total {
  margin-left: auto;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #dc2626;
}

.template-items-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  padding-bottom: 150px;
}

.template-item-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin-bottom: 0.375rem;
  transition: all 0.15s;
}

.template-item-row.drop-target {
  border-color: #3b82f6;
  background: #dbeafe;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.template-item-row.item-dragging {
  opacity: 0.5;
}

.template-item-row.item-drag-over {
  border-color: #10b981;
  background: #d1fae5;
}

.item-drag-handle {
  cursor: grab;
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 0 0.25rem;
}

.item-drag-handle:active {
  cursor: grabbing;
}

.template-item-row .item-index {
  min-width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  border-radius: 3px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6b7280;
}

.item-code-input {
  width: 90px;
  min-width: 90px;
  padding: 0.25rem 0.375rem;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
  text-transform: uppercase;
}

.item-code-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.item-price-type {
  font-size: 0.625rem;
  color: #8b5cf6;
  background: #f3e8ff;
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  white-space: nowrap;
}

.item-description {
  flex: 1;
  font-size: 0.6875rem;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 60px;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 0;
}

.qty-btn {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  cursor: pointer;
  font-size: 0.75rem;
  color: #374151;
  transition: all 0.15s;
}

.qty-btn:first-child {
  border-radius: 3px 0 0 3px;
}

.qty-btn:last-child {
  border-radius: 0 3px 3px 0;
}

.qty-btn:hover {
  background: #e5e7eb;
}

.item-quantity-input {
  width: 50px;
  padding: 0.25rem 0.25rem;
  border: 1px solid #d1d5db;
  border-left: none;
  border-right: none;
  border-radius: 0;
  font-size: 0.75rem;
  text-align: center;
}

.item-quantity-input:focus {
  outline: none;
  border-color: #d1d5db;
  position: relative;
  z-index: 1;
}

.item-unit {
  font-size: 0.625rem;
  color: #6b7280;
  min-width: 20px;
  text-align: center;
}

.item-note-input {
  width: 150px;
  min-width: 120px;
  padding: 0.25rem 0.375rem;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-size: 0.6875rem;
}

.item-note-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.item-unit-price {
  font-size: 0.625rem;
  color: #dc2626;
  white-space: nowrap;
  min-width: 50px;
  text-align: right;
}

.item-delete-btn {
  padding: 0.125rem 0.25rem;
  border: none;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-size: 0.6875rem;
  color: #9ca3af;
  transition: all 0.15s;
}

.item-delete-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

.drop-hint {
  border: 2px dashed #d1d5db;
  border-radius: 6px;
  padding: 2rem !important;
}

.drop-hint small {
  color: #9ca3af;
  display: block;
  margin-top: 0.5rem;
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

.template-item.is-temp {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.template-item.is-temp:hover {
  box-shadow: none;
}

.new-template-item {
  border-style: dashed;
  background: #fafafa;
}

.new-template-item:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
}

.new-template-input::placeholder {
  color: #9ca3af;
  font-style: italic;
}

.add-template-btn {
  padding: 0.375rem 0.625rem;
  border: none;
  border-radius: 4px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.15s;
}

.add-template-btn:hover:not(:disabled) {
  background: #2563eb;
}

.add-template-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
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

.template-drag-handle.disabled {
  cursor: default;
  opacity: 0.3;
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

.edit-placeholder {
  width: 28px;
}

.template-label {
  flex: 1;
  font-size: 0.9375rem;
  color: #1f2937;
}

.template-label.temp-label {
  color: #9ca3af;
  font-style: italic;
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

.delete-placeholder {
  width: 28px;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

.empty-state.small {
  padding: 1rem;
  font-size: 0.75rem;
}
</style>
