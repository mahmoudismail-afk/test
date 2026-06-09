const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const SOURCE_DIR = __dirname;
const TARGET_DIR = 'I:\\My Drive\\WEB\\AMA';
const EXCLUDED_DIRS = ['.git', 'node_modules', '.next', '.open-next', '.wrangler', 'tsconfig.tsbuildinfo'];
// ---------------------

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function copyFile(sourcePath) {
  const relativePath = path.relative(SOURCE_DIR, sourcePath);
  
  // Skip if it's in an excluded directory
  if (EXCLUDED_DIRS.some(dir => relativePath.startsWith(dir + path.sep) || relativePath === dir)) {
    return;
  }

  const destPath = path.join(TARGET_DIR, relativePath);

  try {
    if (fs.lstatSync(sourcePath).isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
        console.log(`📁 Created directory: ${relativePath}`);
      }
    } else {
      ensureDirectoryExistence(destPath);
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✨ Synced: ${relativePath}`);
    }
  } catch (err) {
    console.error(`❌ Error syncing ${relativePath}:`, err.message);
  }
}

function initialSync() {
  console.log('🚀 Performing initial sync...');
  const walk = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const relativePath = path.relative(SOURCE_DIR, fullPath);
      
      if (EXCLUDED_DIRS.some(excluded => relativePath.startsWith(excluded + path.sep) || relativePath === excluded)) {
        continue;
      }

      if (fs.lstatSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else {
        copyFile(fullPath);
      }
    }
  };
  walk(SOURCE_DIR);
  console.log('✅ Initial sync complete.\n');
}

console.log(`🔄 Starting Live Backup Watcher...`);
console.log(`Source: ${SOURCE_DIR}`);
console.log(`Target: ${TARGET_DIR}`);
console.log(`Excluding: ${EXCLUDED_DIRS.join(', ')}\n`);

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Perform an initial sync to ensure both folders are identical at start
initialSync();

// Watch for changes
fs.watch(SOURCE_DIR, { recursive: true }, (eventType, filename) => {
  if (filename) {
    const fullPath = path.join(SOURCE_DIR, filename);
    
    // Check if file still exists (it might have been deleted)
    if (fs.existsSync(fullPath)) {
      copyFile(fullPath);
    } else {
      // Handle deletion if you want, but for backup we might want to keep deleted files?
      // For a "mirror", we would delete. For a "backup", we keep.
      // Let's keep it for now (safer).
    }
  }
});

console.log('👀 Watching for changes... (Press Ctrl+C to stop)');
