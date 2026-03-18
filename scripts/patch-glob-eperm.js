/**
 * Patches Next.js bundled glob to treat EPERM and EACCES as non-fatal errors
 * on Windows. Windows has junction points (legacy symlinks) and Store app
 * reparse points that throw EPERM/EACCES when scanned. This is harmless but
 * crashes `next build` on projects living on non-C: drives.
 *
 * Run: node scripts/patch-glob-eperm.js
 */
const fs = require('fs');
const path = require('path');

const GLOB_PATH = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'compiled', 'glob', 'glob.js');

if (!fs.existsSync(GLOB_PATH)) {
  console.log('glob.js not found — skipping patch');
  process.exit(0);
}

let src = fs.readFileSync(GLOB_PATH, 'utf8');

let patched = false;

// Match the ENOENT/ELOOP/ENAMETOOLONG/UNKNOWN case block (with possible prior patches)
// and ensure both EPERM and EACCES are included
const pattern = /case"ENOENT":case"ELOOP":case"ENAMETOOLONG":case"UNKNOWN":((?:case"EPERM":)?(?:case"EACCES":)?)this\.cache/g;

src = src.replace(pattern, (match) => {
  if (match.includes('"EPERM"') && match.includes('"EACCES"')) {
    return match; // already fully patched
  }
  patched = true;
  return 'case"ENOENT":case"ELOOP":case"ENAMETOOLONG":case"UNKNOWN":case"EPERM":case"EACCES":this.cache';
});

if (patched) {
  fs.writeFileSync(GLOB_PATH, src, 'utf8');
  console.log('Patched glob.js — EPERM/EACCES errors are now non-fatal');
} else {
  console.log('glob.js already patched');
}
