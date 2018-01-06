import Event from './Event.js'
import { bulidPromPending, isPlainObject, symbolMap, expect, merge } from './util.js'

// 通过symble 来做私有的方法还有私有属性
const errorHandler = Symbol('errorHandler')
const binaryTypeSymbol = Symbol('binaryType')
const socketSymbol = Symbol('WebSocket')
const send = Symbol('send')
const MessageQueue = Symbol('MessageQueue')
const sendMessageQueue = Symbol('sendMessageQueue')

const symbolNameSpaceMap = symbolMap([
  'onopen',
  'onmessage',
  'onclose',
  'onerror'
])

const defaultConfig = {
  protocol: '',
  reconnect: true,
  autoconnect: true
}
// optionsCondig
const defaultSendConfig = {
  rep: '', // 是否有需要监听回包
  retry: true, // 是否在链接状态的时候,等待链接完毕重新发送,还是直接报错
  timeout: 5000 // 监听回包的超时时间
}

/**
 * Class representing a Socket
 * @extends Event
 */
export default class Socket extends Event {
  // 静态方法
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  _isSocket = true;

  /**
   * @return {'blob'|'arraybuffer'} -A string indicating the type of binary data being transmitted by the connection
   */
  get binaryType() {
    return this[socketSymbol]
      ? this[socketSymbol].binaryType
      : this.config.binaryType || 'blob'
  }
  /**
   * @param {'blob'|'arraybuffer'} -set the type of binary data being transmitted by the connection
   * @return viod
   */
  set binaryType(type) {
    this.config.binaryType = type
    this[socketSymbol] && (this[socketSymbol].binaryType = type)
  }

  /**
   * @readonly
   * @return {number} -The number of bytes of data that have been queued using calls to send() but not yet transmitted to the network
   */
  get bufferedAmount() {
    return this[socketSymbol] ? this[socketSymbol].bufferedAmount : 0
  }

  /**
   * @return {string} -The extensions selected by the server
   */
  get extensions() {
    return this[socketSymbol] ? this[socketSymbol].extensions : ''
  }
  /**
   * @param {string} -set the extensions
   * @return void
   */
  set extensions(extensions) {
    this[socketSymbol] && (this[socketSymbol].extensions = extensions)
  }

  /**
   * @return {string} -A string indicating the name of the sub-protocol the server selected
   */
  get protocol() {
    return this[socketSymbol]
      ? this[socketSymbol].protocol
      : String(this.config.protocol) || ''
  }
  /**
   * @param {string|string[]} -set the name of the sub-protocol the server selected
   * @return void
   */
  set protocol(protocol) {
    this.config.protocol = protocol
    this[socketSymbol] && (this[socketSymbol].protocol = protocol)
  }

  /**
   * @readonly
   * @return {number} -The current state of the connection
   */
  get readyState() {
    return this[socketSymbol] ? this[socketSymbol].readyState : 3
  }

  /**
   * @param {string}   url  -The connect URL
   * @param {object}   [config={}]  -the socket config
   * @param {boolean}  [config.reconnect=false]  -TODO when close
   * @param {boolean}  [config.autoconnect=true]  -TODO WebSocket sub-protocols
   * @param {function} config.beforeSend  -trigger before call nactive send function
   * @param {function} config.beforeEmit  -trigger after call message event trigger
   * @param {string|string[]} config.protocol  -WebSocket sub-protocols
   */
  constructor(url, config = {}) {
    super()

    // support new Socket(config = {})
    if (isPlainObject(url)) {
      config = url
      url = config.url
    }
    // merge default config
    this.config = merge(config, defaultConfig)
    // save hooks
    this.beforeSend = this.config.beforeSend
    this.beforeEmit = this.config.beforeEmit

    this[socketSymbol] = null
    // auto connect
    if (url && config.autoconnect === true) {
      this.connect(url)
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
   * @param  {string|object|blob|ArrayBuffer} data    -发送给服务端的数据(The data to send to the server)
   * @param  {Object}        [options={}]             -发送的参数(options)
   * @param  {string}        options.rep              -发送之后是否等待回包(wait onmessage type)
   * @param  {number}        [options.timeout=5000]  -等待的时间wait time
   * @param  {boolean}       [options.retry=false]    -在正在连接的状态下(readyState===0)下是否加入消息缓冲队列
   *
   * @return {promise}                                -返回一个promise
   */
  send(sendData, options = {}) {
    options.data = sendData
    let promise = bulidPromPending((promiser) => {
      // hook beforeSend
      if (this.beforeSend && typeof this.beforeSend === 'function') {
        this.beforeSend(options, (options) => {
          this[send](options, promiser)
        })
      } else {
        this[send](options, promiser)
      }
    }, this[errorHandler])

    return promise
  }

  /**
   * 私有的发送方法
   * private send func
   * @private
   * @ignore
   */
  [send](options, promise) {
    if (!options || !options.data) return promise.reject(new Error('data is necessary to send socket'))

    // options
    options = merge(options, defaultSendConfig)

    // decompose options
    let { data, rep, timeout, retry } = options

    // stringify data
    if (typeof data === 'object' && !expect(data, 'Blob', 'ArrayBuffer')) {
      options.data = data = JSON.stringify(data)
    }

    const READYSTATE = this.readyState
    console.log(`the socket readyState is ${READYSTATE}`)
    // is closing or closed
    if (READYSTATE > 1) {
      // TODO socket 处于关闭状态
      const err = new Error('socket 连接失败')
      return promise.reject(err)
    } else if (READYSTATE === 0) {
      // is connecting
      if (retry === false) {
        const err = new Error('socket 正在连接中,请稍后再试')
        return promise.reject(err)
      } else {
        return this[MessageQueue].push({ options, promise })
      }
    }

    /** Note:
     * Gecko's implementation of the send() method differs somewhat from the specification in Gecko 6.0
     * Gecko returns a boolean indicating whether or not the connection is still open (and, by extension, that the data was successfully queued or transmitted)
     * this is corrected in Gecko 8.0.
     */
    const isSend = this[socketSymbol] ? this[socketSymbol].send(data) : false

    if (isSend === false) {
      return promise.reject(new Error('发送失败'))
    }
    // wait rep
    if (rep) {
      let timeId = null
      const off = this.once(rep, data => {
        clearTimeout(timeId)
        promise && promise.resolve(data)
      })
      timeId = setTimeout(() => {
        const err = new Error('等待回包超时')
        promise && promise.reject(err)
        off()
      }, timeout)
    } else {
      promise.resolve(true)
    }
  }

  /**
   * 关闭socket的连接，如果已经关闭则无反应
   * close the WebSocket, can not handler reconnect
   *
   * @param {number} [code=1000]   -close code
   * @param {string} reason -close reason
   *
   * @return void
   */
  close(code = 1000, reason) {
    this[socketSymbol] && this[socketSymbol].close(code, reason)
    this.ignoreReconnect = this.config.reconnect
  }

  /**
   * 连接websocket
   * connect websocket
   *
   * @param  {string} [url] -WebSocket地址
   */
  connect(url) {
    // get and save url
    if (url) {
      delete this.url
      Object.defineProperty(this, 'url', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: url
      })
    } else {
      url = this.url
    }

    // TODO 报错, 必须要url
    if (!url) return false

    if (!window.WebSocket) {
      // TODO 报错， 不支持
      console.error('不支持WebSocket')
      return this.emit('noSupport')
    }
    // new WebSocket
    let ws = (this[socketSymbol] = this.config.protocol ? new WebSocket(url, this.config.protocol) : new WebSocket(url))
    // 首页连接失败就不再尝试
    this.ignoreReconnect = true
    // bind open error message close event
    Object.keys(symbolNameSpaceMap).forEach(name => {
      ws[name] = this[symbolNameSpaceMap[name]].bind(this)
    })

    // init binaryType
    if (this[binaryTypeSymbol]) {
      ws.binaryType = this.config.binaryType
    }
  }
  /**
   * reconnect WebSocket
   *
   * @param  {string} [url] -WebSocket地址
   */
  reconnect(url) {
    // close socket
    this[socketSymbol] && this[socketSymbol].close()
    // delete
    delete this[socketSymbol]

    this.connect(url)
  }

  // 消息缓冲队列
  [MessageQueue] = [];
  /**
   * when WebSocket is open, send the data whice in MessageQueue
   * @private
   */
  [sendMessageQueue]() {
    this[MessageQueue].forEach(message => {
      let { options, promise } = message
      this[send](options, promise)

      delete message.options
      delete message.promise
    })
    this[MessageQueue] = []
  }

  // reconnect time
  connectTime = 0;
  /**
   * websocket.onopen
   * @param  {event} event  -返回的event
   */
  [symbolNameSpaceMap.onopen](event) {
    console.warn('=========== websocket open ============')
    this.connectTime++

    // emit success
    this.emit('success', event)
    // emit open or reconnect
    if (this.connectTime === 1) {
      // first is open
      this.emit('open', event)
    } else {
      // 如果不是第一次, 触发重新连接事件
      this.emit('reconnect', event)
    }
    // 对消息队列进行发送
    this[sendMessageQueue]()
  }
  /**
   * websocket.onerror
   * @param  {event} event  -event
   */
  [symbolNameSpaceMap.onerror](event) {
    this.emit('error', event)
  }
  /**
   * websocket.onclose
   * @param  {event} event  -event
   */
  [symbolNameSpaceMap.onclose](event) {
    console.log(event)
    // 触发关闭事件
    this.emit('close', event)
    // reconect
    if (this.config.reconnect && !this.ignoreReconnect) {
      this.connect()
      this.ignoreReconnect = false
    }
  }
  /**
   * websocket.onmessage
   * @param  {event} event  -event
   */
  [symbolNameSpaceMap.onmessage](event) {
    console.warn('=========== websocket message ===========')

    // beforeEmit
    console.log(event)
    if (this.beforeEmit && typeof this.beforeEmit === 'function') {
      // beforeEmit 钩子
      event = this.beforeEmit({ ...event })
      if (event === false) return

      if (!isPlainObject(event)) {
        // 必须返回对象
        return console.error('返回格式有误')
      }
    }
    let data = event.data
    let type = event.type
    // Binary data
    // if (data instanceof ArrayBuffer || data instanceof Blob) {
    //   this.emit(type, event)
    // }

    // // 对消息进行解析
    // if (typeof data === 'string') {
    //   try {
    //     data = JSON.parse(data)
    //   } catch (e) {
    //     console.log(e)
    //   }
    // }
    // // data is a object
    //
    // if (
    //   isPlainObject(data) &&
    //   'type' in data &&
    //   typeof data.type === 'string'
    // ) {
    //   type = data.type
    // }

    this.emit(type, data)
  }
  // catch the send error
  catch(fn) {
    if (typeof fn !== 'function') {
      return console.error('catch is must be a function')
    }
    this[errorHandler] = fn
  }
}
