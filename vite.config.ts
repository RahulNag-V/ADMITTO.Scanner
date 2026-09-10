import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production' || process.env.NODE_ENV === 'production';
  const base = process.env.VITE_BASE || (command === 'build' || isProduction ? '/ADMITTO.Scanner/' : '/');

  const sbUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';

  if (command === 'build') {
    const hasUrl = Boolean(sbUrl && sbUrl.trim() && !sbUrl.includes('your-project-id'));
    const hasKey = Boolean(sbKey && sbKey.trim() && !sbKey.includes('your-anon-key'));

    console.log('[ADMITTO Build] Verifying Supabase client configuration:');
    console.log(`  - VITE_SUPABASE_URL: ${hasUrl ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    console.log(`  - VITE_SUPABASE_ANON_KEY: ${hasKey ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  }

  return {
    base,
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(sbUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(sbKey),
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'spa-github-pages-404',
        closeBundle() {
          const indexPath = path.resolve(__dirname, 'dist/index.html');
          const notFoundPath = path.resolve(__dirname, 'dist/404.html');
          if (fs.existsSync(indexPath)) {
            fs.copyFileSync(indexPath, notFoundPath);
            console.log('[ADMITTO Build] Generated dist/404.html for GitHub Pages SPA fallback');
          }
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'logo.png'],
        manifest: {
          name: 'ADMITTO — Digital Event Access & Token Validation',
          short_name: 'ADMITTO Scanner',
          description: 'Production-ready digital event access and token scanning platform with offline capability',
          theme_color: '#090d16',
          background_color: '#090d16',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'logo.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'logo.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^\/api\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
