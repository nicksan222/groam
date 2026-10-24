import { CheckCircle2, Circle, RotateCcw, Sparkles } from '@groam/icons';
import Timeline from '@groam/ui/components/timeline';
import { cn } from '@groam/ui/lib/utils';
import { relativeDate } from '@/lib/relative-date';
import { testIds } from '@/lib/test-ids';
import { IssueEventChip } from './issue-event-chip';

/** A checked condition moving the issue by itself, with the rule that decided it as the reason. */
export function IssueAutoStatusEvent({
  change,
  label,
  timestamp
}: {
  change: 'resolved' | 'reopened';
  label: string;
  timestamp: number;
}) {
  const resolved = change === 'resolved';
  const ReasonIcon = resolved ? CheckCircle2 : Circle;
  return (
    <Timeline.Item condensed data-change={change} data-testid={testIds.issueAutoStatusEvent}>
      <Timeline.Badge
        aria-hidden
        className={cn(
          resolved
            ? 'border-success/30 bg-success/10 text-success-foreground'
            : 'border-border/50 bg-muted/40 text-muted-foreground'
        )}
      >
        {resolved ? <Sparkles /> : <RotateCcw />}
      </Timeline.Badge>
      <Timeline.Body className="block">
        <p className="text-xs leading-6 text-muted-foreground">
          <span className="font-medium text-foreground">
            {resolved ? 'Resolved automatically' : 'Reopened automatically'}
          </span>{' '}
          because{' '}
          <IssueEventChip
            leading={
              <ReasonIcon
                aria-hidden
                className={cn(
                  'size-3 shrink-0',
                  resolved ? 'text-success-foreground' : 'text-muted-foreground'
                )}
              />
            }
          >
            {label}
          </IssueEventChip>
          {resolved ? null : ' no longer holds'}{' '}
          <time dateTime={new Date(timestamp).toISOString()}>{relativeDate(timestamp)}</time>
        </p>
      </Timeline.Body>
    </Timeline.Item>
  );
}
