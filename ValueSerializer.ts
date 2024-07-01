/**
 * Serializer/deserializer interface for memoization caches that need to serialize values.
 */
export interface ValueSerializer<T> {
  parse: (this: void, value: string) => T;
  stringify: (this: void, value: T) => string;
}

/**
 * Initializes a smart serializer/deserializer for memoization caches that need to serialize values.
 *
 * Uses {@link JSON.stringify} and {@link JSON.parse} with custom support for common types.
 * Supports {@link BigInt}, {@link Uint8Array}, {@link ArrayBuffer}, {@link Map}, and {@link Set}.
 *
 * Note that {@link Date} is already supported by {@link JSON}, but it always serializes to a string and can't be deserialized back to a Date.
 */
export function smartValueSerializer<T>(): ValueSerializer<T> {
  return {
    parse(string) {
      return JSON.parse(string, (_key, value) => {
        if (typeof value == "object" && value != null) {
          switch (true) {
            case "$bigint" in value:
              return BigInt(value.$bigint);
            case "$uint8array" in value:
              return new Uint8Array(value.$uint8array);
            case "$arraybuffer" in value:
              return new Uint8Array(value.$arraybuffer).buffer;
            case "$map" in value:
              return new Map(value.$map);
            case "$set" in value:
              return new Set(value.$set);
          }
        }
        return value;
      });
    },
    stringify(value) {
      return JSON.stringify(value, (_key, value) => {
        switch (true) {
          case typeof value === "bigint":
            return { $bigint: value.toString() };
          case value instanceof Uint8Array:
            return { $uint8array: Array.from(value) };
          case value instanceof ArrayBuffer:
            return { $arraybuffer: Array.from(new Uint8Array(value)) };
          case value instanceof Map:
            return { $map: Array.from(value) };
          case value instanceof Set:
            return { $set: Array.from(value) };
          default:
            return value;
        }
      });
    },
  };
}
