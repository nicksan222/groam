import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupWritableTrip } from '#testing/trips';

test(
  'refuses an idea review for a proposal owned by another group',
  { timeout: 15_000 },
  async () => {
    const { owner, proposalId } = await setupWritableTrip(0);
    const outsider = await createOutsiderClient(owner.test);
    const runsBefore = await owner.test.run((ctx) => ctx.db.query('agentRuns').take(100));

    await expect(
      outsider.client.action(api.routes.trips.versions.reviewers.agent.run.run, { proposalId })
    ).rejects.toThrow('Idea trip not found');

    await expect(owner.test.run((ctx) => ctx.db.query('agentRuns').take(100))).resolves.toEqual(
      runsBefore
    );
  }
);
