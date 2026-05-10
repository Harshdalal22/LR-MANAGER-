import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Increase chunk size limit warning
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            // Split vendor libraries into separate cached chunks
            manualChunks(id) {
              if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('node_modules/@supabase')) {
                return 'supabase-vendor';
              }
              if (id.includes('node_modules/jspdf') || id.includes('node_modules/jspdf-autotable')) {
                return 'pdf-vendor';
              }
              if (id.includes('node_modules/xlsx')) {
                return 'xlsx-vendor';
              }
              if (id.includes('node_modules/@google/genai')) {
                return 'genai-vendor';
              }
            }
          }
        }
      }
    };
});
