// PDF生成ユーティリティ（クライアントサイド版）
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

// ★ Storage にアップした NotoSansJP-Regular / Bold の公開URL
const JP_FONT_URL = "https://vtdhftukofbtxavnzlhv.supabase.co/storage/v1/object/public/settings/fonts/NotoSansJP-Regular.ttf"
const JP_FONT_BOLD_URL = "https://vtdhftukofbtxavnzlhv.supabase.co/storage/v1/object/public/settings/fonts/NotoSansJP-Bold.ttf"
// ★ テスト用画像URL（必要に応じて差し替え）
const SAMPLE_IMAGE_URL = "https://vtdhftukofbtxavnzlhv.supabase.co/storage/v1/object/public/settings/9f22adf0-5658-4f28-ba3c-3750b1f37d88.jpg"

// === グリッド → PDF座標変換ヘルパー ==========================
// x = 横（左→右）, y = 縦（上→下）
// x0,y0 = 左上セル, x1,y1 = 右下セル
function cellRect(pageWidth, pageHeight, x0, y0, x1, y1) {
  const COLS = 58 // 横方向セル数
  const ROWS = 82 // 縦方向セル数
  const cellW = pageWidth / COLS
  const cellH = pageHeight / ROWS
  const left = x0 * cellW
  const right = (x1 + 1) * cellW
  // PDF座標は下が0なので、yは反転させる
  const top = pageHeight - y0 * cellH
  const bottom = pageHeight - (y1 + 1) * cellH
  return {
    x: left,
    y: bottom,
    width: right - left,
    height: top - bottom,
    top,
    bottom
  }
}

// セルの枠線を引く（上/下/左/右 & 実線/点線/二重線）
function drawCellBorder(page, rect, options = {}) {
  const { color = rgb(0, 0, 0), thickness = 0.5, style = "solid", sides = ["top", "bottom", "left", "right"], dashLength = 2, dashGap = 2, doubleOffset = 1 } = options
  const topY = rect.top
  const bottomY = rect.y
  const leftX = rect.x
  const rightX = rect.x + rect.width
  const baseLineOpts = {
    color,
    thickness
  }
  const dashedOpts = style === "dashed" ? {
    dashArray: [dashLength, dashGap]
  } : {}
  
  const draw = (start, end) => {
    page.drawLine({
      start,
      end,
      ...baseLineOpts,
      ...dashedOpts
    })
  }
  
  for (const side of sides) {
    if (style === "double") {
      if (side === "top") {
        const y1 = topY
        const y2 = topY - doubleOffset
        draw({ x: leftX, y: y1 }, { x: rightX, y: y1 })
        draw({ x: leftX, y: y2 }, { x: rightX, y: y2 })
      } else if (side === "bottom") {
        const y1 = bottomY
        const y2 = bottomY + doubleOffset
        draw({ x: leftX, y: y1 }, { x: rightX, y: y1 })
        draw({ x: leftX, y: y2 }, { x: rightX, y: y2 })
      } else if (side === "left") {
        const x1 = leftX
        const x2 = leftX + doubleOffset
        draw({ x: x1, y: bottomY }, { x: x1, y: topY })
        draw({ x: x2, y: bottomY }, { x: x2, y: topY })
      } else if (side === "right") {
        const x1 = rightX
        const x2 = rightX - doubleOffset
        draw({ x: x1, y: bottomY }, { x: x1, y: topY })
        draw({ x: x2, y: bottomY }, { x: x2, y: topY })
      }
    } else {
      if (side === "top") {
        draw({ x: leftX, y: topY }, { x: rightX, y: topY })
      } else if (side === "bottom") {
        draw({ x: leftX, y: bottomY }, { x: rightX, y: bottomY })
      } else if (side === "left") {
        draw({ x: leftX, y: bottomY }, { x: leftX, y: topY })
      } else if (side === "right") {
        draw({ x: rightX, y: bottomY }, { x: rightX, y: topY })
      }
    }
  }
}

// 下枠だけ引くラッパー
function drawBottomLine(page, rect, options = {}) {
  drawCellBorder(page, rect, {
    sides: ["bottom"],
    ...options
  })
}

// セル内の文字を「縦中央」＋「横 左/中央」を選べる版
function drawTextFitInRectMiddle(page, text, rect, opts) {
  if (!text) return
  const { font, maxSize, minSize = 4, color = rgb(0, 0, 0), padding = 2, hAlign = "left" } = opts
  const maxWidth = rect.width - padding * 2
  let size = maxSize
  let width = font.widthOfTextAtSize(text, size)
  if (width > maxWidth) {
    const ratio = maxWidth / width
    size = Math.max(minSize, size * ratio)
    width = font.widthOfTextAtSize(text, size)
  }
  const textHeight = font.heightAtSize(size)
  let x
  if (hAlign === "center") {
    const rawX = rect.x + (rect.width - width) / 2
    const minX = rect.x + padding
    const maxX = rect.x + rect.width - padding - width
    x = Math.max(minX, Math.min(rawX, maxX))
  } else {
    x = rect.x + padding
  }
  const y = rect.y + (rect.height - textHeight) / 2
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color
  })
}

// ★ 余白プレースホルダ（太字・薄いグレー・縦横中央）
function drawYohakuPlaceholder(page, rect, jpFontBold) {
  drawTextFitInRectMiddle(page, "余白", rect, {
    font: jpFontBold,
    maxSize: 32,
    minSize: 18,
    color: rgb(0.9, 0.9, 0.9), // より薄く
    hAlign: "center"
  })
}

// ===== 1ページ目ヘッダーを描画する関数 ==========================
function renderFirstPageHeader(page, pageWidth, pageHeight, jpFont, jpFontBold, workData, repairItem = null) {
  const lineColor = rgb(0, 0, 0)
  const thinGray = rgb(0.6, 0.6, 0.6)
  
  // データの準備
  const work = workData.work
  console.log('PDF生成用データ:', work)
  const housingDetail = Array.isArray(work.housing_details) ? work.housing_details[0] : work.housing_details
  const smallWorkDetail = Array.isArray(work.small_work_details) ? work.small_work_details[0] : work.small_work_details
  const masterCompany = Array.isArray(work.master_companies) ? work.master_companies[0] : work.master_companies
  console.log('マスターカンパニー:', masterCompany)
  
  // オーダーNO: 1文字ずつ右詰めで表示（4文字の場合左端は空）
  const orderNo = String(work.order_no || '')
  const orderNoChars = orderNo.split('').reverse() // 右詰めのため逆順
  const orderNoPositions = [
    { x0: 37, y0: 4, x1: 38, y1: 5 }, // 右端
    { x0: 35, y0: 4, x1: 36, y1: 5 },
    { x0: 33, y0: 4, x1: 34, y1: 5 },
    { x0: 31, y0: 4, x1: 32, y1: 5 },
    { x0: 29, y0: 4, x1: 30, y1: 5 }  // 左端
  ]
  
  // オーダーイヤー: (order_year - 2018) をゼロパディング2文字
  const orderYear = work.order_year ? String(work.order_year - 2018).padStart(2, '0') : ''
  
  // possessionによる表示
  const possession = housingDetail?.possession || ''
  const showKou = possession === 'JKK' // 公を表示
  const showTo = possession === 'Tokyo' // 都を表示
  
  // 住宅名: possessionがTokyoなら「都営」、JKKなら「賃貸」 + (スペース) + name + apartment_type
  let housingName = ''
  if (housingDetail) {
    const prefix = possession === 'Tokyo' ? '都営' : (possession === 'JKK' ? '賃貸' : '')
    const name = housingDetail.name || ''
    const apartmentType = housingDetail.apartment_type || ''
    housingName = prefix ? `${prefix} ${name}${apartmentType}` : `${name}${apartmentType}`
  }
  
  // 号棟: building
  const building = housingDetail?.building || ''
  
  // 号室: works.room
  const room = work.room || ''
  
  // 補修内容: 引数で渡されたrepairItemを使用（なければsmall_work_details.repair_itemをフォールバック）
  const repairItemValue = repairItem || (work.kind === 'small' && smallWorkDetail?.repair_item ? smallWorkDetail.repair_item : null)
  
  // 補修業者名: master_companies.name + company_type
  const companyName = masterCompany ? `${masterCompany.name || ''}${masterCompany.company_type || ''}` : ''
  
  const headerItems = [
    { text: "施工年度", x0: 13, y0: 4, x1: 18, y1: 5, bold: true },
    { text: orderYear, x0: 19, y0: 4, x1: 24, y1: 5 },
    { text: "発注番号", x0: 25, y0: 4, x1: 28, y1: 5, bold: true },
    { text: "住宅名", x0: 9, y0: 9, x1: 12, y1: 10, bold: true },
    { text: housingName, x0: 13, y0: 9, x1: 34, y1: 10 },
    { text: building, x0: 13, y0: 13, x1: 20, y1: 14 },
    { text: "号棟", x0: 21, y0: 13, x1: 23, y1: 14, bold: true },
    { text: room, x0: 24, y0: 13, x1: 31, y1: 14 },
    { text: "号室", x0: 32, y0: 13, x1: 34, y1: 14, bold: true },
    { text: repairItemValue || '', x0: 13, y0: 17, x1: 34, y1: 18, bold: true },
    { text: "補修業者名", x0: 9, y0: 20, x1: 14, y1: 21, bold: true },
    { text: companyName, x0: 15, y0: 20, x1: 34, y1: 21 }
  ]
  
  // オーダーNOを1文字ずつ右詰めで表示
  for (let i = 0; i < orderNoPositions.length; i++) {
    const pos = orderNoPositions[i]
    const char = orderNoChars[i] || '' // 文字がない場合は空文字
    const rect = cellRect(pageWidth, pageHeight, pos.x0, pos.y0, pos.x1, pos.y1)
    if (char) {
      drawTextFitInRectMiddle(page, char, rect, {
        font: jpFont,
        maxSize: 10,
        minSize: 6,
        color: rgb(0, 0, 0),
        hAlign: "center"
      })
    }
  }
  
  // 公または都を表示
  if (showKou) {
    const rect = cellRect(pageWidth, pageHeight, 7, 4, 8, 5)
    drawTextFitInRectMiddle(page, "公", rect, {
      font: jpFontBold,
      maxSize: 10,
      minSize: 6,
      color: rgb(0, 0, 0),
      hAlign: "center"
    })
  }
  
  if (showTo) {
    const rect = cellRect(pageWidth, pageHeight, 9, 4, 10, 5)
    drawTextFitInRectMiddle(page, "都", rect, {
      font: jpFontBold,
      maxSize: 10,
      minSize: 6,
      color: rgb(0, 0, 0),
      hAlign: "center"
    })
  }
  
  // その他のヘッダー項目を描画
  for (const item of headerItems) {
    if (!item.text && item.text !== '') continue // 空文字列は表示する
    
    const rect = cellRect(pageWidth, pageHeight, item.x0, item.y0, item.x1, item.y1)
    drawTextFitInRectMiddle(page, item.text, rect, {
      font: item.bold ? jpFontBold : jpFont,
      maxSize: 10,
      minSize: 6,
      color: rgb(0, 0, 0),
      hAlign: "center"
    })
  }
  
  // 外枠
  const rectOuter = cellRect(pageWidth, pageHeight, 7, 4, 38, 26)
  drawCellBorder(page, rectOuter, {
    style: "solid",
    thickness: 0.7,
    color: lineColor,
    sides: ["top", "bottom", "left", "right"]
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
    const rect = cellRect(pageWidth, pageHeight, x0, y0, x1, y1)
    drawBottomLine(page, rect, {
      style: "dashed",
      thickness: 0.4,
      color: thinGray
    })
  }
  
  // 縦方向の右枠：点線/二重線
  const dashedRightXs = [8, 10, 18, 28, 30, 32, 34, 36]
  const doubleRightXs = [12, 24]
  for (const x of dashedRightXs) {
    const rect = cellRect(pageWidth, pageHeight, x, 4, x, 5)
    drawCellBorder(page, rect, {
      style: "dashed",
      thickness: 0.4,
      color: thinGray,
      sides: ["right"]
    })
  }
  for (const x of doubleRightXs) {
    const rect = cellRect(pageWidth, pageHeight, x, 4, x, 5)
    drawCellBorder(page, rect, {
      style: "double",
      thickness: 0.5,
      color: thinGray,
      sides: ["right"],
      doubleOffset: 1
    })
  }
}

// ===== 画像をCanvasで回転させる関数 =============================================
/**
 * 画像をCanvasで回転させてからBlobに変換
 * @param {Uint8Array} imageBytes - 画像のバイト配列
 * @param {number} rotationDeg - 回転角度（度）
 * @returns {Promise<Uint8Array>} 回転後の画像のバイト配列
 */
async function rotateImageWithCanvas(imageBytes, rotationDeg) {
  if (rotationDeg === 0 || rotationDeg === 360) {
    // 回転不要の場合はそのまま返す
    return imageBytes
  }
  
  return new Promise((resolve, reject) => {
    // 画像をImageオブジェクトに変換
    const img = new Image()
    const blob = new Blob([imageBytes])
    const imgUrl = URL.createObjectURL(blob)
    
    img.onload = () => {
      try {
        // Canvasで回転
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // 回転後のサイズを計算
        const rad = (rotationDeg * Math.PI) / 180
        const cos = Math.abs(Math.cos(rad))
        const sin = Math.abs(Math.sin(rad))
        const w = img.width * cos + img.height * sin
        const h = img.width * sin + img.height * cos
        
        canvas.width = w
        canvas.height = h
        
        // 回転の中心に移動して回転
        ctx.translate(w / 2, h / 2)
        ctx.rotate(rad)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        
        // CanvasをBlobに変換
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob conversion failed'))
            return
          }
          
          blob.arrayBuffer().then(buffer => {
            const rotatedBytes = new Uint8Array(buffer)
            URL.revokeObjectURL(imgUrl)
            resolve(rotatedBytes)
          }).catch(reject)
        }, 'image/jpeg', 0.92)
      } catch (error) {
        URL.revokeObjectURL(imgUrl)
        reject(error)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(imgUrl)
      reject(new Error('Failed to load image'))
    }
    
    img.src = imgUrl
  })
}

// ===== スロットからブロックデータを生成する関数 =============================================
function createBlocksFromSlots(slots, workPhases, imageUrls, filesMap = null) {
  const blocks = []
  const phaseMap = new Map((workPhases || []).map(p => [p.id, p.label || p.name || `Phase ${p.id}`]))
  
  // すべてのスロットをブロックに変換（画像がなくても、備考・フェーズ・カテゴリーがなくても）
  for (const slot of slots) {
    const caption = slot.caption || ''
    const phaseId = slot.work_phase_id
    const phase = phaseId ? (phaseMap.get(phaseId) || '') : ''
    const note = slot.note || ''
    const notes = note.split('\n').filter(n => n.trim() !== '')
    const fileId = slot.file_id
    const imageUrl = fileId && imageUrls ? (imageUrls[fileId] || null) : null
    
    // ファイルデータからローテーション情報を取得
    let rotation = 0
    if (fileId && filesMap) {
      const file = filesMap.get(fileId)
      if (file && file.rotation !== undefined) {
        rotation = file.rotation || 0
      }
    }
    
    blocks.push({
      caption,
      phase,
      notes: notes.length > 0 ? notes : [''],
      fileId,
      imageUrl,
      hasImage: !!imageUrl,
      rotation
    })
  }
  
  return blocks
}

// ===== メインPDF生成関数 =============================================
export async function generatePDF(workData = null, slots = null, workPhases = null, imageUrls = null, files = null, repairItem = null) {
  try {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    
    // 日本語 Regular / Bold フォント読み込み
    const fontRes = await fetch(JP_FONT_URL)
    const fontBoldRes = await fetch(JP_FONT_BOLD_URL)
    if (!fontRes.ok || !fontBoldRes.ok) {
      throw new Error(`フォント取得失敗: ${fontRes.status}, ${fontBoldRes.status}`)
    }
    
    const fontBytes = new Uint8Array(await fontRes.arrayBuffer())
    const fontBoldBytes = new Uint8Array(await fontBoldRes.arrayBuffer())
    const jpFont = await pdfDoc.embedFont(fontBytes, { subset: false })
    const jpFontBold = await pdfDoc.embedFont(fontBoldBytes, { subset: false })
    
    // A4縦
    const pageWidth = 595
    const pageHeight = 842
    
    // 1ページ目：表紙ヘッダー
    const firstPage = pdfDoc.addPage([pageWidth, pageHeight])
    renderFirstPageHeader(firstPage, pageWidth, pageHeight, jpFont, jpFontBold, workData || {
      work: {
        order_no: '01234',
        order_year: 2027,
        housing_detail_id: null,
        company_id: null,
        kind: 'small',
        room: '1001',
        housing_details: {
          possession: 'Tokyo',
          name: 'テスト田無西原',
          apartment_type: 'アパート',
          building: '16'
        },
        small_work_details: {
          repair_item: '長期未入居清掃他'
        },
        master_companies: {
          name: '多摩住宅サービス',
          company_type: '株式会社'
        }
      }
    }, repairItem)
    
    // ファイルデータのマップを作成（fileId -> file）
    const filesMap = new Map()
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file.id) {
          filesMap.set(file.id, file)
        }
      }
    }
    
    // スロットからブロックデータを生成
    let blocks = []
    if (slots && workPhases) {
      blocks = createBlocksFromSlots(slots, workPhases, imageUrls || {}, filesMap)
    } else {
      // テストデータ（スロットがない場合）
      blocks = [
        {
          caption: "玄関ドア交換（着工前）",
          phase: "フェーズ1：着工前",
          notes: [
            "備考1-1：既存ドア状態を確認",
            "備考1-2：枠の歪みあり",
            "備考1-3：周囲タイルにクラック無しあああああ",
            "備考1-4：敷居の段差を確認ああああああああああああああああ",
            "備考1-5：近隣との境界確認",
            "備考1-6：作業スペース確保",
            "備考1-7：共用部養生範囲確認",
            "備考1-8：搬入経路確認",
            "備考1-9：施主立会い済み",
            "備考1-10：その他特記事項なし"
          ],
          hasImage: true,
          imageUrl: null,
          fileId: null
        },
        {
          caption: "玄関ドア交換（施工中）",
          phase: "フェーズ2：施工中",
          notes: [
            "備考2-1：既存枠撤去",
            "備考2-2：下地補修",
            "備考2-3：新規枠仮固定",
            "備考2-4：レベル調整",
            "備考2-5：モルタル補修",
            "備考2-6：シール打設",
            "備考2-7：金物調整",
            "備考2-8：開閉確認",
            "備考2-9：共用部清掃",
            "備考2-10：その他特記事項なし"
          ],
          hasImage: false,
          imageUrl: null,
          fileId: null
        },
        {
          caption: "玄関ドア交換（完了）",
          phase: "フェーズ3：完了",
          notes: [
            "備考3-1：建付け良好",
            "備考3-2：施主確認済み",
            "備考3-3：クレーム無し",
            "備考3-4：写真撮影済み",
            "備考3-5：鍵受け渡し済み",
            "備考3-6：近隣挨拶完了",
            "備考3-7：安全掲示撤去",
            "備考3-8：資材搬出完了",
            "備考3-9：最終清掃完了",
            "備考3-10：その他特記事項なし"
          ],
          hasImage: false,
          imageUrl: null,
          fileId: null
        }
      ]
    }
    
    // レイアウトA（左テキスト / 右画像）
    const layoutA = {
      CAPTION_X0: 3,
      CAPTION_X1: 17,
      PHASE_X0: 3,
      PHASE_X1: 17,
      NOTES_X0: 3,
      NOTES_X1: 17,
      IMAGE_X0: 20,
      IMAGE_X1: 51
    }
    
    // レイアウトB（左画像 / 右テキスト）
    const layoutB = {
      CAPTION_X0: 41,
      CAPTION_X1: 54,
      PHASE_X0: 41,
      PHASE_X1: 54,
      NOTES_X0: 41,
      NOTES_X1: 54,
      IMAGE_X0: 7,
      IMAGE_X1: 38
    }
    
    const CAPTION_Y0 = 3, CAPTION_Y1 = 4
    const PHASE_Y0 = 5, PHASE_Y1 = 6
    const NOTES_Y_START = 7
    const NOTES_Y_STEP = 2
    const IMAGE_Y0 = 3, IMAGE_Y1 = 26
    const BLOCK_Y_OFFSET = 26
    
    // 画像を埋め込む（各ブロックのimageUrlから）
    const embeddedImages = new Map() // fileId -> embeddedImage
    console.log('PDF生成: 画像埋め込み開始', { blocksCount: blocks.length, imageUrlsCount: Object.keys(imageUrls || {}).length })
    
    for (const block of blocks) {
      if (block.hasImage && block.imageUrl && block.fileId && !embeddedImages.has(block.fileId)) {
        try {
          console.log(`画像取得開始: fileId=${block.fileId}, url=${block.imageUrl}`)
          // タイムアウト用のAbortControllerを作成
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒でタイムアウト
          
          const imgRes = await fetch(block.imageUrl, {
            // CORSエラーを避けるため、credentialsをomitに設定
            credentials: 'omit',
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          if (imgRes.ok) {
            let imgBytes = new Uint8Array(await imgRes.arrayBuffer())
            console.log(`画像取得成功: fileId=${block.fileId}, size=${imgBytes.length} bytes`)
            
            // ローテーションを取得（デフォルトは0）
            const rotationDeg = block && block.rotation !== undefined ? (block.rotation || 0) : 0
            
            // ローテーションが0以外の場合はCanvasで回転
            if (rotationDeg !== 0 && rotationDeg !== 360) {
              console.log(`画像を回転: fileId=${block.fileId}, rotation=${rotationDeg}度`)
              try {
                imgBytes = await rotateImageWithCanvas(imgBytes, rotationDeg)
                console.log(`画像回転完了: fileId=${block.fileId}`)
              } catch (rotateError) {
                console.error(`画像回転エラー: fileId=${block.fileId}`, rotateError)
                // 回転に失敗した場合は元の画像を使用
              }
            }
            
            // 画像形式を判定（JPG/PNG）
            const contentType = imgRes.headers.get('content-type') || ''
            let embeddedImage
            try {
              if (contentType.includes('png') || block.imageUrl.toLowerCase().includes('.png')) {
                embeddedImage = await pdfDoc.embedPng(imgBytes)
                console.log(`PNG画像埋め込み成功: fileId=${block.fileId}`)
              } else {
                embeddedImage = await pdfDoc.embedJpg(imgBytes)
                console.log(`JPG画像埋め込み成功: fileId=${block.fileId}`)
              }
              embeddedImages.set(block.fileId, embeddedImage)
            } catch (embedError) {
              console.error("画像埋め込みエラー:", embedError, block.fileId)
              // 埋め込みに失敗してもブロックは作成する（画像なしで）
            }
          } else {
            console.error("画像取得失敗:", imgRes.status, imgRes.statusText, block.imageUrl)
            // 取得に失敗してもブロックは作成する（画像なしで）
          }
        } catch (e) {
          console.error("画像読み込みエラー:", e, block.imageUrl, block.fileId)
          // エラーが発生してもブロックは作成する（画像なしで）
        }
      } else if (block.hasImage && block.fileId) {
        console.warn("画像URLが取得できません:", { fileId: block.fileId, imageUrl: block.imageUrl, hasImage: block.hasImage })
        // 画像URLが取得できなくてもブロックは作成する（画像なしで）
      }
    }
    
    console.log('PDF生成: 画像埋め込み完了', { embeddedImagesCount: embeddedImages.size })
    
    // テスト用の画像（スロットがない場合）
    let testEmbeddedImage = null
    if (blocks.length > 0 && blocks[0].hasImage && !blocks[0].imageUrl) {
      try {
        const imgRes = await fetch(SAMPLE_IMAGE_URL)
        if (imgRes.ok) {
          const imgBytes = new Uint8Array(await imgRes.arrayBuffer())
          testEmbeddedImage = await pdfDoc.embedJpg(imgBytes)
        }
      } catch (e) {
        console.error("テスト画像読み込みエラー:", e)
      }
    }
    
    // 共通レンダリング（テキスト＋画像 or 余白）関数
    function renderBlockOnPage(page, block, blockIndex, layout, options) {
      const lineColor = rgb(0.6, 0.6, 0.6)
      const offsetY = BLOCK_Y_OFFSET * blockIndex
      const rectCaption = cellRect(pageWidth, pageHeight, layout.CAPTION_X0, CAPTION_Y0 + offsetY, layout.CAPTION_X1, CAPTION_Y1 + offsetY)
      const rectPhase = cellRect(pageWidth, pageHeight, layout.PHASE_X0, PHASE_Y0 + offsetY, layout.PHASE_X1, PHASE_Y1 + offsetY)
      // blockがnullの場合は空のnotes配列を使用、最大10個まで
      const notes = block && block.notes ? block.notes : []
      // 最大10個までnotesを作成（足りない分は空文字列で埋める）
      const notesArray = Array.from({ length: 10 }, (_, idx) => notes[idx] || '')
      const rectNotes = notesArray.map((_n, idx) => {
        const y0 = NOTES_Y_START + offsetY + idx * NOTES_Y_STEP
        const y1 = y0 + 1
        return cellRect(pageWidth, pageHeight, layout.NOTES_X0, y0, layout.NOTES_X1, y1)
      })
      const rectImage = cellRect(pageWidth, pageHeight, layout.IMAGE_X0, IMAGE_Y0 + offsetY, layout.IMAGE_X1, IMAGE_Y1 + offsetY)
      
      // テキスト描画（キャプション／フェーズ／備考）
      if (options.drawText && block) {
        drawTextFitInRectMiddle(page, block.caption || '', rectCaption, {
          font: jpFontBold,
          maxSize: 12,
          minSize: 7,
          color: rgb(0, 0, 0),
          hAlign: "center"
        })
        drawTextFitInRectMiddle(page, block.phase || '', rectPhase, {
          font: jpFontBold,
          maxSize: 12,
          minSize: 7,
          color: rgb(0.1, 0.1, 0.1),
          hAlign: "center"
        })
        notesArray.forEach((note, i) => {
          if (note && rectNotes[i]) {
            drawTextFitInRectMiddle(page, note, rectNotes[i], {
              font: jpFont,
              maxSize: 9,
              minSize: 6,
              color: rgb(0.2, 0.2, 0.2),
              hAlign: "left"
            })
          }
        })
      }
      
      // 下線は常に引く（キャプション・フェーズ・備考 全部）
      drawBottomLine(page, rectCaption, {
        thickness: 0.3,
        color: lineColor
      })
      drawBottomLine(page, rectPhase, {
        thickness: 0.3,
        color: lineColor
      })
      rectNotes.forEach((r) => drawBottomLine(page, r, {
        thickness: 0.3,
        color: lineColor
      }))
      
      // 画像 or 余白
      if (options.drawImage) {
        let embeddedImage = null
        if (block && block.fileId) {
          embeddedImage = embeddedImages.get(block.fileId)
        } else if (block && block.hasImage && !block.fileId) {
          embeddedImage = testEmbeddedImage
        }
        
        if (embeddedImage) {
          const imgSize = embeddedImage.scale(1)
          const maxW = rectImage.width
          const maxH = rectImage.height
          const scale = Math.min(maxW / imgSize.width, maxH / imgSize.height)
          const drawW = imgSize.width * scale
          const drawH = imgSize.height * scale
          const imgX = rectImage.x + (maxW - drawW) / 2
          const imgY = rectImage.y + (maxH - drawH) / 2
          page.drawImage(embeddedImage, {
            x: imgX,
            y: imgY,
            width: drawW,
            height: drawH
          })
        } else if (options.showYohakuWhenNoImage) {
          // ★ 画像指定がない・埋め込めない場合は「余白」を表示
          drawYohakuPlaceholder(page, rectImage, jpFontBold)
        }
      }
    }
    
    // 表紙ページ：余白と線の処理（画像割り当てなし）
    // ブロック1とブロック2の画像位置に「余白」を固定で表示
    for (let blockIndex = 0; blockIndex < 3; blockIndex++) {
      // ブロック1とブロック2（blockIndex === 1 または 2）の時だけ余白を表示
      const showYohaku = (blockIndex === 1 || blockIndex === 2)
      renderBlockOnPage(firstPage, null, blockIndex, layoutB, {
        drawText: false,
        drawImage: false,
        showYohakuWhenNoImage: showYohaku // ブロック1と2のみ余白を表示
      })
    }
    
    // スロットからPDFを生成
    if (slots && slots.length > 0) {
      // スロットをブロックに変換（すべてのスロットを含める）
      const allBlocks = createBlocksFromSlots(slots, workPhases, imageUrls || {})
      
      // ページ番号とスロット番号を割り振る
      const slotsWithPageInfo = []
      let currentPageNumber = 1 // 1スタート
      let currentSlotNumber = 1 // 1スタート
      
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]
        
        // break_beforeがtrueの場合、新しいページを開始（最初のスロットでない場合のみ）
        if (slot.break_before && i > 0) {
          currentPageNumber++
          currentSlotNumber = 1
        }
        
        slotsWithPageInfo.push({
          slot,
          block: allBlocks[i],
          pageNumber: currentPageNumber,
          slotNumber: currentSlotNumber
        })
        
        currentSlotNumber++
      }
      
      // ページ番号でグループ化
      const pagesMap = new Map()
      for (const item of slotsWithPageInfo) {
        if (!pagesMap.has(item.pageNumber)) {
          pagesMap.set(item.pageNumber, [])
        }
        pagesMap.get(item.pageNumber).push(item)
      }
      
      // ページ番号でFORループ
      const sortedPageNumbers = Array.from(pagesMap.keys()).sort((a, b) => a - b)
      let currentPdfPageLayoutA = null // 現在のレイアウトAのPDFページ
      let currentPdfPageLayoutB = null // 現在のレイアウトBのPDFページ
      
      for (let pageIdx = 0; pageIdx < sortedPageNumbers.length; pageIdx++) {
        const pageNumber = sortedPageNumbers[pageIdx]
        const pageSlots = pagesMap.get(pageNumber)
        const isLastPage = pageIdx === sortedPageNumbers.length - 1
        
        // 次のページ番号があるかチェック（ページ開始スロットかどうか）
        const nextPageNumber = sortedPageNumbers[pageIdx + 1]
        const hasNextPageStart = !!nextPageNumber
        
        // スロット番号でFORループ
        for (const item of pageSlots) {
          const { block, slotNumber, slot } = item
          
          // スロットのMOD6で判断
          const mod6 = slotNumber % 6
          const modValue = mod6 === 0 ? 6 : mod6 // 0の場合は6として扱う
          
          // MODした値が1～3 → 右画像配置タイプ（レイアウトA: 左テキスト/右画像）
          // MODした値が4～6 → 左画像タイプ（レイアウトB: 左画像/右テキスト）
          const layout = (modValue >= 1 && modValue <= 3) ? layoutA : layoutB
          
          // ブロックインデックス（0, 1, 2のいずれか）
          const blockIndex = (modValue <= 3) ? (modValue - 1) : (modValue - 4)
          
          // MOD6が1の時に新しいレイアウトAのページを作成
          // MOD6が4の時に新しいレイアウトBのページを作成
          let page = null
          if (modValue >= 1 && modValue <= 3) {
            // レイアウトA
            if (modValue === 1) {
              currentPdfPageLayoutA = pdfDoc.addPage([pageWidth, pageHeight])
            }
            page = currentPdfPageLayoutA
          } else {
            // レイアウトB
            if (modValue === 4) {
              currentPdfPageLayoutB = pdfDoc.addPage([pageWidth, pageHeight])
            }
            page = currentPdfPageLayoutB
          }
          
          // 画像が入ってようが入っていまいが備考他のすべてのテキストを描画
          renderBlockOnPage(page, block, blockIndex, layout, {
            drawText: true,
            drawImage: true,
            showYohakuWhenNoImage: true
          })
        }
        
        // 埋め処理
        const slotCount = pageSlots.length
        const lastSlotNumber = pageSlots[pageSlots.length - 1].slotNumber
        const lastMod6 = lastSlotNumber % 6
        const lastModValue = lastMod6 === 0 ? 6 : lastMod6
        
        let fillTo = 0
        if (isLastPage) {
          // PDF終わりの場合
          if (lastModValue >= 1 && lastModValue <= 2) {
            fillTo = 3 // スロット数MOD6が1～2の時は3まで
          } else if (lastModValue === 4 || lastModValue === 5) {
            fillTo = 6 // スロット数MOD6が4、5のときは6まで
          }
        } else if (hasNextPageStart) {
          // 次のスロットがページ開始スロットの場合
          if (lastModValue >= 1 && lastModValue <= 5) {
            fillTo = 6 // スロット数MOD6が1～5の時は6まで埋める
          }
        }
        
        // 最後のスロットからfillToまで埋める
        if (fillTo > 0) {
          for (let i = lastModValue + 1; i <= fillTo; i++) {
            const layout = (i >= 1 && i <= 3) ? layoutA : layoutB
            const blockIndex = (i <= 3) ? (i - 1) : (i - 4)
            
            // ページを取得または作成
            let page = null
            if (i >= 1 && i <= 3) {
              // レイアウトA
              // i === 1の時は新しいページを作成、それ以外は既存のページを使用
              if (i === 1) {
                currentPdfPageLayoutA = pdfDoc.addPage([pageWidth, pageHeight])
              }
              // 既存のページがない場合は作成（念のため）
              if (!currentPdfPageLayoutA) {
                currentPdfPageLayoutA = pdfDoc.addPage([pageWidth, pageHeight])
              }
              page = currentPdfPageLayoutA
            } else {
              // レイアウトB
              // i === 4の時は新しいページを作成、それ以外は既存のページを使用
              if (i === 4) {
                currentPdfPageLayoutB = pdfDoc.addPage([pageWidth, pageHeight])
              }
              // 既存のページがない場合は作成（念のため）
              if (!currentPdfPageLayoutB) {
                currentPdfPageLayoutB = pdfDoc.addPage([pageWidth, pageHeight])
              }
              page = currentPdfPageLayoutB
            }
            
            renderBlockOnPage(page, null, blockIndex, layout, {
              drawText: true,
              drawImage: true,
              showYohakuWhenNoImage: true
            })
          }
        }
      }
    } else {
      // テストデータの場合（既存の処理）
      // 2ページ目：ページA（テキスト＋画像1、画像2・3は「余白」）
      const page2 = pdfDoc.addPage([pageWidth, pageHeight])
      renderBlockOnPage(page2, blocks[0], 0, layoutA, {
        drawText: true,
        drawImage: true,
        showYohakuWhenNoImage: true
      })
      renderBlockOnPage(page2, blocks[1], 1, layoutA, {
        drawText: true,
        drawImage: true,
        showYohakuWhenNoImage: true
      })
      renderBlockOnPage(page2, blocks[2], 2, layoutA, {
        drawText: true,
        drawImage: true,
        showYohakuWhenNoImage: true
      })
      
      // 3ページ目：ページB（テキスト＋画像1、画像2・3は「余白」）
      const page3 = pdfDoc.addPage([pageWidth, pageHeight])
      renderBlockOnPage(page3, blocks[0], 0, layoutB, {
        drawText: true,
        drawImage: true,
        showYohakuWhenNoImage: true
      })
      renderBlockOnPage(page3, blocks[1], 1, layoutB, {
        drawText: true,
        drawImage: true,
        showYohakuWhenNoImage: true
      })
      renderBlockOnPage(page3, blocks[2], 2, layoutB, {
        drawText: true,
        drawImage: true,
        showYohakuWhenNoImage: true
      })
    }
    
    const bytes = await pdfDoc.save()
    return bytes
  } catch (e) {
    console.error("PDF生成エラー:", e)
    throw e
  }
}

