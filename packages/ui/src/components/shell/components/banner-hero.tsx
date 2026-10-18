'use client';

import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import type { BannerHeroProps } from '#src/components/shell/types/banner';
import { SHELL_BANNER_HERO, SHELL_PAGE_INSET } from '#src/lib/shell-layout';

/** Hero row inside `Shell.Banner` with standard inset and cover/title spacing. */
const BannerHero: React.FC<BannerHeroProps> = ({ children, className, ...props }) => (
  <div className={cn(SHELL_PAGE_INSET, SHELL_BANNER_HERO, className)} {...props}>
    {children}
  </div>
);

export default BannerHero;
