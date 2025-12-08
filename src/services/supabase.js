// Supabase Edge Functions経由でデータを取得・更新するサービス

import { createClient } from '@supabase/supabase-js'
import { processImageForUpload } from '../utils/imageResize.js'

// 環境変数から取得（Viteの環境変数はimport.meta.envから取得）
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// 環境変数が設定されているか確認
if (!SUPABASE_URL || !ANON_KEY) {
  console.error('環境変数が設定されていません。.envファイルを確認してください。')
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '設定済み' : '未設定')
  console.error('VITE_SUPABASE_ANON_KEY:', ANON_KEY ? '設定済み' : '未設定')
}

// グローバルに1つのSupabaseクライアントインスタンスを作成（複数インスタンスの警告を防ぐ）
export const supabaseClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// 認証トークン（必要に応じて設定）
let accessToken = null

export const supabaseService = {
  // 認証トークンを設定
  setAccessToken(token) {
    accessToken = token
  },

  // ヘッダーを取得
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY
    }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    return headers
  },

  // work_idでwork_filesを取得（既存のget_work_file_listを使用）
  async getWorkFiles(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_work_file_list?work_id=${encodeURIComponent(workId)}`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // JSONパースに失敗した場合はテキストをそのまま使用
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data.files || []
    } catch (error) {
      console.error('Error fetching work files:', error)
      throw error
    }
  },

  // work_idでreport_slotsを取得
  async getWorkSlots(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_report_slot`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ work_id: workId })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // JSONパースに失敗した場合はテキストをそのまま使用
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return {
        slots: data.slots || [],
        workKind: data.work_kind || null,
        workData: data.work_data || null // PDF生成用のデータ
      }
    } catch (error) {
      console.error('Error fetching work slots:', error)
      throw error
    }
  },

  // ファイルをスロットに割り当て
  async assignFileToSlot(slotId, fileId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/assign_file_to_slot`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            slot_id: slotId,
            file_id: fileId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // JSONパースに失敗した場合はテキストをそのまま使用
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error assigning file to slot:', error)
      throw error
    }
  },

  // スロットの順序を更新（upsert_report_slotを使用）
  async updateSlotOrder(updates) {
    try {
      // すべての更新を並列で実行
      await Promise.all(
        updates.map(update => 
          this.updateWorkSlot(update.id, { sort_index: update.sort_index })
        )
      )
      return { success: true }
    } catch (error) {
      console.error('Error updating slot order:', error)
      throw error
    }
  },

  // スロットの情報を更新（work_phase_id, note, break_before）
  async updateWorkSlot(slotId, updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/upsert_report_slot`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            slot_id: slotId,
            ...updates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // JSONパースに失敗した場合はテキストをそのまま使用
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error updating work slot:', error)
      throw error
    }
  },

  // スロットを挿入（新しいスロットを作成）
  async insertWorkSlot(workId, sourceSlotId, targetSortIndex, position) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/insert_report_slot`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            work_id: workId,
            source_slot_id: sourceSlotId,
            target_sort_index: targetSortIndex,
            position: position // 'above', 'below', 'left', 'right'
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // JSONパースに失敗した場合はテキストをそのまま使用
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error inserting work slot:', error)
      throw error
    }
  },

  // 画像の署名URLを取得（既存のget_work_file_urlを使用）
  // file_idからwork_filesを取得して、bucketとobject_keyを取得する必要がある
  async getSignedUrl(bucket, objectKey) {
    try {
      // 既存のget_work_file_urlはfile_idを必要とするため、
      // この関数はfile_idを直接受け取る形に変更する必要がある
      // または、bucketとobject_keyからfile_idを逆引きする必要がある
      throw new Error('getSignedUrlはfile_idを使用する必要があります。getSignedUrlByFileIdを使用してください。')
    } catch (error) {
      console.error('Error getting signed URL:', error)
      throw error
    }
  },

  // file_idで署名URLを取得（既存のget_work_file_urlを使用）
  // useThumbnail: trueの場合、サムネイルURLを優先的に取得
  async getSignedUrlByFileId(fileId, useThumbnail = true) {
    try {
      const url = new URL(`${SUPABASE_URL}/functions/v1/get_work_file_url`)
      url.searchParams.set('file_id', fileId)
      if (useThumbnail) {
        url.searchParams.set('thumbnail', 'true')
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders()
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // JSONパースに失敗した場合はテキストをそのまま使用
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      // サムネイルURLが存在する場合は優先的に使用、なければ元画像URL
      return data.thumbnail_url || data.signed_url
    } catch (error) {
      console.error('Error getting signed URL:', error)
      throw error
    }
  },

  // ファイルアップロード
  async uploadWorkFile(workId, files, options = {}, onProgress = null) {
    try {
      // バッチサイズ（一度にアップロードするファイル数）
      const BATCH_SIZE = 10
      const allResults = {
        files: [],
        errors: []
      }

      // ファイルをバッチに分割
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE)
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(files.length / BATCH_SIZE)

        if (onProgress) {
          onProgress({
            current: i + batch.length,
            total: files.length,
            batch: batchNumber,
            totalBatches: totalBatches
          })
        }

        try {
          const form = new FormData()
          form.append('work_id', workId)

          if (options.work_category_id) {
            form.append('work_category_id', options.work_category_id)
          }
          if (options.default_work_phase_id) {
            form.append('default_work_phase_id', options.default_work_phase_id)
          }
          if (options.default_phase_id) {
            form.append('default_phase_id', options.default_phase_id)
          }
          if (options.default_caption) {
            form.append('default_caption', options.default_caption)
          }
          if (options.default_note) {
            form.append('default_note', options.default_note)
          }

          // バッチのファイルを追加（画像の場合はリサイズ処理）
          const processedFiles = []
          const thumbnails = [] // { originalName: string, thumbnail: File | null }[]
          const fileMetadata = [] // ファイルのメタデータ（width, height, rotation, exifDateTime, isStandardAspectRatio）を保持
          
          for (const file of batch) {
            const originalFileName = file.name // 元のファイル名を保持
            
            // 画像ファイルの場合はリサイズ処理
            if (file.type && file.type.startsWith('image/')) {
              try {
                const { mainImage, thumbnail, width, height, rotation, exifDateTime, isStandardAspectRatio } = await processImageForUpload(file, {
                  mainMaxWidth: 1200,
                  mainMaxHeight: 900,
                  mainQuality: 0.92,
                  thumbMaxWidth: 200,
                  thumbMaxHeight: 150,
                  thumbQuality: 0.85
                })
                
                // リサイズ後のファイル名を元のファイル名に戻す（サーバー側での対応付けのため）
                const mainImageWithOriginalName = new File([mainImage], originalFileName, { type: mainImage.type })
                processedFiles.push(mainImageWithOriginalName)
                
                // サムネイルがあれば保持（元のファイル名ベースで対応付け）
                thumbnails.push({
                  originalName: originalFileName,
                  thumbnail: thumbnail
                })
                
                // メタデータを保存
                fileMetadata.push({
                  originalFileName: originalFileName,
                  width: width,
                  height: height,
                  rotation: rotation,
                  exifDateTime: exifDateTime,
                  isStandardAspectRatio: isStandardAspectRatio
                })
              } catch (error) {
                console.error(`画像リサイズエラー (${file.name}):`, error)
                // エラー時は元のファイルを使用
                processedFiles.push(file)
                thumbnails.push({
                  originalName: originalFileName,
                  thumbnail: null
                })
                fileMetadata.push({
                  originalFileName: originalFileName,
                  width: null,
                  height: null,
                  rotation: 0,
                  exifDateTime: null,
                  isStandardAspectRatio: false
                })
              }
            } else {
              // 画像以外のファイルはそのまま
              processedFiles.push(file)
              thumbnails.push({
                originalName: originalFileName,
                thumbnail: null
              })
              fileMetadata.push({
                originalFileName: originalFileName,
                width: null,
                height: null,
                rotation: 0,
                exifDateTime: null,
                isStandardAspectRatio: false
              })
            }
          }

          // メイン画像を追加
          for (const file of processedFiles) {
            form.append('files', file)
          }
          
          // サムネイルを追加（サーバー側で対応するため、元のファイル名ベースで対応付け）
          for (const { originalName, thumbnail } of thumbnails) {
            if (thumbnail) {
              // サムネイルファイル名は元のファイル名 + _thumb
              const thumbName = originalName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '_thumb.jpg')
              const thumbFile = new File([thumbnail], thumbName, { type: 'image/jpeg' })
              form.append('thumbnails', thumbFile)
            }
          }
          
          // メタデータをJSON形式で送信
          if (fileMetadata.length > 0) {
            form.append('file_metadata', JSON.stringify(fileMetadata))
          }

          const headers = {
            'apikey': ANON_KEY
          }
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`
          }

          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/upload_work_file`,
            {
              method: 'POST',
              headers: headers,
              body: form
            }
          )

          if (!response.ok) {
            const errorText = await response.text()
            const error = new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
            error.status = response.status
            throw error
          }

          const data = await response.json()
          if (data.files && Array.isArray(data.files)) {
            allResults.files.push(...data.files)
          }
        } catch (error) {
          console.error(`Error uploading batch ${batchNumber}:`, error)
          allResults.errors.push({
            batch: batchNumber,
            error: error.message,
            files: batch, // ファイルオブジェクト自体を保持
            fileNames: batch.map(f => f.name)
          })
          // リソース制限エラーの場合は、次のバッチを少し待ってから実行
          if (error.status === 546 || (error.message && error.message.includes('WORKER_LIMIT'))) {
            console.log(`Waiting before next batch due to resource limit...`)
            await new Promise(resolve => setTimeout(resolve, 2000)) // 2秒待機
          }
        }
      }

      // エラーがあった場合は警告を出すが、成功したファイルは返す
      if (allResults.errors.length > 0) {
        console.warn('Some batches failed:', allResults.errors)
        if (allResults.files.length === 0) {
          throw new Error(`すべてのアップロードに失敗しました。最初のエラー: ${allResults.errors[0].error}`)
        }
      }

      return allResults
    } catch (error) {
      console.error('Error uploading work file:', error)
      throw error
    }
  },

  // 複数ファイルをまとめてアップロード（バッチアップロード用）
  async uploadBatchFiles(workId, batchItems, options = {}) {
    try {
      const form = new FormData()
      form.append('work_id', workId)

      if (options.work_category_id) {
        form.append('work_category_id', options.work_category_id)
      }
      if (options.default_work_phase_id) {
        form.append('default_work_phase_id', options.default_work_phase_id)
      }
      if (options.default_phase_id) {
        form.append('default_phase_id', options.default_phase_id)
      }
      if (options.default_caption) {
        form.append('default_caption', options.default_caption)
      }
      if (options.default_note) {
        form.append('default_note', options.default_note)
      }

      // リサイズ済みのファイルとサムネイルを追加
      const fileMetadata = [] // ファイルのメタデータ（width, height, rotation）を保持
      for (const item of batchItems) {
        // メイン画像（リサイズ済み）
        const mainImageWithOriginalName = new File([item.processedFile], item.originalFileName, { type: item.processedFile.type })
        form.append('files', mainImageWithOriginalName)

        // サムネイル（存在する場合）
        if (item.thumbnail) {
          const lowerOriginalFileName = item.originalFileName.toLowerCase()
          const thumbName = lowerOriginalFileName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '_thumb.jpg')
          const thumbFile = new File([item.thumbnail], thumbName, { type: 'image/jpeg' })
          form.append('thumbnails', thumbFile)
        }

        // メタデータを保存（width, height, rotation, exifDateTime, isStandardAspectRatio）
        fileMetadata.push({
          originalFileName: item.originalFileName,
          width: item.width,
          height: item.height,
          rotation: item.rotation,
          exifDateTime: item.exifDateTime ?? null,
          isStandardAspectRatio: item.isStandardAspectRatio ?? false
        })
      }

      // メタデータをJSON形式で送信
      if (fileMetadata.length > 0) {
        form.append('file_metadata', JSON.stringify(fileMetadata))
      }

      const headers = {
        'apikey': ANON_KEY
      }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/upload_work_file`,
        {
          method: 'POST',
          headers: headers,
          body: form
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        const error = new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
        error.status = response.status
        throw error
      }

      const data = await response.json()
      if (data.files && Array.isArray(data.files)) {
        return data.files // 複数ファイルなので配列を返す
      } else {
        throw new Error('アップロードに成功しましたが、ファイル情報が取得できませんでした')
      }
    } catch (error) {
      console.error(`Error uploading batch files:`, error)
      throw error
    }
  },

  // 1ファイルずつアップロード（バックグラウンド処理用）
  async uploadSingleFile(workId, processedFile, originalFileName, thumbnail, options = {}) {
    try {
      const form = new FormData()
      form.append('work_id', workId)

      if (options.work_category_id) {
        form.append('work_category_id', options.work_category_id)
      }
      if (options.default_work_phase_id) {
        form.append('default_work_phase_id', options.default_work_phase_id)
      }
      if (options.default_phase_id) {
        form.append('default_phase_id', options.default_phase_id)
      }
      if (options.default_caption) {
        form.append('default_caption', options.default_caption)
      }
      if (options.default_note) {
        form.append('default_note', options.default_note)
      }

      // メイン画像を追加（リサイズ済み）
      const mainImageWithOriginalName = new File([processedFile], originalFileName, { type: processedFile.type })
      form.append('files', mainImageWithOriginalName)

      // サムネイルを追加（存在する場合）
      if (thumbnail) {
        // 元のファイル名を小文字化してからサムネイルファイル名を生成（大文字小文字の不一致を防ぐ）
        const lowerOriginalFileName = originalFileName.toLowerCase()
        const thumbName = lowerOriginalFileName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '_thumb.jpg')
        const thumbFile = new File([thumbnail], thumbName, { type: 'image/jpeg' })
        form.append('thumbnails', thumbFile)
      }

      // メタデータを追加（width, height, rotation, exifDateTime, isStandardAspectRatio）
      if (metadata.width || metadata.height || metadata.rotation !== undefined || metadata.exifDateTime || metadata.isStandardAspectRatio !== undefined) {
        const fileMetadata = [{
          originalFileName: originalFileName,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
          rotation: metadata.rotation ?? 0,
          exifDateTime: metadata.exifDateTime ?? null,
          isStandardAspectRatio: metadata.isStandardAspectRatio ?? false
        }]
        form.append('file_metadata', JSON.stringify(fileMetadata))
      }

      const headers = {
        'apikey': ANON_KEY
      }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/upload_work_file`,
        {
          method: 'POST',
          headers: headers,
          body: form
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        const error = new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
        error.status = response.status
        throw error
      }

      const data = await response.json()
      if (data.files && Array.isArray(data.files) && data.files.length > 0) {
        return data.files[0] // 1ファイルなので最初の要素を返す
      } else {
        throw new Error('アップロードに成功しましたが、ファイル情報が取得できませんでした')
      }
    } catch (error) {
      console.error(`Error uploading single file (${originalFileName}):`, error)
      throw error
    }
  },

  // テンプレートからスロットを挿入（リバランス込み）
  async insertTemplateSlots(templateId, sortIndex, workId) {
    try {
      if (!templateId || sortIndex === null || sortIndex === undefined || !workId) {
        throw new Error('templateId, sortIndex, and workId are required')
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/insert_report_template_slot`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            template_id: templateId,
            sort_index: sortIndex,
            work_id: workId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error inserting template slots:', error)
      throw error
    }
  },

  // テンプレートを作成
  async createTemplateSlot(workId, label, slotIds) {
    try {
      if (!workId || !label || !slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
        throw new Error('workId, label, and slotIds (non-empty array) are required')
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/create_report_slot_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            work_id: workId,
            label: label.trim(),
            slot_ids: slotIds
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error creating template slot:', error)
      throw error
    }
  },

  // ワークスロットテンプレート一覧を取得（rebalance: trueでsort_orderをリバランス）
  // kind省略またはnullで全件取得
  async getWorkSlotTemplates(kind = null, rebalance = false) {
    try {
      const body = { rebalance }
      if (kind) {
        body.kind = kind
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_report_slot_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body)
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data.templates || []
    } catch (error) {
      console.error('Error fetching work slot templates:', error)
      throw error
    }
  },

  // ワークスロットテンプレートの詳細を取得
  async getWorkSlotTemplateDetails(templateId) {
    try {
      if (!templateId) {
        throw new Error('templateId is required')
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/update_report_slot_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'get_items',
            template_id: templateId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching work slot template details:', error)
      throw error
    }
  },

  // ワークスロットテンプレート詳細を更新
  async updateWorkSlotTemplateDetail(detailId, updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/update_report_slot_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'update_item',
            detail_id: detailId,
            ...updates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return true
    } catch (error) {
      console.error('Error updating work slot template detail:', error)
      throw error
    }
  },

  // ワークスロットテンプレート詳細を削除
  async deleteWorkSlotTemplateDetail(detailId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/update_report_slot_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'delete_item',
            detail_id: detailId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return true
    } catch (error) {
      console.error('Error deleting work slot template detail:', error)
      throw error
    }
  },

  // ワークスロットテンプレート詳細を追加
  async addWorkSlotTemplateDetail(templateId, data = {}) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/update_report_slot_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'add_item',
            template_id: templateId,
            ...data
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      return result.detail
    } catch (error) {
      console.error('Error adding work slot template detail:', error)
      throw error
    }
  },

  // ワークスロットテンプレートのアイテムを並び替え
  async reorderWorkSlotTemplateItems(templateId, itemIds) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/update_report_slot_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'reorder_items',
            template_id: templateId,
            item_ids: itemIds
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error reordering work slot template items:', error)
      throw error
    }
  },

  // ワークスロットテンプレートを更新（label, kind, sort_order）
  async updateWorkSlotTemplate(templateId, updates) {
    try {
      if (!templateId) {
        throw new Error('templateId is required')
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/update_report_slot_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            template_id: templateId,
            ...updates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) {
            errorMessage = errorJson.error
          } else if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error updating work slot template:', error)
      throw error
    }
  },

  // ワークスロットテンプレートを削除
  async deleteWorkSlotTemplate(templateId) {
    try {
      if (!templateId) {
        throw new Error('templateId is required')
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/delete_report_slot_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            template_id: templateId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) {
            errorMessage = errorJson.error
          } else if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error deleting work slot template:', error)
      throw error
    }
  },

  // ワークスロットテンプレートの順序を更新
  async reorderWorkSlotTemplates(templates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/update_report_slot_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'reorder',
            templates: templates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Error reordering work slot templates:', error)
      throw error
    }
  },

  // master_work_phases 一覧を取得（company_idとkindでフィルタリング）
  async getMasterWorkPhases(kind = null) {
    try {
      const requestBody = kind ? { kind } : {}
      console.log('getMasterWorkPhases request body:', requestBody) // デバッグ用
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_work_phase`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(requestBody)
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) {
            errorMessage = errorJson.error
          }
        } catch {
          // JSONパースに失敗した場合はテキストをそのまま使用
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      
      return {
        workPhases: data.workPhases || []
      }
    } catch (error) {
      console.error('Error fetching master work phases:', error)
      throw error
    }
  },

  // マスタープライスカテゴリーを取得
  async getMasterPriceCategories(categoryIds = null) {
    try {
      let query = supabase
        .from('master_price_categories')
        .select('id, label, is_active')
        .eq('is_active', true)
        .order('id', { ascending: true })
      
      if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
        query = query.in('id', categoryIds)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error('Error fetching master price categories:', error)
      throw error
    }
  },

  // 全マスターデータ取得（Edge Function経由）
  async getAllMaster() {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_master`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch master data: ${response.status}`)
      }
      
      const result = await response.json()
      return {
        employees: result.employees || [],
        mc: result.mc || [],
        largeSteps: result.largeSteps || [],
        largeJkkStatuses: result.largeJkkStatuses || [],
        largeProgressiveStatuses: result.largeProgressiveStatuses || [],
        smallJkkStatuses: result.smallJkkStatuses || [],
        smallProgressiveStatuses: result.smallProgressiveStatuses || []
      }
    } catch (error) {
      console.error('Error fetching all master data:', error)
      throw error
    }
  },

  // マスター従業員取得（非推奨 - getAllMasterを使用）
  async getMasterEmployees() {
    try {
      const { data, error } = await supabase
        .from('master_employees')
        .select('id, last_name, first_name, name')
        .order('id', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching master employees:', error)
      throw error
    }
  },

  // マスターMC取得（非推奨 - getAllMasterを使用）
  async getMasterMcs() {
    try {
      const { data, error } = await supabase
        .from('master_mc')
        .select('id, label')
        .order('id', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching master mc:', error)
      throw error
    }
  },

  // あき家段階補修マスター（非推奨 - getAllMasterを使用）
  async getMasterLargeSteps() {
    try {
      const { data, error } = await supabase
        .from('master_large_steps')
        .select('id, label')
        .order('id', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching master large steps:', error)
      throw error
    }
  },

  // あき家公社状態マスター（非推奨 - getAllMasterを使用）
  async getMasterLargeJkkStatuses() {
    try {
      const { data, error } = await supabase
        .from('master_large_jkk_statuses')
        .select('id, label')
        .order('id', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching master large jkk statuses:', error)
      throw error
    }
  },

  // あき家工事状況マスター（非推奨 - getAllMasterを使用）
  async getMasterLargeProgressiveStatuses() {
    try {
      const { data, error } = await supabase
        .from('master_large_progressive_statuses')
        .select('id, label')
        .order('id', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching master large progressive statuses:', error)
      throw error
    }
  },

  // 小口公社状態マスター（非推奨 - getAllMasterを使用）
  async getMasterSmallJkkStatuses() {
    try {
      const { data, error } = await supabase
        .from('master_small_jkk_statuses')
        .select('id, label')
        .order('id', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching master small jkk statuses:', error)
      throw error
    }
  },

  // 小口工事状況マスター（非推奨 - getAllMasterを使用）
  async getMasterSmallProgressiveStatuses() {
    try {
      const { data, error } = await supabase
        .from('master_small_progressive_statuses')
        .select('id, label')
        .order('id', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching master small progressive statuses:', error)
      throw error
    }
  },

  async getContractors(companyId) {
    try {
      console.log('[supabaseService] getContractors: Fetching via Edge Function')
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_contractor`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      console.log('[supabaseService] getContractors: Success, count:', result.contractors?.length || 0)
      return result.contractors || []
    } catch (error) {
      console.error('[supabaseService] getContractors: Error:', error)
      return []
    }
  },

  async getEstimateSlotTypes(companyId) {
    try {
      console.log('[supabaseService] getEstimateSlotTypes: Fetching via Edge Function')
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_estimate_slot_type`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      console.log('[supabaseService] getEstimateSlotTypes: Success, count:', result.slot_types?.length || 0)
      return result.slot_types || []
    } catch (error) {
      console.error('[supabaseService] getEstimateSlotTypes: Error:', error)
      return []
    }
  },

  async getEstimateSlots(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_estimate_slot`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ work_id: workId })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error getting estimate slots:', error)
      throw error
    }
  },

  // スロットのsort_indexをリバランス
  async rebalanceSortIndex(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/rebalance_sort_index`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            work_id: workId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // JSONパースに失敗した場合はテキストをそのまま使用
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error rebalancing sort index:', error)
      throw error
    }
  },

  // ファイルのカテゴリー/フェーズ/回転を更新
  async updateWorkFileCategory(fileId, categoryId, phaseId, rotation = undefined) {
    try {
      const body = {
        file_id: fileId,
        work_category_id: categoryId !== undefined ? (categoryId || null) : undefined,
        default_work_phase_id: phaseId !== undefined ? (phaseId || null) : undefined,
        rotation: rotation !== undefined ? rotation : undefined
      }
      // undefinedのキーを削除
      Object.keys(body).forEach(key => body[key] === undefined && delete body[key])
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/upsert_work_file_category`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body)
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error updating work file category:', error)
      throw error
    }
  },

  // ファイルを削除（deleted_atに値を設定）
  async deleteWorkFile(fileId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/delete_work_file`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            file_id: fileId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error deleting work file:', error)
      throw error
    }
  },

  // スロットを削除
  async deleteWorkSlot(slotId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/delete_report_slot`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            slot_id: slotId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // JSONパースに失敗した場合はテキストをそのまま使用
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error deleting work slot:', error)
      throw error
    }
  },

  // 認証トークンを取得
  getAccessToken() {
    return accessToken
  },

  // PDF生成用のワークデータを取得（get_report_slotから取得したデータを使用）
  async getWorkDataForPDF(workId) {
    try {
      // getWorkSlotsからデータを取得（既にwork_dataが含まれている）
      const slotsResult = await this.getWorkSlots(workId)
      
      if (!slotsResult.workData) {
        throw new Error('ワークデータが見つかりませんでした')
      }
      
      return {
        work: slotsResult.workData,
        workKind: slotsResult.workKind
      }
    } catch (error) {
      console.error('Error fetching work data for PDF:', error)
      throw error
    }
  },

  // 会社内のすべてのWORKSを取得（housing_detailsとJOIN）
  async getAllWorks() {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_all_work`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) {
            errorMessage = errorJson.error
          } else if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return data.works || []
    } catch (error) {
      console.error('Error fetching all works:', error)
      throw error
    }
  },

  // 請求アイテムを含むスーパー検索
  async searchWorksWithBilling(query) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/search_all_work_item`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ query })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) {
            errorMessage = errorJson.error
          }
        } catch (e) {
          // JSONパースに失敗した場合はそのまま
        }
        
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.work_ids || []
    } catch (error) {
      console.error('Error searching works with billing:', error)
      throw error
    }
  },

  // ワークスの詳細を取得（スモール/ラージ）
  async getWorkDetails(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_work_detail`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ work_id: workId })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) {
            errorMessage = errorJson.error
          } else if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return {
        work: data.work,
        details: data.details
      }
    } catch (error) {
      console.error('Error fetching work details:', error)
      throw error
    }
  },

  // PDFレイアウト情報を取得
  async getPdfLayout(applicationsCodes, workId, pageCount, values) {
    try {
      // applications_codesが配列の場合はそのまま使用、文字列の場合は配列に変換
      let targetApplicationsCodes = []
      if (Array.isArray(applicationsCodes)) {
        targetApplicationsCodes = applicationsCodes
      } else if (applicationsCodes) {
        targetApplicationsCodes = [applicationsCodes]
      } else {
        throw new Error('applications_codes is required')
      }
      
      const requestBody = {
        applications_codes: targetApplicationsCodes,
        work_id: workId,
        page_count: pageCount,
        payload: values
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/create_pdf_layout`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(requestBody)
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.reason) {
            errorMessage = errorJson.reason
          } else if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.reason || 'PDFレイアウトの取得に失敗しました')
      }
      
      return data
    } catch (error) {
      console.error('Error fetching PDF layout:', error)
      throw error
    }
  },

  // worksテーブルのdisplay_textを更新（Edge Function経由）
  async updateWorkDisplayText(workId, displayText) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/update_work_display_text`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            work_id: workId,
            display_text: displayText || null // 改行を保持（trimやreplaceは行わない）
          })
        }
      )
      
      const responseText = await response.text()
      let responseData
      
      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        console.error('Failed to parse response:', responseText)
        throw new Error(`Invalid response: ${responseText}`)
      }
      
      if (!response.ok) {
        const errorMessage = responseData.reason || responseData.message || `HTTP error! status: ${response.status}`
        console.error('update_work_display_text error:', {
          status: response.status,
          reason: responseData.reason,
          message: responseData.message,
          fullResponse: responseData
        })
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      if (!responseData.ok) {
        const errorMessage = responseData.reason || 'display_textの更新に失敗しました'
        console.error('update_work_display_text failed:', responseData)
        throw new Error(errorMessage)
      }
      
      return responseData.work // 更新されたworksレコードを返す
    } catch (error) {
      console.error('Error updating work display_text:', error)
      throw error
    }
  },

  // PDFファイルアップロード（work-pdfバケット用）
  async uploadPdfFile(workId, pdfFile) {
    try {
      const form = new FormData()
      form.append('work_id', workId)
      form.append('bucket', 'work-pdf') // PDFバケットを指定
      form.append('file', pdfFile)

      const accessToken = this.getAccessToken()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/upload_work_file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: form
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('PDF upload failed:', response.status, errorText)
        const error = new Error(`PDFアップロードに失敗しました: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      const responseData = await response.json()

      // エラーレスポンスの場合
      if (responseData.error) {
        const errorMessage = responseData.error || 'PDFアップロードに失敗しました'
        throw new Error(errorMessage)
      }

      // 成功レスポンス: { files: [...] }
      if (!responseData.files || responseData.files.length === 0) {
        throw new Error('PDFアップロード結果が空です')
      }

      return responseData.files[0] // アップロードされたファイル情報を返す
    } catch (error) {
      console.error('Error uploading PDF:', error)
      throw error
    }
  },

  // 既存PDFを削除（論理削除）
  async deleteExistingPdf(workId) {
    try {
      const accessToken = this.getAccessToken()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete_existing_pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ work_id: workId })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Delete existing PDF failed:', response.status, errorText)
        // 削除失敗はログのみ（エラーを投げない）
        return
      }

      const responseData = await response.json()
      console.log('Existing PDF deleted:', responseData)
    } catch (error) {
      console.error('Error deleting existing PDF:', error)
      // 削除失敗はログのみ（エラーを投げない）
    }
  },

  // PDFファイル情報を取得
  async getPdfFile(workId) {
    try {
      const accessToken = this.getAccessToken()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/get_pdf_file?work_id=${workId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null // PDFが存在しない
        }
        const errorText = await response.text()
        console.error('Get PDF file failed:', response.status, errorText)
        throw new Error(`PDF情報の取得に失敗しました: ${response.statusText}`)
      }

      const responseData = await response.json()
      return responseData.pdf_file || null
    } catch (error) {
      console.error('Error getting PDF file:', error)
      throw error
    }
  },

  // 請求項目を取得
  async getBillingItems(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_billing_item`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ work_id: workId })
        }
      )
      
      if (!response.ok) {
        // 400エラーの場合は請求項目がない可能性があるため、空配列を返す
        if (response.status === 400 || response.status === 404) {
          return {
            billingItems: [],
            kind: null
          }
        }
        
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) {
            errorMessage = errorJson.error
          } else if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      return {
        billingItems: data.billing_items || [],
        kind: data.kind
      }
    } catch (error) {
      console.error('Error fetching billing items:', error)
      // エラーが発生しても空配列を返す（請求項目がない場合のフォールバック）
      return {
        billingItems: [],
        kind: null
      }
    }
  },

  // 請求テンプレートを作成
  async createBillingTemplate(workId, label) {
    try {
      if (!workId) {
        throw new Error('work_id is required')
      }
      if (!label || typeof label !== 'string' || label.trim() === '') {
        throw new Error('label is required')
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/create_billing_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            work_id: workId,
            label: label.trim()
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) {
            errorMessage = errorJson.error
          } else if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'テンプレートの作成に失敗しました')
      }
      
      return {
        templateId: data.template_id,
        message: data.message
      }
    } catch (error) {
      console.error('Error creating billing template:', error)
      throw error
    }
  },

  // === カスタム文字列（Custom Snippets）API ===
  // システム予約ラベル
  SYSTEM_RESERVED_LABEL: 'like_snippet',

  // ========================================
  // スニペットグループ（custom_note_snippets）API
  // ========================================

  // スニペットグループ一覧を取得
  async getSnippetGroups(rebalance = false) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'list_groups',
            rebalance: rebalance
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'スニペットグループの取得に失敗しました')
      }
      
      return data.groups || []
    } catch (error) {
      console.error('Error getting snippet groups:', error)
      throw error
    }
  },

  // スニペットグループを作成
  async createSnippetGroup(label) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'create_group',
            label: label
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'スニペットグループの作成に失敗しました')
      }
      
      return data.group
    } catch (error) {
      console.error('Error creating snippet group:', error)
      throw error
    }
  },

  // スニペットグループを更新
  async updateSnippetGroup(id, updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'update_group',
            id: id,
            ...updates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'スニペットグループの更新に失敗しました')
      }
      
      return data.group
    } catch (error) {
      console.error('Error updating snippet group:', error)
      throw error
    }
  },

  // スニペットグループを削除
  async deleteSnippetGroup(id) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'delete_group',
            id: id
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'スニペットグループの削除に失敗しました')
      }
      
      return true
    } catch (error) {
      console.error('Error deleting snippet group:', error)
      throw error
    }
  },

  // スニペットグループの順序を更新
  async reorderSnippetGroups(groups) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'reorder_groups',
            groups: groups
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'スニペットグループの順序更新に失敗しました')
      }
      
      return true
    } catch (error) {
      console.error('Error reordering snippet groups:', error)
      throw error
    }
  },

  // ========================================
  // スニペットアイテム（custom_note_snippet_items）API
  // ========================================

  // スニペットアイテム一覧を取得
  async getSnippetItems(snippetId, rebalance = false) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'list_items',
            snippet_id: snippetId,
            rebalance: rebalance
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'スニペットアイテムの取得に失敗しました')
      }
      
      return data.items || []
    } catch (error) {
      console.error('Error getting snippet items:', error)
      throw error
    }
  },

  // スニペットアイテムを作成
  async createSnippetItem(snippetId, label, newlineAfter = true) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'create_item',
            snippet_id: snippetId,
            label: label,
            newline_after: newlineAfter
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'スニペットアイテムの作成に失敗しました')
      }
      
      return data.item
    } catch (error) {
      console.error('Error creating snippet item:', error)
      throw error
    }
  },

  // スニペットアイテムを更新
  async updateSnippetItem(id, updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'update_item',
            id: id,
            ...updates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'スニペットアイテムの更新に失敗しました')
      }
      
      return data.item
    } catch (error) {
      console.error('Error updating snippet item:', error)
      throw error
    }
  },

  // スニペットアイテムを削除
  async deleteSnippetItem(id) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'delete_item',
            id: id
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'スニペットアイテムの削除に失敗しました')
      }
      
      return true
    } catch (error) {
      console.error('Error deleting snippet item:', error)
      throw error
    }
  },

  // スニペットアイテムの順序を更新
  async reorderSnippetItems(items) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'reorder_items',
            items: items
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'スニペットアイテムの順序更新に失敗しました')
      }
      
      return true
    } catch (error) {
      console.error('Error reordering snippet items:', error)
      throw error
    }
  },

  // ========================================
  // 後方互換性のための旧API（非推奨）
  // ========================================
  
  // カスタム文字列一覧を取得（rebalance: trueでsort_orderをリバランス）
  // ※後方互換性のため維持。like_snippetグループのアイテムを返す
  async getCustomSnippets(rebalance = false) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'list',
            rebalance: rebalance
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'カスタム文字列の取得に失敗しました')
      }
      
      return data.snippets || []
    } catch (error) {
      console.error('Error getting custom snippets:', error)
      throw error
    }
  },
  
  // カスタム文字列を追加（後方互換性のため維持）
  async addCustomSnippet(label, newlineAfter = true) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'create',
            label: label,
            newline_after: newlineAfter
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'カスタム文字列の追加に失敗しました')
      }
      
      return data.snippet
    } catch (error) {
      console.error('Error adding custom snippet:', error)
      throw error
    }
  },
  
  // カスタム文字列を更新（後方互換性のため維持）
  async updateCustomSnippet(id, updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'update',
            id: id,
            ...updates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'カスタム文字列の更新に失敗しました')
      }
      
      return data.snippet
    } catch (error) {
      console.error('Error updating custom snippet:', error)
      throw error
    }
  },
  
  // カスタム文字列を削除（論理削除）（後方互換性のため維持）
  async deleteCustomSnippet(id) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'delete',
            id: id
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'カスタム文字列の削除に失敗しました')
      }
      
      return true
    } catch (error) {
      console.error('Error deleting custom snippet:', error)
      throw error
    }
  },

  // カスタム文字列の順序を更新（後方互換性のため維持）
  async reorderCustomSnippets(snippets) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'reorder',
            snippets: snippets
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'カスタム文字列の順序更新に失敗しました')
      }
      
      return true
    } catch (error) {
      console.error('Error reordering custom snippets:', error)
      throw error
    }
  },

  // ============================================================================
  // Work Categories API (work_categories テーブル)
  // ============================================================================

  // workに紐づくカテゴリー一覧を取得
  async getWorkCategories(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/work_category_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'list',
            work_id: workId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.categories || []
    } catch (error) {
      console.error('Error getting work categories:', error)
      throw error
    }
  },

  // 新しいカテゴリーを作成
  async createWorkCategory(workId, label, isPhase = false, sortOrder = null) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/work_category_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'create',
            work_id: workId,
            label: label,
            is_phase: isPhase,
            sort_order: sortOrder
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.category
    } catch (error) {
      console.error('Error creating work category:', error)
      throw error
    }
  },

  // カテゴリーを更新
  async updateWorkCategory(id, updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/work_category_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'update',
            id: id,
            ...updates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.category
    } catch (error) {
      console.error('Error updating work category:', error)
      throw error
    }
  },

  // カテゴリーを削除（論理削除）
  async deleteWorkCategory(id) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/work_category_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'delete',
            id: id
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.category
    } catch (error) {
      console.error('Error deleting work category:', error)
      throw error
    }
  },

  // カテゴリーの並び順を更新
  async reorderWorkCategories(categories) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/work_category_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'reorder',
            categories: categories // [{ id, sort_order }, ...]
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Error reordering work categories:', error)
      throw error
    }
  },

  // ============================================================================
  // Category Label Templates API (category_label_templates テーブル)
  // ============================================================================

  // カテゴリーラベルテンプレート一覧を取得（rebalance: trueでsort_orderをリバランス）
  async getCategoryLabelTemplates(rebalance = false) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/category_label_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'list',
            rebalance: rebalance
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.templates || []
    } catch (error) {
      console.error('Error getting category label templates:', error)
      throw error
    }
  },

  // カテゴリーラベルテンプレートを追加
  async addCategoryLabelTemplate(label) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/category_label_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'create',
            label: label
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.template
    } catch (error) {
      console.error('Error adding category label template:', error)
      throw error
    }
  },

  // カテゴリーラベルテンプレートを削除（論理削除）
  async deleteCategoryLabelTemplate(id) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/category_label_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'delete',
            id: id
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.template
    } catch (error) {
      console.error('Error deleting category label template:', error)
      throw error
    }
  },

  // カテゴリーラベルテンプレートを更新
  async updateCategoryLabelTemplate(id, updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/category_label_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'update',
            id: id,
            ...updates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.template
    } catch (error) {
      console.error('Error updating category label template:', error)
      throw error
    }
  },

  // カテゴリーラベルテンプレートの順序を更新
  async reorderCategoryLabelTemplates(templates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/category_label_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'reorder',
            templates: templates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      return data.ok
    } catch (error) {
      console.error('Error reordering category label templates:', error)
      throw error
    }
  },

  // 請求テンプレート一覧を取得（リバランス付き）
  async getBillingTemplates(rebalance = false) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'list',
            rebalance: rebalance
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error getting billing templates:', error)
      throw error
    }
  },

  // 空の請求テンプレートを新規作成
  async createEmptyBillingTemplate(label) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'create_template',
            label: label
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error creating empty billing template:', error)
      throw error
    }
  },

  // 請求テンプレートを更新
  async updateBillingTemplate(id, updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'update',
            id: id,
            ...updates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error updating billing template:', error)
      throw error
    }
  },

  // 請求テンプレートを削除
  async deleteBillingTemplate(id) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'delete',
            id: id
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error deleting billing template:', error)
      throw error
    }
  },

  // プライスリスト一覧を取得
  async getPriceLists(fiscalYear, kind = 'large') {
    try {
      // クエリパラメータを構築（fiscalYearがnullの場合は含めない）
      const params = new URLSearchParams({ kind: kind })
      if (fiscalYear !== null && fiscalYear !== undefined) {
        params.append('fiscal_year', String(fiscalYear))
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_price_list?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          }
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error getting price lists:', error)
      throw error
    }
  },

  // プライスリストアイテムを取得
  async getPriceListItems(priceListId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_price_list_item?price_list_id=${priceListId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          }
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error getting price list items:', error)
      throw error
    }
  },

  // 請求テンプレートの順序を更新
  async reorderBillingTemplates(templates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'reorder',
            templates: templates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error reordering billing templates:', error)
      throw error
    }
  },

  // BillingTemplateItems関連のAPI

  async getBillingTemplateItems(templateId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'get_items',
            template_id: templateId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error getting billing template items:', error)
      throw error
    }
  },

  async addBillingTemplateItem(templateId, { external_code, note, quantity }) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'add_item',
            template_id: templateId,
            external_code,
            note,
            quantity
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error adding billing template item:', error)
      throw error
    }
  },

  async updateBillingTemplateItem(itemId, updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'update_item',
            id: itemId,
            ...updates
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error updating billing template item:', error)
      throw error
    }
  },

  async deleteBillingTemplateItem(itemId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({
            action: 'delete_item',
            id: itemId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error deleting billing template item:', error)
      throw error
    }
  },

  async rebalanceBillingTemplateItems(templateId, itemIds = null) {
    try {
      const body = {
        action: 'rebalance_items',
        template_id: templateId
      }
      if (itemIds) {
        body.item_ids = itemIds
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_template_crud`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify(body)
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error rebalancing billing template items:', error)
      throw error
    }
  },

  // 見積スロットをアップサート
  async upsertEstimateSlot(slot) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/upsert_estimate_slot`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ slot })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error upserting estimate slot:', error)
      throw error
    }
  },

  // 見積スロットを削除（ソフトデリート）
  async deleteEstimateSlot(slotId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/delete_estimate_slot`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ slot_id: slotId })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error deleting estimate slot:', error)
      throw error
    }
  },

  // 見積スロットアイテムをアップサート
  async upsertEstimateSlotItem(item) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/upsert_estimate_slot_item`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ item })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error upserting estimate slot item:', error)
      throw error
    }
  },

  // 見積スロットアイテムを一括アップサート（同じエンドポイントを使用）
  async upsertEstimateSlotItems(items) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/upsert_estimate_slot_item`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ items })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error upserting estimate slot items:', error)
      throw error
    }
  },

  // 部屋ラベルを取得
  async getRoomLabels(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_room_label?work_id=${encodeURIComponent(workId)}`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error getting room labels:', error)
      throw error
    }
  },

  // 部屋ラベルをアップサート
  async upsertRoomLabels(workId, labels) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/upsert_room_label`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ work_id: workId, labels })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error upserting room labels:', error)
      throw error
    }
  },

  // 部屋ラベルテンプレートを取得
  async getRoomLabelTemplates() {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_room_label_template`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error getting room label templates:', error)
      throw error
    }
  },

  // 部屋ラベルテンプレートを保存
  async saveRoomLabelTemplates(labels) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get_room_label_template`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ labels })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error saving room label templates:', error)
      throw error
    }
  },

  // ========================================
  // 大口請求比較関連
  // ========================================

  // 比較データを取得
  async getBillingComparisons(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_comparison_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'get',
            work_id: workId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error getting billing comparisons:', error)
      throw error
    }
  },

  // 比較実行（一時データ生成）
  async executeBillingComparison(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_comparison_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'compare',
            work_id: workId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error executing billing comparison:', error)
      throw error
    }
  },

  // 比較データを保存
  async saveBillingComparisons(workId, items) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_comparison_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'save',
            work_id: workId,
            items
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error saving billing comparisons:', error)
      throw error
    }
  },

  // 比較データをリフレッシュ（全削除）
  async refreshBillingComparisons(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_comparison_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'refresh',
            work_id: workId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error refreshing billing comparisons:', error)
      throw error
    }
  },

  // 比較アイテムの修正数量を更新
  async updateBillingComparisonItem(workId, externalCode, requestQuantity) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/billing_comparison_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'update_item',
            work_id: workId,
            external_code: externalCode,
            request_quantity: requestQuantity
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error updating billing comparison item:', error)
      throw error
    }
  },

  // ========== 見積スロットテンプレート ==========
  
  // テンプレート取得
  async getEstimateSlotTemplate() {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/estimate_slot_template_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ action: 'get' })
        }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error getting template:', error)
      throw error
    }
  },

  // テンプレート保存
  async saveEstimateSlotTemplate(workId, templateName = 'マイテンプレート') {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/estimate_slot_template_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'save',
            work_id: workId,
            template_name: templateName
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error saving template:', error)
      throw error
    }
  },

  // テンプレート適用
  async applyEstimateSlotTemplate(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/estimate_slot_template_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'apply',
            work_id: workId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error applying template:', error)
      throw error
    }
  },

  // テンプレート削除
  async deleteEstimateSlotTemplate() {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/estimate_slot_template_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ action: 'delete' })
        }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  },

  // テンプレート挿入
  async insertEstimateSlotTemplate(workId) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/estimate_slot_template_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'insert',
            work_id: workId
          })
        }
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error inserting template:', error)
      throw error
    }
  },

  // ========================================
  // カスタムスニペットグループ操作
  // ========================================

  // スニペットグループ一覧取得
  async getSnippetGroups(rebalance = false) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'list_groups',
            rebalance
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result.groups || []
    } catch (error) {
      console.error('Error getting snippet groups:', error)
      throw error
    }
  },

  // スニペットグループ作成
  async createSnippetGroup(label) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'create_group',
            label
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result.group
    } catch (error) {
      console.error('Error creating snippet group:', error)
      throw error
    }
  },

  // スニペットグループ更新
  async updateSnippetGroup(id, updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'update_group',
            id,
            ...updates
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result.group
    } catch (error) {
      console.error('Error updating snippet group:', error)
      throw error
    }
  },

  // スニペットグループ削除
  async deleteSnippetGroup(id) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'delete_group',
            id
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting snippet group:', error)
      throw error
    }
  },

  // スニペットグループ並べ替え
  async reorderSnippetGroups(groups) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'reorder_groups',
            groups
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }

      return await response.json()
    } catch (error) {
      console.error('Error reordering snippet groups:', error)
      throw error
    }
  },

  // ========================================
  // カスタムスニペットアイテム操作
  // ========================================

  // スニペットアイテム一覧取得
  async getSnippetItems(snippetId, rebalance = false) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'list_items',
            snippet_id: snippetId,
            rebalance
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result.items || []
    } catch (error) {
      console.error('Error getting snippet items:', error)
      throw error
    }
  },

  // スニペットアイテム作成
  async createSnippetItem(snippetId, label, newlineAfter = true) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'create_item',
            snippet_id: snippetId,
            label,
            newline_after: newlineAfter
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result.item
    } catch (error) {
      console.error('Error creating snippet item:', error)
      throw error
    }
  },

  // スニペットアイテム更新
  async updateSnippetItem(id, updates) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'update_item',
            id,
            ...updates
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result.item
    } catch (error) {
      console.error('Error updating snippet item:', error)
      throw error
    }
  },

  // スニペットアイテム削除
  async deleteSnippetItem(id) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'delete_item',
            id
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting snippet item:', error)
      throw error
    }
  },

  // スニペットアイテム並べ替え
  async reorderSnippetItems(items) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/custom_snippet_crud`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            action: 'reorder_items',
            items
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }

      return await response.json()
    } catch (error) {
      console.error('Error reordering snippet items:', error)
      throw error
    }
  },

  // Excel見積書生成
  async generateExcelEstimate(workId, payload) {
    try {
      console.log('[Frontend] generateExcelEstimate called')
      console.log('[Frontend] workId:', workId)
      console.log('[Frontend] payload keys:', Object.keys(payload))
      console.log('[Frontend] accessToken exists:', !!accessToken)
      
      const headers = this.getHeaders()
      console.log('[Frontend] Request headers:', headers)
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/create_excel_estimate`,
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            work_id: workId,
            payload
          })
        }
      )

      console.log('[Frontend] Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('[Frontend] Error response:', errorText)
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) errorMessage = errorJson.error
        } catch {}
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('[Frontend] Success result:', result)
      return result
    } catch (error) {
      console.error('[Frontend] Error generating Excel estimate:', error)
      throw error
    }
  }
}

