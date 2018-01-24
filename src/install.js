/**
 * @author youngpan
 * 注册install
 */
import { isEmptyObject, isPlainObject } from './util.js'
import Socket from './Socket.js'
export let _Vue = null

export function install(Vue, socket) {
  if (install.installed) return
  install.installed = true

  if (!(socket instanceof Socket) && typeof socket === 'object' && socket.url) {
    socket = new Socket(socket.url, socket)
  }

  _Vue = Vue

  // 全局mixin
  Vue.mixin({
    beforeCreate() {
      const sockets = this.$options['sockets']
      const $socket = this.$socket
      if (!$socket) {
        return console.error('没有socket')
      }
      // proxy
      this.$options.sockets = new Proxy({}, {
        set: (target, key, value, receiver) => {
          // 判断 value 必须是一个函数， 或者对象, 是一个可以传递参数的对象
          $socket.on(key, value, this)
          return Reflect.set(target, key, value, receiver)
        },
        deleteProperty: (target, key) => {
          // 对删除进行拦截, 删除监听
          $socket.off(key, this.$options.sockets[key], this)
          return Reflect.deleteProperty(target, key)
        }
      })

      if (isPlainObject(sockets) && !isEmptyObject(sockets)) {
        // 进行监听
        Object.keys(sockets).forEach(key => {
          this.$options.sockets[key] = sockets[key]
        })
      }
    },
    beforeDestroy() {
      const sockets = this.$options['sockets']
      if (sockets) {
        Object.keys(sockets).forEach(key => {
          delete this.$options.sockets[key]
        })
      }
      // clear
      this.$options['sockets'] = null
    }
  })
  // define $socket Object getters
  Object.defineProperty(Vue.prototype, '$socket', {
    get() { return socket }
  })

  const strats = Vue.config.optionMergeStrategies
  // use the same merging strategy for sockets options
  strats.sockets = strats.props
}
