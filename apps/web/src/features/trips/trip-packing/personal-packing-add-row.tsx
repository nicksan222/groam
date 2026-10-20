import { CornerDownLeft, Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import { type FormEvent, useId, useRef, useState } from 'react';
import { testIds } from '@/lib/test-ids';

/**
 * The list's next, empty line: same geometry as an item row, so adding reads as writing the
 * next entry. Enter adds and keeps focus for the one after.
 */
export function PersonalPackingAddRow({ onAdd }: { onAdd: (label: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const ready = draft.trim().length > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!ready) {
      inputRef.current?.focus();
      return;
    }
    setPending(true);
    let added = false;
    try {
      added = await onAdd(draft.trim());
    } finally {
      setPending(false);
    }
    if (added) setDraft('');
    inputRef.current?.focus();
  };

  return (
    <form
      className="group/add -mx-2 flex min-h-9 items-center gap-2 rounded-lg pr-1 pl-2 transition-colors duration-150 ease-out focus-within:bg-muted/70 hover:bg-muted/50 motion-reduce:transition-none pointer-coarse:min-h-11"
      onSubmit={submit}
    >
      <label htmlFor={inputId} className="flex min-w-0 flex-1 cursor-text items-center gap-3">
        <span
          aria-hidden
          className="grid size-4 shrink-0 place-items-center rounded-[5px] border border-dashed border-muted-foreground/50 text-muted-foreground transition-colors duration-150 group-focus-within/add:border-primary group-focus-within/add:text-primary motion-reduce:transition-none"
        >
          <Plus className="size-3" strokeWidth={2.5} />
        </span>
        <Input
          aria-label="Item for my list"
          id={inputId}
          className="h-8 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent pointer-coarse:h-11"
          data-testid={testIds.tripPackingPersonalInput}
          maxLength={120}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add an item…"
          ref={inputRef}
          value={draft}
        />
      </label>
      <Button
        aria-label="Add to my list"
        className={cn(
          'transition-colors duration-150 ease-out motion-reduce:transition-none',
          !ready && !pending && 'text-muted-foreground'
        )}
        data-testid={testIds.tripPackingPersonalAdd}
        disabled={pending}
        size="xs"
        type="submit"
        variant={ready || pending ? 'default' : 'ghost'}
      >
        {pending ? (
          <Spinner aria-hidden role="presentation" />
        ) : ready ? (
          <CornerDownLeft aria-hidden />
        ) : null}
        Add
      </Button>
    </form>
  );
}
