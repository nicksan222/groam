import { Button } from '@groam/ui/components/button';
import { DashedEmpty } from '@groam/ui/components/dashed-empty';
import { Input } from '@groam/ui/components/input';
import { LoadingPlaceholder } from '@groam/ui/components/loading-placeholder';
import { Spinner } from '@groam/ui/components/spinner';
import { Luggage, Plus } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { useTripPersonalPacking } from '@/features/trips/hooks/use-trip-personal-packing';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { PersonalPackingHeader } from './personal-packing-header';
import { PersonalPackingRow } from './personal-packing-row';
import { useArrivals } from './use-packing-motion';

/** The viewer's private checklist. Always editable, except on an archived trip. */
export function PersonalPackingList({ trip }: { trip: TripDetail }) {
  const personal = useTripPersonalPacking(trip.id);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const readOnly = trip.archivedAt !== null;
  const arrived = useArrivals(
    personal.items.map((item) => String(item.id)),
    !personal.isLoading
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!draft.trim()) {
      inputRef.current?.focus();
      return;
    }
    setPending(true);
    let added = false;
    try {
      added = await personal.add(draft.trim());
    } finally {
      setPending(false);
    }
    if (added) setDraft('');
    inputRef.current?.focus();
  };

  return (
    <section aria-labelledby="my-packing-heading" className="flex flex-col gap-4">
      <PersonalPackingHeader items={personal.items} readOnly={readOnly} />
      {personal.isLoading ? (
        <LoadingPlaceholder bordered label="Loading your list…" />
      ) : personal.items.length === 0 ? (
        <DashedEmpty className="p-6" icon={Luggage} title="Nothing on your list yet">
          {readOnly
            ? 'This trip is archived, so your list is read-only.'
            : 'Jot down what you want to remember, like a charger or your passport.'}
        </DashedEmpty>
      ) : (
        <ul className="flex flex-col gap-0.5">
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
      {readOnly ? null : (
        <form className="flex flex-wrap gap-2" onSubmit={submit}>
          <Input
            aria-label="Item for my list"
            className="min-w-40 flex-1"
            data-testid={testIds.tripPackingPersonalInput}
            maxLength={120}
            onChange={(event) => setDraft(event.target.value)}
            ref={inputRef}
            placeholder="Add to your list"
            value={draft}
          />
          <Button
            aria-label="Add to my list"
            data-testid={testIds.tripPackingPersonalAdd}
            className="pointer-coarse:h-11"
            disabled={pending}
            size="sm"
            type="submit"
          >
            {pending ? <Spinner aria-hidden role="presentation" /> : <Plus />}
            Add
          </Button>
        </form>
      )}
    </section>
  );
}
