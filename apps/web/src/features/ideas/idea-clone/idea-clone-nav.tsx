import { ideaCompareTabLabel } from '@/features/ideas/idea-glossary';
import { TripTabs } from '@/features/trips/trip-detail/trip-tabs';
import { tripSectionLabels } from '@/features/trips/trip-sections';
import { testIds } from '@/lib/test-ids';
import type { TripTabItem } from '@/types/trip-tabs';
import type { IdeaCloneView } from './idea-sections';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type IdeaCloneNavLoadedProps = {
  viewOnly?: boolean;
  changeCount: number;
  isLoading?: false;
  onOpen: (view: IdeaCloneView) => void;
  stopCount: number;
  view: IdeaCloneView;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type IdeaCloneNavLoadingProps = {
  isLoading: true;
  view?: IdeaCloneView;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type IdeaCloneNavProps = IdeaCloneNavLoadedProps | IdeaCloneNavLoadingProps;

const loadingCompareLabel = ideaCompareTabLabel(0).replace(/\d+/u, '…');

export function IdeaCloneNav(props: IdeaCloneNavProps) {
  if (props.isLoading) {
    return (
      <TripTabs
        activeKey={props.view ?? 'overview'}
        ariaLabel="Idea plan"
        disabled
        tabs={[
          {
            key: 'overview',
            label: tripSectionLabels.overview,
            testId: testIds.tripSectionOverview
          },
          { key: 'packing', label: tripSectionLabels.packing, testId: testIds.tripSectionPacking },
          {
            count: '…',
            key: 'itinerary',
            label: tripSectionLabels.itinerary,
            testId: testIds.tripSectionItinerary
          },
          { key: 'compare', label: loadingCompareLabel, testId: testIds.ideaSectionCompare }
        ]}
      />
    );
  }

  const { changeCount, onOpen, stopCount, view, viewOnly = false } = props;
  const tabs: Array<TripTabItem<IdeaCloneView>> = [
    {
      key: 'overview',
      label: viewOnly ? 'Plan' : tripSectionLabels.overview,
      testId: testIds.tripSectionOverview
    },
    { key: 'packing', label: tripSectionLabels.packing, testId: testIds.tripSectionPacking },
    ...(viewOnly
      ? []
      : [
          {
            count: stopCount,
            key: 'itinerary' as const,
            label: tripSectionLabels.itinerary,
            testId: testIds.tripSectionItinerary
          }
        ]),
    { key: 'compare', label: ideaCompareTabLabel(changeCount), testId: testIds.ideaSectionCompare }
  ];

  return (
    <TripTabs
      activeKey={viewOnly && view === 'itinerary' ? 'overview' : view}
      ariaLabel="Idea plan"
      onOpen={onOpen}
      tabs={tabs}
    />
  );
}
