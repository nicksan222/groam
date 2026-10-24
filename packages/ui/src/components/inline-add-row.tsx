import { CornerDownLeft, Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { draftAfterSend } from '@groam/ui/lib/draft';
import { cn } from '@groam/ui/lib/utils';
import { useId, useRef, useState } from 'react';

/**
 * Type a line and press Enter to add it, without a dialog. The input keeps focus for the next
 * one, and anything typed while the last one saved is kept; Escape lets go.
 */
export type InlineAddRowProps = {
  className?: string;
  /** Accessible name of the input, e.g. "Add a question". */
  label: string;
  maxLength?: number;
  /**
   * Adds the trimmed text. Resolve `false` or `null` when it failed (and was already reported),
   * so the text stays to try again; anything else clears it.
   */
  onAdd: (text: string) => Promise<unknown>;
  placeholder: string;
  /** Accessible name of the `row` variant's button when "Add" alone is ambiguous on the page. */
  submitAriaLabel?: string;
  /** Visible label of the `row` variant's button. */
  submitLabel?: string;
  submitTestId?: string;
  testId?: string;
  /**
   * `row` is the next line of a checklist, with an Add button; `ledger` is the last line of a
   * dense ledger, matching its rows; `field` is a framed input inside a card or lane.
   */
  variant?: 'field' | 'ledger' | 'row';
};

const inputClassName = {
  field: 'h-8 bg-background pl-8 max-md:h-11 max-md:text-base',
  ledger:
    'h-full min-w-0 flex-1 rounded-md border-transparent bg-transparent px-1 text-base shadow-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring dark:bg-transparent md:text-[13.5px]',
  row: 'h-8 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent pointer-coarse:h-11'
} as const;

/** The `row` variant's Add: quiet while empty, filled once there is something to add. */
function RowAddButton({
  label,
  pending,
  ready,
  submitAriaLabel,
  testId
}: {
  label: string;
  pending: boolean;
  ready: boolean;
  submitAriaLabel?: string;
  testId?: string;
}) {
  const icon = ready ? <CornerDownLeft aria-hidden /> : null;
  return (
    <Button
      aria-label={submitAriaLabel}
      className={cn(
        'transition-colors duration-150 ease-out motion-reduce:transition-none',
        !ready && !pending && 'text-muted-foreground'
      )}
      data-testid={testId}
      pending={pending}
      size="xs"
      type="submit"
      variant={ready || pending ? 'default' : 'ghost'}
    >
      {icon}
      {label}
    </Button>
  );
}

/** The one quick-add input for lists, ledgers, and board lanes. */
function InlineAddRow({
  className,
  label,
  maxLength,
  onAdd,
  placeholder,
  submitAriaLabel,
  submitLabel = 'Add',
  submitTestId,
  testId,
  variant = 'row'
}: InlineAddRowProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const form = useFormSubmit();
  const ready = draft.trim().length > 0;

  const add = async () => {
    const typed = draft;
    const text = typed.trim();
    if (!text) return;
    const result = await onAdd(text);
    // Keep whatever was typed while it was saving.
    if (result !== false && result !== null) setDraft((current) => draftAfterSend(current, typed));
  };

  const submit = form.handle(async () => {
    await add();
    inputRef.current?.focus();
  });

  const input = (
    <Input
      aria-invalid={form.error ? true : undefined}
      aria-label={label}
      className={inputClassName[variant]}
      data-slot="inline-add-input"
      data-testid={testId}
      enterKeyHint="done"
      id={inputId}
      maxLength={maxLength}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.currentTarget.blur();
      }}
      placeholder={placeholder}
      ref={inputRef}
      value={draft}
    />
  );

  return (
    <div className={cn('grid gap-1', className)} data-slot="inline-add-row">
      {variant === 'ledger' ? (
        <form className="flex h-11 items-center gap-3 md:h-10" onSubmit={submit}>
          <Plus aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          {input}
        </form>
      ) : variant === 'field' ? (
        <form className="relative" onSubmit={submit}>
          <Plus
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          {input}
        </form>
      ) : (
        <form
          className="group/add -mx-2 flex min-h-9 items-center gap-2 rounded-lg pr-1 pl-2 transition-colors duration-150 ease-out focus-within:bg-muted/70 hover:bg-muted/50 motion-reduce:transition-none pointer-coarse:min-h-11"
          onSubmit={submit}
        >
          <label className="flex min-w-0 flex-1 cursor-text items-center gap-3" htmlFor={inputId}>
            <span
              aria-hidden
              className="grid size-4 shrink-0 place-items-center rounded-[5px] border border-dashed border-muted-foreground/50 text-muted-foreground transition-colors duration-150 group-focus-within/add:border-primary group-focus-within/add:text-primary motion-reduce:transition-none"
            >
              <Plus className="size-3" strokeWidth={2.5} />
            </span>
            {input}
          </label>
          <RowAddButton
            label={submitLabel}
            pending={form.isPending}
            ready={ready}
            submitAriaLabel={submitAriaLabel}
            testId={submitTestId}
          />
        </form>
      )}
      <FormFeedback className="px-2" error={form.error} />
    </div>
  );
}

export { InlineAddRow };
