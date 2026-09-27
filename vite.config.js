import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// MOCK=1 swaps Firebase for local fixture data (tests/mock/) so the UI can be previewed without a backend.
const mock = process.env.MOCK === '1';
const m = f => fileURLToPath(new URL(`./tests/mock/${f}`, import.meta.url));

/** Writes herald/firebase-config.js from FORK's own Firebase settings, so The Herald's Call
    (public/herald/) always uses the same project and sign-in as FORK. No copy to keep in sync. */
function heraldConfig(env) {
  const cfg = {
    apiKey: env.VITE_FB_API_KEY || 'PASTE_NOT_CONFIGURED', authDomain: env.VITE_FB_AUTH_DOMAIN || '',
    projectId: env.VITE_FB_PROJECT_ID || '', appId: env.VITE_FB_APP_ID || '',
  };
  const source = `// Generated at build time from FORK's VITE_FB_* settings. Do not edit.\n`
    + `window.HERALD_FIREBASE_CONFIG = ${JSON.stringify(cfg, null, 2)};\nwindow.HERALD_COLLECTION_PREFIX = "herald_";\n`;
  return {
    name: 'herald-config',
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'herald/firebase-config.js', source }); },
    configureServer(server) {
      server.middlewares.use('/herald/firebase-config.js', (req, res) => { res.setHeader('content-type', 'application/javascript'); res.end(source); });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), heraldConfig(loadEnv(mode, process.cwd(), 'VITE_'))],
  define: { __FORK_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC') },
  resolve: {
    alias: mock ? [
      { find: /^firebase\/firestore$/, replacement: m('firestore.js') },
      { find: /^firebase\/auth$/, replacement: m('auth.js') },
      { find: /.*\/lib\/firebase\.js$/, replacement: m('firebase.js') },
      { find: /.*\/lib\/data\.js$/, replacement: m('data.js') },
      { find: /.*\/lib\/fieldMarshal\.js$/, replacement: m('fieldMarshal.js') },
    ] : [],
  },
  build: {
    rollupOptions: { output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'] } } },
    chunkSizeWarningLimit: 700,
  },
}));
