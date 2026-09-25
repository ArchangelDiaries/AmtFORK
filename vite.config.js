import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// MOCK=1 swaps Firebase for local fixture data (tests/mock/) so the UI can be previewed without a backend.
const mock = process.env.MOCK === '1';
const m = f => fileURLToPath(new URL(`./tests/mock/${f}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: mock ? [
      { find: /^firebase\/firestore$/, replacement: m('firestore.js') },
      { find: /^firebase\/auth$/, replacement: m('auth.js') },
      { find: /.*\/lib\/firebase\.js$/, replacement: m('firebase.js') },
      { find: /.*\/lib\/data\.js$/, replacement: m('data.js') },
    ] : [],
  },
  build: {
    rollupOptions: { output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'] } } },
    chunkSizeWarningLimit: 700,
  },
});
