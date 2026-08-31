import fs from 'fs';
import path from 'path';
import process from 'node:process';
import { ZipArchive } from 'archiver';

const manifestPath = path.resolve('src/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Format filename using manifest.version
const formattedName = manifest.name.toLowerCase().replace(/\s+/g, '-');
const formattedVersion = manifest.version.toLowerCase().replace(/\s+/g, '-');

const zipName = `${formattedName}_${formattedVersion}.zip`;
const distDir = path.resolve('dist');
const outputPath = path.join(distDir, zipName);

// Check for --force or -f flag
const forceOverwrite = process.argv.includes('--force') || process.argv.includes('-f');

// Check if output zip already exists
if (fs.existsSync(outputPath)) {
  if (forceOverwrite) {
    console.log(`\x1b[36m--force detected: Overwriting existing "${zipName}"...\x1b[0m`);
    fs.unlinkSync(outputPath);
  } else {
    console.warn(
      `\x1b[33mWarning: File "${zipName}" already exists in /dist/. Use --force (-f) to overwrite. Aborting build.\x1b[0m`
    );
    process.exit(1);
  }
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const output = fs.createWriteStream(outputPath);

const archive = new ZipArchive({
  zlib: { level: 9 },
});

output.on('close', () => {
  console.log(`Zip created: ${outputPath} (${archive.pointer()} total bytes)`);
});

archive.on('warning', (err) => {
  if (err.code !== 'ENOENT') {
    throw err;
  }
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Append contents from src directly to archive root
archive.directory('src/', false);

await archive.finalize();
