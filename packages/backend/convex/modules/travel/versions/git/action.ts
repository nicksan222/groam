'use node';

import { v } from 'convex/values';
import { TripGit } from '#convex/modules/travel/versions/git/index';
import {
  versionCommitInputValidator,
  versionMergeInputValidator,
  versionSnapshotValidator
} from '#convex/modules/travel/versions/validators';
import { internalAction } from '#convex-generated/server';

export const createHistory = internalAction({
  args: {
    base: versionCommitInputValidator,
    current: v.optional(versionCommitInputValidator),
    merge: v.optional(versionMergeInputValidator),
    tip: v.optional(versionCommitInputValidator)
  },
  returns: v.object({
    baseCommit: v.string(),
    baseFiles: v.array(v.string()),
    baseParents: v.array(v.string()),
    currentCommit: v.union(v.string(), v.null()),
    currentParents: v.array(v.string()),
    mergeCommit: v.union(v.string(), v.null()),
    mergedSnapshot: v.union(versionSnapshotValidator, v.null()),
    mergeParents: v.array(v.string()),
    tipCommit: v.union(v.string(), v.null()),
    tipParents: v.array(v.string())
  }),
  handler: async (_ctx, args) => await TripGit.createHistory(args)
});
