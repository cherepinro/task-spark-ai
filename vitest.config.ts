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
    environmentMatchGlobs: [
      // Client-side tests use jsdom
      ['client/**/*.{test,spec}.{js,ts,jsx,tsx}', 'jsdom'],
      // Server-side tests use node environment
      ['server/**/*.{test,spec}.{js,ts,jsx,tsx}', 'node'],
    ],
    setupFiles: ['./client/src/__tests__/setup.ts'],
    testTimeout: 30000,
    include: ['**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}', '**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
});
