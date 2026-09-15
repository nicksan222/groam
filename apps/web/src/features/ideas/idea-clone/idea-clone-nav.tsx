import Shell from '@groam/ui/components/shell/client';
import { ideaCompareTabLabel } from '@/features/ideas/idea-glossary';
import { tripSectionLabels } from '@/features/trips/trip-sections';
import { testIds } from '@/lib/test-ids';
import type { IdeaCloneView } from './idea-sections';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type IdeaCloneNavLoadedProps = {
  viewOnly?: boolean;
  changeCount: number;
  isLoading?: false;
  onOpen: (view: IdeaCloneView) => void;
  stopCount: number;
  view: IdeaCloneView;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type IdeaCloneNavLoadingProps = {
  isLoading: true;
  view?: IdeaCloneView;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type IdeaCloneNavProps = IdeaCloneNavLoadedProps | IdeaCloneNavLoadingProps;

export function IdeaCloneNav(props: IdeaCloneNavProps) {
  if (props.isLoading) {
    const active = props.view ?? 'overview';
    return (
      <Shell.UnderlineNav aria-label="Idea plan">
        <Shell.Tab
          data-testid={testIds.tripSectionOverview}
          disabled
          isActive={active === 'overview'}
          position="top"
          title={tripSectionLabels.overview}
        />
        <Shell.Tab
          data-testid={testIds.tripSectionItinerary}
          disabled
          isActive={active === 'itinerary'}
          position="top"
          title={`${tripSectionLabels.itinerary} (…)`}
        />
        <Shell.Tab
          data-testid={testIds.ideaSectionCompare}
          disabled
          isActive={active === 'compare'}
          position="top"
          title={ideaCompareTabLabel(0).replace(/\d+/u, '…')}
        />
      </Shell.UnderlineNav>
    );
  }

  const { changeCount, onOpen, stopCount, view, viewOnly = false } = props;

  return (
    <Shell.UnderlineNav aria-label="Idea plan">
      <Shell.Tab
        data-testid={testIds.tripSectionOverview}
        isActive={view === 'overview' || (viewOnly && view === 'itinerary')}
        onClick={() => onOpen('overview')}
        position="top"
        title={viewOnly ? 'Plan' : tripSectionLabels.overview}
      />
      {!viewOnly ? (
        <Shell.Tab
          data-testid={testIds.tripSectionItinerary}
          isActive={view === 'itinerary'}
          onClick={() => onOpen('itinerary')}
          position="top"
          title={`${tripSectionLabels.itinerary} (${stopCount})`}
        />
      ) : null}
      <Shell.Tab
        data-testid={testIds.ideaSectionCompare}
        isActive={view === 'compare'}
        onClick={() => onOpen('compare')}
        position="top"
        title={ideaCompareTabLabel(changeCount)}
      />
    </Shell.UnderlineNav>
  );
}
