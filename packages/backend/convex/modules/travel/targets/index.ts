import { ConvexError, type Infer } from 'convex/values';
import type { Doc, Id, TableNames } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import '#convex/modules/travel/targets/kinds/index';
import type { Workspace } from '#convex/modules/auth/workspace';
import { canParticipateInTrip } from '#convex/modules/payments/index';
import { TripTargetKind } from '#convex/modules/travel/targets/kind';
import type { TripTargetValidators } from '#convex/modules/travel/targets/schema';
import type { TripCtx } from '#convex/modules/travel/trips/ctx';

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

/** The viewer's group, and the seat trip content requires — like loadTripContext. */
// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type ContextViewer = Pick<Workspace, 'organizationId' | 'userId'>;

/**
 * Looks a context tag up once. Visible: the row exists, its trip is in the viewer's group, and
 * they hold a seat on it. Hidden: all of that but the seat. Missing: the row or trip is gone,
 * belongs to another group, or the reference is invalid.
 */
async function inspectTagRow(ctx: ReadCtx, viewer: ContextViewer, reference: ContextTagReference) {
  const kind = TripTargetKind.of(reference.kind);
  if (!kind?.contextTag) return { status: 'missing' as const };
  const table = tableName(kind);
  const id = ctx.db.normalizeId(table, reference.id);
  const row = id ? await ctx.db.get(table, id) : null;
  if (!id || !row) return { status: 'missing' as const };
  const tripId = kind.table === 'trips' ? (id as Id<'trips'>) : tripIdOf(row);
  const trip = tripId ? await ctx.db.get('trips', tripId) : null;
  if (!tripId || !trip || trip.organizationId !== viewer.organizationId) {
    return { status: 'missing' as const };
  }
  if (!(await canParticipateInTrip(ctx, trip, viewer.userId))) return { status: 'hidden' as const };
  return { kind, row, status: 'visible' as const, tripId };
}

async function viewableTagRow(ctx: ReadCtx, viewer: ContextViewer, reference: ContextTagReference) {
  const found = await inspectTagRow(ctx, viewer, reference);
  return found.status === 'visible' ? found : null;
}

/** `viewableTagRow`, or the kind's own not-found error, so a hidden row reads as missing. */
async function requireViewableTagRow(
  ctx: ReadCtx,
  viewer: ContextViewer,
  reference: ContextTagReference
) {
  const found = await viewableTagRow(ctx, viewer, reference);
  if (found) return found;
  throw new ConvexError(
    TripTargetKind.of(reference.kind)?.taggedNotFoundMessage ?? 'Trip target not found'
  );
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
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class TripTargets {
  /** Same check as `assertBelongsToTrip` when only the trip id is at hand. */
  static async assertInTrip(
    ctx: MutationCtx | QueryCtx,
    tripId: Id<'trips'>,
    target: Target
  ): Promise<void> {
    if (!(await targetBelongsToTrip(ctx, tripId, target))) {
      throw new ConvexError('Trip target not found');
    }
  }

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
    viewer: ContextViewer,
    reference: ContextTagReference
  ): Promise<ContextTag> {
    const { kind, row, tripId } = await requireViewableTagRow(ctx, viewer, reference);
    return {
      id: row._id,
      kind: contextKind(kind),
      label: kind.contextLabel(asLabeledRow(row)),
      tripId
    };
  }

  /** Whether a stored tag is readable, hidden behind a missing seat, or gone for this viewer. */
  static async tagVisibility(
    ctx: MutationCtx | QueryCtx,
    viewer: ContextViewer,
    reference: ContextTagReference
  ): Promise<'hidden' | 'missing' | 'visible'> {
    return (await inspectTagRow(ctx, viewer, reference)).status;
  }

  /** A readable tag and a loader for its details from a single lookup; null when not readable. */
  static async readContextTag(
    ctx: QueryCtx,
    viewer: ContextViewer,
    reference: ContextTagReference
  ): Promise<{ details: () => Promise<unknown>; tag: ContextTag } | null> {
    const found = await viewableTagRow(ctx, viewer, reference);
    if (!found) return null;
    const { kind, row, tripId } = found;
    const label = kind.contextLabel(asLabeledRow(row));
    return {
      details: () => kind.contextDetails(ctx, row, label),
      tag: { id: row._id, kind: contextKind(kind), label, tripId }
    };
  }

  /** Taggable items from the trips the viewer holds a seat on. */
  static async contextCatalog(
    ctx: MutationCtx | QueryCtx,
    viewer: ContextViewer,
    candidates: Doc<'trips'>[]
  ): Promise<ContextCatalogItem[]> {
    const seated = await Promise.all(
      candidates.map((trip) => canParticipateInTrip(ctx, trip, viewer.userId))
    );
    const trips = candidates.filter((_, index) => seated[index]);
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
    viewer: ContextViewer,
    reference: ContextTagReference
  ): Promise<unknown> {
    const { kind, row } = await requireViewableTagRow(ctx, viewer, reference);
    return await kind.contextDetails(ctx, row, kind.contextLabel(asLabeledRow(row)));
  }
}

export type { AttachTarget, CollaborativeTarget, Target };
