import path from 'node:path';
import { env } from '@groam/env/web';
import { createWebVitestConfig } from '@groam/vitest-config/web';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, lazyPlugins } from 'vite-plus';

const { test } = createWebVitestConfig(import.meta.dirname);

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: env.staticHostingBasePath,
  envDir: '../..',
  // Unit tests run without the app plugins (route generation, React transform, Tailwind).
  plugins:
    mode === 'test'
      ? []
      : lazyPlugins(() => [
          tanstackRouter({ autoCodeSplitting: true, target: 'react' }),
          react(),
          tailwindcss()
        ]),
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
    dedupe: ['react', 'react-dom', 'recharts']
  },
  test
}));
