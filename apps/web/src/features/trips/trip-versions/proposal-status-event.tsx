import Timeline from '@groam/ui/components/timeline';
import { CheckCircle2, X } from 'lucide-react';

export function ProposalStatusEvent({
  authorName,
  status
}: {
  authorName: string;
  status: 'closed' | 'merged';
}) {
  return (
    <Timeline.Item condensed>
      <Timeline.Badge
        className={
          status === 'merged' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }
      >
        {status === 'merged' ? <CheckCircle2 /> : <X />}
      </Timeline.Badge>
      <Timeline.Body className="block">
        <p className="text-sm">
          <strong className="font-semibold text-foreground">{authorName}</strong>{' '}
          <span className="text-muted-foreground">
            {status === 'merged' ? 'applied this idea.' : 'closed this idea.'}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This idea is no longer accepting review comments.
        </p>
      </Timeline.Body>
    </Timeline.Item>
  );
}
