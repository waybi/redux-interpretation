import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */
export default function createStore(reducer, preloadedState, enhancer) {
  /**
   * createStore 参数的判断
   * reducer 是必须的，保证是要函数
   * 只传两个参数的时候，第二个参数被当成 enhancer 处理，所以必须是函数
   * 传三个参数或更多的时候，保证只有第三个参数是 enhancer，也就是只有第二个、第四个都不是函数
   */
  if (
    (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
    (typeof enhancer === 'function' && typeof arguments[3] === 'function')
  ) {
    throw new Error(
      'It looks like you are passing several store enhancers to ' +
        'createStore(). This is not supported. Instead, compose them ' +
        'together to a single function.'
    )
  }

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  // 有 enhancer 时，返回 enhancer 处理过后的 store
  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    // enhancer 以 createStore 作为参数，返回一个接受 reducer，preloadedState 参数的函数，最后的返回值要符合 createStore 的内容
    // 这里结合 applyMiddleware 看，applyMiddleware 属于特殊的 enhancer
    return enhancer(createStore)(reducer, preloadedState)
  }

  // 保证 reducer 是个函数
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  let currentReducer = reducer
  let currentState = preloadedState     // 存储应用的 state
  let currentListeners = []             // 存储订阅的回调函数，dispatch 后会逐个执行
  let nextListeners = currentListeners  // 这里多定义一个 nextListeners，原因看 ensureCanMutateNextListeners
  let isDispatching = false             // 标记 dispatch 的状态，其实也就是执行 reducer 的过程

  /**
   * This makes a shallow copy of currentListeners so we can use
   * nextListeners as a temporary list while dispatching.
   *
   * This prevents any bugs around consumers calling
   * subscribe/unsubscribe in the middle of a dispatch.
   */
  /**
   * 考虑这种场景：dispatch 过程中，listener 数组 [ a, b, c ,d ] 在循环执行，但是刚执行完 a，a 被取消了，这时候变成 [ b, c ,d ] 原本要执行第二项的 b 就被跳过了，执行 c 去了。
   * 这个函数的作用是为了保证在 dispatch 过程中，新增或者取消订阅不会影响到当前的 dispatch，避免一些 bug 的产生
   * 浅复制一份 currentListeners，保证当前的 dispatch 的不变，新增或者取消的会在 nextListeners 也就是下次 dispatch 时体现. (subscribe 的注释里也有说明)
   */
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */
  function getState() {
    // reducer 执行时不能 getState
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }
    // getState 直接返回当前 state
    return currentState
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  /**
   * subscribe 的作用就是添加 dispatch 的回调函数 listener
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    // reducer 执行时不能添加 listener
    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
      )
    }

    // 标记订阅状态，取消订阅时避免重复取消订阅的逻辑执行，造成的性能损耗
    let isSubscribed = true
    // 添加 listener 之前，确保不改动 currentListeners，而是 currentListeners 的复制出来的 nextListeners
    ensureCanMutateNextListeners()
    // 添加回调函数 listener 到 nextListeners
    nextListeners.push(listener)

    // 订阅的返回值是个函数，调用这个返回值来取消订阅（类似于 setTimeout 的返回值可以用来取消定时器）
    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }
      // reducer 执行时不能取消订阅
      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
        )
      }
      // 标记为未订阅
      isSubscribed = false
      // 这里会再次确认 nextListeners 和 currentListeners 时，浅复制一份新的 nextListeners 出来
      ensureCanMutateNextListeners()
      // 找到需要取消订阅的 listener，通过 splice 从数组中删除，变化体现在 nextListeners 数组中
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  /**
   * dispatch 一个 action， dispatch 是唯一改变 state 的方式
   * reducer 函数以当前 state 和提供的 action 来创建 store，返回值将作为新的 state，然后通知相关的订阅，也就是执行回调函数
   * dispatch 只支持纯对象的 action
   */
  function dispatch(action) {
    // 验证 action 是纯对象
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }
    // action.type 不能是 undefined
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    // dispatch 时，也就是 reducer 中不能进行 dispatch
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      // 开始执行 reducer
      isDispatching = true
      // reducer 的参数是当前的 state 和指定的 action，返回值作为新的 state, 所以要保证 reducer 一定要有 state 返回
      currentState = currentReducer(currentState, action)
    } finally {
      // reducer 执行完成
      isDispatching = false
    }
    /**
     * 这里获取最新的回调函数数组, 然后循环逐个执行.
     * 这里让 currentListeners = nextListeners, 如果这时候出现新增或者取消订阅, 之前的 ensureCanMutateNextListeners 就起作用了,
     * 改动不会影响当前执行的数组, 下次执行 dispatch 才会拿到改过后的数组
     */
    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    return action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  /**
   * 替换当前的 reducer
   * 一般使用场景：代码分割按需加载，热替换
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }
    // 替换当前的 reducer
    currentReducer = nextReducer

    // This action has a similiar effect to ActionTypes.INIT.
    // Any reducers that existed in both the new and old rootReducer
    // will receive the previous state. This effectively populates
    // the new state tree with any relevant data from the old one.
    // 替换之后执行 REPLACE 的 action，类似 INIT
    dispatch({ type: ActionTypes.REPLACE })
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  // 这是留给 可观察/响应式库 的接口
  // todo: 对这个目前不了解, 先略过
  function observable() {
    const outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  // 默认 dispatch INIT 的 action，执行所有的 reducer，生成初始的 state 树
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
