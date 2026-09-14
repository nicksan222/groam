'use client';

import { Button } from '@groam/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { Spinner } from '@groam/ui/components/spinner';
import type { FormEvent, ReactNode } from 'react';

/**
 * Controlled modal form shell. `onClose` fires on Cancel and when the overlay
 * dismisses the dialog; `isPending` disables actions and shows a submit spinner.
 */
export type FormDialogProps = {
  children: ReactNode;
  contentClassName?: string;
  description: string;
  error?: null | string;
  formClassName?: string;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  open: boolean;
  submitDisabled?: boolean;
  submitLabel: string;
  testId?: string;
  title: string;
};

/** Dialog-wrapped form with built-in cancel/submit footer and inline error feedback. */
function FormDialog({
  children,
  contentClassName,
  description,
  error,
  formClassName,
  isPending = false,
  onClose,
  onSubmit,
  open,
  submitDisabled = false,
  submitLabel,
  testId,
  title
}: FormDialogProps) {
  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
      <DialogContent className={contentClassName} data-testid={testId}>
        <form className={formClassName ?? 'space-y-5'} onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">{children}</div>
          <FormFeedback error={error} />
          <DialogFooter>
            <Button
              data-testid={testId ? `${testId}-cancel` : undefined}
              disabled={isPending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              data-testid={testId ? `${testId}-submit` : undefined}
              disabled={isPending || submitDisabled}
              type="submit"
            >
              {isPending ? <Spinner /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { FormDialog };
