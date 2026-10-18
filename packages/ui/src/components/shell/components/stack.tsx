'use client';

import type { StackProps } from '#src/components/shell/types/banner';
import { shellStackClassName } from '#src/lib/shell-layout';

/** Vertical stack without reveal animation — panel bodies and list pages. */
const Stack = ({
  as: Component = 'div',
  children,
  className,
  stack = 'md',
  ...props
}: StackProps) => (
  <Component
    className={shellStackClassName({ className, stack })}
    data-slot="shell-stack"
    data-stack={stack}
    {...props}
  >
    {children}
  </Component>
);

export default Stack;
