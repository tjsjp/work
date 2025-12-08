// Supabase Edge Functions邨檎罰縺ｧ繝・・繧ｿ繧貞叙蠕励・譖ｴ譁ｰ縺吶ｋ繧ｵ繝ｼ繝薙せ

import { createClient } from '@supabase/supabase-js'
import { processImageForUpload } from '../utils/imageResize.js'

const SUPABASE_URL = "https://vtdhftukofbtxavnzlhv.supabase.co"
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGhmdHVrb2ZidHhhdm56bGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MjMzNjksImV4cCI6MjA3NzE5OTM2OX0.FheY0dsJgtL7xwUNZojF9HQM6zYKHmTv5iC3FAGSVmg"

// 繧ｰ繝ｭ繝ｼ繝舌Ν縺ｫ1縺､縺ｮSupabase繧ｯ繝ｩ繧､繧｢繝ｳ繝医う繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ繧剃ｽ懈・・郁､・焚繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ縺ｮ隴ｦ蜻翫ｒ髦ｲ縺撰ｼ・
export const supabaseClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// 隱崎ｨｼ繝医・繧ｯ繝ｳ・亥ｿ・ｦ√↓蠢懊§縺ｦ險ｭ螳夲ｼ・
let accessToken = null

export const supabaseService = {
  // 隱崎ｨｼ繝医・繧ｯ繝ｳ繧定ｨｭ螳・
  setAccessToken(token) {
    accessToken = token
  },

  // 繝倥ャ繝繝ｼ繧貞叙蠕・
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

  // work_id縺ｧwork_files繧貞叙蠕暦ｼ域里蟄倥・get_work_file_list繧剃ｽｿ逕ｨ・・
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
          // JSON繝代・繧ｹ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・繝・く繧ｹ繝医ｒ縺昴・縺ｾ縺ｾ菴ｿ逕ｨ
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

  // work_id縺ｧreport_slots繧貞叙蠕・
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
          // JSON繝代・繧ｹ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・繝・く繧ｹ繝医ｒ縺昴・縺ｾ縺ｾ菴ｿ逕ｨ
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
        workData: data.work_data || null // PDF逕滓・逕ｨ縺ｮ繝・・繧ｿ
      }
    } catch (error) {
      console.error('Error fetching work slots:', error)
      throw error
    }
  },

  // 繝輔ぃ繧､繝ｫ繧偵せ繝ｭ繝・ヨ縺ｫ蜑ｲ繧雁ｽ薙※
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
          // JSON繝代・繧ｹ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・繝・く繧ｹ繝医ｒ縺昴・縺ｾ縺ｾ菴ｿ逕ｨ
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

  // 繧ｹ繝ｭ繝・ヨ縺ｮ鬆・ｺ上ｒ譖ｴ譁ｰ・・psert_report_slot繧剃ｽｿ逕ｨ・・
  async updateSlotOrder(updates) {
    try {
      // 縺吶∋縺ｦ縺ｮ譖ｴ譁ｰ繧剃ｸｦ蛻励〒螳溯｡・
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

  // 繧ｹ繝ｭ繝・ヨ縺ｮ諠・ｱ繧呈峩譁ｰ・・ork_phase_id, note, break_before・・
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
          // JSON繝代・繧ｹ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・繝・く繧ｹ繝医ｒ縺昴・縺ｾ縺ｾ菴ｿ逕ｨ
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

  // 繧ｹ繝ｭ繝・ヨ繧呈諺蜈･・域眠縺励＞繧ｹ繝ｭ繝・ヨ繧剃ｽ懈・・・
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
          // JSON繝代・繧ｹ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・繝・く繧ｹ繝医ｒ縺昴・縺ｾ縺ｾ菴ｿ逕ｨ
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

  // 逕ｻ蜒上・鄂ｲ蜷攻RL繧貞叙蠕暦ｼ域里蟄倥・get_work_file_url繧剃ｽｿ逕ｨ・・
  // file_id縺九ｉwork_files繧貞叙蠕励＠縺ｦ縲｜ucket縺ｨobject_key繧貞叙蠕励☆繧句ｿ・ｦ√′縺ゅｋ
  async getSignedUrl(bucket, objectKey) {
    try {
      // 譌｢蟄倥・get_work_file_url縺ｯfile_id繧貞ｿ・ｦ√→縺吶ｋ縺溘ａ縲・
      // 縺薙・髢｢謨ｰ縺ｯfile_id繧堤峩謗･蜿励￠蜿悶ｋ蠖｢縺ｫ螟画峩縺吶ｋ蠢・ｦ√′縺ゅｋ
      // 縺ｾ縺溘・縲｜ucket縺ｨobject_key縺九ｉfile_id繧帝・ｼ輔″縺吶ｋ蠢・ｦ√′縺ゅｋ
      throw new Error('getSignedUrl縺ｯfile_id繧剃ｽｿ逕ｨ縺吶ｋ蠢・ｦ√′縺ゅｊ縺ｾ縺吶ＨetSignedUrlByFileId繧剃ｽｿ逕ｨ縺励※縺上□縺輔＞縲・)
    } catch (error) {
      console.error('Error getting signed URL:', error)
      throw error
    }
  },

  // file_id縺ｧ鄂ｲ蜷攻RL繧貞叙蠕暦ｼ域里蟄倥・get_work_file_url繧剃ｽｿ逕ｨ・・
  // useThumbnail: true縺ｮ蝣ｴ蜷医√し繝繝阪う繝ｫURL繧貞━蜈育噪縺ｫ蜿門ｾ・
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
          // JSON繝代・繧ｹ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・繝・く繧ｹ繝医ｒ縺昴・縺ｾ縺ｾ菴ｿ逕ｨ
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        const error = new Error(errorMessage)
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      // 繧ｵ繝繝阪う繝ｫURL縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・蜆ｪ蜈育噪縺ｫ菴ｿ逕ｨ縲√↑縺代ｌ縺ｰ蜈・判蜒酋RL
      return data.thumbnail_url || data.signed_url
    } catch (error) {
      console.error('Error getting signed URL:', error)
      throw error
    }
  },

  // 繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝・
  async uploadWorkFile(workId, files, options = {}, onProgress = null) {
    try {
      // 繝舌ャ繝√し繧､繧ｺ・井ｸ蠎ｦ縺ｫ繧｢繝・・繝ｭ繝ｼ繝峨☆繧九ヵ繧｡繧､繝ｫ謨ｰ・・
      const BATCH_SIZE = 10
      const allResults = {
        files: [],
        errors: []
      }

      // 繝輔ぃ繧､繝ｫ繧偵ヰ繝・メ縺ｫ蛻・牡
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

          // 繝舌ャ繝√・繝輔ぃ繧､繝ｫ繧定ｿｽ蜉・育判蜒上・蝣ｴ蜷医・繝ｪ繧ｵ繧､繧ｺ蜃ｦ逅・ｼ・
          const processedFiles = []
          const thumbnails = [] // { originalName: string, thumbnail: File | null }[]
          const fileMetadata = [] // 繝輔ぃ繧､繝ｫ縺ｮ繝｡繧ｿ繝・・繧ｿ・・idth, height, rotation, exifDateTime, isStandardAspectRatio・峨ｒ菫晄戟
          
          for (const file of batch) {
            const originalFileName = file.name // 蜈・・繝輔ぃ繧､繝ｫ蜷阪ｒ菫晄戟
            
            // 逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ蝣ｴ蜷医・繝ｪ繧ｵ繧､繧ｺ蜃ｦ逅・
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
                
                // 繝ｪ繧ｵ繧､繧ｺ蠕後・繝輔ぃ繧､繝ｫ蜷阪ｒ蜈・・繝輔ぃ繧､繝ｫ蜷阪↓謌ｻ縺呻ｼ医し繝ｼ繝舌・蛛ｴ縺ｧ縺ｮ蟇ｾ蠢應ｻ倥￠縺ｮ縺溘ａ・・
                const mainImageWithOriginalName = new File([mainImage], originalFileName, { type: mainImage.type })
                processedFiles.push(mainImageWithOriginalName)
                
                // 繧ｵ繝繝阪う繝ｫ縺後≠繧後・菫晄戟・亥・縺ｮ繝輔ぃ繧､繝ｫ蜷阪・繝ｼ繧ｹ縺ｧ蟇ｾ蠢應ｻ倥￠・・
                thumbnails.push({
                  originalName: originalFileName,
                  thumbnail: thumbnail
                })
                
                // 繝｡繧ｿ繝・・繧ｿ繧剃ｿ晏ｭ・
                fileMetadata.push({
                  originalFileName: originalFileName,
                  width: width,
                  height: height,
                  rotation: rotation,
                  exifDateTime: exifDateTime,
                  isStandardAspectRatio: isStandardAspectRatio
                })
              } catch (error) {
                console.error(`逕ｻ蜒上Μ繧ｵ繧､繧ｺ繧ｨ繝ｩ繝ｼ (${file.name}):`, error)
                // 繧ｨ繝ｩ繝ｼ譎ゅ・蜈・・繝輔ぃ繧､繝ｫ繧剃ｽｿ逕ｨ
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
              // 逕ｻ蜒丈ｻ･螟悶・繝輔ぃ繧､繝ｫ縺ｯ縺昴・縺ｾ縺ｾ
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

          // 繝｡繧､繝ｳ逕ｻ蜒上ｒ霑ｽ蜉
          for (const file of processedFiles) {
            form.append('files', file)
          }
          
          // 繧ｵ繝繝阪う繝ｫ繧定ｿｽ蜉・医し繝ｼ繝舌・蛛ｴ縺ｧ蟇ｾ蠢懊☆繧九◆繧√∝・縺ｮ繝輔ぃ繧､繝ｫ蜷阪・繝ｼ繧ｹ縺ｧ蟇ｾ蠢應ｻ倥￠・・
          for (const { originalName, thumbnail } of thumbnails) {
            if (thumbnail) {
              // 繧ｵ繝繝阪う繝ｫ繝輔ぃ繧､繝ｫ蜷阪・蜈・・繝輔ぃ繧､繝ｫ蜷・+ _thumb
              const thumbName = originalName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '_thumb.jpg')
              const thumbFile = new File([thumbnail], thumbName, { type: 'image/jpeg' })
              form.append('thumbnails', thumbFile)
            }
          }
          
          // 繝｡繧ｿ繝・・繧ｿ繧谷SON蠖｢蠑上〒騾∽ｿ｡
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
            files: batch, // 繝輔ぃ繧､繝ｫ繧ｪ繝悶ず繧ｧ繧ｯ繝郁・菴薙ｒ菫晄戟
            fileNames: batch.map(f => f.name)
          })
          // 繝ｪ繧ｽ繝ｼ繧ｹ蛻ｶ髯舌お繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・縲∵ｬ｡縺ｮ繝舌ャ繝√ｒ蟆代＠蠕・▲縺ｦ縺九ｉ螳溯｡・
          if (error.status === 546 || (error.message && error.message.includes('WORKER_LIMIT'))) {
            console.log(`Waiting before next batch due to resource limit...`)
            await new Promise(resolve => setTimeout(resolve, 2000)) // 2遘貞ｾ・ｩ・
          }
        }
      }

      // 繧ｨ繝ｩ繝ｼ縺後≠縺｣縺溷ｴ蜷医・隴ｦ蜻翫ｒ蜃ｺ縺吶′縲∵・蜉溘＠縺溘ヵ繧｡繧､繝ｫ縺ｯ霑斐☆
      if (allResults.errors.length > 0) {
        console.warn('Some batches failed:', allResults.errors)
        if (allResults.files.length === 0) {
          throw new Error(`縺吶∋縺ｦ縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆縲よ怙蛻昴・繧ｨ繝ｩ繝ｼ: ${allResults.errors[0].error}`)
        }
      }

      return allResults
    } catch (error) {
      console.error('Error uploading work file:', error)
      throw error
    }
  },

  // 隍・焚繝輔ぃ繧､繝ｫ繧偵∪縺ｨ繧√※繧｢繝・・繝ｭ繝ｼ繝会ｼ医ヰ繝・メ繧｢繝・・繝ｭ繝ｼ繝臥畑・・
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

      // 繝ｪ繧ｵ繧､繧ｺ貂医∩縺ｮ繝輔ぃ繧､繝ｫ縺ｨ繧ｵ繝繝阪う繝ｫ繧定ｿｽ蜉
      const fileMetadata = [] // 繝輔ぃ繧､繝ｫ縺ｮ繝｡繧ｿ繝・・繧ｿ・・idth, height, rotation・峨ｒ菫晄戟
      for (const item of batchItems) {
        // 繝｡繧､繝ｳ逕ｻ蜒擾ｼ医Μ繧ｵ繧､繧ｺ貂医∩・・
        const mainImageWithOriginalName = new File([item.processedFile], item.originalFileName, { type: item.processedFile.type })
        form.append('files', mainImageWithOriginalName)

        // 繧ｵ繝繝阪う繝ｫ・亥ｭ伜惠縺吶ｋ蝣ｴ蜷茨ｼ・
        if (item.thumbnail) {
          const lowerOriginalFileName = item.originalFileName.toLowerCase()
          const thumbName = lowerOriginalFileName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '_thumb.jpg')
          const thumbFile = new File([item.thumbnail], thumbName, { type: 'image/jpeg' })
          form.append('thumbnails', thumbFile)
        }

        // 繝｡繧ｿ繝・・繧ｿ繧剃ｿ晏ｭ假ｼ・idth, height, rotation, exifDateTime, isStandardAspectRatio・・
        fileMetadata.push({
          originalFileName: item.originalFileName,
          width: item.width,
          height: item.height,
          rotation: item.rotation,
          exifDateTime: item.exifDateTime ?? null,
          isStandardAspectRatio: item.isStandardAspectRatio ?? false
        })
      }

      // 繝｡繧ｿ繝・・繧ｿ繧谷SON蠖｢蠑上〒騾∽ｿ｡
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
        return data.files // 隍・焚繝輔ぃ繧､繝ｫ縺ｪ縺ｮ縺ｧ驟榊・繧定ｿ斐☆
      } else {
        throw new Error('繧｢繝・・繝ｭ繝ｼ繝峨↓謌仙粥縺励∪縺励◆縺後√ヵ繧｡繧､繝ｫ諠・ｱ縺悟叙蠕励〒縺阪∪縺帙ｓ縺ｧ縺励◆')
      }
    } catch (error) {
      console.error(`Error uploading batch files:`, error)
      throw error
    }
  },

  // 1繝輔ぃ繧､繝ｫ縺壹▽繧｢繝・・繝ｭ繝ｼ繝会ｼ医ヰ繝・け繧ｰ繝ｩ繧ｦ繝ｳ繝牙・逅・畑・・
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

      // 繝｡繧､繝ｳ逕ｻ蜒上ｒ霑ｽ蜉・医Μ繧ｵ繧､繧ｺ貂医∩・・
      const mainImageWithOriginalName = new File([processedFile], originalFileName, { type: processedFile.type })
      form.append('files', mainImageWithOriginalName)

      // 繧ｵ繝繝阪う繝ｫ繧定ｿｽ蜉・亥ｭ伜惠縺吶ｋ蝣ｴ蜷茨ｼ・
      if (thumbnail) {
        // 蜈・・繝輔ぃ繧､繝ｫ蜷阪ｒ蟆乗枚蟄怜喧縺励※縺九ｉ繧ｵ繝繝阪う繝ｫ繝輔ぃ繧､繝ｫ蜷阪ｒ逕滓・・亥､ｧ譁・ｭ怜ｰ乗枚蟄励・荳堺ｸ閾ｴ繧帝亟縺撰ｼ・
        const lowerOriginalFileName = originalFileName.toLowerCase()
        const thumbName = lowerOriginalFileName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '_thumb.jpg')
        const thumbFile = new File([thumbnail], thumbName, { type: 'image/jpeg' })
        form.append('thumbnails', thumbFile)
      }

      // 繝｡繧ｿ繝・・繧ｿ繧定ｿｽ蜉・・idth, height, rotation, exifDateTime, isStandardAspectRatio・・
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
        return data.files[0] // 1繝輔ぃ繧､繝ｫ縺ｪ縺ｮ縺ｧ譛蛻昴・隕∫ｴ繧定ｿ斐☆
      } else {
        throw new Error('繧｢繝・・繝ｭ繝ｼ繝峨↓謌仙粥縺励∪縺励◆縺後√ヵ繧｡繧､繝ｫ諠・ｱ縺悟叙蠕励〒縺阪∪縺帙ｓ縺ｧ縺励◆')
      }
    } catch (error) {
      console.error(`Error uploading single file (${originalFileName}):`, error)
      throw error
    }
  },

  // 繝・Φ繝励Ξ繝ｼ繝医°繧峨せ繝ｭ繝・ヨ繧呈諺蜈･・医Μ繝舌Λ繝ｳ繧ｹ霎ｼ縺ｿ・・
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

  // 繝・Φ繝励Ξ繝ｼ繝医ｒ菴懈・
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

  // 繝ｯ繝ｼ繧ｯ繧ｹ繝ｭ繝・ヨ繝・Φ繝励Ξ繝ｼ繝井ｸ隕ｧ繧貞叙蠕暦ｼ・ebalance: true縺ｧsort_order繧偵Μ繝舌Λ繝ｳ繧ｹ・・
  // kind逵∫払縺ｾ縺溘・null縺ｧ蜈ｨ莉ｶ蜿門ｾ・
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

  // 繝ｯ繝ｼ繧ｯ繧ｹ繝ｭ繝・ヨ繝・Φ繝励Ξ繝ｼ繝医・隧ｳ邏ｰ繧貞叙蠕・
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

  // 繝ｯ繝ｼ繧ｯ繧ｹ繝ｭ繝・ヨ繝・Φ繝励Ξ繝ｼ繝郁ｩｳ邏ｰ繧呈峩譁ｰ
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

  // 繝ｯ繝ｼ繧ｯ繧ｹ繝ｭ繝・ヨ繝・Φ繝励Ξ繝ｼ繝郁ｩｳ邏ｰ繧貞炎髯､
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

  // 繝ｯ繝ｼ繧ｯ繧ｹ繝ｭ繝・ヨ繝・Φ繝励Ξ繝ｼ繝郁ｩｳ邏ｰ繧定ｿｽ蜉
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

  // 繝ｯ繝ｼ繧ｯ繧ｹ繝ｭ繝・ヨ繝・Φ繝励Ξ繝ｼ繝医・繧｢繧､繝・Β繧剃ｸｦ縺ｳ譖ｿ縺・
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

  // 繝ｯ繝ｼ繧ｯ繧ｹ繝ｭ繝・ヨ繝・Φ繝励Ξ繝ｼ繝医ｒ譖ｴ譁ｰ・・abel, kind, sort_order・・
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

  // 繝ｯ繝ｼ繧ｯ繧ｹ繝ｭ繝・ヨ繝・Φ繝励Ξ繝ｼ繝医ｒ蜑企勁
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

  // 繝ｯ繝ｼ繧ｯ繧ｹ繝ｭ繝・ヨ繝・Φ繝励Ξ繝ｼ繝医・鬆・ｺ上ｒ譖ｴ譁ｰ
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

  // master_work_phases 荳隕ｧ繧貞叙蠕暦ｼ・ompany_id縺ｨkind縺ｧ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ・・
  async getMasterWorkPhases(kind = null) {
    try {
      const requestBody = kind ? { kind } : {}
      console.log('getMasterWorkPhases request body:', requestBody) // 繝・ヰ繝・げ逕ｨ
      
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
          // JSON繝代・繧ｹ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・繝・く繧ｹ繝医ｒ縺昴・縺ｾ縺ｾ菴ｿ逕ｨ
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

  // 繝槭せ繧ｿ繝ｼ繝励Λ繧､繧ｹ繧ｫ繝・ざ繝ｪ繝ｼ繧貞叙蠕・
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

  // 繧ｹ繝ｭ繝・ヨ縺ｮsort_index繧偵Μ繝舌Λ繝ｳ繧ｹ
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
          // JSON繝代・繧ｹ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・繝・く繧ｹ繝医ｒ縺昴・縺ｾ縺ｾ菴ｿ逕ｨ
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

  // 繝輔ぃ繧､繝ｫ縺ｮ繧ｫ繝・ざ繝ｪ繝ｼ/繝輔ぉ繝ｼ繧ｺ/蝗櫁ｻ｢繧呈峩譁ｰ
  async updateWorkFileCategory(fileId, categoryId, phaseId, rotation = undefined) {
    try {
      const body = {
        file_id: fileId,
        work_category_id: categoryId !== undefined ? (categoryId || null) : undefined,
        default_work_phase_id: phaseId !== undefined ? (phaseId || null) : undefined,
        rotation: rotation !== undefined ? rotation : undefined
      }
      // undefined縺ｮ繧ｭ繝ｼ繧貞炎髯､
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

  // 繝輔ぃ繧､繝ｫ繧貞炎髯､・・eleted_at縺ｫ蛟､繧定ｨｭ螳夲ｼ・
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

  // 繧ｹ繝ｭ繝・ヨ繧貞炎髯､
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
          // JSON繝代・繧ｹ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・繝・く繧ｹ繝医ｒ縺昴・縺ｾ縺ｾ菴ｿ逕ｨ
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

  // 隱崎ｨｼ繝医・繧ｯ繝ｳ繧貞叙蠕・
  getAccessToken() {
    return accessToken
  },

  // PDF逕滓・逕ｨ縺ｮ繝ｯ繝ｼ繧ｯ繝・・繧ｿ繧貞叙蠕暦ｼ・et_report_slot縺九ｉ蜿門ｾ励＠縺溘ョ繝ｼ繧ｿ繧剃ｽｿ逕ｨ・・
  async getWorkDataForPDF(workId) {
    try {
      // getWorkSlots縺九ｉ繝・・繧ｿ繧貞叙蠕暦ｼ域里縺ｫwork_data縺悟性縺ｾ繧後※縺・ｋ・・
      const slotsResult = await this.getWorkSlots(workId)
      
      if (!slotsResult.workData) {
        throw new Error('繝ｯ繝ｼ繧ｯ繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆')
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

  // 莨夂､ｾ蜀・・縺吶∋縺ｦ縺ｮWORKS繧貞叙蠕暦ｼ・ousing_details縺ｨJOIN・・
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

  // 隲区ｱゅい繧､繝・Β繧貞性繧繧ｹ繝ｼ繝代・讀懃ｴ｢
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
          // JSON繝代・繧ｹ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・縺昴・縺ｾ縺ｾ
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

  // 繝ｯ繝ｼ繧ｯ繧ｹ縺ｮ隧ｳ邏ｰ繧貞叙蠕暦ｼ医せ繝｢繝ｼ繝ｫ/繝ｩ繝ｼ繧ｸ・・
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

  // PDF繝ｬ繧､繧｢繧ｦ繝域ュ蝣ｱ繧貞叙蠕・
  async getPdfLayout(applicationsCodes, workId, pageCount, values) {
    try {
      // applications_codes縺碁・蛻励・蝣ｴ蜷医・縺昴・縺ｾ縺ｾ菴ｿ逕ｨ縲∵枚蟄怜・縺ｮ蝣ｴ蜷医・驟榊・縺ｫ螟画鋤
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
        throw new Error(data.reason || 'PDF繝ｬ繧､繧｢繧ｦ繝医・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆')
      }
      
      return data
    } catch (error) {
      console.error('Error fetching PDF layout:', error)
      throw error
    }
  },

  // works繝・・繝悶Ν縺ｮdisplay_text繧呈峩譁ｰ・・dge Function邨檎罰・・
  async updateWorkDisplayText(workId, displayText) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/update_work_display_text`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            work_id: workId,
            display_text: displayText || null // 謾ｹ陦後ｒ菫晄戟・・rim繧вeplace縺ｯ陦後ｏ縺ｪ縺・ｼ・
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
        const errorMessage = responseData.reason || 'display_text縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆'
        console.error('update_work_display_text failed:', responseData)
        throw new Error(errorMessage)
      }
      
      return responseData.work // 譖ｴ譁ｰ縺輔ｌ縺毆orks繝ｬ繧ｳ繝ｼ繝峨ｒ霑斐☆
    } catch (error) {
      console.error('Error updating work display_text:', error)
      throw error
    }
  },

  // PDF繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝会ｼ・ork-pdf繝舌こ繝・ヨ逕ｨ・・
  async uploadPdfFile(workId, pdfFile) {
    try {
      const form = new FormData()
      form.append('work_id', workId)
      form.append('bucket', 'work-pdf') // PDF繝舌こ繝・ヨ繧呈欠螳・
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
        const error = new Error(`PDF繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      const responseData = await response.json()

      // 繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ蝣ｴ蜷・
      if (responseData.error) {
        const errorMessage = responseData.error || 'PDF繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆'
        throw new Error(errorMessage)
      }

      // 謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ: { files: [...] }
      if (!responseData.files || responseData.files.length === 0) {
        throw new Error('PDF繧｢繝・・繝ｭ繝ｼ繝臥ｵ先棡縺檎ｩｺ縺ｧ縺・)
      }

      return responseData.files[0] // 繧｢繝・・繝ｭ繝ｼ繝峨＆繧後◆繝輔ぃ繧､繝ｫ諠・ｱ繧定ｿ斐☆
    } catch (error) {
      console.error('Error uploading PDF:', error)
      throw error
    }
  },

  // 譌｢蟄榔DF繧貞炎髯､・郁ｫ也炊蜑企勁・・
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
        // 蜑企勁螟ｱ謨励・繝ｭ繧ｰ縺ｮ縺ｿ・医お繝ｩ繝ｼ繧呈兜縺偵↑縺・ｼ・
        return
      }

      const responseData = await response.json()
      console.log('Existing PDF deleted:', responseData)
    } catch (error) {
      console.error('Error deleting existing PDF:', error)
      // 蜑企勁螟ｱ謨励・繝ｭ繧ｰ縺ｮ縺ｿ・医お繝ｩ繝ｼ繧呈兜縺偵↑縺・ｼ・
    }
  },

  // PDF繝輔ぃ繧､繝ｫ諠・ｱ繧貞叙蠕・
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
          return null // PDF縺悟ｭ伜惠縺励↑縺・
        }
        const errorText = await response.text()
        console.error('Get PDF file failed:', response.status, errorText)
        throw new Error(`PDF諠・ｱ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ${response.statusText}`)
      }

      const responseData = await response.json()
      return responseData.pdf_file || null
    } catch (error) {
      console.error('Error getting PDF file:', error)
      throw error
    }
  },

  // 隲区ｱる・岼繧貞叙蠕・
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
        // 400繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・隲区ｱる・岼縺後↑縺・庄閭ｽ諤ｧ縺後≠繧九◆繧√∫ｩｺ驟榊・繧定ｿ斐☆
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
      // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｦ繧らｩｺ驟榊・繧定ｿ斐☆・郁ｫ区ｱる・岼縺後↑縺・ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・・
      return {
        billingItems: [],
        kind: null
      }
    }
  },

  // 隲区ｱゅユ繝ｳ繝励Ξ繝ｼ繝医ｒ菴懈・
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
        throw new Error(data.error || '繝・Φ繝励Ξ繝ｼ繝医・菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆')
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

  // === 繧ｫ繧ｹ繧ｿ繝譁・ｭ怜・・・ustom Snippets・陰PI ===
  
  // 繧ｫ繧ｹ繧ｿ繝譁・ｭ怜・荳隕ｧ繧貞叙蠕暦ｼ・ebalance: true縺ｧsort_order繧偵Μ繝舌Λ繝ｳ繧ｹ・・
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
        throw new Error(data.error || '繧ｫ繧ｹ繧ｿ繝譁・ｭ怜・縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆')
      }
      
      return data.snippets || []
    } catch (error) {
      console.error('Error getting custom snippets:', error)
      throw error
    }
  },
  
  // 繧ｫ繧ｹ繧ｿ繝譁・ｭ怜・繧定ｿｽ蜉
  async addCustomSnippet(label, newlineAfter = true, isFavorite = true) {
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
            newline_after: newlineAfter,
            is_favorite: isFavorite
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
        throw new Error(data.error || '繧ｫ繧ｹ繧ｿ繝譁・ｭ怜・縺ｮ霑ｽ蜉縺ｫ螟ｱ謨励＠縺ｾ縺励◆')
      }
      
      return data.snippet
    } catch (error) {
      console.error('Error adding custom snippet:', error)
      throw error
    }
  },
  
  // 繧ｫ繧ｹ繧ｿ繝譁・ｭ怜・繧呈峩譁ｰ
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
        throw new Error(data.error || '繧ｫ繧ｹ繧ｿ繝譁・ｭ怜・縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆')
      }
      
      return data.snippet
    } catch (error) {
      console.error('Error updating custom snippet:', error)
      throw error
    }
  },
  
  // 繧ｫ繧ｹ繧ｿ繝譁・ｭ怜・繧貞炎髯､・郁ｫ也炊蜑企勁・・
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
        throw new Error(data.error || '繧ｫ繧ｹ繧ｿ繝譁・ｭ怜・縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆')
      }
      
      return true
    } catch (error) {
      console.error('Error deleting custom snippet:', error)
      throw error
    }
  },

  // 繧ｫ繧ｹ繧ｿ繝譁・ｭ怜・縺ｮ鬆・ｺ上ｒ譖ｴ譁ｰ
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
        throw new Error(data.error || '繧ｫ繧ｹ繧ｿ繝譁・ｭ怜・縺ｮ鬆・ｺ乗峩譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆')
      }
      
      return true
    } catch (error) {
      console.error('Error reordering custom snippets:', error)
      throw error
    }
  },

  // ============================================================================
  // Work Categories API (work_categories 繝・・繝悶Ν)
  // ============================================================================

  // work縺ｫ邏舌▼縺上き繝・ざ繝ｪ繝ｼ荳隕ｧ繧貞叙蠕・
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

  // 譁ｰ縺励＞繧ｫ繝・ざ繝ｪ繝ｼ繧剃ｽ懈・
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

  // 繧ｫ繝・ざ繝ｪ繝ｼ繧呈峩譁ｰ
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

  // 繧ｫ繝・ざ繝ｪ繝ｼ繧貞炎髯､・郁ｫ也炊蜑企勁・・
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

  // 繧ｫ繝・ざ繝ｪ繝ｼ縺ｮ荳ｦ縺ｳ鬆・ｒ譖ｴ譁ｰ
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
  // Category Label Templates API (category_label_templates 繝・・繝悶Ν)
  // ============================================================================

  // 繧ｫ繝・ざ繝ｪ繝ｼ繝ｩ繝吶Ν繝・Φ繝励Ξ繝ｼ繝井ｸ隕ｧ繧貞叙蠕暦ｼ・ebalance: true縺ｧsort_order繧偵Μ繝舌Λ繝ｳ繧ｹ・・
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

  // 繧ｫ繝・ざ繝ｪ繝ｼ繝ｩ繝吶Ν繝・Φ繝励Ξ繝ｼ繝医ｒ霑ｽ蜉
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

  // 繧ｫ繝・ざ繝ｪ繝ｼ繝ｩ繝吶Ν繝・Φ繝励Ξ繝ｼ繝医ｒ蜑企勁・郁ｫ也炊蜑企勁・・
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

  // 繧ｫ繝・ざ繝ｪ繝ｼ繝ｩ繝吶Ν繝・Φ繝励Ξ繝ｼ繝医ｒ譖ｴ譁ｰ
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

  // 繧ｫ繝・ざ繝ｪ繝ｼ繝ｩ繝吶Ν繝・Φ繝励Ξ繝ｼ繝医・鬆・ｺ上ｒ譖ｴ譁ｰ
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

  // 隲区ｱゅユ繝ｳ繝励Ξ繝ｼ繝井ｸ隕ｧ繧貞叙蠕暦ｼ医Μ繝舌Λ繝ｳ繧ｹ莉倥″・・
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

  // 遨ｺ縺ｮ隲区ｱゅユ繝ｳ繝励Ξ繝ｼ繝医ｒ譁ｰ隕丈ｽ懈・
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

  // 隲区ｱゅユ繝ｳ繝励Ξ繝ｼ繝医ｒ譖ｴ譁ｰ
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

  // 隲区ｱゅユ繝ｳ繝励Ξ繝ｼ繝医ｒ蜑企勁
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

  // 繝励Λ繧､繧ｹ繝ｪ繧ｹ繝井ｸ隕ｧ繧貞叙蠕・
  async getPriceLists(fiscalYear, kind = 'large') {
    try {
      // 繧ｯ繧ｨ繝ｪ繝代Λ繝｡繝ｼ繧ｿ繧呈ｧ狗ｯ会ｼ・iscalYear縺系ull縺ｮ蝣ｴ蜷医・蜷ｫ繧√↑縺・ｼ・
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

  // 繝励Λ繧､繧ｹ繝ｪ繧ｹ繝医い繧､繝・Β繧貞叙蠕・
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

  // 隲区ｱゅユ繝ｳ繝励Ξ繝ｼ繝医・鬆・ｺ上ｒ譖ｴ譁ｰ
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

  // BillingTemplateItems髢｢騾｣縺ｮAPI

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

  // 隕狗ｩ阪せ繝ｭ繝・ヨ繧偵い繝・・繧ｵ繝ｼ繝・
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

  // 隕狗ｩ阪せ繝ｭ繝・ヨ繧貞炎髯､・医た繝輔ヨ繝・Μ繝ｼ繝茨ｼ・
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

  // 隕狗ｩ阪せ繝ｭ繝・ヨ繧｢繧､繝・Β繧偵い繝・・繧ｵ繝ｼ繝・
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

  // 隕狗ｩ阪せ繝ｭ繝・ヨ繧｢繧､繝・Β繧剃ｸ諡ｬ繧｢繝・・繧ｵ繝ｼ繝茨ｼ亥酔縺倥お繝ｳ繝峨・繧､繝ｳ繝医ｒ菴ｿ逕ｨ・・
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

  // 驛ｨ螻九Λ繝吶Ν繧貞叙蠕・
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

  // 驛ｨ螻九Λ繝吶Ν繧偵い繝・・繧ｵ繝ｼ繝・
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

  // 驛ｨ螻九Λ繝吶Ν繝・Φ繝励Ξ繝ｼ繝医ｒ蜿門ｾ・
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

  // 驛ｨ螻九Λ繝吶Ν繝・Φ繝励Ξ繝ｼ繝医ｒ菫晏ｭ・
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
  // 螟ｧ蜿｣隲区ｱよｯ碑ｼ・未騾｣
  // ========================================

  // 豈碑ｼ・ョ繝ｼ繧ｿ繧貞叙蠕・
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

  // 豈碑ｼ・ｮ溯｡鯉ｼ井ｸ譎ゅョ繝ｼ繧ｿ逕滓・・・
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

  // 豈碑ｼ・ョ繝ｼ繧ｿ繧剃ｿ晏ｭ・
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

  // 豈碑ｼ・ョ繝ｼ繧ｿ繧偵Μ繝輔Ξ繝・す繝･・亥・蜑企勁・・
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

  // 豈碑ｼ・い繧､繝・Β縺ｮ菫ｮ豁｣謨ｰ驥上ｒ譖ｴ譁ｰ
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

  // ========== 隕狗ｩ阪せ繝ｭ繝・ヨ繝・Φ繝励Ξ繝ｼ繝・==========
  
  // 繝・Φ繝励Ξ繝ｼ繝亥叙蠕・
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

  // 繝・Φ繝励Ξ繝ｼ繝井ｿ晏ｭ・
  async saveEstimateSlotTemplate(workId, templateName = '繝槭う繝・Φ繝励Ξ繝ｼ繝・) {
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

  // 繝・Φ繝励Ξ繝ｼ繝磯←逕ｨ
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

  // 繝・Φ繝励Ξ繝ｼ繝亥炎髯､
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

  // 繝・Φ繝励Ξ繝ｼ繝域諺蜈･
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
  }
}


