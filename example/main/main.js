import Vue from 'vue'
import App from './App.vue'

import Socket from '../../src/index.js'

// new socket
let socket = new Socket('ws://127.0.0.1:3000')
Vue.use(Socket, socket)

// hook
socket.beforeEmit = (e) => {
  // return data
  return JSON.parse(e.data)
}
socket.beforeSend = (options, send) => {
  options.data = JSON.stringify({
    type: options.type || 'say',
    data: JSON.stringify(options.data)
  })
  send(options)
}

// login
socket.send('myname', {
  type: 'login',
  rep: 'loginSuccess'
}).then((data) => {
  // loginSuccess
  // todo..
})

// socket.close()


setTimeout(() => {
  socket.send('myame', {
    type: 'login',
    rep: 'loginSuccess'
  }).then(console.log)
}, 2000)
/* eslint-disable no-new */
new Vue({
  el: '#app',
  template: '<App/>',
  components: { App }
})
