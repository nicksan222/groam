import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { paginationArgs, setupGroup, tripInput } from '#testing/trips';

test('lists every trip in the active group with status and planning summaries', async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Group Member');
  const activeTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({
      dateNotes: 'First week of August',
      destination: { name: 'Split', status: 'known' },
      name: 'Croatia coast'
    })
  });
  const archivedTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Old idea' })
  });
  await owner.client.mutation(api.routes.trips.archive.run, { tripId: archivedTripId });

  const expected = {
    page: expect.arrayContaining([
      expect.objectContaining({
        archivedAt: null,
        dateNotes: 'First week of August',
        destination: 'Split',
        favorite: false,
        id: activeTripId,
        nextAction: 'Continue planning together',
        outstandingActionCount: 0
      }),
      expect.objectContaining({
        archivedAt: expect.any(Number),
        favorite: false,
        id: archivedTripId,
        nextAction: 'Restore this trip to continue planning'
      })
    ])
  };
  await expect(
    owner.client.query(api.routes.trips.list.run, paginationArgs)
  ).resolves.toMatchObject(expected);
  await expect(
    member.client.query(api.routes.trips.list.run, paginationArgs)
  ).resolves.toMatchObject(expected);
});

test('reports every missing planning action and validates pagination size', async () => {
  const { owner } = await setupGroup();
  await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Missing both' })
  });
  await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({
      destination: { name: 'Lisbon', status: 'known' },
      name: 'Missing dates'
    })
  });
  await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ dateNotes: 'Late May', name: 'Missing destination' })
  });

  const result = await owner.client.query(api.routes.trips.list.run, paginationArgs);
  expect(result.page.find(({ name }) => name === 'Missing both')).toMatchObject({
    nextAction: 'Decide on a destination',
    outstandingActionCount: 2
  });
  expect(result.page.find(({ name }) => name === 'Missing dates')).toMatchObject({
    nextAction: 'Agree on the travel period',
    outstandingActionCount: 1
  });
  expect(result.page.find(({ name }) => name === 'Missing destination')).toMatchObject({
    nextAction: 'Decide on a destination',
    outstandingActionCount: 1
  });
  await expect(
    owner.client.query(api.routes.trips.list.run, {
      paginationOpts: { cursor: null, numItems: 0 }
    })
  ).rejects.toThrow('trip page size must be between 1 and 25');
  await expect(
    owner.client.query(api.routes.trips.list.run, {
      paginationOpts: { cursor: null, numItems: 26 }
    })
  ).rejects.toThrow('trip page size must be between 1 and 25');
});

test('isolates trip lists by active group', async () => {
  const first = await setupGroup();
  const second = await setupGroup();
  await first.owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'First group trip' })
  });

  await expect(
    second.owner.client.query(api.routes.trips.list.run, paginationArgs)
  ).resolves.toMatchObject({ page: [] });
});

test('can list only active trips for compact sidebar navigation', async () => {
  const { owner } = await setupGroup();
  const olderActiveId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Older live trip' })
  });
  const archivedTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Shelved trip' })
  });
  const newerActiveId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Newer live trip' })
  });
  await owner.client.mutation(api.routes.trips.archive.run, { tripId: archivedTripId });

  const listed = await owner.client.query(api.routes.trips.list.run, {
    includeArchived: false,
    paginationOpts: { cursor: null, numItems: 2 }
  });
  expect(listed.page).toHaveLength(2);
  expect(listed.page.map((trip) => trip.id)).toEqual([newerActiveId, olderActiveId]);
  expect(listed.page.every((trip) => trip.archivedAt === null)).toBe(true);
});

test('does not repeat favourites on later trip list pages', async () => {
  const { owner } = await setupGroup();
  const favoriteTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Pinned favourite' })
  });
  await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Trip A' })
  });
  await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Trip B' })
  });
  await owner.client.mutation(api.routes.trips.preferences.favorite.run, {
    favorite: true,
    tripId: favoriteTripId
  });

  const firstPage = await owner.client.query(api.routes.trips.list.run, {
    includeArchived: false,
    paginationOpts: { cursor: null, numItems: 2 }
  });
  expect(firstPage.page.map((trip) => trip.id)).toContain(favoriteTripId);

  const secondPage = await owner.client.query(api.routes.trips.list.run, {
    includeArchived: false,
    paginationOpts: { cursor: firstPage.continueCursor, numItems: 2 }
  });
  expect(secondPage.page.map((trip) => trip.id)).not.toContain(favoriteTripId);
});

test('pins favourites ahead of paginated non-favourites on the first page', async () => {
  const { owner } = await setupGroup();
  const favoriteTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Pinned favourite' })
  });
  await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Newer trip A' })
  });
  await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Newer trip B' })
  });
  await owner.client.mutation(api.routes.trips.preferences.favorite.run, {
    favorite: true,
    tripId: favoriteTripId
  });

  const listed = await owner.client.query(api.routes.trips.list.run, {
    includeArchived: false,
    paginationOpts: { cursor: null, numItems: 2 }
  });

  expect(listed.page[0]).toMatchObject({ favorite: true, id: favoriteTripId });
  expect(listed.page).toHaveLength(3);
  expect(listed.page.filter((trip) => trip.favorite)).toHaveLength(1);
});
