#!/usr/bin/env node
// Post-build patch: fix opennextjs-cloudflare bug where next-env.mjs gets duplicate exports
// when both .env.local and .env.production exist. See: https://github.com/opennextjs/opennextjs-cloudflare/issues

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '../.open-next/cloudflare/next-env.mjs');

try {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim() !== '');
  
  // Deduplicate by keeping only first occurrence of each export name
  const seen = new Set();
  const deduped = lines.filter(line => {
    const match = line.match(/^export const (\w+)/);
    if (match) {
      if (seen.has(match[1])) return false;
      seen.add(match[1]);
    }
    return true;
  });
  
  writeFileSync(filePath, deduped.join('\n') + '\n');
  console.log(`✅ Patched next-env.mjs (removed ${lines.length - deduped.length} duplicate export(s))`);
} catch (e) {
  console.error('⚠️  Could not patch next-env.mjs:', e.message);
}
