
let ask = require('./TuLing.js')
function socketSend(conn, type, data) {
  conn.sendText(JSON.stringify({
    type,
    data
  }))
}

const loop = () => {}

function getTypeAction(type) {
  const typeActions = {
    say(conn, text) {
      let message = JSON.parse(text)
      // 即时回包
      socketSend(conn, message.messagekey)
      console.log(text)
      // 进行询问
      ask(String(message.text)).then((data) => {
        socketSend(conn, 'say', data)
      })
    }
  }
  return typeActions[type] || loop
}

// 对指令进行返回消息
module.exports = function order(conn, type, data) {
  // 验证是都是登陆
  if (type === 'login' && data) {
    conn.userId = String(data)
    return socketSend(conn, 'loginSuccess', String(data))
  }

  if (!conn.userId) {
    return socketSend(conn, 'error', '请先登录')
  }

  // 不同的对象实现不同的方式
  getTypeAction(type)(conn, data)
}
