/**
 * 判断是否纯对象
 * 纯对象一般是指通过字面量或者 new Object() 生成的对象
 * 这里对纯对象的定义是：[[prototype]] != null && [[prototype]][[prototype]] === null
 * 关于更详细的可以看知乎上的这个问题：https://www.zhihu.com/question/287632207/answer/457618735
 */
/**
 * @param {any} obj The object to inspect.
 * @returns {boolean} True if the argument appears to be a plain object.
 */
export default function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) return false

  /**
   * 循环找到原型链的顶层，然后和第一层原型对比是否相等
   * 不知道为什么要循环，不直接
   * let proto = Object.getPrototypeOf(obj)
   * return !!proto && Object.getPrototypeOf(proto) === null
   */
  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }

  return Object.getPrototypeOf(obj) === proto
}
