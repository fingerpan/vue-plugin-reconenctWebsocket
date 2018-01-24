import Event from './Event.js'
import { bulidPromPending, isPlainObject, symbolMap, expect, merge, CreateError } from './util.js'

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
  autoconnect: true,
  reconnectTime: 5
}
// optionsCondig
const defaultSendConfig = {
  retry: true,
  timeout: 10000
}

/**
 * Class representing a Socket
 * @extends Event
 */
export default class Socket extends Event {
  // connect state
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

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
   * @public
   * @example
   * send(data, {
   *  rep: 'pong',
   *  timeout : 3000
   *  retry: false
   * }).then((data) => {
   *     data => {type:pong}
   *   })
   *   .catch(error => {
   *      error.message => 'wait Reply timeout'
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
   * private send func
   * @private
   * @ignore
   */
  [send](options, promise) {
    if (!options || !options.data) return promise.reject(new TypeError('Failed to execute \'send\' on \'WebSocket\': 1 argument required, but only 0 present.'))

    // options
    options = merge(options, defaultSendConfig)

    // decompose options
    let { data, rep, timeout, retry } = options

    // stringify data
    if (typeof data === 'object' && !expect(data, 'Blob', 'ArrayBuffer')) {
      options.data = data = JSON.stringify(data)
      console.log(options.data)
    }

    const READYSTATE = this.readyState
    // is closing or closed
    if (READYSTATE > 1) {
      const err = new CreateError('INVALID_STATE_ERR', 'Failed to execute \'send\' on \'WebSocket\': The connection is not currently OPEN')
      return promise.reject(err)
    } else if (READYSTATE === 0) {
      // is connecting
      if (retry === false) {
        const err = new CreateError('INVALID_STATE_ERR', 'Failed to execute \'send\' on \'WebSocket\': WebSocket is connecting')
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
      return promise.reject(new CreateError('SEND_ERR', 'Failed to execute \'send\' on \'WebSocket\': unkown reason'))
    }
    // wait rep
    if (rep) {
      let timeoutId = null
      timeoutId = setTimeout(() => {
        const err = new CreateError('TIMEOUT-ERR', 'wait Reply timeout')
        promise && promise.reject(err)
        off()
      }, timeout)
      var off = this.once(rep, data => {
        clearTimeout(timeoutId)
        promise && promise.resolve(data)
      })
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
   * @param  {string} [url] -WebSocket url
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

    if (!url) {
      return this.emit('error', new TypeError('Failed to construct \'WebSocket\': 1 argument required, but only 0 present.'))
    }

    if (!window.WebSocket) {
      return this.emit('error', new TypeError('Failed to construct \'WebSocket\': The browser is not support WebSocket'))
    }
    // new WebSocket
    let ws = (this[socketSymbol] = this.config.protocol ? new WebSocket(url, this.config.protocol) : new WebSocket(url))
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
    this.config.reconnectTime--
    // stop loop connect
    if (this.config.reconnectTime < 0) {
      return false
    }
    // close socket
    this[socketSymbol] && this[socketSymbol].close()
    // delete
    delete this[socketSymbol]

    this.connect(url)
  }

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
   * @param  {event} event  -event
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
    if (this.beforeEmit && typeof this.beforeEmit === 'function') {
      event = this.beforeEmit({
        data: event.data,
        type: event.type
      })
      if (event === false || !isPlainObject(event) || !event.type) return false
    }
    this.emit(event.type, event.data)
  }
  // catch the send error
  catch(fn) {
    if (typeof fn !== 'function') {
      return console.error(new TypeError('catch is must be a function'))
    }
    this[errorHandler] = fn
  }
}
