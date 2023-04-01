module.exports = {
  env: {
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    "plugin:jsx-a11y/recommended",
    'prettier'
  ],
  ignorePatterns: [
    'dist',
    'node_modules'
  ],
  overrides: [
    {
      files: [
        "*.ts",
        "*.tsx"
      ],
      rules: {
        "@typescript-eslint/explicit-module-boundary-types": [
          0
        ]
      }
    }
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: [
      './tsconfig.eslint.json',
      './apps/nodepen-client/tsconfig.json',
      './packages/core/tsconfig.json',
      './packages/nodes/tsconfig.json'
    ]
  },
  plugins: [
    '@typescript-eslint'
  ],
  root: true
}