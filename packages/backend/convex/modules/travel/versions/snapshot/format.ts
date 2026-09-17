import { ConvexError } from 'convex/values';
import { MAX_PACKING_ITEMS, MAX_PACKING_LABEL_LENGTH } from '#convex/modules/travel/packing/schema';
import type { Id } from '#convex-generated/dataModel';
import {
  MAX_VERSION_FILES,
  type ParsedVersionSnapshot,
  type SnapshotItem,
  type VersionSnapshot,
  type VersionSnapshotFile,
  type WithAttachments
} from './types';

function parseObject(value: string, path: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // The domain error below is safer to expose than a raw JSON parser error.
  }
  throw new ConvexError(`Idea change history produced invalid trip data for ${path}`);
}

function parseAttachments(value: Record<string, unknown>, path: string): Id<'media'>[] {
  if (
    !Array.isArray(value.attachments) ||
    value.attachments.some((attachment) => typeof attachment !== 'string')
  ) {
    throw new ConvexError(`Idea change history produced invalid trip attachments for ${path}`);
  }
  return value.attachments as Id<'media'>[];
}

function parseItem<Value>(
  path: string,
  key: string,
  value: string
): SnapshotItem<WithAttachments<Value>> {
  const parsed = parseObject(value, path);
  return {
    key,
    value: { ...parsed, attachments: parseAttachments(parsed, path) } as WithAttachments<Value>
  };
}

type ParsedSnapshotCollections = Omit<ParsedVersionSnapshot, 'trip'> & {
  trip: ParsedVersionSnapshot['trip'] | null;
};

function appendPackingItem(
  result: ParsedSnapshotCollections,
  file: VersionSnapshotFile,
  key: string
): void {
  const value = parseObject(file.value, file.path);
  if (
    typeof value.label !== 'string' ||
    !value.label.trim() ||
    value.label.length > MAX_PACKING_LABEL_LENGTH ||
    typeof value.packed !== 'boolean' ||
    typeof value.sortOrder !== 'number' ||
    !Number.isSafeInteger(value.sortOrder) ||
    value.sortOrder < 0
  ) {
    throw new ConvexError('Idea change history produced invalid packing data');
  }
  result.packingItems.push({
    key,
    value: { label: value.label, packed: value.packed, sortOrder: value.sortOrder }
  });
  if (result.packingItems.length > MAX_PACKING_ITEMS) {
    throw new ConvexError(`Trips support up to ${MAX_PACKING_ITEMS} packing items`);
  }
}

function appendTransferItem(
  result: ParsedSnapshotCollections,
  file: VersionSnapshotFile,
  key: string
): void {
  if (key.startsWith('activity-')) {
    result.activityTransfers.push(parseItem(file.path, key.slice('activity-'.length), file.value));
    return;
  }
  if (key.startsWith('destination-')) {
    result.destinationTransfers.push(
      parseItem(file.path, key.slice('destination-'.length), file.value)
    );
    return;
  }
  if (key.startsWith('boundary-')) {
    result.boundaryTransfers.push(parseItem(file.path, key.slice('boundary-'.length), file.value));
    return;
  }
  throw new ConvexError('Idea change history produced an unknown trip transfer file');
}

function appendSnapshotFile(result: ParsedSnapshotCollections, file: VersionSnapshotFile): void {
  if (file.path === 'trip.json') {
    const value = parseObject(file.value, file.path);
    result.trip = {
      ...value,
      attachments: parseAttachments(value, file.path)
    } as ParsedVersionSnapshot['trip'];
    return;
  }
  const match = /^(activities|destinations|packing|stays|transfers)\/([^/]+)\.json$/u.exec(
    file.path
  );
  if (!match?.[1] || !match[2]) {
    throw new ConvexError('Idea change history produced an unknown trip file');
  }
  const [, directory, key] = match;
  if (directory === 'packing') {
    appendPackingItem(result, file, key);
    return;
  }
  if (directory === 'activities') {
    result.activities.push(parseItem(file.path, key, file.value));
    return;
  }
  if (directory === 'destinations') {
    result.destinations.push(parseItem(file.path, key, file.value));
    return;
  }
  if (directory === 'stays') {
    result.stays.push(parseItem(file.path, key, file.value));
    return;
  }
  appendTransferItem(result, file, key);
}

function parseVersionSnapshot(snapshot: VersionSnapshot): ParsedVersionSnapshot {
  if (snapshot.files.length > MAX_VERSION_FILES) {
    throw new ConvexError(`Trip versions support at most ${MAX_VERSION_FILES} version files`);
  }
  const result: ParsedSnapshotCollections = {
    activities: [],
    activityTransfers: [],
    boundaryTransfers: [],
    destinations: [],
    destinationTransfers: [],
    stays: [],
    packingItems: [],
    trip: null
  };
  const paths = new Set<string>();
  for (const file of snapshot.files) {
    if (paths.has(file.path))
      throw new ConvexError('Idea change history produced duplicate trip files');
    paths.add(file.path);
    appendSnapshotFile(result, file);
  }
  if (!result.trip) throw new ConvexError('Idea change history did not produce trip details');
  return result as ParsedVersionSnapshot;
}

function snapshotsMatch(left: VersionSnapshot, right: VersionSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isSnapshotFile(value: unknown): value is VersionSnapshotFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    typeof value.path === 'string' &&
    'value' in value &&
    typeof value.value === 'string'
  );
}

/** Parses a JSON snapshot stored on `tripProposalSnapshots`. */
function parseStoredSnapshot(value: string): VersionSnapshot {
  const parsed: unknown = JSON.parse(value);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('files' in parsed) ||
    !Array.isArray(parsed.files) ||
    parsed.files.some((file) => !isSnapshotFile(file))
  ) {
    throw new ConvexError('The stored idea snapshot is invalid');
  }
  return { files: parsed.files };
}

/** Parses stored idea snapshot JSON without touching the database. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class VersionSnapshotFormat {
  static fromStored = parseStoredSnapshot;
  static match = snapshotsMatch;
  static parse = parseVersionSnapshot;
}
