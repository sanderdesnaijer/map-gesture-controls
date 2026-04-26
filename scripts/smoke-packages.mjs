#!/usr/bin/env node

/**
 * Smoke test for all publishable packages.
 *
 * Validates that every package:
 *   1. Has a built dist/index.js that can be dynamically imported
 *   2. Exposes the expected public exports
 *   3. Has package.json fields (main, module, types, exports) pointing to real files
 *   4. Produces a tarball containing only allowed files (no repo-only code leaks)
 *
 * To add a new map adapter (e.g. Leaflet), append one entry to `packages` below.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Package registry -- add new adapters here
// ---------------------------------------------------------------------------

const packages = [
  {
    name: '@map-gesture-controls/core',
    dir: 'packages/map-gesture-core',
    expectedExports: [
      'GestureController',
      'GestureStateMachine',
      'WebcamOverlay',
      'classifyGesture',
      'createHandClassifier',
      'getHandSize',
      'getTwoHandDistance',
      'DEFAULT_WEBCAM_CONFIG',
      'DEFAULT_TUNING_CONFIG',
      'LANDMARKS',
      'COLORS',
    ],
    // Every file in the tarball must match at least one of these prefixes/paths
    allowedPaths: ['dist/'],
  },
  {
    name: '@map-gesture-controls/ol',
    dir: 'packages/ol-gesture-controls',
    expectedExports: [
      'GestureMapController',
      'OpenLayersGestureInteraction',
      // Re-exports from core
      'GestureController',
      'GestureStateMachine',
      'WebcamOverlay',
      'classifyGesture',
      'getHandSize',
      'getTwoHandDistance',
      'DEFAULT_WEBCAM_CONFIG',
      'DEFAULT_TUNING_CONFIG',
      'LANDMARKS',
      'COLORS',
    ],
    allowedPaths: ['dist/'],
  },
  {
    name: '@map-gesture-controls/google-maps',
    dir: 'packages/google-maps-gesture-controls',
    expectedExports: [
      'GestureMapController',
      'GoogleMapsGestureInteraction',
      // Re-exports from core
      'GestureController',
      'GestureStateMachine',
      'WebcamOverlay',
      'classifyGesture',
      'createHandClassifier',
      'getHandSize',
      'getTwoHandDistance',
      'DEFAULT_WEBCAM_CONFIG',
      'DEFAULT_TUNING_CONFIG',
      'LANDMARKS',
      'COLORS',
    ],
    allowedPaths: ['dist/'],
  },
  {
    name: '@map-gesture-controls/leaflet',
    dir: 'packages/leaflet-gesture-controls',
    expectedExports: [
      'GestureMapController',
      'LeafletGestureInteraction',
      // Re-exports from core
      'GestureController',
      'GestureStateMachine',
      'WebcamOverlay',
      'classifyGesture',
      'createHandClassifier',
      'getHandSize',
      'getTwoHandDistance',
      'DEFAULT_WEBCAM_CONFIG',
      'DEFAULT_TUNING_CONFIG',
      'LANDMARKS',
      'COLORS',
    ],
    allowedPaths: ['dist/'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let failures = 0;

function pass(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function fail(msg) {
  console.error(`  \x1b[31m✗\x1b[0m ${msg}`);
  failures++;
}

function isAllowed(filePath, allowedPaths) {
  return allowedPaths.some(
    (prefix) =>
      filePath === prefix || filePath.startsWith(prefix),
  );
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/**
 * 1. Verify package.json fields point to files that exist on disk.
 */
function checkPackageJsonPaths(pkgDir, pkgJson) {
  const fields = ['main', 'module', 'types'];
  for (const field of fields) {
    if (!pkgJson[field]) continue;
    const target = resolve(pkgDir, pkgJson[field]);
    if (existsSync(target)) {
      pass(`${field} -> ${pkgJson[field]}`);
    } else {
      fail(`${field} -> ${pkgJson[field]} does not exist`);
    }
  }

  // Check conditional exports
  if (pkgJson.exports) {
    for (const [key, value] of Object.entries(pkgJson.exports)) {
      const paths =
        typeof value === 'string'
          ? { default: value }
          : value;
      for (const [condition, target] of Object.entries(paths)) {
        if (typeof target !== 'string') continue;
        const abs = resolve(pkgDir, target);
        if (existsSync(abs)) {
          pass(`exports["${key}"].${condition} -> ${target}`);
        } else {
          fail(`exports["${key}"].${condition} -> ${target} does not exist`);
        }
      }
    }
  }
}

/**
 * 2. Dynamic import succeeds and expected exports are present.
 */
async function checkExports(pkgDir, pkgJson, expectedExports) {
  const entryPoint = resolve(pkgDir, pkgJson.main || 'dist/index.js');
  let mod;
  try {
    mod = await import(entryPoint);
    pass(`import("${pkgJson.main || 'dist/index.js'}") succeeded`);
  } catch (err) {
    fail(`import("${pkgJson.main || 'dist/index.js'}") threw: ${err.message}`);
    return;
  }

  for (const name of expectedExports) {
    if (name in mod) {
      pass(`export "${name}" exists`);
    } else {
      fail(`export "${name}" is missing`);
    }
  }

  // Warn about unexpected exports (not a failure, just informational)
  const actual = Object.keys(mod).filter((k) => !k.startsWith('__'));
  const unexpected = actual.filter((k) => !expectedExports.includes(k));
  if (unexpected.length > 0) {
    console.log(
      `  \x1b[33m!\x1b[0m undocumented exports: ${unexpected.join(', ')}`,
    );
  }
}

/**
 * 3. Tarball contains only allowed files (no repo-only code leaks).
 */
function checkTarballContents(pkg) {
  const pkgDir = resolve(ROOT, pkg.dir);
  let output;
  try {
    output = execSync('npm pack --dry-run --json 2>/dev/null', {
      cwd: pkgDir,
      encoding: 'utf-8',
    });
  } catch (err) {
    fail(`npm pack --dry-run failed: ${err.message}`);
    return;
  }

  let packInfo;
  try {
    packInfo = JSON.parse(output);
  } catch {
    fail('npm pack --dry-run returned invalid JSON');
    return;
  }

  const entries = Array.isArray(packInfo) ? packInfo[0] : packInfo;
  const files = (entries.files || []).map((f) => f.path);

  // package.json and README.md are always included by npm, so allow them implicitly
  const filesToCheck = files.filter(
    (f) => f !== 'package.json' && !f.match(/^readme\.md$/i),
  );

  let disallowed = [];
  for (const file of filesToCheck) {
    if (!isAllowed(file, pkg.allowedPaths)) {
      disallowed.push(file);
    }
  }

  if (disallowed.length === 0) {
    pass(`tarball contains only allowed files (${files.length} files)`);
  } else {
    fail(`tarball contains disallowed files: ${disallowed.join(', ')}`);
  }

  // Check that essential files are present
  const requiredFiles = ['package.json', 'dist/index.js', 'dist/index.d.ts'];
  for (const req of requiredFiles) {
    if (files.includes(req)) {
      pass(`tarball includes required ${req}`);
    } else {
      fail(`tarball is missing required ${req}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\nSmoke-testing packages...\n');

  for (const pkg of packages) {
    console.log(`\x1b[1m${pkg.name}\x1b[0m (${pkg.dir})`);

    const pkgDir = resolve(ROOT, pkg.dir);
    const pkgJsonPath = join(pkgDir, 'package.json');

    if (!existsSync(pkgJsonPath)) {
      fail(`package.json not found at ${pkg.dir}`);
      console.log();
      continue;
    }

    const { default: pkgJson } = await import(pkgJsonPath, {
      with: { type: 'json' },
    });

    // 1. Package.json paths resolve
    checkPackageJsonPaths(pkgDir, pkgJson);

    // 2. Imports and exports
    await checkExports(pkgDir, pkgJson, pkg.expectedExports);

    // 3. Tarball allowlist
    checkTarballContents(pkg);

    console.log();
  }

  // Summary
  if (failures > 0) {
    console.error(`\x1b[31m${failures} check(s) failed.\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log('\x1b[32mAll smoke checks passed.\x1b[0m\n');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
