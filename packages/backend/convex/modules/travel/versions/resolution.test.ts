import { expect, test } from 'vitest';
import { VersionMerge } from './resolution';
import type { VersionSnapshot } from './snapshot/types';

const file = (path: string, value: string) => ({ path, value });

const base: VersionSnapshot = {
  files: [
    file('trip.json', '{"name":"Base"}\n'),
    file('destinations/lisbon.json', '{"name":"Lisbon"}\n')
  ]
};
const current: VersionSnapshot = {
  files: [
    file('trip.json', '{"name":"Current"}\n'),
    file('destinations/lisbon.json', '{"name":"Lisbon"}\n')
  ]
};
const proposed: VersionSnapshot = {
  files: [
    file('trip.json', '{"name":"Proposed"}\n'),
    file('destinations/lisbon.json', '{"name":"Lisbon"}\n')
  ]
};

test('detectConflictPaths lists only paths changed on both sides', () => {
  expect(VersionMerge.conflicts(base, current, proposed)).toEqual(['trip.json']);
  expect(
    VersionMerge.conflicts(base, current, {
      files: [
        file('trip.json', '{"name":"Base"}\n'),
        file('destinations/lisbon.json', '{"name":"Lisbon","notes":"Idea"}\n')
      ]
    })
  ).toEqual([]);
  expect(
    VersionMerge.conflicts(
      base,
      {
        files: [
          file('trip.json', '{"name":"Base"}\n'),
          file('destinations/porto.json', '{"name":"Porto"}\n')
        ]
      },
      proposed
    )
  ).toEqual([]);
});

test('resolveConflictSnapshot applies chosen sides for each conflict path', () => {
  const resolved = VersionMerge.resolve({
    base,
    conflictPaths: ['trip.json'],
    current,
    proposed,
    resolutions: [{ choice: 'proposed', path: 'trip.json' }]
  });
  expect(resolved.files).toEqual([
    file('destinations/lisbon.json', '{"name":"Lisbon"}\n'),
    file('trip.json', '{"name":"Proposed"}\n')
  ]);
});

test('resolveConflictSnapshot keeps auto-mergeable paths when branches diverged safely', () => {
  const resolved = VersionMerge.resolve({
    base,
    current: {
      files: [
        file('trip.json', '{"name":"Base"}\n'),
        file('destinations/lisbon.json', '{"name":"Lisbon","notes":"Current"}\n')
      ]
    },
    proposed: {
      files: [
        file('trip.json', '{"name":"Proposed"}\n'),
        file('destinations/lisbon.json', '{"name":"Lisbon"}\n')
      ]
    },
    conflictPaths: ['trip.json'],
    resolutions: [{ choice: 'current', path: 'trip.json' }]
  });
  expect(resolved.files).toEqual([
    file('destinations/lisbon.json', '{"name":"Lisbon","notes":"Current"}\n'),
    file('trip.json', '{"name":"Base"}\n')
  ]);
});

test('resolveConflictSnapshot rejects incomplete or stale resolutions', () => {
  expect(() =>
    VersionMerge.resolve({ base, conflictPaths: ['trip.json'], current, proposed, resolutions: [] })
  ).toThrow('Choose a resolution for every conflict');
  expect(() =>
    VersionMerge.resolve({
      base,
      conflictPaths: ['trip.json'],
      current,
      proposed,
      resolutions: [
        { choice: 'current', path: 'trip.json' },
        { choice: 'proposed', path: 'trip.json' }
      ]
    })
  ).toThrow('Choose a resolution for every conflict');
  expect(() =>
    VersionMerge.resolve({
      base,
      current: {
        files: [
          file('trip.json', '{"name":"Base"}\n'),
          file('destinations/lisbon.json', '{"name":"Lisbon","notes":"Source edit"}\n')
        ]
      },
      proposed: {
        files: [
          file('trip.json', '{"name":"Base"}\n'),
          file('destinations/lisbon.json', '{"name":"Lisbon","notes":"Proposal edit"}\n')
        ]
      },
      conflictPaths: ['trip.json'],
      resolutions: [{ choice: 'current', path: 'trip.json' }]
    })
  ).toThrow('Recheck conflicts before applying');
});

test('resolveConflictSnapshot omits deleted files when no side retains them', () => {
  const resolved = VersionMerge.resolve({
    base: { files: [file('trip.json', '{"name":"Base"}\n'), file('activities/old.json', '{}')] },
    conflictPaths: ['trip.json'],
    current: { files: [file('trip.json', '{"name":"Current"}\n')] },
    proposed: { files: [file('trip.json', '{"name":"Proposed"}\n')] },
    resolutions: [{ choice: 'proposed', path: 'trip.json' }]
  });
  expect(resolved.files).toEqual([file('trip.json', '{"name":"Proposed"}\n')]);
});
