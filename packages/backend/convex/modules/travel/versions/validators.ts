import { ConvexError, type Infer, v } from 'convex/values';

export const versionIdentityValidator = v.object({ name: v.string(), userId: v.string() });

export const versionSnapshotValidator = v.object({
  files: v.array(v.object({ path: v.string(), value: v.string() }))
});

export const versionCommitInputValidator = v.object({
  identity: versionIdentityValidator,
  message: v.string(),
  snapshot: versionSnapshotValidator,
  timestamp: v.number()
});

export const versionMergeInputValidator = v.object({
  identity: versionIdentityValidator,
  message: v.string(),
  resolution: v.optional(versionSnapshotValidator),
  timestamp: v.number()
});

const versionSubmitHistoryValidator = v.object({
  base: versionCommitInputValidator,
  tip: versionCommitInputValidator
});

const versionMergeHistoryValidator = v.object({
  base: versionCommitInputValidator,
  current: versionCommitInputValidator,
  merge: versionMergeInputValidator,
  tip: versionCommitInputValidator
});

export const versionPrepareSubmitResultValidator = v.object({
  history: versionSubmitHistoryValidator,
  token: v.string()
});

export const versionPrepareMergeResultValidator = v.object({
  history: versionMergeHistoryValidator,
  token: v.string()
});

export const versionConflictValidator = v.object({
  currentFields: v.array(v.string()),
  currentSummary: v.string(),
  entity: v.union(
    v.literal('activity'),
    v.literal('details'),
    v.literal('destination'),
    v.literal('packing'),
    v.literal('stay'),
    v.literal('transfer')
  ),
  key: v.string(),
  label: v.string(),
  proposedFields: v.array(v.string()),
  proposedSummary: v.string()
});

export const versionPrepareRebaseResultValidator = v.union(
  v.object({ kind: v.literal('noop') }),
  v.object({
    conflicts: v.array(versionConflictValidator),
    kind: v.literal('needs_choices')
  }),
  v.object({
    history: versionSubmitHistoryValidator,
    kind: v.literal('apply'),
    rebasedSnapshot: versionSnapshotValidator,
    token: v.string()
  })
);

export const versionRebaseResultValidator = v.union(
  v.object({ kind: v.literal('applied') }),
  v.object({
    conflicts: v.array(versionConflictValidator),
    kind: v.literal('needs_choices')
  })
);

export type VersionIdentity = Infer<typeof versionIdentityValidator>;
export type VersionSnapshotInput = Infer<typeof versionSnapshotValidator>;
export type VersionCommitInput = Infer<typeof versionCommitInputValidator>;
export type VersionMergeInput = Infer<typeof versionMergeInputValidator>;
export type VersionSubmitHistory = Infer<typeof versionSubmitHistoryValidator>;
export type VersionMergeHistory = Infer<typeof versionMergeHistoryValidator>;

const GIT_COMMIT_OID_PATTERN = /^[a-f0-9]{40}$/u;

/** Validates a Git object id returned by the internal history action. */
function assertGitCommitOid(value: string, label: string): void {
  if (!GIT_COMMIT_OID_PATTERN.test(value)) {
    throw new ConvexError(`Change history returned an invalid ${label}`);
  }
}

/** Git object-id checks for idea history. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class GitCommits {
  static assertOid = assertGitCommitOid;
}
