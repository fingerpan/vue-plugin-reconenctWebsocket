
// TODO 是否为空对象
export const isEmptyObject = () => {

}

export const extend = (target, source) => {
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key]
    }
  }
  return target
}

export function bulidPromPending(errorHandler) {
  var promiser = {}
  var promise = new Promise((resolve, reject) => {
    promiser.state = 'pending'
    promiser.resolve = function(...args) {
      this.state = 'resolved'
      resolve(...args)
    }
    promiser.reject = function(...args) {
      this.state = 'rejected'
      reject(...args)
    }
  })
  promise = extend(promise, promiser)
  promiser = null

  rewriteCatchThen(promise, errorHandler)
  return promise
}

export function getType(target) {
  return Object.prototype.toString.call(target).slice(8, -1)
}

/**
 * 判断传入对象 是否为构造函数Object直接构造，并且不为null
 * @param obj           {查询对象}
 * @returns {boolean}   {返回是否为纯对象}
 */
export function isPlainObject(obj) {
  return obj && typeof obj === 'object' && getType(obj) === 'Object'
}

function rewriteCatchThen(promise, callback) {
  if (!callback || typeof callback !== 'function') return false
  // 要重写catch
  const promiseCatch = promise.catch
  const promiseThen = promise.then
  let hasCatch = false

  // 永远都会先触发
  promiseCatch.call(promise, function(err) {
    // 触发全局的catch
    hasCatch === false && callback(err)
  })

  // rewirte then
  let THEN_TIME = 0
  promise.then = function(resolveCall, rejectCall) {
    THEN_TIME++
    if (THEN_TIME === 1 && rejectCall && hasCatch === false) {
      hasCatch = true
    }
    promiseThen.call(this, resolveCall, rejectCall)
  }

  // rewirte catch
  let catchTime = 0
  promise.catch = function(fn) {
    // 是否有全局的
    catchTime++
    if (catchTime === 1 && hasCatch === false && fn) {
      hasCatch = true
    }
    promiseCatch.call(this, fn)
  }

  return promise
}

export const symbolMap = (arr) => {
  const map = {}
  arr.forEach(name => {
    map[name] = Symbol()
  })
  return map
}
