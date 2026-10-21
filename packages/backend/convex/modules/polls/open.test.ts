import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { createTripPoll } from '#testing/polls';
import { setupTrip } from '#testing/trips';

test('open polls list newest first with trip name and viewerHasVoted', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a member');
  const first = await createTripPoll(owner, tripId, { question: 'First?' });
  const second = await createTripPoll(owner, tripId, { question: 'Second?' });
  const groupPoll = await owner.client.mutation(api.routes.polls.create.run, {
    multiSelect: false,
    options: ['A', 'B', 'C'],
    question: 'Group?'
  });
  await owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId: first });
  const mine = await owner.client
    .query(api.routes.polls.list.open.page.run, { paginationOpts: { cursor: null, numItems: 10 } })
    .then((result) => result.page);
  expect(mine.map((item) => item.id)).toEqual([groupPoll, second, first]);
  expect(mine.map((item) => item.viewerHasVoted)).toEqual([false, false, true]);
  expect(mine[0]).toMatchObject({ optionCount: 3, tripId: null, tripName: null, votedCount: 0 });
  expect(mine[2]).toMatchObject({ optionCount: 2, tripId, votedCount: 1 });
  expect(mine[2]?.tripName).toEqual(expect.any(String));
  const theirs = await member.client
    .query(api.routes.polls.list.open.page.run, { paginationOpts: { cursor: null, numItems: 10 } })
    .then((result) => result.page);
  expect(theirs.every((item) => !item.viewerHasVoted)).toBe(true);
});

test('open poll pages exclude closed polls and continue after ten raw candidates', async () => {
  const { owner, tripId } = await setupTrip(0);
  const closed = await createTripPoll(owner, tripId);
  await owner.client.mutation(api.routes.polls.close.run, { pollId: closed });
  for (let index = 0; index < 11; index += 1) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- creation order is the assertion
    await createTripPoll(owner, tripId, { question: `Q${index}?` });
  }
  const firstPage = await owner.client.query(api.routes.polls.list.open.page.run, {
    paginationOpts: { cursor: null, numItems: 10 }
  });
  expect(firstPage.isDone).toBe(false);
  const nextPage = await owner.client.query(api.routes.polls.list.open.page.run, {
    paginationOpts: { cursor: firstPage.continueCursor, numItems: 10 }
  });
  expect(nextPage.isDone).toBe(true);
  expect(nextPage.page.map((poll) => poll.question)).toEqual(['Q0?']);
  const open = firstPage.page;
  expect(open).toHaveLength(10);
  expect(open.some((item) => item.id === closed)).toBe(false);
  expect(open[0]?.question).toBe('Q10?');
});

test('chat polls are hidden from non-members; outsiders are denied', async () => {
  const { owner, tripId, users } = await setupTrip(2);
  const [member, other] = users;
  if (!member || !other) throw new Error('Expected members');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: `open-polls-${crypto.randomUUID()}`,
    memberUserIds: [member.userId],
    title: 'Private chat'
  });
  const chatPoll = await owner.client.mutation(api.routes.polls.create.run, {
    discussionId,
    multiSelect: false,
    options: ['A', 'B'],
    question: 'In chat?'
  });
  await createTripPoll(owner, tripId);
  const ids = async (client: typeof owner.client) =>
    (
      await client
        .query(api.routes.polls.list.open.page.run, {
          paginationOpts: { cursor: null, numItems: 10 }
        })
        .then((result) => result.page)
    ).map((item) => item.id);
  expect(await ids(member.client)).toContain(chatPoll);
  expect(await ids(other.client)).not.toContain(chatPoll);
  expect(await ids(other.client)).toHaveLength(1);
  const outsider = await createOutsiderClient(owner.test);
  await expect(
    outsider.client
      .query(api.routes.polls.list.open.page.run, {
        paginationOpts: { cursor: null, numItems: 10 }
      })
      .then((result) => result.page)
  ).resolves.toEqual([]);
  await expect(
    owner.test
      .query(api.routes.polls.list.open.page.run, {
        paginationOpts: { cursor: null, numItems: 10 }
      })
      .then((result) => result.page)
  ).rejects.toThrow();
});
