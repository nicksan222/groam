import { agentRunTime } from '@groam/ai/backend/runs/time';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { DashboardResearch } from '@/types/dashboard';

export function ResearchRow({ research }: { research: DashboardResearch }) {
  return (
    <Link
      className="group flex min-w-0 items-center justify-between gap-3 border-b border-border p-3 last:border-b-0 hover:bg-muted/60"
      data-testid={testIds.dashboardResearchRow}
      params={{ researchId: research.shortId, tripId: research.tripId }}
      to="/trips/$tripId/research/$researchId"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-muted-foreground">
          {research.tripName} · {agentRunTime(research.lastActivityAt)}
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2">
          {research.unread ? (
            <span
              aria-label="Unread"
              className="size-2 shrink-0 rounded-full bg-primary"
              role="img"
            />
          ) : null}
          <span className="truncate text-sm font-semibold text-foreground">{research.title}</span>
        </span>
        {research.lastMessage ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {research.lastMessage.authorName}: {research.lastMessage.text}
          </span>
        ) : null}
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
