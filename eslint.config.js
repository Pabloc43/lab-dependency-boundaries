import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
export default tseslint.config(
  { ignores: ['dist/**', 'public/**', 'node_modules/**', 'fixtures/**'] },
  js.configs.recommended,
  { rules: { curly: ['error', 'all'] } },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks, 'react-refresh': refresh },
    rules: {
      ...hooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.js', '*.cjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', module: 'readonly' },
    },
  },
);
