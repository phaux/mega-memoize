import type { MemoizeAsyncCache } from "./memoizeAsync.ts";

/**
 * Options for {@link denoKvCache}.
 */
export interface DenoKvCacheOptions<A extends readonly unknown[], R> {
  /**
   * Function to determine the expiration time of a cached result.
   * If a number is provided, it will be used as the expiration time in milliseconds.
   * If undefined, the result will not expire.
   */
  expireIn?:
    | ((this: void, result: R, ...args: A) => number | undefined)
    | number
    | undefined;
}

/**
 * Creates a {@link MemoizeAsyncCache} using a {@link Deno.Kv} store.
 *
 * Both arguments and results are stored as is.
 * Note that the arguments must be a [valid KV key](https://docs.deno.com/deploy/kv/manual/key_space#keys)
 * and the results must be a [valid KV value](https://docs.deno.com/deploy/kv/manual/key_space#values).
 *
 * @template A Arguments tuple type.
 * @template R Result type.
 */
export function denoKvCache<
  A extends Deno.KvKey,
  R extends NonNullable<unknown>,
>(
  db: Deno.Kv,
  keyPrefix: Deno.KvKey,
  options?: DenoKvCacheOptions<A, R>,
): MemoizeAsyncCache<A, R> {
  return {
    async get(key) {
      const entry = await db.get<R>([...keyPrefix, ...key]);
      if (entry.versionstamp == null) return;
      return entry.value;
    },
    async set(key, value) {
      const expireIn = typeof options?.expireIn === "function"
        ? options.expireIn(value, ...key)
        : options?.expireIn ?? undefined;
      await db.set(
        [...keyPrefix, ...key],
        value,
        expireIn != null ? { expireIn } : undefined,
      );
    },
    async delete(key) {
      await db.delete([...keyPrefix, ...key]);
    },
  };
}
