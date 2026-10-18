'use client';

import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import type { BannerInsetProps } from '#src/components/shell/types/banner';
import { SHELL_PAGE_INSET } from '#src/lib/shell-layout';

/** Applies standard page horizontal inset inside a banner band. */
const BannerInset: React.FC<BannerInsetProps> = ({ children, className, ...props }) => (
  <div className={cn(SHELL_PAGE_INSET, className)} {...props}>
    {children}
  </div>
);

export default BannerInset;
