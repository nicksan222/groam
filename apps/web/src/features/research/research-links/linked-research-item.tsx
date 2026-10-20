import { Badge } from '@groam/ui/components/badge';
import { ArrowUpRight, Search } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';
import type { ResearchSummary } from '@/types/research';

export function LinkedResearchItem({
  research,
  tripId
}: {
  research: ResearchSummary;
  tripId: string;
}) {
  return (
    <Link
      aria-label={`Open research: ${research.title}`}
      className="group flex min-w-0 items-start gap-2.5 rounded-lg border border-border/60 p-3 text-left transition-colors hover:border-border hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      params={{ researchId: research.shortId, tripId }}
      to="/trips/$tripId/research/$researchId"
    >
      <Search aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm leading-5 font-medium text-foreground">
            {research.title}
          </span>
          {research.unread ? (
            <Badge className="px-1.5 py-0 text-xs" variant="secondary">
              New
            </Badge>
          ) : null}
        </span>
        <span className="line-clamp-2 block text-xs leading-5 text-muted-foreground">
          {research.brief?.trim() || 'Open findings, notes, and sources'}
        </span>
      </span>
      <ArrowUpRight
        aria-hidden
        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
      />
    </Link>
  );
}
