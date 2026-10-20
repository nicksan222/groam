import { Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Input } from '@groam/ui/components/input';
import { NumberInput } from '@groam/ui/components/number-input';
import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import { type FormEvent, useRef, useState } from 'react';
import { testIds } from '@/lib/test-ids';
import { MAX_PACKING_QUANTITY } from './packing-coverage';

const STARTER_ITEMS = ['Sunscreen', 'First-aid kit', 'Power bank'] as const;

/**
 * Adds a shared gear item with how many the group needs. Add stays pressable: an empty name
 * just returns focus to the field. On an empty list, three starter items prefill the name.
 */
export function AddGearForm({
  empty = false,
  onAdd
}: {
  /** True while the list has no items, which is when starter suggestions help. */
  empty?: boolean;
  onAdd: (label: string, quantity: number) => Promise<boolean>;
}) {
  const [label, setLabel] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const name = label.trim();
    if (!name) {
      labelRef.current?.focus();
      return;
    }
    setPending(true);
    let added = false;
    try {
      added = await onAdd(name, Number.isFinite(quantity) && quantity >= 1 ? quantity : 1);
    } finally {
      setPending(false);
    }
    if (added) {
      setLabel('');
      setQuantity(1);
    }
    labelRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      {empty ? (
        <div
          aria-hidden={label ? true : undefined}
          className={cn(
            'flex flex-wrap items-center gap-1.5 transition-[opacity,translate,display] transition-discrete duration-150 ease-out starting:opacity-0 motion-reduce:transition-none',
            label && 'hidden -translate-y-1 opacity-0'
          )}
          data-leaving={label ? 'true' : undefined}
          inert={label ? true : undefined}
        >
          <span className="text-xs text-muted-foreground">Start with</span>
          {STARTER_ITEMS.map((starter) => (
            <Button
              className="rounded-full pointer-coarse:h-9"
              key={starter}
              onClick={() => {
                setLabel(starter);
                labelRef.current?.focus();
              }}
              size="xs"
              type="button"
              variant="outline"
            >
              <Plus />
              {starter}
            </Button>
          ))}
        </div>
      ) : null}
      <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
        <Input
          aria-label="Group item"
          className="min-w-40 basis-full sm:basis-40 sm:flex-1"
          data-testid={testIds.tripPackingGearLabel}
          maxLength={120}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Something the group shares, like a hair dryer"
          ref={labelRef}
          value={label}
        />
        <span aria-hidden className="text-xs text-muted-foreground">
          Need
        </span>
        <NumberInput
          className="pointer-coarse:h-9"
          label="How many the group needs"
          max={MAX_PACKING_QUANTITY}
          min={1}
          onChange={setQuantity}
          value={quantity}
        />
        <Button
          aria-label="Add this item to group gear"
          data-testid={testIds.tripPackingGearAdd}
          className="ms-auto pointer-coarse:h-11 sm:ms-0"
          disabled={pending}
          size="sm"
          type="submit"
        >
          {pending ? <Spinner aria-hidden role="presentation" /> : <Plus />}
          Add
        </Button>
      </form>
    </div>
  );
}
