import Shell from '@groam/ui/components/shell/client';
import type { DashboardBuckets } from '@/features/dashboard/hooks/dashboard-model';

const statusSegments = [
  { countKey: 'drafts', label: 'Drafts', tone: 'bg-muted-foreground/35' },
  { countKey: 'inReview', label: 'In review', tone: 'bg-info' },
  { countKey: 'conflicts', label: 'Resolve changes', tone: 'bg-warning' },
  { countKey: 'decided', label: 'Decided', tone: 'bg-success' }
] as const;

export function RecentIdeasSection({ snapshot }: { snapshot: DashboardBuckets['ideaSnapshot'] }) {
  if (snapshot.total === 0) return null;
  const ideaLabel = snapshot.total === 1 ? 'idea' : 'ideas';

  return (
    <Shell.Section aria-labelledby="dashboard-recent-ideas-heading" stack="sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h2
          className="text-sm font-semibold tracking-tight text-foreground"
          id="dashboard-recent-ideas-heading"
        >
          Recent ideas
        </h2>
        <p className="text-xs text-muted-foreground">
          Based on the {snapshot.total} most recent {ideaLabel}.
        </p>
      </div>
      <div
        aria-label="Recent idea status distribution"
        className="flex h-1.5 overflow-hidden rounded-sm bg-muted"
        role="img"
      >
        {statusSegments.map((segment) => {
          const count = snapshot[segment.countKey];
          if (count === 0) return null;
          return (
            <span
              aria-hidden
              className={segment.tone}
              key={segment.countKey}
              style={{ width: `${(count / snapshot.total) * 100}%` }}
            />
          );
        })}
      </div>
      <ul aria-label="Recent idea status values" className="flex flex-wrap gap-x-5 gap-y-2">
        {statusSegments.map((segment) => (
          <li
            className="flex items-center gap-2 text-xs text-muted-foreground"
            key={segment.countKey}
          >
            <span aria-hidden className={`size-1.5 rounded-sm ${segment.tone}`} />
            <span>{segment.label}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {snapshot[segment.countKey]}
            </span>
          </li>
        ))}
      </ul>
    </Shell.Section>
  );
}
