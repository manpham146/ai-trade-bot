module.exports = {
    env: {
        browser: false,
        commonjs: true,
        es6: true,
        node: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
        // '@typescript-eslint/recommended' // Temporarily disabled
    ],
    parser: '@typescript-eslint/parser',
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json'
    },
    plugins: [
        '@typescript-eslint'
    ],
    rules: {
        // Possible Errors
        'no-console': 'off', // Cho phép console.log trong trading bot
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
        'no-undef': 'error',
        
        // Best Practices
        'curly': ['error', 'all'],
        'eqeqeq': ['error', 'always'],
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-return-assign': 'error',
        'no-self-compare': 'error',
        'no-throw-literal': 'error',
        'no-useless-call': 'error',
        'no-useless-return': 'error',
        
        // Variables
        'no-delete-var': 'error',
        'no-shadow': 'warn',
        'no-shadow-restricted-names': 'error',
        'no-use-before-define': ['error', { 'functions': false }],
        
        // Stylistic Issues
        'array-bracket-spacing': ['error', 'never'],
        'block-spacing': ['error', 'always'],
        'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
        'comma-dangle': ['error', 'never'],
        'comma-spacing': ['error', { 'before': false, 'after': true }],
        'comma-style': ['error', 'last'],
        'computed-property-spacing': ['error', 'never'],
        'eol-last': ['error', 'always'],
        'func-call-spacing': ['error', 'never'],
        'indent': ['error', 4, { 'SwitchCase': 1 }],
        'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
        'keyword-spacing': ['error', { 'before': true, 'after': true }],
        'linebreak-style': ['error', 'unix'],
        'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],
        'no-trailing-spaces': 'error',
        'object-curly-spacing': ['error', 'always'],
        'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
        'semi': ['error', 'always'],
        'semi-spacing': ['error', { 'before': false, 'after': true }],
        'space-before-blocks': ['error', 'always'],
        'space-before-function-paren': ['error', 'never'],
        'space-in-parens': ['error', 'never'],
        'space-infix-ops': 'error',
        'space-unary-ops': ['error', { 'words': true, 'nonwords': false }],
        
        // ES6
        'arrow-spacing': ['error', { 'before': true, 'after': true }],
        'constructor-super': 'error',
        'no-class-assign': 'error',
        'no-const-assign': 'error',
        'no-dupe-class-members': 'error',
        'no-duplicate-imports': 'error',
        'no-new-symbol': 'error',
        'no-this-before-super': 'error',
        'no-useless-computed-key': 'error',
        'no-useless-constructor': 'error',
        'no-useless-rename': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'prefer-template': 'error',
        'rest-spread-spacing': ['error', 'never'],
        'template-curly-spacing': ['error', 'never'],
        
        // TypeScript specific rules
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-inferrable-types': 'off'
    },
    overrides: [
        {
            files: ['**/*.test.js', '**/*.spec.js'],
            env: {
                jest: true
            },
            rules: {
                'no-unused-expressions': 'off'
            }
        }
    ]
};