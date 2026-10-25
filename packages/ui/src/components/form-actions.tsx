import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';

/**
 * A form's Cancel + submit row. Submit is `type="submit"`, so it belongs inside the `<form>`;
 * `isPending` disables both and puts a spinner over submit. Omit `onCancel` for no Cancel.
 */
export type FormActionsProps = {
  cancelLabel?: string;
  cancelTestId?: string;
  /** Extra buttons placed between Cancel and submit, e.g. a second way to send. */
  children?: ReactNode;
  className?: string;
  /** Stretches the buttons across the form, for single-column auth and onboarding cards. */
  fullWidth?: boolean;
  /** Quiet copy on the leading side, e.g. "Comments don’t block approval." */
  hint?: ReactNode;
  /** A control on the far side from submit, e.g. a destructive Remove. */
  leading?: ReactNode;
  isPending?: boolean;
  onCancel?: () => void;
  size?: 'default' | 'sm' | 'xs';
  submitDisabled?: boolean;
  /** Icon before the submit label; the spinner covers the button while pending. */
  submitIcon?: ReactNode;
  /**
   * Omit when no action is a safe default for Enter (e.g. "Regenerate codes" beside "Disable"):
   * the row then holds only explicit buttons passed as `children`.
   */
  submitLabel?: string;
  submitTestId?: string;
  submitVariant?: 'default' | 'destructive';
};

/** The standard Cancel + submit pair for every form, dialog or inline. */
function FormActions({
  cancelLabel = 'Cancel',
  cancelTestId,
  children,
  className,
  fullWidth = false,
  hint,
  isPending = false,
  leading,
  onCancel,
  size = 'default',
  submitDisabled = false,
  submitIcon,
  submitLabel,
  submitTestId,
  submitVariant = 'default'
}: FormActionsProps) {
  // Full-size rows stack into full-width buttons on phones, like dialog footers; compact rows
  // (composers, inline editors) stay a right-aligned pair at every width.
  const stacks = size === 'default';
  const start = Boolean(hint) || Boolean(leading);
  return (
    <div
      className={cn(
        'flex gap-2',
        stacks ? 'flex-col sm:flex-row sm:items-center' : 'flex-wrap items-center',
        start ? 'justify-between' : 'justify-end',
        className
      )}
      data-slot="form-actions"
    >
      {start ? (
        <div className="flex min-w-0 items-center gap-2">
          {leading}
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      ) : null}
      <div
        className={cn(
          'flex gap-2',
          stacks ? 'flex-col-reverse sm:flex-row' : 'ml-auto items-center',
          fullWidth
            ? stacks
              ? 'w-full sm:[&>*]:flex-1'
              : 'w-full [&>*]:flex-1'
            : stacks && 'sm:shrink-0'
        )}
      >
        {onCancel ? (
          <Button
            data-testid={cancelTestId}
            disabled={isPending}
            onClick={onCancel}
            size={size}
            type="button"
            variant="outline"
          >
            {cancelLabel}
          </Button>
        ) : null}
        {children}
        {submitLabel ? (
          <Button
            data-testid={submitTestId}
            disabled={submitDisabled}
            pending={isPending}
            size={size}
            type="submit"
            variant={submitVariant}
          >
            {submitIcon}
            {submitLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export { FormActions };
