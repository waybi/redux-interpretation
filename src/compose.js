/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

export default function compose(...funcs) {
  // 不传参数时，定义一个函数返回
  if (funcs.length === 0) {
    return arg => arg
  }
  // 只有一个函数做参数值，返回这个函数
  if (funcs.length === 1) {
    return funcs[0]
  }

  // 传多个函数时，通过 reduce 的方法，进行转换 compose(f, g, h) 实际会变成 (...args) => f(g(h(...args)))
  // 也就是返回的函数，接收的参数作为最后一个函数的参数，执行的到的结果作为倒数第二个函数的参数，一次类推。
  // 所以函数的执行顺序就是从最右到左边
  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}
