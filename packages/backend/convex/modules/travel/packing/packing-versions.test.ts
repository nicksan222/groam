import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { VersionChanges } from '#convex/modules/travel/versions/diff';
import { openTripDraft, setupTrip, setupWritableTrip } from '#testing/trips';

type Actor = Pick<Awaited<ReturnType<typeof setupTrip>>['owner'], 'client'>;

async function approveAndApply(
  author: Actor,
  reviewer: Actor,
  proposalId: Id<'tripProposals'>,
  organizer: Actor = author
) {
  await author.client.action(api.routes.trips.versions.submit.run, { proposalId });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId
  });
  return organizer.client.action(api.routes.trips.versions.merge.run, { proposalId });
}

async function setupPackingPlan() {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected reviewer');
  const idea = await openTripDraft(owner, tripId);
  for (const label of ['Passport', 'Hat']) {
    await owner.client.mutation(api.routes.trips.packing.add.run, {
      label,
      tripId: idea.workingTripId
    });
  }
  expect(await approveAndApply(owner, reviewer, idea.proposalId)).toBe('applied');
  const items = await owner.client.query(api.routes.trips.packing.list.run, { tripId });
  const [passport, hat] = items;
  if (!passport || !hat) throw new Error('Expected packing items');
  return { owner, reviewer, tripId, passport, hat, items };
}

test(
  'packing additions produce normal diffs and require approval to apply',
  {
    timeout: 15_000
  },
  async () => {
    const { owner, tripId, users } = await setupTrip(1);
    const reviewer = users[0];
    if (!reviewer) throw new Error('Expected reviewer');
    const idea = await openTripDraft(owner, tripId);
    const item = await owner.client.mutation(api.routes.trips.packing.add.run, {
      label: 'Passport',
      tripId: idea.workingTripId
    });
    const proposal = await owner.client.query(api.routes.trips.versions.get.run, {
      proposalId: idea.proposalId
    });
    expect(proposal.changes).toMatchObject([
      {
        change: 'added',
        entity: 'packing',
        key: `packing/${item.id}.json`,
        label: 'Passport',
        fields: [
          { key: 'label', label: 'Item', after: 'Passport' },
          { key: 'quantity', label: 'Needed', after: 1 }
        ]
      }
    ]);
    await owner.client.action(api.routes.trips.versions.submit.run, {
      proposalId: idea.proposalId
    });
    await expect(
      owner.client.action(api.routes.trips.versions.merge.run, {
        proposalId: idea.proposalId
      })
    ).rejects.toThrow('needs 1 approval');
    await expect(
      owner.client.query(api.routes.trips.packing.list.run, { tripId })
    ).resolves.toEqual([]);
    await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId: idea.proposalId
    });
    await expect(
      owner.client.action(api.routes.trips.versions.merge.run, {
        proposalId: idea.proposalId
      })
    ).resolves.toBe('applied');
    await expect(
      owner.client.query(api.routes.trips.packing.list.run, { tripId })
    ).resolves.toMatchObject([{ label: 'Passport', quantity: 1 }]);
    await expect(
      owner.client.mutation(api.routes.trips.packing.update.run, {
        itemId: item.id,
        quantity: 3,
        tripId: idea.workingTripId
      })
    ).rejects.toThrow('Closed ideas are read-only');
  }
);

test(
  'clones packing with stable file keys and applies renames, check-offs, and removals',
  {
    timeout: 15_000
  },
  async () => {
    const { owner, reviewer, tripId, passport, hat, items } = await setupPackingPlan();
    const idea = await openTripDraft(owner, tripId);
    const copy = await owner.client.query(api.routes.trips.packing.list.run, {
      tripId: idea.workingTripId
    });
    const [copyPassport, copyHat] = copy;
    if (!copyPassport || !copyHat) throw new Error('Expected copied items');
    expect(copyPassport.id).not.toBe(passport.id);
    await expect(
      owner.client.query(api.routes.trips.versions.get.run, { proposalId: idea.proposalId })
    ).resolves.toMatchObject({ changes: [] });
    await owner.client.mutation(api.routes.trips.packing.update.run, {
      itemId: copyPassport.id,
      label: 'Travel documents',
      quantity: 3,
      tripId: idea.workingTripId
    });
    await owner.client.mutation(api.routes.trips.packing.remove.run, {
      itemId: copyHat.id,
      tripId: idea.workingTripId
    });
    const proposal = await owner.client.query(api.routes.trips.versions.get.run, {
      proposalId: idea.proposalId
    });
    expect(proposal.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: 'packing',
          change: 'modified',
          key: `packing/${passport.id}.json`,
          fields: expect.arrayContaining([
            expect.objectContaining({ key: 'quantity', before: 1, after: 3 })
          ])
        }),
        expect.objectContaining({
          entity: 'packing',
          change: 'removed',
          key: `packing/${hat.id}.json`
        })
      ])
    );
    await expect(
      owner.client.query(api.routes.trips.packing.list.run, { tripId })
    ).resolves.toEqual(items);
    expect(await approveAndApply(owner, reviewer, idea.proposalId)).toBe('applied');
    await expect(
      owner.client.query(api.routes.trips.packing.list.run, { tripId })
    ).resolves.toEqual([
      { bringers: [], brought: 0, id: passport.id, label: 'Travel documents', quantity: 3 }
    ]);
  }
);

test('editing packing invalidates earlier approvals', { timeout: 15_000 }, async () => {
  const { owner, reviewer, tripId } = await setupPackingPlan();
  const idea = await openTripDraft(owner, tripId);
  const [item] = await owner.client.query(api.routes.trips.packing.list.run, {
    tripId: idea.workingTripId
  });
  if (!item) throw new Error('Expected packing item');
  await owner.client.mutation(api.routes.trips.packing.update.run, {
    itemId: item.id,
    label: 'Travel documents',
    tripId: idea.workingTripId
  });
  await owner.client.action(api.routes.trips.versions.submit.run, { proposalId: idea.proposalId });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: idea.proposalId
  });
  await owner.client.mutation(api.routes.trips.packing.update.run, {
    itemId: item.id,
    quantity: 3,
    tripId: idea.workingTripId
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: idea.proposalId })
  ).resolves.toMatchObject({
    approvalCount: 0,
    canMerge: false
  });
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, { proposalId: idea.proposalId })
  ).rejects.toThrow('needs 1 approval');
});

test(
  'rebases independent packing changes without losing item identity',
  {
    timeout: 15_000
  },
  async () => {
    const { owner, reviewer, tripId, passport, hat } = await setupPackingPlan();
    const mine = await openTripDraft(owner, tripId);
    const theirs = await openTripDraft(reviewer, tripId);
    const mineItems = await owner.client.query(api.routes.trips.packing.list.run, {
      tripId: mine.workingTripId
    });
    const theirItems = await reviewer.client.query(api.routes.trips.packing.list.run, {
      tripId: theirs.workingTripId
    });
    const minePassport = mineItems.find((item) => item.label === 'Passport');
    const theirHat = theirItems.find((item) => item.label === 'Hat');
    if (!minePassport || !theirHat) throw new Error('Expected cloned items');
    await owner.client.mutation(api.routes.trips.packing.update.run, {
      itemId: minePassport.id,
      quantity: 3,
      tripId: mine.workingTripId
    });
    await reviewer.client.mutation(api.routes.trips.packing.update.run, {
      itemId: theirHat.id,
      label: 'Sun hat',
      tripId: theirs.workingTripId
    });
    expect(await approveAndApply(reviewer, owner, theirs.proposalId, owner)).toBe('applied');
    await owner.client.action(api.routes.trips.versions.submit.run, {
      proposalId: mine.proposalId
    });
    await expect(
      owner.client.action(api.routes.trips.versions.rebase.run, {
        proposalId: mine.proposalId,
        resolutions: []
      })
    ).resolves.toEqual({ kind: 'applied' });
    const proposal = await owner.client.query(api.routes.trips.versions.get.run, {
      proposalId: mine.proposalId
    });
    expect(proposal.changes).toMatchObject([
      {
        key: `packing/${passport.id}.json`,
        change: 'modified',
        fields: [{ key: 'quantity', before: 1, after: 3 }]
      }
    ]);
    await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId: mine.proposalId
    });
    await expect(
      owner.client.action(api.routes.trips.versions.merge.run, { proposalId: mine.proposalId })
    ).resolves.toBe('applied');
    await expect(
      owner.client.query(api.routes.trips.packing.list.run, { tripId })
    ).resolves.toEqual([
      { bringers: [], brought: 0, id: passport.id, label: 'Passport', quantity: 3 },
      { bringers: [], brought: 0, id: hat.id, label: 'Sun hat', quantity: 1 }
    ]);
  }
);

test(
  'surfaces packing conflicts and resolves them through the standard idea choices',
  {
    timeout: 15_000
  },
  async () => {
    const { owner, reviewer, tripId, passport } = await setupPackingPlan();
    const mine = await openTripDraft(owner, tripId);
    const theirs = await openTripDraft(reviewer, tripId);
    for (const [actor, idea, label] of [
      [owner, mine, 'My documents'],
      [reviewer, theirs, 'Our documents']
    ] as const) {
      const [item] = await actor.client.query(api.routes.trips.packing.list.run, {
        tripId: idea.workingTripId
      });
      if (!item) throw new Error('Expected packing item');
      await actor.client.mutation(api.routes.trips.packing.update.run, {
        itemId: item.id,
        label,
        tripId: idea.workingTripId
      });
    }
    expect(await approveAndApply(reviewer, owner, theirs.proposalId, owner)).toBe('applied');
    expect(await approveAndApply(owner, reviewer, mine.proposalId)).toBe('conflicted');
    const path = `packing/${passport.id}.json`;
    await expect(
      owner.client.query(api.routes.trips.versions.get.run, { proposalId: mine.proposalId })
    ).resolves.toMatchObject({
      conflicts: [{ entity: 'packing', key: path, label: 'My documents' }]
    });
    await expect(
      owner.client.action(api.routes.trips.versions.rebase.run, {
        proposalId: mine.proposalId,
        resolutions: [{ path, choice: 'current' }]
      })
    ).resolves.toEqual({ kind: 'applied' });
    const [resolved] = await owner.client.query(api.routes.trips.packing.list.run, {
      tripId: mine.workingTripId
    });
    expect(resolved).toMatchObject({ label: 'Our documents' });
    await expect(
      owner.client.query(api.routes.trips.versions.get.run, { proposalId: mine.proposalId })
    ).resolves.toMatchObject({ changes: [], conflicts: [] });
  }
);

test(
  'an idea adds an item and a bringer, shows both in the diff, and applies them',
  { timeout: 30_000 },
  async () => {
    const { owner, tripId, users } = await setupTrip(1);
    const reviewer = users[0];
    if (!reviewer) throw new Error('Expected reviewer');
    const idea = await openTripDraft(owner, tripId);
    const tent = await owner.client.mutation(api.routes.trips.packing.add.run, {
      label: 'Tent',
      quantity: 2,
      tripId: idea.workingTripId
    });
    await owner.client.mutation(api.routes.trips.packing.bring.run, {
      count: 2,
      itemId: tent.id,
      tripId: idea.workingTripId,
      userId: reviewer.userId
    });
    const proposal = await owner.client.query(api.routes.trips.versions.get.run, {
      proposalId: idea.proposalId
    });
    expect(proposal.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entity: 'packing', label: 'Tent' }),
        expect.objectContaining({
          change: 'added',
          entity: 'packingBringer',
          key: `packingBringers/${tent.id}--${reviewer.userId}.json`,
          label: expect.stringMatching(/^Tent · .+/u),
          fields: [expect.objectContaining({ key: 'count', label: 'Bringing', after: 2 })]
        })
      ])
    );
    // Nothing reaches the shared trip before the idea applies.
    await expect(
      owner.client.query(api.routes.trips.packing.list.run, { tripId })
    ).resolves.toEqual([]);

    expect(await approveAndApply(owner, reviewer, idea.proposalId)).toBe('applied');
    const [shared] = await owner.client.query(api.routes.trips.packing.list.run, { tripId });
    expect(shared).toMatchObject({ brought: 2, label: 'Tent', quantity: 2 });
    expect(shared?.bringers).toMatchObject([{ count: 2, userId: reviewer.userId }]);
    expect(shared?.id).not.toBe(tent.id);
  }
);

test(
  'two ideas bringing one item for different travelers both apply',
  { timeout: 30_000 },
  async () => {
    const { owner, reviewer, tripId, hat } = await setupPackingPlan();
    const mine = await openTripDraft(owner, tripId);
    const theirs = await openTripDraft(reviewer, tripId);
    for (const [actor, idea] of [
      [owner, mine],
      [reviewer, theirs]
    ] as const) {
      const copy = (
        await actor.client.query(api.routes.trips.packing.list.run, {
          tripId: idea.workingTripId
        })
      ).find((item) => item.label === 'Hat');
      if (!copy) throw new Error('Expected copied hat');
      await actor.client.mutation(api.routes.trips.packing.bring.run, {
        count: 1,
        itemId: copy.id,
        tripId: idea.workingTripId,
        userId: actor.userId
      });
    }
    expect(await approveAndApply(reviewer, owner, theirs.proposalId, owner)).toBe('applied');
    await owner.client.action(api.routes.trips.versions.submit.run, {
      proposalId: mine.proposalId
    });
    await expect(
      owner.client.action(api.routes.trips.versions.rebase.run, {
        proposalId: mine.proposalId,
        resolutions: []
      })
    ).resolves.toEqual({ kind: 'applied' });
    await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId: mine.proposalId
    });
    await expect(
      owner.client.action(api.routes.trips.versions.merge.run, { proposalId: mine.proposalId })
    ).resolves.toBe('applied');
    const items = await owner.client.query(api.routes.trips.packing.list.run, { tripId });
    const sharedHat = items.find((item) => item.id === hat.id);
    expect(sharedHat?.brought).toBe(2);
    expect(sharedHat?.bringers.map((row) => row.userId).sort()).toEqual(
      [owner.userId, reviewer.userId].sort()
    );
  }
);

test('removing an item in an idea removes its bringers when applied', async () => {
  const { owner, reviewer, tripId, hat } = await setupPackingPlan();
  const seed = await openTripDraft(owner, tripId);
  const seeded = (
    await owner.client.query(api.routes.trips.packing.list.run, { tripId: seed.workingTripId })
  ).find((item) => item.label === 'Hat');
  if (!seeded) throw new Error('Expected copied hat');
  await owner.client.mutation(api.routes.trips.packing.bring.run, {
    count: 1,
    itemId: seeded.id,
    tripId: seed.workingTripId,
    userId: owner.userId
  });
  expect(await approveAndApply(owner, reviewer, seed.proposalId)).toBe('applied');

  const idea = await openTripDraft(owner, tripId);
  const copy = (
    await owner.client.query(api.routes.trips.packing.list.run, { tripId: idea.workingTripId })
  ).find((item) => item.label === 'Hat');
  if (!copy) throw new Error('Expected copied hat');
  expect(copy.bringers).toHaveLength(1);
  await owner.client.mutation(api.routes.trips.packing.remove.run, {
    itemId: copy.id,
    tripId: idea.workingTripId
  });
  expect(await approveAndApply(owner, reviewer, idea.proposalId)).toBe('applied');
  const items = await owner.client.query(api.routes.trips.packing.list.run, { tripId });
  expect(items.some((item) => item.id === hat.id)).toBe(false);
  const bringers = await owner.test.run((ctx) => ctx.db.query('tripPackingBringers').collect());
  expect(bringers.filter((row) => row.tripId === tripId)).toEqual([]);
});

test('legacy checklist files never show in diffs', () => {
  const legacy = {
    path: 'packing/old.json',
    value: `${JSON.stringify({ label: 'Old', packed: true, sortOrder: 0 })}\n`
  };
  expect(VersionChanges.diff({ files: [legacy] }, { files: [] })).toEqual([]);
});

test('the cleanup drops legacy rows and keeps current ones', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  await owner.client.mutation(api.routes.trips.packing.add.run, { label: 'Hat', tripId });
  const organizationId = owner.organizationId ?? 'org';
  await owner.test.run(async (ctx) => {
    await ctx.db.insert('tripPackingItems', {
      label: 'Old',
      organizationId,
      packed: true,
      sortOrder: 9,
      tripId,
      updatedAt: 0
    });
  });
  await expect(
    owner.test.mutation(internal.modules.travel.packing.cleanup.dropLegacyItems, {})
  ).resolves.toEqual({ deleted: 1, done: true });
  const rows = await owner.test.run((ctx) => ctx.db.query('tripPackingItems').collect());
  expect(rows.map((row) => row.label)).toEqual(['Hat']);
});

async function copiedHat(actor: Actor & { userId: string }, workingTripId: Id<'trips'>) {
  const hat = (
    await actor.client.query(api.routes.trips.packing.list.run, { tripId: workingTripId })
  ).find((item) => item.label === 'Hat');
  if (!hat) throw new Error('Expected copied hat');
  return hat;
}

test(
  'a bringer added on an item another idea removed is dropped on rebase',
  { timeout: 30_000 },
  async () => {
    const { owner, reviewer, tripId, hat } = await setupPackingPlan();
    const remover = await openTripDraft(owner, tripId);
    const claimer = await openTripDraft(reviewer, tripId);
    await owner.client.mutation(api.routes.trips.packing.remove.run, {
      itemId: (await copiedHat(owner, remover.workingTripId)).id,
      tripId: remover.workingTripId
    });
    await reviewer.client.mutation(api.routes.trips.packing.bring.run, {
      count: 1,
      itemId: (await copiedHat(reviewer, claimer.workingTripId)).id,
      tripId: claimer.workingTripId,
      userId: reviewer.userId
    });
    expect(await approveAndApply(owner, reviewer, remover.proposalId)).toBe('applied');
    await reviewer.client.action(api.routes.trips.versions.submit.run, {
      proposalId: claimer.proposalId
    });
    await expect(
      reviewer.client.action(api.routes.trips.versions.rebase.run, {
        proposalId: claimer.proposalId,
        resolutions: []
      })
    ).resolves.toEqual({ kind: 'applied' });
    await owner.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId: claimer.proposalId
    });
    await expect(
      owner.client.action(api.routes.trips.versions.merge.run, {
        proposalId: claimer.proposalId
      })
    ).resolves.toBe('applied');
    const items = await owner.client.query(api.routes.trips.packing.list.run, { tripId });
    expect(items.some((item) => item.id === hat.id)).toBe(false);
    const bringers = await owner.test.run((ctx) => ctx.db.query('tripPackingBringers').collect());
    expect(bringers.filter((row) => row.tripId === tripId)).toEqual([]);
  }
);

test(
  'conflicting counts for one item and traveler surface as a packing assignment',
  { timeout: 30_000 },
  async () => {
    const { owner, reviewer, tripId } = await setupPackingPlan();
    const mine = await openTripDraft(owner, tripId);
    const theirs = await openTripDraft(reviewer, tripId);
    for (const [actor, idea, count] of [
      [owner, mine, 1],
      [reviewer, theirs, 3]
    ] as const) {
      const copy = await copiedHat(actor, idea.workingTripId);
      await actor.client.mutation(api.routes.trips.packing.bring.run, {
        count,
        itemId: copy.id,
        tripId: idea.workingTripId,
        userId: owner.userId
      });
    }
    expect(await approveAndApply(reviewer, owner, theirs.proposalId, owner)).toBe('applied');
    expect(await approveAndApply(owner, reviewer, mine.proposalId)).toBe('conflicted');
    const proposal = await owner.client.query(api.routes.trips.versions.get.run, {
      proposalId: mine.proposalId
    });
    expect(proposal.conflicts).toMatchObject([
      { entity: 'packingBringer', label: 'Packing assignment' }
    ]);
    expect(proposal.conflicts[0]?.key).toMatch(/^packingBringers\/.+--.+\.json$/u);
  }
);

test('a no-op bring keeps earlier approvals', { timeout: 30_000 }, async () => {
  const { owner, reviewer, tripId } = await setupPackingPlan();
  const idea = await openTripDraft(owner, tripId);
  const hat = await copiedHat(owner, idea.workingTripId);
  const bring = {
    count: 1,
    itemId: hat.id,
    tripId: idea.workingTripId,
    userId: owner.userId
  };
  await owner.client.mutation(api.routes.trips.packing.bring.run, bring);
  await owner.client.action(api.routes.trips.versions.submit.run, { proposalId: idea.proposalId });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: idea.proposalId
  });
  await owner.client.mutation(api.routes.trips.packing.bring.run, bring);
  await owner.client.mutation(api.routes.trips.packing.bring.run, {
    ...bring,
    count: 0,
    userId: reviewer.userId
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: idea.proposalId })
  ).resolves.toMatchObject({ approvalCount: 1 });
});

test(
  'assigning a traveler to bring an item asks them to review the idea',
  { timeout: 15_000 },
  async () => {
    const { owner, tripId, users } = await setupTrip(2);
    const [friend, latecomer] = users;
    if (!friend || !latecomer) throw new Error('Expected travelers');
    const idea = await openTripDraft(owner, tripId);
    const tent = await owner.client.mutation(api.routes.trips.packing.add.run, {
      label: 'Tent',
      quantity: 3,
      tripId: idea.workingTripId
    });
    const bring = (userId: string, count = 1) =>
      owner.client.mutation(api.routes.trips.packing.bring.run, {
        count,
        itemId: tent.id,
        tripId: idea.workingTripId,
        userId
      });
    const humanReviewers = async () =>
      (
        await owner.client.query(api.routes.trips.versions.get.run, {
          proposalId: idea.proposalId
        })
      ).reviewers.flatMap((reviewer) => (reviewer.kind === 'user' ? [reviewer.userId] : []));

    await bring(owner.userId);
    await bring(friend.userId);
    await bring(friend.userId, 2);
    expect(await humanReviewers()).toEqual([friend.userId]);

    await owner.client.action(api.routes.trips.versions.submit.run, {
      proposalId: idea.proposalId
    });
    await bring(latecomer.userId);
    expect(await humanReviewers()).toEqual([friend.userId, latecomer.userId]);
    const inbox = await latecomer.client.query(api.routes.notifications.list.run, {});
    expect(inbox.map((row) => row.title)).toContain('Your review is requested');
  }
);
