import { Lightbulb, Package } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
import { PageLoading } from '@groam/ui/components/page-loading';
import type { useTripPacking } from '@/features/trips/hooks/use-trip-packing';
import { testIds } from '@/lib/test-ids';
import type { GearTraveler, PackingItem } from '@/types/packing';
import { GroupGearRows } from './group-gear-rows';

function emptyCopy(editable: boolean, proposal: boolean, canStart: boolean, archived: boolean) {
  if (editable) {
    return {
      body: 'Add what the whole group shares, like a tent or a hair dryer.',
      title: 'Start the group list'
    };
  }
  if (proposal) {
    return {
      body: 'This idea does not list any shared gear.',
      title: 'No shared gear in this idea'
    };
  }
  if (archived) {
    return {
      body: 'Nobody listed shared gear before this trip was archived.',
      title: 'No group gear'
    };
  }
  if (canStart) {
    return {
      body: 'Shared gear, like a tent or a first-aid kit, lands here with who is bringing it. Suggest the first items through an idea so everyone can weigh in.',
      title: 'Nothing on the group list yet'
    };
  }
  return {
    body: 'Shared gear will show up here once someone suggests it.',
    title: 'Nothing on the group list yet'
  };
}

/** The group gear rows: read-only on the shared trip, editable in an author's idea. */
export function GroupGearList({
  archived = false,
  editable,
  onClaim,
  onStartIdea,
  packing,
  startingIdea = false,
  proposal,
  travelers,
  viewerUserId
}: {
  archived?: boolean;
  editable: boolean;
  onClaim?: (item: PackingItem) => void;
  /** Starts an idea; shown in the empty state of the shared trip. */
  onStartIdea?: () => void;
  packing: ReturnType<typeof useTripPacking>;
  proposal: boolean;
  startingIdea?: boolean;
  travelers: readonly GearTraveler[];
  viewerUserId: string | undefined;
}) {
  if (packing.isLoading) return <PageLoading label="Loading group gear…" />;
  if (packing.items.length === 0) {
    const copy = emptyCopy(editable, proposal, onStartIdea !== undefined, archived);
    return (
      <List bleed={false}>
        <List.Body>
          <List.Empty
            buttonRaw={
              onStartIdea ? (
                <Button
                  data-testid={testIds.tripPackingChange}
                  disabled={startingIdea}
                  onClick={onStartIdea}
                  size="sm"
                  variant="outline"
                >
                  <Lightbulb />
                  Suggest gear
                </Button>
              ) : undefined
            }
            description={copy.body}
            headline={copy.title}
            icon={Package}
          />
        </List.Body>
      </List>
    );
  }
  return (
    <GroupGearRows
      claimDisabled={startingIdea}
      editable={editable}
      onClaim={onClaim}
      packing={packing}
      travelers={travelers}
      viewerUserId={viewerUserId}
    />
  );
}
