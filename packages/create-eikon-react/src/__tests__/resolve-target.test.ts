import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveProjectTarget } from '../resolve-target.js';

describe('resolveProjectTarget', () => {
  it('treats "." as "scaffold into the current directory"', () => {
    const cwd = path.resolve('/tmp/my-cool-app');
    const result = resolveProjectTarget('.', cwd);
    expect(result.targetDir).toBe(cwd);
    expect(result.projectName).toBe('my-cool-app');
  });

  it('treats "./" the same as "."', () => {
    const cwd = path.resolve('/tmp/my-cool-app');
    const result = resolveProjectTarget('./', cwd);
    expect(result.targetDir).toBe(cwd);
    expect(result.projectName).toBe('my-cool-app');
  });

  it('normalizes a cwd basename that is not a valid npm package name', () => {
    const cwd = path.resolve('/tmp/Eikon-React');
    const result = resolveProjectTarget('.', cwd);
    expect(result.targetDir).toBe(cwd);
    expect(result.projectName).toBe('eikon-react');
  });

  it('falls back to "app" when the cwd basename normalizes to empty', () => {
    const cwd = path.resolve('/tmp/_');
    const result = resolveProjectTarget('.', cwd);
    expect(result.targetDir).toBe(cwd);
    expect(result.projectName).toBe('app');
  });

  it('resolves a named target to a sibling directory under cwd', () => {
    const cwd = path.resolve('/tmp/parent');
    const result = resolveProjectTarget('my-app', cwd);
    expect(result.targetDir).toBe(path.join(cwd, 'my-app'));
    expect(result.projectName).toBe('my-app');
  });

  it('treats an absolute path equal to cwd as the cwd shortcut', () => {
    const cwd = path.resolve('/tmp/here');
    const result = resolveProjectTarget(cwd, cwd);
    expect(result.targetDir).toBe(cwd);
    expect(result.projectName).toBe('here');
  });
});
