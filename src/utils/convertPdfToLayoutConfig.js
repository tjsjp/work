// PDF生成ロジックをpdf_applications_mapsの形式に変換するユーティリティ
// 現在のpdfGenerator.jsのrenderFirstPageHeaderを参考に、layout_config形式に変換

/**
 * 現在のPDF生成ロジックをpdf_applications_mapsの形式に変換
 * セル分割は4倍（COLS: 232, ROWS: 328）
 */
export function convertFirstPageToLayoutConfig(workData, repairItem) {
  const work = workData?.work || {}
  const housing = workData?.housing_details || {}
  const smallWorkDetail = workData?.small_work_details || {}
  const company = workData?.master_companies || {}
  
  const orderYear = work.order_year || ''
  const orderNo = work.order_no || ''
  const housingName = housing.name || ''
  const building = housing.building || ''
  const room = work.room || ''
  const repairItemValue = repairItem || (smallWorkDetail?.repair_item || '')
  const companyName = company.name || ''
  
  const elements = []
  
  // セル座標を4倍に変換（58→232, 82→328）
  function scaleCoord(coord) {
    return coord * 4
  }
  
  // テキスト要素を追加するヘルパー
  function addText(text, x0, y0, x1, y1, options = {}) {
    if (text === null || text === undefined) return
    
    elements.push({
      elementType: 'text',
      position: {
        x0: scaleCoord(x0),
        y0: scaleCoord(y0),
        x1: scaleCoord(x1),
        y1: scaleCoord(y1)
      },
      config: {
        text: String(text),
        fontSize: options.fontSize || 10,
        fontWeight: options.bold ? 'bold' : 'normal',
        align: options.align || 'center',
        color: [0, 0, 0]
      }
    })
  }
  
  // ボーダー要素を追加するヘルパー
  function addBorder(x0, y0, x1, y1, options = {}) {
    elements.push({
      elementType: 'border',
      position: {
        x0: scaleCoord(x0),
        y0: scaleCoord(y0),
        x1: scaleCoord(x1),
        y1: scaleCoord(y1)
      },
      config: {
        borderType: options.style || 'solid',
        thickness: options.thickness || 0.7,
        color: options.color || [0, 0, 0],
        sides: options.sides || ['top', 'bottom', 'left', 'right']
      }
    })
  }
  
  // 線要素を追加するヘルパー
  function addLine(x0, y0, x1, y1, options = {}) {
    elements.push({
      elementType: 'line',
      position: {
        x0: scaleCoord(x0),
        y0: scaleCoord(y0),
        x1: scaleCoord(x1),
        y1: scaleCoord(y1)
      },
      config: {
        lineType: options.style || 'solid',
        thickness: options.thickness || 0.4,
        color: options.color || [0.5, 0.5, 0.5],
        sides: options.sides || ['bottom']
      }
    })
  }
  
  // 公または都の表示（条件付き）
  if (orderYear && String(orderYear).startsWith('20')) {
    addText('公', 7, 4, 8, 5, { bold: true })
  }
  if (orderYear && String(orderYear).startsWith('21')) {
    addText('都', 9, 4, 10, 5, { bold: true })
  }
  
  // オーダーNOを1文字ずつ右詰めで表示
  const orderNoChars = String(orderNo || '').split('').reverse()
  const orderNoPositions = [
    { x0: 11, y0: 4, x1: 12, y1: 5 },
    { x0: 9, y0: 4, x1: 10, y1: 5 },
    { x0: 7, y0: 4, x1: 8, y1: 5 }
  ]
  for (let i = 0; i < orderNoPositions.length; i++) {
    const pos = orderNoPositions[i]
    const char = orderNoChars[i] || ''
    if (char) {
      addText(char, pos.x0, pos.y0, pos.x1, pos.y1)
    }
  }
  
  // ヘッダー項目
  addText('施工年度', 13, 4, 18, 5, { bold: true })
  addText(orderYear, 19, 4, 24, 5)
  addText('発注番号', 25, 4, 28, 5, { bold: true })
  addText('住宅名', 9, 9, 12, 10, { bold: true })
  addText(housingName, 13, 9, 34, 10)
  addText(building, 13, 13, 20, 14)
  addText('号棟', 21, 13, 23, 14, { bold: true })
  addText(room, 24, 13, 31, 14)
  addText('号室', 32, 13, 34, 14, { bold: true })
  addText(repairItemValue, 13, 17, 34, 18, { bold: true })
  addText('補修業者名', 9, 20, 14, 21, { bold: true })
  addText(companyName, 15, 20, 34, 21)
  
  // 外枠
  addBorder(7, 4, 38, 26, {
    style: 'solid',
    thickness: 0.7,
    color: [0, 0, 0]
  })
  
  // 横方向の下枠点線
  const dashedBottoms = [
    [9, 21, 34, 21],
    [13, 18, 34, 18],
    [13, 14, 34, 14],
    [9, 10, 34, 10],
    [7, 5, 38, 5]
  ]
  for (const [x0, y0, x1, y1] of dashedBottoms) {
    addLine(x0, y0, x1, y1, {
      style: 'dashed',
      thickness: 0.4,
      color: [0.5, 0.5, 0.5],
      sides: ['bottom']
    })
  }
  
  // 縦方向の右枠：点線/二重線
  const dashedRightXs = [8, 10, 18, 28, 30, 32, 34, 36]
  const doubleRightXs = [12, 24]
  
  for (const x of dashedRightXs) {
    addLine(x, 4, x, 5, {
      style: 'dashed',
      thickness: 0.4,
      color: [0.5, 0.5, 0.5],
      sides: ['right']
    })
  }
  
  for (const x of doubleRightXs) {
    addBorder(x, 4, x, 5, {
      style: 'double',
      thickness: 0.5,
      color: [0.5, 0.5, 0.5],
      sides: ['right']
    })
  }
  
  return elements
}

/**
 * 現在のPDF生成ロジック（スロットページ）をpdf_applications_mapsの形式に変換
 */
export function convertSlotPageToLayoutConfig(slots, workPhases, imageUrls, files) {
  const elements = []
  
  // セル座標を4倍に変換
  function scaleCoord(coord) {
    return coord * 4
  }
  
  // スロットごとに要素を追加
  // ここでは基本的な構造のみ。実際の実装はスロットの配置に応じて調整が必要
  
  return elements
}

