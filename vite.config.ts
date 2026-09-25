import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command, mode }) => {
  const env = {
    ...loadEnv(mode, path.resolve(__dirname, '..'), ''),
    ...loadEnv(mode, __dirname, ''),
    ...loadEnv(mode, process.cwd(), ''),
  };
  const isProduction = mode === 'production' || process.env.NODE_ENV === 'production';
  const base = process.env.VITE_BASE || (command === 'build' || isProduction ? '/ADMITTO.Scanner/' : '/');

  const rawSbUrl = (process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || env.SUPABASE_URL || '').trim();
  const rawSbKey = (process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();
  const sbUrl = rawSbUrl && !rawSbUrl.includes('your-project-id') ? rawSbUrl : 'https://vifgaafjgzahqxuxtdar.supabase.co';
  const sbKey = rawSbKey && !rawSbKey.includes('your-anon-key') && !rawSbKey.includes('your-') ? rawSbKey : 'sb_publishable_N40WjzqQ56ZVFuBdDKs34Q_Hopg04S2';
  const rawApiCandidate = (process.env.VITE_API_URL || env.VITE_API_URL || process.env.API_URL || env.API_URL || '').trim();
  const cleanedApiUrl = (rawApiCandidate && rawApiCandidate !== 'true' && rawApiCandidate !== 'undefined' && rawApiCandidate !== 'null') ? rawApiCandidate : '';
  const apiUrl = cleanedApiUrl || (command === 'build' || isProduction ? 'https://admitto-scanner.onrender.com' : '');

  if (command === 'build') {
    console.log('[ADMITTO Build] Verifying client configuration:');
    console.log(`  - VITE_SUPABASE_URL: ${sbUrl}`);
    console.log(`  - VITE_SUPABASE_ANON_KEY: ${sbKey.substring(0, 16)}...`);
    console.log(`  - VITE_API_URL: ${apiUrl}`);
  }

  return {
    base,
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(sbUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(sbKey),
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'spa-github-pages-404',
        closeBundle() {
          const source404 = path.resolve(__dirname, 'public/404.html');
          const dest404 = path.resolve(__dirname, 'dist/404.html');
          if (fs.existsSync(source404)) {
            fs.copyFileSync(source404, dest404);
            console.log('[ADMITTO Build] Verified dist/404.html GitHub Pages SPA fallback from public/404.html');
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
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
