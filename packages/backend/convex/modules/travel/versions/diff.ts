import type { VersionSnapshot } from './snapshot/index';

export type TripVersionChange = {
  after: string | null;
  before: string | null;
  change: 'added' | 'modified' | 'removed';
  entity:
    | 'activity'
    | 'details'
    | 'destination'
    | 'packing'
    | 'packingBringer'
    | 'stay'
    | 'transfer';
  fields: string[];
  key: string;
  label: string;
};

type SnapshotFile = VersionSnapshot['files'][number];

function parsed(value: string): Record<string, unknown> {
  const result: unknown = JSON.parse(value);
  return typeof result === 'object' && result !== null ? (result as Record<string, unknown>) : {};
}

function changedFields(left: string, right: string): string[] {
  const previous = parsed(left);
  const next = parsed(right);
  const fields = new Set([...Object.keys(previous), ...Object.keys(next)]);
  return [...fields]
    .filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field]))
    .sort();
}

/** Checklist files from before groups had a quantity: kept in old history, never shown. */
function isLegacyPacking(file: SnapshotFile): boolean {
  if (!file.path.startsWith('packing/')) return false;
  const value = parsed(file.value);
  return value.quantity === undefined && 'packed' in value;
}

function entityFor(path: string): TripVersionChange['entity'] {
  if (path === 'trip.json') return 'details';
  if (path.startsWith('destinations/')) return 'destination';
  if (path.startsWith('activities/')) return 'activity';
  if (path.startsWith('packing/')) return 'packing';
  if (path.startsWith('packingBringers/')) return 'packingBringer';
  if (path.startsWith('stays/')) return 'stay';
  return 'transfer';
}

function labelFor(file: SnapshotFile): string {
  const value = parsed(file.value);
  if (file.path.startsWith('packingBringers/')) return 'Packing assignment';
  if (typeof value.title === 'string') return value.title;
  if (typeof value.name === 'string') return value.name;
  if (typeof value.label === 'string') return value.label;
  if (value.boundary === 'arrival') return 'Arrival travel';
  if (value.boundary === 'departure') return 'Return travel';
  const segments = file.path.split('/');
  return file.path === 'trip.json' ? 'Trip details' : (segments[segments.length - 1] ?? file.path);
}

export type TripVersionConflict = {
  currentFields: string[];
  currentSummary: string;
  entity: TripVersionChange['entity'];
  key: string;
  label: string;
  proposedFields: string[];
  proposedSummary: string;
};

function fieldLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/gu, '$1 $2')
    .replace(/[_-]+/gu, ' ')
    .replace(/^./u, (character) => character.toLocaleUpperCase());
}

function summarizeValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'not set';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return 'updated';
}

function fileSummary(file: SnapshotFile | undefined, fields: string[]): string {
  if (!file) return 'Removes this item';
  if (fields.length === 0) return labelFor(file);
  const value = parsed(file.value);
  return fields.map((field) => `${fieldLabel(field)}: ${summarizeValue(value[field])}`).join(' · ');
}

function describeVersionConflicts(
  base: VersionSnapshot,
  current: VersionSnapshot,
  proposed: VersionSnapshot,
  conflictPaths: string[]
): TripVersionConflict[] {
  const visible = (snapshot: VersionSnapshot) =>
    new Map(
      snapshot.files.filter((file) => !isLegacyPacking(file)).map((file) => [file.path, file])
    );
  const baseByPath = visible(base);
  const currentByPath = visible(current);
  const proposedByPath = visible(proposed);
  return conflictPaths.flatMap((path) => {
    const baseFile = baseByPath.get(path);
    const currentFile = currentByPath.get(path);
    const proposedFile = proposedByPath.get(path);
    const file = proposedFile ?? currentFile ?? baseFile;
    if (!file) return [];
    const currentFields =
      baseFile && currentFile ? changedFields(baseFile.value, currentFile.value) : [];
    const proposedFields =
      baseFile && proposedFile ? changedFields(baseFile.value, proposedFile.value) : [];
    return [
      {
        currentFields,
        currentSummary: fileSummary(currentFile, currentFields),
        entity: entityFor(path),
        key: path,
        label: labelFor(file),
        proposedFields,
        proposedSummary: fileSummary(proposedFile, proposedFields)
      }
    ];
  });
}

function diffVersionSnapshots(
  base: VersionSnapshot,
  proposed: VersionSnapshot
): TripVersionChange[] {
  const baseByPath = new Map(
    base.files.filter((file) => !isLegacyPacking(file)).map((file) => [file.path, file])
  );
  const proposedByPath = new Map(
    proposed.files.filter((file) => !isLegacyPacking(file)).map((file) => [file.path, file])
  );
  const paths = new Set([...baseByPath.keys(), ...proposedByPath.keys()]);
  return [...paths].sort().flatMap((path) => {
    const previous = baseByPath.get(path);
    const next = proposedByPath.get(path);
    if (previous?.value === next?.value) return [];
    const file = next ?? previous;
    if (!file) return [];
    return [
      {
        after: next?.value ?? null,
        before: previous?.value ?? null,
        change: previous
          ? next
            ? ('modified' as const)
            : ('removed' as const)
          : ('added' as const),
        entity: entityFor(path),
        fields: previous && next ? changedFields(previous.value, next.value) : [],
        key: path,
        label: labelFor(file)
      }
    ];
  });
}

/** Compares idea snapshots into traveler-facing change and conflict lists. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class VersionChanges {
  static conflicts = describeVersionConflicts;
  static diff = diffVersionSnapshots;
  static entityFor = entityFor;
}
