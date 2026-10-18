import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';
import { draftChangedVersion } from '#testing/versions';

test(
  'sharing an idea notifies the reviewer, who can mark it read',
  { timeout: 30_000 },
  async () => {
    const { owner, tripId, users } = await setupTrip(2);
    const [reviewer, other] = users;
    if (!reviewer || !other) throw new Error('Expected members');
    const version = await draftChangedVersion(owner, tripId);
    await owner.client.action(api.routes.trips.versions.submit.run, {
      proposalId: version.proposalId
    });

    expect(await owner.client.query(api.routes.notifications.list.run, {})).toEqual([]);
    const inbox = await reviewer.client.query(api.routes.notifications.list.run, {});
    expect(inbox).toEqual([
      expect.objectContaining({
        href: `/ideas/${version.proposalId}`,
        kind: 'idea_shared',
        readAt: null,
        title: 'New idea on the trip'
      })
    ]);
    const notificationId = inbox[0]!.id;

    // Another member and an outsider cannot touch the reviewer's notification.
    await expect(
      other.client.mutation(api.routes.notifications.mark.read.run, { notificationId })
    ).rejects.toThrow('Notification not found');
    const outsider = await createOutsiderClient(owner.test);
    await expect(
      outsider.client.mutation(api.routes.notifications.mark.read.run, { notificationId })
    ).rejects.toThrow('Notification not found');

    await reviewer.client.mutation(api.routes.notifications.mark.read.run, { notificationId });
    const [read] = await reviewer.client.query(api.routes.notifications.list.run, {});
    expect(read?.readAt).toEqual(expect.any(Number));
    // Marking again keeps the original read time.
    await reviewer.client.mutation(api.routes.notifications.mark.read.run, { notificationId });
    expect((await reviewer.client.query(api.routes.notifications.list.run, {}))[0]?.readAt).toBe(
      read?.readAt
    );

    const otherInbox = await other.client.query(api.routes.notifications.list.run, {});
    expect(otherInbox).toHaveLength(1);
    await other.client.mutation(api.routes.notifications.mark.all.run, {});
    await other.client.mutation(api.routes.notifications.mark.all.run, {});
    expect(
      (await other.client.query(api.routes.notifications.list.run, {})).every(
        (row) => row.readAt !== null
      )
    ).toBe(true);
  }
);
