import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import type { ItineraryChange } from './itinerary-proposal-changes';
import {
  ItineraryProposalChangesProvider,
  useItineraryChange,
  useItineraryProposalChangeList
} from './use-itinerary-proposal-changes';
import type { TripDetail } from './use-trips';

const ideaContext = vi.hoisted(() => ({ useOptionalIdeaContext: vi.fn() }));
const versions = vi.hoisted(() => ({
  useTripProposalDetail: vi.fn(),
  useTripVersions: vi.fn()
}));

vi.mock('@/features/ideas/hooks/use-idea-context', () => ideaContext);
vi.mock('./use-trip-versions', () => versions);

const change = {
  change: 'modified',
  entity: 'destination',
  fields: [],
  key: 'destinations/lisbon.json',
  label: 'Lisbon'
} satisfies ItineraryChange;
const ideaTrip = {
  id: 'working-trip',
  proposal: { sourceTripId: 'shared-trip' }
} as TripDetail;

function ReadChanges() {
  const list = useItineraryProposalChangeList();
  const selected = useItineraryChange('destinations/lisbon.json');
  return <output>{`${list?.length ?? 0}:${selected?.key ?? 'none'}`}</output>;
}

beforeEach(() => {
  vi.clearAllMocks();
  versions.useTripVersions.mockReturnValue({ proposals: [] });
  versions.useTripProposalDetail.mockReturnValue(undefined);
});

test('provides context proposal changes by their stable key', () => {
  ideaContext.useOptionalIdeaContext.mockReturnValue({
    proposal: { changes: [change], id: 'proposal-1' }
  });

  render(
    <ItineraryProposalChangesProvider trip={ideaTrip}>
      <ReadChanges />
    </ItineraryProposalChangesProvider>
  );

  expect(screen.getByText('1:destinations/lisbon.json')).toBeTruthy();
  expect(versions.useTripProposalDetail).toHaveBeenCalledWith(undefined);
});

test('provides no changes for a shared trip', () => {
  ideaContext.useOptionalIdeaContext.mockReturnValue(undefined);

  render(
    <ItineraryProposalChangesProvider trip={{ id: 'shared-trip', proposal: null } as TripDetail}>
      <ReadChanges />
    </ItineraryProposalChangesProvider>
  );

  expect(screen.getByText('0:none')).toBeTruthy();
});
