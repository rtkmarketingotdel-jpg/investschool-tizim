import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * PWA manifest + brand placeholders in index.html, generated from the same VITE_BRAND_* variables the app uses,
 * so rebranding stays a pure env change (no brand name is written into static files).
 */
function pwa(env: Record<string, string>): Plugin {
  const name = env.VITE_BRAND_NAME || 'School';
  const short = env.VITE_BRAND_SHORT || name;
  const manifest = JSON.stringify({
    name,
    short_name: short,
    description: name,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    lang: 'uz',
    background_color: '#FFFFFF',
    theme_color: '#285EB5',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  });
  return {
    name: 'pwa-manifest',
    transformIndexHtml: (html) => html.replaceAll('%BRAND_NAME%', name).replaceAll('%BRAND_SHORT%', short),
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.end(manifest);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), pwa(env)],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, proxy: { '/api': 'http://localhost:4000', '/uploads': 'http://localhost:4000' } },
  };
});
