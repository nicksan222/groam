'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { cn } from '@groam/ui/lib/utils';
import type { FormEvent, ReactNode } from 'react';

/** Anchors a tall dialog near the top so growing content does not jump. */
const TALL_CONTENT_CLASS = 'top-[6dvh] max-h-[88dvh] translate-y-0 overflow-y-auto sm:max-w-2xl';

/**
 * Footer of a tall dialog: pinned to the bottom edge of the scrolling content and
 * stretched over its `p-6` padding so fields scroll underneath it.
 */
const TALL_FOOTER_CLASS =
  'sticky -bottom-6 z-10 -mx-6 -mb-6 border-t border-border bg-card px-6 py-4';

/**
 * Controlled modal form shell. `onClose` fires on Cancel and when the overlay
 * dismisses the dialog; `isPending` disables actions and shows a submit spinner.
 */
export type FormDialogProps = {
  /** Replaces the default field stack (`space-y-4`), e.g. with a two-column grid. */
  bodyClassName?: string;
  children: ReactNode;
  contentClassName?: string;
  description: string;
  error?: null | string;
  formClassName?: string;
  /** Quiet copy beside the buttons. */
  hint?: string;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  open: boolean;
  /** `tall` anchors near the top, scrolls the body, and pins the footer. */
  size?: 'default' | 'tall';
  submitDisabled?: boolean;
  submitIcon?: ReactNode;
  submitLabel: string;
  /** Defaults to `${testId}-submit`. */
  submitTestId?: string;
  submitVariant?: 'default' | 'destructive';
  testId?: string;
  title: string;
};

/** Dialog-wrapped form with built-in cancel/submit footer and inline error feedback. */
function FormDialog({
  bodyClassName,
  children,
  contentClassName,
  description,
  error,
  formClassName,
  hint,
  isPending = false,
  onClose,
  onSubmit,
  open,
  size = 'default',
  submitDisabled = false,
  submitIcon,
  submitLabel,
  submitTestId,
  submitVariant,
  testId,
  title
}: FormDialogProps) {
  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
      <DialogContent
        className={cn(size === 'tall' && TALL_CONTENT_CLASS, contentClassName)}
        data-testid={testId}
      >
        {/* `min-w-0` lets a tall form shrink inside the dialog grid so wide rows wrap on phones. */}
        <form
          className={cn('space-y-6', size === 'tall' && 'min-w-0', formClassName)}
          // Like Form: the dialog's own checks decide, never a browser popup.
          noValidate
          onSubmit={onSubmit}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className={bodyClassName ?? 'space-y-4'}>{children}</div>
          <FormFeedback error={error} />
          <DialogFooter className={size === 'tall' ? TALL_FOOTER_CLASS : undefined}>
            <FormActions
              cancelTestId={testId ? `${testId}-cancel` : undefined}
              className="w-full"
              hint={hint}
              isPending={isPending}
              onCancel={onClose}
              submitIcon={submitIcon}
              submitDisabled={submitDisabled}
              submitLabel={submitLabel}
              submitTestId={submitTestId ?? (testId ? `${testId}-submit` : undefined)}
              submitVariant={submitVariant}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { FormDialog };
