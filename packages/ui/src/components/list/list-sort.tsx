import { ArrowDownWideNarrow } from '@groam/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger
} from '@groam/ui/components/dialog';
import { Kbd } from '@groam/ui/components/kbd';
import { useId, useState } from 'react';
import { COMMAND_DIALOG_CLASS_NAME, COMMAND_INPUT_ROW_CLASS_NAME } from '#src/lib/command-surface';
import type { DataTableResourceLabel } from '#src/lib/data-table';
import { ListControlButton } from './list-control-button';
import { useListDialogFocus } from './use-list-dialog-focus';

/** The feature supplies relevant orderings; all choices live in the same dialog surface as Filter. */
function ListSort({
  noun,
  onValueChange,
  onOpenChange,
  open: controlledOpen,
  options,
  value,
  grouped = false
}: {
  grouped?: boolean;
  noun: DataTableResourceLabel;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  onValueChange: (value: string) => void;
  options: readonly { label: string; value: string }[];
  value: string;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setLocalOpen(next);
    onOpenChange?.(next);
  };
  const focus = useListDialogFocus();
  const name = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];
  if (!selected) return null;
  const title = `Sort ${noun.plural}`;
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <ListControlButton
          aria-label={title}
          data-slot="list-sort"
          icon={ArrowDownWideNarrow}
          label="Sort"
          title={`${title}: ${selected.label}`}
        />
      </DialogTrigger>
      <DialogContent
        {...focus}
        className={COMMAND_DIALOG_CLASS_NAME}
        data-slot="list-sort-dialog"
        showCloseButton={false}
      >
        <div className={COMMAND_INPUT_ROW_CLASS_NAME}>
          <ArrowDownWideNarrow aria-hidden className="size-4 shrink-0 text-foreground" />
          <DialogTitle className="flex-1 py-4 text-base">{title}</DialogTitle>
          <Kbd>Esc</Kbd>
        </div>
        <DialogDescription className="sr-only">
          {grouped
            ? 'Choose how to order items within each group. Groups keep their order.'
            : 'Choose how to order the list.'}{' '}
          The current order is selected.
        </DialogDescription>
        <div
          aria-label="Sort order"
          className="grid max-h-[60vh] overflow-y-auto p-2"
          role="radiogroup"
        >
          {options.map((option) => (
            <label
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent has-focus-visible:bg-accent has-focus-visible:ring-2 has-focus-visible:ring-ring"
              key={option.value}
            >
              <input
                checked={selected.value === option.value}
                className="size-4 shrink-0 accent-primary"
                name={name}
                onClick={() => {
                  if (selected.value === option.value) setOpen(false);
                }}
                onChange={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                type="radio"
                value={option.value}
              />
              {option.label}
            </label>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ListSort };
