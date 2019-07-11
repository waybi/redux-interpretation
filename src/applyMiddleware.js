import compose from './compose'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */
export default function applyMiddleware(...middlewares) {
  return createStore => (...args) => {
    const store = createStore(...args)
    let dispatch = () => {
      throw new Error(
        'Dispatching while constructing your middleware is not allowed. ' +
          'Other middleware would not be applied to this dispatch.'
      )
    }

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }
    // middlewareAPI 作为参数执行一遍所有的中间件
    const chain = middlewares.map(middleware => middleware(middlewareAPI))
    // 根据 compose 生产的其实是类似 mid1(mid2(mid3(store.dispatch)))
    // 所以在数组最后的 middleware 其实是第一个执行的
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}


/**
 * 这里要结合实际的中间件来理解，下面是 logger 中间件的示例代码
 * 可以看到中间件 thunk 其实是一个函数，参数为 dispatch 和 getState，这个对应上面的 middlewareAPI
 * middleware(middlewareAPI) 执行后得到的还是个函数，参数是 next，看上面的 compose, 这个 next 其实就是 store.dispatch，返回的是新的 newDispatch
 * 根据上面的 compose，你会发现，这个 newDispatch 是作为中间件链的下一个 middleware 的参数值（就是 next）这样一环扣一环，得到一个最终的 dispatch
 * 在实际调用最终的 dispatch 时，你会发现，middleware 的执行顺序又变成是从左往右了（因为最终返回的 dispatch 是第一个中间件的函数）
 * 执行过程中，遇到 next(action)，这时候其实就是右边一个 middleware 的返回的 dispatch，控制器就转到这个 middleware 了，
 * 这样执行到后，控制权返回，再执行 next 后面的代码
 * 最终就是形成了中间件的洋葱模型
 */

// const logger = store => next => action => {
//   console.log('dispatching', action)
//   let result = next(action)
//   console.log('next state', store.getState())
//   return result
// }
