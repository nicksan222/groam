import type { Id } from '@groam/backend/data-model';
import Shell from '@groam/ui/components/shell/client';
import { useTripIssues } from '@/features/trips/hooks/use-trip-issues';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripSection } from '@/features/trips/trip-sections';
import { tripSectionLabels } from '@/features/trips/trip-sections';
import { testIds } from '@/lib/test-ids';

const sectionTabs = [
  { key: 'overview', testId: testIds.tripSectionOverview, title: tripSectionLabels.overview },
  { key: 'issues', testId: testIds.tripSectionIssues, title: tripSectionLabels.issues },
  { key: 'ideas', testId: testIds.tripSectionIdeas, title: tripSectionLabels.ideas },
  { key: 'activity', testId: testIds.tripSectionActivity, title: tripSectionLabels.activity }
] as const;

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripSectionNavLoadedProps = {
  isLoading?: false;
  onOpen: (section: TripSection) => void;
  section: TripSection;
  trip: TripDetail;
  tripId: Id<'trips'>;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripSectionNavLoadingProps = {
  isLoading: true;
  section?: TripSection;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type TripSectionNavProps = TripSectionNavLoadedProps | TripSectionNavLoadingProps;

function tabTitle(base: string, count: number | string | undefined) {
  return count === undefined ? base : `${base} (${count})`;
}

export function TripSectionNav(props: TripSectionNavProps) {
  if (props.isLoading) {
    const active = props.section ?? 'overview';
    return (
      <Shell.UnderlineNav aria-label="Trip sections">
        {sectionTabs.map((tab) => (
          <Shell.Tab
            data-testid={tab.testId}
            disabled
            isActive={tab.key === active || (tab.key === 'overview' && active === 'itinerary')}
            key={tab.key}
            position="top"
            title={tab.key === 'overview' ? 'Trip' : tabTitle(tab.title, '…')}
          />
        ))}
      </Shell.UnderlineNav>
    );
  }

  return <TripSectionNavLoaded {...props} />;
}

function TripSectionNavLoaded({ onOpen, section, trip, tripId }: TripSectionNavLoadedProps) {
  const sourceTripId = trip.proposal?.sourceTripId ?? tripId;
  const { issues } = useTripIssues(sourceTripId);
  const { proposals } = useTripVersions(sourceTripId);
  const openIssueCount = issues?.filter((issue) => issue.status === 'open').length;
  const pendingProposalCount = proposals?.filter((proposal) =>
    ['draft', 'in_review', 'conflicted'].includes(proposal.status)
  ).length;

  return (
    <Shell.UnderlineNav aria-label="Trip sections">
      <Shell.Tab
        data-testid={testIds.tripSectionOverview}
        isActive={section === 'overview' || (!trip.permissions.canEdit && section === 'itinerary')}
        onClick={() => onOpen('overview')}
        position="top"
        title={trip.permissions.canEdit ? tripSectionLabels.overview : 'Trip'}
      />
      {trip.permissions.canEdit ? (
        <Shell.Tab
          data-testid={testIds.tripSectionItinerary}
          isActive={section === 'itinerary'}
          onClick={() => onOpen('itinerary')}
          position="top"
          title={tabTitle(tripSectionLabels.itinerary, trip.destinations.length)}
        />
      ) : null}
      <Shell.Tab
        data-testid={testIds.tripSectionIssues}
        isActive={section === 'issues'}
        onClick={() => onOpen('issues')}
        position="top"
        title={tabTitle(tripSectionLabels.issues, openIssueCount ?? '…')}
      />
      <Shell.Tab
        data-testid={testIds.tripSectionIdeas}
        isActive={section === 'ideas'}
        onClick={() => onOpen('ideas')}
        position="top"
        title={tabTitle(tripSectionLabels.ideas, pendingProposalCount ?? '…')}
      />
      <Shell.Tab
        data-testid={testIds.tripSectionActivity}
        isActive={section === 'activity'}
        onClick={() => onOpen('activity')}
        position="top"
        title={tabTitle(tripSectionLabels.activity, trip.activity.length)}
      />
    </Shell.UnderlineNav>
  );
}
