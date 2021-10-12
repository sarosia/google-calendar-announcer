module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: ['google', 'prettier'],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'require-jsdoc': 0,
    'prettier/prettier': 'error',
  },
  parser: 'babel-eslint',
  plugins: ['prettier'],
};
