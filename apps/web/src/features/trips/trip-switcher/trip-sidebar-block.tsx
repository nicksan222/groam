import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu
} from '@groam/ui/components/sidebar';
import { isRememberableTrip } from '@/features/trips/current-trip-preference';
import { useCurrentTrip } from '@/features/trips/hooks/use-current-trip';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { SidebarSearchButton } from '@/features/workspace/workspace-shell/sidebar-search-button';
import { useParams } from '@/lib/navigation/router';
import { currentTripSection } from './current-trip-section';
import { TripSidebarSectionItems } from './trip-sidebar-section-items';
import { TRIP_SWITCHER_LIMIT, TripSwitcher } from './trip-switcher';

/**
 * The sidebar's trip block: a header titled by the trip switcher with Search under it, then, for a
 * shared trip, its sections.
 */
export function TripSidebarBlock() {
  const { isLoading, onTripRoute, reference, trip } = useCurrentTrip();
  const params = useParams<{
    discussionId: string;
    issueId: string;
    proposalId: string;
    researchId: string;
    section: string;
  }>();
  const { trips } = useTrips({ includeArchived: false, initialNumItems: TRIP_SWITCHER_LIMIT });
  const section = onTripRoute || params.issueId ? currentTripSection(params) : null;
  const shared = isRememberableTrip(trip);

  return (
    <>
      <SidebarHeader className="gap-2 border-b border-sidebar-border/70 p-2 pb-3 group-data-[collapsible=icon]:pb-2">
        <SidebarMenu>
          <TripSwitcher
            isLoading={isLoading}
            reference={reference}
            section={section}
            trip={trip}
            trips={trips}
          />
        </SidebarMenu>
        <SidebarSearchButton />
      </SidebarHeader>
      <SidebarContent>
        {shared && reference ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <TripSidebarSectionItems
                  active={section}
                  archived={trip.archivedAt !== null}
                  reference={reference}
                  tripId={trip.id}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
    </>
  );
}
