'use node';

/**
 * INTERNAL git history engine for trip ideas.
 * Do not import outside `versions/git/action` — other modules must use TripVersions.
 */

import { ConvexError } from 'convex/values';
import git from 'isomorphic-git';
import { Volume } from 'memfs';
import type {
  VersionCommitInput,
  VersionMergeInput,
  VersionSnapshotInput
} from '#convex/modules/travel/versions/validators';

export type GitIdentity = VersionCommitInput['identity'];
export type GitSnapshot = VersionSnapshotInput;
export type GitCommitInput = VersionCommitInput;
export type GitMergeInput = VersionMergeInput;

export type GitHistoryInput = {
  base: GitCommitInput;
  current?: GitCommitInput;
  merge?: GitMergeInput;
  tip?: GitCommitInput;
};

export const MAX_GIT_FILES = 525;
export const MAX_GIT_SNAPSHOT_BYTES = 800 * 1024;

function author(identity: GitIdentity, timestamp: number) {
  const name = identity.name.replace(/[<>\n]/gu, '').trim() || 'Groam traveler';
  const user = identity.userId.replace(/[^a-z0-9._-]/giu, '-').slice(0, 80) || 'traveler';
  return {
    email: `${user}@groam.local`,
    name,
    timestamp: Math.floor(timestamp / 1000),
    timezoneOffset: 0
  };
}

async function initializeRepository() {
  const volume = new Volume();
  const fs = volume.promises;
  const dir = '/trip';
  await fs.mkdir(dir, { recursive: true });
  await git.init({ defaultBranch: 'main', dir, fs });
  return { dir, fs };
}

function validateSnapshot(snapshot: GitSnapshot): void {
  if (snapshot.files.length > MAX_GIT_FILES) {
    throw new Error(`Trip versions support at most ${MAX_GIT_FILES} Git files`);
  }
  const paths = new Set<string>();
  let bytes = 0;
  for (const file of snapshot.files) {
    if (
      file.path.length === 0 ||
      file.path.length > 240 ||
      file.path.startsWith('/') ||
      file.path.includes('..') ||
      file.path.includes('\\') ||
      paths.has(file.path)
    ) {
      throw new Error('Trip version contains an invalid Git path');
    }
    paths.add(file.path);
    bytes += new TextEncoder().encode(file.value).byteLength;
  }
  if (bytes > MAX_GIT_SNAPSHOT_BYTES) {
    throw new Error('Trip version is too large for Git inspection');
  }
}

type SegmentedFile = { segments: string[]; value: string };

async function writeSnapshotTree(
  repository: Awaited<ReturnType<typeof initializeRepository>>,
  files: SegmentedFile[]
): Promise<string> {
  const { dir, fs } = repository;
  const directFiles = files.filter((file) => file.segments.length === 1);
  const directories = [
    ...new Set(
      files.flatMap((file) =>
        file.segments.length > 1 && file.segments[0] ? [file.segments[0]] : []
      )
    )
  ];
  const entries = await Promise.all([
    ...directFiles.map(async (file) => ({
      mode: '100644',
      oid: await git.writeBlob({ blob: new TextEncoder().encode(file.value), dir, fs }),
      path: file.segments[0] ?? '',
      type: 'blob' as const
    })),
    ...directories.map(async (directory) => ({
      mode: '040000',
      oid: await writeSnapshotTree(
        repository,
        files.flatMap((file) =>
          file.segments[0] === directory
            ? [{ segments: file.segments.slice(1), value: file.value }]
            : []
        )
      ),
      path: directory,
      type: 'tree' as const
    }))
  ]);
  return await git.writeTree({
    dir,
    fs,
    tree: entries.sort((left, right) => left.path.localeCompare(right.path))
  });
}

async function commitSnapshot(
  repository: Awaited<ReturnType<typeof initializeRepository>>,
  input: GitCommitInput,
  parents?: string[]
) {
  validateSnapshot(input.snapshot);
  const { dir, fs } = repository;
  const treeOid = await writeSnapshotTree(
    repository,
    input.snapshot.files.map((file) => ({ segments: file.path.split('/'), value: file.value }))
  );
  const identity = author(input.identity, input.timestamp);
  return await git.commit({
    author: identity,
    committer: identity,
    dir,
    fs,
    message: input.message,
    tree: treeOid,
    ...(parents ? { parent: parents } : {})
  });
}

function snapshotsMatch(left: GitSnapshot, right: GitSnapshot): boolean {
  return JSON.stringify(left.files) === JSON.stringify(right.files);
}

async function readSnapshot(
  repository: Awaited<ReturnType<typeof initializeRepository>>,
  oid: string
): Promise<GitSnapshot> {
  const files: GitSnapshot['files'] = [];
  await git.walk({
    ...repository,
    map: async (path, [entry]) => {
      if (!entry || (await entry.type()) !== 'blob') return undefined;
      const content = await entry.content();
      if (!content) throw new Error(`Git could not read ${path}`);
      files.push({ path, value: new TextDecoder().decode(content) });
      return undefined;
    },
    trees: [git.TREE({ ref: oid })]
  });
  const snapshot = { files: files.sort((left, right) => left.path.localeCompare(right.path)) };
  validateSnapshot(snapshot);
  for (const file of snapshot.files) {
    try {
      JSON.parse(file.value);
    } catch {
      throw new ConvexError({
        code: 'trip_merge_conflict',
        message: `Unable to automatically combine ${file.path}`,
        paths: [file.path]
      });
    }
  }
  return snapshot;
}

async function mergeSnapshotHistory({
  repository,
  merge,
  tipCommit,
  currentCommit
}: {
  repository: Awaited<ReturnType<typeof initializeRepository>>;
  merge: GitHistoryInput['merge'];
  tipCommit: string | null;
  currentCommit: string | null;
}): Promise<{ mergeCommit: string | null; mergedSnapshot: GitSnapshot | null }> {
  if (!(merge && tipCommit && currentCommit)) return { mergeCommit: null, mergedSnapshot: null };
  await git.writeRef({ ...repository, force: true, ref: 'refs/heads/main', value: currentCommit });
  await git.writeRef({ ...repository, force: true, ref: 'refs/heads/proposal', value: tipCommit });
  if (merge.resolution) {
    return {
      mergeCommit: await commitSnapshot(
        repository,
        {
          identity: merge.identity,
          message: merge.message,
          snapshot: merge.resolution,
          timestamp: merge.timestamp
        },
        [currentCommit, tipCommit]
      ),
      mergedSnapshot: merge.resolution
    };
  }
  return await createAutomaticMerge(repository, merge);
}

async function createAutomaticMerge(
  repository: Awaited<ReturnType<typeof initializeRepository>>,
  merge: NonNullable<GitHistoryInput['merge']>
): Promise<{ mergeCommit: string; mergedSnapshot: GitSnapshot }> {
  const mergeIdentity = author(merge.identity, merge.timestamp);
  try {
    const merged = await git.merge({
      ...repository,
      abortOnConflict: true,
      author: mergeIdentity,
      committer: mergeIdentity,
      fastForward: false,
      message: merge.message,
      ours: 'main',
      theirs: 'proposal'
    });
    if (!merged.oid) throw new Error('Git did not create a merge commit');
    return { mergeCommit: merged.oid, mergedSnapshot: await readSnapshot(repository, merged.oid) };
  } catch (error: unknown) {
    if (error instanceof git.Errors.MergeConflictError) {
      const paths = error.data.filepaths.join(', ');
      throw new ConvexError({
        code: 'trip_merge_conflict',
        message: `Unable to automatically combine ${paths}`,
        paths: error.data.filepaths
      });
    }
    throw error;
  }
}

async function historyMetadata({
  repository,
  baseCommit,
  tipCommit,
  currentCommit,
  mergeCommit
}: {
  repository: Awaited<ReturnType<typeof initializeRepository>>;
  baseCommit: string;
  tipCommit: string | null;
  currentCommit: string | null;
  mergeCommit: string | null;
}) {
  const baseObject = await git.readCommit({ ...repository, oid: baseCommit });
  const baseFiles: string[] = [];
  await git.walk({
    ...repository,
    map: async (filepath, [entry]) => {
      if ((await entry?.type()) === 'blob') baseFiles.push(filepath);
      return undefined;
    },
    trees: [git.TREE({ ref: baseCommit })]
  });
  const parentsFor = async (oid: string | null) =>
    oid ? (await git.readCommit({ ...repository, oid })).commit.parent : [];
  return {
    baseFiles: baseFiles.sort(),
    baseParents: baseObject.commit.parent,
    currentParents:
      currentCommit && currentCommit !== baseCommit ? await parentsFor(currentCommit) : [],
    mergeParents: await parentsFor(mergeCommit),
    tipParents: await parentsFor(tipCommit)
  };
}

async function createTripGitHistory({ base, current, merge, tip }: GitHistoryInput) {
  const repository = await initializeRepository();
  const baseCommit = await commitSnapshot(repository, base);
  const tipCommit = tip ? await commitSnapshot(repository, tip, [baseCommit]) : null;
  const currentCommit = current
    ? snapshotsMatch(base.snapshot, current.snapshot)
      ? baseCommit
      : await commitSnapshot(repository, current, [baseCommit])
    : null;
  if (!tipCommit || !currentCommit) {
    if (merge || current) throw new Error('Git merge history is incomplete');
  }
  const { mergeCommit, mergedSnapshot } = await mergeSnapshotHistory({
    currentCommit,
    merge,
    repository,
    tipCommit
  });
  if ((merge || current) && !(mergeCommit || (!merge && !current))) {
    throw new Error('Git merge history is incomplete');
  }
  const metadata = await historyMetadata({
    baseCommit,
    currentCommit,
    mergeCommit,
    repository,
    tipCommit
  });
  return {
    baseCommit,
    ...metadata,
    currentCommit,
    mergeCommit,
    mergedSnapshot,
    tipCommit
  };
}

/** Isolated Git history for idea snapshots. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class TripGit {
  static createHistory = createTripGitHistory;
}
