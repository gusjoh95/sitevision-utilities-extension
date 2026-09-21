#!/usr/bin/env node
/* global process */
import fs from 'fs/promises';
import path from 'path';

const THEMES_DIR = path.join(process.cwd(), 'src', 'resources', 'style', 'json-themes');

function hexToRgba(hex) {
  if (!hex) return null;
  const h = hex.replace('#', '').trim();
  if (![3, 4, 6, 8].includes(h.length)) return null;
  const parse = (s) => parseInt(s, 16);
  if (h.length === 3) {
    const r = parse(h[0] + h[0], 16);
    const g = parse(h[1] + h[1], 16);
    const b = parse(h[2] + h[2], 16);
    return { r, g, b, a: 1 };
  }
  if (h.length === 4) {
    const r = parse(h[0] + h[0], 16);
    const g = parse(h[1] + h[1], 16);
    const b = parse(h[2] + h[2], 16);
    const a = parse(h[3] + h[3], 16) / 255;
    return { r, g, b, a };
  }
  if (h.length === 6) {
    const r = parse(h.slice(0, 2), 16);
    const g = parse(h.slice(2, 4), 16);
    const b = parse(h.slice(4, 6), 16);
    return { r, g, b, a: 1 };
  }
  // 8
  const r = parse(h.slice(0, 2), 16);
  const g = parse(h.slice(2, 4), 16);
  const b = parse(h.slice(4, 6), 16);
  const a = parse(h.slice(6, 8), 16) / 255;
  return { r, g, b, a };
}

function composite(fg, bg) {
  // fg and bg are {r,g,b,a} with r,g,b in 0-255 and a 0-1
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const r = Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a);
  const g = Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a);
  const b = Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a);
  return { r, g, b, a };
}

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(a, b) {
  const L1 = luminance(a);
  const L2 = luminance(b);
  const light = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return (light + 0.05) / (dark + 0.05);
}

async function readThemeFiles() {
  const dirents = await fs.readdir(THEMES_DIR, { withFileTypes: true });
  return dirents
    .filter((d) => d.isFile() && d.name.endsWith('.css'))
    .map((d) => path.join(THEMES_DIR, d.name));
}

function extractJsonHolderVars(content) {
  // crude but effective: capture first .json-holder pre { ... } block
  const m = content.match(/\.json-holder\s*pre\s*{([\s\S]*?)}/);
  if (!m) return {};
  const block = m[1];
  const lines = block
    .split(/;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const vars = {};
  for (const line of lines) {
    const mm = line.match(/--([\w-]+)\s*:\s*([^;]+)$/);
    if (mm) {
      vars[`--${mm[1].trim()}`] = mm[2].trim();
    }
  }
  return vars;
}

function pickVar(vars, name) {
  return vars[name] ?? null;
}

async function run() {
  const files = await readThemeFiles();
  const failures = [];
  const fileContents = {};

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const relPath = path.relative(process.cwd(), file);
    const vars = extractJsonHolderVars(content);
    const baseBgRaw = pickVar(vars, '--json-bg') || pickVar(vars, '--bg') || '#000000ff';
    const baseBg = hexToRgba(baseBgRaw) || { r: 0, g: 0, b: 0, a: 1 };

    // find all fg tokens (keys ending with -fg)
    const fgKeys = Object.keys(vars).filter((k) => k.endsWith('-fg'));

    for (const fgKey of fgKeys) {
      const bgKey = fgKey.replace(/-fg$/, '-bg');
      const fgRaw = vars[fgKey];
      const bgRaw = vars[bgKey] ?? baseBgRaw;

      const fg = hexToRgba(fgRaw) || { r: 0, g: 0, b: 0, a: 1 };
      let bg = hexToRgba(bgRaw) || { r: 0, g: 0, b: 0, a: 1 };

      // If bg has alpha <1, composite it over baseBg
      if (bg.a < 1) {
        bg = composite(bg, baseBg);
      }

      // If fg has alpha <1, composite fg over bg
      let fgEffective = fg;
      if (fg.a < 1) {
        fgEffective = composite(fg, bg);
      }

      const ratio = contrastRatio(fgEffective, bg);
      const ok = ratio >= 4.5;
      // const relPath = path.relative(process.cwd(), file);
      if (!ok) {
        failures.push({
          file: relPath,
          token: fgKey,
          ratio: Number(ratio.toFixed(2)),
          threshold: 4.5,
        });
      }
      console.log(`${relPath} ${fgKey} vs ${bgKey} -> ${ratio.toFixed(2)} ${ok ? 'OK' : 'FAIL'}`);
    }
    fileContents[relPath] = content;
  }

  if (failures.length) {
    console.error('\nContrast check failed for the following tokens:');
    for (const f of failures) {
      console.error(` - ${f.file}: ${f.token} (ratio ${f.ratio} < ${f.threshold})`);
    }
    // Generate suggested fixes and create a patch file for review
    const suggestions = {};
    for (const f of failures) {
      const absPath = path.join(process.cwd(), f.file);
      const content = await fs.readFile(absPath, 'utf8');
      const vars = extractJsonHolderVars(content);
      const fgRaw = vars[f.token];
      const bgKey = f.token.replace(/-fg$/, '-bg');
      const baseBgRaw = vars['--json-bg'] || vars['--bg'] || '#000000ff';
      const bgRaw = vars[bgKey] || baseBgRaw;
      const fg = hexToRgba(fgRaw) || { r: 0, g: 0, b: 0, a: 1 };
      const bg = hexToRgba(bgRaw) || { r: 0, g: 0, b: 0, a: 1 };
      const baseBg = hexToRgba(baseBgRaw) || { r: 0, g: 0, b: 0, a: 1 };

      const suggestion = findAccessibleReplacement(fg, bg, baseBg, 4.5);
      if (suggestion) {
        if (!suggestions[f.file]) suggestions[f.file] = [];
        suggestions[f.file].push({ token: f.token, from: fgRaw, to: suggestion });
      }
    }

    const patchLines = [];
    for (const [file, changes] of Object.entries(suggestions)) {
      const orig =
        fileContents[file] || (await fs.readFile(path.join(process.cwd(), file), 'utf8'));
      let updated = orig;
      for (const ch of changes) {
        // replace the variable value in the .json-holder pre block
        const re = new RegExp(`(${ch.token.replace(/[-\\]/g, '\\$&')}\\s*:\\s*)([^;]+)(;?)`, 'i');
        updated = updated.replace(re, `$1${ch.to}; /* updated */`);
      }

      patchLines.push('*** Begin Patch');
      patchLines.push(`*** Update File: ${path.join(process.cwd(), file)}`);
      patchLines.push('@@');
      patchLines.push(orig);
      patchLines.push('@@');
      patchLines.push(updated);
      patchLines.push('*** End Patch');
    }

    if (patchLines.length) {
      // Instead of writing files, output suggestions and patch to the console
      console.error('\nSuggested changes (JSON):');
      console.error(JSON.stringify(suggestions, null, 2));
      console.error('\nSuggested patch (.patch format):');
      console.error(patchLines.join('\n'));
    }

    process.exitCode = 2;
  } else {
    console.log('\nAll theme contrast checks passed.');
  }
}

function clamp(v, a = 0, b = 1) {
  return Math.min(b, Math.max(a, v));
}

function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHex8({ r, g, b, a = 1 }) {
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(clamp(a) * 255))}`;
}

function findAccessibleReplacement(fg, bg, baseBg, threshold) {
  // fg/bg/baseBg {r,g,b,a}
  // composite bg over baseBg if bg is translucent
  const effectiveBg = bg.a < 1 ? composite(bg, baseBg) : bg;
  // composite fg over effectiveBg if fg is translucent
  const fgNoAlpha = fg.a < 1 ? composite(fg, effectiveBg) : fg;
  const current = contrastRatio(fgNoAlpha, effectiveBg);
  if (current >= threshold) return null;
  const hsl = rgbToHsl(fgNoAlpha);
  // try both directions, smaller delta preferred
  const tryAdjust = (dir) => {
    for (let i = 1; i <= 100; i++) {
      const delta = i / 100;
      const newL = clamp(hsl.l + dir * delta, 0, 1);
      const candidateRgb = hslToRgb({ h: hsl.h, s: hsl.s, l: newL });
      const candidate = { ...candidateRgb, a: fg.a };
      // if candidate has alpha <1 composite over effectiveBg
      const effective = candidate.a < 1 ? composite(candidate, effectiveBg) : candidate;
      const ratio = contrastRatio(effective, effectiveBg);
      if (ratio >= threshold) {
        return rgbToHex8(candidate);
      }
    }
    return null;
  };

  // determine whether to lighten or darken by comparing luminance
  const bgLum = luminance(bg);
  const fgLum = luminance(fgNoAlpha);
  const primaryDir = fgLum > bgLum ? 1 : -1; // if fg lighter, lighten further, else darken
  let res = tryAdjust(primaryDir);
  if (!res) res = tryAdjust(-primaryDir);
  return res;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
