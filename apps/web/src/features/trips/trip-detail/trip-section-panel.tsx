import Shell from '@groam/ui/components/shell/client';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function TripSectionPanel({
  badge,
  children,
  density = 'compact',
  description,
  icon,
  stack = 'md',
  title,
  trailing
}: {
  badge?: string;
  children: ReactNode;
  density?: 'compact';
  description: string;
  icon: LucideIcon;
  stack?: 'md' | 'page' | 'sm';
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <Shell.Stack as="section" stack={stack}>
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
