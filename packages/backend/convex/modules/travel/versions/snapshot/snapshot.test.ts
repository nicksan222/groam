import { expect, test } from 'vitest';
import { VersionSnapshotFormat } from './format';
import { MAX_VERSION_FILES } from './types';

const tripFile = (name: string) => ({
  path: 'trip.json',
  value: `{"attachments":[],"name":"${name}"}\n`
});

test('parseVersionSnapshot routes entity files into typed collections', () => {
  const parsed = VersionSnapshotFormat.parse({
    files: [
      tripFile('Lisbon'),
      {
        path: 'destinations/lisbon.json',
        value: '{"attachments":[],"name":"Lisbon"}\n'
      },
      {
        path: 'activities/museum.json',
        value: '{"attachments":[],"destinationKey":"lisbon","title":"Museum"}\n'
      },
      {
        path: 'stays/hotel.json',
        value: '{"attachments":[],"destinationKey":"lisbon","title":"Hotel"}\n'
      },
      {
        path: 'transfers/boundary-arrival.json',
        value: '{"attachments":[],"boundary":"arrival","mode":"train"}\n'
      },
      {
        path: 'transfers/destination-route.json',
        value: '{"attachments":[],"fromDestinationKey":"a","mode":"train","toDestinationKey":"b"}\n'
      },
      {
        path: 'transfers/activity-route.json',
        value: '{"attachments":[],"fromActivityKey":"x","mode":"walk","toActivityKey":"y"}\n'
      }
    ]
  });

  expect(parsed.trip.name).toBe('Lisbon');
  expect(parsed.destinations).toHaveLength(1);
  expect(parsed.activities[0]?.value.title).toBe('Museum');
  expect(parsed.stays[0]?.key).toBe('hotel');
  expect(parsed.boundaryTransfers[0]?.value.boundary).toBe('arrival');
  expect(parsed.destinationTransfers[0]?.key).toBe('route');
  expect(parsed.activityTransfers[0]?.key).toBe('route');
});

test('parseVersionSnapshot rejects duplicate, unknown, and incomplete snapshots', () => {
  expect(() =>
    VersionSnapshotFormat.parse({
      files: [tripFile('One'), tripFile('Two')]
    })
  ).toThrow('duplicate trip files');
  expect(() =>
    VersionSnapshotFormat.parse({
      files: [{ path: 'notes/readme.txt', value: '{}' }]
    })
  ).toThrow('unknown trip file');
  expect(() =>
    VersionSnapshotFormat.parse({
      files: [
        {
          path: 'destinations/lisbon.json',
          value: '{"attachments":[],"name":"Lisbon"}\n'
        }
      ]
    })
  ).toThrow('did not produce trip details');
  expect(() =>
    VersionSnapshotFormat.parse({
      files: [{ path: 'trip.json', value: 'not-json' }]
    })
  ).toThrow('invalid trip data');
  expect(() =>
    VersionSnapshotFormat.parse({
      files: [{ path: 'trip.json', value: '{"attachments":"bad"}\n' }]
    })
  ).toThrow('invalid trip attachments');
});

test('parseVersionSnapshot enforces file count limits', () => {
  const files = Array.from({ length: MAX_VERSION_FILES + 1 }, (_, index) => ({
    path: `activities/item-${index}.json`,
    value: '{"attachments":[],"destinationKey":"x","title":"Item"}\n'
  }));
  files.unshift(tripFile('Overflow'));
  expect(() => VersionSnapshotFormat.parse({ files })).toThrow(
    `Trip versions support at most ${MAX_VERSION_FILES} version files`
  );
});

test('parseStoredSnapshot validates persisted proposal snapshots', () => {
  const stored = JSON.stringify({ files: [tripFile('Stored')] });
  expect(VersionSnapshotFormat.fromStored(stored).files).toHaveLength(1);
  expect(() => VersionSnapshotFormat.fromStored('{"files":[{"path":1,"value":"x"}]}')).toThrow(
    'stored idea snapshot is invalid'
  );
  expect(() => VersionSnapshotFormat.fromStored('not-json')).toThrow(SyntaxError);
});

test('snapshotsMatch compares serialized repository trees', () => {
  const left = { files: [tripFile('Same')] };
  const right = { files: [tripFile('Same')] };
  expect(VersionSnapshotFormat.match(left, right)).toBe(true);
  expect(VersionSnapshotFormat.match(left, { files: [tripFile('Different')] })).toBe(false);
});

test('parses packing files without attachment fields and validates their content', () => {
  const packingFile = (value: unknown) => ({
    path: 'packing/passport.json',
    value: JSON.stringify(value)
  });
  expect(
    VersionSnapshotFormat.parse({
      files: [tripFile('Packing'), packingFile({ label: 'Passport', packed: true, sortOrder: 0 })]
    }).packingItems
  ).toEqual([{ key: 'passport', value: { label: 'Passport', packed: true, sortOrder: 0 } }]);
  for (const value of [
    { label: '', packed: false, sortOrder: 0 },
    { label: 'Passport', packed: 'yes', sortOrder: 0 },
    { label: 'Passport', packed: true, sortOrder: -1 }
  ]) {
    expect(() =>
      VersionSnapshotFormat.parse({ files: [tripFile('Packing'), packingFile(value)] })
    ).toThrow('invalid packing data');
  }
});

test('rejects a merged packing list beyond the item limit', () => {
  const files = Array.from({ length: 201 }, (_, index) => ({
    path: `packing/item-${index}.json`,
    value: JSON.stringify({ label: 'Item', packed: false, sortOrder: index })
  }));
  expect(() => VersionSnapshotFormat.parse({ files: [tripFile('Packing'), ...files] })).toThrow(
    'up to 200 packing items'
  );
});
