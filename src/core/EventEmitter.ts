
import { findIndex } from '../util'

interface EventItem {
  callback: any;
  cxt?:object;
}

interface EventMap {
  [x: string]: EventItem[];
}



interface EventCallback {
  (...args: any[]): any;
}

export default class EventEmitter {

  private _events:EventMap = {}


  /**
   * 绑定事件
   * @param  {string}   event    - 事件名
   * @param  {Function} callback - 触发回调函数
   * @param  {object}   cxt      - 触发的上下文
   * @return {Function}          - 解绑函数
   */
  public on (event: string, callback: EventCallback, cxt?:object) {
    // TODO: 没有过滤重复绑定
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
  public once (event: string, callback: EventCallback, cxt?:object) {
    const autoOffCallback: EventCallback = (...args) => {
      callback.apply(cxt, args)
      // auto off event after emit this event
      this.off(event, autoOffCallback)
    }
    return this.on(event, autoOffCallback)
  }



  /**
   * 解绑事件
   * @param  {string}   event    - 绑定的事件名
   * @param  {Function} callback - 绑定的函数
   */
  public off (event: string, callback: EventCallback) {
    let _event = this._events[event] || []
    let index = findIndex(_event, eventItem => eventItem.callback === callback)
    if (index > -1) {
      _event.splice(index, 1)
    }
  }



  /**
   * 触发绑定的事件
   * @private
   * @param  {string} event -eventName
   * @param  {...any} args  -any args
   */
  protected _emit (event: string, ...args:any[]) {
    let _event = this._events[event] || []

    // TODO: 当前找不到响应
    if (_event.length === 0) {
      return
    }

    _event.forEach(eventItem => eventItem.callback.apply(eventItem.cxt, args))
  }
}