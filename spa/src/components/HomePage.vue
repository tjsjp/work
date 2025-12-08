<template>
  <div class="home-page">
    <div class="home-content">
      <!-- 左パネル：WORKS一覧 -->
      <div class="left-panel">
        <!-- 検索・フィルターエリア -->
        <div class="filter-area">
          <div class="filter-row">
            <button 
              class="filter-clear-all-btn" 
              @click="clearAllFilters"
              title="全てクリア"
            >✕</button>
            <label class="filter-checkbox">
              <input type="checkbox" v-model="filterSmall" />
              <span>小口</span>
            </label>
            <label class="filter-checkbox">
              <input type="checkbox" v-model="filterLarge" />
              <span>あき家</span>
            </label>
            <select v-model="filterYear" class="filter-select">
              <option value="">年度</option>
              <option v-for="year in availableYears" :key="year" :value="year">{{ year }}年</option>
            </select>
            <select v-model="filterMc" class="filter-select">
              <option value="">MC</option>
              <option v-for="mc in availableMcs" :key="mc.id" :value="mc.id">{{ mc.label }}</option>
            </select>
            <div class="filter-input-wrapper filter-location">
              <input 
                type="text" 
                v-model="filterLocation" 
                placeholder="場所検索..."
                class="filter-input"
              />
              <button 
                v-if="filterLocation" 
                class="filter-input-clear" 
                @click="filterLocation = ''"
              >✕</button>
            </div>
          </div>
          <div class="filter-row">
            <div class="filter-input-wrapper filter-detail">
              <input 
                type="text" 
                v-model="filterDetail" 
                placeholder="詳細検索..."
                class="filter-input"
              />
              <button 
                v-if="filterDetail" 
                class="filter-input-clear" 
                @click="filterDetail = ''"
              >✕</button>
            </div>
            <input 
              type="text" 
              v-model="superSearchQuery" 
              placeholder="請求検索..."
              class="filter-input filter-super"
              @keydown.enter="executeSuperSearch"
            />
            <button 
              class="super-search-btn" 
              @click="executeSuperSearch"
              :disabled="superSearchLoading || !superSearchQuery.trim()"
              :title="superSearchLoading ? '検索中...' : '請求アイテムを検索'"
            >
              <svg v-if="!superSearchLoading" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span v-else class="loading-dots">...</span>
            </button>
            <button 
              v-if="superSearchWorkIds.length > 0"
              class="super-search-clear-btn" 
              @click="clearSuperSearch"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div v-if="loading" class="loading-message">読み込み中...</div>
        <div v-else-if="error" class="error-message">{{ error }}</div>
        <div v-else-if="works.length === 0" class="no-data-message">
          <p>データがありません。右上のリロードボタンをクリックしてデータを読み込んでください。</p>
        </div>
        <!-- フィルター適用時：フラットリスト表示 -->
        <div v-else-if="isFilterActive" class="works-flat-list">
          <div v-if="filteredWorks.length === 0" class="no-data-message">
            <p>検索条件に一致するデータがありません</p>
          </div>
          <div
            v-for="work in filteredWorksSorted"
            :key="work.id"
            class="work-item"
            :class="{ active: selectedWorkId === work.id }"
            @click="selectWork(work)"
          >
            <span class="work-kind-badge" :class="work.kind">{{ work.kind === 'small' ? '小口' : 'あき家' }}</span>
            <span class="work-year-badge">{{ work.order_year || '-' }}</span>
            <span class="work-mc-badge">{{ getMcLabel(work.mc_id) }}</span>
            <span class="work-name">{{ getWorkDisplayName(work) }}</span>
          </div>
        </div>
        
        <!-- 通常時：ツリー表示 -->
        <div v-else class="works-tree">
          <div v-for="kindGroup in groupedWorks" :key="kindGroup.kind" class="kind-group">
            <div class="tree-header" @click="toggleKind(kindGroup.kind)">
              <span class="toggle-icon">{{ expandedKinds[kindGroup.kind] ? '▼' : '▶' }}</span>
              <span class="tree-label">{{ kindGroup.kind === 'small' ? '小口' : 'あき家' }}</span>
            </div>
            <div v-if="expandedKinds[kindGroup.kind]" class="tree-content">
              <div v-for="yearGroup in kindGroup.years" :key="`${kindGroup.kind}-${yearGroup.order_year}`" class="year-group">
                <div class="tree-header" @click="toggleYear(kindGroup.kind, yearGroup.order_year)">
                  <span class="toggle-icon">{{ expandedYears[`${kindGroup.kind}-${yearGroup.order_year}`] ? '▼' : '▶' }}</span>
                  <span class="tree-label">{{ yearGroup.order_year }}年</span>
                </div>
                <div v-if="expandedYears[`${kindGroup.kind}-${yearGroup.order_year}`]" class="tree-content">
                  <div v-for="mcGroup in yearGroup.mcGroups" :key="`${kindGroup.kind}-${yearGroup.order_year}-${mcGroup.mc_id}`" class="mc-group">
                    <div class="tree-header" @click="toggleMc(kindGroup.kind, yearGroup.order_year, mcGroup.mc_id)">
                      <span class="toggle-icon">{{ expandedMc[`${kindGroup.kind}-${yearGroup.order_year}-${mcGroup.mc_id}`] ? '▼' : '▶' }}</span>
                      <span class="tree-label">{{ getMcLabel(mcGroup.mc_id) }}</span>
                    </div>
                    <div v-if="expandedMc[`${kindGroup.kind}-${yearGroup.order_year}-${mcGroup.mc_id}`]" class="tree-content">
                      <div
                        v-for="work in mcGroup.works"
                        :key="work.id"
                        class="work-item"
                        :class="{ active: selectedWorkId === work.id }"
                        @click="selectWork(work)"
                      >
                        {{ getWorkDisplayName(work) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 真ん中のパネル：ワークス詳細 -->
      <div class="center-panel">
        <div v-if="selectedWork" class="work-details-container">
          <div class="work-details-header">
            <div class="header-left-buttons">
              <button @click="goToEditPage" class="edit-button">写真</button>
              <button @click="openPdf" :disabled="!pdfFile" class="pdf-button">PDF</button>
              <button 
                v-if="selectedWork.kind === 'large'" 
                @click="goToEstimatePage" 
                class="estimate-button"
              >
                見積
              </button>
            </div>
            <div class="header-right-buttons">
              <button 
                v-if="selectedWork.kind === 'small'"
                @click="openBillingTemplateModal" 
                :disabled="billingItems.length === 0"
                class="template-button"
                title="請求テンプレートとして登録"
              >
                ☆
              </button>
              <button @click="showSameHousing" class="same-housing-button">同一住戸</button>
            </div>
          </div>
          <div class="work-details">
            <div class="work-info-unified">
            <!-- 種別と発注年（横並び） -->
            <div class="info-row-horizontal">
              <div class="info-field">
                <span class="info-label">種別:</span>
                <span class="info-value">{{ selectedWork.kind === 'small' ? '小口' : 'あき家' }}</span>
              </div>
              <div class="info-field">
                <span class="info-label">発注年:</span>
                <span class="info-value">{{ selectedWork.order_year || '-' }}</span>
              </div>
            </div>
            
            <!-- 担当とJKK担当（横並び） -->
            <div class="info-row-horizontal">
              <div class="info-field">
                <span class="info-label">担当:</span>
                <select 
                  v-model="selectedWork.employee_id" 
                  @change="handleEmployeeChange"
                  class="status-select"
                >
                  <option :value="null">-</option>
                  <option 
                    v-for="emp in employees" 
                    :key="emp.id" 
                    :value="emp.id"
                  >
                    {{ emp.last_name }}
                  </option>
                </select>
              </div>
              <div class="info-field">
                <span class="info-label">JKK担当:</span>
                <span class="info-value">{{ selectedWork.order_contact_name || '-' }}</span>
              </div>
            </div>
            
            <!-- 場所（横並び、大きめの文字） -->
            <div class="info-row-horizontal">
              <div class="info-field">
                <span class="info-label">場所:</span>
                <span class="info-value">{{ getWorkDisplayName(selectedWork) }}</span>
              </div>
            </div>
            
            <!-- ノート（改行あり） -->
            <div class="info-row-vertical">
              <span class="info-label">ノート:</span>
              <textarea 
                v-model="selectedWork.note" 
                class="note-textarea" 
                placeholder="ノートを入力..."
                rows="3"
              ></textarea>
            </div>
            
            <!-- 調査日と完了予定日（横並び） -->
            <div class="info-row-horizontal">
              <div class="info-field">
                <span class="info-label">調査日:</span>
                <span class="info-value">{{ selectedWork.ordered_on || '-' }}</span>
              </div>
              <div class="info-field">
                <span class="info-label">完了予定日:</span>
                <span class="info-value">{{ selectedWork.due_on || '-' }}</span>
              </div>
            </div>
            
            <!-- 完了日と支払日（横並び） -->
            <div class="info-row-horizontal">
              <div class="info-field">
                <span class="info-label">完了日:</span>
                <span class="info-value">{{ selectedWork.billed_on || '-' }}</span>
              </div>
              <div class="info-field">
                <span class="info-label">支払日:</span>
                <span class="info-value">{{ selectedWork.payed_on || '-' }}</span>
              </div>
            </div>
            
            <!-- あき家専用情報 -->
            <template v-if="selectedWork.kind === 'large'">
              <!-- 退去日と鍵返却日（横並び） -->
              <div class="info-row-horizontal">
                <div class="info-field">
                  <span class="info-label">退去日:</span>
                  <span class="info-value">{{ selectedWork.moveout_on || '-' }}</span>
                </div>
                <div class="info-field">
                  <span class="info-label">鍵返却日:</span>
                  <span class="info-value">{{ selectedWork.key_returned_on || '-' }}</span>
                </div>
              </div>
              
              <!-- 使用年月日と段階補修（横並び） -->
              <div class="info-row-horizontal">
                <div class="info-field">
                  <span class="info-label">使用年月日:</span>
                  <span class="info-value">
                    {{ formatUsageMonth(selectedWork.usage_month).years }}年{{ formatUsageMonth(selectedWork.usage_month).months }}ヶ月
                  </span>
                </div>
                <div class="info-field">
                  <span class="info-label">段階補修:</span>
                  <span class="info-value">{{ getLargeStepLabel(selectedWork.large_step_id) }}</span>
                </div>
              </div>
              
              <!-- 公社状態と工事状況（横並び） -->
              <div class="info-row-horizontal">
                <div class="info-field">
                  <span class="info-label">公社状態:</span>
                  <span class="info-value">{{ getLargeJkkStatusLabel(selectedWork.large_jkk_status_id) }}</span>
                </div>
                <div class="info-field">
                  <span class="info-label">工事状況:</span>
                  <select 
                    v-model="selectedWork.large_progressive_status_id" 
                    class="status-select"
                  >
                    <option :value="null">-</option>
                    <option 
                      v-for="status in largeProgressiveStatuses" 
                      :key="status.id" 
                      :value="status.id"
                    >
                      {{ status.label }}
                    </option>
                  </select>
                </div>
              </div>
            </template>
            
            <!-- 小口専用情報 -->
            <template v-if="selectedWork.kind === 'small'">
              <!-- 公社状態と工事状況（横並び） -->
              <div class="info-row-horizontal">
                <div class="info-field">
                  <span class="info-label">公社状態:</span>
                  <span class="info-value">{{ getSmallJkkStatusLabel(selectedWork.small_jkk_status_id) }}</span>
                </div>
                <div class="info-field">
                  <span class="info-label">工事状況:</span>
                  <select 
                    v-model="selectedWork.small_progressive_status_id" 
                    class="status-select"
                  >
                    <option :value="null">-</option>
                    <option 
                      v-for="status in smallProgressiveStatuses" 
                      :key="status.id" 
                      :value="status.id"
                    >
                      {{ status.label }}
                    </option>
                  </select>
                </div>
              </div>
              
              <!-- 既存の小口情報（bool以外） -->
              <div v-if="selectedWork.repair_item" class="info-row-vertical">
                <span class="info-label">補修内容:</span>
                <span class="info-value">{{ selectedWork.repair_item }}</span>
              </div>
              <div v-if="selectedWork.jkk_note" class="info-row-vertical">
                <span class="info-label">JKKノート:</span>
                <span class="info-value">{{ selectedWork.jkk_note }}</span>
              </div>
              <div v-if="selectedWork.customer_name" class="info-row-vertical">
                <span class="info-label">顧客名:</span>
                <span class="info-value">{{ selectedWork.customer_name }}</span>
              </div>
              <div v-if="selectedWork.customer_tel" class="info-row-vertical">
                <span class="info-label">顧客電話:</span>
                <span class="info-value">{{ selectedWork.customer_tel }}</span>
              </div>
              <div v-if="selectedWork.industrial_waste" class="info-row-vertical">
                <span class="info-label">産廃:</span>
                <span class="info-value">{{ selectedWork.industrial_waste }}</span>
              </div>
              <div v-if="selectedWork.execution_detail" class="info-row-vertical">
                <span class="info-label">実行詳細:</span>
                <span class="info-value">{{ selectedWork.execution_detail }}</span>
              </div>
            </template>
          </div>
          <!-- 請求項目 -->
          <div v-if="billingItems.length > 0" class="billing-section">
            <h3>請求項目 ({{ billingItems.length }}件)</h3>
            <!-- 合計金額を上部に表示 -->
            <div class="billing-total-top">
              <span class="total-label">合計金額:</span>
              <span class="total-amount">{{ formatPrice(totalAmount) }}</span>
            </div>
            <div class="billing-table-wrapper">
              <table class="billing-table">
                <thead>
                  <tr>
                    <th class="col-code">外部コード</th>
                    <th class="col-description">説明</th>
                    <th class="col-quantity">数量</th>
                    <th class="col-unit">単位</th>
                    <th class="col-price">単価</th>
                    <th class="col-amount">金額</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in billingItems" :key="index">
                    <td class="col-code">{{ item.external_code || '-' }}</td>
                    <td class="col-description">{{ item.description || '-' }}</td>
                    <td class="col-quantity">{{ item.quantity || '-' }}</td>
                    <td class="col-unit">{{ item.unit || '-' }}</td>
                    <td class="col-price">{{ formatPrice(item.unit_price) }}</td>
                    <td class="col-amount">{{ formatPrice(item.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </div>
        <div v-else class="no-selection">
          <p>左のパネルから物件を選択してください</p>
        </div>
      </div>

      <!-- 右パネル：同一住戸 -->
      <div class="right-panel">
        <div v-if="showSameHousingWorks" class="right-panel-container">
          <!-- 同一住戸WORKS一覧 -->
          <div v-if="!selectedSameHousingWork" class="same-housing-list-container">
            <div class="same-housing-list">
              <!-- エラーメッセージ -->
              <div v-if="sameHousingError" class="error-message">{{ sameHousingError }}</div>
              
              <div v-if="sameHousingWorks.length === 0 && !sameHousingError" class="no-data-message">
                <p>同一住戸のWORKSが見つかりません</p>
              </div>
              <div
                v-for="work in sameHousingWorks"
                :key="work.id"
                class="same-housing-item"
                :class="{ 'current-work': work.id === selectedWorkId }"
                @click="selectSameHousingWork(work)"
              >
                {{ getSameHousingWorkDisplayName(work) }}
              </div>
            </div>
          </div>
          
          <!-- 同一住戸WORKの詳細 -->
          <div v-else class="same-housing-details-container">
            <div class="same-housing-details-header">
              <button @click="selectedSameHousingWork = null; sameHousingPdfFile = null; sameHousingBillingItems = []" class="back-to-list-button">
                ← 一覧に戻る
              </button>
              <button @click="openSameHousingPdf" :disabled="!sameHousingPdfFile" class="pdf-button">PDF</button>
            </div>
            <div class="same-housing-details">
              <div class="work-info-unified">
              <!-- 種別と発注年（横並び） -->
              <div class="info-row-horizontal">
                <div class="info-field">
                  <span class="info-label">種別:</span>
                  <span class="info-value">{{ selectedSameHousingWork.kind === 'small' ? '小口' : 'あき家' }}</span>
                </div>
                <div class="info-field">
                  <span class="info-label">発注年:</span>
                  <span class="info-value">{{ selectedSameHousingWork.order_year || '-' }}</span>
                </div>
              </div>
              
              <!-- 担当とJKK担当（横並び） -->
              <div class="info-row-horizontal">
                <div class="info-field">
                  <span class="info-label">担当:</span>
                  <span class="info-value">{{ getEmployeeLabel(selectedSameHousingWork.employee_id) }}</span>
                </div>
                <div class="info-field">
                  <span class="info-label">JKK担当:</span>
                  <span class="info-value">{{ selectedSameHousingWork.order_contact_name || '-' }}</span>
                </div>
              </div>
              
              <!-- 場所（横並び） -->
              <div class="info-row-horizontal">
                <div class="info-field">
                  <span class="info-label">場所:</span>
                  <span class="info-value">{{ getWorkDisplayName(selectedSameHousingWork) }}</span>
                </div>
              </div>
              
              <!-- ノート（改行あり） -->
              <div class="info-row-vertical">
                <span class="info-label">ノート:</span>
                <div class="info-value">{{ selectedSameHousingWork.note || '-' }}</div>
              </div>
              
              <!-- 調査日と完了予定日（横並び） -->
              <div class="info-row-horizontal">
                <div class="info-field">
                  <span class="info-label">調査日:</span>
                  <span class="info-value">{{ selectedSameHousingWork.ordered_on || '-' }}</span>
                </div>
                <div class="info-field">
                  <span class="info-label">完了予定日:</span>
                  <span class="info-value">{{ selectedSameHousingWork.due_on || '-' }}</span>
                </div>
              </div>
              
              <!-- 完了日と支払日（横並び） -->
              <div class="info-row-horizontal">
                <div class="info-field">
                  <span class="info-label">完了日:</span>
                  <span class="info-value">{{ selectedSameHousingWork.billed_on || '-' }}</span>
                </div>
                <div class="info-field">
                  <span class="info-label">支払日:</span>
                  <span class="info-value">{{ selectedSameHousingWork.payed_on || '-' }}</span>
                </div>
              </div>
              
              <!-- あき家専用情報 -->
              <template v-if="selectedSameHousingWork.kind === 'large'">
                <!-- 退去日と鍵返却日（横並び） -->
                <div class="info-row-horizontal">
                  <div class="info-field">
                    <span class="info-label">退去日:</span>
                    <span class="info-value">{{ selectedSameHousingWork.moveout_on || '-' }}</span>
                  </div>
                  <div class="info-field">
                    <span class="info-label">鍵返却日:</span>
                    <span class="info-value">{{ selectedSameHousingWork.key_returned_on || '-' }}</span>
                  </div>
                </div>
                
                <!-- 使用年月日と段階補修（横並び） -->
                <div class="info-row-horizontal">
                  <div class="info-field">
                    <span class="info-label">使用年月日:</span>
                    <span class="info-value">
                      {{ formatUsageMonth(selectedSameHousingWork.usage_month).years }}年{{ formatUsageMonth(selectedSameHousingWork.usage_month).months }}ヶ月
                    </span>
                  </div>
                  <div class="info-field">
                    <span class="info-label">段階補修:</span>
                    <span class="info-value">{{ getLargeStepLabel(selectedSameHousingWork.large_step_id) }}</span>
                  </div>
                </div>
                
                <!-- 公社状態と工事状況（横並び） -->
                <div class="info-row-horizontal">
                  <div class="info-field">
                    <span class="info-label">公社状態:</span>
                    <span class="info-value">{{ getLargeJkkStatusLabel(selectedSameHousingWork.large_jkk_status_id) }}</span>
                  </div>
                  <div class="info-field">
                    <span class="info-label">工事状況:</span>
                    <span class="info-value">{{ getLargeProgressiveStatusLabel(selectedSameHousingWork.large_progressive_status_id) }}</span>
                  </div>
                </div>
              </template>
              
              <!-- 小口専用情報 -->
              <template v-if="selectedSameHousingWork.kind === 'small'">
                <!-- 公社状態と工事状況（横並び） -->
                <div class="info-row-horizontal">
                  <div class="info-field">
                    <span class="info-label">公社状態:</span>
                    <span class="info-value">{{ getSmallJkkStatusLabel(selectedSameHousingWork.small_jkk_status_id) }}</span>
                  </div>
                  <div class="info-field">
                    <span class="info-label">工事状況:</span>
                    <span class="info-value">{{ getSmallProgressiveStatusLabel(selectedSameHousingWork.small_progressive_status_id) }}</span>
                  </div>
                </div>
                
                <!-- 既存の小口情報（bool以外） -->
                <div v-if="selectedSameHousingWork.repair_item" class="info-row-vertical">
                  <span class="info-label">補修内容:</span>
                  <span class="info-value">{{ selectedSameHousingWork.repair_item }}</span>
                </div>
                <div v-if="selectedSameHousingWork.jkk_note" class="info-row-vertical">
                  <span class="info-label">JKKノート:</span>
                  <span class="info-value">{{ selectedSameHousingWork.jkk_note }}</span>
                </div>
                <div v-if="selectedSameHousingWork.customer_name" class="info-row-vertical">
                  <span class="info-label">顧客名:</span>
                  <span class="info-value">{{ selectedSameHousingWork.customer_name }}</span>
                </div>
                <div v-if="selectedSameHousingWork.customer_tel" class="info-row-vertical">
                  <span class="info-label">顧客電話:</span>
                  <span class="info-value">{{ selectedSameHousingWork.customer_tel }}</span>
                </div>
                <div v-if="selectedSameHousingWork.industrial_waste" class="info-row-vertical">
                  <span class="info-label">産廃:</span>
                  <span class="info-value">{{ selectedSameHousingWork.industrial_waste }}</span>
                </div>
                <div v-if="selectedSameHousingWork.execution_detail" class="info-row-vertical">
                  <span class="info-label">実行詳細:</span>
                  <span class="info-value">{{ selectedSameHousingWork.execution_detail }}</span>
                </div>
              </template>
            </div>
            
            <!-- 請求項目 -->
            <div v-if="sameHousingBillingItems.length > 0" class="billing-section">
              <h3>請求項目 ({{ sameHousingBillingItems.length }}件)</h3>
              <!-- 合計金額を上部に表示 -->
              <div class="billing-total-top">
                <span class="total-label">合計金額:</span>
                <span class="total-amount">{{ formatPrice(sameHousingTotalAmount) }}</span>
              </div>
              <div class="billing-table-wrapper">
                <table class="billing-table">
                  <thead>
                    <tr>
                      <th class="col-code">外部コード</th>
                      <th class="col-description">説明</th>
                      <th class="col-quantity">数量</th>
                      <th class="col-unit">単位</th>
                      <th class="col-price">単価</th>
                      <th class="col-amount">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in sameHousingBillingItems" :key="index">
                      <td class="col-code">{{ item.external_code || '-' }}</td>
                      <td class="col-description">{{ item.description || '-' }}</td>
                      <td class="col-quantity">{{ item.quantity || '-' }}</td>
                      <td class="col-unit">{{ item.unit || '-' }}</td>
                      <td class="col-price">{{ formatPrice(item.unit_price) }}</td>
                      <td class="col-amount">{{ formatPrice(item.amount) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </div>
        </div>
        <div v-else>
          <h2>同一住戸情報</h2>
        </div>
      </div>
    </div>

    <!-- テンプレート登録モーダル -->
    <BillingTemplateModal
      :is-open="showBillingTemplateModal"
      :billing-items="billingItems"
      ref="billingTemplateModalRef"
      @close="closeBillingTemplateModal"
      @save="saveBillingTemplate"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabaseService } from '../services/supabase'
import BillingTemplateModal from './BillingTemplateModal.vue'

const router = useRouter()

// 親コンポーネントから認証状態を受け取る
const props = defineProps({
  isAuthenticated: {
    type: Boolean,
    default: false
  }
})

const works = ref([])
const loading = ref(false) // WORKS一覧の読み込み状態
const detailsLoading = ref(false) // ワーク詳細の読み込み状態
const error = ref(null)
const selectedWorkId = ref(null)
const selectedWork = ref(null)
const pdfFile = ref(null) // PDFファイル情報
const billingItems = ref([]) // 請求項目

// マスターデータ
const employees = ref([])
const mcs = ref([])
const largeSteps = ref([])
const largeJkkStatuses = ref([])
const largeProgressiveStatuses = ref([])
const smallJkkStatuses = ref([])
const smallProgressiveStatuses = ref([])

// フィルター状態
const filterSmall = ref(false) // 小口チェック
const filterLarge = ref(false) // あき家チェック
const filterYear = ref('') // 年度セレクト
const filterMc = ref('') // MCセレクト
const filterLocation = ref('') // 場所検索
const filterDetail = ref('') // 詳細検索

// スーパー検索（請求アイテム検索）
const superSearchQuery = ref('') // 検索クエリ
const superSearchWorkIds = ref([]) // マッチしたwork_id
const superSearchLoading = ref(false) // 検索中フラグ

// テンプレート登録モーダル
const showBillingTemplateModal = ref(false)
const billingTemplateModalRef = ref(null)

// 右パネル: 同一住戸WORKS
const showSameHousingWorks = ref(false)
const sameHousingWorks = ref([])
const selectedSameHousingWork = ref(null)
const sameHousingError = ref(null) // 右パネル専用エラー
const sameHousingPdfFile = ref(null) // 同一住戸WORKのPDFファイル情報
const sameHousingBillingItems = ref([]) // 同一住戸WORKの請求項目

// 展開状態
const expandedKinds = ref({})
const expandedYears = ref({})
const expandedMc = ref({})

const emit = defineEmits(['edit-work', 'create-estimate', 'loading-changed'])

// loadingの変更を監視して親に通知
watch(loading, (newValue) => {
  emit('loading-changed', newValue)
})

// 認証状態の変更を監視してマスターデータを読み込む
watch(() => props.isAuthenticated, async (newValue, oldValue) => {
  if (newValue && !oldValue) {
    // 認証されたらマスターデータを読み込む
    await loadMasterData()
  }
})

// WORKSをkind→order_year→mc_idでグループ化
const groupedWorks = computed(() => {
  const kindMap = {}
  
  works.value.forEach(work => {
    const kind = work.kind || 'unknown'
    if (!kindMap[kind]) {
      kindMap[kind] = {
        kind,
        years: {}
      }
    }
    
    const orderYear = work.order_year || 'unknown'
    if (!kindMap[kind].years[orderYear]) {
      kindMap[kind].years[orderYear] = {
        order_year: orderYear,
        mcGroups: {}
      }
    }
    
    const mcId = work.mc_id || 'unknown'
    if (!kindMap[kind].years[orderYear].mcGroups[mcId]) {
      kindMap[kind].years[orderYear].mcGroups[mcId] = {
        mc_id: mcId,
        works: []
      }
    }
    
    kindMap[kind].years[orderYear].mcGroups[mcId].works.push(work)
  })
  
  // 配列に変換してソート
  return Object.keys(kindMap)
    .sort()
    .map(kind => ({
      kind,
      years: Object.keys(kindMap[kind].years)
        .sort((a, b) => {
          // 数値として比較（unknownは最後）
          if (a === 'unknown') return 1
          if (b === 'unknown') return -1
          return Number(b) - Number(a) // 降順
        })
        .map(year => ({
          order_year: year,
          mcGroups: Object.keys(kindMap[kind].years[year].mcGroups)
            .sort((a, b) => {
              if (a === 'unknown') return 1
              if (b === 'unknown') return -1
              return Number(a) - Number(b) // 昇順
            })
            .map(mcId => ({
              mc_id: mcId,
              works: kindMap[kind].years[year].mcGroups[mcId].works.sort((a, b) => {
                // 1. housing_details.nameでソート
                const nameA = a.housing_details?.name || ''
                const nameB = b.housing_details?.name || ''
                const nameCompare = nameA.localeCompare(nameB, 'ja')
                if (nameCompare !== 0) return nameCompare
                
                // 2. housing_details.buildingでソート
                const buildingA = a.housing_details?.building || ''
                const buildingB = b.housing_details?.building || ''
                const buildingCompare = buildingA.localeCompare(buildingB, 'ja')
                if (buildingCompare !== 0) return buildingCompare
                
                // 3. roomでソート
                const roomA = a.room || ''
                const roomB = b.room || ''
                return roomA.localeCompare(roomB, 'ja')
              })
            }))
        }))
    }))
})

// 利用可能な年度リスト
const availableYears = computed(() => {
  const years = new Set()
  works.value.forEach(work => {
    if (work.order_year) years.add(work.order_year)
  })
  return Array.from(years).sort((a, b) => b - a) // 降順
})

// 利用可能なMCリスト（{ id, label } のオブジェクト配列）
const availableMcs = computed(() => {
  const mcIds = new Set()
  works.value.forEach(work => {
    if (work.mc_id) mcIds.add(work.mc_id)
  })
  return Array.from(mcIds)
    .sort((a, b) => a - b) // ID昇順
    .map(id => ({
      id: id,
      label: getMcLabel(id)
    }))
})

// フィルターがアクティブかどうか（場所検索、詳細検索、年度、MC、スーパー検索のいずれかが設定されている場合）
const isFilterActive = computed(() => {
  return filterLocation.value.trim() !== '' || 
         filterDetail.value.trim() !== '' ||
         filterYear.value !== '' ||
         filterMc.value !== '' ||
         superSearchWorkIds.value.length > 0
})

// フィルター適用後のワークス
const filteredWorks = computed(() => {
  let result = works.value
  
  // 小口/あき家フィルター（両方チェックされているか両方チェックされていない場合は全て表示）
  if (filterSmall.value !== filterLarge.value) {
    if (filterSmall.value) {
      result = result.filter(w => w.kind === 'small')
    } else if (filterLarge.value) {
      result = result.filter(w => w.kind === 'large')
    }
  }
  
  // 年度フィルター
  if (filterYear.value) {
    result = result.filter(w => w.order_year === filterYear.value)
  }
  
  // MCフィルター
  if (filterMc.value) {
    result = result.filter(w => w.mc_id === filterMc.value)
  }
  
  // 場所検索（housing_details.name + building + room で部分一致）
  if (filterLocation.value.trim()) {
    const searchTerm = filterLocation.value.trim().toLowerCase()
    result = result.filter(w => {
      const locationStr = getWorkDisplayName(w).toLowerCase()
      return locationStr.includes(searchTerm)
    })
  }
  
  // 詳細検索（repair_item, jkk_note, note, execution_detail で検索）
  if (filterDetail.value.trim()) {
    const searchTerm = filterDetail.value.trim().toLowerCase()
    result = result.filter(w => {
      // 検索対象フィールドを結合
      const searchableFields = [
        w.repair_item || '',
        w.jkk_note || '',
        w.note || '',
        w.execution_detail || ''
      ].join(' ').toLowerCase()
      return searchableFields.includes(searchTerm)
    })
  }
  
  // スーパー検索（請求アイテム検索結果でフィルタリング）
  if (superSearchWorkIds.value.length > 0) {
    const workIdSet = new Set(superSearchWorkIds.value)
    result = result.filter(w => workIdSet.has(w.id))
  }
  
  return result
})

// フィルター適用後のワークス（表示名→年度→MCの優先順位でソート）
const filteredWorksSorted = computed(() => {
  return [...filteredWorks.value].sort((a, b) => {
    // 1. 表示名でソート
    const nameA = getWorkDisplayName(a)
    const nameB = getWorkDisplayName(b)
    const nameCompare = nameA.localeCompare(nameB, 'ja')
    if (nameCompare !== 0) return nameCompare
    
    // 2. 年度でソート（降順：新しい年が先）
    const yearA = a.order_year || 0
    const yearB = b.order_year || 0
    const yearCompare = yearB - yearA
    if (yearCompare !== 0) return yearCompare
    
    // 3. MCでソート（昇順）
    const mcA = a.mc_id || 0
    const mcB = b.mc_id || 0
    return mcA - mcB
  })
})

// ワークスの表示名を生成
function getWorkDisplayName(work) {
  const housingName = work.housing_details?.name || ''
  const building = work.housing_details?.building || ''
  const room = work.room || ''
  
  const parts = []
  if (housingName) parts.push(housingName)
  if (building) parts.push(building)
  if (room) parts.push(room)
  
  return parts.length > 0 ? parts.join('-') : `Work ${work.id}`
}

// 従業員名を取得
function getEmployeeName(employeeId) {
  if (!employeeId) return '-'
  const employee = employees.value.find(e => e.id === employeeId)
  return employee?.last_name || '-'
}

// MCラベルを取得
function getMcLabel(mcId) {
  if (!mcId) return '-'
  // 型を統一して検索（文字列と数値の両方に対応）
  const mc = mcs.value.find(m => m.id == mcId)  // == で型を気にせず比較
  if (!mc) {
    console.warn('MC not found for id:', mcId, 'Type:', typeof mcId, 'Available MCs:', mcs.value)
    return `MC-${mcId}`
  }
  return mc.label
}

// あき家段階補修ラベルを取得
function getLargeStepLabel(stepId) {
  if (!stepId) return '-'
  const step = largeSteps.value.find(s => s.id === stepId)
  return step?.label || '-'
}

// あき家公社状態ラベルを取得
function getLargeJkkStatusLabel(statusId) {
  if (!statusId) return '-'
  const status = largeJkkStatuses.value.find(s => s.id === statusId)
  return status?.label || '-'
}

// あき家工事状況ラベルを取得
function getLargeProgressiveStatusLabel(statusId) {
  if (!statusId) return '-'
  const status = largeProgressiveStatuses.value.find(s => s.id === statusId)
  return status?.label || '-'
}

// 従業員ラベルを取得
function getEmployeeLabel(employeeId) {
  if (!employeeId) return '-'
  const employee = employees.value.find(e => e.id === employeeId)
  return employee?.last_name || '-'
}

// 小口公社状態ラベルを取得
function getSmallJkkStatusLabel(statusId) {
  if (!statusId) return '-'
  const status = smallJkkStatuses.value.find(s => s.id === statusId)
  return status?.label || '-'
}

// 小口工事状況ラベルを取得
function getSmallProgressiveStatusLabel(statusId) {
  if (!statusId) return '-'
  const status = smallProgressiveStatuses.value.find(s => s.id === statusId)
  return status?.label || '-'
}

// 使用年月日を年とヶ月に分割
function formatUsageMonth(usageMonth) {
  if (!usageMonth) return { years: 0, months: 0 }
  const years = Math.floor(usageMonth / 12)
  const months = usageMonth % 12
  return { years, months }
}

// 金額フォーマット
function formatPrice(value) {
  if (value === null || value === undefined) return '-'
  const num = Number(value)
  if (isNaN(num)) return '-'
  return num.toLocaleString('ja-JP') + '円'
}

// 請求項目の合計金額
const totalAmount = computed(() => {
  return billingItems.value.reduce((sum, item) => {
    const amount = Number(item.amount) || 0
    return sum + amount
  }, 0)
})

// 同一住戸WORKの請求項目の合計金額
const sameHousingTotalAmount = computed(() => {
  return sameHousingBillingItems.value.reduce((sum, item) => {
    const amount = Number(item.amount) || 0
    return sum + amount
  }, 0)
})

// トグル関数
function toggleKind(kind) {
  expandedKinds.value[kind] = !expandedKinds.value[kind]
}

function toggleYear(kind, year) {
  const key = `${kind}-${year}`
  expandedYears.value[key] = !expandedYears.value[key]
}

function toggleMc(kind, year, mcId) {
  const key = `${kind}-${year}-${mcId}`
  expandedMc.value[key] = !expandedMc.value[key]
}

// ワークスを選択（詳細は既に取得済み、PDF情報と請求項目のみ取得）
async function selectWork(work) {
  selectedWorkId.value = work.id
  selectedWork.value = work
  pdfFile.value = null
  billingItems.value = []
  
  try {
    detailsLoading.value = true
    error.value = null
    
    // PDF情報、請求項目を並列で取得（詳細は既にworkに含まれている）
    const [pdf, billing] = await Promise.all([
      supabaseService.getPdfFile(work.id).catch(() => null), // PDFがない場合はnullを返す
      supabaseService.getBillingItems(work.id).catch(() => ({ billingItems: [] })) // 請求項目がない場合は空配列
    ])
    
    pdfFile.value = pdf
    billingItems.value = billing.billingItems || []
  } catch (err) {
    console.error('Error fetching work details:', err)
    error.value = `詳細の取得に失敗しました: ${err.message}`
  } finally {
    detailsLoading.value = false
  }
}

// 編集ページに遷移
function goToEditPage() {
  if (selectedWorkId.value) {
    // 親コンポーネントにイベントを発火してタブを切り替え
    emit('edit-work', selectedWorkId.value)
    // URLパラメータも設定
    router.push({ path: '/', query: { work_id: selectedWorkId.value } })
  }
}

// 見積作成ページに遷移
function goToEstimatePage() {
  if (selectedWorkId.value) {
    emit('create-estimate', selectedWorkId.value)
  }
}

// PDFを開く
function openPdf() {
  if (pdfFile.value && pdfFile.value.signed_url) {
    window.open(pdfFile.value.signed_url, '_blank')
  }
}

// 同一住戸のWORKSを表示
function showSameHousing() {
  if (!selectedWork.value) return
  
  const housingDetailId = selectedWork.value.housing_detail_id
  const room = selectedWork.value.room
  
  if (!housingDetailId || !room) {
    sameHousingError.value = 'ハウジングIDまたはルームが設定されていません'
    showSameHousingWorks.value = true
    sameHousingWorks.value = []
    return
  }
  
  // エラーをクリア
  sameHousingError.value = null
  
  // 同じhousing_detail_idとroomを持つWORKSを抽出
  const filteredWorks = works.value.filter(w => 
    w.housing_detail_id === housingDetailId && w.room === room
  )
  
  // ordered_onで降順ソート（nullは一番上）
  const sortedWorks = filteredWorks.sort((a, b) => {
    if (a.ordered_on === null && b.ordered_on === null) return 0
    if (a.ordered_on === null) return -1
    if (b.ordered_on === null) return 1
    return new Date(b.ordered_on) - new Date(a.ordered_on)
  })
  
  sameHousingWorks.value = sortedWorks
  showSameHousingWorks.value = true
  selectedSameHousingWork.value = null
}

// 同一住戸WORKSの表示を閉じる
function closeSameHousing() {
  showSameHousingWorks.value = false
  sameHousingWorks.value = []
  selectedSameHousingWork.value = null
  sameHousingError.value = null
  sameHousingBillingItems.value = []
}

// 同一住戸WORKを選択（詳細は既に取得済み、PDF情報と請求項目を取得）
async function selectSameHousingWork(work) {
  selectedSameHousingWork.value = work
  sameHousingPdfFile.value = null
  sameHousingBillingItems.value = []
  
  try {
    detailsLoading.value = true
    error.value = null
    
    // PDF情報と請求項目を並列で取得（詳細は既にworkに含まれている）
    const [pdf, billing] = await Promise.all([
      supabaseService.getPdfFile(work.id).catch(() => null), // PDFがない場合はnullを返す
      supabaseService.getBillingItems(work.id).catch(() => ({ billingItems: [] })) // 請求項目がない場合は空配列
    ])
    
    sameHousingPdfFile.value = pdf
    sameHousingBillingItems.value = billing.billingItems || []
  } catch (err) {
    console.error('Error fetching work details:', err)
    error.value = `詳細の取得に失敗しました: ${err.message}`
  } finally {
    detailsLoading.value = false
  }
}

// 同一住戸WORKの表示名を生成
function getSameHousingWorkDisplayName(work) {
  const prefix = work.kind === 'small' ? '小口' : 'あき家'
  const dueOn = work.due_on || '-'
  
  return `${prefix}：${dueOn}`
}

// 同一住戸WORKのPDFを開く
function openSameHousingPdf() {
  if (sameHousingPdfFile.value && sameHousingPdfFile.value.signed_url) {
    window.open(sameHousingPdfFile.value.signed_url, '_blank')
  }
}

// テンプレート登録モーダルを開く
function openBillingTemplateModal() {
  if (billingItems.value.length === 0) {
    alert('請求項目がありません')
    return
  }
  showBillingTemplateModal.value = true
}

// テンプレート登録モーダルを閉じる
function closeBillingTemplateModal() {
  showBillingTemplateModal.value = false
  if (billingTemplateModalRef.value) {
    billingTemplateModalRef.value.resetState()
  }
}

// テンプレートを保存
async function saveBillingTemplate(label) {
  if (!selectedWorkId.value) {
    return
  }
  
  try {
    const result = await supabaseService.createBillingTemplate(selectedWorkId.value, label)
    alert(result.message || 'テンプレートを保存しました')
    closeBillingTemplateModal()
  } catch (err) {
    console.error('Error saving billing template:', err)
    if (billingTemplateModalRef.value) {
      billingTemplateModalRef.value.setError(err.message || 'テンプレートの保存に失敗しました')
    }
  }
}

// スーパー検索を実行
async function executeSuperSearch() {
  if (!superSearchQuery.value.trim()) return
  
  try {
    superSearchLoading.value = true
    const workIds = await supabaseService.searchWorksWithBilling(superSearchQuery.value.trim())
    superSearchWorkIds.value = workIds
    
    if (workIds.length === 0) {
      alert('請求アイテムに一致するワークスが見つかりませんでした')
    }
  } catch (err) {
    console.error('Super search error:', err)
    alert('検索に失敗しました: ' + err.message)
  } finally {
    superSearchLoading.value = false
  }
}

// スーパー検索をクリア
function clearSuperSearch() {
  superSearchQuery.value = ''
  superSearchWorkIds.value = []
}

// 全フィルターをクリア
function clearAllFilters() {
  filterSmall.value = false
  filterLarge.value = false
  filterYear.value = ''
  filterMc.value = ''
  filterLocation.value = ''
  filterDetail.value = ''
  superSearchQuery.value = ''
  superSearchWorkIds.value = []
}

// データ読み込み
async function loadWorks() {
  try {
    loading.value = true
    error.value = null
    const data = await supabaseService.getAllWorks()
    works.value = data
    
    // デフォルトで最初のkindを展開
    if (data.length > 0) {
      const firstKind = data[0].kind
      if (firstKind) {
        expandedKinds.value[firstKind] = true
      }
    }
  } catch (err) {
    console.error('Error loading works:', err)
    error.value = `データの読み込みに失敗しました: ${err.message}`
  } finally {
    loading.value = false
  }
}

// マウント時、認証済みでworksが空の場合は自動読み込み
// マウント時、認証済みでworksが空の場合は自動読み込み
onMounted(async () => {
  // 認証済みの場合のみマスターデータを読み込み
  if (props.isAuthenticated) {
    await loadMasterData()
  }
  
  // 初回マウント時、認証済みでworksが空の場合は読み込む
  // （リロードボタンを押さなくても初回は自動読み込み）
  if (props.isAuthenticated && works.value.length === 0) {
    loadWorks()
  }
})

// マスターデータ読み込み
async function loadMasterData() {
  try {
    // Edge Function経由で全マスターデータを取得
    const masterData = await supabaseService.getAllMaster()
    
    employees.value = masterData.employees || []
    mcs.value = masterData.mc || []
    largeSteps.value = masterData.largeSteps || []
    largeJkkStatuses.value = masterData.largeJkkStatuses || []
    largeProgressiveStatuses.value = masterData.largeProgressiveStatuses || []
    smallJkkStatuses.value = masterData.smallJkkStatuses || []
    smallProgressiveStatuses.value = masterData.smallProgressiveStatuses || []
  } catch (err) {
    console.error('Failed to load master data:', err)
  }
}

// 担当者変更
async function handleEmployeeChange() {
  if (!selectedWork.value) return
  
  try {
    await supabaseService.updateWork(selectedWork.value.id, {
      employee_id: selectedWork.value.employee_id
    })
    
    // ローカルの works 配列も更新
    const workIndex = works.value.findIndex(w => w.id === selectedWork.value.id)
    if (workIndex !== -1) {
      works.value[workIndex].employee_id = selectedWork.value.employee_id
    }
  } catch (err) {
    console.error('Failed to update employee:', err)
    error.value = `担当者の更新に失敗しました: ${err.message}`
  }
}

// 親コンポーネントからアクセスできるようにloadWorks関数を公開
defineExpose({
  loadWorks
})
</script>

<style scoped>
.home-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.home-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.left-panel,
.center-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1rem;
  min-height: 0;
  height: 100%;
  background: white;
}

.left-panel .works-tree,
.left-panel .loading-message,
.left-panel .error-message,
.center-panel .no-selection {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.left-panel {
  width: 500px;
  border-right: 1px solid #e5e7eb;
}

.center-panel {
  flex: 1;
  border-right: 1px solid #e5e7eb;
}

.right-panel {
  flex: 1;
}

.right-panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.left-panel h2,
.right-panel h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.no-data-message {
  padding: 2rem 1rem;
  text-align: center;
  color: #6b7280;
}

.loading-message,
.error-message {
  padding: 1rem;
  text-align: center;
}

.error-message {
  color: #dc2626;
}

.works-tree {
  user-select: none;
}

.tree-header {
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.25rem;
}

.tree-header:hover {
  background: #f3f4f6;
}

.toggle-icon {
  width: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.tree-label {
  font-weight: 500;
  color: #374151;
}

.tree-content {
  margin-left: 1.5rem;
}

.kind-group .tree-header {
  font-weight: 600;
  font-size: 1rem;
}

.year-group .tree-header {
  font-weight: 500;
}

.mc-group .tree-header {
  font-weight: 400;
}

.work-item {
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
  cursor: pointer;
  border-radius: 0.25rem;
  color: #374151;
}

.work-item:hover {
  background: #f3f4f6;
}

.work-item.active {
  background: #dbeafe;
  color: #1e40af;
  font-weight: 500;
}

/* work-details-container と same-housing-details-container */
.work-details-container,
.same-housing-details-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ヘッダー固定 */
.work-details-header,
.same-housing-details-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1rem;
}

/* スクロール可能エリア */
.work-details,
.same-housing-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 同一住戸リストコンテナ */
.same-housing-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.same-housing-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.header-left-buttons {
  display: flex;
  gap: 0.5rem;
}

.same-housing-button {
  padding: 0.5rem 1rem;
  border: 1px solid #8b5cf6;
  border-radius: 0.375rem;
  background: #8b5cf6;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.same-housing-button:hover {
  background: #7c3aed;
}

.edit-button,
.pdf-button {
  padding: 0.5rem 1rem;
  border: 1px solid #3b82f6;
  border-radius: 0.375rem;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.edit-button:hover,
.pdf-button:hover {
  background: #2563eb;
}

.pdf-button {
  background: #10b981;
  border-color: #10b981;
}

.pdf-button:hover {
  background: #059669;
}

.pdf-button:disabled {
  background: #d1d5db;
  border-color: #d1d5db;
  cursor: not-allowed;
}

.estimate-button {
  padding: 0.5rem 1rem;
  border: 1px solid #f59e0b;
  border-radius: 0.375rem;
  background: #f59e0b;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.estimate-button:hover {
  background: #d97706;
  border-color: #d97706;
}

.pdf-button:disabled:hover {
  background: #d1d5db;
}

.work-info,
.work-info-unified,
.work-details-section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.375rem;
}

.work-info-unified {
  margin-bottom: 1rem;
}

/* 横並び行 */
.info-row-horizontal {
  display: flex;
  gap: 2rem;
  margin-bottom: 0.75rem;
}

.info-row-horizontal .info-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 場所用（大きめの文字） */
.info-field-location {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-label-large {
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  font-size: 1rem;
}

.info-value-large {
  color: #111827;
  font-size: 1.125rem;
  font-weight: 600;
}

/* 縦並び行 */
.info-row-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

/* ノート用テキストエリア */
.note-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
}

/* 工事状況セレクト */
.status-select {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

.work-info h3,
.work-details-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.info-row {
  display: flex;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: #6b7280;
  min-width: 120px;
}

.info-value {
  color: #374151;
  flex: 1;
}

.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
}

/* 右パネル: 同一住戸WORKS */
.right-panel-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.right-panel-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.back-button {
  padding: 0.375rem 0.75rem;
  border: 1px solid #6b7280;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.back-button:hover {
  background: #f3f4f6;
}

.same-housing-item {
  padding: 0.75rem;
  cursor: pointer;
  border-radius: 0.25rem;
  border: 1px solid #e5e7eb;
  margin-bottom: 0.5rem;
  background: white;
  transition: all 0.2s;
}

.same-housing-item:hover {
  background: #f3f4f6;
  border-color: #8b5cf6;
}

.same-housing-item.current-work {
  color: #9ca3af;
  background: #f9fafb;
}

.same-housing-details .work-info-unified {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
}

.same-housing-details .billing-section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  margin-top: 1rem;
}

.back-to-list-button {
  padding: 0.375rem 0.75rem;
  border: 1px solid #6b7280;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.back-to-list-button:hover {
  background: #f3f4f6;
}

/* ヘッダー右側ボタングループ */
.header-right-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* テンプレート登録ボタン */
.template-button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #f59e0b;
  border-radius: 0.375rem;
  background: #f59e0b;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.template-button:hover:not(:disabled) {
  background: #d97706;
  border-color: #d97706;
}

.template-button:disabled {
  background: #d1d5db;
  border-color: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}

/* 請求項目セクション */
.billing-section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  margin-top: 1rem;
}

.billing-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
}

/* 合計金額を上部に表示 */
.billing-total-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #eff6ff;
  border: 2px solid #93c5fd;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 1.125rem;
  font-weight: 600;
}

.billing-total-top .total-label {
  color: #3b82f6;
}

.billing-total-top .total-amount {
  color: #3b82f6;
  font-size: 1.25rem;
}

.billing-table-wrapper {
  overflow-x: auto;
}

.billing-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.billing-table th,
.billing-table td {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  text-align: left;
}

.billing-table th {
  background: #f3f4f6;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.billing-table tbody tr:hover {
  background: #f9fafb;
}

.billing-table .col-code {
  min-width: 80px;
  color: #6b7280;
}

.billing-table .col-description {
  min-width: 200px;
}

.billing-table .col-quantity,
.billing-table .col-unit {
  min-width: 60px;
  text-align: center;
}

.billing-table .col-price,
.billing-table .col-amount {
  min-width: 100px;
  text-align: right;
}

.billing-table tfoot .total-label {
  text-align: right;
  font-weight: 600;
  background: #f3f4f6;
}

.billing-table tfoot .total-amount {
  font-weight: 600;
  background: #fef3c7;
  color: #92400e;
}

/* フィルターエリア */
.filter-area {
  padding: 0.75rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-clear-all-btn {
  padding: 0 0.5rem;
  height: 30px;
  border: none;
  border-radius: 0.25rem;
  background: transparent;
  color: #9ca3af;
  font-size: 0.875rem;
  cursor: pointer;
  flex-shrink: 0;
}

.filter-clear-all-btn:hover {
  color: #ef4444;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  white-space: nowrap;
  height: 30px;
}

.filter-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.filter-select {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  background: white;
  min-width: 80px;
  height: 30px;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.filter-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-input-wrapper .filter-input {
  width: 100%;
  padding-right: 24px;
}

.filter-input-clear {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: #d1d5db;
  color: white;
  font-size: 10px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.filter-input-clear:hover {
  background: #ef4444;
}

.filter-input {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  height: 30px;
  box-sizing: border-box;
}

.filter-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.filter-input-wrapper.filter-location {
  flex: 2;
  min-width: 180px;
}

.filter-input-wrapper.filter-detail {
  flex: 1;
  min-width: 150px;
}

.filter-super {
  width: 200px;
  flex-shrink: 0;
}

.super-search-btn {
  padding: 0.375rem 0.5rem;
  border: 1px solid #f59e0b;
  border-radius: 0.25rem;
  background: #f59e0b;
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
}

.super-search-btn svg {
  display: block;
}

.super-search-btn:hover:not(:disabled) {
  background: #d97706;
  border-color: #d97706;
}

.super-search-btn:disabled {
  background: #d1d5db;
  border-color: #d1d5db;
  cursor: not-allowed;
}

.loading-dots {
  font-size: 12px;
  letter-spacing: 2px;
}

.super-search-clear-btn {
  padding: 0.375rem 0.5rem;
  border: 1px solid #ef4444;
  border-radius: 0.25rem;
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
}

.super-search-clear-btn:hover {
  background: #dc2626;
  border-color: #dc2626;
}

/* フラットリスト表示 */
.works-flat-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.works-flat-list .work-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-radius: 0.25rem;
  color: #374151;
  margin: 0 0.5rem 0.25rem 0.5rem;
}

.works-flat-list .work-item:hover {
  background: #f3f4f6;
}

.works-flat-list .work-item.active {
  background: #dbeafe;
  color: #1e40af;
  font-weight: 500;
}

.work-kind-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 500;
  white-space: nowrap;
}

.work-kind-badge.small {
  background: #dbeafe;
  color: #1e40af;
}

.work-kind-badge.large {
  background: #fef3c7;
  color: #92400e;
}

.work-year-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 500;
  white-space: nowrap;
  background: #e0e7ff;
  color: #3730a3;
}

.work-mc-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 500;
  white-space: nowrap;
  background: #d1fae5;
  color: #065f46;
}

.work-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

