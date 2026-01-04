import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    // Server configuration for development
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Proxy API requests to backend during development
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // Build configuration for production
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['recharts'],
            pdf: ['jspdf', 'jspdf-autotable'],
            excel: ['xlsx'],
            word: ['docx', 'file-saver'],
            icons: ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 1600,
    },

    // Preview configuration
    preview: {
      port: 4173,
      host: '0.0.0.0',
    },

    // Plugins
    plugins: [react()],

    // Define environment variables available in the client
    define: {
      // Note: In production, AI calls go through backend API
      // These are only used if client-side AI was needed (legacy)
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },

    // Resolve aliases
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@services': path.resolve(__dirname, './src/services'),
      },
    },

    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react', 'recharts'],
      exclude: [],
    },
  };
});
