import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1'
    ],
    historyApiFallback: true,
  },
  preview: {
    allowedHosts: [
      'billing-frontend-kdco.onrender.com' // your Render domain
    ],
    host: '0.0.0.0',
    port: process.env.PORT || 4174
  }
})
