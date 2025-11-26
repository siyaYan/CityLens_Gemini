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
        'process.env.FREE_GEMINI_API_KEY': JSON.stringify(env.FREE_GEMINI_API_KEY),
        'process.env.PAID_GEMINI_API_KEY': JSON.stringify(env.PAID_GEMINI_API_KEY),
        'process.env.HF_API_TOKEN': JSON.stringify(env.HF_API_TOKEN),
        'process.env.HF_IMAGE_MODEL_ID': JSON.stringify(env.HF_IMAGE_MODEL_ID)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
