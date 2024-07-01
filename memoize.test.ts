import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { memoize } from "./memoize.ts";

Deno.test("accepts primitive args", () => {
  let counter = 0;

  const fn = (a: string, b: number, c: boolean) => {
    counter++;
    return a + b + c;
  };

  const memoFn = memoize(fn);

  assertEquals(memoFn("a", 1, true), "a1true");
  assertEquals(counter, 1);

  assertEquals(memoFn("a", 1, true), "a1true");
  assertEquals(counter, 1);

  assertEquals(memoFn("b", 2, false), "b2false");
  assertEquals(counter, 2);

  assertEquals(memoFn("b", 2, false), "b2false");
  assertEquals(counter, 2);
});

Deno.test("accepts variadic args", () => {
  let counter = 0;

  const fn = (...args: (string | number | boolean)[]) => {
    counter++;
    return args.join(" ");
  };

  const memoFn = memoize(fn);

  assertEquals(memoFn("a", "b"), "a b");
  assertEquals(counter, 1);
  assertEquals(memoFn("a", "b"), "a b");
  assertEquals(counter, 1);

  assertEquals(memoFn(1, 2, 3), "1 2 3");
  assertEquals(counter, 2);
  assertEquals(memoFn(1, 2, 3), "1 2 3");
  assertEquals(counter, 2);
});

Deno.test("never caches nullish results", () => {
  let counter = 0;

  const fn = (value: string) => {
    counter++;
    if (value === "undefined") return undefined;
    if (value === "null") return null;
    return value;
  };

  const memoFn = memoize(fn);

  assertEquals(memoFn("undefined"), undefined);
  assertEquals(counter, 1);
  assertEquals(memoFn("undefined"), undefined);
  assertEquals(counter, 2);

  assertEquals(memoFn("null"), null);
  assertEquals(counter, 3);
  assertEquals(memoFn("null"), null);
  assertEquals(counter, 4);

  assertEquals(memoFn("defined"), "defined");
  assertEquals(counter, 5);
  assertEquals(memoFn("defined"), "defined");
  assertEquals(counter, 5);
});

Deno.test("deletes entries when nullish", () => {
  let deleted: unknown;
  let counter = 0;

  const fn = (value: number) => {
    counter++;
    if (counter > 1) return undefined;
    return value;
  };

  const memoFn = memoize(fn, {
    cache: {
      get() {
        return undefined;
      },
      set() {},
      delete(key) {
        deleted = key[0];
      },
    },
  });

  assertEquals(memoFn(1), 1);
  assertEquals(counter, 1);
  assertEquals(deleted, undefined);

  assertEquals(memoFn(1), undefined);
  assertEquals(counter, 2);
  assertEquals(deleted, 1);
});

Deno.test("always recalculates nullish results", () => {
  let counter = 0;

  const fn = (_value: number) => {
    counter++;
    return 0;
  };

  const memoFn = memoize(fn, {
    cache: {
      get(key) {
        if (key[0] === 0) return undefined;
        if (key[0] < 0) return null;
        return key[0];
      },
      set() {},
      delete() {},
    },
  });

  assertEquals(memoFn(1), 1);
  assertEquals(counter, 0);

  assertEquals(memoFn(0), 0);
  assertEquals(counter, 1);

  assertEquals(memoFn(0), 0);
  assertEquals(counter, 2);

  assertEquals(memoFn(-1), 0);
  assertEquals(counter, 3);
});

Deno.test("works with custom shouldCache", () => {
  let counter = 0;

  const fn = (a: string, b: string) => {
    counter++;
    return a + b;
  };

  const memoFn = memoize(fn, {
    shouldCache: (result, _a, _b) => result.length >= 3,
  });

  assertEquals(memoFn("a", "b"), "ab");
  assertEquals(counter, 1);

  assertEquals(memoFn("a", "b"), "ab");
  assertEquals(counter, 2);

  assertEquals(memoFn("foo", "bar"), "foobar");
  assertEquals(counter, 3);

  assertEquals(memoFn("foo", "bar"), "foobar");
  assertEquals(counter, 3);
});

Deno.test("works with custom shouldRecalculate", () => {
  let counter = 0;

  const fn = (a: number, b: number) => {
    counter++;
    return a + b;
  };

  const memoFn = memoize(fn, {
    shouldRecalculate: (_result, a, b) => a === 0 || b === 0,
    cache: {
      get() {
        return 0;
      },
      set() {},
      delete() {},
    },
  });

  assertEquals(memoFn(0, 1), 1);
  assertEquals(counter, 1);

  assertEquals(memoFn(3, 0), 3);
  assertEquals(counter, 2);

  assertEquals(memoFn(1, 2), 0);
  assertEquals(counter, 2);
});

Deno.test("never caches on throw", () => {
  let counter = 0;

  const fn = (a: boolean) => {
    counter++;
    if (a) throw new Error("test");
    return a;
  };

  const memoFn = memoize(fn);

  assertEquals(memoFn(false), false);
  assertEquals(counter, 1);

  assertThrows(() => memoFn(true), Error, "test");
  assertEquals(counter, 2);

  assertThrows(() => memoFn(true), Error, "test");
  assertEquals(counter, 3);
});
