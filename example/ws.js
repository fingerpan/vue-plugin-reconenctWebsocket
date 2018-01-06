var ws = require('nodejs-websocket')
module.exports = ws
  .createServer(function(conn) {
    conn.on('text', function(str) {
      console.log('收到的信息为:' + str)
      // 发送数据
      // let text = {
      //   type: 'message',
      //   data: 'dddd'
      // }
      let buff = new Buffer([1, 2, 3])
      console.log(buff)
      conn.sendBinary(buff)
    })
    conn.on('close', function(code, reason) {
      console.log('关闭连接')
    })
    conn.on('error', function(code, reason) {
      console.log('异常关闭')
    })
  })
  .listen(3000)
