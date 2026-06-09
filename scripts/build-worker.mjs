import { renameSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../.env.local');
const envTmpPath = join(__dirname, '../.env.local.tmp');

let envRenamed = false;

try {
  // 1. Temporarily hide .env.local during OpenNext build to prevent duplicate exports error
  if (existsSync(envPath)) {
    renameSync(envPath, envTmpPath);
    envRenamed = true;
    console.log('🔒 Temporarily stashed .env.local to avoid duplication during build');
  }

  // 2. Execute OpenNext build
  console.log('🚀 Running opennextjs-cloudflare build...');
  execSync('npx opennextjs-cloudflare build', { stdio: 'inherit' });

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exitCode = 1;
} finally {
  // 3. Always restore .env.local
  if (envRenamed && existsSync(envTmpPath)) {
    renameSync(envTmpPath, envPath);
    console.log('🔓 Restored .env.local');
  }

  // 4. Run next-env patch script to fix any remaining issues
  if (process.exitCode !== 1) {
    try {
      execSync('node scripts/patch-next-env.mjs', { stdio: 'inherit' });
    } catch (e) {
      console.error('⚠️  Patch script failed:', e.message);
    }
  }
}
