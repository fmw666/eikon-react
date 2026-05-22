/**
 * Map a filename (or folder name) to an iconify icon id from the
 * `vscode-icons` collection. Icons load lazily from the Iconify API on
 * first render and are persisted to localStorage by `@iconify/react`, so
 * the second time you see a TypeScript file the icon is instant.
 *
 * To stay legible we prefer well-known full-name matches first (so
 * `package.json` shows npm + `pnpm-lock.yaml` shows pnpm), then fall back
 * to the file extension. Everything unrecognised renders as the default
 * file icon.
 */

const FOLDER_DEFAULT = 'vscode-icons:default-folder';
const FOLDER_DEFAULT_OPEN = 'vscode-icons:default-folder-opened';
const FILE_DEFAULT = 'vscode-icons:default-file';

const FOLDER_NAME_MAP: Record<string, [string, string]> = {
  src: ['vscode-icons:folder-type-src', 'vscode-icons:folder-type-src-opened'],
  public: [
    'vscode-icons:folder-type-public',
    'vscode-icons:folder-type-public-opened',
  ],
  scripts: [
    'vscode-icons:folder-type-script',
    'vscode-icons:folder-type-script-opened',
  ],
  test: [
    'vscode-icons:folder-type-test',
    'vscode-icons:folder-type-test-opened',
  ],
  tests: [
    'vscode-icons:folder-type-test',
    'vscode-icons:folder-type-test-opened',
  ],
  __tests__: [
    'vscode-icons:folder-type-test',
    'vscode-icons:folder-type-test-opened',
  ],
  app: ['vscode-icons:folder-type-app', 'vscode-icons:folder-type-app-opened'],
  components: [
    'vscode-icons:folder-type-component',
    'vscode-icons:folder-type-component-opened',
  ],
  shared: [
    'vscode-icons:folder-type-shared',
    'vscode-icons:folder-type-shared-opened',
  ],
  features: [
    'vscode-icons:folder-type-module',
    'vscode-icons:folder-type-module-opened',
  ],
  hooks: [
    'vscode-icons:folder-type-hook',
    'vscode-icons:folder-type-hook-opened',
  ],
  utils: [
    'vscode-icons:folder-type-tools',
    'vscode-icons:folder-type-tools-opened',
  ],
  lib: ['vscode-icons:folder-type-library', 'vscode-icons:folder-type-library-opened'],
  routes: [
    'vscode-icons:folder-type-route',
    'vscode-icons:folder-type-route-opened',
  ],
  styles: [
    'vscode-icons:folder-type-css',
    'vscode-icons:folder-type-css-opened',
  ],
  assets: [
    'vscode-icons:folder-type-asset',
    'vscode-icons:folder-type-asset-opened',
  ],
  docs: [
    'vscode-icons:folder-type-docs',
    'vscode-icons:folder-type-docs-opened',
  ],
  '.agent': [
    'vscode-icons:folder-type-config',
    'vscode-icons:folder-type-config-opened',
  ],
  '.github': [
    'vscode-icons:folder-type-github',
    'vscode-icons:folder-type-github-opened',
  ],
  '.vscode': [
    'vscode-icons:folder-type-vscode',
    'vscode-icons:folder-type-vscode-opened',
  ],
};

const FILE_NAME_MAP: Record<string, string> = {
  'package.json': 'vscode-icons:file-type-node',
  'package-lock.json': 'vscode-icons:file-type-npm',
  'pnpm-lock.yaml': 'vscode-icons:file-type-light-pnpm',
  'pnpm-workspace.yaml': 'vscode-icons:file-type-light-pnpm',
  '.npmrc': 'vscode-icons:file-type-npm',
  '.gitignore': 'vscode-icons:file-type-git',
  '.gitattributes': 'vscode-icons:file-type-git',
  '.editorconfig': 'vscode-icons:file-type-editorconfig',
  '.env': 'vscode-icons:file-type-dotenv',
  '.env.example': 'vscode-icons:file-type-dotenv',
  '.env.local': 'vscode-icons:file-type-dotenv',
  '.prettierrc': 'vscode-icons:file-type-light-prettier',
  '.prettierrc.json': 'vscode-icons:file-type-light-prettier',
  'prettier.config.js': 'vscode-icons:file-type-light-prettier',
  'eslint.config.js': 'vscode-icons:file-type-eslint',
  'eslint.config.ts': 'vscode-icons:file-type-eslint',
  '.eslintrc': 'vscode-icons:file-type-eslint',
  '.eslintrc.json': 'vscode-icons:file-type-eslint',
  'vite.config.ts': 'vscode-icons:file-type-vite',
  'vite.config.js': 'vscode-icons:file-type-vite',
  'vitest.config.ts': 'vscode-icons:file-type-vitest',
  'vitest.config.js': 'vscode-icons:file-type-vitest',
  'tailwind.config.ts': 'vscode-icons:file-type-tailwind',
  'tailwind.config.js': 'vscode-icons:file-type-tailwind',
  'tsconfig.json': 'vscode-icons:file-type-tsconfig',
  'tsconfig.app.json': 'vscode-icons:file-type-tsconfig',
  'tsconfig.node.json': 'vscode-icons:file-type-tsconfig',
  'tsconfig.base.json': 'vscode-icons:file-type-tsconfig',
  'tsup.config.ts': 'vscode-icons:file-type-light-config',
  LICENSE: 'vscode-icons:file-type-license',
  'LICENSE.md': 'vscode-icons:file-type-license',
  'README.md': 'vscode-icons:file-type-info',
  'CHANGELOG.md': 'vscode-icons:file-type-changelog',
  Dockerfile: 'vscode-icons:file-type-docker',
};

const EXT_MAP: Record<string, string> = {
  '.ts': 'vscode-icons:file-type-typescript',
  '.tsx': 'vscode-icons:file-type-reactts',
  '.js': 'vscode-icons:file-type-js',
  '.mjs': 'vscode-icons:file-type-js',
  '.cjs': 'vscode-icons:file-type-js',
  '.jsx': 'vscode-icons:file-type-reactjs',
  '.json': 'vscode-icons:file-type-json',
  '.json5': 'vscode-icons:file-type-json',
  '.jsonc': 'vscode-icons:file-type-json',
  '.css': 'vscode-icons:file-type-css',
  '.scss': 'vscode-icons:file-type-scss',
  '.sass': 'vscode-icons:file-type-sass',
  '.less': 'vscode-icons:file-type-less',
  '.html': 'vscode-icons:file-type-html',
  '.htm': 'vscode-icons:file-type-html',
  '.md': 'vscode-icons:file-type-markdown',
  '.mdx': 'vscode-icons:file-type-mdx',
  '.yaml': 'vscode-icons:file-type-light-yaml',
  '.yml': 'vscode-icons:file-type-light-yaml',
  '.toml': 'vscode-icons:file-type-toml',
  '.svg': 'vscode-icons:file-type-svg',
  '.png': 'vscode-icons:file-type-image',
  '.jpg': 'vscode-icons:file-type-image',
  '.jpeg': 'vscode-icons:file-type-image',
  '.gif': 'vscode-icons:file-type-image',
  '.webp': 'vscode-icons:file-type-image',
  '.ico': 'vscode-icons:file-type-favicon',
  '.txt': 'vscode-icons:file-type-text',
  '.sh': 'vscode-icons:file-type-shell',
  '.bash': 'vscode-icons:file-type-shell',
  '.zsh': 'vscode-icons:file-type-shell',
  '.mts': 'vscode-icons:file-type-typescript',
  '.cts': 'vscode-icons:file-type-typescript',
  '.d.ts': 'vscode-icons:file-type-typescriptdef',
};

export function getFolderIcon(name: string, isOpen: boolean): string {
  const pair = FOLDER_NAME_MAP[name];
  if (pair) return pair[isOpen ? 1 : 0];
  return isOpen ? FOLDER_DEFAULT_OPEN : FOLDER_DEFAULT;
}

export function getFileIcon(name: string): string {
  if (FILE_NAME_MAP[name]) return FILE_NAME_MAP[name]!;
  // Handle compound extensions like `.d.ts` before falling back to single
  // extension matching, otherwise `.d.ts` would resolve to plain ts.
  if (name.toLowerCase().endsWith('.d.ts')) return EXT_MAP['.d.ts']!;
  const dot = name.lastIndexOf('.');
  if (dot >= 0) {
    const ext = name.slice(dot).toLowerCase();
    if (EXT_MAP[ext]) return EXT_MAP[ext]!;
  }
  return FILE_DEFAULT;
}
