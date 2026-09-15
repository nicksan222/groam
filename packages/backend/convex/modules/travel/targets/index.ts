import { ConvexError, type Infer } from 'convex/values';
import { TripTargetKind } from '#convex/modules/travel/targets/kind';
import type { TripCtx } from '#convex/modules/travel/trips/ctx';
import '#convex/modules/travel/targets/kinds/index';
import type { TripTargetValidators } from '#convex/modules/travel/targets/schema';
import type { Doc, Id, TableNames } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

type AttachTarget = Infer<typeof TripTargetValidators.attachable>;
type CollaborativeTarget = Infer<typeof TripTargetValidators.collaborative>;
type Target = AttachTarget | CollaborativeTarget;
type ReadCtx = MutationCtx | QueryCtx;
export type ContextTagReference = Infer<typeof TripTargetValidators.contextTag>;
export type ContextTagKind = Infer<typeof TripTargetValidators.contextTagKind>;
export type ContextTag = {
  id: string;
  kind: ContextTagKind;
  label: string;
  tripId: string;
};
export type ContextCatalogItem = ContextTag & { description: string };

function tripIdOf(row: unknown): Id<'trips'> | null {
  if (typeof row !== 'object' || row === null || !('tripId' in row)) return null;
  const tripId = row.tripId;
  return typeof tripId === 'string' ? (tripId as Id<'trips'>) : null;
}

function costAmountOf(row: unknown): number | undefined {
  if (typeof row !== 'object' || row === null || !('cost' in row)) return undefined;
  const cost = row.cost;
  if (typeof cost !== 'object' || cost === null || !('amount' in cost)) return undefined;
  return typeof cost.amount === 'number' ? cost.amount : undefined;
}

function costSplitOf(row: unknown): 'per_person' | 'total' {
  if (typeof row !== 'object' || row === null || !('cost' in row)) return 'total';
  const cost = row.cost;
  if (typeof cost !== 'object' || cost === null || !('split' in cost)) return 'total';
  return cost.split === 'per_person' ? 'per_person' : 'total';
}

function tableName(kind: TripTargetKind): TableNames {
  return kind.table as TableNames;
}

function contextKind(kind: TripTargetKind): ContextTagKind {
  return kind.type as ContextTagKind;
}

function asLabeledRow(row: unknown): { name?: string; title?: string } {
  if (typeof row !== 'object' || row === null) return {};
  return row;
}

function destinationIdOf(row: unknown): string | undefined {
  if (typeof row !== 'object' || row === null || !('destinationId' in row)) return undefined;
  const destinationId = row.destinationId;
  return typeof destinationId === 'string' ? destinationId : undefined;
}

async function targetBelongsToTrip(
  ctx: ReadCtx,
  tripId: Id<'trips'>,
  target: Target
): Promise<boolean> {
  const kind = TripTargetKind.of(target.type);
  if (!kind) return false;
  if (kind.table === 'trips') return target.id === tripId;
  const table = tableName(kind);
  const id = ctx.db.normalizeId(table, target.id);
  if (!id) return false;
  return tripIdOf(await ctx.db.get(table, id)) === tripId;
}

async function requireOrganizationTrip(
  ctx: ReadCtx,
  organizationId: string,
  tripId: Id<'trips'>
): Promise<Doc<'trips'>> {
  const trip = await ctx.db.get('trips', tripId);
  if (!trip || trip.organizationId !== organizationId) {
    throw new ConvexError('Tagged trip not found');
  }
  return trip;
}

async function catalogRows(
  ctx: ReadCtx,
  kind: TripTargetKind,
  tripId: Id<'trips'>
): Promise<Array<{ _id: string }>> {
  if (kind.table === 'trips') {
    const trip = await ctx.db.get('trips', tripId);
    return trip ? [trip] : [];
  }
  if (kind.contextCatalogTake === null) return [];
  const indexed = ctx.db.query(tableName(kind)) as never as {
    withIndex: (
      name: string,
      fn: (query: { eq: (field: string, value: Id<'trips'>) => unknown }) => unknown
    ) => { take: (count: number) => Promise<Array<{ _id: string }>> };
  };
  return await indexed
    .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
    .take(kind.contextCatalogTake);
}

/**
 * `{ type, id }` pointers into a trip. `assertBelongsToTrip` is the ownership check
 * for attachments and comments. `setCost` patches whichever itinerary table the kind uses.
 * Context tags go through `normalizeContextTag` / `resolveContextTag` / `contextCatalog`.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class TripTargets {
  static async assertBelongsToTrip(
    ctx: MutationCtx | QueryCtx,
    trip: TripCtx,
    target: Target
  ): Promise<void> {
    if (!(await targetBelongsToTrip(ctx, trip.trip._id, target))) {
      throw new ConvexError('Trip target not found');
    }
  }

  /**
   * Write `cost` onto the kind’s table. `as never` is required because the table name
   * is chosen at runtime from `TripTargetKind`.
   */
  static async setCost(
    ctx: MutationCtx,
    tripId: Id<'trips'>,
    target: { id: string; type: string },
    cost: { amount: number; split?: 'per_person' | 'total' } | undefined
  ): Promise<{
    currentAmount: number | undefined;
    currentSplit: 'per_person' | 'total';
    eventType: Doc<'tripAuditEvents'>['type'];
  }> {
    const kind = TripTargetKind.of(target.type);
    if (!kind || !TripTargetKind.isCostBearing(kind))
      throw new ConvexError('Trip target not found');
    const table = tableName(kind);
    const id = ctx.db.normalizeId(table, target.id);
    if (!id) throw new ConvexError(kind.notFoundMessage);
    const row = await ctx.db.get(table, id);
    if (tripIdOf(row) !== tripId) throw new ConvexError(kind.notFoundMessage);
    const currentAmount = costAmountOf(row);
    const currentSplit = costSplitOf(row);
    await ctx.db.patch(table, id, { cost } as never);
    return { currentAmount, currentSplit, eventType: kind.costUpdatedEvent };
  }

  static normalizeContextTag(
    ctx: MutationCtx | QueryCtx,
    tag: { id: string; kind: string }
  ): ContextTagReference | null {
    const kind = TripTargetKind.of(tag.kind);
    if (!kind?.contextTag) return null;
    const id = ctx.db.normalizeId(tableName(kind), tag.id);
    return id ? ({ id, kind: contextKind(kind) } as ContextTagReference) : null;
  }

  static async resolveContextTag(
    ctx: MutationCtx | QueryCtx,
    organizationId: string,
    reference: ContextTagReference
  ): Promise<ContextTag> {
    const kind = TripTargetKind.of(reference.kind);
    if (!kind?.contextTag) throw new ConvexError('Trip target not found');
    const table = tableName(kind);
    const id = ctx.db.normalizeId(table, reference.id);
    if (!id) throw new ConvexError(kind.taggedNotFoundMessage);
    const row = await ctx.db.get(table, id);
    if (!row) throw new ConvexError(kind.taggedNotFoundMessage);
    const tripId = kind.table === 'trips' ? (id as Id<'trips'>) : tripIdOf(row);
    if (!tripId) throw new ConvexError(kind.taggedNotFoundMessage);
    await requireOrganizationTrip(ctx, organizationId, tripId);
    return {
      id: row._id,
      kind: contextKind(kind),
      label: kind.contextLabel(asLabeledRow(row)),
      tripId
    };
  }

  static async contextCatalog(
    ctx: MutationCtx | QueryCtx,
    trips: Doc<'trips'>[]
  ): Promise<ContextCatalogItem[]> {
    const kinds = TripTargetKind.contextTagged();
    const groups = await Promise.all(
      trips.map(async (trip) => {
        const rowsByKind = await Promise.all(
          kinds.map(async (kind) => ({ kind, rows: await catalogRows(ctx, kind, trip._id) }))
        );
        const destinationNames = new Map(
          rowsByKind
            .find(({ kind }) => kind.type === 'destination')
            ?.rows.map((row) => [row._id, asLabeledRow(row).name ?? 'Destination'] as const) ?? []
        );
        return rowsByKind.flatMap(({ kind, rows }) =>
          rows.map((row) => {
            const label = kind.contextLabel(asLabeledRow(row));
            return {
              description: kind.catalogDescription(trip.name, {
                destinationName: destinationNames.get(destinationIdOf(row) ?? '')
              }),
              id: row._id,
              kind: contextKind(kind),
              label,
              tripId: trip._id
            };
          })
        );
      })
    );
    return groups.flat();
  }

  static async contextDetails(
    ctx: QueryCtx,
    organizationId: string,
    reference: ContextTagReference
  ): Promise<unknown> {
    const kind = TripTargetKind.of(reference.kind);
    if (!kind?.contextTag) throw new ConvexError('Trip target not found');
    const table = tableName(kind);
    const id = ctx.db.normalizeId(table, reference.id);
    if (!id) throw new ConvexError(kind.taggedNotFoundMessage);
    const row = await ctx.db.get(table, id);
    if (!row) throw new ConvexError(kind.taggedNotFoundMessage);
    const tripId = kind.table === 'trips' ? (id as Id<'trips'>) : tripIdOf(row);
    if (!tripId) throw new ConvexError(kind.taggedNotFoundMessage);
    await requireOrganizationTrip(ctx, organizationId, tripId);
    return await kind.contextDetails(ctx, row, kind.contextLabel(asLabeledRow(row)));
  }
}

export type { AttachTarget, CollaborativeTarget, Target };
