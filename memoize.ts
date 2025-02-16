/**
 * Memoization utilities.
 *
 * To begin, import {@link memoize} function.
 *
 * @example
 *
 * ```ts
 * import { memoize } from "./memoize.ts";
 *
 * function sum(a: number, b: number): number {
 *   console.log("sum called");
 *   return a + b;
 * }
 *
 * const memoizedSum = memoize(sum);
 *
 * console.log(memoizedSum(1, 2)); // sum called, 3
 * console.log(memoizedSum(1, 2)); // 3
 * ```
 *
 * @module
 */

import { memoryCache } from "./memoryCache.ts";

/**
 * Options for {@link memoize}.
 */
export interface MemoizeOptions<in A extends readonly unknown[], in out R> {
  /**
   * Memoization cache implementation.
   *
   * Defaults to {@link memoryCache}.
   */
  cache?: MemoizeCache<A, NonNullable<R>> | undefined;

  /**
   * Whether to recalculate the result if it was found in the cache.
   *
   * Runs whenever the result is retrieved from the cache.
   *
   * A nullish result will always be recalculated.
   *
   * Defaults to never recalculating the result if not nullish.
   */
  shouldRecalculate?:
    | ((this: void, result: NonNullable<R>, ...args: A) => boolean)
    | undefined;

  /**
   * Whether to cache the result after computing it.
   *
   * Runs whenever a new result is computed.
   *
   * A nullish result will never be cached.
   *
   * Defaults to always caching the result if not nullish.
   */
  shouldCache?:
    | ((this: void, result: NonNullable<R>, ...args: A) => boolean)
    | undefined;
}

/**
 * Memoization cache interface for {@link memoize}.
 *
 * @template K Cache key type.
 * @template V Cache value type.
 */
export interface MemoizeCache<
  in K extends readonly unknown[],
  in out V extends NonNullable<unknown>,
> {
  /** Retrieves the value from the cache. */
  get: (this: void, key: K) => V | undefined;

  /** Sets the value in the cache. */
  set: (this: void, key: K, value: V) => void;

  /** Deletes the value from the cache. */
  delete: (this: void, key: K) => void;
}

/**
 * Memoizes a function.
 *
 * Returns a memoized function which will cache the return values of the wrapped function.
 * The wrapped function will be called only if the result for a given set of arguments was not already cached.
 * On subsequent calls with the same arguments, the cached result will be returned.
 *
 * If the wrapped function returns a nullish value or throws, the result will not be cached.
 *
 * @template A Arguments tuple type.
 * @template R Result type.
 */
export function memoize<A extends readonly unknown[], R>(
  fn: (...args: A) => R,
  options?: NoInfer<MemoizeOptions<A, R>>,
): (...args: A) => R {
  const cache = options?.cache ?? memoryCache();

  return (...args: A) => {
    const result = cache.get(args);
    if (result != null && !options?.shouldRecalculate?.(result, ...args)) {
      return result;
    }
    const newResult = fn(...args);
    if (
      newResult != null &&
      (options?.shouldCache?.(newResult, ...args) ?? true)
    ) {
      cache.set(args, newResult);
    } else {
      cache.delete(args);
    }
    return newResult;
  };
}
