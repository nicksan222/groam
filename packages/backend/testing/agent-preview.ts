import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { insertWithShortId } from '#convex/modules/references/index';
import type { createTest } from '#testing/factory';

/** Queue a real discussion run without executing an external model provider. */
export function queuePreviewDiscussionRun(
  test: ReturnType<typeof createTest>,
  args: { threadId: string; userId: string; organizationId: string }
) {
  return test.run(async (ctx) => {
    // Legacy owner-audience discussions remain supported by the access policy.
    const discussionId = await insertWithShortId(ctx, 'discussions', {
      clientRequestId: crypto.randomUUID(),
      kind: 'assistant',
      createdBy: { name: 'Owner', userId: args.userId },
      organizationId: args.organizationId,
      threadId: args.threadId,
      title: 'Private owner conversation',
      updatedAt: Date.now()
    });
    return AgentRuns.queueDiscussionTurn(ctx, {
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: args.userId },
      discussionId,
      organizationId: args.organizationId,
      threadId: args.threadId,
      title: 'Protected queued conversation'
    });
  });
}
