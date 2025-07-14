// webpack.rules.js
module.exports = [
  {
    test: /\.js$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: { presets: ['@babel/preset-env'] }
    }
  },
  {
    test: /\.css$/i,
    use: ['style-loader', 'css-loader']
  }
];