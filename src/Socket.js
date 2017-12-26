import Event from './Event.js'
import { bulidPromPending, isPlainObject, symbolMap } from './util.js'

// optionsCondig
const defaultSendConfig = {
  encrypt: false, // 是否加密
  rep: undefined, // 是否有需要监听回包
  retry: true, // 是否在链接状态的时候,等待链接完毕重新发送,还是直接报错
  timeout: 100000 // 监听回包的超时时间
}

// 通过symble 来做私有的方法还有私有属性
const errorHandler = Symbol()

const symbolNameSpaceMap = symbolMap([
  'onopen',
  'onmessage',
  'onclose',
  'onerror'
])

// 尝试 flow
/**
 * Class representing a Socket
 * @extends Event
 */
export default class Socket extends Event {
  _isSocket = true
  // socket url
  socketUrl = '';

  // hooks
  // 发送之前
  beforeSend
  // 触发emit之前
  beforeEmit

  // WebSocket 实例
  socket
  constructor(url, config = {}) {
    super()

    this.socket = null
    this.beforeSend = null
    this.beforeEmit = null

    if (typeof url !== 'string') {
      config = url
      url = config.url
    }

    config = {
      start: true,
      ...config
    }

    // 可以对象, 或者第一个是url, 第二个是配置
    // save url and start
    if (url && config.start === true) {
      this.start(url)
    }
  }

  /**
   * 对外方法
   * @example
   * send(data, {
   *  rep: 'pong',
   *  timeout : 3000
   *  retry: false
   * }).then((data) => {
   *     data => {type:pong}
   *   })
   *   .catch(error => {
   *      error.message => '等待回包超时'
   *   })
   *
   *
   * @param  {string|object} data                     -发送数据包
   * @param  {Object}        [options={}]             -发送参数
   * @param  {Boolean}       [options.encrypt=false]  -是否需要加密
   * @param  {string}        [options.rep='']         -等待回包的type字段
   * @param  {number}        [options.timeout=10000]  -等待回包的超时时间
   * @param  {boolean}       [options.retry=false]    -在断线的情况下是否加入消息缓冲队列
   *
   * @return {promise}                                -返回一个promise
   */
  send(sendData, config = {}) {
    config.data = sendData
    // 触发钩子
    if (this.beforeSend && typeof this.beforeSend === 'function') {
      // beforeSend 钩子
      config = this.beforeSend(config)

      if (!isPlainObject(config)) {
        // 必须返回对象
        return console.error('返回格式有误')
      }
    }
    // 分解参数
    let { data, ...options } = config

    // data 为必须的数据
    if (!data) throw new Error('data is necessary to send socket')

    // 扩展options
    options = {
      ...defaultSendConfig,
      ...options
    }

    // get promise and catch global
    const promise = bulidPromPending(this[errorHandler])

    // 要解决如果没有进行捕获， 就要进行捕获呀，
    window.setTimeout(() => {
      this._send(data, options, promise)
    }, 0)

    return promise
  }

  /**
   * 私有的发送方法
   * @private
   * @param  {string|object} data    [description]
   * @param  {Object}        options [description]
   * @param  {promise}       promise [description]
   * @return {[type]}                [description]
   */
  _send(data, options, promise) {
    const { rep, timeout, retry } = options

    const READYSTATE = this.readyState
    console.log(`the socket readyState is ${READYSTATE}`)

    // 处于断线中
    if (READYSTATE > 1) {
      // TODO
      const err = new Error('socket 连接失败')
      return promise.reject(err)
    } else if (READYSTATE === 0) {
      // 是否要加入发送队列
      if (retry === false) {
        const err = new Error('socket 正在连接中,请稍后再试')
        return promise.reject(err)
      } else {
        // 加入队列中
        return this.bufferQueue.push({ data, options, promise })
      }
    }
    // 可正常发送 ==============================

    // 格式化data
    if (typeof data === 'object') {
      data = JSON.stringify(data)
    }

    // 发送
    // 兼容部分浏览器
    const isSend = this.socket ? this.socket.send(data) : false

    // 等待回包, 就注册一个有超时的回包事件
    if (rep && isSend !== false) {
      this.ontime(rep, timeout, promise)
    } else {
      promise.resolve(true)
    }
  }

  // 关闭 close ====================================================
  close() {
    this.socket && this.socket.close()
  }

  // 开始 start ====================================================

  /**
   * new 一个 WebSocket 并且绑定监听ws的事件
   * 如果不传递参数, 可以作为重新连接 => reStart方式使用
   * @param  {string} [url] -WebSocket的连接源
   */
  async start(url) {
    // 获取url
    url = (url && (this.socketUrl = url)) || this.socketUrl
    // 报错, 必须要url
    if (!url) return false

    // 检测是否支持WebSocket
    if (!window.WebSocket) {
      // 报错， 不支持
      this.emit('noSupport')
      console.error('不支持WebSocket')

      return false
    }

    // 连接  ==
    const ws = this.socket = new WebSocket(url)

    // 绑定四个事件
    Object.keys(symbolNameSpaceMap).forEach(name => {
      console.log(name)
      ws[name] = this[symbolNameSpaceMap[name]].bind(this)
    })
  }
  /**
   * 重启WebSocket
   */
  async reStart() {
    // 触发关闭
    this.socket && this.socket.close()
    // 释放内存
    this.socket = null
    // 重启
    await this.start()
    return true
  }

  // ======================================== 消息缓冲
  // 消息缓冲队列
  bufferQueue = []
  /**
   * 当连接成功后, 将消息缓冲队列数组进行发送
   * @private
   */
  _sendBufferQueue() {
    // 遍历发送
    this.bufferQueue.forEach(message => {
      const { data, options, promise } = message
      this._send(data, options, promise)
      // 删除对象指针
      delete message.data
      delete message.options
      delete message.promise
    })
    // 清空数据
    this.bufferQueue = []
  }

  /**
   * 注册一个超时的回包机制
   * @private
   * @param  {string} rep       -等待回包的type字段
   * @param  {number} timeout   -等待回包的超时时间
   * @param  {Promise} promise  -等待回包后需要执行的promise
   */
  ontime(rep, timeout, promise) {
    let timeId = null
    let commit

    commit = data => {
      clearTimeout(timeId)
      promise && promise.resolve(data)

      timeId = null
      commit = null
    }

    // 注册一次性的事件
    this.once(rep, commit)

    // 并且开启一个超时reject
    timeId = setTimeout(() => {
      const err = new Error('等待回包超时')
      promise && promise.reject(err)
      this.off(rep, commit)
      timeId = null
      commit = null
    }, timeout)
  };

  // 重连次数计数器
  connectTime = 0;
  /**
   * 绑定websocket.onopen的事件函数
   * @param  {event} e  -返回的event
   */
  [symbolNameSpaceMap.onopen](e) {
    console.warn('=========== websocket open ============')
    this.connectTime++
    const ws = (this.socket = e.target)

    // 触发成功连接上
    this.emit('success', ws)
    if (this.connectTime === 1) {
      // 如果是第一次, 触发打开连接事件
      this.emit('open', ws)
    } else {
      // 如果不是第一次, 触发重新连接事件
      this.emit('reconnect', ws)
    }
    // 对消息队列进行发送
    this._sendBufferQueue()
  }
  /**
   * 绑定websocket.onerror的事件函数
   * @param  {event} e  -返回的event
   */
  [symbolNameSpaceMap.onerror](e) {
    // 触发报错事件
    this.emit('error', e)
  }
  /**
   * 绑定websocket.onclose的事件函数
   * @param  {event} e  -返回的event
   */
  [symbolNameSpaceMap.onclose](e) {
    // 触发关闭事件
    this.emit('close', e)
  }
  /**
   * 绑定websocket.onMessage的事件函数
   * @param  {event} e  -返回的event
   */
  [symbolNameSpaceMap.onmessage](event) {
    console.warn('=========== websocket message ===========')

    // 触发钩子
    if (this.beforeEmit && typeof this.beforeEmit === 'function') {
      // beforeSend 钩子
      event = this.beforeSend(event)
      if (!isPlainObject(event)) {
        // 必须返回对象
        return console.error('返回格式有误')
      }
    }
    // TODO 要兼容二进制

    let data = event.data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch (e) {
        console.log(e)
      }
    }
    // data is a object
    let type = 'message'
    if (isPlainObject(data) && 'type' in data && typeof data.type === 'string') {
      type = data.type
    }

    this.emit(type, data)
  }

  /**
   * 返回ws.readyState
   * readyStateMap = {
   *  0: CONNECTING, // 连接还没开启。
   *  1: OPEN,       // 连接已开启并准备好进行通信。
   *  2: CLOSING,    // 连接正在关闭的过程中。
   *  3: CLOSED,     // 连接已经关闭，或者连接无法建立
   * }
   *
   * @return {number} -websocket实例的状态码
   */
  get readyState() {
    return this.socket ? this.socket.readyState : 3
  }

  // 钩子
  // 捕获
  catch(fn) {
    if (typeof fn !== 'function') {
      return console.error('catch is must be a function')
    }
    this[errorHandler] = fn
  }
}
