import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupBillableTrip } from '#testing/payments';
import { createTripPoll } from '#testing/polls';
import { tripInput } from '#testing/trips';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

test.each(['polls', 'research'])(
  '%s pages retain progress through a completely protected candidate window',
  async (feed) => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dashboard');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_dashboard');
    const trip = await setupBillableTrip(1);
    const member = trip.users[0]!;
    const freeTrip = await member.client.action(api.routes.trips.create.run, {
      input: tripInput()
    });
    const route =
      feed === 'polls'
        ? api.routes.polls.list.open.page.run
        : api.routes.discussions.research.workspace.page.run;
    const size = feed === 'polls' ? 10 : 40;
    let now = Date.now();
    const clock = vi.spyOn(Date, 'now');
    const research = (client: typeof member.client, tripId: typeof trip.tripId, title: string) =>
      client.mutation(api.routes.discussions.research.create.run, {
        clientRequestId: crypto.randomUUID(),
        tripId,
        title
      });
    const older =
      feed === 'polls'
        ? await member.client.mutation(api.routes.polls.create.run, {
            tripId: freeTrip,
            question: 'Older accessible question',
            options: ['A', 'B'],
            multiSelect: false
          })
        : await research(member.client, freeTrip, 'Older accessible research');
    const createHidden = async (index: number): Promise<void> => {
      if (index === size) return;
      now += 7 * 60_000;
      clock.mockReturnValue(now);
      if (feed === 'polls')
        await createTripPoll(trip.owner, trip.tripId, { question: `Protected question ${index}` });
      else await research(trip.owner.client, trip.tripId, `Protected research ${index}`);
      await createHidden(index + 1);
    };
    await createHidden(0);
    const first = await member.client.query(route, {
      paginationOpts: { numItems: size, cursor: null }
    });
    expect(first.page).toEqual([]);
    expect(first.isDone).toBe(false);
    const next = await member.client.query(route, {
      paginationOpts: { numItems: size, cursor: first.continueCursor }
    });
    expect(next.page).toHaveLength(1);
    expect(next.page[0]!.id).toBe(older);
    expect(next.isDone).toBe(true);
    expect(JSON.stringify([first.page, next.page])).not.toContain('Protected');
    const outsider = await createOutsiderClient(trip.owner.test);
    expect(
      (await outsider.client.query(route, { paginationOpts: { numItems: size, cursor: null } }))
        .page
    ).toEqual([]);
    expect(
      (await trip.owner.client.query(route, { paginationOpts: { numItems: size, cursor: null } }))
        .page
    ).toHaveLength(size);
  }
);
