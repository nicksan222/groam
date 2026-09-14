'use client';

import type { RevealProps } from '#src/components/shell/types/banner';
import { shellCardClassName } from '#src/lib/shell-card';

/** Lightweight reveal wrapper for tables, timelines, and other flush content blocks. */
const Reveal = ({ children, className, stack, ...props }: RevealProps) => (
  <div
    className={shellCardClassName({ className, reveal: true, stack, variant: 'bare' })}
    data-slot="shell-reveal"
    {...props}
  >
    {children}
  </div>
);

export default Reveal;
