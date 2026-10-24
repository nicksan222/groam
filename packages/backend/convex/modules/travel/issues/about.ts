import type { QueryCtx } from '#convex-generated/server';
import type { PlanItemAbout, PlanItemRef } from '#convex/modules/travel/targets/schema';
import { boundaryEnds, transferLabel } from '#convex/modules/travel/transfers/labels';

export type IssueAbout = PlanItemAbout;

type Ref<Type extends PlanItemRef['type']> = Extract<PlanItemRef, { type: Type }>;

async function aboutActivity(ctx: QueryCtx, { id, type }: Ref<'activity'>) {
  const row = await ctx.db.get('tripDestinationActivities', id);
  return row ? { day: row.schedule.day, id, label: row.title, type } : null;
}

/** A stay links to the day it checks in. */
async function aboutStay(ctx: QueryCtx, { id, type }: Ref<'stay'>) {
  const row = await ctx.db.get('tripDestinationStays', id);
  return row ? { day: row.schedule.checkInDay, id, label: row.title, type } : null;
}

async function aboutDestination(ctx: QueryCtx, { id, type }: Ref<'destination'>) {
  const row = await ctx.db.get('tripDestinations', id);
  return row ? { day: row.schedule?.startDay ?? null, id, label: row.name, type } : null;
}

async function aboutActivityTransfer(ctx: QueryCtx, { id, type }: Ref<'activity_transfer'>) {
  const row = await ctx.db.get('tripActivityTransfers', id);
  if (!row) return null;
  const [from, to] = await Promise.all([
    ctx.db.get('tripDestinationActivities', row.fromActivityId),
    ctx.db.get('tripDestinationActivities', row.toActivityId)
  ]);
  const label = transferLabel(row.mode, from?.title ?? 'Activity', to?.title ?? 'Activity');
  return { day: row.timing?.startDay ?? null, id, label, type };
}

async function aboutDestinationTransfer(ctx: QueryCtx, { id, type }: Ref<'destination_transfer'>) {
  const row = await ctx.db.get('tripDestinationTransfers', id);
  if (!row) return null;
  const [from, to] = await Promise.all([
    ctx.db.get('tripDestinations', row.fromDestinationId),
    ctx.db.get('tripDestinations', row.toDestinationId)
  ]);
  const label = transferLabel(row.mode, from?.name ?? 'Stop', to?.name ?? 'Stop');
  return { day: row.timing?.startDay ?? null, id, label, type };
}

/** The journey to or from the trip is named after the first or last stop it reaches. */
async function aboutBoundaryTransfer(ctx: QueryCtx, { id, type }: Ref<'boundary_transfer'>) {
  const row = await ctx.db.get('tripBoundaryTransfers', id);
  if (!row) return null;
  const stops = () =>
    ctx.db
      .query('tripDestinations')
      .withIndex('by_tripId_and_position', (query) => query.eq('tripId', row.tripId));
  const [first, last] = await Promise.all([stops().first(), stops().order('desc').first()]);
  const ends = boundaryEnds(row.boundary, first?.name ?? 'Stop', last?.name ?? 'Stop');
  const label = transferLabel(row.mode, ends.from, ends.to);
  return { day: row.timing?.startDay ?? null, id, label, type };
}

/**
 * What an issue is about, resolved when it is read. Null once the item is gone: nothing cascades
 * when a plan item is deleted, so the pointer simply stops resolving. Each item links to the day
 * it starts on (a stay to its check-in day); an item with no day yet has `day: null`.
 */
export async function resolveAbout(
  ctx: QueryCtx,
  subject: PlanItemRef | undefined
): Promise<IssueAbout | null> {
  if (!subject) return null;
  switch (subject.type) {
    case 'activity':
      return aboutActivity(ctx, subject);
    case 'stay':
      return aboutStay(ctx, subject);
    case 'destination':
      return aboutDestination(ctx, subject);
    case 'activity_transfer':
      return aboutActivityTransfer(ctx, subject);
    case 'destination_transfer':
      return aboutDestinationTransfer(ctx, subject);
    case 'boundary_transfer':
      return aboutBoundaryTransfer(ctx, subject);
  }
}
