import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useMutation, useQuery } from 'convex/react';
import { useCallback } from 'react';
import { errorMessage } from '@/lib/errors';
import type { DiscussionListItem, DiscussionMember } from '@/types/discussions';

export type { DiscussionListItem, DiscussionMember };

export function useDiscussions(options?: 'skip') {
  const discussions = useQuery(api.routes.discussions.list.run, options === 'skip' ? 'skip' : {});
  return {
    discussions: discussions ?? [],
    isLoading: discussions === undefined
  };
}

export function useDiscussionRoster() {
  const members = useQuery(api.routes.discussions.roster.run, {});
  return {
    isLoading: members === undefined,
    members: members ?? []
  };
}

export function useCreateDiscussion() {
  const createMutation = useMutation(api.routes.discussions.create.run);

  const createDiscussion = useCallback(
    async (input: {
      clientRequestId: string;
      memberUserIds: string[];
      title: string;
      tripId?: Id<'trips'>;
    }): Promise<Id<'discussions'> | null> => {
      try {
        return await createMutation(input);
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to start this chat'));
        return null;
      }
    },
    [createMutation]
  );

  return { createDiscussion };
}

export function useRenameDiscussion() {
  const renameMutation = useMutation(api.routes.discussions.rename.run);

  const renameDiscussion = useCallback(
    async (discussionId: Id<'discussions'>, title: string): Promise<boolean> => {
      try {
        await renameMutation({ discussionId, title });
        toast.success('Chat renamed');
        return true;
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to rename this chat'));
        return false;
      }
    },
    [renameMutation]
  );

  return { renameDiscussion };
}
