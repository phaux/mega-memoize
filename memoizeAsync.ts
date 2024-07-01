/**
 * Asynchronous memoization utilities.
 *
 * To begin, import {@link memoizeAsync} function.
 *
 * @example
 *
 * ```ts
 * import { memoizeAsync } from "./memoizeAsync.ts";
 *
 * async function sum(a: number, b: number): Promise<number> {
 *   console.log("sum called");
 *   return a + b;
 * }
 *
 * const memoizedSum = memoizeAsync(sum);
 *
 * console.log(await memoizedSum(1, 2)); // sum called, 3
 * console.log(await memoizedSum(1, 2)); // 3
 * ```
 *
 * @module
 */

import { memoryCache } from "./memoryCache.ts";
import { memoize, type MemoizeCache } from "./memoize.ts";

/**
 * Options for {@link memoizeAsync} function.
 */
export interface MemoizeAsyncOptions<A extends readonly unknown[], R> {
  /**
   * Memoization cache implementation.
   *
   * Defaults to {@link memoryCache}.
   */
  cache?: MemoizeAsyncCache<A, R> | undefined;

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
    | ((
      this: void,
      result: NonNullable<R>,
      ...args: A
    ) => Promise<boolean> | boolean)
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
    | ((
      this: void,
      result: NonNullable<R>,
      ...args: A
    ) => Promise<boolean> | boolean)
    | undefined;
}

/**
 * Async cache implementation for {@link memoizeAsync}.
 *
 * @template K Cache key type.
 * @template V Cache value type.
 */
export interface MemoizeAsyncCache<K extends readonly unknown[], V> {
  /** Retrieves the value from the cache. */
  get: (
    this: void,
    key: K,
  ) => Promise<V | null | undefined> | V | null | undefined;

  /** Sets the value in the cache. */
  set: (this: void, key: K, value: NonNullable<V>) => Promise<void> | void;

  /** Deletes the value from the cache. */
  delete: (this: void, key: K) => Promise<void> | void;

  /**
   * Initializes additional **sync** cache for caching promises.
   *
   * This cache is used to store promises for concurrent calls with the same arguments.
   * Therefore it must be a synchronous cache.
   *
   * Defaults to {@link memoryCache}.
   */
  promiseCache?: (this: void) => MemoizeCache<K, Promise<V>>;
}

/**
 * Memoizes an async function.
 *
 * Returns a memoized function which will cache the return values of the wrapped function.
 * The wrapped function will be called only if the result for a given set of arguments was not already cached.
 * On subsequent calls with the same arguments, the cached result will be returned.
 *
 * Concurrent calls with the same arguments will return the same promise.
 * If the wrapped function returns a nullish value or rejects, the result will not be cached.
 *
 * @template A Arguments tuple type.
 * @template R Result type.
 */
export function memoizeAsync<A extends readonly unknown[], R>(
  fn: (...args: A) => Promise<R> | R,
  options?: MemoizeAsyncOptions<A, R>,
): (...args: A) => Promise<R> {
  const cache = options?.cache ?? memoryCache<A, NonNullable<R>>();
  const promiseCache = options?.cache?.promiseCache?.() ??
    memoryCache<A, Promise<R>>();
  return memoize(
    async (...args: A) => {
      try {
        const result = await cache.get(args);
        if (
          result != null &&
          !(await options?.shouldRecalculate?.(result, ...args))
        ) {
          return result;
        }
        const newResult = await fn(...args);
        if (
          newResult != null &&
          ((await options?.shouldCache?.(newResult, ...args)) ?? true)
        ) {
          await cache.set(args, newResult);
        } else {
          await cache.delete(args);
        }
        return newResult;
      } finally {
        promiseCache.delete(args);
      }
    },
    {
      cache: promiseCache,
    },
  );
}
