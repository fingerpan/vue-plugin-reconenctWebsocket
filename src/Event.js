// @class Event
export default class Event {
  constructor() {
    this._events = {}
  }
  /**
   * 绑定事件
   * @param  {string}   event    - 事件名
   * @param  {Function} callback - 触发回调函数
   * @param  {object}   cxt      - 触发的上下文
   * @return {Function}          - 解绑函数
   */
  on(event, callback, cxt) {
    // TODO 没有过滤重复绑定
    (this._events[event] || (this._events[event] = [])).push({
      callback,
      cxt
    })
    // return off
    return () => {
      this.off(event, callback)
    }
  }
  /**
   * 绑定一次性事件
   * @param  {string}   event    - 事件名
   * @param  {Function} callback - 触发回调函数
   * @param  {object}   cxt      - 触发的上下文
   * @return {Function}          - 解绑函数
   */
  once(event, callback, cxt) {
    const layer = (...args) => {
      const _this = cxt || this
      callback.apply(_this, args)
      this.off(event, layer)
    }
    return this.on(event, layer)
  }
  /**
   * 触发绑定的事件
   * @param  {string} event -事件名
   * @param  {...any} args  -触发事件的传递参数
   */
  emit(event, ...args) {
    let _event = this._events[event] || []
    _event.forEach(eventItem => {
      let cxt = (eventItem.cxt = this)
      let callback = eventItem.callback
      callback.apply(cxt, args)
    })
  }
  /**
   * 解绑事件
   * @param  {string}   event    - 绑定的事件名
   * @param  {Function} callback - 绑定的函数
   */
  off(event, callback) {
    let _event = this._events[event] || []
    let index = _event.findIndex(eventItem => eventItem.callback === callback)
    if (index > -1) {
      // TODO 瓦解 _event[index]
      _event.splice(index, 1)
    }
  }
}
