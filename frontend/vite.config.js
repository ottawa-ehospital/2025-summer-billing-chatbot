import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', 
  server: {
    proxy: {
      '/signup': 'http://localhost:3033',
      '/api': 'http://localhost:3033'
    }
  },
  define: {
    'import.meta.env.VITE_NODE_API': JSON.stringify('http://localhost:3033'),
    'import.meta.env.VITE_PYTHON_API': JSON.stringify('http://localhost:8000')
  }
})
