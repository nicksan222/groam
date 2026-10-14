import type { DashboardBuckets } from '@/features/dashboard/hooks/dashboard-model';
import { DraftsSection } from './drafts-section';
import { FeaturedTrips } from './featured-trips';
import { RecentIdeasSection } from './recent-ideas-section';
import { SettledSection } from './settled-section';
import { WaitingSection } from './waiting-section';

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
    </>
  );
}
