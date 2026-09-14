import { ConvexError, type Infer, v } from 'convex/values';
import { Attachments } from '#convex/modules/media/attachments/index';
import { loadTripContext, type MutableTripCtx, patchTrip } from '#convex/modules/travel/trips/ctx';
import { updateTrip } from '#convex/modules/travel/trips/index';
import type { Doc } from '#convex-generated/dataModel';

export const detailResolutionArgs = {
  choices: v.array(
    v.object({
      key: v.union(
        v.literal('name'),
        v.literal('currency'),
        v.literal('dateNotes'),
        v.literal('destination'),
        v.literal('duration'),
        v.literal('startDate'),
        v.literal('budget'),
        v.literal('cover'),
        v.literal('attachments')
      ),
      choice: v.union(v.literal('mine'), v.literal('shared'))
    })
  ),
  expectedSharedUpdatedAt: v.number(),
  expectedWorkingUpdatedAt: v.number()
};
const argsValidator = v.object(detailResolutionArgs);
export async function applyDetailResolution(
  ctx: MutableTripCtx,
  args: Infer<typeof argsValidator>
) {
  const proposal = ctx.trip.proposal;
  if (!proposal) throw new ConvexError('Only an idea copy can resolve trip details');
  const shared = await loadTripContext(ctx, proposal.sourceTripId, ctx.workspace);
  if (
    shared.trip.updatedAt !== args.expectedSharedUpdatedAt ||
    ctx.trip.updatedAt !== args.expectedWorkingUpdatedAt
  ) {
    throw new ConvexError(
      'The trip changed while you were reviewing. Review the latest diff and try again.'
    );
  }
  if (
    args.choices.length === 0 ||
    new Set(args.choices.map(({ key }) => key)).size !== args.choices.length
  ) {
    throw new ConvexError('Choose each detail exactly once');
  }
  const next: Doc<'trips'> = { ...ctx.trip };
  for (const { key, choice } of args.choices) {
    if (choice !== 'shared' || key === 'attachments') continue;
    Object.assign(next, { [key]: shared.trip[key] });
  }
  await updateTrip(ctx, ctx.trip._id, {
    name: next.name,
    currency: next.currency,
    destination: next.destination,
    budget: next.budget,
    duration: next.duration,
    dateNotes: next.dateNotes,
    startDate: next.startDate
  });
  if (args.choices.some(({ key, choice }) => key === 'attachments' && choice === 'shared')) {
    const target = { id: shared.trip._id, type: 'trip' as const };
    const files = await Attachments.forTarget(
      ctx,
      shared.trip._id,
      target,
      Attachments.limitFor(target)
    );
    await Attachments.setTarget(
      ctx,
      ctx.trip._id,
      { id: ctx.trip._id, type: 'trip' },
      files.map(({ mediaId }) => mediaId),
      ctx.workspace.organizationId,
      Attachments.limitFor(target)
    );
  }
  // Preserve the reviewed cover when a destination change suggests a new image.
  const updated = await loadTripContext(ctx, ctx.trip._id, ctx.workspace);
  await patchTrip(updated, { cover: next.cover, updatedAt: Date.now() });
  return null;
}
