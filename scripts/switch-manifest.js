import fs from 'fs';
import path from 'path';
import process from 'node:process';

const target = process.argv[2];

if (!['chrome', 'firefox'].includes(target)) {
  console.error('\x1b[31mError: Target must be "chrome" or "firefox"\x1b[0m');
  process.exit(1);
}

const sourceFile = path.resolve(`src/manifest.${target}.json`);
const targetFile = path.resolve('src/manifest.json');

if (!fs.existsSync(sourceFile)) {
  console.error(`\x1b[31mError: Could not find ${sourceFile}\x1b[0m`);
  process.exit(1);
}

try {
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`\x1b[32mSwitched local manifest.json to ${target.toUpperCase()} pattern.\x1b[0m`);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\x1b[31mFailed to update manifest.json: ${msg}\x1b[0m`);
  process.exit(1);
}
