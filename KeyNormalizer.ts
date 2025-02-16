/**
 * Normalizer function for memoization caches that need to stringify keys.
 */
export type KeyNormalizer<in T> = (this: void, key: T) => string;

/**
 * Initializes a smart normalizer for memoization caches that need to stringify keys.
 *
 * Uses {@link JSON.stringify} with custom support for common types.
 * Supports {@link BigInt}, {@link Uint8Array}, {@link ArrayBuffer}, {@link Date}, {@link URL}, {@link Map}, {@link Set}, {@link RegExp}.
 */
export function smartKeyNormalizer<T>(): KeyNormalizer<T> {
  return (key) => {
    return JSON.stringify(key, (_key, value) => {
      switch (true) {
        case typeof value === "bigint":
          return value.toString();
        case value instanceof Uint8Array:
          return Array.from(value);
        case value instanceof ArrayBuffer:
          return Array.from(new Uint8Array(value));
        case value instanceof Map:
          return Object.fromEntries(
            Array.from(value).sort((a, b) => a[0] < b[0] ? -1 : 1),
          );
        case value instanceof Set:
          return Array.from(value).sort();
        case value instanceof RegExp:
          return value.toString();
        default:
          return value;
      }
    });
  };
}
