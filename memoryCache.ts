import { type KeyNormalizer, smartKeyNormalizer } from "./KeyNormalizer.ts";
import type { MemoizeCache } from "./memoize.ts";

/**
 * Options for {@link memoryCache}.
 */
export interface MemoryCacheOptions<in A extends readonly unknown[], in out R> {
  /**
   * Use already existing {@link Map} instance.
   */
  map?: Map<string, R> | undefined;

  /**
   * Custom key normalizer.
   *
   * Defaults to {@link smartKeyNormalizer}.
   */
  keyNormalizer?: KeyNormalizer<A> | undefined;
}

/**
 * Creates a {@link MemoizeCache} using an in-memory {@link Map}.
 *
 * The arguments will be normalized using {@link KeyNormalizer} and stored as the map keys.
 * The results will be stored as the map values as is.
 *
 * @template A Arguments tuple type.
 * @template R Result type.
 */
export function memoryCache<
  A extends readonly unknown[],
  R extends NonNullable<unknown>,
>(
  options?: MemoryCacheOptions<A, R>,
): MemoizeCache<A, R> {
  const map = options?.map ?? new Map<string, R>();
  const normalize = options?.keyNormalizer ?? smartKeyNormalizer();

  return {
    get: (key) => map.get(normalize(key)),
    set: (key, value) => void map.set(normalize(key), value),
    delete: (key) => void map.delete(normalize(key)),
  };
}
