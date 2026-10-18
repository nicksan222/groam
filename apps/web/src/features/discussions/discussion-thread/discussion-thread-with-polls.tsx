import type { Id } from '@groam/backend/data-model';
import { useMemo } from 'react';
import { ChatPollDialog } from '@/features/polls/create-poll/chat-poll-dialog';
import { useDiscussionPolls, usePollActions } from '@/features/polls/hooks/use-polls';
import { PollCard } from '@/features/polls/poll-card/poll-card';
import { usePollDialogStore } from '@/lib/stores/poll-dialog-store';
import type { ComposerCommand } from '@/types/discussions';
import { DiscussionThreadBody } from './discussion-thread-body';

/** The thread with its linked polls placed by time and a "/poll" composer action. */
export function DiscussionThreadWithPolls({
  discussionId,
  threadId
}: {
  discussionId: Id<'discussions'>;
  threadId: null | string;
}) {
  const { polls } = useDiscussionPolls(discussionId);
  const actions = usePollActions();
  const events = useMemo(
    () =>
      polls.map((poll) => ({
        content: (
          <PollCard
            onClose={() => actions.close(poll.id)}
            onRetract={() => actions.retract(poll.id)}
            onVote={(optionIds) => actions.vote(poll.id, optionIds)}
            poll={poll}
          />
        ),
        createdAt: poll.createdAt,
        key: `poll:${poll.id}`
      })),
    [actions, polls]
  );
  const commands = useMemo<ComposerCommand[]>(
    () => [
      {
        description: 'Ask everyone in this chat to vote',
        name: 'poll',
        run: () => usePollDialogStore.getState().open(discussionId)
      }
    ],
    [discussionId]
  );
  return (
    <>
      <DiscussionThreadBody
        commands={commands}
        discussionId={discussionId}
        events={events}
        threadId={threadId}
      />
      <ChatPollDialog discussionId={discussionId} />
    </>
  );
}
