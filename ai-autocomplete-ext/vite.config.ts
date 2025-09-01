import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Plugin to copy public files to dist
const copyPublicFiles = () => ({
  name: 'copy-public-files',
  closeBundle() {
    // Copy manifest and icons to dist
    const files = ['manifest.json', 'icon-16.png', 'icon-48.png', 'icon-128.png'];
    files.forEach(file => {
      try {
        copyFileSync(
          resolve(__dirname, 'public', file),
          resolve(__dirname, 'dist', file)
        );
        console.log(`Copied ${file} to dist`);
      } catch (err) {
        console.warn(`Warning: ${file} not found in public directory`);
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyPublicFiles()],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        consent: 'src/consent/consent.html',
        background: 'src/background/index.ts',
        content: 'src/content/index.ts'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId?.includes('/background/')) {
            return 'background.js'
          }
          if (facadeModuleId?.includes('/content/')) {
            return 'content.js'
          }
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        format: 'es'
      }
    },
    // Ensure everything is bundled properly
    target: 'chrome91',
    minify: false  // Keep it readable for debugging
  }
})
