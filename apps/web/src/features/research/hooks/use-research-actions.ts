import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useMutation } from 'convex/react';
import { useCallback } from 'react';
import { attempt, attemptValue } from '@/lib/errors';
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

/** Edits for one research: brief, delete, and linked trip items. */
export function useResearchActions(discussionId: Id<'discussions'>) {
  const updateMutation = useMutation(api.routes.discussions.research.update.run);
  const removeMutation = useMutation(api.routes.discussions.research.remove.run);
  const unlinkMutation = useMutation(api.routes.discussions.research.links.unlink.run);
  const link = useLinkResearch();

  return {
    link: (target: ResearchLinkTarget) => link(discussionId, target),
    remove: () => attempt(() => removeMutation({ discussionId }), 'Unable to delete this research'),
    unlink: (target: ResearchLinkTarget) =>
      attempt(
        () => unlinkMutation({ discussionId, target: toBackendTarget(target) }),
        'Unable to remove this link'
      ),
    updateBrief: (brief: string) =>
      attempt(() => updateMutation({ brief, discussionId }), 'Unable to save the brief')
  };
}
