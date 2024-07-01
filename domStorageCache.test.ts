import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { memoize } from "./memoize.ts";
import { memoizeAsync } from "./memoizeAsync.ts";
import { domStorageCache } from "./domStorageCache.ts";

Deno.test("works with sync memoize", () => {
  let counter = 0;

  const fn = (a: string, b: number, c: boolean) => {
    counter++;
    return a + b + c;
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "sync"),
  });

  assertEquals(sessionStorage.getItem('sync["a",1,true]'), null);
  assertEquals(memoFn("a", 1, true), "a1true");
  assertEquals(counter, 1);
  assertEquals(sessionStorage.getItem('sync["a",1,true]'), '"a1true"');

  assertEquals(memoFn("a", 1, true), "a1true");
  assertEquals(counter, 1);

  assertEquals(sessionStorage.getItem('sync["b",2,false]'), null);
  assertEquals(memoFn("b", 2, false), "b2false");
  assertEquals(counter, 2);
  assertEquals(sessionStorage.getItem('sync["b",2,false]'), '"b2false"');

  assertEquals(memoFn("b", 2, false), "b2false");
  assertEquals(counter, 2);
});

Deno.test("works with async memoize", async () => {
  let counter = 0;

  const fn = (...args: (string | number | boolean)[]) => {
    counter++;
    return args.join(" ");
  };

  const memoFn = memoizeAsync(fn, {
    cache: domStorageCache(sessionStorage, "async"),
  });

  assertEquals(sessionStorage.getItem('async["a","b"]'), null);
  assertEquals(await memoFn("a", "b"), "a b");
  assertEquals(counter, 1);
  assertEquals(sessionStorage.getItem('async["a","b"]'), '"a b"');

  assertEquals(await memoFn("a", "b"), "a b");
  assertEquals(counter, 1);

  assertEquals(sessionStorage.getItem("async[1,2,3]"), null);
  assertEquals(await memoFn(1, 2, 3), "1 2 3");
  assertEquals(counter, 2);
  assertEquals(sessionStorage.getItem("async[1,2,3]"), '"1 2 3"');

  assertEquals(await memoFn(1, 2, 3), "1 2 3");
  assertEquals(counter, 2);
});

Deno.test("accepts object args", () => {
  const fn = (o: { a: string; b: number }, a: unknown[]) => {
    return `${o.a} ${o.b} ${a.length}`;
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "arg:object"),
  });

  assertEquals(
    sessionStorage.getItem('arg:object[{"a":"a","b":1},[true,null]]'),
    null,
  );
  assertEquals(memoFn({ a: "a", b: 1 }, [true, null]), "a 1 2");
  assertEquals(
    sessionStorage.getItem('arg:object[{"a":"a","b":1},[true,null]]'),
    '"a 1 2"',
  );

  assertEquals(
    sessionStorage.getItem('arg:object[{"a":"b","b":2},[false,{},[]]]'),
    null,
  );
  assertEquals(memoFn({ a: "b", b: 2 }, [false, {}, []]), "b 2 3");
  assertEquals(
    sessionStorage.getItem('arg:object[{"a":"b","b":2},[false,{},[]]]'),
    '"b 2 3"',
  );
});

Deno.test("accepts Date args", () => {
  const fn = (a: Date) => {
    return a.getTime();
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "arg:date"),
  });

  assertEquals(
    sessionStorage.getItem('arg:date["1970-01-01T00:00:00.000Z"]'),
    null,
  );
  assertEquals(memoFn(new Date(0)), 0);
  assertEquals(
    sessionStorage.getItem('arg:date["1970-01-01T00:00:00.000Z"]'),
    "0",
  );

  assertEquals(
    sessionStorage.getItem('arg:date["1970-01-01T00:00:00.001Z"]'),
    null,
  );
  assertEquals(memoFn(new Date(1)), 1);
  assertEquals(
    sessionStorage.getItem('arg:date["1970-01-01T00:00:00.001Z"]'),
    "1",
  );
});

Deno.test("caches object values", () => {
  const fn = (a: unknown) => {
    return { a: [a] };
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:object"),
  });

  assertEquals(sessionStorage.getItem("val:object[null]"), null);
  assertEquals(memoFn(null), { a: [null] });
  assertEquals(sessionStorage.getItem("val:object[null]"), '{"a":[null]}');
});

Deno.test("deletes entries when nullish", () => {
  let counter = 0;

  const fn = (value: number) => {
    counter++;
    if (counter > 1) return undefined;
    return value;
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "nullish"),
    shouldRecalculate: () => true,
  });

  assertEquals(sessionStorage.getItem("nullish[1]"), null);
  assertEquals(memoFn(1), 1);
  assertEquals(sessionStorage.getItem("nullish[1]"), "1");
  assertEquals(memoFn(1), undefined);
  assertEquals(sessionStorage.getItem("nullish[1]"), null);
});

Deno.test("works with custom key stringifier", () => {
  const fn = (a: string | number) => {
    return !!a;
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "customKey", {
      keyNormalizer: ([key]) => String(key),
    }),
  });

  assertEquals(sessionStorage.getItem("customKey1"), null);
  assertEquals(memoFn("1"), true);
  assertEquals(sessionStorage.getItem("customKey1"), "true");

  assertEquals(sessionStorage.getItem("customKey0"), null);
  assertEquals(memoFn(0), false);
  assertEquals(sessionStorage.getItem("customKey0"), "false");
});

// clear storage after tests
sessionStorage.clear();
