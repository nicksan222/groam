import Shell from '@groam/ui/components/shell/client';
import { Luggage } from 'lucide-react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { testIds } from '@/lib/test-ids';
import { GroupGearSection } from './group-gear-section';
import { PackingErrorBoundary } from './packing-error-boundary';
import { PersonalPackingList } from './personal-packing-list';

/**
 * The trip's Packing tab: group gear (versioned through ideas) leading, with the viewer's
 * private list beside it on wide panels and below it on narrow ones. The same panel serves the shared trip and an idea's working copy.
 */
export function TripPackingPanel({
  onStartPackingIdea,
  startingIdea,
  trip
}: {
  onStartPackingIdea?: (claimGear?: string) => void;
  startingIdea?: boolean;
  trip: TripDetail;
}) {
  return (
    <TripSectionPanel
      description="Who brings what, plus your own list."
      icon={Luggage}
      testId={testIds.tripPackingPanel}
      title="Packing"
    >
      <Shell.TwoColumns>
        <Shell.LeftColumn>
          <Shell.Card stack="lg" variant="panel">
            <PackingErrorBoundary what="the group gear">
              <GroupGearSection
                onStartPackingIdea={onStartPackingIdea}
                startingIdea={startingIdea}
                trip={trip}
              />
            </PackingErrorBoundary>
          </Shell.Card>
        </Shell.LeftColumn>
        <Shell.RightColumn>
          <Shell.Card stack="lg" variant="panel">
            <PackingErrorBoundary what="your list">
              <PersonalPackingList trip={trip} />
            </PackingErrorBoundary>
          </Shell.Card>
        </Shell.RightColumn>
      </Shell.TwoColumns>
    </TripSectionPanel>
  );
}
