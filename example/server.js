const express = require('express')
// const rewrite = require('express-urlrewrite')
const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')
const WebpackConfig = require('./webpack.config')
const opn = require('opn')

require('./server/ws')

const app = express()

const compiler = webpack(WebpackConfig)

app.use(webpackDevMiddleware(compiler, {
  publicPath: '/__build__/',
  stats: {
    colors: true,
    chunks: false
  }
}))
const hotMiddleware = require('webpack-hot-middleware')(compiler, {
  log: false,
  heartbeat: 2000
})
app.use(hotMiddleware)

// const fs = require('fs')
// const path = require('path')

// fs.readdirSync(__dirname).forEach(file => {
//   if (fs.statSync(path.join(__dirname, file)).isDirectory()) {
//     app.use(rewrite('/' + file + '/*', '/' + file + '/index.html'))
//   }
// })

app.use(express.static(__dirname))

console.log('> Starting dev server...')
const port = process.env.PORT || 8080

module.exports = app.listen(port, () => {
  var uri = 'http://localhost:' + port
  // console.log('> Listening at ' + uri + '\n')
  console.log(`Server listening on ${uri}, Ctrl+C to stop`)

  opn(uri)
})
