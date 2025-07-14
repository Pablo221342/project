// webpack.main.config.js
const rules = require('./webpack.rules');
module.exports = {
  target: 'electron-main',
  entry: './src/main.js',
  module: { rules },
  resolve: { extensions: ['.js'] },
  externals: {
    'better-sqlite3': 'commonjs2 better-sqlite3',
    electron: 'commonjs2 electron'
  }
};