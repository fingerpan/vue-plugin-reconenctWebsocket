import EventEmitter from './EventEmitter'
import errorInfo from './errorInfo'
import { merge, get, Promiser, bulidPromPending, isPlainObject, expect, CreateError } from '../util'


declare global {
  interface Window {
    WebSocket:Object,
    Promise: Object,
    Vue: Object
  }
}


interface MessageQueueItem {
  options: SendOptions;
  promiser: Promiser;
}

// 默认参数
const defaultSendConfig: SendOptions = {
  data: '',
  retry: true,
  timeout: 10000
}

export default class Socket extends EventEmitter implements SocketClass {
  // static install?: any; // vue install 
  static version?: string = '__VERSION__';


  // native property
  // -------------------------------------------------

  /**
   * static connect state. more info 
   */
  static readonly CONNECTING: number = WebSocket.CONNECTING
  static readonly OPEN: number = WebSocket.OPEN
  static readonly CLOSING: number= WebSocket.CLOSING
  static readonly CLOSED: number = WebSocket.CLOSED


  /**
   * @return {'blob'|'arraybuffer'} -A string indicating the type of binary data being transmitted by the connection
   */
  get binaryType (): BinaryType {
    return this.$ws
      ? this.$ws.binaryType
      : this.config.binaryType || 'blob'
  }
  /**
   * @param {'blob'|'arraybuffer'} -set the type of binary data being transmitted by the connection
   * @return viod
   */
  set binaryType (type: BinaryType) {
    this.config.binaryType = type
    this.$ws && (this.$ws.binaryType = type)
  }


  /**
   * @readonly
   * @return {number} -The number of bytes of data that have been queued using calls to send() but not yet transmitted to the network
   */
  get bufferedAmount () {
    return get(this.$ws, 'bufferedAmount', 0)
  }


  /**
   * @readonly
   * @return {string} -The extensions selected by the server
   */
  get extensions () {
    return get(this.$ws, 'extensions', '')
  }


  /**
   * @readonly
   * @return {string} -A string indicating the name of the sub-protocol the server selected
   */
  get protocol () {
    return get(this.$ws, 'protocol', String(this.config.protocol) || '')
  }


  /**
   * @readonly
   * @return {number} -The current state of the connection
   */
  get readyState () {
    return get(this.$ws, 'readyState', Socket.CLOSED)
  }


  // extend property
  // -------------------------------------------------

  /**
   * default config
   */
  static defaultConfig: Config = {
    protocol: '',
    reconnect: true,
    autoconnect: true,
    reconnectTime: 5
  }

  // 配置
  config: Config;

  // 钩子
  beforeSendHook?: BeforeSendHook;
  beforeEmitHook?: BeforeEmitHook;

  // 私有对象
  private $ws?: WebSocket;
  private url?: string;
  private _ignoreReconnect?: boolean = false;
  private _connectTime:number = 0;
  private _MessageQueue:Array<MessageQueueItem> = [];


  /**
   * @constructorg
   */
  constructor(url: string, config: Config) {
    super()

    // set config
    this.config = merge(config, Socket.defaultConfig)

    // save hooks
    this.beforeSendHook = this.config.beforeSendHook
    this.beforeEmitHook = this.config.beforeEmitHook

    // auto connect
    if (url && config.autoconnect === true) {
      this.connect(url)
    }
  }


  // public methods 
  // -------------------------------------------------

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
    * @return {Promise}                                -返回一个promise
    */
   public async send (sendData: any, options: SendOptions = { data: '' }) {
     options.data = sendData
     let promise = bulidPromPending(
       (promiser: Promiser) => {
         // callback beforeSend hook
         if (this.beforeSendHook && typeof this.beforeSendHook === 'function') {
           this.beforeSendHook(options, (opts: SendOptions) => this.__send(opts, promiser))
         } else {
           this.__send(options, promiser)
         }
       },
       // 全局报错
       (error: Error) => this._emit('error', error)
     )
     return promise
   }



  /**
   * connect websocket
   * @param  {string} [url] -WebSocket url
   */
  public connect (url?:string) {
    // get and save url
    if (url) {
      delete this.url
      Object.defineProperty(this, 'url', {
        configurable: true,
        enumerable: false,
        writable: false,
        value: url
      })
    } else {
      url = this.url
    }

    if (!url) {
      return this._emit(
        'error',
        new TypeError(errorInfo.PARAMETERS_LACK)
      )
    }

    if (!window.WebSocket) {
      return this._emit(
        'error',
        new TypeError(errorInfo.NO_SUPPORT)
      )
    }
    // new WebSocket
    let ws = this.$ws = new WebSocket(url, this.config.protocol)

    // bind open error message close event
    ws.onopen = this.__onopen.bind(this)
    ws.onerror = this.__onerror.bind(this)
    ws.onclose = this.__onclose.bind(this)
    ws.onmessage = this.__onmessage.bind(this)


    // init binaryType
    if (this.config.binaryType) {
      ws.binaryType = this.config.binaryType
    }
  }



  /**
   * reconnect WebSocket
   * @param  {string} [url] -WebSocket url
   */
  public reconnect (url?:string): boolean | void {
    this.config.reconnectTime--
    // stop loop connect
    if (this.config.reconnectTime < 0) {
      return false
    }
    // close socket
    this.$ws && this.$ws.close()
    // delete
    delete this.$ws
    // connect
    this.connect(url)
  }



  /**
   * close the WebSocket, can not handler reconnect
   *
   * @param {number} [code=1000]   -close code
   * @param {string} reason -close reason
   * @return void
   */
  public close (code:number = 1000, reason?:string):void {
    this._ignoreReconnect = true
    this.$ws && this.$ws.close(code, reason)
  }



  // private methods 
  // -------------------------------------------------



  /**
   * 
   */
  private _sendMessageQueue() {
    this._MessageQueue.forEach((queueItem:MessageQueueItem) => {
      this.__send(queueItem.options, queueItem.promiser)
      // release 
      delete queueItem.options
      delete queueItem.promiser
    })
    this._MessageQueue = []
  }



   /**
   * private send func
   * @private
   * @ignore
   */
  private __send (options: SendOptions, promiser: Promiser) {
    if (!options || !options.data) {
      // SEND_PARAMETERS_LACK
      return promiser.reject(
        new TypeError(
          "Failed to execute 'send' on 'WebSocket': 1 argument required, but only 0 present."
        )
      )
    }

    // options
    let sendOptions: SendOptions = merge(options, defaultSendConfig)

    // decompose options
    let { data, rep, timeout, retry } = sendOptions

    // auto stringify data
    if (typeof data === 'object' && !expect(data, 'Blob', 'ArrayBuffer')) {
      options.data = data = JSON.stringify(data)
    }

    const READYSTATE = this.readyState
    // is closing or closed
    if (READYSTATE > Socket.OPEN) {
      const err = new CreateError(
        'INVALID_STATE_ERR',
        "Failed to execute 'send' on 'WebSocket': The connection is not currently OPEN"
      )
      return promiser.reject(err)
    } else if (READYSTATE === Socket.CONNECTING) {
      // is connecting
      if (retry === false) {
        const err = new CreateError(
          'INVALID_STATE_ERR',
          "Failed to execute 'send' on 'WebSocket': WebSocket is connecting"
        )
        return promiser.reject(err)
      } else {
        return this._MessageQueue.push({ options, promiser })
      }
    }

    /** Note:
     * Gecko's implementation of the send() method differs somewhat from the specification in Gecko 6.0
     * Gecko returns a boolean indicating whether or not the connection is still open (and, by extension, that the data was successfully queued or transmitted)
     * this is corrected in Gecko 8.0.
     */
    const isSend = this.$ws ? this.$ws.send(data) : false

    if (isSend === false) {
      return promiser.reject(
        new CreateError(
          'SEND_ERR',
          "Failed to execute 'send' on 'WebSocket': unkown reason"
        )
      )
    }
    // wait rep
    if (rep) {
      let timeoutId:number|undefined
      timeoutId = setTimeout(() => {
        const err = new CreateError('TIMEOUT-ERR', 'wait Reply timeout')
        promiser && promiser.reject(err)
        off()
      }, timeout)
      var off = this.once(rep, data => {
        clearTimeout(timeoutId)
        promiser && promiser.resolve(data)
      })
    } else {
      promiser.resolve(true)
    }
  }



  /**
   * websocket.onopen
   * @param  {event} event  -event
   */
  private __onopen (event: Event) {
    console.warn('=========== websocket open ============')
    this._connectTime++
    // emit success
    this._emit('success', event)
    // emit open or reconnect
    if (this._connectTime === 1) {
      // first is open
      this._emit('open', event)
    } else {
      // 如果不是第一次, 触发重新连接事件
      this._emit('reconnect', event)
    }
    // 对消息队列进行发送
    this._sendMessageQueue()
  }



  /**
   * websocket.onerror
   * @param  {event} event  -event
   */
  private __onerror (event: Event):any {
    this._emit('error', event)
  }



  /**
   * websocket.onclose
   * @param  {CloseEvent} event  -event
   */
  private __onclose (event: CloseEvent) {
    this._emit('close', event)
    // reconect
    if (this.config.reconnect && !this._ignoreReconnect) {
      this.connect()
    }
    // reset _ignoreReconnect after use
    this._ignoreReconnect = false
  }


  /**
   * websocket.onmessage
   * @param  {Event} event  -event
   */
  private async __onmessage (event: SocketEvent) {
    if (this.beforeEmitHook && typeof this.beforeEmitHook === 'function') {
      let afterEvent: false | SocketEvent = await this.beforeEmitHook(event)
      if (afterEvent === false || !isPlainObject(event) || !(<SocketEvent>afterEvent).type) return;
      // 赋值
      event = <SocketEvent>afterEvent
    }
    this._emit(event.type, event.data)
  }
}

