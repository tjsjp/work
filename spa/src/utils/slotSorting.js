// sort_index処理のユーティリティ関数

const SORT_INTERVAL = 10000

/**
 * スロットを表示用に変換（displayIndex、pageNumber、slotNumberInPageを付与）
 */
export function prepareSlotsForDisplay(slotsFromDB) {
  // sort_indexでソート
  const sorted = [...slotsFromDB].sort((a, b) => a.sort_index - b.sort_index)
  
  // 改ページを考慮してページ番号とスロット番号を計算
  let currentPage = 1
  let slotNumberInPage = 0
  let displayIndex = 0
  
  return sorted.map((slot) => {
    // break_beforeがtrueの場合、新しいページを開始（最初のスロットでない場合のみ）
    if (slot.break_before && displayIndex > 0) {
      currentPage++
      slotNumberInPage = 0
    }
    
    slotNumberInPage++
    const result = {
      ...slot,
      displayIndex,
      pageNumber: currentPage,
      slotNumberInPage,
      originalSortIndex: slot.sort_index
    }
    
    displayIndex++
    return result
  })
}

/**
 * スロットを2列グリッド用にグループ化（break_beforeでページ区切り、6個ずつ表示）
 */
export function groupSlotsForGrid(slots) {
  const groups = []
  let currentPage = [] // break_beforeで区切られたページ内のすべてのスロット
  let currentPageStartIndex = -1 // 現在のページの開始インデックス
  
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    
    // break_beforeがtrueの場合、新しいページを開始
    if (slot.break_before && currentPage.length > 0) {
      // 現在のページを6個ずつに分割してグループ化
      splitPageIntoGroups(currentPage, currentPageStartIndex, groups)
      // 新しいページを開始
      currentPage = []
      currentPageStartIndex = i
    }
    
    // 最初のスロットでページを開始
    if (currentPage.length === 0) {
      currentPageStartIndex = i
    }
    
    // スロットをページに追加
    currentPage.push(slot)
  }
  
  // 残りのページを6個ずつに分割してグループ化
  if (currentPage.length > 0) {
    splitPageIntoGroups(currentPage, currentPageStartIndex, groups)
  }
  
  return groups
}

/**
 * ページ内のスロットを6個ずつ（左3個、右3個）に分割してグループ化
 */
function splitPageIntoGroups(pageSlots, pageStartIndex, groups) {
  if (pageSlots.length === 0) return
  
  const isFirstPage = pageStartIndex === 0
  const hasBreakBefore = !isFirstPage || (pageSlots[0]?.break_before || false)
  
  // 6個ずつに分割
  for (let i = 0; i < pageSlots.length; i += 6) {
    const chunk = pageSlots.slice(i, i + 6)
    const left = []
    const right = []
    
    // 左3個、右3個に分割
    chunk.forEach((slot, index) => {
      if (index < 3) {
        left.push(slot)
      } else {
        right.push(slot)
      }
    })
    
    // 最初のグループのみhasBreakBeforeを設定
    groups.push({
      left: left,
      right: right,
      hasBreakBefore: i === 0 ? hasBreakBefore : false
    })
  }
}

/**
 * 並び替え後のsort_index更新データを生成
 */
export function generateSortIndexUpdates(slots, newOrder) {
  return newOrder.map((slotId, newIndex) => {
    const slot = slots.find(s => s.id === slotId)
    return {
      id: slot.id,
      sort_index: (newIndex + 1) * SORT_INTERVAL
    }
  })
}

/**
 * 未割当ファイルを取得（画像ファイルのみ、PDFを除外）
 */
export function getUnassignedFiles(files, slots) {
  // 画像ファイルの拡張子
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
  
  // スロットに割り当てられているfile_idのセットを作成
  const assignedFileIds = new Set(
    slots
      .filter(slot => slot.file_id)
      .map(slot => slot.file_id)
  )
  
  // 割り当てられていない画像ファイルのみを返す
  return files.filter(file => {
    // スロットに割り当てられているファイルを除外
    if (assignedFileIds.has(file.id)) {
      return false
    }
    
    // 画像ファイル以外（PDFなど）を除外
    const extension = file.extension?.toLowerCase()
    return extension && imageExtensions.includes(extension)
  })
}

/**
 * リバランスが必要かどうかをチェック
 * 最小間隔がSORT_INTERVAL / 10未満の場合、リバランスが必要
 */
export function checkRebalanceNeeded(slots) {
  if (slots.length === 0) return false
  
  // sort_indexでソート
  const sorted = [...slots].sort((a, b) => a.sort_index - b.sort_index)
  
  // 最小間隔をチェック
  const MIN_INTERVAL = SORT_INTERVAL / 10 // 1000
  
  for (let i = 1; i < sorted.length; i++) {
    const interval = sorted[i].sort_index - sorted[i - 1].sort_index
    if (interval < MIN_INTERVAL) {
      return true // リバランスが必要
    }
  }
  
  return false
}



