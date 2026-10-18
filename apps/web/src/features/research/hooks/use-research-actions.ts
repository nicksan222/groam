import { useCurrentAgentContext } from '@groam/ai/ui/context/agent-context';
import { serializeAgentScreenContext } from '@groam/ai/ui/context/agent-screen-context';
import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useAction, useMutation } from 'convex/react';
import { useCallback, useState } from 'react';
import { attempt, attemptValue, errorMessage } from '@/lib/errors';
import type { ResearchLinkTarget } from '@/types/research';
import { toBackendTarget } from './research-link-target';

/** Starting a research; the dialog's open state stays with the view that shows it. */
export function useCreateResearch(tripId: Id<'trips'>) {
  const createMutation = useMutation(api.routes.discussions.research.create.run);
  return useCallback(
    (input: { brief?: string; subject: string }) =>
      attemptValue(
        () =>
          createMutation({
            brief: input.brief,
            clientRequestId: crypto.randomUUID(),
            title: input.subject,
            tripId
          }),
        'Unable to start this research'
      ),
    [createMutation, tripId]
  );
}

export function useLinkResearch() {
  const linkMutation = useMutation(api.routes.discussions.research.links.link.run);
  return useCallback(
    (discussionId: Id<'discussions'>, target: ResearchLinkTarget) =>
      attempt(
        () => linkMutation({ discussionId, target: toBackendTarget(target) }),
        'Unable to link this research'
      ),
    [linkMutation]
  );
}

/** Edits and messages for one research: brief, delete, links, and the researcher summary. */
export function useResearchActions(discussionId: Id<'discussions'>) {
  const updateMutation = useMutation(api.routes.discussions.research.update.run);
  const removeMutation = useMutation(api.routes.discussions.research.remove.run);
  const unlinkMutation = useMutation(api.routes.discussions.research.links.unlink.run);
  const sendMutation = useMutation(api.routes.discussions.messages.send.run);
  // Loosely typed like the discussion send path: the serialized screen's trip id is a plain string.
  const respondAction: ReturnType<typeof useAction> = useAction(
    api.routes.discussions.messages.respond.run
  );
  const link = useLinkResearch();
  const context = useCurrentAgentContext();
  const [isSummarizing, setSummarizing] = useState(false);

  const summarize = useCallback(async () => {
    setSummarizing(true);
    try {
      const result = await sendMutation({
        assistantAgent: 'researcher',
        clientRequestId: crypto.randomUUID(),
        discussionId,
        text: 'Summarize this research'
      });
      if (result.assistantAgent && context) {
        void respondAction({
          discussionId,
          promptMessageId: result.messageId,
          screen: serializeAgentScreenContext(context)
        }).catch((error: unknown) => toast.error(errorMessage(error, 'Unable to get the summary')));
      }
      return true;
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Unable to ask for a summary'));
      return false;
    } finally {
      setSummarizing(false);
    }
  }, [context, discussionId, respondAction, sendMutation]);

  return {
    isSummarizing,
    link: (target: ResearchLinkTarget) => link(discussionId, target),
    remove: () => attempt(() => removeMutation({ discussionId }), 'Unable to delete this research'),
    summarize,
    unlink: (target: ResearchLinkTarget) =>
      attempt(
        () => unlinkMutation({ discussionId, target: toBackendTarget(target) }),
        'Unable to remove this link'
      ),
    updateBrief: (brief: string) =>
      attempt(() => updateMutation({ brief, discussionId }), 'Unable to save the brief')
  };
}
