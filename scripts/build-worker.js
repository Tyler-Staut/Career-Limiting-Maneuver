import { execSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Remove old worker to prevent conflicts
const oldWorker = resolve(root, 'src/worker.js');
if (existsSync(oldWorker)) {
  rmSync(oldWorker);
}

// Bundle the worker entry using esbuild
const entryPoint = resolve(root, 'src/worker-entry.ts');
const outfile = resolve(root, 'dist/worker.js');

console.log('Building worker with esbuild...');
try {
  execSync(
    `npx esbuild "${entryPoint}" --bundle --outfile="${outfile}" --format=esm --platform=browser --target=chrome90 --conditions=workerd`,
    { cwd: root, stdio: 'inherit' }
  );
  console.log('Worker built successfully at', outfile);
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
