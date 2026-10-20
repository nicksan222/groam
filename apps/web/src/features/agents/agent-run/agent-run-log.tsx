import type { Id } from '@groam/backend/data-model';
import { CircleDashed } from '@groam/icons';
import { Skeleton } from '@groam/ui/components/skeleton';
import Timeline from '@groam/ui/components/timeline';
import type { ReactNode } from 'react';
import type { AgentRunEvent } from '@/features/agents/hooks/use-agent-run';
import { AgentRunLogEvent } from './agent-run-log-event';

function QuietRow({ children }: { children: ReactNode }) {
  return (
    <Timeline.Item condensed>
      <Timeline.Badge aria-hidden className="border-border/50 bg-muted/40 text-muted-foreground">
        <CircleDashed />
      </Timeline.Badge>
      <Timeline.Body className="block pt-0.5 text-xs leading-5 text-muted-foreground">
        {children}
      </Timeline.Body>
    </Timeline.Item>
  );
}

function ActivityRows({
  error,
  isActive,
  isLoading,
  issue,
  items
}: {
  error?: string | null;
  isActive: boolean;
  isLoading: boolean;
  issue?: { issueId: Id<'tripIssues'>; issueTitle: string | null } | null;
  items: AgentRunEvent[];
}) {
  if (isLoading) {
    return (
      <Timeline.Item aria-busy="true" aria-label="Loading activity" condensed role="status">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <Timeline.Body className="block space-y-2 pt-1">
          {[0, 1, 2].map((index) => (
            <Skeleton className="h-4 w-full max-w-md" key={index} />
          ))}
        </Timeline.Body>
      </Timeline.Item>
    );
  }
  if (!items.length) {
    return (
      <QuietRow>
        {isActive ? (
          <>
            <span className="font-medium text-foreground/80">Waiting for activity</span> ·{' '}
            <span>Updates automatically</span>
          </>
        ) : (
          <span className="font-medium text-foreground/80">No activity recorded</span>
        )}
      </QuietRow>
    );
  }
  return items.map((event) => (
    <AgentRunLogEvent error={error} event={event} issue={issue} key={event.id} />
  ));
}

/** One GitHub-style activity rail: optional lead-in, recorded events, then the closing entries. */
export function AgentRunLog({
  after,
  before,
  error,
  events,
  isActive = false,
  isLoading = false,
  issue,
  loadEarlier
}: {
  after?: ReactNode;
  before?: ReactNode;
  error?: string | null;
  events?: AgentRunEvent[];
  isActive?: boolean;
  isLoading?: boolean;
  issue?: { issueId: Id<'tripIssues'>; issueTitle: string | null } | null;
  loadEarlier?: ReactNode;
}) {
  return (
    <section aria-label="Run activity" className="min-w-0">
      <h2 className="sr-only">Timeline</h2>
      <Timeline aria-label="Run log" clipSidebar variant="activity">
        {loadEarlier ? (
          <Timeline.Item condensed>
            <Timeline.Badge aria-hidden className="border-dashed bg-background" />
            <Timeline.Body className="flex flex-wrap items-center justify-start gap-2">
              {loadEarlier}
              <span className="text-xs text-muted-foreground">Earlier activity is available.</span>
            </Timeline.Body>
          </Timeline.Item>
        ) : null}
        {before}
        <ActivityRows
          error={error}
          isActive={isActive}
          isLoading={isLoading}
          issue={issue}
          items={events ?? []}
        />
        {after}
      </Timeline>
    </section>
  );
}
