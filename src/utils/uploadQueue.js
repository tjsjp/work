import { processImageForUpload } from './imageResize'

/**
 * バックグラウンドアップロードキュー
 * 1件ずつリサイズとアップロードを処理し、他の操作を優先できるようにする
 */
class UploadQueue {
  constructor() {
    this.queue = []
    this.isProcessing = false
    this.isPaused = false
    this.pendingPriorityOperation = null
    this.onProgress = null
    this.currentIndex = 0
    this.totalCount = 0
    this.uploadBuffer = [] // アップロード用のバッファ（10件ずつ）
    this.UPLOAD_BATCH_SIZE = 10 // アップロードのバッチサイズ
    this.RESIZE_BATCH_SIZE = 10 // リサイズのバッチサイズ
    this.uploadResultsCallback = null // アップロード結果を返すコールバック
  }

  /**
   * ファイルをキューに追加
   * @param {Array<File>} files - アップロードするファイル
   * @param {string} workId - Work ID
   * @param {Object} uploadOptions - アップロードオプション
   * @param {Function} uploadSingleFileFn - 未使用（バッチアップロードを使用）
   * @param {Function} onProgress - 進行状況コールバック
   * @param {Object} uploadResultsCallback - アップロード結果を返すコールバック（{success: [], errors: []}）
   */
  async addFiles(files, workId, uploadOptions, uploadSingleFileFn, onProgress = null, uploadResultsCallback = null) {
    console.log('[UploadQueue] addFiles called', {
      fileCount: files.length,
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      queueLength: this.queue.length
    })
    this.onProgress = onProgress
    this.uploadResultsCallback = uploadResultsCallback
    
    // 画像ファイル以外をフィルタリング
    // リサイズ可能な画像形式のみを許可
    const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    // リサイズできない画像形式を除外
    const DISALLOWED_IMAGE_EXTENSIONS = ['svg', 'ico', 'tiff', 'tif', 'heic', 'heif', 'avif', 'psd', 'ai', 'eps', 'raw', 'cr2', 'nef', 'orf', 'sr2'];
    
    const validFiles = [];
    const invalidFiles = [];
    
    for (const file of files) {
      // MIMEタイプでチェック
      if (!file.type || !file.type.startsWith('image/')) {
        invalidFiles.push(file.name);
        continue;
      }
      
      // 拡張子でチェック
      const fileName = file.name.toLowerCase();
      const ext = fileName.split('.').pop();
      
      // 拡張子がない場合は不許可
      if (!ext) {
        invalidFiles.push(file.name);
        continue;
      }
      
      // リサイズできない形式を除外
      if (DISALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
        invalidFiles.push(file.name);
        continue;
      }
      
      // 許可された拡張子のみを許可
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
        invalidFiles.push(file.name);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (invalidFiles.length > 0) {
      const errorMessage = `画像ファイル以外はアップロードできません: ${invalidFiles.join(', ')}`;
      console.warn('[UploadQueue] Invalid files rejected:', invalidFiles);
      // エラーを記録（uploadResultsCallbackはオブジェクトでsuccess/errors配列を持つ）
      if (this.uploadResultsCallback && this.uploadResultsCallback.errors) {
        for (const fileName of invalidFiles) {
          const file = files.find(f => f.name === fileName);
          if (file) {
            this.uploadResultsCallback.errors.push({
              file: file,
              error: errorMessage
            });
          }
        }
      }
    }
    
    if (validFiles.length === 0) {
      console.warn('[UploadQueue] No valid image files to upload');
      // 有効なファイルがなくても、エラーがある場合は処理完了を通知
      if (invalidFiles.length > 0) {
        console.log('[UploadQueue] Invalid files detected, calling onProgress({ active: false })');
        if (this.onProgress) {
          this.onProgress({ active: false });
        } else {
          console.warn('[UploadQueue] onProgress callback is not set');
        }
      }
      return;
    }
    
    this.totalCount += validFiles.length

    // 各ファイルをキューに追加（validFilesのみ）
    for (const file of validFiles) {
      this.queue.push({
        file,
        workId,
        uploadOptions
      })
    }

    console.log('[UploadQueue] addFiles: Valid files added to queue', {
      validCount: validFiles.length,
      invalidCount: invalidFiles.length,
      queueLength: this.queue.length,
      totalCount: this.totalCount
    })

    // 処理を開始（既に処理中でない場合）
    if (!this.isProcessing && !this.isPaused) {
      console.log('[UploadQueue] addFiles: Starting processQueue()')
      this.processQueue()
    } else {
      console.log('[UploadQueue] addFiles: Already processing or paused, skipping processQueue()')
    }
  }

  /**
   * キューを処理（1件ずつ）
   */
  async processQueue() {
    console.log('[UploadQueue] processQueue called', {
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      queueLength: this.queue.length,
      currentIndex: this.currentIndex,
      totalCount: this.totalCount,
      pendingPriorityOperation: !!this.pendingPriorityOperation
    })

    if (this.isProcessing || this.isPaused) {
      console.log('[UploadQueue] processQueue: Already processing or paused, returning')
      return
    }

    // 優先操作が待機中の場合、処理を一時停止
    if (this.pendingPriorityOperation) {
      console.log('[UploadQueue] processQueue: Executing pending priority operation')
      this.isPaused = true
      await this.pendingPriorityOperation()
      this.pendingPriorityOperation = null
      this.isPaused = false
      console.log('[UploadQueue] processQueue: Priority operation completed')
    }

    if (this.queue.length === 0) {
      // キューが空になったら、残っているバッチをアップロード
      if (this.uploadBuffer.length > 0) {
        console.log('[UploadQueue] processQueue: Queue is empty, uploading remaining batch')
        await this.uploadBatch()
      }
      console.log('[UploadQueue] processQueue: Queue is empty, finishing')
      this.isProcessing = false
      this.currentIndex = 0
      this.totalCount = 0
      this.uploadBuffer = []
      if (this.onProgress) {
        console.log('[UploadQueue] processQueue: Calling onProgress({ active: false })')
        this.onProgress({ active: false })
      }
      return
    }

    this.isProcessing = true

    // リサイズ用バッファに10件ずつ集める
    const resizeBatch = []
    while (resizeBatch.length < this.RESIZE_BATCH_SIZE && this.queue.length > 0) {
      const item = this.queue.shift()
      resizeBatch.push(item)
    }

    console.log('[UploadQueue] processQueue: Processing resize batch', {
      batchSize: resizeBatch.length,
      currentIndex: this.currentIndex,
      totalCount: this.totalCount,
      queueLength: this.queue.length
    })

    try {
      // 1. リサイズ処理（画像の場合）- 10件ずつ並列処理
      const resizePromises = resizeBatch.map(async (item) => {
        let processedFile = item.file
        let thumbnail = null
        let width = null
        let height = null
        let rotation = 0
        let exifDateTime = null
        let isStandardAspectRatio = false

        if (item.file.type && item.file.type.startsWith('image/')) {
          try {
            console.log('[UploadQueue] processQueue: Starting image resize', item.file.name)
            const result = await processImageForUpload(item.file, {
              mainMaxWidth: 1200,
              mainMaxHeight: 900,
              mainQuality: 0.92,
              thumbMaxWidth: 200,
              thumbMaxHeight: 150,
              thumbQuality: 0.85
            })
            processedFile = result.mainImage
            thumbnail = result.thumbnail
            width = result.width
            height = result.height
            rotation = result.rotation
            exifDateTime = result.exifDateTime
            isStandardAspectRatio = result.isStandardAspectRatio
            console.log('[UploadQueue] processQueue: Image resize completed', item.file.name, { width, height, rotation, exifDateTime, isStandardAspectRatio })
          } catch (error) {
            console.error(`[UploadQueue] 画像リサイズエラー (${item.file.name}):`, error)
            // リサイズできない形式の場合はエラーとして記録
            if (this.uploadResultsCallback && this.uploadResultsCallback.errors) {
              this.uploadResultsCallback.errors.push({
                file: item.file,
                error: error.message || '画像のリサイズに失敗しました'
              })
            }
            // エラーを再スローして、このファイルの処理をスキップ
            throw error
          }
        }

        return {
          workId: item.workId,
          processedFile,
          originalFileName: item.file.name,
          thumbnail,
          uploadOptions: item.uploadOptions,
          width,
          height,
          rotation,
          exifDateTime,
          isStandardAspectRatio
        }
      })

      // 10件並列でリサイズ処理（エラーが発生したファイルは除外）
      const resizeResults = []
      const resizePromisesWithErrorHandling = resizePromises.map(async (promise) => {
        try {
          return await promise
        } catch (error) {
          // エラーが発生したファイルは結果に含めない（エラーは既に記録済み）
          console.error('[UploadQueue] リサイズ処理でエラーが発生したファイルをスキップ:', error)
          return null
        }
      })
      
      const resizeResultsRaw = await Promise.all(resizePromisesWithErrorHandling)
      // null（エラーが発生したファイル）を除外
      for (const result of resizeResultsRaw) {
        if (result !== null) {
          resizeResults.push(result)
        }
      }

      // リサイズ完了後、進行状況を更新（リサイズ完了時点で更新）
      this.currentIndex += resizeResults.length
      if (this.onProgress) {
        this.onProgress({
          active: true,
          current: this.currentIndex,
          total: this.totalCount,
          fileName: resizeResults[resizeResults.length - 1]?.originalFileName || ''
        })
      }

      // リサイズ完了後、優先操作をチェック
      if (this.pendingPriorityOperation) {
        console.log('[UploadQueue] processQueue: Pending priority operation after resize')
        this.isPaused = true
        await this.pendingPriorityOperation()
        this.pendingPriorityOperation = null
        this.isPaused = false
        console.log('[UploadQueue] processQueue: Priority operation completed after resize')
      }

      // 2. アップロード用バッファに追加（10件ずつまとめてアップロード）
      for (const result of resizeResults) {
        this.uploadBuffer.push(result)
      }

      // バッファが10件になったら、またはキューが空になったらアップロード
      if (this.uploadBuffer.length >= this.UPLOAD_BATCH_SIZE || this.queue.length === 0) {
        try {
          await this.uploadBatch()
        } catch (uploadError) {
          console.error(`[UploadQueue] バッチアップロードエラー:`, uploadError)
          // バッチアップロードエラーは記録するが、次のファイルの処理は続行
          // エラーハンドリングは呼び出し元で行う
          throw uploadError
        }
      }

    } catch (error) {
      console.error(`[UploadQueue] 処理エラー:`, error)
      console.error('[UploadQueue] processQueue: Error state', {
        isProcessing: this.isProcessing,
        queueLength: this.queue.length,
        pendingPriorityOperation: !!this.pendingPriorityOperation
      })
      // エラーは記録するが、次のファイルの処理は続行
      // エラーハンドリングは呼び出し元で行う
      // エラー時もisProcessingをfalseに戻してから再スロー
      this.isProcessing = false
      throw error // エラーを再スローして呼び出し元で処理
    }

    // 1件の処理が完了したので、isProcessingをfalseに戻す
    // 次のファイルを処理する前に、再帰呼び出しが正常に動作するようにする
    this.isProcessing = false

    // 次のファイルを処理
    console.log('[UploadQueue] processQueue: Calling processQueue() recursively (line 142)', {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing
    })
    this.processQueue()
  }

  /**
   * バッチアップロード（5件ずつまとめて1つのリクエストでアップロード）
   */
  async uploadBatch() {
    if (this.uploadBuffer.length === 0) {
      return
    }

    const batch = [...this.uploadBuffer]
    this.uploadBuffer = []

    console.log(`[UploadQueue] uploadBatch: Uploading ${batch.length} files in a single request`)

    // 優先操作が待機中の場合、処理を一時停止
    if (this.pendingPriorityOperation) {
      console.log('[UploadQueue] uploadBatch: Pending priority operation before upload')
      this.isPaused = true
      await this.pendingPriorityOperation()
      this.pendingPriorityOperation = null
      this.isPaused = false
      console.log('[UploadQueue] uploadBatch: Priority operation completed before upload')
    }

    try {
      // バッチ内の最初のアイテムの情報を使用（workIdとuploadOptionsは同じはず）
      const firstItem = batch[0]
      const workId = firstItem.workId
      const uploadOptions = firstItem.uploadOptions

      // supabaseServiceをインポート（動的インポート）
      const { supabaseService } = await import('../services/supabase.js')

      // 1つのリクエストでまとめてアップロード
      const uploadedFiles = await supabaseService.uploadBatchFiles(workId, batch, uploadOptions)
      
      console.log(`[UploadQueue] uploadBatch: Successfully uploaded ${batch.length} files in a single request`)
      
      // アップロード結果をコールバックに渡す
      if (this.uploadResultsCallback && uploadedFiles) {
        for (const uploadedFile of uploadedFiles) {
          this.uploadResultsCallback.success.push(uploadedFile)
        }
      }
      
      return uploadedFiles
    } catch (error) {
      console.error(`[UploadQueue] uploadBatch: Batch upload error:`, error)
      
      // エラーをコールバックに渡す
      if (this.uploadResultsCallback) {
        for (const item of batch) {
          this.uploadResultsCallback.errors.push({
            file: null, // 元のファイルオブジェクトは保持されていない
            error: error.message
          })
        }
      }
      
      // エラーは呼び出し元で処理
      throw error
    }

    // アップロード完了後、優先操作をチェック
    if (this.pendingPriorityOperation) {
      console.log('[UploadQueue] uploadBatch: Pending priority operation after upload')
      this.isPaused = true
      await this.pendingPriorityOperation()
      this.pendingPriorityOperation = null
      this.isPaused = false
      console.log('[UploadQueue] uploadBatch: Priority operation completed after upload')
    }
  }

  /**
   * 優先操作を実行（1件の処理完了後に実行）
   * @param {Function} operation - 実行する操作
   */
  async executePriorityOperation(operation) {
    console.log('[UploadQueue] executePriorityOperation called', {
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      queueLength: this.queue.length
    })
    if (this.isProcessing) {
      // 処理中の場合、次のチェックポイントで実行
      console.log('[UploadQueue] executePriorityOperation: Setting pendingPriorityOperation')
      this.pendingPriorityOperation = operation
    } else {
      // 処理中でない場合、即座に実行
      console.log('[UploadQueue] executePriorityOperation: Executing immediately')
      await operation()
      console.log('[UploadQueue] executePriorityOperation: Completed')
    }
  }

  /**
   * キューをクリア
   */
  clear() {
    this.queue = []
    this.isProcessing = false
    this.isPaused = false
    this.pendingPriorityOperation = null
    this.currentIndex = 0
    this.totalCount = 0
    this.uploadBuffer = []
    if (this.onProgress) {
      this.onProgress({ active: false })
    }
  }

  /**
   * キューが空かどうか
   */
  isEmpty() {
    return this.queue.length === 0 && !this.isProcessing
  }

  /**
   * 処理中かどうか
   */
  getProcessing() {
    return this.isProcessing || this.isPaused
  }
}

// シングルトンインスタンス
export const uploadQueue = new UploadQueue()

