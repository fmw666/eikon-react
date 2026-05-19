/**
 * Validate that a string is a usable npm package name.
 * Mirrors validate-npm-package-name's core constraints without the dep.
 */
export function isValidPackageName(name: string): boolean {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}

/**
 * Best-effort normalization of an arbitrary string into a valid npm name.
 */
export function toValidPackageName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~._]/g, '-')
    .replace(/^-+|-+$/g, '');
}
