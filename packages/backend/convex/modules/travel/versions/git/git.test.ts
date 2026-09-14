import { expect, test } from 'vitest';
import { TripGit } from './index';

const identity = { name: 'Casey Traveler', userId: 'casey-user' };
const snapshot = (name: string) => ({
  files: [
    { path: 'trip.json', value: `{"name":"${name}"}\n` },
    { path: 'destinations/lisbon.json', value: '{"name":"Lisbon"}\n' }
  ]
});
const historyInput = {
  base: {
    identity,
    message: 'Base Lisbon itinerary',
    snapshot: snapshot('Lisbon'),
    timestamp: 1_800_000_000_000
  },
  current: {
    identity: { name: 'Trip Organizer', userId: 'organizer' },
    message: 'Current Lisbon itinerary',
    snapshot: snapshot('Lisbon'),
    timestamp: 1_800_000_002_000
  },
  merge: {
    identity: { name: 'Trip Organizer', userId: 'organizer' },
    message: 'Merge Lisbon proposal',
    timestamp: 1_800_000_002_000
  },
  tip: {
    identity,
    message: 'Propose Lisbon itinerary',
    snapshot: snapshot('Lisbon by train'),
    timestamp: 1_800_000_001_000
  }
};

test('creates real git commits with proposal and merge parentage', async () => {
  const history = await TripGit.createHistory(historyInput);

  expect(history.baseCommit).toMatch(/^[a-f0-9]{40}$/u);
  expect(history.tipCommit).toMatch(/^[a-f0-9]{40}$/u);
  expect(history.mergeCommit).toMatch(/^[a-f0-9]{40}$/u);
  expect(history.baseFiles).toEqual(['destinations/lisbon.json', 'trip.json']);
  expect(history.baseParents).toEqual([]);
  expect(history.currentCommit).toBe(history.baseCommit);
  expect(history.currentParents).toEqual([]);
  expect(history.tipParents).toEqual([history.baseCommit]);
  expect(history.mergeParents).toEqual([history.baseCommit, history.tipCommit]);
  expect(new Set([history.baseCommit, history.tipCommit, history.mergeCommit]).size).toBe(3);
});

test('automatically merges compatible changes from diverged branches', async () => {
  const history = await TripGit.createHistory({
    ...historyInput,
    current: {
      ...historyInput.current,
      snapshot: {
        files: [
          { path: 'trip.json', value: '{"name":"Lisbon"}\n' },
          { path: 'destinations/lisbon.json', value: '{"name":"Lisbon","notes":"Current"}\n' }
        ]
      }
    }
  });

  expect(history.currentCommit).not.toBe(history.baseCommit);
  expect(history.currentParents).toEqual([history.baseCommit]);
  expect(history.mergeParents).toEqual([history.currentCommit, history.tipCommit]);
  expect(history.mergedSnapshot?.files).toEqual(
    expect.arrayContaining([
      { path: 'trip.json', value: '{"name":"Lisbon by train"}\n' },
      {
        path: 'destinations/lisbon.json',
        value: '{"name":"Lisbon","notes":"Current"}\n'
      }
    ])
  );
});

test('reports true conflicts instead of overwriting either side', async () => {
  await expect(
    TripGit.createHistory({
      ...historyInput,
      current: {
        ...historyInput.current,
        snapshot: snapshot('Lisbon by air')
      }
    })
  ).rejects.toMatchObject({
    data: { code: 'trip_merge_conflict', paths: ['trip.json'] }
  });
});

test('is deterministic for the same git history', async () => {
  expect(await TripGit.createHistory(historyInput)).toEqual(
    await TripGit.createHistory(historyInput)
  );
});

test('rejects unsafe and oversized git snapshots before writing objects', async () => {
  await expect(
    TripGit.createHistory({
      base: {
        ...historyInput.base,
        snapshot: { files: [{ path: '../outside.json', value: '{}' }] }
      }
    })
  ).rejects.toThrow('invalid Git path');
  await expect(
    TripGit.createHistory({
      base: {
        ...historyInput.base,
        snapshot: { files: [{ path: 'trip.json', value: 'x'.repeat(800 * 1024 + 1) }] }
      }
    })
  ).rejects.toThrow('too large');
});
