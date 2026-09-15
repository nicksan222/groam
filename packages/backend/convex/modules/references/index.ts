import type { WithoutSystemFields } from 'convex/server';
import { ConvexError, type Infer, v } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

export const referenceTable = v.union(
  v.literal('trips'),
  v.literal('tripProposals'),
  v.literal('tripIssues'),
  v.literal('discussions'),
  v.literal('agentRuns')
);
export type ReferenceTable = Infer<typeof referenceTable>;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function randomShortId(): string {
  return Array.from({ length: 6 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join(
    ''
  );
}

/** The collision check and insert share one transaction, including concurrent creates. */
export async function insertWithShortId<Table extends ReferenceTable>(
  ctx: MutationCtx,
  table: Table,
  value: WithoutSystemFields<Doc<Table>>,
  generate = randomShortId
): Promise<Id<Table>> {
  for (let attempt = 0; attempt < 32; attempt++) {
    const shortId = generate();
    const existing = await ctx.db
      .query(table as ReferenceTable)
      .withIndex('by_shortId', (q) => q.eq('shortId', shortId))
      .unique();
    if (existing) continue;
    return ctx.db.insert(table, { ...value, shortId });
  }
  throw new ConvexError('Unable to create a unique reference. Please try again.');
}

export async function recordByReference(
  ctx: QueryCtx,
  table: ReferenceTable,
  reference: string
): Promise<Doc<ReferenceTable> | null> {
  const id = ctx.db.normalizeId(table, reference);
  if (id) return ctx.db.get(table, id);
  if (!/^[a-z]{6}$/i.test(reference)) return null;
  return ctx.db
    .query(table as ReferenceTable)
    .withIndex('by_shortId', (q) => q.eq('shortId', reference.toLowerCase()))
    .unique();
}
