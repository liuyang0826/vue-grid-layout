// @flow
// @credits https://gist.github.com/rogozhnikoff/a43cfed27c41e4e68cdc
export function findInArray(array: Array<any> | TouchList, callback: (...args: any[]) => any): any {
  for (let i = 0, length = array.length; i < length; i += 1) {
    if (callback.apply(callback, [array[i], i, array])) return array[i]
  }
}

export function isFunction(func: unknown): func is (...args: any[]) => any {
  // $FlowIgnore[method-unbinding]
  return typeof func === 'function' || Object.prototype.toString.call(func) === '[object Function]'
}

export function isNum(num: unknown): num is number {
  return typeof num === 'number' && !isNaN(num)
}

export function int(a: string): number {
  return parseInt(a, 10)
}
