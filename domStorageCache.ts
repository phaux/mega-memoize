import { type KeyNormalizer, smartKeyNormalizer } from "./KeyNormalizer.ts";
import type { MemoizeCache } from "./memoize.ts";
import {
  smartValueSerializer,
  type ValueSerializer,
} from "./ValueSerializer.ts";

/**
 * Options for {@link localStorageCache}.
 */
export interface DomStorageCacheOptions<
  in A extends readonly unknown[],
  in out R,
> {
  /**
   * Custom key normalizer.
   *
   * Defaults to {@link smartKeyNormalizer}.
   */
  keyNormalizer?: KeyNormalizer<A> | undefined;

  /**
   * Custom value serializer.
   *
   * Defaults to {@link smartValueSerializer}.
   */
  valueSerializer?: ValueSerializer<R> | undefined;
}

/**
 * Creates a {@link MemoizeCache} using browser's {@link Storage} interface - e.g. {@link localStorage}.
 *
 * The arguments will be normalized using {@link KeyNormalizer} and stored as the storage keys.
 * The results will be serialized and deserialized using {@link ValueSerializer} and stored as the storage values.
 *
 * @template A Arguments tuple type.
 * @template R Result type.
 */
export function domStorageCache<
  A extends readonly unknown[],
  R extends NonNullable<unknown>,
>(
  storage: Storage,
  keyPrefix: string,
  options?: DomStorageCacheOptions<A, R>,
): MemoizeCache<A, R> {
  const normalize = options?.keyNormalizer ?? smartKeyNormalizer();
  const serializer = options?.valueSerializer ?? smartValueSerializer();

  return {
    get(key) {
      const item = storage.getItem(keyPrefix + normalize(key));
      if (item == null) return;
      return serializer.parse(item) as R;
    },
    set(key, value) {
      storage.setItem(keyPrefix + normalize(key), serializer.stringify(value));
    },
    delete(key) {
      storage.removeItem(keyPrefix + normalize(key));
    },
  };
}
