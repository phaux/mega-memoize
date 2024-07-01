// deno-lint-ignore-file require-await
import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { delay } from "https://deno.land/std@0.224.0/async/mod.ts";
import { memoizeAsync } from "./memoizeAsync.ts";

Deno.test("allows sync fn", async () => {
  const fn = (a: unknown) => a;
  const memoFn = memoizeAsync(fn);
  assertEquals(await memoFn({}), {});
});

Deno.test("accepts primitive args", async () => {
  let counter = 0;

  const fn = async (a: string, b: number, c: boolean) => {
    counter++;
    return a + b + c;
  };

  const memoFn = memoizeAsync(fn);

  assertEquals(await memoFn("a", 1, true), "a1true");
  assertEquals(counter, 1);

  assertEquals(await memoFn("a", 1, true), "a1true");
  assertEquals(counter, 1);

  assertEquals(await memoFn("b", 2, false), "b2false");
  assertEquals(counter, 2);

  assertEquals(await memoFn("b", 2, false), "b2false");
  assertEquals(counter, 2);
});

Deno.test("accepts variadic args", async () => {
  let counter = 0;

  const fn = async (...args: (string | number | boolean)[]) => {
    counter++;
    return args.join(" ");
  };

  const memoFn = memoizeAsync(fn);

  assertEquals(await memoFn("a", "b"), "a b");
  assertEquals(counter, 1);
  assertEquals(await memoFn("a", "b"), "a b");
  assertEquals(counter, 1);

  assertEquals(await memoFn(1, 2, 3), "1 2 3");
  assertEquals(counter, 2);
  assertEquals(await memoFn(1, 2, 3), "1 2 3");
  assertEquals(counter, 2);
});

Deno.test("never caches nullish results", async () => {
  let counter = 0;

  const fn = async (value: string) => {
    counter++;
    if (value === "undefined") return undefined;
    if (value === "null") return null;
    return value;
  };

  const memoFn = memoizeAsync(fn);

  assertEquals(await memoFn("undefined"), undefined);
  assertEquals(counter, 1);
  assertEquals(await memoFn("undefined"), undefined);
  assertEquals(counter, 2);

  assertEquals(await memoFn("null"), null);
  assertEquals(counter, 3);
  assertEquals(await memoFn("null"), null);
  assertEquals(counter, 4);

  assertEquals(await memoFn("defined"), "defined");
  assertEquals(counter, 5);
  assertEquals(await memoFn("defined"), "defined");
  assertEquals(counter, 5);
});

Deno.test("deletes entries when nullish", async () => {
  let deleted: unknown;
  let counter = 0;

  const fn = async (value: number) => {
    counter++;
    if (counter > 1) return undefined;
    return value;
  };

  const memoFn = memoizeAsync(fn, {
    cache: {
      async get() {
        return undefined;
      },
      async set() {},
      async delete(key) {
        deleted = key[0];
      },
    },
  });

  assertEquals(await memoFn(1), 1);
  assertEquals(counter, 1);
  assertEquals(deleted, undefined);

  assertEquals(await memoFn(1), undefined);
  assertEquals(counter, 2);
  assertEquals(deleted, 1);
});

Deno.test("always recalculates nullish results", async () => {
  let counter = 0;

  const fn = async (_value: number) => {
    counter++;
    return 0;
  };

  const memoFn = memoizeAsync(fn, {
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

  assertEquals(await memoFn(1), 1);
  assertEquals(counter, 0);

  assertEquals(await memoFn(0), 0);
  assertEquals(counter, 1);

  assertEquals(await memoFn(0), 0);
  assertEquals(counter, 2);

  assertEquals(await memoFn(-1), 0);
  assertEquals(counter, 3);
});

Deno.test("works with custom shouldCache", async () => {
  let counter = 0;

  const fn = async (a: string, b: string) => {
    counter++;
    return a + b;
  };

  const memoFn = memoizeAsync(fn, {
    shouldCache: (result, _a, _b) => result.length >= 3,
  });

  assertEquals(await memoFn("a", "b"), "ab");
  assertEquals(counter, 1);

  assertEquals(await memoFn("a", "b"), "ab");
  assertEquals(counter, 2);

  assertEquals(await memoFn("foo", "bar"), "foobar");
  assertEquals(counter, 3);

  assertEquals(await memoFn("foo", "bar"), "foobar");
  assertEquals(counter, 3);
});

Deno.test("works with custom shouldRecalculate", async () => {
  let counter = 0;

  const fn = async (a: number, b: number) => {
    counter++;
    return a + b;
  };

  const memoFn = memoizeAsync(fn, {
    shouldRecalculate: (_result, a, b) => a === 0 || b === 0,
    cache: {
      get() {
        return 0;
      },
      set() {},
      delete() {},
    },
  });

  assertEquals(await memoFn(0, 1), 1);
  assertEquals(counter, 1);

  assertEquals(await memoFn(3, 0), 3);
  assertEquals(counter, 2);

  assertEquals(await memoFn(1, 2), 0);
  assertEquals(counter, 2);
});

Deno.test("never caches on reject", async () => {
  let counter = 0;

  const fn = async (a: boolean) => {
    counter++;
    if (a) throw new Error("test");
    return a;
  };

  const memoFn = memoizeAsync(fn);

  assertEquals(await memoFn(false), false);
  assertEquals(counter, 1);

  await assertRejects(() => memoFn(true), Error, "test");
  assertEquals(counter, 2);

  await assertRejects(() => memoFn(true), Error, "test");
  assertEquals(counter, 3);
});

Deno.test("returns the same promise for concurrent calls", async () => {
  let counter = 0;

  const fn = async (a: unknown) => {
    await delay(100);
    counter++;
    return a;
  };

  const memoFn = memoizeAsync(fn);

  const promises = [memoFn(1), memoFn(1), memoFn("a"), memoFn("a")];

  const results = await Promise.all(promises);

  assertEquals(results, [1, 1, "a", "a"]);
  assertEquals(counter, 2);
});
