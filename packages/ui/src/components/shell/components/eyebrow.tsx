'use client';

import { cn } from '@groam/ui/lib/utils';
import type { EyebrowProps } from '#src/components/shell/types/banner';
import { shellEyebrowVariants } from '#src/lib/shell-card';

/** Compact uppercase label used above section titles and next-step prompts. */
const Eyebrow = ({
  as: Component = 'p',
  children,
  className,
  tone = 'muted',
  ...props
}: EyebrowProps) => (
  <Component
    className={cn(shellEyebrowVariants({ tone }), className)}
    data-slot="shell-eyebrow"
    data-tone={tone}
    {...props}
  >
    {children}
  </Component>
);

export default Eyebrow;
