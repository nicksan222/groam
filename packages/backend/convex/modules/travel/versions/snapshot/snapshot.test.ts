import { expect, test } from 'vite-plus/test';
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
      files: [tripFile('Packing'), packingFile({ label: 'Passport', quantity: 2, sortOrder: 0 })]
    }).packingItems
  ).toEqual([{ key: 'passport', value: { label: 'Passport', quantity: 2, sortOrder: 0 } }]);
  for (const value of [
    { label: '', quantity: 1, sortOrder: 0 },
    { label: 'Passport', quantity: 'two', sortOrder: 0 },
    { label: 'Passport', quantity: 0, sortOrder: 0 },
    { label: 'Passport', quantity: 100, sortOrder: 0 },
    { label: 'Passport', quantity: 1, sortOrder: -1 },
    { label: 'Passport', sortOrder: 0 }
  ]) {
    expect(() =>
      VersionSnapshotFormat.parse({ files: [tripFile('Packing'), packingFile(value)] })
    ).toThrow('invalid packing data');
  }
});

test('drops legacy checklist files instead of throwing', () => {
  const parsed = VersionSnapshotFormat.parse({
    files: [
      tripFile('Packing'),
      {
        path: 'packing/passport.json',
        value: JSON.stringify({ label: 'Passport', packed: true, sortOrder: 0 })
      },
      {
        path: 'packing/hat.json',
        value: JSON.stringify({ label: 'Hat', quantity: 1, sortOrder: 1 })
      }
    ]
  });
  expect(parsed.packingItems.map((item) => item.key)).toEqual(['hat']);
});

test('parses and validates packing bringer files', () => {
  const bringerFile = (value: unknown, path = 'packingBringers/hat--ana.json') => ({
    path,
    value: JSON.stringify(value)
  });
  expect(
    VersionSnapshotFormat.parse({
      files: [tripFile('Packing'), bringerFile({ count: 2, itemKey: 'hat', userId: 'ana' })]
    }).packingBringers
  ).toEqual([{ key: 'hat--ana', value: { count: 2, itemKey: 'hat', userId: 'ana' } }]);
  for (const file of [
    bringerFile({ count: 0, itemKey: 'hat', userId: 'ana' }),
    bringerFile({ count: 1, itemKey: 'hat' }),
    bringerFile({ count: 1, itemKey: 'hat', userId: 'bo' })
  ]) {
    expect(() => VersionSnapshotFormat.parse({ files: [tripFile('Packing'), file] })).toThrow(
      'invalid packing assignment data'
    );
  }
});

test('rejects a merged packing list beyond the item limit', () => {
  const files = Array.from({ length: 201 }, (_, index) => ({
    path: `packing/item-${index}.json`,
    value: JSON.stringify({ label: 'Item', quantity: 1, sortOrder: index })
  }));
  expect(() => VersionSnapshotFormat.parse({ files: [tripFile('Packing'), ...files] })).toThrow(
    'up to 200 packing items'
  );
});
