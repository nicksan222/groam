import type React from 'react';

export interface BreadcrumbItemData {
  id: React.Key;
  label: React.ReactNode;
  href?: string;
}

export interface ShellBreadcrumbProps {
  items: BreadcrumbItemData[];
  className?: string;
}
