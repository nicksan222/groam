import Shell from '@groam/ui/components/shell/client';
import type { DashboardBuckets } from '@/features/dashboard/hooks/dashboard-model';
import { DraftsSection } from './drafts-section';
import { FeaturedTrips } from './featured-trips';
import { SettledSection } from './settled-section';
import { WaitingSection } from './waiting-section';
export function DashboardReady({ buckets }: { buckets: DashboardBuckets }) {
  const drafts = buckets.yourDrafts.slice(0, 6);
  const settled = buckets.recentlySettled.slice(0, 4);
  return (
    <>
      {buckets.waitingOnYou.length ? (
        <WaitingSection items={buckets.waitingOnYou.slice(0, 4)} />
      ) : null}
      <FeaturedTrips trips={buckets.activeTrips.slice(0, 4)} />
      {drafts.length && settled.length ? (
        <Shell.TwoColumns>
          <Shell.LeftColumn>
            <DraftsSection items={drafts} />
          </Shell.LeftColumn>
          <Shell.RightColumn>
            <SettledSection items={settled} />
          </Shell.RightColumn>
        </Shell.TwoColumns>
      ) : (
        <>
          {drafts.length ? <DraftsSection items={drafts} /> : null}
          {settled.length ? <SettledSection items={settled} /> : null}
        </>
      )}
    </>
  );
}
