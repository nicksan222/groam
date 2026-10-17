import type { DashboardBuckets } from '@/features/dashboard/hooks/dashboard-model';
import { AgentActivitySection } from './agent-activity-section';
import { AgentWaitsSection } from './agent-waits-section';
import { AssignedIssuesSection } from './assigned-issues-section';
import { DashboardSectionBoundary } from './dashboard-section-boundary';
import { DraftsSection } from './drafts-section';
import { FeaturedTrips } from './featured-trips';
import { OpenIssuesSection } from './open-issues-section';
import { OpenPollsSection } from './open-polls-section';
import { RecentIdeasSection } from './recent-ideas-section';
import { ResearchSection } from './research-section';
import { SettledSection } from './settled-section';
import { WaitingSection } from './waiting-section';

/**
 * Two zones, in order. "Needs you" (the viewer's to-dos): idea reviews, agent runs waiting on the
 * group, the viewer's issues, polls to vote on. "What's going on": agent activity, open issues,
 * research, then recent ideas, trips, drafts and settled ideas. Sections that fetch their own data
 * sit in a boundary, so one failing source hides only itself.
 */
export function DashboardReady({ buckets }: { buckets: DashboardBuckets }) {
  const waiting = buckets.waitingOnYou.slice(0, 3);
  const trips = buckets.activeTrips.slice(0, 4);
  const ideas = buckets.yourDrafts.slice(0, 4);
  const decided = buckets.recentlySettled.slice(0, 4);

  return (
    <>
      {waiting.length > 0 ? <WaitingSection items={waiting} /> : null}
      <RecentIdeasSection snapshot={buckets.ideaSnapshot} />
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.8fr)] lg:items-start">
        <FeaturedTrips trips={trips} />
        <DraftsSection items={ideas} />
      </div>
      {decided.length > 0 ? <SettledSection items={decided} /> : null}
      {/* New activity below the original dashboard: your to-dos first, then what is going on. */}
      <DashboardSectionBoundary>
        <AgentWaitsSection />
      </DashboardSectionBoundary>
      <DashboardSectionBoundary>
        <AssignedIssuesSection />
      </DashboardSectionBoundary>
      <DashboardSectionBoundary>
        <OpenPollsSection />
      </DashboardSectionBoundary>
      <DashboardSectionBoundary>
        <AgentActivitySection />
      </DashboardSectionBoundary>
      <DashboardSectionBoundary>
        <OpenIssuesSection />
      </DashboardSectionBoundary>
      <DashboardSectionBoundary>
        <ResearchSection />
      </DashboardSectionBoundary>
    </>
  );
}
