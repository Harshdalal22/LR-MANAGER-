import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProd = mode === 'production';
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
      esbuild: {
        // Drop console.log in production for smaller bundle
        drop: isProd ? ['console', 'debugger'] : [],
      },
      build: {
        // Increase chunk size warning limit (jspdf is legitimately large)
        chunkSizeWarningLimit: 600,
        // Use esbuild for faster, smaller minification
        minify: 'esbuild',
        target: 'es2020',
        rollupOptions: {
          output: {
            // Manual chunk splitting for better caching & parallel loading
            manualChunks(id) {
              // Supabase in its own chunk
              if (id.includes('@supabase')) return 'supabase';
              // PDF generation (heavy, lazy-loaded)
              if (id.includes('jspdf') || id.includes('autotable') || id.includes('html2canvas') || id.includes('dompurify')) return 'pdf';
              // Excel export
              if (id.includes('xlsx')) return 'xlsx';
              // Google AI
              if (id.includes('@google/genai')) return 'genai';
              // React core — must come before generic 'vendor' check
              if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-hot-toast/') || id.includes('/scheduler/')) return 'react-vendor';
              // All other vendor libs
              if (id.includes('node_modules')) return 'vendor';
            }
          }
        }
      }
    };
});
