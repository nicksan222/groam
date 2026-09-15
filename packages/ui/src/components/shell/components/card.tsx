'use client';

import { Slot } from '@radix-ui/react-slot';
import type { ShellCardProps } from '#src/components/shell/types/banner';
import { shellCardClassName } from '#src/lib/shell-card';

/** Workspace surface card with standardized border, fill, and padding variants. */
const Card = ({
  as: Component = 'div',
  asChild = false,
  children,
  className,
  padding,
  reveal,
  stack,
  variant = 'well',
  ...props
}: ShellCardProps) => {
  const Comp = asChild ? Slot : Component;

  return (
    <Comp
      className={shellCardClassName({ className, padding, reveal, stack, variant })}
      data-slot="shell-card"
      data-variant={variant}
      {...props}
    >
      {children}
    </Comp>
  );
};

export default Card;
