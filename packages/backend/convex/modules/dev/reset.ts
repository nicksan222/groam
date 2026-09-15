import schema from '#convex/schema';
import type { TableNames } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';

const DELETE_BATCH = 64;

async function clearTable(ctx: MutationCtx, table: TableNames): Promise<number> {
  let deleted = 0;
  for (;;) {
    const batch = await ctx.db.query(table).take(DELETE_BATCH);
    if (batch.length === 0) return deleted;
    await Promise.all(batch.map((document) => ctx.db.delete(document._id)));
    deleted += batch.length;
  }
}

/** Wipe every application table. Component tables stay on the CLI import path. */
export async function clearApplicationTables(ctx: MutationCtx): Promise<number> {
  const tables = Object.keys(schema.tables) as TableNames[];
  let cleared = 0;
  for (const table of tables) {
    cleared += await clearTable(ctx, table);
  }
  return cleared;
}
