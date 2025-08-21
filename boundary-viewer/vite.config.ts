import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{
    proxy:{
      '/arcgis':{
        target:'https://spatial-img.information.qld.gov.au',
        changeOrigin:true,
        rewrite: p => p.replace(/^\/arcgis/, ''),
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: ['output.pmtiles'],
    },
  },
  publicDir: 'public',
  css: {
    preprocessorOptions: {
      css: {
        // Disable source maps for external CSS files
        devSourcemap: false
      }
    }
  }
})
