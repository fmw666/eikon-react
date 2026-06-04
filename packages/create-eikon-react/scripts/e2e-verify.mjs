// File-tree / package.json assertions for the create-eikon-react e2e
// harness (scripts/e2e.mjs). verifyScenario() takes a scaffolded project
// directory and a scenario's `expect` block and throws on the first
// mismatch. Split out of e2e.mjs so the orchestration flow stays compact;
// the assertion semantics are unchanged.

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function verifyScenario(projectDir, expect) {
  for (const rel of expect.filesPresent) {
    if (!existsSync(path.join(projectDir, rel))) {
      throw new Error(`expected file present: ${rel}`);
    }
  }
  for (const rel of expect.filesAbsent) {
    if (existsSync(path.join(projectDir, rel))) {
      throw new Error(`expected file absent: ${rel}`);
    }
  }
  // Same shape as filesAbsent — tucked behind a separate key only so
  // the existing scenario data stays unchanged. Use it for ad-hoc
  // absence checks that don't fit the platform/strip rules already
  // covered by `filesAbsent`.
  for (const rel of expect.filesAbsentExtra ?? []) {
    if (existsSync(path.join(projectDir, rel))) {
      throw new Error(`expected file absent (extra): ${rel}`);
    }
  }
  // UI primitives are tested separately so the assertions read
  // ergonomically alongside the `--ui` flag changes — the file paths
  // are all `src/shared/ui/<basename>.tsx` and the failure messages
  // pinpoint the snapshot delete/lay-down behaviour.
  for (const rel of expect.uiFilesPresent ?? []) {
    if (!existsSync(path.join(projectDir, rel))) {
      throw new Error(`expected UI file present: ${rel}`);
    }
  }

  const pkg = JSON.parse(
    await readFile(path.join(projectDir, 'package.json'), 'utf8')
  );
  const allDeps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };
  for (const dep of expect.depsPresent) {
    if (!(dep in allDeps)) {
      throw new Error(`expected dependency present: ${dep}`);
    }
  }
  for (const dep of expect.depsAbsent) {
    if (dep in allDeps) {
      throw new Error(`expected dependency absent: ${dep}`);
    }
  }

  const providers = await readFile(
    path.join(projectDir, 'src', 'app', 'providers.tsx'),
    'utf8'
  );
  for (const needle of expect.providersContains) {
    if (!providers.includes(needle)) {
      throw new Error(
        `expected providers.tsx to contain ${JSON.stringify(needle)}`
      );
    }
  }
  for (const needle of expect.providersAbsent) {
    if (providers.includes(needle)) {
      throw new Error(
        `expected providers.tsx to NOT contain ${JSON.stringify(needle)}`
      );
    }
  }

  if (expect.rootLayoutContains || expect.rootLayoutAbsent) {
    const root = await readFile(
      path.join(projectDir, 'src', 'app', 'layouts', 'RootLayout.tsx'),
      'utf8'
    );
    for (const needle of expect.rootLayoutContains ?? []) {
      if (!root.includes(needle)) {
        throw new Error(
          `expected RootLayout.tsx to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.rootLayoutAbsent ?? []) {
      if (root.includes(needle)) {
        throw new Error(
          `expected RootLayout.tsx to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  if (expect.stylesContains || expect.stylesAbsent) {
    const styles = await readFile(
      path.join(projectDir, 'src', 'styles', 'index.css'),
      'utf8'
    );
    for (const needle of expect.stylesContains ?? []) {
      if (!styles.includes(needle)) {
        throw new Error(
          `expected styles/index.css to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.stylesAbsent ?? []) {
      if (styles.includes(needle)) {
        throw new Error(
          `expected styles/index.css to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  // index.html is gated by `@eikon:variant(platform=…)` block markers —
  // mobile-only PWA meta tags must vanish on web/desktop scaffolds.
  if (expect.htmlContains || expect.htmlAbsent) {
    const html = await readFile(path.join(projectDir, 'index.html'), 'utf8');
    for (const needle of expect.htmlContains ?? []) {
      if (!html.includes(needle)) {
        throw new Error(
          `expected index.html to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.htmlAbsent ?? []) {
      if (html.includes(needle)) {
        throw new Error(
          `expected index.html to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  // vite.config.ts: the capacitor base branch is stripped on non-mobile
  // scaffolds, leaving the parameter destructure (`mode: _mode`) intact
  // so the unused-parameter lint stays quiet.
  if (expect.viteContains || expect.viteAbsent) {
    const vite = await readFile(
      path.join(projectDir, 'vite.config.ts'),
      'utf8'
    );
    for (const needle of expect.viteContains ?? []) {
      if (!vite.includes(needle)) {
        throw new Error(
          `expected vite.config.ts to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.viteAbsent ?? []) {
      if (vite.includes(needle)) {
        throw new Error(
          `expected vite.config.ts to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  if (expect.toasterContains || expect.toasterAbsent) {
    // Position assertions moved to providersContains / providersAbsent
    // when the variant-strip surface for `--toast-position` was lifted
    // into providers.tsx. Toaster.tsx is now a pure pass-through and
    // has no per-scenario fingerprint to assert.
    throw new Error(
      'expect.toasterContains/Absent are deprecated — use providersContains/Absent instead'
    );
  }

  if (expect.scriptsPresent || expect.scriptsAbsent) {
    const scripts = pkg.scripts ?? {};
    for (const name of expect.scriptsPresent ?? []) {
      if (!(name in scripts)) {
        throw new Error(`expected package.json script present: ${name}`);
      }
    }
    for (const name of expect.scriptsAbsent ?? []) {
      if (name in scripts) {
        throw new Error(`expected package.json script absent: ${name}`);
      }
    }
  }

  // PM-rewrite assertions. The CLI's rewrite-package-manager.js is what
  // wires `--pm npm|bun` through to `engines` / `packageManager` /
  // `scripts`; without these checks we'd silently regress to a project
  // that demands pnpm even when the user picked something else.
  if (expect.enginesEquals) {
    const actual = pkg.engines ?? {};
    const expected = expect.enginesEquals;
    const keysMatch =
      Object.keys(actual).length === Object.keys(expected).length &&
      Object.keys(expected).every((k) => actual[k] === expected[k]);
    if (!keysMatch) {
      throw new Error(
        `expected package.json engines to equal ${JSON.stringify(
          expected
        )} but got ${JSON.stringify(actual)}`
      );
    }
  }

  if (expect.packageManagerEquals !== undefined) {
    if (pkg.packageManager !== expect.packageManagerEquals) {
      throw new Error(
        `expected package.json packageManager=${JSON.stringify(
          expect.packageManagerEquals
        )} but got ${JSON.stringify(pkg.packageManager)}`
      );
    }
  }

  if (expect.scriptsContaining) {
    const scripts = pkg.scripts ?? {};
    for (const [name, needle] of Object.entries(expect.scriptsContaining)) {
      const cmd = scripts[name];
      if (typeof cmd !== 'string') {
        throw new Error(
          `expected package.json script ${name} to exist for scriptsContaining check`
        );
      }
      if (!cmd.includes(needle)) {
        throw new Error(
          `expected package.json scripts.${name} to contain ${JSON.stringify(
            needle
          )} but got ${JSON.stringify(cmd)}`
        );
      }
    }
  }

  if (expect.scriptsNotContaining) {
    const scripts = pkg.scripts ?? {};
    for (const [name, needle] of Object.entries(expect.scriptsNotContaining)) {
      const cmd = scripts[name];
      if (typeof cmd !== 'string') continue;
      if (cmd.includes(needle)) {
        throw new Error(
          `expected package.json scripts.${name} to NOT contain ${JSON.stringify(
            needle
          )} but got ${JSON.stringify(cmd)}`
        );
      }
    }
  }

  if (expect.tauriConfContains || expect.tauriConfAbsent) {
    const conf = await readFile(
      path.join(projectDir, 'apps', 'desktop', 'src-tauri', 'tauri.conf.json'),
      'utf8'
    );
    for (const needle of expect.tauriConfContains ?? []) {
      if (!conf.includes(needle)) {
        throw new Error(
          `expected tauri.conf.json to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.tauriConfAbsent ?? []) {
      if (conf.includes(needle)) {
        throw new Error(
          `expected tauri.conf.json to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  if (expect.cargoTomlContains || expect.cargoTomlAbsent) {
    const cargoToml = await readFile(
      path.join(projectDir, 'apps', 'desktop', 'src-tauri', 'Cargo.toml'),
      'utf8'
    );
    for (const needle of expect.cargoTomlContains ?? []) {
      if (!cargoToml.includes(needle)) {
        throw new Error(
          `expected Cargo.toml to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.cargoTomlAbsent ?? []) {
      if (cargoToml.includes(needle)) {
        throw new Error(
          `expected Cargo.toml to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }

  if (expect.capacitorConfContains || expect.capacitorConfAbsent) {
    const conf = await readFile(
      path.join(projectDir, 'apps', 'mobile', 'capacitor.config.ts'),
      'utf8'
    );
    for (const needle of expect.capacitorConfContains ?? []) {
      if (!conf.includes(needle)) {
        throw new Error(
          `expected capacitor.config.ts to contain ${JSON.stringify(needle)}`
        );
      }
    }
    for (const needle of expect.capacitorConfAbsent ?? []) {
      if (conf.includes(needle)) {
        throw new Error(
          `expected capacitor.config.ts to NOT contain ${JSON.stringify(needle)}`
        );
      }
    }
  }
}
