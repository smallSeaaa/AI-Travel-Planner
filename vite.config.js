import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  // 配置环境变量前缀，支持REACT_APP_前缀以兼容现有代码
  envPrefix: ['VITE_', 'REACT_APP_']
})