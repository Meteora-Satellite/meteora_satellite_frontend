import eslint from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import importX from 'eslint-plugin-import-x';
import vuePlugin from 'eslint-plugin-vue';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';


export default [
  // Base configuration for all JavaScript/Vue files
  {
    globals: {
      RequestInit: true,
    },
    files: ['**/*.{js,cjs,mjs,ts}'],
    plugins: {
      'import-x': importX,
    },
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Core ESLint recommended rules
      ...eslint.configs.recommended.rules,

      // Code style and formatting
      indent: ['error', 2, { SwitchCase: 1 }],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'always-multiline',
        },
      ],
      'comma-spacing': ['error', { before: false, after: true }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always',
        },
      ],
      'keyword-spacing': ['error', { before: true, after: true }],
      'arrow-spacing': ['error', { before: true, after: true }],
      'space-in-parens': ['error', 'never'],
      'space-before-blocks': 'error',
      'space-infix-ops': 'error',
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],

      // Console and debugging rules
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',

      // Import organization
      'import-x/order': [
        'warn',
        {
          groups: [
            ['builtin', 'external'],
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import-x/no-duplicates': 'warn',

    },
    settings: {
      'import-x/resolver': {
        node: true,
      },
    },
  },

  // Vue file specific configuration
  {
    files: ['**/*.vue'],
    plugins: { vue: vuePlugin, 'import-x': importX },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        // This tells vue-eslint-parser to use TS for <script> blocks
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
    },
    rules: {
      'max-len': 'off', // Disable base rule for Vue files
      'vue/max-len': [
        'warn',
        {
          code: 120,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
          ignoreHTMLAttributeValues: true,
          ignoreHTMLTextContents: true,
        },
      ],
      'vue/no-mutating-props': 'error',
      'vue/no-multiple-template-root': 'off', // Vue 3 allows multiple roots
      'vue/no-v-model-argument': 'off', // Vue 3 supports v-model arguments
      'vue/require-v-for-key': 'error',
      'vue/require-valid-default-prop': 'error',
      'vue/no-use-v-if-with-v-for': 'error',
      'vue/require-default-prop': 'error',
      'vue/require-prop-types': 'error',

      'vue/block-order': [
        'error',
        {
          order: ['script[setup]', 'template', 'script:not([setup])', 'style'],
        },
      ],

      // Vue specific customizations
      'vue/multi-word-component-names': 'off',
      'vue/html-indent': ['error', 2],

      'vue/html-self-closing': ['error', {
        'html': {
          'void': 'always',
          'normal': 'always',
          'component': 'always',
        },
        'svg': 'always',
        'math': 'always',
      }],

      'vue/html-closing-bracket-newline': ['error', {
        'singleline': 'never',
        'multiline': 'always',
      }],

      'vue/max-attributes-per-line': [
        'error',
        {
          singleline: { max: 3 },
          multiline: { max: 1 },
        },
      ],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],

      'vue/first-attribute-linebreak': ['error', {
        'singleline': 'ignore',
        'multiline': 'below',
      }],

      'vue/attributes-order': ['error'],
    },
  },

  // Configuration files
  {
    files: ['*.config.{js,mjs}', 'vite.config.{js,mjs}', 'vitest.config.{js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

];
