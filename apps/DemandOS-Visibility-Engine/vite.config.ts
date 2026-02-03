import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // This handles local .env files
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioritize Vercel System Env (process.env) then Local Env
  const apiKey = process.env.API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    build: {
      // Fixes the "chunk size exceeded" warning
      chunkSizeWarningLimit: 1600,
    },
    define: {
      // CRITICAL: We inject the API key into a custom global variable.
      // This bypasses 'process.env' issues in the browser entirely.
      '__APP_API_KEY__': JSON.stringify(apiKey),
    }
  }
});