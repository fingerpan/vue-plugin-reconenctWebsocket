/* eslint-disable */
import Vue from 'vue'
import App from './App.vue'

import Socket from '../../src/index.js'

// new socket
let socket = new Socket('ws://127.0.0.1:3000')
// use plugin
Vue.use(Socket, socket)
console.log(socket);
socket.binaryType = 'arraybuffer'
// open
socket.on('open', () => {
  console.log('open')
})
socket.beforeSend = function(options, send) {
  console.log(options)
  send(options)

}

socket.beforeEmit = (e) => {
  console.log(e)
  e.type = 'name'
  return e
}


socket.send({
  data: 'text',
}, {
  rep: 'message'
}).then((data) => {
  if (data instanceof ArrayBuffer) {
    var bytearray = new Uint8Array(data)
    console.log(bytearray)
  }
  // socket.close()
})




new Vue({
  el: '#app',
  template: '<App/>',
  components: { App }
})
