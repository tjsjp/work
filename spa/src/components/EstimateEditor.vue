<template>
  <div class="estimate-editor">
    <!-- 左パネル：プライスリストアイテム -->
    <div class="left-panel">
      <!-- フィルター行 -->
      <div class="filter-row">
        <select v-model="selectedBigCategory" @change="handleBigCategoryChange" class="category-select" :class="{ 'placeholder': !selectedBigCategory }">
          <option value="">区分</option>
          <option v-for="cat in bigCategoryOptions" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
        </select>
        <select v-model="selectedSmallCategory" class="category-select" :class="{ 'placeholder': !selectedSmallCategory }">
          <option value="">大分類</option>
          <option v-for="cat in smallCategoryOptions" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
        </select>
        <select v-model="selectedPriceListId" @change="loadPriceListItems" :disabled="priceLists.length === 0" class="pricelist-select" :class="{ 'placeholder': !selectedPriceListId }">
          <option value="">プライスリスト</option>
          <option v-for="pl in priceLists" :key="pl.id" :value="pl.id">{{ pl.label }}</option>
        </select>
      </div>

      <!-- 検索 -->
      <div class="search-row">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="コード・説明で検索..."
          class="search-input"
        />
      </div>

      <!-- アイテム一覧 -->
      <div v-if="!props.workId" class="empty-state">
        <p>Work IDを入力してデータを読み込んでください</p>
      </div>
      <div v-else-if="priceListError" class="error-state">
        {{ priceListError }}
        <button @click="loadPriceListItems" class="retry-btn">再読み込み</button>
      </div>
      <div v-else class="items-list">
        <div 
          v-for="item in filteredItems" 
          :key="item.id"
          class="price-item"
          :class="{ 'expanded': expandedItemId === item.id }"
          draggable="true"
          @dragstart="handleDragStart($event, item)"
          @dragend="handleDragEnd"
          @click="toggleItemExpand(item.id)"
        >
          <div class="item-row-1">
            <div class="item-code">{{ item.external_code }}</div>
            <div class="item-description">{{ item.description }}</div>
          </div>
          <div class="item-row-2">
            <div class="item-note">{{ item.note || '-' }}</div>
            <div class="item-price">¥{{ formatPrice(item.unit_price) }}</div>
            <div class="item-unit">{{ item.unit || '-' }}</div>
          </div>
        </div>
        <div v-if="filteredItems.length === 0 && priceListItems.length > 0" class="empty-state">
          検索結果がありません
        </div>
        <div v-if="priceListItems.length === 0 && selectedPriceListId" class="empty-state">
          アイテムがありません
        </div>
        <div v-if="!selectedPriceListId" class="empty-state">
          プライスリストを選択してください
        </div>
      </div>
    </div>

    <!-- 中央パネル：見積スロット一覧 -->
    <div class="center-panel"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
      :class="{ 'drag-over': isDragOver, 'expanded': isExpandedSlots }"
    >
      <div class="slots-header">
        <button 
          class="room-template-btn" 
          :class="{ 'no-room-labels': !hasRoomLabels }"
          @click="openRoomLabelModal" 
          :disabled="!props.workId" 
          :title="hasRoomLabels ? '部屋テンプレート入力' : '部屋ラベルが設定されていません'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        <span class="slots-title">見積スロット</span>
        <span class="slots-count">{{ estimateSlots.length }}件</span>
        <label class="group-checkbox" title="依頼先でグループ化">
          <input type="checkbox" v-model="groupByContractor" />
          <span>依頼先</span>
        </label>
        <button 
          class="save-template-btn" 
          @click="saveAsTemplate" 
          :disabled="!props.workId || estimateSlots.length === 0"
          title="現在のスロットをテンプレートとして保存"
        >
          ☆
        </button>
        <button 
          class="insert-template-btn" 
          @click="insertTemplate" 
          :disabled="!props.workId"
          title="テンプレートから挿入"
        >
          追加
        </button>
        <button 
          class="generate-excel-btn" 
          @click="generateAndDownloadExcel" 
          :disabled="!props.workId || estimateSlots.length === 0 || generatingExcel"
          title="Excel見積書を生成してダウンロード"
        >
          <svg v-if="!generatingExcel" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span v-if="!generatingExcel">Excel生成</span>
          <span v-else>生成中...</span>
        </button>
        <button class="expand-toggle-btn" @click="toggleExpandSlots" :title="isExpandedSlots ? '検索パネルを表示' : '検索パネルを非表示'">
          {{ isExpandedSlots ? '＜' : '＞' }}
        </button>
      </div>
      
      <div class="slots-list">
        <div v-if="!props.workId" class="empty-slots">
          <p>Work IDを入力してデータを読み込んでください</p>
        </div>
        <div v-else-if="loading" class="loading-state">見積スロットを読み込み中...</div>
        <div v-else-if="error" class="error-state">
          {{ error }}
          <button @click="loadEstimateSlots" class="retry-btn">再読み込み</button>
        </div>
        <div v-else-if="estimateSlots.length === 0" class="empty-slots">
          <p>見積スロットがありません</p>
          <p style="font-size: 0.75rem; margin-top: 0.5rem;">左のリストからアイテムをドラッグして追加するか、更新ボタンで読み込んでください</p>
        </div>
        
        <!-- 通常表示（グループ化なし） -->
        <template v-else-if="!groupByContractor">
          <div 
            v-for="(slot, index) in estimateSlots" 
            :key="slot.id || index"
            :data-slot-id="slot.id"
            class="estimate-slot"
            :class="{ 
              'selected': selectedSlotLeft && selectedSlotLeft.id === slot.id, 
              'drop-target': dropTargetSlotId === slot.id,
              'dragging': draggingSlot && draggingSlot.slot.id === slot.id
            }"
            draggable="true"
            @dragstart="handleSlotDragStartForReorder($event, slot, index)"
            @dragend="handleSlotDragEndForReorder"
            @dragover.prevent.stop="handleSlotDragOverForReorder($event, slot, index); handleSlotDragOver(slot)"
            @dragleave="handleSlotDragLeave()"
            @drop.prevent.stop="handleSlotDropForReorder($event, slot, index); handleSlotDrop($event, slot)"
          >
            <!-- 1段目：単価コード、説明、備考、依頼先、削除 -->
            <div class="slot-row-1">
              <span class="slot-number">{{ index + 1 }}.</span>
              <input 
                type="text" 
                class="slot-price-code"
                v-model="slot.price_code"
                @input="handlePriceCodeInput(slot, $event)"
                @focus="handleInputFocus"
                @blur="handleInputBlur(); handleSlotUpdate(slot)"
                placeholder="単価コード"
              />
              <div class="slot-description" :title="getMatchingPriceItem(slot.price_code)?.description || ''">
                {{ getMatchingPriceItem(slot.price_code)?.description || '-' }}
              </div>
              <div class="slot-note" :title="getMatchingPriceItem(slot.price_code)?.note || ''">
                {{ getMatchingPriceItem(slot.price_code)?.note || '-' }}
              </div>
              <button 
                class="is-room-toggle" 
                :class="{ 
                  'active': slot.is_room,
                  'disabled': !getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item
                }"
                :disabled="!getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item"
                @click.stop="handleIsRoomToggle(slot)"
                :title="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item ? '部屋モード' : 'アイテムスロットのみ有効'"
              >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
              </button>
              <select class="slot-contractor" v-model="slot.contractor_id" @click.stop @focus="handleInputFocus" @blur="handleInputBlur" @change="handleSlotUpdate(slot)">
                <option value="">依頼先</option>
                <option v-for="c in contractors" :key="c.id" :value="c.id">{{ c.label }}</option>
              </select>
              <button class="slot-delete-btn" @click.stop="removeSlot(index)">✕</button>
            </div>
            
            <!-- 2段目：アイテム数、スロットタイプ、内容、数量、オーダー数量、リクエスト数量 -->
            <div class="slot-row-2">
              <span 
                v-if="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item"
                class="slot-items-badge" 
                :class="{ 
                  'has-items': slot.items && slot.items.length > 0, 
                  'expanded': selectedSlotLeft && selectedSlotLeft.id === slot.id,
                  'is-item-type': true
                }"
                @click.stop="toggleSlotItemsLeft(slot)"
                :title="slot.items && slot.items.length > 0 ? 'クリックでアイテム表示' : 'アイテムなし'"
              >
                {{ slot.items ? slot.items.length : 0 }}
              </span>
              <select class="slot-type" v-model="slot.estimate_slot_type_id" @click.stop @focus="handleInputFocus" @blur="handleInputBlur" @change="handleSlotTypeChange(slot)">
                <option value="">タイプ</option>
                <option v-for="type in estimateSlotTypes" :key="type.id" :value="type.id">{{ type.description }}</option>
              </select>
              <input 
                type="text" 
                class="slot-instruction"
                v-model="slot.instruction"
                placeholder="内容..."
                @click.stop
                @focus="handleInputFocus"
                @blur="handleInputBlur(); handleSlotUpdate(slot)"
                @contextmenu="handleContextMenu($event, $event.target)"
              />
              <div class="quantity-control" :class="{ 'is-sum': getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum }">
                <button 
                  class="qty-btn clear-btn" 
                  @click.stop="clearSlotQuantity(slot)"
                  title="クリア"
                >C</button>
                <button 
                  class="qty-btn" 
                  @click.stop="decrementQuantity(slot)"
                  :disabled="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum"
                >−</button>
                <input 
                  type="text" 
                  class="slot-quantity"
                  :value="slot.quantity"
                  @input="handleQuantityInput(slot, $event)"
                  @keydown="preventInvalidQuantityInput"
                  @focus="handleInputFocus"
                  @blur="handleInputBlur(); handleSlotUpdate(slot)"
                  placeholder="数量"
                  @click.stop
                  :disabled="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum"
                  :class="{ 'is-sum': getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum }"
                  :title="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum ? 'アイテム数量の合計（自動計算）' : ''"
                />
                <button 
                  class="qty-btn" 
                  @click.stop="incrementQuantity(slot)"
                  :disabled="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum"
                >＋</button>
              </div>
            </div>
            
            <!-- スロットアイテム表示（展開時のみ・左パネル用） -->
            <div 
              v-if="selectedSlotLeft && selectedSlotLeft.id === slot.id && (slot.items?.length > 0 || getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item)" 
              class="slot-items-expanded"
            >
              <div v-for="(item, itemIndex) in slot.items" :key="item.id || itemIndex" class="slot-item-editable">
                <span class="item-number">{{ itemIndex }}</span>
                <input 
                  type="text" 
                  class="item-location-input"
                  :class="{ 'disabled-gray': !isItemLocationCategoryEditable(item) }"
                  v-model="item.location_category"
                  @blur="handleItemUpdate(item)"
                  placeholder="場所..."
                  @contextmenu="handleContextMenu($event, $event.target)"
                />
                <input 
                  type="text" 
                  class="item-instruction-input"
                  v-model="item.instruction"
                  @blur="handleItemUpdate(item)"
                  placeholder="指示..."
                  @contextmenu="handleContextMenu($event, $event.target)"
                />
                <div class="item-quantity-control">
                  <button class="item-qty-btn clear-btn" @click.stop="clearItemQuantity(item)" :disabled="!isItemQuantityEditable(item)">C</button>
                  <button class="item-qty-btn" @click.stop="decrementItemQuantity(item)" :disabled="!isItemQuantityEditable(item)">−</button>
                  <input 
                    type="text" 
                    class="item-quantity-input"
                    :class="{ 'disabled-gray': !isItemQuantityEditable(item) }"
                    :disabled="!isItemQuantityEditable(item)"
                    :value="item.quantity"
                    @input="handleItemQuantityInput(item, $event)"
                    @blur="handleItemUpdate(item)"
                    placeholder="数量"
                  />
                  <button class="item-qty-btn" @click.stop="incrementItemQuantity(item)" :disabled="!isItemQuantityEditable(item)">＋</button>
                </div>
              </div>
              <!-- アイテム追加ボタン（9以下の場合） -->
              <button 
                v-if="(!slot.items || slot.items.length < 10) && getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item"
                class="add-item-btn"
                @click.stop="handleAddItem(slot)"
              >
                ＋ アイテムを追加
              </button>
            </div>
          </div>
        </template>
        
        <!-- グループ表示（依頼先でグループ化） -->
        <template v-else>
          <div v-for="group in groupedSlotsByContractor" :key="group.contractorId" class="contractor-group">
            <div class="contractor-group-header">
              <span class="contractor-group-label">{{ group.contractorLabel }}</span>
              <span class="contractor-group-count">{{ group.slots.length }}件</span>
            </div>
            <div 
              v-for="{ slot, originalIndex } in group.slots" 
              :key="slot.id || originalIndex"
              class="estimate-slot"
              :class="{ 
                'selected': selectedSlotLeft && selectedSlotLeft.id === slot.id, 
                'drop-target': dropTargetSlotId === slot.id,
                'dragging': draggingSlot && draggingSlot.slot.id === slot.id
              }"
              draggable="true"
              @dragstart="handleSlotDragStartForReorder($event, slot, originalIndex)"
              @dragend="handleSlotDragEndForReorder"
              @dragover.prevent.stop="handleSlotDragOverForReorder($event, slot, originalIndex); handleSlotDragOver(slot)"
              @dragleave="handleSlotDragLeave()"
              @drop.prevent.stop="handleSlotDropForReorder($event, slot, originalIndex); handleSlotDrop($event, slot)"
            >
              <!-- 1段目：単価コード、説明、備考、依頼先、削除 -->
              <div class="slot-row-1">
                <span class="slot-number">{{ originalIndex + 1 }}.</span>
                <input 
                  type="text" 
                  class="slot-price-code"
                  v-model="slot.price_code"
                  @input="handlePriceCodeInput(slot, $event)"
                  @focus="handleInputFocus"
                  @blur="handleInputBlur(); handleSlotUpdate(slot)"
                  placeholder="単価コード"
                />
                <div class="slot-description" :title="getMatchingPriceItem(slot.price_code)?.description || ''">
                  {{ getMatchingPriceItem(slot.price_code)?.description || '-' }}
                </div>
                <div class="slot-note" :title="getMatchingPriceItem(slot.price_code)?.note || ''">
                  {{ getMatchingPriceItem(slot.price_code)?.note || '-' }}
                </div>
                <button 
                  class="is-room-toggle" 
                  :class="{ 
                    'active': slot.is_room,
                    'disabled': !getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item
                  }"
                  :disabled="!getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item"
                  @click.stop="handleIsRoomToggle(slot)"
                  :title="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item ? '部屋モード' : 'アイテムスロットのみ有効'"
                >
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                  </svg>
                </button>
                <select class="slot-contractor" v-model="slot.contractor_id" @click.stop @focus="handleInputFocus" @blur="handleInputBlur" @change="handleSlotUpdate(slot)">
                  <option value="">依頼先</option>
                  <option v-for="c in contractors" :key="c.id" :value="c.id">{{ c.label }}</option>
                </select>
                <button class="slot-delete-btn" @click.stop="removeSlot(originalIndex)">✕</button>
              </div>
              
              <!-- 2段目：アイテム数、スロットタイプ、内容、数量、オーダー数量、リクエスト数量 -->
              <div class="slot-row-2">
                <span 
                  v-if="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item"
                  class="slot-items-badge" 
                  :class="{ 
                    'has-items': slot.items && slot.items.length > 0, 
                    'expanded': selectedSlotLeft && selectedSlotLeft.id === slot.id,
                    'is-item-type': true
                  }"
                  @click.stop="toggleSlotItemsLeft(slot)"
                  :title="slot.items && slot.items.length > 0 ? 'クリックでアイテム表示' : 'アイテムなし'"
                >
                  {{ slot.items ? slot.items.length : 0 }}
                </span>
                <select class="slot-type" v-model="slot.estimate_slot_type_id" @click.stop @focus="handleInputFocus" @blur="handleInputBlur" @change="handleSlotTypeChange(slot)">
                  <option value="">タイプ</option>
                  <option v-for="type in estimateSlotTypes" :key="type.id" :value="type.id">{{ type.description }}</option>
                </select>
                <input 
                  type="text" 
                  class="slot-instruction"
                  v-model="slot.instruction"
                  placeholder="内容..."
                  @click.stop
                  @focus="handleInputFocus"
                  @blur="handleInputBlur(); handleSlotUpdate(slot)"
                  @contextmenu="handleContextMenu($event, $event.target)"
                />
                <div class="quantity-control" :class="{ 'is-sum': getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum }">
                  <button 
                    class="qty-btn clear-btn" 
                    @click.stop="clearSlotQuantity(slot)"
                    title="クリア"
                  >C</button>
                  <button 
                    class="qty-btn" 
                    @click.stop="decrementQuantity(slot)"
                    :disabled="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum"
                  >−</button>
                  <input 
                    type="text" 
                    class="slot-quantity"
                    :value="slot.quantity"
                    @input="handleQuantityInput(slot, $event)"
                    @keydown="preventInvalidQuantityInput"
                    @focus="handleInputFocus"
                    @blur="handleInputBlur(); handleSlotUpdate(slot)"
                    placeholder="数量"
                    @click.stop
                    :disabled="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum"
                    :class="{ 'is-sum': getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum }"
                    :title="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum ? 'アイテム数量の合計（自動計算）' : ''"
                  />
                  <button 
                    class="qty-btn" 
                    @click.stop="incrementQuantity(slot)"
                    :disabled="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum"
                  >＋</button>
                </div>
              </div>
              
              <!-- スロットアイテム表示（展開時のみ・左パネル用） -->
              <div 
                v-if="selectedSlotLeft && selectedSlotLeft.id === slot.id && (slot.items?.length > 0 || getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item)" 
                class="slot-items-expanded"
              >
                <div v-for="(item, itemIndex) in slot.items" :key="item.id || itemIndex" class="slot-item-editable">
                  <span class="item-number">{{ itemIndex }}</span>
                  <input 
                    type="text" 
                    class="item-location-input"
                    :class="{ 'disabled-gray': !isItemLocationCategoryEditable(item) }"
                    v-model="item.location_category"
                    @blur="handleItemUpdate(item)"
                    placeholder="場所..."
                    @contextmenu="handleContextMenu($event, $event.target)"
                  />
                  <input 
                    type="text" 
                    class="item-instruction-input"
                    v-model="item.instruction"
                    @blur="handleItemUpdate(item)"
                    placeholder="指示..."
                    @contextmenu="handleContextMenu($event, $event.target)"
                  />
                  <div class="item-quantity-control">
                    <button class="item-qty-btn clear-btn" @click.stop="clearItemQuantity(item)" :disabled="!isItemQuantityEditable(item)">C</button>
                    <button class="item-qty-btn" @click.stop="decrementItemQuantity(item)" :disabled="!isItemQuantityEditable(item)">−</button>
                    <input 
                      type="text" 
                      class="item-quantity-input"
                      :class="{ 'disabled-gray': !isItemQuantityEditable(item) }"
                      :disabled="!isItemQuantityEditable(item)"
                      :value="item.quantity"
                      @input="handleItemQuantityInput(item, $event)"
                      @blur="handleItemUpdate(item)"
                      placeholder="数量"
                    />
                    <button class="item-qty-btn" @click.stop="incrementItemQuantity(item)" :disabled="!isItemQuantityEditable(item)">＋</button>
                  </div>
                </div>
                <!-- アイテム追加ボタン（9以下の場合） -->
                <button 
                  v-if="(!slot.items || slot.items.length < 10) && getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item"
                  class="add-item-btn"
                  @click.stop="handleAddItem(slot)"
                >
                  ＋ アイテムを追加
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
      
      <!-- 見積を追加ボタン -->
      <div class="add-slot-area">
        <button class="add-slot-btn" @click="addNewSlot">
          ＋ 見積を追加
        </button>
      </div>
    </div>

    <!-- 右パネル：検索・絞り込み / 請求比較 -->
    <div class="right-panel" v-show="!isExpandedSlots">
      <!-- パネル切り替えタブ -->
      <div class="right-panel-tabs">
        <button 
          class="panel-tab" 
          :class="{ active: rightPanelMode === 'search' }"
          @click="rightPanelMode = 'search'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          検索
        </button>
        <button 
          class="panel-tab" 
          :class="{ active: rightPanelMode === 'comparison' }"
          @click="rightPanelMode = 'comparison'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
          チェックリスト比較
        </button>
      </div>

      <!-- 検索モード -->
      <template v-if="rightPanelMode === 'search'">
        <div class="filter-panel-header">
          <span>検索・絞り込み</span>
          <span class="filter-result-inline">{{ filteredEstimateSlots.length }} / {{ estimateSlots.length }} 件</span>
        </div>
        
        <div class="filter-panel-content">
          <!-- 検索・絞り込み（1行） -->
          <div class="filter-row-inline">
            <button 
              class="filter-reset-btn-inline" 
              @click="resetSlotFilters" 
              v-if="slotSearchQuery || filterHasQuantity || filterContractorId || filterRoomLabel"
              title="フィルターリセット"
            >
              ✕
            </button>
            <div class="filter-search-wrapper">
              <input 
                type="text" 
                v-model="slotSearchQuery" 
                placeholder="検索..."
                class="filter-input-inline"
              />
              <button 
                class="filter-clear-btn" 
                @click="slotSearchQuery = ''" 
                v-if="slotSearchQuery"
                title="クリア"
              >
                ✕
              </button>
            </div>
            <select v-model="filterRoomLabel" class="filter-select-inline filter-room-select" :class="{ 'placeholder': !filterRoomLabel }">
              <option value="">部屋</option>
              <option v-for="label in roomLabels.filter(l => l.label)" :key="label.sort_order" :value="label.label">{{ label.label }}</option>
            </select>
            <label class="filter-checkbox-inline">
              <input type="checkbox" v-model="filterHasQuantity" />
              <span>数量あり</span>
            </label>
            <select v-model="filterContractorId" class="filter-select-inline" :class="{ 'placeholder': !filterContractorId }">
              <option value="">依頼先</option>
              <option v-for="c in contractors" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </div>
        </div>
      </template>

      <!-- 比較モード -->
      <template v-if="rightPanelMode === 'comparison'">
        <div class="comparison-panel-header">
          <span>見積・チェックリスト比較</span>
          <div class="comparison-actions">
            <button 
              class="comparison-btn compare-btn"
              @click="executeComparison"
              :disabled="comparisonLoading"
            >
              {{ comparisonLoading ? '比較中...' : '比較実行' }}
            </button>
            <button 
              class="comparison-btn save-btn"
              @click="saveComparison"
              :disabled="comparisonData.length === 0"
            >
              保存
            </button>
            <button 
              class="comparison-btn refresh-btn"
              @click="refreshComparison"
              title="比較データをリセット"
            >
              リセット
            </button>
          </div>
        </div>
        
        <div class="comparison-content">
          <div v-if="comparisonLoading" class="comparison-loading">
            比較データを読み込み中...
          </div>
          <div v-else-if="comparisonData.length === 0" class="comparison-empty">
            <p>比較データがありません</p>
            <p class="hint">「比較実行」ボタンを押して比較を開始してください</p>
          </div>
          <div v-else class="comparison-list">
            <!-- ヘッダー -->
            <div class="comparison-header-row">
              <span class="comp-code-header">コード / 説明</span>
              <span class="comp-estimate-header">見積</span>
              <span class="comp-billing-header">請求</span>
              <span class="comp-request-header">修正数量</span>
              <span class="comp-status-header"></span>
            </div>
            <!-- 比較アイテム -->
            <div 
              v-for="item in comparisonData" 
              :key="item.external_code"
              class="comparison-item"
              :class="getComparisonItemClass(item)"
              @click="handleComparisonItemClick(item, $event)"
            >
              <div class="comparison-row">
                <div 
                  class="comp-drag-handle"
                  draggable="true"
                  @dragstart="handleComparisonDragStart($event, item)"
                  @dragend="handleComparisonDragEnd"
                  title="ドラッグして見積スロットに追加"
                >
                  ≡
                </div>
                <div class="comp-info">
                  <span class="comp-code" :title="item.external_code">{{ item.external_code }}</span>
                  <span class="comp-billing-desc">{{ item.billing_description || '--' }}</span>
                  <span class="comp-estimate-desc" v-if="item.estimate_instruction">/ {{ item.estimate_instruction }}</span>
                </div>
                <span class="comp-estimate">{{ item.aggregated_quantity ?? '--' }}</span>
                <span class="comp-billing">{{ item.billing_quantity ?? '--' }}</span>
                <div class="comp-request-controls">
                  <button 
                    class="comp-qty-btn clear-btn" 
                    @click="clearComparisonQuantity(item)"
                    title="クリア"
                  >
                    C
                  </button>
                  <button 
                    class="comp-qty-btn minus-btn" 
                    @click="decrementComparisonQuantity(item)"
                  >
                    −
                  </button>
                  <input 
                    type="text" 
                    class="comp-request-input"
                    :value="item.request_quantity"
                    @input="handleComparisonRequestInput(item, $event)"
                    @blur="handleComparisonRequestChange(item, $event.target.value)"
                    @keydown.enter="$event.target.blur()"
                    placeholder="--"
                  />
                  <button 
                    class="comp-qty-btn plus-btn" 
                    @click="incrementComparisonQuantity(item)"
                  >
                    ＋
                  </button>
                  <button 
                    class="comp-qty-btn estimate-btn" 
                    @click="applyEstimateQuantity(item)"
                    title="見積数量を入力"
                    :disabled="item.aggregated_quantity === null"
                  >
                    →
                  </button>
                </div>
                <!-- ステータスバッジ -->
                <span v-if="item.status === 'pending_add'" class="status-badge pending">追加候補</span>
                <span v-else-if="item.status === 'new_from_billing'" class="status-badge new">新規</span>
                <span v-else class="status-badge-placeholder"></span>
              </div>
              <!-- 詳細展開（同一コードで複数スロットがある場合） -->
              <div v-if="item.slots && item.slots.length > 1" class="comparison-slots-detail">
                <div 
                  v-for="slot in item.slots" 
                  :key="slot.id" 
                  class="slot-detail-row"
                >
                  └ {{ slot.instruction || '(説明なし)' }}: {{ slot.quantity }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 検索結果スロット一覧（検索モード時のみ） -->
      <div class="right-slots-list" v-if="rightPanelMode === 'search'">
        <div v-if="filteredEstimateSlots.length === 0" class="empty-state-small">
          該当するスロットがありません
        </div>
        <template v-else>
          <div 
            v-for="(slot, index) in filteredEstimateSlots" 
            :key="'right-' + (slot.id || index)"
            class="estimate-slot"
            :class="{ 'selected': selectedSlotRight && selectedSlotRight.id === slot.id, 'drop-target': dropTargetSlotId === slot.id }"
            @dragover.prevent.stop="handleSlotDragOver(slot)"
            @dragleave="handleSlotDragLeave"
            @drop.prevent.stop="handleSlotDrop($event, slot)"
          >
            <!-- 1段目：単価コード、説明、備考、依頼先、削除 -->
            <div class="slot-row-1">
              <!-- スロット番号は非表示 -->
              <input 
                type="text" 
                class="slot-price-code"
                v-model="slot.price_code"
                @input="handlePriceCodeInput(slot, $event)"
                @blur="handleSlotUpdate(slot)"
                placeholder="単価コード"
              />
              <div class="slot-description" :title="getMatchingPriceItem(slot.price_code)?.description || ''">
                {{ getMatchingPriceItem(slot.price_code)?.description || '-' }}
              </div>
              <div class="slot-note" :title="getMatchingPriceItem(slot.price_code)?.note || ''">
                {{ getMatchingPriceItem(slot.price_code)?.note || '-' }}
              </div>
              <button 
                class="is-room-toggle" 
                :class="{ 
                  'active': slot.is_room,
                  'disabled': !getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item
                }"
                :disabled="!getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item"
                @click.stop="handleIsRoomToggle(slot)"
                :title="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item ? '部屋モード' : 'アイテムスロットのみ有効'"
              >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
              </button>
              <select class="slot-contractor" v-model="slot.contractor_id" @click.stop @change="handleSlotUpdate(slot)">
                <option value="">依頼先</option>
                <option v-for="c in contractors" :key="c.id" :value="c.id">{{ c.label }}</option>
              </select>
              <button class="slot-delete-btn" @click.stop="removeSlotByRef(slot)">✕</button>
            </div>
            
            <!-- 2段目：アイテム数、スロットタイプ、内容、数量、オーダー数量、リクエスト数量 -->
            <div class="slot-row-2">
              <span 
                v-if="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item"
                class="slot-items-badge" 
                :class="{ 
                  'has-items': slot.items && slot.items.length > 0, 
                  'expanded': selectedSlotRight && selectedSlotRight.id === slot.id,
                  'is-item-type': true
                }"
                @click.stop="toggleSlotItemsRight(slot)"
                :title="slot.items && slot.items.length > 0 ? 'クリックでアイテム表示' : 'アイテムなし'"
              >
                {{ slot.items ? slot.items.length : 0 }}
              </span>
              <select class="slot-type" v-model="slot.estimate_slot_type_id" @click.stop @change="handleSlotTypeChange(slot)">
                <option value="">タイプ</option>
                <option v-for="type in estimateSlotTypes" :key="type.id" :value="type.id">{{ type.description }}</option>
              </select>
              <input 
                type="text" 
                class="slot-instruction"
                v-model="slot.instruction"
                placeholder="内容..."
                @click.stop
                @blur="handleSlotUpdate(slot)"
                @contextmenu="handleContextMenu($event, $event.target)"
              />
              <div class="quantity-control" :class="{ 'is-sum': getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum }">
                <button 
                  class="qty-btn clear-btn" 
                  @click.stop="clearSlotQuantity(slot)"
                  title="クリア"
                >C</button>
                <button 
                  class="qty-btn" 
                  @click.stop="decrementQuantity(slot)"
                  :disabled="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum"
                >−</button>
                <input 
                  type="text" 
                  class="slot-quantity"
                  :value="slot.quantity"
                  @input="handleQuantityInput(slot, $event)"
                  @keydown="preventInvalidQuantityInput"
                  @blur="handleSlotUpdate(slot)"
                  placeholder="数量"
                  @click.stop
                  :disabled="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum"
                  :class="{ 'is-sum': getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum }"
                  :title="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum ? 'アイテム数量の合計（自動計算）' : ''"
                />
                <button 
                  class="qty-btn" 
                  @click.stop="incrementQuantity(slot)"
                  :disabled="getSlotTypeInfo(slot.estimate_slot_type_id)?.is_sum"
                >＋</button>
              </div>
            </div>
            
            <!-- スロットアイテム表示（展開時のみ・右パネル用） -->
            <div 
              v-if="(selectedSlotRight && selectedSlotRight.id === slot.id || shouldExpandSlotRight(slot)) && (slot.items?.length > 0 || getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item)" 
              class="slot-items-expanded"
            >
              <div v-for="(item, itemIndex) in getFilteredItems(slot)" :key="item.id || itemIndex" class="slot-item-editable">
                <span class="item-number">{{ item.sort_order ?? itemIndex }}</span>
                <input 
                  type="text" 
                  class="item-location-input"
                  :class="{ 'disabled-gray': !isItemLocationCategoryEditable(item) }"
                  v-model="item.location_category"
                  @blur="handleItemUpdate(item)"
                  placeholder="場所..."
                  @contextmenu="handleContextMenu($event, $event.target)"
                />
                <input 
                  type="text" 
                  class="item-instruction-input"
                  v-model="item.instruction"
                  @blur="handleItemUpdate(item)"
                  placeholder="指示..."
                  @contextmenu="handleContextMenu($event, $event.target)"
                />
                <div class="item-quantity-control">
                  <button class="item-qty-btn clear-btn" @click.stop="clearItemQuantity(item)" :disabled="!isItemQuantityEditable(item)">C</button>
                  <button class="item-qty-btn" @click.stop="decrementItemQuantity(item)" :disabled="!isItemQuantityEditable(item)">−</button>
                  <input 
                    type="text" 
                    class="item-quantity-input"
                    :class="{ 'disabled-gray': !isItemQuantityEditable(item) }"
                    :disabled="!isItemQuantityEditable(item)"
                    :value="item.quantity"
                    @input="handleItemQuantityInput(item, $event)"
                    @blur="handleItemUpdate(item)"
                    placeholder="数量"
                  />
                  <button class="item-qty-btn" @click.stop="incrementItemQuantity(item)" :disabled="!isItemQuantityEditable(item)">＋</button>
                </div>
              </div>
              <!-- アイテム追加ボタン（フィルターがない場合のみ表示） -->
              <button 
                v-if="!filterRoomLabel && !slotSearchQuery && (!slot.items || slot.items.length < 10) && getSlotTypeInfo(slot.estimate_slot_type_id)?.is_item"
                class="add-item-btn"
                @click.stop="handleAddItem(slot)"
              >
                ＋ アイテムを追加
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
    
    <!-- 部屋ラベルモーダル -->
    <RoomLabelModal
      :is-open="showRoomLabelModal"
      :labels="roomLabels"
      @close="handleCloseRoomLabelModal"
      @save="handleSaveRoomLabels"
    />
    
    <!-- ローディングオーバーレイ -->
    <div v-if="savingRoomLabels" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">部屋ラベルを保存中...</div>
    </div>
    
    <!-- スニペットコンテキストメニュー -->
    <SnippetContextMenu
      :is-open="showSnippetContextMenu"
      :position="snippetContextMenuPosition"
      :snippet-groups="snippetGroups"
      :snippet-items-by-group="snippetItemsByGroup"
      :custom-snippets="customSnippets"
      :no-newline="true"
      @close="showSnippetContextMenu = false"
      @insert-snippet="handleInsertSnippet"
      @add-custom-snippet="handleAddCustomSnippet"
      @copy="handleSnippetCopy"
      @cut="handleSnippetCut"
      @paste="handleSnippetPaste"
    />
    
    <!-- カスタム文字列追加モーダル -->
    <CustomSnippetModal
      :is-open="showCustomSnippetModal"
      :initial-text="snippetSelectedText"
      :snippet-groups="snippetGroups"
      @close="showCustomSnippetModal = false"
      @add="handleAddCustomSnippetSubmit"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabaseService } from '../services/supabase'
import RoomLabelModal from './RoomLabelModal.vue'
import SnippetContextMenu from './SnippetContextMenu.vue'
import CustomSnippetModal from './CustomSnippetModal.vue'

const props = defineProps({
  workId: {
    type: String,
    default: ''
  }
})

// デバッグ用：workIdを監視
console.log('[EstimateEditor] Component created with workId:', props.workId)

// 状態
const loading = ref(false) // 見積スロット用
const priceListLoading = ref(false) // プライスリスト用
const savingRoomLabels = ref(false) // 部屋ラベル保存中
const error = ref(null)
const priceListError = ref(null)
const priceLists = ref([])
const selectedPriceListId = ref('')
const priceListItems = ref([])
const searchQuery = ref('')
const isDragOver = ref(false)
const draggingItem = ref(null)
const expandedItemId = ref(null)
const dropTargetSlotId = ref(null)

// 見積スロット検索・絞り込み
const slotSearchQuery = ref('')
const filterHasQuantity = ref(false)
const filterContractorId = ref('')
const filterRoomLabel = ref('') // 部屋ラベルフィルター

// 検索結果でアイテムにマッチしたスロットIDのセット（展開表示用）
const slotsWithMatchedItems = ref(new Set())

// 右パネルモード（'search' or 'comparison'）
const rightPanelMode = ref('search')

// 請求比較関連
const comparisonData = ref([])
const comparisonLoading = ref(false)
const draggingComparisonItem = ref(null)

// カテゴリーフィルター
const selectedBigCategory = ref('')
const selectedSmallCategory = ref('')

// 見積スロット
const estimateSlots = ref([])

// 選択中の見積スロット（左パネル用）
const selectedSlotLeft = ref(null)
// 選択中の見積スロット（右パネル用）
const selectedSlotRight = ref(null)

// 見積スロットパネルの拡大状態
const isExpandedSlots = ref(false)

// 依頼先グループ表示
const groupByContractor = ref(false)

// スロット並び替え用
const draggingSlot = ref(null)
const isInputFocused = ref(false) // インプットフォーカス中はドラッグ無効

// 依頼先（テンプレート業者）
const contractors = ref([])

// 見積スロットタイプ
const estimateSlotTypes = ref([])

// Work情報（company_id取得用）
const workData = ref(null)

// 部屋ラベルモーダル
const showRoomLabelModal = ref(false)
const roomLabels = ref([])
const roomLabelsBackup = ref([]) // モーダルキャンセル時の復元用
const roomLabelsFromDB = ref(false) // データベースに保存されているかどうか

// 部屋ラベルがデータベースに保存されているかどうか
const hasRoomLabels = computed(() => {
  return roomLabelsFromDB.value
})

// カスタム文字列（スニペット）関連
const customSnippets = ref([])
const snippetGroups = ref([])
const snippetItemsByGroup = ref({})
const showSnippetContextMenu = ref(false)
const snippetContextMenuPosition = ref({ x: 0, y: 0 })
const snippetTargetInput = ref(null) // 挿入先のinput/textarea要素
const snippetSavedSelection = ref({ start: 0, end: 0 })
const snippetSelectedText = ref('') // カスタム文字列追加用の選択テキスト
const showCustomSnippetModal = ref(false)

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
      item.note?.toLowerCase().includes(query)
    )
  }
  
  return items
})

// 区分変更時に大分類をリセット
function handleBigCategoryChange() {
  selectedSmallCategory.value = ''
}

// フィルタリングされた見積スロット
const filteredEstimateSlots = computed(() => {
  let slots = estimateSlots.value
  const matchedItemsSet = new Set()
  
  const query = slotSearchQuery.value.trim().toLowerCase()
  const roomLabel = filterRoomLabel.value
  
  // 部屋ラベルフィルター（AND検索）
  if (roomLabel) {
    slots = slots.filter(slot => {
      // スロットアイテムのlocation_categoryに部屋ラベルが含まれるか
      const hasMatchingItem = slot.items?.some(item => 
        item.location_category?.includes(roomLabel)
      )
      if (hasMatchingItem) {
        matchedItemsSet.add(slot.id)
      }
      return hasMatchingItem
    })
  }
  
  // テキスト検索（description, note, instruction, スロットアイテムのlocation_category, instruction）
  if (query) {
    slots = slots.filter(slot => {
      // プライスリストから取得したdescription, note
      const priceItem = getMatchingPriceItem(slot.price_code)
      const description = priceItem?.description?.toLowerCase() || ''
      const note = priceItem?.note?.toLowerCase() || ''
      
      // スロット自体のinstruction
      const instruction = slot.instruction?.toLowerCase() || ''
      
      // スロット本体にマッチ
      const slotMatch = description.includes(query) || 
                        note.includes(query) || 
                        instruction.includes(query)
      
      // スロットアイテムのlocation_category, instruction
      const itemsMatch = slot.items?.some(item => 
        item.location_category?.toLowerCase().includes(query) ||
        item.instruction?.toLowerCase().includes(query)
      )
      
      // アイテムにマッチした場合はセットに追加
      if (itemsMatch) {
        matchedItemsSet.add(slot.id)
      }
      
      return slotMatch || itemsMatch
    })
  }
  
  // 数量ありフィルター
  if (filterHasQuantity.value) {
    slots = slots.filter(slot => slot.quantity != null && slot.quantity !== '')
  }
  
  // 依頼先フィルター
  if (filterContractorId.value) {
    slots = slots.filter(slot => slot.contractor_id === filterContractorId.value)
  }
  
  // マッチしたアイテムのセットを更新
  slotsWithMatchedItems.value = matchedItemsSet
  
  return slots
})

// フィルタリングされたスロットアイテム（部屋ラベルとテキスト検索にマッチしたもののみ）
function getFilteredItems(slot) {
  if (!slot.items || slot.items.length === 0) return []
  
  const query = slotSearchQuery.value.trim().toLowerCase()
  const roomLabel = filterRoomLabel.value
  
  // フィルターがない場合は全件返す
  if (!query && !roomLabel) return slot.items
  
  return slot.items.filter(item => {
    let matches = true
    
    // 部屋ラベルフィルター
    if (roomLabel) {
      matches = matches && item.location_category?.includes(roomLabel)
    }
    
    // テキスト検索
    if (query) {
      const locationMatch = item.location_category?.toLowerCase().includes(query)
      const instructionMatch = item.instruction?.toLowerCase().includes(query)
      matches = matches && (locationMatch || instructionMatch)
    }
    
    return matches
  })
}

// スロットがアイテムマッチで展開されるべきか（右パネル用）
function shouldExpandSlotRight(slot) {
  // 部屋ラベルフィルターまたはテキスト検索でアイテムにマッチした場合は展開
  return slotsWithMatchedItems.value.has(slot.id)
}

// 元のスロットインデックスを取得
function getOriginalSlotIndex(slot) {
  return estimateSlots.value.findIndex(s => s === slot || s.id === slot.id)
}

// フィルターをリセット
function resetSlotFilters() {
  slotSearchQuery.value = ''
  filterHasQuantity.value = false
  filterContractorId.value = ''
  filterRoomLabel.value = ''
}

// ========================================
// 請求比較関連
// ========================================

// 比較実行
async function executeComparison() {
  if (!props.workId) {
    alert('ワークIDが設定されていません')
    return
  }
  
  comparisonLoading.value = true
  try {
    const result = await supabaseService.executeBillingComparison(props.workId)
    comparisonData.value = result.comparisons || []
    console.log('[比較実行] 結果:', result)
  } catch (err) {
    console.error('比較実行エラー:', err)
    alert('比較の実行に失敗しました: ' + err.message)
  } finally {
    comparisonLoading.value = false
  }
}

// 比較データ保存
async function saveComparison() {
  if (!props.workId || comparisonData.value.length === 0) return
  
  try {
    const items = comparisonData.value.map(item => ({
      external_code: item.external_code,
      aggregated_quantity: item.aggregated_quantity,
      billing_quantity: item.billing_quantity,
      billing_sort_order: item.billing_sort_order,
      request_quantity: item.request_quantity,
      status: item.status
    }))
    
    await supabaseService.saveBillingComparisons(props.workId, items)
    alert('比較データを保存しました')
  } catch (err) {
    console.error('比較データ保存エラー:', err)
    alert('保存に失敗しました: ' + err.message)
  }
}

// 比較データリフレッシュ（全削除）
async function refreshComparison() {
  if (!props.workId) return
  
  if (!confirm('比較データをリセットしますか？\n入力済みの修正数量は全て削除されます。')) {
    return
  }
  
  try {
    await supabaseService.refreshBillingComparisons(props.workId)
    comparisonData.value = []
    alert('比較データをリセットしました')
  } catch (err) {
    console.error('比較データリフレッシュエラー:', err)
    alert('リセットに失敗しました: ' + err.message)
  }
}

// 比較アイテムの修正数量入力（半角数字とドットのみ許可）
function handleComparisonRequestInput(item, event) {
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
}

// 比較アイテムの修正数量変更（blur時）
function handleComparisonRequestChange(item, value) {
  const numValue = value === '' ? null : parseFloat(value)
  if (isNaN(numValue) && value !== '') return
  
  item.request_quantity = numValue
}

// 修正数量インクリメント
function incrementComparisonQuantity(item) {
  item.request_quantity = (item.request_quantity || 0) + 1
}

// 修正数量デクリメント
function decrementComparisonQuantity(item) {
  item.request_quantity = Math.max(0, (item.request_quantity || 0) - 1)
}

// 修正数量クリア
function clearComparisonQuantity(item) {
  item.request_quantity = null
}

// 見積数量を修正数量に適用
function applyEstimateQuantity(item) {
  if (item.aggregated_quantity !== null) {
    item.request_quantity = item.aggregated_quantity
    // 見積スロット一覧で同じ単価コードにスクロール
    scrollToSlotByCode(item.external_code)
  }
}

// 単価コードでスロットにスクロール
function scrollToSlotByCode(code) {
  const slot = estimateSlots.value.find(s => s.price_code === code)
  if (slot) {
    // 左パネルのスロットリストでスクロール
    const slotElement = document.querySelector(`[data-slot-id="${slot.id}"]`)
    if (slotElement) {
      slotElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // 選択状態にする
      selectedSlotLeft.value = slot
    }
  }
}

// 比較アイテムのクラスを計算
function getComparisonItemClass(item) {
  const classes = {}
  
  // ドラッグ中
  if (draggingComparisonItem.value === item) {
    classes['is-dragging-comparison'] = true
  }
  
  // 一致している場合（グレー）
  if (item.is_match === true) {
    classes['is-match'] = true
    return classes
  }
  
  // 追加候補（見積のみ）- オレンジ枠
  if (item.status === 'pending_add') {
    classes['is-pending'] = true
    return classes
  }
  
  // 新規（請求のみ）
  if (item.status === 'new_from_billing') {
    classes['is-new'] = true
    return classes
  }
  
  // 両方に数量があるが一致していない - 青枠
  if (item.aggregated_quantity !== null && item.billing_quantity !== null && !item.is_match) {
    classes['is-mismatch'] = true
  }
  
  return classes
}

// 比較アイテムクリック時（ボタン・インプット以外）
function handleComparisonItemClick(item, event) {
  // ボタンやインプット、ドラッグハンドルをクリックした場合は何もしない
  const target = event.target
  if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.classList.contains('comp-drag-handle')) {
    return
  }
  // 見積スロットにスクロール
  if (item.external_code) {
    scrollToSlotByCode(item.external_code)
  }
}

// 比較アイテムのドラッグ開始
function handleComparisonDragStart(event, item) {
  draggingComparisonItem.value = item
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'comparison-item',
    external_code: item.external_code,
    quantity: item.request_quantity || item.aggregated_quantity || 0,
    billing_description: item.billing_description,
    estimate_instruction: item.estimate_instruction
  }))
}

// 比較アイテムのドラッグ終了
function handleComparisonDragEnd() {
  draggingComparisonItem.value = null
}

// 既存の比較データを読み込み
async function loadComparisonData() {
  if (!props.workId) return
  
  try {
    const result = await supabaseService.getBillingComparisons(props.workId)
    if (result.comparisons && result.comparisons.length > 0) {
      // 既存データがある場合は読み込み、is_matchを計算
      comparisonData.value = result.comparisons.map(item => ({
        ...item,
        is_match: item.aggregated_quantity !== null && 
                  item.billing_quantity !== null && 
                  item.aggregated_quantity === item.billing_quantity,
        slots: [] // 既存データにはslotsがないので空配列
      }))
    }
  } catch (err) {
    console.error('比較データ読み込みエラー:', err)
  }
}

// workIdの変更を監視
watch(() => props.workId, async (newWorkId, oldWorkId) => {
  console.log('[EstimateEditor] workId changed from', oldWorkId, 'to', newWorkId)
  if (newWorkId) {
    await loadWorkData()
    if (workData.value?.company_id) {
      loadContractors(workData.value.company_id)
      loadEstimateSlotTypes(workData.value.company_id)
    }
    // 部屋ラベルを読み込み
    loadRoomLabels()
    // 比較データを読み込み
    loadComparisonData()
    // 比較モードの場合は検索モードに戻す
    rightPanelMode.value = 'search'
    comparisonData.value = []
  }
}, { immediate: false })

onMounted(async () => {
  console.log('[EstimateEditor] onMounted with workId:', props.workId)
  await loadWorkData()
  loadPriceLists()
  if (workData.value?.company_id) {
    loadContractors(workData.value.company_id)
    loadEstimateSlotTypes(workData.value.company_id)
  }
  // 部屋ラベルを読み込み
  if (props.workId) {
    loadRoomLabels()
  }
  // カスタム文字列を読み込み
  loadCustomSnippets()
  // 初回読み込みは手動で更新ボタンを押してもらう
})

// 部屋ラベルを読み込み
async function loadRoomLabels() {
  if (!props.workId) return
  
  try {
    const result = await supabaseService.getRoomLabels(props.workId)
    roomLabels.value = result.room_labels || []
    // from_templateがtrueの場合はDBに保存されていない（テンプレートから取得）
    roomLabelsFromDB.value = !result.from_template
    console.log('[EstimateEditor] loadRoomLabels: Loaded', roomLabels.value.length, 'labels, fromDB:', roomLabelsFromDB.value)
  } catch (err) {
    console.error('[EstimateEditor] loadRoomLabels: Failed:', err)
    roomLabels.value = []
    roomLabelsFromDB.value = false
  }
}

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

async function loadWorkData() {
  if (!props.workId) {
    console.warn('[EstimateEditor] loadWorkData: No workId')
    return
  }
  
  console.log('[EstimateEditor] loadWorkData: Starting with workId:', props.workId)
  try {
    const result = await supabaseService.getWorkDetails(props.workId)
    console.log('[EstimateEditor] loadWorkData: Result:', result)
    if (result.work) {
      workData.value = result.work
      console.log('[EstimateEditor] loadWorkData: company_id =', workData.value.company_id)
    } else {
      console.warn('[EstimateEditor] loadWorkData: No work data in result')
    }
  } catch (err) {
    console.error('[EstimateEditor] loadWorkData: Failed to load work data:', err)
  }
}

async function loadPriceLists() {
  try {
    // 年度指定なしで全てのlargeプライスリストを取得
    const result = await supabaseService.getPriceLists(null, 'large')
    priceLists.value = result.price_lists || []
    
    // 最初のプライスリストを自動選択
    if (priceLists.value.length > 0 && !selectedPriceListId.value) {
      selectedPriceListId.value = priceLists.value[0].id
      loadPriceListItems()
    }
  } catch (err) {
    console.error('Failed to load price lists:', err)
    error.value = 'プライスリストの読み込みに失敗しました'
  }
}

async function loadContractors(companyId) {
  console.log('[EstimateEditor] loadContractors: Starting with companyId:', companyId)
  try {
    const data = await supabaseService.getContractors(companyId)
    contractors.value = data
    console.log('[EstimateEditor] loadContractors: Loaded', contractors.value.length, 'contractors')
  } catch (err) {
    console.error('[EstimateEditor] loadContractors: Failed:', err)
  }
}

async function loadEstimateSlotTypes(companyId) {
  console.log('[EstimateEditor] loadEstimateSlotTypes: Starting with companyId:', companyId)
  try {
    const data = await supabaseService.getEstimateSlotTypes(companyId)
    estimateSlotTypes.value = data
    console.log('[EstimateEditor] loadEstimateSlotTypes: Loaded', estimateSlotTypes.value.length, 'slot types')
  } catch (err) {
    console.error('[EstimateEditor] loadEstimateSlotTypes: Failed:', err)
  }
}

async function loadEstimateSlots() {
  if (!props.workId) {
    console.warn('loadEstimateSlots: workId is missing')
    return
  }
  
  console.log('loadEstimateSlots: Starting with workId:', props.workId)
  loading.value = true
  error.value = null
  
  try {
    const result = await supabaseService.getEstimateSlots(props.workId)
    console.log('loadEstimateSlots: Raw result:', result)
    estimateSlots.value = result.slots || []
    console.log('loadEstimateSlots: Loaded slots count:', estimateSlots.value.length)
  } catch (err) {
    console.error('loadEstimateSlots: Failed to load estimate slots:', err)
    error.value = '見積スロットの読み込みに失敗しました: ' + (err.message || err)
  } finally {
    loading.value = false
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
  
  priceListLoading.value = true
  priceListError.value = null
  try {
    const result = await supabaseService.getPriceListItems(selectedPriceListId.value)
    priceListItems.value = result.items || []
  } catch (err) {
    console.error('Failed to load price list items:', err)
    priceListError.value = 'アイテムの読み込みに失敗しました'
  } finally {
    priceListLoading.value = false
  }
}

function formatPrice(price) {
  if (price == null) return '-'
  return Number(price).toLocaleString()
}

// ドラッグ操作
function handleDragStart(event, item) {
  draggingItem.value = item
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('text/plain', JSON.stringify(item))
  // ドラッグ開始時は展開状態をクリア
  expandedItemId.value = null
}

function handleDragEnd() {
  draggingItem.value = null
  isDragOver.value = false
}

// スロット並び替え用ドラッグ操作
function handleSlotDragStartForReorder(event, slot, index) {
  // インプットフォーカス中はドラッグを無効化
  if (isInputFocused.value) {
    event.preventDefault()
    return
  }
  // プライスリストアイテムのドラッグと区別するためにフラグを設定
  draggingSlot.value = { slot, index }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/x-slot-reorder', JSON.stringify({ slotId: slot.id, index }))
  // 展開状態をクリア
  selectedSlotLeft.value = null
}

// インプットフォーカス管理
function handleInputFocus() {
  isInputFocused.value = true
}

function handleInputBlur() {
  isInputFocused.value = false
}

function handleSlotDragEndForReorder() {
  draggingSlot.value = null
}

function handleSlotDragOverForReorder(event, slot, index) {
  // プライスリストアイテムのドラッグ中は無視
  if (draggingItem.value) return
  // 自分自身へのドラッグは無視
  if (draggingSlot.value && draggingSlot.value.slot.id === slot.id) return
  if (!draggingSlot.value) return
}

async function handleSlotDropForReorder(event, targetSlot, targetIndex) {
  event.preventDefault()
  
  // プライスリストアイテムのドロップの場合は既存の処理に任せる
  if (draggingItem.value) return
  
  if (!draggingSlot.value || draggingSlot.value.slot.id === targetSlot.id) {
    return
  }
  
  const sourceSlot = draggingSlot.value.slot
  const sourceIndex = draggingSlot.value.index
  
  // 並び替えを実行
  await reorderSlot(sourceSlot, sourceIndex, targetSlot, targetIndex)
  
  // 状態をリセット
  draggingSlot.value = null
}

// 最大sort_orderを取得
function getMaxSortOrder() {
  if (estimateSlots.value.length === 0) return 0
  return Math.max(...estimateSlots.value.map(s => s.sort_order || 0))
}

// 次のsort_orderを計算（最大値 + 10000）
function getNextSortOrder() {
  return getMaxSortOrder() + 10000
}

// sort_orderをリバランス（10000区切りで再設定）
async function rebalanceSortOrders() {
  const slots = estimateSlots.value
  const updates = []
  
  slots.forEach((slot, idx) => {
    const newSortOrder = (idx + 1) * 10000
    if (slot.sort_order !== newSortOrder) {
      slot.sort_order = newSortOrder
      if (slot.id) {
        updates.push({
          id: slot.id,
          work_id: props.workId,
          sort_order: newSortOrder
        })
      }
    }
  })
  
  // サーバーに更新を送信
  if (updates.length > 0) {
    console.log('[EstimateEditor] Rebalancing sort_orders:', updates.length, 'slots')
    try {
      for (const update of updates) {
        await supabaseService.upsertEstimateSlot(update)
      }
    } catch (err) {
      console.error('[EstimateEditor] Failed to rebalance sort_orders:', err)
      await loadEstimateSlots()
    }
  }
}

async function reorderSlot(sourceSlot, sourceIndex, targetSlot, targetIndex) {
  const slots = estimateSlots.value
  
  // 下から持ってきたら上に配置、上から持ってきたら下に配置
  // sourceIndex > targetIndex: 下から上へ移動 → 上に配置 (before)
  // sourceIndex < targetIndex: 上から下へ移動 → 下に配置 (after)
  const actualPosition = sourceIndex > targetIndex ? 'before' : 'after'
  
  // 新しいsort_orderを計算
  let newSortOrder
  let needsRebalance = false
  
  if (actualPosition === 'before') {
    // ターゲットの上に配置
    const targetSortOrder = targetSlot.sort_order || 10000
    const prevSlot = targetIndex > 0 ? slots[targetIndex - 1] : null
    const prevSortOrder = prevSlot ? (prevSlot.sort_order || 0) : 0
    
    // 間のsort_orderを計算
    const gap = targetSortOrder - prevSortOrder
    if (gap < 100) {
      needsRebalance = true
    } else {
      newSortOrder = Math.floor(prevSortOrder + gap / 2)
    }
  } else {
    // ターゲットの下に配置
    const targetSortOrder = targetSlot.sort_order || 10000
    const nextSlot = targetIndex < slots.length - 1 ? slots[targetIndex + 1] : null
    
    if (!nextSlot) {
      // 一番下に配置
      newSortOrder = targetSortOrder + 10000
    } else {
      const nextSortOrder = nextSlot.sort_order || (targetSortOrder + 20000)
      const gap = nextSortOrder - targetSortOrder
      if (gap < 100) {
        needsRebalance = true
      } else {
        newSortOrder = Math.floor(targetSortOrder + gap / 2)
      }
    }
  }
  
  // リバランスが必要な場合
  if (needsRebalance) {
    // まずローカル配列を並び替え
    const [removed] = slots.splice(sourceIndex, 1)
    let insertIndex = actualPosition === 'before' ? targetIndex : targetIndex + 1
    if (sourceIndex < insertIndex) insertIndex -= 1
    slots.splice(insertIndex, 0, removed)
    
    // リバランス実行
    await rebalanceSortOrders()
    return
  }
  
  // sort_orderを更新
  sourceSlot.sort_order = newSortOrder
  
  // ローカル配列を並び替え（sort_order順にソート）
  estimateSlots.value = [...slots].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  
  // サーバーに更新を送信
  try {
    await supabaseService.upsertEstimateSlot({
      id: sourceSlot.id,
      work_id: props.workId,
      sort_order: sourceSlot.sort_order
    })
    console.log('[EstimateEditor] Slot reordered:', sourceSlot.id, 'new sort_order:', sourceSlot.sort_order)
  } catch (err) {
    console.error('[EstimateEditor] Failed to update slot order:', err)
    await loadEstimateSlots()
  }
}

function toggleItemExpand(itemId) {
  // 同じアイテムをクリックした場合は閉じる、違うアイテムなら開く
  expandedItemId.value = expandedItemId.value === itemId ? null : itemId
}

function handleDragOver() {
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

// 既存スロットへのドラッグオーバー
function handleSlotDragOver(slot) {
  dropTargetSlotId.value = slot.id
}

function handleSlotDragLeave() {
  dropTargetSlotId.value = null
}

// 既存スロットへのドロップ（単価コードのみ上書き）
function handleSlotDrop(event, slot) {
  dropTargetSlotId.value = null
  isDragOver.value = false
  const data = event.dataTransfer.getData('text/plain')
  if (data) {
    try {
      const item = JSON.parse(data)
      // 単価コードのみ上書き
      slot.price_code = item.external_code || ''
      // 比較アイテムからのドロップの場合は数量も設定
      if (item.type === 'comparison-item' && item.quantity) {
        slot.quantity = item.quantity
      }
      // 更新を送信
      handleSlotUpdate(slot)
    } catch (err) {
      console.error('Failed to parse drop data:', err)
    }
  }
}

function handleDrop(event) {
  isDragOver.value = false
  dropTargetSlotId.value = null
  const data = event.dataTransfer.getData('text/plain')
  if (data) {
    try {
      const item = JSON.parse(data)
      // 新しい見積スロットを作成（sort_orderは最大値 + 10000）
      const newSlot = {
        id: null, // 保存時にUUID生成
        work_id: props.workId,
        estimate_slot_type_id: '',
        instruction: item.type === 'comparison-item' 
          ? (item.billing_description || item.estimate_instruction || '') 
          : (item.description || ''),
        quantity: item.type === 'comparison-item' ? (item.quantity || 1) : 1,
        contractor_id: '',
        price_code: item.external_code || '',
        sort_order: getNextSortOrder(),
        items: []
      }
      estimateSlots.value.push(newSlot)
      // サーバーに保存
      handleSlotUpdate(newSlot)
    } catch (err) {
      console.error('Failed to parse dropped item:', err)
    }
  }
}

async function removeSlot(index) {
  const removedSlot = estimateSlots.value[index]
  
  // サーバーに削除リクエストを送信（IDがある場合のみ）
  if (removedSlot?.id) {
    try {
      await supabaseService.deleteEstimateSlot(removedSlot.id)
      console.log('Slot deleted successfully:', removedSlot.id)
    } catch (err) {
      console.error('Failed to delete slot:', err)
      alert('スロットの削除に失敗しました: ' + err.message)
      return
    }
  }
  
  // ローカルから削除
  estimateSlots.value.splice(index, 1)
  
  // 削除したスロットが選択中だった場合、選択を解除
  if (selectedSlotLeft.value && selectedSlotLeft.value.id === removedSlot?.id) {
    selectedSlotLeft.value = null
  }
  if (selectedSlotRight.value && selectedSlotRight.value.id === removedSlot?.id) {
    selectedSlotRight.value = null
  }
}

// スロット参照で削除（右パネル用）
async function removeSlotByRef(slot) {
  const index = estimateSlots.value.findIndex(s => s === slot || s.id === slot.id)
  if (index !== -1) {
    await removeSlot(index)
  }
}

// 数量変更のデバウンスタイマー
const quantityUpdateTimers = new Map()

// 数量の増減
function incrementQuantity(slot) {
  slot.quantity = (parseFloat(slot.quantity) || 0) + 1
  scheduleSlotUpdate(slot)
}

function decrementQuantity(slot) {
  const current = parseFloat(slot.quantity) || 0
  slot.quantity = Math.max(0, current - 1)
  scheduleSlotUpdate(slot)
}

function clearSlotQuantity(slot) {
  slot.quantity = null
  scheduleSlotUpdate(slot)
}

// デバウンス付きスロット更新（500ms後に送信）
function scheduleSlotUpdate(slot) {
  const slotId = slot.id || 'new'
  
  // 既存のタイマーをクリア
  if (quantityUpdateTimers.has(slotId)) {
    clearTimeout(quantityUpdateTimers.get(slotId))
  }
  
  // 新しいタイマーをセット
  const timer = setTimeout(() => {
    handleSlotUpdate(slot)
    quantityUpdateTimers.delete(slotId)
  }, 500)
  
  quantityUpdateTimers.set(slotId, timer)
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
function handleQuantityInput(slot, event) {
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
  slot.quantity = value ? parseFloat(value) : null
}

// 新しい見積スロットを追加
function addNewSlot() {
  const newSlot = {
    id: null,
    work_id: props.workId,
    estimate_slot_type_id: '',
    instruction: '',
    quantity: null,
    contractor_id: '',
    price_code: '',
    sort_order: getNextSortOrder(),
    items: []
  }
  estimateSlots.value.push(newSlot)
  // サーバーに保存
  handleSlotUpdate(newSlot)
}

// スロットアイテムの展開/折りたたみをトグル（左パネル用）
function toggleSlotItemsLeft(slot) {
  if (selectedSlotLeft.value && selectedSlotLeft.value.id === slot.id) {
    selectedSlotLeft.value = null
  } else {
    selectedSlotLeft.value = slot
  }
}

// スロットアイテムの展開/折りたたみをトグル（右パネル用）
function toggleSlotItemsRight(slot) {
  if (selectedSlotRight.value && selectedSlotRight.value.id === slot.id) {
    selectedSlotRight.value = null
  } else {
    selectedSlotRight.value = slot
  }
}

// 見積スロットパネルの拡大/縮小をトグル
function toggleExpandSlots() {
  isExpandedSlots.value = !isExpandedSlots.value
}

// 依頼先でグループ化されたスロット
const groupedSlotsByContractor = computed(() => {
  if (!groupByContractor.value) return null
  
  const groups = new Map()
  
  // 「未設定」グループを先に作成
  groups.set('', { contractorId: '', contractorLabel: '未設定', slots: [] })
  
  // 各依頼先のグループを作成
  contractors.value.forEach(c => {
    groups.set(c.id, { contractorId: c.id, contractorLabel: c.label, slots: [] })
  })
  
  // スロットを振り分け（元のインデックスを保持）
  estimateSlots.value.forEach((slot, originalIndex) => {
    const contractorId = slot.contractor_id || ''
    if (groups.has(contractorId)) {
      groups.get(contractorId).slots.push({ slot, originalIndex })
    } else {
      // 未知の依頼先は「未設定」に
      groups.get('').slots.push({ slot, originalIndex })
    }
  })
  
  // スロットがあるグループのみ返す
  return Array.from(groups.values()).filter(g => g.slots.length > 0)
})

// 単価コードから一致するプライスリストアイテムを取得
function getMatchingPriceItem(priceCode) {
  if (!priceCode) return null
  return priceListItems.value.find(item => item.external_code === priceCode)
}

// 単価コード入力時の処理（半角英大文字と半角数字のみ許可）
function handlePriceCodeInput(slot, event) {
  let value = event.target.value
  // 全角英字を半角に変換
  value = value.replace(/[Ａ-Ｚａ-ｚ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
  // 全角数字を半角に変換
  value = value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
  // 小文字を大文字に変換
  value = value.toUpperCase()
  // 半角英大文字と半角数字以外を除去
  value = value.replace(/[^A-Z0-9]/g, '')
  slot.price_code = value
}

// スロットアイテムの数量入力（半角数字と小数点のみ許可）
function handleItemQuantityInput(item, event) {
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

// スロットアイテムの更新
async function handleItemUpdate(item) {
  if (!item.id) {
    console.warn('Item has no ID, skipping update')
    return
  }
  
  try {
    await supabaseService.upsertEstimateSlotItem({
      id: item.id,
      estimate_slot_id: item.estimate_slot_id,
      location_category: item.location_category,
      instruction: item.instruction,
      quantity: item.quantity
    })
    console.log('Item updated successfully:', item.id)
    
    // is_sumがtrueの場合、スロットの数量を更新
    await updateSlotSumQuantity(item.estimate_slot_id)
  } catch (err) {
    console.error('Failed to update item:', err)
    alert('アイテムの更新に失敗しました: ' + err.message)
  }
}

// is_sumスロットの数量をアイテム合計で更新
async function updateSlotSumQuantity(estimateSlotId) {
  // 該当するスロットを探す
  const slot = estimateSlots.value.find(s => s.id === estimateSlotId)
  if (!slot) return
  
  // スロットタイプがis_sumでなければ何もしない
  const slotTypeInfo = getSlotTypeInfo(slot.estimate_slot_type_id)
  if (!slotTypeInfo?.is_sum) return
  
  // アイテムの数量合計を計算
  const sumQuantity = (slot.items || []).reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    return sum + qty
  }, 0)
  
  // スロットの数量を更新
  slot.quantity = sumQuantity || null
  
  // サーバーに保存
  await handleSlotUpdate(slot)
  console.log('[updateSlotSumQuantity] Updated slot quantity to:', sumQuantity)
}

// スロットアイテムの数量を増やす
function incrementItemQuantity(item) {
  item.quantity = (parseFloat(item.quantity) || 0) + 1
  handleItemUpdate(item)
}

// スロットアイテムの数量を減らす
function decrementItemQuantity(item) {
  const current = parseFloat(item.quantity) || 0
  item.quantity = Math.max(0, current - 1)
  handleItemUpdate(item)
}

// スロットアイテムの数量をクリア
function clearItemQuantity(item) {
  item.quantity = null
  handleItemUpdate(item)
}

// スロットタイプ情報を取得
function getSlotTypeInfo(slotTypeId) {
  if (!slotTypeId) return null
  // IDを文字列に変換して比較（数値とUUIDの両方に対応）
  const slotTypeIdStr = String(slotTypeId)
  return estimateSlotTypes.value.find(type => String(type.id) === slotTypeIdStr)
}

// アイテムが属するスロットを取得
function getSlotForItem(item) {
  return estimateSlots.value.find(slot => 
    slot.items && slot.items.some(i => i.id === item.id)
  )
}

// アイテムのquantity編集が可能かどうか
function isItemQuantityEditable(item) {
  const slot = getSlotForItem(item)
  if (!slot) return true // スロットが見つからない場合はデフォルトで編集可能
  const slotType = getSlotTypeInfo(slot.estimate_slot_type_id)
  return slotType?.is_editting_item_quantity !== false
}

// アイテムのlocation_category編集が可能かどうか（グレー表示のみ、編集は可）
function isItemLocationCategoryEditable(item) {
  const slot = getSlotForItem(item)
  if (!slot) return true // スロットが見つからない場合はデフォルトで編集可能
  const slotType = getSlotTypeInfo(slot.estimate_slot_type_id)
  return slotType?.is_editting_item_location_category !== false
}

// スロットタイプ変更時の処理
async function handleSlotTypeChange(slot) {
  console.log('[handleSlotTypeChange] slot.estimate_slot_type_id:', slot.estimate_slot_type_id)
  console.log('[handleSlotTypeChange] estimateSlotTypes:', estimateSlotTypes.value)
  
  const slotTypeInfo = getSlotTypeInfo(slot.estimate_slot_type_id)
  console.log('[handleSlotTypeChange] slotTypeInfo:', slotTypeInfo)
  
  if (!slotTypeInfo) {
    // タイプがクリアされた場合、展開を閉じる
    console.log('[handleSlotTypeChange] No slot type info found, closing expansion')
    if (selectedSlotLeft.value?.id === slot.id) {
      selectedSlotLeft.value = null
    }
    if (selectedSlotRight.value?.id === slot.id) {
      selectedSlotRight.value = null
    }
    return
  }
  
  console.log('[handleSlotTypeChange] is_item:', slotTypeInfo.is_item)
  
  // is_itemがtrueの場合：バッジを強調表示（CSSで対応済み）し、スロットを展開
  if (slotTypeInfo.is_item) {
    // スロットを展開して表示
    selectedSlotLeft.value = slot
    selectedSlotRight.value = slot
  } else {
    // is_itemがfalseの場合：展開を閉じる
    if (selectedSlotLeft.value?.id === slot.id) {
      selectedSlotLeft.value = null
    }
    if (selectedSlotRight.value?.id === slot.id) {
      selectedSlotRight.value = null
    }
  }
  
  // is_room処理は削除（is_roomチェックボックスで制御するため）
  
  // is_sumがtrueの場合、アイテム数量の合計を計算してスロットの数量に設定
  if (slotTypeInfo.is_sum && slot.items && slot.items.length > 0) {
    const sumQuantity = slot.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      return sum + qty
    }, 0)
    slot.quantity = sumQuantity || null
    console.log('[handleSlotTypeChange] is_sum: calculated quantity =', sumQuantity)
  }
  
  // スロットをサーバーに保存
  await handleSlotUpdate(slot)
}

// is_roomチェックボックスのトグル処理
async function handleIsRoomToggle(slot) {
  // is_roomの状態を切り替え
  slot.is_room = !slot.is_room
  
  console.log('[handleIsRoomToggle] is_room:', slot.is_room)
  
  if (slot.is_room) {
    // チェックON: 部屋ラベルでアイテム生成
    if (!slot.items) {
      slot.items = []
    }
    
    // 既にsort_order 0〜9のアイテムが全て存在する場合は何もしない
    const maxSortOrder = slot.items.reduce((max, item) => Math.max(max, item.sort_order ?? -1), -1)
    if (maxSortOrder >= 9) {
      console.log('[handleIsRoomToggle] Already has items with sort_order >= 9, skipping room creation')
      // スロットを展開して表示するだけ
      selectedSlotLeft.value = slot
      selectedSlotRight.value = slot
      // スロットをサーバーに保存
      await handleSlotUpdate(slot)
      return
    }
    
    // 部屋ラベルを取得
    let currentRoomLabels = roomLabels.value
    if (currentRoomLabels.length === 0 && props.workId) {
      try {
        const result = await supabaseService.getRoomLabels(props.workId)
        currentRoomLabels = result.room_labels || []
        roomLabels.value = currentRoomLabels
      } catch (err) {
        console.error('Failed to load room labels:', err)
      }
    }
    
    // アイテムが無い場合：sort_order 0～9を作成
    if (slot.items.length === 0) {
      await createRoomItemsForSlot(slot, currentRoomLabels)
    } else {
      // アイテムがある場合：確認ダイアログを表示
      const overwrite = confirm('既存のアイテムがあります。部屋ラベルで上書きしますか？\n\n「OK」: 上書き\n「キャンセル」: 不足分のみ追加')
      if (overwrite) {
        // 上書き：既存アイテムのlocation_categoryを更新
        await updateRoomLabelsForSlot(slot, currentRoomLabels)
      } else {
        // 不足分のみ追加
        await addMissingRoomItemsForSlot(slot, currentRoomLabels)
      }
    }
    
    // スロットを展開して表示
    selectedSlotLeft.value = slot
    selectedSlotRight.value = slot
  }
  
  // スロットをサーバーに保存
  await handleSlotUpdate(slot)
}

// スロットに部屋アイテムを作成（0～9）- 一括挿入
async function createRoomItemsForSlot(slot, roomLabels) {
  if (!slot.id) {
    // スロットがまだ保存されていない場合、先に保存
    const result = await supabaseService.upsertEstimateSlot({
      work_id: slot.work_id,
      estimate_slot_type_id: slot.estimate_slot_type_id,
      price_code: slot.price_code,
      instruction: slot.instruction,
      quantity: slot.quantity,
      contractor_id: slot.contractor_id
    })
    slot.id = result.slot.id
  }
  
  // 10個のアイテムを一括で作成
  const itemsToCreate = []
  for (let i = 0; i < 10; i++) {
    const roomLabel = roomLabels.find(l => l.sort_order === i)
    itemsToCreate.push({
      estimate_slot_id: slot.id,
      location_category: roomLabel?.label || '',
      instruction: '',
      quantity: null,
      sort_order: i
    })
  }
  
  try {
    const result = await supabaseService.upsertEstimateSlotItems(itemsToCreate)
    slot.items = result.items || []
    console.log('[createRoomItemsForSlot] Created', slot.items.length, 'items')
  } catch (err) {
    console.error('Failed to create items:', err)
    slot.items = []
  }
}

// 既存アイテムの部屋ラベルを更新
async function updateRoomLabelsForSlot(slot, roomLabels) {
  for (let i = 0; i < slot.items.length && i < 10; i++) {
    const item = slot.items[i]
    const roomLabel = roomLabels.find(l => l.sort_order === i)
    if (roomLabel) {
      item.location_category = roomLabel.label || ''
      await handleItemUpdate(item)
    }
  }
}

// 不足分の部屋アイテムを追加 - 一括挿入
async function addMissingRoomItemsForSlot(slot, roomLabels) {
  if (!slot.id) {
    // スロットがまだ保存されていない場合、先に保存
    const result = await supabaseService.upsertEstimateSlot({
      work_id: slot.work_id,
      estimate_slot_type_id: slot.estimate_slot_type_id,
      price_code: slot.price_code,
      instruction: slot.instruction,
      quantity: slot.quantity,
      contractor_id: slot.contractor_id
    })
    slot.id = result.slot.id
  }
  
  // 既存のsort_orderを取得
  const existingSortOrders = new Set(slot.items.map(item => item.sort_order))
  
  // 不足分のアイテムを一括で作成
  const itemsToCreate = []
  for (let i = 0; i < 10; i++) {
    if (!existingSortOrders.has(i)) {
      const roomLabel = roomLabels.find(l => l.sort_order === i)
      itemsToCreate.push({
        estimate_slot_id: slot.id,
        location_category: roomLabel?.label || '',
        instruction: '',
        quantity: null,
        sort_order: i
      })
    }
  }
  
  if (itemsToCreate.length > 0) {
    try {
      const result = await supabaseService.upsertEstimateSlotItems(itemsToCreate)
      slot.items.push(...(result.items || []))
      console.log('[addMissingRoomItemsForSlot] Created', result.items?.length || 0, 'items')
    } catch (err) {
      console.error('Failed to create missing items:', err)
    }
  }
  
  // sort_orderでソート
  slot.items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}

// スロットの更新をサーバーに送信
async function handleSlotUpdate(slot) {
  // 何も入力されていない新規スロットは保存しない
  if (!slot.id && !slot.price_code && !slot.instruction && !slot.quantity && !slot.estimate_slot_type_id && !slot.contractor_id) {
    console.log('Empty new slot, skipping save')
    return
  }
  
  try {
    const result = await supabaseService.upsertEstimateSlot({
      id: slot.id || undefined,
      work_id: slot.work_id,
      estimate_slot_type_id: slot.estimate_slot_type_id || null,
      price_code: slot.price_code,
      instruction: slot.instruction,
      quantity: slot.quantity,
      contractor_id: slot.contractor_id || null,
      sort_order: slot.sort_order // sort_orderも送信（10000刻み）
    })
    
    // 新規作成の場合、返ってきたIDをセット
    if (!slot.id && result.slot?.id) {
      slot.id = result.slot.id
      console.log('Slot created successfully:', slot.id)
    } else {
      console.log('Slot updated successfully:', slot.id)
    }
  } catch (err) {
    console.error('Failed to save slot:', err)
    alert('スロットの保存に失敗しました: ' + err.message)
  }
}

// アイテムを追加
async function handleAddItem(slot) {
  if (!slot.id) {
    // スロットがまだ保存されていない場合、先に保存
    try {
      const result = await supabaseService.upsertEstimateSlot({
        work_id: slot.work_id,
        estimate_slot_type_id: slot.estimate_slot_type_id,
        price_code: slot.price_code,
        instruction: slot.instruction,
        quantity: slot.quantity,
        contractor_id: slot.contractor_id
      })
      slot.id = result.slot.id
    } catch (err) {
      console.error('Failed to save slot:', err)
      alert('スロットの保存に失敗しました: ' + err.message)
      return
    }
  }
  
  if (!slot.items) {
    slot.items = []
  }
  
  // 次のsort_orderを計算
  const maxSortOrder = slot.items.reduce((max, item) => Math.max(max, item.sort_order || 0), -1)
  const newSortOrder = maxSortOrder + 1
  
  // 部屋ラベルを取得（is_roomタイプの場合）
  const slotTypeInfo = getSlotTypeInfo(slot.estimate_slot_type_id)
  let locationCategory = ''
  if (slotTypeInfo?.is_room && roomLabels.value.length > 0) {
    const roomLabel = roomLabels.value.find(l => l.sort_order === newSortOrder)
    locationCategory = roomLabel?.label || ''
  }
  
  const newItem = {
    estimate_slot_id: slot.id,
    location_category: locationCategory,
    instruction: '',
    quantity: null,
    sort_order: newSortOrder
  }
  
  try {
    const result = await supabaseService.upsertEstimateSlotItem(newItem)
    slot.items.push({
      ...result.item,
      estimate_slot_id: slot.id
    })
    console.log('Item added successfully')
  } catch (err) {
    console.error('Failed to add item:', err)
    alert('アイテムの追加に失敗しました: ' + err.message)
  }
}

// 部屋ラベルモーダルを開く
const roomLabelsFromDBBackup = ref(false) // DBフラグのバックアップ

async function openRoomLabelModal() {
  if (!props.workId) {
    alert('Work IDが設定されていません')
    return
  }
  
  try {
    const result = await supabaseService.getRoomLabels(props.workId)
    roomLabels.value = result.room_labels || []
    roomLabelsFromDB.value = !result.from_template
    // バックアップを保存（キャンセル時の復元用）
    roomLabelsBackup.value = JSON.parse(JSON.stringify(roomLabels.value))
    roomLabelsFromDBBackup.value = roomLabelsFromDB.value
    showRoomLabelModal.value = true
  } catch (err) {
    console.error('Failed to load room labels:', err)
    alert('部屋ラベルの読み込みに失敗しました: ' + err.message)
  }
}

// 部屋ラベルモーダルを閉じる（キャンセル時）
function handleCloseRoomLabelModal() {
  // バックアップから復元
  roomLabels.value = JSON.parse(JSON.stringify(roomLabelsBackup.value))
  roomLabelsFromDB.value = roomLabelsFromDBBackup.value
  showRoomLabelModal.value = false
}

// 部屋ラベルを保存
async function handleSaveRoomLabels(labels) {
  if (!props.workId) {
    alert('Work IDが設定されていません')
    return
  }
  
  // モーダルを閉じてローディング表示
  showRoomLabelModal.value = false
  savingRoomLabels.value = true
  
  try {
    await supabaseService.upsertRoomLabels(props.workId, labels)
    
    // roomLabelsを更新
    roomLabels.value = labels.map((label, index) => ({
      sort_order: index,
      label: label.label || ''
    }))
    
    // 保存成功したのでDBに存在するフラグをtrueに
    roomLabelsFromDB.value = true
    
    // is_roomがtrueのスロットがあるか確認
    const isRoomSlots = estimateSlots.value.filter(slot => {
      return slot.is_room && slot.items && slot.items.length > 0
    })
    
    if (isRoomSlots.length > 0) {
      // ローディングを一旦解除して確認ダイアログ
      savingRoomLabels.value = false
      const updateExisting = confirm(
        `部屋タイプのスロットが ${isRoomSlots.length} 件あります。\n` +
        `これらのスロットのアイテム（場所）を新しい部屋ラベルで上書きしますか？\n\n` +
        `「OK」: 上書きする\n「キャンセル」: 上書きしない`
      )
      
      if (updateExisting) {
        // 再度ローディング表示
        savingRoomLabels.value = true
        // 全てのis_roomスロットのアイテムを更新
        for (const slot of isRoomSlots) {
          await updateRoomLabelsForSlot(slot, roomLabels.value)
        }
        savingRoomLabels.value = false
        alert('部屋ラベルを保存し、既存スロットを更新しました')
      } else {
        alert('部屋ラベルを保存しました（既存スロットは更新されません）')
      }
    } else {
      savingRoomLabels.value = false
      alert('部屋ラベルを保存しました')
    }
  } catch (err) {
    savingRoomLabels.value = false
    console.error('Failed to save room labels:', err)
    alert('部屋ラベルの保存に失敗しました: ' + err.message)
  }
}

// ========== ペイロード生成 ==========
function generateEstimatePayload() {
  // quantityがnullではないスロットを集める
  const validSlots = estimateSlots.value.filter(slot => {
    if (slot.quantity == null) return false
    const slotTypeInfo = getSlotTypeInfo(slot.estimate_slot_type_id)
    if (!slotTypeInfo) return false
    // is_instructionがfalseの場合も除外
    if (slotTypeInfo.is_instruction === false) return false
    return true
  })
  
  // keyごとにグループ化
  const slotsByKey = {}
  
  validSlots.forEach(slot => {
    const slotTypeInfo = getSlotTypeInfo(slot.estimate_slot_type_id)
    if (!slotTypeInfo) return
    
    const key = slotTypeInfo.key || 'unknown'
    if (!slotsByKey[key]) {
      slotsByKey[key] = []
    }
    slotsByKey[key].push({ slot, slotTypeInfo })
  })
  
  // 各keyごとにペイロードを作成
  const result = {}
  
  Object.keys(slotsByKey).forEach(key => {
    const slotsData = slotsByKey[key]
    
    // contractorのsort_orderでソート
    slotsData.sort((a, b) => {
      const contractorA = contractors.value.find(c => c.id === a.slot.contractor_id)
      const contractorB = contractors.value.find(c => c.id === b.slot.contractor_id)
      const sortOrderA = contractorA?.sort_order ?? 999999
      const sortOrderB = contractorB?.sort_order ?? 999999
      return sortOrderA - sortOrderB
    })
    
    // contractorごとにグループ化
    const slotsByContractor = {}
    slotsData.forEach(data => {
      const contractorId = data.slot.contractor_id || 'no_contractor'
      if (!slotsByContractor[contractorId]) {
        slotsByContractor[contractorId] = []
      }
      slotsByContractor[contractorId].push(data)
    })
    
    let globalOrder = 1
    let isFirstContractor = true
    
    // contractorごとに処理
    Object.keys(slotsByContractor).forEach(contractorId => {
      const contractorSlots = slotsByContractor[contractorId]
      const contractor = contractors.value.find(c => c.id === contractorId)
      
      // このcontractor内で有効なquantity（0以外）があるかチェック
      const hasNonZeroQuantity = contractorSlots.some(data => {
        const qty = data.slot.quantity
        return qty != null && qty !== 0
      })
      
      // 最初以外のcontractorには空白行を追加
      if (!isFirstContractor && hasNonZeroQuantity) {
        const spacerKey = `${key}-${globalOrder}`
        result[spacerKey] = {
          display: '',
          instruction: '',
          quantity: null,
          unit: '',
          item_location_category: [],
          item_instruction: [],
          item_quantity: [],
          contractor_label: '',
          contractor_sort_order: null
        }
        globalOrder++
      }
      
      // 有効なquantityがある場合のみcontractorラベルを追加
      if (hasNonZeroQuantity && contractor) {
        const contractorLabelKey = `${key}-${globalOrder}`
        // contractor_labelに装飾を追加
        const decoratedLabel = `          [ ${contractor.label || ''} ]`
        
        result[contractorLabelKey] = {
          display: decoratedLabel,
          instruction: '',
          quantity: null,
          unit: '',
          item_location_category: [],
          item_instruction: [],
          item_quantity: [],
          contractor_label: decoratedLabel,
          contractor_sort_order: contractor.sort_order
        }
        globalOrder++
        isFirstContractor = false
      }
      
      // 各スロットを処理
      contractorSlots.forEach(data => {
        const { slot, slotTypeInfo } = data
        const payloadKey = `${key}-${globalOrder}`
        
        // 表示用文字列を構築
        let displayValue = ''
        
        // instruction
        if (slotTypeInfo.is_instruction && slot.instruction) {
          displayValue += slot.instruction
        }
        
        // number (quantity)
        if (slotTypeInfo.is_number && slot.quantity != null) {
          displayValue += `x${slot.quantity}`
        }
        
        // unit
        if (slotTypeInfo.is_unit && slot.unit) {
          displayValue += ` ${slot.unit}`
        }
        
        // itemsの処理
        let hasValidItems = false
        let itemsDisplay = ''
        const itemLocationCategories = []
        const itemInstructions = []
        const itemQuantities = []
        
        if (slotTypeInfo.is_item && slot.items && slot.items.length > 0) {
          // quantityがnullではないアイテムを収集
          slot.items.forEach(item => {
            // すべてのアイテムを配列に追加（quantityの有無に関わらず）
            itemLocationCategories.push(item.location_category || '')
            itemInstructions.push(item.instruction || '')
            itemQuantities.push(item.quantity)
            
            // 表示用：quantityがnullではないアイテムのみ
            if (item.quantity != null) {
              hasValidItems = true
              let itemStr = ''
              
              if (slotTypeInfo.is_item_location_category && item.location_category) {
                itemStr += item.location_category
              }
              
              if (slotTypeInfo.is_item_instruction && item.instruction) {
                if (itemStr) itemStr += ' '
                itemStr += item.instruction
              }
              
              if (slotTypeInfo.is_item_number && item.quantity != null) {
                itemStr += `x${item.quantity}`
              }
              
              if (itemStr) {
                if (itemsDisplay) itemsDisplay += ', '
                itemsDisplay += itemStr
              }
            }
          })
        }
        
        // itemsの括弧を追加
        if (hasValidItems && itemsDisplay) {
          displayValue += `( ${itemsDisplay} )`
        }
        
        // contractor_labelに装飾を追加
        let contractorLabel = contractor?.label || ''
        if (contractorLabel.trim() !== '') {
          contractorLabel = `          [ ${contractorLabel} ]`
        }
        
        // ペイロードオブジェクトを作成
        result[payloadKey] = {
          display: displayValue,
          instruction: slot.instruction || '',
          quantity: slot.quantity,
          unit: slot.unit || '',
          item_location_category: itemLocationCategories,
          item_instruction: itemInstructions,
          item_quantity: itemQuantities,
          contractor_label: contractorLabel,
          contractor_sort_order: contractor?.sort_order ?? null
        }
        
        globalOrder++
      })
    })
  })
  
  // roomlabel0～roomlabel9を追加
  for (let i = 0; i < 10; i++) {
    if (i < roomLabels.value.length) {
      result[`roomlabel${i}`] = {
        display: roomLabels.value[i].label || ''
      }
    } else {
      result[`roomlabel${i}`] = {
        display: ''
      }
    }
  }
  
  return result
}

// ========== Excel見積書生成とダウンロード ==========
const generatingExcel = ref(false)

async function generateAndDownloadExcel() {
  if (!props.workId) {
    alert('Work IDが必要です')
    return
  }

  if (estimateSlots.value.length === 0) {
    alert('見積スロットがありません')
    return
  }

  generatingExcel.value = true

  try {
    // ペイロード生成
    const payload = generateEstimatePayload()
    
    // Excel生成APIを呼び出し
    const result = await supabaseService.generateExcelEstimate(props.workId, payload)
    
    if (result.success && result.download_url) {
      // ダウンロードURLを開く（新しいタブで）
      window.open(result.download_url, '_blank')
      
      alert(`Excel見積書を生成しました\n\nファイル名: ${result.file_name}\n有効期限: ${Math.floor(result.expires_in / 60)}分`)
    } else {
      throw new Error('Excel生成に失敗しました')
    }
  } catch (err) {
    console.error('Failed to generate Excel:', err)
    alert('Excel生成エラー: ' + err.message)
  } finally {
    generatingExcel.value = false
  }
}

// ========== テンプレート保存 ==========
async function saveAsTemplate() {
  if (!props.workId) {
    alert('Work IDが必要です')
    return
  }

  if (estimateSlots.value.length === 0) {
    alert('保存するスロットがありません')
    return
  }

  const confirmSave = confirm(
    `現在の見積スロット（${estimateSlots.value.length}件）をテンプレートとして保存しますか？\n\n` +
    '既存のテンプレートは削除され、新しいテンプレートで上書きされます。'
  )

  if (!confirmSave) {
    return
  }

  try {
    const result = await supabaseService.saveEstimateSlotTemplate(props.workId)
    alert(`テンプレートを保存しました\nスロット: ${result.saved_slots}件\nアイテム: ${result.saved_items}件`)
  } catch (err) {
    console.error('Failed to save template:', err)
    alert('テンプレート保存エラー: ' + err.message)
  }
}

// ========== テンプレート挿入 ==========
async function insertTemplate() {
  if (!props.workId) {
    alert('Work IDが必要です')
    return
  }

  const confirmInsert = confirm(
    'テンプレートを現在のスロットに挿入しますか？\n\n' +
    'テンプレートのスロットが既存スロットの後ろに追加され、ソート順が再調整されます。'
  )

  if (!confirmInsert) {
    return
  }

  try {
    const result = await supabaseService.insertEstimateSlotTemplate(props.workId)
    alert(`テンプレートを挿入しました\nスロット: ${result.inserted_slots}件\nアイテム: ${result.inserted_items}件`)
    
    // スロットを再読み込み
    await loadEstimateSlots()
  } catch (err) {
    console.error('Failed to insert template:', err)
    alert('テンプレート挿入エラー: ' + err.message)
  }
}

// ========== スニペット関連 ==========
// コンテキストメニューを表示
function handleContextMenu(event, inputElement) {
  event.preventDefault()
  
  // 選択範囲を保存
  if (inputElement) {
    snippetTargetInput.value = inputElement
    snippetSavedSelection.value = {
      start: inputElement.selectionStart,
      end: inputElement.selectionEnd
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
  
  snippetContextMenuPosition.value = { x, y }
  showSnippetContextMenu.value = true
}

// スニペットを挿入
function handleInsertSnippet(snippet) {
  const input = snippetTargetInput.value
  if (!input) {
    showSnippetContextMenu.value = false
    return
  }
  
  const { start, end } = snippetSavedSelection.value
  // 改行を削除して挿入（見積もりでは改行禁止）
  const insertText = snippet.label.replace(/[\r\n]/g, '')
  
  const currentValue = input.value || ''
  const newValue = currentValue.substring(0, start) + insertText + currentValue.substring(end)
  
  // v-modelを直接更新
  input.value = newValue
  // inputイベントを発火させてv-modelを更新
  input.dispatchEvent(new Event('input', { bubbles: true }))
  
  showSnippetContextMenu.value = false
}

// カスタム文字列追加モーダルを開く
function handleAddCustomSnippet() {
  const input = snippetTargetInput.value
  let selectedText = ''
  
  if (input) {
    const { start, end } = snippetSavedSelection.value
    selectedText = (input.value || '').substring(start, end)
    // 改行を除去
    selectedText = selectedText.replace(/[\r\n]/g, '')
  }
  
  snippetSelectedText.value = selectedText
  showSnippetContextMenu.value = false
  showCustomSnippetModal.value = true
}

// コピー
async function handleSnippetCopy() {
  const input = snippetTargetInput.value
  if (!input) {
    showSnippetContextMenu.value = false
    return
  }
  
  const { start, end } = snippetSavedSelection.value
  const selectedText = (input.value || '').substring(start, end)
  
  try {
    await navigator.clipboard.writeText(selectedText)
  } catch (err) {
    console.error('コピーに失敗しました:', err)
  }
  showSnippetContextMenu.value = false
}

// 切り取り
async function handleSnippetCut() {
  const input = snippetTargetInput.value
  if (!input) {
    showSnippetContextMenu.value = false
    return
  }
  
  const { start, end } = snippetSavedSelection.value
  const selectedText = (input.value || '').substring(start, end)
  
  try {
    await navigator.clipboard.writeText(selectedText)
    // 選択範囲がある場合のみ削除
    if (selectedText) {
      const currentValue = input.value || ''
      const newValue = currentValue.substring(0, start) + currentValue.substring(end)
      input.value = newValue
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  } catch (err) {
    console.error('切り取りに失敗しました:', err)
  }
  showSnippetContextMenu.value = false
}

// 貼り付け
async function handleSnippetPaste() {
  const input = snippetTargetInput.value
  if (!input) {
    showSnippetContextMenu.value = false
    return
  }
  
  try {
    const clipboardText = await navigator.clipboard.readText()
    const { start, end } = snippetSavedSelection.value
    const currentValue = input.value || ''
    const newValue = currentValue.substring(0, start) + clipboardText + currentValue.substring(end)
    input.value = newValue
    input.dispatchEvent(new Event('input', { bubbles: true }))
  } catch (err) {
    console.error('貼り付けに失敗しました:', err)
  }
  showSnippetContextMenu.value = false
}

// カスタム文字列を追加
async function handleAddCustomSnippetSubmit({ label, newline_after, group_id }) {
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
    alert(`カスタム文字列の追加に失敗しました: ${err.message}`)
  }
}

// 外部から呼び出せるように公開
defineExpose({
  loadPriceListItems,
  loadEstimateSlots,
  refreshEstimateSlots: loadEstimateSlots,
  loading
})
</script>

<style scoped>
.estimate-editor {
  display: flex;
  height: 100%;
  width: 100%;
  background: #f9fafb;
}

.left-panel {
  width: 350px;
  min-width: 350px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
}

.center-panel {
  /* 左パネル(350px)を除いた残りの半分 */
  width: calc((100% - 350px) / 2);
  min-width: calc((100% - 350px) / 2);
  max-width: calc((100% - 350px) / 2);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
  transition: width 0.3s, min-width 0.3s, max-width 0.3s, background 0.2s;
}

.center-panel.expanded {
  /* 左パネル(350px)を除いた残り全体 */
  width: calc(100% - 350px);
  min-width: calc(100% - 350px);
  max-width: calc(100% - 350px);
}

.center-panel.drag-over {
  background: #eff6ff;
}

/* 右パネル：検索・絞り込み */
.right-panel {
  width: calc((100% - 350px) / 2);
  min-width: calc((100% - 350px) / 2);
  max-width: calc((100% - 350px) / 2);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #f3f4f6;
  border-left: 1px solid #e5e7eb;
  overflow: hidden;
}

.filter-panel-header {
  padding: 0.5rem 1rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-result-inline {
  font-weight: 400;
  font-size: 0.75rem;
  color: #6b7280;
}

.filter-panel-content {
  padding: 0.5rem;
}

.filter-row-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-search-wrapper {
  position: relative;
  flex: 1;
  min-width: 80px;
}

.filter-input-inline {
  width: 100%;
  padding: 0.375rem 1.5rem 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
}

.filter-input-inline:focus {
  outline: none;
  border-color: #3b82f6;
}

.filter-clear-btn {
  position: absolute;
  right: 0.25rem;
  top: 50%;
  transform: translateY(-50%);
  padding: 0.125rem 0.25rem;
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 0.625rem;
  cursor: pointer;
  line-height: 1;
}

.filter-clear-btn:hover {
  color: #dc2626;
}

.filter-checkbox-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #374151;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-checkbox-inline input[type="checkbox"] {
  width: 0.875rem;
  height: 0.875rem;
  cursor: pointer;
}

.filter-select-inline {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  background: white;
  flex-shrink: 0;
  max-width: 100px;
}

.filter-select-inline.filter-room-select {
  max-width: 80px;
}

.filter-select-inline.placeholder {
  color: #9ca3af;
}

.filter-reset-btn-inline {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #9ca3af;
  font-size: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
}

.filter-reset-btn-inline:hover {
  background: #fee2e2;
  color: #dc2626;
}

.right-slots-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  padding-bottom: 3rem; /* 下に余白を追加（スロット1個分） */
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.right-slots-list .estimate-slot {
  background: #f9fafb;
}

.empty-state-small {
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.75rem;
}

.filter-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.category-select {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8125rem;
  background: white;
}

.category-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.category-select.placeholder {
  color: #9ca3af;
}

.pricelist-select {
  flex: 1.5;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8125rem;
  background: white;
}

.pricelist-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.pricelist-select.placeholder {
  color: #9ca3af;
}

.search-row {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.search-input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8125rem;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.loading-state,
.error-state,
.empty-state {
  padding: 1.5rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.8125rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.error-state {
  color: #dc2626;
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.75rem;
}

.items-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.price-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin-bottom: 0.375rem;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.75rem;
  user-select: none;
}

.price-item[draggable="true"]:hover {
  cursor: grab;
}

.price-item:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.price-item:active {
  cursor: grabbing;
}

.price-item.expanded {
  background: #eff6ff;
  border-color: #2563eb;
}

.price-item.expanded .item-description,
.price-item.expanded .item-note {
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  word-break: break-word;
}

.item-row-1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-row-2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-code {
  font-family: monospace;
  font-size: 0.75rem;
  color: #3b82f6;
  font-weight: 600;
  min-width: 70px;
}

.item-description {
  flex: 1;
  font-size: 0.75rem;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-note {
  flex: 1;
  font-size: 0.6875rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-price {
  font-size: 0.75rem;
  font-weight: 500;
  color: #dc2626;
  min-width: 60px;
  text-align: right;
}

.item-unit {
  font-size: 0.6875rem;
  color: #6b7280;
  min-width: 30px;
  text-align: center;
}

/* 中央パネル */
.slots-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.room-template-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.375rem 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.room-template-btn svg {
  color: #6b7280;
}

.room-template-btn:hover:not(:disabled) {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.room-template-btn:hover:not(:disabled) svg {
  color: #374151;
}

.room-template-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 部屋ラベルが無い時のスタイル */
.room-template-btn.no-room-labels {
  background: #fef2f2;
  border-color: #fca5a5;
}

.room-template-btn.no-room-labels svg {
  color: #dc2626;
}

.room-template-btn.no-room-labels:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #f87171;
}

.room-template-btn.no-room-labels:hover:not(:disabled) svg {
  color: #b91c1c;
}

/* テンプレート保存ボタン（☆） */
.save-template-btn {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 4px;
  padding: 0.375rem 0.625rem;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  font-size: 1.125rem;
  line-height: 1;
  color: #f59e0b;
  margin-left: auto;
}

.save-template-btn:hover:not(:disabled) {
  background: #fde68a;
  border-color: #f59e0b;
  color: #d97706;
  transform: scale(1.1);
}

.save-template-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* テンプレート挿入ボタン */
.insert-template-btn {
  background: #dbeafe;
  border: 1px solid #60a5fa;
  border-radius: 4px;
  padding: 0.375rem 0.625rem;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
}

.insert-template-btn:hover:not(:disabled) {
  background: #bfdbfe;
  border-color: #3b82f6;
  color: #2563eb;
  transform: translateY(-1px);
}

.insert-template-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Excel生成ボタン */
.generate-excel-btn {
  background: #dcfce7;
  border: 1px solid #4ade80;
  border-radius: 4px;
  padding: 0.375rem 0.625rem;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #16a34a;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.generate-excel-btn svg {
  width: 16px;
  height: 16px;
  color: #16a34a;
}

.generate-excel-btn:hover:not(:disabled) {
  background: #bbf7d0;
  border-color: #16a34a;
  transform: translateY(-1px);
}

.generate-excel-btn:hover:not(:disabled) svg {
  color: #15803d;
}

.generate-excel-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.slots-title {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9375rem;
}

.slots-count {
  font-size: 0.75rem;
  color: #6b7280;
}

.group-checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
  cursor: pointer;
  margin-left: 0.5rem;
}

.group-checkbox input[type="checkbox"] {
  width: 0.875rem;
  height: 0.875rem;
  cursor: pointer;
}

.group-checkbox span {
  white-space: nowrap;
}

.expand-toggle-btn {
  margin-left: auto;
  background: #e5e7eb;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: #374151;
  transition: background 0.2s;
}

.expand-toggle-btn:hover {
  background: #d1d5db;
}

.slots-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  padding-bottom: 3rem; /* 下に余白を追加（スロット1個分） */
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 依頼先グループ */
.contractor-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.contractor-group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  background: linear-gradient(90deg, #e0e7ff 0%, #ede9fe 50%, #fae8ff 100%);
  border-radius: 4px;
  position: sticky;
  top: 0;
  z-index: 5;
  border-left: 3px solid #8b5cf6;
}

.contractor-group-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #4c1d95;
}

.contractor-group-count {
  font-size: 0.6875rem;
  color: #7c3aed;
  margin-left: auto;
}

.add-slot-area {
  padding: 0.5rem;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.add-slot-btn {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  color: #6b7280;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.add-slot-btn:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.empty-slots {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 200px;
  color: #9ca3af;
  font-size: 0.875rem;
  text-align: center;
}

.estimate-slot {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  overflow: hidden;
  flex-shrink: 0; /* 高さを縮小しない */
}

/* 1段目：単価コード、説明、備考、依頼先、削除 */
.slot-row-1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
}

.slot-number {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  flex-shrink: 0;
  min-width: 1.5em;
}

.slot-price-code {
  width: 80px;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8125rem;
  text-transform: uppercase;
  flex-shrink: 0;
}

.slot-description {
  flex: 1;
  font-size: 0.8125rem;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.slot-note {
  flex: 1;
  font-size: 0.75rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

/* 2段目：アイテム数、スロットタイプ、内容、数量等 */
.slot-row-2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem 0.5rem;
  padding-left: calc(0.75rem + 0.5em);
}

.slot-items-badge {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.slot-items-badge.has-items {
  background: #dbeafe;
  color: #1e40af;
}

.slot-items-badge.has-items:hover {
  background: #bfdbfe;
}

.slot-items-badge.expanded {
  background: #3b82f6;
  color: white;
}

.slot-instruction {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8125rem;
  min-width: 0;
}

.slot-type {
  width: 132px; /* 幅を倍に（66px → 132px） */
  padding: 0.25rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem; /* 文字サイズを大きく（0.625rem → 0.75rem） */
  flex-shrink: 0;
}

/* 数量コントロール（ボタン付き） */
.quantity-control {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}

.qty-btn {
  width: 20px;
  height: 24px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  cursor: pointer;
  font-size: 0.75rem;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.qty-btn.clear-btn {
  background: #fef3c7;
  color: #92400e;
  font-weight: 600;
  border-right: none;
}

.qty-btn.clear-btn:hover {
  background: #fde68a;
}

.qty-btn:first-child {
  border-radius: 4px 0 0 4px;
  border-right: none;
}

.qty-btn:last-child {
  border-radius: 0 4px 4px 0;
  border-left: none;
}

.qty-btn:hover {
  background: #e5e7eb;
}

.qty-btn.clear-btn:hover {
  background: #fde68a;
}

.slot-quantity {
  width: 50px;
  padding: 0.25rem;
  border: 1px solid #d1d5db;
  border-radius: 0;
  font-size: 0.75rem;
  text-align: center;
  flex-shrink: 0;
}

/* is_sum時の数量（自動計算・編集不可） */
.slot-quantity.is-sum {
  background: #dbeafe;
  color: #1e40af;
  font-weight: 600;
  cursor: not-allowed;
}

.slot-quantity.is-sum:disabled {
  opacity: 1;
}

.quantity-control.is-sum .qty-btn {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.quantity-control.is-sum .qty-btn:disabled {
  opacity: 0.6;
}


.estimate-slot {
  transition: all 0.15s;
}

.estimate-slot.selected {
  background: #eff6ff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.estimate-slot.drop-target {
  background: #fef3c7;
  border-color: #f59e0b;
  box-shadow: 0 0 0 1px #f59e0b;
}

/* スロット並び替え用スタイル */
.estimate-slot[draggable="true"] {
  cursor: grab;
}

.estimate-slot[draggable="true"]:active {
  cursor: grabbing;
}

.estimate-slot.dragging {
  opacity: 0.5;
  background: #f3f4f6;
}

.slot-contractor {
  width: 100px;
  padding: 0.375rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  flex-shrink: 0;
}

/* is_roomチェックボックス（ハウスアイコン） */
.is-room-toggle {
  width: 28px;
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
  flex-shrink: 0;
  margin-right: 4px;
}

.is-room-toggle:hover {
  border-color: #ff9933;
}

.is-room-toggle.active {
  background: #ffcc99; /* 薄いオレンジ */
  border-color: #ff9933;
}

.is-room-toggle svg {
  width: 18px;
  height: 18px;
  fill: #666;
}

.is-room-toggle.active svg {
  fill: #ff6600;
}

.is-room-toggle.disabled,
.is-room-toggle:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  border-color: #e5e7eb;
}

.is-room-toggle.disabled svg,
.is-room-toggle:disabled svg {
  fill: #9ca3af;
}

.slot-delete-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.slot-delete-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* 展開されたスロットアイテム */
.slot-items-expanded {
  padding: 0.5rem 0.75rem;
  padding-left: 2.5rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.slot-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.375rem 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
}

.item-number {
  font-weight: 600;
  color: #6b7280;
  min-width: 1.5rem;
}

.item-location {
  min-width: 80px;
  color: #3b82f6;
  font-weight: 500;
}

.item-instruction {
  flex: 1;
  color: #1f2937;
}

.item-quantity {
  min-width: 80px;
  text-align: right;
  color: #6b7280;
}

/* 編集可能なスロットアイテム */
.slot-item-editable {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.375rem 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
}

.item-location-input {
  min-width: 100px;
  padding: 0.25rem 0.375rem;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-size: 0.75rem;
  color: #3b82f6;
  font-weight: 500;
}

.item-location-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.item-instruction-input {
  flex: 1;
  padding: 0.25rem 0.375rem;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-size: 0.75rem;
  color: #1f2937;
}

.item-instruction-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.item-quantity-control {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}

.item-qty-btn {
  width: 20px;
  height: 24px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  cursor: pointer;
  font-size: 0.75rem;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.item-qty-btn.clear-btn {
  background: #fef3c7;
  color: #92400e;
  font-weight: 600;
  border-right: none;
}

.item-qty-btn.clear-btn:hover {
  background: #fde68a;
}

.item-qty-btn:first-child {
  border-radius: 3px 0 0 3px;
  border-right: none;
}

.item-qty-btn:last-child {
  border-radius: 0 3px 3px 0;
  border-left: none;
}

.item-qty-btn:hover {
  background: #e5e7eb;
}

.item-qty-btn.clear-btn:hover {
  background: #fde68a;
}

.item-quantity-input {
  width: 50px;
  padding: 0.25rem 0.375rem;
  border: 1px solid #d1d5db;
  border-radius: 0;
  font-size: 0.75rem;
  text-align: center;
  color: #1f2937;
}

.item-quantity-input:focus {
  outline: none;
  border-color: #3b82f6;
  z-index: 1;
  position: relative;
}

/* 編集不可のグレー表示 */
.disabled-gray {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.disabled-gray:disabled {
  opacity: 0.6;
}

.item-qty-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* is_itemタイプのバッジスタイル */
.slot-items-badge.is-item-type {
  background: #fef3c7;
  color: #d97706;
  border: 1px solid #fcd34d;
}

.slot-items-badge.is-item-type.has-items {
  background: #d97706;
  color: white;
  border-color: #d97706;
}

.slot-items-badge.is-item-type.expanded {
  background: #b45309;
  color: white;
  border-color: #b45309;
}

/* アイテム追加ボタン */
.add-item-btn {
  width: 100%;
  padding: 0.375rem 0.5rem;
  margin-top: 0.5rem;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  background: white;
  color: #6b7280;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.add-item-btn:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

/* ========================================
   右パネルタブ切り替え
======================================== */
.right-panel-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.panel-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  border-bottom: 2px solid transparent;
}

.panel-tab svg {
  flex-shrink: 0;
}

.panel-tab:hover {
  background: #f3f4f6;
  color: #374151;
}

.panel-tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  background: white;
}

/* ========================================
   請求比較パネル
======================================== */
.comparison-panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #475569;
  flex-wrap: wrap;
}

.comparison-panel-header > span {
  white-space: nowrap;
}

.comparison-actions {
  display: flex;
  gap: 0.25rem;
  flex: 1;
  justify-content: flex-end;
}

.comparison-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  font-size: 0.6875rem;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.comparison-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.comparison-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comparison-btn.compare-btn {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.comparison-btn.compare-btn:hover:not(:disabled) {
  background: #2563eb;
}

.comparison-btn.save-btn {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.comparison-btn.save-btn:hover:not(:disabled) {
  background: #059669;
}

.comparison-btn.refresh-btn {
  color: #dc2626;
  border-color: #fca5a5;
}

.comparison-btn.refresh-btn:hover {
  background: #fee2e2;
}

.comparison-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.comparison-loading,
.comparison-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #6b7280;
  font-size: 0.8125rem;
  text-align: center;
}

.comparison-empty .hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.comparison-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-bottom: 6rem; /* 2スロット分の余白 */
}

.comparison-header-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.5rem;
  background: #e5e7eb;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #4b5563;
}

.comp-code-header {
  flex: 1;
  min-width: 100px;
}

.comp-estimate-header,
.comp-billing-header {
  width: 60px;
  text-align: right;
}

.comp-request-header {
  width: 150px;
  text-align: center;
}

.comp-status-header {
  width: 50px;
}

.comparison-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 0.5rem 0.5rem;
  min-height: 3rem; /* 1.5倍の高さ */
  transition: all 0.15s;
  cursor: pointer;
}

.comparison-item:hover {
  border-color: #d1d5db;
}

/* 一致している項目（グレー背景） */
.comparison-list .comparison-item.is-match {
  background: #d1d5db;
  border: 1px solid #9ca3af;
  transform: scale(0.98);
}

.comparison-list .comparison-item.is-match .comp-request-input {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.comparison-list .comparison-item.is-match .comp-qty-btn {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.comparison-list .comparison-item.is-match .comp-qty-btn.estimate-btn {
  background: #d1d5db;
  border-color: #9ca3af;
  color: #4b5563;
}

/* 数量が入っているが一致していない項目（青枠） */
.comparison-list .comparison-item.is-mismatch {
  background: white;
  border-width: 2px;
  border-style: solid;
  border-color: #3b82f6;
}

/* 新規項目（請求側にのみ存在）- 通常表示 */
.comparison-list .comparison-item.is-new {
  background: white;
  border: 1px solid #e5e7eb;
}

/* 追加候補（見積側にのみ存在）- オレンジ枠 */
.comparison-list .comparison-item.is-pending {
  background: white;
  border-width: 2px;
  border-style: solid;
  border-color: #f59e0b;
}

.comparison-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.comp-info {
  flex: 1;
  min-width: 100px;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: baseline;
}

.comp-code {
  font-family: monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
  white-space: nowrap;
}

.comp-billing-desc {
  font-size: 0.75rem;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.comp-estimate-desc {
  font-size: 0.75rem;
  color: #6b7280;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.comp-estimate,
.comp-billing {
  width: 60px;
  text-align: right;
  font-size: 0.875rem;
  color: #374151;
  flex-shrink: 0;
}

.comp-request-controls {
  display: flex;
  align-items: center;
  gap: 0;
  width: 150px;
  flex-shrink: 0;
}

.comp-qty-btn {
  width: 20px;
  height: 24px;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 0;
  background: #f9fafb;
  cursor: pointer;
  font-size: 0.75rem;
  color: #374151;
  transition: all 0.15s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.comp-qty-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.comp-qty-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comp-qty-btn.clear-btn {
  border-radius: 4px 0 0 0;
  border-right: none;
  background: #fef3c7;
  color: #92400e;
  font-weight: 600;
}

.comp-qty-btn.clear-btn:hover {
  background: #fde68a;
}

.comp-qty-btn.minus-btn {
  border-right: none;
}

.comp-qty-btn.plus-btn {
  border-left: none;
}

.comp-qty-btn.estimate-btn {
  width: 20px;
  border-radius: 0 4px 4px 0;
  border-left: none;
  padding: 0;
  font-size: 0.875rem;
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.comp-qty-btn.estimate-btn:hover:not(:disabled) {
  background: #bfdbfe;
}

.comp-request-input {
  flex: 1;
  min-width: 60px;
  padding: 0.25rem 0.375rem;
  border: 1px solid #d1d5db;
  border-radius: 0;
  font-size: 0.875rem;
  text-align: right;
}

.comp-request-input:focus {
  outline: none;
  border-color: #3b82f6;
  position: relative;
  z-index: 1;
}

.comparison-slots-detail {
  margin-top: 0.375rem;
  padding-left: 0.75rem;
  border-left: 2px solid #e5e7eb;
}

.slot-detail-row {
  font-size: 0.625rem;
  color: #6b7280;
  padding: 0.125rem 0;
}

.status-badge {
  font-size: 0.5625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 2px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  width: 50px;
  text-align: center;
}

.status-badge-placeholder {
  width: 50px;
  flex-shrink: 0;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.new {
  background: #dbeafe;
  color: #1e40af;
}

/* 比較アイテムのドラッグハンドル */
.comp-drag-handle {
  cursor: grab;
  color: #9ca3af;
  font-size: 1rem;
  padding: 0 0.25rem;
  flex-shrink: 0;
  user-select: none;
}

.comp-drag-handle:hover {
  color: #6b7280;
}

.comp-drag-handle:active {
  cursor: grabbing;
}

.comparison-item.is-dragging-comparison {
  opacity: 0.5;
  border-color: #3b82f6;
}

/* ローディングオーバーレイ */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 16px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

</style>
