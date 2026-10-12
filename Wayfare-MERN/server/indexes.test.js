import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureModelIndexes } from "./indexes.js";
function fixture(indexes, definitions, create) {
  const calls = [];
  const model = {
    init: async () => {},
    schema: { indexes: () => definitions },
    collection: {
      listIndexes: () => ({ toArray: async () => indexes }),
      createIndex: async (keys, options) => {
        calls.push([keys, options]);
        if (create) return create(keys, options, indexes);
        indexes.push({ key: keys, ...options });
      },
    },
  };
  return { model, calls };
}
test("reuses users_email_unique instead of creating email_1", async () => {
  const f = fixture(
    [{ key: { email: 1 }, name: "users_email_unique", unique: true }],
    [[{ email: 1 }, { unique: true }]],
  );
  await ensureModelIndexes([f.model]);
  assert.equal(f.calls.length, 0);
});
test("creates missing unique and TTL indexes", async () => {
  const f = fixture(
    [],
    [
      [{ email: 1 }, { unique: true }],
      [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
    ],
  );
  await ensureModelIndexes([f.model]);
  assert.equal(f.calls.length, 2);
});
test("does not accept nonunique, partial, sparse, or differently expiring indexes", async () => {
  for (const existing of [
    { key: { email: 1 }, unique: false },
    { key: { email: 1 }, unique: true, sparse: true },
    {
      key: { email: 1 },
      unique: true,
      partialFilterExpression: { email: { $exists: true } },
    },
    { key: { email: 1 }, unique: true, expireAfterSeconds: 60 },
  ]) {
    const error = Object.assign(new Error("Conflict"), { code: 85 });
    const f = fixture([existing], [[{ email: 1 }, { unique: true }]], () => {
      throw error;
    });
    await assert.rejects(ensureModelIndexes([f.model]), error);
    assert.equal(f.calls.length, 1);
  }
});
test("accepts an equivalent index created concurrently under another name", async () => {
  const f = fixture(
    [],
    [[{ email: 1 }, { unique: true }]],
    (keys, options, indexes) => {
      indexes.push({ key: keys, ...options, name: "users_email_unique" });
      throw Object.assign(new Error("Conflict"), { code: 85 });
    },
  );
  await ensureModelIndexes([f.model]);
  assert.equal(f.calls.length, 1);
});
test("preserves ordering for compound index keys", async () => {
  const f = fixture(
    [{ key: { second: 1, first: 1 } }],
    [[{ first: 1, second: 1 }, {}]],
  );
  await ensureModelIndexes([f.model]);
  assert.equal(f.calls.length, 1);
});
