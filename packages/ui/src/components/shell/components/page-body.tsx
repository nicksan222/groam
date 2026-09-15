'use client';

import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import type { PageBodyProps } from '#src/components/shell/types/banner';
import {
  SHELL_PAGE_INSET,
  type ShellPageBodyVariant,
  shellPageBodyClassName,
  shellPageBodyInnerStackClassName,
  shellPageBodyInnerWrapperClassName
} from '#src/lib/shell-layout';

const defaultVariant: ShellPageBodyVariant = 'overview';

/**
 * Scrollable page body beneath a sticky banner. Variants match trip overview/section
 * rhythm and compact settings/group spacing.
 */
const PageBody: React.FC<PageBodyProps> = ({
  children,
  className,
  innerInset = false,
  maxWidthClassName,
  variant = defaultVariant,
  ...props
}) => {
  if (innerInset) {
    return (
      <div
        className={cn(shellPageBodyInnerWrapperClassName(variant), maxWidthClassName, className)}
        data-slot="shell-page-body"
        {...props}
      >
        <div className={cn(SHELL_PAGE_INSET, shellPageBodyInnerStackClassName(variant))}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(shellPageBodyClassName(variant, className), maxWidthClassName)}
      data-slot="shell-page-body"
      {...props}
    >
      {children}
    </div>
  );
};

export default PageBody;
