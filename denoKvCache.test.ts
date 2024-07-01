import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { memoizeAsync } from "./memoizeAsync.ts";
import { denoKvCache } from "./denoKvCache.ts";

const db = await Deno.openKv();

Deno.test("works with async memoize", async () => {
  let counter = 0;

  const fn = (...args: (string | number | boolean)[]) => {
    counter++;
    return args.join(" ");
  };

  const memoFn = memoizeAsync(fn, {
    cache: denoKvCache(db, ["async"]),
  });

  assertObjectMatch(await db.get(["async", "a", "b"]), { versionstamp: null });
  assertEquals(await memoFn("a", "b"), "a b");
  assertEquals(counter, 1);
  assertObjectMatch(await db.get(["async", "a", "b"]), { value: "a b" });

  assertEquals(await memoFn("a", "b"), "a b");
  assertEquals(counter, 1);

  assertObjectMatch(await db.get(["async", 1, 2, 3]), { versionstamp: null });
  assertEquals(await memoFn(1, 2, 3), "1 2 3");
  assertEquals(counter, 2);
  assertObjectMatch(await db.get(["async", 1, 2, 3]), { value: "1 2 3" });

  assertEquals(await memoFn(1, 2, 3), "1 2 3");
  assertEquals(counter, 2);
});

Deno.test("accepts bigint args", async () => {
  const fn = (a: bigint) => {
    return Number(a);
  };

  const memoFn = memoizeAsync(fn, {
    cache: denoKvCache(db, ["arg", "bigint"]),
  });

  assertObjectMatch(await db.get(["arg", "bigint", 1n]), {
    versionstamp: null,
  });
  assertEquals(await memoFn(1n), 1);
  assertObjectMatch(await db.get(["arg", "bigint", 1n]), { value: 1 });

  assertObjectMatch(await db.get(["arg", "bigint", 2n]), {
    versionstamp: null,
  });
  assertEquals(await memoFn(2n), 2);
  assertObjectMatch(await db.get(["arg", "bigint", 2n]), { value: 2 });
});

Deno.test("accepts UInt8Array args", async () => {
  const fn = (a: Uint8Array) => {
    return a.byteLength;
  };

  const memoFn = memoizeAsync(fn, {
    cache: denoKvCache(db, ["arg", "uint8array"]),
  });

  assertObjectMatch(
    await db.get(["arg", "uint8array", new Uint8Array([1, 2, 3])]),
    { versionstamp: null },
  );
  assertEquals(await memoFn(new Uint8Array([1, 2, 3])), 3);
  assertObjectMatch(
    await db.get(["arg", "uint8array", new Uint8Array([1, 2, 3])]),
    { value: 3 },
  );

  assertObjectMatch(
    await db.get(["arg", "uint8array", new Uint8Array([4, 5, 6])]),
    { versionstamp: null },
  );
  assertEquals(await memoFn(new Uint8Array([4, 5, 6])), 3);
  assertObjectMatch(
    await db.get(["arg", "uint8array", new Uint8Array([4, 5, 6])]),
    { value: 3 },
  );
});

Deno.test("caches object values", async () => {
  const fn = (a: Deno.KvKeyPart) => {
    return { a: [a] };
  };

  const memoFn = memoizeAsync(fn, {
    cache: denoKvCache(db, ["val", "object"]),
  });

  assertObjectMatch(await db.get(["val", "object", true]), {
    versionstamp: null,
  });
  assertEquals(await memoFn(true), { a: [true] });
  assertObjectMatch(await db.get(["val", "object", true]), {
    value: { a: [true] },
  });
});

Deno.test("caches bigint values", async () => {
  const fn = (a: number) => {
    return BigInt(a);
  };

  const memoFn = memoizeAsync(fn, {
    cache: denoKvCache(db, ["val", "bigint"]),
  });

  assertObjectMatch(await db.get(["val", "bigint", 1]), { versionstamp: null });
  assertEquals(await memoFn(1), 1n);
  assertObjectMatch(await db.get(["val", "bigint", 1]), { value: 1n });
});

Deno.test("caches Date values", async () => {
  const fn = (a: number) => {
    return new Date(a);
  };

  const memoFn = memoizeAsync(fn, {
    cache: denoKvCache(db, ["val", "date"]),
  });

  assertObjectMatch(await db.get(["val", "date", 1]), { versionstamp: null });
  assertEquals(await memoFn(1), new Date(1));
  assertObjectMatch(await db.get(["val", "date", 1]), { value: new Date(1) });
});

Deno.test("caches UInt8Array values", async () => {
  const fn = (a: number) => {
    return new Uint8Array([a]);
  };

  const memoFn = memoizeAsync(fn, {
    cache: denoKvCache(db, ["val", "uint8array"]),
  });

  assertObjectMatch(await db.get(["val", "uint8array", 1]), {
    versionstamp: null,
  });
  assertEquals(await memoFn(1), new Uint8Array([1]));
  assertObjectMatch(await db.get(["val", "uint8array", 1]), {
    value: new Uint8Array([1]),
  });
});

Deno.test("caches ArrayBuffer values", async () => {
  const fn = (a: number) => {
    return new Uint8Array([a]).buffer;
  };

  const memoFn = memoizeAsync(fn, {
    cache: denoKvCache(db, ["val", "arraybuffer"]),
  });

  assertObjectMatch(await db.get(["val", "arraybuffer", 1]), {
    versionstamp: null,
  });
  assertEquals(await memoFn(1), new Uint8Array([1]).buffer);
  assertObjectMatch(await db.get(["val", "arraybuffer", 1]), {
    value: new Uint8Array([1]).buffer,
  });
});

Deno.test("deletes entries when nullish", async () => {
  let counter = 0;

  const fn = (value: number) => {
    counter++;
    if (counter > 1) return undefined;
    return value;
  };

  const memoFn = memoizeAsync(fn, {
    cache: denoKvCache(db, ["nullish"]),
    shouldRecalculate: () => true,
  });

  assertObjectMatch(await db.get(["nullish", 1]), { versionstamp: null });
  assertEquals(await memoFn(1), 1);
  assertObjectMatch(await db.get(["nullish", 1]), { value: 1 });
  assertEquals(await memoFn(1), undefined);
  assertObjectMatch(await db.get(["nullish", 1]), { versionstamp: null });
});

// clear db after tests
for await (const entry of db.list({ prefix: [] })) {
  await db.delete(entry.key);
}
