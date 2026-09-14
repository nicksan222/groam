import { Slot } from '@radix-ui/react-slot';
import type * as React from 'react';
import { type ButtonVariantProps, buttonVariants } from '#src/components/button-variants';

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: Omit<React.ComponentProps<'button'>, 'size'> &
  ButtonVariantProps & {
    asChild?: boolean;
  }) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      className={buttonVariants({ variant, size, className })}
      data-slot="button"
      {...props}
    />
  );
}
