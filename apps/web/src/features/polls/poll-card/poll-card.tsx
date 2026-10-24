import { Trash2, MoreHorizontal } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { usePollSelection } from '@/features/polls/hooks/use-poll-selection';
import { testIds } from '@/lib/test-ids';
import type { Poll } from '@/types/polls';
import { PollCardHeader } from './poll-card-header';
import { PollOptionButton } from './poll-option-button';

const closeTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Why an open poll is read-only for this viewer. */
function voteRestriction(poll: Poll, archived: boolean): string {
  if (archived) return 'This trip is archived.';
  if (poll.tripId) return 'Only travelers going or maybe can vote.';
  if (poll.discussionId) return 'Only people in this chat can vote.';
  return 'You can’t vote on this poll.';
}

/** A poll with live tallies. Voting again replaces the vote; an empty multi-select retracts it. */
export function PollCard({
  archived = false,
  inline = false,
  onClose,
  onDelete,
  onRetract,
  onVote,
  poll
}: {
  /** The poll's trip is archived, so it is read-only for everyone. */
  archived?: boolean;
  /** Drops the card chrome and the question, for a row that already shows them. */
  inline?: boolean;
  onClose: () => Promise<unknown>;
  /** Offered to the creator or an admin (`poll.canDelete`); the caller asks for confirmation. */
  onDelete?: () => Promise<unknown>;
  onRetract: () => Promise<unknown>;
  onVote: (optionIds: string[]) => Promise<unknown>;
  poll: Poll;
}) {
  const closed = poll.status === 'closed';
  const { busy, retract, selected, toggle } = usePollSelection(poll, onVote, onRetract);
  const selectedIds = new Set(selected);
  return (
    <article
      aria-label={`Poll: ${poll.question}`}
      className={
        inline
          ? 'w-full max-w-[40rem] text-foreground'
          : 'w-full max-w-[min(100%,32rem)] rounded-xl border border-border/70 bg-card p-3 text-card-foreground shadow-xs/5'
      }
      data-poll-id={poll.id}
      data-testid={testIds.pollCard}
    >
      <PollCardHeader inline={inline} poll={poll} />
      <div
        aria-busy={busy}
        aria-label={poll.question}
        className="flex flex-col gap-2"
        role={poll.multiSelect ? 'group' : 'radiogroup'}
      >
        {poll.tallies.map((option) => (
          <PollOptionButton
            count={option.count}
            disabled={closed || !poll.canVote}
            key={option.id}
            label={option.label}
            multiSelect={poll.multiSelect}
            onToggle={() => toggle(option.id)}
            selected={selectedIds.has(option.id)}
            share={poll.votedCount === 0 ? 0 : option.count / poll.votedCount}
          />
        ))}
      </div>
      {!closed && !poll.canVote ? (
        <p className="mt-2 text-xs text-muted-foreground">{voteRestriction(poll, archived)}</p>
      ) : null}
      <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="min-w-0">
          <p aria-live="polite">
            <span>
              {poll.votedCount} of {poll.eligibleCount} voted
            </span>
            {poll.voters.length > 0 ? (
              <>
                <span aria-hidden className="mx-2">
                  ·
                </span>
                <span>{poll.voters.map((voter) => voter.name).join(', ')}</span>
              </>
            ) : null}
          </p>
          {!closed && poll.closesAt !== null ? (
            <p>Closes {closeTime.format(poll.closesAt)}</p>
          ) : null}
        </div>
        <span className="flex gap-1">
          {!closed && poll.canVote && selected.length > 0 ? (
            <Button data-testid={testIds.pollRetract} onClick={retract} size="xs" variant="ghost">
              Remove my vote
            </Button>
          ) : null}
          {poll.canClose ? (
            <Button
              data-testid={testIds.pollClose}
              onClick={() => void onClose()}
              size="xs"
              variant="outline"
            >
              Close poll
            </Button>
          ) : null}
          {poll.canDelete && onDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label="Poll actions" size="icon-xs" type="button" variant="ghost">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  data-testid={testIds.pollDelete}
                  onSelect={() => void onDelete()}
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
