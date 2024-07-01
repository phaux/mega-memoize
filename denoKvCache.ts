import { smartKeyNormalizer } from "./KeyNormalizer.ts";
import type { MemoizeAsyncCache } from "./memoizeAsync.ts";
import { memoryCache } from "./memoryCache.ts";

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
export function denoKvCache<A extends Deno.KvKey, R>(
  db: Deno.Kv,
  keyPrefix: Deno.KvKey,
): MemoizeAsyncCache<A, R> {
  return {
    async get(key) {
      const entry = await db.get<R>([...keyPrefix, ...key]);
      if (entry.versionstamp == null) return;
      return entry.value;
    },
    async set(key, value) {
      await db.set([...keyPrefix, ...key], value);
    },
    async delete(key) {
      await db.delete([...keyPrefix, ...key]);
    },

    promiseCache: () =>
      memoryCache<A, Promise<R>>({
        keyNormalizer: smartKeyNormalizer(),
      }),
  };
}
