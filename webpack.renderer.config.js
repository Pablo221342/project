// webpack.renderer.config.js
const rules = require('./webpack.rules');
module.exports = {
  target: 'electron-renderer',
  entry: './src/renderer.js',
  module: { rules },
  resolve: { extensions: ['.js', '.css'] },
  externals: { electron: 'commonjs2 electron' }
};