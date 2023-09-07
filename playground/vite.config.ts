import jsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [jsx()],
  optimizeDeps: {
    exclude: ['@liuyang0826/vue-draggable'],
  },
})
