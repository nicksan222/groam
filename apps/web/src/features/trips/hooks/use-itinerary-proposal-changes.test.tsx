import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
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

test('provides context proposal changes by their stable key', async () => {
  ideaContext.useOptionalIdeaContext.mockReturnValue({
    proposal: { changes: [change], id: 'proposal-1' }
  });

  await render(
    <ItineraryProposalChangesProvider trip={ideaTrip}>
      <ReadChanges />
    </ItineraryProposalChangesProvider>
  );

  await expect.element(page.getByText('1:destinations/lisbon.json')).toBeInTheDocument();
  expect(versions.useTripProposalDetail).toHaveBeenCalledWith(undefined);
});

test('provides no changes for a shared trip', async () => {
  ideaContext.useOptionalIdeaContext.mockReturnValue(undefined);

  await render(
    <ItineraryProposalChangesProvider trip={{ id: 'shared-trip', proposal: null } as TripDetail}>
      <ReadChanges />
    </ItineraryProposalChangesProvider>
  );

  await expect.element(page.getByText('0:none')).toBeInTheDocument();
});
