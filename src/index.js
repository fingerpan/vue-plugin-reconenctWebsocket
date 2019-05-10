/**
 * @author youngpan
 * 注册install
 */
import Socket from './core/Socket.ts'
import { install } from './install'

// 
Socket.install = install

// auto use
if (window !== undefined && window.Vue) {
   window.Vue.use(Socket)
}



export default Socket
