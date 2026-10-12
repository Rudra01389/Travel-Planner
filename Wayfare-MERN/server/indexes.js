import { isDeepStrictEqual } from "node:util";

function compatible(existing, keys, options) {
  if (!isDeepStrictEqual(Object.entries(existing.key), Object.entries(keys)))
    return false;
  for (const option of ["unique", "sparse", "hidden"]) {
    if (Boolean(existing[option]) !== Boolean(options[option])) return false;
  }
  for (const option of ["expireAfterSeconds", "partialFilterExpression"]) {
    if (!isDeepStrictEqual(existing[option], options[option])) return false;
  }
  if (!options.collation)
    return !existing.collation || existing.collation.locale === "simple";
  return isDeepStrictEqual(existing.collation, options.collation);
}

async function listIndexes(collection) {
  try {
    return await collection.listIndexes().toArray();
  } catch (error) {
    if (error.code === 26) return [];
    throw error;
  }
}

// Reuse compatible definitions regardless of index name. Never drop indexes.
export async function ensureModelIndexes(models) {
  for (const model of models) {
    await model.init();
    let existing = await listIndexes(model.collection);
    for (const [keys, options] of model.schema.indexes()) {
      if (existing.some((index) => compatible(index, keys, options))) continue;
      try {
        await model.collection.createIndex(keys, options);
      } catch (error) {
        if (![85, 86].includes(error.code)) throw error;
        existing = await listIndexes(model.collection);
        if (!existing.some((index) => compatible(index, keys, options)))
          throw error;
      }
      existing = await listIndexes(model.collection);
    }
  }
}
