/**
 * @author youngpan
 * 注册install
 */
import Socket from './Socket.js'
import { install } from './install.js'

Socket.install = install
// set version
Socket.version = '__VERSION__'

// auto use
if (window !== undefined && window.Vue) {
  window.Vue.use(Socket)
}

export default Socket
