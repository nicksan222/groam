import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { type ButtonVariantProps, buttonVariants } from '#src/components/button-variants';
import { announceBusy } from '#src/lib/busy-announcer';

export type ButtonProps = Omit<React.ComponentProps<'button'>, 'size'> &
  ButtonVariantProps & {
    asChild?: boolean;
    /**
     * An action started from this button is in flight. A spinner covers the button (its content
     * stays in place but hidden, so the width never changes) and the button is `aria-busy` and
     * `aria-disabled`: it stays focusable, so focus is not lost, but its clicks (and a submit
     * button's form submission) are swallowed. Assistive tech hears one shared "Working…" status
     * for the whole document (see `lib/busy-announcer`), not one per button. Ignored with
     * `asChild`.
     */
    pending?: boolean;
    unstyled?: boolean;
  };

const SMALL_SIZES = new Set<ButtonVariantProps['size']>(['xs', 'icon-xs']);

/**
 * The label and icons, hidden (not removed, so the name stays) under the spinner while pending.
 * The wrapper takes the button's own alignment and gap, so a caller's `justify-between`, `gap-*`,
 * or `truncate` child behaves as it would without `pending`.
 */
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
          'inline-flex min-w-0 max-w-full grow [gap:inherit] [align-items:inherit] [justify-content:inherit]',
          busy && 'opacity-0'
        )}
        data-slot="button-content"
      >
        {children}
      </span>
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner
            aria-hidden
            className={SMALL_SIZES.has(size) ? 'size-3.5' : 'size-4'}
            role="presentation"
          />
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
  onClick,
  'aria-busy': ariaBusy,
  'aria-disabled': ariaDisabled,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  const tracksPending = pending !== undefined && !asChild;
  const busy = tracksPending && pending;

  React.useEffect(() => (busy ? announceBusy() : undefined), [busy]);

  // Stays focusable (a native `disabled` would drop focus to the body), so the click is swallowed
  // here instead; `preventDefault` also stops a submit button from submitting its form.
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (busy) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  return (
    <Component
      aria-busy={tracksPending ? busy || undefined : ariaBusy}
      aria-disabled={busy ? true : ariaDisabled}
      className={
        unstyled
          ? cn(tracksPending && 'relative', className)
          : buttonVariants({
              variant,
              size,
              className: cn(busy && 'opacity-64', className)
            })
      }
      data-slot="button"
      disabled={disabled}
      onClick={tracksPending ? handleClick : onClick}
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
}
