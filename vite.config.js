import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiServer = env.VITE_API_SERVER_URL || 'http://localhost:5000'
  const chatServer = env.VITE_CHAT_SERVER_URL || 'http://localhost:4000'
  const host = env.VITE_HOST ?? true

  return defineConfig({
    plugins: [react()],
    server: {
      port: 5174,
      host,
      open: true,
      proxy: {
        '/api': {
          target: apiServer,
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: apiServer,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: chatServer,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/github-api': {
          target: 'https://api.github.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/github-api/, ''),
          headers: {
            'User-Agent': 'GitBridge-App',
          },
        },
      },
      // Forward WebSocket connections to /ws
      '/ws': {
        target: 'ws://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  })
}

