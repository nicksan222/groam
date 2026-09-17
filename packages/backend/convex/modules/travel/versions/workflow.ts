import { v } from 'convex/values';
import { detailRebaseValidator } from '#convex/modules/travel/versions/detailrebase';
import { TripVersions } from '#convex/modules/travel/versions/index';
import {
  versionPrepareMergeResultValidator,
  versionPrepareRebaseResultValidator,
  versionPrepareSubmitResultValidator
} from '#convex/modules/travel/versions/validators';
import { internalMutation } from '#convex-generated/server';
import { versionSnapshotValidator } from './validators';

export const prepareSubmit = internalMutation({
  args: { proposalId: v.id('tripProposals') },
  returns: versionPrepareSubmitResultValidator,
  handler: (ctx, { proposalId }) => TripVersions.prepareSubmit(ctx, proposalId)
});

export const finishSubmit = internalMutation({
  args: {
    baseCommit: v.string(),
    proposalId: v.id('tripProposals'),
    tipCommit: v.string(),
    token: v.string()
  },
  returns: v.null(),
  handler: (ctx, args) =>
    TripVersions.finishSubmit({
      baseCommit: args.baseCommit,
      ctx,
      proposalId: args.proposalId,
      tipCommit: args.tipCommit,
      token: args.token
    })
});

export const prepareMerge = internalMutation({
  args: { proposalId: v.id('tripProposals') },
  returns: versionPrepareMergeResultValidator,
  handler: (ctx, { proposalId }) => TripVersions.prepareMerge(ctx, proposalId)
});

export const prepareResolution = internalMutation({
  args: {
    proposalId: v.id('tripProposals'),
    resolutions: v.array(
      v.object({
        choice: v.union(v.literal('current'), v.literal('proposed')),
        path: v.string()
      })
    )
  },
  returns: versionPrepareMergeResultValidator,
  handler: (ctx, args) => TripVersions.prepareResolution(ctx, args.proposalId, args.resolutions)
});

export const prepareRebase = internalMutation({
  args: {
    details: v.optional(detailRebaseValidator),
    proposalId: v.id('tripProposals'),
    resolutions: v.array(
      v.object({
        choice: v.union(v.literal('current'), v.literal('proposed')),
        path: v.string()
      })
    )
  },
  returns: versionPrepareRebaseResultValidator,
  handler: (ctx, args) =>
    TripVersions.prepareRebase(ctx, args.proposalId, args.resolutions, args.details)
});

export const finishRebase = internalMutation({
  args: {
    baseCommit: v.string(),
    baseSnapshot: versionSnapshotValidator,
    proposalId: v.id('tripProposals'),
    rebasedSnapshot: versionSnapshotValidator,
    tipCommit: v.string(),
    token: v.string()
  },
  returns: v.null(),
  handler: (ctx, args) =>
    TripVersions.finishRebase({
      baseCommit: args.baseCommit,
      baseSnapshot: args.baseSnapshot,
      ctx,
      proposalId: args.proposalId,
      rebasedSnapshot: args.rebasedSnapshot,
      tipCommit: args.tipCommit,
      token: args.token
    })
});

export const finishMerge = internalMutation({
  args: {
    baseCommit: v.string(),
    mergeCommit: v.string(),
    mergedSnapshot: versionSnapshotValidator,
    proposalId: v.id('tripProposals'),
    tipCommit: v.string(),
    token: v.string()
  },
  returns: v.null(),
  handler: (ctx, args) =>
    TripVersions.finishMerge({
      baseCommit: args.baseCommit,
      ctx,
      mergeCommit: args.mergeCommit,
      mergedSnapshot: args.mergedSnapshot,
      proposalId: args.proposalId,
      tipCommit: args.tipCommit,
      token: args.token
    })
});

export const markConflict = internalMutation({
  args: {
    paths: v.array(v.string()),
    proposalId: v.id('tripProposals'),
    token: v.string()
  },
  returns: v.null(),
  handler: (ctx, args) => TripVersions.markConflict(ctx, args.proposalId, args.token, args.paths)
});

export const cancelOperation = internalMutation({
  args: { proposalId: v.id('tripProposals'), token: v.string() },
  returns: v.null(),
  handler: (ctx, args) => TripVersions.cancelOperation(ctx, args.proposalId, args.token)
});
