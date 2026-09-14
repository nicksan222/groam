import { expect, test } from 'vitest';
import { VersionChanges } from './diff';

const snapshot = (files: Array<{ path: string; value: string }>) => ({ files });

test('reports added, modified, and removed versioned entities', () => {
  const changes = VersionChanges.diff(
    snapshot([
      { path: 'activities/remove.json', value: '{"title":"Old"}\n' },
      { path: 'trip.json', value: '{"name":"Before"}\n' }
    ]),
    snapshot([
      { path: 'activities/add.json', value: '{"title":"New"}\n' },
      { path: 'trip.json', value: '{"name":"After"}\n' }
    ])
  );

  expect(changes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ change: 'added', key: 'activities/add.json' }),
      expect.objectContaining({ change: 'removed', key: 'activities/remove.json' }),
      expect.objectContaining({
        change: 'modified',
        fields: ['name'],
        key: 'trip.json'
      })
    ])
  );
});

test('returns no changes for identical repository trees', () => {
  const value = snapshot([{ path: 'trip.json', value: '{"name":"Same"}\n' }]);
  expect(VersionChanges.diff(value, value)).toEqual([]);
});
