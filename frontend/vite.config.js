// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react-swc'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   base: '/', 
//   server: {
//     proxy: {
//       '/signup': 'http://localhost:8080/express',
//       '/api': 'http://localhost:8080/express',
//       '/ws': {
//         target: 'ws://localhost:8080/ws',
//         ws: true
//       }
//     }
//   },
//   define: {
//     'import.meta.env.VITE_NODE_API': JSON.stringify('http://localhost:8080/express'),
//     'import.meta.env.VITE_PYTHON_API': JSON.stringify('http://localhost:8080/fast'),
//     'import.meta.env.VITE_WEBSOCKET_URL': JSON.stringify('ws://localhost:8080/ws')
//   }
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', 
  server: {
    proxy: {
      '/signup': 'https://zw6dauneqa.us-east-1.awsapprunner.com/express',
      '/api': 'https://zw6dauneqa.us-east-1.awsapprunner.com/express',
      '/ws': {
        target: 'wss://zw6dauneqa.us-east-1.awsapprunner.com/ws',
        ws: true
      }
    }
  },
  define: {
    'import.meta.env.VITE_NODE_API': JSON.stringify('https://zw6dauneqa.us-east-1.awsapprunner.com/express'),
    'import.meta.env.VITE_PYTHON_API': JSON.stringify('https://zw6dauneqa.us-east-1.awsapprunner.com/fast'),
    'import.meta.env.VITE_WEBSOCKET_URL': JSON.stringify('wss://zw6dauneqa.us-east-1.awsapprunner.com/ws')
  }
})
