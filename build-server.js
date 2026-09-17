import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  sourcemap: true,
  outfile: 'dist/server.cjs',
}).then(() => {
  console.log('✓ Server built successfully to dist/server.cjs');
}).catch((err) => {
  console.error('Server build failed:', err);
  process.exit(1);
});
