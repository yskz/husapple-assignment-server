import js from '@eslint/js';
import node from 'eslint-plugin-n';

export default [
    {
        files: ['**/*.js', '**/*.cjs'],
        ignores: ['node_modules/**', 'build/**'],
    },
    // eslint:recommended を再現
    js.configs.recommended,
    // eslint-plugin-node の recommended を再現
    node.configs['flat/recommended-module'],
    {
        name: 'number-auction-game-server',
        files: ['**/*.js', '**/*.cjs'],
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            // eslint-plugin-node で指定していたルールを eslint-plugin-n として再現
            'n/file-extension-in-import': ['error', 'always'],
            'n/prefer-global/buffer': ['error', 'always'],
            'n/prefer-global/console': ['error', 'always'],
            'n/prefer-global/process': ['error', 'always'],
            'n/prefer-global/url-search-params': ['error', 'always'],
            'n/prefer-global/url': ['error', 'always'],
            'n/prefer-promises/dns': 'error',
            'n/prefer-promises/fs': 'error',
        },
    },
    // webpack 設定ファイルは CommonJS (.cjs) として扱う
    {
        files: ['webpack/**/*.cjs'],
        languageOptions: {
            sourceType: 'commonjs',
        },
    },
];
