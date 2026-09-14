import React from 'react';
import type { TabItemProps } from '#src/components/shell/types';
import Tab from '#tsx/components/shell/components/tab';

/** Recursively flatten React Fragments so every Tab is a direct child. */
export function isTabElement(child: React.ReactNode): child is React.ReactElement<TabItemProps> {
  return React.isValidElement<TabItemProps>(child) && child.type === Tab;
}

export function flattenFragments(children: React.ReactNode): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === React.Fragment) {
      result.push(...flattenFragments((child.props as { children?: React.ReactNode }).children));
    } else {
      result.push(child);
    }
  });
  return result;
}
