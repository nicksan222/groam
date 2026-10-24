import { List } from '@groam/ui/components/list';
import type { useTripPacking } from '@/features/trips/hooks/use-trip-packing';
import type { GearTraveler, PackingItem } from '@/types/packing';
import { GroupGearItem } from './group-gear-item';
import { GroupGearItemEditor } from './group-gear-item-editor';
import { useSettledGearGroups } from './use-settled-gear-groups';

/**
 * Gear rows split into what still needs someone, first, and what is covered. Each row is the
 * read-only item on the shared trip or the editor in an author's idea.
 */
export function GroupGearRows({
  claimDisabled,
  editable,
  onClaim,
  packing,
  travelers,
  viewerUserId
}: {
  claimDisabled: boolean;
  editable: boolean;
  onClaim?: (item: PackingItem) => void;
  packing: ReturnType<typeof useTripPacking>;
  travelers: readonly GearTraveler[];
  viewerUserId: string | undefined;
}) {
  const { covered, focusProps, open } = useSettledGearGroups(packing.items);
  const both = open.length > 0 && covered.length > 0;
  const row = (tone: 'open' | 'covered') => (item: PackingItem) =>
    editable ? (
      <GroupGearItemEditor
        item={item}
        key={item.id}
        onBring={packing.bring}
        onRemove={packing.remove}
        onUpdate={packing.update}
        tone={tone}
        travelers={travelers}
        viewerUserId={viewerUserId}
      />
    ) : (
      <GroupGearItem
        claimDisabled={claimDisabled}
        item={item}
        key={item.id}
        onClaim={onClaim}
        tone={tone}
        viewerUserId={viewerUserId}
      />
    );
  return (
    <List bleed={false} {...focusProps}>
      <List.Body>
        {open.length > 0 ? (
          <List.Group
            aria-label="Needs someone"
            count={open.length}
            label={both ? 'Needs someone' : null}
          >
            {open.map(row('open'))}
          </List.Group>
        ) : null}
        {covered.length > 0 ? (
          <List.Group aria-label="Covered" count={covered.length} label={both ? 'Covered' : null}>
            {covered.map(row('covered'))}
          </List.Group>
        ) : null}
      </List.Body>
    </List>
  );
}
