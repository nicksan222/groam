import { Luggage } from '@groam/icons';
import { DashedEmpty } from '@groam/ui/components/dashed-empty';
import { LoadingPlaceholder } from '@groam/ui/components/loading-placeholder';
import { useTripPersonalPacking } from '@/features/trips/hooks/use-trip-personal-packing';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { PersonalPackingAddRow } from './personal-packing-add-row';
import { PersonalPackingHeader } from './personal-packing-header';
import { PersonalPackingRow } from './personal-packing-row';
import { useArrivals } from './use-packing-motion';

/** The viewer's private checklist. Always editable, except on an archived trip. */
export function PersonalPackingList({ trip }: { trip: TripDetail }) {
  const personal = useTripPersonalPacking(trip.id);
  const readOnly = trip.archivedAt !== null;
  const arrived = useArrivals(
    personal.items.map((item) => String(item.id)),
    !personal.isLoading
  );

  return (
    <section aria-labelledby="my-packing-heading" className="flex flex-col gap-2">
      <PersonalPackingHeader items={personal.items} readOnly={readOnly} />
      {personal.isLoading ? (
        <LoadingPlaceholder bordered label="Loading your list…" />
      ) : personal.items.length === 0 ? (
        <DashedEmpty className="p-5" icon={Luggage} title="Nothing on your list yet">
          {readOnly
            ? 'This trip is archived, so your list is read-only.'
            : 'Jot down what you want to remember, like a charger or your passport.'}
        </DashedEmpty>
      ) : (
        <ul className="-mx-2 flex flex-col">
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
        </ul>
      )}
      {readOnly ? null : <PersonalPackingAddRow onAdd={personal.add} />}
    </section>
  );
}
