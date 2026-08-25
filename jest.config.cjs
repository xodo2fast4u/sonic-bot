import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'test-results/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      quotes: 'off',
      semi: 'off',
      indent: 'off',
      'comma-dangle': 'off',
      'max-len': 'off',

      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-control-regex': 'off',
    },
  },
  {
    files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        testUtils: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.cjs', 'lint-staged.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        module: 'writable',
        require: 'readonly',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  {
    files: ['src/utils/logger.js', 'src/utils/enhanced-logger.js'],
    rules: {
      'no-console': 'off',
    },
  },
];
