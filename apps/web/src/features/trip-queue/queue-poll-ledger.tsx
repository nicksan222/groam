import { MessageSquare, MoreHorizontal, Trash2 } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { chatHref } from '@/features/discussions/chat/chat-href';
import { usePollSelection } from '@/features/polls/hooks/use-poll-selection';
import { usePollActions } from '@/features/polls/hooks/use-polls';
import { Link } from '@/features/workspace/navigation/router';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import { testIds } from '@/lib/test-ids';
import type { Poll } from '@/types/polls';
import { QueuePollOption } from './queue-poll-option';

/** Why an open poll is read-only for this viewer. */
function voteRestriction(poll: Poll, archived: boolean): string {
  if (archived) return 'This trip is archived.';
  if (poll.tripId) return 'Only travelers going or maybe can vote.';
  if (poll.discussionId) return 'Only people in this chat can vote.';
  return 'You can’t vote on this poll.';
}

/**
 * A poll opened in place, written for the ledger: its options sit under the row's title column,
 * each a full-width row that votes on click (a single choice replaces the vote; a multi-select
 * toggles; emptying it retracts), then one footer line with the turnout and the poll's actions.
 */
export function QueuePollLedger({ archived, poll }: { archived: boolean; poll: Poll }) {
  const actions = usePollActions();
  const confirm = useConfirm();
  const closed = poll.status === 'closed';
  const { busy, retract, selected, toggle } = usePollSelection(
    poll,
    (optionIds) => actions.vote(poll.id, optionIds),
    () => actions.retract(poll.id)
  );
  const picked = new Set(selected);
  const remove = async () => {
    const sure = await confirm(
      'Delete this poll?',
      'The question and every vote on it are removed for everyone. This cannot be undone.'
    );
    if (sure) await actions.remove(poll.id);
  };
  const top = Math.max(0, ...poll.tallies.map((option) => option.count));
  const readOnly = closed || !poll.canVote;
  return (
    <article
      aria-label={`Poll: ${poll.question}`}
      className="relative z-10 flex max-w-[560px] flex-col gap-2 pb-3 text-foreground"
      data-poll-id={poll.id}
      data-testid={testIds.pollCard}
    >
      <div
        aria-busy={busy}
        aria-label={poll.question}
        className="flex flex-col gap-2"
        role={poll.multiSelect ? 'group' : 'radiogroup'}
      >
        {poll.tallies.map((option) => (
          <QueuePollOption
            count={option.count}
            disabled={readOnly}
            key={option.id}
            label={option.label}
            leading={top > 0 && option.count === top}
            multiSelect={poll.multiSelect}
            onToggle={() => toggle(option.id)}
            pending={busy}
            selected={picked.has(option.id)}
            share={poll.votedCount === 0 ? 0 : option.count / poll.votedCount}
            winner={closed && top > 0 && option.count === top}
          />
        ))}
      </div>
      {!closed && !poll.canVote ? (
        <p className="text-xs text-muted-foreground">{voteRestriction(poll, archived)}</p>
      ) : null}
      <footer className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted-foreground">
        <span aria-live="polite">
          {poll.votedCount} of {poll.eligibleCount} voted
        </span>
        {!readOnly && selected.length > 0 ? (
          <>
            <span aria-hidden>·</span>
            <Button
              className="cursor-pointer underline-offset-4 hover:text-foreground hover:underline"
              data-testid={testIds.pollRetract}
              onClick={retract}
              type="button"
              unstyled
            >
              Remove my vote
            </Button>
          </>
        ) : null}
        <span className="ml-auto flex items-center gap-1">
          {poll.discussionId ? (
            <Link
              className="inline-flex items-center gap-2 rounded-md px-2 py-1 underline-offset-4 hover:text-foreground hover:underline"
              {...chatHref({ discussionId: poll.discussionId, tripId: poll.tripId })}
            >
              <MessageSquare aria-hidden className="size-3.5" />
              In chat
            </Link>
          ) : null}
          {poll.canClose ? (
            <Button
              data-testid={testIds.pollClose}
              onClick={() => void actions.close(poll.id)}
              size="xs"
              variant="ghost"
            >
              Close poll
            </Button>
          ) : null}
          {poll.canDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label="Poll actions" size="icon-xs" type="button" variant="ghost">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  data-testid={testIds.pollDelete}
                  onSelect={() => void remove()}
                  variant="destructive"
                >
                  <Trash2 />
                  Delete poll
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </span>
      </footer>
    </article>
  );
}
