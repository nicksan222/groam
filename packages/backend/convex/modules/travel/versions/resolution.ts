import { ConvexError } from 'convex/values';
import type { VersionSnapshot } from './snapshot/types';

export type ConflictChoice = 'current' | 'proposed';
export type ConflictResolution = { choice: ConflictChoice; path: string };

function snapshotValues(snapshot: VersionSnapshot) {
  return new Map(snapshot.files.map((file) => [file.path, file.value]));
}

/**
 * Paths changed on both the shared trip and the idea, with different results.
 * Compatible (single-sided) updates are not listed — they auto-combine.
 */
function detectConflictPaths(
  base: VersionSnapshot,
  current: VersionSnapshot,
  proposed: VersionSnapshot
): string[] {
  const baseByPath = snapshotValues(base);
  const currentByPath = snapshotValues(current);
  const proposedByPath = snapshotValues(proposed);
  const paths = new Set([...baseByPath.keys(), ...currentByPath.keys(), ...proposedByPath.keys()]);
  return [...paths]
    .filter((path) => {
      const previous = baseByPath.get(path);
      const shared = currentByPath.get(path);
      const version = proposedByPath.get(path);
      return shared !== previous && version !== previous && shared !== version;
    })
    .sort();
}

/**
 * Builds the merged snapshot that applies manual conflict resolutions before Git merge.
 * Each conflict path must receive exactly one resolution choice.
 */
function resolveConflictSnapshot(
  base: VersionSnapshot,
  current: VersionSnapshot,
  proposed: VersionSnapshot,
  conflictPaths: string[],
  resolutions: ConflictResolution[]
): VersionSnapshot {
  const resolutionByPath = new Map(resolutions.map((resolution) => [resolution.path, resolution]));
  if (
    resolutionByPath.size !== resolutions.length ||
    resolutions.length !== conflictPaths.length ||
    conflictPaths.some((path) => !resolutionByPath.has(path))
  ) {
    throw new ConvexError('Choose a resolution for every conflict');
  }

  const conflicts = new Set(conflictPaths);
  const baseByPath = new Map(base.files.map((file) => [file.path, file.value]));
  const currentByPath = new Map(current.files.map((file) => [file.path, file.value]));
  const proposedByPath = new Map(proposed.files.map((file) => [file.path, file.value]));
  const paths = new Set([...baseByPath.keys(), ...currentByPath.keys(), ...proposedByPath.keys()]);

  const files = [...paths].sort().flatMap((path) => {
    const previous = baseByPath.get(path);
    const shared = currentByPath.get(path);
    const version = proposedByPath.get(path);
    let value: string | undefined;

    if (conflicts.has(path)) {
      value = resolutionByPath.get(path)?.choice === 'proposed' ? version : shared;
    } else if (version === previous) {
      value = shared;
    } else if (shared === previous || shared === version) {
      value = version;
    } else {
      throw new ConvexError('The trip changed again. Recheck conflicts before applying');
    }

    return value === undefined ? [] : [{ path, value }];
  });

  return { files };
}

/** Builds a merged snapshot from per-path current vs proposed choices. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class VersionMerge {
  static conflicts = detectConflictPaths;
  static resolve = resolveConflictSnapshot;
}
