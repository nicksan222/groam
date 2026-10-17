import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { Vote } from 'lucide-react';
import { usePollSelection } from '@/features/polls/hooks/use-poll-selection';
import { testIds } from '@/lib/test-ids';
import type { Poll } from '@/types/polls';
import { PollOptionButton } from './poll-option-button';

const closeTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Why an open poll is read-only for this viewer. */
function voteRestriction(poll: Poll): string {
  if (poll.tripId) return 'Only travelers going or maybe can vote.';
  if (poll.discussionId) return 'Only people in this chat can vote.';
  return 'You can’t vote on this poll.';
}

/** A poll with live tallies. Voting again replaces the vote; an empty multi-select retracts it. */
export function PollCard({
  onClose,
  onRetract,
  onVote,
  poll
}: {
  onClose: () => Promise<unknown>;
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
      className="w-full max-w-[min(100%,32rem)] rounded-xl border border-border/70 bg-card p-3 text-card-foreground shadow-xs/5"
      data-poll-id={poll.id}
      data-testid={testIds.pollCard}
    >
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Vote aria-hidden className="size-3.5" />
            Asked by {poll.createdBy.name}
            {poll.multiSelect ? <span>· pick any</span> : null}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-foreground">{poll.question}</h3>
        </div>
        {closed ? <Badge variant="secondary">Closed</Badge> : null}
      </header>
      <div
        aria-busy={busy}
        aria-label={poll.question}
        className="flex flex-col gap-1.5"
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
        <p className="mt-2 text-xs text-muted-foreground">{voteRestriction(poll)}</p>
      ) : null}
      <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="min-w-0">
          <p aria-live="polite">
            <span>
              {poll.votedCount} of {poll.eligibleCount} voted
            </span>
            {poll.voters.length > 0 ? (
              <>
                <span aria-hidden className="mx-1.5">
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
          {!closed && selected.length > 0 ? (
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
        </span>
      </footer>
    </article>
  );
}
