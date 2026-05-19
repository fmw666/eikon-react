import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      '.vite',
      // On-demand build cache produced by packages/preview-site (see
      // packages/preview-site/server/builder.ts). Contents are stripped
      // copies of src/ and will routinely violate import/order etc.
      '.preview-cache',
    ],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactPlugin.configs.flat.recommended,
      reactPlugin.configs.flat['jsx-runtime'],
      prettier,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: '19.0' },
      'import/resolver': {
        typescript: { project: './tsconfig.app.json' },
        node: true,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/prop-types': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Source files follow the v1 banner-comment style with three
      // sub-sections inside the external group (Core / Core-related /
      // Third-party). `always-and-inside-groups` keeps the top-level
      // builtin→external→internal→relative ordering AND tolerates
      // blank lines + custom ordering inside each group so the banners
      // stay legible. Alphabetisation is intentionally NOT enforced
      // here for the same reason.
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          'newlines-between': 'always-and-inside-groups',
          pathGroups: [
            { pattern: '@/**', group: 'internal', position: 'before' },
            { pattern: '@test/**', group: 'internal', position: 'before' },
          ],
        },
      ],
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/features/*/!(index.ts|routes.tsx)',
              from: './src/features/*/!(index.ts|routes.tsx)',
              except: ['./src/features/$1/**'],
              message:
                'Cross-feature imports must go through the feature index.ts barrel.',
            },
            {
              target: './src/shared',
              from: './src/features',
              message: 'shared/ must not depend on features/.',
            },
            {
              target: './src/app',
              from: './src/features/*/!(index.ts|routes.tsx)',
              message:
                'app/ may only import a feature via its public index.ts/routes.tsx.',
            },
          ],
        },
      ],
    },
  }
);
