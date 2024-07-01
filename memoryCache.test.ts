import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { memoize } from "./memoize.ts";
import { memoizeAsync } from "./memoizeAsync.ts";
import { memoryCache } from "./memoryCache.ts";

Deno.test("works with sync memoize", () => {
  let counter = 0;

  const fn = (a: string, b: number, c: boolean) => {
    counter++;
    return a + b + c;
  };

  const memoFn = memoize(fn, { cache: memoryCache() });

  assertEquals(memoFn("a", 1, true), "a1true");
  assertEquals(counter, 1);
  assertEquals(memoFn("a", 1, true), "a1true");
  assertEquals(counter, 1);

  assertEquals(memoFn("b", 2, false), "b2false");
  assertEquals(counter, 2);
  assertEquals(memoFn("b", 2, false), "b2false");
  assertEquals(counter, 2);
});

Deno.test("works with async memoize", async () => {
  let counter = 0;

  const fn = (...args: (string | number | boolean)[]) => {
    counter++;
    return args.join(" ");
  };

  const memoFn = memoizeAsync(fn, { cache: memoryCache() });

  assertEquals(await memoFn("a", "b"), "a b");
  assertEquals(counter, 1);
  assertEquals(await memoFn("a", "b"), "a b");
  assertEquals(counter, 1);

  assertEquals(await memoFn(1, 2, 3), "1 2 3");
  assertEquals(counter, 2);
  assertEquals(await memoFn(1, 2, 3), "1 2 3");
  assertEquals(counter, 2);
});

Deno.test("accepts object args", () => {
  let counter = 0;

  const fn = (o: { a: string; b: number }, a: unknown[]) => {
    counter++;
    return `${o.a} ${o.b} ${a.length}`;
  };

  const memoFn = memoize(fn, { cache: memoryCache() });

  assertEquals(memoFn({ a: "a", b: 1 }, [true, null]), "a 1 2");
  assertEquals(counter, 1);
  assertEquals(memoFn({ a: "a", b: 1 }, [true, null]), "a 1 2");
  assertEquals(counter, 1);

  assertEquals(memoFn({ a: "b", b: 2 }, [false, {}, []]), "b 2 3");
  assertEquals(counter, 2);
  assertEquals(memoFn({ a: "b", b: 2 }, [false, {}, []]), "b 2 3");
  assertEquals(counter, 2);
});

Deno.test("accepts Date args", () => {
  let counter = 0;

  const fn = (a: Date) => {
    counter++;
    return a.getTime();
  };

  const memoFn = memoize(fn, { cache: memoryCache() });

  assertEquals(memoFn(new Date(0)), 0);
  assertEquals(counter, 1);
  assertEquals(memoFn(new Date(0)), 0);
  assertEquals(counter, 1);

  assertEquals(memoFn(new Date(1)), 1);
  assertEquals(counter, 2);
  assertEquals(memoFn(new Date(1)), 1);
  assertEquals(counter, 2);
});

Deno.test("caches object values by reference", () => {
  let counter = 0;

  const obj = { a: 1 };
  const arr = ["a"];
  const sym = Symbol();

  const fn = (a: "obj" | "arr" | "sym") => {
    counter++;
    if (a === "obj") return obj;
    if (a === "arr") return arr;
    return sym;
  };

  const memoFn = memoize(fn, { cache: memoryCache() });

  assert(memoFn("obj") === obj);
  assertEquals(counter, 1);
  assert(memoFn("obj") === obj);
  assertEquals(counter, 1);

  assert(memoFn("arr") === arr);
  assertEquals(counter, 2);
  assert(memoFn("arr") === arr);
  assertEquals(counter, 2);

  assert(memoFn("sym") === sym);
  assertEquals(counter, 3);
  assert(memoFn("sym") === sym);
  assertEquals(counter, 3);
});

Deno.test("works with custom key stringifier", () => {
  let counter = 0;

  const fn = (a: string | number) => {
    counter++;
    return !!a;
  };

  const memoFn = memoize(fn, {
    cache: memoryCache({
      map: new Map<string, boolean>(),
      keyNormalizer: ([key]) => String(key),
    }),
  });

  assertEquals(memoFn("1"), true);
  assertEquals(counter, 1);
  assertEquals(memoFn(1), true);
  assertEquals(counter, 1);

  assertEquals(memoFn(0), false);
  assertEquals(counter, 2);
  assertEquals(memoFn("0"), false);
  assertEquals(counter, 2);
});
