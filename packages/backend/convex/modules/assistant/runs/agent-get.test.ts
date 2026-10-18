import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createTest } from '#testing/factory';
import { setupGroup } from '#testing/trips';

test('agent detail and review settings are workspace-scoped', { timeout: 30_000 }, async () => {
  const { owner, addUser } = await setupGroup();
  await expect(
    owner.client.query(api.routes.agents.get.run, { agentId: 'issue' })
  ).resolves.toMatchObject({ id: 'issue', latestRun: null, status: 'idle' });
  await expect(
    owner.client.query(api.routes.agents.get.run, { agentId: 'nobody' } as never)
  ).rejects.toThrow();

  await expect(owner.client.query(api.routes.settings.reviews.get.run, {})).resolves.toEqual({
    canManage: true,
    requiredApprovals: expect.any(Number)
  });
  await owner.client.mutation(api.routes.settings.reviews.set.run, { requiredApprovals: 2 });
  const member = await addUser('Member');
  await expect(member.client.query(api.routes.settings.reviews.get.run, {})).resolves.toEqual({
    canManage: false,
    requiredApprovals: 2
  });
  await expect(createTest().query(api.routes.settings.reviews.get.run, {})).rejects.toThrow(
    'Not authenticated'
  );
});
