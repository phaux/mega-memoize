import { assertEquals } from "@std/assert";
import { memoize } from "./memoize.ts";
import { domStorageCache } from "./domStorageCache.ts";
import { smartValueSerializer } from "./ValueSerializer.ts";

Deno.test("caches primitive values", () => {
  let counter = 0;

  const fn = (a: string, b: number, c: boolean) => {
    counter++;
    return [{ a, b, c }];
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:primitive", {
      valueSerializer: smartValueSerializer(),
    }),
  });

  assertEquals(sessionStorage.getItem('val:primitive["a",1,true]'), null);
  assertEquals(memoFn("a", 1, true), [{ a: "a", b: 1, c: true }]);
  assertEquals(
    sessionStorage.getItem('val:primitive["a",1,true]'),
    '[{"a":"a","b":1,"c":true}]',
  );
  assertEquals(memoFn("a", 1, true), [{ a: "a", b: 1, c: true }]);
});

Deno.test("caches bigint values", () => {
  const fn = (a: number) => {
    return BigInt(a);
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:bigint", {
      valueSerializer: smartValueSerializer(),
    }),
  });

  assertEquals(sessionStorage.getItem("val:bigint[1]"), null);
  assertEquals(memoFn(1), 1n);
  assertEquals(sessionStorage.getItem("val:bigint[1]"), '{"$bigint":"1"}');
  assertEquals(memoFn(1), 1n);
});

Deno.test("caches Date values (turns to string)", () => {
  const fn = (a: number): Date | string => {
    return new Date(a);
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:date", {
      valueSerializer: smartValueSerializer(),
    }),
  });

  assertEquals(sessionStorage.getItem("val:date[1]"), null);
  assertEquals(memoFn(1), new Date(1));
  assertEquals(
    sessionStorage.getItem("val:date[1]"),
    '"1970-01-01T00:00:00.001Z"',
  );
  assertEquals(memoFn(1), "1970-01-01T00:00:00.001Z");
});

Deno.test("caches RegExp values", () => {
  const fn = (a: number, f: string): RegExp | string => {
    return new RegExp(`^${a}$`, f);
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:regexp", {
      valueSerializer: smartValueSerializer(),
    }),
  });

  assertEquals(sessionStorage.getItem('val:regexp[1,"g"]'), null);
  assertEquals(memoFn(1, "g"), /^1$/g);
  assertEquals(
    sessionStorage.getItem('val:regexp[1,"g"]'),
    '{"$regexp":{"s":"^1$","f":"g"}}',
  );
  assertEquals(memoFn(1, "g"), /^1$/g);

  assertEquals(sessionStorage.getItem('val:regexp[123,""]'), null);
  assertEquals(memoFn(123, ""), /^123$/);
  assertEquals(
    sessionStorage.getItem('val:regexp[123,""]'),
    '{"$regexp":{"s":"^123$","f":""}}',
  );
  assertEquals(memoFn(123, ""), /^123$/);
});

Deno.test("caches UInt8Array values", () => {
  const fn = (a: number) => {
    return new Uint8Array([a]);
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:uint8array", {
      valueSerializer: smartValueSerializer(),
    }),
  });

  assertEquals(sessionStorage.getItem("val:uint8array[1]"), null);
  assertEquals(memoFn(1), new Uint8Array([1]));
  assertEquals(
    sessionStorage.getItem("val:uint8array[1]"),
    '{"$uint8array":[1]}',
  );
  assertEquals(memoFn(1), new Uint8Array([1]));
});

Deno.test("caches ArrayBuffer values", () => {
  const fn = (a: number) => {
    return new Uint8Array([a]).buffer;
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:arraybuffer", {
      valueSerializer: smartValueSerializer(),
    }),
  });

  assertEquals(sessionStorage.getItem("val:arraybuffer[1]"), null);
  assertEquals(memoFn(1), new Uint8Array([1]).buffer);
  assertEquals(
    sessionStorage.getItem("val:arraybuffer[1]"),
    '{"$arraybuffer":[1]}',
  );
  assertEquals(memoFn(1), new Uint8Array([1]).buffer);
});

Deno.test("caches Map values", () => {
  const fn = (a: number, b: string) => {
    return new Map<unknown, unknown>([
      [a, b],
      [b, a],
    ]);
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:map", {
      valueSerializer: smartValueSerializer(),
    }),
  });

  assertEquals(sessionStorage.getItem('val:map[1,"b"]'), null);
  assertEquals(
    memoFn(1, "b"),
    new Map<unknown, unknown>([
      [1, "b"],
      ["b", 1],
    ]),
  );
  assertEquals(
    sessionStorage.getItem('val:map[1,"b"]'),
    '{"$map":[[1,"b"],["b",1]]}',
  );
  assertEquals(
    memoFn(1, "b"),
    new Map<unknown, unknown>([
      [1, "b"],
      ["b", 1],
    ]),
  );
});

Deno.test("caches Set values", () => {
  const fn = (a: number, b: string) => {
    return new Set<unknown>([a, b]);
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:set", {
      valueSerializer: smartValueSerializer(),
    }),
  });

  assertEquals(sessionStorage.getItem('val:set[1,"b"]'), null);
  assertEquals(memoFn(1, "b"), new Set([1, "b"]));
  assertEquals(sessionStorage.getItem('val:set[1,"b"]'), '{"$set":[1,"b"]}');
  assertEquals(memoFn(1, "b"), new Set([1, "b"]));
});

Deno.test("caches URL values (turns into string)", () => {
  const fn = (a: number, b: string): URL | string => {
    return new URL(`https://example.com/${a}/${b}`);
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:url", {
      valueSerializer: smartValueSerializer(),
    }),
  });

  assertEquals(sessionStorage.getItem('val:url[1,"b"]'), null);
  assertEquals(memoFn(1, "b"), new URL("https://example.com/1/b"));
  assertEquals(
    sessionStorage.getItem('val:url[1,"b"]'),
    '"https://example.com/1/b"',
  );
  assertEquals(memoFn(1, "b"), "https://example.com/1/b");
});

Deno.test("caches URLSearchParams", () => {
  const fn = (...p: [string, string][]) => {
    return new URLSearchParams(p);
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:urlsearchparams", {
      valueSerializer: smartValueSerializer(),
    }),
  });

  assertEquals(sessionStorage.getItem('val:urlsearchparams[["a","b"]]'), null);
  assertEquals(memoFn(["a", "b"]), new URLSearchParams([["a", "b"]]));
  assertEquals(
    sessionStorage.getItem('val:urlsearchparams[["a","b"]]'),
    '{"$urlsearchparams":"a=b"}',
  );
  assertEquals(memoFn(["a", "b"]), new URLSearchParams([["a", "b"]]));

  assertEquals(
    sessionStorage.getItem('val:urlsearchparams[["a","1"],["a","2"]]'),
    null,
  );
  assertEquals(
    memoFn(["a", "1"], ["a", "2"]),
    new URLSearchParams([["a", "1"], ["a", "2"]]),
  );
  assertEquals(
    sessionStorage.getItem('val:urlsearchparams[["a","1"],["a","2"]]'),
    '{"$urlsearchparams":"a=1&a=2"}',
  );
});

Deno.test("caches complex values", () => {
  const fn = (a: boolean) => {
    return [
      {
        a: new Map([["a", new Set([BigInt(a)])]]),
      },
    ];
  };

  const memoFn = memoize(fn, {
    cache: domStorageCache(sessionStorage, "val:complex", {
      valueSerializer: smartValueSerializer(),
    }),
  });

  assertEquals(sessionStorage.getItem("val:complex[true]"), null);
  assertEquals(memoFn(true), [{ a: new Map([["a", new Set([1n])]]) }]);
  assertEquals(
    sessionStorage.getItem("val:complex[true]"),
    '[{"a":{"$map":[["a",{"$set":[{"$bigint":"1"}]}]]}}]',
  );
  assertEquals(memoFn(true), [{ a: new Map([["a", new Set([1n])]]) }]);
});

// clear storage after tests
sessionStorage.clear();
