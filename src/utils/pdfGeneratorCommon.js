// PDF生成共通関数（クライアントサイド版）
// DBから取得したレイアウト情報に基づいてPDFを生成
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

// ★ Storage にアップした NotoSansJP-Regular / Bold の公開URL
const JP_FONT_URL = "https://vtdhftukofbtxavnzlhv.supabase.co/storage/v1/object/public/settings/fonts/NotoSansJP-Regular.ttf"
const JP_FONT_BOLD_URL = "https://vtdhftukofbtxavnzlhv.supabase.co/storage/v1/object/public/settings/fonts/NotoSansJP-Bold.ttf"

// === グリッド → PDF座標変換ヘルパー（4倍細かく） ==========================
// x = 横（左→右）, y = 縦（上→下）
// x0,y0 = 左上セル, x1,y1 = 右下セル
function cellRect(pageWidth, pageHeight, x0, y0, x1, y1, cols = 232, rows = 328) {
  const cellW = pageWidth / cols
  const cellH = pageHeight / rows
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

// セル内の文字を「縦中央」＋「横 左/中央/右」を選べる版
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
  } else if (hAlign === "right") {
    x = rect.x + rect.width - width - padding
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

// RGB配列をrgbオブジェクトに変換
function rgbFromArray(arr) {
  if (!Array.isArray(arr) || arr.length < 3) {
    return rgb(0, 0, 0)
  }
  return rgb(arr[0] / 255, arr[1] / 255, arr[2] / 255)
}

// 画像をCanvasで回転させる関数
async function rotateImageWithCanvas(imageBytes, rotationDeg) {
  if (rotationDeg === 0 || rotationDeg === 360) {
    return imageBytes
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image()
    const blob = new Blob([imageBytes])
    const imgUrl = URL.createObjectURL(blob)
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        const rad = (rotationDeg * Math.PI) / 180
        const cos = Math.abs(Math.cos(rad))
        const sin = Math.abs(Math.sin(rad))
        const w = img.width * cos + img.height * sin
        const h = img.width * sin + img.height * cos
        
        canvas.width = w
        canvas.height = h
        
        ctx.translate(w / 2, h / 2)
        ctx.rotate(rad)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        
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

// レイアウト要素を描画
async function renderElement(page, element, pageWidth, pageHeight, pageValues, embeddedImages, jpFont, jpFontBold, cols, rows) {
  const { elementType, position, config } = element
  
  if (!position || !config) return
  
  const rect = cellRect(pageWidth, pageHeight, position.x0, position.y0, position.x1, position.y1, cols, rows)
  
  switch (elementType) {
    case 'text': {
      // テキストはconfig.textから直接取得、またはvaluesから取得
      let text = config.text || ''
      
      // valuesから取得する場合（configにtextIndexやtextSourceが指定されている場合）
      if (config.textSource && pageValues) {
        const source = config.textSource // 'caption', 'phase', 'note'など
        const index = config.textIndex !== undefined ? config.textIndex : 0
        
        if (source === 'caption' && pageValues.caption && Array.isArray(pageValues.caption)) {
          text = pageValues.caption[index] || ''
        } else if (source === 'phase' && pageValues.phase && Array.isArray(pageValues.phase)) {
          text = pageValues.phase[index] || ''
        } else if (source === 'note' && pageValues.note && Array.isArray(pageValues.note)) {
          text = pageValues.note[index] || ''
        }
      }
      
      const fontSize = config.fontSize || 10
      const fontWeight = config.fontWeight || 'normal'
      const align = config.align || 'left'
      const color = rgbFromArray(config.color || [0, 0, 0])
      const font = fontWeight === 'bold' ? jpFontBold : jpFont
      
      drawTextFitInRectMiddle(page, text, rect, {
        font,
        maxSize: fontSize,
        minSize: fontSize * 0.5,
        color,
        hAlign: align
      })
      break
    }
    
    case 'image': {
      // imageUrlがconfigに直接含まれている場合（エッジファンクションで展開済み）
      let imageUrl = config.imageUrl
      // rotationはconfigから取得（エッジファンクションで展開済み）
      const rotation = config.rotation || 0
      
      // imageUrlがない場合、imageIndexから取得
      if (!imageUrl && config.imageIndex !== undefined && pageValues && pageValues.image && Array.isArray(pageValues.image)) {
        imageUrl = pageValues.image[config.imageIndex]
      }
      
      if (imageUrl) {
        // rotationがある場合は、回転後の画像キーを使用
        const imageKey = rotation !== 0 ? `${imageUrl}__rotation_${rotation}` : imageUrl
        const embeddedImage = embeddedImages.get(imageKey) || embeddedImages.get(imageUrl)
        
        if (embeddedImage) {
          const imgSize = embeddedImage.scale(1)
          const maxW = rect.width
          const maxH = rect.height
          const fit = config.fit || 'contain'
          
          let scale, drawW, drawH
          if (fit === 'cover') {
            scale = Math.max(maxW / imgSize.width, maxH / imgSize.height)
          } else if (fit === 'fill') {
            drawW = maxW
            drawH = maxH
            scale = 1
          } else { // contain
            scale = Math.min(maxW / imgSize.width, maxH / imgSize.height)
          }
          
          if (fit !== 'fill') {
            drawW = imgSize.width * scale
            drawH = imgSize.height * scale
          }
          
          const imgX = rect.x + (maxW - drawW) / 2
          const imgY = rect.y + (maxH - drawH) / 2
          
          page.drawImage(embeddedImage, {
            x: imgX,
            y: imgY,
            width: drawW,
            height: drawH
          })
        }
      }
      break
    }
    
    case 'line':
    case 'border': {
      const lineType = config.lineType || config.borderType || 'solid'
      const thickness = config.thickness || 0.5
      const color = rgbFromArray(config.color || [0, 0, 0])
      const sides = config.sides || ['top', 'bottom', 'left', 'right']
      
      let style = 'solid'
      if (lineType === 'dashed') style = 'dashed'
      else if (lineType === 'double') style = 'double'
      
      drawCellBorder(page, rect, {
        style,
        thickness,
        color,
        sides
      })
      break
    }
  }
}

// メインPDF生成関数
export async function generatePDFFromLayout(layoutData, values) {
  try {
    const { pdf_type, page_count, layouts, grid } = layoutData
    const { cols = 232, rows = 328 } = grid || {}
    
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    
    // 日本語フォント読み込み
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
    
    // 画像を埋め込む（layouts配列から全画像URLとrotationを収集）
    const embeddedImages = new Map()
    // 画像URLとrotationのペアを収集（同じURLでも異なるrotationがある場合がある）
    const imageInfoMap = new Map() // { url -> Set<rotation> }
    
    const addImageInfo = (url, rotation = 0) => {
      if (typeof url === 'string' && url.trim()) {
        const trimmedUrl = url.trim()
        if (!imageInfoMap.has(trimmedUrl)) {
          imageInfoMap.set(trimmedUrl, new Set())
        }
        imageInfoMap.get(trimmedUrl).add(rotation)
      }
    }

    // レイアウト内に埋め込まれた画像URLとrotationを収集
    if (Array.isArray(layouts)) {
      for (const layout of layouts) {
        if (!layout || !Array.isArray(layout.elements)) {
          continue
        }
        for (const element of layout.elements) {
          if (element?.elementType === 'image' && element.config?.imageUrl) {
            const rotation = element.config?.rotation || 0
            addImageInfo(element.config.imageUrl, rotation)
          }
        }
      }
    }
    
    // 各画像URLを埋め込む（rotationごとに別キーで保存）
    for (const [imageUrl, rotations] of imageInfoMap) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)
        
        const imgRes = await fetch(imageUrl, {
          credentials: 'omit',
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (imgRes.ok) {
          const originalImgBytes = new Uint8Array(await imgRes.arrayBuffer())
          const contentType = imgRes.headers.get('content-type') || ''
          const isPng = contentType.includes('png') || imageUrl.toLowerCase().includes('.png')
          
          // 各rotationに対して画像を埋め込む
          for (const rotation of rotations) {
            let imgBytes = originalImgBytes
            let imageKey = imageUrl
            
            // rotation処理
            if (rotation !== 0 && rotation !== 360) {
              imgBytes = await rotateImageWithCanvas(originalImgBytes, rotation)
              imageKey = `${imageUrl}__rotation_${rotation}`
            }
            
            let embeddedImage
            if (isPng && rotation === 0) {
              // 回転なしのPNGのみPNGとして埋め込む（回転後はJPEGになる）
              embeddedImage = await pdfDoc.embedPng(imgBytes)
            } else {
              embeddedImage = await pdfDoc.embedJpg(imgBytes)
            }
            
            embeddedImages.set(imageKey, embeddedImage)
          }
        }
      } catch (e) {
        console.error(`画像読み込みエラー: ${imageUrl}`, e)
      }
    }
    
    // ページを生成
    const pages = []
    
    // 表紙がある場合
    const coverLayout = layouts.find(l => l.pageNumber === 0)
    if (coverLayout) {
      const coverPage = pdfDoc.addPage([pageWidth, pageHeight])
      pages.push({ page: coverPage, pageNumber: 0 })
      
      // 表紙用のvalues（values配列からpage=0のものを探す、なければnull）
      const coverValues = values && Array.isArray(values) ? values.find(v => v.page === 0) : null
      
      for (const element of coverLayout.elements) {
        await renderElement(coverPage, element, pageWidth, pageHeight, coverValues, embeddedImages, jpFont, jpFontBold, cols, rows)
      }
    }
    
    // 各ページを生成
    for (let pageNum = 1; pageNum <= page_count; pageNum++) {
      const page = pdfDoc.addPage([pageWidth, pageHeight])
      pages.push({ page, pageNumber: pageNum })
      
      // 該当ページの値（values配列から該当ページのデータを取得）
      const pageValues = values.find(v => v.page === pageNum)
      
      // 該当ページのレイアウト
      const pageLayout = layouts.find(l => l.pageNumber === pageNum)
      // 全ページ共通のレイアウト
      const commonLayout = layouts.find(l => l.pageNumber === null)
      
      // 全ページ共通の要素を描画
      if (commonLayout) {
        for (const element of commonLayout.elements) {
          await renderElement(page, element, pageWidth, pageHeight, pageValues, embeddedImages, jpFont, jpFontBold, cols, rows)
        }
      }
      
      // ページ固有の要素を描画
      if (pageLayout) {
        for (const element of pageLayout.elements) {
          await renderElement(page, element, pageWidth, pageHeight, pageValues, embeddedImages, jpFont, jpFontBold, cols, rows)
        }
      }
    }
    
    const bytes = await pdfDoc.save()
    return bytes
  } catch (e) {
    console.error("PDF生成エラー:", e)
    throw e
  }
}

