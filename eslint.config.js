import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-undef': 'off', // TypeScript checks for undefined variables
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },
    {
        ignores: ['dist/', 'coverage/', 'node_modules/'],
    },
];
