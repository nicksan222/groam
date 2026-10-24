import { FormFeedback } from '@groam/ui/components/form-feedback';
import { cn } from '@groam/ui/lib/utils';
import type { FormEvent, ReactNode } from 'react';
import { FormLayoutContext } from '#src/components/form-context';

/**
 * A form outside a dialog (settings panels, sheets, inline editors). Same order as FormDialog:
 * fields, then the error or success message, then `actions` (usually FormActions).
 */
export type FormProps = {
  actions?: ReactNode;
  'aria-label'?: string;
  children: ReactNode;
  className?: string;
  /**
   * `compact` suits dialogs, sheets, and inline editors; `relaxed` spaces longer forms;
   * `settings` is a settings page: relaxed, labels in a left column, a rule between fields.
   */
  density?: 'compact' | 'relaxed' | 'settings';
  error?: null | string;
  id?: string;
  isPending?: boolean;
  message?: null | string;
  /**
   * Skips native constraint popups so the form's own validation and messages decide; on by
   * default, since every form validates itself. Pass `false` to lean on the browser.
   */
  noValidate?: boolean;
  /** Usually `useFormSubmit().handle(...)`, which prevents the browser submit. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  testId?: string;
};

/** The standard non-dialog form shell. */
function Form({
  actions,
  'aria-label': ariaLabel,
  children,
  className,
  density = 'compact',
  error,
  id,
  isPending = false,
  message,
  noValidate = true,
  onSubmit,
  testId
}: FormProps) {
  const settings = density === 'settings';
  return (
    <FormLayoutContext value={{ fieldLayout: settings ? 'split' : 'stack' }}>
      <form
        aria-busy={isPending || undefined}
        aria-label={ariaLabel}
        className={cn(
          'grid min-w-0',
          density === 'compact' ? 'gap-4' : 'gap-6',
          // A rule between neighbouring settings fields, never after the last one.
          settings &&
            '[&>[data-slot=form-field]+[data-slot=form-field]]:border-t [&>[data-slot=form-field]+[data-slot=form-field]]:border-border [&>[data-slot=form-field]+[data-slot=form-field]]:pt-6',
          className
        )}
        data-slot="form"
        data-testid={testId}
        id={id}
        noValidate={noValidate}
        onSubmit={onSubmit}
      >
        {children}
        {/* Full width even when a caller lays the form out as a flex row. */}
        <FormFeedback className="col-span-full basis-full" error={error} message={message} />
        {actions}
      </form>
    </FormLayoutContext>
  );
}

export { Form };
