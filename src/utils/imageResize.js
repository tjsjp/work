import imageCompression from 'browser-image-compression'
import exifr from 'exifr'

/**
 * 画像をリサイズしてEXIF情報を削除
 * @param {File} file - リサイズする画像ファイル
 * @param {Object} options - リサイズオプション
 * @param {number} options.maxWidth - 最大幅
 * @param {number} options.maxHeight - 最大高さ
 * @param {number} options.quality - 圧縮品質 (0.1-1.0、デフォルト: 0.92)
 * @param {string} options.fileType - 出力ファイルタイプ (デフォルト: 'image/jpeg')
 * @returns {Promise<File>} リサイズされたファイル
 */
export async function resizeImage(file, options = {}) {
  const {
    maxWidth = 600,
    maxHeight = 450,
    quality = 0.92,
    fileType = 'image/jpeg'
  } = options

  // 画像ファイルでない場合はそのまま返す（ただし、アップロードキューで既にフィルタリングされている）
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('画像ファイル以外は処理できません')
  }

  try {
    const options = {
      maxSizeMB: 10, // 最大ファイルサイズ（MB）
      maxWidthOrHeight: Math.max(maxWidth, maxHeight), // 幅または高さの最大値
      useWebWorker: true, // WebWorkerを使用してパフォーマンス向上
      fileType: fileType, // 出力ファイルタイプ（EXIF削除のためJPEG推奨）
      initialQuality: quality, // 圧縮品質
      alwaysKeepResolution: false, // 解像度情報を削除（EXIF削除のため）
      exifOrientation: 1 // 方向情報を削除（EXIF削除のため）
    }

    // 縦横比を維持しながらリサイズ
    const compressedFile = await imageCompression(file, options)

    // リサイズ後の画像の実際のサイズを取得して調整
    const image = await createImageFromFile(compressedFile)
    const { resizedFile, finalWidth, finalHeight } = await adjustImageSize(
      compressedFile,
      image,
      maxWidth,
      maxHeight
    )

    console.log(`画像リサイズ完了: ${file.name} (${file.size} bytes → ${resizedFile.size} bytes)`)
    console.log(`リサイズ後のサイズ: ${finalWidth}×${finalHeight}`)

    return resizedFile
  } catch (error) {
    console.error('画像リサイズエラー:', error)
    // エラー時は元のファイルを返す
    return file
  }
}

/**
 * サムネイル画像を生成
 * @param {File} file - 元の画像ファイル
 * @param {Object} options - サムネイル生成オプション
 * @param {number} options.maxWidth - 最大幅（デフォルト: 200）
 * @param {number} options.maxHeight - 最大高さ（デフォルト: 150）
 * @param {number} options.quality - 圧縮品質（デフォルト: 0.85）
 * @returns {Promise<File>} サムネイルファイル
 */
export async function createThumbnail(file, options = {}) {
  const {
    maxWidth = 200,
    maxHeight = 150,
    quality = 0.85
  } = options

  // 画像ファイルでない場合はnullを返す（ただし、アップロードキューで既にフィルタリングされている）
  if (!file.type || !file.type.startsWith('image/')) {
    return null
  }

  try {
    const thumbnailOptions = {
      maxSizeMB: 1, // サムネイルは小さいサイズに
      maxWidthOrHeight: Math.max(maxWidth, maxHeight),
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: quality,
      alwaysKeepResolution: false,
      exifOrientation: 1
    }

    const thumbnailFile = await imageCompression(file, thumbnailOptions)

    // リサイズ後の画像の実際のサイズを取得して調整
    const image = await createImageFromFile(thumbnailFile)
    const { resizedFile, finalWidth, finalHeight } = await adjustImageSize(
      thumbnailFile,
      image,
      maxWidth,
      maxHeight
    )

    console.log(`サムネイル生成完了: ${file.name} (${file.size} bytes → ${resizedFile.size} bytes)`)
    console.log(`サムネイルサイズ: ${finalWidth}×${finalHeight}`)

    return resizedFile
  } catch (error) {
    console.error('サムネイル生成エラー:', error)
    return null
  }
}

/**
 * EXIF情報から撮影日時を取得
 * @param {File} file - 画像ファイル
 * @returns {Promise<string | null>} ISO形式の日時文字列（YYYY-MM-DDTHH:mm:ss）またはnull
 */
async function getExifDateTime(file) {
  try {
    const exifData = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime']
    })
    
    if (!exifData) {
      return null
    }
    
    // 優先順位: DateTimeOriginal > DateTimeDigitized > DateTime
    const dateTime = exifData.DateTimeOriginal || exifData.DateTimeDigitized || exifData.DateTime
    
    if (!dateTime) {
      return null
    }
    
    // Dateオブジェクトの場合はISO形式に変換
    if (dateTime instanceof Date) {
      return dateTime.toISOString().slice(0, 19) // YYYY-MM-DDTHH:mm:ss形式
    }
    
    // 文字列の場合はそのまま返す（既にISO形式の場合）
    if (typeof dateTime === 'string') {
      // EXIF形式 "YYYY:MM:DD HH:mm:ss" を ISO形式 "YYYY-MM-DDTHH:mm:ss" に変換
      if (dateTime.includes(':')) {
        return dateTime.replace(/:/g, '-', 2).replace(' ', 'T')
      }
      return dateTime
    }
    
    return null
  } catch (error) {
    console.error('EXIF日時取得エラー:', error)
    return null
  }
}

/**
 * アスペクト比が標準（3:4または4:3）の3%以内かどうかを判定
 * @param {number} width - 画像の幅
 * @param {number} height - 画像の高さ
 * @returns {boolean} 標準アスペクト比の3%以内ならtrue
 */
function checkStandardAspectRatio(width, height) {
  if (!width || !height) return false
  
  const aspectRatio = width / height
  
  // 3:4 = 0.75, 4:3 = 1.333...
  const ratio34 = 0.75
  const ratio43 = 4 / 3
  
  // 3%の許容範囲
  const tolerance = 0.03
  
  // 3:4の範囲: 0.75 ± 0.0225 = 0.7275 ～ 0.7725
  const ratio34Min = ratio34 * (1 - tolerance)
  const ratio34Max = ratio34 * (1 + tolerance)
  
  // 4:3の範囲: 1.333 ± 0.04 = 1.293 ～ 1.373
  const ratio43Min = ratio43 * (1 - tolerance)
  const ratio43Max = ratio43 * (1 + tolerance)
  
  return (aspectRatio >= ratio34Min && aspectRatio <= ratio34Max) ||
         (aspectRatio >= ratio43Min && aspectRatio <= ratio43Max)
}

/**
 * メイン画像とサムネイルの両方を生成
 * @param {File} file - 元の画像ファイル
 * @param {Object} options - リサイズオプション
 * @returns {Promise<{mainImage: File, thumbnail: File | null, width: number, height: number, rotation: number, exifDateTime: string | null, isStandardAspectRatio: boolean}>} リサイズされたメイン画像とサムネイル、元画像のサイズとローテーション、EXIF日時、標準アスペクト比フラグ
 */
export async function processImageForUpload(file, options = {}) {
  const {
    mainMaxWidth = 1200,
    mainMaxHeight = 900,
    mainQuality = 0.92,
    thumbMaxWidth = 200,
    thumbMaxHeight = 150,
    thumbQuality = 0.85
  } = options

  // 画像ファイルでない場合はエラーを投げる（アップロードキューで既にフィルタリングされている）
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('画像ファイル以外は処理できません')
  }
  
  // リサイズできない画像形式をチェック
  const fileName = file.name.toLowerCase()
  const ext = fileName.split('.').pop()
  const disallowedExtensions = ['svg', 'ico', 'tiff', 'tif', 'heic', 'heif', 'avif', 'psd', 'ai', 'eps', 'raw', 'cr2', 'nef', 'orf', 'sr2']
  if (ext && disallowedExtensions.includes(ext)) {
    throw new Error(`リサイズできない画像形式です: ${ext}`)
  }

  try {
    // EXIF情報を取得（リサイズ前に元のファイルから取得）
    const exifDateTime = await getExifDateTime(file)
    
    // 元の画像のサイズを取得
    const originalImage = await createImageFromFile(file)
    const originalWidth = originalImage.width
    const originalHeight = originalImage.height
    
    // アスペクト比を判定
    const isStandardAspectRatio = checkStandardAspectRatio(originalWidth, originalHeight)
    
    // ローテーションを決定
    // ワイドが広い場合（width > height）: rotation = 0
    // ハイの方が広い場合（height > width）: rotation = 270
    const rotation = originalWidth > originalHeight ? 0 : 270

    // 画像の向きに応じてサイズ制限を設定
    // 縦長画像（height > width）: 高さ1200（長辺）、幅900（短辺）を上限
    // 横長画像（width > height）: 幅1200（長辺）、高さ900（短辺）を上限
    let actualMaxWidth = mainMaxWidth
    let actualMaxHeight = mainMaxHeight
    if (originalHeight > originalWidth) {
      // 縦長画像: 高さ1200（長辺）、幅900（短辺）を上限
      actualMaxWidth = 900
      actualMaxHeight = 1200
    } else {
      // 横長画像: 幅1200（長辺）、高さ900（短辺）を上限
      actualMaxWidth = 1200
      actualMaxHeight = 900
    }

    // メイン画像とサムネイルを並列で生成
    const [mainImage, thumbnail] = await Promise.all([
      resizeImage(file, {
        maxWidth: actualMaxWidth,
        maxHeight: actualMaxHeight,
        quality: mainQuality
      }),
      createThumbnail(file, {
        maxWidth: thumbMaxWidth,
        maxHeight: thumbMaxHeight,
        quality: thumbQuality
      })
    ])

    return {
      mainImage,
      thumbnail,
      width: originalWidth,
      height: originalHeight,
      rotation,
      exifDateTime,
      isStandardAspectRatio
    }
  } catch (error) {
    console.error('画像処理エラー:', error)
    return {
      mainImage: file,
      thumbnail: null,
      width: null,
      height: null,
      rotation: 0,
      exifDateTime: null,
      isStandardAspectRatio: false
    }
  }
}

/**
 * FileオブジェクトからImageオブジェクトを作成
 * @param {File} file - 画像ファイル
 * @returns {Promise<HTMLImageElement>} Imageオブジェクト
 */
function createImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像の読み込みに失敗しました'))
    }
    
    img.src = url
  })
}

/**
 * 画像のサイズを正確に調整（縦横比を維持）
 * @param {File} file - リサイズするファイル
 * @param {HTMLImageElement} image - Imageオブジェクト
 * @param {number} maxWidth - 最大幅
 * @param {number} maxHeight - 最大高さ
 * @returns {Promise<{resizedFile: File, finalWidth: number, finalHeight: number}>}
 */
async function adjustImageSize(file, image, maxWidth, maxHeight) {
  let { width, height } = image

  // 縦横比を計算
  const aspectRatio = width / height

  // 最大サイズに収まるようにリサイズ
  if (width > maxWidth || height > maxHeight) {
    if (width / maxWidth > height / maxHeight) {
      width = maxWidth
      height = Math.round(maxWidth / aspectRatio)
    } else {
      height = maxHeight
      width = Math.round(maxHeight * aspectRatio)
    }
  }

  // Canvasを使ってリサイズ
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0, width, height)

  // CanvasをBlobに変換
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  })

  // BlobをFileに変換（元のファイル名を保持）
  const resizedFile = new File([blob], file.name, {
    type: 'image/jpeg',
    lastModified: Date.now()
  })

  return {
    resizedFile,
    finalWidth: width,
    finalHeight: height
  }
}

