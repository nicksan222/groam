import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import type * as React from 'react';
import { type ButtonVariantProps, buttonVariants } from '#src/components/button-variants';

export type ButtonProps = Omit<React.ComponentProps<'button'>, 'size'> &
  ButtonVariantProps & {
    asChild?: boolean;
    /**
     * An action started from this button is in flight. A spinner covers the button (its content
     * stays in place but hidden, so the width never changes), the button is disabled and
     * `aria-busy`, and assistive tech hears a status. Pass the flag even when it is `false` so the
     * status region stays mounted. Ignored with `asChild`.
     */
    pending?: boolean;
    unstyled?: boolean;
  };

/** The label and icons, hidden (not removed, so the name stays) under the spinner while pending. */
function PendingContent({
  busy,
  children,
  size
}: {
  busy: boolean;
  children: React.ReactNode;
  size: ButtonVariantProps['size'];
}) {
  return (
    <>
      <span
        className={cn(
          'inline-flex items-center justify-center',
          size === 'xs' ? 'gap-1' : 'gap-2',
          busy && 'opacity-0'
        )}
        data-slot="button-content"
      >
        {children}
      </span>
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner aria-hidden role="presentation" />
        </span>
      ) : null}
    </>
  );
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  pending,
  unstyled = false,
  type,
  children,
  disabled,
  'aria-busy': ariaBusy,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  const tracksPending = pending !== undefined && !asChild;
  const busy = tracksPending && pending;

  const button = (
    <Component
      aria-busy={tracksPending ? busy || undefined : ariaBusy}
      className={unstyled ? className : buttonVariants({ variant, size, className })}
      data-slot="button"
      disabled={busy || disabled}
      // A plain button never submits by accident; submit buttons say `type="submit"`.
      type={asChild ? type : (type ?? 'button')}
      {...props}
    >
      {tracksPending ? (
        <PendingContent busy={busy} size={size}>
          {children}
        </PendingContent>
      ) : (
        children
      )}
    </Component>
  );
  if (!tracksPending) return button;

  return (
    <>
      {button}
      <span aria-live="polite" className="sr-only" data-slot="button-status">
        {busy ? 'Working…' : ''}
      </span>
    </>
  );
}
