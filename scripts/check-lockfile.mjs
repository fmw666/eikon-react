// Lockfile integrity guard for pnpm-lock.yaml.
//
// pnpm-lock.yaml does NOT embed tarball URLs the way npm/yarn lockfiles do —
// every package entry carries `resolution: {integrity: sha512-...}` and pnpm
// rebuilds the URL from the configured registry at install time. So URL-host
// validation (lockfile-lint's headline feature) is not meaningful here.
//
// What IS meaningful: every package must carry an integrity hash. A missing
// integrity (e.g. a `tarball:` URL pointing somewhere off-registry, or a git
// dependency snuck into a transitive) is a real tamper-vector, and is what
// this script catches.
//
// Exits non-zero on the first missing integrity it finds.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const LOCK = path.join(REPO_ROOT, 'pnpm-lock.yaml');

const text = fs.readFileSync(LOCK, 'utf8');
const lines = text.split(/\r?\n/);

const failures = [];
let inPackages = false;
let currentKey = null;
let sawIntegrity = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^packages:\s*$/.test(line)) {
    inPackages = true;
    continue;
  }
  if (!inPackages) continue;
  if (/^\S/.test(line) && line.trim()) {
    if (currentKey && !sawIntegrity) {
      failures.push(currentKey);
    }
    break;
  }
  const keyMatch = line.match(/^ {2}(['"]?)(\S.*?)\1:\s*$/);
  if (keyMatch) {
    if (currentKey && !sawIntegrity) failures.push(currentKey);
    currentKey = keyMatch[2];
    sawIntegrity = false;
    continue;
  }
  if (/integrity:\s*sha\d+-/.test(line)) sawIntegrity = true;
  if (/tarball:\s*https?:\/\//.test(line)) {
    failures.push(`${currentKey} (uses tarball URL)`);
  }
}
if (currentKey && !sawIntegrity) failures.push(currentKey);

if (failures.length) {
  console.error(`[check-lockfile] ${failures.length} package entries are missing integrity:`);
  for (const f of failures.slice(0, 20)) console.error(`  - ${f}`);
  if (failures.length > 20) console.error(`  ... and ${failures.length - 20} more`);
  process.exit(1);
}

console.log('[check-lockfile] ok — every pnpm-lock.yaml package entry has integrity');
