import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { memoize } from "./memoize.ts";
import { smartKeyNormalizer } from "./KeyNormalizer.ts";
import { memoryCache } from "./memoryCache.ts";

Deno.test("accepts bigint args", () => {
  const fn = (a: bigint) => {
    return Number(a);
  };

  const map = new Map<string, number>();

  const memoFn = memoize(fn, {
    cache: memoryCache({ map, keyNormalizer: smartKeyNormalizer() }),
  });

  assertEquals(map.get('["1"]'), undefined);
  assertEquals(memoFn(1n), 1);
  assertEquals(map.get('["1"]'), 1);

  assertEquals(map.get('["2"]'), undefined);
  assertEquals(memoFn(2n), 2);
  assertEquals(map.get('["2"]'), 2);
});

Deno.test("accepts Map args", () => {
  const fn = (a: Map<string, number>) => {
    return a.size;
  };

  const map = new Map<string, number>();

  const memoFn = memoize(fn, {
    cache: memoryCache({ map, keyNormalizer: smartKeyNormalizer() }),
  });

  assertEquals(map.get('[{"a":1,"b":2}]'), undefined);
  assertEquals(
    memoFn(
      new Map([
        ["a", 1],
        ["b", 2],
      ]),
    ),
    2,
  );
  assertEquals(map.get('[{"a":1,"b":2}]'), 2);

  assertEquals(map.get('[{"c":3}]'), undefined);
  assertEquals(memoFn(new Map([["c", 3]])), 1);
  assertEquals(map.get('[{"c":3}]'), 1);
});

Deno.test("accepts Set args", () => {
  const fn = (a: Set<number>) => {
    return a.size;
  };

  const map = new Map<string, number>();

  const memoFn = memoize(fn, {
    cache: memoryCache({ map, keyNormalizer: smartKeyNormalizer() }),
  });

  assertEquals(map.get("[[1,2]]"), undefined);
  assertEquals(memoFn(new Set([1, 2])), 2);
  assertEquals(map.get("[[1,2]]"), 2);

  assertEquals(map.get("[[3]]"), undefined);
  assertEquals(memoFn(new Set([3])), 1);
  assertEquals(map.get("[[3]]"), 1);
});

Deno.test("accepts UInt8Array args", () => {
  const fn = (a: Uint8Array) => {
    return a.byteLength;
  };

  const map = new Map<string, number>();

  const memoFn = memoize(fn, {
    cache: memoryCache({ map, keyNormalizer: smartKeyNormalizer() }),
  });

  assertEquals(map.get("[[1,2,3]]"), undefined);
  assertEquals(memoFn(new Uint8Array([1, 2, 3])), 3);
  assertEquals(map.get("[[1,2,3]]"), 3);

  assertEquals(map.get("[[4,5,6]]"), undefined);
  assertEquals(memoFn(new Uint8Array([4, 5, 6])), 3);
  assertEquals(map.get("[[4,5,6]]"), 3);
});

Deno.test("accepts ArrayBuffer args", () => {
  const fn = (a: ArrayBuffer) => {
    return new Uint8Array(a).byteLength;
  };

  const map = new Map<string, number>();

  const memoFn = memoize(fn, {
    cache: memoryCache({ map, keyNormalizer: smartKeyNormalizer() }),
  });

  assertEquals(map.get("[[0,0,0]]"), undefined);
  assertEquals(memoFn(new ArrayBuffer(3)), 3);
  assertEquals(map.get("[[0,0,0]]"), 3);

  assertEquals(map.get("[[0,0,0,0]]"), undefined);
  assertEquals(memoFn(new ArrayBuffer(4)), 4);
  assertEquals(map.get("[[0,0,0,0]]"), 4);
});
