import { ideaCompareTabLabel } from '@/features/ideas/idea-glossary';
import { testIds } from '@/lib/test-ids';
import type { TripTabItem } from '@/types/trip-tabs';
import { type IdeaCloneView, ideaViewTitles } from './idea-sections';
import { TripTabs } from './trip-tabs';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type IdeaCloneNavProps = {
  viewOnly?: boolean;
  changeCount: number;
  onOpen: (view: IdeaCloneView) => void;
  stopCount: number;
  view: IdeaCloneView;
};

/** An idea's tabs use the shared trip's section names; the header already says it is a draft. */
const sectionLabel = { calendar: 'Calendar', overview: 'Plan', packing: 'Packing' };

export function IdeaCloneNav({
  changeCount,
  onOpen,
  stopCount,
  view,
  viewOnly = false
}: IdeaCloneNavProps) {
  const tabs: Array<TripTabItem<IdeaCloneView>> = [
    {
      key: 'overview',
      label: sectionLabel.overview,
      testId: testIds.tripSectionOverview
    },
    { key: 'calendar', label: sectionLabel.calendar, testId: testIds.tripSectionCalendar },
    { key: 'packing', label: sectionLabel.packing, testId: testIds.tripSectionPacking },
    ...(viewOnly
      ? []
      : [
          {
            count: stopCount,
            key: 'itinerary' as const,
            label: ideaViewTitles.itinerary,
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
