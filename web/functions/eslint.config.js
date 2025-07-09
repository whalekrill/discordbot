const tseslint = require('typescript-eslint')
const js = require('@eslint/js')

module.exports = tseslint.config(
  {
    ignores: ['lib/**/*', 'eslint.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
)
