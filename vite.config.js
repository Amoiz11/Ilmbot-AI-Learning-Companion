import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap'
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (
              id.includes('react-markdown') ||
              id.includes('remark-') ||
              id.includes('rehype-') ||
              id.includes('unified') ||
              id.includes('micromark') ||
              id.includes('vfile') ||
              id.includes('unist-') ||
              id.includes('mdast-') ||
              id.includes('hast-')
            ) {
              return 'markdown-vendor';
            }
            if (id.includes('@react-oauth') || id.includes('jwt-decode')) {
              return 'oauth-vendor';
            }
          }
        },
      },
    },
  },
})
