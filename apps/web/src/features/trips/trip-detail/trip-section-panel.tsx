import type { Icon } from '@groam/icons';
import Shell from '@groam/ui/components/shell/client';
import type { ReactNode } from 'react';

export function TripSectionPanel({
  badge,
  children,
  density = 'compact',
  description,
  icon,
  stack = 'md',
  testId,
  title,
  trailing
}: {
  badge?: string;
  children: ReactNode;
  density?: 'compact';
  description: string;
  icon: Icon;
  stack?: 'md' | 'page' | 'sm';
  testId?: string;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <Shell.Stack as="section" data-testid={testId} stack={stack}>
      <Shell.SectionHeader
        badge={badge}
        density={density}
        description={description}
        icon={icon}
        title={title}
        trailing={trailing}
      />
      {children}
    </Shell.Stack>
  );
}
