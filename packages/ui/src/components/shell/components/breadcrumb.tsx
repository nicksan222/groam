'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@groam/ui/components/breadcrumb';
import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import { Fragment } from 'react';

import type { ShellBreadcrumbProps } from '#src/components/shell/types';

/**
 * Shell Breadcrumb — renders inside Shell.Header above the title.
 *
 * Items with `href` are always rendered as clickable links.
 * Items without `href` are rendered as plain text (current page).
 */
const ShellBreadcrumb: React.FC<ShellBreadcrumbProps> = ({ items, className }) => {
  if (items.length === 0) return null;

  return (
    <Breadcrumb className={cn('mb-0.5', className)}>
      <BreadcrumbList className="text-[13px] gap-1 sm:gap-1.5 flex-nowrap">
        {items.map((item, index) => (
          <Fragment key={item.id}>
            {index > 0 && <BreadcrumbSeparator className="[&>svg]:size-3" />}
            <BreadcrumbItem className="min-w-0">
              {item.href ? (
                <BreadcrumbLink asChild>
                  <a href={item.href} className="max-w-[200px] truncate">
                    {item.label}
                  </a>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate max-w-[200px]">{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default ShellBreadcrumb;
