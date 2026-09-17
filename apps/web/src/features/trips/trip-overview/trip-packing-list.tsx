import { Button } from '@groam/ui/components/button';
import { Input } from '@groam/ui/components/input';
import Shell from '@groam/ui/components/shell/client';
import { Check, Circle, Luggage, Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useTripPacking } from '@/features/trips/hooks/use-trip-packing';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';

export function TripPackingList({ trip }: { trip: TripDetail }) {
  const packing = useTripPacking(trip.id);
  const canEdit = trip.permissions.canEdit;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void packing.add();
  };

  return (
    <Shell.Card stack="md" variant="panel">
      <Shell.SectionHeader
        density="compact"
        description={
          packing.items.length > 0
            ? `${packing.items.filter((item) => item.packed).length} of ${packing.items.length} packed`
            : undefined
        }
        title="Packing"
      />
      {packing.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading packing list…</p>
      ) : packing.items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <Luggage className="size-6 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Travel light. Forget nothing.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {canEdit
                ? 'Build the packing list for this idea.'
                : 'No packing items in this plan yet.'}
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-1">
          {packing.items.map((item) => (
            <PackingItem canEdit={canEdit} item={item} key={item.id} packing={packing} />
          ))}
        </ul>
      )}
      {canEdit ? (
        <form className="flex gap-2" onSubmit={submit}>
          <Input
            data-testid={testIds.tripPackingInput}
            disabled={packing.isPending}
            onChange={(event) => packing.setDraft(event.target.value)}
            placeholder="Add an item"
            value={packing.draft}
          />
          <Button
            aria-label="Add packing item"
            data-testid={testIds.tripPackingAdd}
            disabled={packing.isPending || !packing.draft.trim()}
            size="icon-sm"
            type="submit"
          >
            <Plus />
          </Button>
        </form>
      ) : null}
    </Shell.Card>
  );
}

function PackingItem({
  canEdit,
  item,
  packing
}: {
  canEdit: boolean;
  item: ReturnType<typeof useTripPacking>['items'][number];
  packing: ReturnType<typeof useTripPacking>;
}) {
  return (
    <li className="flex items-center gap-2" data-testid={testIds.tripPackingItem}>
      {canEdit ? (
        <Button
          aria-label={item.packed ? `Unpack ${item.label}` : `Pack ${item.label}`}
          data-testid={testIds.tripPackingToggle}
          onClick={() => void packing.toggle(item.id, !item.packed)}
          disabled={packing.isPending}
          size="icon-sm"
          type="button"
          variant={item.packed ? 'default' : 'outline'}
        >
          <Check />
        </Button>
      ) : (
        <span
          role="img"
          aria-label={item.packed ? 'Packed' : 'Not packed'}
          className="grid size-8 shrink-0 place-items-center text-muted-foreground"
        >
          {item.packed ? <Check className="size-4 text-primary" /> : <Circle className="size-4" />}
        </span>
      )}
      <span
        className={
          item.packed ? 'flex-1 text-sm text-muted-foreground line-through' : 'flex-1 text-sm'
        }
      >
        {item.label}
      </span>
      {canEdit ? (
        <Button
          aria-label={`Remove ${item.label}`}
          onClick={() => void packing.remove(item.id)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Trash2 />
        </Button>
      ) : null}
    </li>
  );
}
