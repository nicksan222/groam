import { MAX_PACKING_LABEL_LENGTH } from '@groam/backend/convex/modules/travel/packing/lengths';
import { Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { Input } from '@groam/ui/components/input';
import { NumberInput } from '@groam/ui/components/number-input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { cn } from '@groam/ui/lib/utils';
import { useRef, useState } from 'react';
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
  const labelRef = useRef<HTMLInputElement>(null);
  const form = useFormSubmit();

  const submit = form.handle(async () => {
    const name = label.trim();
    if (name) {
      // Same rounding and range as editing a quantity, so the write never rejects it.
      const count = Number.isFinite(quantity)
        ? Math.min(MAX_PACKING_QUANTITY, Math.max(1, Math.round(quantity)))
        : 1;
      const added = await onAdd(name, count);
      if (added) {
        setLabel('');
        setQuantity(1);
      }
    }
    labelRef.current?.focus();
  });

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      {empty ? (
        <div
          aria-hidden={label ? true : undefined}
          className={cn(
            'flex flex-wrap items-center gap-2 transition-[opacity,translate,display] transition-discrete duration-150 ease-out starting:opacity-0 motion-reduce:transition-none',
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
      <Form
        className="flex flex-wrap items-center gap-2"
        error={form.error}
        isPending={form.isPending}
        onSubmit={submit}
      >
        <Input
          aria-label="Group item"
          className="min-w-40 basis-full sm:basis-40 sm:flex-1"
          data-testid={testIds.tripPackingGearLabel}
          maxLength={MAX_PACKING_LABEL_LENGTH}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Something the group shares, like a hair dryer"
          ref={labelRef}
          value={label}
        />
        <NumberInput
          className="pointer-coarse:h-9"
          label="How many the group needs"
          max={MAX_PACKING_QUANTITY}
          min={1}
          onChange={setQuantity}
          value={quantity}
        />
        <FormActions
          className="ms-auto w-auto sm:ms-0"
          isPending={form.isPending}
          size="sm"
          submitIcon={<Plus />}
          submitLabel="Add"
          submitTestId={testIds.tripPackingGearAdd}
        />
      </Form>
    </div>
  );
}
