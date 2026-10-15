// Vite config: two pages (index.html = screen index + phone iframe, phone.html = the app) and the Vitest setup.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { index: resolve(import.meta.dirname, 'index.html'), phone: resolve(import.meta.dirname, 'phone.html') },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    // The library ships `import "./index.scss"` in its JS, so Vite (not Node) must load it.
    server: { deps: { inline: [/@react-cupertino-ui/] } },
  },
});
