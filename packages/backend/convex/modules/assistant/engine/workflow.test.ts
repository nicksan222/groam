import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mockModel } from '@convex-dev/agent';
import { listSteps, type WorkflowId } from '@convex-dev/workflow';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, components } from '#convex-generated/api';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { setupTrip } from '#testing/trips';
import { runUntil } from '#testing/workflows';

// Runs advance through workflow steps on scheduled functions.
vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

/**
 * Changing this hash means in-flight runs replay a different body and fail. Do not update the
 * constant to make this pass: add `agentRunV2` and route new runs to it instead.
 */
const FROZEN_AGENT_RUN_SHA256 = '05a078637630b9349313cbc518142e2dd2420de3fb12ed93c1459b569cac3f06';

test('frozen agentRun body', () => {
  const source = readFileSync(new URL('./workflow.ts', import.meta.url), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe(FROZEN_AGENT_RUN_SHA256);
});

test('a single turn journals one turn step', async () => {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: mockModel({ content: [{ text: 'Done.', type: 'text' }] }),
    modelId: 'test-model'
  } as never);
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Body',
    title: 'Journal',
    tripId
  });
  const runId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' },
    issueId
  });
  if (!runId) throw new Error('Expected a run');
  const runDoc = async () => await owner.test.run((ctx) => ctx.db.get('agentRuns', runId));
  await runUntil(owner.test, async () => (await runDoc())?.status === 'complete');
  const workflowId = (await runDoc())?.workflowId as WorkflowId;
  const steps = await owner.test.run((ctx) => listSteps(ctx, components.workflow, workflowId));
  expect(steps.page.map((step) => ({ kind: step.kind, name: step.name }))).toEqual([
    { kind: 'function', name: 'modules/assistant/engine/turn:run' }
  ]);
});
