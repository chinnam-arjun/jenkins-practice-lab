const commonGlobals = {
  module: 'readonly',
  require: 'readonly'
}

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...commonGlobals,
        console: 'readonly',
        process: 'readonly'
      }
    },
    rules: {
      'array-callback-return': 'error',
      curly: ['error', 'all'],
      eqeqeq: 'error',
      'no-duplicate-imports': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      semi: ['error', 'never'],
      'prefer-const': 'error',
      quotes: ['error', 'single', { avoidEscape: true }]
    }
  }
]
