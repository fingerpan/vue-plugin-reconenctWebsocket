const path = require('path')
const webpack = require('webpack')
// const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {

  devtool: 'inline-source-map',

  entry: {
    app: ['./client.js', './main/main.js']
  },
  output: {
    path: path.join(__dirname, '__build__'),
    filename: 'main.js',
    publicPath: '/__build__/'
  },

  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' },
      { test: /\.vue$/, loader: 'vue-loader' },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader'
      }
    ]
  },

  resolve: {
    alias: {
      'vue': 'vue/dist/vue.esm.js'
    }
  },

  // Expose __dirname to allow automatically setting basename.
  context: __dirname,
  node: {
    __dirname: true
  },

  plugins: [
    // 全局变量
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    }),
    // 热加载模块
    new webpack.HotModuleReplacementPlugin()
  ]

}
