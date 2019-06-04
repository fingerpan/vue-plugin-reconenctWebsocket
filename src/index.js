/**
 * @author youngpan
 * 注册install
 */
import Socket from 'reconenct-websockets'
import { install } from './install'

// 
Socket.install = install

// auto use
if (window !== undefined && window.Vue) {
   window.Vue.use(Socket)
}


export default Socket
