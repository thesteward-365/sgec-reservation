// esbuild JS API를 사용해 번들링 (CLI 네이티브 바이너리 불필요)
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/lib/db/migrate.js'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'migrate.bundle.js',
}).then(() => {
  console.log('migrate.bundle.js built successfully');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
