var ws = require('nodejs-websocket')
const order = require('./order.js')

function transformObject(str) {
  try {
    str = JSON.parse(str)
  } catch (e) {

  }
  return str
}

module.exports = ws
  .createServer(function(conn) {
    conn.on('text', function(text) {
      text = transformObject(text)
      console.log(text)
      // only object
      if (typeof text === 'object') {
        let { type, data } = text
        //  order
        order(conn, type, data)
      }
    })

    conn.on('close', function(code, reason) {
      console.log('关闭连接')
    })
    conn.on('error', function(code, reason) {
      console.log('异常关闭')
    })


  })
  .listen(3000)
