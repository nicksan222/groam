import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { paginationArgs, setupGroup, tripInput } from '#testing/trips';

test('stores per-user trip favourites and surfaces them in the trip list', async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Group Member');
  const favoriteTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Favourite coast' })
  });
  const otherTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Later idea' })
  });

  await owner.client.mutation(api.routes.trips.preferences.favorite.run, {
    favorite: true,
    tripId: favoriteTripId
  });

  const ownerList = await owner.client.query(api.routes.trips.list.run, paginationArgs);
  expect(ownerList.page[0]).toMatchObject({ favorite: true, id: favoriteTripId });
  expect(ownerList.page.find((trip) => trip.id === otherTripId)).toMatchObject({
    favorite: false,
    id: otherTripId
  });

  const memberList = await member.client.query(api.routes.trips.list.run, paginationArgs);
  expect(memberList.page.every((trip) => trip.favorite === false)).toBe(true);

  await owner.client.mutation(api.routes.trips.preferences.favorite.run, {
    favorite: false,
    tripId: favoriteTripId
  });
  await expect(
    owner.client.query(api.routes.trips.list.run, paginationArgs)
  ).resolves.toMatchObject({
    page: expect.arrayContaining([expect.objectContaining({ favorite: false, id: favoriteTripId })])
  });
});
