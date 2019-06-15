/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state. 对于未知的 actions，必须返回当前的 state
 * If the current state is undefined, you must return the initial state. 如果当前 state 是 undefined，必须返回原始的 state (总之，要保证任何情况有 state 返回)
 * Do not reference these action types directly in your code.
 */

/**
 * 生成随机字符串, 用 . 连接每个字符
 * 这个也是生成随机字符串的技巧，通过 toString 把数字转成对应进制的字符标识，36 进制对应 26 个字母和 10 个数字
 */
const randomString = () =>
  Math.random()
    .toString(36)
    .substring(7)
    .split('')
    .join('.')

// Redux 内部保留使用的 action types，禁止外部使用
const ActionTypes = {
  INIT: `@@redux/INIT${randomString()}`,
  REPLACE: `@@redux/REPLACE${randomString()}`,
  PROBE_UNKNOWN_ACTION: () => `@@redux/PROBE_UNKNOWN_ACTION${randomString()}`
}

export default ActionTypes
