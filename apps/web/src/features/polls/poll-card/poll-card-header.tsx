import { Vote } from '@groam/icons';
import { Badge } from '@groam/ui/components/badge';
import type { Poll } from '@/types/polls';

/** Who asked and what; inline, the row already says both, so only a multi-select hint stays. */
export function PollCardHeader({ inline, poll }: { inline: boolean; poll: Poll }) {
  if (inline) {
    return poll.multiSelect ? <p className="mb-2 text-xs text-muted-foreground">Pick any</p> : null;
  }
  return (
    <header className="mb-2 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Vote aria-hidden className="size-3.5" />
          Asked by {poll.createdBy.name}
          {poll.multiSelect ? <span>· pick any</span> : null}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-foreground">{poll.question}</h3>
      </div>
      {poll.status === 'closed' ? <Badge variant="secondary">Closed</Badge> : null}
    </header>
  );
}
