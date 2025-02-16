import { assertEquals } from "@std/assert";
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

  assertEquals(map.get('[{"foo":321,"bar":123}]'), undefined);
  assertEquals(map.get('[{"bar":123,"foo":321}]'), undefined);
  assertEquals(
    memoFn(
      new Map([
        ["foo", 321],
        ["bar", 123],
      ]),
    ),
    2,
  );
  assertEquals(map.get('[{"foo":321,"bar":123}]'), undefined);
  assertEquals(map.get('[{"bar":123,"foo":321}]'), 2);

  assertEquals(map.get('[{"c":3}]'), undefined);
  assertEquals(memoFn(new Map([["c", 3]])), 1);
  assertEquals(map.get('[{"c":3}]'), 1);
});

Deno.test("accepts Set args", () => {
  const fn = (a: Set<number>) => {
    return a.size > 0 ? a.size : null;
  };

  const map = new Map<string, number>();

  const memoFn = memoize(fn, {
    cache: memoryCache({ map, keyNormalizer: smartKeyNormalizer() }),
  });

  assertEquals(map.get("[[1,2]]"), undefined);
  assertEquals(memoFn(new Set([1, 2])), 2);
  assertEquals(map.get("[[1,2]]"), 2);
  assertEquals(memoFn(new Set([2, 1])), 2);

  assertEquals(map.get("[[10,20,30]]"), undefined);
  assertEquals(map.get("[[30,20,10]]"), undefined);
  assertEquals(memoFn(new Set([30, 20, 10])), 3);
  assertEquals(map.get("[[10,20,30]]"), 3);
  assertEquals(map.get("[[30,20,10]]"), undefined);

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

Deno.test("accepts URL args", () => {
  const fn = (a: URL) => {
    return a.origin;
  };

  const map = new Map<string, string>();

  const memoFn = memoize(fn, {
    cache: memoryCache({ map, keyNormalizer: smartKeyNormalizer() }),
  });

  assertEquals(map.get('["https://example.com/foo"]'), undefined);
  assertEquals(
    memoFn(new URL("https://example.com/foo")),
    "https://example.com",
  );
  assertEquals(map.get('["https://example.com/foo"]'), "https://example.com");

  assertEquals(map.get('["https://example.com/bar"]'), undefined);
  assertEquals(
    memoFn(new URL("https://example.com/bar")),
    "https://example.com",
  );
  assertEquals(map.get('["https://example.com/bar"]'), "https://example.com");
});

Deno.test("accepts Date args", () => {
  const fn = (a: Date, b: Date) => {
    return a.getUTCFullYear() + b.getUTCFullYear();
  };

  const map = new Map<string, number>();

  const memoFn = memoize(fn, {
    cache: memoryCache({ map, keyNormalizer: smartKeyNormalizer() }),
  });

  assertEquals(
    map.get('["2000-01-01T00:00:00.000Z","2000-01-01T00:00:00.000Z"]'),
    undefined,
  );
  assertEquals(
    memoFn(new Date("2000-01-01T00:00:00Z"), new Date("2000-01-01T00:00:00Z")),
    4000,
  );
  assertEquals(
    map.get('["2000-01-01T00:00:00.000Z","2000-01-01T00:00:00.000Z"]'),
    4000,
  );

  assertEquals(
    map.get('["2010-02-01T00:00:00.000Z","2020-03-01T00:00:00.000Z"]'),
    undefined,
  );
  assertEquals(
    memoFn(new Date("2010-02-01T00:00:00Z"), new Date("2020-03-01T00:00:00Z")),
    4030,
  );
  assertEquals(
    map.get('["2010-02-01T00:00:00.000Z","2020-03-01T00:00:00.000Z"]'),
    4030,
  );
});

Deno.test("accepts RegExp args", () => {
  const fn = (a: RegExp, b: RegExp) => {
    return a.source + b.source;
  };

  const map = new Map<string, string>();

  const memoFn = memoize(fn, {
    cache: memoryCache({ map, keyNormalizer: smartKeyNormalizer() }),
  });

  assertEquals(
    map.get('["/^foo/","/^bar/"]'),
    undefined,
  );
  assertEquals(
    memoFn(new RegExp("^foo"), new RegExp("^bar")),
    "^foo^bar",
  );
  assertEquals(
    map.get('["/^foo/","/^bar/"]'),
    "^foo^bar",
  );

  assertEquals(
    map.get('["/^foo/g","/^bar/g"]'),
    undefined,
  );
  assertEquals(
    memoFn(new RegExp("^foo", "g"), new RegExp("^bar", "g")),
    "^foo^bar",
  );
  assertEquals(
    map.get('["/^foo/g","/^bar/g"]'),
    "^foo^bar",
  );
});
