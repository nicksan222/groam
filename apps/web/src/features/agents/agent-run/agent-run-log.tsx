import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { Skeleton } from '@groam/ui/components/skeleton';
import Timeline from '@groam/ui/components/timeline';
import { Activity, ListFilter } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import type { AgentRunEvent } from '@/features/agents/hooks/use-agent-run';
import { AgentRunLogEvent } from './agent-run-log-event';

const filters = ['All activity', 'Thoughts', 'Tool calls', 'Errors'] as const;

function visibleEvents(events: AgentRunEvent[], filter: (typeof filters)[number]) {
  return events.filter((event) =>
    filter === 'Thoughts'
      ? event.kind === 'thought'
      : filter === 'Tool calls'
        ? event.kind === 'tool'
        : filter === 'Errors'
          ? event.kind === 'error' || event.ok === false
          : true
  );
}

function EmptyActivity({ hasEvents, isActive }: { hasEvents: boolean; isActive: boolean }) {
  const title = hasEvents
    ? 'No matching activity'
    : isActive
      ? 'Waiting for activity'
      : 'No activity recorded';
  const description = hasEvents
    ? 'Try another filter or load earlier events when available.'
    : isActive
      ? 'New events will appear here as the agent works.'
      : 'There are no recorded events to show for this run.';
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
        <ListFilter aria-hidden className="size-4 text-muted-foreground" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function ActivityTimeline({
  error,
  hasEvents,
  isActive,
  isLoading,
  issue,
  items
}: {
  error?: string | null;
  hasEvents: boolean;
  isActive: boolean;
  isLoading: boolean;
  issue?: { issueId: Id<'tripIssues'>; issueTitle: string | null } | null;
  items: AgentRunEvent[];
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading activity" className="space-y-4" role="status">
        {[0, 1, 2].map((index) => (
          <Skeleton className="h-12 w-full rounded-lg" key={index} />
        ))}
      </div>
    );
  }
  if (!items.length) return <EmptyActivity hasEvents={hasEvents} isActive={isActive} />;
  return (
    <Timeline aria-label="Run log" clipSidebar variant="minimal">
      {items.map((event) => (
        <AgentRunLogEvent error={error} event={event} issue={issue} key={event.id} />
      ))}
    </Timeline>
  );
}

export function AgentRunLog({
  error,
  events,
  isActive = false,
  isLoading = false,
  issue,
  loadEarlier
}: {
  error?: string | null;
  events?: AgentRunEvent[];
  isActive?: boolean;
  isLoading?: boolean;
  issue?: { issueId: Id<'tripIssues'>; issueTitle: string | null } | null;
  loadEarlier?: ReactNode;
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All activity');
  const items = events ?? [];
  const visible = visibleEvents(items, filter);
  return (
    <section aria-label="Run activity" className="min-w-0 rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Activity aria-hidden className="size-4 text-muted-foreground" />
          Timeline
        </h2>
        {isActive ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-success motion-safe:animate-pulse"
            />
            Updates automatically
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Recorded activity</span>
        )}
      </div>
      {items.length > 0 && !isLoading ? (
        <fieldset
          className="flex min-w-0 flex-wrap items-center gap-1 border-b border-border/60 px-4 py-2.5"
          aria-label="Filter activity"
        >
          {filters.map((label) => (
            <Button
              aria-pressed={filter === label}
              key={label}
              onClick={() => setFilter(label)}
              size="sm"
              variant={filter === label ? 'secondary' : 'ghost'}
            >
              {label}
            </Button>
          ))}
          <span className="ml-auto px-1 text-xs tabular-nums text-muted-foreground">
            {visible.length} shown
          </span>
        </fieldset>
      ) : null}
      <div className="min-w-0 p-5">
        {loadEarlier ? (
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {loadEarlier}
            <span className="text-xs text-muted-foreground">Earlier activity is available.</span>
          </div>
        ) : null}
        <ActivityTimeline
          error={error}
          hasEvents={items.length > 0}
          isActive={isActive}
          isLoading={isLoading}
          issue={issue}
          items={visible}
        />
      </div>
    </section>
  );
}
