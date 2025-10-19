import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./client/src/__tests__/setup.ts'],
    testTimeout: 30000,
    include: ['**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}', '**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
});
