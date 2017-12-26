/* eslint-disable */
import Vue from 'vue'
import App from './App.vue'

import Socket from '../../src/index.js'

// new socket
let socket = new Socket('ws://127.0.0.1:3000')
// use plugin
Vue.use(Socket, socket)

// open
socket.on('open', () => {
  console.log(open)
})

socket.send({
  data: 'text',
}, {
  rep: 'message'
}).then((data) => {
  console.log(data)
})

new Vue({
  el: '#app',
  template: '<App/>',
  components: { App }
})
