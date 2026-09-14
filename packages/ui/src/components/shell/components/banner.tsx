'use client';

import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import type { BannerProps } from '#src/components/shell/types/banner';
import { SHELL_BANNER_BAND } from '#src/lib/shell-layout';

/** Sticky top banner band for entity detail pages (trips, settings, group). */
const Banner: React.FC<BannerProps> = ({ children, className, ...props }) => (
  <header className={cn(SHELL_BANNER_BAND, className)} {...props}>
    {children}
  </header>
);

export default Banner;
