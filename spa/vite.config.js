import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  
  // GitHub Pages用のベースパス（リポジトリ名に合わせて変更）
  base: '/work/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // デバッグ用にソースマップを有効化
    minify: 'esbuild',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    }
  },
  
  server: {
    port: 5173,
    open: true,
    cors: true,
    sourcemapIgnoreList: false // デバッグ用
  },
  
  // 開発時のソースマップ設定
  css: {
    devSourcemap: true
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})




