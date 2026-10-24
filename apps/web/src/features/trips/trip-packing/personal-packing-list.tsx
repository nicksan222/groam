import { MAX_PACKING_LABEL_LENGTH } from '@groam/backend/convex/modules/travel/packing/lengths';
import { Lock, Luggage } from '@groam/icons';
import { InlineAddRow } from '@groam/ui/components/inline-add-row';
import { List } from '@groam/ui/components/list';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useTripPacking } from '@/features/trips/hooks/use-trip-packing';
import { useTripPersonalPacking } from '@/features/trips/hooks/use-trip-personal-packing';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { PackingBagGroupItems } from './packing-bag-group-items';
import { PersonalPackingHeader } from './personal-packing-header';
import { PersonalPackingRow } from './personal-packing-row';
import { useArrivals } from './use-packing-motion';

/** The viewer's private checklist. Always editable, except on an archived trip. */
export function PersonalPackingList({ trip }: { trip: TripDetail }) {
  const personal = useTripPersonalPacking(trip.id);
  const packing = useTripPacking(trip.id);
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const readOnly = trip.archivedAt !== null;
  const arrived = useArrivals(
    personal.items.map((item) => String(item.id)),
    !personal.isLoading
  );

  return (
    <section aria-labelledby="my-packing-heading" className="flex flex-col gap-2">
      <PersonalPackingHeader items={personal.items} />
      <PackingBagGroupItems items={packing.items} viewerUserId={viewerUserId} />
      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Lock aria-hidden className="size-3 shrink-0" />
        {readOnly ? 'Only you can see this. Archived, so read-only.' : 'Only you can see this'}
      </p>
      <List bleed={false}>
        <List.Body>
          {personal.isLoading ? (
            <PageLoading label="Loading your list…" />
          ) : personal.items.length === 0 ? (
            <List.Empty
              description={
                readOnly
                  ? 'This trip is archived, so your list is read-only.'
                  : 'Jot down what you want to remember, like a charger or your passport.'
              }
              headline="Nothing on your list yet"
              icon={Luggage}
            />
          ) : (
            <List.Group aria-label="My list">
              {personal.items.map((item) => (
                <PersonalPackingRow
                  entering={arrived.has(String(item.id))}
                  item={item}
                  key={item.id}
                  onRemove={personal.remove}
                  onTogglePacked={personal.setPacked}
                  readOnly={readOnly}
                />
              ))}
            </List.Group>
          )}
        </List.Body>
      </List>
      {readOnly ? null : (
        <InlineAddRow
          label="Item for my list"
          maxLength={MAX_PACKING_LABEL_LENGTH}
          onAdd={personal.add}
          placeholder="Add an item…"
          submitAriaLabel="Add to my list"
          submitTestId={testIds.tripPackingPersonalAdd}
          testId={testIds.tripPackingPersonalInput}
          variant="row"
        />
      )}
    </section>
  );
}
