import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: 'src/index.ts', // 工具库入口
      name: 'vway', // 工具库名称
      fileName: format => `vway.${format}.js` // 工具库名称
    }
  }
})
