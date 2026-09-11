import fs from 'fs';
import path from 'path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { ZipArchive } from 'archiver';

const ARGV = new Set(process.argv);
const FORCE_OVERWRITE = ARGV.has('--force') || ARGV.has('-f');
const FORCE_YES = ARGV.has('--yes') || ARGV.has('-y');

const TARGETS = {
  chrome: { path: path.resolve('src/manifest.chrome.json') },
  firefox: { path: path.resolve('src/manifest.firefox.json') },
};

// Load manifests
for (const [target, config] of Object.entries(TARGETS)) {
  if (!fs.existsSync(config.path)) {
    console.error(`\x1b[31mError: Missing ${config.path}\x1b[0m`);
    process.exit(1);
  }
  config.manifest = JSON.parse(fs.readFileSync(config.path, 'utf8'));
}

/** Compare shared keys between two objects. */
function findDiffs(objA, objB) {
  return Object.keys(objA)
    .filter((key) => key in objB && JSON.stringify(objA[key]) !== JSON.stringify(objB[key]))
    .map((key) => ({ key, chromeVal: objA[key], firefoxVal: objB[key] }));
}

/** Prompt user for confirmation in CLI. */
async function askConfirmation(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(query);
  rl.close();
  return ['y', 'ja'].includes(answer.trim().toLowerCase());
}

// 1. Check general manifest differences
const diffs = findDiffs(TARGETS.chrome.manifest, TARGETS.firefox.manifest);
if (diffs.length > 0) {
  console.log('\x1b[33m\n[WARN] Differences detected between shared manifest keys:\x1b[0m');
  for (const { key, chromeVal, firefoxVal } of diffs) {
    console.log(
      `\x1b[36m Key: "${key}"\x1b[0m\n   Chrome : ${JSON.stringify(chromeVal)}\n   Firefox: ${JSON.stringify(firefoxVal)}`
    );
  }
  console.log('');

  if (
    !FORCE_YES &&
    !(await askConfirmation('\x1b[35mDo you want to proceed with diff inspection? (y/N): \x1b[0m'))
  ) {
    console.log('\x1b[31mBuild aborted by user.\x1b[0m');
    process.exit(0);
  }
}

// 2. Specific version check & target filtering
let activeTargets = Object.keys(TARGETS);
const vChrome = TARGETS.chrome.manifest.version;
const vFirefox = TARGETS.firefox.manifest.version;
const vDiff = vChrome.localeCompare(vFirefox, undefined, { numeric: true, sensitivity: 'base' });

if (vDiff !== 0) {
  const highest = vDiff > 0 ? 'chrome' : 'firefox';
  const lowest = vDiff > 0 ? 'firefox' : 'chrome';
  console.log(
    `\x1b[33m\n[VERSION MISMATCH] ${highest.toUpperCase()} (${TARGETS[highest].manifest.version}) > ${lowest.toUpperCase()} (${TARGETS[lowest].manifest.version}).\x1b[0m`
  );

  if (!FORCE_YES) {
    if (
      await askConfirmation(
        `\x1b[35mBuild ONLY higher version target (${highest.toUpperCase()})? (y/N): \x1b[0m`
      )
    ) {
      activeTargets = [highest];
      console.log(`\x1b[36mTarget filtered: Building only for ${highest.toUpperCase()}.\x1b[0m`);
    } else {
      console.log('\x1b[36mProceeding to build BOTH targets despite version mismatch.\x1b[0m');
    }
  } else {
    activeTargets = [highest];
  }
}

/** Helper to build a target-specific zip package using its own manifest. */
async function buildPackage(target) {
  const { manifest, path: manifestPath } = TARGETS[target];
  const name = manifest.name.toLowerCase().replace(/\s+/g, '-');
  const version = manifest.version.toLowerCase().replace(/\s+/g, '-');
  const zipName = `${name}_${version}.zip`;

  const targetDir = path.resolve('dist', target);
  const outputPath = path.join(targetDir, zipName);

  fs.mkdirSync(targetDir, { recursive: true });

  if (fs.existsSync(outputPath)) {
    if (FORCE_OVERWRITE) {
      console.log(`\x1b[36m[${target}] --force detected: Overwriting "${zipName}"...\x1b[0m`);
      fs.unlinkSync(outputPath);
    } else {
      console.warn(
        `\x1b[33m[${target}] Warning: "${zipName}" exists in /dist/${target}/. Use --force (-f) to overwrite.\x1b[0m`
      );
      return;
    }
  }

  const output = fs.createWriteStream(outputPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  output.on('close', () =>
    console.log(
      `\x1b[32m[${target}] Zip created: ${outputPath} (${archive.pointer()} total bytes)\x1b[0m`
    )
  );
  archive.on('warning', (err) => {
    if (err.code !== 'ENOENT') throw err;
  });
  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  const IGNORED_MANIFESTS = new Set([
    'manifest.chrome.json',
    'manifest.firefox.json',
    'manifest.json',
  ]);
  archive.directory('src/', false, (entry) => (IGNORED_MANIFESTS.has(entry.name) ? false : entry));
  archive.file(manifestPath, { name: 'manifest.json' });

  await archive.finalize();
}

// 3. Execute builds
for (const target of activeTargets) {
  await buildPackage(target);
}
